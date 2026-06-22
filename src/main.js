import './style.css';
import * as THREE from 'three';
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  createScene,
  createCamera,
  createRenderer,
  setupResize
} from './base/sceneSetup.js';

import {createLights} from './base/lights.js'
import { materials } from './world/materials.js';
import { createPlayer } from './player/player.js';
import { createIsland } from './world/island.js';
import { createPlayerController} from './controls/playerControls.js'
import { loadModels } from './imported_models/models.js';
// --------------------------------------------------
// 1. CANVAS
// --------------------------------------------------

const canvas = document.querySelector('#bg');

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer(canvas);

setupResize(camera, renderer);


const clock = new THREE.Clock();
// --------------------------------------------------
// CAMERA CONTROLS
// --------------------------------------------------

// OrbitControls permette di muovere la camera con il mouse
/*const controls = new OrbitControls(camera, renderer.domElement);

// Punto attorno a cui la camera ruota
controls.target.set(0, 1.2, 0);

// Movimento più morbido
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Limiti utili per non andare troppo lontano o troppo vicino
controls.minDistance = 2;
controls.maxDistance = 20;

// Evita di finire sotto il pavimento
controls.maxPolarAngle = Math.PI / 2.1;

controls.update();
*/

// --------------------------------------------------
// 5. LIGHTS
// --------------------------------------------------

// Luce ambiente: illumina leggermente tutto.
// Non genera ombre, serve solo per non avere parti completamente nere.

createLights(scene);
createIsland(scene, materials);

// --------------------------------------------------
// 9. SENTIERI
// --------------------------------------------------

const playerData = createPlayer(scene, materials);

const playerController = createPlayerController(
  playerData.group,
  playerData.parts,
  camera
);

loadModels(scene);
// --------------------------------------------------
// 10. CLOUDS
// --------------------------------------------------

function createCloud(x, y, z, scale = 1) {
  const cloudGroup = new THREE.Group();

  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1
  });

  const sphere1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 24, 24),
    cloudMaterial
  );

  const sphere2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 24, 24),
    cloudMaterial
  );

  const sphere3 = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 24, 24),
    cloudMaterial
  );

  const sphere4 = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 24, 24),
    cloudMaterial
  );

  sphere1.position.set(-0.9, 0, 0);
  sphere2.position.set(0, 0.25, 0);
  sphere3.position.set(0.9, 0, 0);
  sphere4.position.set(0.2, -0.15, 0.4);

  cloudGroup.add(sphere1);
  cloudGroup.add(sphere2);
  cloudGroup.add(sphere3);
  cloudGroup.add(sphere4);

  cloudGroup.position.set(x, y, z);
  cloudGroup.scale.set(scale, scale, scale);

  scene.add(cloudGroup);

  return cloudGroup;
}

const cloud1 = createCloud(-7, 5, -4, 1.2);
const cloud2 = createCloud(7, 3, -5, 1.0);
const cloud3 = createCloud(5, 4, 5, 1.1);
const cloud4 = createCloud(-6, 6, 5, 0.9);
const cloud5 = createCloud(0, 6.5, 8, 1.4);





// --------------------------------------------------
// 18. ANIMATION LOOP
// --------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  playerController.update(deltaTime);

  cloud1.position.x += 0.002;
  cloud2.position.x -= 0.0015;
  cloud3.position.z += 0.001;
  cloud4.position.z -= 0.001;
  cloud5.position.x += 0.001;

  renderer.render(scene, camera);
}
animate();