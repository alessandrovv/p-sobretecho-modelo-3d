import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _arriba = new THREE.Vector3(0, 1, 0);

/**
 * UV en metros en el sistema local de una caja alineada con su eje Z (largo):
 * la U de las caras largas corre a lo largo de la pieza, para que la veta siga el largo.
 */
function uvLocalPieza(geometry) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    let u;
    let v;
    if (ax > 0.5) {
      u = pos.getZ(i);
      v = pos.getY(i);
    } else if (ay > 0.5) {
      u = pos.getZ(i);
      v = pos.getX(i);
    } else {
      u = pos.getX(i);
      v = pos.getY(i);
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/**
 * Matriz que lleva el eje Z local a la dirección p1→p2, con el eje Y local lo más
 * parecido posible a `arriba` (así la sección b × h queda "de canto").
 */
export function matrizEntre(p1, p2, arriba = _arriba) {
  const z = new THREE.Vector3().subVectors(p2, p1);
  const largo = z.length();
  z.normalize();
  let y = arriba.clone().sub(z.clone().multiplyScalar(arriba.dot(z)));
  if (y.lengthSq() < 1e-8) y = new THREE.Vector3(1, 0, 0).sub(z.clone().multiplyScalar(z.x));
  y.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.setPosition(new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5));
  return { matriz: m, largo };
}

/**
 * Acumula geometrías ya transformadas al mundo y las fusiona por material, para
 * dibujar cientos de piezas con pocas llamadas de dibujo.
 */
export class Colector {
  constructor(materiales) {
    this.materiales = materiales;
    this.porMaterial = new Map();
  }

  agregar(geometry, clave) {
    if (!this.porMaterial.has(clave)) this.porMaterial.set(clave, []);
    this.porMaterial.get(clave).push(geometry.index ? geometry.toNonIndexed() : geometry);
  }

  /** Pieza prismática de sección b × h entre dos puntos. */
  pieza(p1, p2, b, h, clave, arriba = _arriba) {
    const { matriz, largo } = matrizEntre(p1, p2, arriba);
    if (largo < 1e-4) return;
    const g = new THREE.BoxGeometry(b, h, largo);
    uvLocalPieza(g);
    g.applyMatrix4(matriz);
    this.agregar(g, clave);
  }

  /** Caja alineada con los ejes, definida por sus esquinas. */
  caja(min, max, clave) {
    const g = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    uvLocalPieza(g);
    g.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    this.agregar(g, clave);
  }

  /** Cilindro entre dos puntos (pernos, tubos). */
  cilindro(p1, p2, radio, clave, segmentos = 12) {
    const { matriz, largo } = matrizEntre(p1, p2);
    if (largo < 1e-4) return;
    const g = new THREE.CylinderGeometry(radio, radio, largo, segmentos);
    g.rotateX(Math.PI / 2);
    g.applyMatrix4(matriz);
    this.agregar(g, clave);
  }

  construir({ sombras = true, nombre } = {}) {
    const grupo = new THREE.Group();
    if (nombre) grupo.name = nombre;
    for (const [clave, geoms] of this.porMaterial) {
      const conUV = geoms.map((g) => {
        if (!g.attributes.uv) {
          g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        }
        return g;
      });
      const merged = mergeGeometries(conUV, false);
      geoms.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, this.materiales[clave]);
      mesh.name = clave;
      mesh.castShadow = sombras;
      mesh.receiveShadow = true;
      grupo.add(mesh);
    }
    return grupo;
  }
}

/**
 * Superficie reglada entre secciones: `secciones` es una lista de polilíneas con el
 * mismo número de puntos (Vector3). Se usa para baberos, tímpanos y remates.
 */
export function superficieEntreSecciones(secciones) {
  const n = secciones[0].length;
  const pos = [];
  for (const sec of secciones) for (const p of sec) pos.push(p.x, p.y, p.z);
  const idx = [];
  for (let i = 0; i < secciones.length - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j;
      const b = (i + 1) * n + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Libera geometrías y quita del padre todos los hijos de un objeto. */
export function vaciar(objeto) {
  objeto.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.isCSS2DObject && o.element?.parentNode) o.element.parentNode.removeChild(o.element);
  });
  while (objeto.children.length) objeto.remove(objeto.children[0]);
}
