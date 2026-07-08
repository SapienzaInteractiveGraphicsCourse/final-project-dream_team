import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { registerBook, registerBookDeliveryTarget } from './book.js';
import { registerMage, addMageMaterial, updateMage } from './mage.js';
import { registerGem, updateGem } from './gem.js';
import { registerDemonDragon, updateDemonDragon, setDragonOrbitCenter } from './dragon.js';

export const modelColliders = [];
export const modelBounds = [];
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

const demonTintColor = new THREE.Color(0xffc2a0);
const demonEmissiveColor = new THREE.Color(0x3a160c);
let mage = null;
const generalPath = "/models_optimized/";

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

function createLitStoneBuildingMaterial(material) {
  const map = material?.map ?? null;

  if (map) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
  }

  return new THREE.MeshStandardMaterial({
    map,
    color: material?.color?.clone?.() ?? new THREE.Color(0xffffff),
    roughness: 0.9,
    metalness: 0,
    side: material?.side ?? THREE.FrontSide,
    transparent: material?.transparent ?? false,
    opacity: material?.opacity ?? 1,
    alphaTest: material?.alphaTest ?? 0
  });
}

function loadModel(scene, path, options = {}) {
  return new Promise((resolve) => {
    gltfLoader.load(
      path,
      (gltf) => {
      const model = gltf.scene;
      const isMage = path.includes('skeleton-mage') || path.includes('cute-skeleton-mage');
      const isStoneBuilding = path.includes('stone_building');

      // 1. Applichiamo prima le trasformazioni di base (posizione, scala, rotazione)
      const x = options.x ?? 0;
      const y = options.y ?? 0;
      const z = options.z ?? 0;
      const scale = options.scale ?? 1;
      const rotationY = options.rotationY ?? 0;

      model.position.set(x, y, z);
      model.scale.set(scale, scale, scale);
      model.rotation.y = rotationY;

      // 2. Ground logic: compute the correct height from the model base.
      if (!options.floating) {
        const groundY = options.groundY ?? 0.49;
        const box = new THREE.Box3().setFromObject(model);
        const modelBottomY = box.min.y;

        model.position.y += groundY - modelBottomY;
      }

      // Applichiamo l'eventuale offset manuale (se presente nelle opzioni)
      model.position.y += options.offsetY ?? 0;

      // 3. Registration: now that the model is on the ground, pass it to mage.js.
      // In questo modo 'mageStartY' salverà la coordinata Y corretta del terreno!
      if (isMage) {
        mage=model;
        registerMage(model);
        registerBookDeliveryTarget(model);
      }

      if (path.includes('EvilBook')) {
        registerBook(model, scene);
      }

      if (path.includes('demon')) {
        registerDemonDragon(model);
      }

      if (path.includes('Gem')) {
        registerGem(model,scene );
      }

      if (path.includes('castle_03')) {
        const castleBox = new THREE.Box3().setFromObject(model);
        const castleHeight = castleBox.max.y - castleBox.min.y;
        
        // Calcoliamo il centro matematico esatto di TUTTI i muri del castello nel mondo
        const realCastleCenter = new THREE.Vector3();
        castleBox.getCenter(realCastleCenter);
        
        const dragonFlightHeight = 18; 
        
        // Spostiamo l'orbita del drago sul centro reale calcolato
        setDragonOrbitCenter(realCastleCenter.x, dragonFlightHeight, realCastleCenter.z, 45);
      }
      // 4. Gestione dei materiali e delle ombre
      const canCastShadow = options.castShadow ?? (
        isMage ||
        path.includes('demon') ||
        path.includes('EvilBook') ||
        path.includes('Gem') ||
        path.includes('statue')
      );

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = canCastShadow;
          child.receiveShadow = true;

          if (isStoneBuilding) {
            child.material = Array.isArray(child.material)
              ? child.material.map(createLitStoneBuildingMaterial)
              : createLitStoneBuildingMaterial(child.material);
          }

          if (isMage) {
            child.material = Array.isArray(child.material)
              ? child.material.map((material) => material.clone())
              : child.material.clone();

            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach(addMageMaterial);
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

      const box = new THREE.Box3().setFromObject(model);
      modelBounds.push(box);

      if (options.collider) {
        modelColliders.push(box);
      }

      console.log(`Loaded model: ${path}`);
      resolve(model);
      },
      (xhr) => {
        console.log(`${path}: ${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      (error) => {
        console.error(`Error loading model: ${path}`, error);
        resolve(null);
      }
    );
  });
}

export const gameplayModelsToLoad = [
  {
    path: generalPath + 'demon.glb',
    x: 38,
    y: 7,
    z: -27,
    scale: 15,
    rotationY: Math.PI / 3,
    floating: true,
    collider: false
  },
  {
    path: generalPath + 'Gem.glb',
    x: -6,
    y: 1,
    z: -46,
    scale: 0.7,
    floating: true,
    collider: false
  },
  {
    path: generalPath + 'EvilBook.glb',
    x: -10,
    y: 0,
    z: -30,
    scale: 1,
    rotationY: Math.PI,
    groundY: 0.49,
    collider: false
  },
  {
    path: generalPath + 'pixellabs-cute-skeleton-mage-character-2439.glb',
    x: 3,
    y: 0,
    z: 2,
    scale: 3,
    rotationY: Math.PI / 4,
    groundY: 0.49,
    collider: true
  }
];

export const introModelsToLoad = [
  {
    path: generalPath + 'FantasyHouse.glb',
    x: -22,
    y: 0,
    z: 35,
    scale: 5,
    rotationY: Math.PI / 4,
    groundY: 0.49,
    collider: false
  },
  {
    path: generalPath + 'FantasyInn.glb',
    x: -10,
    y: 0,
    z: -5.13,
    scale: 6,
    rotationY: Math.PI / 2.3,
    groundY: 0.49,
    floating: true,
    collider: false
  },
  {
    path: generalPath + 'FantasyStable.glb',
    x: 32,
    y: 0,
    z: -3,
    scale: 6,
    rotationY: -0.05,
    groundY: 0.49,
    floating: true,
    collider: false
  },
  {
    path: generalPath + 'alchemist_fantasy_house.glb',
    x: 60,
    y: 0,
    z: 30,
    scale: 0.05,
    rotationY: 3 * Math.PI / 2,
    groundY: 0.49,
    floating: true,
    collider: true
  },
  {
    path: generalPath + 'stone_building.glb',
    x: -42,
    y: -0.1,
    z: 68,
    scale: 40,
    rotationY: 3*Math.PI/4,
    floating: true,
    collider: false
  },
  {
    path: generalPath + 'fantasy_house_low_poly.glb',
    x: 70,
    y: -0.1,
    z: 90,
    scale: 1,
    rotationY: 3*Math.PI/4,
    floating: true,
    collider: false
  },
  {
    path: generalPath + 'flowers_lib.glb',
    x: -4,
    y: 0,
    z: 10,
    scale: 0.75,
    rotationY: 0.3,
    floating: true,
    collider: true
  },
  {
    path: generalPath + 'castle_03.glb',
    x: -40,
    y: 0,
    z: -80,
    scale: 5,
    offsetY: -0.5,
    rotationY: Math.PI / 4,
    collider: false
  },
  {
    path: generalPath + 'statue.glb',
    x: 11.29,
    y: 0,
    z: -30.32,
    scale: 2,
    offsetY: -0.5,
    rotationY: -3 * Math.PI / 4,
    collider: true
  },

  /** ISLANDS */
  {
    path: generalPath + 'floating_island.glb',
    x: -300,
    y: -2,
    z: -1,
    scale: 10,
    rotationY: 0.3,
    floating: true,
    collider: true
  },
  {
    path: generalPath + 'floating_island2.glb',
    x: 300,
    y: -2,
    z: -1,
    scale: 1,
    rotationY: 0.3,
    floating: true,
    collider: false
  },
  {
    path: generalPath + 'floating_island3.glb',
    x: 10,
    y: -2,
    z: 500,
    scale: 100,
    rotationY: 0.3,
    floating: true,
    collider: false
  },

  /** CART AND MARKETS */
  {
    path: generalPath + 'cart.glb',
    x: -12,
    y: 0,
    z: 47,
    scale: 1.5,
    rotation: 0,
    floating: true,
    collider: false
  },
  {
    path: generalPath + 'props_cart_02.glb',
    x: 26,
    y: 0,
    z: -41,
    scale: 2,
    rotationY: 0.3,
    floating: true,
    collider: false
  }
];

export const modelsToLoad = [
  ...introModelsToLoad,
  ...gameplayModelsToLoad
];

export function loadIntroModels(scene) {
  return Promise.all(introModelsToLoad.map((item) => {
    return loadModel(scene, item.path, item);
  }));
}

export function loadGameplayModels(scene) {
  return Promise.all(gameplayModelsToLoad.map((item) => {
    return loadModel(scene, item.path, item);
  }));
}

export function loadModels(scene) {
  return Promise.all(modelsToLoad.map((item) => {
    return loadModel(scene, item.path, item);
  }));
}

// L'update globale adesso delega la logica del mago a mage.js
// Sostituisci la funzione in fondo a models.js
export function updateModels(deltaTime, player) {
  updateDemonDragon(deltaTime, player);
  const isTalkingToMage = updateMage(deltaTime, player);
  
  if (mage) {
    updateGem(deltaTime, player, mage);
  }

  return isTalkingToMage;
}
