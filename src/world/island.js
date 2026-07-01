import * as THREE from 'three';

export function createIsland(scene, materials) {
  const islandTop = new THREE.Mesh(
    new THREE.CylinderGeometry(128, 128, 0.08, 12),
    materials.grass
  );

  islandTop.position.y = 0;
  islandTop.receiveShadow = true;
  scene.add(islandTop);

  const islandBottom = new THREE.Mesh(
    new THREE.ConeGeometry(50, 50, 64),
    materials.rock
  );

  islandBottom.position.y = -2.65;
  islandBottom.rotation.x = Math.PI;
  scene.add(islandBottom);

  // Creo un gruppo per contenere tutti i pezzi del sentiero
  const pathGroup = new THREE.Group();
  scene.add(pathGroup);

  // Funzione interna: crea un singolo pezzo rettangolare di sentiero con bordo
  function createPathSegment(x, z, rotationY, length, width = 8) {
    const segmentGroup = new THREE.Group();

    const border = new THREE.Mesh(
      new THREE.BoxGeometry(width + 1.1, 0.07, length + 0.7),
      materials.stone
    );

    const path = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, length),
      materials.plazaStone
    );

    border.position.y = 0.075;
    path.position.y = 0.12;

    border.receiveShadow = true;
    path.receiveShadow = true;

    segmentGroup.add(border);
    segmentGroup.add(path);

    segmentGroup.position.set(x, 0, z);
    segmentGroup.rotation.y = rotationY;
    pathGroup.add(segmentGroup);

    return segmentGroup;
  }

  // Funzione interna: crea una giunzione rotonda tra i pezzi con bordo
  function createPathJoint(x, z, radius = 5) {
    const jointGroup = new THREE.Group();

    const border = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 0.65, radius + 0.65, 0.07, 32),
      materials.stone
    );

    const joint = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.09, 32),
      materials.plazaStone
    );

    border.position.y = 0.075;
    joint.position.y = 0.12;

    border.receiveShadow = true;
    joint.receiveShadow = true;

    jointGroup.add(border);
    jointGroup.add(joint);
    jointGroup.position.set(x, 0, z);
    pathGroup.add(jointGroup);

    return jointGroup;
  }

  // Sentiero principale: parte dalla posizione iniziale del player e prosegue in avanti.
  
  // Sentiero principale: parte dalla posizione iniziale del player e prosegue rettilineo.
  createPathJoint(0, 2.2, 5.2);          // Partenza (Piazzola di Spawn)
  
  // Abbiamo raddoppiato la lunghezza da 16.4 a 32 unità, centrandola perfettamente a Z: -14
  createPathSegment(0, -14, 0, 32, 8);   
  
  // La giunzione di curva si sposta in avanti a Z: -30 per accogliere il viale lungo
  createPathJoint(0, -30, 4.9);          

  // --- I PEZZI SUCCESSIVI SI ADATTANO ALLA NUOVA GIUNZIONE A (0, -30) ---
  createPathSegment(5, -38, -Math.PI / 5, 19, 8);
  createPathJoint(10, -46, 4.9);

  createPathSegment(19, -51, -Math.PI / 2.8, 20, 8);
  createPathJoint(28, -56, 4.9);

  createPathSegment(36, -47, Math.PI / 4.2, 24, 8);
  createPathJoint(44, -38, 4.9);

  // Piccola piazzetta centrale riposizionata coerentemente lungo il percorso
  const smallPlaza = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 0.1, 24),
    materials.plazaStone
  );
  

  return {
    islandTop,
    islandBottom,
    pathGroup,
    smallPlaza
  };
}
