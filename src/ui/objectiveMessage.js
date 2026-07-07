const objectiveMessage = document.createElement('div');
objectiveMessage.className = 'objective-message';
document.body.appendChild(objectiveMessage);

let hideTimeout = null;

export function showObjectiveMessage(text, duration = 3600) {
  objectiveMessage.textContent = text;
  objectiveMessage.classList.add('is-visible');

  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }

  hideTimeout = setTimeout(() => {
    objectiveMessage.classList.remove('is-visible');
    hideTimeout = null;
  }, duration);
}
