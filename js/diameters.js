// diameters.js
// Diámetros nominales (DN) estándar de PVC de evacuación y conversión a las
// unidades de la escena 3D.
//
// Escala: 1 unidad de escena ≈ 1 cm. El radio en unidades = DN(mm) / 20,
// de modo que DN40 -> radio 2.0 (la escala con la que se diseñaron las piezas).

export const SCALE_MM_TO_UNITS = 1 / 20; // radio_units = dn_mm * SCALE / ... ver radiusFor

// Catálogo de diámetros nominales habituales en evacuación doméstica.
export const DN_LIST = [
  { dn: 32, uso: 'Lavabo, bidé' },
  { dn: 40, uso: 'Fregadero, lavadora' },
  { dn: 50, uso: 'Ducha, bañera' },
  { dn: 75, uso: 'Bajantes secundarias' },
  { dn: 110, uso: 'Inodoro, bajante principal' },
];

const DN_SET = DN_LIST.map((d) => d.dn);

// Radio en unidades de escena para un DN dado (en mm).
export function radiusFor(dn) {
  return (dn / 2) * SCALE_MM_TO_UNITS; // dn/2 = radio en mm; *1/20
}

// Devuelve el DN por defecto de una entrada del catálogo (40 si no se indica).
export function defaultDN(catalogEntry) {
  return (catalogEntry && catalogEntry.dn) || 40;
}

// "Buscador de reducción": dadas dos medidas, indica qué reducción hace falta.
// Devuelve { from, to, needed } donde needed=false si son iguales.
export function reductionFor(dnA, dnB) {
  const from = Math.max(dnA, dnB);
  const to = Math.min(dnA, dnB);
  return {
    from,
    to,
    needed: from !== to,
    etiqueta: from === to
      ? `Mismo diámetro (${from} mm): no hace falta reducción, usa un manguito.`
      : `Necesitas una reducción ${from} → ${to} mm.`,
  };
}

export { DN_SET };
