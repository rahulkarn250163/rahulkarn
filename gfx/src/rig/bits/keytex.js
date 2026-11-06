import {canvasTex} from '../../core.js';

const COLS = 16, SIZE = 1024, CELL = SIZE / COLS, INSET = 2;

const KEYS = [
  'Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '\\', 'Del',
  'Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', 'Bksp',
  'Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter',
  'Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift',
  'Ctrl', 'Alt', 'Cmd', '', 'Cmd', 'Alt', 'Fn', 'Ctrl',
];

let cached = null;

export function keyAtlas() {
  if (cached) return cached;
  const map = canvasTex(SIZE, SIZE, (ctx, w, h) => {
    ctx.fillStyle = '#17181a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cfcabd';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    KEYS.forEach((label, k) => {
      if (!label) return;
      const i = k + 1, c = i % COLS, r = Math.floor(i / COLS);
      const size = label.length > 3 ? 22 : label.length > 1 ? 28 : 46; // long legends must fit a 64px cell
      ctx.font = `${size}px Newsreader, Georgia, serif`;
      ctx.fillText(label, (c + .5) * CELL, (r + .5) * CELL);
    });
  }, {srgb: true});
  const cell = i => {
    const c = i % COLS, r = Math.floor(i / COLS), p = INSET / SIZE;
    return {
      u0: c / COLS + p,
      v0: 1 - (r + 1) / COLS + p,
      u1: (c + 1) / COLS - p,
      v1: 1 - r / COLS - p,
    };
  };
  cached = {map, cell};
  return cached;
}
