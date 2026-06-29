import * as THREE from 'three';

const towerSpawnPosition = new THREE.Vector3(236, 28.75, -253);

const safeTowerArea = new THREE.Box3(
  new THREE.Vector3(220, 24, -270),
  new THREE.Vector3(260, 36, -230)
);

let isFalling = false;
let fallTimer = 0;

export function updateTowerFall(deltaTime, player) {
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

  if (!safeTowerArea.containsPoint(player.position)) {
    isFalling = true;
    fallTimer = 0;
    return true;
  }

  return false;
}
