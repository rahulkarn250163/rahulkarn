/* What every type effect shares. setType() takes a heading to pieces without moving a pixel:
   each character's real advance is measured from the laid-out text, kerning included, and given
   back as a fixed width, so effects can move letters freely and the engine can put the original
   markup back at the end with no visible jump. The text a reader ends up with is plain page type. */
const slow = () => window.__typeSlow || 1;

export const rng = seed => {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
};
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const glide = k => { k = clamp(k); return k * k * (3 - 2 * k); };

function chainOf(node, root) {
  const out = [];
  for (let p = node.parentElement; p && p !== root; p = p.parentElement) out.unshift(p);
  return out;
}

function measure(el, fs) {
  const out = [], r = document.createRange(), walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walk.nextNode())) {
    const s = node.textContent, chain = chainOf(node, el);
    for (let i = 0; i < s.length; i++) {
      r.setStart(node, i);
      r.setEnd(node, i + 1);
      const rects = r.getClientRects(), b = rects[rects.length - 1], space = /\s/.test(s[i]);
      if (!b || (space && b.width < .01)) continue;
      out.push({ch: space ? ' ' : s[i], chain, w: b.width / fs, top: b.top, space});
    }
  }
  return out;
}

/* name is the effect's name; accent is true for a small companion element rather than a headline. */
export function setType(el, name, accent = false) {
  const html = el.innerHTML, fs = parseFloat(getComputedStyle(el).fontSize) || 16;
  const label = el.textContent.replace(/\s+/g, ' ').trim(), hadLabel = el.hasAttribute('aria-label');
  const cells = measure(el, fs), keepers = [], cls = 'ty-' + name + (accent ? '-a' : '');
  if (!cells.length) return null;

  const lines = [], words = [], chars = [];
  let line = null, lineTop = 1e9, word = null, wordChain = null, holder = null;
  const closeWord = () => { word = null; holder = null; wordChain = null; };
  el.textContent = '';
  if (!hadLabel) el.setAttribute('aria-label', label);
  el.classList.add(cls, 'ty-on');

  for (const c of cells) {
    if (Math.abs(c.top - lineTop) > fs * .5) {
      line = document.createElement('span');
      line.className = 'ty-l';
      line.setAttribute('aria-hidden', 'true');
      el.appendChild(line);
      lines.push(line);
      lineTop = c.top;
      closeWord();
    }
    if (c.space) {
      closeWord();
      const s = document.createElement('span');
      s.className = 'ty-s';
      s.style.width = c.w.toFixed(4) + 'em';
      s.textContent = ' ';
      line.appendChild(s);
      continue;
    }
    if (!word || wordChain !== c.chain) {
      word = document.createElement('span');
      word.className = 'ty-w';
      word.line = lines.length - 1;
      line.appendChild(word);
      words.push(word);
      holder = word;
      for (const a of c.chain) holder = holder.appendChild(a.cloneNode(false));
      wordChain = c.chain;
    }
    const ch = document.createElement('span');
    ch.className = 'ty-c';
    ch.style.width = c.w.toFixed(4) + 'em';
    ch.textContent = c.ch;
    ch.index = chars.length;
    ch.word = words.length - 1;
    ch.line = lines.length - 1;
    holder.appendChild(ch);
    chars.push(ch);
  }

  /* where each character sits, in CSS px from the element's top left, with its baseline */
  const origin = el.getBoundingClientRect(), bases = lines.map(l => {
    const p = document.createElement('span');
    p.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    l.appendChild(p);
    const y = p.getBoundingClientRect().bottom - origin.top;
    p.remove();
    return y;
  });
  chars.forEach(ch => {
    const b = ch.getBoundingClientRect();
    ch.box = {x: b.left - origin.left, y: b.top - origin.top, w: b.width, h: b.height, base: bases[ch.line], cx: b.left - origin.left + b.width / 2, cy: b.top - origin.top + b.height / 2};
  });

  const t = {
    el, name, fs, text: label, chars, words, lines, cls, accent, rng, clamp, glide, stopped: false,
    W: origin.width, H: origin.height,
    /* how far the type itself reaches, which in a wide column can be far short of W */
    textW: Math.max(...chars.map(c => c.box.x + c.box.w)),
    /* a spot just past the end of the first line for small telemetry, or above it if the column is too tight */
    beside(w) {
      const end = chars.filter(c => c.line === 0).slice(-1)[0].box, left = end.x + end.w + .5 * fs;
      return left + w < origin.width ? {left, top: end.y + .14 * fs} : {left: Math.max(0, end.x + end.w - w), top: end.y - .55 * fs};
    },
    /* a wait that respects the engine's slow motion */
    wait: ms => new Promise(res => setTimeout(res, ms * slow())),
    /* like node.animate(), fill both by default, in the engine's time */
    animate(node, frames, o = {}) {
      const s = slow();
      return node.animate(frames, {fill: 'both', ...o, duration: (o.duration || 0) * s, delay: (o.delay || 0) * s});
    },
    /* runs fn(k, ms) once a frame for ms milliseconds, k from 0 to 1; resolves when it is over or stopped */
    frame(ms, fn) {
      const total = ms * slow();
      return new Promise(res => {
        const start = performance.now();
        const tick = now => {
          if (t.stopped) return res();
          const e = now - start, k = clamp(e / total);
          fn(k, e / slow());
          if (k < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
    },
    /* an element in the effect's layer, gone when the real text returns */
    overlay(className = '') {
      const o = document.createElement('span');
      o.className = 'ty-o ' + className;
      o.setAttribute('aria-hidden', 'true');
      el.appendChild(o);
      return o;
    },
    /* a canvas over the element, padded by pad ems on each side; draw in CSS px with (ox, oy) as the element's top left */
    canvas(pad = 1) {
      const c = document.createElement('canvas'), p = pad * fs, dpr = Math.min(window.devicePixelRatio || 1, 2), w = origin.width + 2 * p, h = origin.height + 2 * p;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = `position:absolute;left:${-p}px;top:${-p}px;width:${w}px;height:${h}px;pointer-events:none`;
      el.appendChild(c);
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      return {canvas: c, ctx, W: w, H: h, ox: p, oy: p, dpr};
    },
    /* runs after the original text is back, for anything meant to stay */
    keep(fn) { keepers.push(fn); },
    restore() {
      t.stopped = true;
      el.getAnimations({subtree: true}).forEach(a => a.cancel());
      el.innerHTML = html;
      if (!hadLabel) el.removeAttribute('aria-label');
      el.classList.remove(cls, 'ty-on');
      el.classList.add('ty-done');
      keepers.forEach(fn => fn());
    },
  };
  return t;
}
