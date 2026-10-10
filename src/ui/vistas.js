import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Vistas predefinidas en función de las dimensiones actuales. */
export function definirVistas(r) {
  const W = r.p.ancho;
  const L = r.p.largo;
  const F = r.existente.fondo;
  const medio = L / 2 - F / 4;
  const yEncuentro = (r.existente.hFin + r.altura(0, 0)) / 2 - 0.4;
  return {
    // Desde el frente abierto y a la derecha: el existente queda detrás de la nueva cubierta
    iso: { pos: V(W / 2 + 9.5, 9, L + 8), objetivo: V(0, 1.7, L * 0.42) },
    frontal: { pos: V(0, 2.6, L + 15), objetivo: V(0, 2.0, L / 2) },
    posterior: { pos: V(2, 10.5, -F - 10), objetivo: V(0, 2.2, L * 0.45) },
    izquierda: { pos: V(-18, 4, medio), objetivo: V(0, 2.0, medio) },
    derecha: { pos: V(18, 4, medio), objetivo: V(0, 2.0, medio) },
    superior: { pos: V(0, 28, medio + 0.01), objetivo: V(0, 0, medio) },
    encuentro: { pos: V(W / 2 + 2.4, yEncuentro + 1.9, 3.0), objetivo: V(0.3, yEncuentro, -0.2), cercana: true },
    interior: { pos: V(W / 4, 1.6, L - 0.6), objetivo: V(-W / 8, 2.7, L * 0.3), cercana: true },
  };
}

const suavizar = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Mueve cámara y objetivo de OrbitControls con una transición corta. */
export class GestorVistas {
  constructor(camara, controles) {
    this.camara = camara;
    this.controles = controles;
    this.transicion = null;
  }

  ir(vista, inmediato = false) {
    const pos = this.posicionAjustada(vista);
    if (inmediato) {
      this.camara.position.copy(pos);
      this.controles.target.copy(vista.objetivo);
      this.controles.update();
      return;
    }
    this.transicion = {
      t0: performance.now(),
      dur: 750,
      desdePos: this.camara.position.clone(),
      desdeObj: this.controles.target.clone(),
      haciaPos: pos,
      haciaObj: vista.objetivo.clone(),
    };
  }

  /** En pantallas verticales la cámara se aleja para que el modelo quepa a lo ancho. */
  posicionAjustada(vista) {
    const aspecto = this.camara.aspect;
    if (vista.cercana || aspecto >= 1.2) return vista.pos.clone();
    const factor = Math.min(1.9, 1.05 / aspecto);
    return vista.objetivo.clone().add(vista.pos.clone().sub(vista.objetivo).multiplyScalar(factor));
  }

  actualizar(ahora) {
    const tr = this.transicion;
    if (!tr) return;
    const k = Math.min(1, (ahora - tr.t0) / tr.dur);
    const e = suavizar(k);
    this.camara.position.lerpVectors(tr.desdePos, tr.haciaPos, e);
    this.controles.target.lerpVectors(tr.desdeObj, tr.haciaObj, e);
    if (k >= 1) this.transicion = null;
  }
}
