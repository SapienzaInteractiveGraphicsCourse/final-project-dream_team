import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { consumeCarriedWood, isCarryingWood } from './wood.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const towerPosition = new THREE.Vector3(85, 12, -120);
const brokenTowerWorldOffset = new THREE.Vector3(0, 1, 0);
const fixedTowerWorldOffset = new THREE.Vector3(125, 1.1, -123.52);
const shifuPosition = new THREE.Vector3(231, 28.4, -258);
const buildEffectPosition = new THREE.Vector3(85, 16, -120);
const bridgeEffectWorldOffset = new THREE.Vector3(0, -3.1, 0);
const towerScale = 2;
const towerRotationY = Math.PI / 4;
const buildDistance = 5;
const buildDuration = 3;
const particleCount = 1500;
const screenSparkleCount = 980;
const sparkleColors = [
  0xffffff,
  0xfff8d6,
  0xffe9a8,
  0xd8fffb,
  0xbdd8ff,
  0xf7d7ff,
  0xdcffd2
];

let brokenTower = null;
let fixedTower = null;
let bridgeTaskLoadPromise = null;
let bridgeState = 'waiting';
let buildTimer = 0;
let canBuildBridge = false;
let particles = [];
const buildEffectBox = new THREE.Box3();
const buildEffectCenter = new THREE.Vector3();
const towerBounds = new THREE.Box3();

const bridgePrompt = document.createElement('div');
bridgePrompt.className = 'interaction-dialogue';
document.body.appendChild(bridgePrompt);

function prepareTower(model, visible, worldOffset = null) {
  model.position.copy(towerPosition);

  if (worldOffset) {
    model.position.add(worldOffset);
  }

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

function hideExportPlaceholderCube(model) {
  model.traverse((child) => {
    if (child.isMesh && child.name === 'Cube') {
      child.visible = false;
    }
  });
}

function getBuildEffectPosition() {
  if (!brokenTower) return buildEffectPosition;

  brokenTower.updateMatrixWorld(true);
  buildEffectBox.setFromObject(brokenTower);
  buildEffectBox.getCenter(buildEffectCenter);
  buildEffectCenter.lerp(shifuPosition, 0.55);
  buildEffectCenter.y = shifuPosition.y;
  buildEffectCenter.add(bridgeEffectWorldOffset);

  return buildEffectCenter;
}

function createBuildParticles(scene) {
  const geometry = new THREE.SphereGeometry(0.18, 10, 10);

  for (let i = 0; i < particleCount; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: sparkleColors[i % sparkleColors.length],
      transparent: true,
      opacity: 0,
      depthTest: false,
      blending: THREE.AdditiveBlending
    });

    const particle = new THREE.Mesh(geometry, material);
    particle.visible = false;
    particle.renderOrder = 100;
    particle.userData.angle = (i / particleCount) * Math.PI * 2;
    particle.userData.radius = 2 + Math.random() * 30;
    particle.userData.speed = 4 + Math.random() * 13;
    particle.userData.height = -3.5 + Math.random() * 7;
    particle.userData.isScreenSparkle = i < screenSparkleCount;
    particle.userData.direction = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 1.4 - 0.2,
      Math.random() * 2 - 1
    ).normalize();
    particle.userData.distance = 1 + Math.random() * 28;
    particle.userData.explosionSpeed = 15 + Math.random() * 36;
    particle.userData.twinkle = Math.random() * Math.PI * 2;
    particle.userData.pulseSpeed = 9 + Math.random() * 18;
    particle.userData.baseScale = 0.22 + Math.random() * 3.2;
    particle.position.copy(buildEffectPosition);
    particle.scale.setScalar(particle.userData.baseScale);
    particles.push(particle);
    scene.add(particle);
  }
}

function setParticlesVisible(visible) {
  particles.forEach((particle) => {
    particle.visible = visible;
    particle.material.opacity = visible ? 0.55 : 0;
  });
}

function updateBuildParticles(deltaTime, player) {
  const progress = 1 - buildTimer / buildDuration;
  const effectPosition = getBuildEffectPosition();
  const playerEffectPosition = player
    ? player.position.clone().add(new THREE.Vector3(0, 2.5, 0))
    : effectPosition;

  particles.forEach((particle, index) => {
    particle.userData.angle += deltaTime * particle.userData.speed;
    particle.userData.twinkle += deltaTime * particle.userData.pulseSpeed;
    particle.scale.setScalar(
      particle.userData.baseScale *
        (0.75 + Math.sin(particle.userData.twinkle) * 0.35)
    );

    if (particle.userData.isScreenSparkle) {
      const burstDistance =
        particle.userData.distance + progress * particle.userData.explosionSpeed;
      const drift = Math.sin(particle.userData.twinkle + index) * 2.4;

      particle.position.set(
        playerEffectPosition.x + particle.userData.direction.x * burstDistance + drift,
        playerEffectPosition.y + particle.userData.direction.y * burstDistance - 0.9,
        playerEffectPosition.z + particle.userData.direction.z * burstDistance - 7
      );

      particle.material.opacity =
        Math.max(0, Math.sin(progress * Math.PI)) *
        (0.42 + Math.sin(particle.userData.twinkle) * 0.22);
      return;
    }

    const radius = particle.userData.radius * (1 + progress * 0.65);
    const angle = particle.userData.angle;
    const lift = progress * 3.2 + Math.sin(progress * Math.PI + index) * 2.1;

    particle.position.set(
      effectPosition.x + Math.cos(angle) * radius,
      effectPosition.y + particle.userData.height + lift,
      effectPosition.z + Math.sin(angle) * radius
    );

    particle.material.opacity =
      Math.max(0, Math.sin(progress * Math.PI)) *
      (0.48 + Math.sin(particle.userData.twinkle) * 0.2);
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
  if (bridgeTaskLoadPromise) return bridgeTaskLoadPromise;

  bridgeTaskLoadPromise = Promise.all([
    new Promise((resolve) => {
      loader.load(
        '/models_optimized/tower1.glb',
        (gltf) => {
          brokenTower = gltf.scene;
          prepareTower(brokenTower, true, brokenTowerWorldOffset);
          scene.add(brokenTower);
          resolve(brokenTower);
        },
        undefined,
        (error) => {
          console.error('Error loading tower1.glb', error);
          resolve(null);
        }
      );
    }),
    new Promise((resolve) => {
      loader.load(
        '/models_optimized/tower3.glb',
        (gltf) => {
          fixedTower = gltf.scene;
          prepareTower(fixedTower, false, fixedTowerWorldOffset);
          hideExportPlaceholderCube(fixedTower);
          scene.add(fixedTower);
          resolve(fixedTower);
        },
        undefined,
        (error) => {
          console.error('Error loading tower3.glb', error);
          resolve(null);
        }
      );
    })
  ]).then((models) => {
    createBuildParticles(scene);
    return models;
  });

  return bridgeTaskLoadPromise;
}

export function updateBridgeTask(deltaTime, player) {
  if (!brokenTower || !fixedTower) return;

  if (bridgeState === 'building') {
    buildTimer -= deltaTime;
    updateBuildParticles(deltaTime, player);

    if (buildTimer <= 0) {
      brokenTower.visible = false;
      fixedTower.visible = true;
      bridgeState = 'built';
      setParticlesVisible(false);
      bridgePrompt.classList.remove('is-visible');
    }

    return;
  }

  if (bridgeState === 'built') {
    return;
  }

  canBuildBridge =
    isCarryingWood() && player.position.distanceTo(shifuPosition) < buildDistance;

  if (canBuildBridge) {
    bridgePrompt.textContent = 'Press F to rebuild the bridge';
    bridgePrompt.classList.add('is-visible');
  } else {
    bridgePrompt.classList.remove('is-visible');
  }
}

export function isBridgeBuilt() {
  return bridgeState === 'built';
}

export function getActiveTowerBounds() {
  const activeTower = bridgeState === 'built' ? fixedTower : brokenTower;

  if (!activeTower) return null;

  activeTower.updateMatrixWorld(true);
  towerBounds.setFromObject(activeTower);

  return towerBounds;
}

export function getActiveTower() {
  return bridgeState === 'built' ? fixedTower : brokenTower;
}
