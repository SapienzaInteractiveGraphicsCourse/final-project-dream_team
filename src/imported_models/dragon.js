import * as THREE from 'three';

let demonDragon = null;
let demonDragonStartY = 0;
let dragonHiddenAfterPortal = false;
// --- VARIABILI PER IL COMBATTIMENTO E VOLO ---
let dragonHealth = 100;
let dragonDefeated = false;

// Diventano variabili 'let' modificabili dinamicamente
let castleCenter = new THREE.Vector3(25, 22, -50); 
let flightRadius = 22; 
const flightSpeed = 0.6;  

// --- VARIABILI PER LE PARTICELLE DI MORTE ---
let deathParticles = null;
let particlesGeometry = null;
let particleVelocity = [];
const DEATH_PARTICLE_COUNT = 60;
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

// Configura dinamicamente l'orbita da models.js
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

  // --- 1. SUPER FLASH STROBO DI DANNO (MOLTO PIÙ EVIDENTE) ---
  demonDragon.traverse((child) => {
    if (child.isMesh && child.material && child.material.color) {
      if (!child.material._isCloned) {
        child.material = child.material.clone();
        child.material._isCloned = true;
      }
      
      // Primo flash: Rosso Puro immediato
      child.material.color.setHex(0xff0000); 
      
      // Secondo flash intermediario: Arancione Neon dopo 120ms
      setTimeout(() => {
        if (child.material && child.material.color) child.material.color.setHex(0xff6600);
      }, 120);

      // Ritorno al colore originale dopo 260ms totali
      setTimeout(() => {
        // Ripristina la tinta originale calcolata in models.js
        if (child.material && child.material.color) {
          child.material.color.setHex(0xffc2a0).multiplyScalar(1.28); 
        }
      }, 260);
    }
  });

  // --- 2. MAXI SCINTILLE ED ONDA D'URTO (SOLO SE ANCORA VIVO) ---
  if (scene && dragonHealth > 0) {
    // Portiamo le particelle da 20 a 50 e aumentiamo la dimensione a 1.2!
    const hitParticleCount = 50;
    const hitGeometry = new THREE.BufferGeometry();
    const hitPositions = new Float32Array(hitParticleCount * 3);
    const hitVelocities = [];

    for (let i = 0; i < hitParticleCount; i++) {
      hitPositions[i * 3] = demonDragon.position.x;
      hitPositions[i * 3 + 1] = demonDragon.position.y;
      hitPositions[i * 3 + 2] = demonDragon.position.z;

      // Esplosione a raggiera molto più larga e violenta
      hitVelocities.push({
        x: (Math.random() - 0.5) * 35,
        y: (Math.random() - 0.5) * 35,
        z: (Math.random() - 0.5) * 35
      });
    }

    hitGeometry.setAttribute('position', new THREE.BufferAttribute(hitPositions, 3));

    const hitMaterial = new THREE.PointsMaterial({
      color: 0xff3300, // Rosso fuoco saturo
      size: 1.2,       // Dimensione raddoppiata (enorme!)
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const hitParticles = new THREE.Points(hitGeometry, hitMaterial);
    scene.add(hitParticles);

    // --- AGGIUNTA DI UN ANELLO D'URTO ESPANSIVO (SHOCKWAVE) ---
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
    // Orientiamo l'anello piatto sul piano orizzontale
    shockwave.rotation.x = Math.PI / 2;
    scene.add(shockwave);

    // Animazione combinata (Scintille + Shockwave)
    const startTime = performance.now();
    const animateHitEffects = () => {
      const elapsed = (performance.now() - startTime) * 0.001;
      
      if (elapsed > 0.5) { // Dura mezzo secondo totale
        scene.remove(hitParticles);
        scene.remove(shockwave);
        hitGeometry.dispose();
        hitMaterial.dispose();
        ringGeometry.dispose();
        ringMaterial.dispose();
      } else {
        // Muovi le macro-scintille
        const positions = hitParticles.geometry.attributes.position.array;
        for (let i = 0; i < hitParticleCount; i++) {
          positions[i * 3] += hitVelocities[i].x * 0.016;
          positions[i * 3 + 1] += hitVelocities[i].y * 0.016;
          positions[i * 3 + 2] += hitVelocities[i].z * 0.016;
        }
        hitParticles.geometry.attributes.position.needsUpdate = true;
        hitMaterial.opacity = 1 - (elapsed / 0.5);

        // Espandi l'onda d'urto ad anello intorno al drago
        const growScale = 1 + elapsed * 45; // Si espande rapidissima fino a 20+ unità di raggio
        shockwave.scale.set(growScale, growScale, 1);
        ringMaterial.opacity = 0.8 * (1 - (elapsed / 0.5)); // Sfuma insieme alle particelle

        requestAnimationFrame(animateHitEffects);
      }
    };
    animateHitEffects();
  }

  // --- 3. CONTROLLO FINALE (IL MEGA IMPATTO MORTALE) ---
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
  if (dragonHiddenAfterPortal) {
    demonDragon.visible = false;
    if (deathParticles) {
      deathParticles.visible = false;
    }
    return;
  }

  const time = performance.now() * 0.001;

  if (dragonDefeated) {
    // 1. Fa precipitare il drago
    if (demonDragon.position.y > -5) {
      demonDragon.position.y -= deltaTime * 15;
      demonDragon.rotation.z += deltaTime * 4;
    } else {
      demonDragon.visible = false;
    }

    // 2. Anima l'esplosione dei brillantini
    if (deathParticles) {
      const positions = deathParticles.geometry.attributes.position.array;
      
      for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
        const vel = particleVelocity[i];
        positions[i * 3] += vel.x * deltaTime;
        positions[i * 3 + 1] += vel.y * deltaTime;
        positions[i * 3 + 2] += vel.z * deltaTime;

        vel.y -= deltaTime * 5; // Gravità sulle particelle
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

  // Animazione regolare delle ali
  const wingAmount = (Math.sin(time * 3.4) + 1) * 0.5;
  Object.keys(wingPoses).forEach((key) => {
    applyWingPose(key, wingAmount);
  });

  // Movimento circolare attorno al castello
  const flightTime = time * flightSpeed;
  const targetX = castleCenter.x + Math.cos(flightTime) * flightRadius;
  const targetZ = castleCenter.z + Math.sin(flightTime) * flightRadius;
  const targetY = castleCenter.y + Math.sin(time * 1.4) * 0.22;

  demonDragon.position.set(targetX, targetY, targetZ);

  // Calcolo rotazione fluida senza ribaltamenti
  const nextTime = (time + 0.01) * flightSpeed;
  const nextX = castleCenter.x + Math.cos(nextTime) * flightRadius;
  const nextZ = castleCenter.z + Math.sin(nextTime) * flightRadius;

  const dirX = nextX - targetX;
  const dirZ = nextZ - targetZ;
  const angleY = Math.atan2(dirX, dirZ);

  demonDragon.rotation.x = 0;
  demonDragon.rotation.y = angleY; 
  demonDragon.rotation.z = Math.sin(time * 1.6) * 0.015;
}

export function isDragonDefeated() {
  return dragonDefeated;
}

export function hideDragonAfterPortal() {
  dragonHiddenAfterPortal = true;

  if (demonDragon) {
    demonDragon.visible = false;
  }

  if (deathParticles) {
    deathParticles.visible = false;
  }
}
