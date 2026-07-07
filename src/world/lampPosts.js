import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const lampLoader = new GLTFLoader();
const lampPosts = [];

const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16); 
const glowColor = new THREE.Color(0xffc36a);
const lightColor = 0xffb35a;

// lampposts on main street
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
  { x: 26, z: -32, rotationY: 0 },           
  //{ x: -12, z: -48, rotationY: -Math.PI / 4 }  
];

const worldTwoLamps = [
  // left lamp
  { x: 232.5, z: -260.0, rotationY: -Math.PI/4, groundY: 28.75 },
  // right lamp
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
    child.castShadow = false; 
    child.receiveShadow = true;
    child.material = Array.isArray(child.material)
      ? child.material.map((mat) => prepareLampMaterial(mat))
      : prepareLampMaterial(child.material);
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

function addLamp(scene, source, x, z, rotationY, sideOffset, groundY = 0.04) {
  const lamp = cloneLampModel(source);
  lamp.name = 'path-lamp-post';
  lamp.position.set(x, groundY, z);
  lamp.rotation.y = rotationY;
  lamp.scale.setScalar(1.35);

  const box = alignToGround(lamp, groundY);
  const height = box.max.y - box.min.y;
  
  const pointLight = new THREE.PointLight(lightColor, 0, 25, 2);
  
  pointLight.castShadow = false; 
  
  pointLight.position.set(0, height * 0.78, 0);
  
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
    '/models/props_cart_02.glb',
    (gltf) => {
      const lampSource = gltf.scene.getObjectByName('props_lamppost_01') ?? gltf.scene;

      mainWorldLampPaths.forEach((path) => {
        addLampsAlongPath(scene, lampSource, path);
      });

      mainWorldExtraLamps.forEach((lamp) => {
        addLamp(scene, lampSource, lamp.x, lamp.z, lamp.rotationY, 0);
      });

      // MODIFICA: Li carichiamo con le coordinate manuali per il Mondo 2
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

export function updateLampPosts(stormProgress) {
  const activation = THREE.MathUtils.smoothstep(stormProgress, 0.35, 0.85);

  lampPosts.forEach(({ pointLight }) => {
    // La luce si accende solo visivamente (intensità), ma senza creare texture d'ombra
    pointLight.color.setHex(lightColor);
    pointLight.intensity = activation * 5.0;  // TODO: change intesity
    
    // Assicuriamoci che castShadow resti sempre falso
    pointLight.castShadow = false; 
  });
}