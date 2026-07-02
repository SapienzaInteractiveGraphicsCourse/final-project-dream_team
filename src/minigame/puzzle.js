import './puzzle.css';

const DIFFICULTIES = {
  easy: {
    label: 'Easy',
    size: 2,
    folder: 'easy_fight'
  },
  medium: {
    label: 'Medium',
    size: 3,
    folder: 'medium_fight'
  },
  hard: {
    label: 'Hard',
    size: 4,
    folder: 'hard_fight'
  }
};

function getImageUrl(folder, piece) {
  return new URL(`./images/${folder}/${piece}.jpg`, import.meta.url).href;
}

function getBlankUrl() {
  return new URL('./images/blank.png', import.meta.url).href;
}

function shuffle(items) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function makeTile(pieceId, src, className) {
  const tile = document.createElement('img');
  tile.className = className;
  tile.draggable = true;
  tile.src = src;
  tile.dataset.piece = pieceId;
  return tile;
}

export function getPuzzleDifficulties() {
  return DIFFICULTIES;
}

export function createPuzzleMinigame({
  difficulty = 'medium',
  title = 'Rebuild the spell',
  instruction = '',
  allowClose = true,
  onSolved = () => {},
  onClose = () => {}
} = {}) {
  const config = DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium;
  const totalPieces = config.size * config.size;
  const orderedPieces = Array.from({ length: totalPieces }, (_, index) => String(index + 1));

  let turns = 0;
  let selectedTile = null;
  let isOpen = false;
  let isSolved = false;

  const overlay = document.createElement('div');
  overlay.className = 'puzzle-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  overlay.innerHTML = `
    <section class="puzzle-panel" role="dialog" aria-modal="true" aria-labelledby="puzzle-title">
      <div class="puzzle-header">
        <div>
          <p class="puzzle-kicker">Dragon fight</p>
          <h2 id="puzzle-title">${title}</h2>
        </div>
        <button class="puzzle-close" type="button" aria-label="Close puzzle">x</button>
      </div>
      ${instruction ? `<p class="puzzle-instruction">${instruction}</p>` : ''}
      <div class="puzzle-meta">
        <span>${config.label}</span>
        <span>Turns: <strong data-puzzle-turns>0</strong></span>
      </div>
      <div class="puzzle-board-wrap">
        <div class="puzzle-board" data-puzzle-board></div>
      </div>
      <div class="puzzle-pieces" data-puzzle-pieces></div>
      <p class="puzzle-result" data-puzzle-result></p>
    </section>
  `;

  const closeButton = overlay.querySelector('.puzzle-close');
  const board = overlay.querySelector('[data-puzzle-board]');
  const pieces = overlay.querySelector('[data-puzzle-pieces]');
  const turnsText = overlay.querySelector('[data-puzzle-turns]');
  const resultText = overlay.querySelector('[data-puzzle-result]');

  board.style.setProperty('--puzzle-size', config.size);
  closeButton.hidden = !allowClose;

  function updateTurns() {
    turnsText.textContent = String(turns);
  }

  function checkSolved() {
    const boardTiles = [...board.querySelectorAll('.puzzle-tile')];
    const solved = boardTiles.every((tile, index) => tile.dataset.piece === orderedPieces[index]);

    if (!solved || isSolved) return;

    isSolved = true;
    resultText.textContent = 'Spell completed. The dragon takes a hit!';

    setTimeout(() => {
      close();
      onSolved({
        difficulty,
        turns
      });
    }, 650);
  }

  function swapTiles(firstTile, secondTile) {
    const firstSrc = firstTile.src;
    const firstPiece = firstTile.dataset.piece;

    firstTile.src = secondTile.src;
    firstTile.dataset.piece = secondTile.dataset.piece;
    secondTile.src = firstSrc;
    secondTile.dataset.piece = firstPiece;

    turns += 1;
    updateTurns();
    checkSolved();
  }

  function handleDragStart(event) {
    selectedTile = event.currentTarget;
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function handleDrop(event) {
    event.preventDefault();
    const targetTile = event.currentTarget;

    if (!selectedTile || selectedTile === targetTile || isSolved) return;

    swapTiles(selectedTile, targetTile);
    selectedTile = null;
  }

  function handleClick(event) {
    const targetTile = event.currentTarget;

    if (isSolved) return;

    if (!selectedTile) {
      selectedTile = targetTile;
      targetTile.classList.add('is-selected');
      return;
    }

    selectedTile.classList.remove('is-selected');

    if (selectedTile !== targetTile) {
      swapTiles(selectedTile, targetTile);
    }

    selectedTile = null;
  }

  function bindTile(tile) {
    tile.addEventListener('dragstart', handleDragStart);
    tile.addEventListener('dragover', handleDragOver);
    tile.addEventListener('drop', handleDrop);
    tile.addEventListener('click', handleClick);
  }

  function reset() {
    turns = 0;
    selectedTile = null;
    isSolved = false;
    board.innerHTML = '';
    pieces.innerHTML = '';
    resultText.textContent = '';
    updateTurns();

    for (let i = 0; i < totalPieces; i++) {
      const tile = makeTile('', getBlankUrl(), 'puzzle-tile');
      bindTile(tile);
      board.append(tile);
    }

    shuffle(orderedPieces).forEach((piece) => {
      const tile = makeTile(piece, getImageUrl(config.folder, piece), 'puzzle-piece');
      bindTile(tile);
      pieces.append(tile);
    });
  }

  function open() {
    if (isOpen) return;

    reset();
    isOpen = true;
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function close() {
    if (!isOpen) return;

    isOpen = false;
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    onClose();
  }

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (allowClose && event.target === overlay) {
      close();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (allowClose && event.key === 'Escape' && isOpen) {
      close();
    }
  });

  document.body.append(overlay);

  return {
    open,
    close,
    isOpen: () => isOpen
  };
}

const standaloneBoard = document.getElementById('board');

if (standaloneBoard) {
  createPuzzleMinigame({ difficulty: 'medium' }).open();
}
