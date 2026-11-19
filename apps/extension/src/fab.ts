type Corner = 'tl' | 'tr' | 'bl' | 'br';

const CORNER_STYLE: Record<Corner, Partial<CSSStyleDeclaration>> = {
  tl: { top: '16px', left: '16px', right: 'auto', bottom: 'auto' },
  tr: { top: '16px', right: '16px', left: 'auto', bottom: 'auto' },
  bl: { bottom: '16px', left: '16px', right: 'auto', top: 'auto' },
  br: { bottom: '16px', right: '16px', left: 'auto', top: 'auto' },
};

function nearestCorner(x: number, y: number): Corner {
  const right = x > window.innerWidth / 2;
  const bottom = y > window.innerHeight / 2;
  return `${bottom ? 'b' : 't'}${right ? 'r' : 'l'}` as Corner;
}

function applyCorner(button: HTMLButtonElement, corner: Corner) {
  const style = CORNER_STYLE[corner];
  button.style.top = style.top || 'auto';
  button.style.right = style.right || 'auto';
  button.style.bottom = style.bottom || 'auto';
  button.style.left = style.left || 'auto';
}

function setOpenState(button: HTMLButtonElement, open: boolean) {
  button.setAttribute('aria-pressed', open ? 'true' : 'false');
  button.setAttribute('aria-label', open ? 'Close FormPilot' : 'Open FormPilot');
  button.title = open ? 'Close FormPilot' : 'Open FormPilot';
  button.dataset.open = open ? '1' : '0';
}

/**
 * One logo button on the page. Drag it and it snaps to a corner.
 * A click toggles the FormPilot extension window open or closed.
 */
export function mountFloatingButton() {
  if (document.getElementById('formpilot-fab-host')) return;

  const host = document.createElement('div');
  host.id = 'formpilot-fab-host';
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.zIndex = '2147483646';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    button {
      position: fixed;
      width: 56px;
      height: 56px;
      border-radius: 999px;
      border: 1px solid rgba(17, 38, 79, 0.12);
      background: #ffffff;
      padding: 8px;
      cursor: grab;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
      transition: top 160ms ease, left 160ms ease, right 160ms ease, bottom 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
    }
    button[aria-pressed="true"] {
      border-color: rgba(15, 118, 110, 0.45);
      box-shadow: 0 8px 24px rgba(15, 118, 110, 0.28);
    }
    button.dragging { cursor: grabbing; transition: none; }
    img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; display: block; }
  `;

  const button = document.createElement('button');
  button.type = 'button';
  setOpenState(button, false);
  const image = document.createElement('img');
  image.alt = '';
  button.append(image);
  shadow.append(style, button);
  document.documentElement.append(host);

  let corner: Corner = 'br';
  applyCorner(button, corner);
  chrome.storage.local.get(['formpilot_fab_corner', 'formpilot_panel_open']).then((stored) => {
    const saved = stored.formpilot_fab_corner;
    if (saved === 'tl' || saved === 'tr' || saved === 'bl' || saved === 'br') {
      corner = saved;
      applyCorner(button, corner);
    }
    setOpenState(button, Boolean(stored.formpilot_panel_open));
  }).catch(() => {});

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.formpilot_panel_open) return;
    setOpenState(button, Boolean(changes.formpilot_panel_open.newValue));
  });

  fetch(chrome.runtime.getURL('icons/icon-128.png'))
    .then((res) => res.blob())
    .then((blob) => {
      image.src = URL.createObjectURL(blob);
    })
    .catch(() => {
      image.src = chrome.runtime.getURL('icons/icon-128.png');
    });

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;

  button.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    button.classList.add('dragging');
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
    if (!moved) return;
    button.style.left = `${event.clientX - 28}px`;
    button.style.top = `${event.clientY - 28}px`;
    button.style.right = 'auto';
    button.style.bottom = 'auto';
  });

  const finish = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    button.classList.remove('dragging');
    if (!moved) {
      chrome.runtime.sendMessage({ type: 'TOGGLE_SIDE_PANEL' }, (response) => {
        void chrome.runtime.lastError;
        if (response?.ok) {
          setOpenState(button, Boolean(response.open));
          return;
        }
        // Keep the button usable even if Chrome reports the panel state wrong.
        setOpenState(button, !button.dataset.open || button.dataset.open === '0');
      });
      return;
    }
    corner = nearestCorner(event.clientX, event.clientY);
    applyCorner(button, corner);
    chrome.storage.local.set({ formpilot_fab_corner: corner }).catch(() => {});
  };

  button.addEventListener('pointerup', finish);
  button.addEventListener('pointercancel', () => {
    dragging = false;
    button.classList.remove('dragging');
    applyCorner(button, corner);
  });
}
