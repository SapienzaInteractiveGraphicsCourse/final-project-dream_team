import * as THREE from 'three';
import { createGltfLoader } from '../base/loaders.js';
import { modelBounds, modelColliders } from './collisionRegistry.js';

const lampLoader = createGltfLoader();
const lampPosts = [];

const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16); 
const glowColor = new THREE.Color(0xffc36a);
const lightColor = 0xffb35a;
const lampLightDistance = 42;
const lampLightDecay = 2;
const lampShadowMapSize = 512;
const maxShadowCastingLamps = 2;

const mainWorldLampPaths = [
  { 
    start: [0, 26], end: [10, -30], 
    placements: [{ t: 0.2, side: -1 }, { t: 0.3, side: 1 }, { t: 0.8, side: -1 }] 
  },
  { 
    start: [0, 26], end: [50, 30], 
    placements: [{ t: 0.25, side: 1 }, { t: 0.55, side: -1 }, { t: 0.85, side: 1 }] 
  },
  { 
    start: [0, 26], end: [-42, 68], 
    placements: [{ t: 0.2, side: -1 }, { t: 0.5, side: 1 }, { t: 0.8, side: -1 }] 
  },
  {
    start: [10, -30], end: [-30, -70],
    placements: [{ t: 0.25, side: -1 }, { t: 0.5, side: 1 }, { t: 0.75, side: -1 }]
  }
];

const mainWorldExtraLamps = [
  { x: 36, z: -18, rotationY: Math.PI },
  { x: 26, z: -32, rotationY: 0 }
];

const worldTwoLamps = [

  { x: 232.5, z: -260.0, rotationY: -Math.PI/4, groundY: 28.75 },

  { x: 241.5, z: -250.5, rotationY: Math.PI , groundY: 28.75 }
];

function prepareLampMaterial(material) {
  if (!material) return null;
  const preparedMaterial = material.clone();
  
  if (preparedMaterial.map) {
    preparedMaterial.map.colorSpace = THREE.SRGBColorSpace;
    preparedMaterial.map.needsUpdate = true;
  }
  
  return preparedMaterial;
}

function cloneLampModel(source) {
  const clone = source.clone(true);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);

  clone.traverse((child) => {
    if (!child.isMesh) return;
    
    child.castShadow = true;
    child.receiveShadow = true;
    child.material = Array.isArray(child.material)
      ? child.material.map((mat) => prepareLampMaterial(mat))
      : prepareLampMaterial(child.material);
  });

  return clone;
}

function configureLampShadow(pointLight) {
  pointLight.castShadow = false;
  pointLight.shadow.mapSize.set(lampShadowMapSize, lampShadowMapSize);
  pointLight.shadow.camera.near = 0.25;
  pointLight.shadow.camera.far = pointLight.distance;
  pointLight.shadow.bias = -0.001;
  pointLight.shadow.normalBias = 0.04;
}

function skipOwnLampShadow(lamp, pointLight) {
  pointLight.shadow.camera.userData.skipLampUuid = lamp.uuid;

  lamp.traverse((child) => {
    if (!child.isMesh) return;

    const previousBeforeShadow = child.onBeforeShadow;
    const previousAfterShadow = child.onAfterShadow;

    child.onBeforeShadow = function onBeforeLampShadow(
      renderer,
      object,
      camera,
      shadowCamera,
      geometry,
      depthMaterial,
      group
    ) {
      previousBeforeShadow.call(this, renderer, object, camera, shadowCamera, geometry, depthMaterial, group);

      if (shadowCamera.userData.skipLampUuid !== lamp.uuid) return;

      child.userData.lampShadowMaterialState = {
        colorWrite: depthMaterial.colorWrite,
        depthWrite: depthMaterial.depthWrite,
        depthTest: depthMaterial.depthTest
      };

      depthMaterial.colorWrite = false;
      depthMaterial.depthWrite = false;
      depthMaterial.depthTest = false;
    };

    child.onAfterShadow = function onAfterLampShadow(
      renderer,
      object,
      camera,
      shadowCamera,
      geometry,
      depthMaterial,
      group
    ) {
      const state = child.userData.lampShadowMaterialState;

      if (state) {
        depthMaterial.colorWrite = state.colorWrite;
        depthMaterial.depthWrite = state.depthWrite;
        depthMaterial.depthTest = state.depthTest;
        delete child.userData.lampShadowMaterialState;
      }

      previousAfterShadow.call(this, renderer, object, camera, shadowCamera, geometry, depthMaterial, group);
    };
  });
}

function alignToGround(model, groundY) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.position.y += groundY - box.min.y;
  model.updateMatrixWorld(true);
  
  return new THREE.Box3().setFromObject(model);
}

function getLampLightWorldPosition(lamp, box) {
  const height = box.max.y - box.min.y;
  const lanternMinY = box.min.y + height * 0.65;
  const lanternBox = new THREE.Box3();

  lamp.traverse((child) => {
    if (!child.isMesh) return;

    const childBox = new THREE.Box3().setFromObject(child);
    if (childBox.min.y >= lanternMinY) {
      lanternBox.union(childBox);
    }
  });

  const lightBox = lanternBox.isEmpty() ? box : lanternBox;
  return lightBox.getCenter(new THREE.Vector3());
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

function addLamp(scene, source, x, z, rotationY, sideOffset, groundY = 0.04) {
  const lamp = cloneLampModel(source);
  lamp.name = 'path-lamp-post';
  lamp.position.set(x, groundY, z);
  lamp.rotation.y = rotationY;
  lamp.scale.setScalar(1.35);

  const box = alignToGround(lamp, groundY);
  
  const colliderBox = box.clone();
  const center = colliderBox.getCenter(new THREE.Vector3());
  const size = colliderBox.getSize(new THREE.Vector3());
  
  size.x *= 0.4;
  size.z *= 0.4;
  
  colliderBox.setFromCenterAndSize(center, size);
  
  modelBounds.push(colliderBox);
  modelColliders.push(colliderBox);
  
  const pointLight = new THREE.PointLight(lightColor, 0, lampLightDistance, lampLightDecay);
  configureLampShadow(pointLight);
  skipOwnLampShadow(lamp, pointLight);

  const lightWorldPosition = getLampLightWorldPosition(lamp, box);
  pointLight.position.copy(lamp.worldToLocal(lightWorldPosition));
  
  lamp.add(pointLight);
  scene.add(lamp);

  lampPosts.push({ lamp, pointLight, sideOffset });
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
  const groundY = path.groundY ?? 0.04;

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
    './models_optimized/props_cart_02.glb',
    (gltf) => {
      const lampSource = gltf.scene.getObjectByName('props_lamppost_01');

      if (!lampSource) {
        console.error('Lamp post node "props_lamppost_01" not found in props_cart_02.glb');
        return;
      }

      mainWorldLampPaths.forEach((path) => {
        addLampsAlongPath(scene, lampSource, path);
      });

      mainWorldExtraLamps.forEach((lamp) => {
        addLamp(scene, lampSource, lamp.x, lamp.z, lamp.rotationY, 0);
      });

      worldTwoLamps.forEach((lamp) => {
        addLamp(scene, lampSource, lamp.x, lamp.z, lamp.rotationY, 0, lamp.groundY);
      });
    },
    undefined,
    (error) => {
      console.error('Error loading props_cart_02 lamp post model:', error);
    }
  );
}

export function updateLampPosts(stormProgress, player = null) {
  const activation = THREE.MathUtils.smoothstep(stormProgress, 0.35, 0.85);
  const playerPosition = player?.position ?? player;
  const shadowCastingLamps = new Set();

  if (activation > 0.01 && playerPosition) {
    lampPosts
      .map((lampPost) => ({
        lampPost,
        distanceSq: lampPost.lamp.position.distanceToSquared(playerPosition)
      }))
      .sort((a, b) => a.distanceSq - b.distanceSq)
      .slice(0, maxShadowCastingLamps)
      .forEach(({ lampPost }) => {
        shadowCastingLamps.add(lampPost.pointLight);
      });
  }

  lampPosts.forEach(({ pointLight }) => {
    pointLight.color.setHex(lightColor);
    pointLight.intensity = activation * 10.0;
    pointLight.castShadow = shadowCastingLamps.has(pointLight);
  });
}
