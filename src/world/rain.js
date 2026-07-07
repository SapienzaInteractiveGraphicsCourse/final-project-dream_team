import * as THREE from 'three';

let rainGroup = null;
let rainLines = null;
let rainCrystals = null;
let linePositions = null;
let crystalPositions = null;
let isRaining = false;
let stormStarted = false;
let stormProgress = 0;
let rainAudio = null;

const lineCount = 400;
const crystalCount = 150;
const rainArea = 120;
const rainTop = 105;
const rainBottom = -55;
const rainSpawnExtraHeight = 55;
const minDropLength = 1.6;
const maxDropLength = 4.8;
const minRainSpeed = 42;
const maxRainSpeed = 78;
const stormFadeDuration = 5;
const daySkyColor = new THREE.Color(0x87ceeb);
const nightSkyColor = new THREE.Color(0x050814);
const stormLightColor = new THREE.Color(0x8faaff);
const tempSkyColor = new THREE.Color();
const originalLights = [];
const lineData = [];
const crystalData = [];

function startRainAudio() {
  if (!rainAudio) {
    rainAudio = new Audio('/music/rain.mp3');
    rainAudio.loop = true;
    rainAudio.volume = 0.35;
  }

  rainAudio.play().catch((error) => {
    console.warn('Rain audio blocked by browser:', error);
  });
}

function randomRainX() {
  return Math.random() * rainArea - rainArea / 2;
}

function randomRainZ() {
  return Math.random() * rainArea - rainArea / 2;
}

function randomRainY() {
  return rainBottom + Math.random() * (rainTop - rainBottom);
}

function resetLineDrop(index, startAtTop = true) {
  const data = lineData[index];

  data.x = randomRainX();
  data.y = startAtTop
    ? rainTop + Math.random() * rainSpawnExtraHeight
    : randomRainY();
  data.z = randomRainZ();
  data.length = minDropLength + Math.random() * (maxDropLength - minDropLength);
  data.speed = minRainSpeed + Math.random() * (maxRainSpeed - minRainSpeed);
}

function resetCrystal(index, startAtTop = true) {
  const data = crystalData[index];

  data.x = randomRainX();
  data.y = startAtTop
    ? rainTop + Math.random() * rainSpawnExtraHeight
    : randomRainY();
  data.z = randomRainZ();
  data.speed = minRainSpeed * 0.55 + Math.random() * 26;
  data.drift = Math.random() * Math.PI * 2;
}

function writeLineDrop(index) {
  const data = lineData[index];
  const positionIndex = index * 6;

  linePositions[positionIndex] = data.x;
  linePositions[positionIndex + 1] = data.y;
  linePositions[positionIndex + 2] = data.z;
  linePositions[positionIndex + 3] = data.x - 0.15;
  linePositions[positionIndex + 4] = data.y - data.length;
  linePositions[positionIndex + 5] = data.z + 0.15;
}

function writeCrystal(index) {
  const data = crystalData[index];
  const positionIndex = index * 3;

  crystalPositions[positionIndex] = data.x;
  crystalPositions[positionIndex + 1] = data.y;
  crystalPositions[positionIndex + 2] = data.z;
}

export function createRain(scene) {
  rainGroup = new THREE.Group();
  rainGroup.visible = false;

  const lineGeometry = new THREE.BufferGeometry();
  linePositions = new Float32Array(lineCount * 2 * 3);

  for (let i = 0; i < lineCount; i += 1) {
    lineData.push({});
    resetLineDrop(i, false);
    writeLineDrop(i);
  }

  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xb9ddff,
    transparent: true,
    opacity: 0.62,
    depthWrite: false
  });

  rainLines = new THREE.LineSegments(lineGeometry, lineMaterial);
  rainGroup.add(rainLines);

  const crystalGeometry = new THREE.BufferGeometry();
  crystalPositions = new Float32Array(crystalCount * 3);

  for (let i = 0; i < crystalCount; i += 1) {
    crystalData.push({});
    resetCrystal(i, false);
    writeCrystal(i);
  }

  crystalGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(crystalPositions, 3)
  );

  const crystalMaterial = new THREE.PointsMaterial({
    color: 0xd8f3ff,
    size: 0.18,
    transparent: true,
    opacity: 0.58,
    depthWrite: false
  });

  rainCrystals = new THREE.Points(crystalGeometry, crystalMaterial);
  rainGroup.add(rainCrystals);

  scene.add(rainGroup);
}

export function startRain() {
  isRaining = true;
  startRainAudio();

  if (rainGroup) {
    rainGroup.visible = true;
  }
}

export function startStorm(scene) {
  stormStarted = true;
  stormProgress = 0;
  originalLights.length = 0;

  scene.traverse((object) => {
    if (object.isLight) {
      originalLights.push({
        light: object,
        intensity: object.intensity,
        color: object.color.clone()
      });
    }
  });

  startRain();
}

export function updateRain(deltaTime, player) {
  if (!rainGroup || !isRaining || !player) return;

  rainGroup.position.x = player.position.x;
  rainGroup.position.y = 0;
  rainGroup.position.z = player.position.z;

  for (let i = 0; i < lineCount; i += 1) {
    const data = lineData[i];
    data.y -= data.speed * deltaTime;

    if (data.y < rainBottom) {
      resetLineDrop(i);
    }

    writeLineDrop(i);
  }

  for (let i = 0; i < crystalCount; i += 1) {
    const data = crystalData[i];
    data.y -= data.speed * deltaTime;
    data.drift += deltaTime * 2.5;
    data.x += Math.sin(data.drift) * deltaTime * 0.35;

    if (data.y < rainBottom) {
      resetCrystal(i);
    }

    writeCrystal(i);
  }

  rainLines.geometry.attributes.position.needsUpdate = true;
  rainCrystals.geometry.attributes.position.needsUpdate = true;
}

export function updateStorm(deltaTime, scene) {
  if (!stormStarted) return;

  stormProgress += deltaTime / stormFadeDuration;
  stormProgress = Math.min(stormProgress, 1);

  scene.background = tempSkyColor
    .lerpColors(daySkyColor, nightSkyColor, stormProgress)
    .clone();

  originalLights.forEach(({ light, intensity, color }) => {
    light.intensity = THREE.MathUtils.lerp(
      intensity,
      intensity * 0.25,
      stormProgress
    );
    light.color.copy(color).lerp(stormLightColor, stormProgress);
  });
}

export function getStormProgress() {
  return stormProgress;
}

export function stopStormAndRain(scene) {
  isRaining = false;
  stormStarted = false;
  stormProgress = 0;

  if (rainGroup) {
    rainGroup.visible = false;
  }

  if (rainAudio) {
    rainAudio.pause();
    rainAudio.currentTime = 0;
  }

  if (scene) {
    scene.background = daySkyColor.clone();

    originalLights.forEach(({ light, intensity, color }) => {
      light.intensity = intensity;
      light.color.copy(color);
      light.castShadow = true;
    });
  }
}
