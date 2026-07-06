import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const carpetStartPosition = new THREE.Vector3(44, 0.5, -22);
const otherWorldPosition = new THREE.Vector3(237.79, 28.75, -255.19);
const playerOnCarpetOffset = new THREE.Vector3(0, 0.35, 0);
const travelSpeed = 0.12;
const travelArcHeight = 10;
const carpetFloatAmount = 0.08;

export function tryStartCarpetTravel(carpetTravel) {
  if (!carpetTravel.canUse) return;
  if (carpetTravel.hasArrived) return;

  carpetTravel.isTraveling = true;
  carpetTravel.travelProgress = 0;
}

export function createCarpetTravel(scene) {
  const carpetGroup = new THREE.Group();

  carpetGroup.position.copy(carpetStartPosition);
  scene.add(carpetGroup);



  const mtlLoader = new MTLLoader();
  mtlLoader.setPath('/models/');

  mtlLoader.load('materials.mtl', (materials) => {
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath('/models/');

    objLoader.load('model.obj', (object) => {
      object.scale.setScalar(1);   // modified scale of the carpet
      object.rotation.y = Math.PI / 2;

      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      carpetGroup.add(object);
    });
  });

  return {
    group: carpetGroup,
    canUse: false,
    isTraveling: false,
    hasArrived: false,
    travelProgress: 0
  };
}

export function updateCarpetTravel(deltaTime, player, carpetTravel) {
  const carpet = carpetTravel.group;
  const floatOffset = Math.sin(performance.now() * 0.003) * carpetFloatAmount;

  if (carpetTravel.isTraveling) {
    carpetTravel.travelProgress += deltaTime * travelSpeed;

    if (carpetTravel.travelProgress >= 1) {
      carpetTravel.travelProgress = 1;
      carpetTravel.isTraveling = false;
      carpetTravel.hasArrived = true;
    }

    carpet.position.lerpVectors(
      carpetStartPosition,
      otherWorldPosition,
      carpetTravel.travelProgress
    );

    carpet.position.y +=
      Math.sin(carpetTravel.travelProgress * Math.PI) * travelArcHeight +
      floatOffset;

    player.position.copy(carpet.position).add(playerOnCarpetOffset);

    return;
  }

  if (carpetTravel.hasArrived) {
    carpet.position.copy(otherWorldPosition);
  } else {
    carpet.position.copy(carpetStartPosition);
  }

  carpet.position.y += floatOffset;

  const distance = player.position.distanceTo(carpet.position);
  carpetTravel.canUse = distance < 3;
}
