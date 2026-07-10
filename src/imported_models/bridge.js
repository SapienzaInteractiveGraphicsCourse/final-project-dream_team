import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { consumeCarriedWood, isCarryingWood } from './wood.js';

// --- INITIALIZATION ---
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

// --- CONSTANTS & CONFIGURATION ---
const towerPosition = new THREE.Vector3(85, 12, -120);
const brokenTowerWorldOffset = new THREE.Vector3(0, 1, 0);
const fixedTowerWorldOffset = new THREE.Vector3(125, 1.1, -123.52);
const shifuPosition = new THREE.Vector3(231, 28.4, -258);
const buildEffectPosition = new THREE.Vector3(85, 16, -120);
const bridgeEffectWorldOffset = new THREE.Vector3(0, -3.1, 0);

const towerScale = 2;
const towerRotationY = Math.PI / 4;
const buildDistance = 5;
const buildDuration = 3;

// --- PARTICLE EFFECT CONFIGURATION ---
const particleCount = 1500;
const screenSparkleCount = 980;
const sparkleColors = [
  0xffffff, // White
  0xfff8d6, // Light Yellow
  0xffe9a8, // Yellow
  0xd8fffb, // Light Cyan
  0xbdd8ff, // Light Blue
  0xf7d7ff, // Light Pink
  0xdcffd2  // Light Green
];

// --- STATE VARIABLES ---
let brokenTower = null;
let fixedTower = null;
let bridgeTaskLoadPromise = null;
let bridgeState = 'waiting'; // States: 'waiting', 'building', 'built'
let buildTimer = 0;
let canBuildBridge = false;
let particles = [];

// Caching objects to avoid garbage collection during the render loop
const buildEffectBox = new THREE.Box3();
const buildEffectCenter = new THREE.Vector3();
const towerBounds = new THREE.Box3();

// --- UI ELEMENTS ---
const bridgePrompt = document.createElement('div');
bridgePrompt.className = 'interaction-dialogue';
document.body.appendChild(bridgePrompt);

// --- UTILITY FUNCTIONS ---

/**
 * Prepares a tower model by applying common transformations.
 */
function prepareTower(model, visible, worldOffset = null) {
  model.position.copy(towerPosition);

  if (worldOffset) {
    model.position.add(worldOffset);
  }

  model.scale.setScalar(towerScale);
  model.rotation.y = towerRotationY;
  model.visible = visible;

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

/**
 * Hides a placeholder cube that might be left over from export.
 */
function hideExportPlaceholderCube(model) {
  model.traverse((child) => {
    if (child.isMesh && child.name === 'Cube') {
      child.visible = false;
    }
  });
}

/**
 * Calculates the dynamic center position for the building particle effect.
 */
function getBuildEffectPosition() {
  if (!brokenTower) return buildEffectPosition;

  brokenTower.updateMatrixWorld(true);
  buildEffectBox.setFromObject(brokenTower);
  buildEffectBox.getCenter(buildEffectCenter);
  
  // Interpolate position towards Shifu and apply offsets
  buildEffectCenter.lerp(shifuPosition, 0.55);
  buildEffectCenter.y = shifuPosition.y;
  buildEffectCenter.add(bridgeEffectWorldOffset);

  return buildEffectCenter;
}

// --- PARTICLE SYSTEM LOGIC ---

/**
 * Initializes the particle system used during the bridge building animation.
 */
function createBuildParticles(scene) {
  const geometry = new THREE.SphereGeometry(0.18, 10, 10);

  for (let i = 0; i < particleCount; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: sparkleColors[i % sparkleColors.length],
      transparent: true,
      opacity: 0,
      depthTest: false,
      blending: THREE.AdditiveBlending
    });

    const particle = new THREE.Mesh(geometry, material);
    particle.visible = false;
    particle.renderOrder = 100;
    
    // Custom properties for animation
    particle.userData.angle = (i / particleCount) * Math.PI * 2;
    particle.userData.radius = 2 + Math.random() * 30;
    particle.userData.speed = 4 + Math.random() * 13;
    particle.userData.height = -3.5 + Math.random() * 7;
    particle.userData.isScreenSparkle = i < screenSparkleCount;
    
    particle.userData.direction = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 1.4 - 0.2,
      Math.random() * 2 - 1
    ).normalize();
    
    particle.userData.distance = 1 + Math.random() * 28;
    particle.userData.explosionSpeed = 15 + Math.random() * 36;
    particle.userData.twinkle = Math.random() * Math.PI * 2;
    particle.userData.pulseSpeed = 9 + Math.random() * 18;
    particle.userData.baseScale = 0.22 + Math.random() * 3.2;
    
    particle.position.copy(buildEffectPosition);
    particle.scale.setScalar(particle.userData.baseScale);
    
    particles.push(particle);
    scene.add(particle);
  }
}

/**
 * Toggles the visibility and base opacity of all particles.
 */
function setParticlesVisible(visible) {
  particles.forEach((particle) => {
    particle.visible = visible;
    particle.material.opacity = visible ? 0.55 : 0;
  });
}

/**
 * Updates the positions and visual state of the building particles.
 */
function updateBuildParticles(deltaTime, player) {
  const progress = 1 - buildTimer / buildDuration;
  const effectPosition = getBuildEffectPosition();
  
  // Calculate effect origin near the player
  const playerEffectPosition = player
    ? player.position.clone().add(new THREE.Vector3(0, 2.5, 0))
    : effectPosition;

  particles.forEach((particle, index) => {
    // Update animation variables
    particle.userData.angle += deltaTime * particle.userData.speed;
    particle.userData.twinkle += deltaTime * particle.userData.pulseSpeed;
    
    // Twinkle scale effect
    particle.scale.setScalar(
      particle.userData.baseScale *
        (0.75 + Math.sin(particle.userData.twinkle) * 0.35)
    );

    // Two types of particles: Screen sparkles (bursting) and standard (orbiting)
    if (particle.userData.isScreenSparkle) {
      const burstDistance =
        particle.userData.distance + progress * particle.userData.explosionSpeed;
      const drift = Math.sin(particle.userData.twinkle + index) * 2.4;

      particle.position.set(
        playerEffectPosition.x + particle.userData.direction.x * burstDistance + drift,
        playerEffectPosition.y + particle.userData.direction.y * burstDistance - 0.9,
        playerEffectPosition.z + particle.userData.direction.z * burstDistance - 7
      );

      // Fade out based on progress and twinkle
      particle.material.opacity =
        Math.max(0, Math.sin(progress * Math.PI)) *
        (0.42 + Math.sin(particle.userData.twinkle) * 0.22);
      return;
    }

    // Standard orbiting particles
    const radius = particle.userData.radius * (1 + progress * 0.65);
    const angle = particle.userData.angle;
    const lift = progress * 3.2 + Math.sin(progress * Math.PI + index) * 2.1;

    particle.position.set(
      effectPosition.x + Math.cos(angle) * radius,
      effectPosition.y + particle.userData.height + lift,
      effectPosition.z + Math.sin(angle) * radius
    );

    particle.material.opacity =
      Math.max(0, Math.sin(progress * Math.PI)) *
      (0.48 + Math.sin(particle.userData.twinkle) * 0.2);
  });
}

// --- INPUT HANDLING ---

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f') return;
  if (!canBuildBridge || bridgeState !== 'waiting') return;

  // Start the building process
  consumeCarriedWood();
  bridgeState = 'building';
  buildTimer = buildDuration;
  canBuildBridge = false;
  bridgePrompt.classList.remove('is-visible');
  setParticlesVisible(true);
});

// --- EXPORTED FUNCTIONS ---

/**
 * Loads the models required for the bridge quest.
 */
export function loadBridgeTask(scene) {
  if (bridgeTaskLoadPromise) return bridgeTaskLoadPromise;

  bridgeTaskLoadPromise = Promise.all([
    // Load broken tower
    new Promise((resolve) => {
      loader.load(
        './models_optimized/tower1.glb',
        (gltf) => {
          brokenTower = gltf.scene;
          prepareTower(brokenTower, true, brokenTowerWorldOffset);
          scene.add(brokenTower);
          resolve(brokenTower);
        },
        undefined,
        (error) => {
          console.error('Error loading tower1.glb', error);
          resolve(null);
        }
      );
    }),
    // Load fixed tower
    new Promise((resolve) => {
      loader.load(
        './models_optimized/tower3.glb',
        (gltf) => {
          fixedTower = gltf.scene;
          prepareTower(fixedTower, false, fixedTowerWorldOffset);
          hideExportPlaceholderCube(fixedTower);
          scene.add(fixedTower);
          resolve(fixedTower);
        },
        undefined,
        (error) => {
          console.error('Error loading tower3.glb', error);
          resolve(null);
        }
      );
    })
  ]).then((models) => {
    // Initialize particles once models are loaded
    createBuildParticles(scene);
    return models;
  });

  return bridgeTaskLoadPromise;
}

/**
 * Main update loop for the bridge quest logic.
 */
export function updateBridgeTask(deltaTime, player) {
  if (!brokenTower || !fixedTower) return;

  // Handle building animation state
  if (bridgeState === 'building') {
    buildTimer -= deltaTime;
    updateBuildParticles(deltaTime, player);

    // Finish building
    if (buildTimer <= 0) {
      brokenTower.visible = false;
      fixedTower.visible = true;
      bridgeState = 'built';
      setParticlesVisible(false);
      bridgePrompt.classList.remove('is-visible');
    }

    return;
  }

  if (bridgeState === 'built') {
    return;
  }

  // Check conditions to start building
  canBuildBridge =
    isCarryingWood() && player.position.distanceTo(shifuPosition) < buildDistance;

  // Update UI prompt
  if (canBuildBridge) {
    bridgePrompt.textContent = 'Press F to rebuild the bridge';
    bridgePrompt.classList.add('is-visible');
  } else {
    bridgePrompt.classList.remove('is-visible');
  }
}

export function isBridgeBuilt() {
  return bridgeState === 'built';
}

export function getActiveTowerBounds() {
  const activeTower = bridgeState === 'built' ? fixedTower : brokenTower;

  if (!activeTower) return null;

  activeTower.updateMatrixWorld(true);
  towerBounds.setFromObject(activeTower);

  return towerBounds;
}

export function getActiveTower() {
  return bridgeState === 'built' ? fixedTower : brokenTower;
}