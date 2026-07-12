import * as THREE from 'three';
import { isBridgeBuilt } from '../imported_models/bridge.js';
import { hideBookAfterPortal } from '../imported_models/book.js';
import { hideDragonAfterPortal } from '../imported_models/dragon.js';
import { hideGemAfterPortal } from '../imported_models/gem.js';
import { startFinale } from './final.js';

const portalCenter = new THREE.Vector3(243.4, 28.75, -255.4);
const portalSize = new THREE.Vector3(5, 6, 5);
const portalBox = new THREE.Box3().setFromCenterAndSize(portalCenter, portalSize);
const returnPosition = new THREE.Vector3(-1.94, 0.15, 26.04);

let hasTeleportedToFirstWorld = false;

export function updatePortalTeleport(player, onStartFinale = startFinale) {
  if (!isBridgeBuilt()) return;
  if (hasTeleportedToFirstWorld) return;
  if (!portalBox.containsPoint(player.position)) return;

  player.position.copy(returnPosition);
  hasTeleportedToFirstWorld = true;

  hideBookAfterPortal();
  hideDragonAfterPortal();
  hideGemAfterPortal();
  
  onStartFinale();
  console.log('Teleported to first world:', returnPosition);
}
