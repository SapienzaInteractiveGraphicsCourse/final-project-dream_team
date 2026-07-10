import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { enableShadows } from '../base/helpers.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

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
  player.position.set(0, 0.15, 26);  // initial plaza
  // player.position.set(236, 28.75, -253);  // tower 2 initial position
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
      '/models_optimized/schoolboy.glb',

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
          
            if (child.material) {
              const oldMaterials = Array.isArray(child.material) ? child.material : [child.material];
              
              // --- FORCED MATERIAL RECONSTRUCTION ---
              const newMaterials = oldMaterials.map(oldMat => {
                // Create a completely new material, taking only the color or texture from the old one
                return new THREE.MeshStandardMaterial({
                  color: oldMat.color ? oldMat.color : new THREE.Color(0xffffff),
                  map: oldMat.map ? oldMat.map : null,
                  roughness: 0.8, // Makes clothes opaque and realistic
                  metalness: 0.0,
                  emissive: new THREE.Color(0x000000) // ZERO emissive light
                });
              });

              // Replace the old corrupted materials with the new and clean ones
              child.material = Array.isArray(child.material) ? newMaterials : newMaterials[0];
            }
          }
        });

        if (!skinnedMesh) {
          console.warn('No SkinnedMesh found in the model.');
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
        console.error('Error loading schoolboy.glb', error);
      }
    );

  return playerObject;
}

export function animatePlayer(playerObject, isMoving, elapsedTime) {
  if (!playerObject.ready) return;

  const parts = playerObject.parts;
  const initial = playerObject.initialRotations;

  // Reset rotations to the initial pose.
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

  // Walking swing movement.
  const swing = Math.sin(elapsedTime * 8);

  // Small torso movement.
  if (parts.spine) {
    parts.spine.rotation.z += Math.sin(elapsedTime * 3) * 0.04;
  }

  // Head movement.
  if (parts.head) {
    parts.head.rotation.y += Math.sin(elapsedTime * 2) * 0.12;
  }

  // Alternating arms: shoulders drive the whole arm chain.
  if (parts.leftShoulder) {
    parts.leftShoulder.rotation.x += swing * 0.45;
  }

  if (parts.rightShoulder) {
    parts.rightShoulder.rotation.x -= swing * 0.45;
  }

  // Slight forearm bend as secondary motion.
  if (parts.leftForeArm) {
    parts.leftForeArm.rotation.x += Math.max(0, swing) * 0.25;
  }

  if (parts.rightForeArm) {
    parts.rightForeArm.rotation.x += Math.max(0, -swing) * 0.25;
  }

  // Alternating legs.
  if (parts.leftUpLeg) {
    parts.leftUpLeg.rotation.x += -swing * 0.45;
  }

  if (parts.rightUpLeg) {
    parts.rightUpLeg.rotation.x += swing * 0.45;
  }

  // Slight foot animation.
  if (parts.leftFoot) {
    parts.leftFoot.rotation.x += Math.max(0, -swing) * 0.2;
  }

  if (parts.rightFoot) {
    parts.rightFoot.rotation.x += Math.max(0, swing) * 0.2;
  }
}