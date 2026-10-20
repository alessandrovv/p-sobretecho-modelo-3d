import * as THREE from 'three';

/**
 * Materiales y texturas procedurales (canvas). Las texturas se escalan en metros:
 * las geometrías usan UV en metros (ver utils/geometria3d.js) y `repeat = 1/módulo`.
 */
export const COLORES = {
  concreto: 0xbdb7ac,
  ladrillo: 0xa2573d,
  mortero: 0xc8b39b,
  columnaConcreto: 0xa9a59e,
  madera: 0xb08550,
  aceroExistente: 0x8d949a,
  chapaExistente: 0xaab1b6,
  aluzinc: 0xc5cad0,
  remate: 0x5f7f9c,
  canalon: 0xb9bfc4,
  pvc: 0x8c9196,
  baseMetalica: 0x3d4247,
  agua: 0x1e88e5,
  cierre: 0x2b2f33,
};

function canvasTexture(width, height, draw, { repeat = [1, 1], anisotropy = 8, srgb = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = anisotropy;
  return texture;
}

/** Ladrillo King Kong visto: módulo de 0.25 m × 0.10 m (hilada + junta), aparejo a soga. */
function texturaLadrillo(anisotropy) {
  const moduloX = 0.25;
  const moduloY = 0.2; // dos hiladas
  return canvasTexture(
    256,
    204,
    (ctx, W, H) => {
      ctx.fillStyle = '#c8b39b';
      ctx.fillRect(0, 0, W, H);
      const rowH = H / 2;
      const junta = 9;
      const tonos = ['#a2573d', '#ab5f43', '#97503a', '#b0664a', '#9c5a40'];
      const ladrillo = (x, y, w) => {
        ctx.fillStyle = tonos[Math.floor(Math.random() * tonos.length)];
        ctx.fillRect(x + junta / 2, y + junta / 2, w - junta, rowH - junta);
        for (let i = 0; i < 120; i++) {
          ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
          ctx.fillRect(x + Math.random() * w, y + Math.random() * rowH, 2, 2);
        }
      };
      ladrillo(0, 0, W);
      ladrillo(-W / 2, rowH, W);
      ladrillo(W / 2, rowH, W);
    },
    { repeat: [1 / moduloX, 1 / moduloY], anisotropy },
  );
}

/** Losa de concreto frotachado con marcas de regla. */
function texturaConcreto(anisotropy) {
  return canvasTexture(
    512,
    512,
    (ctx, W, H) => {
      ctx.fillStyle = '#bdb7ac';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 9000; i++) {
        const g = 160 + Math.random() * 50;
        ctx.fillStyle = `rgba(${g},${g - 4},${g - 10},0.35)`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
      ctx.strokeStyle = 'rgba(120,112,100,0.18)';
      for (let y = 0; y < H; y += 6 + Math.random() * 6) {
        ctx.lineWidth = 0.6 + Math.random();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(W * 0.3, y + 3, W * 0.6, y - 3, W, y + 1);
        ctx.stroke();
      }
    },
    { repeat: [1 / 2.5, 1 / 2.5], anisotropy },
  );
}

/** Veta de madera aserrada: la veta corre en U (a lo largo de la pieza). */
function texturaMadera(anisotropy) {
  return canvasTexture(
    512,
    128,
    (ctx, W, H) => {
      ctx.fillStyle = '#b08550';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) {
        const y = Math.random() * H;
        ctx.strokeStyle = `rgba(${90 + Math.random() * 40},${55 + Math.random() * 25},25,${0.12 + Math.random() * 0.2})`;
        ctx.lineWidth = 0.5 + Math.random() * 1.6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= W; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 2.5);
        ctx.stroke();
      }
      for (let i = 0; i < 4; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        ctx.fillStyle = 'rgba(80,45,20,0.35)';
        ctx.beginPath();
        ctx.ellipse(x, y, 6 + Math.random() * 6, 3 + Math.random() * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    { repeat: [1 / 1.2, 1 / 0.3], anisotropy },
  );
}

function texturaRuido(anisotropy, base = 235, rango = 20) {
  return canvasTexture(
    128,
    128,
    (ctx, W, H) => {
      ctx.fillStyle = `rgb(${base},${base},${base})`;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 1500; i++) {
        const g = base - Math.random() * rango;
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
    },
    { repeat: [1 / 0.8, 1 / 0.8], anisotropy },
  );
}

export function crearMateriales(renderer) {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const ruido = texturaRuido(anisotropy);

  const m = {
    concreto: new THREE.MeshStandardMaterial({ map: texturaConcreto(anisotropy), roughness: 0.95 }),
    entorno: new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 1 }),
    ladrillo: new THREE.MeshStandardMaterial({ map: texturaLadrillo(anisotropy), roughness: 0.92 }),
    columnaConcreto: new THREE.MeshStandardMaterial({ color: COLORES.columnaConcreto, map: ruido, roughness: 0.95 }),
    puerta: new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.8 }),
    madera: new THREE.MeshStandardMaterial({ map: texturaMadera(anisotropy), roughness: 0.82 }),
    aceroExistente: new THREE.MeshStandardMaterial({ color: COLORES.aceroExistente, metalness: 0.6, roughness: 0.45 }),
    /** Estructura nueva V2: tubo galvanizado / negro pintado, algo más claro que el existente. */
    aceroNuevo: new THREE.MeshStandardMaterial({ color: 0x6a7278, metalness: 0.72, roughness: 0.38 }),
    chapaExistente: new THREE.MeshStandardMaterial({
      color: COLORES.chapaExistente,
      metalness: 0.65,
      roughness: 0.42,
      side: THREE.DoubleSide,
    }),
    traslucidaExistente: new THREE.MeshStandardMaterial({
      color: 0xe9f1f4,
      roughness: 0.3,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    aluzinc: new THREE.MeshStandardMaterial({
      color: COLORES.aluzinc,
      metalness: 0.8,
      roughness: 0.33,
      side: THREE.DoubleSide,
    }),
    fibraforte: new THREE.MeshStandardMaterial({ color: 0x9a3d31, roughness: 0.62, side: THREE.DoubleSide }),
    /** TF5 UPVC blanco termoacústico: refleja más que el rojo. */
    tf5: new THREE.MeshStandardMaterial({
      color: 0xf2f4f6,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
    traslucidaTR4: new THREE.MeshPhysicalMaterial({
      color: 0xdff0ff,
      roughness: 0.18,
      metalness: 0,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 0.6,
    }),
    traslucidaFibraforte: new THREE.MeshPhysicalMaterial({
      color: 0xf6efe2,
      roughness: 0.35,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    traslucidaTF5: new THREE.MeshPhysicalMaterial({
      color: 0xf7fbff,
      roughness: 0.28,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 0.35,
    }),
    remate: new THREE.MeshStandardMaterial({ color: COLORES.remate, metalness: 0.45, roughness: 0.4, side: THREE.DoubleSide }),
    cierre: new THREE.MeshStandardMaterial({ color: COLORES.cierre, roughness: 0.95 }),
    canalon: new THREE.MeshStandardMaterial({ color: COLORES.canalon, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }),
    pvc: new THREE.MeshStandardMaterial({ color: COLORES.pvc, roughness: 0.55 }),
    baseMetalica: new THREE.MeshStandardMaterial({ color: COLORES.baseMetalica, metalness: 0.65, roughness: 0.45 }),
    perno: new THREE.MeshStandardMaterial({ color: 0xd1d5d8, metalness: 0.85, roughness: 0.25 }),
    fleje: new THREE.MeshStandardMaterial({ color: 0xb4bbc1, metalness: 0.5, roughness: 0.45 }),
    fijacion: new THREE.MeshStandardMaterial({ color: 0xe1e4e6, metalness: 0.7, roughness: 0.3 }),
    sumidero: new THREE.MeshStandardMaterial({ color: 0x3b3f42, roughness: 0.7 }),
    agua: new THREE.MeshStandardMaterial({
      color: COLORES.agua,
      emissive: 0x0d47a1,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      transparent: true,
      opacity: 0.92,
    }),
    lineaCota: new THREE.LineBasicMaterial({ color: 0x1f2a33 }),
    lineaCotaOk: new THREE.LineBasicMaterial({ color: 0x1b8a4b }),
    lineaCotaError: new THREE.LineBasicMaterial({ color: 0xd32f2f }),
    lineaReferencia: new THREE.LineDashedMaterial({ color: 0x455a64, dashSize: 0.12, gapSize: 0.08 }),
  };
  return m;
}

/** Material de plancha opaca según el material de cubierta elegido. */
export function materialPlancha(materiales, material, traslucida) {
  if (material.id === 'tf5') return traslucida ? materiales.traslucidaTF5 : materiales.tf5;
  if (material.id === 'fibraforte') return traslucida ? materiales.traslucidaFibraforte : materiales.fibraforte;
  return traslucida ? materiales.traslucidaTR4 : materiales.aluzinc;
}
