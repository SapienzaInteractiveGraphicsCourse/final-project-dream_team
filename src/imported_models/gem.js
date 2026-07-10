import * as THREE from 'three';
import { isBookDelivered } from './book.js';
import { showObjectiveMessage } from '../ui/objectiveMessage.js';
import { isDragonDefeated } from './dragon.js';

// --- STATE VARIABLES ---
let gemModel = null;
let currentScene = null;
let hasGem = false;
let gemDelivered = false;
let isPlayerNearGem = false;
let canTakeGem = false; 
let gemStartY = 0.8;    
let gemHiddenAfterPortal = false;
let gemObjectiveShown = false;

// --- POSITIONING VECTORS ---
const gemOffset = new THREE.Vector3(-1.2, 1.8, -1.2);        // Offset when carried by player
const gemDeliveredOffset = new THREE.Vector3(-0.9, 1.15, 0); // Offset when orbiting the mage
const gemTargetPos = new THREE.Vector3();

// --- PARTICLE EFFECT VARIABLES ---
let gemParticles = null;
let particleData = []; 
const PARTICLE_COUNT = 15;

// --- UI ELEMENTS ---
const gemPrompt = document.createElement('div');
gemPrompt.className = 'interaction-dialogue gem-dialogue';
gemPrompt.textContent = 'Press F to collect the Light Gem';
document.body.appendChild(gemPrompt);

// --- EXPORTED STATE FUNCTIONS ---

export function isCarryingGem() { return hasGem; }
export function isGemDelivered() { return gemDelivered; }

/**
 * Hides the gem and its UI prompts when transitioning through the portal.
 */
export function hideGemAfterPortal() {
  gemHiddenAfterPortal = true;
  hasGem = false;
  canTakeGem = false;
  isPlayerNearGem = false;
  gemObjectiveShown = false;
  gemPrompt.classList.remove('is-visible');

  if (gemModel) gemModel.visible = false;
  if (gemParticles) gemParticles.visible = false;
}

/**
 * Triggers the delivery sequence, shrinking the gem and placing it in its final state.
 */
export function deliverGemToMage() {
  gemDelivered = true;
  hasGem = false;
  gemObjectiveShown = false;
  
  if (gemModel) {
    gemModel.scale.set(0.55, 0.55, 0.55); 
  }
}

/**
 * Registers the gem model into the game world and initializes its particles.
 */
export function registerGem(model, scene) {
  gemModel = model;
  currentScene = scene;
  
  // Reset state
  gemModel.visible = false; 
  hasGem = false;
  gemDelivered = false;
  gemHiddenAfterPortal = false;
  isPlayerNearGem = false;
  gemObjectiveShown = false;
  gemStartY = model.position.y; 

  createGemParticles(scene);
}

// --- PARTICLE SYSTEM UTILITIES ---

/**
 * Generates a glowing purple/cyan circular texture for the gem's aura.
 */
function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(213, 6, 250, 0.9)'); 
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Initializes the magical floating particles that orbit the gem.
 */
function createGemParticles(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  particleData = []; 

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.2 + Math.random() * 0.6; 
    const y = Math.random() * 1.0 - 0.3; 

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    // Save individual particle behavior data
    particleData.push({
      angle: angle,
      radius: radius,
      speedY: 0.3 + Math.random() * 0.4, 
      rotSpeed: (Math.random() - 0.5) * 2.0, 
      originalRadius: radius
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x00ffff, // Cyan glow
    size: 0.25, 
    map: createCircleTexture(),
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  gemParticles = new THREE.Points(geometry, material);
  gemParticles.visible = false;
  scene.add(gemParticles);
}

/**
 * Updates particle positions frame-by-frame to create a swirling vortex effect.
 */
function animateParticles(deltaTime) {
  if (!gemParticles || !gemModel) return;
  
  const positions = gemParticles.geometry.attributes.position.array;
  const time = performance.now() * 0.001;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const data = particleData[i];
    if (!data) continue;

    // Animate orbit and pulsation
    data.angle += data.rotSpeed * deltaTime;
    data.radius = data.originalRadius + Math.sin(time * 2 + i) * 0.05; 
    
    // Float upwards
    positions[i * 3 + 1] += data.speedY * deltaTime; 

    // Apply circular coordinates
    positions[i * 3] = Math.cos(data.angle) * data.radius;
    positions[i * 3 + 2] = Math.sin(data.angle) * data.radius;

    // Reset particle to the bottom when it floats too high
    if (positions[i * 3 + 1] > 0.6) {
      positions[i * 3 + 1] = -0.4;
      data.angle = Math.random() * Math.PI * 2;
    }
  }
  gemParticles.geometry.attributes.position.needsUpdate = true;
}

// --- MAIN UPDATE LOOP ---

export function updateGem(deltaTime, player, mageModel) {
  if (!gemModel) return;
  
  if (gemHiddenAfterPortal) {
    gemModel.visible = false;
    if (gemParticles) gemParticles.visible = false;
    gemPrompt.classList.remove('is-visible');
    return;
  }

  // Make gem visible only after the dragon is defeated and the book is delivered
  if (!gemModel.visible && !hasGem && !gemDelivered) {
    if (isBookDelivered() && isDragonDefeated()) {
      gemModel.visible = true;
      if (gemParticles) gemParticles.visible = true;
    } else {
      return;
    }
  }

  const time = performance.now() * 0.001;

  // Sync particle container position with the gem
  if (gemParticles && gemParticles.visible) {
    gemParticles.position.copy(gemModel.position);
  }

  // State 1: Gem delivered to the mage
  if (gemDelivered && mageModel) {
    gemTargetPos.copy(mageModel.position).add(gemDeliveredOffset);
    
    gemModel.position.lerp(gemTargetPos, Math.min(deltaTime * 6, 1));
    gemModel.rotation.y += deltaTime * 1.3;
    gemModel.position.y += Math.sin(time * 2.5) * 0.005;
    
    if (gemParticles) animateParticles(deltaTime);
    return;
  }

  // State 2: Gem is currently carried by the player
  if (hasGem) {
    if (!gemObjectiveShown) {
      gemObjectiveShown = true;
      showObjectiveMessage('Return to the mage with the enchanted gem.');
    }

    // Follow player smoothly
    gemTargetPos.copy(gemOffset).applyMatrix4(player.matrixWorld);
    gemModel.position.lerp(gemTargetPos, deltaTime * 4);
    gemModel.rotation.y += deltaTime * 1.5;
    gemModel.position.y += Math.sin(time * 3) * 0.005;

    if (gemParticles) animateParticles(deltaTime);

    // Check distance to mage for delivery prompt
    if (mageModel) {
      const distanceToMageSq = player.position.distanceToSquared(mageModel.position);
      if (distanceToMageSq < 16) {
        canTakeGem = true;
        gemPrompt.classList.add('is-visible');
      } else {
        gemPrompt.classList.remove('is-visible');
        canTakeGem = false;
      }
    }
    return;
  }

  // State 3: Gem is idle in the world waiting to be collected
  if (!hasGem && !gemDelivered) {
    const distanceToPlayerSq = gemModel.position.distanceToSquared(player.position);
    canTakeGem = distanceToPlayerSq < 9;

    // Idle floating animation
    gemModel.rotation.y += deltaTime * 1.5;
    gemModel.position.y = gemStartY + Math.sin(time * 4) * 0.08;

    if (gemParticles) animateParticles(deltaTime);

    // Handle interaction UI
    if (canTakeGem) {
      gemPrompt.textContent = 'Press F to collect the gem';
      gemPrompt.classList.add('is-visible');
    } else {
      gemPrompt.classList.remove('is-visible');
    }
  }
}

// --- EVENT LISTENERS ---

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f' || !gemModel || !gemModel.visible) return;

  // Handle delivering the gem
  if (hasGem && canTakeGem && isBookDelivered()) {
    deliverGemToMage(); 
    gemPrompt.classList.remove('is-visible');
    return;
  }

  // Handle picking up the gem
  if (canTakeGem && !hasGem && !gemDelivered) {
    hasGem = true;
    gemObjectiveShown = false;
    gemModel.scale.set(0.4, 0.4, 0.4); 

    // Update models data so the gem is no longer considered floating by the physics/ground logic
    import('./models.js').then(({ modelsToLoad }) => {
      const gemData = modelsToLoad.find(m => m.path.includes('gem') || m.path.includes('Gem'));
      if (gemData) gemData.floating = false; 
    });
    
    gemPrompt.classList.remove('is-visible');
  }
});