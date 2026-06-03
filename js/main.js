// main.js — Configuración de la escena 3D, controles e interfaz de PVCVision.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CATALOG } from './pvc-parts.js';
import { ASSEMBLIES, buildAssembly } from './assemblies.js';

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
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(10, 20, 12);
scene.add(key);
const fill = new THREE.DirectionalLight(0x8899ff, 0.4);
fill.position.set(-12, 6, -8);
scene.add(fill);

const grid = new THREE.GridHelper(60, 30, 0x3a3f47, 0x2a2e34);
grid.position.y = -12;
scene.add(grid);

// Grupo contenedor de la pieza/montaje actual.
let current = new THREE.Group();
scene.add(current);

function clearCurrent() {
  current.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
  scene.remove(current);
  current = new THREE.Group();
  scene.add(current);
}

// Centra y encuadra la cámara sobre el objeto actual.
function frame(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  controls.target.copy(center);
  const dir = new THREE.Vector3(1, 0.7, 1.2).normalize();
  camera.position.copy(center).addScaledVector(dir, size * 1.1);
  controls.update();
}

// ---------------------------------------------------------------------------
// Estado y vistas
// ---------------------------------------------------------------------------
let mode = 'part';     // 'part' | 'assembly'
let activeKey = null;
let explode = 0;
let spin = false;

function showPart(id) {
  mode = 'part';
  activeKey = id;
  clearCurrent();
  const entry = CATALOG[id];
  const mesh = entry.factory({});
  current.add(mesh);
  frame(current);
  renderInfoPart(id);
  document.getElementById('explodeRow').style.display = 'none';
  highlight();
}

function showAssembly(key) {
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
// Paneles de información
// ---------------------------------------------------------------------------
const infoEl = document.getElementById('info');

function renderInfoPart(id) {
  const p = CATALOG[id];
  infoEl.innerHTML = `
    <h2>${p.nombre}</h2>
    <span class="tag">${p.bocas} ${p.bocas === 1 ? 'boca' : 'bocas'}</span>
    <h3>¿Para qué sirve?</h3><p>${p.uso}</p>
    <h3>¿Cómo se une?</h3><p>${p.union}</p>
  `;
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

// ---------------------------------------------------------------------------
// Construcción del menú lateral
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
  const wanted = (mode === 'part' ? 'part:' : 'asm:') + activeKey;
  document.querySelectorAll('.item').forEach((el) => {
    el.classList.toggle('active', el.dataset.key === wanted);
  });
}

// ---------------------------------------------------------------------------
// Controles de la barra superior
// ---------------------------------------------------------------------------
document.getElementById('spinBtn').onclick = (e) => {
  spin = !spin;
  e.target.classList.toggle('on', spin);
};
document.getElementById('resetBtn').onclick = () => frame(current);
document.getElementById('explode').oninput = (e) => {
  explode = parseFloat(e.target.value);
  if (mode === 'assembly') { rebuildAssembly(); }
};

// ---------------------------------------------------------------------------
// Bucle de render
// ---------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  if (spin) current.rotation.y += 0.006;
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
showAssembly('sifon_lavabo');
animate();
