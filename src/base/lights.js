import * as THREE from 'three';

export function createLights(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
  sunLight.position.set(8, 12, 6);
  sunLight.castShadow = true;

  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;

  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 50;
  sunLight.shadow.camera.left = -12;
  sunLight.shadow.camera.right = 12;
  sunLight.shadow.camera.top = 12;
  sunLight.shadow.camera.bottom = -12;

  sunLight.shadow.bias = -0.0005;

  scene.add(sunLight);
  // poi si puo levare
  const sunHelper = new THREE.DirectionalLightHelper(sunLight, 1);
  scene.add(sunHelper);

  return {
    ambientLight,
    sunLight,
    sunHelper
  };
}