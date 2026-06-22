import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

function loadModel(scene, path, options = {}) {
  gltfLoader.load(
    path,

    (gltf) => {
      const model = gltf.scene;

      const x = options.x ?? 0;
      const y = options.y ?? 0;
      const z = options.z ?? 0;

      const scale = options.scale ?? 1;
      const rotationY = options.rotationY ?? 0;

      model.position.set(x, y, z);
      model.scale.set(scale, scale, scale);
      model.rotation.y = rotationY;

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(model);

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
    path: '/models/Dragon.glb',
    x: -3,
    y: 8,
    z: 15,
    scale: 0.02,
    rotationY: Math.PI
  },
  {
    path: '/models/ElevenTower.glb',
    x: -3,
    y: 6,
    z: 6,
    scale: 1.5,
    rotationY: Math.PI / 2
  },
  {
    path: '/models/EvilBook.glb',
    x: -3,
    y: 2,
    z: 2,
    scale: 1.2,
    rotationY: Math.PI 
  },
  {
    path: '/models/FantasyHouse.glb',
    x: 3.5,
    y: 0.45,
    z: -2,
    scale: 1.2,
    rotationY: Math.PI / 2
  },
  {
    path: '/models/FantasyInn.glb',
    x: 3.5,
    y: 0.45,
    z: -2,
    scale: 1.2,
    rotationY: Math.PI / 2
  },
  {
    path: '/models/FantasyStable.glb',
    x: 8,
    y: 0.45,
    z: -8,
    scale: 1.2,
    rotationY: Math.PI / 2
  },
  {
    path: '/models/RedDragon.glb',
    x: 5,
    y: 5,
    z: 5,
    scale: 1.2,
    rotationY: Math.PI / 2
  },
  {
    path: '/models/FantasyCastlePrototype.glb',
    x: 1.2,
    y: 5,
    z: 2.8,
    scale: 0.4,
    rotationY: 0
  },
  {
    path: '/models/pixellabs-cute-skeleton-mage-character-2439.glb',
    x: -3,
    y: 2,
    z: 12,
    scale: 3,
    rotationY: Math.PI / 4
  }
];

export function loadModels(scene) {
  modelsToLoad.forEach((item) => {
    loadModel(scene, item.path, item);
  });
}
