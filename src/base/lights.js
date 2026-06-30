import * as THREE from 'three';

export function createLights(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
  sunLight.position.set(80, 120, 60);
  sunLight.castShadow = true;

  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;

  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 180;
  sunLight.shadow.camera.left = -95;
  sunLight.shadow.camera.right = 95;
  sunLight.shadow.camera.top = 95;
  sunLight.shadow.camera.bottom = -95;

  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;

  scene.add(sunLight);

  return {
    ambientLight,
    sunLight
  };
}
