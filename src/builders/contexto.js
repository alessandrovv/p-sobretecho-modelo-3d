import * as THREE from 'three';
import { Colector } from '../utils/geometria3d.js';

/**
 * Contexto arquitectónico mínimo: losa de concreto, muro alto izquierdo con columnas
 * de confinamiento, parapetos bajos (derecho y frontal) y fachada del edificio al fondo.
 * Se omite todo el ruido de obra de las fotos (ropa, cables, ladrillos sueltos, tanques...).
 *
 * Devuelve los muros por separado para poder atenuarlos cuando la cámara queda detrás.
 */
export function construirContexto(r, materiales) {
  const { p } = r;
  const W = p.ancho;
  const L = p.largo;
  const e = p.espesorMuro;
  const F = p.fondoExistente;
  const grupo = new THREE.Group();
  grupo.name = 'contexto';

  const fijo = new Colector(materiales);
  // Losa (el borde se extiende bajo los muros)
  fijo.caja([-W / 2 - e, -0.2, -F - e], [W / 2 + e, 0, L + e], 'concreto');
  const fijos = fijo.construir({ nombre: 'losa' });
  fijos.children.forEach((m) => (m.castShadow = false));
  grupo.add(fijos);

  // Entorno neutro un nivel más abajo, para leer la terraza como azotea
  const entorno = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), materiales.entorno);
  entorno.rotation.x = -Math.PI / 2;
  entorno.position.set(0, -2.8, L / 2);
  entorno.receiveShadow = true;
  grupo.add(entorno);

  const muros = [];
  const muro = (nombre, min, max, normal, conColumnas) => {
    const c = new Colector({ ladrillo: materiales.ladrillo.clone(), columnaConcreto: materiales.columnaConcreto.clone() });
    c.caja(min, max, 'ladrillo');
    if (conColumnas) conColumnas(c);
    const g = c.construir({ nombre });
    const mats = g.children.map((m) => m.material);
    mats.forEach((mat) => (mat.transparent = true));
    grupo.add(g);
    muros.push({
      nombre,
      grupo: g,
      materiales: mats,
      normal: new THREE.Vector3(...normal),
      centro: new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2),
    });
  };

  // Muro alto izquierdo (x = −W/2), con columnas de concreto cada ≈3 m como en las fotos
  const hIzq = p.alturaMuroIzquierdo;
  muro('muro izquierdo', [-W / 2 - e, 0, -F - e], [-W / 2, hIzq, L + e], [-1, 0, 0], (c) => {
    const nCol = Math.max(2, Math.round((L + F) / 3));
    for (let i = 0; i <= nCol; i++) {
      const z = -F - e / 2 + ((L + F + e) * i) / nCol;
      c.caja([-W / 2 - e - 0.005, 0, z - 0.12], [-W / 2 + 0.005, hIzq + 0.005, z + 0.12], 'columnaConcreto');
    }
    c.caja([-W / 2 - e - 0.005, hIzq - 0.2, -F - e], [-W / 2 + 0.005, hIzq + 0.005, L + e], 'columnaConcreto');
  });

  // Parapeto derecho y frontal (altura estimada)
  const hp = p.alturaParapeto;
  muro('parapeto derecho', [W / 2, 0, -F - e], [W / 2 + e, hp, L + e], [1, 0, 0]);
  muro('parapeto frontal', [-W / 2, 0, L], [W / 2, hp, L + e], [0, 0, 1]);

  // Fachada del edificio al fondo, con la puerta bajo el sobretecho existente
  const hEd = p.alturaEdificio;
  muro('fachada del edificio', [-W / 2 - e, 0, -F - e - 0.1], [W / 2 + e, hEd, -F], [0, 0, -1], (c) => {
    c.caja([-W / 2 - e, 2.9, -F - e - 0.1 - 0.005], [W / 2 + e, 3.1, -F + 0.005], 'columnaConcreto');
  });
  const puerta = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.04), materiales.puerta);
  puerta.position.set(0.6, 1.05, -F + 0.01);
  puerta.receiveShadow = true;
  grupo.add(puerta);

  return { grupo, muros };
}
