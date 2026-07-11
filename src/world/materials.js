import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

const plazaTexture = textureLoader.load('textures/pav3.jpg');
const grassTexture = textureLoader.load('textures/ground.jpg');

grassTexture.colorSpace = THREE.SRGBColorSpace;
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(16, 16);

plazaTexture.colorSpace = THREE.SRGBColorSpace;
plazaTexture.wrapS = THREE.RepeatWrapping;
plazaTexture.wrapT = THREE.RepeatWrapping;
plazaTexture.repeat.set(3, 3);
plazaTexture.anisotropy = 8;

const plazaTileWorldSize = 4;

export function createTiledPlazaStoneMaterial(width, length) {
  const texture = plazaTexture.clone();
  texture.needsUpdate = true;
  texture.repeat.set(
    Math.max(width / plazaTileWorldSize, 1),
    Math.max(length / plazaTileWorldSize, 1)
  );

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9
  });
}

export const materials = {
  grass: new THREE.MeshStandardMaterial({
    map: grassTexture,
    roughness: 0.9
  }),

  rock: new THREE.MeshStandardMaterial({
    color: 0x8a6a4f,
    roughness: 0.9
  }),

  plazaStone: new THREE.MeshStandardMaterial({
    map: plazaTexture,
    roughness: 0.9
  }),

  stone: new THREE.MeshStandardMaterial({
    color: 0xb8b8a8,
    roughness: 0.9
  }),

  wood: new THREE.MeshStandardMaterial({
    color: 0x7a3f16,
    roughness: 0.8
  }),

  gold: new THREE.MeshStandardMaterial({
    color: 0xffcc66,
    roughness: 0.35,
    metalness: 0.25
  }),

  magicBlue: new THREE.MeshStandardMaterial({
    color: 0x66ffff,
    emissive: 0x116666,
    emissiveIntensity: 0.55,
    roughness: 0.25
  }),

  magicPurple: new THREE.MeshStandardMaterial({
    color: 0xaa66ff,
    emissive: 0x331155,
    emissiveIntensity: 0.55,
    roughness: 0.4
  }),

  playerSkin: new THREE.MeshStandardMaterial({
    color: 0x8fd694,
    roughness: 0.75
  }),

  playerShirt: new THREE.MeshStandardMaterial({
    color: 0x3f7cff,
    roughness: 0.7
  }),

  playerPants: new THREE.MeshStandardMaterial({
    color: 0x3a2a1a,
    roughness: 0.85
  }),

  playerHat: new THREE.MeshStandardMaterial({
    color: 0x6b3fa0,
    roughness: 0.65
  }),

  playerBelt: new THREE.MeshStandardMaterial({
    color: 0x5a3218,
    roughness: 0.8
  }),

  playerEye: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4
  }),

  playerPupil: new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.5
  })
};