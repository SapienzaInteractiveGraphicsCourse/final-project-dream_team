import * as THREE from 'three';
import { getActiveTower } from '../imported_models/bridge.js';

// --- CONFIGURATION ---
const towerSpawnPosition = new THREE.Vector3(236, 28.75, -253);
const minFallCheckY = 20;
const rayStartHeight = 2;
const maxFloorDistance = 5;

// --- RAYCASTING SETUP ---
const downRaycaster = new THREE.Raycaster();
const downDirection = new THREE.Vector3(0, -1, 0);
const rayOrigin = new THREE.Vector3();

// --- STATE VARIABLES ---
let isFalling = false;
let fallTimer = 0;

/**
 * Checks if there is a floor (tower segment) directly beneath the player.
 */
function hasFloorUnderPlayer(player) {
  const activeTower = getActiveTower();

  if (!activeTower) return true;

  activeTower.updateMatrixWorld(true);
  rayOrigin.copy(player.position);
  rayOrigin.y += rayStartHeight;

  downRaycaster.set(rayOrigin, downDirection);
  downRaycaster.far = maxFloorDistance;

  const hits = downRaycaster.intersectObject(activeTower, true);

  return hits.some((hit) => {
    const verticalDistance = rayOrigin.y - hit.point.y;
    const floorIsNearFeet = Math.abs(hit.point.y - player.position.y) < 2.2;

    return verticalDistance > 0 && floorIsNearFeet;
  });
}

/**
 * Main update function to handle the player falling off the tower.
 */
export function updateTowerFall(deltaTime, player, isTowerActive) {
  // If already falling, continue the animation and reset if finished
  if (isFalling) {
    fallTimer += deltaTime;
    player.position.y -= 18 * deltaTime;

    if (fallTimer > 1.4) {
      player.position.copy(towerSpawnPosition);
      isFalling = false;
      fallTimer = 0;
    }

    return true;
  }

  // If tower is not active or player is too low, skip check
  if (!isTowerActive) return false;
  if (player.position.y < minFallCheckY) return false;

  // Detect if player stepped off the edge
  if (!hasFloorUnderPlayer(player)) {
    isFalling = true;
    fallTimer = 0;
    return true;
  }

  return false;
}