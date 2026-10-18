const $ = id => document.getElementById(id);
const stage = $('stage'), actor = $('actor'), pet = $('pet'), bubble = $('bubble'), bubbleText = $('bubbleText');

const STAY_MS = 8000;          // how long the pet stays on screen after it has arrived (it used to be 18000)
const HOVER_GRACE_MS = 3000;   // extra time after your mouse leaves the pet
const GLIDE_PX_PER_MS = 1.2;   // glide speed; the whole trip is kept between 0.45s and 1.1s

let settings = {}, state = 'hidden';   // hidden | entering | here | leaving
let anim = null, leaveTimer, bubbleTimer, pendingText = 'Hi!', over = false, drag = null, justDragged = false;

const stageW = () => stage.clientWidth, actorW = () => actor.offsetWidth;
const targetX = () => Math.max(0, Math.min(stageW() - actorW(), Math.round(stageW() * 0.3 - actorW() / 2)));   // between centre and left
const offX = () => stageW() - 60;                                                                                // just off the right edge
const setX = x => { actor.style.transform = 'translateX(' + x + 'px)'; };
const currentX = () => new DOMMatrixReadOnly(getComputedStyle(actor).transform).m41;

function speak(text, ms = 6500) { bubbleText.textContent = text; bubble.hidden = false; clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => bubble.hidden = true, ms); }
function armLeave(ms) { clearTimeout(leaveTimer); if (over) return; leaveTimer = setTimeout(() => window.petAPI.closePet(), ms); }
function stopGlide() { if (anim) { const x = currentX(); anim.cancel(); anim = null; setX(x); } stage.classList.remove('walking'); }

// Smooth glide: a compositor-driven transform animation (no window moving).
function glide(to, done) {
  const from = currentX();
  if (anim) { anim.cancel(); anim = null; }
  setX(from);
  const ms = Math.min(1100, Math.max(450, Math.abs(to - from) / GLIDE_PX_PER_MS)) / (Number(settings.animationSpeed) || 1);
  stage.classList.add('walking');
  const a = actor.animate([{ transform: 'translateX(' + from + 'px)' }, { transform: 'translateX(' + to + 'px)' }], { duration: ms, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  anim = a;
  a.onfinish = () => { if (anim !== a) return; setX(to); a.cancel(); anim = null; stage.classList.remove('walking'); if (done) done(); };
}

function enter(text) {
  clearTimeout(leaveTimer); pendingText = text; bubble.hidden = true;
  if (state === 'hidden') setX(offX());
  state = 'entering';
  glide(targetX(), () => { state = 'here'; speak(pendingText); armLeave(STAY_MS); });
}
function leave() {
  if (state === 'hidden' || state === 'leaving') return;
  clearTimeout(leaveTimer); bubble.hidden = true; state = 'leaving';
  glide(offX(), () => { state = 'hidden'; setOver(false); window.petAPI.hidden(); });
}

window.petAPI.on('pet:settings', d => {
  settings = d || {};
  const sc = { small: .72, medium: 1, large: 1.28 }[settings.petSize] || 1, root = document.documentElement.style;
  root.setProperty('--aw', Math.round(300 * sc) + 'px'); root.setProperty('--ah', Math.round(330 * sc) + 'px');
});
window.petAPI.on('pet:visit', d => {
  const text = (d && d.text) || 'Hi there!';
  if (d && d.fresh) { stopGlide(); state = 'hidden'; }
  if (state === 'hidden' || state === 'leaving') enter(text);
  else if (state === 'entering') pendingText = text;
  else { speak(text); armLeave(STAY_MS); }
});
window.petAPI.on('pet:leave', () => leave());

// The window is click-through except where the pet is: tell the main process when the mouse is over it.
function setOver(v) {
  if (v === over) return; over = v; window.petAPI.setIgnore(!v);
  if (state === 'here') { if (v) clearTimeout(leaveTimer); else armLeave(HOVER_GRACE_MS); }
}
document.addEventListener('mousemove', e => {
  if (drag) return;
  if (state === 'hidden') { setOver(false); return; }
  const r = pet.getBoundingClientRect();
  setOver(e.clientX >= r.left + r.width * .25 && e.clientX <= r.right - r.width * .25 && e.clientY >= r.top + r.height * .3 && e.clientY <= r.bottom);
});
document.addEventListener('mouseleave', () => { if (!drag) setOver(false); });

// Drag sideways along the bottom edge. A drag is not a click.
pet.addEventListener('pointerdown', e => { if (e.button !== 0) return; pet.setPointerCapture(e.pointerId); drag = { sx: e.clientX, x0: currentX(), moved: false }; });
pet.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.abs(e.clientX - drag.sx) < 6) return;
    drag.moved = true; clearTimeout(leaveTimer);
    if (state === 'entering' || state === 'leaving') { stopGlide(); state = 'here'; }
    drag.x0 = currentX(); drag.sx = e.clientX;
  }
  setX(Math.max(0, Math.min(stageW() - actorW(), drag.x0 + e.clientX - drag.sx)));
});
pet.addEventListener('pointerup', () => { justDragged = !!(drag && drag.moved); drag = null; if (justDragged) armLeave(STAY_MS); setTimeout(() => { justDragged = false; }, 0); });
pet.addEventListener('pointercancel', () => { drag = null; });
// Click while it is gliding in/out = skip this visit. Otherwise open the chat.
pet.addEventListener('click', () => {
  if (justDragged) return;
  if (state === 'entering' || state === 'leaving') { window.petAPI.closePet(); return; }
  window.petAPI.openChat(Math.round(currentX()));
});
pet.addEventListener('contextmenu', e => { e.preventDefault(); window.petAPI.closePet(); });
