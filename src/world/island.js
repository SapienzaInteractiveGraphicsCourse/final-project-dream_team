import * as THREE from 'three';

export function createIsland(scene, materials) {

  const islandRadius = 80;
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

  // Funzione interna: crea un singolo pezzo rettangolare di sentiero con bordo
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

    border.position.y = 0.075;
    path.position.y = 0.12;

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
    pathGroup.add(jointGroup);

    return jointGroup;
  }

  // Sentiero principale: parte dalla posizione iniziale del player e prosegue in avanti.
  createPathJoint(0, 2.2, 5.2);
  createPathSegment(0, -6, 0, 16.4, 8);
  createPathJoint(0, -14, 4.9);

  createPathSegment(5, -22, -Math.PI / 5, 19, 8);
  createPathJoint(10, -30, 4.9);

  createPathSegment(19, -35, -Math.PI / 2.8, 20, 8);
  createPathJoint(28, -40, 4.9);

  createPathSegment(36, -31, Math.PI / 4.2, 24, 8);
  createPathJoint(44, -22, 4.9);

  // Piccola piazzetta centrale lungo il percorso
  const smallPlaza = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 0.1, 24),
    materials.plazaStone
  );

  smallPlaza.position.set(10, 0.09, -30);
  smallPlaza.receiveShadow = true;
  pathGroup.add(smallPlaza);

  return {
    islandTop,
    pathGroup,
    smallPlaza,
  };
}
