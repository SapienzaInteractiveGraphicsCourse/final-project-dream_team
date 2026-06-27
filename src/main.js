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
import {createLights} from './base/lights.js'
import { materials } from './world/materials.js';
import { createIsland } from './world/island.js';
import { createPlayer } from './player/schoolBoyPlayer.js';
import { createPlayerController} from './controls/playerControls.js'
import { loadModels, updateModels, modelColliders } from './imported_models/models.js';
import { updateBook, isBookDelivered } from './imported_models/book.js';
import { createCloud } from './world/cloud.js';
import {
  createCarpetTravel,
  updateCarpetTravel,
  tryStartCarpetTravel
} from './world/carpetTravel.js';


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

const playerData = createPlayer(scene);

const playerController = createPlayerController(
  playerData,
  camera,
  modelColliders
);

loadModels(scene);







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

  // --- AGGIUNGI QUESTO CONTROLLO DELLA ZONA CASTELLO QUI ---
  if (isBookDelivered() && !isDragonDefeated()) {
    // Definiamo la Trigger Box intorno al castello (Centro X:25, Z:-50)
    const castleTriggerBox = new THREE.Box3(
      new THREE.Vector3(0, -5, -75),  // Angolo minimo
      new THREE.Vector3(50, 20, -25)  // Angolo massimo
    );

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

  cloud1.position.x += 0.002;
  cloud2.position.x -= 0.0015;
  cloud3.position.z += 0.001;
  cloud4.position.z -= 0.001;
  cloud5.position.x += 0.001;

  renderer.render(scene, camera);

}
animate();
