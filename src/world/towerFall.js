import * as THREE from 'three';
import { getActiveTower } from '../imported_models/bridge.js';

const towerSpawnPosition = new THREE.Vector3(236, 28.75, -253);
const mainIslandSpawnPosition = new THREE.Vector3(0, 0.15, 26);
const minFallCheckY = 20;
const rayStartHeight = 2;
const maxFloorDistance = 5;

const downRaycaster = new THREE.Raycaster();
const downDirection = new THREE.Vector3(0, -1, 0);
const rayOrigin = new THREE.Vector3();

let isFalling = false;
let fallTimer = 0;
let respawnPosition = towerSpawnPosition;
function hasFloorUnderPlayer(player, floorObject) {
  if (!floorObject) return true;

  floorObject.updateMatrixWorld(true);
  rayOrigin.copy(player.position);
  rayOrigin.y += rayStartHeight;

  downRaycaster.set(rayOrigin, downDirection);
  downRaycaster.far = maxFloorDistance;

  const hits = downRaycaster.intersectObject(floorObject, true);

  return hits.some((hit) => {
    const verticalDistance = rayOrigin.y - hit.point.y;
    const floorIsNearFeet = Math.abs(hit.point.y - player.position.y) < 2.2;

    return verticalDistance > 0 && floorIsNearFeet;
  });
}
export function updateTowerFall(deltaTime, player, isTowerActive, mainIslandFloor) {

  if (isFalling) {
    fallTimer += deltaTime;
    player.position.y -= 18 * deltaTime;

    if (fallTimer > 1.4) {
      player.position.copy(respawnPosition);
      isFalling = false;
      fallTimer = 0;
    }

    return true;
  }

  const floorObject = isTowerActive ? getActiveTower() : mainIslandFloor;


  if (isTowerActive && player.position.y < minFallCheckY) return false;

  if (!hasFloorUnderPlayer(player, floorObject)) {
    respawnPosition = isTowerActive
      ? towerSpawnPosition
      : mainIslandSpawnPosition;
    isFalling = true;
    fallTimer = 0;
    return true;
  }

  return false;
}
