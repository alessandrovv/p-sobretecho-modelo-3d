import * as THREE from 'three';
import { Colector } from '../utils/geometria3d.js';
import { repartir } from '../calc/geometria.js';
import { SECCIONES, GEOMETRIA } from '../config/proyecto.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Normal hacia arriba del plano de cubierta. */
export function normalCubierta(r) {
  const { s, cosA } = r;
  if (r.esLong) return V(0, 1, s).multiplyScalar(cosA);
  return V(r.eje.signo * s, 1, 0).multiplyScalar(cosA);
}

/**
 * Estructura provisional de madera. Todas las piezas se apoyan en la anterior:
 * base → poste → tijeral → (largueros) → correas → planchas, de modo que al
 * cambiar la pendiente nada queda flotando. Secciones: SECCIONES (sin cálculo).
 */
export function construirEstructura(r, materiales) {
  const { porticos, xPoste, altura, perfil } = r;
  const S = SECCIONES;
  const c = new Colector(materiales);
  const n = normalCubierta(r);
  const etiquetas = [];

  const bp = S.poste.b;
  const hc = S.cordon.h;
  const bc = S.cordon.b;
  const sup = r.cordonSuperior;
  const inf = r.cordonInferior;
  const yBase = 0.05;
  const xA = r.xIzq + 0.03;
  const xB = r.xDer - 0.03;

  const base = (x, z) => {
    c.caja([x - 0.13, 0, z - 0.13], [x + 0.13, 0.012, z + 0.13], 'baseMetalica');
    c.caja([x - 0.075, 0.012, z - 0.075], [x + 0.075, yBase, z + 0.075], 'baseMetalica');
    for (const sz of [-1, 1]) {
      const z0 = z + sz * (bp / 2);
      c.caja([x - 0.07, yBase, Math.min(z0, z0 + sz * 0.008)], [x + 0.07, 0.3, Math.max(z0, z0 + sz * 0.008)], 'baseMetalica');
    }
    for (const y of [0.13, 0.23]) c.cilindro(V(x, y, z - bp / 2 - 0.025), V(x, y, z + bp / 2 + 0.025), 0.008, 'perno');
    for (const dx of [-0.095, 0.095]) {
      for (const dz of [-0.095, 0.095]) {
        c.cilindro(V(x + dx, 0, z + dz), V(x + dx, 0.035, z + dz), 0.009, 'perno', 8);
        c.caja([x + dx - 0.016, 0.012, z + dz - 0.016], [x + dx + 0.016, 0.026, z + dz + 0.016], 'perno');
      }
    }
  };

  // --- Pórticos: postes + tijeral ------------------------------------------------
  const nodos = repartir(-xPoste + bp / 2, xPoste - bp / 2, 0.95);
  for (const z of porticos) {
    for (const sx of [-1, 1]) {
      const x = sx * xPoste;
      const yTop = Math.max(yBase + 0.02, Math.min(sup(x - bp / 2, z), sup(x + bp / 2, z)) - hc);
      c.caja([x - bp / 2, yBase, z - bp / 2], [x + bp / 2, yTop, z + bp / 2], 'madera');
      base(x, z);

      // Cartelas metálicas poste–tijeral con pernos pasantes
      const yP0 = inf(x, z) - 0.12;
      const yP1 = sup(x, z) - 0.01;
      for (const sz of [-1, 1]) {
        const z0 = z + sz * (bp / 2);
        c.caja([x - 0.17, yP0, Math.min(z0, z0 + sz * 0.006)], [x + 0.17, yP1, Math.max(z0, z0 + sz * 0.006)], 'fleje');
      }
      for (const dx of [-0.1, 0.1]) {
        for (const y of [inf(x + dx, z) + hc / 2, sup(x + dx, z) - hc / 2]) {
          c.cilindro(V(x + dx, y, z - bp / 2 - 0.03), V(x + dx, y, z + bp / 2 + 0.03), 0.009, 'perno');
        }
      }
      c.cilindro(V(x, yP0 + 0.06, z - bp / 2 - 0.03), V(x, yP0 + 0.06, z + bp / 2 + 0.03), 0.009, 'perno');

      // Pie de amigo transversal (rigidez del pórtico en el ancho)
      const xi = sx * (xPoste - 0.65);
      if (inf(x, z) - 0.62 > 0.4) c.pieza(V(sx * (xPoste - bp / 2), inf(x, z) - 0.62, z), V(xi, inf(xi, z) + 0.02, z), S.pieDeAmigo.b, S.pieDeAmigo.h, 'madera');
    }

    // Cordón superior (se prolonga hasta los bordes para recibir las correas)
    c.pieza(V(xA, sup(xA, z) - hc / 2, z), V(xB, sup(xB, z) - hc / 2, z), bc, hc, 'madera');
    // Cordón inferior entre postes
    const xi0 = -xPoste + bp / 2;
    const xi1 = xPoste - bp / 2;
    c.pieza(V(xi0, inf(xi0, z) + hc / 2, z), V(xi1, inf(xi1, z) + hc / 2, z), bc, hc, 'madera');

    // Montantes y diagonales (celosía simétrica)
    for (let j = 0; j < nodos.length; j++) {
      const x = nodos[j];
      if (j > 0 && j < nodos.length - 1) {
        c.pieza(V(x, inf(x, z) + hc, z), V(x, sup(x, z) - hc, z), S.diagonal.b, S.diagonal.h, 'madera');
      }
      if (j < nodos.length - 1) {
        const x2 = nodos[j + 1];
        const haciaCentro = (x + x2) / 2 < 0;
        const pA = haciaCentro ? V(x, sup(x, z) - hc, z) : V(x, inf(x, z) + hc, z);
        const pB = haciaCentro ? V(x2, inf(x2, z) + hc, z) : V(x2, sup(x2, z) - hc, z);
        c.pieza(pA, pB, S.diagonal.b, S.diagonal.h, 'madera');
      }
      // Cartelas en los nudos interiores
      if (j > 0 && j < nodos.length - 1) {
        for (const sz of [-1, 1]) {
          const z0 = z + sz * (bc / 2);
          const zz = [Math.min(z0, z0 + sz * 0.005), Math.max(z0, z0 + sz * 0.005)];
          c.caja([x - 0.06, sup(x, z) - hc - 0.05, zz[0]], [x + 0.06, sup(x, z) - 0.03, zz[1]], 'fleje');
          c.caja([x - 0.06, inf(x, z) + 0.03, zz[0]], [x + 0.06, inf(x, z) + hc + 0.05, zz[1]], 'fleje');
        }
      }
    }
  }
  const zMedio = porticos[Math.floor(porticos.length / 2)];
  etiquetas.push({ texto: 'Tijeral de madera (cordones paralelos)', pos: V(0, inf(0, zMedio) + 0.1, zMedio), capa: 'estructura' });
  etiquetas.push({ texto: 'Poste de madera tratada', pos: V(xPoste, 1.5, porticos[1]), capa: 'estructura' });
  etiquetas.push({
    texto: 'Base metálica + anclaje (pendiente de verificar losa)',
    pos: V(-xPoste, 0.25, porticos[porticos.length - 1]),
    capa: 'estructura',
  });

  // --- Vigas de amarre longitudinales y arriostramientos ---------------------------
  const vA = S.vigaAmarre;
  const z0 = porticos[0] - GEOMETRIA.voladoAmarre;
  const z1 = porticos[porticos.length - 1] + GEOMETRIA.voladoAmarre;
  for (const sx of [-1, 1]) {
    const xp = sx * xPoste;
    const xv = sx * (xPoste + bp / 2 + vA.b / 2);
    const top = (z) => inf(xp, z);
    c.pieza(V(xv, top(z0) - vA.h / 2, z0), V(xv, top(z1) - vA.h / 2, z1), vA.b, vA.h, 'madera');
    porticos.forEach((z, i) => {
      for (const y of [top(z) - vA.h / 2]) c.cilindro(V(xv + sx * 0.05, y, z), V(xp - sx * 0.09, y, z), 0.009, 'perno');
      // Pies de amigo longitudinales
      for (const dz of [-1, 1]) {
        if ((i === 0 && dz < 0) || (i === porticos.length - 1 && dz > 0)) continue;
        if (top(z) - vA.h - 0.6 < 0.4) continue;
        const za = z + dz * (bp / 2);
        const zb = z + dz * 0.65;
        c.pieza(V(xv, top(z) - vA.h - 0.6, za), V(xv, top(zb) - vA.h, zb), S.pieDeAmigo.b, S.pieDeAmigo.h, 'madera');
      }
    });
    // Cruces de San Andrés en el primer y el último vano, por la cara interior
    for (const i of [0, porticos.length - 2]) {
      const za = porticos[i] + bp / 2;
      const zb = porticos[i + 1] - bp / 2;
      const xr = sx * (xPoste - bp / 2 - S.riostra.b / 2);
      const yb = 0.4;
      const ya = (z) => top(z) - 0.05;
      if (Math.min(ya(za), ya(zb)) < yb + 0.5) continue;
      c.pieza(V(xr, yb, za), V(xr, ya(zb), zb), S.riostra.b, S.riostra.h, 'madera');
      c.pieza(V(xr - sx * S.riostra.b, ya(za), za), V(xr - sx * S.riostra.b, yb, zb), S.riostra.b, S.riostra.h, 'madera');
    }
  }
  etiquetas.push({ texto: 'Viga de amarre longitudinal', pos: V(xPoste + 0.1, inf(xPoste, porticos[2]) - 0.1, (porticos[2] + porticos[3]) / 2), capa: 'estructura' });
  etiquetas.push({ texto: 'Cruz de San Andrés', pos: V(-xPoste, 1.3, (porticos[0] + porticos[1]) / 2), capa: 'estructura' });

  // Arriostramiento en el plano de cubierta (flejes cruzados en los vanos extremos)
  for (const i of [0, porticos.length - 2]) {
    const za = porticos[i];
    const zb = porticos[i + 1];
    c.pieza(V(-xPoste, sup(-xPoste, za) + 0.003, za), V(xPoste, sup(xPoste, zb) + 0.003, zb), 0.05, 0.004, 'fleje', n);
    c.pieza(V(xPoste, sup(xPoste, za) + 0.006, za), V(-xPoste, sup(-xPoste, zb) + 0.006, zb), 0.05, 0.004, 'fleje', n);
  }
  etiquetas.push({
    texto: 'Arriostramiento de cubierta (fleje)',
    pos: V(0, sup(0, (porticos[0] + porticos[1]) / 2) + 0.05, (porticos[0] + porticos[1]) / 2),
    capa: 'estructura',
  });

  // --- Largueros (solo caída longitudinal) ----------------------------------------
  const hC = S.correa.h;
  if (r.esLong) {
    const hL = S.larguero.h;
    const za = r.zApoyo + 0.04;
    const zb = r.zFin - 0.04;
    for (const x of r.largueros) {
      const top = (z) => altura(x, z) - perfil - hC;
      c.pieza(V(x, top(za) - hL / 2, za), V(x, top(zb) - hL / 2, zb), S.larguero.b, hL, 'madera', n);
      for (const z of porticos) c.caja([x - 0.06, sup(x, z) - 0.08, z - 0.06], [x - S.larguero.b / 2, sup(x, z) + 0.08, z + 0.06], 'fleje');
    }
    etiquetas.push({
      texto: 'Larguero inclinado',
      pos: V(r.largueros[1], altura(0, porticos[2]) - perfil - hC - 0.1, (porticos[2] + porticos[3]) / 2),
      capa: 'estructura',
    });
  }

  // --- Correas ----------------------------------------------------------------------
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
    c.pieza(p1.add(off), p2.add(off), S.correa.b, hC, 'madera', n);
  }
  {
    const rr = r.correasR[Math.floor(r.correasR.length / 2)];
    const cc = r.rACoord(rr);
    const pos = r.esLong ? V(r.xIzq + 1.2, altura(0, cc) - perfil - 0.05, cc) : V(cc, altura(cc, 0) - perfil - 0.05, porticos[1] + 0.9);
    etiquetas.push({ texto: `Correas (${r.correasR.length} líneas)`, pos, capa: 'estructura' });
  }

  // --- Tapacanes (cubren las cabezas de correas, largueros y cordones) ---------------
  const T = S.tapacan;
  if (r.esLong) {
    const zf = r.zFin - 0.04 + T.b / 2;
    const yf = altura(0, r.zFin) - perfil;
    c.pieza(V(r.xIzq, yf - T.h / 2, zf), V(r.xDer, yf - T.h / 2, zf), T.b, T.h, 'madera');
    for (const x of [r.xIzq + 0.02 - T.b / 2, r.xDer - 0.02 + T.b / 2]) {
      const za = r.zApoyo + 0.02;
      const zb = r.zFin - 0.04;
      c.pieza(V(x, altura(x, za) - perfil - T.h / 2, za), V(x, altura(x, zb) - perfil - T.h / 2, zb), T.b, T.h, 'madera', n);
    }
  } else {
    for (const x of [xA - T.b / 2, xB + T.b / 2]) {
      const y = altura(x, 0) - perfil - T.h / 2;
      c.pieza(V(x, y, r.zApoyo + 0.02), V(x, y, r.zFin - 0.02), T.b, T.h, 'madera', n);
    }
    const zf = r.zFin - 0.02 + T.b / 2;
    c.pieza(V(xA, altura(xA, 0) - perfil - T.h / 2, zf), V(xB, altura(xB, 0) - perfil - T.h / 2, zf), T.b, T.h, 'madera');
  }

  const grupo = c.construir({ nombre: 'estructura de madera' });
  return { grupo, etiquetas };
}
