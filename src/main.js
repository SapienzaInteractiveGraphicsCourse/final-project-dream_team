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
import { createPlayer } from './player/schoolBoyPlayer.js';
import { createPlayerController } from './controls/playerControls.js';
import { loadModels, updateModels, modelColliders } from './imported_models/models.js';
import { updateBook, isBookDelivered } from './imported_models/book.js';
import { isGemDelivered } from './imported_models/gem.js';
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

createLights(scene);
createIsland(scene, materials);
const cloud1 = createCloud(scene, 7, 15, 11, 1.2);
const cloud2 = createCloud(scene, 7, 10, -15, 1.0);
const cloud3 = createCloud(scene, 10, 8, -5, 1.1);
const cloud4 = createCloud(scene, 16, 10, -20, 0.9);
const cloud5 = createCloud(scene, 15, 6.5, 8, 1.4);

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

let isInsideCastle = false;
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'f') {
    if (!isGemDelivered()) {
      return; 
    }
    tryStartCarpetTravel(carpetTravel);
  }

  if (event.key.toLowerCase() === 'r') {
    if (isInsideCastle && isBookDelivered() && !isDragonDefeated()) {
      damageDragon(25);
      console.log("You hit the dragon with magic!");
      
      if (isDragonDefeated()) {
        dragonPrompt.classList.remove('is-visible');
        isInsideCastle = false;
        dragonVictoryBanner.classList.add('is-visible');
        
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

loadModels(scene);
loadShifuTask(scene);
loadWoodTask(scene);
loadBridgeTask(scene);

// --------------------------------------------------
// 18. ANIMATION LOOP
// --------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  updateCarpetTravel(deltaTime, playerData.group, carpetTravel);
  playerController.update(deltaTime, !carpetTravel.isTraveling);

  updateModels(deltaTime, playerData.group);
  updateBook(deltaTime, playerData.group);
  updateShifuTask(deltaTime, playerData.group);
  updateWoodTask(deltaTime, playerData.group);
  updateBridgeTask(deltaTime, playerData.group);

  if (isGemDelivered()) {
    if (carpetTravel && carpetTravel.mesh) carpetTravel.mesh.visible = true;
    if (carpetTravel && carpetTravel.group) carpetTravel.group.visible = true;
  }

  // --- CASTLE ZONE CHECK ---
  if (isBookDelivered() && !isDragonDefeated()) {
    const castleTriggerBox = new THREE.Box3(
      new THREE.Vector3(0, -5, -75),
      new THREE.Vector3(50, 20, -25)
    );

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

  cloud1.position.x += 0.002;
  cloud2.position.x -= 0.0015;
  cloud3.position.z += 0.001;
  cloud4.position.z -= 0.001;
  cloud5.position.x += 0.001;

  renderer.render(scene, camera);
}
animate();