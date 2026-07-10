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
import {
  loadGameplayModels,
  loadIntroModels,
  updateModels,
  modelColliders,
  modelBounds
} from './imported_models/models.js';
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
import {
  createRain,
  startStorm,
  stopStormAndRain,
  updateRain,
  updateStorm
} from './world/rain.js';
import {
  createPortalPositionLogger,
  updatePortalTeleport
} from './world/portalTeleport.js';
import { updateTowerFall } from './world/towerFall.js';
import { createPuzzleMinigame, getPuzzleDifficulties } from './minigame/puzzle.js';
import {
  isFinaleInputLocked,
  loadFinale,
  setFinaleCallbacks,
  setFinaleDifficulty,
  startFinale,
  updateFinale
} from './world/final.js';
import { loadDonkey, updateDonkey } from './world/donkey.js';
import { createLampPosts, updateLampPosts } from './world/lampPosts.js';

// --- SCENE SETUP ---
const canvas = document.querySelector('#bg');
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer(canvas);

// --- AUDIO SETUP ---
// 1. Create the AudioListener and attach it to the camera
const listener = new THREE.AudioListener();
camera.add(listener);

// 2. Create a global Audio object for background music
const backgroundMusic = new THREE.Audio(listener);

// Track if the player has interacted with the UI to allow audio playback
let hasUserInteracted = false; 
const audioLoader = new THREE.AudioLoader();
console.log("Starting to load the music file...");

audioLoader.load(
  '/music/Medieval_Vol.26.mp3',
  function(buffer) {
    console.log("SUCCESS! The audio file has been loaded and decoded.");
    backgroundMusic.setBuffer(buffer);
    backgroundMusic.setLoop(true); 
    backgroundMusic.setVolume(0.4); 
    
    // Play immediately if the user has already interacted
    if (hasUserInteracted && listener.context.state !== 'suspended') {
      backgroundMusic.play();
    }
  },
  function(xhr) {
    // Log the downloading progress
    console.log(`Audio downloading: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
  },
  function(err) {
    console.error('CRITICAL ERROR: Cannot find the file /music/Medieval_Vol.26.mp3');
    console.error('Make sure the "music" folder is inside the "public" folder of the project!');
  }
);

// Enable shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
setupResize(camera, renderer);

const clock = new THREE.Clock();
const debugMode = new URLSearchParams(window.location.search).has('debug');

// --- WORLD GENERATION ---
const lights = createLights(scene);
const island = createIsland(scene, materials);

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

// Generate clouds
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

// Initialize lampposts in the scene
createLampPosts(scene);

// Hide magic carpet initially
if (carpetTravel && carpetTravel.mesh) {
  carpetTravel.mesh.visible = false;
} else if (carpetTravel && carpetTravel.group) {
  carpetTravel.group.visible = false;
}

// --- UI ELEMENTS ---
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
difficultyOverlay.className = 'difficulty-overlay';
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

const introOverlay = document.createElement('div');
introOverlay.className = 'intro-overlay is-visible';
introOverlay.innerHTML = `
  <section class="intro-panel" role="dialog" aria-modal="true" aria-labelledby="intro-title">
    <h1 id="intro-title">Welcome to the Lost Magic Isles</h1>
    <p>The magic of the floating isles is fading. Explore, help its guardians, recover ancient relics, and restore the island's power.</p>
    <button class="intro-start-button" type="button">Start</button>
  </section>
`;
document.body.appendChild(introOverlay);

// --- GAME STATE VARIABLES ---
let selectedDifficulty = 'medium';
let isChoosingDifficulty = true;
let isIntroActive = true;
let dragonPuzzle = null;
let isDragonPuzzleActive = false;
let dragonDirectHits = 0;
let finalPuzzleStarted = false;

// Model Loading Promises
let gameplayModelsPromise = null;
let worldTwoModelsPromise = null;
let finaleModelsPromise = null;
let gameplayModelsLoaded = false;
let worldTwoModelsLoaded = false;
let finaleModelsLoaded = false;

const DIRECT_HITS_BEFORE_FINAL_PUZZLE = 3;
const DRAGON_HIT_DAMAGE = 25;

// --- MODEL LOADING MANAGERS ---
function ensureGameplayModelsLoaded() {
  if (!gameplayModelsPromise) {
    gameplayModelsPromise = loadGameplayModels(scene).then((models) => {
      gameplayModelsLoaded = true;
      return models;
    });
  }
  return gameplayModelsPromise;
}

function ensureWorldTwoModelsLoaded() {
  if (!worldTwoModelsPromise) {
    worldTwoModelsPromise = Promise.all([
      loadShifuTask(scene),
      loadWoodTask(scene),
      loadBridgeTask(scene)
    ]).then((models) => {
      worldTwoModelsLoaded = true;
      return models;
    });
  }
  return worldTwoModelsPromise;
}

function ensureFinaleModelsLoaded() {
  if (!finaleModelsPromise) {
    finaleModelsPromise = Promise.all([
      loadFinale(scene),
      loadDonkey(scene)
    ]).then((models) => {
      finaleModelsLoaded = true;
      return models;
    });
  }
  return finaleModelsPromise;
}

// --- DRAGON COMBAT LOGIC ---
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

// --- EVENT LISTENERS ---
difficultyOverlay.querySelectorAll('[data-difficulty]').forEach((button) => {
  button.addEventListener('click', async () => { 
    selectedDifficulty = button.dataset.difficulty;
    setFinaleDifficulty(selectedDifficulty);
    isChoosingDifficulty = false;
    difficultyOverlay.classList.remove('is-visible');

    // Mark that the user has interacted to allow audio
    hasUserInteracted = true; 

    // Await audio context resume to satisfy browser autoplay policies
    if (listener.context.state === 'suspended') {
      await listener.context.resume();
    }
    
    // Play background music if it's loaded and not already playing
    if (backgroundMusic.buffer && !backgroundMusic.isPlaying) {
      backgroundMusic.play();
    }
  });
});

introOverlay.querySelector('.intro-start-button').addEventListener('click', () => {
  isIntroActive = false;
  introOverlay.classList.remove('is-visible');
  difficultyOverlay.classList.add('is-visible');

  ensureGameplayModelsLoaded();
});

// Camera View Logic
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

  // Toggle player mesh visibility based on view mode
  if (playerData && playerData.group) {
    playerData.group.traverse((child) => {
      if (child.isMesh) {
        child.visible = !enable; 
      }
    });
  }
}

// Input Handling
let isInsideCastle = false;
window.addEventListener('keydown', (event) => {
  if (isIntroActive || isChoosingDifficulty || isDragonPuzzleActive || isFinaleInputLocked()) {
    return;
  }

  const key = event.key.toLowerCase();

  // Handle Carpet Travel
  if (key === 'f') {
    if (!isGemDelivered()) return; 
    
    ensureWorldTwoModelsLoaded();
    tryStartCarpetTravel(carpetTravel);
  }

  // Handle Camera View Toggle
  if (key === 'v') {
    manualFirstPerson = !manualFirstPerson;
    setFirstPersonMode(manualFirstPerson);
    console.log('Manual view changed. First person:', manualFirstPerson);
  }

  // Handle Dragon Attack
  if (key === 'r') {
    if (isInsideCastle && isBookDelivered() && !isDragonDefeated()) {
      attackDragon();
    }
  }
});

window.addEventListener('keyup', () => {
  window.currentInteractionKey = null;
});

// --- PLAYER INITIALIZATION ---
const playerData = createPlayer(scene);
createPortalPositionLogger(playerData.group);

const playerController = createPlayerController(
  playerData,
  camera,
  modelColliders
);

loadIntroModels(scene).then(() => {
  createIslandVegetation(scene, {
    island,
    obstacleBounds: modelBounds,
    colliderTargets: modelColliders
  });
});

// Debug tools
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

// Dynamic Camera Logic
function updateIntroCamera(time) {
  const phase = time * 0.12;
  const sweep = Math.sin(time * 0.22);
  const radius = 142 + Math.sin(time * 0.16) * 18;
  const height = 78 + (sweep + 1) * 34;
  const cameraX = Math.cos(phase) * radius;
  const cameraZ = Math.sin(phase) * radius;
  const targetX = Math.sin(time * 0.11) * 18;
  const targetZ = Math.cos(time * 0.09) * 22;

  camera.position.set(cameraX, height, cameraZ);
  camera.lookAt(targetX, 0, targetZ);
}

// Weather and Environment State
let globalStormProgress = 0;
let finaleWeatherCleared = false;
let rainUpdateAccumulator = 0;
const rainUpdateInterval = 1 / 30;

setFinaleCallbacks({
  onRestComplete: () => {
    finaleWeatherCleared = true;
    globalStormProgress = 0;
    stopStormAndRain(scene);
    updateLampPosts(0);
  }
});

// --------------------------------------------------
// MAIN ANIMATION LOOP
// --------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const time = performance.now() * 0.001;

  // Handle Intro Screen Camera Movement
  if (isIntroActive) {
    updateIntroCamera(time);
    if (gameplayModelsLoaded) {
      updateModels(deltaTime, playerData.group);
    }
    renderer.render(scene, camera);
    return;
  }

  // Handle Movement and Controls
  updateCarpetTravel(deltaTime, playerData.group, carpetTravel);
  const isFalling = updateTowerFall(
    deltaTime,
    playerData.group,
    playerData.group.position.y > 20 && !carpetTravel.isTraveling
  );
  
  const canControlPlayer =
    !carpetTravel.isTraveling &&
    !isFalling &&
    !isChoosingDifficulty &&
    !isDragonPuzzleActive &&
    !isFinaleInputLocked();
    
  playerController.update(deltaTime, canControlPlayer);

  // Carpet Interaction Prompt
  const carpetObject = carpetTravel.group || carpetTravel.mesh;
  if (carpetObject && carpetObject.visible && !carpetTravel.isTraveling && !carpetTravel.hasArrived) {
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
  
  // Model Updates
  let isTalkingToMage = false;
  if (gameplayModelsLoaded) {
    isTalkingToMage = updateModels(deltaTime, playerData.group);
    updateBook(deltaTime, playerData.group);
  }

  const isTalkingToShifu = worldTwoModelsLoaded
    ? updateShifuTask(deltaTime, playerData.group)
    : false;
    
  const isTalkingToFinale = finaleModelsLoaded
    ? updateFinale(deltaTime, playerData.group, camera)
    : false;
    
  // Force first-person view while a character is actively talking
  const shouldBeInFirstPerson = isTalkingToMage || isTalkingToShifu || isTalkingToFinale;

  if (shouldBeInFirstPerson) {
    setFirstPersonMode(true);
  } else {
    setFirstPersonMode(manualFirstPerson);
  }

  // Debug Coordinates
  if (debugMode) {
    const pos = playerData.group.position;
    playerCoords.textContent = `X: ${pos.x.toFixed(2)}  Y: ${pos.y.toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  }

  // World 2 Updates
  if (worldTwoModelsLoaded) {
    updateWoodTask(deltaTime, playerData.group);
    updateBridgeTask(deltaTime, playerData.group);
    updatePortalTeleport(playerData.group, () => {
      ensureFinaleModelsLoaded().then(() => {
        startFinale();
      });
    });
  }

  // Finale Updates
  if (finaleModelsLoaded) {
    updateDonkey(deltaTime, playerData.group);
  }

  // Weather Logic
  if (shifuThanksTriggered && !finaleWeatherCleared) {
    rainUpdateAccumulator += deltaTime;
    if (rainUpdateAccumulator >= rainUpdateInterval) {
      updateRain(rainUpdateAccumulator, playerData.group);
      rainUpdateAccumulator = 0;
    }
    updateStorm(deltaTime, scene);
    
    // The storm intensity gradually increases over a few seconds
    globalStormProgress = Math.min(1.0, globalStormProgress + deltaTime * 0.2); 
  }

  // Update lampposts based on storm state
  if (globalStormProgress > 0 || (shifuThanksTriggered && !finaleWeatherCleared)) {
    updateLampPosts(globalStormProgress, playerData.group);
  }
  
  // Environmental Lighting adjustments
  lights.sunLight.intensity = 1.0 * (1.0 - globalStormProgress);
  lights.sunLight.castShadow = globalStormProgress <= 0.5;
  lights.ambientLight.intensity = 0.4 * (1.0 - globalStormProgress * 0.95);

  scene.environmentIntensity = 1.0 - globalStormProgress; 
  if (scene.backgroundBlurriness !== undefined) {
    scene.backgroundIntensity = 1.0 - globalStormProgress;
  }

  // Event Triggers
  if (isGemDelivered()) {
    if (carpetTravel && carpetTravel.mesh) carpetTravel.mesh.visible = true;
    if (carpetTravel && carpetTravel.group) carpetTravel.group.visible = true;
  }

  // Castle Region detection for Dragon fight
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

  // Trigger storm after bridge is built
  if (isBridgeBuilt() && !shifuThanksTriggered && !finaleWeatherCleared ){
    shifuThanksTriggered = true;
    startShifuBridgeThanks();
    startStorm(scene);
  }
}

// Start game loop
animate();