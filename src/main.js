import './style.css';
import * as THREE from 'three';
import {
  createScene,
  createCamera,
  createRenderer,
  setupResize
} from './base/sceneSetup.js';
import {
  damageDragon,
  getDragonHealth,
  getDragonObject,
  isDragonDefeated,
  resetDragon
} from './imported_models/dragon.js';
import { createLights } from './base/lights.js';
import { materials } from './world/materials.js';
import { createIsland } from './world/island.js';
import { createIslandVegetation } from './world/vegetation.js';
import { createPlayer } from './player/schoolBoyPlayer.js';
import { createPlayerController } from './controls/playerControls.js';
import {
  loadGameplayModels,
  loadIntroModels,
  updateModels
} from './imported_models/models.js';
import { modelBounds, modelColliders } from './world/collisionRegistry.js';
import { updateBook, isBookDelivered } from './imported_models/book.js';
import { isGemDelivered } from './imported_models/gem.js';
import { createCloud } from './world/cloud.js';
import {
  createCarpetTravel,
  updateCarpetTravel,
  tryStartCarpetTravel
} from './world/carpetTravel.js';
import {
  loadShifuTask,
  setShifuHeroName,
  startShifuBridgeThanks,
  updateShifuTask
} from './imported_models/shifu.js';
import { loadWoodTask, updateWoodTask } from './imported_models/wood.js';
import { getActiveTower, isBridgeBuilt, loadBridgeTask, updateBridgeTask } from './imported_models/bridge.js';
import {
  createRain,
  setRainAppearance,
  setRainVolume,
  startStorm,
  stopStormAndRain,
  updateRain,
  updateStorm
} from './world/rain.js';
import { updatePortalTeleport } from './world/portalTeleport.js';
import { updateTowerFall } from './world/towerFall.js';
import {
  isTowerFallActive,
  startTowerFall,
  updatePhysicsWorld
} from './world/physicsWorld.js';
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
import { createDragonCombat } from './combat/dragonCombat.js';
import { assetLoadingManager } from './base/loaders.js';
import { setMageHeroName } from './imported_models/mage.js';

const canvas = document.querySelector('#bg');
const scene = createScene();
const camera = createCamera();
const renderer = createRenderer(canvas);

const loadingMessages = [
  'The hero is sailing toward the Lost Magic Isles...',
  'Helping a roadside beggar find his missing boot...',
  'Packing spellbooks that are definitely not cursed...',
  'Asking the clouds for directions...',
  'Convincing the ferryman that heroism counts as payment...',
  'Polishing a sword that will probably not be used...'
];
const loadingOverlay = document.createElement('div');
loadingOverlay.className = 'loading-overlay is-visible';
loadingOverlay.innerHTML = `
  <div class="loading-content" role="status" aria-live="polite">
    <h1>Lost Magic Isles</h1>
    <div class="loading-track" aria-label="Loading world">
      <div class="loading-fill"></div>
    </div>
    <p class="loading-message">${loadingMessages[0]}</p>
    <output class="loading-value">0%</output>
  </div>
`;
document.body.appendChild(loadingOverlay);

const loadingFill = loadingOverlay.querySelector('.loading-fill');
const loadingMessage = loadingOverlay.querySelector('.loading-message');
const loadingValue = loadingOverlay.querySelector('.loading-value');
let lastLoadingMessageIndex = 0;
let loadingCycleComplete = false;
let worldGroupsReady = false;
let displayedLoadingProgress = 0;

function displayLoadingProgress(progress) {
  displayedLoadingProgress = Math.max(displayedLoadingProgress, Math.min(progress, 1));
  const percentage = Math.round(displayedLoadingProgress * 100);
  loadingFill.style.transform = `scaleX(${displayedLoadingProgress})`;
  loadingValue.textContent = `${percentage}%`;
}

function finishWorldLoading() {
  if (!loadingCycleComplete || !worldGroupsReady) return;
  displayLoadingProgress(1);
  loadingMessage.textContent = 'The island is ready for its hero.';
  window.setTimeout(() => loadingOverlay.classList.remove('is-visible'), 350);
}

assetLoadingManager.onStart = () => {
  loadingCycleComplete = false;
};

assetLoadingManager.onProgress = (_url, loaded, total) => {
  // New dependencies can increase `total` while loading. Capping intermediate
  // progress keeps the bar honest and monotonic until every world group is ready.
  const measuredProgress = total > 0 ? loaded / total : 0;
  const progress = Math.min(measuredProgress, 0.95);
  displayLoadingProgress(progress);

  const messageIndex = Math.min(
    loadingMessages.length - 1,
    Math.floor(progress * loadingMessages.length)
  );
  if (messageIndex !== lastLoadingMessageIndex) {
    lastLoadingMessageIndex = messageIndex;
    loadingMessage.textContent = loadingMessages[messageIndex];
  }
};

assetLoadingManager.onLoad = () => {
  loadingCycleComplete = true;
  finishWorldLoading();
};

const listener = new THREE.AudioListener();
camera.add(listener);

const backgroundMusic = new THREE.Audio(listener);
const daySkyColor = new THREE.Color(0x9ed7ff);
const nightSkyColor = new THREE.Color(0x050814);
const daySunColor = new THREE.Color(0xffffff);
const nightSunColor = new THREE.Color(0x9db8ff);
const worldSettings = {
  musicVolume: 0.4,
  sfxVolume: 0.35,
  ambientBrightness: 1,
  isNight: false
};

let hasUserInteracted = false; 
const audioLoader = new THREE.AudioLoader(assetLoadingManager);
console.log("Starting to load the music file...");

audioLoader.load(
  'music/Medieval_Vol.26.mp3',
  function(buffer) {
    console.log("SUCCESS! The audio file has been loaded and decoded.");
    backgroundMusic.setBuffer(buffer);
    backgroundMusic.setLoop(true); 
    backgroundMusic.setVolume(worldSettings.musicVolume); 

    if (hasUserInteracted && listener.context.state !== 'suspended') {
      backgroundMusic.play();
    }
  },
  function(xhr) {

    console.log(`Audio downloading: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
  },
  function(err) {
    console.error('CRITICAL ERROR: Cannot find the file /music/Medieval_Vol.26.mp3');
    console.error('Make sure the "music" folder is inside the "public" folder of the project!');
  }
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
setupResize(camera, renderer);

const clock = new THREE.Clock();
const urlParams = new URLSearchParams(window.location.search);
const debugMode = urlParams.has('debug');
const towerSpawnMode = urlParams.has('towerSpawn') || urlParams.has('tower');
const towerSpawnPosition = new THREE.Vector3(237.79, 28.75, -255.19);

const lights = createLights(scene);
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
dragonPrompt.textContent = 'Press R to cast a spell at the dragon!';
document.body.appendChild(dragonPrompt);

const dragonVictoryBanner = document.createElement('div');
dragonVictoryBanner.className = 'victory-banner';
dragonVictoryBanner.textContent = '⚔️ YOU HAVE SLAIN THE DRAGON! ⚔️';
document.body.appendChild(dragonVictoryBanner);

const playerHealthHud = document.createElement('div');
playerHealthHud.className = 'health-hud player-health-hud';
playerHealthHud.innerHTML = `
  <div class="health-portrait player-portrait" aria-hidden="true">🧑</div>
  <div class="health-details">
    <div class="health-label"><span>PLAYER</span><output>100</output></div>
    <div class="health-track"><div class="health-fill"></div></div>
  </div>
`;
document.body.appendChild(playerHealthHud);

const dragonHealthHud = document.createElement('div');
dragonHealthHud.className = 'health-hud dragon-health-hud';
dragonHealthHud.innerHTML = `
  <div class="health-portrait dragon-portrait" aria-hidden="true">🐲</div>
  <div class="health-details">
    <div class="health-label"><span>DRAGON</span><output>100</output></div>
    <div class="health-track"><div class="health-fill"></div></div>
  </div>
`;
document.body.appendChild(dragonHealthHud);

const deathOverlay = document.createElement('div');
deathOverlay.className = 'death-overlay';
deathOverlay.innerHTML = `
  <section class="death-panel" role="dialog" aria-modal="true" aria-labelledby="death-title">
    <p class="death-kicker">The dragon defeated you</p>
    <h1 id="death-title">You died</h1>
    <button class="respawn-button" type="button">Respawn</button>
  </section>
`;
document.body.appendChild(deathOverlay);

let playerHealth = 100;
let isPlayerDead = false;

function setHealthHudValue(hud, health) {
  const value = Math.max(0, Math.min(100, health));
  hud.querySelector('.health-fill').style.width = `${value}%`;
  hud.querySelector('output').textContent = Math.ceil(value);
}

function updateCombatHud() {
  playerHealthHud.classList.toggle('is-visible', !isIntroActive && !isChoosingDifficulty);
  dragonHealthHud.classList.toggle(
    'is-visible',
    isInsideCastle && !isPlayerDead && isBookDelivered() && !isDragonDefeated() && !isDragonPuzzleActive
  );
  setHealthHudValue(playerHealthHud, playerHealth);
  setHealthHudValue(dragonHealthHud, getDragonHealth());
}

function createControlsLegendMarkup() {
  return `
    <div class="legend-group">
      <div class="keys-cluster">
        <div class="key-row"><kbd>W</kbd></div>
        <div class="key-row"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
      </div>
      <span class="legend-label">Move</span>
    </div>
    <div class="legend-group">
      <div class="keys-cluster">
        <div class="key-row"><kbd>▲</kbd></div>
        <div class="key-row"><kbd>◄</kbd><kbd>▼</kbd><kbd>►</kbd></div>
      </div>
      <span class="legend-label">Adjust view</span>
    </div>
    <div class="legend-actions">
      <div><kbd>V</kbd><span>Change view</span></div>
      <div><kbd>E</kbd><span>Talk</span></div>
      <div><kbd>F</kbd><span>Interact</span></div>
      <div><kbd>R</kbd><span>Attack</span></div>
    </div>
  `;
}

const settingsMenu = document.createElement('div');
settingsMenu.className = 'settings-menu';
settingsMenu.innerHTML = `
  <button class="settings-toggle" type="button" aria-expanded="false" aria-controls="settings-panel" title="Open settings">
    <span class="settings-toggle-icon" aria-hidden="true">☰</span>
    <span class="settings-toggle-label">Settings</span>
  </button>
  <div class="settings-panel" id="settings-panel">
    <label class="settings-control">
      <span>Music volume</span>
      <div class="settings-range">
        <input class="music-volume-input" type="range" min="0" max="1" step="0.01" value="${worldSettings.musicVolume}">
        <output class="music-volume-value">${Math.round(worldSettings.musicVolume * 100)}%</output>
      </div>
    </label>
    <label class="settings-control">
      <span>SFX volume</span>
      <div class="settings-range">
        <input class="sfx-volume-input" type="range" min="0" max="1" step="0.01" value="${worldSettings.sfxVolume}">
        <output class="sfx-volume-value">${Math.round(worldSettings.sfxVolume * 100)}%</output>
      </div>
    </label>
    <label class="settings-control">
      <span>Ambient brightness</span>
      <div class="settings-range">
        <input class="ambient-brightness-input" type="range" min="0.25" max="1.4" step="0.01" value="${worldSettings.ambientBrightness}">
        <output class="ambient-brightness-value">${Math.round(worldSettings.ambientBrightness * 100)}%</output>
      </div>
    </label>
    <label class="day-night-control">
      <span>Day / Night</span>
      <input class="day-night-input" type="checkbox">
      <span class="day-night-switch" aria-hidden="true">
        <span class="day-night-icon day-icon">☀</span>
        <span class="day-night-icon night-icon">☾</span>
      </span>
    </label>
    <div class="settings-controls-legend" aria-label="Game controls">
      <span class="settings-section-title">Controls</span>
      ${createControlsLegendMarkup()}
    </div>
  </div>
`;
document.body.appendChild(settingsMenu);

const settingsToggle = settingsMenu.querySelector('.settings-toggle');
const musicVolumeInput = settingsMenu.querySelector('.music-volume-input');
const musicVolumeValue = settingsMenu.querySelector('.music-volume-value');
const sfxVolumeInput = settingsMenu.querySelector('.sfx-volume-input');
const sfxVolumeValue = settingsMenu.querySelector('.sfx-volume-value');
const ambientBrightnessInput = settingsMenu.querySelector('.ambient-brightness-input');
const ambientBrightnessValue = settingsMenu.querySelector('.ambient-brightness-value');
const dayNightInput = settingsMenu.querySelector('.day-night-input');

settingsToggle.addEventListener('click', () => {
  const isOpen = settingsMenu.classList.toggle('is-open');
  settingsToggle.setAttribute('aria-expanded', String(isOpen));
  settingsToggle.title = isOpen ? 'Close settings' : 'Open settings';
});

settingsMenu.addEventListener('keydown', (event) => {
  event.stopPropagation();
});

musicVolumeInput.addEventListener('input', () => {
  worldSettings.musicVolume = Number(musicVolumeInput.value);
  musicVolumeValue.textContent = `${Math.round(worldSettings.musicVolume * 100)}%`;
  backgroundMusic.setVolume(worldSettings.musicVolume);
});

sfxVolumeInput.addEventListener('input', () => {
  worldSettings.sfxVolume = Number(sfxVolumeInput.value);
  sfxVolumeValue.textContent = `${Math.round(worldSettings.sfxVolume * 100)}%`;
  setRainVolume(worldSettings.sfxVolume);
});

ambientBrightnessInput.addEventListener('input', () => {
  worldSettings.ambientBrightness = Number(ambientBrightnessInput.value);
  ambientBrightnessValue.textContent = `${Math.round(worldSettings.ambientBrightness * 100)}%`;
});

dayNightInput.addEventListener('change', () => {
  worldSettings.isNight = dayNightInput.checked;
});

const controlsLegend = document.createElement('div');
controlsLegend.className = 'controls-legend'; 
controlsLegend.innerHTML = createControlsLegendMarkup();
document.body.appendChild(controlsLegend);

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

const heroNameOverlay = document.createElement('div');
heroNameOverlay.className = 'hero-name-overlay';
heroNameOverlay.innerHTML = `
  <form class="hero-name-panel" aria-labelledby="hero-name-title">
    <p class="hero-name-kicker">Before the journey begins</p>
    <h1 id="hero-name-title">What should the island call you?</h1>
    <label for="hero-name-input">Hero name</label>
    <input id="hero-name-input" name="heroName" type="text" maxlength="20" autocomplete="nickname" required>
    <button type="submit">Continue</button>
  </form>
`;
document.body.appendChild(heroNameOverlay);

let selectedDifficulty = 'medium';
let isChoosingDifficulty = true;
let isIntroActive = true;
let dragonPuzzle = null;
let isDragonPuzzleActive = false;
let dragonDirectHits = 0;
let finalPuzzleStarted = false;
let dragonCombat = null;
const combatRespawnPosition = new THREE.Vector3();
let hasCombatRespawnPosition = false;

let gameplayModelsPromise = null;
let worldTwoModelsPromise = null;
let finaleModelsPromise = null;
let gameplayModelsLoaded = false;
let worldTwoModelsLoaded = false;
let finaleModelsLoaded = false;

const DIRECT_HITS_BEFORE_FINAL_PUZZLE = 3;
const DRAGON_HIT_DAMAGE = 25;

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
    dragonCombat?.launchPlayerMagic(playerData.group);
    return;
  }

  startDragonPuzzle();
}

function handleMagicHit() {
  if (isPlayerDead || dragonDirectHits >= DIRECT_HITS_BEFORE_FINAL_PUZZLE) return;

  dragonDirectHits += 1;
  damageDragon(DRAGON_HIT_DAMAGE);
  console.log(`Your spell hit the dragon! Hit ${dragonDirectHits}/${DIRECT_HITS_BEFORE_FINAL_PUZZLE}`);

  if (dragonDirectHits === DIRECT_HITS_BEFORE_FINAL_PUZZLE) {
    dragonPrompt.textContent = 'Press R to give the last hit to the dragon!';
  }
}

function handlePlayerHit() {
  if (isPlayerDead) return;

  playerHealth = Math.max(0, playerHealth - 25);
  setHealthHudValue(playerHealthHud, playerHealth);

  if (playerHealth === 0) {
    isPlayerDead = true;
    deathOverlay.classList.add('is-visible');
    dragonPrompt.classList.remove('is-visible');
  }
}

function respawnDragonFight() {
  playerHealth = 100;
  isPlayerDead = false;
  dragonDirectHits = 0;
  finalPuzzleStarted = false;
  dragonPrompt.textContent = 'Press R to cast a spell at the dragon!';
  resetDragon();
  dragonCombat?.reset();

  if (hasCombatRespawnPosition) {
    playerData.group.position.copy(combatRespawnPosition);
  }

  setHealthHudValue(playerHealthHud, playerHealth);
  setHealthHudValue(dragonHealthHud, getDragonHealth());
  deathOverlay.classList.remove('is-visible');
}

deathOverlay.querySelector('.respawn-button').addEventListener('click', respawnDragonFight);

introOverlay.querySelector('.intro-start-button').addEventListener('click', () => {
  introOverlay.classList.remove('is-visible');
  heroNameOverlay.classList.add('is-visible');
  window.setTimeout(() => heroNameOverlay.querySelector('input').focus(), 0);
});

heroNameOverlay.querySelector('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = heroNameOverlay.querySelector('input');
  const heroName = input.value.trim() || 'Hero';

  playerHealthHud.querySelector('.health-label span').textContent = heroName.toUpperCase();
  setMageHeroName(heroName);
  setShifuHeroName(heroName);
  isIntroActive = false;
  heroNameOverlay.classList.remove('is-visible');
  difficultyOverlay.classList.add('is-visible');
});

difficultyOverlay.querySelectorAll('[data-difficulty]').forEach((button) => {
  button.addEventListener('click', async () => { 
    selectedDifficulty = button.dataset.difficulty;
    setFinaleDifficulty(selectedDifficulty);
    isChoosingDifficulty = false;
    difficultyOverlay.classList.remove('is-visible');

    controlsLegend.classList.add('is-visible');
    
    setTimeout(() => {
      controlsLegend.classList.remove('is-visible');
    }, 4000); 

    hasUserInteracted = true; 
    if (listener.context.state === 'suspended') {
      await listener.context.resume();
    }
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
  if (isIntroActive || isChoosingDifficulty || isDragonPuzzleActive || isPlayerDead || isFinaleInputLocked()) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === 'f') {
    if (!isGemDelivered()) return; 
    
    ensureWorldTwoModelsLoaded();
    tryStartCarpetTravel(carpetTravel);
  }

  if (key === 'v') {
    manualFirstPerson = !manualFirstPerson;
    setFirstPersonMode(manualFirstPerson);
    console.log('Manual view changed. First person:', manualFirstPerson);
  }

  if (key === 'r') {
    if (isInsideCastle && isBookDelivered() && !isDragonDefeated()) {
      attackDragon();
    }
  }

  if (key === 't') {
    const tower = getActiveTower();
    if (!isTowerFallActive() && startTowerFall(tower)) {
      console.log('Tower physics fall started');
    }
  }
});

window.addEventListener('keyup', () => {
  window.currentInteractionKey = null;
});

const playerData = createPlayer(scene);

const playerController = createPlayerController(
  playerData,
  camera,
  modelColliders
);

dragonCombat = createDragonCombat(scene, {
  getDragon: getDragonObject,
  onMagicHit: handleMagicHit,
  onPlayerHit: handlePlayerHit
});

if (towerSpawnMode) {
  playerData.group.position.copy(towerSpawnPosition);
  ensureWorldTwoModelsLoaded();
}

const introModelsPromise = loadIntroModels(scene).then(() => {
  createIslandVegetation(scene, {
    island,
    obstacleBounds: modelBounds,
    colliderTargets: modelColliders
  });
});

Promise.all([
  introModelsPromise,
  ensureGameplayModelsLoaded(),
  ensureWorldTwoModelsLoaded(),
  ensureFinaleModelsLoaded()
]).then(() => {
  worldGroupsReady = true;
  finishWorldLoading();
});

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

function applyWorldSettings() {
  const timeOfDayDarkness = worldSettings.isNight ? 1 : 0;
  const skyDarkness = timeOfDayDarkness;
  const brightness = worldSettings.ambientBrightness;
  // Night always uses the same fully-dark lighting that was previously reached
  // only after rebuilding the bridge. Weather no longer changes time of day.
  const stormLightProgress = worldSettings.isNight ? 1 : 0;
  const nightLightFactor = worldSettings.isNight ? 0.22 : 1;
  const nightAmbientFactor = worldSettings.isNight ? 0.5 : 1;
  const weatherLightFactor = 1.0 - stormLightProgress;

  lights.sunLight.intensity = 1.0 * weatherLightFactor * brightness * nightLightFactor;
  lights.sunLight.color.copy(worldSettings.isNight ? nightSunColor : daySunColor);
  lights.sunLight.castShadow = stormLightProgress <= 0.5 && !worldSettings.isNight;
  lights.ambientLight.intensity = 0.4 * (1.0 - stormLightProgress * 0.95) * brightness * nightAmbientFactor;

  scene.environmentIntensity = weatherLightFactor * brightness * (worldSettings.isNight ? 0.42 : 1);
  scene.background = daySkyColor.clone().lerp(nightSkyColor, skyDarkness);
  setRainAppearance(worldSettings.isNight);

  if (scene.backgroundBlurriness !== undefined) {
    scene.backgroundIntensity = Math.max(0.12, weatherLightFactor * brightness * (worldSettings.isNight ? 0.32 : 1));
  }
}

function getLampActivationProgress() {
  return worldSettings.isNight ? Math.max(globalStormProgress, 1) : 0;
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const time = performance.now() * 0.001;

  if (isIntroActive) {
    updateIntroCamera(time);
    if (gameplayModelsLoaded) {
      updateModels(deltaTime, playerData.group);
    }
    applyWorldSettings();
    updateLampPosts(getLampActivationProgress(), playerData.group);
    renderer.render(scene, camera);
    return;
  }

  updateCarpetTravel(deltaTime, playerData.group, carpetTravel);
  updatePhysicsWorld(deltaTime);

  const isFalling = updateTowerFall(
    deltaTime,
    playerData.group,
    playerData.group.position.y > 20 && !carpetTravel.isTraveling,
    carpetTravel.isTraveling ? null : island.islandTop
  );
  
  const canControlPlayer =
    !carpetTravel.isTraveling &&
    !isFalling &&
    !isChoosingDifficulty &&
    !isDragonPuzzleActive &&
    !isPlayerDead &&
    !isFinaleInputLocked();
    
  playerController.update(deltaTime, canControlPlayer);

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

  const shouldBeInFirstPerson = isTalkingToMage || isTalkingToShifu || isTalkingToFinale;

  if (shouldBeInFirstPerson) {
    setFirstPersonMode(true);
  } else {
    setFirstPersonMode(manualFirstPerson);
  }

  if (debugMode) {
    const pos = playerData.group.position;
    playerCoords.textContent = `X: ${pos.x.toFixed(2)}  Y: ${pos.y.toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  }

  if (worldTwoModelsLoaded) {
    updateWoodTask(deltaTime, playerData.group);
    updateBridgeTask(deltaTime, playerData.group);
    updatePortalTeleport(playerData.group, () => {
      ensureFinaleModelsLoaded().then(() => {
        startFinale();
      });
    });
  }

  if (finaleModelsLoaded) {
    updateDonkey(deltaTime, playerData.group);
  }

  if (shifuThanksTriggered && !finaleWeatherCleared) {
    rainUpdateAccumulator += deltaTime;
    if (rainUpdateAccumulator >= rainUpdateInterval) {
      updateRain(rainUpdateAccumulator, playerData.group);
      rainUpdateAccumulator = 0;
    }
    updateStorm(deltaTime, scene);

    globalStormProgress = Math.min(1.0, globalStormProgress + deltaTime * 0.2); 
  }

  updateLampPosts(getLampActivationProgress(), playerData.group);

  applyWorldSettings();

  if (isGemDelivered()) {
    if (carpetTravel && carpetTravel.mesh) carpetTravel.mesh.visible = true;
    if (carpetTravel && carpetTravel.group) carpetTravel.group.visible = true;
  }

  if (isBookDelivered() && !isDragonDefeated() && !isDragonPuzzleActive && !isChoosingDifficulty) {
    if (castleTriggerBox.containsPoint(playerData.group.position)) {
      if (!isInsideCastle) {
        combatRespawnPosition.copy(playerData.group.position);
        hasCombatRespawnPosition = true;
      }
      isInsideCastle = true;
      if (!isPlayerDead && !dragonPrompt.classList.contains('is-visible')) {
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

  const dragonFightActive = isInsideCastle && !isPlayerDead && !isDragonPuzzleActive && !isDragonDefeated();
  dragonCombat.setActive(dragonFightActive);
  dragonCombat.update(deltaTime, playerData.group);

  updateCombatHud();

  renderer.render(scene, camera);

  if (isBridgeBuilt() && !shifuThanksTriggered && !finaleWeatherCleared ){
    shifuThanksTriggered = true;
    startShifuBridgeThanks();
    startStorm(scene);
  }
}

animate();
