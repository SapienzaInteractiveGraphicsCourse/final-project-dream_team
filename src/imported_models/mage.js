import * as THREE from 'three';
import { isBookDelivered, isCarryingBook } from './book.js';
import { isCarryingGem, isGemDelivered, deliverGemToMage } from './gem.js';
import { showObjectiveMessage } from '../ui/objectiveMessage.js';

let mage = null;
let mageStartY = 0;
let canTalkToMage = false;
let mageIsTalking = false;
let mageMustLeaveBeforeTalkAgain = false;
let mageCurrentDialogueText = '';
let carpetObjectiveShown = false;
let mageMaterials = [];

const mageTintColor = new THREE.Color(0xd9eeff);
const mageEmissiveColor = new THREE.Color(0x2a4a66);
const mageBaseBrightness = 0.12;

// Dialogue DOM creation
const mageDialogue = document.createElement('div');
mageDialogue.className = 'mage-dialogue';
mageDialogue.textContent = 'Press E to talk to the mage';
document.body.appendChild(mageDialogue);

// Register the mage and save its data
export function registerMage(model) {
  mage = model;
  mageStartY = model.position.y;
  mageMaterials = [];
}

// Function to collect mage materials (called during traverse)
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

function getMageDialogueText() {
  if (isGemDelivered()) {
    return "Mage: Incredible! The gem is safe and magic has returned! To thank you for saving the island, I gift you my Flying Carpet.";
  }

  if (isCarryingGem()) {
    return "Mage: I see you have the gem! Press F to give it to me!";
  }

  if (isBookDelivered()) {
    return "Mage: Now the next step is to retrieve the hidden gem inside the castle, which is guarded by a dragon.";
  }

  if (isCarryingBook()) {
    return "Mage: Oh, you found the ancient Grimoire! Press F to hand it over to me!";
  }

  return "Mage: Welcome! Finally you are here. The island has lost its magic and needs your help to restore it. Help us find the enchanted book.";
}

// Event listener for the E key
// --- GESTIONE INPUT UNIFICATA PER IL MAGO ---
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  // Tasto E: Serve solo ad attivare il dialogo parlato
  if (key === 'e' && canTalkToMage && !mageIsTalking) {
    mageIsTalking = true;
    mageCurrentDialogueText = getMageDialogueText();
    return;
  }

  if (event.key === 'Enter' && mageIsTalking) {
    const shouldShowCarpetObjective =
      isGemDelivered() &&
      mageCurrentDialogueText.includes('Flying Carpet') &&
      !carpetObjectiveShown;

    mageIsTalking = false;
    mageMustLeaveBeforeTalkAgain = true;
    mageDialogue.classList.remove('is-visible');

    if (shouldShowCarpetObjective) {
      carpetObjectiveShown = true;
      showObjectiveMessage('Find the magic carpet.');
    }

    return;
  }

  // Tasto F: Gestisce le consegne degli oggetti della quest al mago
  if (key === 'f' && canTalkToMage) {
    if (isCarryingGem() && isBookDelivered()) {
      deliverGemToMage(); // Sposta la gemma in orbita intorno al mago
      mageIsTalking = true;
      mageCurrentDialogueText = getMageDialogueText();
      console.log("Gem delivered to the Mage!");
    }
  }
});

// Main update function for the mage
export function updateMage(deltaTime, player) {
  if (!mage) return false;

  const time = performance.now() * 0.001;

  // Mage floating animation
  mage.position.y = mageStartY + Math.sin(time * 2) * 0.12;
  mage.rotation.y += Math.sin(time * 3) * 0.002;

  const interactionDistance = 4;
  const resetDistance = interactionDistance + 1.2;
  const distanceSq = mage.position.distanceToSquared(player.position);
  const interactionDistanceSq = interactionDistance * interactionDistance;
  const resetDistanceSq = resetDistance * resetDistance;

  if (mageMustLeaveBeforeTalkAgain && distanceSq > resetDistanceSq) {
    mageMustLeaveBeforeTalkAgain = false;
  }

  canTalkToMage = distanceSq < interactionDistanceSq && !mageMustLeaveBeforeTalkAgain;

  if (distanceSq < interactionDistanceSq) {
    mage.lookAt(player.position.x, mage.position.y, player.position.z);
  }

  if (mageIsTalking) {
    // Se sta parlando attivamente, mostra SOLO il testo del dialogo parlato
    mageDialogue.classList.add('story-dialogue');
    mageDialogue.textContent = mageCurrentDialogueText;
    mageDialogue.classList.add('is-visible');
  } else if (canTalkToMage) {
    // Mostra i prompt di prossimità SOLO se NON sta parlando
    mageDialogue.classList.remove('story-dialogue');
    if (isCarryingGem()) {
      mageDialogue.textContent = 'Press F to deliver the gem | Press E to talk';
    } else if (isCarryingBook() && !isBookDelivered()) {
      mageDialogue.textContent = 'Press F to deliver the book | Press E to talk';
    } else {
      mageDialogue.textContent = 'Press E to talk to the mage';
    }
    mageDialogue.classList.add('is-visible');
  } else {
    // Se siamo lontani e non parla, nascondi tutto
    mageDialogue.classList.remove('story-dialogue');
    mageDialogue.classList.remove('is-visible');
  }

  // Luminescence management on approach
  if (canTalkToMage) {
    if (mageIsTalking) {
      setMageBrightness(0.1);
    } else {
      setMageBrightness(0.04);
    }
  } else {
    setMageBrightness(0);
  }
  return mageIsTalking;
}
