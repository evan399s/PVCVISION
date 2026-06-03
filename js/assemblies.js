// assemblies.js
// Montajes definidos como GRAFOS DE CONEXIÓN: cada pieza (nodo) se conecta a
// una boca de otra pieza ya colocada. El motor calcula posición y giro para
// que las bocas encajen exactamente (boca macho contra boca hembra, en sentidos
// opuestos). Así las piezas nunca se solapan ni quedan flotando.
//
// Formato de cada nodo:
//   { id, opts, anchor:{pos?,rot?} }                       // primer nodo (ancla)
//   { id, opts, to, toSocket, mySocket, roll? }            // conectado a otro nodo
//
//   to        = índice del nodo destino (ya colocado)
//   toSocket  = nombre de la boca del destino donde nos enchufamos
//   mySocket  = nombre de mi propia boca que encaja ahí
//   roll      = giro opcional (rad) alrededor del eje de conexión

import * as THREE from 'three';
import { CATALOG } from './pvc-parts.js';

export const ASSEMBLIES = {
  sifon_lavabo: {
    nombre: 'Sifón de lavabo',
    descripcion:
      'Bajo el lavabo: la válvula baja por un tubo hasta el sifón (que retiene ' +
      'agua contra los olores) y de ahí, con un codo, sale hacia la pared.',
    bom: [
      ['valvula', 1, 'Válvula de desagüe'],
      ['tubo', 1, 'Tubo de bajada'],
      ['sifon', 1, 'Sifón en U'],
      ['codo90', 1, 'Codo a la pared'],
      ['tubo', 1, 'Tubo de salida'],
    ],
    pasos: [
      'La válvula del lavabo baja por un tubo vertical.',
      'El tubo entra en la boca de entrada del sifón.',
      'El sifón retiene agua: bloquea los malos olores.',
      'De su salida, un codo de 90° gira hacia la pared.',
      'Un último tubo llega al desagüe de la pared.',
    ],
    nodes: [
      { id: 'sifon', anchor: {}, opts: { R: 2 } },
      { id: 'tubo', to: 0, toSocket: 'entrada', mySocket: 'macho', opts: { R: 2, length: 7 } },
      { id: 'valvula', to: 1, toSocket: 'hembra', mySocket: 'salida', opts: { R: 2 } },
      { id: 'codo90', to: 0, toSocket: 'salida', mySocket: 'A', opts: { R: 2 } },
      { id: 'tubo', to: 3, toSocket: 'B', mySocket: 'macho', opts: { R: 2, length: 7 } },
    ],
  },

  desague_fregadero: {
    nombre: 'Desagüe de fregadero (2 senos)',
    descripcion:
      'Dos cubetas: cada válvula baja por un codo y un tubo hasta una Te común; ' +
      'de la Te sale al sifón y, con otro codo, a la bajante.',
    bom: [
      ['valvula', 2, 'Válvulas de cada cubeta'],
      ['codo90', 3, 'Codos'],
      ['tubo', 3, 'Tubos de conexión'],
      ['te', 1, 'Te de unión'],
      ['sifon', 1, 'Sifón común'],
    ],
    pasos: [
      'Cada cubeta tiene su válvula.',
      'Un codo y un tubo bajan desde cada válvula.',
      'Ambos llegan a una Te que los une.',
      'El ramal de la Te alimenta el sifón común.',
      'Tras el sifón, un codo lleva a la bajante.',
    ],
    nodes: [
      { id: 'te', anchor: { rot: [0, 0, Math.PI] }, opts: { R: 2, run: 16, branch: 5 } },
      { id: 'codo90', to: 0, toSocket: 'izq', mySocket: 'A', opts: { R: 2 } },
      { id: 'tubo', to: 1, toSocket: 'B', mySocket: 'macho', opts: { R: 2, length: 6 } },
      { id: 'valvula', to: 2, toSocket: 'hembra', mySocket: 'salida', opts: { R: 2 } },
      { id: 'codo90', to: 0, toSocket: 'der', mySocket: 'A', opts: { R: 2 } },
      { id: 'tubo', to: 4, toSocket: 'B', mySocket: 'macho', opts: { R: 2, length: 6 } },
      { id: 'valvula', to: 5, toSocket: 'hembra', mySocket: 'salida', opts: { R: 2 } },
      { id: 'sifon', to: 0, toSocket: 'ramal', mySocket: 'entrada', opts: { R: 2 } },
      { id: 'codo90', to: 7, toSocket: 'salida', mySocket: 'A', opts: { R: 2 } },
      { id: 'tubo', to: 8, toSocket: 'B', mySocket: 'macho', opts: { R: 2, length: 6 } },
    ],
  },

  reduccion_demo: {
    nombre: 'Cómo reducir diámetro',
    descripcion:
      'Para pasar de un tubo grueso a uno fino se intercala una REDUCCIÓN. Nunca ' +
      'se mete a la fuerza un tubo dentro de otro de distinto diámetro.',
    bom: [
      ['tubo', 1, 'Tubo Ø grande'],
      ['reduccion', 1, 'Reducción'],
      ['tubo', 1, 'Tubo Ø pequeño'],
    ],
    pasos: [
      'El tubo grande termina en su boca.',
      'La reducción encaja por su lado grande.',
      'El tubo fino entra por el lado estrecho.',
      'Se encola o se sella con junta en cada unión.',
    ],
    nodes: [
      { id: 'tubo', anchor: {}, opts: { R: 2.6, length: 8 } },
      { id: 'reduccion', to: 0, toSocket: 'macho', mySocket: 'grande', opts: { R1: 2.6, R2: 2.0, length: 4 } },
      { id: 'tubo', to: 1, toSocket: 'pequeña', mySocket: 'hembra', opts: { R: 2.0, length: 8 } },
    ],
  },

  union_demo: {
    nombre: 'Cómo unir dos tubos',
    descripcion:
      'Dos tubos del mismo diámetro se empalman con un MANGUITO. El tope central ' +
      'garantiza que ambos entren lo mismo.',
    bom: [
      ['tubo', 2, 'Tubos a unir'],
      ['manguito', 1, 'Manguito de unión'],
    ],
    pasos: [
      'Limpia y lima los extremos de ambos tubos.',
      'Aplica cola de PVC (o junta) en la boca del manguito.',
      'Introduce cada tubo hasta el tope central.',
      'Mantén la presión unos segundos hasta que fragüe.',
    ],
    nodes: [
      { id: 'tubo', anchor: {}, opts: { R: 2, length: 8 } },
      { id: 'manguito', to: 0, toSocket: 'macho', mySocket: 'A', opts: { R: 2, length: 4 } },
      { id: 'tubo', to: 1, toSocket: 'B', mySocket: 'hembra', opts: { R: 2, length: 8 } },
    ],
  },

  inodoro_bajante: {
    nombre: 'Inodoro a bajante (110 mm)',
    descripcion:
      'El inodoro evacua por una salida horizontal de 110 mm. Se conecta a la ' +
      'bajante con un manguito y un codo de 90°. ¡El WC nunca se reduce!',
    bom: [
      ['inodoro', 1, 'Taza del WC'],
      ['manguito', 1, 'Manguito de inodoro (110 mm)'],
      ['codo90', 1, 'Codo 90° de 110 mm'],
      ['tubo', 1, 'Tramo a la bajante'],
    ],
    pasos: [
      'La salida del inodoro es de 110 mm: no se reduce.',
      'Se encaja un manguito en la salida de la taza.',
      'Un codo de 90° gira hacia la bajante.',
      'Un tubo de 110 mm empalma con la bajante general.',
    ],
    nodes: [
      { id: 'inodoro', anchor: {}, opts: { R: 5.5 } },
      { id: 'manguito', to: 0, toSocket: 'salida', mySocket: 'A', opts: { R: 5.5, length: 6 } },
      { id: 'codo90', to: 1, toSocket: 'B', mySocket: 'A', opts: { R: 5.5 } },
      { id: 'tubo', to: 2, toSocket: 'B', mySocket: 'hembra', opts: { R: 5.5, length: 12 } },
    ],
  },

  ducha_sumidero: {
    nombre: 'Desagüe de ducha (50 mm)',
    descripcion:
      'El plato de ducha desagua por un sumidero con sifón integrado y salida ' +
      'horizontal de 50 mm, que con un codo llega a la bajante.',
    bom: [
      ['sumidero', 1, 'Sumidero con sifón'],
      ['tubo', 2, 'Tubos de 50 mm'],
      ['codo90', 1, 'Codo a la bajante'],
    ],
    pasos: [
      'El sumidero se embute en el plato de ducha.',
      'Su sifón integrado bloquea los olores.',
      'Un tubo horizontal sale del sumidero.',
      'Un codo de 90° gira hacia la bajante.',
    ],
    nodes: [
      { id: 'sumidero', anchor: {}, opts: { R: 2.5 } },
      { id: 'tubo', to: 0, toSocket: 'salida', mySocket: 'macho', opts: { R: 2.5, length: 8 } },
      { id: 'codo90', to: 1, toSocket: 'hembra', mySocket: 'A', opts: { R: 2.5 } },
      { id: 'tubo', to: 2, toSocket: 'B', mySocket: 'macho', opts: { R: 2.5, length: 8 } },
    ],
  },

  bote_sifonico: {
    nombre: 'Bote sifónico (varios aparatos)',
    descripcion:
      'Un único bote sifónico recoge lavabo, ducha y bidé por sus bocas laterales ' +
      'y evacua todo con un solo cierre hidráulico por la salida inferior.',
    bom: [
      ['boteSifonico', 1, 'Bote sifónico'],
      ['tubo', 4, 'Entradas y salida'],
      ['codo90', 1, 'Codo a la bajante'],
    ],
    pasos: [
      'El bote sifónico se sitúa bajo el suelo del baño.',
      'Cada aparato entra por una boca lateral.',
      'El cierre hidráulico del bote bloquea olores para todos.',
      'La salida inferior, con un codo, va a la bajante.',
    ],
    nodes: [
      { id: 'boteSifonico', anchor: {}, opts: { R: 2 } },
      { id: 'tubo', to: 0, toSocket: 'entrada1', mySocket: 'macho', opts: { R: 2, length: 7 } },
      { id: 'tubo', to: 0, toSocket: 'entrada2', mySocket: 'macho', opts: { R: 2, length: 7 } },
      { id: 'tubo', to: 0, toSocket: 'entrada3', mySocket: 'macho', opts: { R: 2, length: 7 } },
      { id: 'tubo', to: 0, toSocket: 'salida', mySocket: 'hembra', opts: { R: 2, length: 7 } },
      { id: 'codo90', to: 4, toSocket: 'macho', mySocket: 'A', opts: { R: 2 } },
    ],
  },

  bajante: {
    nombre: 'Bajante con acometidas',
    descripcion:
      'Tubería vertical principal (110 mm) que recibe el desagüe de cada planta ' +
      'por una Te y baja a la red, suavizando el giro final con un codo de 45°.',
    bom: [
      ['tubo', 4, 'Tramos de bajante y acometidas'],
      ['te', 2, 'Tes de acometida'],
      ['codo45', 1, 'Codo 45° en la base'],
    ],
    pasos: [
      'La bajante es vertical y de gran diámetro (110 mm).',
      'En cada planta una Te recoge el ramal del baño.',
      'Los ramales entran por el lateral de la Te.',
      'En la base, un codo de 45° suaviza el giro a la red.',
    ],
    nodes: [
      { id: 'tubo', anchor: {}, opts: { R: 5.5, length: 12 } },
      { id: 'te', to: 0, toSocket: 'macho', mySocket: 'der', opts: { R: 5.5, run: 12, branch: 7 } },
      { id: 'tubo', to: 1, toSocket: 'ramal', mySocket: 'macho', opts: { R: 5.5, length: 6 } },
      { id: 'tubo', to: 1, toSocket: 'izq', mySocket: 'hembra', opts: { R: 5.5, length: 12 } },
      { id: 'te', to: 3, toSocket: 'macho', mySocket: 'der', opts: { R: 5.5, run: 12, branch: 7 } },
      { id: 'tubo', to: 4, toSocket: 'ramal', mySocket: 'macho', opts: { R: 5.5, length: 6 } },
      { id: 'codo45', to: 4, toSocket: 'izq', mySocket: 'A', opts: { R: 5.5 } },
      { id: 'tubo', to: 6, toSocket: 'B', mySocket: 'macho', opts: { R: 5.5, length: 8 } },
    ],
  },
};

// ---------------------------------------------------------------------------
// Motor de ensamblaje por conexión de bocas
// ---------------------------------------------------------------------------

// Crea la geometría interna de un nodo a partir del catálogo.
function makeInner(node) {
  const entry = CATALOG[node.id];
  return entry.factory(node.opts || {});
}

// Devuelve { pos, dir } en mundo de una boca de un contenedor ya colocado.
function socketWorld(container, name) {
  const s = container.userData.socks[name];
  return {
    pos: s.pos.clone().applyQuaternion(container.quaternion).add(container.position),
    dir: s.dir.clone().applyQuaternion(container.quaternion).normalize(),
  };
}

export function buildAssembly(key, explode = 0) {
  const def = ASSEMBLIES[key];
  const root = new THREE.Group();
  if (!def || !def.nodes) return root;

  const containers = [];

  def.nodes.forEach((node) => {
    const inner = makeInner(node);
    const c = new THREE.Group();
    c.add(inner);
    inner.updateMatrix();

    // Bocas en el marco local del contenedor (incluye transform interno).
    const socks = {};
    (inner.userData.sockets || []).forEach((s) => {
      socks[s.name] = {
        pos: new THREE.Vector3(...s.pos).applyMatrix4(inner.matrix),
        dir: new THREE.Vector3(...s.dir).transformDirection(inner.matrix).normalize(),
        R: s.R,
      };
    });
    c.userData = { socks, partId: node.id };

    if (node.anchor) {
      if (node.anchor.pos) c.position.set(...node.anchor.pos);
      if (node.anchor.rot) c.rotation.set(...node.anchor.rot);
    } else {
      const target = containers[node.to];
      const t = socketWorld(target, node.toSocket);
      const m = socks[node.mySocket];

      // Orientar: mi boca debe quedar opuesta a la boca destino.
      const negDir = t.dir.clone().multiplyScalar(-1).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(m.dir.clone().normalize(), negDir);
      if (node.roll) {
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(negDir, node.roll));
      }
      c.quaternion.copy(q);

      // Trasladar para que mi boca coincida con la boca destino.
      const rotatedMyPos = m.pos.clone().applyQuaternion(q);
      c.position.copy(t.pos).sub(rotatedMyPos);
    }

    c.updateMatrixWorld(true);
    containers.push(c);
    root.add(c);
  });

  // Despiece: separa radialmente desde el centroide del conjunto.
  if (explode > 0 && containers.length) {
    const center = new THREE.Vector3();
    containers.forEach((c) => center.add(c.position));
    center.multiplyScalar(1 / containers.length);
    containers.forEach((c) => {
      const off = c.position.clone().sub(center);
      if (off.lengthSq() > 1e-6) c.position.addScaledVector(off.normalize(), explode * 7);
    });
  }

  return root;
}
