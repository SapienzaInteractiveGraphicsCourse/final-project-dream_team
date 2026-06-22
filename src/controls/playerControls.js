import * as THREE from 'three';

export function createPlayerController(player, playerParts, camera) {
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
  let cameraDistance = 20;

  const cameraMinDistance = 2.5;
  const cameraMaxDistance = 27;
  const cameraHeight = 3.2;
  const cameraLookHeight = 1.2;

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

  function update(deltaTime) {
    const speed = 2.5;
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

    const isMoving = moveDirection.length() > 0;

    if (isMoving) {
      moveDirection.normalize();

      player.position.x += moveDirection.x * speed * deltaTime;
      player.position.z += moveDirection.z * speed * deltaTime;

      player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);

      const walkTime = Date.now() * 0.01;

      playerParts.leftLeg.rotation.x = Math.sin(walkTime) * 0.55;
      playerParts.rightLeg.rotation.x = -Math.sin(walkTime) * 0.55;

      playerParts.leftArm.rotation.x = -Math.sin(walkTime) * 0.45;
      playerParts.rightArm.rotation.x = Math.sin(walkTime) * 0.45;

      if (playerParts.bodyGroup) {
        playerParts.bodyGroup.position.y = Math.sin(walkTime * 2) * 0.025;
      }

      if (playerParts.hatCone) {
        playerParts.hatCone.rotation.z = -0.16 + Math.sin(walkTime) * 0.04;
      }

      if (playerParts.staffCrystal) {
        playerParts.staffCrystal.rotation.y += 0.04;
      }
    } else {
      playerParts.leftLeg.rotation.x *= 0.8;
      playerParts.rightLeg.rotation.x *= 0.8;

      playerParts.leftArm.rotation.x *= 0.8;
      playerParts.rightArm.rotation.x *= 0.8;

      const idleTime = Date.now() * 0.003;

      player.position.y = 0.45 + Math.sin(idleTime) * 0.025;

      if (playerParts.head) {
        playerParts.head.rotation.y = Math.sin(idleTime) * 0.08;
      }

      if (playerParts.staffCrystal) {
        playerParts.staffCrystal.rotation.y += 0.025;
      }
    }

    const maxDistance = 4.5;
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