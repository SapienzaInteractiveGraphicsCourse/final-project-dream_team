import * as THREE from 'three';

const DRAGON_SHOT_SPEED = 22;
const MAGIC_SPEED = 34;
const DRAGON_SHOT_INTERVAL = 2.2;
const PROJECTILE_LIFETIME = 7;

function createProjectile(color, radius) {
  const group = new THREE.Group();
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.8, 12, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 14, 10),
    new THREE.MeshBasicMaterial({ color })
  );
  group.add(glow, core);
  return group;
}

function disposeProjectile(projectile) {
  projectile.mesh.traverse((child) => {
    child.geometry?.dispose();
    child.material?.dispose();
  });
  projectile.mesh.removeFromParent();
}

export function createDragonCombat(scene, options) {
  const dragonShots = [];
  const playerMagics = [];
  const targetPosition = new THREE.Vector3();
  const desiredDirection = new THREE.Vector3();
  let active = false;
  let shotTimer = 1.2;

  function removeProjectile(collection, index) {
    disposeProjectile(collection[index]);
    collection.splice(index, 1);
  }

  function clearProjectiles() {
    dragonShots.forEach(disposeProjectile);
    playerMagics.forEach(disposeProjectile);
    dragonShots.length = 0;
    playerMagics.length = 0;
  }

  function launchDragonShot(player) {
    const dragon = options.getDragon();
    if (!dragon) return;

    const mesh = createProjectile(0xff5a24, 0.48);
    mesh.position.copy(dragon.position);
    mesh.position.y -= 1.2;
    targetPosition.copy(player.position);
    targetPosition.y += 1.1;

    const velocity = new THREE.Vector3()
      .subVectors(targetPosition, mesh.position)
      .normalize()
      .multiplyScalar(DRAGON_SHOT_SPEED);
    dragonShots.push({ mesh, velocity, age: 0 });
    scene.add(mesh);
  }

  function launchPlayerMagic(player) {
    if (!active || playerMagics.length > 0 || !options.getDragon()) return false;

    const mesh = createProjectile(0x62f5ff, 0.38);
    mesh.position.copy(player.position);
    mesh.position.y += 1.4;

    const dragon = options.getDragon();
    const velocity = dragon.position.clone().sub(mesh.position).normalize().multiplyScalar(MAGIC_SPEED);
    playerMagics.push({ mesh, velocity, age: 0 });
    scene.add(mesh);
    return true;
  }

  function updateDragonShots(deltaTime, player) {
    for (let index = dragonShots.length - 1; index >= 0; index -= 1) {
      const projectile = dragonShots[index];
      projectile.age += deltaTime;
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaTime);
      projectile.mesh.rotation.y += deltaTime * 5;

      targetPosition.copy(player.position);
      targetPosition.y += 1.1;
      const hitPlayer = projectile.mesh.position.distanceToSquared(targetPosition) < 1.15 * 1.15;

      if (hitPlayer) {
        removeProjectile(dragonShots, index);
        options.onPlayerHit();
      } else if (projectile.age >= PROJECTILE_LIFETIME) {
        removeProjectile(dragonShots, index);
      }
    }
  }

  function updatePlayerMagics(deltaTime) {
    const dragon = options.getDragon();

    for (let index = playerMagics.length - 1; index >= 0; index -= 1) {
      const projectile = playerMagics[index];
      projectile.age += deltaTime;

      if (!dragon) {
        removeProjectile(playerMagics, index);
        continue;
      }

      desiredDirection.copy(dragon.position).sub(projectile.mesh.position).normalize();
      projectile.velocity.copy(desiredDirection).multiplyScalar(MAGIC_SPEED);
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaTime);
      projectile.mesh.rotation.y -= deltaTime * 7;

      if (projectile.mesh.position.distanceToSquared(dragon.position) < 3.2 * 3.2) {
        removeProjectile(playerMagics, index);
        options.onMagicHit();
      } else if (projectile.age >= PROJECTILE_LIFETIME) {
        removeProjectile(playerMagics, index);
      }
    }
  }

  function update(deltaTime, player) {
    if (!active) return;

    shotTimer -= deltaTime;
    if (shotTimer <= 0) {
      launchDragonShot(player);
      shotTimer = DRAGON_SHOT_INTERVAL;
    }

    updateDragonShots(deltaTime, player);
    updatePlayerMagics(deltaTime);
  }

  function setActive(nextActive) {
    if (active === nextActive) return;
    active = nextActive;
    if (active) {
      shotTimer = 1.2;
    } else {
      clearProjectiles();
    }
  }

  function reset() {
    clearProjectiles();
    shotTimer = 1.2;
  }

  return { launchPlayerMagic, reset, setActive, update };
}
