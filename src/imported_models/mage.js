import * as THREE from 'three';
import { isBookDelivered, isCarryingBook } from './book.js';

let mage = null;
let mageStartY = 0;
let canTalkToMage = false;
let mageIsTalking = false;
let mageTalkTimer = 0;
let mageMaterials = [];

const mageTintColor = new THREE.Color(0xd9eeff);
const mageEmissiveColor = new THREE.Color(0x2a4a66);
const mageBaseBrightness = 0.12;

// Creazione del DOM per il dialogo
const mageDialogue = document.createElement('div');
mageDialogue.className = 'mage-dialogue';
mageDialogue.textContent = 'Premi E per parlare con il mago';
document.body.appendChild(mageDialogue);

// Registra il mago e salva i suoi dati
export function registerMage(model) {
  mage = model;
  mageStartY = model.position.y;
  mageMaterials = [];
}

// Funzione per raccogliere i materiali del mago (chiamata durante il traverse)
export function addMageMaterial(material) {
  if (!material) return;
  
  if (material.map) {
    material.map.colorSpace = THREE.SRGBColorSpace;
    material.map.needsUpdate = true;
  }
  if (material.color) {
    material.color.lerp(mageTintColor, 0.18);
    material.color.multiplyScalar(1.08);
  }
  if (material.emissive) {
    material.emissive.copy(mageEmissiveColor);
    material.emissiveIntensity = mageBaseBrightness;
    if ('emissiveMap' in material && material.map) {
      material.emissiveMap = material.map;
    }
  }
  if ('roughness' in material) {
    material.roughness = Math.min(material.roughness ?? 0.7, 0.65);
  }
  material.needsUpdate = true;
  mageMaterials.push(material);
}

function setMageBrightness(strength) {
  mageMaterials.forEach((material) => {
    if (material.emissive) {
      material.emissive.copy(mageEmissiveColor);
      material.emissiveIntensity = mageBaseBrightness + strength;
    }
  });
}

// Ascoltatore di eventi per il tasto E
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'e' && canTalkToMage) {
    mageIsTalking = true;
    mageTalkTimer = 4; // Durata del dialogo in secondi
  }
});

// Funzione di update principale del mago
export function updateMage(deltaTime, player) {
  if (!mage) return;

  const time = performance.now() * 0.001;

  // Fluttuazione del mago
  mage.position.y = mageStartY + Math.sin(time * 2) * 0.12;
  mage.rotation.y += Math.sin(time * 3) * 0.002;

  const distance = mage.position.distanceTo(player.position);
  const interactionDistance = 4;

  canTalkToMage = distance < interactionDistance;

  if (canTalkToMage) {
    mage.lookAt(player.position.x, mage.position.y, player.position.z);
  }

  if (mageIsTalking) {
    mageTalkTimer -= deltaTime;
    if (mageTalkTimer <= 0) {
      mageIsTalking = false;
    }
  }

  // Gestione Dialoghi
  if (mageIsTalking) {
    if (isBookDelivered()) {
      mageDialogue.textContent = "Mago: Ora il passo successivo è prendere la gemma nascosta nel castello che però è sorvegliato da un drago.";
    } else {
      mageDialogue.textContent = "Mago: Benvenuto! Finalmente sei qui, l'isola ha perso la sua magia e ha bisogno del tuo aiuto per ritrovarla, aiutaci a trovare il libro incantato.";
    }
    mageDialogue.classList.add('is-visible');
  } else if (canTalkToMage) {
    if (isCarryingBook() && !isBookDelivered()) {
      mageDialogue.textContent = 'Premi E per consegnare il libro al mago';
    } else {
      mageDialogue.textContent = 'Premi E per parlare con il mago';
    }
    mageDialogue.classList.add('is-visible');
  } else {
    mageDialogue.classList.remove('is-visible');
  }

  // Gestione Luminosità al passaggio
  if (canTalkToMage) {
    if (mageIsTalking) {
      setMageBrightness(0.1);
    } else {
      setMageBrightness(0.04);
    }
  } else {
    setMageBrightness(0);
  }
}