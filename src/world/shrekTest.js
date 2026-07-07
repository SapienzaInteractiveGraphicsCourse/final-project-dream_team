import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const shrekStart = new THREE.Vector3(10, 0, 28);
const shrekEnd = new THREE.Vector3(30, 0, 28);
const shrekSpeed = 1.8;
const shrekHeight = 4.2;

let shrek = null;
let shrekSkinnedMesh = null;
let shrekBones = [];
let shrekParts = {};
let shrekInitialRotations = {};
let walkTarget = shrekEnd.clone();

function saveInitialRotations(parts) {
  const rotations = {};

  for (const key in parts) {
    if (parts[key]) {
      rotations[key] = parts[key].rotation.clone();
    }
  }

  return rotations;
}

function resetPose() {
  for (const key in shrekParts) {
    if (shrekParts[key] && shrekInitialRotations[key]) {
      shrekParts[key].rotation.copy(shrekInitialRotations[key]);
    }
  }
}

function findBoneByName(namePart) {
  return shrekBones.find((bone) => bone.name.includes(namePart)) || null;
}

function findMainBones() {
  return {
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
    leftHand: shrekBones[81] || null,
    rightWrist: findBoneByName('ValveBiped.Bip01_R_Wrist'),
    leftWrist: findBoneByName('ValveBiped.Bip01_L_Wrist')
  };
}

function rotatePart(part, axis, amount) {
  if (part) {
    part.rotation[axis] += amount;
  }
}

function animateShrekWalk(time) {
  resetPose();

  const swing = Math.sin(time * 5.8);
  const oppositeSwing = -swing;
  const step = Math.abs(swing);

  if (shrekParts.hips) {
    shrekParts.hips.rotation.z += Math.sin(time * 2.9) * 0.018;
  }

  if (shrekParts.spine) {
    shrekParts.spine.rotation.z += -swing * 0.018;
  }

  if (shrekParts.chest) {
    shrekParts.chest.rotation.z += -swing * 0.018;
  }

  if (shrekParts.head) {
    shrekParts.head.rotation.y += Math.sin(time * 2) * 0.08;
  }

  if (shrekParts.rightUpLeg) {
    shrekParts.rightUpLeg.rotation.x += swing * 0.44;
  }

  if (shrekParts.leftUpLeg) {
    shrekParts.leftUpLeg.rotation.x += oppositeSwing * 0.44;
  }

  if (shrekParts.rightLeg) {
    shrekParts.rightLeg.rotation.x += Math.max(0, -swing) * 0.36;
  }

  if (shrekParts.leftLeg) {
    shrekParts.leftLeg.rotation.x += Math.max(0, swing) * 0.36;
  }

  if (shrekParts.rightFoot) {
    shrekParts.rightFoot.rotation.x += Math.max(0, swing) * 0.14;
  }

  if (shrekParts.leftFoot) {
    shrekParts.leftFoot.rotation.x += Math.max(0, oppositeSwing) * 0.14;
  }

  rotatePart(shrekParts.rightShoulder, 'z', oppositeSwing * 0.16);
  rotatePart(shrekParts.leftShoulder, 'z', swing * 0.16);

  rotatePart(shrekParts.rightArm, 'x', 0.48);
  rotatePart(shrekParts.leftArm, 'x', -0.48);
  rotatePart(shrekParts.rightArm, 'z', oppositeSwing * 0.42);
  rotatePart(shrekParts.leftArm, 'z', swing * 0.42);

  rotatePart(shrekParts.rightForeArm, 'z', Math.max(0, oppositeSwing) * 0.12);
  rotatePart(shrekParts.leftForeArm, 'z', Math.max(0, swing) * 0.12);
  rotatePart(shrekParts.rightHand, 'z', oppositeSwing * 0.04);
  rotatePart(shrekParts.leftHand, 'z', swing * 0.04);
}

export function loadShrekTest(scene) {
  loader.load(
    '/models/shrek.glb',
    (gltf) => {
      shrek = gltf.scene;
      shrekSkinnedMesh = null;
      shrekBones = [];

      shrek.traverse((child) => {
        if (child.isBone) {
          shrekBones.push(child);
        }

        if (child.isSkinnedMesh) {
          shrekSkinnedMesh = child;
        }

        if (child.isMesh || child.isSkinnedMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
        }
      });

      if (shrekSkinnedMesh?.skeleton) {
        shrekBones = shrekSkinnedMesh.skeleton.bones;
      }

      const box = new THREE.Box3().setFromObject(shrek);
      const size = box.getSize(new THREE.Vector3());
      const scale = size.y > 0 ? shrekHeight / size.y : 1;
      shrek.scale.setScalar(scale);

      const scaledBox = new THREE.Box3().setFromObject(shrek);
      shrek.position.copy(shrekStart);
      shrek.position.y += shrekStart.y - scaledBox.min.y;

      shrekParts = findMainBones();
      shrekInitialRotations = saveInitialRotations(shrekParts);
      shrek.rotation.y = Math.PI / 2;

      scene.add(shrek);

      console.log('Shrek test loaded', {
        totalBones: shrekBones.length,
        animations: gltf.animations.map((clip) => clip.name),
        parts: shrekParts
      });
    },
    undefined,
    (error) => {
      console.error('Error loading shrek.glb', error);
    }
  );
}

export function updateShrekTest(deltaTime) {
  if (!shrek) return;

  const time = performance.now() * 0.001;
  const direction = new THREE.Vector3(
    walkTarget.x - shrek.position.x,
    0,
    walkTarget.z - shrek.position.z
  );
  const distance = direction.length();

  if (distance < 0.35) {
    walkTarget = walkTarget.equals(shrekEnd) ? shrekStart.clone() : shrekEnd.clone();
    return;
  }

  direction.normalize();
  shrek.position.x += direction.x * shrekSpeed * deltaTime;
  shrek.position.z += direction.z * shrekSpeed * deltaTime;
  shrek.position.y = shrekStart.y + Math.abs(Math.sin(time * 5.8)) * 0.025;
  shrek.rotation.y = Math.atan2(direction.x, direction.z);

  animateShrekWalk(time);

  if (shrekSkinnedMesh?.skeleton) {
    shrekSkinnedMesh.skeleton.bones.forEach((bone) => {
      bone.updateMatrixWorld(true);
    });
    shrekSkinnedMesh.skeleton.update();
  }
}
