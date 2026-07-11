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

const positionPanel = document.createElement('div');
positionPanel.style.position = 'fixed';
positionPanel.style.left = '16px';
positionPanel.style.bottom = '16px';
positionPanel.style.padding = '10px 12px';
positionPanel.style.borderRadius = '8px';
positionPanel.style.background = 'rgba(5, 8, 20, 0.78)';
positionPanel.style.color = '#e8f6ff';
positionPanel.style.fontFamily = 'monospace';
positionPanel.style.fontSize = '13px';
positionPanel.style.lineHeight = '1.35';
positionPanel.style.zIndex = '20';
positionPanel.style.display = 'none';
document.body.appendChild(positionPanel);

function formatNumber(value) {
  return Number(value.toFixed(2));
}

export function createPortalPositionLogger(player) {
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'p') return;

    const x = formatNumber(player.position.x);
    const y = formatNumber(player.position.y);
    const z = formatNumber(player.position.z);
    const vectorText = `new THREE.Vector3(${x}, ${y}, ${z})`;

    positionPanel.innerHTML = `
      <strong>Player position</strong><br>
      x: ${x}<br>
      y: ${y}<br>
      z: ${z}<br>
      ${vectorText}
    `;
    positionPanel.style.display = 'block';

    console.log('Player position:', { x, y, z });
    console.log(vectorText);
  });
}

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
  
  positionPanel.innerHTML = 'Portal crossed';
  positionPanel.style.display = 'block';
  console.log('Teleported to first world:', returnPosition);
}