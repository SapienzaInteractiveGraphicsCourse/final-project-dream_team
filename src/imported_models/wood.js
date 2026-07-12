import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { createGltfLoader } from '../base/loaders.js';
import { enableShadows } from '../base/helpers.js';
import { modelColliders } from '../world/collisionRegistry.js';
import { isShifuTaskStarted } from './shifu.js';

const gltfLoader = createGltfLoader();

let axe = null;
let wood = null;
let axeStartY = 0;
let axeCollider = null;
let woodCollider = null;
let axeLight = null;
let woodTaskLoadPromise = null;

let canTakeAxe = false;
let hasAxe = false;

let canCollectWood = false;
let hasWood = false;
let woodTaskComplete = false;

const axePosition = new THREE.Vector3(238.21, 30, -260.24);
const axeBaseRotationY = Math.PI / 2;
const woodPosition = new THREE.Vector3(240, 29.4, -263);
const woodGroundScale = new THREE.Vector3(0.02, 0.02, 0.02);
const woodCarryScale = new THREE.Vector3(0.012, 0.012, 0.012);
const woodCarryOffset = new THREE.Vector3(0.6, 3, 0.35);
const woodCarryTarget = new THREE.Vector3();

const woodTaskPrompt = document.createElement('div');
woodTaskPrompt.className = 'interaction-dialogue';
document.body.appendChild(woodTaskPrompt);
function removeAxeCollider() {
  if (!axeCollider) return;

  const index = modelColliders.indexOf(axeCollider);
  if (index !== -1) {
    modelColliders.splice(index, 1);
  }
  axeCollider = null;
}
function removeWoodCollider() {
  if (!woodCollider) return;

  const index = modelColliders.indexOf(woodCollider);
  if (index !== -1) {
    modelColliders.splice(index, 1);
  }
  woodCollider = null;
}
function updateAxeAnimation() {
  if (!axe || hasAxe || !axe.visible) {
    if (axeLight) {
      axeLight.visible = false;
    }
    return;
  }

  const time = performance.now() * 0.001;

  axe.position.y = axeStartY + Math.sin(time * 2.2) * 0.22;
  axe.rotation.y = axeBaseRotationY;
  axe.rotation.z = Math.sin(time * 2.6) * 0.06;

  if (axeLight) {
    axeLight.visible = true;
    axeLight.position.copy(axe.position);
    axeLight.position.y += 2.2 + Math.sin(time * 3) * 0.18;
    axeLight.intensity = 4.2 + Math.sin(time * 4) * 0.7;
  }
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f') return;

  if (canTakeAxe) {
    hasAxe = true;
    axe.visible = false;
    
    if (axeLight) {
      axeLight.visible = false;
    }
    
    removeAxeCollider();

    if (wood) {
      wood.visible = true;

      if (woodCollider && !modelColliders.includes(woodCollider)) {
        modelColliders.push(woodCollider);
      }
    }
    
    canTakeAxe = false;
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  if (canCollectWood) {
    hasWood = true;
    canCollectWood = false;
    removeWoodCollider();
    woodTaskPrompt.classList.remove('is-visible');
  }
});
export function loadWoodTask(scene) {
  if (woodTaskLoadPromise) return woodTaskLoadPromise;

  woodTaskLoadPromise = Promise.all([

    new Promise((resolve) => {
      gltfLoader.load(
        './models_optimized/medieval_axe.glb',
        (gltf) => {
          axe = gltf.scene;

          axe.position.copy(axePosition);
          axe.scale.set(0.04, 0.04, 0.04);
          axe.rotation.y = axeBaseRotationY;
          axeStartY = axe.position.y;
          enableShadows(axe);

          axeLight = new THREE.PointLight(0xfff0b5, 4.2, 9, 1.6);
          axeLight.position.copy(axe.position);
          axeLight.position.y += 2.2;
          scene.add(axeLight);

          axeCollider = new THREE.Box3().setFromCenterAndSize(
            axePosition,
            new THREE.Vector3(1.6, 2.2, 1.6)
          );
          modelColliders.push(axeCollider);

          scene.add(axe);
          resolve(axe);
        },
        undefined,
        (error) => {
          console.error('Error loading medieval_axe.glb', error);
          resolve(null);
        }
      );
    }),

    new Promise((resolve) => {
      const mtlLoader = new MTLLoader();
      const publicPath = import.meta.env.BASE_URL;
      const modelsPath = `${publicPath}models_optimized/`;
      


      mtlLoader.setPath(modelsPath);
      mtlLoader.setResourcePath(publicPath);
      
      mtlLoader.load(
        '12303_Firewood_Stack_v1_l3.mtl',
        (materials) => {
          materials.preload();

          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.setPath(modelsPath);

          objLoader.load(
            '12303_Firewood_Stack_v1_l3.obj',
            (object) => {
              wood = object;

              wood.position.copy(woodPosition);
              wood.scale.copy(woodGroundScale);
              wood.rotation.x = Math.PI / 2;
              wood.rotation.y = Math.PI;

              wood.updateMatrixWorld(true);
              enableShadows(wood);

              woodCollider = new THREE.Box3().setFromObject(wood);

              const center = woodCollider.getCenter(new THREE.Vector3());
              const size = woodCollider.getSize(new THREE.Vector3());
              size.x *= 0.8;
              size.z *= 0.8;
              woodCollider.setFromCenterAndSize(center, size);
              wood.visible = false;

              wood.traverse((child) => {
                if (child.isMesh) {
                  const materials = Array.isArray(child.material)
                    ? child.material
                    : [child.material];

                  materials.forEach((material) => {
                    if (material.map) {
                      material.map.colorSpace = THREE.SRGBColorSpace;
                      material.map.needsUpdate = true;
                    }
                    material.needsUpdate = true;
                  });
                }
              });

              scene.add(wood);
              resolve(wood);
            },
            undefined,
            (error) => {
              console.error('Error loading 12303_Firewood_Stack_v1_l3.obj', error);
              resolve(null);
            }
          );
        },
        undefined,
        (error) => {
          console.error('Error loading 12303_Firewood_Stack_v1_l3.mtl', error);
          resolve(null);
        }
      );
    })
  ]);

  return woodTaskLoadPromise;
}
export function updateWoodTask(deltaTime, player) {
  updateAxeAnimation();

  if (woodTaskComplete) {
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  if (!isShifuTaskStarted()) {
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  if (!axe || !wood) return;

  if (hasWood) {
    woodCarryTarget.copy(player.position).add(woodCarryOffset);
    wood.position.lerp(woodCarryTarget, Math.min(deltaTime * 8, 1));
    wood.scale.lerp(woodCarryScale, Math.min(deltaTime * 8, 1));
    wood.rotation.x = Math.PI / 2;
    wood.rotation.y = Math.PI;
    
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  canTakeAxe = !hasAxe && axe.position.distanceToSquared(player.position) < 9;
  canCollectWood = hasAxe && !hasWood && wood.position.distanceToSquared(player.position) < 16;

  if (canTakeAxe) {
    woodTaskPrompt.textContent = 'Press F to take the axe';
    woodTaskPrompt.classList.add('is-visible');
  } else if (hasAxe && !hasWood && !canCollectWood) {
    woodTaskPrompt.textContent = 'Go to the trees to collect wood';
    woodTaskPrompt.classList.add('is-visible');
  } else if (canCollectWood) {
    woodTaskPrompt.textContent = 'Press F to collect the wood';
    woodTaskPrompt.classList.add('is-visible');
  } else {
    woodTaskPrompt.classList.remove('is-visible');
  }
}

export function isCarryingWood() {
  return hasWood;
}

export function consumeCarriedWood() {
  hasWood = false;
  woodTaskComplete = true;
  canCollectWood = false;

  if (wood) {
    wood.visible = false;
  }
  
  removeWoodCollider();

  woodTaskPrompt.classList.remove('is-visible');
}
