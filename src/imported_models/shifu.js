import * as THREE from 'three';
import { createGltfLoader } from '../base/loaders.js';
import { modelColliders } from '../world/collisionRegistry.js';

const loader = createGltfLoader();

let shifu = null;
let shifuCollider = null; 
let shifuStartY = 0;
let canTalkToShifu = false;
let shifuIsTalking = false;
let shifuDialogueIndex = 0;
let taskStarted = false;
let shifuMustLeaveBeforeTalkAgain = false;
let shifuMaterials = [];
let shifuBaseRotationY = Math.PI;
let shifuLoadPromise = null;

let shifuArmParts = {};
let shifuArmInitialRotations = {};
const upperArmDown = 1.2;
const foreArmRelax = 0.24;

const shifuPosition = new THREE.Vector3(231, 28.4, -258);
const shifuScale = 2;
const interactionDistance = 4;
const shifuGlowColor = new THREE.Color(0x6fffd8);

const shifuDialogueLines = [
  'Shifu: The bridge to my tower has collapsed, and I cannot leave this place.',
  'Shifu: Take the axe, gather wood, and rebuild the bridge.'
];

export function setShifuHeroName(name) {
  shifuDialogueLines[0] = `Shifu: ${name}, the bridge to my tower has collapsed, and I cannot leave this place.`;
}

const shifuBridgeThanksLines = [
  'Shifu: You rebuilt the bridge. Thank you, the path is open again.',
  'Shifu: A storm is coming. Hurry back and use the portal.'
];

let activeDialogueLines = shifuDialogueLines;
let bridgeThanksStarted = false;
let bridgeThanksDone = false;

const shifuDialogue = document.createElement('div');
shifuDialogue.className = 'interaction-dialogue';
shifuDialogue.textContent = 'Press E to talk to Master Shifu';
document.body.appendChild(shifuDialogue);

function setShifuGlow(strength) {
  shifuMaterials.forEach((material) => {
    if (material.emissive) {
      material.emissive.copy(shifuGlowColor);
      material.emissiveIntensity = strength;
      material.needsUpdate = true;
    }
  });
}

function findBone(skinnedMesh, name) {
  if (!skinnedMesh) return null;
  return skinnedMesh.skeleton.bones.find((bone) => bone.name === name);
}

function saveInitialRotations(parts) {
  const rotations = {};
  for (const key in parts) {
    if (parts[key]) {
      rotations[key] = parts[key].rotation.clone();
    }
  }
  return rotations;
}

function poseShifuArms() {
  const parts = shifuArmParts;
  const initial = shifuArmInitialRotations;

  for (const key in parts) {
    if (parts[key] && initial[key]) {
      parts[key].rotation.copy(initial[key]);
    }
  }

  if (parts.leftUpperArm) parts.leftUpperArm.rotation.x -= upperArmDown;
  if (parts.rightUpperArm) parts.rightUpperArm.rotation.x -= upperArmDown;
  if (parts.leftLowerArm) parts.leftLowerArm.rotation.x -= foreArmRelax;
  if (parts.rightLowerArm) parts.rightLowerArm.rotation.x -= foreArmRelax;
}

function getYawToPlayer(player) {
  const directionX = player.position.x - shifu.position.x;
  const directionZ = player.position.z - shifu.position.z;
  return Math.atan2(directionX, directionZ);
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'e' && canTalkToShifu && !shifuIsTalking) {
    activeDialogueLines = bridgeThanksStarted && !bridgeThanksDone
      ? shifuBridgeThanksLines
      : shifuDialogueLines;
    shifuIsTalking = true;
    shifuDialogueIndex = 0;
  }

  if (event.key === 'Enter' && shifuIsTalking) {
    shifuDialogueIndex += 1;

    if (shifuDialogueIndex >= activeDialogueLines.length) {
      shifuIsTalking = false;
      shifuMustLeaveBeforeTalkAgain = true;

      if (activeDialogueLines === shifuDialogueLines) {
        taskStarted = true;
      }

      if (activeDialogueLines === shifuBridgeThanksLines) {
        bridgeThanksDone = true;
      }
    }
  }
});

export function loadShifuTask(scene) {
  if (shifuLoadPromise) return shifuLoadPromise;

  shifuLoadPromise = new Promise((resolve) => {
    loader.load(
      './models_optimized/shifu.glb',
      (gltf) => {
        shifu = new THREE.Group();
        shifuMaterials = [];
        
        const model = gltf.scene;
        let skinnedMesh = null;

        shifu.position.copy(shifuPosition);
        shifuStartY = shifuPosition.y;
        shifuBaseRotationY = Math.PI;
        shifu.rotation.y = shifuBaseRotationY;

        model.scale.set(shifuScale, shifuScale, shifuScale);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;

        shifuCollider = new THREE.Box3();
        modelColliders.push(shifuCollider);

        model.traverse((child) => {
          if (child.isSkinnedMesh) {
            skinnedMesh = child;
          }

          if (child.isMesh || child.isSkinnedMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            child.material = Array.isArray(child.material)
              ? child.material.map((material) => material.clone())
              : child.material.clone();

            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach((material) => {
              if (material.map) {
                material.map.colorSpace = THREE.SRGBColorSpace;
                material.map.needsUpdate = true;
              }
              shifuMaterials.push(material);
            });
          }
        });

        if (skinnedMesh) {
          shifuArmParts = {
            leftUpperArm: findBone(skinnedMesh, 'upperarm_l_26'),
            rightUpperArm: findBone(skinnedMesh, 'upperarm_r_44'),
            leftLowerArm: findBone(skinnedMesh, 'lowerarm_l_24'),
            rightLowerArm: findBone(skinnedMesh, 'lowerarm_r_42')
          };
          shifuArmInitialRotations = saveInitialRotations(shifuArmParts);
          poseShifuArms();
        }

        shifu.add(model);
        scene.add(shifu);

        console.log('Shifu loaded');
        resolve(shifu);
      },
      undefined,
      (error) => {
        console.error('Error loading shifu.glb', error);
        resolve(null);
      }
    );
  });

  return shifuLoadPromise;
}

export function updateShifuTask(deltaTime, player) {
  if (!shifu) return;

  const time = performance.now() * 0.001;
  poseShifuArms();

  const idleBob = Math.sin(time * 1.8) * 0.16;

  if (!taskStarted && !shifuIsTalking) {
    shifu.position.y = shifuStartY + idleBob + Math.abs(Math.sin(time * 2)) * 0.25;
    shifu.rotation.z = 0;
    setShifuGlow(0.16 + Math.sin(time * 2.5) * 0.06);
  } else {
    shifu.position.y = shifuStartY + idleBob;
    shifu.rotation.z = Math.sin(time * 1.4) * 0.035;
    setShifuGlow(0);
  }

  if (shifuCollider) {
    shifuCollider.setFromObject(shifu);
    const center = shifuCollider.getCenter(new THREE.Vector3());
    const size = shifuCollider.getSize(new THREE.Vector3());
    size.x *= 0.5;
    size.z *= 0.5;
    shifuCollider.setFromCenterAndSize(center, size);
  }

  const resetDistance = interactionDistance + 1.2;
  const distanceSq = shifu.position.distanceToSquared(player.position);
  const interactionDistanceSq = interactionDistance * interactionDistance;
  const resetDistanceSq = resetDistance * resetDistance;

  if (shifuMustLeaveBeforeTalkAgain && distanceSq > resetDistanceSq) {
    shifuMustLeaveBeforeTalkAgain = false;
  }

  canTalkToShifu = distanceSq < interactionDistanceSq && !shifuMustLeaveBeforeTalkAgain;

  if (distanceSq < interactionDistanceSq) {
    shifuBaseRotationY = getYawToPlayer(player);
    shifu.rotation.x = 0;
    shifu.rotation.y = shifuBaseRotationY;
    shifu.rotation.z = 0;
  } else {
    shifu.rotation.x = 0;
    shifu.rotation.y = shifuBaseRotationY + Math.sin(time * 1.4) * 0.08;
  }

  if (shifuIsTalking) {
    shifuDialogue.classList.add('story-dialogue');
    shifuDialogue.textContent = activeDialogueLines[shifuDialogueIndex];
    shifuDialogue.classList.add('is-visible');
  } else if (bridgeThanksStarted && !bridgeThanksDone && canTalkToShifu) {
    shifuDialogue.classList.remove('story-dialogue');
    shifuDialogue.textContent = 'Press E to talk to Shifu';
    shifuDialogue.classList.add('is-visible');
  } else if (taskStarted) {
    shifuDialogue.classList.remove('story-dialogue');
    shifuDialogue.classList.remove('is-visible');
  } else if (canTalkToShifu) {
    shifuDialogue.classList.remove('story-dialogue');
    shifuDialogue.textContent = 'Press E to talk to Shifu';
    shifuDialogue.classList.add('is-visible');
  } else {
    shifuDialogue.classList.remove('story-dialogue');
    shifuDialogue.classList.remove('is-visible');
  }
  
  return shifuIsTalking;
}

export function isShifuTaskStarted() {
  return taskStarted;
}

export function startShifuBridgeThanks() {
  if (bridgeThanksStarted || bridgeThanksDone) return;

  activeDialogueLines = shifuBridgeThanksLines;
  shifuDialogueIndex = 0;
  bridgeThanksStarted = true;
  shifuMustLeaveBeforeTalkAgain = false;
  shifuIsTalking = false;
}
