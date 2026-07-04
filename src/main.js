import './style.css';
import * as THREE from 'three';
import {
  createScene,
  createCamera,
  createRenderer,
  setupResize
} from './base/sceneSetup.js';
import { damageDragon, isDragonDefeated } from './imported_models/dragon.js';
import { createLights } from './base/lights.js';
import { materials } from './world/materials.js';
import { createIsland } from './world/island.js';
import { createIslandVegetation } from './world/vegetation.js';
import { createPlayer } from './player/schoolBoyPlayer.js';
import { createPlayerController } from './controls/playerControls.js';
import { loadModels, updateModels, modelColliders, modelBounds } from './imported_models/models.js';
import { updateBook, isBookDelivered } from './imported_models/book.js';
import { isGemDelivered } from './imported_models/gem.js';
import { createCloud } from './world/cloud.js';
import {
  createCarpetTravel,
  updateCarpetTravel,
  tryStartCarpetTravel
} from './world/carpetTravel.js';
import { loadShifuTask, startShifuBridgeThanks, updateShifuTask } from './imported_models/shifu.js';
import { loadWoodTask, updateWoodTask } from './imported_models/wood.js';
import { isBridgeBuilt, loadBridgeTask, updateBridgeTask } from './imported_models/bridge.js';
import { createRain, getStormProgress, startStorm, updateRain, updateStorm } from './world/rain.js';
import { createLampPosts, updateLampPosts } from './world/lampPosts.js';
import {
  createPortalPositionLogger,
  updatePortalTeleport
} from './world/portalTeleport.js';
import { updateTowerFall } from './world/towerFall.js';
import { createPuzzleMinigame, getPuzzleDifficulties } from './minigame/puzzle.js';
// RETTIFICA: Importiamo updateMage per poterlo usare nel ciclo di animazione
import { updateMage } from './imported_models/mage.js'; 

const canvas = document.querySelector('#bg');
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer(canvas);

setupResize(camera, renderer);

const clock = new THREE.Clock();
const debugMode = new URLSearchParams(window.location.search).has('debug');

createLights(scene);
const island = createIsland(scene, materials);

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

const cloudsNumber = 18;
const genericMin = -300;
const genericMax = 300;
const minY = 30;
const maxY = 100;

for (let i = 0; i < cloudsNumber; i++) {
    const cloud = createCloud(
        scene, 
        getRndInteger(genericMin, genericMax), 
        getRndInteger(minY, maxY), 
        getRndInteger(genericMin, genericMax),
        getRndInteger(0.1, 10)
    );
    cloud.rotation.y = Math.PI / Math.random();
}

createRain(scene);
const carpetTravel = createCarpetTravel(scene);

if (carpetTravel && carpetTravel.mesh) {
  carpetTravel.mesh.visible = false;
} else if (carpetTravel && carpetTravel.group) {
  carpetTravel.group.visible = false;
}


const carpetPrompt = document.createElement('div');
carpetPrompt.className = 'interaction-dialogue carpet-dialogue';
carpetPrompt.textContent = 'Press F to travel on the magic carpet';
document.body.appendChild(carpetPrompt);

const dragonPrompt = document.createElement('div');
dragonPrompt.className = 'interaction-dialogue dragon-dialogue';
dragonPrompt.textContent = 'Press R to fight the dragon!';
document.body.appendChild(dragonPrompt);

const dragonVictoryBanner = document.createElement('div');
dragonVictoryBanner.className = 'victory-banner';
dragonVictoryBanner.textContent = '⚔️ YOU HAVE SLAIN THE DRAGON! ⚔️';
document.body.appendChild(dragonVictoryBanner);

const viewHint = document.createElement('div');
viewHint.className = 'view-hint';
viewHint.textContent = 'Press V to change view';
document.body.appendChild(viewHint);

const difficultyOverlay = document.createElement('div');
difficultyOverlay.className = 'difficulty-overlay is-visible';
difficultyOverlay.innerHTML = `
  <section class="difficulty-panel" role="dialog" aria-modal="true" aria-labelledby="difficulty-title">
    <p class="difficulty-kicker">Choose your challenge</p>
    <div class="difficulty-options">
      ${Object.entries(getPuzzleDifficulties()).map(([key, option]) => `
        <button class="difficulty-option" type="button" data-difficulty="${key}">
          <strong>${option.label}</strong>
        </button>
      `).join('')}
    </div>
  </section>
`;
document.body.appendChild(difficultyOverlay);

let selectedDifficulty = 'medium';
let isChoosingDifficulty = true;
let dragonPuzzle = null;
let isDragonPuzzleActive = false;
let dragonDirectHits = 0;
let finalPuzzleStarted = false;
const DIRECT_HITS_BEFORE_FINAL_PUZZLE = 3;
const DRAGON_HIT_DAMAGE = 25;

function showDragonVictory() {
  dragonPrompt.classList.remove('is-visible');
  isInsideCastle = false;
  dragonVictoryBanner.classList.add('is-visible');

  setTimeout(() => {
    dragonVictoryBanner.classList.remove('is-visible');
  }, 4000);
}

function startDragonPuzzle() {
  if (isDragonPuzzleActive || finalPuzzleStarted || isDragonDefeated()) return;

  if (!dragonPuzzle) {
    dragonPuzzle = createPuzzleMinigame({
      difficulty: selectedDifficulty,
      title: 'Give the last hit',
      instruction: 'Give the last hit to the dragon by completing this puzzle.',
      allowClose: false,
      onClose: () => {
        isDragonPuzzleActive = false;
      },
      onSolved: () => {
        damageDragon(DRAGON_HIT_DAMAGE);
        console.log('Final puzzle solved. You gave the last hit to the dragon!');

        if (isDragonDefeated()) {
          showDragonVictory();
        }
      }
    });
  }

  finalPuzzleStarted = true;
  isDragonPuzzleActive = true;
  dragonPrompt.classList.remove('is-visible');
  dragonPuzzle.open();
}

function attackDragon() {
  if (dragonDirectHits < DIRECT_HITS_BEFORE_FINAL_PUZZLE) {
    dragonDirectHits += 1;
    damageDragon(DRAGON_HIT_DAMAGE);
    console.log(`You hit the dragon with magic! Hit ${dragonDirectHits}/${DIRECT_HITS_BEFORE_FINAL_PUZZLE}`);

    if (dragonDirectHits === DIRECT_HITS_BEFORE_FINAL_PUZZLE) {
      dragonPrompt.textContent = 'Press R to give the last hit to the dragon!';
    }

    return;
  }

  startDragonPuzzle();
}

difficultyOverlay.querySelectorAll('[data-difficulty]').forEach((button) => {
  button.addEventListener('click', () => {
    selectedDifficulty = button.dataset.difficulty;
    isChoosingDifficulty = false;
    difficultyOverlay.classList.remove('is-visible');
  });
});

// RETTIFICA: Gestione pulita dello stato della telecamera
let isFirstPerson = false;
let manualFirstPerson = false; // Ricorda se l'utente ha attivato la prima persona con il tasto 'V'
const thirdPersonFov = 65;
const firstPersonFov = 100;

function setFirstPersonMode(enable) {
  isFirstPerson = enable;
  const targetFov = enable ? firstPersonFov : thirdPersonFov;

  if (playerController) {
    playerController.setFirstPersonMode(enable);
  }

  if (camera.fov !== targetFov) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }

  if (playerData && playerData.group) {
    playerData.group.traverse((child) => {
      if (child.isMesh) {
        child.visible = !enable; 
      }
    });
  }
}

let isInsideCastle = false;
window.addEventListener('keydown', (event) => {
  if (isChoosingDifficulty || isDragonPuzzleActive) {
    return;
  }

  if (event.key.toLowerCase() === 'f') {
    if (!isGemDelivered()) {
      return; 
    }
    tryStartCarpetTravel(carpetTravel);
  }

  // RETTIFICA: Quando premi V, aggiorni lo stato manuale inserito dall'utente
  if (event.key.toLowerCase() === 'v') {
    manualFirstPerson = !manualFirstPerson;
    setFirstPersonMode(manualFirstPerson);
    console.log("Visuale manuale cambiata. Prima persona:", manualFirstPerson);
  }

  if (event.key.toLowerCase() === 'r') {
    if (isInsideCastle && isBookDelivered() && !isDragonDefeated()) {
      attackDragon();
    }
  }
});

window.addEventListener('keyup', () => {
  window.currentInteractionKey = null;
});

const playerData = createPlayer(scene);
createPortalPositionLogger(playerData.group);

const playerController = createPlayerController(
  playerData,
  camera,
  modelColliders
);

loadModels(scene).then(() => {
  createIslandVegetation(scene, {
    island,
    obstacleBounds: modelBounds,
    colliderTargets: modelColliders
  });
  createLampPosts(scene);
});
loadShifuTask(scene);
loadWoodTask(scene);
loadBridgeTask(scene);

if (debugMode) {
  const axesHelper = new THREE.AxesHelper(100);
  axesHelper.position.set(0, 5, 0);
  scene.add(axesHelper);

  const gridHelper = new THREE.GridHelper(200, 20);
  scene.add(gridHelper);
}

const playerCoords = document.createElement('div');
if (debugMode) {
  playerCoords.style.position = 'fixed';
  playerCoords.style.top = '10px';
  playerCoords.style.left = '10px';
  playerCoords.style.color = 'black';
  playerCoords.style.fontFamily = 'monospace';
  playerCoords.style.fontSize = '16px';
  playerCoords.style.zIndex = '9999';
  document.body.appendChild(playerCoords);
}

const castleTriggerBox = new THREE.Box3(
      new THREE.Vector3(-9, -5, -130),
      new THREE.Vector3(15, 30, -10)
    );
let shifuThanksTriggered = false;

// --------------------------------------------------
// 18. ANIMATION LOOP
// --------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  updateCarpetTravel(deltaTime, playerData.group, carpetTravel);
  const isFalling = updateTowerFall(
    deltaTime,
    playerData.group,
    playerData.group.position.y > 20 && !carpetTravel.isTraveling
  );
  const canControlPlayer = !carpetTravel.isTraveling && !isFalling && !isChoosingDifficulty && !isDragonPuzzleActive;
  playerController.update(deltaTime, canControlPlayer);

  const carpetObject = carpetTravel.group || carpetTravel.mesh;
  
  if (carpetObject && carpetObject.visible && !carpetTravel.isTraveling) {
    const distanceToCarpet = playerData.group.position.distanceTo(carpetObject.position);
    const carpetInteractionDistance = 4; // Raggio di attivazione (uguale a quello dei personaggi)

    if (distanceToCarpet < carpetInteractionDistance) {
      carpetPrompt.classList.add('is-visible');
    } else {
      carpetPrompt.classList.remove('is-visible');
    }
  } else {
    // Se sta già viaggiando o il tappeto non è ancora sbloccato, nascondi il banner
    carpetPrompt.classList.remove('is-visible');
  }

  // --- INIZIO BLOCCO GESTIONE TELECAMERA E DIALOGHI ---

  // 1. Aggiorna il Mago e cattura se STA PARLANDO ATTIVAMENTE (mageIsTalking è true)
  const isTalkingToMage = updateMage(deltaTime, playerData.group);
  const isTalkingToShifu = updateShifuTask(deltaTime, playerData.group);
  // 2. Controlla le condizioni per FORZARE la prima persona.
  // IMPORTANTE: Forziamo la 1PV SOLO se il mago sta attivamente parlando (isTalkingToMage è true).
  // Se siamo solo vicini al Mago (canTalkToMage), la visuale resta in terza persona.
  const shouldBeInFirstPerson = 
    isTalkingToMage || 
    isTalkingToShifu || 
    (isBridgeBuilt() && shifuThanksTriggered && !window.shifuThanksEnded);

  if (shouldBeInFirstPerson) {
    setFirstPersonMode(true);
  } else {
    // Quando nessuno sta parlando, la telecamera torna alla modalità scelta dall'utente (di base Terza Persona)
    setFirstPersonMode(manualFirstPerson);
  }

  // --- FINE BLOCCO GESTIONE TELECAMERA E DIALOGHI ---

  const pos = playerData.group.position;
  if (debugMode) {
    playerCoords.textContent = `X: ${pos.x.toFixed(2)}  Y: ${pos.y.toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  }

  updateModels(deltaTime, playerData.group);
  updateBook(deltaTime, playerData.group);
  updateWoodTask(deltaTime, playerData.group);
  updateBridgeTask(deltaTime, playerData.group);
  updatePortalTeleport(playerData.group);
  updateRain(deltaTime, playerData.group);
  updateStorm(deltaTime, scene);
  updateLampPosts(getStormProgress());

  if (isGemDelivered()) {
    if (carpetTravel && carpetTravel.mesh) carpetTravel.mesh.visible = true;
    if (carpetTravel && carpetTravel.group) carpetTravel.group.visible = true;
  }

  // --- CASTLE ZONE CHECK ---
  if (isBookDelivered() && !isDragonDefeated() && !isDragonPuzzleActive && !isChoosingDifficulty) {
    if (castleTriggerBox.containsPoint(playerData.group.position)) {
      isInsideCastle = true;
      if (!dragonPrompt.classList.contains('is-visible')) {
        dragonPrompt.classList.add('is-visible');
      }
    } else {
      isInsideCastle = false;
      dragonPrompt.classList.remove('is-visible');
    }
  } else {
    dragonPrompt.classList.remove('is-visible');
    isInsideCastle = false;
  }

  renderer.render(scene, camera);

  if (isBridgeBuilt() && !shifuThanksTriggered ){
    shifuThanksTriggered = true;
    startShifuBridgeThanks();
    startStorm(scene);
    
    setTimeout(() => {
       window.shifuThanksEnded = true; 
    }, 5000); 
  }
}
animate();
