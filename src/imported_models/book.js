import * as THREE from 'three';

let book = null;
let deliveryTarget = null;
let bookStartY = 0;
let bookStartScale = null;
let canTakeBook = false;
let canDeliverBook = false;
let hasBook = false;
let bookDelivered = false;

let bookParticles = null;
// Array per memorizzare i dati individuali di ogni brillantino (velocità, raggio, angolo)
let particleData = []; 
const PARTICLE_COUNT = 35; // Leggermente aumentato per densità visiva

const followOffset = new THREE.Vector3(1.05, 1.15, -0.85);
const deliveredOffset = new THREE.Vector3(0.9, 1.15, 0);
const rotatedFollowOffset = new THREE.Vector3();
const targetPosition = new THREE.Vector3();
const targetScale = new THREE.Vector3();

const bookPrompt = document.createElement('div');
bookPrompt.className = 'interaction-dialogue book-dialogue';
bookPrompt.textContent = 'Premi F per prendere il libro';
document.body.appendChild(bookPrompt);

function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(51, 255, 153, 0.9)'); // Colore magico leggermente più vivo
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(canvas);
}

function createBookParticles(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  particleData = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Definiamo un raggio e un angolo iniziale per far orbitare i brillantini intorno al centro del libro
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.2 + Math.random() * 0.8;
    const y = Math.random() * 1.2 - 0.4; // Distribuiti verticalmente attorno al libro

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    // Salviamo le proprietà uniche per l'animazione di ogni brillantino
    particleData.push({
      angle: angle,
      radius: radius,
      speedY: 0.3 + Math.random() * 0.4, // Velocità di salita
      rotSpeed: (Math.random() - 0.5) * 2.0, // Velocità di rotazione attorno al libro
      originalRadius: radius
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.PointsMaterial({
    color: 0x77ffbd, 
    size: 0.28, // Dimensione leggermente più definita ed elegante
    map: createCircleTexture(),
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  bookParticles = new THREE.Points(geometry, material);
  scene.add(bookParticles);
}

export function registerBook(model, scene) {
  book = model;
  bookStartY = model.position.y;
  bookStartScale = model.scale.clone();
  canTakeBook = false;
  canDeliverBook = false;
  hasBook = false;
  bookDelivered = false;
  createBookParticles(scene);
}

export function registerBookDeliveryTarget(model) {
  deliveryTarget = model;
}

export function isCarryingBook() { return hasBook; }
export function isBookDelivered() { return bookDelivered; }

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f' || !book) return;
  if (canDeliverBook) {
    hasBook = false;
    bookDelivered = true;
    canDeliverBook = false;
    bookPrompt.classList.remove('is-visible');
    return;
  }
  if (canTakeBook) {
    hasBook = true;
    canTakeBook = false;
    bookPrompt.classList.remove('is-visible');
    // Manteniamo le particelle visibili anche quando si prende il libro!
  }
});

// Nuova logica di animazione: effetto vortice/aura orbitante
function animateParticles(deltaTime) {
  if (!bookParticles || !bookParticles.visible || !book) return;

  // Il contenitore delle particelle segue costantemente il centro geometrico esatto del libro
  bookParticles.position.copy(book.position);

  const positions = bookParticles.geometry.attributes.position.array;
  const time = performance.now() * 0.001;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const data = particleData[i];

    // Aggiorna l'angolo di rotazione e l'altezza del brillantino
    data.angle += data.rotSpeed * deltaTime;
    data.radius = data.originalRadius + Math.sin(time * 2 + i) * 0.1; // Pulsazione del raggio
    positions[i * 3 + 1] += data.speedY * deltaTime; // Sali verso l'alto

    // Applica le coordinate locali calcolando l'orbita circolare attorno al libro
    positions[i * 3] = Math.cos(data.angle) * data.radius;
    positions[i * 3 + 2] = Math.sin(data.angle) * data.radius;

    // Se il brillantino sale troppo in alto rispetto al libro, si rigenera in basso
    if (positions[i * 3 + 1] > 0.8) {
      positions[i * 3 + 1] = -0.5;
      data.angle = Math.random() * Math.PI * 2;
    }
  }
  bookParticles.geometry.attributes.position.needsUpdate = true;
}

export function updateBook(deltaTime, player) {
  if (!book) return;
  const time = performance.now() * 0.001;

  // 1. Fase: Libro consegnato al mago
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
        animateParticles(deltaTime);
      }
    }
    bookPrompt.classList.remove('is-visible');
    return;
  }

  // 2. Fase: Il giocatore trasporta il libro (I brillantini ora fluttuano intorno alla mano/giocatore)
  if (hasBook) {
    rotatedFollowOffset.copy(followOffset).applyQuaternion(player.quaternion);
    targetPosition.copy(player.position).add(rotatedFollowOffset);
    targetScale.copy(bookStartScale).multiplyScalar(0.50);
    book.position.lerp(targetPosition, Math.min(deltaTime * 8, 1));
    book.scale.lerp(targetScale, Math.min(deltaTime * 8, 1));
    book.rotation.y += deltaTime * 1.8;
    book.rotation.z = Math.sin(time * 3) * 0.12;

    canDeliverBook = deliveryTarget && player.position.distanceTo(deliveryTarget.position) < 4;
    bookPrompt.classList.remove('is-visible');

    if (bookParticles) {
      bookParticles.visible = true;
      animateParticles(deltaTime);
    }
    return;
  }

  // 3. Fase: Libro a terra in attesa di essere raccolto
  const distance = book.position.distanceTo(player.position);
  canTakeBook = distance < 3;
  canDeliverBook = false;

  book.rotation.y += deltaTime * 0.8;
  book.position.y = bookStartY + Math.sin(time * 3) * 0.06;
  
  if (bookParticles) {
    bookParticles.visible = true;
    animateParticles(deltaTime);
  }

  if (canTakeBook) {
    bookPrompt.textContent = 'Premi F per prendere il libro';
    bookPrompt.classList.add('is-visible');
  } else {
    bookPrompt.classList.remove('is-visible');
  }
}