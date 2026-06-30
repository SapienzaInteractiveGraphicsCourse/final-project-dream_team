import * as THREE from 'three';
import { animatePlayer } from '../player/schoolBoyPlayer.js';

export function createPlayerController(playerObject, camera, colliders = []) {
  const player = playerObject.group;
  const playerRadius = 0.55;
  const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    arrowleft: false,
    arrowright: false,
    arrowup: false,
    arrowdown: false
  };

  let cameraAngle = 0;
  let cameraDistance = 9;

  const cameraMinDistance = 2.5;
  const cameraMaxDistance = 30;
  const cameraHeight = 4.2;
  const cameraLookHeight = 2.4;

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (key in keys) {
      event.preventDefault();
      keys[key] = true;
    }
  });

  window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();

    if (key in keys) {
      event.preventDefault();
      keys[key] = false;
    }
  });

  function circleIntersectsBoxXZ(x, z, radius, box) {
    const closestX = THREE.MathUtils.clamp(x, box.min.x, box.max.x);
    const closestZ = THREE.MathUtils.clamp(z, box.min.z, box.max.z);
    const dx = x - closestX;
    const dz = z - closestZ;

    return dx * dx + dz * dz < radius * radius;
  }

  function collidesAt(x, z) {
    return colliders.some((box) => {
      const isCollidingNow = circleIntersectsBoxXZ(
        player.position.x,
        player.position.z,
        playerRadius,
        box
      );
      const wouldCollide = circleIntersectsBoxXZ(x, z, playerRadius, box);

      return wouldCollide && !isCollidingNow;
    });
  }

  function update(deltaTime, canMove = true) {
    const speed = 16; // 4
    const cameraRotationSpeed = 2.2;
    const cameraZoomSpeed = 5;

    if (keys.arrowleft) {
      cameraAngle += cameraRotationSpeed * deltaTime;
    }

    if (keys.arrowright) {
      cameraAngle -= cameraRotationSpeed * deltaTime;
    }

    if (keys.arrowup) {
      cameraDistance -= cameraZoomSpeed * deltaTime;
    }

    if (keys.arrowdown) {
      cameraDistance += cameraZoomSpeed * deltaTime;
    }

    cameraDistance = THREE.MathUtils.clamp(
      cameraDistance,
      cameraMinDistance,
      cameraMaxDistance
    );

    const forward = new THREE.Vector3(
      Math.sin(cameraAngle),
      0,
      Math.cos(cameraAngle)
    );

    const right = new THREE.Vector3(
      Math.cos(cameraAngle),
      0,
      -Math.sin(cameraAngle)
    );

    const moveDirection = new THREE.Vector3();
    let isMoving = false;

    if (canMove) {
      if (keys.w) {
        moveDirection.sub(forward);
      }

      if (keys.s) {
        moveDirection.add(forward);
      }

      if (keys.a) {
        moveDirection.sub(right);
      }

      if (keys.d) {
        moveDirection.add(right);
      }

      isMoving = moveDirection.length() > 0;

      if (isMoving) {
        moveDirection.normalize();

        const nextX = player.position.x + moveDirection.x * speed * deltaTime;
        const nextZ = player.position.z + moveDirection.z * speed * deltaTime;

        if (!collidesAt(nextX, player.position.z)) {
          player.position.x = nextX;
        }

        if (!collidesAt(player.position.x, nextZ)) {
          player.position.z = nextZ;
        }

        player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
      }
    }

    animatePlayer(playerObject, isMoving, performance.now() * 0.001);

    const maxDistance = 420;
    const distanceFromCenter = Math.sqrt(
      player.position.x * player.position.x +
      player.position.z * player.position.z
    );

    if (distanceFromCenter > maxDistance) {
      player.position.x *= maxDistance / distanceFromCenter;
      player.position.z *= maxDistance / distanceFromCenter;
    }

    const cameraOffset = new THREE.Vector3(
      Math.sin(cameraAngle) * cameraDistance,
      cameraHeight,
      Math.cos(cameraAngle) * cameraDistance
    );

    const desiredCameraPosition = player.position.clone().add(cameraOffset);

    camera.position.lerp(desiredCameraPosition, 0.08);

    camera.lookAt(
      player.position.x,
      player.position.y + cameraLookHeight,
      player.position.z
    );
  }

  return {
    update
  };
}
