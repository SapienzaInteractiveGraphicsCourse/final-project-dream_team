import * as THREE from 'three';

export function createCloud(scene, x, y, z, scale = 1) {
  const cloudGroup = new THREE.Group();

  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1
  });

  const sphere1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 24, 24),
    cloudMaterial
  );

  const sphere2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 24, 24),
    cloudMaterial
  );

  const sphere3 = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 24, 24),
    cloudMaterial
  );

  const sphere4 = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 24, 24),
    cloudMaterial
  );

  sphere1.position.set(-0.9, 0, 0);
  sphere2.position.set(0, 0.25, 0);
  sphere3.position.set(0.9, 0, 0);
  sphere4.position.set(0.2, -0.15, 0.4);

  cloudGroup.add(sphere1);
  cloudGroup.add(sphere2);
  cloudGroup.add(sphere3);
  cloudGroup.add(sphere4);

  cloudGroup.position.set(x, y, z);
  cloudGroup.scale.set(scale, scale, scale);

  scene.add(cloudGroup);

  return cloudGroup;
}

