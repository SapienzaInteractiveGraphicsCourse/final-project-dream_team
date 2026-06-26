import './style.css';
import * as THREE from 'three';
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createScene,
  createCamera,
  createRenderer,
  setupResize
} from './base/sceneSetup.js';

import {createLights} from './base/lights.js'
import { materials } from './world/materials.js';
import { createIsland } from './world/island.js';
import { createPlayer } from './player/schoolBoyPlayer.js';
import { createPlayerController} from './controls/playerControls.js'
import { loadModels, updateModels, modelColliders } from './imported_models/models.js';
import { updateBook } from './imported_models/book.js';
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

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'f') {
    tryStartCarpetTravel(carpetTravel);
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

  cloud1.position.x += 0.002;
  cloud2.position.x -= 0.0015;
  cloud3.position.z += 0.001;
  cloud4.position.z -= 0.001;
  cloud5.position.x += 0.001;

  renderer.render(scene, camera);

}
animate();
