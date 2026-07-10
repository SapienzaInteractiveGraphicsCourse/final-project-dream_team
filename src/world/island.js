import * as THREE from 'three';
import { createTiledPlazaStoneMaterial } from './materials.js';

const textureLoader = new THREE.TextureLoader();

export function createIsland(scene, materials) {

  const islandRadius = 130;
  const islandTop = new THREE.Mesh(
    new THREE.CylinderGeometry(islandRadius, islandRadius, 0.08, 12),
    materials.grass
  );

  islandTop.position.y = 0;
  islandTop.receiveShadow = true;
  scene.add(islandTop);

  function createPondShape(radiusX, radiusZ, points = 48, wobble = 0.12) {
    const shapePoints = [];

    for (let i = 0; i < points; i += 1) {
      const angle = (i / points) * Math.PI * 2;
      const wave =
        1 +
        Math.sin(angle * 3 + 0.7) * wobble +
        Math.cos(angle * 5 - 0.4) * wobble * 0.45;

      shapePoints.push(
        new THREE.Vector2(
          Math.cos(angle) * radiusX * wave,
          Math.sin(angle) * radiusZ * wave
        )
      );
    }

    return new THREE.Shape(shapePoints);
  }

  function applyPondUVs(geometry, radiusX, radiusZ) {
    const positions = geometry.attributes.position;
    const uvs = [];

    for (let i = 0; i < positions.count; i += 1) {
      const u = THREE.MathUtils.clamp(
        positions.getX(i) / (radiusX * 2.35) + 0.5,
        0,
        1
      );
      const v = THREE.MathUtils.clamp(
        positions.getY(i) / (radiusZ * 2.35) + 0.5,
        0,
        1
      );

      uvs.push(u, v);
    }

    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }

  function createPond(x, z, radiusX = 18, radiusZ = 11) {
    const pondGroup = new THREE.Group();
    const outerShape = createPondShape(radiusX + 2.4, radiusZ + 2.2, 56, 0.1);
    const innerShape = createPondShape(radiusX, radiusZ, 56, 0.12);
    const innerHole = new THREE.Path(innerShape.getPoints().reverse());
    
    // Load textures
    const bankTexture = textureLoader.load('/ganges_river_pebbles_diff_4k.jpg');
    const waterTexture = textureLoader.load('/Ice002_2K-JPG_Color.jpg');
    const waterNormal = textureLoader.load('/Ice002_2K-JPG_NormalGL.jpg');
    const waterRoughness = textureLoader.load('/Ice002_2K-JPG_Roughness.jpg');

    bankTexture.colorSpace = THREE.SRGBColorSpace;
    bankTexture.wrapS = THREE.RepeatWrapping;
    bankTexture.wrapT = THREE.RepeatWrapping;
    bankTexture.repeat.set(2.4, 1.7);
    bankTexture.anisotropy = 8;
    
    waterTexture.colorSpace = THREE.SRGBColorSpace;
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(1.15, 1);
    waterTexture.anisotropy = 8;
    
    waterNormal.wrapS = THREE.RepeatWrapping;
    waterNormal.wrapT = THREE.RepeatWrapping;
    waterNormal.repeat.copy(waterTexture.repeat);
    waterNormal.anisotropy = 8;
    
    waterRoughness.wrapS = THREE.RepeatWrapping;
    waterRoughness.wrapT = THREE.RepeatWrapping;
    waterRoughness.repeat.copy(waterTexture.repeat);
    waterRoughness.anisotropy = 8;

    outerShape.holes.push(innerHole);
    const bankGeometry = new THREE.ShapeGeometry(outerShape);
    const waterGeometry = new THREE.ShapeGeometry(innerShape);

    applyPondUVs(bankGeometry, radiusX + 2.4, radiusZ + 2.2);
    applyPondUVs(waterGeometry, radiusX, radiusZ);

    const bank = new THREE.Mesh(
      bankGeometry,
      new THREE.MeshStandardMaterial({
        map: bankTexture,
        color: 0xd8c3a2,
        roughness: 0.92
      })
    );

    const water = new THREE.Mesh(
      waterGeometry,
      new THREE.MeshPhysicalMaterial({
        map: waterTexture,
        normalMap: waterNormal,
        normalScale: new THREE.Vector2(0.32, 0.32),
        roughnessMap: waterRoughness,
        color: 0xa8e4ef,
        roughness: 0.22,
        metalness: 0.02,
        clearcoat: 0.55,
        clearcoatRoughness: 0.18,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide
      })
    );

    bank.rotation.x = -Math.PI / 2;
    water.rotation.x = -Math.PI / 2;
    bank.position.y = 0.07;
    water.position.y = 0.09;
    bank.receiveShadow = true;
    water.receiveShadow = true;
    water.name = 'pondWater';
    
    pondGroup.name = 'worldOnePond';
    pondGroup.position.set(x, 0, z);
    pondGroup.add(bank, water);
    scene.add(pondGroup);

    return pondGroup;
  }

  const pond = createPond(-42.93, 17.92, 19, 12);

  // Create a group to hold all path segments
  const pathGroup = new THREE.Group();
  scene.add(pathGroup);

  // Internal function: creates a path segment starting from (x, z) and extending forward
  function createPathSegment(x, z, rotationY, length, width = 8) {
    const segmentGroup = new THREE.Group();

    const border = new THREE.Mesh(
      new THREE.BoxGeometry(width + 1.1, 0.07, length + 0.7),
      materials.stone
    );

    const path = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, length),
      createTiledPlazaStoneMaterial(width, length)
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

  // Internal function: creates a round junction between segments with a border
  function createPathJoint(x, z, radius = 5) {
    const jointGroup = new THREE.Group();

    const border = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 0.65, radius + 0.65, 0.07, 32),
      materials.stone
    );

    const joint = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.09, 32),
      createTiledPlazaStoneMaterial(radius * 2, radius * 2)
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
      createTiledPlazaStoneMaterial(width, length)
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

  // Initial plaza
  const initialPlaza = createPathJoint(0, 26, 5.2);

  const rightPlaza = createPathJoint(50, 30, 10);
  const stoneBuildingPlaza = createPathJoint(-42, 68, 1);
  const castelPlaza = createPathJoint(-30, -70, 1);

  // Central plaza
  const centralPlaza = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 0.1, 24),
    createTiledPlazaStoneMaterial(24, 24)
  );

  // Flying carpet plaza
  const carpetPlaza = createPathJoint(44, -22, 4.9);

  centralPlaza.position.set(10, 0.09, -30);
  centralPlaza.receiveShadow = true;
  centralPlaza.userData.radius = 12;
  pathGroup.add(centralPlaza);

  createPathBetweenJoints(initialPlaza, centralPlaza, 8, 2);
  createPathBetweenJoints(initialPlaza, rightPlaza, 8, 2);
  createPathBetweenJoints(initialPlaza, stoneBuildingPlaza, 8, 2);
  createPathBetweenJoints(centralPlaza, castelPlaza, 8);
  createPathBetweenJoints(centralPlaza, carpetPlaza, 8, 2);

  // Ramp for the castle entrance
  createRamp(-15, -54, 4, 18, 8, 4);

  return {
    islandTop,
    pathGroup,
    centralPlaza,
    pond,
    radius: islandRadius,
  };
}