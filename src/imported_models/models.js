import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {
  isBookDelivered,
  isCarryingBook,
  registerBook,
  registerBookDeliveryTarget
} from './book.js';
import { registerDemonDragon, updateDemonDragon } from './dragon.js';

export const modelColliders = [];

const gltfLoader = new GLTFLoader();
let mage = null;
let mageStartY = 0;
let canTalkToMage = false;
let mageIsTalking = false;
let mageTalkTimer = 0;
let mageMaterials = [];

const mageTintColor = new THREE.Color(0xd9eeff);
const mageEmissiveColor = new THREE.Color(0x2a4a66);
const mageBaseBrightness = 0.12;
const demonTintColor = new THREE.Color(0xffc2a0);
const demonEmissiveColor = new THREE.Color(0x3a160c);

const mageDialogue = document.createElement('div');
mageDialogue.className = 'mage-dialogue';
mageDialogue.textContent = 'Premi E per parlare con il mago';
document.body.appendChild(mageDialogue);

function brightenMageMaterial(material) {
  if (!material) return;

  if (material.map) {
    material.map.colorSpace = THREE.SRGBColorSpace;
    material.map.needsUpdate = true;
  }

  if (material.color) {
    material.color.lerp(mageTintColor, 0.18);
    material.color.multiplyScalar(1.08);
  }

  if (material.emissive) {
    material.emissive.copy(mageEmissiveColor);
    material.emissiveIntensity = mageBaseBrightness;

    if ('emissiveMap' in material && material.map) {
      material.emissiveMap = material.map;
    }
  }

  if ('roughness' in material) {
    material.roughness = Math.min(material.roughness ?? 0.7, 0.65);
  }

  material.needsUpdate = true;
}

function brightenDemonMaterial(material) {
  if (!material) return;

  if (material.map) {
    material.map.colorSpace = THREE.SRGBColorSpace;
    material.map.needsUpdate = true;
  }

  if (material.color) {
    material.color.lerp(demonTintColor, 0.16);
    material.color.multiplyScalar(1.28);
  }

  if (material.emissive) {
    material.emissive.copy(demonEmissiveColor);
    material.emissiveIntensity = 0.16;

    if ('emissiveMap' in material && material.map) {
      material.emissiveMap = material.map;
    }
  }

  if ('roughness' in material) {
    material.roughness = Math.min(material.roughness ?? 0.7, 0.58);
  }

  material.needsUpdate = true;
}

function setMageBrightness(strength) {
  mageMaterials.forEach((material) => {
    if (material.emissive) {
      material.emissive.copy(mageEmissiveColor);
      material.emissiveIntensity = mageBaseBrightness + strength;
    }
  });
}

function loadModel(scene, path, options = {}) {
  gltfLoader.load(
    path,

    (gltf) => {
      const model = gltf.scene;
      if (path.includes('skeleton-mage')) {
        mage = model;
        mageMaterials = [];
      }

      const x = options.x ?? 0;
      const y = options.y ?? 0;
      const z = options.z ?? 0;

      const scale = options.scale ?? 1;
      const rotationY = options.rotationY ?? 0;

      model.position.set(x, y, z);
      model.scale.set(scale, scale, scale);
      model.rotation.y = rotationY;

      if (!options.floating) {
        const groundY = options.groundY ?? 0.49;
        const box = new THREE.Box3().setFromObject(model);
        const modelBottomY = box.min.y;

        model.position.y += groundY - modelBottomY;
      }

      model.position.y += options.offsetY ?? 0;

      if (model === mage) {
        mageStartY = model.position.y;
        registerBookDeliveryTarget(model);
      }

      if (path.includes('EvilBook')) {
        registerBook(model);
      }

      if (path.includes('demon')) {
        registerDemonDragon(model);
      }

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (model === mage) {
            child.material = Array.isArray(child.material)
              ? child.material.map((material) => material.clone())
              : child.material.clone();

            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach(brightenMageMaterial);
            mageMaterials.push(...materials);
          }

          if (path.includes('demon') || path.includes('dragon_flying')) {
            child.material = Array.isArray(child.material)
              ? child.material.map((material) => material.clone())
              : child.material.clone();

            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach(brightenDemonMaterial);
          }
        }
      });

      scene.add(model);

      if (options.collider) {
        const box = new THREE.Box3().setFromObject(model);
        modelColliders.push(box);
      }

      console.log(`Loaded model: ${path}`);
    },

    (xhr) => {
      console.log(`${path}: ${(xhr.loaded / xhr.total) * 100}% loaded`);
    },

    (error) => {
      console.error(`Error loading model: ${path}`, error);
    }
  );
}

export const modelsToLoad = [
  {
    path: '/models/demon.glb',
    x: 0,
    y: 5,
    z: -30,
    scale: 5,
    rotationY: 0,
    floating: true,
    collider: false
  },
  {
    path: '/models/ElevenTower.glb',
    x: -5,
    y: 0,
    z: -20,
    scale: 1.5,
    rotationY: -2 ,
    groundY: 0.49,
    offsetY: -0.5,
    collider: true
  },
  {
    path: '/models/EvilBook.glb',
    x: -2,
    y: 0,
    z: -20,
    scale: 1,
    rotationY: Math.PI,
    groundY: 0.49,
    collider: false
  },
  {
    path: '/models/FantasyHouse.glb',
    x: 15,
    y: 0.45,
    z: -15,
    scale: 1.2,
    rotationY: Math.PI / 2,
    groundY: 0.49,
    collider: true
  },
  {
    path: '/models/FantasyInn.glb',
    x: -9
    ,
    y: 0.45,
    z: -8,
    scale: 3,
    rotationY: Math.PI / 2,
    groundY: 0.49,
    collider: true
  },
  {
    path: '/models/FantasyStable.glb',
    x: 8,
    y: 0.45,
    z: -15,
    scale: 4,
    rotationY: Math.PI / 2,
    groundY: 0.49,
    collider: true
  },
  {
    path: '/models/RedDragon.glb',
    x: 5,
    y: 5,
    z: 20,
    scale: 1.2,
    rotationY: -0.3,
    floating: true,
    collider: true
  },
  // {
  //   path: '/models/FantasyCastlePrototype.glb',
  //   x: 26,
  //   y: 0,
  //   z: -18,
  //   scale: 0.4,
  //   rotationY: 0,
  //   groundY: 0.49,
  //   collider: true
  // },
  {
    path: '/models/pixellabs-cute-skeleton-mage-character-2439.glb',
    x: 2,
    y: 0,
    z: -9,
    scale: 3,
    rotationY: Math.PI / 4,
    groundY: 0.49,
    collider: true
  },
  {
    path: '/models/flowers_lib.glb',
    x: -7,
    y: 0,
    z: -1,
    scale: 0.75,
    rotationY: 0.3,
    floating: true,
    collider: true
  },
  {
    path: '/models/dragon_flying.glb',
    x: 0,
    y: 9,
    z: -20,
    scale: 5,
    rotationY: Math.PI / 4,
    floating: true,
    collider: false
  }
];

export function loadModels(scene) {
  modelsToLoad.forEach((item) => {
    loadModel(scene, item.path, item);
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'e' && canTalkToMage) {
    mageIsTalking = true;
    mageTalkTimer = 4;
  }
});

export function updateModels(deltaTime, player) {
  updateDemonDragon(deltaTime);

  if (!mage) return;

  const time = performance.now() * 0.001;

  mage.position.y = mageStartY + Math.sin(time * 2) * 0.12;
  mage.rotation.y += Math.sin(time * 3) * 0.002;

  const distance = mage.position.distanceTo(player.position);
  const interactionDistance = 4;

  canTalkToMage = distance < interactionDistance;

  if (canTalkToMage) {
    mage.lookAt(player.position.x, player.position.y, player.position.z);
  }

  if (mageIsTalking) {
    mageTalkTimer -= deltaTime;

    if (mageTalkTimer <= 0) {
      mageIsTalking = false;
    }
  }

  if (mageIsTalking) {
    mageDialogue.textContent =
      'Mago: Finalmente sei arrivato. La magia dell isola ti stava aspettando.';
    mageDialogue.classList.add('is-visible');
  } else if (canTalkToMage && isBookDelivered()) {
    mageDialogue.textContent =
      'Mago: Ottimo. Questo libro contiene la magia che cercavo.';
    mageDialogue.classList.add('is-visible');
  } else if (canTalkToMage && isCarryingBook()) {
    mageDialogue.classList.remove('is-visible');
  } else if (canTalkToMage) {
    mageDialogue.textContent = 'Premi E per parlare con il mago';
    mageDialogue.classList.add('is-visible');
  } else {
    mageDialogue.classList.remove('is-visible');
  }

  if (canTalkToMage) {
    mage.lookAt(player.position.x, player.position.y, player.position.z);

    if (mageIsTalking) {
      setMageBrightness(0.1);
    } else {
      setMageBrightness(0.04);
    }
  } else {
    setMageBrightness(0);
  }
}
