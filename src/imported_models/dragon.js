import * as THREE from 'three';

let demonDragon = null;
let demonDragonStartY = 0;
// --- NUOVE VARIABILI PER IL COMBATTIMENTO E VOLO ---
let dragonHealth = 100;
let dragonDefeated = false;

// Diventano variabili 'let' modificabili dinamicamente
let castleCenter = new THREE.Vector3(25, 22, -50); 
let flightRadius = 22; 
const flightSpeed = 0.6;  
// --------------------------------------------------

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

// Nuova funzione per configurare dinamicamente l'orbita da models.js
export function setDragonOrbitCenter(x, y, z, calculatedRadius) {
  castleCenter.set(x, y, z);
  flightRadius = Math.max(calculatedRadius, 15); // Impedisce che il raggio sia troppo piccolo
  console.log(`Il drago ora orbita a X:${x}, Y:${y}, Z:${z} con raggio ${flightRadius}`);
}

export function damageDragon(amount) {
  if (dragonDefeated || !demonDragon) return;

  dragonHealth -= amount;
  console.log(`Drago colpito! Vita rimasta: ${dragonHealth}`);

  demonDragon.traverse((child) => {
    if (child.isMesh && child.material.color) {
      const originalColor = child.material.color.clone();
      child.material.color.setHex(0xff3333);
      setTimeout(() => {
        if (child.material && child.material.color) child.material.color.copy(originalColor);
      }, 150);
    }
  });

  if (dragonHealth <= 0) {
    dragonDefeated = true;
    console.log("Il drago è morto! La gemma ora è visibile nel castello.");
  }
}

export function registerDemonDragon(model) {
  // Rimuoviamo il controllo "if (model.name.includes...)" che falliva la registrazione
  demonDragon = model;
  demonDragonStartY = model.position.y;
  dragonHealth = 100;
  dragonDefeated = false;

  Object.keys(wingBones).forEach((key) => {
    delete wingBones[key];
  });
  initialWingQuaternions.clear();

  model.traverse((child) => {
    if (!child.isBone) return;

    if (child.name.includes('l_clavicle')) saveWingBone('leftClavicle', child);
    if (child.name.includes('r_clavicle')) saveWingBone('rightClavicle', child);
    if (child.name.includes('l_shoulder') && !child.name.includes('Twist')) saveWingBone('leftShoulder', child);
    if (child.name.includes('r_shoulder') && !child.name.includes('Twist')) saveWingBone('rightShoulder', child);
    if (child.name.includes('l_shoulderTwist')) saveWingBone('leftShoulderTwist', child);
    if (child.name.includes('r_shoulderTwist')) saveWingBone('rightShoulderTwist', child);
    if (child.name.includes('l_forearm')) saveWingBone('leftForearm', child);
    if (child.name.includes('r_forearm')) saveWingBone('rightForearm', child);
    if (child.name.includes('l_hand') && !child.name.includes('Mid')) saveWingBone('leftHand', child);
    if (child.name.includes('r_hand') && !child.name.includes('Mid')) saveWingBone('rightHand', child);
  });
}

export function updateDemonDragon(deltaTime) {
  if (!demonDragon) return;

  const time = performance.now() * 0.001;

  if (dragonDefeated) {
    if (demonDragon.position.y > -5) {
      demonDragon.position.y -= deltaTime * 12;
      demonDragon.rotation.z += deltaTime * 2;
    } else {
      demonDragon.visible = false;
    }
    return;
  }

  const wingAmount = (Math.sin(time * 3.4) + 1) * 0.5;
  Object.keys(wingPoses).forEach((key) => {
    applyWingPose(key, wingAmount);
  });

  const flightTime = time * flightSpeed;
  
  const targetX = castleCenter.x + Math.cos(flightTime) * flightRadius;
  const targetZ = castleCenter.z + Math.sin(flightTime) * flightRadius;
  const targetY = castleCenter.y + Math.sin(time * 1.4) * 0.22;

  demonDragon.position.set(targetX, targetY, targetZ);

  const nextTime = (time + 0.01) * flightSpeed;
  const nextX = castleCenter.x + Math.cos(nextTime) * flightRadius;
  const nextZ = castleCenter.z + Math.sin(nextTime) * flightRadius;

  const dirX = nextX - targetX;
  const dirZ = nextZ - targetZ;
  const angleY = Math.atan2(dirX, dirZ);

  demonDragon.rotation.x = 0;
  // Correzione asse: se vola al contrario aggiungi "+ Math.PI" qui sotto
  demonDragon.rotation.y = angleY; 
  demonDragon.rotation.z = Math.sin(time * 1.6) * 0.015;
}

export function isDragonDefeated() {
  return dragonDefeated; 
}