import * as THREE from 'three';

export function createIsland(scene, materials) {
  const islandTop = new THREE.Mesh(
    new THREE.CylinderGeometry(64, 64, 0.08, 8),
    materials.grass
  );

  islandTop.position.y = 0;
  islandTop.receiveShadow = true;
  scene.add(islandTop);

  const islandBottom = new THREE.Mesh(
    new THREE.ConeGeometry(50, 50, 64),
    materials.rock
  );

  islandBottom.position.y = -2.65;
  islandBottom.rotation.x = Math.PI;
  scene.add(islandBottom);

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(32, 32, 0.08, 8),
    materials.plazaStone
  );

  plaza.position.y = 0.45;
  plaza.receiveShadow = true;
  scene.add(plaza);

  function createPath(x, z, rotationY, length) {
    const path = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.06, length),
      materials.stone
    );

    path.position.set(x, 0.5, z);
    path.rotation.y = rotationY;
    path.receiveShadow = true;
    scene.add(path);

    return path;
  }

  const paths = [
    createPath(0, 2.9, 0, 3.0),
    createPath(0, -3.0, 0, 3.2),
    createPath(3.0, 0, Math.PI / 2, 3.2),
    createPath(-3.0, 0, Math.PI / 2, 3.2)
  ];

  return {
    islandTop,
    islandBottom,
    plaza,
    paths
  };
}