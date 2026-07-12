import * as CANNON from 'cannon-es';
import * as THREE from 'three';

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -24, 0)
});

world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

const fixedTimeStep = 1 / 60;
const maxSubSteps = 3;
const groundMaterial = new CANNON.Material('tower-ground');
const towerMaterial = new CANNON.Material('tower-body');
const playerFallMaterial = new CANNON.Material('falling-player');
const propMaterial = new CANNON.Material('physics-prop');
const contactMaterial = new CANNON.ContactMaterial(groundMaterial, towerMaterial, {
  friction: 0.82,
  restitution: 0.08
});
const propContactMaterial = new CANNON.ContactMaterial(groundMaterial, propMaterial, {
  friction: 0.74,
  restitution: 0.18
});

world.addContactMaterial(contactMaterial);
world.addContactMaterial(propContactMaterial);

let groundBody = null;
let towerBody = null;
let towerObject = null;
let towerLocalPosition = null;
let towerLocalQuaternion = null;
let playerFallBody = null;
let playerFallObject = null;
let propGroundBody = null;
const physicsProps = [];
let isActive = false;
let physicsTime = 0;

const towerBox = new THREE.Box3();
const towerSize = new THREE.Vector3();
const towerCenter = new THREE.Vector3();
const towerWorldPosition = new THREE.Vector3();
const towerQuaternion = new THREE.Quaternion();
const inverseTowerQuaternion = new THREE.Quaternion();
const shapeOffset = new THREE.Vector3();
const towerEuler = new THREE.Euler();

function copyCannonPositionToThree(source, target) {
  target.set(source.x, source.y, source.z);
}

function copyCannonQuaternionToThree(source, target) {
  target.set(source.x, source.y, source.z, source.w);
}

function ensureGroundBody(center, size) {
  if (groundBody) return;

  const groundHalfExtents = new CANNON.Vec3(
    Math.max(size.x * 1.1, 24),
    1,
    Math.max(size.z * 1.1, 24)
  );

  groundBody = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
    shape: new CANNON.Box(groundHalfExtents),
    position: new CANNON.Vec3(center.x, center.y - size.y * 0.5 - 0.95, center.z)
  });

  world.addBody(groundBody);
}

function ensurePropGroundBody(center, groundY) {
  if (propGroundBody) return;

  propGroundBody = new CANNON.Body({
    mass: 0,
    material: groundMaterial,
    shape: new CANNON.Box(new CANNON.Vec3(42, 1, 42)),
    position: new CANNON.Vec3(center.x, groundY - 1, center.z)
  });

  world.addBody(propGroundBody);
}

export function startTowerFall(object, options = {}) {
  if (!object || towerBody) return false;

  object.updateMatrixWorld(true);
  towerBox.setFromObject(object);

  if (towerBox.isEmpty()) return false;

  towerBox.getSize(towerSize);
  towerBox.getCenter(towerCenter);

  object.getWorldPosition(towerWorldPosition);
  object.getWorldQuaternion(towerQuaternion);
  inverseTowerQuaternion.copy(towerQuaternion).invert();
  shapeOffset.copy(towerCenter).sub(towerWorldPosition).applyQuaternion(inverseTowerQuaternion);
  ensureGroundBody(towerCenter, towerSize);

  const halfExtents = new CANNON.Vec3(
    Math.max(towerSize.x * 0.46, 1),
    Math.max(towerSize.y * 0.5, 1),
    Math.max(towerSize.z * 0.46, 1)
  );

  towerBody = new CANNON.Body({
    mass: options.mass ?? 38,
    material: towerMaterial,
    position: new CANNON.Vec3(towerWorldPosition.x, towerWorldPosition.y, towerWorldPosition.z),
    quaternion: new CANNON.Quaternion(
      towerQuaternion.x,
      towerQuaternion.y,
      towerQuaternion.z,
      towerQuaternion.w
    ),
    angularDamping: 0.12,
    linearDamping: 0.04
  });

  towerBody.addShape(
    new CANNON.Box(halfExtents),
    new CANNON.Vec3(shapeOffset.x, shapeOffset.y, shapeOffset.z)
  );

  towerBody.allowSleep = false;
  world.addBody(towerBody);

  towerObject = object;
  towerLocalPosition = object.position.clone();
  towerLocalQuaternion = object.quaternion.clone();
  isActive = true;
  physicsTime = 0;

  const impulse = options.impulse ?? new CANNON.Vec3(0, 0, -320);
  const impulsePoint = options.impulsePoint ?? new CANNON.Vec3(
    towerCenter.x + towerSize.x * 0.25,
    towerCenter.y + towerSize.y * 0.35,
    towerCenter.z
  );

  towerBody.applyImpulse(impulse, impulsePoint);
  towerBody.angularVelocity.set(options.angularX ?? 0.9, options.angularY ?? 0.18, options.angularZ ?? -0.65);

  return true;
}

export function updatePhysicsWorld(deltaTime) {
  if (!towerBody && !playerFallBody && physicsProps.length === 0) return;

  physicsTime += deltaTime;
  world.step(fixedTimeStep, deltaTime, maxSubSteps);

  if (towerBody && towerObject) {
    copyCannonPositionToThree(towerBody.position, towerObject.position);
    copyCannonQuaternionToThree(towerBody.quaternion, towerObject.quaternion);
  }

  if (playerFallBody && playerFallObject) {
    copyCannonPositionToThree(playerFallBody.position, playerFallObject.position);
  }

  physicsProps.forEach(({ body, object }) => {
    copyCannonPositionToThree(body.position, object.position);
    copyCannonQuaternionToThree(body.quaternion, object.quaternion);
  });
}

export function addPhysicsBox(object, options = {}) {
  if (!object) return null;

  object.updateMatrixWorld(true);

  const size = options.size ?? new THREE.Vector3(1, 1, 1);
  const halfExtents = new CANNON.Vec3(size.x * 0.5, size.y * 0.5, size.z * 0.5);
  const groundY = options.groundY ?? object.position.y;
  ensurePropGroundBody(object.position, groundY);

  const body = new CANNON.Body({
    mass: options.mass ?? 1,
    material: propMaterial,
    shape: new CANNON.Box(halfExtents),
    position: new CANNON.Vec3(object.position.x, object.position.y, object.position.z),
    quaternion: new CANNON.Quaternion(
      object.quaternion.x,
      object.quaternion.y,
      object.quaternion.z,
      object.quaternion.w
    ),
    linearDamping: options.linearDamping ?? 0.18,
    angularDamping: options.angularDamping ?? 0.28
  });

  body.velocity.set(
    options.velocityX ?? 0,
    options.velocityY ?? 0,
    options.velocityZ ?? 0
  );
  body.angularVelocity.set(
    options.angularX ?? 0,
    options.angularY ?? 0,
    options.angularZ ?? 0
  );
  body.allowSleep = true;

  world.addBody(body);

  const prop = { body, object };
  physicsProps.push(prop);
  return prop;
}

export function removePhysicsProp(prop) {
  if (!prop) return;

  const index = physicsProps.indexOf(prop);
  if (index !== -1) {
    physicsProps.splice(index, 1);
  }

  world.removeBody(prop.body);
}

export function startPlayerPhysicsFall(player, options = {}) {
  if (!player || playerFallBody) return false;

  playerFallObject = player;
  playerFallBody = new CANNON.Body({
    mass: options.mass ?? 1,
    material: playerFallMaterial,
    shape: new CANNON.Sphere(options.radius ?? 0.45),
    position: new CANNON.Vec3(player.position.x, player.position.y, player.position.z),
    linearDamping: 0.01,
    angularDamping: 0.4
  });

  playerFallBody.velocity.set(
    options.velocityX ?? 0,
    options.velocityY ?? -3,
    options.velocityZ ?? 0
  );
  playerFallBody.allowSleep = false;
  world.addBody(playerFallBody);

  return true;
}

export function stopPlayerPhysicsFall(respawnPosition = null) {
  if (playerFallBody) {
    world.removeBody(playerFallBody);
    playerFallBody = null;
  }

  if (playerFallObject && respawnPosition) {
    playerFallObject.position.copy(respawnPosition);
  }

  playerFallObject = null;
}

export function isPlayerPhysicsFalling() {
  return Boolean(playerFallBody);
}

export function resetTowerFall() {
  if (towerBody) {
    world.removeBody(towerBody);
    towerBody = null;
  }

  if (towerObject && towerLocalPosition && towerLocalQuaternion) {
    towerObject.position.copy(towerLocalPosition);
    towerObject.quaternion.copy(towerLocalQuaternion);
    towerEuler.setFromQuaternion(towerLocalQuaternion);
    towerObject.rotation.copy(towerEuler);
  }

  towerObject = null;
  towerLocalPosition = null;
  towerLocalQuaternion = null;
  isActive = false;
  physicsTime = 0;
}

export function isTowerFallActive() {
  return isActive;
}
