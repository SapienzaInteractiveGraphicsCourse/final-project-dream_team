import * as THREE from 'three';

let demonDragon = null;
let demonDragonStartY = 0;
let dragonHiddenAfterPortal = false;

let dragonHealth = 100;
let dragonDefeated = false;

let castleCenter = new THREE.Vector3(25, 22, -50); 
let flightRadius = 22;
const flightSpeed = 0.42;
const flightPosition = new THREE.Vector3();
const nextFlightPosition = new THREE.Vector3();
const flightDirection = new THREE.Vector3();
const smoothedFrontDirection = new THREE.Vector2(0, 1);
const desiredFrontDirection = new THREE.Vector2();

let deathParticles = null;
let particlesGeometry = null;
let particleVelocity = [];
const DEATH_PARTICLE_COUNT = 60;

const wingBones = {};
const initialWingQuaternions = new Map();
const flightBones = {
  spine: [],
  neck: [],
  tail: [],
  legs: []
};
const initialFlightQuaternions = new Map();
const poseQuaternion = new THREE.Quaternion();
const neutralQuaternion = new THREE.Quaternion();
const proceduralRotation = new THREE.Euler();
const proceduralQuaternion = new THREE.Quaternion();

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

function saveFlightBone(group, bone) {
  flightBones[group].push(bone);
  initialFlightQuaternions.set(bone, bone.quaternion.clone());
}

function applyFlightBoneRotation(bone, x, y, z) {
  const initialQuaternion = initialFlightQuaternions.get(bone);
  if (!initialQuaternion) return;

  proceduralRotation.set(x, y, z);
  proceduralQuaternion.setFromEuler(proceduralRotation);
  bone.quaternion.copy(initialQuaternion).multiply(proceduralQuaternion);
}

function animateDragonBody(time) {
  const wingBeat = Math.sin(time * 3.4);
  const breathing = Math.sin(time * 1.7);

  flightBones.spine.forEach((bone, index) => {
    const progress = index / Math.max(flightBones.spine.length - 1, 1);
    applyFlightBoneRotation(
      bone,
      breathing * 0.018,
      Math.sin(time * 1.35 - progress * 1.6) * 0.025,
      -wingBeat * 0.012 * progress
    );
  });

  flightBones.neck.forEach((bone, index) => {
    const progress = index / Math.max(flightBones.neck.length - 1, 1);
    applyFlightBoneRotation(
      bone,
      -breathing * 0.012,
      Math.sin(time * 1.25 - progress * 1.8) * 0.02,
      wingBeat * 0.008
    );
  });

  flightBones.tail.forEach((bone, index) => {
    const progress = index / Math.max(flightBones.tail.length - 1, 1);
    const wave = time * 1.8 - progress * 4.5;
    applyFlightBoneRotation(
      bone,
      Math.cos(wave) * 0.018 * progress,
      Math.sin(wave) * (0.018 + progress * 0.045),
      Math.sin(wave * 0.7) * 0.012 * progress
    );
  });

  flightBones.legs.forEach((bone) => {
    const sideOffset = bone.name.startsWith('l_') ? 1 : -1;
    const tuckedAngle = bone.name.includes('_knee')
      ? 0.26
      : bone.name.includes('_ankle')
        ? -0.16
        : 0.13;
    applyFlightBoneRotation(
      bone,
      tuckedAngle + wingBeat * 0.018,
      sideOffset * 0.02,
      breathing * 0.01 * sideOffset
    );
  });
}

function getFlightPosition(phase, time, player, target, updateDirection = true) {
  if (player && updateDirection) {
    desiredFrontDirection.set(
      player.position.x - castleCenter.x,
      player.position.z - castleCenter.z
    );

    if (desiredFrontDirection.lengthSq() > 0.001) {
      desiredFrontDirection.normalize();
      smoothedFrontDirection.lerp(desiredFrontDirection, 0.025).normalize();
    }
  }

  const lateralX = smoothedFrontDirection.y;
  const lateralZ = -smoothedFrontDirection.x;
  const lateralDistance = Math.sin(phase) * flightRadius * 0.7;
  const frontDistance = flightRadius * (1.24 + Math.cos(phase) * 0.12);

  target.set(
    castleCenter.x + smoothedFrontDirection.x * frontDistance + lateralX * lateralDistance,
    castleCenter.y + 3.2 + Math.sin(phase * 2) * 2.1 + Math.sin(time * 1.7) * 0.35,
    castleCenter.z + smoothedFrontDirection.y * frontDistance + lateralZ * lateralDistance
  );
}
export function setDragonOrbitCenter(x, y, z, calculatedRadius) {
  castleCenter.set(x, y, z);
  flightRadius = Math.max(calculatedRadius, 15); 
  console.log(`The dragon now orbits at X:${x}, Y:${y}, Z:${z} with radius ${flightRadius}`);
}

export function damageDragon(amount) {
  if (dragonDefeated || !demonDragon) return;

  dragonHealth -= amount;
  console.log(`Dragon hit hard! Remaining health: ${dragonHealth}`);

  const scene = demonDragon.parent;

  demonDragon.traverse((child) => {
    if (child.isMesh && child.material && child.material.color) {
      if (!child.material._isCloned) {
        child.material = child.material.clone();
        child.material._isCloned = true;
      }

      child.material.color.setHex(0xff0000); 

      setTimeout(() => {
        if (child.material && child.material.color) child.material.color.setHex(0xff6600);
      }, 120);

      setTimeout(() => {

        if (child.material && child.material.color) {
          child.material.color.setHex(0xffc2a0).multiplyScalar(1.28); 
        }
      }, 260);
    }
  });

  if (scene && dragonHealth > 0) {
    const hitParticleCount = 50;
    const hitGeometry = new THREE.BufferGeometry();
    const hitPositions = new Float32Array(hitParticleCount * 3);
    const hitVelocities = [];

    for (let i = 0; i < hitParticleCount; i++) {
      hitPositions[i * 3] = demonDragon.position.x;
      hitPositions[i * 3 + 1] = demonDragon.position.y;
      hitPositions[i * 3 + 2] = demonDragon.position.z;

      hitVelocities.push({
        x: (Math.random() - 0.5) * 35,
        y: (Math.random() - 0.5) * 35,
        z: (Math.random() - 0.5) * 35
      });
    }

    hitGeometry.setAttribute('position', new THREE.BufferAttribute(hitPositions, 3));

    const hitMaterial = new THREE.PointsMaterial({
      color: 0xff3300,
      size: 1.2,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const hitParticles = new THREE.Points(hitGeometry, hitMaterial);
    scene.add(hitParticles);

    const ringGeometry = new THREE.RingGeometry(0.1, 1, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const shockwave = new THREE.Mesh(ringGeometry, ringMaterial);
    shockwave.position.copy(demonDragon.position);

    shockwave.rotation.x = Math.PI / 2;
    scene.add(shockwave);

    const startTime = performance.now();
    const animateHitEffects = () => {
      const elapsed = (performance.now() - startTime) * 0.001;
      
      if (elapsed > 0.5) {
        scene.remove(hitParticles);
        scene.remove(shockwave);
        hitGeometry.dispose();
        hitMaterial.dispose();
        ringGeometry.dispose();
        ringMaterial.dispose();
      } else {

        const positions = hitParticles.geometry.attributes.position.array;
        for (let i = 0; i < hitParticleCount; i++) {
          positions[i * 3] += hitVelocities[i].x * 0.016;
          positions[i * 3 + 1] += hitVelocities[i].y * 0.016;
          positions[i * 3 + 2] += hitVelocities[i].z * 0.016;
        }
        hitParticles.geometry.attributes.position.needsUpdate = true;
        hitMaterial.opacity = 1 - (elapsed / 0.5);

        const growScale = 1 + elapsed * 45;
        shockwave.scale.set(growScale, growScale, 1);
        ringMaterial.opacity = 0.8 * (1 - (elapsed / 0.5));

        requestAnimationFrame(animateHitEffects);
      }
    };
    animateHitEffects();
  }

  if (dragonHealth <= 0) {
    dragonDefeated = true;
    console.log('The dragon is dead! Triggering epic detonation.');
    
    if (scene) {
      particlesGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(DEATH_PARTICLE_COUNT * 3);
      particleVelocity = [];

      for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
        positions[i * 3] = demonDragon.position.x;
        positions[i * 3 + 1] = demonDragon.position.y;
        positions[i * 3 + 2] = demonDragon.position.z;

        particleVelocity.push({
          x: (Math.random() - 0.5) * 15,
          y: (Math.random() - 0.2) * 12, 
          z: (Math.random() - 0.5) * 15
        });
      }

      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const particlesMaterial = new THREE.PointsMaterial({
        color: 0xffaa00, 
        size: 0.6,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      deathParticles = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(deathParticles);
    }
  }
}

export function registerDemonDragon(model) {
  demonDragon = model;
  demonDragonStartY = model.position.y;
  dragonHealth = 100;
  dragonDefeated = false;
  dragonHiddenAfterPortal = false;

  Object.keys(wingBones).forEach((key) => {
    delete wingBones[key];
  });
  initialWingQuaternions.clear();
  Object.values(flightBones).forEach((bones) => {
    bones.length = 0;
  });
  initialFlightQuaternions.clear();

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

    if (/^spine_\d+/.test(child.name)) saveFlightBone('spine', child);
    if (/^neck_\d+/.test(child.name) || child.name.startsWith('head.')) saveFlightBone('neck', child);
    if (/^tail_\d+/.test(child.name)) saveFlightBone('tail', child);
    if (/^[lr]_(hip|knee|ankle)\./.test(child.name)) saveFlightBone('legs', child);
  });
}

export function updateDemonDragon(deltaTime, player) {
  if (!demonDragon) return;
  
  if (dragonHiddenAfterPortal) {
    demonDragon.visible = false;
    if (deathParticles) {
      deathParticles.visible = false;
    }
    return;
  }

  const time = performance.now() * 0.001;

  if (dragonDefeated) {

    if (demonDragon.position.y > -5) {
      demonDragon.position.y -= deltaTime * 15;
      demonDragon.rotation.z += deltaTime * 4;
    } else {
      demonDragon.visible = false;
    }

    if (deathParticles) {
      const positions = deathParticles.geometry.attributes.position.array;
      
      for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
        const vel = particleVelocity[i];
        positions[i * 3] += vel.x * deltaTime;
        positions[i * 3 + 1] += vel.y * deltaTime;
        positions[i * 3 + 2] += vel.z * deltaTime;

        vel.y -= deltaTime * 5;
      }
      deathParticles.geometry.attributes.position.needsUpdate = true;

      deathParticles.material.opacity -= deltaTime * 0.4;
      if (deathParticles.material.opacity <= 0) {
        if (demonDragon.parent) {
          demonDragon.parent.remove(deathParticles);
        }
        deathParticles = null;
      }
    }
    return;
  }

  const wingAmount = (Math.sin(time * 3.4) + 1) * 0.5;
  Object.keys(wingPoses).forEach((key) => {
    applyWingPose(key, wingAmount);
  });
  animateDragonBody(time);

  const flightPhase = time * flightSpeed;
  getFlightPosition(flightPhase, time, player, flightPosition);
  getFlightPosition(
    flightPhase + 0.025,
    time + 0.025 / flightSpeed,
    player,
    nextFlightPosition,
    false
  );
  flightDirection.subVectors(nextFlightPosition, flightPosition);

  demonDragon.position.copy(flightPosition);

  const horizontalSpeed = Math.hypot(flightDirection.x, flightDirection.z);
  const angleY = Math.atan2(flightDirection.x, flightDirection.z);
  const pitch = -Math.atan2(flightDirection.y, Math.max(horizontalSpeed, 0.001));

  demonDragon.rotation.x = THREE.MathUtils.clamp(pitch, -0.16, 0.16);
  demonDragon.rotation.y = angleY;
  demonDragon.rotation.z = -Math.cos(flightPhase) * 0.16 + Math.sin(time * 1.7) * 0.012;
}

export function isDragonDefeated() {
  return dragonDefeated;
}

export function getDragonHealth() {
  return THREE.MathUtils.clamp(dragonHealth, 0, 100);
}

export function getDragonObject() {
  return demonDragon;
}

export function resetDragon() {
  dragonHealth = 100;
  dragonDefeated = false;
  dragonHiddenAfterPortal = false;

  if (demonDragon) demonDragon.visible = true;

  if (deathParticles) {
    deathParticles.geometry?.dispose();
    deathParticles.material?.dispose();
    deathParticles.removeFromParent();
    deathParticles = null;
  }
}

export function hideDragonAfterPortal() {
  dragonHiddenAfterPortal = true;

  if (demonDragon) demonDragon.visible = false;
  if (deathParticles) deathParticles.visible = false;
}
