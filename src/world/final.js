import * as THREE from 'three';
import { createGltfLoader } from '../base/loaders.js';
import { showObjectiveMessage } from '../ui/objectiveMessage.js';
import { createDoorMinigame } from '../minigame/door.js';
import { modelColliders } from './collisionRegistry.js';

const loader = createGltfLoader();

const finaleCharacterPath = './models_optimized/shrek.glb';
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
const finaleGreetingFaceHeight = 3.35;
const finaleGreetingCameraHeight = 3.05;
const finaleGreetingCameraDistance = 7.2;
const finaleIdleAnimationDistance = 80;
const finaleIdleAnimationDistanceSq = finaleIdleAnimationDistance * finaleIdleAnimationDistance;

let finaleStarted = false;
let shrek = null;
let shrekCollider = null;
let shrekStartY = 0;
let canTalkToShrek = false;
let shrekIsTalking = false;
let shrekMustLeaveBeforeTalkAgain = false;
let shrekHasInvitedPlayer = false;
let shrekIsWalkingHome = false;
let shrekHasArrivedHome = false;

let canTalkToShrekProblem = false;
let shrekProblemIsTalking = false;
let shrekProblemDone = false;
let shrekDoorThanksIsTalking = false;

let finaleDifficulty = 'medium';
let doorMinigame = null;
let finaleResting = false;
let finaleGreeting = false;
let finaleFinished = false;

let finaleCallbacks = {
  onRestComplete: () => {}
};

let shrekSkinnedMesh = null;
let shrekMixer = null;
let shrekIdleAction = null;
let shrekWalkAction = null;
let shrekActiveAction = null;
let shrekBodyParts = {};
let shrekInitialRotations = {};
let shrekBones = [];
let shrekWalkTargetIndex = 0;
let finaleLoadPromise = null;

const shrekInteractionDistance = 4;
const shrekWalkSpeed = 3.0;
const shrekArmRestOffset = 0.48;

const shrekDialogueText = 'Shrek: It is raining. Come with me to my house for the night.';
const shrekProblemDialogueText = 'Shrek: The door is stuck, and I need your help to open it.';
const shrekDoorThanksText = "Shrek: Thank you for helping me. Now let's go inside and get some rest.";
const shrekGoodbyeText = 'Shrek: Thank you for helping me. Have a good adventure, brave traveler.';

const shrekDialogue = document.createElement('div');
shrekDialogue.className = 'interaction-dialogue';
shrekDialogue.textContent = 'Press E to talk to Shrek';
document.body.appendChild(shrekDialogue);

const shrekProblemMarker = document.createElement('div');
shrekProblemMarker.className = 'shrek-problem-marker';
shrekProblemMarker.textContent = '?';
document.body.appendChild(shrekProblemMarker);

const restOverlay = document.createElement('div');
restOverlay.className = 'rest-overlay';
restOverlay.innerHTML = '<p>Our hero is resting...</p>';
document.body.appendChild(restOverlay);

const endingOverlay = document.createElement('div');
endingOverlay.className = 'ending-overlay';
endingOverlay.innerHTML = `
  <section class="ending-panel" role="dialog" aria-modal="true" aria-labelledby="ending-title">
    <p class="ending-kicker">The morning returns</p>
    <h1 id="ending-title">The End</h1>
    <p>You have helped all the inhabitants of the Lost Magic Isles and restored hope to the kingdom. Now, your journey is not over: it is time to continue your adventure across the world.</p>
    <button class="ending-restart-button" type="button">Restart</button>
  </section>
`;
document.body.appendChild(endingOverlay);

endingOverlay.querySelector('.ending-restart-button').addEventListener('click', () => {
  window.location.reload();
});

window.addEventListener('keydown', (event) => {
  if (!finaleStarted) return;

  if (event.key === 'Enter' && shrekDoorThanksIsTalking) {
    shrekDoorThanksIsTalking = false;
    shrekDialogue.classList.remove('story-dialogue', 'is-visible');
    startRestSequence();
    return;
  }

  if (event.key === 'Enter' && finaleGreeting) {
    finaleGreeting = false;
    finaleFinished = true;
    shrekDialogue.classList.remove('story-dialogue', 'is-visible');
    endingOverlay.classList.add('is-visible');
    return;
  }

  if (event.key === 'Enter' && shrekProblemIsTalking) {
    shrekProblemIsTalking = false;
    shrekDialogue.classList.remove('is-visible');
    shrekProblemMarker.classList.remove('is-visible');
    startDoorProblem();
    return;
  }

  if (event.key === 'Enter' && shrekIsTalking) {
    shrekIsTalking = false;
    shrekMustLeaveBeforeTalkAgain = true;
    shrekHasInvitedPlayer = true;
    shrekIsWalkingHome = true;
    shrekWalkTargetIndex = 0;
    shrekDialogue.classList.remove('is-visible');
    showObjectiveMessage('Follow Shrek.');
    return;
  }

  if (event.key.toLowerCase() === 'e' && canTalkToShrekProblem && !shrekProblemIsTalking) {
    shrekProblemIsTalking = true;
    shrekDialogue.classList.remove('shrek-problem-prompt');
    return;
  }

  if (!canTalkToShrek) return;
  if (shrekHasInvitedPlayer) return;
  if (event.key.toLowerCase() !== 'e') return;

  shrekIsTalking = true;
});

function getDoorMinigame() {
  if (!doorMinigame) {
    doorMinigame = createDoorMinigame({
      difficulty: finaleDifficulty,
      title: 'Magic Door Lock',
      instruction: 'Repeat the magic sequence so Shrek can open his door.',
      allowClose: false,
      onSolved: () => {
        shrekProblemDone = true;
        shrekProblemIsTalking = false;
        shrekDoorThanksIsTalking = true;
        canTalkToShrekProblem = false;
        shrekProblemMarker.classList.remove('is-visible');
        
        shrekDialogue.classList.add('story-dialogue');
        shrekDialogue.classList.remove('shrek-problem-prompt');
        shrekDialogue.textContent = shrekDoorThanksText;
        shrekDialogue.classList.add('is-visible');
      }
    });
  }

  doorMinigame.setDifficulty(finaleDifficulty);
  return doorMinigame;
}

function startDoorProblem() {
  if (shrekProblemDone) return;
  getDoorMinigame().open(finaleDifficulty);
}

function startRestSequence() {
  if (finaleResting || finaleGreeting || finaleFinished) return;

  finaleResting = true;
  restOverlay.classList.add('is-visible');

  setTimeout(() => {
    finaleCallbacks.onRestComplete();
    restOverlay.classList.add('is-fading-out');

    setTimeout(() => {
      finaleResting = false;
      finaleGreeting = true;
      restOverlay.classList.remove('is-visible', 'is-fading-out');
      
      shrekDialogue.classList.add('story-dialogue');
      shrekDialogue.classList.remove('shrek-problem-prompt');
      shrekDialogue.textContent = shrekGoodbyeText;
      shrekDialogue.classList.add('is-visible');
    }, 1800);
  }, 10000);
}

function findShrekBone(namePart) {
  if (!shrekBones.length) return null;
  return shrekBones.find((bone) => bone.name.toLowerCase().includes(namePart));
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

function resetShrekPose() {
  for (const key in shrekBodyParts) {
    if (Array.isArray(shrekBodyParts[key]) && shrekInitialRotations[key]) {
      shrekBodyParts[key].forEach((bone, index) => {
        if (shrekInitialRotations[key][index]) {
          bone.rotation.copy(shrekInitialRotations[key][index]);
        }
      });
    } else if (shrekBodyParts[key] && shrekInitialRotations[key]) {
      shrekBodyParts[key].rotation.copy(shrekInitialRotations[key]);
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

function applyShrekLowArmPose() {
  swingBones(shrekBodyParts.rightArm, 'x', shrekArmRestOffset);
  swingBones(shrekBodyParts.leftArm, 'x', -shrekArmRestOffset);
}

function setupShrekAnimations(gltf) {
  shrekMixer = null;
  shrekIdleAction = null;
  shrekWalkAction = null;
  shrekActiveAction = null;
}

function playShrekAction(action) {
  if (!action || shrekActiveAction === action) return;

  action.reset().play();
  if (shrekActiveAction) {
    shrekActiveAction.crossFadeTo(action, 0.2, false);
  }
  shrekActiveAction = action;
}

function settleShrekIdle() {
  if (shrekIdleAction) {
    playShrekAction(shrekIdleAction);
    return;
  }

  if (shrekActiveAction) {
    shrekActiveAction.fadeOut(0.2);
    shrekActiveAction.stop();
    shrekActiveAction = null;
  }

  resetShrekPose();
  applyShrekLowArmPose();
}

function animateShrekWalk(time) {
  resetShrekPose();

  const swing = Math.sin(time * 5.8);
  const oppositeSwing = -swing;

  if (shrekBodyParts.hips) shrekBodyParts.hips.rotation.z += Math.sin(time * 2.9) * 0.018;
  if (shrekBodyParts.spine) shrekBodyParts.spine.rotation.z += -swing * 0.018;
  if (shrekBodyParts.chest) shrekBodyParts.chest.rotation.z += -swing * 0.018;
  if (shrekBodyParts.head) shrekBodyParts.head.rotation.y += Math.sin(time * 2) * 0.08;

  swingBones(shrekBodyParts.rightUpLeg, 'x', swing * 0.44);
  swingBones(shrekBodyParts.leftUpLeg, 'x', oppositeSwing * 0.44);
  swingBones(shrekBodyParts.rightLeg, 'x', Math.max(0, -swing) * 0.36);
  swingBones(shrekBodyParts.leftLeg, 'x', Math.max(0, swing) * 0.36);
  swingBones(shrekBodyParts.rightFoot, 'x', Math.max(0, swing) * 0.14);
  swingBones(shrekBodyParts.leftFoot, 'x', Math.max(0, oppositeSwing) * 0.14);

  swingBones(shrekBodyParts.rightShoulder, 'z', oppositeSwing * 0.16);
  swingBones(shrekBodyParts.leftShoulder, 'z', swing * 0.16);
  
  applyShrekLowArmPose();
  
  swingBones(shrekBodyParts.rightArm, 'z', oppositeSwing * 0.42);
  swingBones(shrekBodyParts.leftArm, 'z', swing * 0.42);
  swingBones(shrekBodyParts.rightForeArm, 'z', Math.max(0, oppositeSwing) * 0.12);
  swingBones(shrekBodyParts.leftForeArm, 'z', Math.max(0, swing) * 0.12);
  swingBones(shrekBodyParts.rightHand, 'z', oppositeSwing * 0.04);
  swingBones(shrekBodyParts.leftHand, 'z', swing * 0.04);
}

function updateShrekWalk(deltaTime, time) {
  const target = finaleWalkRoute[shrekWalkTargetIndex] || finaleHouseTarget;
  const direction = new THREE.Vector3(
    target.x - shrek.position.x,
    0,
    target.z - shrek.position.z
  );
  const distance = direction.length();

  if (distance < 0.18) {
    if (shrekWalkTargetIndex < finaleWalkRoute.length - 1) {
      shrekWalkTargetIndex += 1;
      updateShrekWalk(deltaTime, time);
      return;
    }

    if (finaleWalkLoops) {
      shrekWalkTargetIndex = 0;
      updateShrekWalk(deltaTime, time);
      return;
    }

    shrekIsWalkingHome = false;
    shrekHasArrivedHome = true;
    shrek.position.set(target.x, shrekStartY, target.z);
    shrek.rotation.y = Math.PI / 2;
    shrek.rotation.z = 0;
    
    settleShrekIdle();
    resetShrekPose();
    applyShrekLowArmPose();
    return;
  }

  direction.normalize();
  shrek.visible = true;
  shrek.position.x += direction.x * shrekWalkSpeed * deltaTime;
  shrek.position.z += direction.z * shrekWalkSpeed * deltaTime;
  shrek.position.y = shrekStartY + Math.abs(Math.sin(time * 8)) * 0.055;
  shrek.rotation.y = Math.atan2(direction.x, direction.z);
  shrek.rotation.x = 0;
  shrek.rotation.z = 0;

  animateShrekWalk(time);

  if (shrekSkinnedMesh?.skeleton) {
    shrekSkinnedMesh.skeleton.bones.forEach((bone) => bone.updateMatrixWorld(true));
    shrekSkinnedMesh.skeleton.update();
  }
}

function updateShrekProblemMarker(camera) {
  if (!camera || !shrek || !shrekHasArrivedHome || shrekProblemDone || doorMinigame?.isOpen()) {
    shrekProblemMarker.classList.remove('is-visible');
    return;
  }

  const markerPosition = shrek.position.clone();
  markerPosition.y += 5.2;
  markerPosition.project(camera);

  const isBehindCamera = markerPosition.z < -1 || markerPosition.z > 1;

  if (isBehindCamera) {
    shrekProblemMarker.classList.remove('is-visible');
    return;
  }

  const x = (markerPosition.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-markerPosition.y * 0.5 + 0.5) * window.innerHeight;

  shrekProblemMarker.style.left = `${x}px`;
  shrekProblemMarker.style.top = `${y}px`;
  shrekProblemMarker.classList.add('is-visible');
}

function updateFinaleGreetingCamera(camera) {
  if (!camera || !shrek) return;

  const shrekForward = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(shrek.quaternion)
    .setY(0)
    .normalize();

  const faceTarget = shrek.position.clone();
  faceTarget.y += finaleGreetingFaceHeight;

  const cameraPosition = faceTarget
    .clone()
    .addScaledVector(shrekForward, finaleGreetingCameraDistance);
  cameraPosition.y = shrek.position.y + finaleGreetingCameraHeight;

  camera.position.copy(cameraPosition);
  camera.lookAt(faceTarget);
}

async function prepareShrekMaterial(material, parser) {
  if (!material) return;

  const specGloss = material.userData?.gltfExtensions?.KHR_materials_pbrSpecularGlossiness;

  if (specGloss?.diffuseTexture) {
    const texture = await parser.getDependency('texture', specGloss.diffuseTexture.index);
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
  if (shrek) shrek.visible = true;
}

export function setFinaleDifficulty(difficulty) {
  finaleDifficulty = difficulty;
  if (doorMinigame) doorMinigame.setDifficulty(difficulty);
}

export function isFinaleInputLocked() {
  return (
    shrekIsTalking ||
    shrekProblemIsTalking ||
    shrekDoorThanksIsTalking ||
    finaleResting ||
    finaleGreeting ||
    finaleFinished ||
    Boolean(doorMinigame?.isOpen())
  );
}

export function setFinaleCallbacks(callbacks = {}) {
  finaleCallbacks = {
    ...finaleCallbacks,
    ...callbacks
  };
}

export function loadFinale(scene) {
  if (finaleLoadPromise) return finaleLoadPromise;

  finaleLoadPromise = new Promise((resolve) => {
    loader.load(
      finaleCharacterPath,
      (gltf) => {
        shrek = gltf.scene;
        const materialPromises = [];
        shrekBones = [];
        shrekSkinnedMesh = null;

        shrek.traverse((child) => {
          if (child.isBone) shrekBones.push(child);
          if (child.isSkinnedMesh) shrekSkinnedMesh = child;

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
                prepareShrekMaterial(material, gltf.parser)
              )
            );
          }
        });

        if (shrekSkinnedMesh?.skeleton) {
          shrekBones = shrekSkinnedMesh.skeleton.bones;
        }

        const box = new THREE.Box3().setFromObject(shrek);
        const size = box.getSize(new THREE.Vector3());
        const scale = size.y > 0 ? finaleCharacterHeight / size.y : 1;
        
        shrek.scale.setScalar(scale);
        shrek.position.copy(finaleCharacterPosition);
        shrek.rotation.y = finaleCharacterRotationY;
        shrek.visible = false;

        const scaledBox = new THREE.Box3().setFromObject(shrek);
        shrek.position.y += finaleCharacterPosition.y - scaledBox.min.y;
        shrekStartY = shrek.position.y;

        shrekCollider = new THREE.Box3();
        modelColliders.push(shrekCollider);

        shrekBodyParts = {
          hips: shrekBones[3] || null,
          pelvis: shrekBones[4] || null,
          spine: shrekBones[13] || null,
          chest: shrekBones[15] || null,
          neck: shrekBones[16] || null,
          head: shrekBones[17] || null,
          rightUpLeg: shrekBones[5] || null,
          rightLeg: shrekBones[6] || null,
          rightFoot: shrekBones[7] || null,
          leftUpLeg: shrekBones[9] || null,
          leftLeg: shrekBones[10] || null,
          leftFoot: shrekBones[11] || null,
          rightShoulder: shrekBones[56] || null,
          rightArm: shrekBones[57] || null,
          rightForeArm: shrekBones[58] || null,
          rightHand: shrekBones[59] || null,
          leftShoulder: shrekBones[78] || null,
          leftArm: shrekBones[79] || null,
          leftForeArm: shrekBones[80] || null,
          leftHand: shrekBones[81] || null
        };
        
        shrekInitialRotations = saveInitialRotations(shrekBodyParts);
        setupShrekAnimations(gltf);

        Promise.all(materialPromises).then(() => {
          scene.add(shrek);
          if (finaleStarted) shrek.visible = true;
          console.log(`${finaleCharacterName} loaded for finale`);
          resolve(shrek);
        });
      },
      undefined,
      (error) => {
        console.error(`Error loading ${finaleCharacterPath}`, error);
        resolve(null);
      }
    );
  });

  return finaleLoadPromise;
}

export function updateFinale(deltaTime, player, camera) {
  if (!finaleStarted) {
    shrekDialogue.classList.remove('story-dialogue', 'is-visible', 'shrek-problem-prompt');
    shrekProblemMarker.classList.remove('is-visible');
    return false;
  }

  if (!shrek || !player) return false;

  if (shrekCollider && shrek.visible) {
    shrekCollider.setFromObject(shrek);
    const center = shrekCollider.getCenter(new THREE.Vector3());
    const size = shrekCollider.getSize(new THREE.Vector3());
    size.x *= 0.6; 
    size.z *= 0.6;
    shrekCollider.setFromCenterAndSize(center, size);
  } else if (shrekCollider && !shrek.visible) {
    shrekCollider.makeEmpty(); 
  }

  const time = performance.now() * 0.001;
  const distanceSq = shrek.position.distanceToSquared(player.position);
  const resetDistance = shrekInteractionDistance + 1.2;
  const interactionDistanceSq = shrekInteractionDistance * shrekInteractionDistance;
  const resetDistanceSq = resetDistance * resetDistance;
  
  const shouldAnimateIdle = shrek.visible && (
    distanceSq <= finaleIdleAnimationDistanceSq ||
    shrekIsTalking ||
    shrekProblemIsTalking ||
    shrekDoorThanksIsTalking ||
    finaleResting ||
    finaleGreeting
  );

  if (shrekIsWalkingHome) {
    updateShrekWalk(deltaTime, time);
    shrekDialogue.classList.remove('story-dialogue', 'is-visible', 'shrek-problem-prompt');
    shrekProblemMarker.classList.remove('is-visible');
    return false;
  }

  if (shouldAnimateIdle) {
    shrek.position.y = shrekStartY + Math.sin(time * 1.8) * 0.05;
    shrek.rotation.z = 0;
    settleShrekIdle();
  }

  if (finaleGreeting) {
    updateFinaleGreetingCamera(camera);
  }

  if (shouldAnimateIdle && !shrekHasArrivedHome) {
    shrek.lookAt(player.position.x, shrek.position.y, player.position.z);
  }

  updateShrekProblemMarker(camera);

  if (shrekMustLeaveBeforeTalkAgain && distanceSq > resetDistanceSq) {
    shrekMustLeaveBeforeTalkAgain = false;
  }

  canTalkToShrekProblem =
    shrekHasArrivedHome &&
    !shrekProblemDone &&
    !shrekDoorThanksIsTalking &&
    !finaleResting &&
    !finaleGreeting &&
    !finaleFinished &&
    !doorMinigame?.isOpen() &&
    distanceSq < interactionDistanceSq;

  canTalkToShrek =
    !finaleResting &&
    !finaleGreeting &&
    !finaleFinished &&
    !shrekDoorThanksIsTalking &&
    !shrekHasInvitedPlayer &&
    distanceSq < interactionDistanceSq &&
    !shrekMustLeaveBeforeTalkAgain;

  if (shrekDoorThanksIsTalking) {
    shrekDialogue.classList.add('story-dialogue', 'is-visible');
    shrekDialogue.classList.remove('shrek-problem-prompt');
    shrekDialogue.textContent = shrekDoorThanksText;
  } else if (finaleGreeting) {
    shrekDialogue.classList.add('story-dialogue', 'is-visible');
    shrekDialogue.classList.remove('shrek-problem-prompt');
    shrekDialogue.textContent = shrekGoodbyeText;
  } else if (shrekProblemIsTalking) {
    shrekDialogue.classList.add('story-dialogue', 'is-visible');
    shrekDialogue.classList.remove('shrek-problem-prompt');
    shrekDialogue.textContent = shrekProblemDialogueText;
  } else if (shrekIsTalking) {
    shrekDialogue.classList.add('story-dialogue', 'is-visible');
    shrekDialogue.classList.remove('shrek-problem-prompt');
    shrekDialogue.textContent = shrekDialogueText;
  } else if (canTalkToShrekProblem) {
    shrekDialogue.classList.remove('story-dialogue');
    shrekDialogue.classList.add('shrek-problem-prompt', 'is-visible');
    shrekDialogue.textContent = 'Talk to Shrek';
  } else if (canTalkToShrek) {
    shrekDialogue.classList.remove('story-dialogue', 'shrek-problem-prompt');
    shrekDialogue.classList.add('is-visible');
    shrekDialogue.textContent = `Press E to talk to ${finaleCharacterName}`;
  } else {
    shrekDialogue.classList.remove('story-dialogue', 'shrek-problem-prompt', 'is-visible');
  }

  return isFinaleInputLocked();
}
