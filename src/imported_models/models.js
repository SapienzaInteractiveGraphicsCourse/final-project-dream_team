import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { registerBook, registerBookDeliveryTarget } from './book.js';
import { registerMage, addMageMaterial, updateMage } from './mage.js';
import { registerGem, updateGem } from './gem.js';
import { registerDemonDragon, updateDemonDragon, setDragonOrbitCenter } from './dragon.js';

export const modelColliders = [];
const gltfLoader = new GLTFLoader();

const demonTintColor = new THREE.Color(0xffc2a0);
const demonEmissiveColor = new THREE.Color(0x3a160c);
let mage = null;

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

function loadModel(scene, path, options = {}) {
  gltfLoader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      const isMage = path.includes('skeleton-mage') || path.includes('cute-skeleton-mage');

      // 1. Applichiamo prima le trasformazioni di base (posizione, scala, rotazione)
      const x = options.x ?? 0;
      const y = options.y ?? 0;
      const z = options.z ?? 0;
      const scale = options.scale ?? 1;
      const rotationY = options.rotationY ?? 0;

      model.position.set(x, y, z);
      model.scale.set(scale, scale, scale);
      model.rotation.y = rotationY;

      // 2. LOGICA DEL SUOLO: Calcoliamo l'altezza corretta basandoci sulla base del modello
      if (!options.floating) {
        const groundY = options.groundY ?? 0.49;
        const box = new THREE.Box3().setFromObject(model);
        const modelBottomY = box.min.y;

        model.position.y += groundY - modelBottomY;
      }

      // Applichiamo l'eventuale offset manuale (se presente nelle opzioni)
      model.position.y += options.offsetY ?? 0;

      // 3. REGISTRAZIONE: Ora che il modello è stabilmente sul suolo, lo passiamo a mage.js
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
        registerGem(model);
      }

      if (path.includes('FantasyCastlePrototype')) {
        const castleBox = new THREE.Box3().setFromObject(model);
        const castleHeight = castleBox.max.y - castleBox.min.y;
        
        // Calcoliamo il centro matematico esatto di TUTTI i muri del castello nel mondo
        const realCastleCenter = new THREE.Vector3();
        castleBox.getCenter(realCastleCenter);
        
        const dragonFlightHeight = 18; 
        
        // Spostiamo l'orbita del drago sul centro reale calcolato
        setDragonOrbitCenter(realCastleCenter.x, dragonFlightHeight, realCastleCenter.z, 22);
      }
      // 4. Gestione dei materiali e delle ombre
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

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
    x: 38,
    y: 7,
    z: -27,
    scale: 15,
    rotationY: Math.PI / 3,
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
    path: '/models/Gem.glb', 
    x: 26, 
    y: 1,
    z: -18,
    scale: 1,
    floating: true,
    collider: false
  },
  {
    path: '/models/EvilBook.glb',
    x: -10,
    y: 0,
    z: -30,
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
    x: -9,
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
  },/*
  {
    path: '/models/RedDragon.glb',
    x: 5,
    y: 5,
    z: 20,
    scale: 1.2,
    rotationY: -0.3,
    floating: true,
    collider: true
  },*/
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
  /*{
    path: '/models/dragon_flying.glb',
    x: 0,
    y: 9,
    z: -20,
    scale: 5,
    rotationY: Math.PI / 4,
    floating: true,
    collider: false
  },*/
  {
    path: '/models/tower.glb',
    x: 105,
    y: 12,
    z: -120,
    scale: 2,
    rotationY: Math.PI / 4,
    floating: true,
    collider: false
  },
  {
    path: '/models/FantasyCastlePrototype.glb',
    x: 25,
    y: 0,
    z: -50,
    scale: 1,
    rotationY: Math.PI / 4,
    floating: true,
    collider: true
  }
];

export function loadModels(scene) {
  modelsToLoad.forEach((item) => {
    loadModel(scene, item.path, item);
  });
}

// L'update globale adesso delega la logica del mago a mage.js
export function updateModels(deltaTime, player) {
  updateDemonDragon(deltaTime);
  updateMage(deltaTime, player);
  if(mage) {
    updateGem(deltaTime, player, mage);
  }
}