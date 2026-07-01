import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { enableShadows } from '../base/helpers.js';

const loader = new GLTFLoader();

function findBone(skinnedMesh, namePart) {
  if (!skinnedMesh) return null;

  return skinnedMesh.skeleton.bones.find((bone) =>
    bone.name.includes(namePart)
  );
}

function saveInitialRotations(parts) {
  const initialRotations = {};

  for (const key in parts) {
    if (parts[key]) {
      initialRotations[key] = parts[key].rotation.clone();
    }
  }

  return initialRotations;
}

export function createPlayer(scene) {
  const player = new THREE.Group();
  player.position.set(0, 0.15, 26);  // initial plaza at z = 26
  player.rotation.y = 0;
  scene.add(player);

  const playerObject = {
    group: player,
    model: null,
    skinnedMesh: null,
    parts: {},
    initialRotations: {},
    ready: false
  };

  loader.load(
      '/models/schoolboy.glb',

      (gltf) => {
        const model = gltf.scene;
        let skinnedMesh = null;

        model.scale.setScalar(1.5);

        const box = new THREE.Box3().setFromObject(model);
        model.position.y -= box.min.y;

        enableShadows(model);

        model.traverse((child) => {
          if (child.isSkinnedMesh) {
            skinnedMesh = child;
          }

          if (child.isMesh || child.isSkinnedMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        if (!skinnedMesh) {
          console.warn('Nessuna SkinnedMesh trovata nel modello.');
        }

        const parts = {
          hips: findBone(skinnedMesh, 'Hips'),
          spine: findBone(skinnedMesh, 'Spine'),
          head: findBone(skinnedMesh, 'Head'),

          leftShoulder: findBone(skinnedMesh, 'LeftShoulder'),
          rightShoulder: findBone(skinnedMesh, 'RightShoulder'),

          leftArm: findBone(skinnedMesh, 'LeftArm'),
          rightArm: findBone(skinnedMesh, 'RightArm'),

          leftForeArm: findBone(skinnedMesh, 'LeftForeArm'),
          rightForeArm: findBone(skinnedMesh, 'RightForeArm'),

          leftUpLeg: findBone(skinnedMesh, 'LeftUpLeg'),
          rightUpLeg: findBone(skinnedMesh, 'RightUpLeg'),

          leftLeg: findBone(skinnedMesh, 'LeftLeg'),
          rightLeg: findBone(skinnedMesh, 'RightLeg'),

          leftFoot: findBone(skinnedMesh, 'LeftFoot'),
          rightFoot: findBone(skinnedMesh, 'RightFoot')
        };

        player.add(model);

        playerObject.model = model;
        playerObject.skinnedMesh = skinnedMesh;
        playerObject.parts = parts;
        playerObject.initialRotations = saveInitialRotations(parts);
        playerObject.ready = true;

        console.log('Schoolboy player loaded', parts);
      },

      undefined,

      (error) => {
        console.error('Errore caricamento schoolboy.glb', error);
      }
    );

  return playerObject;
}

export function animatePlayer(playerObject, isMoving, elapsedTime) {
  if (!playerObject.ready) return;

  const parts = playerObject.parts;
  const initial = playerObject.initialRotations;

  // Reset delle rotazioni alla posa iniziale
  for (const key in parts) {
    if (parts[key] && initial[key]) {
      parts[key].rotation.copy(initial[key]);
    }
  }

  const armDown = 1.1;

  if (parts.leftArm) {
    parts.leftArm.rotation.x += armDown;
  }

  if (parts.rightArm) {
    parts.rightArm.rotation.x += armDown;
  }

  if (!isMoving) return;

  // Movimento oscillante per camminata.
  const swing = Math.sin(elapsedTime * 8);

  // Piccolo movimento del busto
  if (parts.spine) {
    parts.spine.rotation.z += Math.sin(elapsedTime * 3) * 0.04;
  }

  // Movimento della testa
  if (parts.head) {
    parts.head.rotation.y += Math.sin(elapsedTime * 2) * 0.12;
  }

  // Braccia alternate: muoviamo le spalle, che sono parent di tutto il braccio.
  if (parts.leftShoulder) {
    parts.leftShoulder.rotation.x += swing * 0.45;
  }

  if (parts.rightShoulder) {
    parts.rightShoulder.rotation.x -= swing * 0.45;
  }

  // Avambracci leggermente piegati, solo come movimento secondario.
  if (parts.leftForeArm) {
    parts.leftForeArm.rotation.x += Math.max(0, swing) * 0.25;
  }

  if (parts.rightForeArm) {
    parts.rightForeArm.rotation.x += Math.max(0, -swing) * 0.25;
  }

  // Gambe alternate
  if (parts.leftUpLeg) {
    parts.leftUpLeg.rotation.x += -swing * 0.45;
  }

  if (parts.rightUpLeg) {
    parts.rightUpLeg.rotation.x += swing * 0.45;
  }

  // Piedi leggermente animati
  if (parts.leftFoot) {
    parts.leftFoot.rotation.x += Math.max(0, -swing) * 0.2;
  }

  if (parts.rightFoot) {
    parts.rightFoot.rotation.x += Math.max(0, swing) * 0.2;
  }

}
