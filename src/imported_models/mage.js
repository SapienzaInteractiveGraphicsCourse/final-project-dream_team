
export function updateModels(deltaTime, player) {
  if (!mage) return;

  const time = performance.now() * 0.001;

  mage.position.y = mageStartY + Math.sin(time * 2) * 0.12;
  mage.rotation.y += Math.sin(time * 3) * 0.002;

  const distance = mage.position.distanceTo(player.position);
  const interactionDistance = 2;

  canTalkToMage = distance < interactionDistance;

  if (canTalkToMage) {
    mage.lookAt(player.position.x, mage.position.y, player.position.z);
  }

  if (mageIsTalking) {
    mageTalkTimer -= deltaTime;

    if (mageTalkTimer <= 0) {
      mageIsTalking = false;
    }
  }

  if (mageIsTalking) {
    mageDialogue.textContent = 'Mago: Finalmente sei arrivato. La magia dell isola ti stava aspettando.';
    mageDialogue.classList.add('is-visible');
  } else if (canTalkToMage) {
    mageDialogue.textContent = 'Premi E per parlare con il mago';
    mageDialogue.classList.add('is-visible');
  } else {
    mageDialogue.classList.remove('is-visible');
  }
  if (canTalkToMage) {
    mage.lookAt(player.position.x, mage.position.y, player.position.z);

    if (mageIsTalking) {
      setMageBrightness(0.25);
    } else {
      setMageBrightness(0.08);
    }
  } else {
    setMageBrightness(0);
  }
}
