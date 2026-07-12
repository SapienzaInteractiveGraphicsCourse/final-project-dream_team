import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { createGltfLoader } from '../base/loaders.js';
import { enableShadows } from '../base/helpers.js';
import { modelColliders } from '../world/collisionRegistry.js';
import { addPhysicsBox, removePhysicsProp } from '../world/physicsWorld.js';
import { isShifuTaskStarted } from './shifu.js';

const gltfLoader = createGltfLoader();

let axe = null;
let wood = null;
let axeStartY = 0;
let axeCollider = null;
let woodCollider = null;
let axeLight = null;
let woodTaskLoadPromise = null;
let sceneRef = null;
let cuttableTree = null;
let treeTrunk = null;
let treeLeaves = null;
let treeShakeTimer = 0;
let leafParticles = [];
let woodPieces = [];

let canTakeAxe = false;
let hasAxe = false;

let canCutTree = false;
let treeHitCount = 0;
let axeSwingTimer = 0;
let currentAxeHolder = null;
let canCollectWood = false;
let hasWood = false;
let woodTaskComplete = false;

const axePosition = new THREE.Vector3(238.21, 30, -260.24);
const axeBaseRotationY = Math.PI / 2;
const woodPosition = new THREE.Vector3(240, 29.4, -263);
const treeCutPosition = new THREE.Vector3(240, 28.75, -263);
const woodGroundScale = new THREE.Vector3(0.02, 0.02, 0.02);
const woodCarryScale = new THREE.Vector3(0.012, 0.012, 0.012);
const woodCarryOffset = new THREE.Vector3(0.6, 3, 0.35);
const woodCarryTarget = new THREE.Vector3();
const axeHandOffset = new THREE.Vector3(0.58, 1.22, 0.34);
const axeHandWorldOffset = new THREE.Vector3();
const axeGripOffset = new THREE.Vector3(0, 0, 0.08);
const axeHandPosition = new THREE.Vector3();
const axeForwardOffset = new THREE.Vector3();
const axeBox = new THREE.Box3();
const axeSize = new THREE.Vector3();
const axeGripPoint = new THREE.Vector3();
const axeDirectionToTree = new THREE.Vector3();
const treeBasePosition = new THREE.Vector3(treeCutPosition.x, treeCutPosition.y, treeCutPosition.z);
const requiredTreeHits = 3;
const axeSwingDuration = 0.42;
const leafGravity = -5.8;

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
  axe.rotation.x = Math.PI * 0.5;
  axe.rotation.y = axeBaseRotationY;
  axe.rotation.z = Math.sin(time * 2.6) * 0.06;

  if (axeLight) {
    axeLight.visible = true;
    axeLight.position.copy(axe.position);
    axeLight.position.y += 2.2 + Math.sin(time * 3) * 0.18;
    axeLight.intensity = 4.2 + Math.sin(time * 4) * 0.7;
  }
}

function prepareAxeModel(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;

    const sourceMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    const preparedMaterials = sourceMaterials.map((material, index) => {
      const prepared = material?.clone ? material.clone() : new THREE.MeshStandardMaterial();

      if (prepared.map) {
        prepared.map.colorSpace = THREE.SRGBColorSpace;
        prepared.map.needsUpdate = true;
      }

      if (!prepared.map && prepared.color) {
        prepared.color.set(index === 0 ? 0x7a4a24 : 0x76716b);
      }

      if ('metalness' in prepared) {
        prepared.metalness = Math.max(prepared.metalness ?? 0, index === 0 ? 0 : 0.35);
      }

      if ('roughness' in prepared) {
        prepared.roughness = Math.max(prepared.roughness ?? 0.55, 0.62);
      }

      prepared.needsUpdate = true;
      return prepared;
    });

    child.material = Array.isArray(child.material) ? preparedMaterials : preparedMaterials[0];
  });
}

function updateHeldAxe(deltaTime, player) {
  if (!axe || !hasAxe || !player) return;

  currentAxeHolder = player;
  axe.visible = true;

  if (axeSwingTimer > 0) {
    axeSwingTimer = Math.max(0, axeSwingTimer - deltaTime);
  }

  const swingProgress = axeSwingTimer > 0
    ? 1 - axeSwingTimer / axeSwingDuration
    : 0;
  const swing = axeSwingTimer > 0
    ? Math.sin(swingProgress * Math.PI)
    : 0;

  player.userData.axeSwing = swing;

  const hand = player.userData.playerParts?.rightHand;

  if (hand) {
    hand.updateWorldMatrix(true, false);
    hand.getWorldPosition(axeHandPosition);

    axeForwardOffset.copy(axeGripOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    axe.position.copy(axeHandPosition);
    axe.position.add(axeForwardOffset);
    axeDirectionToTree.subVectors(treeCutPosition, axe.position);
    const targetYaw = axeDirectionToTree.lengthSq() > 0.001
      ? Math.atan2(axeDirectionToTree.x, axeDirectionToTree.z)
      : player.rotation.y;
    axe.rotation.set(Math.PI - 0.34 - swing * 0.55, targetYaw, 0);
    return;
  }

  axeHandWorldOffset.copy(axeHandOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
  axe.position.copy(player.position).add(axeHandWorldOffset);
  axe.rotation.set(Math.PI - 0.34 - swing * 0.55, player.rotation.y, 0);
}

function orientAxeModelVertically(model) {
  axeBox.setFromObject(model);
  axeBox.getSize(axeSize);

  if (axeSize.x >= axeSize.y && axeSize.x >= axeSize.z) {
    model.rotation.z = Math.PI * 0.5;
  } else if (axeSize.z >= axeSize.x && axeSize.z >= axeSize.y) {
    model.rotation.x = -Math.PI * 0.5;
  }

  model.updateMatrixWorld(true);
  axeBox.setFromObject(model);
  axeBox.getSize(axeSize);
  axeGripPoint.set(
    (axeBox.min.x + axeBox.max.x) * 0.5,
    axeBox.max.y,
    (axeBox.min.z + axeBox.max.z) * 0.5
  );

  model.position.sub(axeGripPoint);
}

function createCuttableTree(scene) {
  cuttableTree = new THREE.Group();
  cuttableTree.name = 'cuttable-wood-task-tree';
  cuttableTree.position.copy(treeBasePosition);

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x684020, roughness: 0.86 });
  const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x1f6f43, roughness: 0.78 });

  treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 4.1, 10), trunkMaterial);
  treeTrunk.position.y = 2.05;
  treeTrunk.castShadow = true;
  treeTrunk.receiveShadow = true;
  cuttableTree.add(treeTrunk);

  treeLeaves = new THREE.Group();
  const pineLayers = [
    { y: 2.85, radius: 1.35, height: 1.55 },
    { y: 3.65, radius: 1.08, height: 1.42 },
    { y: 4.35, radius: 0.82, height: 1.22 },
    { y: 4.95, radius: 0.52, height: 0.92 }
  ];

  pineLayers.forEach(({ y, radius, height }) => {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 14),
      leavesMaterial
    );
    crown.position.set(0, y, 0);
    crown.rotation.y = Math.random() * 0.2;
    crown.castShadow = true;
    crown.receiveShadow = true;
    treeLeaves.add(crown);
  });

  cuttableTree.add(treeLeaves);
  scene.add(cuttableTree);
}

function spawnLeafBurst() {
  if (!sceneRef) return;

  const leafMaterial = new THREE.MeshBasicMaterial({
    color: 0x75b85a,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  for (let i = 0; i < 18; i += 1) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.1), leafMaterial.clone());
    leaf.position.set(
      treeCutPosition.x + (Math.random() - 0.5) * 1.6,
      treeCutPosition.y + 3.5 + Math.random() * 1.4,
      treeCutPosition.z + (Math.random() - 0.5) * 1.6
    );
    leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    leaf.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2.2,
      Math.random() * 1.8,
      (Math.random() - 0.5) * 2.2
    );
    leaf.userData.spin = new THREE.Vector3(
      Math.random() * 5,
      Math.random() * 5,
      Math.random() * 5
    );
    leaf.userData.life = 1.4 + Math.random() * 0.7;
    leafParticles.push(leaf);
    sceneRef.add(leaf);
  }
}

function updateLeafParticles(deltaTime) {
  for (let i = leafParticles.length - 1; i >= 0; i -= 1) {
    const leaf = leafParticles[i];
    const velocity = leaf.userData.velocity;
    const spin = leaf.userData.spin;

    velocity.y += leafGravity * deltaTime;
    leaf.position.addScaledVector(velocity, deltaTime);
    leaf.rotation.x += spin.x * deltaTime;
    leaf.rotation.y += spin.y * deltaTime;
    leaf.rotation.z += spin.z * deltaTime;
    leaf.userData.life -= deltaTime;
    leaf.material.opacity = Math.max(0, leaf.userData.life / 1.2);

    if (leaf.userData.life <= 0 || leaf.position.y < treeCutPosition.y + 0.1) {
      sceneRef.remove(leaf);
      leaf.geometry.dispose();
      leaf.material.dispose();
      leafParticles.splice(i, 1);
    }
  }
}

function updateTreeShake(deltaTime) {
  if (!cuttableTree) return;

  if (treeShakeTimer > 0) {
    treeShakeTimer = Math.max(0, treeShakeTimer - deltaTime);
    const amount = treeShakeTimer / 0.35;
    const shake = Math.sin(performance.now() * 0.06) * amount;
    treeTrunk.rotation.z = shake * 0.08;
    treeLeaves.rotation.z = -shake * 0.14;
    treeLeaves.position.x = shake * 0.16;
  } else {
    treeTrunk.rotation.z = 0;
    treeLeaves.rotation.z = 0;
    treeLeaves.position.x = 0;
  }
}

function spawnWoodPieces() {
  if (!sceneRef || woodPieces.length > 0) return;

  const logMaterial = new THREE.MeshStandardMaterial({ color: 0x8b572a, roughness: 0.78 });

  for (let i = 0; i < 3; i += 1) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 1.08, 10), logMaterial.clone());
    log.position.set(
      treeCutPosition.x + (i - 1) * 0.32,
      treeCutPosition.y + 2.2 + i * 0.2,
      treeCutPosition.z + 0.55 + Math.random() * 0.2
    );
    log.rotation.set(Math.PI * 0.5, Math.random() * Math.PI, Math.PI * 0.5);
    log.castShadow = true;
    log.receiveShadow = true;
    sceneRef.add(log);

    const physicsProp = addPhysicsBox(log, {
      size: new THREE.Vector3(1.08, 0.36, 0.36),
      groundY: treeCutPosition.y,
      mass: 0.75,
      velocityX: (Math.random() - 0.5) * 1.6,
      velocityY: 1.2 + Math.random() * 0.7,
      velocityZ: 1.2 + Math.random() * 0.9,
      angularX: Math.random() * 4 - 2,
      angularY: Math.random() * 5 - 2.5,
      angularZ: Math.random() * 4 - 2
    });

    woodPieces.push({ mesh: log, physicsProp });
  }
}

function revealWood() {
  if (!wood) return;

  wood.visible = true;
  wood.position.copy(woodPosition);
  wood.scale.copy(woodGroundScale);
  wood.rotation.x = Math.PI / 2;
  wood.rotation.y = Math.PI;
  wood.updateMatrixWorld(true);

  if (woodCollider && !modelColliders.includes(woodCollider)) {
    modelColliders.push(woodCollider);
  }
}

function hideWoodPieces() {
  woodPieces.forEach(({ mesh, physicsProp }) => {
    removePhysicsProp(physicsProp);
    sceneRef?.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  woodPieces = [];
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f') return;

  if (canTakeAxe) {
    hasAxe = true;
    axe.visible = true;
    
    if (axeLight) {
      axeLight.visible = false;
    }
    
    removeAxeCollider();
    
    canTakeAxe = false;
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  if (canCutTree && axeSwingTimer <= 0) {
    axeSwingTimer = axeSwingDuration;
    treeHitCount += 1;
    treeShakeTimer = 0.35;
    spawnLeafBurst();

    if (currentAxeHolder) {
      currentAxeHolder.userData.axeSwing = 1;
    }

    if (treeHitCount >= requiredTreeHits) {
      canCutTree = false;
      spawnWoodPieces();
    }

    return;
  }

  if (canCollectWood) {
    hasWood = true;
    canCollectWood = false;
    hideWoodPieces();
    revealWood();
    removeWoodCollider();
    woodTaskPrompt.classList.remove('is-visible');
  }
});
export function loadWoodTask(scene) {
  if (woodTaskLoadPromise) return woodTaskLoadPromise;

  sceneRef = scene;
  if (!cuttableTree) {
    createCuttableTree(scene);
  }

  woodTaskLoadPromise = Promise.all([

    new Promise((resolve) => {
      gltfLoader.load(
        './models_optimized/medieval_axe.glb',
        (gltf) => {
          const axeModel = gltf.scene;
          axe = new THREE.Group();
          axe.name = 'held-axe-grip-pivot';

          axe.position.copy(axePosition);
          axe.rotation.set(Math.PI * 0.5, axeBaseRotationY, 0);
          axeStartY = axe.position.y;

          axeModel.scale.setScalar(0.026);
          prepareAxeModel(axeModel);
          orientAxeModelVertically(axeModel);
          enableShadows(axeModel);
          axe.add(axeModel);

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
  updateHeldAxe(deltaTime, player);
  updateTreeShake(deltaTime);
  updateLeafParticles(deltaTime);

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
    wood.visible = true;
    woodCarryTarget.copy(player.position).add(woodCarryOffset);
    wood.position.lerp(woodCarryTarget, Math.min(deltaTime * 8, 1));
    wood.scale.lerp(woodCarryScale, Math.min(deltaTime * 8, 1));
    wood.rotation.x = Math.PI / 2;
    wood.rotation.y = Math.PI;
    
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  canTakeAxe = !hasAxe && axe.position.distanceToSquared(player.position) < 9;
  canCutTree =
    hasAxe &&
    !hasWood &&
    treeHitCount < requiredTreeHits &&
    treeCutPosition.distanceToSquared(player.position) < 25;
  canCollectWood =
    hasAxe &&
    !hasWood &&
    treeHitCount >= requiredTreeHits &&
    woodPieces.some(({ mesh }) => mesh.position.distanceToSquared(player.position) < 16);

  if (canTakeAxe) {
    woodTaskPrompt.textContent = 'Press F to take the axe';
    woodTaskPrompt.classList.add('is-visible');
  } else if (canCutTree) {
    const hitsLeft = requiredTreeHits - treeHitCount;
    woodTaskPrompt.textContent = hitsLeft > 1
      ? 'Press F to cut the tree'
      : 'Press F for the final cut';
    woodTaskPrompt.classList.add('is-visible');
  } else if (canCollectWood) {
    woodTaskPrompt.textContent = 'Press F to collect the wood';
    woodTaskPrompt.classList.add('is-visible');
  } else if (hasAxe && !hasWood && treeHitCount < requiredTreeHits) {
    woodTaskPrompt.textContent = 'Go to the trees and cut wood';
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
  hasAxe = false;
  woodTaskComplete = true;
  canCollectWood = false;
  canCutTree = false;
  canTakeAxe = false;
  axeSwingTimer = 0;

  if (wood) {
    wood.visible = false;
  }

  if (axe) {
    axe.visible = false;
  }

  if (currentAxeHolder) {
    currentAxeHolder.userData.axeSwing = 0;
  }
  
  removeWoodCollider();
  removeAxeCollider();

  woodTaskPrompt.classList.remove('is-visible');
}
