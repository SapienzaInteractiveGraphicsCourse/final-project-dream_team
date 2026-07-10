import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const VEGETATION_MODEL_PATH = './models_optimized/procedural_tree_generator.glb';

// --- DEFAULT SETTINGS ---
const DEFAULT_OPTIONS = {
  islandMargin: 12,
  pathClearance: 4,
  obstacleClearance: 5,
  placementAttempts: 160,
  castShadow: true,
  receiveShadow: true,
  yOffset: 0,
  seed: 24681357,
  tree: {
    count: 8,
    minScale: 2,
    maxScale: 4,
    minDistance: 15
  },
  bush: {
    count: 10,
    minScale: 1,
    maxScale: 3,
    minDistance: 3.2
  }
};

// --- RANDOM SEED GENERATOR ---
function createRandom(seed) {
  return function random() {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

// --- VEGETATION PROTOTYPING ---
function createNormalizedPrototype(source, options) {
  const model = source.clone(true);

  model.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = options.castShadow;
    child.receiveShadow = options.receiveShadow;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material?.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.needsUpdate = true;
      }
    });
  });

  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);

  model.position.x -= center.x;
  model.position.y -= box.min.y;
  model.position.z -= center.z;

  const wrapper = new THREE.Group();
  wrapper.name = `${source.name}_prototype`;
  wrapper.add(model);

  return wrapper;
}

function createClusterPrototype(source, children, options) {
  const sourceBox = new THREE.Box3().setFromObject(source);
  const sourceCenter = new THREE.Vector3();
  sourceBox.getCenter(sourceCenter);

  const cluster = new THREE.Group();
  cluster.name = `${source.name}_cluster`;
  cluster.add(source.clone(true));

  children.forEach((child) => {
    if (child === source) return;

    const name = child.name.toLowerCase();
    const isTreePart = name.startsWith('branch') || name.startsWith('foliage');

    if (!isTreePart) return;

    const childBox = new THREE.Box3().setFromObject(child);
    const childCenter = new THREE.Vector3();
    childBox.getCenter(childCenter);
    
    // Group children nearby to the main tree structure
    const isNearTreeLine = Math.abs(childCenter.x - sourceCenter.x) < 4.6
      && childCenter.z > sourceBox.min.z - 1.5
      && childCenter.z < sourceBox.max.z + 1.5;

    if (isNearTreeLine) {
      cluster.add(child.clone(true));
    }
  });

  return createNormalizedPrototype(cluster, options);
}

function createTreePrototypes(children, options) {
  const treeSources = children.filter((child) => /^Tree_set_[123]002_/.test(child.name));
  return treeSources.map((source) => createClusterPrototype(source, children, options));
}

function getVegetationRoot(scene) {
  return scene.getObjectByName('GLTF_SceneRootNode') ?? scene;
}

function mergeOptions(options = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    tree: { ...DEFAULT_OPTIONS.tree, ...options.tree },
    bush: { ...DEFAULT_OPTIONS.bush, ...options.bush }
  };
}

// --- UTILITIES FOR SCATTERING ---
function getIslandMetrics(island) {
  const islandTop = island?.islandTop;
  if (!islandTop) return null;

  islandTop.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(islandTop);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  return {
    center,
    radius: island.radius ?? Math.min(size.x, size.z) / 2,
    groundY: box.max.y
  };
}

function expandBoxXZ(box, clearance) {
  const expandedBox = box.clone();
  expandedBox.min.x -= clearance;
  expandedBox.max.x += clearance;
  expandedBox.min.z -= clearance;
  expandedBox.max.z += clearance;
  return expandedBox;
}

function createPathObstacleBoxes(pathGroup, clearance) {
  if (!pathGroup) return [];
  pathGroup.updateMatrixWorld(true);
  const boxes = [];
  pathGroup.traverse((child) => {
    if (!child.isMesh) return;
    const box = new THREE.Box3().setFromObject(child);
    boxes.push(expandBoxXZ(box, clearance));
  });
  return boxes;
}

function createModelObstacleBoxes(bounds, clearance) {
  return bounds.map((box) => expandBoxXZ(box, clearance));
}

function isBlockedByObstacles(point, obstacleBoxes) {
  return obstacleBoxes.some((box) => 
    point.x >= box.min.x && point.x <= box.max.x && 
    point.z >= box.min.z && point.z <= box.max.z
  );
}

function alignModelToGround(model, groundY, yOffset) {
  model.position.y = groundY + yOffset;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.position.y += groundY + yOffset - box.min.y;
}

function getRandomIslandPoint(random, islandMetrics, islandMargin) {
  const maxRadius = Math.max(islandMetrics.radius - islandMargin, 0);
  const radius = Math.sqrt(random()) * maxRadius;
  const angle = random() * Math.PI * 2;
  return {
    x: islandMetrics.center.x + Math.cos(angle) * radius,
    z: islandMetrics.center.z + Math.sin(angle) * radius
  };
}

function createPlacement({ random, placedPoints, minDistance, islandMetrics, obstacleBoxes, options }) {
  for (let attempt = 0; attempt < options.placementAttempts; attempt++) {
    const point = getRandomIslandPoint(random, islandMetrics, options.islandMargin);

    if (isBlockedByObstacles(point, obstacleBoxes)) continue;

    const overlaps = placedPoints.some((placedPoint) => {
      const dx = point.x - placedPoint.x;
      const dz = point.z - placedPoint.z;
      const requiredDistance = minDistance + placedPoint.radius;
      return dx * dx + dz * dz < requiredDistance * requiredDistance;
    });

    if (!overlaps) {
      placedPoints.push({ x: point.x, z: point.z, radius: minDistance });
      return point;
    }
  }
  return null;
}

function scatterVegetation({
  group, prototypes, count, minScale, maxScale, minDistance,
  random, placedPoints, islandMetrics, obstacleBoxes, options, colliderTargets = null
}) {
  for (let i = 0; i < count; i++) {
    const point = createPlacement({ random, placedPoints, minDistance, islandMetrics, obstacleBoxes, options });
    if (!point) continue;

    const prototype = prototypes[Math.floor(random() * prototypes.length)];
    const model = prototype.clone(true);
    const scale = THREE.MathUtils.lerp(minScale, maxScale, random());

    model.position.set(point.x, islandMetrics.groundY, point.z);
    model.rotation.y = random() * Math.PI * 2;
    model.scale.setScalar(scale);
    alignModelToGround(model, islandMetrics.groundY, options.yOffset);
    group.add(model);

    if (colliderTargets) {
      model.updateMatrixWorld(true);
      colliderTargets.push(new THREE.Box3().setFromObject(model));
    }
  }
}

// --- INITIALIZATION ---
export function createIslandVegetation(scene, config = {}) {
  const normalizedConfig = Array.isArray(config) ? { colliderTargets: config } : config;
  const { island, obstacleBounds = [], colliderTargets = [], options = {} } = normalizedConfig;
  const mergedOptions = mergeOptions(options);
  const islandMetrics = getIslandMetrics(island);
  
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  
  const group = new THREE.Group();
  group.name = 'island-vegetation';
  scene.add(group);

  if (!islandMetrics) {
    console.warn('Island data missing: vegetation cannot be placed.');
    return group;
  }

  const obstacleBoxes = [
    ...createPathObstacleBoxes(island.pathGroup, mergedOptions.pathClearance),
    ...createModelObstacleBoxes(obstacleBounds, mergedOptions.obstacleClearance)
  ];

  loader.load(
    VEGETATION_MODEL_PATH,
    (gltf) => {
      const root = getVegetationRoot(gltf.scene);
      const children = root.children.filter((child) => child.isObject3D);
      const bushSources = children.filter((child) => /^foliage_[1-7]_/.test(child.name));
      const treePrototypes = createTreePrototypes(children, mergedOptions);
      const bushPrototypes = bushSources.map((source) => createNormalizedPrototype(source, mergedOptions));
      const random = createRandom(mergedOptions.seed);
      const placedPoints = [];

      if (treePrototypes.length === 0 || bushPrototypes.length === 0) {
        console.warn('No tree or bush elements found in vegetation GLB.');
        return;
      }

      scatterVegetation({
        group, prototypes: treePrototypes, count: mergedOptions.tree.count,
        minScale: mergedOptions.tree.minScale, maxScale: mergedOptions.tree.maxScale,
        minDistance: mergedOptions.tree.minDistance, random, placedPoints,
        islandMetrics, obstacleBoxes, options: mergedOptions, colliderTargets
      });

      scatterVegetation({
        group, prototypes: bushPrototypes, count: mergedOptions.bush.count,
        minScale: mergedOptions.bush.minScale, maxScale: mergedOptions.bush.maxScale,
        minDistance: mergedOptions.bush.minDistance, random, placedPoints,
        islandMetrics, obstacleBoxes, options: mergedOptions
      });

      console.log(`Vegetation loaded: ${group.children.length} trees and bushes placed.`);
    },
    undefined,
    (error) => {
      console.error(`Error loading vegetation model: ${VEGETATION_MODEL_PATH}`, error);
    }
  );

  return group;
}