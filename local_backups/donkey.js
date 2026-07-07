import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const donkeyPath = '/models/donkey_pocket_shrek_and_animations.glb';
const donkeyPosition = new THREE.Vector3(-7.46, 0.15, 44.67);
const donkeyHeight = 2.35;
const donkeyRotationOffsetY = Math.PI / 2;

let donkey = null;
let donkeySkinnedMesh = null;
let donkeyBones = [];
let donkeyParts = {};
let donkeyInitialRotations = {};
let donkeyStartY = donkeyPosition.y;

function findBone(namePart) {
  return donkeyBones.find((bone) => bone.name.includes(namePart)) || null;
}

function saveInitialRotations(parts) {
  const rotations = {};

  for (const key in parts) {
    if (Array.isArray(parts[key])) {
      rotations[key] = parts[key].map((part) => part.rotation.clone());
    } else if (parts[key]) {
      rotations[key] = parts[key].rotation.clone();
    }
  }

  return rotations;
}

function resetDonkeyPose() {
  for (const key in donkeyParts) {
    const part = donkeyParts[key];
    const initial = donkeyInitialRotations[key];

    if (Array.isArray(part) && Array.isArray(initial)) {
      part.forEach((bone, index) => {
        if (bone && initial[index]) {
          bone.rotation.copy(initial[index]);
        }
      });
    } else if (part && initial) {
      part.rotation.copy(initial);
    }
  }
}

function rotateBone(bone, axis, amount) {
  if (bone) {
    bone.rotation[axis] += amount;
  }
}

function buildDonkeyParts() {
  return {
    spine: findBone('jnt_c_torso_spine_02'),
    head: findBone('jnt_c_torso_head'),
    leftFrontShoulder: findBone('jnt_l_arm_shoulder'),
    leftFrontElbow: findBone('jnt_l_arm_elbow'),
    leftFrontWrist: findBone('jnt_l_arm_wrist'),
    leftFrontHoof: findBone('jnt_l_arm_ball'),
    rightFrontShoulder: findBone('jnt_r_arm_shoulder'),
    rightFrontElbow: findBone('jnt_r_arm_elbow'),
    rightFrontWrist: findBone('jnt_r_arm_wrist'),
    rightFrontHoof: findBone('jnt_r_arm_ball'),
    leftBackHip: findBone('jnt_l_leg_hip'),
    leftBackKnee: findBone('jnt_l_leg_knee'),
    leftBackAnkle: findBone('jnt_l_leg_ankle'),
    leftBackHoof: findBone('jnt_l_leg_ball'),
    rightBackHip: findBone('jnt_r_leg_hip'),
    rightBackKnee: findBone('jnt_r_leg_knee'),
    rightBackAnkle: findBone('jnt_r_leg_ankle'),
    rightBackHoof: findBone('jnt_r_leg_ball'),
    tail: [
      findBone('jnt_c_torso_tail_1'),
      findBone('jnt_c_torso_tail_2'),
      findBone('jnt_c_torso_tail_3'),
      findBone('jnt_c_torso_tail_4')
    ].filter(Boolean)
  };
}

export function loadDonkey(scene) {
  loader.load(
    donkeyPath,
    (gltf) => {
      donkey = gltf.scene;
      donkeyBones = [];
      donkeySkinnedMesh = null;

      if (gltf.animations.length) {
        console.log('Donkey clips ignored; using custom idle:', gltf.animations.map((clip) => clip.name));
      }

      donkey.traverse((child) => {
        if (child.isBone) {
          donkeyBones.push(child);
        }

        if (child.isSkinnedMesh) {
          donkeySkinnedMesh = child;
        }

        if (child.name.includes('CFXM3') || child.name.includes('MagicAura')) {
          child.visible = false;
        }

        if (child.isMesh || child.isSkinnedMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;

          if (child.material?.map) {
            child.material.map.colorSpace = THREE.SRGBColorSpace;
            child.material.map.needsUpdate = true;
          }
        }
      });

      if (donkeySkinnedMesh?.skeleton) {
        donkeyBones = donkeySkinnedMesh.skeleton.bones;
      }

      const box = new THREE.Box3().setFromObject(donkey);
      const size = box.getSize(new THREE.Vector3());
      const scale = size.y > 0 ? donkeyHeight / size.y : 1;
      donkey.scale.setScalar(scale);

      const scaledBox = new THREE.Box3().setFromObject(donkey);
      donkey.position.copy(donkeyPosition);
      donkey.position.y += donkeyPosition.y - scaledBox.min.y;
      donkeyStartY = donkey.position.y;
      donkey.rotation.y = donkeyRotationOffsetY;

      donkeyParts = buildDonkeyParts();
      donkeyInitialRotations = saveInitialRotations(donkeyParts);

      scene.add(donkey);
      console.log('Donkey loaded', donkeyParts);
    },
    undefined,
    (error) => {
      console.error(`Error loading ${donkeyPath}`, error);
    }
  );
}

export function updateDonkey(deltaTime, player) {
  if (!donkey) return;

  const time = performance.now() * 0.001;
  const hoofTap = Math.sin(time * 4.6);
  const oppositeHoofTap = -hoofTap;
  const quickTap = Math.max(0, Math.sin(time * 9.2));
  const oppositeQuickTap = Math.max(0, Math.sin(time * 9.2 + Math.PI));
  const tailSwing = Math.sin(time * 4.4);

  resetDonkeyPose();

  donkey.position.y = donkeyStartY + Math.sin(time * 1.6) * 0.012;

  if (player) {
    const directionX = player.position.x - donkey.position.x;
    const directionZ = player.position.z - donkey.position.z;
    const targetYaw = Math.atan2(directionX, directionZ) + donkeyRotationOffsetY;
    donkey.rotation.y = THREE.MathUtils.lerp(
      donkey.rotation.y,
      targetYaw,
      Math.min(deltaTime * 3, 1)
    );
  }

  rotateBone(donkeyParts.spine, 'z', Math.sin(time * 1.7) * 0.035);
  rotateBone(donkeyParts.spine, 'x', Math.sin(time * 2.1) * 0.025);
  rotateBone(donkeyParts.head, 'y', Math.sin(time * 1.3) * 0.16);
  rotateBone(donkeyParts.head, 'x', Math.sin(time * 1.9) * 0.07);

  rotateBone(donkeyParts.leftFrontShoulder, 'z', hoofTap * 0.18);
  rotateBone(donkeyParts.leftFrontShoulder, 'x', quickTap * 0.12);
  rotateBone(donkeyParts.leftFrontElbow, 'z', quickTap * 0.22);
  rotateBone(donkeyParts.leftFrontWrist, 'z', quickTap * 0.28);
  rotateBone(donkeyParts.leftFrontHoof, 'z', quickTap * 0.35);
  rotateBone(donkeyParts.leftFrontHoof, 'x', quickTap * 0.16);

  rotateBone(donkeyParts.rightFrontShoulder, 'z', oppositeHoofTap * 0.18);
  rotateBone(donkeyParts.rightFrontShoulder, 'x', oppositeQuickTap * 0.12);
  rotateBone(donkeyParts.rightFrontElbow, 'z', oppositeQuickTap * 0.22);
  rotateBone(donkeyParts.rightFrontWrist, 'z', oppositeQuickTap * 0.28);
  rotateBone(donkeyParts.rightFrontHoof, 'z', oppositeQuickTap * 0.35);
  rotateBone(donkeyParts.rightFrontHoof, 'x', oppositeQuickTap * 0.16);

  rotateBone(donkeyParts.leftBackHip, 'z', oppositeHoofTap * 0.13);
  rotateBone(donkeyParts.leftBackKnee, 'z', oppositeQuickTap * 0.14);
  rotateBone(donkeyParts.leftBackAnkle, 'z', oppositeQuickTap * 0.22);
  rotateBone(donkeyParts.leftBackHoof, 'z', oppositeQuickTap * 0.28);

  rotateBone(donkeyParts.rightBackHip, 'z', hoofTap * 0.13);
  rotateBone(donkeyParts.rightBackKnee, 'z', quickTap * 0.14);
  rotateBone(donkeyParts.rightBackAnkle, 'z', quickTap * 0.22);
  rotateBone(donkeyParts.rightBackHoof, 'z', quickTap * 0.28);

  donkeyParts.tail.forEach((bone, index) => {
    rotateBone(bone, 'x', tailSwing * (0.12 - index * 0.018));
    rotateBone(bone, 'z', Math.sin(time * 3.2 + index * 0.55) * (0.08 - index * 0.012));
  });

  if (donkeySkinnedMesh?.skeleton) {
    donkeySkinnedMesh.skeleton.bones.forEach((bone) => {
      bone.updateMatrixWorld(true);
    });
    donkeySkinnedMesh.skeleton.update();
  }
}
