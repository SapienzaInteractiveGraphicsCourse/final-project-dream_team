import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const assetLoadingManager = new THREE.LoadingManager();

export function createGltfLoader() {
  const loader = new GLTFLoader(assetLoadingManager);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}
