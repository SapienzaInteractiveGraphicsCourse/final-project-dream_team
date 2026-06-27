import * as THREE from 'three';
import { isBookDelivered } from './book.js';
import { isDragonDefeated } from './dragon.js'; // Assicurati di avere questa funzione in dragon.js

let gem = null;
let gemStartY = 0;
let canTakeGem = false;
let hasGem = false;
let gemDelivered = false;

const gemPrompt = document.createElement('div');
gemPrompt.className = 'interaction-dialogue gem-dialogue';
gemPrompt.textContent = 'Premi F per raccogliere la gemma';
document.body.appendChild(gemPrompt);

export function registerGem(model) {
  gem = model;
  gemStartY = model.position.y;
  gem.visible = false; // Nascosta all'inizio del gioco
  canTakeGem = false;
  hasGem = false;
  gemDelivered = false;
}

export function isCarryingGem() { return hasGem; }
export function isGemDelivered() { return gemDelivered; }

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f' || !gem || !gem.visible) return;

  // Se il giocatore è vicino al mago (deliveryTarget) e ha la gemma, la consegna
  if (hasGem && canTakeGem && isBookDelivered()) {
    // Nota: usiamo la stessa distanza logica o deleghiamo al mago
    return; 
  }

  if (canTakeGem && !hasGem) {
    hasGem = true;
    gem.visible = false; // Scompare dal mondo perché è nell'inventario
    gemPrompt.classList.remove('is-visible');
  }
});

export function updateGem(deltaTime, player, mageModel) {
  if (!gem) return;

  // 1. APPARIZIONE: La gemma appare solo se il libro è stato consegnato E il drago è morto
  if (!gem.visible && !hasGem && !gemDelivered) {
    if (isBookDelivered() && isDragonDefeated()) {
      gem.visible = true;
    } else {
      return; // Se i requisiti non sono soddisfatti, non fare nulla
    }
  }

  const time = performance.now() * 0.001;

  // 2. GESTIONE CONSEGNA AL MAGO
  if (hasGem && mageModel) {
    const distanceToMage = player.position.distanceTo(mageModel.position);
    
    // Se siamo vicini al mago con la gemma, permettiamo la consegna premendo E (gestito in mage.js)
    if (distanceToMage < 4) {
      // Questa variabile può essere letta da mage.js per completare il gioco
      return;
    }
  }

  // 3. LOGICA A TERRA NEL CASTELLO (Prima di essere raccolta)
  if (!hasGem && !gemDelivered) {
    const distanceToPlayer = gem.position.distanceTo(player.position);
    canTakeGem = distanceToPlayer < 3;

    // Rotazione ed effetto fluttuazione della gemma nel castello
    gem.rotation.y += deltaTime * 1.5;
    gem.position.y = gemStartY + Math.sin(time * 4) * 0.08;

    if (canTakeGem) {
      gemPrompt.classList.add('is-visible');
    } else {
      gemPrompt.classList.remove('is-visible');
    }
  }
}

// Funzione di comodo per quando si consegna la gemma via Mage.js
export function deliverGemToMage() {
  hasGem = false;
  gemDelivered = true;
  gemPrompt.classList.remove('is-visible');
}