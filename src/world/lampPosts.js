import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const lampLoader = new GLTFLoader();
const lampPosts = [];
const glowGeometry = new THREE.SphereGeometry(0.28, 16, 12);
const glowColor = new THREE.Color(0xffc36a);
const lightColor = 0xffb35a;

const mainWorldLampPaths = [
  { start: [0, 26], end: [10, -30], count: 2 },
  { start: [0, 26], end: [50, 30], count: 2 },
  { start: [0, 26], end: [-42, 68], count: 2 },
  {
    start: [10, -30],
    end: [-30, -70],
    placements: [
      { t: 0.33, side: -1 },
      { t: 0.55, side: 1 }
    ]
  }
];

const mainWorldExtraLamps = [
  { x: 38, z: -24, rotationY: Math.PI / 3 }
];

function cloneLampModel(source) {
  const clone = source.clone(true);

  clone.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
  });

  return clone;
}

function alignToGround(model, groundY) {
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  model.position.y += groundY - box.min.y;
  model.updateMatrixWorld(true);

  return new THREE.Box3().setFromObject(model);
}

function createGlow(model, box) {
  const height = box.max.y - box.min.y;
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: glowColor,
    transparent: true,
    opacity: 0
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);

  glow.position.set(0, height * 0.78, 0);
  glow.visible = false;
  model.add(glow);

  return glow;
}

function collectEmissiveMaterials(model) {
  const materials = [];

  model.traverse((child) => {
    if (!child.isMesh) return;

    const meshMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    meshMaterials.forEach((material) => {
      if (!material || !material.emissive) return;
      material.emissive.set(0x000000);
      material.emissiveIntensity = 0;
      materials.push(material);
    });
  });

  return materials;
}

function addLamp(scene, source, x, z, rotationY, sideOffset, groundY = 0.49) {
  const lamp = cloneLampModel(source);

  lamp.name = 'path-lamp-post';
  lamp.position.set(x, groundY, z);
  lamp.rotation.y = rotationY;
  lamp.scale.setScalar(1.35);

  const box = alignToGround(lamp, groundY);
  const glow = createGlow(lamp, box);
  const pointLight = new THREE.PointLight(lightColor, 0, 18, 2.1);

  pointLight.castShadow = true;
  pointLight.shadow.mapSize.set(512, 512);
  pointLight.shadow.camera.near = 0.4;
  pointLight.shadow.camera.far = 18;
  pointLight.shadow.bias = -0.002;
  pointLight.shadow.normalBias = 0.04;
  pointLight.position.copy(glow.position);
  lamp.add(pointLight);
  scene.add(lamp);

  lampPosts.push({
    lamp,
    glow,
    glowMaterial: glow.material,
    pointLight,
    emissiveMaterials: collectEmissiveMaterials(lamp),
    sideOffset
  });
}

function addLampsAlongPath(scene, source, path) {
  const [startX, startZ] = path.start;
  const [endX, endZ] = path.end;
  const dx = endX - startX;
  const dz = endZ - startZ;
  const length = Math.hypot(dx, dz);

  if (length === 0) return;

  const directionX = dx / length;
  const directionZ = dz / length;
  const normalX = directionZ;
  const normalZ = -directionX;
  const sideDistance = path.sideDistance ?? 7.5;
  const groundY = path.groundY ?? 0.49;

  const placements = path.placements ?? Array.from(
    { length: path.count },
    (_, i) => ({
      t: (i + 1) / (path.count + 1),
      side: i % 2 === 0 ? -1 : 1
    })
  );

  placements.forEach(({ t, side }) => {
    const centerX = THREE.MathUtils.lerp(startX, endX, t);
    const centerZ = THREE.MathUtils.lerp(startZ, endZ, t);
    const sideX = normalX * side;
    const sideZ = normalZ * side;
    const x = centerX + sideX * sideDistance;
    const z = centerZ + sideZ * sideDistance;
    const rotationY = Math.atan2(-sideX, -sideZ);

    addLamp(scene, source, x, z, rotationY, side, groundY);
  });
}

export function createLampPosts(scene) {
  lampLoader.load(
    '/models/stylized_lamp_post.glb',
    (gltf) => {
      mainWorldLampPaths.forEach((path) => {
        addLampsAlongPath(scene, gltf.scene, path);
      });

      mainWorldExtraLamps.forEach((lamp) => {
        addLamp(scene, gltf.scene, lamp.x, lamp.z, lamp.rotationY, 0);
      });
    },
    undefined,
    (error) => {
      console.error('Error loading lamp post model:', error);
    }
  );
}

export function updateLampPosts(stormProgress) {
  const activation = THREE.MathUtils.smoothstep(stormProgress, 0.35, 0.85);

  lampPosts.forEach(({ glow, glowMaterial, pointLight, emissiveMaterials }) => {
    const isOn = activation > 0.02;

    glow.visible = isOn;
    glowMaterial.opacity = activation * 0.95;
    pointLight.intensity = activation * 2.2;

    emissiveMaterials.forEach((material) => {
      material.emissive.copy(glowColor);
      material.emissiveIntensity = activation * 0.9;
    });
  });
}
