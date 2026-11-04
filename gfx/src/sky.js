/* Fig. 5, the sky over Kathmandu. Every position on it is worked out here in the browser by
   the published @grahan packages. The page's dateline uses its own textbook series; this does
   not. Its own bundle, gfx/sky.min.js, loads as the section nears, so the press run never waits
   for it. The rest of the figure is plain type and two range inputs. */
import {
  sunPosition, moonPosition, moonPhase, sunriseSunset, nextSolarEclipseAt, trueObliquity, equatorialFromEcliptic,
  localSiderealTime, julianDayFromDate, dateFromJulianDay, zonedTimeFromDate, dateFromZonedTime,
} from '@grahan/core';
import {bsFromDate} from '@grahan/calendars';
import {tithi} from '@grahan/vedic';

const KTM = 'Asia/Kathmandu', LAT = 27.7172, LON = 85.324, OBS = {latitude: LAT, longitude: LON};
const D2R = Math.PI / 180, SINL = Math.sin(LAT * D2R), COSL = Math.cos(LAT * D2R), EARTH_KM = 6378.137;
/* the dial: the rim is the horizon, the centre straight overhead, the band outside it down to 18 degrees below */
const R = 170, BAND = 28, PX_DEG = R / 90, DISC = 9;
const MIN = Date.UTC(1900, 0, 1, 6), MAX = Date.UTC(2100, 11, 31, 18), DAY0 = Date.UTC(1900, 0, 1);
const DAYS = Math.round((Date.UTC(2100, 11, 31) - DAY0) / 864e5);
const WIND = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const NS = 'http://www.w3.org/2000/svg';

/* Bright stars at J2000, right ascension in hours and declination in degrees, with magnitude. Not grahan: a backdrop. */
const STARS = [
  [6.752, -16.716, -1.46], [6.399, -52.696, -.74], [14.261, 19.182, -.05], [18.616, 38.784, .03], [5.278, 45.998, .08], [5.242, -8.202, .13],
  [7.655, 5.225, .34], [5.919, 7.407, .5], [1.629, -57.237, .46], [19.846, 8.868, .77], [4.599, 16.509, .85], [16.49, -26.432, 1], [13.42, -11.161, 1.04],
  [7.755, 28.026, 1.14], [22.961, -29.622, 1.16], [20.69, 45.28, 1.25], [10.139, 11.967, 1.35], [6.977, -28.972, 1.5], [7.577, 31.889, 1.58],
  [17.56, -37.104, 1.62], [5.419, 6.35, 1.64], [5.438, 28.608, 1.65], [5.604, -1.202, 1.69], [5.679, -1.943, 1.77], [5.533, -.299, 2.25], [5.796, -9.67, 2.07],
  [12.9, 55.96, 1.76], [11.062, 61.751, 1.79], [11.031, 56.382, 2.37], [11.897, 53.695, 2.44], [12.257, 57.033, 3.31], [13.399, 54.925, 2.23], [13.792, 49.313, 1.85],
  [2.53, 89.264, 1.98], [.675, 56.537, 2.24], [.153, 59.15, 2.28], [.945, 60.717, 2.47], [1.43, 60.235, 2.68], [1.907, 63.67, 3.35],
  [.14, 29.091, 2.06], [2.12, 23.462, 2], [3.405, 49.861, 1.79], [3.136, 40.956, 2.12], [11.818, 14.572, 2.14], [18.403, -34.385, 1.85], [20.37, 40.257, 2.2],
].map(([h, d, m]) => ({ra: h * 15, sd: Math.sin(d * D2R), cd: Math.cos(d * D2R), big: m < 1.2}));
/* Orion, the Plough, Cassiopeia, by index above */
const LINES = [[7, 20], [20, 24], [24, 22], [22, 23], [23, 7], [24, 5], [23, 25], [5, 25], [27, 28], [28, 29], [29, 30], [30, 26], [26, 31], [31, 32], [30, 27], [35, 34], [34, 36], [36, 37], [37, 38]];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cap = s => s[0].toUpperCase() + s.slice(1);
const dayF = new Intl.DateTimeFormat('en-GB', {timeZone: KTM, weekday: 'long'});
const dateF = new Intl.DateTimeFormat('en-GB', {timeZone: KTM, day: 'numeric', month: 'long', year: 'numeric'});
const timeF = new Intl.DateTimeFormat('en-GB', {timeZone: KTM, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
const glide = k => k * k * (3 - 2 * k);

/* Hour angle and declination to altitude (degrees) and azimuth (radians from north); km corrects the Moon's parallax. */
function horizon(H, sd, cd, km) {
  const ch = Math.cos(H);
  let alt = Math.asin(SINL * sd + COSL * cd * ch);
  const az = Math.atan2(-cd * Math.sin(H), sd * COSL - cd * ch * SINL);
  if (km) alt -= Math.asin(Math.cos(alt) * EARTH_KM / km);
  return {alt: alt / D2R, az};
}
function place(p, eps, lst, km) {
  const q = equatorialFromEcliptic(p.apparentLongitude, p.latitude, eps), d = q.declination * D2R;
  return horizon((lst - q.rightAscension) * D2R, Math.sin(d), Math.cos(d), km);
}
const proj = (alt, az) => {
  const r = alt >= 0 ? R * (90 - alt) / 90 : R + (BAND - 11) * Math.min(1, -alt / 18);
  return [r * Math.sin(az), -r * Math.cos(az)];
};
const toMs = jd => dateFromJulianDay(jd).getTime();
const eclipseOf = e => ({c1: toMs(e.firstContact), max: toMs(e.maximum), c4: toMs(e.fourthContact), mag: e.magnitude, obs: e.obscuration, type: e.type});
/* The eclipse running at jd, else the next one. nextSolarEclipseAt looks ahead from a greatest eclipse, so step back first. */
function eclipseAround(jd) {
  try {
    let e = nextSolarEclipseAt(jd - .25, OBS);
    if (e.fourthContact < jd) e = nextSolarEclipseAt(e.fourthContact + .01, OBS);
    return toMs(e.maximum) > MAX ? null : eclipseOf(e);
  } catch (err) {
    return null;
  }
}

export function mount(fig) {
  const $ = s => fig.querySelector(s), root = document.documentElement, moving = () => root.classList.contains('motion');
  const svg = $('.sky-dome'), hr = $('.sky-hour input'), yr = $('.sky-year input'), goto_ = $('.sky-goto input');
  const out = {
    date: $('.sky-date'), when: $('.sky-when'), sun: $('[data-s=sun]'), moon: $('[data-s=moon]'), ecl: $('[data-s=ecl]'), eclRow: $('.sky-ecl'),
    now: $('[data-do=now]'), play: $('[data-do=play]'), next: $('[data-do=next]'), ticks: $('.sky-ticks'), count: $('.sky-count'), band: $('.sky-band'),
  };
  const put = (el, html) => { if (el._v !== html) { el._v = html; el.innerHTML = html; } };

  /* ---- the dial ---- */
  const el = (tag, attrs = {}, parent = svg) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  };
  const defs = el('defs');
  el('clipPath', {id: 'skClip'}, defs).appendChild(document.createElementNS(NS, 'circle')).setAttribute('r', R);
  const glowG = el('radialGradient', {id: 'skGlow', gradientUnits: 'userSpaceOnUse', r: R * .95}, defs);
  el('stop', {offset: 0, 'stop-color': '#ffb066', 'stop-opacity': .95}, glowG);
  el('stop', {offset: .45, 'stop-color': '#e0644f', 'stop-opacity': .32}, glowG);
  el('stop', {offset: 1, 'stop-color': '#e0644f', 'stop-opacity': 0}, glowG);
  el('circle', {class: 'sk-band', r: R + BAND / 2, 'stroke-width': BAND});
  el('circle', {class: 'sk-day', r: R});
  const night = el('circle', {class: 'sk-night', r: R, opacity: 0});
  const glow = el('circle', {r: R, fill: 'url(#skGlow)', opacity: 0, 'clip-path': 'url(#skClip)'});
  const conL = el('path', {class: 'sk-con', opacity: 0}), starsB = el('path', {class: 'sk-star sk-big', opacity: 0}), starsD = el('path', {class: 'sk-star', opacity: 0});
  [30, 60].forEach(a => {
    const r = R * (90 - a) / 90;
    el('circle', {class: 'sk-grid', r});
    el('text', {class: 'sk-alt', x: 3, y: -r - 3}).textContent = a + '°';
  });
  el('path', {class: 'sk-grid', d: `M0 ${-R}V${R}M${-R} 0H${R}`});
  el('circle', {class: 'sk-rim sk-draw', r: R, pathLength: 1});
  for (let a = 0; a < 360; a += 15) {
    const s = Math.sin(a * D2R), c = -Math.cos(a * D2R), l = a % 90 === 0 ? 9 : a % 45 === 0 ? 6 : 3.5;
    el('path', {class: 'sk-tick', d: `M${(s * R).toFixed(1)} ${(c * R).toFixed(1)}L${(s * (R + l)).toFixed(1)} ${(c * (R + l)).toFixed(1)}`});
  }
  [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, a]) => {
    el('text', {class: 'sk-dir', x: (Math.sin(a * D2R) * (R + BAND + 13)).toFixed(1), y: (-Math.cos(a * D2R) * (R + BAND + 13)).toFixed(1)}).textContent = t;
  });
  const moonPath = el('path', {class: 'sk-moonpath sk-fade'}), sunPath = el('path', {class: 'sk-sunpath sk-draw', pathLength: 1});
  const hours = el('g', {class: 'sk-fade'});
  const sunM = el('g', {class: 'sk-sun'});
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    el('path', {class: 'sk-ray', d: `M${(Math.cos(a) * (DISC + 2.5)).toFixed(2)} ${(Math.sin(a) * (DISC + 2.5)).toFixed(2)}L${(Math.cos(a) * (DISC + 7)).toFixed(2)} ${(Math.sin(a) * (DISC + 7)).toFixed(2)}`}, sunM);
  }
  el('circle', {class: 'sk-sundisc', r: DISC}, sunM);
  const moonM = el('g', {class: 'sk-moon'});
  el('circle', {class: 'sk-moondark', r: DISC}, moonM);
  const moonLit = el('path', {class: 'sk-moonlit'}, moonM);

  /* ---- state ---- */
  let t = Date.now(), live = true, raf = 0, dayKey = '', dayStart = 0, E = null, eNone = false, eFrom = 0, eTimer = 0, scrubbing = false, playing = false, onScreen = false;
  let riseSet = '', sub = '';
  const list = [];

  function newDay(z) {
    dayStart = dateFromZonedTime({year: z.year, month: z.month, day: z.day, hour: 0, minute: 0, second: 0}, KTM).getTime();
    const eps = trueObliquity(julianDayFromDate(new Date(dayStart + 432e5)));
    let sd = '', md = '', sUp = false, mUp = false, marks = '';
    for (let i = 0; i <= 144; i++) {
      const ms = dayStart + i * 6e5, jd = julianDayFromDate(new Date(ms)), lst = localSiderealTime(jd, LON);
      const s = place(sunPosition(jd), eps, lst), mp = moonPosition(jd), m = place(mp, eps, lst, mp.distanceKm);
      if (s.alt > 0) {
        const [x, y] = proj(s.alt, s.az);
        sd += (sUp ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
        if (i % 6 === 0) {
          const h = i / 6;
          marks += `<circle class="sk-hourdot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7"/>`;
          if (h % 3 === 0) marks += `<text class="sk-hourtxt" x="${(x * .9).toFixed(1)}" y="${(y * .9).toFixed(1)}">${h}</text>`;
        }
      }
      sUp = s.alt > 0;
      if (m.alt > 0) { const [x, y] = proj(m.alt, m.az); md += (mUp ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
      mUp = m.alt > 0;
    }
    sunPath.setAttribute('d', sd);
    moonPath.setAttribute('d', md);
    hours.innerHTML = marks;

    const ev = sunriseSunset({year: z.year, month: z.month, day: z.day, latitude: LAT, longitude: LON, timezone: KTM});
    const up = ev.sunrise.kind === 'rises' ? ev.sunrise.date : null, down = ev.sunset.kind === 'rises' ? ev.sunset.date : null;
    riseSet = up && down ? `Rises ${timeF.format(up)}, sets ${timeF.format(down)}` : '';
    if (up && down) {
      out.band.style.setProperty('--sr', ((up - dayStart) / 864e5).toFixed(4));
      out.band.style.setProperty('--ss', ((down - dayStart) / 864e5).toFixed(4));
    }
    /* the Bikram Sambat date, and the tithi at sunrise, the panchang's convention */
    const parts = [];
    try {
      const b = bsFromDate({year: z.year, month: z.month, day: z.day});
      parts.push(`${b.day} ${b.monthName.roman} ${b.year} BS`);
    } catch (err) { /* before the table starts, about 1918 */ }
    if (up) {
      const jr = julianDayFromDate(up), n = tithi(sunPosition(jr).apparentLongitude, moonPosition(jr).apparentLongitude);
      parts.push(/Purnima|Amavasya/.test(n.name) ? n.name : `${cap(n.paksha)} ${n.name}`);
    }
    sub = parts.join(' · ');
    const at = new Date(dayStart + 432e5);
    put(out.date, `${dayF.format(at)} ${dateF.format(at)}`);
    yr.value = Math.round((Date.UTC(z.year, z.month - 1, z.day) - DAY0) / 864e5);
    yr.setAttribute('aria-valuetext', dateF.format(at));
    goto_.value = `${String(z.year).padStart(4, '0')}-${String(z.month).padStart(2, '0')}-${String(z.day).padStart(2, '0')}`;
    yr.style.setProperty('--p', (+yr.value / DAYS).toFixed(5));
  }

  function draw() {
    const jd = julianDayFromDate(new Date(t)), eps = trueObliquity(jd), lst = localSiderealTime(jd, LON);
    const sp = sunPosition(jd), mp = moonPosition(jd), S = place(sp, eps, lst), M = place(mp, eps, lst, mp.distanceKm), ph = moonPhase(jd);
    const [sx, sy] = proj(S.alt, S.az);
    let [mx, my] = proj(M.alt, M.az);

    /* The discs are drawn far larger than life. Near new Moon they rest touching, then overlap only
       as far as the real discs do, so an eclipse shows at its true depth. */
    const dAlt = M.alt - S.alt, dAz = Math.atan2(Math.sin(M.az - S.az), Math.cos(M.az - S.az)) * Math.cos(S.alt * D2R) / D2R, sep = Math.hypot(dAlt, dAz);
    if (sep < 2 * DISC / PX_DEG && Math.max(S.alt, M.alt) > -18) {
      const dx = mx - sx, dy = my - sy, l = Math.hypot(dx, dy) || 1, px = Math.max(sep * PX_DEG, 2 * DISC * Math.min(1, sep / .53));
      const ux = l > .01 ? dx / l : 0, uy = l > .01 ? dy / l : 1;
      mx = sx + ux * px; my = sy + uy * px;
    }
    sunM.setAttribute('transform', `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`);
    sunM.style.opacity = S.alt > -.83 ? 1 : .42;
    moonM.setAttribute('transform', `translate(${mx.toFixed(2)} ${my.toFixed(2)})`);
    moonM.style.opacity = M.alt > 0 ? 1 : .42;

    /* the lit limb faces the Sun, wherever the Sun is, and the terminator follows the true fraction lit */
    const k = ph.illuminatedFraction, rx = DISC * Math.abs(1 - 2 * k);
    const raw = (alt, az) => { const r = R * (90 - alt) / 90; return [r * Math.sin(az), -r * Math.cos(az)]; };
    const [ax, ay] = raw(S.alt, S.az), [bx, by] = raw(M.alt, M.az), rot = Math.atan2(ay - by, ax - bx) / D2R;
    moonLit.setAttribute('d', `M0 ${-DISC}A${DISC} ${DISC} 0 0 1 0 ${DISC}A${rx.toFixed(2)} ${DISC} 0 0 ${k > .5 ? 1 : 0} 0 ${-DISC}Z`);
    moonLit.setAttribute('transform', `rotate(${rot.toFixed(1)})`);

    /* the sky darkens with the Sun's altitude, and with an eclipse */
    const inE = E && t >= E.c1 && t <= E.c4;
    let dim = 0;
    if (inE) { const f = t < E.max ? (t - E.c1) / (E.max - E.c1) : (E.c4 - t) / (E.c4 - E.max); dim = E.obs * f * .45; }
    moonM.classList.toggle('sk-sil', sep < 2 * DISC / PX_DEG);
    const n = Math.max(clamp((6 - S.alt) / 18, 0, 1), dim);
    night.setAttribute('opacity', n.toFixed(3));
    svg.style.setProperty('--n', n.toFixed(3));
    glowG.setAttribute('cx', sx.toFixed(1));
    glowG.setAttribute('cy', sy.toFixed(1));
    glow.setAttribute('opacity', (clamp(1 - Math.abs(S.alt + 1) / 13, 0, 1) * (1 - dim)).toFixed(3));

    const sOp = clamp((n - .35) / .55, 0, 1);
    if (sOp > .01) {
      let b = '', d = '', c = '';
      const pts = STARS.map(st => {
        const h = horizon((lst - st.ra) * D2R, st.sd, st.cd);
        if (h.alt <= 0) return null;
        const p = proj(h.alt, h.az), m = `M${p[0].toFixed(1)} ${p[1].toFixed(1)}h.01`;
        if (st.big) b += m; else d += m;
        return p;
      });
      for (const [i, j] of LINES) if (pts[i] && pts[j]) c += `M${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}L${pts[j][0].toFixed(1)} ${pts[j][1].toFixed(1)}`;
      starsB.setAttribute('d', b); starsD.setAttribute('d', d); conL.setAttribute('d', c);
    }
    starsB.setAttribute('opacity', sOp.toFixed(3));
    starsD.setAttribute('opacity', (sOp * .8).toFixed(3));
    conL.setAttribute('opacity', sOp.toFixed(3));

    /* ---- the type ---- */
    const time = timeF.format(new Date(t));
    put(out.when, `${live ? 'Now, ' : ''}${time} in Kathmandu${sub ? '<br>' + sub : ''}`);
    const where = (b) => { const w = WIND[Math.round((((b.az / D2R) % 360 + 360) % 360) / 45) % 8]; return b.alt >= 0 ? `Altitude <b>${Math.round(b.alt)}°</b>, ${w}` : `<b>${Math.abs(Math.round(b.alt))}°</b> below the horizon, ${w}`; };
    put(out.sun, `${where(S)}<span>${riseSet}</span>`);
    put(out.moon, `${where(M)}<span>${cap(ph.phaseName.replace('-', ' '))}, ${Math.round(k * 100)}% lit</span>`);
    hr.setAttribute('aria-valuetext', time);
    out.now.disabled = live;

    if (E && !inE && t > E.c4) E = null;
    if ((!E && !eNone) || t < eFrom) wantEclipse();
    out.eclRow.classList.toggle('hot', !!inE);
    if (inE) put(out.ecl, `<b>Eclipse now</b>, ${E.type}<span>Greatest ${dateF.format(new Date(E.max))} at ${timeF.format(new Date(E.max))}, magnitude ${E.mag.toFixed(3)}, ${(E.obs * 100).toFixed(1)}% of the Sun</span>`);
    else if (E) put(out.ecl, `Next here <b>${dateF.format(new Date(E.max))}</b><span>${cap(E.type)}, magnitude ${E.mag.toFixed(3)}, ${(E.obs * 100).toFixed(1)}% of the Sun</span>`);
    else put(out.ecl, eNone ? 'None left before 2100' : 'Working it out');

    /* Fig. 4 shows whichever eclipse the reader has landed on */
    if (inE && !live) { scrubbing = true; if (window.__ecScrub) window.__ecScrub(E, t); }
    else if (scrubbing) { scrubbing = false; if (window.__ecScrub) window.__ecScrub(null); }
  }

  /* Dragging across decades asks for a new eclipse every frame, so this waits for a pause. */
  function wantEclipse() {
    clearTimeout(eTimer);
    eTimer = setTimeout(() => {
      eFrom = t;
      E = eclipseAround(julianDayFromDate(new Date(t)));
      eNone = !E;
      draw();
    }, 70);
  }

  function setT(ms) {
    t = clamp(ms, MIN, MAX);
    const z = zonedTimeFromDate(new Date(t), KTM), key = `${z.year}-${z.month}-${z.day}`;
    if (key !== dayKey) { dayKey = key; newDay(z); }
    hr.value = z.hour * 60 + z.minute;
    hr.style.setProperty('--p', (+hr.value / 1439).toFixed(5));
    draw();
  }

  /* ---- motion ---- */
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (playing) { playing = false; put(out.play, 'Play the day'); }
  }
  function run(a, b, ms, then) {
    stop();
    if (!moving() || ms <= 0) { setT(b); if (then) then(); return; }
    const start = performance.now();
    const step = now => {
      if (!moving()) { setT(b); raf = 0; if (then) then(); return; }
      const k = clamp((now - start) / ms, 0, 1);
      setT(a + (b - a) * glide(k));
      if (k < 1) raf = requestAnimationFrame(step); else { raf = 0; if (then) then(); }
    };
    raf = requestAnimationFrame(step);
  }
  function play() {
    stop();
    live = false;
    playing = true;
    put(out.play, 'Pause');
    const from = t;
    let last = performance.now();
    const step = now => {
      if (!moving() || !onScreen) { stop(); return; }
      const dt = Math.min(64, now - last);
      last = now;
      /* an hour every 0.7 seconds, for one full day */
      const next = t + dt * 3600e3 / 700;
      if (next >= MAX || next - from >= 864e5) { setT(Math.min(next, MAX)); stop(); return; }
      setT(next);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  const goNow = () => {
    const now = Date.now();
    if (Math.abs(now - t) > 40 * 864e5) { stop(); live = true; setT(now); return; }
    run(t, now, 700, () => { live = true; setT(Date.now()); });
    live = true;
  };

  /* ---- the rules ---- */
  hr.addEventListener('input', () => { stop(); live = false; setT(dayStart + +hr.value * 6e4); });
  yr.addEventListener('input', () => {
    stop();
    live = false;
    const d = +yr.value, snap = 5 / Math.max(120, yr.clientWidth) * DAYS;
    let best = null, gap = snap;
    for (const e of list) { const g = Math.abs(e.day - d); if (g < gap) { gap = g; best = e; } }
    if (best) { E = best; eNone = false; eFrom = best.c1 - 864e5; setT(best.max); return; }
    const c = new Date(DAY0 + d * 864e5), z = zonedTimeFromDate(new Date(t), KTM);
    setT(dateFromZonedTime({year: c.getUTCFullYear(), month: c.getUTCMonth() + 1, day: c.getUTCDate(), hour: z.hour, minute: z.minute, second: 0}, KTM).getTime());
  });
  goto_.addEventListener('change', () => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(goto_.value);
    if (!m) return;
    stop();
    live = false;
    const z = zonedTimeFromDate(new Date(t), KTM);
    setT(dateFromZonedTime({year: +m[1], month: +m[2], day: +m[3], hour: z.hour, minute: z.minute, second: 0}, KTM).getTime());
  });
  out.now.addEventListener('click', goNow);
  out.play.addEventListener('click', () => { if (playing) stop(); else play(); });
  out.next.addEventListener('click', () => {
    const from = E && t <= E.c4 && t >= E.c1 ? E.c4 + 6e5 : t;
    const e = eclipseAround(julianDayFromDate(new Date(from)));
    if (!e) return;
    stop();
    live = false;
    E = e;
    eNone = false;
    eFrom = e.c1 - 864e5;
    /* in one column Fig. 4 sits above this figure, out of view */
    const f4 = document.getElementById('fig4'), r = f4 && f4.getBoundingClientRect();
    if (r && (r.bottom < 80 || r.top > innerHeight - 80)) f4.scrollIntoView({behavior: moving() ? 'smooth' : 'auto', block: 'center'});
    setT(e.c1);
    run(e.c1, e.max, 3200);
  });

  /* ---- every eclipse over Kathmandu, 1900 to 2100, found on their own thread once the reader is here ---- */
  function add(x) {
    x.day = (x.max + 345 * 6e4 - DAY0) / 864e5;
    list.push(x);
    const i = document.createElement('i');
    i.style.setProperty('--p', (x.day / DAYS).toFixed(5));
    i.style.setProperty('--h', (5 + 15 * Math.sqrt(x.mag)).toFixed(1) + 'px');
    out.ticks.appendChild(i);
    put(out.count, `Finding eclipses over Kathmandu: ${list.length}`);
  }
  function found() {
    const by = {};
    list.forEach(x => { by[x.type] = (by[x.type] || 0) + 1; });
    const kinds = ['partial', 'annular', 'total'].map(k => (by[k] || 'no') + ' ' + k).join(', ');
    put(out.count, `${list.length} solar eclipses over Kathmandu, 1900 to 2100: ${kinds}. Land on a tick to see one in Fig. 4.`);
  }
  /* without a worker the search shares this thread, one eclipse at a time when it is idle */
  function scanHere() {
    const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, {timeout: 500}) : setTimeout(f, 40));
    let j = list.length ? julianDayFromDate(new Date(list[list.length - 1].c4)) + 1 : julianDayFromDate(new Date(MIN));
    const frag = () => {
      let e = null;
      try { e = nextSolarEclipseAt(j, OBS); } catch (err) { /* past the engine's range */ }
      if (!e || toMs(e.maximum) > MAX) return found();
      add(eclipseOf(e));
      j = e.fourthContact + 1;
      idle(frag);
    };
    idle(frag);
  }
  function scan() {
    let w;
    try {
      w = new Worker(new URL('gfx/sky-worker.min.js', location.href), {type: 'module'});
    } catch (err) {
      return scanHere();
    }
    w.onmessage = ev => {
      if (ev.data) return add(ev.data);
      w.terminate();
      found();
    };
    w.onerror = () => { w.terminate(); scanHere(); };
  }

  /* ---- start ---- */
  yr.max = DAYS;
  eFrom = t - 9 * 36e5;
  E = eclipseAround(julianDayFromDate(new Date(eFrom)));
  eNone = !E;
  setT(t);
  fig.classList.add('ready');
  let began = false;
  const io = new IntersectionObserver(es => {
    onScreen = es[0].isIntersecting;
    if (!onScreen) return;
    if (!began) {
      began = true;
      fig.classList.add('in');
      scan();
      /* the day so far replays as the figure arrives */
      if (moving() && live) { const now = Date.now(); run(now - 8 * 36e5, now, 2200, () => { live = true; setT(Date.now()); }); live = true; }
    } else if (live && !raf) setT(Date.now());
  }, {threshold: .15});
  io.observe(fig);
  setInterval(() => { if (live && onScreen && !raf) setT(Date.now()); }, 2e4);
}
