// Help desk avatar for Martinez Grocery (NELSONS v8)
// A cardboard-standee Nelson that turns around, hops, and talks in speech bubbles.
import {
  Scene, PerspectiveCamera, WebGLRenderer, MeshBasicMaterial, FrontSide, ClampToEdgeWrapping,
  SRGBColorSpace, Group, Box3, Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const PHONE_TEL = '+17186242170';
const PHONE = '(718) 624-2170';
const MAPS = 'https://maps.app.goo.gl/ALchFntmG81Ykt1V6';
const MODEL_URL = new URL('./avatar/martinez-v9.glb', import.meta.url).href;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmall = () => innerWidth < 768;

const store = {
  get(k) { try { return sessionStorage.getItem('hd:' + k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem('hd:' + k, v); } catch { /* private mode */ } },
};

/* ---------- shop clock (America/New_York) ---------- */
function shopClock() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const mins = g('hour') * 60 + g('minute');
  const open = mins >= 480 && mins < 1200;
  const left = 1200 - mins;
  return { open, early: mins < 480, closingSoon: open && left <= 45, left };
}

/* ---------- what Nelson says ---------- */
function lines() {
  const c = shopClock();
  const hours = c.open
    ? (c.closingSoon
        ? `We close at <b>8:00 PM</b> — about ${c.left} minutes. Call ahead and we'll have it ready.`
        : `We're <b>open right now</b>, until 8:00 PM. Come say hi!`)
    : (c.early
        ? `We open at <b>8:00 AM</b>. Coffee will be on.`
        : `We're closed for the night. Back at <b>8:00 AM</b>, every day.`);
  return {
    greet: `¡Hola! I'm Nelson. Need something? <b>Tap me</b> — I'm the help desk.`,
    top: `Free delivery around the neighborhood. Just call <b>${PHONE}</b>.`,
    counter: `Get the sandwich with our <b>homemade pico de gallo</b>. People ask for it by name.`,
    sidewalk: `Like a plant out front? Call and I'll <b>hold it for you</b>.`,
    guardians: `Have you seen <b>Sacha</b>? Black coat, pink collar. Please call the shop.`,
    voices: `Thank you, neighbors. <b>You</b> keep this corner going.`,
    visit: hours,
    owner: `That's me! Come by the counter and say hello.`,
    idle: [
      `Ice cream, cold beer, tropical groceries — <b>we've got it</b>.`,
      `Text us your order and we'll bring it over. <b>Free delivery.</b>`,
      hours,
    ],
  };
}

/* ---------- icons ---------- */
const ico = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>',
  msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2.37 11.223 8.372-6.777a2 2 0 0 1 2.516 0l8.371 6.777"/><path d="M3 15h18"/><path d="M3 19h18"/></svg>',
};

/* ---------- DOM ---------- */
function buildDom() {
  const root = document.createElement('div');
  root.className = 'hd';
  root.setAttribute('data-hd', '');
  root.innerHTML = `
    <div class="hd-shadow"></div>
    <button type="button" class="hd-stage" aria-label="Help desk: ask Nelson" aria-expanded="false" aria-controls="hd-bubble"></button>
    <div class="hd-bubble" id="hd-bubble" role="status" aria-live="polite">
      <button type="button" class="hd-x" aria-label="Close">×</button>
      <span class="hd-who">Nelson · Help desk</span>
      <div class="hd-text"></div>
    </div>`;
  return root;
}

/* ---------- 3D standee ---------- */
async function build3D(host) {
  const canvasW = () => host.clientWidth || 96;
  const canvasH = () => host.clientHeight || 210;

  let renderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(canvasW(), canvasH(), false);
  renderer.outputColorSpace = SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(26, canvasW() / canvasH(), 0.1, 20);

  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const model = gltf.scene;

  // Unlit, so the illustration keeps its exact colours (it's a printed standee)
  model.traverse((o) => {
    if (!o.isMesh) return;
    const old = o.material;
    const map = old.map;
    if (map) {
      map.colorSpace = SRGBColorSpace;
      map.wrapS = map.wrapT = ClampToEdgeWrapping; // no edge bleed = no box outline
      map.anisotropy = 4;
      map.needsUpdate = true;
    }
    // Front side only: the card's back face (mirrored print) must never show
    // through the gap between his legs.
    o.material = new MeshBasicMaterial({ map, transparent: true, alphaTest: 0.04, side: FrontSide, depthWrite: true });
    old.dispose?.();
  });

  // Centre on the feet
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  model.position.x -= centre.x;
  model.position.z -= centre.z;
  model.position.y -= box.min.y;

  const pivot = new Group();
  pivot.add(model);
  scene.add(pivot);

  const fit = () => {
    const w = canvasW(), h = canvasH();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const halfH = (size.y * 1.08) / 2;
    const dist = halfH / Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(0, size.y * 0.5, dist);
    camera.lookAt(0, size.y * 0.5, 0);
    camera.updateProjectionMatrix();
  };
  fit();

  // Motion state
  let spinFrom = 0, spinTo = 0, spinT0 = 0, spinDur = 0;
  let hopT0 = -10;
  let face = false; // hold still facing the visitor while talking
  const t0 = performance.now();

  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function frame(now) {
    const t = (now - t0) / 1000;
    let ry;
    if (spinDur && now < spinT0 + spinDur) {
      ry = spinFrom + (spinTo - spinFrom) * ease((now - spinT0) / spinDur);
    } else {
      if (spinDur) { spinDur = 0; pivot.userData.base = spinTo % (Math.PI * 2); }
      const base = pivot.userData.base || 0;
      const sway = reduceMotion ? 0 : (face ? 0.08 : 0.38) * Math.sin(t * (face ? 1.6 : 0.9));
      ry = base + sway;
    }
    pivot.rotation.y = ry;
    // bob + hop
    const hop = Math.max(0, 1 - (t - hopT0) / 0.45);
    pivot.position.y = (reduceMotion ? 0 : 0.012 * Math.sin(t * 2.2)) + Math.sin(hop * Math.PI) * 0.08 * (hop > 0 ? 1 : 0);
    pivot.rotation.z = reduceMotion ? 0 : 0.015 * Math.sin(t * 1.3);
    renderer.render(scene, camera);
  }

  let running = false;
  const start = () => { if (!running) { running = true; renderer.setAnimationLoop(frame); } };
  const stop = () => { running = false; renderer.setAnimationLoop(null); };
  start();
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  addEventListener('resize', fit);

  return {
    spin(turns = 1, ms = 1400) {
      if (reduceMotion) return;
      const now = performance.now();
      spinFrom = pivot.rotation.y;
      spinTo = (pivot.userData.base || 0) + Math.PI * 2 * turns;
      spinT0 = now; spinDur = ms;
    },
    hop() { if (!reduceMotion) hopT0 = (performance.now() - t0) / 1000; },
    face(v) { face = v; },
  };
}

/* ---------- controller ---------- */
async function main() {
  if (document.querySelector('[data-hd]')) return;
  const root = buildDom();
  document.body.appendChild(root);

  // React may re-render <body>; keep us attached.
  setInterval(() => { if (!root.isConnected) document.body.appendChild(root); }, 2000);

  const stage = root.querySelector('.hd-stage');
  const bubble = root.querySelector('.hd-bubble');
  const text = root.querySelector('.hd-text');
  const closeBtn = root.querySelector('.hd-x');

  let actor = null;
  try { actor = await build3D(stage); } catch (e) { console.warn('[help desk] 3D unavailable', e); }
  if (!actor) {
    const fb = document.createElement('div');
    fb.className = 'hd-fallback';
    stage.appendChild(fb);
    actor = { spin() {}, hop() {}, face() {} };
  }

  requestAnimationFrame(() => root.classList.add('is-in'));

  // Perch on the storefront while the hero's sign card is fully on screen
  const perch = () => {
    const card = document.querySelector('.hero-screen .sign-card');
    if (!card) return root.classList.remove('is-perched');
    const r = card.getBoundingClientRect();
    root.classList.toggle('is-perched', r.top >= 0 && r.bottom <= innerHeight + 2);
  };
  let perchRaf = 0;
  addEventListener('scroll', () => { cancelAnimationFrame(perchRaf); perchRaf = requestAnimationFrame(perch); }, { passive: true });
  addEventListener('resize', perch);
  perch(); setTimeout(perch, 1500);

  // Bubble state machine: idle -> pending (turning / typing) -> on -> idle
  let state = 'idle', hideTimer = 0, typeTimer = 0, shownAt = 0, lastHide = 0, lastScroll = 0;
  let menuOpen = false, dismissed = 0, bubbleSection = null;
  const muted = () => dismissed >= 2;               // closed twice -> quiet for this visit
  const menuIsOpen = () => !!document.querySelector('header.sticky > nav');
  const busy = () => state !== 'idle';

  function show(html, { hold = 6500, spin = true, typing = true } = {}) {
    clearTimeout(hideTimer); clearTimeout(typeTimer);
    state = 'pending';
    if (spin) actor.spin(1, 1100);
    const reveal = () => {
      text.innerHTML = html;
      bubble.classList.add('is-on');
      state = 'on';
      shownAt = Date.now();
      bubbleSection = active;
      actor.face(true);
      actor.hop();
      if (hold) hideTimer = setTimeout(hide, hold);
    };
    const delay = spin && !reduceMotion ? 1000 : 0;
    typeTimer = setTimeout(() => {
      if (typing && !reduceMotion) {
        text.innerHTML = '<span class="hd-dots" aria-label="Nelson is typing"><i></i><i></i><i></i></span>';
        bubble.classList.add('is-on');
        typeTimer = setTimeout(reveal, 600);
      } else reveal();
    }, delay);
  }
  function hide() {
    clearTimeout(hideTimer); clearTimeout(typeTimer);
    bubble.classList.remove('is-on');
    actor.face(false);
    if (state !== 'idle') lastHide = Date.now();
    state = 'idle';
    menuOpen = false;
    bubble.classList.remove('is-menu');
    stage.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    menuOpen = true;
    stage.setAttribute('aria-expanded', 'true');
    const c = shopClock();
    const status = c.open ? 'Open now · until 8 PM' : (c.early ? 'Opens 8 AM' : 'Closed · back 8 AM');
    bubble.classList.add('is-menu');
    show(`<strong class="hd-title">Hi! How can I help?</strong>
      <div class="hd-actions" role="menu">
        <a role="menuitem" href="tel:${PHONE_TEL}">${ico.phone}Call the shop</a>
        <a role="menuitem" href="#visit" data-go="slip">${ico.msg}Order for delivery</a>
        <a role="menuitem" href="${MAPS}" target="_blank" rel="noopener">${ico.pin}Directions</a>
        <button role="menuitem" type="button" data-say="hours">${ico.clock}${status}</button>
        <a role="menuitem" href="#counter" data-go="counter">${ico.food}What's good today?</a>
      </div>`, { hold: 0, typing: false, spin: false });
    actor.spin(1, 700);
    // keyboard users land inside the menu
    setTimeout(() => bubble.querySelector('.hd-actions a, .hd-actions button')?.focus({ preventScroll: true }), 60);
  }

  // Tap/click anywhere else closes the menu
  document.addEventListener('pointerdown', (e) => {
    if (menuOpen && !root.contains(e.target)) hide();
  });

  stage.addEventListener('click', () => {
    if (menuOpen) { hide(); actor.spin(1, 900); return; }
    openMenu();
  });
  stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !bubble.classList.contains('is-on')) actor.spin(1, 1000); });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!menuOpen) dismissed += 1;
    hide();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && bubble.classList.contains('is-on')) hide(); });

  bubble.addEventListener('click', (e) => {
    const a = e.target.closest('[data-go],[data-say]');
    if (!a) return;
    if (a.dataset.say === 'hours') { menuOpen = false; show(lines().visit, { spin: false }); return; }
    if (a.dataset.go === 'slip') {
      e.preventDefault();
      const slip = document.getElementById('slip-note') || document.getElementById('visit');
      slip?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      hide();
      return;
    }
    if (a.dataset.go) hide();
  });

  // Get out of the way once the visitor scrolls on
  let lastY = scrollY;
  addEventListener('scroll', () => {
    lastScroll = Date.now();
    const dy = Math.abs(scrollY - lastY);
    if (dy < 80) return;
    lastY = scrollY;
    if (menuOpen) return;
    if (state === 'on' && Date.now() - shownAt > 1000) hide();
    else if (state === 'pending' && dy > 200) hide();
  }, { passive: true });

  /* ---- Captions: one line per section, fired once per page view ----
     A section "counts" when it crosses the line 45% down the screen and the
     visitor has paused there for a moment. Lines that are blocked (another
     bubble up, still scrolling) wait and fire as soon as they can, instead
     of being dropped. Elements are looked up fresh each tick, so React
     re-rendering the page can't leave us watching stale nodes. */
  const ids = ['top', 'counter', 'sidewalk', 'guardians', 'voices', 'visit', 'owner'];
  const said = new Set();
  let active = null, activeSince = 0, idleN = 0, lastSpin = Date.now();

  function activeSection() {
    const line = innerHeight * 0.45;
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) return id;
    }
    return null;
  }

  function tick() {
    const now = Date.now();
    const id = activeSection();
    if (id !== active) { active = id; activeSince = now; }
    root.dataset.section = id || '';

    // A line belongs to its section: once the visitor has moved on, it steps aside
    if (state === 'on' && !menuOpen && id && bubbleSection && id !== bubbleSection && now - shownAt > 1000) hide();

    if (document.hidden || menuOpen || menuIsOpen() || busy()) return;
    if (now - lastScroll < 450 || now - lastHide < 900) return;

    // 1) section line
    if (id && !said.has(id) && !muted() && now - activeSince > 1100) {
      const msg = lines()[id];
      said.add(id);
      if (msg) { show(msg, { hold: isSmall() ? 5500 : 6500 }); return; }
    }
    // 2) every ~16s: turn around; now and then a tip if nothing's been said for a while
    if (now - lastSpin > 16000) {
      lastSpin = now;
      if (!muted() && idleN < (isSmall() ? 1 : 3) && now - lastHide > 25000) {
        show(lines().idle[idleN++ % 3]);
      } else actor.spin(1, 1500);
    }
  }

  // Hello first (counts as the "top" line), then the scheduler takes over
  setTimeout(() => {
    said.add('top');
    if (activeSection() && activeSection() !== 'top') said.delete('top');
    show(lines().greet, { hold: 7000 });
    setInterval(tick, 300);
  }, 900);
}

main();
