// main.js — Escena 3D, interfaz y orquestación de PVCVision.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CATALOG } from './pvc-parts.js';
import { ASSEMBLIES, buildAssembly } from './assemblies.js';
import { DN_LIST, radiusFor, defaultDN, reductionFor } from './diameters.js';
import { Workbench } from './workbench.js';

// ---------------------------------------------------------------------------
// Escena, cámara, render
// ---------------------------------------------------------------------------
const viewport = document.getElementById('viewport');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1d23);

const camera = new THREE.PerspectiveCamera(
  45, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
camera.position.set(18, 14, 24);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// ---------------------------------------------------------------------------
// Iluminación y suelo
// ---------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x33373d, 0.9));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(10, 20, 12);
scene.add(keyLight);
const fill = new THREE.DirectionalLight(0x8899ff, 0.4);
fill.position.set(-12, 6, -8);
scene.add(fill);

const grid = new THREE.GridHelper(80, 40, 0x3a3f47, 0x2a2e34);
grid.position.y = -14;
scene.add(grid);

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
let current = new THREE.Group();   // pieza o montaje en modo "visor"
scene.add(current);

let viewMode = 'view';             // 'view' | 'workbench'
let mode = 'part';                 // dentro de 'view': 'part' | 'assembly'
let activeKey = null;
let currentDN = 40;
let explode = 0;
let spin = false;

const workbench = new Workbench({
  scene, camera, renderer, orbit: controls, onChange: renderWorkbenchPanel,
});

// ---------------------------------------------------------------------------
// Utilidades de escena
// ---------------------------------------------------------------------------
function clearCurrent() {
  current.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  scene.remove(current);
  current = new THREE.Group();
  scene.add(current);
}

function frame(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  controls.target.copy(center);
  const dir = new THREE.Vector3(1, 0.7, 1.2).normalize();
  camera.position.copy(center).addScaledVector(dir, Math.max(size * 1.1, 12));
  controls.update();
}

// Construye una pieza al diámetro currentDN (la reducción usa dos diámetros).
function makePart(id) {
  const R = radiusFor(currentDN);
  if (id === 'reduccion') {
    const small = Math.max(20, currentDN - 8);
    return CATALOG[id].factory({ R1: R, R2: radiusFor(small) });
  }
  return CATALOG[id].factory({ R });
}

// ---------------------------------------------------------------------------
// Modo VISOR: piezas y montajes
// ---------------------------------------------------------------------------
function showPart(id) {
  if (viewMode === 'workbench') { workbench.addPiece(id, currentDN); return; }
  mode = 'part';
  activeKey = id;
  currentDN = defaultDN(CATALOG[id]);
  syncDNSelect();
  clearCurrent();
  current.add(makePart(id));
  frame(current);
  renderInfoPart(id);
  document.getElementById('explodeRow').style.display = 'none';
  highlight();
}

function rerenderPart() {
  clearCurrent();
  current.add(makePart(activeKey));
  frame(current);
}

function showAssembly(key) {
  setWorkbench(false);
  mode = 'assembly';
  activeKey = key;
  rebuildAssembly();
  frame(current);
  renderInfoAssembly(key);
  document.getElementById('explodeRow').style.display = 'flex';
  highlight();
}

function rebuildAssembly() {
  clearCurrent();
  current.add(buildAssembly(activeKey, explode));
}

// ---------------------------------------------------------------------------
// Modo TALLER (snap)
// ---------------------------------------------------------------------------
function setWorkbench(on) {
  if (on === (viewMode === 'workbench')) return;
  if (on) {
    viewMode = 'workbench';
    clearCurrent();
    workbench.enable();
    document.getElementById('explodeRow').style.display = 'none';
    document.getElementById('tallerBtn').classList.add('on');
    renderWorkbenchPanel();
  } else {
    viewMode = 'view';
    workbench.disable();
    document.getElementById('tallerBtn').classList.remove('on');
  }
  highlight();
}

// ---------------------------------------------------------------------------
// Paneles de información
// ---------------------------------------------------------------------------
const infoEl = document.getElementById('info');

function renderInfoPart(id) {
  const p = CATALOG[id];
  let extra = '';
  if (id === 'reduccion') extra = reductionFinderHTML();
  infoEl.innerHTML = `
    <h2>${p.nombre}</h2>
    <span class="tag">${p.bocas} ${p.bocas === 1 ? 'boca' : 'bocas'}</span>
    <span class="tag">Ø ${currentDN} mm</span>
    <h3>¿Para qué sirve?</h3><p>${p.uso}</p>
    <h3>¿Cómo se une?</h3><p>${p.union}</p>
    ${extra}
  `;
  if (id === 'reduccion') wireReductionFinder();
}

function renderInfoAssembly(key) {
  const a = ASSEMBLIES[key];
  const bom = a.bom.map(([pid, n, desc]) =>
    `<li><b>${n}×</b> ${CATALOG[pid] ? CATALOG[pid].nombre : pid} — <span class="muted">${desc}</span></li>`
  ).join('');
  const pasos = a.pasos.map((s) => `<li>${s}</li>`).join('');
  infoEl.innerHTML = `
    <h2>${a.nombre}</h2>
    <p>${a.descripcion}</p>
    <h3>Materiales necesarios</h3><ul class="bom">${bom}</ul>
    <h3>Pasos de montaje</h3><ol class="pasos">${pasos}</ol>
  `;
}

function renderWorkbenchPanel() {
  if (viewMode !== 'workbench') return;
  const items = workbench.bom().map((b) =>
    `<li><b>${b.n}×</b> ${b.nombre} <span class="muted">(Ø ${b.dn})</span></li>`
  ).join('') || '<li class="muted">Aún no has añadido piezas.</li>';
  infoEl.innerHTML = `
    <h2>Modo Taller 🔧</h2>
    <p>Elige un diámetro arriba y haz clic en una pieza del catálogo para
       añadirla. <b>Arrastra</b> las piezas: encajan solas cuando dos bocas del
       mismo diámetro se acercan.</p>
    <h3>Atajos</h3>
    <ul>
      <li><b>Arrastrar</b> = mover pieza (snap automático)</li>
      <li><b>R</b> = girar pieza 45° · <b>Shift+R</b> = otro eje</li>
      <li><b>Supr</b> = borrar la pieza seleccionada</li>
    </ul>
    <h3>Piezas colocadas</h3>
    <ul class="bom">${items}</ul>
    <button id="wbClear" class="wbtn">Vaciar taller</button>
  `;
  const clr = document.getElementById('wbClear');
  if (clr) clr.onclick = () => workbench.clear();
}

// --- Buscador de reducción (dentro de la ficha de la reducción) ----------
function reductionFinderHTML() {
  const opts = DN_LIST.map((d) => `<option value="${d.dn}">${d.dn} mm</option>`).join('');
  return `
    <h3>Buscador de reducción</h3>
    <p class="muted">¿De qué diámetro a cuál quieres pasar?</p>
    <div class="finder">
      <select id="rdFrom">${opts}</select>
      <span>→</span>
      <select id="rdTo">${opts}</select>
    </div>
    <p id="rdResult" class="result"></p>
  `;
}

function wireReductionFinder() {
  const from = document.getElementById('rdFrom');
  const to = document.getElementById('rdTo');
  from.value = '40'; to.value = '32';
  const update = () => {
    const r = reductionFor(+from.value, +to.value);
    document.getElementById('rdResult').textContent = r.etiqueta;
    // Refleja en 3D la reducción seleccionada.
    if (r.needed) {
      currentDN = r.from;
      clearCurrent();
      current.add(CATALOG.reduccion.factory({ R1: radiusFor(r.from), R2: radiusFor(r.to) }));
      frame(current);
    }
  };
  from.onchange = update; to.onchange = update;
  update();
}

// ---------------------------------------------------------------------------
// Menú lateral
// ---------------------------------------------------------------------------
function buildMenu() {
  const partsEl = document.getElementById('parts');
  Object.entries(CATALOG).forEach(([id, p]) => {
    const b = document.createElement('button');
    b.className = 'item';
    b.dataset.key = 'part:' + id;
    b.textContent = p.nombre;
    b.onclick = () => showPart(id);
    partsEl.appendChild(b);
  });

  const asmEl = document.getElementById('assemblies');
  Object.entries(ASSEMBLIES).forEach(([key, a]) => {
    const b = document.createElement('button');
    b.className = 'item';
    b.dataset.key = 'asm:' + key;
    b.textContent = a.nombre;
    b.onclick = () => showAssembly(key);
    asmEl.appendChild(b);
  });
}

function highlight() {
  const wanted = viewMode === 'workbench'
    ? null
    : (mode === 'part' ? 'part:' : 'asm:') + activeKey;
  document.querySelectorAll('.item').forEach((el) => {
    el.classList.toggle('active', el.dataset.key === wanted);
  });
}

// ---------------------------------------------------------------------------
// Barra superior
// ---------------------------------------------------------------------------
function buildDNSelect() {
  const sel = document.getElementById('dn');
  DN_LIST.forEach((d) => {
    const o = document.createElement('option');
    o.value = d.dn;
    o.textContent = `Ø ${d.dn} mm · ${d.uso}`;
    sel.appendChild(o);
  });
  sel.value = currentDN;
  sel.onchange = () => {
    currentDN = +sel.value;
    if (viewMode === 'view' && mode === 'part') {
      rerenderPart();
      renderInfoPart(activeKey);
    }
  };
}

function syncDNSelect() {
  const sel = document.getElementById('dn');
  if (sel) sel.value = currentDN;
}

document.getElementById('spinBtn').onclick = (e) => {
  spin = !spin;
  e.currentTarget.classList.toggle('on', spin);
};
document.getElementById('resetBtn').onclick = () => {
  frame(viewMode === 'workbench' ? workbench.root : current);
};
document.getElementById('tallerBtn').onclick = () => setWorkbench(viewMode !== 'workbench');
document.getElementById('explode').oninput = (e) => {
  explode = parseFloat(e.target.value);
  if (mode === 'assembly' && viewMode === 'view') rebuildAssembly();
};

// ---------------------------------------------------------------------------
// Bucle de render
// ---------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  if (spin && viewMode === 'view') current.rotation.y += 0.006;
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
});

// Arranque
buildMenu();
buildDNSelect();
showAssembly('sifon_lavabo');
animate();
