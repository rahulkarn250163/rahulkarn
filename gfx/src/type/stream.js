export const css = `
.ty-stream .ty-c{opacity:0}
.ty-stream .ty-cur{position:absolute;width:2px;height:1.05em;background:#e0644f;left:0;top:0}
`;

const FRESH = '#e0644f';

// The reel keeps every caption mounted, so run only when this shot is the live one.
export function arm(t, play) {
  const idx = [...document.querySelectorAll('.shot')].indexOf(t.el.closest('.shot'));
  let seen = false;
  let onScreen = false;
  let io = null;

  function maybe() {
    if (!seen && onScreen && window.__reelShot === idx) {
      seen = true;
      document.removeEventListener('reel:shot', maybe);
      if (io) io.disconnect();
      play();
    }
  }

  document.addEventListener('reel:shot', maybe);
  const reel = document.getElementById('reel');
  if (reel) {
    // Once the reel has all but reached the top: as its edge first shows, the caption is still below the fold.
    io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      maybe();
    }, { rootMargin: '0px 0px -86% 0px' });
    io.observe(reel);
  }
}

// The engine sets a caption up again once its shot has gone, by scrolling on or the reel leaving the screen.
export function leave(t, done) {
  const idx = [...document.querySelectorAll('.shot')].indexOf(t.el.closest('.shot'));
  const reel = document.getElementById('reel');
  let io = null;
  const gone = () => {
    document.removeEventListener('reel:shot', check);
    if (io) io.disconnect();
    done();
  };
  const check = () => { if (window.__reelShot !== idx) gone(); };
  document.addEventListener('reel:shot', check);
  if (reel) {
    io = new IntersectionObserver((entries) => {
      if (!entries[entries.length - 1].isIntersecting) gone();
    });
    io.observe(reel);
  }
}

export async function play(t) {
  const rest = getComputedStyle(t.el).color;
  const rand = t.rng(7);
  const cur = document.createElement('span');
  cur.className = 'ty-cur';
  t.overlay('ty-stream-o').appendChild(cur);

  // Centred on the glyph box so the cursor sits the same on every line.
  const place = (x, box) => {
    const y = box.y + (box.h - 1.05 * t.fs) / 2;
    cur.style.transform = `translate(${x}px, ${y}px)`;
  };

  if (t.chars.length) place(t.chars[0].box.x, t.chars[0].box);

  const running = [];
  for (const word of t.words) {
    if (t.stopped) return;
    const chars = [...word.querySelectorAll('.ty-c')];
    if (!chars.length) continue;

    // A token arrives whole, so its characters appear together.
    for (const ch of chars) {
      running.push(t.animate(ch, [
        { opacity: 0, transform: 'translateY(.12em)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 170, easing: 'cubic-bezier(.2,.7,.2,1)' }));
      running.push(t.animate(ch, [
        { color: FRESH },
        { color: rest }
      ], { duration: 340, easing: 'ease-out' }));
    }

    const last = chars[chars.length - 1];
    place(last.box.x + last.box.w + 2, last.box);

    await t.wait(26 + rand() * 38);
    if (word.textContent.trim().endsWith(',')) await t.wait(120);
  }

  // Hard steps, since a terminal cursor switches rather than fades.
  for (let i = 0; i < 4; i++) {
    if (t.stopped) return;
    cur.style.opacity = i % 2 ? '1' : '0';
    await t.wait(120);
  }
  cur.remove();

  // A cancelled animation rejects finished, which is not a failure here.
  await Promise.all(running.map((a) => a.finished.catch(() => {})));
}
