import * as THREE from 'three';
import { showObjectiveMessage } from '../ui/objectiveMessage.js';

// --- STATE VARIABLES ---
let book = null;
let deliveryTarget = null;
let bookStartY = 0;
let bookStartScale = null;
let canTakeBook = false;
let canDeliverBook = false;
let hasBook = false;
let bookDelivered = false;
let bookHiddenAfterPortal = false;

// --- PARTICLE EFFECT VARIABLES ---
let bookParticles = null;
let particleData = []; 
const PARTICLE_COUNT = 35; 

// --- POSITIONING VECTORS ---
const followOffset = new THREE.Vector3(1.05, 1.15, -0.85); // Offset when following the player
const deliveredOffset = new THREE.Vector3(0.9, 1.15, 0);   // Offset when orbiting the target
const rotatedFollowOffset = new THREE.Vector3();
const targetPosition = new THREE.Vector3();
const targetScale = new THREE.Vector3();

// --- UI ELEMENTS ---
const bookPrompt = document.createElement('div');
bookPrompt.className = 'interaction-dialogue book-dialogue';
bookPrompt.textContent = 'Press F to take the book';
document.body.appendChild(bookPrompt);

// --- UTILITY FUNCTIONS ---

/**
 * Creates a glowing circle texture for the magical particles.
 */
function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(51, 255, 153, 0.9)'); 
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  
  return new THREE.CanvasTexture(canvas);
}

/**
 * Initializes the magical particle system around the book.
 */
function createBookParticles(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  particleData = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.2 + Math.random() * 0.8;
    const y = Math.random() * 1.2 - 0.4; 

    // Set initial positions
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    // Store animation data for each particle
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
    color: 0x77ffbd, 
    size: 0.28, 
    map: createCircleTexture(),
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  bookParticles = new THREE.Points(geometry, material);
  scene.add(bookParticles);
}

// --- REGISTRATION & EXPORTS ---

export function registerBook(model, scene) {
  book = model;
  bookStartY = model.position.y;
  bookStartScale = model.scale.clone();
  
  // Reset state
  canTakeBook = false;
  canDeliverBook = false;
  hasBook = false;
  bookDelivered = false;
  bookHiddenAfterPortal = false;
  
  createBookParticles(scene);
}

export function registerBookDeliveryTarget(model) {
  deliveryTarget = model;
}

export function isCarryingBook() { return hasBook; }
export function isBookDelivered() { return bookDelivered; }

export function hideBookAfterPortal() {
  bookHiddenAfterPortal = true;
  hasBook = false;
  canTakeBook = false;
  canDeliverBook = false;
  bookPrompt.classList.remove('is-visible');

  if (book) book.visible = false;
  if (bookParticles) bookParticles.visible = false;
}

// --- INPUT HANDLING ---

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f' || !book) return;
  
  // Handle delivering the book
  if (canDeliverBook) {
    hasBook = false;
    bookDelivered = true;
    canDeliverBook = false;
    bookPrompt.classList.remove('is-visible');
    return;
  }
  
  // Handle picking up the book
  if (canTakeBook) {
    hasBook = true;
    canTakeBook = false;
    bookPrompt.classList.remove('is-visible');
    showObjectiveMessage('Return to the mage with the ancient Grimoire.');
  }
});

// --- ANIMATION LOGIC ---

/**
 * Animates the magical particles orbiting the book.
 */
function animateBookParticles(deltaTime) {
  if (!bookParticles || !bookParticles.visible || !book) return;

  // Particles container follows the book
  bookParticles.position.copy(book.position);

  const positions = bookParticles.geometry.attributes.position.array;
  const time = performance.now() * 0.001;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const data = particleData[i];

    // Update angle and dynamic radius for a pulsing effect
    data.angle += data.rotSpeed * deltaTime;
    data.radius = data.originalRadius + Math.sin(time * 2 + i) * 0.1; 
    
    // Move particle upwards
    positions[i * 3 + 1] += data.speedY * deltaTime; 

    // Calculate new X and Z based on angle and radius
    positions[i * 3] = Math.cos(data.angle) * data.radius;
    positions[i * 3 + 2] = Math.sin(data.angle) * data.radius;

    // Reset particle to bottom if it goes too high
    if (positions[i * 3 + 1] > 0.8) {
      positions[i * 3 + 1] = -0.5;
      data.angle = Math.random() * Math.PI * 2;
    }
  }
  
  bookParticles.geometry.attributes.position.needsUpdate = true;
}

/**
 * Main update loop for the book logic, called every frame.
 */
export function updateBook(deltaTime, player) {
  if (!book) return;
  
  if (bookHiddenAfterPortal) {
    book.visible = false;
    if (bookParticles) bookParticles.visible = false;
    bookPrompt.classList.remove('is-visible');
    return;
  }
  
  const time = performance.now() * 0.001;

  // State 1: Book has been delivered (orbits the target)
  if (bookDelivered) {
    if (deliveryTarget) {
      targetPosition.copy(deliveryTarget.position).add(deliveredOffset);
      targetScale.copy(bookStartScale).multiplyScalar(0.55);
      
      book.position.lerp(targetPosition, Math.min(deltaTime * 6, 1));
      book.scale.lerp(targetScale, Math.min(deltaTime * 8, 1));
      book.rotation.y += deltaTime * 1.3;
      book.rotation.z = Math.sin(time * 2.5) * 0.08;
      
      if (bookParticles) {
        bookParticles.visible = true;
        animateBookParticles(deltaTime);
      }
    }
    bookPrompt.classList.remove('is-visible');
    return;
  }

  // State 2: Book is being carried by the player
  if (hasBook) {
    rotatedFollowOffset.copy(followOffset).applyQuaternion(player.quaternion);
    targetPosition.copy(player.position).add(rotatedFollowOffset);
    targetScale.copy(bookStartScale).multiplyScalar(0.50);
    
    book.position.lerp(targetPosition, Math.min(deltaTime * 8, 1));
    book.scale.lerp(targetScale, Math.min(deltaTime * 8, 1));
    book.rotation.y += deltaTime * 1.8;
    book.rotation.z = Math.sin(time * 3) * 0.12;

    canDeliverBook = deliveryTarget && player.position.distanceToSquared(deliveryTarget.position) < 16;
    bookPrompt.classList.remove('is-visible');

    if (bookParticles) {
      bookParticles.visible = true;
      animateBookParticles(deltaTime);
    }
    return;
  }

  // State 3: Book is resting in the world, waiting to be picked up
  const distanceSq = book.position.distanceToSquared(player.position);
  canTakeBook = distanceSq < 9;
  canDeliverBook = false;

  // Floating animation
  book.rotation.y += deltaTime * 0.8;
  book.position.y = bookStartY + Math.sin(time * 3) * 0.06;
  
  if (bookParticles) {
    bookParticles.visible = true;
    animateBookParticles(deltaTime);
  }

  // Handle interaction UI
  if (canTakeBook) {
    bookPrompt.textContent = 'Press F to take the book';
    bookPrompt.classList.add('is-visible');
  } else {
    bookPrompt.classList.remove('is-visible');
  }
}