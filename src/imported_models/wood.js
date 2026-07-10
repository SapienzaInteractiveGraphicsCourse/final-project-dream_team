import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { isShifuTaskStarted } from './shifu.js';
import { modelColliders } from './models.js';

// --- INITIALIZATION ---
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

// --- STATE VARIABLES ---
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

// --- POSITIONING & SCALING CONSTANTS ---
const axePosition = new THREE.Vector3(238.21, 30, -260.24);
const axeBaseRotationY = Math.PI / 2;
const woodPosition = new THREE.Vector3(240, 29.4, -263);
const woodGroundScale = new THREE.Vector3(0.02, 0.02, 0.02);
const woodCarryScale = new THREE.Vector3(0.012, 0.012, 0.012);
const woodCarryOffset = new THREE.Vector3(0.6, 3, 0.35);
const woodCarryTarget = new THREE.Vector3();

// --- UI ELEMENTS ---
const woodTaskPrompt = document.createElement('div');
woodTaskPrompt.className = 'interaction-dialogue';
document.body.appendChild(woodTaskPrompt);

// --- UTILITY FUNCTIONS ---

/**
 * Removes the axe's collision box from the physics array once picked up.
 */
function removeAxeCollider() {
  if (!axeCollider) return;

  const index = modelColliders.indexOf(axeCollider);
  if (index !== -1) {
    modelColliders.splice(index, 1);
  }
  axeCollider = null;
}

/**
 * Removes the wood's collision box from the physics array once picked up.
 */
function removeWoodCollider() {
  if (!woodCollider) return;

  const index = modelColliders.indexOf(woodCollider);
  if (index !== -1) {
    modelColliders.splice(index, 1);
  }
  woodCollider = null;
}

/**
 * Animates the floating axe and its glowing light before the player picks it up.
 */
function updateAxeAnimation() {
  if (!axe || hasAxe || !axe.visible) {
    if (axeLight) {
      axeLight.visible = false;
    }
    return;
  }

  const time = performance.now() * 0.001;
  
  // Floating animation
  axe.position.y = axeStartY + Math.sin(time * 2.2) * 0.22;
  axe.rotation.y = axeBaseRotationY;
  axe.rotation.z = Math.sin(time * 2.6) * 0.06;

  // Pulsating light animation
  if (axeLight) {
    axeLight.visible = true;
    axeLight.position.copy(axe.position);
    axeLight.position.y += 2.2 + Math.sin(time * 3) * 0.18;
    axeLight.intensity = 4.2 + Math.sin(time * 4) * 0.7;
  }
}

// --- INPUT HANDLING ---

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f') return;

  // Handle picking up the axe
  if (canTakeAxe) {
    hasAxe = true;
    axe.visible = false;
    
    if (axeLight) {
      axeLight.visible = false;
    }
    
    removeAxeCollider();
    
    // Reveal the wood once the player has the axe
    if (wood) {
      wood.visible = true;
      // Attiviamo il collider del legno ora che è visibile!
      if (woodCollider && !modelColliders.includes(woodCollider)) {
        modelColliders.push(woodCollider);
      }
    }
    
    canTakeAxe = false;
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  // Handle collecting the wood
  if (canCollectWood) {
    hasWood = true;
    canCollectWood = false;
    removeWoodCollider(); // <- Rimuoviamo il collider perché stiamo trasportando la legna!
    woodTaskPrompt.classList.remove('is-visible');
  }
});

// --- CORE EXPORTS ---

/**
 * Loads both the axe (GLTF) and the wood stack (OBJ + MTL).
 */
export function loadWoodTask(scene) {
  if (woodTaskLoadPromise) return woodTaskLoadPromise;

  woodTaskLoadPromise = Promise.all([
    // Load the Medieval Axe
    new Promise((resolve) => {
      gltfLoader.load(
        './models_optimized/medieval_axe.glb',
        (gltf) => {
          axe = gltf.scene;

          axe.position.copy(axePosition);
          axe.scale.set(0.04, 0.04, 0.04);
          axe.rotation.y = axeBaseRotationY;
          axeStartY = axe.position.y;

          // Add a localized light source to highlight the axe
          axeLight = new THREE.PointLight(0xfff0b5, 4.2, 9, 1.6);
          axeLight.position.copy(axe.position);
          axeLight.position.y += 2.2;
          scene.add(axeLight);

          // Create collision boundaries so the player can't walk through it
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
    
    // Load the Firewood Stack
    new Promise((resolve) => {
      const mtlLoader = new MTLLoader();
      mtlLoader.setPath('models_optimized/');
      mtlLoader.setResourcePath('models_optimized/');
      
      mtlLoader.load(
        '12303_Firewood_Stack_v1_l3.mtl',
        (materials) => {
          materials.preload();

          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.setPath('models_optimized/');

          objLoader.load(
            '12303_Firewood_Stack_v1_l3.obj',
            (object) => {
              wood = object;

              wood.position.copy(woodPosition);
              wood.scale.copy(woodGroundScale);
              wood.rotation.x = Math.PI / 2;
              wood.rotation.y = Math.PI;
              
              
              wood.updateMatrixWorld(true);

              
              woodCollider = new THREE.Box3().setFromObject(wood);
              
              
              const center = woodCollider.getCenter(new THREE.Vector3());
              const size = woodCollider.getSize(new THREE.Vector3());
              size.x *= 0.8;
              size.z *= 0.8;
              woodCollider.setFromCenterAndSize(center, size);
              wood.visible = false;

              // Process material to ensure correct color space
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

/**
 * Main update loop for the wood collection task logic.
 */
export function updateWoodTask(deltaTime, player) {
  updateAxeAnimation();

  if (woodTaskComplete) {
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  // Task is locked until Shifu instructs the player
  if (!isShifuTaskStarted()) {
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  if (!axe || !wood) return;

  // State: Player has collected the wood and is carrying it
  if (hasWood) {
    woodCarryTarget.copy(player.position).add(woodCarryOffset);
    wood.position.lerp(woodCarryTarget, Math.min(deltaTime * 8, 1));
    wood.scale.lerp(woodCarryScale, Math.min(deltaTime * 8, 1));
    wood.rotation.x = Math.PI / 2;
    wood.rotation.y = Math.PI;
    
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  // Calculate distances for interactions
  canTakeAxe = !hasAxe && axe.position.distanceToSquared(player.position) < 9;
  canCollectWood = hasAxe && !hasWood && wood.position.distanceToSquared(player.position) < 16;

  // Update UI Prompts based on state
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