import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { isShifuTaskStarted } from './shifu.js';
import { modelColliders } from './models.js';

const gltfLoader = new GLTFLoader();

let axe = null;
let wood = null;
let axeStartY = 0;
let axeCollider = null;
let axeLight = null;

let canTakeAxe = false;
let hasAxe = false;

let canCollectWood = false;
let hasWood = false;
let woodTaskComplete = false;

const axePosition = new THREE.Vector3(238.21, 30, -260.24);
const axeBaseRotationY = Math.PI / 2;
const woodPosition = new THREE.Vector3(240, 29.4, -263);
const woodGroundScale = new THREE.Vector3(0.02, 0.02, 0.02);
const woodCarryScale = new THREE.Vector3(0.012, 0.012, 0.012);
const woodCarryOffset = new THREE.Vector3(0.6, 3, 0.35);
const woodCarryTarget = new THREE.Vector3();

const woodTaskPrompt = document.createElement('div');
woodTaskPrompt.className = 'interaction-dialogue';
document.body.appendChild(woodTaskPrompt);

function removeAxeCollider() {
  if (!axeCollider) return;

  const index = modelColliders.indexOf(axeCollider);

  if (index !== -1) {
    modelColliders.splice(index, 1);
  }

  axeCollider = null;
}

function updateAxeAnimation() {
  if (!axe || hasAxe || !axe.visible) {
    if (axeLight) {
      axeLight.visible = false;
    }
    return;
  }

  const time = performance.now() * 0.001;
  axe.position.y = axeStartY + Math.sin(time * 2.2) * 0.22;
  axe.rotation.y = axeBaseRotationY;
  axe.rotation.z = Math.sin(time * 2.6) * 0.06;

  if (axeLight) {
    axeLight.visible = true;
    axeLight.position.copy(axe.position);
    axeLight.position.y += 2.2 + Math.sin(time * 3) * 0.18;
    axeLight.intensity = 4.2 + Math.sin(time * 4) * 0.7;
  }
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f') return;

	  if (canTakeAxe) {
	    hasAxe = true;
	    axe.visible = false;
      if (axeLight) {
        axeLight.visible = false;
      }
	    removeAxeCollider();
	    if (wood) {
      wood.visible = true;
    }
    canTakeAxe = false;
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  if (canCollectWood) {
    hasWood = true;
    canCollectWood = false;
    woodTaskPrompt.classList.remove('is-visible');
  }
});

export function loadWoodTask(scene) {
  gltfLoader.load('/models/medieval_axe.glb', (gltf) => {
    axe = gltf.scene;

    axe.position.copy(axePosition);
    axe.scale.set(0.04, 0.04, 0.04);
	    axe.rotation.y = axeBaseRotationY;
	    axeStartY = axe.position.y;

      axeLight = new THREE.PointLight(0xfff0b5, 4.2, 9, 1.6);
      axeLight.position.copy(axe.position);
      axeLight.position.y += 2.2;
      scene.add(axeLight);

	    axeCollider = new THREE.Box3().setFromCenterAndSize(
      axePosition,
      new THREE.Vector3(1.6, 2.2, 1.6)
    );
    modelColliders.push(axeCollider);

    scene.add(axe);
  });

  const mtlLoader = new MTLLoader();
  mtlLoader.setPath('/models/');
  mtlLoader.setResourcePath('/');

  mtlLoader.load('12303_Firewood_Stack_v1_l3.mtl', (materials) => {
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath('/models/');

  objLoader.load('12303_Firewood_Stack_v1_l3.obj', (object) => {
    wood = object;

    wood.position.copy(woodPosition);
    wood.scale.copy(woodGroundScale);
    wood.rotation.x = Math.PI / 2;
    wood.rotation.y = Math.PI ;
    wood.visible = false;

    wood.traverse((child) => {
      if (child.isMesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((material) => {
          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace;
            material.map.needsUpdate = true;
          }

          material.needsUpdate = true;
        });
      }
    });

    scene.add(wood);
  });
});
}
export function updateWoodTask(deltaTime, player) {
  updateAxeAnimation();

  if (woodTaskComplete) {
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  if (!isShifuTaskStarted()) {
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  if (!axe || !wood) return;

  if (hasWood) {
    woodCarryTarget.copy(player.position).add(woodCarryOffset);
    wood.position.lerp(woodCarryTarget, Math.min(deltaTime * 8, 1));
    wood.scale.lerp(woodCarryScale, Math.min(deltaTime * 8, 1));
    wood.rotation.x = Math.PI / 2;
    wood.rotation.y = Math.PI;
    woodTaskPrompt.classList.remove('is-visible');
    return;
  }

  canTakeAxe = !hasAxe && axe.position.distanceTo(player.position) < 3;
  canCollectWood =
    hasAxe && !hasWood && wood.position.distanceTo(player.position) < 4;

  if (canTakeAxe) {
    woodTaskPrompt.textContent = 'Press F to take the axe';
    woodTaskPrompt.classList.add('is-visible');
  } else if (hasAxe && !hasWood && !canCollectWood) {
    woodTaskPrompt.textContent = 'Go to the trees to collect wood';
    woodTaskPrompt.classList.add('is-visible');
  } else if (canCollectWood) {
    woodTaskPrompt.textContent = 'Press F to collect the wood';
    woodTaskPrompt.classList.add('is-visible');
  } else {
    woodTaskPrompt.classList.remove('is-visible');
  }
}

export function isCarryingWood() {
  return hasWood;
}

export function consumeCarriedWood() {
  hasWood = false;
  woodTaskComplete = true;
  canCollectWood = false;

  if (wood) {
    wood.visible = false;
  }

  woodTaskPrompt.classList.remove('is-visible');
}
