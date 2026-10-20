import * as THREE from 'three';
import { Colector } from '../utils/geometria3d.js';
import { GEOMETRIA } from '../config/proyecto.js';
import { normalCubierta } from './estructura.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Estructura V2: tubos metálicos cuadrados/rectangulares y correas C.
 * Criterio (alineado con el sobretecho existente):
 *   - Postes SHS 100×100
 *   - Viga transversal RHS 100×50 en cada pórtico (sin tijeral profundo → más altura libre)
 *   - Vigas de amarre longitudinales + pies de amigo + cruces de San Andrés
 *   - Caída longitudinal: vigas inclinadas RHS 80×40 + correas C
 *   - Caída lateral: correas C orientadas a lo largo de la pendiente
 *   - Placas base, cartelas y flejes de arriostramiento de cubierta
 * Secciones: provisionales, sin cálculo estructural.
 */
export function construirEstructuraMetal(r, materiales) {
  const { porticos, xPoste, altura, perfil } = r;
  const S = r.secciones;
  const c = new Colector(materiales);
  const n = normalCubierta(r);
  const etiquetas = [];
  const clave = 'aceroNuevo';

  const bp = S.poste.b;
  const hc = S.cordon.h;
  const bc = S.cordon.b;
  const sup = r.cordonSuperior;
  const inf = r.cordonInferior;
  const yBase = 0.05;
  const xA = r.xIzq + 0.03;
  const xB = r.xDer - 0.03;
  const pb = S.placaBase?.b ?? 0.2;

  const base = (x, z) => {
    const m = pb / 2;
    c.caja([x - m, 0, z - m], [x + m, 0.008, z + m], 'baseMetalica');
    // Cuatro pernos de anclaje en las esquinas de la placa
    for (const dx of [-0.07, 0.07]) {
      for (const dz of [-0.07, 0.07]) {
        c.cilindro(V(x + dx, 0, z + dz), V(x + dx, 0.04, z + dz), 0.008, 'perno', 8);
        c.caja([x + dx - 0.014, 0.008, z + dz - 0.014], [x + dx + 0.014, 0.018, z + dz + 0.014], 'perno');
      }
    }
    // Cartelas cortas poste–placa (soldadura de taller)
    for (const sz of [-1, 1]) {
      const z0 = z + sz * (bp / 2);
      c.caja([x - 0.04, yBase, Math.min(z0, z0 + sz * 0.006)], [x + 0.04, 0.22, Math.max(z0, z0 + sz * 0.006)], 'fleje');
    }
  };

  // --- Pórticos: postes + viga transversal ------------------------------------------------
  for (const z of porticos) {
    for (const sx of [-1, 1]) {
      const x = sx * xPoste;
      const yTop = Math.max(yBase + 0.02, Math.min(sup(x - bp / 2, z), sup(x + bp / 2, z)) - hc);
      c.caja([x - bp / 2, yBase, z - bp / 2], [x + bp / 2, yTop, z + bp / 2], clave);
      base(x, z);

      // Cartelas poste–viga (chapa 6 mm)
      const yP0 = inf(x, z) - 0.08;
      const yP1 = sup(x, z) + 0.01;
      for (const sz of [-1, 1]) {
        const z0 = z + sz * (bp / 2);
        c.caja([x - 0.12, yP0, Math.min(z0, z0 + sz * 0.006)], [x + 0.12, yP1, Math.max(z0, z0 + sz * 0.006)], 'fleje');
      }
      for (const y of [inf(x, z) + hc / 2, (inf(x, z) + sup(x, z)) / 2]) {
        c.cilindro(V(x, y, z - bp / 2 - 0.02), V(x, y, z + bp / 2 + 0.02), 0.008, 'perno');
      }

      // Pie de amigo transversal (tubo 50×50)
      const xi = sx * (xPoste - 0.7);
      if (inf(x, z) - 0.55 > 0.45) {
        c.pieza(
          V(sx * (xPoste - bp / 2), inf(x, z) - 0.02, z),
          V(xi, inf(xi, z) + 0.02, z),
          S.pieDeAmigo.b,
          S.pieDeAmigo.h,
          clave,
        );
      }
    }

    // Viga transversal (RHS) de muro a muro: recibe correas o vigas inclinadas
    c.pieza(V(xA, sup(xA, z) - hc / 2, z), V(xB, sup(xB, z) - hc / 2, z), bc, hc, clave);
  }

  const zMedio = porticos[Math.floor(porticos.length / 2)];
  etiquetas.push({
    texto: `Viga de pórtico ${S.cordon.texto}`,
    pos: V(0, inf(0, zMedio) + 0.05, zMedio),
    capa: 'estructura',
  });
  etiquetas.push({
    texto: `Poste ${S.poste.texto}`,
    pos: V(xPoste, 1.6, porticos[1] ?? porticos[0]),
    capa: 'estructura',
  });
  etiquetas.push({
    texto: 'Placa base 200×200×8 + anclaje (verificar losa)',
    pos: V(-xPoste, 0.28, porticos[porticos.length - 1]),
    capa: 'estructura',
  });

  // --- Vigas de amarre longitudinales y arriostramiento ----------------------------
  const vA = S.vigaAmarre;
  const z0 = porticos[0] - GEOMETRIA.voladoAmarre;
  const z1 = porticos[porticos.length - 1] + GEOMETRIA.voladoAmarre;
  for (const sx of [-1, 1]) {
    const xp = sx * xPoste;
    const xv = sx * (xPoste + bp / 2 + vA.b / 2);
    const top = (z) => inf(xp, z);
    c.pieza(V(xv, top(z0) - vA.h / 2, z0), V(xv, top(z1) - vA.h / 2, z1), vA.b, vA.h, clave);

    porticos.forEach((z, i) => {
      c.cilindro(V(xv + sx * 0.03, top(z) - vA.h / 2, z), V(xp - sx * 0.06, top(z) - vA.h / 2, z), 0.008, 'perno');
      for (const dz of [-1, 1]) {
        if ((i === 0 && dz < 0) || (i === porticos.length - 1 && dz > 0)) continue;
        if (top(z) - vA.h - 0.55 < 0.4) continue;
        const za = z + dz * (bp / 2);
        const zb = z + dz * 0.7;
        c.pieza(V(xv, top(z) - vA.h - 0.02, za), V(xv, top(zb) - vA.h, zb), S.pieDeAmigo.b, S.pieDeAmigo.h, clave);
      }
    });

    // Cruces de San Andrés (tubo 40×40) en vanos extremos
    for (const i of [0, porticos.length - 2]) {
      if (i < 0 || i >= porticos.length - 1) continue;
      const za = porticos[i] + bp / 2;
      const zb = porticos[i + 1] - bp / 2;
      const xr = sx * (xPoste - bp / 2 - S.riostra.b / 2);
      const yb = 0.45;
      const ya = (z) => top(z) - 0.04;
      if (Math.min(ya(za), ya(zb)) < yb + 0.5) continue;
      c.pieza(V(xr, yb, za), V(xr, ya(zb), zb), S.riostra.b, S.riostra.h, clave);
      c.pieza(V(xr - sx * S.riostra.b, ya(za), za), V(xr - sx * S.riostra.b, yb, zb), S.riostra.b, S.riostra.h, clave);
    }
  }
  if (porticos.length > 2) {
    etiquetas.push({
      texto: `Viga de amarre ${S.vigaAmarre.texto}`,
      pos: V(xPoste + 0.12, inf(xPoste, porticos[2]) - 0.08, (porticos[2] + porticos[3]) / 2),
      capa: 'estructura',
    });
  }
  etiquetas.push({
    texto: 'Cruz de San Andrés (tubo 40×40)',
    pos: V(-xPoste, 1.35, (porticos[0] + porticos[1]) / 2),
    capa: 'estructura',
  });

  // Flejes en el plano de cubierta (vanos extremos)
  for (const i of [0, porticos.length - 2]) {
    if (i < 0 || i >= porticos.length - 1) continue;
    const za = porticos[i];
    const zb = porticos[i + 1];
    c.pieza(V(-xPoste, sup(-xPoste, za) + 0.004, za), V(xPoste, sup(xPoste, zb) + 0.004, zb), 0.04, 0.004, 'fleje', n);
    c.pieza(V(xPoste, sup(xPoste, za) + 0.007, za), V(-xPoste, sup(-xPoste, zb) + 0.007, zb), 0.04, 0.004, 'fleje', n);
  }
  etiquetas.push({
    texto: 'Arriostramiento de cubierta (fleje)',
    pos: V(0, sup(0, (porticos[0] + porticos[1]) / 2) + 0.06, (porticos[0] + porticos[1]) / 2),
    capa: 'estructura',
  });

  // --- Vigas inclinadas (caída longitudinal) -----------------------------------------
  const hC = S.correa.h;
  if (r.esLong) {
    const hL = S.larguero.h;
    const za = r.zApoyo + 0.04;
    const zb = r.zFin - 0.04;
    for (const x of r.largueros) {
      const top = (z) => altura(x, z) - perfil - hC;
      c.pieza(V(x, top(za) - hL / 2, za), V(x, top(zb) - hL / 2, zb), S.larguero.b, hL, clave, n);
      for (const z of porticos) {
        c.caja([x - 0.05, sup(x, z) - 0.06, z - 0.05], [x - S.larguero.b / 2, sup(x, z) + 0.06, z + 0.05], 'fleje');
      }
    }
    if (r.largueros.length > 1) {
      etiquetas.push({
        texto: `Viga inclinada ${S.larguero.texto}`,
        pos: V(r.largueros[1], altura(0, porticos[2] ?? zMedio) - perfil - hC - 0.08, ((porticos[2] ?? zMedio) + (porticos[3] ?? zMedio)) / 2),
        capa: 'estructura',
      });
    }
  }

  // --- Correas C --------------------------------------------------------------------
  for (const rr of r.correasR) {
    const cc = r.rACoord(rr);
    let p1;
    let p2;
    if (r.esLong) {
      const y = altura(0, cc) - perfil;
      p1 = V(r.xIzq + 0.02, y, cc);
      p2 = V(r.xDer - 0.02, y, cc);
    } else {
      const y = altura(cc, 0) - perfil;
      p1 = V(cc, y, r.zApoyo + 0.02);
      p2 = V(cc, y, r.zFin - 0.02);
    }
    const off = n.clone().multiplyScalar(-hC / 2);
    c.pieza(p1.add(off), p2.add(off), S.correa.b, hC, clave, n);
  }
  {
    const rr = r.correasR[Math.floor(r.correasR.length / 2)];
    const cc = r.rACoord(rr);
    const pos = r.esLong
      ? V(r.xIzq + 1.2, altura(0, cc) - perfil - 0.05, cc)
      : V(cc, altura(cc, 0) - perfil - 0.05, (porticos[1] ?? porticos[0]) + 0.8);
    etiquetas.push({ texto: `Correas C (${r.correasR.length} líneas) · ${S.correa.texto}`, pos, capa: 'estructura' });
  }

  // --- Remate de borde (ángulo / tapacán metálico) ----------------------------------
  const T = S.tapacan;
  const tb = Math.max(T.b, 0.04);
  if (r.esLong) {
    const zf = r.zFin - 0.03 + tb / 2;
    const yf = altura(0, r.zFin) - perfil;
    c.pieza(V(r.xIzq, yf - T.h / 2, zf), V(r.xDer, yf - T.h / 2, zf), tb, T.h, 'remate');
    for (const x of [r.xIzq + 0.02 - tb / 2, r.xDer - 0.02 + tb / 2]) {
      const za = r.zApoyo + 0.02;
      const zb = r.zFin - 0.04;
      c.pieza(V(x, altura(x, za) - perfil - T.h / 2, za), V(x, altura(x, zb) - perfil - T.h / 2, zb), tb, T.h, 'remate', n);
    }
  } else {
    for (const x of [xA - tb / 2, xB + tb / 2]) {
      const y = altura(x, 0) - perfil - T.h / 2;
      c.pieza(V(x, y, r.zApoyo + 0.02), V(x, y, r.zFin - 0.02), tb, T.h, 'remate', n);
    }
    const zf = r.zFin - 0.02 + tb / 2;
    c.pieza(V(xA, altura(xA, 0) - perfil - T.h / 2, zf), V(xB, altura(xB, 0) - perfil - T.h / 2, zf), tb, T.h, 'remate');
  }

  const grupo = c.construir({ nombre: 'estructura metálica' });
  return { grupo, etiquetas };
}
