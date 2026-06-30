import * as THREE from 'three';

export function createIsland(scene, materials) {

  const islandRadius = 130;
  const islandTop = new THREE.Mesh(
    new THREE.CylinderGeometry(islandRadius, islandRadius, 0.08, 12),
    materials.grass
  );

  islandTop.position.y = 0;
  islandTop.receiveShadow = true;
  scene.add(islandTop);

  // Creo un gruppo per contenere tutti i pezzi del sentiero
  const pathGroup = new THREE.Group();
  scene.add(pathGroup);

  // Funzione interna: crea un pezzo di sentiero che parte da (x, z) e si allunga in avanti
  function createPathSegment(x, z, rotationY, length, width = 8) {
    const segmentGroup = new THREE.Group();

    const border = new THREE.Mesh(
      new THREE.BoxGeometry(width + 1.1, 0.07, length + 0.7),
      materials.stone
    );

    const path = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, length),
      materials.plazaStone
    );

    border.position.set(0, 0.075, length / 2);
    path.position.set(0, 0.12, length / 2);

    border.receiveShadow = true;
    path.receiveShadow = true;

    segmentGroup.add(border);
    segmentGroup.add(path);

    segmentGroup.position.set(x, 0, z);
    segmentGroup.rotation.y = rotationY;
    pathGroup.add(segmentGroup);

    return segmentGroup;
  }

  // Funzione interna: crea una giunzione rotonda tra i pezzi con bordo
  function createPathJoint(x, z, radius = 5) {
    const jointGroup = new THREE.Group();

    const border = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 0.65, radius + 0.65, 0.07, 32),
      materials.stone
    );

    const joint = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.09, 32),
      materials.plazaStone
    );

    border.position.y = 0.075;
    joint.position.y = 0.12;

    border.receiveShadow = true;
    joint.receiveShadow = true;

    jointGroup.add(border);
    jointGroup.add(joint);
    jointGroup.position.set(x, 0, z);
    jointGroup.userData.radius = radius;
    pathGroup.add(jointGroup);

    return jointGroup;
  }

  function createPathBetweenJoints(startJoint, endJoint, width = 8, jointOverlap = 0.8) {
    const start = startJoint.position;
    const end = endJoint.position;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const centerDistance = Math.sqrt(dx * dx + dz * dz);

    if (centerDistance === 0) return null;

    const startRadius = startJoint.userData.radius ?? 0;
    const endRadius = endJoint.userData.radius ?? 0;
    const startInset = Math.max(startRadius - jointOverlap, 0);
    const endInset = Math.max(endRadius - jointOverlap, 0);
    const length = Math.max(centerDistance - startInset - endInset, 0);
    const directionX = dx / centerDistance;
    const directionZ = dz / centerDistance;
    const startX = start.x + directionX * startInset;
    const startZ = start.z + directionZ * startInset;
    const rotationY = Math.atan2(dx, dz);

    return createPathSegment(startX, startZ, rotationY, length, width);
  }

  function createRamp(x, z, rotationY, length = 8, width = 7, height = 1.5) {
    const rampGroup = new THREE.Group();

    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.35, length),
      materials.plazaStone
    );

    ramp.rotation.x = -Math.atan(height / length);
    ramp.receiveShadow = true;
    ramp.castShadow = true;

    rampGroup.position.set(x, height / 2, z);
    rampGroup.rotation.y = rotationY;

    rampGroup.add(ramp);
    pathGroup.add(rampGroup);

    return rampGroup;
  }

  // Sentiero principale: parte dalla posizione iniziale del player e prosegue in avanti.
  // initial plaza
  const initialPlaza = createPathJoint(0, 26, 5.2);

  const rightPlaza = createPathJoint(50, 30, 10);
  const stoneBuildingPlaza = createPathJoint(-42, 68, 1);
  const castelPlaza = createPathJoint(-30, -70, 1);

  // central plaza
  const centralPlaza = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 0.1, 24),
    materials.plazaStone
  );

  centralPlaza.position.set(10, 0.09, -30);
  centralPlaza.receiveShadow = true;
  centralPlaza.userData.radius = 12;
  pathGroup.add(centralPlaza);

  createPathBetweenJoints(initialPlaza, centralPlaza, 8, 2);
  createPathBetweenJoints(initialPlaza, rightPlaza, 8, 2);
  createPathBetweenJoints(initialPlaza, stoneBuildingPlaza, 8, 2);
  createPathBetweenJoints(centralPlaza, castelPlaza, 8);
  
  // flying carpet plaza
  const carpetPlaza = createPathJoint(44, -22, 4.9);

  // ramp for the castle entrance
  createRamp(-15, -54, 4, 18, 8, 4);

  return {
    islandTop,
    pathGroup,
    centralPlaza,
    radius: islandRadius,
  };
}
