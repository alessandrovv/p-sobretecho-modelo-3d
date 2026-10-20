import * as THREE from 'three';
import { Colector } from '../utils/geometria3d.js';
import { GEOMETRIA } from '../config/proyecto.js';
import { normalCubierta } from './estructura.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Estructura V3 · metal simple (como el sobretecho existente):
 *   - Postes SHS con placa base
 *   - Lo que sostiene la cubierta (vigas inclinadas o de pórtico) se suelda
 *     directamente a la cabeza de los postes
 *   - Correas C sobre esas vigas
 *   - Sin vigas de amarre longitudinales ni pies de amigo laterales
 *   - Arriostramiento: diagonales entre postes en vanos extremos + flejes en cubierta
 *   - Viga de borde frontal (cierra el marco, como en el existente)
 */
export function construirEstructuraMetalSimple(r, materiales) {
  const { porticos, xPoste, altura, perfil } = r;
  const S = r.secciones;
  const c = new Colector(materiales);
  const n = normalCubierta(r);
  const etiquetas = [];
  const clave = 'aceroNuevo';

  const bp = S.poste.b;
  const hc = S.cordon.h;
  const bc = S.cordon.b;
  const hL = S.larguero.h;
  const bL = S.larguero.b;
  const hC = S.correa.h;
  const sup = r.cordonSuperior;
  const yBase = 0.05;
  const xA = r.xIzq + 0.03;
  const xB = r.xDer - 0.03;
  const pb = S.placaBase?.b ?? 0.2;

  const base = (x, z) => {
    const m = pb / 2;
    c.caja([x - m, 0, z - m], [x + m, 0.008, z + m], 'baseMetalica');
    for (const dx of [-0.07, 0.07]) {
      for (const dz of [-0.07, 0.07]) {
        c.cilindro(V(x + dx, 0, z + dz), V(x + dx, 0.04, z + dz), 0.008, 'perno', 8);
        c.caja([x + dx - 0.014, 0.008, z + dz - 0.014], [x + dx + 0.014, 0.018, z + dz + 0.014], 'perno');
      }
    }
    for (const sz of [-1, 1]) {
      const z0 = z + sz * (bp / 2);
      c.caja([x - 0.04, yBase, Math.min(z0, z0 + sz * 0.006)], [x + 0.04, 0.22, Math.max(z0, z0 + sz * 0.006)], 'fleje');
    }
  };

  // --- Postes --------------------------------------------------------------------
  for (const z of porticos) {
    for (const sx of [-1, 1]) {
      const x = sx * xPoste;
      // Cabeza del poste = cara inferior de la viga que recibe (larguero o cordón)
      const yTop = Math.max(yBase + 0.02, r.esLong ? altura(x, z) - perfil - hC - hL : sup(x, z) - hc);
      c.caja([x - bp / 2, yBase, z - bp / 2], [x + bp / 2, yTop, z + bp / 2], clave);
      base(x, z);

      // Cartela de soldadura en cabeza de poste
      for (const sz of [-1, 1]) {
        const z0 = z + sz * (bp / 2);
        c.caja([x - 0.09, yTop - 0.12, Math.min(z0, z0 + sz * 0.005)], [x + 0.09, yTop + 0.02, Math.max(z0, z0 + sz * 0.005)], 'fleje');
      }
    }
  }

  etiquetas.push({
    texto: `Poste ${S.poste.texto} (soldadura en cabeza)`,
    pos: V(xPoste, 1.6, porticos[1] ?? porticos[0]),
    capa: 'estructura',
  });
  etiquetas.push({
    texto: 'Placa base 200×200×8 + anclaje (verificar losa)',
    pos: V(-xPoste, 0.28, porticos[porticos.length - 1]),
    capa: 'estructura',
  });

  // --- Lo que sostiene la cubierta, soldado a los postes ---------------------------
  if (r.esLong) {
    // Vigas inclinadas soldadas sobre la línea de postes (como el existente)
    const za = r.zApoyo + 0.04;
    const zb = r.zFin - 0.04;
    // Incluye las líneas de postes laterales + largueros intermedios
    const lineas = [-xPoste, ...r.largueros.filter((x) => Math.abs(x) < xPoste - 0.05), xPoste];
    const unicos = [...new Set(lineas.map((x) => Math.round(x * 1000) / 1000))];
    for (const x of unicos) {
      const top = (z) => altura(x, z) - perfil - hC;
      c.pieza(V(x, top(za) - hL / 2, za), V(x, top(zb) - hL / 2, zb), bL, hL, clave, n);
      // Soldadura / cartela en cada poste atravesado
      for (const z of porticos) {
        if (Math.abs(Math.abs(x) - xPoste) < 0.02 || r.largueros.some((lx) => Math.abs(lx - x) < 0.02)) {
          c.caja([x - 0.05, top(z) - hL - 0.02, z - 0.05], [x + 0.05, top(z) + 0.02, z + 0.05], 'fleje');
        }
      }
    }
    etiquetas.push({
      texto: `Viga inclinada soldada al poste · ${S.larguero.texto}`,
      pos: V(unicos[1] ?? 0, altura(0, porticos[2] ?? porticos[0]) - perfil - hC - 0.1, ((porticos[2] ?? porticos[0]) + (porticos[3] ?? porticos[1])) / 2),
      capa: 'estructura',
    });

    // Viga de borde frontal (cierra como el existente)
    const zf = r.zFin - 0.06;
    const yf = altura(0, zf) - perfil - hC - hL / 2;
    c.pieza(V(xA, yf, zf), V(xB, yf, zf), bc, hc, clave);
    etiquetas.push({
      texto: `Viga de borde frontal · ${S.cordon.texto}`,
      pos: V(0, yf + 0.12, zf),
      capa: 'estructura',
    });
  } else {
    // Caída lateral: una viga transversal inclinada por pórtico, soldada a ambos postes
    for (const z of porticos) {
      c.pieza(V(xA, sup(xA, z) - hc / 2, z), V(xB, sup(xB, z) - hc / 2, z), bc, hc, clave);
    }
    etiquetas.push({
      texto: `Viga de pórtico soldada · ${S.cordon.texto}`,
      pos: V(0, sup(0, porticos[Math.floor(porticos.length / 2)]) - 0.05, porticos[Math.floor(porticos.length / 2)]),
      capa: 'estructura',
    });
  }

  // --- Diagonales entre postes (vanos extremos), sin amarre continuo ----------------
  for (const sx of [-1, 1]) {
    const xr = sx * (xPoste - bp / 2 - S.riostra.b / 2);
    for (const i of [0, porticos.length - 2]) {
      if (i < 0 || i >= porticos.length - 1) continue;
      const za = porticos[i] + bp / 2;
      const zb = porticos[i + 1] - bp / 2;
      const yTop = (z) => (r.esLong ? altura(sx * xPoste, z) - perfil - hC - hL : r.cordonInferior(sx * xPoste, z));
      const yb = 0.45;
      if (Math.min(yTop(za), yTop(zb)) < yb + 0.5) continue;
      c.pieza(V(xr, yb, za), V(xr, yTop(zb) - 0.04, zb), S.riostra.b, S.riostra.h, clave);
      c.pieza(V(xr - sx * S.riostra.b, yTop(za) - 0.04, za), V(xr - sx * S.riostra.b, yb, zb), S.riostra.b, S.riostra.h, clave);
    }
  }
  etiquetas.push({
    texto: 'Diagonal entre postes (sin viga de amarre)',
    pos: V(-xPoste, 1.35, (porticos[0] + porticos[1]) / 2),
    capa: 'estructura',
  });

  // Flejes en el plano de cubierta
  for (const i of [0, porticos.length - 2]) {
    if (i < 0 || i >= porticos.length - 1) continue;
    const za = porticos[i];
    const zb = porticos[i + 1];
    const yA = (x, z) => (r.esLong ? altura(x, z) - perfil - hC - hL / 2 : sup(x, z));
    c.pieza(V(-xPoste, yA(-xPoste, za) + 0.004, za), V(xPoste, yA(xPoste, zb) + 0.004, zb), 0.04, 0.004, 'fleje', n);
    c.pieza(V(xPoste, yA(xPoste, za) + 0.007, za), V(-xPoste, yA(-xPoste, zb) + 0.007, zb), 0.04, 0.004, 'fleje', n);
  }
  etiquetas.push({
    texto: 'Arriostramiento de cubierta (fleje) — crítico en V3',
    pos: V(0, (r.esLong ? altura(0, (porticos[0] + porticos[1]) / 2) - perfil - hC : sup(0, (porticos[0] + porticos[1]) / 2)) + 0.08, (porticos[0] + porticos[1]) / 2),
    capa: 'estructura',
  });

  // --- Correas C -----------------------------------------------------------------
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
    etiquetas.push({ texto: `Correas C (${r.correasR.length}) · ${S.correa.texto}`, pos, capa: 'estructura' });
  }

  // --- Remate de borde -----------------------------------------------------------
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

  const grupo = c.construir({ nombre: 'estructura metálica simple' });
  return { grupo, etiquetas };
}
