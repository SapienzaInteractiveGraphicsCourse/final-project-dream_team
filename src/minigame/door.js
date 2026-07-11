import './puzzle.css';

const DOOR_DIFFICULTIES = {
  easy: { label: 'Easy', sequenceLength: 4 },
  medium: { label: 'Medium', sequenceLength: 6 },
  hard: { label: 'Hard', sequenceLength: 8 }
};

const ACCEPTED_KEYS = 'abcdefghijklmnopqrstuvwxyz'.split('');

function getDoorConfig(difficulty) {
  return DOOR_DIFFICULTIES[difficulty] ?? DOOR_DIFFICULTIES.medium;
}

function createRandomSequence(length) {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * ACCEPTED_KEYS.length);
    return ACCEPTED_KEYS[index];
  });
}

export function createDoorMinigame({
  difficulty = 'medium',
  title = 'Magic Door Lock',
  instruction = 'Repeat the magical key sequence to open the door.',
  allowClose = true,
  onSolved = () => {},
  onClose = () => {}
} = {}) {
  let config = getDoorConfig(difficulty);
  let doorSequence = createRandomSequence(config.sequenceLength);
  let currentIndex = 0;
  let isOpen = false;
  let isSolved = false;

  const overlay = document.createElement('div');
  overlay.className = 'door-minigame-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <section class="door-minigame-panel" role="dialog" aria-modal="true" aria-labelledby="door-minigame-title">
      <div class="puzzle-header">
        <div>
          <p class="puzzle-kicker">Shrek's house</p>
          <h2 id="door-minigame-title">${title}</h2>
        </div>
        <button class="puzzle-close" type="button" aria-label="Close door puzzle">x</button>
      </div>
      <p class="puzzle-instruction">${instruction}</p>
      <div class="puzzle-meta">
        <span data-door-difficulty>${config.label}</span>
        <span>Keys: <strong data-door-length>${config.sequenceLength}</strong></span>
      </div>
      <div class="door-sequence" data-door-sequence></div>
      <p class="door-feedback" data-door-feedback>Press the first key...</p>
    </section>
  `;

  const closeButton = overlay.querySelector('.puzzle-close');
  const difficultyText = overlay.querySelector('[data-door-difficulty]');
  const lengthText = overlay.querySelector('[data-door-length]');
  const sequenceContainer = overlay.querySelector('[data-door-sequence]');
  const feedbackText = overlay.querySelector('[data-door-feedback]');

  closeButton.hidden = !allowClose;

  function updateDifficulty(nextDifficulty) {
    config = getDoorConfig(nextDifficulty);
    difficulty = nextDifficulty;
    difficultyText.textContent = config.label;
    lengthText.textContent = String(config.sequenceLength);
  }

  function updateSequenceUI() {
    sequenceContainer.innerHTML = '';
    doorSequence.forEach((key, index) => {
      const keyElement = document.createElement('span');
      keyElement.className = 'door-key';
      keyElement.textContent = key.toUpperCase();
      if (index < currentIndex) keyElement.classList.add('completed');
      if (index === currentIndex) keyElement.classList.add('current');
      sequenceContainer.append(keyElement);
      if (index < doorSequence.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'door-arrow';
        arrow.textContent = '>';
        sequenceContainer.append(arrow);
      }
    });
  }

  function reset() {
    currentIndex = 0;
    isSolved = false;
    doorSequence = createRandomSequence(config.sequenceLength);
    feedbackText.textContent = 'Press the first key...';
    updateSequenceUI();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    onClose();
  }

  function complete() {
    isSolved = true;
    feedbackText.textContent = 'The magic lock opens!';
    setTimeout(() => {
      close();
      onSolved({ difficulty, sequenceLength: doorSequence.length });
    }, 700);
  }

  function handleKeyPress(event) {
    if (!isOpen || isSolved) return;
    const pressedKey = event.key.toLowerCase();
    if (!ACCEPTED_KEYS.includes(pressedKey)) return;

    event.preventDefault();
    event.stopPropagation();

    if (pressedKey === doorSequence[currentIndex]) {
      currentIndex += 1;
      feedbackText.textContent = 'Correct!';
      updateSequenceUI();
      if (currentIndex === doorSequence.length) complete();
      return;
    }

    currentIndex = 0;
    feedbackText.textContent = 'Wrong key. Start again.';
    updateSequenceUI();
  }

  function open(nextDifficulty = difficulty) {
    if (isOpen) return;
    updateDifficulty(nextDifficulty);
    reset();
    isOpen = true;
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (allowClose && event.target === overlay) close();
  });
  window.addEventListener('keydown', handleKeyPress, true);

  document.body.append(overlay);

  return { open, close, isOpen: () => isOpen, setDifficulty: updateDifficulty };
}