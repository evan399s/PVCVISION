// pvc-parts.js
// Generadores procedurales de geometría para piezas (fittings) de PVC.
// Cada función devuelve un THREE.Group orientado y centrado en el origen,
// con metadatos en .userData.sockets que describen las bocas de conexión.
//
// Convención de unidades: 1 unidad ≈ 1 cm. El diámetro nominal por defecto
// (DN) es de 4 cm (radio 2). Las piezas se construyen como tubos huecos para
// que se aprecie el grosor de la pared y el interior.

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Materiales compartidos
// ---------------------------------------------------------------------------
export const PVC_WHITE = new THREE.MeshStandardMaterial({
  color: 0xf2f2ef,
  roughness: 0.55,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

export const PVC_GREY = new THREE.MeshStandardMaterial({
  color: 0xb8bcc0,
  roughness: 0.6,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

// Interior oscuro para dar sensación de hueco.
const PVC_INNER = new THREE.MeshStandardMaterial({
  color: 0x2a2d31,
  roughness: 0.9,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

// Junta de goma (en sifones, racores).
const RUBBER = new THREE.MeshStandardMaterial({
  color: 0x222222,
  roughness: 0.85,
  metalness: 0.0,
});

// ---------------------------------------------------------------------------
// Helpers de bajo nivel
// ---------------------------------------------------------------------------

// Tubo hueco recto a lo largo del eje Y, centrado en el origen.
// Devuelve un Group con pared exterior, pared interior y dos anillos de borde.
function hollowPipe(length, outerR, wall = outerR * 0.12, mat = PVC_WHITE) {
  const g = new THREE.Group();
  const innerR = Math.max(0.01, outerR - wall);
  const RAD = 48;

  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(outerR, outerR, length, RAD, 1, true),
    mat
  );
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(innerR, innerR, length, RAD, 1, true),
    PVC_INNER
  );
  g.add(outer, inner);

  // Anillos (coronas) que cierran el grosor de pared en cada extremo.
  for (const sign of [1, -1]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(innerR, outerR, RAD),
      mat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = sign * length / 2;
    g.add(ring);
  }
  return g;
}

// Campana / copa de unión (socket hembra): anillo ensanchado en un extremo
// donde encaja el tubo macho. Es el detalle que indica "por aquí se une".
function socketBell(outerR, wall = outerR * 0.12, depth = 1.4, mat = PVC_WHITE) {
  const bellR = outerR + wall * 1.6;
  return hollowPipe(depth, bellR, wall, mat);
}

// Aplica una transformación a un Group (helper de legibilidad).
function place(obj, { pos = [0, 0, 0], rot = [0, 0, 0] } = {}) {
  obj.position.set(...pos);
  obj.rotation.set(...rot);
  return obj;
}

// ---------------------------------------------------------------------------
// Catálogo de piezas
// Cada generador acepta un objeto de opciones y devuelve un Group.
// ---------------------------------------------------------------------------

// TUBO recto con campana en un extremo.
export function tubo({ length = 12, R = 2 } = {}) {
  const g = new THREE.Group();
  const body = hollowPipe(length, R);
  g.add(body);
  const bell = socketBell(R);
  place(bell, { pos: [0, length / 2 - 0.6, 0] });
  g.add(bell);

  g.userData = {
    sockets: [
      { name: 'hembra', pos: [0, length / 2, 0], dir: [0, 1, 0], R },
      { name: 'macho', pos: [0, -length / 2, 0], dir: [0, -1, 0], R },
    ],
  };
  return g;
}

// CODO a un ángulo dado (90 o 45 son los habituales).
export function codo({ angle = 90, R = 2, bendR = 3.2 } = {}) {
  const g = new THREE.Group();
  const arc = THREE.MathUtils.degToRad(angle);

  // Cuerpo curvo: un torus parcial. El tubo del torus = radio del PVC.
  const curve = new THREE.Mesh(
    new THREE.TorusGeometry(bendR, R, 32, 48, arc),
    PVC_WHITE
  );
  // El torus nace en el plano XY abriendo hacia +X; lo dejamos así y añadimos
  // dos tramos rectos cortos con campana en cada boca.
  g.add(curve);

  // Boca 1: en el inicio del arco (ángulo 0) -> punto (bendR, 0).
  const stub1 = hollowPipe(2, R);
  place(stub1, { pos: [bendR, -1, 0] });
  g.add(stub1);
  const bell1 = socketBell(R);
  place(bell1, { pos: [bendR, -1.6, 0] });
  g.add(bell1);

  // Boca 2: en el final del arco.
  const ex = Math.cos(arc) * bendR;
  const ey = Math.sin(arc) * bendR;
  const stub2 = hollowPipe(2, R);
  // dirección tangente al arco en su final
  place(stub2, {
    pos: [ex - Math.sin(arc) * 1, ey + Math.cos(arc) * 1, 0],
    rot: [0, 0, arc],
  });
  g.add(stub2);
  const bell2 = socketBell(R);
  place(bell2, {
    pos: [ex - Math.sin(arc) * 1.6, ey + Math.cos(arc) * 1.6, 0],
    rot: [0, 0, arc],
  });
  g.add(bell2);

  g.userData = {
    sockets: [
      { name: 'A', pos: [bendR, -2, 0], dir: [0, -1, 0], R },
      { name: 'B', pos: [ex - Math.sin(arc) * 2, ey + Math.cos(arc) * 2, 0], dir: [-Math.sin(arc), Math.cos(arc), 0], R },
    ],
  };
  // Centrar aproximadamente
  g.position.set(-bendR / 1.5, -bendR / 3, 0);
  return g;
}

// TE (T): ramal a 90° del eje principal.
export function te({ R = 2, run = 10, branch = 6 } = {}) {
  const g = new THREE.Group();
  const main = hollowPipe(run, R);
  main.rotation.z = Math.PI / 2; // eje principal horizontal (X)
  g.add(main);

  const br = hollowPipe(branch, R);
  br.position.y = branch / 2; // ramal hacia arriba (Y)
  g.add(br);

  // Campanas en las 3 bocas
  const bL = socketBell(R); bL.rotation.z = Math.PI / 2; bL.position.x = -run / 2 + 0.6; g.add(bL);
  const bR = socketBell(R); bR.rotation.z = Math.PI / 2; bR.position.x = run / 2 - 0.6; g.add(bR);
  const bU = socketBell(R); bU.position.y = branch - 0.6; g.add(bU);

  g.userData = {
    sockets: [
      { name: 'izq', pos: [-run / 2, 0, 0], dir: [-1, 0, 0], R },
      { name: 'der', pos: [run / 2, 0, 0], dir: [1, 0, 0], R },
      { name: 'ramal', pos: [0, branch, 0], dir: [0, 1, 0], R },
    ],
  };
  return g;
}

// CRUZ: dos ramales opuestos a 90°.
export function cruz({ R = 2, run = 10, branch = 10 } = {}) {
  const g = te({ R, run, branch: branch / 2 });
  const down = hollowPipe(branch / 2, R);
  down.position.y = -branch / 4;
  g.add(down);
  const bD = socketBell(R); bD.position.y = -branch / 2 + 0.6; g.add(bD);
  g.userData.sockets.push({ name: 'ramal2', pos: [0, -branch / 2, 0], dir: [0, -1, 0], R });
  return g;
}

// REDUCCIÓN: cono truncado de un diámetro grande a uno pequeño.
export function reduccion({ R1 = 2.6, R2 = 1.6, length = 4, wall = R1 * 0.1 } = {}) {
  const g = new THREE.Group();
  const RAD = 48;
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(R2, R1, length, RAD, 1, true), PVC_GREY);
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(R2 - wall, R1 - wall, length, RAD, 1, true), PVC_INNER);
  g.add(outer, inner);
  // anillos de borde
  const ringBig = new THREE.Mesh(new THREE.RingGeometry(R1 - wall, R1, RAD), PVC_GREY);
  ringBig.rotation.x = Math.PI / 2; ringBig.position.y = -length / 2; g.add(ringBig);
  const ringSmall = new THREE.Mesh(new THREE.RingGeometry(R2 - wall, R2, RAD), PVC_GREY);
  ringSmall.rotation.x = Math.PI / 2; ringSmall.position.y = length / 2; g.add(ringSmall);

  g.userData = {
    sockets: [
      { name: 'grande', pos: [0, -length / 2, 0], dir: [0, -1, 0], R: R1 },
      { name: 'pequeña', pos: [0, length / 2, 0], dir: [0, 1, 0], R: R2 },
    ],
  };
  return g;
}

// MANGUITO / UNIÓN: pieza corta con campana en ambos extremos para unir
// dos tubos en línea recta.
export function manguito({ R = 2, length = 4 } = {}) {
  const g = new THREE.Group();
  const body = hollowPipe(length, R + 0.3);
  g.add(body);
  // resalte central (tope interior)
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(R + 0.3, 0.18, 12, 40), PVC_GREY);
  ridge.rotation.x = Math.PI / 2;
  g.add(ridge);
  g.userData = {
    sockets: [
      { name: 'A', pos: [0, length / 2, 0], dir: [0, 1, 0], R },
      { name: 'B', pos: [0, -length / 2, 0], dir: [0, -1, 0], R },
    ],
  };
  return g;
}

// TAPÓN: tapa ciega que cierra un extremo.
export function tapon({ R = 2, depth = 2 } = {}) {
  const g = new THREE.Group();
  const wall = hollowPipe(depth, R + 0.3);
  g.add(wall);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(R + 0.3, 48), PVC_GREY);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = depth / 2;
  g.add(cap);
  g.userData = {
    sockets: [{ name: 'boca', pos: [0, -depth / 2, 0], dir: [0, -1, 0], R }],
  };
  return g;
}

// SIFÓN (sifón en U / bote sifónico simplificado tipo P-trap).
// Retiene agua para impedir el paso de olores. Forma de U + salida.
export function sifon({ R = 2 } = {}) {
  const g = new THREE.Group();
  const bendR = 3.0;

  // Tramo vertical de entrada (viene del desagüe).
  const inlet = hollowPipe(6, R);
  inlet.position.set(-bendR, 3, 0);
  g.add(inlet);

  // Curva en U (medio torus, 180°).
  const u = new THREE.Mesh(new THREE.TorusGeometry(bendR, R, 32, 64, Math.PI), PVC_WHITE);
  u.rotation.z = Math.PI; // abre hacia abajo formando la U
  g.add(u);

  // Tramo de salida hacia la pared, con ligera subida.
  const outlet = hollowPipe(7, R);
  outlet.rotation.z = Math.PI / 2;
  outlet.position.set(bendR + 3, 0, 0);
  g.add(outlet);

  // Tuerca/registro inferior (tapón de limpieza) y juntas.
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.5, R + 0.5, 1.2, 12), PVC_GREY);
  nut.position.set(0, -bendR, 0);
  g.add(nut);
  const joint = new THREE.Mesh(new THREE.TorusGeometry(R + 0.1, 0.22, 12, 40), RUBBER);
  joint.rotation.z = Math.PI / 2; joint.position.set(bendR + 6.5, 0, 0);
  g.add(joint);

  g.userData = {
    sockets: [
      { name: 'entrada', pos: [-bendR, 6, 0], dir: [0, 1, 0], R },
      { name: 'salida', pos: [bendR + 6.5, 0, 0], dir: [1, 0, 0], R },
    ],
  };
  g.position.set(-1.5, 1, 0);
  return g;
}

// VÁLVULA DE DESAGÜE (la rejilla del lavabo/fregadero).
export function valvula({ R = 2 } = {}) {
  const g = new THREE.Group();
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.4, R + 1.4, 0.4, 48), PVC_GREY);
  flange.position.y = 2;
  g.add(flange);
  // rejilla
  for (let i = -1; i <= 1; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, (R + 1.2) * 2), PVC_GREY);
    bar.position.set(i * 0.9, 2.25, 0);
    g.add(bar);
  }
  const tube = hollowPipe(4, R);
  g.add(tube);
  g.userData = { sockets: [{ name: 'salida', pos: [0, -2, 0], dir: [0, -1, 0], R }] };
  return g;
}

// BOTE SIFÓNICO: caja cilíndrica que recoge varios desagües (lavabo, ducha,
// bidé) y los une en una sola salida con un único cierre hidráulico.
export function boteSifonico({ R = 2 } = {}) {
  const g = new THREE.Group();
  const boxR = R * 2.6;
  const boxH = 6;

  // Cuerpo del bote.
  const body = hollowPipe(boxH, boxR);
  g.add(body);
  // Tapa registrable.
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(boxR + 0.3, boxR + 0.3, 0.8, 48), PVC_GREY);
  lid.position.y = boxH / 2;
  g.add(lid);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(boxR * 0.4, boxR * 0.4, 0.6, 32), PVC_GREY);
  knob.position.y = boxH / 2 + 0.6;
  g.add(knob);

  // Entradas laterales (3) y salida inferior.
  const sockets = [];
  const angles = [0, Math.PI * 0.66, Math.PI * 1.33];
  angles.forEach((a, i) => {
    const inl = hollowPipe(2.4, R);
    inl.rotation.z = Math.PI / 2;
    inl.rotation.y = a;
    const x = Math.cos(a) * (boxR + 1);
    const z = Math.sin(a) * (boxR + 1);
    inl.position.set(x, 1.5, z);
    g.add(inl);
    sockets.push({ name: 'entrada' + (i + 1), pos: [Math.cos(a) * (boxR + 2.2), 1.5, Math.sin(a) * (boxR + 2.2)], dir: [Math.cos(a), 0, Math.sin(a)], R });
  });
  const out = hollowPipe(3, R);
  out.position.y = -boxH / 2 - 1;
  g.add(out);
  sockets.push({ name: 'salida', pos: [0, -boxH / 2 - 2.5, 0], dir: [0, -1, 0], R });

  g.userData = { sockets };
  return g;
}

// SUMIDERO DE DUCHA: rejilla cuadrada + cuerpo con sifón integrado y salida.
export function sumidero({ R = 2 } = {}) {
  const g = new THREE.Group();
  const side = R * 3.2;

  // Marco/rejilla superior.
  const frame = new THREE.Mesh(new THREE.BoxGeometry(side, 0.5, side), PVC_GREY);
  frame.position.y = 3;
  g.add(frame);
  for (let i = -2; i <= 2; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, side * 0.85), PVC_GREY);
    bar.position.set(i * (side / 6), 3.35, 0);
    g.add(bar);
  }
  // Cuerpo.
  const body = hollowPipe(5, R * 1.4);
  body.position.y = 0;
  g.add(body);
  // Salida lateral (horizontal hacia la bajante).
  const out = hollowPipe(4, R);
  out.rotation.z = Math.PI / 2;
  out.position.set(R * 1.4 + 2, -2, 0);
  g.add(out);

  g.userData = {
    sockets: [{ name: 'salida', pos: [R * 1.4 + 4, -2, 0], dir: [1, 0, 0], R }],
  };
  return g;
}

// INODORO (estilizado): silueta simple con la salida horizontal (horn) que
// se conecta a la bajante mediante un manguito de inodoro.
export function inodoro({ R = 5.5 } = {}) {
  const g = new THREE.Group();

  // Taza (lathe sencillo).
  const points = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = t * 10;
    const rad = 6 + Math.sin(t * Math.PI) * 2.5;
    points.push(new THREE.Vector2(rad, y));
  }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(points, 40), PVC_WHITE);
  g.add(bowl);
  // Tanque (cisterna) trasero.
  const tank = new THREE.Mesh(new THREE.BoxGeometry(11, 8, 4), PVC_WHITE);
  tank.position.set(0, 12, -7);
  g.add(tank);
  // Salida horizontal (manguito de conexión a bajante).
  const horn = hollowPipe(5, R);
  horn.rotation.x = Math.PI / 2;
  horn.position.set(0, 2, 7);
  g.add(horn);

  g.userData = {
    sockets: [{ name: 'salida', pos: [0, 2, 10], dir: [0, 0, 1], R }],
  };
  return g;
}

// ---------------------------------------------------------------------------
// Registro del catálogo: id -> { nombre, generador, descripción, ... }
// ---------------------------------------------------------------------------
export const CATALOG = {
  tubo: {
    nombre: 'Tubo recto',
    factory: tubo,
    uso: 'Conduce el agua en línea recta. Se corta a la medida necesaria.',
    union: 'Extremo macho que entra en la campana (hembra) de la siguiente pieza, con cola de PVC o junta de goma.',
    bocas: 2,
    dn: 40,
  },
  codo90: {
    nombre: 'Codo 90°',
    factory: (o) => codo({ ...o, angle: 90 }),
    uso: 'Cambia la dirección del recorrido 90°. Típico para bajar a la pared.',
    union: 'Encolado/encajado en ambas bocas (hembra-hembra).',
    bocas: 2,
  },
  codo45: {
    nombre: 'Codo 45°',
    factory: (o) => codo({ ...o, angle: 45 }),
    uso: 'Giro suave de 45°. Reduce turbulencias frente a dos codos de 90°.',
    union: 'Encolado/encajado en ambas bocas.',
    bocas: 2,
  },
  te: {
    nombre: 'Te (T)',
    factory: te,
    uso: 'Une un ramal a una conducción principal (p. ej. dos desagües a una bajante).',
    union: '3 bocas hembra.',
    bocas: 3,
  },
  cruz: {
    nombre: 'Cruz',
    factory: cruz,
    uso: 'Une cuatro conducciones en un mismo punto.',
    union: '4 bocas hembra.',
    bocas: 4,
  },
  reduccion: {
    nombre: 'Reducción',
    factory: reduccion,
    uso: 'Pasa de un diámetro grande a uno menor (p. ej. de 40 a 32 mm).',
    union: 'Boca grande hembra + extremo pequeño macho/hembra. ¡Clave para combinar diámetros distintos!',
    bocas: 2,
  },
  manguito: {
    nombre: 'Manguito / unión',
    factory: manguito,
    uso: 'Empalma dos tubos del mismo diámetro en línea recta.',
    union: 'Campana en ambos extremos con tope central.',
    bocas: 2,
  },
  tapon: {
    nombre: 'Tapón',
    factory: tapon,
    uso: 'Cierra de forma estanca un extremo (registro, prueba de estanqueidad).',
    union: 'Una sola boca hembra.',
    bocas: 1,
  },
  sifon: {
    nombre: 'Sifón (en U)',
    factory: sifon,
    uso: 'Retiene agua para bloquear malos olores y gases. Imprescindible en lavabo, fregadero, ducha.',
    union: 'Entrada superior (desde la válvula) y salida lateral (hacia la pared), normalmente con tuercas y juntas de goma.',
    bocas: 2,
  },
  valvula: {
    nombre: 'Válvula de desagüe',
    factory: valvula,
    uso: 'Rejilla y conexión que sale del propio lavabo o fregadero.',
    union: 'Rosca al aparato por arriba; abajo se conecta al sifón.',
    bocas: 1,
  },
  boteSifonico: {
    nombre: 'Bote sifónico',
    factory: boteSifonico,
    uso: 'Recoge varios desagües (lavabo, ducha, bidé) y los une con un solo cierre hidráulico antiolores.',
    union: 'Varias entradas laterales hembra + una salida inferior hacia la bajante.',
    bocas: 4,
    dn: 40,
  },
  sumidero: {
    nombre: 'Sumidero de ducha',
    factory: sumidero,
    uso: 'Recoge el agua del plato de ducha con sifón integrado y rejilla registrable.',
    union: 'Salida lateral hacia la bajante; arriba conecta con el plato.',
    bocas: 1,
    dn: 50,
  },
  inodoro: {
    nombre: 'Inodoro (WC)',
    factory: inodoro,
    uso: 'La taza del WC. Su salida se conecta a la bajante de 110 mm.',
    union: 'Salida horizontal que entra en un manguito de inodoro (DN110).',
    bocas: 1,
    dn: 110,
  },
};
