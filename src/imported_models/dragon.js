import * as THREE from 'three';

let demonDragon = null;
let demonDragonStartY = 0;

const wingBones = {};
const initialWingQuaternions = new Map();
const poseQuaternion = new THREE.Quaternion();
const neutralQuaternion = new THREE.Quaternion();

const wingPoseStrength = 0.55;

const wingPoses = {
  leftClavicle: {
    up: [-0.1882, 0.0858, 0.131, 0.9696],
    down: [-0.3114, 0.0228, -0.0504, 0.9487]
  },
  leftShoulder: {
    up: [0.3703, -0.6587, 0.2287, 0.6138],
    down: [-0.3393, -0.3133, -0.1284, 0.8776]
  },
  leftShoulderTwist: {
    up: [0, 0.7568, 0, 0.6537],
    down: [0, 0.4217, 0, 0.9067]
  },
  leftForearm: {
    up: [0.167, 0.0965, 0.3898, 0.9005],
    down: [0.1124, 0.0483, 0.4009, 0.9079]
  },
  leftHand: {
    up: [-0.2898, -0.2294, -0.133, 0.9196],
    down: [-0.3434, -0.2211, -0.1422, 0.9016]
  },
  rightClavicle: {
    up: [-0.0835, -0.022, 0.124, 0.9885],
    down: [0.0319, -0.0126, -0.0621, 0.9975]
  },
  rightShoulder: {
    up: [-0.2962, 0.504, 0.1647, 0.7945],
    down: [0.5378, 0.0731, -0.1517, 0.8261]
  },
  rightShoulderTwist: {
    up: [0, -0.6383, 0, 0.7698],
    down: [0, -0.1733, 0, 0.9849]
  },
  rightForearm: {
    up: [-0.1525, -0.0733, 0.3346, 0.927],
    down: [-0.1367, -0.0188, 0.3453, 0.9283]
  },
  rightHand: {
    up: [0.2477, 0.1418, -0.2996, 0.9104],
    down: [0.3404, 0.1133, -0.3053, 0.8821]
  }
};

function saveWingBone(key, bone) {
  wingBones[key] = bone;
  initialWingQuaternions.set(bone, bone.quaternion.clone());
}

function applyWingPose(key, amount) {
  const bone = wingBones[key];
  const initialQuaternion = initialWingQuaternions.get(bone);
  const pose = wingPoses[key];

  if (!bone || !initialQuaternion || !pose) return;

  poseQuaternion
    .fromArray(pose.down)
    .slerp(new THREE.Quaternion().fromArray(pose.up), amount);
  poseQuaternion.slerp(neutralQuaternion, 1 - wingPoseStrength);

  bone.quaternion.copy(initialQuaternion).multiply(poseQuaternion);
}

export function registerDemonDragon(model) {
  demonDragon = model;
  demonDragonStartY = model.position.y;

  Object.keys(wingBones).forEach((key) => {
    delete wingBones[key];
  });
  initialWingQuaternions.clear();

  model.traverse((child) => {
    if (!child.isBone) return;

    if (child.name.includes('l_clavicle')) {
      saveWingBone('leftClavicle', child);
    }

    if (child.name.includes('r_clavicle')) {
      saveWingBone('rightClavicle', child);
    }

    if (child.name.includes('l_shoulder') && !child.name.includes('Twist')) {
      saveWingBone('leftShoulder', child);
    }

    if (child.name.includes('r_shoulder') && !child.name.includes('Twist')) {
      saveWingBone('rightShoulder', child);
    }

    if (child.name.includes('l_shoulderTwist')) {
      saveWingBone('leftShoulderTwist', child);
    }

    if (child.name.includes('r_shoulderTwist')) {
      saveWingBone('rightShoulderTwist', child);
    }

    if (child.name.includes('l_forearm')) {
      saveWingBone('leftForearm', child);
    }

    if (child.name.includes('r_forearm')) {
      saveWingBone('rightForearm', child);
    }

    if (child.name.includes('l_hand') && !child.name.includes('Mid')) {
      saveWingBone('leftHand', child);
    }

    if (child.name.includes('r_hand') && !child.name.includes('Mid')) {
      saveWingBone('rightHand', child);
    }
  });

  console.log('Demon dragon wing pose bones:', wingBones);
}

export function updateDemonDragon(deltaTime) {
  if (!demonDragon) return;

  const time = performance.now() * 0.001;
  const wingAmount = (Math.sin(time * 3.4) + 1) * 0.5;

  Object.keys(wingPoses).forEach((key) => {
    applyWingPose(key, wingAmount);
  });

  demonDragon.position.y =
    demonDragonStartY + Math.sin(time * 1.4) * 0.22;
  demonDragon.rotation.z = Math.sin(time * 1.6) * 0.015;
}
