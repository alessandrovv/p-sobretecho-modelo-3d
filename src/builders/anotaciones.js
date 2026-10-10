import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ejesCubierta } from './cubierta.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const f2 = (v) => v.toFixed(2);

function etiquetaCSS(texto, clase) {
  const el = document.createElement('div');
  el.className = clase;
  el.textContent = texto;
  return new CSS2DObject(el);
}

/** Cota con marcas en los extremos y texto en el centro. */
function cota(p1, p2, texto, material, { marca = V(0, 0, 0.12), clase = 'cota' } = {}) {
  const g = new THREE.Group();
  const pts = [p1, p2];
  for (const p of [p1, p2]) pts.push(p.clone().sub(marca), p.clone().add(marca));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  g.add(new THREE.LineSegments(geo, material));
  const et = etiquetaCSS(texto, clase);
  et.position.copy(p1).add(p2).multiplyScalar(0.5);
  g.add(et);
  return g;
}

function lineaDiscontinua(p1, p2, material) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), material);
  l.computeLineDistances();
  return l;
}

/** Geometría de flecha (cuerpo + punta) apuntando a +Z local, de 0.45 m. */
function geometriaFlecha() {
  const cuerpo = new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8);
  cuerpo.rotateX(Math.PI / 2);
  cuerpo.translate(0, 0, 0.15);
  const punta = new THREE.ConeGeometry(0.05, 0.15, 12);
  punta.rotateX(Math.PI / 2);
  punta.translate(0, 0, 0.375);
  return mergeGeometries([cuerpo.toNonIndexed(), punta.toNonIndexed()]);
}

/**
 * Cotas, etiquetas y flechas de escorrentía. Devuelve capas separadas para poder
 * mostrarlas u ocultarlas, y la lista de flechas para animarlas.
 */
export function construirAnotaciones(r, materiales, etiquetasElementos) {
  const { p } = r;
  const W = p.ancho;
  const L = p.largo;
  const F = r.existente.fondo;
  const cotas = new THREE.Group();
  cotas.name = 'cotas';
  const etiquetas = new THREE.Group();
  etiquetas.name = 'etiquetas';
  const agua = new THREE.Group();
  agua.name = 'agua';
  const flechas = [];

  // --- Cotas en planta ----------------------------------------------------------------
  cotas.add(cota(V(-W / 2, 0.03, L + 0.9), V(W / 2, 0.03, L + 0.9), `Ancho ${f2(W)} m`, materiales.lineaCota));
  cotas.add(cota(V(W / 2 + 0.9, 0.03, 0), V(W / 2 + 0.9, 0.03, L), `Largo ${f2(L)} m`, materiales.lineaCota, { marca: V(0.12, 0, 0) }));
  cotas.add(
    cota(V(-W / 2, 0.03, L + 1.5), V(W / 2, 0.03, L + 1.5), `Área ≈ ${(W * L).toFixed(1)} m²`, materiales.lineaCota, {
      marca: V(0, 0, 0),
      clase: 'cota cota-suave',
    }),
  );

  // --- Alturas de la nueva cubierta ---------------------------------------------------
  let pInicio;
  let pFinal;
  if (r.esLong) {
    pInicio = V(W / 2 + 0.5, 0, 0);
    pFinal = V(W / 2 + 0.5, 0, L);
  } else {
    const xAlto = r.eje.signo > 0 ? -W / 2 : W / 2;
    pInicio = V(xAlto, 0, L + 0.5);
    pFinal = V(-xAlto, 0, L + 0.5);
  }
  const marcaV = V(0.12, 0, 0);
  cotas.add(cota(pInicio, pInicio.clone().setY(p.alturaInicio), `Inicio ${f2(p.alturaInicio)} m`, materiales.lineaCota, { marca: marcaV }));
  cotas.add(cota(pFinal, pFinal.clone().setY(r.alturaFinal), `Final ${f2(r.alturaFinal)} m (calculada)`, materiales.lineaCota, { marca: marcaV }));
  // Desnivel: referencia horizontal al nivel de inicio y cota vertical del salto
  const fuera = r.esLong ? V(0, 0, 0.35) : V(r.eje.signo * 0.35, 0, 0);
  const pD = pFinal.clone().add(fuera);
  cotas.add(lineaDiscontinua(pInicio.clone().setY(p.alturaInicio), pD.clone().setY(p.alturaInicio), materiales.lineaReferencia));
  cotas.add(
    cota(pD.clone().setY(r.alturaFinal), pD.clone().setY(p.alturaInicio), `Δ ${f2(r.desnivel)} m = ${f2(r.longitudCaida)} × ${p.pendiente} % / 100`, materiales.lineaCota, {
      marca: marcaV,
      clase: 'cota cota-desnivel',
    }),
  );

  // --- Alturas del sobretecho existente -----------------------------------------------
  const xe = W / 2 + 1.2;
  cotas.add(cota(V(xe, 0, -F), V(xe, r.existente.hIni, -F), `Existente ${f2(r.existente.hIni)} m`, materiales.lineaCota, { marca: marcaV, clase: 'cota cota-suave' }));
  cotas.add(cota(V(xe, 0, -0.02), V(xe, r.existente.hFin, -0.02), `Borde existente ${f2(r.existente.hFin)} m`, materiales.lineaCota, { marca: marcaV, clase: 'cota cota-suave' }));

  // --- Altura libre crítica -------------------------------------------------------------
  const pc = r.puntoCritico;
  const ok = r.alturaLibreEstructura >= p.alturaLibreMin;
  const xLibre = pc.x - Math.sign(pc.x) * 0.45;
  cotas.add(
    cota(V(xLibre, 0, pc.z), V(xLibre, pc.y, pc.z), `Altura libre ${f2(pc.y)} m ${ok ? '≥' : '<'} ${f2(p.alturaLibreMin)} m`, ok ? materiales.lineaCotaOk : materiales.lineaCotaError, {
      marca: marcaV,
      clase: ok ? 'cota cota-ok' : 'cota cota-error',
    }),
  );

  // --- Solape del encuentro -----------------------------------------------------------
  if (r.modoEncuentro !== 'independiente') {
    const [z0, z1] = r.modoEncuentro === 'solape' ? [r.zIni, 0] : [0.03, 0.03 + p.solape];
    const y = Math.max(r.existente.hFin, r.altura(-W / 2 + 0.6, 0)) + 0.15;
    cotas.add(cota(V(-W / 2 + 0.6, y, z0), V(-W / 2 + 0.6, y, z1), `Solape ${f2(p.solape)} m`, materiales.lineaCota, { marca: V(0, 0.08, 0), clase: 'cota cota-encuentro' }));
  } else if (r.extension.aplicada > 0) {
    const x = -W / 2 + 0.6;
    const y = r.altura(x, r.zIni) + 0.2;
    cotas.add(
      cota(V(x, y, r.zIni), V(x, y, r.zBaseCubierta), `Extensión trasera ${f2(r.extension.aplicada)} m`, materiales.lineaCota, {
        marca: V(0, 0.08, 0),
        clase: 'cota cota-encuentro',
      }),
    );
  }

  // --- Etiquetas de elementos -----------------------------------------------------------
  const contexto = [
    { texto: 'Sobretecho metálico existente (no se reconstruye)', pos: V(-0.8, r.existente.hIni + 0.35, -F * 0.55), capa: 'existente' },
    { texto: `Muro alto ≈${f2(p.alturaMuroIzquierdo)} m (estimado)`, pos: V(-W / 2 - 0.08, p.alturaMuroIzquierdo + 0.15, L * 0.75), capa: 'muros' },
    { texto: `Parapeto ≈${f2(p.alturaParapeto)} m (estimado)`, pos: V(W / 2 + 0.08, p.alturaParapeto + 0.15, L * 0.55), capa: 'muros' },
    { texto: 'Losa de concreto (capacidad por verificar)', pos: V(0.6, 0.05, L * 0.62), capa: 'muros' },
  ];
  for (const e of [...contexto, ...etiquetasElementos]) {
    const et = etiquetaCSS(e.texto, e.destacada ? 'etiqueta etiqueta-destacada' : 'etiqueta');
    et.position.copy(e.pos);
    et.userData.capa = e.capa;
    etiquetas.add(et);
  }
  const { n, d } = ejesCubierta(r);
  const centro = (() => {
    const rr = r.R * 0.5;
    const c = r.rACoord(rr);
    const t = (r.trans.a + r.trans.b) / 2;
    const [x, z] = r.esLong ? [t, c] : [c, t];
    return V(x, r.altura(x, z), z);
  })();
  const etP = etiquetaCSS(`Pendiente ${p.pendiente} % · ${r.direccion.corto}`, 'etiqueta etiqueta-pendiente');
  etP.position.copy(centro).addScaledVector(n, 0.35);
  etP.userData.capa = 'agua';
  agua.add(etP);

  // --- Flechas de escorrentía -----------------------------------------------------------
  const geo = geometriaFlecha();
  const flecha = (origen, dir, recorrido, fase = 0) => {
    const m = new THREE.Mesh(geo, materiales.agua);
    m.quaternion.setFromUnitVectors(V(0, 0, 1), dir.clone().normalize());
    m.position.copy(origen);
    agua.add(m);
    flechas.push({ mesh: m, origen: origen.clone(), dir: dir.clone().normalize(), recorrido, fase });
  };
  // Sobre la nueva cubierta: retícula en la dirección de caída
  const nTrans = Math.max(2, Math.round((r.trans.b - r.trans.a) / 1.6));
  for (let i = 0; i < nTrans; i++) {
    const t = r.trans.a + ((r.trans.b - r.trans.a) * (i + 0.5)) / nTrans;
    for (let rr = 0.35; rr < r.R - 0.9; rr += 1.7) {
      const c = r.rACoord(rr);
      const [x, z] = r.esLong ? [t, c] : [c, t];
      flecha(V(x, r.altura(x, z), z).addScaledVector(n, 0.07), d, 1.1, (i * 0.37 + rr * 0.21) % 1.1);
    }
  }
  // Sobre el sobretecho existente: cae hacia el encuentro
  const sE = (r.existente.hIni - r.existente.hFin) / F;
  const dE = V(0, -sE, 1).normalize();
  for (const x of [-W / 4, W / 4]) {
    flecha(V(x, r.existente.altura(-F * 0.75) + 0.08, -F * 0.75), dE, F * 0.6, x > 0 ? 0.4 : 0);
  }
  // En el canalón: hacia las bajantes
  const cn = r.canalon;
  const puntoC = (t) => (cn.eje === 'x' ? V(cn.desde + t, cn.altura(t) + 0.06, cn.fijo) : V(cn.fijo, cn.altura(t) + 0.06, cn.desde + t));
  for (let t = 0.8; t < cn.longitud - 0.6; t += 1.8) {
    const destino = cn.bajantes.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
    if (Math.abs(destino - t) < 0.5) continue;
    const dir = puntoC(destino).sub(puntoC(t)).setY(0);
    flecha(puntoC(t), dir, 0.5, t % 0.5);
  }
  // En las bajantes: hacia abajo
  for (const t of cn.bajantes) {
    const pB = puntoC(t);
    flecha(V(pB.x, Math.max(1.6, pB.y - 0.9), pB.z).add(cn.eje === 'x' ? V(0.12, 0, -0.15) : V(-r.eje.signo * 0.15, 0, 0.12)), V(0, -1, 0), 0.8, 0.2);
  }

  return { cotas, etiquetas, agua, flechas };
}

/** Desplaza las flechas a lo largo de su recorrido (llamar en cada fotograma). */
export function animarFlechas(flechas, tiempo) {
  for (const f of flechas) {
    const k = (tiempo * 0.45 + f.fase) % f.recorrido;
    f.mesh.position.copy(f.origen).addScaledVector(f.dir, k);
  }
}
