// assemblies.js
// Montajes predefinidos: listas de piezas con su posición/rotación para
// representar instalaciones reales (sifón de lavabo, desagüe de fregadero...).
//
// Cada montaje define:
//   nombre, descripcion, lista de materiales (BOM) y piezas colocadas.
// Cada pieza colocada: { id, pos:[x,y,z], rot:[x,y,z], opts:{} }
// El `id` referencia una entrada del CATALOG de pvc-parts.js.

import * as THREE from 'three';
import { CATALOG } from './pvc-parts.js';

export const ASSEMBLIES = {
  sifon_lavabo: {
    nombre: 'Sifón de lavabo',
    descripcion:
      'Conjunto típico bajo un lavabo: la válvula sale del lavabo, baja por un tubo, ' +
      'pasa por el sifón (que retiene agua contra los olores) y va a la pared.',
    bom: [
      ['valvula', 1, 'Válvula de desagüe del lavabo'],
      ['tubo', 1, 'Tubo de bajada (32 mm)'],
      ['sifon', 1, 'Sifón en U'],
      ['tubo', 1, 'Tubo de salida a la pared'],
      ['codo90', 1, 'Codo de entrada a la pared'],
    ],
    pasos: [
      'Enrosca la válvula en el desagüe del lavabo.',
      'Conecta un tubo vertical desde la válvula hacia abajo.',
      'Coloca el sifón: su entrada recibe el tubo de bajada.',
      'De la salida del sifón sal hacia la pared con otro tubo.',
      'Remata con un codo de 90° que entra al desagüe de la pared.',
    ],
    piezas: [
      { id: 'valvula', pos: [-4.5, 14, 0], rot: [0, 0, 0] },
      { id: 'tubo', pos: [-4.5, 8.5, 0], rot: [0, 0, 0], opts: { length: 6 } },
      { id: 'sifon', pos: [0, 2, 0], rot: [0, 0, 0] },
      { id: 'tubo', pos: [7, 4.5, 0], rot: [0, 0, Math.PI / 2], opts: { length: 5 } },
      { id: 'codo90', pos: [10.5, 6.5, 0], rot: [0, 0, 0] },
    ],
  },

  desague_fregadero: {
    nombre: 'Desagüe de fregadero (2 senos)',
    descripcion:
      'Fregadero de dos cubetas: cada válvula baja a una Te que une ambos desagües ' +
      'en un solo sifón y de ahí a la bajante.',
    bom: [
      ['valvula', 2, 'Válvulas de cada cubeta'],
      ['tubo', 3, 'Tubos de conexión'],
      ['te', 1, 'Te que une las dos cubetas'],
      ['sifon', 1, 'Sifón común'],
      ['codo90', 1, 'Codo a la bajante'],
    ],
    pasos: [
      'Cada cubeta lleva su válvula.',
      'Baja un tubo desde cada válvula.',
      'Une ambos en una Te (ramal central hacia el sifón).',
      'El sifón retiene el agua y evita olores.',
      'Sal hacia la bajante con un codo de 90°.',
    ],
    piezas: [
      { id: 'valvula', pos: [-9, 14, 0] },
      { id: 'valvula', pos: [4, 14, 0] },
      { id: 'tubo', pos: [-9, 9, 0], opts: { length: 6 } },
      { id: 'te', pos: [-2.5, 6, 0], opts: { run: 16 } },
      { id: 'tubo', pos: [4, 9.5, 0], opts: { length: 5 } },
      { id: 'tubo', pos: [-2.5, 0, 0], opts: { length: 4 } },
      { id: 'sifon', pos: [-2.5, -6, 0] },
      { id: 'codo90', pos: [8, -2, 0] },
    ],
  },

  reduccion_demo: {
    nombre: 'Cómo reducir diámetro',
    descripcion:
      'Para pasar de un tubo grueso (p. ej. 40 mm) a uno fino (32 mm) se intercala ' +
      'una REDUCCIÓN entre ambos. Nunca se fuerza un tubo dentro de otro de distinto diámetro.',
    bom: [
      ['tubo', 1, 'Tubo Ø grande (40 mm)'],
      ['reduccion', 1, 'Reducción 40→32'],
      ['tubo', 1, 'Tubo Ø pequeño (32 mm)'],
    ],
    pasos: [
      'El tubo grande termina en una boca de mayor diámetro.',
      'La reducción encaja: lado grande arriba, lado pequeño abajo.',
      'El tubo fino entra en el lado estrecho de la reducción.',
      'Se encola o se sella con junta en cada unión.',
    ],
    piezas: [
      { id: 'tubo', pos: [0, 9, 0], opts: { length: 8, R: 2.6 } },
      { id: 'reduccion', pos: [0, 3.5, 0], opts: { R1: 2.6, R2: 2.0, length: 4 } },
      { id: 'tubo', pos: [0, -3, 0], opts: { length: 8, R: 2.0 } },
    ],
  },

  union_demo: {
    nombre: 'Cómo unir dos tubos',
    descripcion:
      'Dos tubos del mismo diámetro se empalman con un MANGUITO (manguito de unión). ' +
      'El tope central garantiza que ambos entren lo mismo.',
    bom: [
      ['tubo', 2, 'Tubos a unir'],
      ['manguito', 1, 'Manguito de unión'],
    ],
    pasos: [
      'Limpia y lima los extremos de ambos tubos.',
      'Aplica cola de PVC (o junta de goma) en la boca del manguito.',
      'Introduce cada tubo hasta el tope central del manguito.',
      'Mantén la presión unos segundos hasta que fragüe.',
    ],
    piezas: [
      { id: 'tubo', pos: [0, 8, 0], opts: { length: 8 } },
      { id: 'manguito', pos: [0, 2, 0], opts: { length: 4 } },
      { id: 'tubo', pos: [0, -6, 0], opts: { length: 8 } },
    ],
  },
};

// Construye un THREE.Group con todas las piezas de un montaje colocadas.
// `explode` (0..1) separa las piezas a lo largo de su eje para ver el despiece.
export function buildAssembly(key, explode = 0) {
  const def = ASSEMBLIES[key];
  const group = new THREE.Group();
  if (!def) return group;

  def.piezas.forEach((p, i) => {
    const entry = CATALOG[p.id];
    if (!entry) return;
    const mesh = entry.factory(p.opts || {});
    const [x, y, z] = p.pos || [0, 0, 0];
    // Despiece: desplaza verticalmente proporcional al índice.
    const off = (i - def.piezas.length / 2) * explode * 3;
    mesh.position.set(x, y + off, z);
    if (p.rot) mesh.rotation.set(...p.rot);
    mesh.userData.partId = p.id;
    group.add(mesh);
  });
  return group;
}
