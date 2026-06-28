import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { consumeCarriedWood, isCarryingWood } from './wood.js';

const loader = new GLTFLoader();

const towerPosition = new THREE.Vector3(85, 12, -120);
const shifuPosition = new THREE.Vector3(231, 28.4, -258);
const buildEffectPosition = new THREE.Vector3(85, 16, -120);
const towerScale = 2;
const towerRotationY = Math.PI / 4;
const buildDistance = 5;
const buildDuration = 3;
const particleCount = 34;

let brokenTower = null;
let fixedTower = null;
let bridgeState = 'waiting';
let buildTimer = 0;
let canBuildBridge = false;
let particles = [];

const bridgePrompt = document.createElement('div');
bridgePrompt.className = 'interaction-dialogue';
document.body.appendChild(bridgePrompt);

function getBoxAnchor(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());

  return new THREE.Vector3(center.x, box.min.y, center.z);
}

function alignFixedTowerToBrokenTower() {
  if (!brokenTower || !fixedTower) return;

  const brokenAnchor = getBoxAnchor(brokenTower);
  const fixedAnchor = getBoxAnchor(fixedTower);

  fixedTower.position.add(brokenAnchor.sub(fixedAnchor));
  fixedTower.position.y -= 0.35;
}

function prepareTower(model, visible) {
  model.position.copy(towerPosition);
  model.scale.setScalar(towerScale);
  model.rotation.y = towerRotationY;
  model.visible = visible;

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function createBuildParticles(scene) {
  const geometry = new THREE.SphereGeometry(0.16, 12, 12);

  for (let i = 0; i < particleCount; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0xffd76a : 0x8fffee,
      transparent: true,
      opacity: 0
    });

    const particle = new THREE.Mesh(geometry, material);
    particle.visible = false;
    particle.userData.angle = (i / particleCount) * Math.PI * 2;
    particle.userData.radius = 1.8 + Math.random() * 3.5;
    particle.userData.speed = 1.4 + Math.random() * 1.6;
    particle.userData.height = Math.random() * 2.5;
    particle.position.copy(buildEffectPosition);
    particles.push(particle);
    scene.add(particle);
  }
}

function setParticlesVisible(visible) {
  particles.forEach((particle) => {
    particle.visible = visible;
    particle.material.opacity = visible ? 1 : 0;
  });
}

function updateBuildParticles(deltaTime) {
  const progress = 1 - buildTimer / buildDuration;

  particles.forEach((particle, index) => {
    particle.userData.angle += deltaTime * particle.userData.speed;

    const radius = particle.userData.radius * (1 - progress * 0.45);
    const angle = particle.userData.angle;
    const lift = progress * 4 + Math.sin(progress * Math.PI + index) * 0.4;

    particle.position.set(
      buildEffectPosition.x + Math.cos(angle) * radius,
      buildEffectPosition.y + particle.userData.height + lift,
      buildEffectPosition.z + Math.sin(angle) * radius
    );

    particle.material.opacity = Math.max(0, Math.sin(progress * Math.PI));
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() !== 'f') return;
  if (!canBuildBridge || bridgeState !== 'waiting') return;

  consumeCarriedWood();
  bridgeState = 'building';
  buildTimer = buildDuration;
  canBuildBridge = false;
  bridgePrompt.classList.remove('is-visible');
  setParticlesVisible(true);
});

export function loadBridgeTask(scene) {
  loader.load('/models/tower1.glb', (gltf) => {
    brokenTower = gltf.scene;
    prepareTower(brokenTower, true);
    scene.add(brokenTower);
    alignFixedTowerToBrokenTower();
  });

  loader.load('/models/tower3.glb', (gltf) => {
    fixedTower = gltf.scene;
    prepareTower(fixedTower, false);
    scene.add(fixedTower);
    alignFixedTowerToBrokenTower();
  });

  createBuildParticles(scene);
}

export function updateBridgeTask(deltaTime, player) {
  if (!brokenTower || !fixedTower) return;

  if (bridgeState === 'building') {
    buildTimer -= deltaTime;
    updateBuildParticles(deltaTime);

    if (buildTimer <= 0) {
      brokenTower.visible = false;
      fixedTower.visible = true;
      bridgeState = 'built';
      setParticlesVisible(false);
      bridgePrompt.textContent = 'Ponte ricostruito';
      bridgePrompt.classList.add('is-visible');
    }

    return;
  }

  if (bridgeState === 'built') {
    return;
  }

  canBuildBridge =
    isCarryingWood() && player.position.distanceTo(shifuPosition) < buildDistance;

  if (canBuildBridge) {
    bridgePrompt.textContent = 'Premi F per ricostruire il ponte';
    bridgePrompt.classList.add('is-visible');
  } else {
    bridgePrompt.classList.remove('is-visible');
  }
}
