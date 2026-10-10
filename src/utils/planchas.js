import * as THREE from 'three';

/**
 * Sección transversal de una plancha perfilada: lista de [s, t] con s a lo ancho
 * (0 … ancho) y t en altura (0 = cresta, −altura = valle).
 * Las crestas quedan en s = paso/2 + k·paso, igual que en calc/crestasDePlancha.
 */
export function seccionPerfil({ perfil, pasoNervio: paso, alturaPerfil: h }, ancho) {
  const pts = [];
  if (perfil === 'trapezoidal') {
    const cresta = 0.035;
    const flanco = 0.03;
    for (let x0 = 0; x0 < ancho - 1e-6; x0 += paso) {
      const c = x0 + paso / 2;
      const seq = [
        [x0, -h],
        [c - cresta / 2 - flanco, -h],
        [c - cresta / 2, 0],
        [c + cresta / 2, 0],
        [c + cresta / 2 + flanco, -h],
      ];
      for (const [s, t] of seq) if (s <= ancho + 1e-6) pts.push([s, t]);
    }
    pts.push([ancho, pts.at(-1)[1]]);
  } else {
    const n = Math.max(8, Math.ceil((ancho / paso) * 12));
    for (let i = 0; i <= n; i++) {
      const s = (ancho * i) / n;
      pts.push([s, -h / 2 + (h / 2) * Math.cos((2 * Math.PI * (s - paso / 2)) / paso)]);
    }
  }
  return pts;
}

/**
 * Geometría de plancha en coordenadas locales: X a lo ancho, Y normal (perfil),
 * Z a lo largo (hacia abajo en la pendiente), desde z = 0 hasta `largo`.
 */
export function geometriaPlancha(material, ancho, largo) {
  const sec = seccionPerfil(material, ancho);
  const pos = [];
  const uv = [];
  for (const [s, t] of sec) {
    pos.push(s, t, 0, s, t, largo);
    uv.push(s, 0, s, largo);
  }
  const idx = [];
  for (let j = 0; j < sec.length - 1; j++) {
    const a = j * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // Trapecio: aristas vivas (normales por cara); onda: normales suavizadas
  if (material.perfil === 'trapezoidal') g = g.toNonIndexed();
  g.computeVertexNormals();
  return g;
}
