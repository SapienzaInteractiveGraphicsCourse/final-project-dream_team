import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const finaleCharacterPath = '/models/shrek.glb';
const finaleCharacterName = 'Shrek';
const finaleCharacterPosition = new THREE.Vector3(-8.65, 0.40, 34.79);
const finaleHouseTarget = new THREE.Vector3(-36.04, 0.15, 62.42);
const finaleWalkRoute = [
  new THREE.Vector3(-14.5, 0.15, 41.5),
  new THREE.Vector3(-22.5, 0.15, 50.5),
  new THREE.Vector3(-30.5, 0.15, 58.5),
  finaleHouseTarget
];
const finaleCharacterHeight = 4.2;
const finaleCharacterRotationY = Math.PI / 2;
const finaleWalkLoops = false;

let finaleStarted = false;
let flynn = null;
let flynnStartY = 0;
let canTalkToFlynn = false;
let flynnIsTalking = false;
let flynnMustLeaveBeforeTalkAgain = false;
let flynnHasInvitedPlayer = false;
let flynnIsWalkingHome = false;
let flynnHasArrivedHome = false;
let flynnSkinnedMesh = null;
let flynnMixer = null;
let flynnIdleAction = null;
let flynnWalkAction = null;
let flynnActiveAction = null;
let flynnBodyParts = {};
let flynnInitialRotations = {};
let flynnBones = [];
let flynnWalkTargetIndex = 0;

const flynnInteractionDistance = 4;
const flynnWalkSpeed = 2.2;
const flynnDialogueText =
  'Shrek: It is raining. Come with me to my house for the night.';

const flynnDialogue = document.createElement('div');
flynnDialogue.className = 'interaction-dialogue';
flynnDialogue.textContent = 'Press E to talk to Shrek';
document.body.appendChild(flynnDialogue);

window.addEventListener('keydown', (event) => {
  if (!finaleStarted) return;

  if (event.key === 'Enter' && flynnIsTalking) {
    flynnIsTalking = false;
    flynnMustLeaveBeforeTalkAgain = true;
    flynnHasInvitedPlayer = true;
    flynnIsWalkingHome = true;
    flynnWalkTargetIndex = 0;
    flynnDialogue.classList.remove('is-visible');
    return;
  }

  if (!canTalkToFlynn) return;
  if (flynnHasInvitedPlayer) return;
  if (event.key.toLowerCase() !== 'e') return;

  flynnIsTalking = true;
});

function findFlynnBone(namePart) {
  if (!flynnBones.length) return null;

  return flynnBones.find((bone) =>
    bone.name.toLowerCase().includes(namePart)
  );
}

function findFlynnBones(nameParts, ignoredParts = []) {
  if (!flynnBones.length) return [];

  return flynnBones.filter((bone) => {
    const name = bone.name.toLowerCase();

    return nameParts.every((part) => name.includes(part)) &&
      ignoredParts.every((part) => !name.includes(part));
  });
}

function findFlynnBoneByParts(nameParts, ignoredParts = []) {
  return findFlynnBones(nameParts, ignoredParts)[0] || null;
}

function getFlynnBones(...nameParts) {
  return nameParts.map((namePart) => findFlynnBone(namePart)).filter(Boolean);
}

function saveInitialRotations(parts) {
  const rotations = {};

  for (const key in parts) {
    if (Array.isArray(parts[key])) {
      rotations[key] = parts[key].map((bone) => bone.rotation.clone());
    } else if (parts[key]) {
      rotations[key] = parts[key].rotation.clone();
    }
  }

  return rotations;
}

function resetFlynnPose() {
  for (const key in flynnBodyParts) {
    if (Array.isArray(flynnBodyParts[key]) && flynnInitialRotations[key]) {
      flynnBodyParts[key].forEach((bone, index) => {
        if (flynnInitialRotations[key][index]) {
          bone.rotation.copy(flynnInitialRotations[key][index]);
        }
      });
    } else if (flynnBodyParts[key] && flynnInitialRotations[key]) {
      flynnBodyParts[key].rotation.copy(flynnInitialRotations[key]);
    }
  }
}

function swingBones(bones, axis, amount) {
  if (!bones) return;

  const list = Array.isArray(bones) ? bones : [bones];

  list.forEach((bone, index) => {
    const strength = Math.max(0.35, 1 - index * 0.22);
    bone.rotation[axis] += amount * strength;
  });
}

function getClipByName(clips, pattern) {
  return clips.find((clip) => pattern.test(clip.name));
}

function setupFlynnAnimations(gltf) {
  flynnMixer = null;
  flynnIdleAction = null;
  flynnWalkAction = null;
  flynnActiveAction = null;

  if (gltf.animations.length) {
    console.log(
      `${finaleCharacterName} clips ignored; using custom hierarchical walk:`,
      gltf.animations.map((clip) => clip.name)
    );
  }
}

function playFlynnAction(action) {
  if (!action || flynnActiveAction === action) return;

  action.reset().play();

  if (flynnActiveAction) {
    flynnActiveAction.crossFadeTo(action, 0.2, false);
  }

  flynnActiveAction = action;
}

function settleFlynnIdle() {
  if (flynnIdleAction) {
    playFlynnAction(flynnIdleAction);
    return;
  }

  if (flynnActiveAction) {
    flynnActiveAction.fadeOut(0.2);
    flynnActiveAction.stop();
    flynnActiveAction = null;
  }
}

function animateFlynnWalk(time) {
  resetFlynnPose();

  const swing = Math.sin(time * 5.8);
  const oppositeSwing = -swing;
  const step = Math.abs(swing);

  if (flynnBodyParts.hips) {
    flynnBodyParts.hips.rotation.z += Math.sin(time * 2.9) * 0.018;
  }

  if (flynnBodyParts.spine) {
    flynnBodyParts.spine.rotation.z += -swing * 0.018;
  }

  if (flynnBodyParts.chest) {
    flynnBodyParts.chest.rotation.z += -swing * 0.018;
  }

  if (flynnBodyParts.head) {
    flynnBodyParts.head.rotation.y += Math.sin(time * 2) * 0.08;
  }

  swingBones(flynnBodyParts.rightUpLeg, 'x', swing * 0.44);
  swingBones(flynnBodyParts.leftUpLeg, 'x', oppositeSwing * 0.44);
  swingBones(flynnBodyParts.rightLeg, 'x', Math.max(0, -swing) * 0.36);
  swingBones(flynnBodyParts.leftLeg, 'x', Math.max(0, swing) * 0.36);
  swingBones(flynnBodyParts.rightFoot, 'x', Math.max(0, swing) * 0.14);
  swingBones(flynnBodyParts.leftFoot, 'x', Math.max(0, oppositeSwing) * 0.14);

  swingBones(flynnBodyParts.rightShoulder, 'z', oppositeSwing * 0.16);
  swingBones(flynnBodyParts.leftShoulder, 'z', swing * 0.16);
  swingBones(flynnBodyParts.rightArm, 'x', 0.22);
  swingBones(flynnBodyParts.leftArm, 'x', -0.22);
  swingBones(flynnBodyParts.rightArm, 'z', oppositeSwing * 0.42);
  swingBones(flynnBodyParts.leftArm, 'z', swing * 0.42);
  swingBones(flynnBodyParts.rightForeArm, 'z', Math.max(0, oppositeSwing) * 0.12);
  swingBones(flynnBodyParts.leftForeArm, 'z', Math.max(0, swing) * 0.12);
  swingBones(flynnBodyParts.rightHand, 'z', oppositeSwing * 0.04);
  swingBones(flynnBodyParts.leftHand, 'z', swing * 0.04);
}

function updateFlynnWalk(deltaTime, time) {
  const target = finaleWalkRoute[flynnWalkTargetIndex] || finaleHouseTarget;
  const direction = new THREE.Vector3(
    target.x - flynn.position.x,
    0,
    target.z - flynn.position.z
  );
  const distance = direction.length();

  if (distance < 0.18) {
    if (flynnWalkTargetIndex < finaleWalkRoute.length - 1) {
      flynnWalkTargetIndex += 1;
      updateFlynnWalk(deltaTime, time);
      return;
    }

    if (finaleWalkLoops) {
      flynnWalkTargetIndex = 0;
      updateFlynnWalk(deltaTime, time);
      return;
    }

    flynnIsWalkingHome = false;
    flynnHasArrivedHome = true;
    flynn.position.set(target.x, flynnStartY, target.z);
    flynn.rotation.y = Math.PI / 2;
    flynn.rotation.z = 0;
    settleFlynnIdle();
    resetFlynnPose();
    return;
  }

  direction.normalize();
  flynn.visible = true;
  flynn.position.x += direction.x * flynnWalkSpeed * deltaTime;
  flynn.position.z += direction.z * flynnWalkSpeed * deltaTime;
  flynn.position.y = flynnStartY + Math.abs(Math.sin(time * 8)) * 0.055;
  flynn.rotation.y = Math.atan2(direction.x, direction.z);
  flynn.rotation.x = 0;
  flynn.rotation.z = 0;

  animateFlynnWalk(time);

  if (flynnSkinnedMesh?.skeleton) {
    flynnSkinnedMesh.skeleton.bones.forEach((bone) => {
      bone.updateMatrixWorld(true);
    });
    flynnSkinnedMesh.skeleton.update();
  }
}

async function prepareFlynnMaterial(material, parser) {
  if (!material) return;

  const specGloss =
    material.userData?.gltfExtensions?.KHR_materials_pbrSpecularGlossiness;

  if (specGloss?.diffuseTexture) {
    const texture = await parser.getDependency(
      'texture',
      specGloss.diffuseTexture.index
    );

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    material.map = texture;
  }

  if (specGloss?.diffuseFactor && material.color) {
    material.color.fromArray(specGloss.diffuseFactor);
  }

  if (material.map) {
    material.map.colorSpace = THREE.SRGBColorSpace;
    material.map.needsUpdate = true;
  }

  if ('metalness' in material) {
    material.metalness = 0;
  }

  if ('roughness' in material) {
    material.roughness = specGloss?.glossinessFactor
      ? 1 - specGloss.glossinessFactor
      : Math.min(material.roughness ?? 0.7, 0.7);
  }

  material.needsUpdate = true;
}

export function startFinale() {
  finaleStarted = true;

  if (flynn) {
    flynn.visible = true;
  }
}

export function isFinaleStarted() {
  return finaleStarted;
}

export function loadFinale(scene) {
  loader.load(
    finaleCharacterPath,
    (gltf) => {
      flynn = gltf.scene;
      const materialPromises = [];
      flynnBones = [];
      flynnSkinnedMesh = null;

      flynn.traverse((child) => {
        if (child.isBone) {
          flynnBones.push(child);
        }

        if (child.isSkinnedMesh) {
          flynnSkinnedMesh = child;
        }

        if (child.isMesh || child.isSkinnedMesh) {
          child.frustumCulled = false;
          child.castShadow = true;
          child.receiveShadow = true;

          child.material = Array.isArray(child.material)
            ? child.material.map((material) => material.clone())
            : child.material.clone();

          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materialPromises.push(
            ...materials.map((material) =>
              prepareFlynnMaterial(material, gltf.parser)
            )
          );
        }
      });

      if (flynnSkinnedMesh?.skeleton) {
        flynnBones = flynnSkinnedMesh.skeleton.bones;
      }

      const box = new THREE.Box3().setFromObject(flynn);
      const size = box.getSize(new THREE.Vector3());
      const scale = size.y > 0 ? finaleCharacterHeight / size.y : 1;
      flynn.scale.setScalar(scale);
      flynn.position.copy(finaleCharacterPosition);
      flynn.rotation.y = finaleCharacterRotationY;
      flynn.visible = false;

      const scaledBox = new THREE.Box3().setFromObject(flynn);
      flynn.position.y += finaleCharacterPosition.y - scaledBox.min.y;
      flynnStartY = flynn.position.y;

      flynnBodyParts = {
        hips: flynnBones[3] || null,
        pelvis: flynnBones[4] || null,
        spine: flynnBones[13] || null,
        chest: flynnBones[15] || null,
        neck: flynnBones[16] || null,
        head: flynnBones[17] || null,
        rightUpLeg: flynnBones[5] || null,
        rightLeg: flynnBones[6] || null,
        rightFoot: flynnBones[7] || null,
        leftUpLeg: flynnBones[9] || null,
        leftLeg: flynnBones[10] || null,
        leftFoot: flynnBones[11] || null,
        rightShoulder: flynnBones[56] || null,
        rightArm: flynnBones[57] || null,
        rightForeArm: flynnBones[58] || null,
        rightHand: flynnBones[59] || null,
        leftShoulder: flynnBones[78] || null,
        leftArm: flynnBones[79] || null,
        leftForeArm: flynnBones[80] || null,
        leftHand: flynnBones[81] || null
      };
      flynnInitialRotations = saveInitialRotations(flynnBodyParts);
      setupFlynnAnimations(gltf);
      console.log(`${finaleCharacterName} walk bones`, {
        totalBones: flynnBones.length,
        animations: gltf.animations.map((clip) => clip.name),
        parts: flynnBodyParts
      });

      Promise.all(materialPromises).then(() => {
        scene.add(flynn);

        if (finaleStarted) {
          flynn.visible = true;
        }

        console.log(`${finaleCharacterName} loaded for finale`);
      });
    },
    undefined,
    (error) => {
      console.error(`Error loading ${finaleCharacterPath}`, error);
    }
  );
}

export function updateFinale(deltaTime, player) {
  if (!finaleStarted) {
    flynnDialogue.classList.remove('story-dialogue');
    flynnDialogue.classList.remove('is-visible');
    return false;
  }

  if (!flynn || !player) return false;

  const time = performance.now() * 0.001;

  if (flynnIsWalkingHome) {
    updateFlynnWalk(deltaTime, time);
    flynnDialogue.classList.remove('story-dialogue');
    flynnDialogue.classList.remove('is-visible');
    return false;
  }

  flynn.position.y = flynnStartY + Math.sin(time * 1.8) * 0.05;
  flynn.rotation.z = 0;
  settleFlynnIdle();

  if (!flynnHasArrivedHome) {
    flynn.lookAt(player.position.x, flynn.position.y, player.position.z);
  }

  const distance = flynn.position.distanceTo(player.position);
  const resetDistance = flynnInteractionDistance + 1.2;

  if (flynnMustLeaveBeforeTalkAgain && distance > resetDistance) {
    flynnMustLeaveBeforeTalkAgain = false;
  }

  canTalkToFlynn =
    !flynnHasInvitedPlayer &&
    distance < flynnInteractionDistance &&
    !flynnMustLeaveBeforeTalkAgain;

  if (flynnIsTalking) {
    flynnDialogue.classList.add('story-dialogue');
    flynnDialogue.textContent =
      `${flynnDialogueText} Press Enter to follow ${finaleCharacterName}.`;
    flynnDialogue.classList.add('is-visible');
  } else if (canTalkToFlynn) {
    flynnDialogue.classList.remove('story-dialogue');
    flynnDialogue.textContent = `Press E to talk to ${finaleCharacterName}`;
    flynnDialogue.classList.add('is-visible');
  } else {
    flynnDialogue.classList.remove('story-dialogue');
    flynnDialogue.classList.remove('is-visible');
  }

  return flynnIsTalking;
}
