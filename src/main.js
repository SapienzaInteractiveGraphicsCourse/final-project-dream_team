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
import { createPlayer, animatePlayer } from './player/schoolBoyPlayer.js';
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
import { createRain, startStorm, updateRain, updateStorm } from './world/rain.js';
import {
  createPortalPositionLogger,
  updatePortalTeleport
} from './world/portalTeleport.js';
import { updateTowerFall } from './world/towerFall.js';
import { createPuzzleMinigame, getPuzzleDifficulties } from './minigame/puzzle.js';
import { loadFinale, updateFinale } from './world/finale.js';
import { updateMage } from './imported_models/mage.js'; 

// MODIFICA: Importo le logiche dei lampioni
import { createLampPosts, updateLampPosts } from './world/lampPosts.js';

const canvas = document.querySelector('#bg');
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer(canvas);

// 1. Crea l'AudioListener e attaccalo alla telecamera
const listener = new THREE.AudioListener();
camera.add(listener);

// 2. Crea un oggetto Audio globale (per la musica di sottofondo, non posizionale)
const backgroundMusic = new THREE.Audio(listener);

// Aggiungiamo questa variabile per sapere se il giocatore ha già cliccato
let hasUserInteracted = false; 
const audioLoader = new THREE.AudioLoader();
console.log("Inizio a cercare il file musicale...");

audioLoader.load(
  '/music/Medieval_Vol.26.mp3',
  function(buffer) {
    console.log("SUCCESSO! Il file audio è stato caricato e decodificato.");
    backgroundMusic.setBuffer(buffer);
    backgroundMusic.setLoop(true); 
    backgroundMusic.setVolume(0.4); 
    
    if (hasUserInteracted && listener.context.state !== 'suspended') {
      backgroundMusic.play();
    }
  },
  function(xhr) {
    // Questo ti mostra la percentuale di caricamento
    console.log('Scaricamento audio: ' + Math.round(xhr.loaded / xhr.total * 100) + '%');
  },
  function(err) {
    console.error('ERRORE GRAVE: Non riesco a trovare il file /music/Medieval_Vol.26.mp3');
    console.error('Assicurati che la cartella "music" sia dentro la cartella "public" del progetto!');
  }
);

// --- EFFETTO SONORO COLPO MAGICO ---
const dragonHitSound = new THREE.Audio(listener);

audioLoader.load(
  '/music/dragon_hit.wav', 
  function(buffer) {
    dragonHitSound.setBuffer(buffer);
    dragonHitSound.setLoop(false); 
    dragonHitSound.setVolume(0.8); 
  },
  undefined,
  function(err) {
    console.error('Errore nel caricamento del suono del drago. Assicurati che il file si chiami esattamente dragon_hit.wav');
  }
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ombre morbide di alta qualità

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

// MODIFICA: Chiamo la creazione dei lampioni nella scena
createLampPosts(scene);

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
  // 1. Aggiunto "async" qui!
  button.addEventListener('click', async () => { 
    selectedDifficulty = button.dataset.difficulty;
    isChoosingDifficulty = false;
    difficultyOverlay.classList.remove('is-visible');

    // 2. Aggiunto questo per avvisare che il giocatore ha cliccato
    hasUserInteracted = true; 

    // 3. Aggiunto "await" per aspettare davvero il via libera del browser
    if (listener.context.state === 'suspended') {
      await listener.context.resume();
    }
    
    // Se la musica è stata caricata e non sta già suonando, avviala
    if (backgroundMusic.buffer && !backgroundMusic.isPlaying) {
      backgroundMusic.play();
    }
  });
});

let isFirstPerson = false;
let manualFirstPerson = false; 
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

  if (event.key.toLowerCase() === 'v') {
    manualFirstPerson = !manualFirstPerson;
    setFirstPersonMode(manualFirstPerson);
    console.log('Manual view changed. First person:', manualFirstPerson);
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
});
loadShifuTask(scene);
loadWoodTask(scene);
loadBridgeTask(scene);
loadFinale(scene);

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

// MODIFICA: Variabile per simulare l'aumento dell'intensità della tempesta da passare ai lampioni
let globalStormProgress = 0;

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
    const carpetInteractionDistance = 4;

    if (distanceToCarpet < carpetInteractionDistance) {
      carpetPrompt.classList.add('is-visible');
    } else {
      carpetPrompt.classList.remove('is-visible');
    }
  } else {
    carpetPrompt.classList.remove('is-visible');
  }
  
  const isTalkingToMage = updateMage(deltaTime, playerData.group);
  const isTalkingToShifu = updateShifuTask(deltaTime, playerData.group);
  const shouldBeInFirstPerson = isTalkingToMage || isTalkingToShifu;

  if (shouldBeInFirstPerson) {
    setFirstPersonMode(true);
  } else {
    setFirstPersonMode(manualFirstPerson);
  }

  const pos = playerData.group.position;
  if (debugMode) {
    playerCoords.textContent = `X: ${pos.x.toFixed(2)}  Y: ${pos.y.toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  }

  updateModels(deltaTime, playerData.group);
  updateBook(deltaTime, playerData.group);
  updateWoodTask(deltaTime, playerData.group);
  updateBridgeTask(deltaTime, playerData.group);
  updatePortalTeleport(playerData.group);
  updateFinale(deltaTime, playerData.group);
  updateRain(deltaTime, playerData.group);
  updateStorm(deltaTime, scene);

  // MODIFICA: Aggiornamento lampioni basato sullo stato della tempesta
  if (shifuThanksTriggered) {
    // La tempesta sale progressivamente fino a 1 nel giro di qualche secondo
    globalStormProgress = Math.min(1.0, globalStormProgress + deltaTime * 0.2); 
  }
  updateLampPosts(globalStormProgress);
  
  // NUOVO: Gestione dello spegnimento del Sole e delle sue ombre
  scene.traverse((child) => {
    if (child.isLight) {
      
      // Se la luce è attaccata a un lampione, ignoriamola (ci pensa updateLampPosts)
      if (child.parent && child.parent.name === 'path-lamp-post') return;

      // Se è il Sole (DirectionalLight)
      if (child.isDirectionalLight) {
        child.intensity = 1.0 * (1.0 - globalStormProgress);
        child.castShadow = globalStormProgress <= 0.8;
      } 
      // Qualsiasi altra luce (AmbientLight, HemisphereLight, ecc.)
      else {
        // Abbassiamo tutto in base alla tempesta, lasciando un piccolissimo 0.05 per non avere uno schermo nero al 100%
        child.intensity = 0.4 * (1.0 - globalStormProgress * 0.95);
      }
    }
  });

  scene.environmentIntensity = 1.0 - globalStormProgress; 
  if (scene.backgroundBlurriness !== undefined) {
    scene.backgroundIntensity = 1.0 - globalStormProgress;
  }

  if (isGemDelivered()) {
    if (carpetTravel && carpetTravel.mesh) carpetTravel.mesh.visible = true;
    if (carpetTravel && carpetTravel.group) carpetTravel.group.visible = true;
  }

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
  }
}
animate();