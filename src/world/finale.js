import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const flynnPosition = new THREE.Vector3(-8.65, 0.15, 34.79);
const flynnScale = 2;
const flynnRotationY = -0.05;

let finaleStarted = false;
let flynn = null;
let flynnStartY = 0;

async function prepareFlynnMaterial(material, parser) {
  if (!material) return;

  const specGloss =
    material.userData?.gltfExtensions?.KHR_materials_pbrSpecularGlossiness;

  if (specGloss?.diffuseTexture) {
    const texture = await parser.getDependency(
      'texture',
      specGloss.diffuseTexture.index
    );

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    material.map = texture;
  }

  if (specGloss?.diffuseFactor && material.color) {
    material.color.fromArray(specGloss.diffuseFactor);
  }

  if (material.map) {
    material.map.colorSpace = THREE.SRGBColorSpace;
    material.map.needsUpdate = true;
  }

  if ('metalness' in material) {
    material.metalness = 0;
  }

  if ('roughness' in material) {
    material.roughness = specGloss?.glossinessFactor
      ? 1 - specGloss.glossinessFactor
      : Math.min(material.roughness ?? 0.7, 0.7);
  }

  material.needsUpdate = true;
}

export function startFinale() {
  finaleStarted = true;

  if (flynn) {
    flynn.visible = true;
  }
}

export function isFinaleStarted() {
  return finaleStarted;
}

export function loadFinale(scene) {
  loader.load(
    '/models/flynn_rider.glb',
    (gltf) => {
      flynn = gltf.scene;
      const materialPromises = [];

      flynn.position.copy(flynnPosition);
      flynn.scale.setScalar(flynnScale);
      flynn.rotation.y = flynnRotationY;
      flynn.visible = false;

      const box = new THREE.Box3().setFromObject(flynn);
      flynn.position.y += flynnPosition.y - box.min.y;
      flynnStartY = flynn.position.y;

      flynn.traverse((child) => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          child.material = Array.isArray(child.material)
            ? child.material.map((material) => material.clone())
            : child.material.clone();

          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materialPromises.push(
            ...materials.map((material) =>
              prepareFlynnMaterial(material, gltf.parser)
            )
          );
        }
      });

      Promise.all(materialPromises).then(() => {
        scene.add(flynn);

        if (finaleStarted) {
          flynn.visible = true;
        }

        console.log('Flynn loaded for finale');
      });
    },
    undefined,
    (error) => {
      console.error('Error loading flynn_rider.glb', error);
    }
  );
}

export function updateFinale(deltaTime, player) {
  if (!finaleStarted) return;
  if (!flynn || !player) return;

  const time = performance.now() * 0.001;
  flynn.position.y = flynnStartY + Math.sin(time * 1.8) * 0.05;
  flynn.lookAt(player.position.x, flynn.position.y, player.position.z);
}
