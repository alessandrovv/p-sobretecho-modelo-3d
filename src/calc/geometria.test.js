import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularProyecto, desnivel, dividirPlancha, ALTURA_MIN_CONSTRUIBLE } from './geometria.js';
import { listarMateriales } from './listaMateriales.js';
import { PARAMETROS_INICIALES, ALTERNATIVAS, GEOMETRIA } from '../config/proyecto.js';

/** Escenario fijo para las pruebas de alternativas (independiente de los valores por defecto). */
const REFERENCIA = {
  ...PARAMETROS_INICIALES,
  tipoEstructura: 'madera', // las pruebas de alternativas usan el apilado V1
  regimen: 'esporadica',
  alturaInicio: 3.25,
  alturaLibreMin: 2.2,
  largo: 11.5,
  voladizoFrontal: 0.2,
  voladizoLateral: 0.05,
  bajantes: 'ambos',
  vanos: 5,
  separacionCorreas: null,
  alturaBordeExistente: 3.5,
  alturaMuroIzquierdo: 3.0,
};

const conAlternativa = (id, extra = {}) => {
  const alt = ALTERNATIVAS.find((a) => a.id === id);
  return calcularProyecto({
    ...REFERENCIA,
    material: alt.material,
    direccion: alt.direccion,
    pendiente: alt.pendiente,
    traslucidas: alt.traslucidas,
    ...extra,
  });
};

test('desnivel = longitud × pendiente / 100', () => {
  assert.equal(desnivel(11.5, 10), 1.15);
  assert.equal(desnivel(6, 8), 0.48);
});

test('caída longitudinal: altura final = inicio − desnivel sobre 11.50 m', () => {
  const r = conAlternativa('C-longitudinal');
  assert.ok(Math.abs(r.desnivel - 0.575) < 1e-9);
  assert.ok(Math.abs(r.alturaFinal - (3.25 - 0.575)) < 1e-9);
  assert.ok(Math.abs(r.altura(0, 11.5) - r.alturaFinal) < 1e-9);
});

test('caída lateral: el desnivel se mide sobre los 6.00 m de ancho', () => {
  const r = conAlternativa('C-lateral');
  assert.ok(Math.abs(r.desnivel - 0.48) < 1e-9);
  assert.ok(Math.abs(r.altura(3, 5) - r.alturaFinal) < 1e-9);
  assert.ok(Math.abs(r.altura(-3, 5) - 3.25) < 1e-9);
});

test('la alternativa recomendada no tiene errores y cumple la altura libre', () => {
  const r = conAlternativa('C-lateral');
  const errores = r.advertencias.filter((a) => a.nivel === 'error');
  assert.deepEqual(errores, []);
  assert.ok(r.alturaLibreEstructura >= 2.2);
  assert.equal(r.modoEncuentro, 'solape');
});

test('la caída longitudinal muestra el conflicto de altura libre', () => {
  const r = conAlternativa('C-longitudinal');
  assert.ok(r.advertencias.some((a) => a.clave === 'alturaLibre'));
});

test('pendiente por debajo de la ficha genera error', () => {
  const r = conAlternativa('B-lateral', { pendiente: 6 });
  assert.ok(r.advertencias.some((a) => a.clave === 'pendiente' && a.nivel === 'error'));
});

test('cubierta por encima del borde existente → encuentro independiente', () => {
  const r = conAlternativa('C-lateral', { alturaInicio: 3.6 });
  assert.equal(r.modoEncuentro, 'independiente');
});

test('traslapes de TF5 centrados sobre correa', () => {
  const r = conAlternativa('B-longitudinal');
  assert.equal(r.material.id, 'tf5');
  assert.ok(r.traslapesTransversales > 0);
  assert.equal(r.juntasFueraDeCorrea, 0);
  for (const pl of r.planchas) {
    for (const pz of pl.piezas) assert.ok(pz.fin - pz.ini <= 3.6 + 1e-6);
  }
});

test('dividirPlancha cubre toda la longitud con traslapes', () => {
  const correas = [0.1, 1.0, 1.9, 2.8, 3.7, 4.6, 5.5];
  const piezas = dividirPlancha(6, 3.05, 0.15, correas);
  assert.equal(piezas[0].ini, 0);
  assert.equal(piezas.at(-1).fin, 6);
  for (let i = 1; i < piezas.length; i++) assert.ok(piezas[i - 1].fin - piezas[i].ini >= 0.15 - 1e-9);
});

test('configuración por defecto V3: metal simple + TF5 UPVC, canalón y extensión', () => {
  const r = calcularProyecto(PARAMETROS_INICIALES);
  assert.equal(r.tipoEstructura, 'metalSimple');
  assert.equal(r.esMetalSimple, true);
  assert.equal(r.esMetal, true);
  assert.equal(r.material.id, 'tf5');
  assert.equal(r.material.perfil, 'trapezoidal');
  assert.equal(r.modoEncuentro, 'independiente');
  assert.ok(r.extension.aplicada > 0);
  assert.ok(r.extension.holgura >= GEOMETRIA.holguraExtension);
  assert.ok(!r.advertencias.some((a) => a.clave === 'encuentro' && a.nivel === 'error'));
});

test('V3 y V2 metálicas ganan altura libre frente a V1 madera', () => {
  const v3 = calcularProyecto({ ...PARAMETROS_INICIALES, tipoEstructura: 'metalSimple' });
  const v2 = calcularProyecto({ ...PARAMETROS_INICIALES, tipoEstructura: 'metal' });
  const madera = calcularProyecto({ ...PARAMETROS_INICIALES, tipoEstructura: 'madera', peralteTijeral: 0.4 });
  assert.ok(v3.alturaLibreEstructura > madera.alturaLibreEstructura);
  assert.ok(v2.alturaLibreEstructura > madera.alturaLibreEstructura);
});

test('extensión trasera: 1.00 m cabe sobre el existente; sin holgura se limita y se avisa', () => {
  const largo = calcularProyecto({ ...PARAMETROS_INICIALES, extensionTrasera: 1.0 });
  assert.equal(largo.extension.aplicada, 1.0);
  const bajo = calcularProyecto({ ...PARAMETROS_INICIALES, alturaInicio: 3.6, extensionTrasera: 1.0 });
  assert.equal(bajo.modoEncuentro, 'independiente');
  assert.ok(bajo.extension.aplicada < 1.0);
  assert.ok(bajo.advertencias.some((a) => a.clave === 'extension'));
  const sinExt = calcularProyecto({ ...PARAMETROS_INICIALES, conExtension: false });
  assert.equal(sinExt.extension.aplicada, 0);
  assert.ok(sinExt.advertencias.some((a) => a.clave === 'encuentro' && a.nivel === 'error'));
});

test('la madera nueva no toca postes, viga ni canalón existentes', () => {
  const frentePoste = GEOMETRIA.posteExistenteZ + GEOMETRIA.posteExistenteLado / 2;
  for (const alturaInicio of [3.25, 3.42, 4.0, 5.0]) {
    for (const direccion of ['longitudinal', 'lateralDer']) {
      const r = calcularProyecto({ ...PARAMETROS_INICIALES, alturaInicio, direccion });
      const caso = `${direccion}/${alturaInicio}/${r.modoEncuentro}`;
      const inicioAmarre = r.porticos[0] - GEOMETRIA.voladoAmarre;
      assert.ok(inicioAmarre >= r.zObstaculo + GEOMETRIA.holguraMaderaExistente - 1e-9, `viga de amarre separada: ${caso}`);
      assert.ok(r.porticos[0] - 0.13 > r.zObstaculo, `placa base separada: ${caso}`);
      if (r.modoEncuentro === 'solape') assert.ok(r.zApoyo > frentePoste, `correas y largueros por delante de los postes: ${caso}`);
      if (r.modoEncuentro === 'independiente') {
        const finCanalon = GEOMETRIA.canalonEncuentro.z + GEOMETRIA.canalonEncuentro.ancho / 2;
        assert.ok(r.zBaseCubierta > finCanalon, `cubierta por delante del canalón: ${caso}`);
      }
    }
  }
});

test('barrido de parámetros: ningún elemento queda desconectado', () => {
  for (const material of ['tr4', 'tr4mixta', 'tf5', 'fibraforte']) {
    for (const direccion of ['longitudinal', 'lateralDer', 'lateralIzq']) {
      for (const pendiente of [1, 3, 5, 8, 12, 20, 30, 45]) {
        for (const alturaInicio of [2.4, 2.8, 3.25, 3.42, 3.6, 3.8, 4.0, 4.5, 5.0]) {
          const r = calcularProyecto({ ...REFERENCIA, material, direccion, pendiente, alturaInicio, conExtension: true, extensionTrasera: 1.0 });
          const caso = `${material}/${direccion}/${pendiente}%/${alturaInicio}`;
          if (r.extension.aplicada > 0) {
            assert.ok(r.extension.holgura >= GEOMETRIA.holguraExtension - 1e-9, `extensión sobre el existente: ${caso}`);
          }
          const n = r.planchas.length;
          assert.ok(Math.abs(r.planchas[0].a - r.trans.a) < 1e-9, `planchas desde el borde: ${caso}`);
          assert.ok(Math.abs(r.planchas[n - 1].b - r.trans.b) < 1e-9, `planchas hasta el borde: ${caso}`);
          for (const pl of r.planchas) {
            assert.ok(pl.piezas[0].ini <= 1e-9 && pl.piezas.at(-1).fin >= r.U - 1e-9, `plancha cubre la caída: ${caso}`);
            for (let i = 1; i < pl.piezas.length; i++) {
              assert.ok(pl.piezas[i].ini < pl.piezas[i - 1].fin, `piezas traslapadas: ${caso}`);
            }
          }
          assert.ok(!r.planchas[0].traslucida && !r.planchas[n - 1].traslucida, `traslúcidas fuera de los bordes: ${caso}`);
          assert.ok(r.correasR[0] >= 0 && r.correasR.at(-1) <= r.R, `correas bajo la cubierta: ${caso}`);
          if (r.alturaLibreEstructura < ALTURA_MIN_CONSTRUIBLE) {
            assert.ok(r.advertencias.some((a) => a.clave === 'inviable'), `geometría inviable avisada: ${caso}`);
            continue;
          }
          if (r.alturaLibreEstructura < r.p.alturaLibreMin) {
            assert.ok(r.advertencias.some((a) => a.clave === 'alturaLibre' && a.nivel === 'error'), `conflicto visible: ${caso}`);
          }
          assert.ok(r.canalon.yTopAlto < r.alturaAleroReal - r.perfil, `canalón bajo el goteo: ${caso}`);
          const tMin = Math.min(...[0, r.canalon.longitud / 2, r.canalon.longitud].map(r.canalon.altura));
          assert.ok(tMin > 0.5, `canalón sobre la losa: ${caso}`);
          if (r.modoEncuentro === 'solape') assert.ok(r.holguraBajoExistente >= 0.02 - 1e-9, `solape con holgura: ${caso}`);
        }
      }
    }
  }
});

test('lista de compra V3 incluye postes, correas C, TF5 y no pide amarre', () => {
  const r = calcularProyecto(PARAMETROS_INICIALES);
  const lista = listarMateriales(r);
  assert.ok(lista.totalItems >= 12);
  const items = lista.categorias.flatMap((c) => c.items);
  const codigos = items.map((i) => i.codigo);
  assert.ok(codigos.includes('EM-01'));
  assert.ok(codigos.includes('EM-05'));
  assert.ok(!codigos.includes('EM-03'), 'V3 no debe pedir viga de amarre');
  assert.ok(items.some((i) => /TF5/i.test(i.descripcion)));
  assert.equal(lista.resumen.tipoEstructura, 'V3 · Metal simple (como el existente)');
});
