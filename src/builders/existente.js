import * as THREE from 'three';
import { Colector } from '../utils/geometria3d.js';
import { geometriaPlancha } from '../utils/planchas.js';
import { GEOMETRIA } from '../config/proyecto.js';

/** Calamina ondulada genérica para representar el sobretecho existente (no se reconstruye). */
const PERFIL_EXISTENTE = { perfil: 'onda', pasoNervio: 0.076, alturaPerfil: 0.018 };

/**
 * Sobretecho metálico existente, con el detalle justo para explicar el encuentro:
 * viga tubular de borde, postes de esquina, vigas inclinadas, correas y planchas
 * (dos de ellas traslúcidas, como se ve en las fotos tomadas desde atrás).
 */
export function construirExistente(r, materiales) {
  const { p, existente: ex } = r;
  const W = p.ancho;
  const F = ex.fondo;
  const G = GEOMETRIA;
  const grupo = new THREE.Group();
  grupo.name = 'sobretecho existente';

  const sE = (ex.hIni - ex.hFin) / F;
  const yAcero = (z) => ex.altura(z) - 0.02;
  const c = new Colector(materiales);

  // Viga de borde (tubo rectangular) bajo el extremo de las planchas
  const v = G.vigaBordeExistente;
  c.caja([-W / 2, ex.vigaInferior, v.z0], [W / 2, ex.hFin - 0.02, v.z1], 'aceroExistente');

  // Postes de esquina
  const xp = W / 2 - G.posteExistenteDesdeMuro;
  for (const x of [-xp, xp]) {
    c.caja([x - 0.05, 0, G.posteExistenteZ - 0.05], [x + 0.05, ex.vigaInferior, G.posteExistenteZ + 0.05], 'aceroExistente');
    c.caja([x - 0.1, 0, G.posteExistenteZ - 0.1], [x + 0.1, 0.01, G.posteExistenteZ + 0.1], 'aceroExistente');
  }

  // Vigas inclinadas apoyadas en la fachada y en la viga de borde
  for (const x of [-xp, 0, xp]) {
    const a = new THREE.Vector3(x, yAcero(-F) - 0.05 - 0.06, -F);
    const b = new THREE.Vector3(x, yAcero(v.z0) - 0.05 - 0.06, v.z0);
    c.pieza(a, b, 0.06, 0.12, 'aceroExistente');
  }

  // Correas transversales (perfiles C)
  for (let z = -F + 0.2; z < v.z0 - 0.2; z += 0.9) {
    c.pieza(new THREE.Vector3(-W / 2, yAcero(z) - 0.025, z), new THREE.Vector3(W / 2, yAcero(z) - 0.025, z), 0.05, 0.05, 'aceroExistente');
  }
  grupo.add(c.construir({ nombre: 'acero existente' }));

  // Planchas onduladas: caen hacia la nueva terraza (dirección +z)
  const cosE = 1 / Math.sqrt(1 + sE * sE);
  const largo = F / cosE;
  const d = new THREE.Vector3(0, -sE, 1).multiplyScalar(cosE);
  const n = new THREE.Vector3(0, 1, sE).multiplyScalar(cosE);
  const a = new THREE.Vector3(1, 0, 0);
  const anchoPl = 0.8;
  const nPl = Math.ceil(W / anchoPl);
  for (let k = 0; k < nPl; k++) {
    const ancho = Math.min(anchoPl, W - k * anchoPl) + (k < nPl - 1 ? 0.03 : 0);
    const traslucida = k === 2 || k === nPl - 3;
    const g = geometriaPlancha(PERFIL_EXISTENTE, ancho, largo);
    const m = new THREE.Matrix4().makeBasis(a, n, d);
    m.setPosition(-W / 2 + k * anchoPl, ex.hIni + (k % 2) * 0.002, -F);
    g.applyMatrix4(m);
    const mesh = new THREE.Mesh(g, traslucida ? materiales.traslucidaExistente : materiales.chapaExistente);
    mesh.castShadow = !traslucida;
    mesh.receiveShadow = true;
    mesh.userData.esCubierta = true;
    grupo.add(mesh);
  }
  return grupo;
}
