import * as THREE from 'three';
import { geometriaPlancha } from '../utils/planchas.js';
import { superficieEntreSecciones } from '../utils/geometria3d.js';
import { crestasDePlancha } from '../calc/geometria.js';
import { materialPlancha } from '../escena/materiales.js';
import { normalCubierta } from './estructura.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ARRIBA = V(0, 1, 0);

/** Ejes locales de la cubierta: d = hacia abajo en la pendiente, n = normal, a = n × d. */
export function ejesCubierta(r) {
  const n = normalCubierta(r);
  const d = (r.esLong ? V(0, -r.s, 1) : V(r.eje.signo, -r.s, 0)).multiplyScalar(r.cosA);
  const a = new THREE.Vector3().crossVectors(n, d);
  return { n, d, a };
}

/** Punto del plano de cubierta a partir de (u en la pendiente, coordenada transversal). */
function puntoCubierta(r, u, t) {
  const c = r.rACoord(u * r.cosA);
  const [x, z] = r.esLong ? [t, c] : [c, t];
  return V(x, r.altura(x, z), z);
}

/**
 * Remate en L sobre un borde: ala apoyada en las crestas y faldón exterior.
 * `haciaDentro` es la dirección horizontal desde el borde hacia la cubierta.
 */
function remateBorde(p1, p2, haciaDentro, n, faldon = 0.15) {
  const fuera = haciaDentro.clone().negate();
  const seccion = (p) => [
    p.clone().addScaledVector(haciaDentro, 0.12).addScaledVector(n, 0.008),
    p.clone().addScaledVector(n, 0.012),
    p.clone().addScaledVector(fuera, 0.02).addScaledVector(n, 0.012),
    p.clone().addScaledVector(fuera, 0.02).addScaledVector(ARRIBA, -faldon),
  ];
  return superficieEntreSecciones([seccion(p1), seccion(p2)]);
}

/**
 * Planchas (opacas y traslúcidas), fijaciones y remates de borde.
 * Las planchas se colocan con las crestas sobre el plano calculado y cada pieza
 * superior monta sobre la inferior en los traslapes (que caen sobre correa).
 */
export function construirCubierta(r, materiales) {
  const grupo = new THREE.Group();
  grupo.name = 'cubierta';
  const etiquetas = [];
  const mat = r.material;
  const { n, d, a } = ejesCubierta(r);
  const ejeTrans = r.esLong ? V(1, 0, 0) : V(0, 0, 1);
  const signoA = Math.sign(a.dot(ejeTrans));

  const fijaciones = [];
  let etiquetaTraslucida = null;
  for (const pl of r.planchas) {
    const conTraslapeLateral = signoA > 0 ? pl.k < r.nPlanchas - 1 : pl.k > 0;
    const anchoGeo = pl.ancho + (conTraslapeLateral ? 0.03 : 0);
    const tOrigen = signoA > 0 ? pl.a : pl.b;
    const crestas = crestasDePlancha(mat, pl.ancho);
    pl.piezas.forEach((pz, i) => {
      const largo = pz.fin - pz.ini;
      const g = geometriaPlancha(mat, anchoGeo, largo);
      const desfase = (pl.piezas.length - 1 - i) * 0.004 + (pl.k % 2) * 0.0015;
      const origen = puntoCubierta(r, pz.ini, tOrigen).addScaledVector(n, desfase);
      const m = new THREE.Matrix4().makeBasis(a, n, d).setPosition(origen);
      g.applyMatrix4(m);
      const mesh = new THREE.Mesh(g, materialPlancha(materiales, mat, pl.traslucida));
      mesh.name = pl.traslucida ? 'plancha traslúcida' : 'plancha';
      mesh.castShadow = !pl.traslucida;
      mesh.receiveShadow = true;
      mesh.userData.esCubierta = true;
      mesh.renderOrder = pl.traslucida ? 2 : 0;
      grupo.add(mesh);

      for (const u of r.correasU) {
        if (u < pz.ini - 1e-6 || u > pz.fin + 1e-6) continue;
        for (const sOff of crestas) {
          fijaciones.push(origen.clone().addScaledVector(a, sOff).addScaledVector(d, u - pz.ini).addScaledVector(n, 0.006));
        }
      }
      if (pl.traslucida && !etiquetaTraslucida) {
        etiquetaTraslucida = origen.clone().addScaledVector(a, pl.ancho / 2).addScaledVector(d, largo * 0.55).addScaledVector(n, 0.05);
      }
    });
  }
  if (etiquetaTraslucida) {
    etiquetas.push({ texto: `Plancha traslúcida (${mat.traslucida.nombre})`, pos: etiquetaTraslucida, capa: 'cubierta' });
  }

  // Fijaciones en cresta sobre cada correa (InstancedMesh)
  if (fijaciones.length) {
    const geo = new THREE.CylinderGeometry(0.011, 0.011, 0.014, 6);
    const inst = new THREE.InstancedMesh(geo, materiales.fijacion, fijaciones.length);
    const q = new THREE.Quaternion().setFromUnitVectors(ARRIBA, n);
    const m = new THREE.Matrix4();
    const escala = V(1, 1, 1);
    fijaciones.forEach((p, i) => inst.setMatrixAt(i, m.compose(p, q, escala)));
    inst.name = 'fijaciones';
    inst.userData.esCubierta = true;
    grupo.add(inst);
    etiquetas.push({ texto: `Fijación en cresta sobre correa (${r.nFijaciones})`, pos: fijaciones[Math.floor(fijaciones.length * 0.35)].clone().addScaledVector(n, 0.03), capa: 'cubierta' });
  }

  // --- Remates de borde -------------------------------------------------------------
  const remates = [];
  const alto = (x, z) => V(x, r.altura(x, z), z);
  if (r.esLong) {
    remates.push(remateBorde(alto(r.xIzq, r.zIni), alto(r.xIzq, r.zFin), V(1, 0, 0), n));
    remates.push(remateBorde(alto(r.xDer, r.zIni), alto(r.xDer, r.zFin), V(-1, 0, 0), n));
    if (r.modoEncuentro === 'independiente') {
      remates.push(remateBorde(alto(r.xIzq, r.zIni), alto(r.xDer, r.zIni), V(0, 0, 1), n, 0.2));
    }
  } else {
    const xAlto = r.eje.alto;
    const xBajo = r.eje.bajo;
    remates.push(remateBorde(alto(xAlto, r.zFin), alto(xBajo, r.zFin), V(0, 0, -1), n));
    if (r.modoEncuentro !== 'solape') remates.push(remateBorde(alto(xAlto, r.zIni), alto(xBajo, r.zIni), V(0, 0, 1), n));
    remates.push(remateBorde(alto(xAlto, r.zIni), alto(xAlto, r.zFin), V(r.eje.signo, 0, 0), n));
  }
  for (const g of remates) {
    const mesh = new THREE.Mesh(g, materiales.remate);
    mesh.castShadow = true;
    mesh.userData.esCubierta = true;
    grupo.add(mesh);
  }
  {
    const pos = r.esLong ? alto(r.xDer, r.zFin * 0.6) : alto((r.xIzq + r.xDer) / 2, r.zFin);
    etiquetas.push({ texto: 'Remate de borde', pos: pos.add(V(0, 0.08, 0)), capa: 'cubierta' });
  }
  if (r.extension.aplicada > 0) {
    const zMedio = (r.zIni + r.zBaseCubierta) / 2;
    etiquetas.push({
      texto: `Extensión trasera ${r.extension.aplicada.toFixed(2)} m (solo cubierta, sobre correas en voladizo)`,
      pos: alto(r.xIzq + 1.2, zMedio).add(V(0, 0.12, 0)),
      capa: 'encuentro',
    });
  }

  // --- Babero contra el muro alto izquierdo -----------------------------------------
  const W = r.p.ancho;
  const hMuro = r.p.alturaMuroIzquierdo;
  const zs = [];
  for (let z = Math.max(r.zIni, 0.02); z <= r.zFin + 1e-6; z += 0.25) zs.push(z);
  const xMuro = -W / 2 + 0.003;
  let tramo = [];
  const cerrarTramo = () => {
    if (tramo.length >= 2) {
      const mesh = new THREE.Mesh(superficieEntreSecciones(tramo), materiales.remate);
      mesh.castShadow = true;
      mesh.userData.esCubierta = true;
      grupo.add(mesh);
      etiquetas.push({ texto: 'Babero contra muro (fijación no estructural)', pos: tramo[Math.floor(tramo.length / 2)][0].clone().add(V(0.05, 0.05, 0)), capa: 'cubierta' });
    }
    tramo = [];
  };
  for (const z of zs) {
    const yRoof = r.altura(r.xIzq, z);
    if (hMuro > yRoof - 0.02) {
      if (r.p.direccion === 'lateralIzq') {
        const yC = r.canalon.altura(z - r.canalon.desde);
        const tope = Math.min(hMuro, yC + 0.2);
        tramo.push([V(xMuro, tope, z), V(xMuro, yC - 0.03, z), V(xMuro + 0.015, yC - 0.03, z)]);
      } else {
        const tope = Math.min(hMuro, yRoof + 0.18);
        tramo.push([V(xMuro, tope, z), V(xMuro, yRoof + 0.012, z), V(r.xIzq + 0.12, r.altura(r.xIzq + 0.12, z) + 0.01, z)]);
      }
    } else cerrarTramo();
  }
  cerrarTramo();

  return { grupo, etiquetas };
}
