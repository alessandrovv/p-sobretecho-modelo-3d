import * as THREE from 'three';
import { Colector, superficieEntreSecciones } from '../utils/geometria3d.js';
import { GEOMETRIA } from '../config/proyecto.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Canalón en U a lo largo de un eje, por tramos rectos entre los puntos altos y bajos.
 * `punto(t, y)` devuelve el punto del eje del canalón a la distancia t con altura y.
 */
function canalonU(c, { longitud, altura, punto, ancho, alto, transversal }) {
  const quiebres = [0, longitud / 2, longitud];
  for (let i = 0; i < quiebres.length - 1; i++) {
    const t0 = quiebres[i];
    const t1 = quiebres[i + 1];
    const y0 = altura(t0);
    const y1 = altura(t1);
    c.pieza(punto(t0, y0 - alto + 0.002), punto(t1, y1 - alto + 0.002), ancho, 0.004, 'canalon');
    for (const lado of [-1, 1]) {
      const off = transversal.clone().multiplyScalar((lado * ancho) / 2);
      c.pieza(punto(t0, y0 - alto / 2).add(off), punto(t1, y1 - alto / 2).add(off), 0.004, alto, 'canalon');
    }
  }
  for (const t of [0, longitud]) {
    const p = punto(t, altura(t) - alto / 2);
    const eje = punto(1, 0).sub(punto(0, 0)).normalize();
    c.pieza(p.clone().addScaledVector(eje, -0.002), p.clone().addScaledVector(eje, 0.002), ancho, alto, 'canalon');
  }
  // Soportes (abrazaderas) cada ≈0.9 m
  for (let t = 0.3; t < longitud - 0.1; t += 0.9) {
    const y = altura(t);
    const off = transversal.clone().multiplyScalar(ancho / 2 + 0.01);
    c.pieza(punto(t, y - alto - 0.004).sub(off), punto(t, y - alto - 0.004).add(off), 0.03, 0.005, 'fleje');
  }
}

/** Bajante con desvío hacia el interior de la terraza, codo y descarga sobre la losa. */
function bajante(c, salida, interior, haciaDentro, etiquetas, texto, etiquetar = true) {
  const r = GEOMETRIA.diametroBajante / 2;
  const p1 = salida.clone().add(V(0, -0.12, 0));
  const p2 = V(interior.x, salida.y - 0.45, interior.z);
  const p3 = V(interior.x, 0.14, interior.z);
  const p4 = p3.clone().addScaledVector(haciaDentro, 0.28).setY(0.06);
  c.cilindro(salida, p1, r, 'pvc');
  c.cilindro(p1, p2, r, 'pvc');
  c.cilindro(p2, p3, r, 'pvc');
  c.cilindro(p3, p4, r, 'pvc');
  for (let y = 0.6; y < p2.y - 0.2; y += 1.0) {
    c.caja([interior.x - r - 0.01, y, interior.z - r - 0.01], [interior.x + r + 0.01, y + 0.03, interior.z + r + 0.01], 'fleje');
  }
  const sumidero = p4.clone().addScaledVector(haciaDentro, 0.12).setY(0);
  c.cilindro(sumidero, sumidero.clone().setY(0.008), 0.1, 'sumidero', 20);
  if (!etiquetar) return;
  etiquetas.push({ texto, pos: p3.clone().setY(1.1), capa: 'drenaje' });
  etiquetas.push({ texto: 'Descarga a sumidero (por verificar)', pos: sumidero.clone().setY(0.12), capa: 'drenaje' });
}

/**
 * Canalón principal, bajantes y encuentro con el sobretecho existente.
 * El encuentro depende de r.modoEncuentro ('solape' | 'babero' | 'independiente').
 */
export function construirDrenaje(r, materiales) {
  const c = new Colector(materiales);
  const etiquetas = [];
  const W = r.p.ancho;
  const L = r.p.largo;
  const G = GEOMETRIA;
  const cn = r.canalon;
  const ancho = G.anchoCanalon;
  const alto = G.altoCanalon;

  // --- Canalón principal ------------------------------------------------------------
  const punto = cn.eje === 'x' ? (t, y) => V(cn.desde + t, y, cn.fijo) : (t, y) => V(cn.fijo, y, cn.desde + t);
  const transversal = cn.eje === 'x' ? V(0, 0, 1) : V(1, 0, 0);
  canalonU(c, { longitud: cn.longitud, altura: cn.altura, punto, ancho, alto, transversal });
  etiquetas.push({
    texto: `Canalón (pendiente ${G.pendienteCanalon} % hacia bajantes)`,
    pos: punto(cn.longitud * 0.3, cn.altura(cn.longitud * 0.3) + 0.08),
    capa: 'drenaje',
  });

  // --- Bajantes -------------------------------------------------------------------------
  for (const [i, t] of cn.bajantes.entries()) {
    const salida = punto(t, cn.altura(t) - alto);
    let interior;
    let haciaDentro;
    if (cn.eje === 'x') {
      interior = V(salida.x, 0, Math.min(salida.z, L - 0.08));
      haciaDentro = V(0, 0, -1);
    } else if (r.eje.signo > 0) {
      interior = V(Math.min(salida.x, W / 2 - 0.08), 0, salida.z);
      haciaDentro = V(-1, 0, 0);
    } else {
      interior = V(Math.max(salida.x, -W / 2 + 0.07), 0, salida.z);
      haciaDentro = V(1, 0, 0);
    }
    interior.z = Math.min(Math.max(interior.z, 0.1), L - 0.08);
    bajante(c, salida, interior, haciaDentro, etiquetas, 'Bajante PVC ≈3"', i === 0);
  }

  // --- Encuentro con el sobretecho existente ---------------------------------------
  const ex = r.existente;
  const xs = [];
  const nx = 30;
  for (let i = 0; i <= nx; i++) xs.push(r.xIzq + ((r.xDer - r.xIzq) * i) / nx);
  const encuentro = [];
  let textoEncuentro;

  if (r.modoEncuentro === 'solape') {
    const zc = G.vigaBordeExistente.z1 + 0.004;
    const secciones = xs.map((x) => [
      V(x, ex.vigaInferior + 0.03, zc),
      V(x, r.altura(x, zc) + 0.004, zc),
      V(x, r.altura(x, 0.08) + 0.006, 0.08),
    ]);
    encuentro.push(superficieEntreSecciones(secciones));
    if (r.esLong) {
      const y = r.altura(0, zc) - r.perfil / 2;
      c.pieza(V(r.xIzq, y, zc - 0.015), V(r.xDer, y, zc - 0.015), 0.025, r.perfil, 'cierre');
    }
    textoEncuentro = r.esLong
      ? `Encuentro: planchas nuevas ${r.p.solape.toFixed(2)} m bajo el existente + tapajunta y cierre de espuma`
      : `Encuentro: tímpano triangular + solape de ${r.p.solape.toFixed(2)} m bajo el existente`;
    // Collarines alrededor de los postes metálicos existentes que atraviesan el solape
    const xp = W / 2 - G.posteExistenteDesdeMuro;
    if (r.zIni < G.posteExistenteZ - 0.05) {
      for (const x of [-xp, xp]) {
        if (x < r.xIzq || x > r.xDer) continue;
        const y = r.altura(x, G.posteExistenteZ);
        const z = G.posteExistenteZ;
        c.caja([x - 0.085, y - 0.005, z - 0.085], [x + 0.085, y + 0.06, z + 0.085], 'remate');
      }
      etiquetas.push({
        texto: 'Collarín de sellado en poste existente',
        pos: V(xp, r.altura(xp, G.posteExistenteZ) + 0.12, G.posteExistenteZ),
        capa: 'encuentro',
      });
    }
  } else if (r.modoEncuentro === 'babero') {
    const z0 = G.holguraBabero;
    const z1 = z0 + r.p.solape;
    const secciones = xs.map((x) => [
      V(x, ex.altura(-0.25) + 0.014, -0.25),
      V(x, ex.hFin + 0.014, 0.0),
      V(x, r.altura(x, z0) + 0.012, z0 + 0.005),
      V(x, r.altura(x, z1) + 0.008, z1),
    ]);
    encuentro.push(superficieEntreSecciones(secciones));
    for (let x = r.xIzq + 0.2; x < r.xDer - 0.1; x += 0.35) {
      c.cilindro(V(x, ex.altura(-0.15) + 0.01, -0.15), V(x, ex.altura(-0.15) + 0.035, -0.15), 0.009, 'perno', 6);
    }
    textoEncuentro = `Encuentro: babero sobre el existente, solape ${r.p.solape.toFixed(2)} m sobre las planchas nuevas`;
  } else {
    // Canalón de encuentro colgado de la viga de borde existente, bajo el goteo de sus planchas
    const ce = r.canalonEncuentro;
    const bajoEnDer = r.esLong ? true : r.eje.signo > 0;
    const x0 = -W / 2 + 0.02;
    const Lg = W - 0.04;
    const alturaE = (t) => ce.yTop - (G.pendienteCanalon / 100) * (bajoEnDer ? t : Lg - t);
    const puntoE = (t, y) => V(x0 + t, y, ce.z);
    canalonU(c, { longitud: Lg, altura: alturaE, punto: puntoE, ancho: ce.ancho, alto: ce.alto, transversal: V(0, 0, 1) });
    // Colgadores hasta la viga de borde existente
    for (let t = 0.3; t < Lg - 0.1; t += 0.9) {
      const y = alturaE(t);
      const zA = ce.z - ce.ancho / 2;
      c.caja([x0 + t - 0.015, y - 0.02, G.vigaBordeExistente.z1 - 0.004], [x0 + t + 0.015, y + 0.012, zA], 'fleje');
    }
    // Bajante pegado al parapeto, entre el poste existente y el primer pórtico nuevo
    const tB = bajoEnDer ? Lg - 0.12 : 0.12;
    const salida = puntoE(tB, alturaE(tB) - ce.alto);
    const lado = bajoEnDer ? 1 : -1;
    const interior = V(lado * (W / 2 - 0.07), 0, ce.z + 0.03);
    bajante(c, salida, interior, V(-lado, 0, 0), etiquetas, 'Bajante del canalón de encuentro');
    textoEncuentro =
      r.extension.aplicada > 0
        ? `Encuentro: canalón colgado del borde existente + extensión trasera de ${r.extension.aplicada.toFixed(2)} m por encima`
        : 'Encuentro independiente: canalón entre cubiertas (hueco abierto: activar la extensión trasera)';
  }
  for (const g of encuentro) c.agregar(g, 'remate');
  etiquetas.push({
    texto: textoEncuentro,
    pos: V(0.4, Math.max(ex.hFin, r.altura(0.4, 0)) + 0.35, 0.05),
    capa: 'encuentro',
    destacada: true,
  });

  const grupo = c.construir({ nombre: 'drenaje y encuentro' });
  grupo.children.forEach((m) => (m.userData.esCubierta = m.name === 'remate'));
  return { grupo, etiquetas };
}
