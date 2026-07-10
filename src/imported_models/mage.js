import * as THREE from 'three';
import { isBookDelivered, isCarryingBook } from './book.js';
import { isCarryingGem, isGemDelivered, deliverGemToMage } from './gem.js';
import { showObjectiveMessage } from '../ui/objectiveMessage.js';

// --- STATE VARIABLES ---
let mage = null;
let mageStartY = 0;
let canTalkToMage = false;
let mageIsTalking = false;
let mageMustLeaveBeforeTalkAgain = false;
let mageCurrentDialogueText = '';
let carpetObjectiveShown = false;
let mageMaterials = [];

// --- VISUAL CONFIGURATION ---
const mageTintColor = new THREE.Color(0xd9eeff);
const mageEmissiveColor = new THREE.Color(0x2a4a66);
const mageBaseBrightness = 0.12;

// --- UI ELEMENTS ---
const mageDialogue = document.createElement('div');
mageDialogue.className = 'mage-dialogue';
mageDialogue.textContent = 'Press E to talk to the mage';
document.body.appendChild(mageDialogue);

// --- REGISTRATION & MATERIAL HANDLING ---

/**
 * Registers the mage model and saves its initial ground Y position.
 */
export function registerMage(model) {
  mage = model;
  mageStartY = model.position.y;
  mageMaterials = [];
}

/**
 * Collects and configures the mage's materials for glowing effects.
 * Called during the initial model traversal in models.js.
 */
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

/**
 * Dynamically adjusts the mage's emissive glow strength.
 */
function setMageBrightness(strength) {
  mageMaterials.forEach((material) => {
    if (material.emissive) {
      material.emissive.copy(mageEmissiveColor);
      material.emissiveIntensity = mageBaseBrightness + strength;
    }
  });
}

// --- DIALOGUE LOGIC ---

/**
 * Determines the correct dialogue text based on the player's quest progress.
 */
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

// --- UNIFIED INPUT HANDLING FOR THE MAGE ---

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  // Key E: Only used to activate spoken dialogue
  if (key === 'e' && canTalkToMage && !mageIsTalking) {
    mageIsTalking = true;
    mageCurrentDialogueText = getMageDialogueText();
    return;
  }

  // Key Enter: Dismiss dialogue and trigger subsequent events
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

  // Key F: Handles quest item deliveries to the mage
  if (key === 'f' && canTalkToMage) {
    if (isCarryingGem() && isBookDelivered()) {
      deliverGemToMage(); // Moves the gem into orbit around the mage
      mageIsTalking = true;
      mageCurrentDialogueText = getMageDialogueText();
      console.log("Gem delivered to the Mage!");
    }
  }
});

// --- MAIN UPDATE LOOP ---

export function updateMage(deltaTime, player) {
  if (!mage) return false;

  const time = performance.now() * 0.001;

  // Mage floating animation
  mage.position.y = mageStartY + Math.sin(time * 2) * 0.12;
  mage.rotation.y += Math.sin(time * 3) * 0.002;

  // Distance calculations
  const interactionDistance = 4;
  const resetDistance = interactionDistance + 1.2;
  const distanceSq = mage.position.distanceToSquared(player.position);
  const interactionDistanceSq = interactionDistance * interactionDistance;
  const resetDistanceSq = resetDistance * resetDistance;

  // Reset interaction availability if the player walks away
  if (mageMustLeaveBeforeTalkAgain && distanceSq > resetDistanceSq) {
    mageMustLeaveBeforeTalkAgain = false;
  }

  canTalkToMage = distanceSq < interactionDistanceSq && !mageMustLeaveBeforeTalkAgain;

  // Make the mage look at the player when close
  if (distanceSq < interactionDistanceSq) {
    mage.lookAt(player.position.x, mage.position.y, player.position.z);
  }

  // Handle UI visibility and content
  if (mageIsTalking) {
    // If actively talking, show ONLY the spoken dialogue text
    mageDialogue.classList.add('story-dialogue');
    mageDialogue.textContent = mageCurrentDialogueText;
    mageDialogue.classList.add('is-visible');
  } else if (canTalkToMage) {
    // Show proximity prompts ONLY if NOT talking
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
    // If far away and not talking, hide everything
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