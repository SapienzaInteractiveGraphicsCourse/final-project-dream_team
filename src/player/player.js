import * as THREE from 'three';
import { enableShadows } from '../base/helpers.js';

export function createPlayer(scene, materials) {
  const player = new THREE.Group();

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.05;
  player.add(bodyGroup);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.6, 10, 24),
    materials.playerShirt
  );
  torso.position.y = 1.15;
  torso.scale.set(1.05, 1.05, 0.85);
  bodyGroup.add(torso);

  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 0.95, 32, 1, true),
    materials.playerHat
  );
  cloak.position.set(0, 1.08, -0.08);
  cloak.rotation.x = Math.PI;
  cloak.scale.set(1, 1, 0.65);
  bodyGroup.add(cloak);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.1, 0.38),
    materials.playerBelt
  );
  belt.position.y = 0.95;
  bodyGroup.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.11, 0.045),
    materials.gold
  );
  buckle.position.set(0, 0.95, 0.21);
  bodyGroup.add(buckle);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.16, 16),
    materials.playerSkin
  );
  neck.position.y = 1.55;
  bodyGroup.add(neck);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 32, 32),
    materials.playerSkin
  );
  head.position.y = 1.82;
  head.scale.set(0.95, 1.08, 0.92);
  bodyGroup.add(head);

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 16, 16),
    materials.playerSkin
  );
  nose.position.set(0, 1.79, 0.275);
  nose.scale.set(0.8, 0.65, 1.25);
  bodyGroup.add(nose);

  const leftEar = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.22, 16),
    materials.playerSkin
  );
  leftEar.position.set(-0.29, 1.83, 0.02);
  leftEar.rotation.z = Math.PI / 2;
  leftEar.rotation.y = -0.25;
  bodyGroup.add(leftEar);

  const rightEar = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.22, 16),
    materials.playerSkin
  );
  rightEar.position.set(0.29, 1.83, 0.02);
  rightEar.rotation.z = -Math.PI / 2;
  rightEar.rotation.y = 0.25;
  bodyGroup.add(rightEar);

  const leftEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 16),
    materials.playerEye
  );
  leftEye.position.set(-0.1, 1.88, 0.255);
  bodyGroup.add(leftEye);

  const rightEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 16),
    materials.playerEye
  );
  rightEye.position.set(0.1, 1.88, 0.255);
  bodyGroup.add(rightEye);

  const leftPupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.021, 12, 12),
    materials.playerPupil
  );
  leftPupil.position.set(-0.1, 1.875, 0.295);
  bodyGroup.add(leftPupil);

  const rightPupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.021, 12, 12),
    materials.playerPupil
  );
  rightPupil.position.set(0.1, 1.875, 0.295);
  bodyGroup.add(rightPupil);

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.008, 8, 24, Math.PI),
    materials.playerPupil
  );
  smile.position.set(0, 1.72, 0.285);
  smile.rotation.z = Math.PI;
  bodyGroup.add(smile);

  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.055, 32),
    materials.playerHat
  );
  hatBrim.position.y = 2.08;
  bodyGroup.add(hatBrim);

  const hatCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.65, 32),
    materials.playerHat
  );
  hatCone.position.y = 2.42;
  hatCone.rotation.z = -0.16;
  bodyGroup.add(hatCone);

  const hatStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.07),
    materials.gold
  );
  hatStar.position.set(0.11, 2.52, 0.22);
  bodyGroup.add(hatStar);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.34, 1.38, 0);
  bodyGroup.add(leftArmPivot);

  const leftSleeve = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 0.38, 8, 16),
    materials.playerShirt
  );
  leftSleeve.position.y = -0.23;
  leftSleeve.rotation.z = 0.1;
  leftArmPivot.add(leftSleeve);

  const leftHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 16, 16),
    materials.playerSkin
  );
  leftHand.position.y = -0.48;
  leftArmPivot.add(leftHand);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.34, 1.38, 0);
  bodyGroup.add(rightArmPivot);

  const rightSleeve = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 0.38, 8, 16),
    materials.playerShirt
  );
  rightSleeve.position.y = -0.23;
  rightSleeve.rotation.z = -0.1;
  rightArmPivot.add(rightSleeve);

  const rightHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 16, 16),
    materials.playerSkin
  );
  rightHand.position.y = -0.48;
  rightArmPivot.add(rightHand);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.14, 0.78, 0);
  bodyGroup.add(leftLegPivot);

  const leftLeg = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 0.42, 8, 16),
    materials.playerPants
  );
  leftLeg.position.y = -0.24;
  leftLegPivot.add(leftLeg);

  const leftFoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.1, 0.34),
    materials.playerPants
  );
  leftFoot.position.set(0, -0.5, 0.08);
  leftFoot.rotation.x = -0.08;
  leftLegPivot.add(leftFoot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.14, 0.78, 0);
  bodyGroup.add(rightLegPivot);

  const rightLeg = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 0.42, 8, 16),
    materials.playerPants
  );
  rightLeg.position.y = -0.24;
  rightLegPivot.add(rightLeg);

  const rightFoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.1, 0.34),
    materials.playerPants
  );
  rightFoot.position.set(0, -0.5, 0.08);
  rightFoot.rotation.x = -0.08;
  rightLegPivot.add(rightFoot);

  const staffPivot = new THREE.Group();
  staffPivot.position.set(0.47, 1.18, 0.02);
  bodyGroup.add(staffPivot);

  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.35, 12),
    materials.wood
  );
  staff.position.y = -0.25;
  staff.rotation.z = 0.12;
  staffPivot.add(staff);

  const staffCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.12),
    materials.magicBlue
  );
  staffCrystal.position.set(0.08, 0.46, 0);
  staffPivot.add(staffCrystal);

  player.position.set(0, 0.45, 2.2);
  player.rotation.y = Math.PI;

  enableShadows(player);
  scene.add(player);

  return {
    group: player,
    parts: {
      bodyGroup,
      torso,
      head,
      hatCone,
      staffCrystal,
      leftArm: leftArmPivot,
      rightArm: rightArmPivot,
      leftLeg: leftLegPivot,
      rightLeg: rightLegPivot
    }
  };
}