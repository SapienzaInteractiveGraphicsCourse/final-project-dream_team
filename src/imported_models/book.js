import * as THREE from 'three';

let book = null;
let deliveryTarget = null;
let bookStartY = 0;
let bookStartScale = null;
let canTakeBook = false;
let canDeliverBook = false;
let hasBook = false;
let bookDelivered = false;

const followOffset = new THREE.Vector3(1.05, 1.15, -0.85);
const deliveredOffset = new THREE.Vector3(0.9, 1.15, 0);
const rotatedFollowOffset = new THREE.Vector3();
const targetPosition = new THREE.Vector3();
const targetScale = new THREE.Vector3();

const bookPrompt = document.createElement('div');
bookPrompt.className = 'interaction-dialogue book-dialogue';
bookPrompt.textContent = 'Premi F per prendere il libro';
document.body.appendChild(bookPrompt);

export function registerBook(model) {
  book = model;
  bookStartY = model.position.y;
  bookStartScale = model.scale.clone();
  canTakeBook = false;
  canDeliverBook = false;
  hasBook = false;
  bookDelivered = false;
}

export function registerBookDeliveryTarget(model) {
  deliveryTarget = model;
}

export function isCarryingBook() {
  return hasBook;
}

export function isBookDelivered() {
  return bookDelivered;
}

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
  }
});

export function updateBook(deltaTime, player) {
  if (!book) return;

  const time = performance.now() * 0.001;

  if (bookDelivered) {
    if (deliveryTarget) {
      targetPosition.copy(deliveryTarget.position).add(deliveredOffset);
      targetScale.copy(bookStartScale).multiplyScalar(0.55);

      book.position.lerp(targetPosition, Math.min(deltaTime * 6, 1));
      book.scale.lerp(targetScale, Math.min(deltaTime * 8, 1));
      book.rotation.y += deltaTime * 1.3;
      book.rotation.z = Math.sin(time * 2.5) * 0.08;
    }

    bookPrompt.classList.remove('is-visible');
    return;
  }

  if (hasBook) {
    rotatedFollowOffset.copy(followOffset).applyQuaternion(player.quaternion);
    targetPosition.copy(player.position).add(rotatedFollowOffset);
    targetScale.copy(bookStartScale).multiplyScalar(0.50);

    book.position.lerp(targetPosition, Math.min(deltaTime * 8, 1));
    book.scale.lerp(targetScale, Math.min(deltaTime * 8, 1));
    book.rotation.y += deltaTime * 1.8;
    book.rotation.z = Math.sin(time * 3) * 0.12;

    canDeliverBook =
      deliveryTarget && player.position.distanceTo(deliveryTarget.position) < 4;

    if (canDeliverBook) {
      bookPrompt.textContent = 'Premi F per consegnare il libro al mago';
      bookPrompt.classList.add('is-visible');
    } else {
      bookPrompt.classList.remove('is-visible');
    }

    return;
  }

  const distance = book.position.distanceTo(player.position);
  canTakeBook = distance < 3;
  canDeliverBook = false;

  book.rotation.y += deltaTime * 0.8;
  book.position.y = bookStartY + Math.sin(time * 3) * 0.06;

  if (canTakeBook) {
    bookPrompt.textContent = 'Premi F per prendere il libro';
    bookPrompt.classList.add('is-visible');
  } else {
    bookPrompt.classList.remove('is-visible');
  }
}
