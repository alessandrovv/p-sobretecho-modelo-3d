import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './estilos.css';

import { PARAMETROS_INICIALES } from './config/proyecto.js';
import { calcularProyecto } from './calc/geometria.js';
import { crearMateriales } from './escena/materiales.js';
import { construirContexto } from './builders/contexto.js';
import { construirExistente } from './builders/existente.js';
import { construirEstructura } from './builders/estructura.js';
import { construirCubierta } from './builders/cubierta.js';
import { construirDrenaje } from './builders/drenaje.js';
import { construirAnotaciones, animarFlechas } from './builders/anotaciones.js';
import { vaciar } from './utils/geometria3d.js';
import { crearPanel } from './ui/panel.js';
import { definirVistas, GestorVistas } from './ui/vistas.js';
import { renderInforme, renderEstado, renderComparacion, renderMateriales } from './ui/informe.js';

// --- Renderizador, escena y cámara -------------------------------------------------------
const contenedor = document.getElementById('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
contenedor.append(renderer.domElement);

const rotulos = new CSS2DRenderer();
rotulos.domElement.className = 'capa-etiquetas';
contenedor.append(rotulos.domElement);

const escena = new THREE.Scene();
{
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#9fc3e6');
  grad.addColorStop(0.55, '#dbe8f3');
  grad.addColorStop(1, '#f2efe9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const cielo = new THREE.CanvasTexture(c);
  cielo.colorSpace = THREE.SRGBColorSpace;
  escena.background = cielo;
}
escena.fog = new THREE.Fog(0xe6ecf1, 45, 110);
// Reflejos difusos para que las chapas metálicas no se vean negras
escena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
escena.environmentIntensity = 0.55;

const camara = new THREE.PerspectiveCamera(42, 1, 0.1, 250);
const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = 0.08;
controles.minDistance = 1;
controles.maxDistance = 70;
controles.maxPolarAngle = Math.PI * 0.92;
controles.screenSpacePanning = true;

// Luz natural: cielo + sol bajo y lateral para que las sombras lean la estructura
escena.add(new THREE.HemisphereLight(0xe3eefa, 0x8d8273, 0.75));
const sol = new THREE.DirectionalLight(0xfff1dc, 2.4);
sol.position.set(-9, 16, 14);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
sol.shadow.bias = -0.0004;
sol.shadow.normalBias = 0.02;
Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
escena.add(sol, sol.target);
escena.add(new THREE.AmbientLight(0xffffff, 0.15));

const materiales = crearMateriales(renderer);
const fantasma = new THREE.MeshStandardMaterial({
  color: 0x9fb6cc,
  transparent: true,
  opacity: 0.13,
  depthWrite: false,
  side: THREE.DoubleSide,
});

// --- Estado ---------------------------------------------------------------------------------
const estado = structuredClone(PARAMETROS_INICIALES);
const capas = {
  cubierta: true,
  estructura: true,
  drenaje: true,
  existente: true,
  muros: true,
  cotas: true,
  etiquetas: window.matchMedia('(min-width: 700px)').matches,
  agua: true,
  expuesto: false,
};

const grupos = {
  contexto: new THREE.Group(),
  existente: new THREE.Group(),
  estructura: new THREE.Group(),
  cubierta: new THREE.Group(),
  drenaje: new THREE.Group(),
  cotas: new THREE.Group(),
  etiquetas: new THREE.Group(),
  agua: new THREE.Group(),
};
Object.values(grupos).forEach((g) => escena.add(g));

let resultado = null;
let muros = [];
let flechas = [];
let vistas = null;
const gestorVistas = new GestorVistas(camara, controles);

function reconstruir() {
  resultado = calcularProyecto(estado);
  const r = resultado;
  Object.values(grupos).forEach(vaciar);

  const ctx = construirContexto(r, materiales);
  grupos.contexto.add(ctx.grupo);
  muros = ctx.muros;
  grupos.existente.add(construirExistente(r, materiales));
  const est = construirEstructura(r, materiales);
  grupos.estructura.add(est.grupo);
  const cub = construirCubierta(r, materiales);
  grupos.cubierta.add(cub.grupo);
  const dre = construirDrenaje(r, materiales);
  grupos.drenaje.add(dre.grupo);
  const ann = construirAnotaciones(r, materiales, [...est.etiquetas, ...cub.etiquetas, ...dre.etiquetas]);
  grupos.cotas.add(ann.cotas);
  grupos.etiquetas.add(ann.etiquetas);
  grupos.agua.add(ann.agua);
  flechas = ann.flechas;

  sol.target.position.set(0, 0, r.p.largo / 2 - 1);
  sol.position.set(-9, 16, r.p.largo / 2 + 9);
  vistas = definirVistas(r);

  aplicarCapas();
  panel.sincronizar(r);
  renderInforme(r, document.getElementById('informe'));
  renderEstado(r, document.getElementById('estado-flotante'));
  window.__techo = { escena, camara, muros, estado, capas, resultado: r, vistas, irA, ready: true };
}

/** Visibilidad por capas y modo de estructura expuesta. */
function aplicarCapas() {
  grupos.estructura.visible = capas.estructura;
  grupos.existente.visible = capas.existente;
  grupos.cotas.visible = capas.cotas;
  grupos.etiquetas.visible = capas.etiquetas;
  grupos.agua.visible = capas.agua;
  grupos.cubierta.visible = capas.cubierta;
  grupos.drenaje.visible = capas.drenaje || capas.cubierta;
  grupos.contexto.visible = true;

  const cubierta = (o) => o.userData.esCubierta;
  for (const g of [grupos.cubierta, grupos.existente, grupos.drenaje]) {
    g.traverse((o) => {
      if (!o.isMesh) return;
      if (o.userData.materialOriginal === undefined) o.userData.materialOriginal = o.material;
      const fantasmal = capas.expuesto && cubierta(o);
      o.material = fantasmal ? fantasma : o.userData.materialOriginal;
      o.castShadow = !fantasmal && o.userData.materialOriginal.transparent !== true;
      if (g === grupos.drenaje) o.visible = cubierta(o) ? capas.cubierta : capas.drenaje;
    });
  }
  grupos.contexto.children[0]?.children.forEach((c) => (c.visible = capas.muros || c.name === 'losa'));
  grupos.etiquetas.traverse((o) => {
    if (!o.isCSS2DObject) return;
    const capa = o.userData.capa;
    o.visible = capa === 'encuentro' ? true : capa === 'drenaje' ? capas.drenaje : capas[capa] !== false;
  });
}

function irA(nombre, inmediato = false) {
  if (!vistas?.[nombre]) return;
  gestorVistas.ir(vistas[nombre], inmediato);
  document.querySelectorAll('[data-vista]').forEach((b) => b.classList.toggle('activa', b.dataset.vista === nombre));
}

// --- Panel ------------------------------------------------------------------------------------
let pendiente = false;
const programarReconstruccion = () => {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => {
    pendiente = false;
    reconstruir();
  });
};

const panel = crearPanel({
  estado,
  capas,
  alCambiar: programarReconstruccion,
  alCambiarCapas: aplicarCapas,
  alRestablecer: () => {
    Object.assign(estado, structuredClone(PARAMETROS_INICIALES));
    reconstruir();
    irA('iso');
  },
});

document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea')) return;
  if (e.key === 'r' || e.key === 'R') irA('iso');
});

const dlgComparar = document.getElementById('dlg-comparar');
document.getElementById('btn-comparar').addEventListener('click', () => {
  renderComparacion(estado, document.getElementById('tabla-comparar'), (alt) => {
    panel.aplicarAlternativa(alt);
    dlgComparar.close();
  });
  dlgComparar.showModal();
});
const dlgMateriales = document.getElementById('dlg-materiales');
document.getElementById('btn-materiales').addEventListener('click', () => {
  renderMateriales(document.getElementById('tabla-materiales'));
  dlgMateriales.showModal();
});

// --- Tamaño y bucle -------------------------------------------------------------------------------
function ajustarTamano() {
  const { clientWidth: w, clientHeight: h } = contenedor;
  if (!w || !h) return;
  renderer.setSize(w, h);
  rotulos.setSize(w, h);
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
}
new ResizeObserver(ajustarTamano).observe(contenedor);

const _rel = new THREE.Vector3();
function atenuarMuros(dt) {
  const k = 1 - Math.exp(-dt * 9);
  for (const m of muros) {
    _rel.subVectors(camara.position, m.centro);
    const detras = _rel.dot(m.normal) > 0.2;
    const objetivo = capas.expuesto ? 0.25 : detras ? 0.16 : 1;
    for (const mat of m.materiales) {
      mat.opacity += (objetivo - mat.opacity) * k;
      mat.depthWrite = mat.opacity > 0.95;
    }
  }
}

reconstruir();
ajustarTamano();
irA('iso', true);

let msAnterior = 0;
renderer.setAnimationLoop((ms) => {
  const dt = Math.min(1, (ms - msAnterior) / 1000);
  msAnterior = ms;
  gestorVistas.actualizar(performance.now());
  controles.update();
  if (capas.agua) animarFlechas(flechas, ms / 1000);
  atenuarMuros(dt);
  renderer.render(escena, camara);
  rotulos.render(escena, camara);
});
