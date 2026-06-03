// workbench.js
// "Modo Taller": permite añadir piezas sueltas, arrastrarlas con el ratón y
// que ENCAJEN automáticamente (snap) cuando dos bocas compatibles (mismo
// diámetro) quedan cerca. Pensado para montar uno mismo una instalación.
//
// Usa DragControls de Three.js. Cada pieza se envuelve en un contenedor que es
// lo que se arrastra, dejando intacta la geometría interna de la pieza.

import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { CATALOG } from './pvc-parts.js';
import { radiusFor, defaultDN } from './diameters.js';

const MARKER_MAT = new THREE.MeshStandardMaterial({
  color: 0x4aa8ff, emissive: 0x1a4a7a, roughness: 0.4,
});
const MARKER_SNAP = new THREE.MeshStandardMaterial({
  color: 0x4ade80, emissive: 0x1a6a3a, roughness: 0.4,
});

export class Workbench {
  constructor({ scene, camera, renderer, orbit, onChange }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbit = orbit;
    this.onChange = onChange || (() => {});

    this.root = new THREE.Group();
    this.pieces = [];          // contenedores arrastrables (referencia estable)
    this.selected = null;
    this.enabled = false;
    this.showMarkers = true;

    // DragControls conserva una referencia a este array: lo mutamos en su
    // sitio (push/splice), nunca lo reasignamos.
    this.drag = new DragControls(this.pieces, camera, renderer.domElement);
    this.drag.addEventListener('dragstart', (e) => this._onDragStart(e));
    this.drag.addEventListener('dragend', (e) => this._onDragEnd(e));
    this.drag.enabled = false;

    this._onKey = this._onKey.bind(this);
  }

  // -- ciclo de vida -------------------------------------------------------
  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.scene.add(this.root);
    this.drag.enabled = true;
    window.addEventListener('keydown', this._onKey);
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.drag.enabled = false;
    this.scene.remove(this.root);
    window.removeEventListener('keydown', this._onKey);
  }

  clear() {
    [...this.pieces].forEach((p) => this._removePiece(p));
    this.selected = null;
    this.onChange();
  }

  // -- añadir / quitar piezas ---------------------------------------------
  addPiece(id, dn) {
    const entry = CATALOG[id];
    if (!entry) return;
    const useDn = dn || defaultDN(entry);
    const R = radiusFor(useDn);

    const inner = id === 'reduccion'
      ? entry.factory({ R1: R, R2: radiusFor(Math.max(20, useDn - 8)) })
      : entry.factory({ R });

    const container = new THREE.Group();
    container.add(inner);
    // Colocación inicial: escalonada para que no se solapen.
    container.position.set((this.pieces.length % 4) * 8 - 12, 6, Math.floor(this.pieces.length / 4) * 8);
    container.userData = { partId: id, dn: useDn, inner };

    this._addMarkers(container);
    this.root.add(container);
    this.pieces.push(container);   // muta el array que usa DragControls
    this.selected = container;
    this.onChange();
    return container;
  }

  _removePiece(container) {
    this.root.remove(container);
    container.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    const i = this.pieces.indexOf(container);
    if (i !== -1) this.pieces.splice(i, 1);   // muta en su sitio
    if (this.selected === container) this.selected = null;
  }

  // Bocas (sockets) en coordenadas de mundo de un contenedor.
  _worldSockets(container) {
    const inner = container.userData.inner;
    const list = (inner.userData.sockets || []);
    inner.updateWorldMatrix(true, false);
    return list.map((s) => ({
      R: s.R,
      world: inner.localToWorld(new THREE.Vector3(...s.pos)),
    }));
  }

  // Marcadores visuales en cada boca (esferas).
  _addMarkers(container) {
    const inner = container.userData.inner;
    (inner.userData.sockets || []).forEach((s) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(s.R * 0.35, 16, 12), MARKER_MAT);
      m.position.set(...s.pos);
      m.userData.isMarker = true;
      inner.add(m);
    });
  }

  setMarkersVisible(v) {
    this.showMarkers = v;
    this.root.traverse((o) => { if (o.userData && o.userData.isMarker) o.visible = v; });
  }

  // -- interacción ---------------------------------------------------------
  _onDragStart(e) {
    this.selected = e.object;
    this.orbit.enabled = false;
  }

  _onDragEnd(e) {
    this.orbit.enabled = true;
    this._trySnap(e.object);
    this.onChange();
  }

  // Intenta encajar el contenedor arrastrado con la boca compatible más
  // cercana de otra pieza. Snap por posición (alinea las dos bocas).
  _trySnap(container) {
    const mine = this._worldSockets(container);
    let best = null;
    for (const other of this.pieces) {
      if (other === container) continue;
      const theirs = this._worldSockets(other);
      for (const a of mine) {
        for (const b of theirs) {
          if (Math.abs(a.R - b.R) > 0.05) continue; // diámetros incompatibles
          const d = a.world.distanceTo(b.world);
          const tol = a.R * 3.0;
          if (d < tol && (!best || d < best.d)) {
            best = { d, delta: b.world.clone().sub(a.world) };
          }
        }
      }
    }
    if (best) {
      container.position.add(best.delta);
      this._flashSnap();
    }
  }

  _flashSnap() {
    // Parpadeo verde breve de los marcadores para confirmar el encaje.
    const markers = [];
    this.root.traverse((o) => { if (o.userData && o.userData.isMarker) markers.push(o); });
    markers.forEach((m) => (m.material = MARKER_SNAP));
    setTimeout(() => markers.forEach((m) => (m.material = MARKER_MAT)), 350);
  }

  _onKey(ev) {
    if (!this.selected) return;
    const k = ev.key.toLowerCase();
    if (k === 'r') {
      // Rotar la pieza seleccionada 45° (Shift = eje X, si no eje Z).
      const axis = ev.shiftKey ? 'x' : 'z';
      this.selected.rotation[axis] += Math.PI / 4;
    } else if (k === 'delete' || k === 'backspace') {
      ev.preventDefault();
      this._removePiece(this.selected);
      this.onChange();
    }
  }

  // Lista de materiales actual (para mostrar el recuento).
  bom() {
    const counts = {};
    this.pieces.forEach((p) => {
      const key = p.userData.partId + '@' + p.userData.dn;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([key, n]) => {
      const [id, dn] = key.split('@');
      return { id, dn: +dn, n, nombre: CATALOG[id] ? CATALOG[id].nombre : id };
    });
  }
}
