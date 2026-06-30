import './style.css';
import * as THREE from 'three';
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
import { isGemDelivered } from './imported_models/gem.js'; // <-- 1. IMPORT CORETTO AGGIUNTO!
import { createCloud } from './world/cloud.js';
import {
  createCarpetTravel,
  updateCarpetTravel,
  tryStartCarpetTravel
} from './world/carpetTravel.js';
import { loadShifuTask, updateShifuTask } from './imported_models/shifu.js';
import { loadWoodTask, updateWoodTask } from './imported_models/wood.js';
import { loadBridgeTask, updateBridgeTask } from './imported_models/bridge.js';


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

const carpetTravel = createCarpetTravel(scene);

if (carpetTravel && carpetTravel.mesh) {
  carpetTravel.mesh.visible = false; // Nasconde l'oggetto 3D del tappeto
} else if (carpetTravel && carpetTravel.group) {
  carpetTravel.group.visible = false; // Se usa un gruppo, nasconde il gruppo
}

const carpetPrompt = document.createElement('div');
carpetPrompt.className = 'interaction-dialogue carpet-dialogue';
carpetPrompt.textContent = 'Premi F per viaggiare sul tappeto magico';
document.body.appendChild(carpetPrompt);

const dragonPrompt = document.createElement('div');
dragonPrompt.className = 'interaction-dialogue dragon-dialogue';
dragonPrompt.textContent = 'Premi R per combattere il drago!';
document.body.appendChild(dragonPrompt);

// Sotto il dragonPrompt in main.js
const dragonVictoryBanner = document.createElement('div');
dragonVictoryBanner.className = 'victory-banner'; // Puoi stilizzarlo gigante e dorato in CSS
dragonVictoryBanner.textContent = '⚔️ HAI UCCISO IL DRAGO! ⚔️';
document.body.appendChild(dragonVictoryBanner);

let isInsideCastle = false; // Traccia se siamo nel cortile del castello
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'f') {
    // 2. BLOCCO DI SICUREZZA: Se la gemma non è stata consegnata, il tasto F sul tappeto non fa nulla
    if (!isGemDelivered()) {
      return; 
    }
    tryStartCarpetTravel(carpetTravel);
  }

  if (event.key.toLowerCase() === 'r') {
    if (isInsideCastle && isBookDelivered() && !isDragonDefeated()) {
      damageDragon(25); // Infligge 25 di danno (4 colpi totali)
      console.log("Hai colpito il drago con la magia!");
      
      // Se il drago muore con questo colpo, nascondi subito il prompt
      if (isDragonDefeated()) {
        dragonPrompt.classList.remove('is-visible');
        isInsideCastle = false;
        dragonVictoryBanner.classList.add('is-visible');
        
        // La fa sparire automaticamente dopo 4 secondi
        setTimeout(() => {
          dragonVictoryBanner.classList.remove('is-visible');
        }, 4000);
      }
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

if (debugMode) {
  const axesHelper = new THREE.AxesHelper(100);
  axesHelper.position.set(0, 5, 0);
  scene.add(axesHelper);

  const gridHelper = new THREE.GridHelper(200, 20);
  scene.add(gridHelper);
}

// plotting of coords of the player
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
  new THREE.Vector3(0, -5, -75),
  new THREE.Vector3(50, 20, -25)
);

// --------------------------------------------------
// 18. ANIMATION LOOP
// --------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  updateCarpetTravel(deltaTime, playerData.group, carpetTravel);
  playerController.update(deltaTime, !carpetTravel.isTraveling);

  const pos = playerData.group.position;
  if (debugMode) {
    playerCoords.textContent = `X: ${pos.x.toFixed(2)}  Y: ${pos.y.toFixed(2)}  Z: ${pos.z.toFixed(2)}`;
  }

  updateModels(deltaTime, playerData.group);
  updateBook(deltaTime, playerData.group);
  updateShifuTask(deltaTime, playerData.group);
  updateWoodTask(deltaTime, playerData.group);
  updateBridgeTask(deltaTime, playerData.group);

  // --- 3. CONTROLLO VISIBILITÀ TAPPETO (SPOSTATO FUORI DA ALTRI IF) ---
  if (isGemDelivered()) {
    if (carpetTravel && carpetTravel.mesh) carpetTravel.mesh.visible = true;
    if (carpetTravel && carpetTravel.group) carpetTravel.group.visible = true;
  }

  // --- CONTROLLO DELLA ZONA CASTELLO ---
  if (isBookDelivered() && !isDragonDefeated()) {
    // Se il giocatore entra nel perimetro, mostra il prompt
    if (castleTriggerBox.containsPoint(playerData.group.position)) {
      isInsideCastle = true;
      dragonPrompt.classList.add('is-visible');
    } else {
      isInsideCastle = false;
      dragonPrompt.classList.remove('is-visible');
    }
  } else {
    dragonPrompt.classList.remove('is-visible');
    isInsideCastle = false;
  }

  renderer.render(scene, camera);
}
animate();
