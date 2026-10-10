import { ALTERNATIVAS, EVALUACION_MATERIALES, FUENTES, MATERIALES, SECCIONES, PATRONES_TRASLUCIDAS } from '../config/proyecto.js';
import { calcularProyecto, resumenAlternativa } from '../calc/geometria.js';
import { alternativaActiva } from './panel.js';

const f2 = (v) => v.toFixed(2);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const MODOS_ENCUENTRO = {
  solape: 'Solape bajo el existente + cierre',
  babero: 'Babero sobre el existente',
  independiente: 'Canalón de encuentro bajo el borde existente',
};

const insignia = (tipo) =>
  ({
    calc: '<span class="insignia insignia-calculado">calculado</span>',
    prov: '<span class="insignia insignia-provisional">provisional</span>',
    ficha: '<span class="insignia insignia-ficha">ficha</span>',
    est: '<span class="insignia insignia-provisional">estimado</span>',
  })[tipo] ?? '';

function fila(nombre, valor, tipo, clase = '') {
  return `<tr class="${clase}"><td>${nombre} ${insignia(tipo)}</td><td>${valor}</td></tr>`;
}

function textoDrenaje(r) {
  if (r.esLong) return 'Hacia el frente; canalón frontal';
  return r.eje.signo > 0 ? 'Hacia el parapeto derecho; canalón lateral' : 'Hacia el muro izquierdo; canalón contra el muro';
}

/** Panel de resultados: valores calculados, advertencias, ficha y lista conceptual. */
export function renderInforme(r, contenedor) {
  const { p, material: mat } = r;
  const alt = alternativaActiva(p);
  const errores = r.advertencias.filter((a) => a.nivel === 'error').length;
  const okPend = p.pendiente >= r.pendienteMin;
  const okLibre = r.alturaLibreEstructura >= p.alturaLibreMin;
  const fuente = FUENTES[mat.fuente];

  const componentes = [
    `${r.conteos.postes} postes de madera ${SECCIONES.poste.texto} sobre base metálica en U con anclaje (diseño de anclaje pendiente)`,
    `${r.conteos.tijerales} tijerales de cordones paralelos (cordones ${SECCIONES.cordon.texto}, celosía ${SECCIONES.diagonal.texto}), peralte ${f2(r.peralte)} m`,
    `2 vigas de amarre longitudinales ${SECCIONES.vigaAmarre.texto} con pies de amigo y cruces de San Andrés en los vanos extremos`,
    r.esLong ? `${r.conteos.largueros} largueros inclinados ${SECCIONES.larguero.texto}` : null,
    `${r.conteos.correas} líneas de correas ${SECCIONES.correa.texto} (≈${r.conteos.longitudCorreas.toFixed(0)} m lineales, medida geométrica)`,
    'Flejes cruzados en el plano de cubierta (vanos extremos) y cartelas metálicas con pernos en los nudos',
    `${r.nPlanchas} filas de plancha (${r.nTraslucidas} traslúcidas), ${r.traslapesTransversales} traslapes transversales`,
    `${r.nFijaciones} fijaciones en cresta sobre correa`,
    'Remates de borde, remate de borde alto y tapacanes',
    `${MODOS_ENCUENTRO[r.modoEncuentro]} en el encuentro con el sobretecho existente`,
    r.extension.aplicada ? `Extensión trasera de ${f2(r.extension.aplicada)} m: solo planchas sobre correas en voladizo, con remate en el borde alto` : null,
    `Canalón ${r.esLong ? 'frontal' : 'lateral'} de ≈${f2(r.canalon.longitud)} m y ${r.canalon.bajantes.length} bajante(s) PVC ≈3"`,
    r.longitudBaberoMuro > 0 ? `Babero contra muro ≈${f2(r.longitudBaberoMuro)} m (fijación no estructural)` : null,
  ].filter(Boolean);

  contenedor.innerHTML = `
  <div class="informe">
    <h2>${esc(alt ? alt.titulo : 'Configuración personalizada')}</h2>
    <p class="subtitulo">${esc(mat.nombre)} · ${esc(r.direccion.nombre)}</p>

    <h3>Conflictos y avisos</h3>
    <ul class="advertencias">
      ${r.advertencias.map((a) => `<li class="${a.nivel}">${esc(a.texto)}</li>`).join('')}
    </ul>

    <h3>Geometría</h3>
    <table class="tabla-valores">
      ${fila('Pendiente usada / mínima del fabricante', `${p.pendiente} % / ${r.pendienteMin} %`, 'ficha', okPend ? 'bien' : 'mal')}
      ${fila(`Longitud de caída (${r.esLong ? 'largo' : 'ancho'})`, `${f2(r.longitudCaida)} m`, 'calc')}
      ${fila('Desnivel = longitud × pendiente / 100', `${f2(r.desnivel)} m`, 'calc')}
      ${fila('Altura de inicio (borde alto)', `${f2(p.alturaInicio)} m`, 'est')}
      ${fila('Altura final', `${f2(r.alturaFinal)} m`, 'calc', r.alturaBajoPlanchaFinal < p.alturaLibreMin ? 'mal' : '')}
      ${fila('Altura en el alero (con voladizo)', `${f2(r.alturaAleroReal)} m`, 'calc')}
      ${fila('Altura libre bajo tijerales (mínima)', `${f2(r.alturaLibreEstructura)} m`, 'calc', okLibre ? 'bien' : 'mal')}
      ${fila('Altura libre mínima exigida', `${f2(p.alturaLibreMin)} m`, 'prov')}
      ${fila('Plancha en la pendiente', `${f2(r.U)} m`, 'calc')}
      ${fila('Superficie en planta', `${r.areaPlanta.toFixed(1)} m²`, 'calc')}
      ${fila('Superficie inclinada de cubierta', `${r.areaInclinada.toFixed(1)} m²`, 'calc')}
    </table>

    <h3>Encuentro con el existente</h3>
    <table class="tabla-valores">
      ${fila('Solución', MODOS_ENCUENTRO[r.modoEncuentro], 'calc', r.modoEncuentro === 'independiente' && !r.extension.aplicada ? 'mal' : '')}
      ${r.modoEncuentro === 'independiente' ? '' : fila('Holgura bajo la viga de borde', `${f2(r.holguraBajoExistente)} m`, 'calc', r.holguraBajoExistente < 0.02 ? 'mal' : '')}
      ${r.modoEncuentro === 'independiente' ? '' : fila('Solape configurado', `${f2(p.solape)} m`, 'prov')}
      ${r.modoEncuentro === 'independiente' ? fila('Extensión trasera aplicada', r.extension.aplicada ? `${f2(r.extension.aplicada)} m` : 'sin extensión', 'calc', r.extension.aplicada ? 'bien' : 'mal') : ''}
      ${r.extension.aplicada ? fila('Holgura de la extensión sobre el existente', `${f2(r.extension.holgura)} m`, 'calc') : ''}
      ${fila('Primer pórtico (separado de lo existente)', `z = ${f2(r.porticos[0])} m`, 'calc')}
      ${r.voladizoTrasero > 0.05 ? fila('Voladizo trasero de correas desde el primer pórtico', `${f2(r.voladizoTrasero)} m`, 'prov') : ''}
      ${fila('Pendiente del existente', `${f2(r.existente.pendiente)} %`, 'est')}
    </table>

    <h3>Estructura</h3>
    <table class="tabla-valores">
      ${fila('Pórticos / separación', `${r.porticos.length} / ${f2(r.separacionPorticos)} m`, 'prov')}
      ${fila('Correas / separación en la pendiente', `${r.correasR.length} / ${f2(r.sepCorreasReal)} m`, 'prov')}
      ${fila('Peralte del tijeral', `${f2(r.peralte)} m`, 'prov')}
      ${fila('Drenaje', textoDrenaje(r), 'calc')}
      ${fila('Traslúcidas', `${r.nTraslucidas} de ${r.nPlanchas} (${PATRONES_TRASLUCIDAS[mat.traslucida ? p.traslucidas : 'ninguna'].toLowerCase()})`, 'calc')}
    </table>

    <h3>Ficha del material</h3>
    <table class="tabla-valores">
      ${fila('Pendiente mínima', mat.pendienteMin.texto, 'ficha')}
      ${fila('Largo máximo de plancha', `${f2(mat.largoMaxOpaca.valor)} m`, 'ficha')}
      ${mat.traslucida ? fila('Traslúcida', `${esc(mat.traslucida.nombre)}: ${mat.traslucida.largos.map(f2).join(' / ')} m`, 'ficha') : ''}
      ${fila('Traslape transversal', `${f2(mat.traslapeTransversal.valor)} m`, mat.traslapeTransversal.verificado ? 'ficha' : 'prov')}
      ${fila('Separación de correas', `${f2(mat.separacionCorreas.valor)} m`, 'prov')}
      ${mat.voladizoMax.valor != null ? fila('Alero máximo', `${f2(mat.voladizoMax.valor)} m`, 'ficha') : ''}
      ${fila('Peso', esc(mat.pesoTexto), 'ficha')}
    </table>
    <ul class="lista">
      <li><b>Fijación:</b> ${esc(mat.fijacion)}</li>
      <li><b>Sellos:</b> ${esc(mat.sellos)}</li>
      <li>${esc(mat.separacionCorreas.nota)}</li>
      <li>${esc(mat.traslapeTransversal.nota)}</li>
    </ul>
    <p class="nota">Fuente: <a href="${fuente.url}" target="_blank" rel="noopener">${esc(fuente.titulo)}</a></p>

    ${
      alt
        ? `<h3>Ventajas</h3><ul class="lista">${alt.ventajas.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>
           <h3>Limitaciones</h3><ul class="lista">${alt.limitaciones.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>
           <h3>Pendiente de validar</h3><ul class="lista">${alt.validar.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>`
        : ''
    }

    <h3>Componentes representados</h3>
    <ul class="lista">${componentes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    <p class="nota">Conteo geométrico del modelo: <b>no es una lista de corte ni un presupuesto</b>. Las secciones, separaciones y anclajes son provisionales hasta el cálculo estructural (incluida succión de viento). ${errores ? `Hay ${errores} conflicto(s) sin resolver.` : ''}</p>
  </div>`;
}

/** Resumen flotante sobre el visor. */
export function renderEstado(r, contenedor) {
  const n = (nivel) => r.advertencias.filter((a) => a.nivel === nivel).length;
  const e = n('error');
  const a = n('aviso');
  contenedor.innerHTML = `
    <div class="cifras">
      <span>Pendiente <b>${r.p.pendiente} %</b> (mín. ${r.pendienteMin} %)</span>
      <span>Inicio <b>${f2(r.p.alturaInicio)} m</b></span>
      <span>Final <b>${f2(r.alturaFinal)} m</b></span>
      <span>Δ <b>${f2(r.desnivel)} m</b></span>
      <span>Libre <b>${f2(r.alturaLibreEstructura)} m</b></span>
    </div>
    <div class="semaforo">
      ${e ? `<span class="chip chip-error">${e} conflicto${e > 1 ? 's' : ''}</span>` : '<span class="chip chip-ok">Sin conflictos</span>'}
      ${a ? `<span class="chip chip-aviso">${a} aviso${a > 1 ? 's' : ''}</span>` : ''}
      <span class="chip chip-ok">${MODOS_ENCUENTRO[r.modoEncuentro]}</span>
    </div>`;
}

/** Tabla comparativa: misma geometría base, distinta alternativa. */
export function renderComparacion(estado, contenedor, alElegir) {
  const cols = ALTERNATIVAS.map((alt) => {
    const r = calcularProyecto({
      ...estado,
      material: alt.material,
      direccion: alt.direccion,
      pendiente: alt.pendiente,
      traslucidas: alt.traslucidas,
      separacionCorreas: null,
    });
    return { alt, r, s: resumenAlternativa(r) };
  });
  const celda = (fn) => cols.map((c) => `<td class="${c.alt.recomendada ? 'predeterminada' : ''}">${fn(c)}</td>`).join('');
  const lista = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  contenedor.innerHTML = `
  <table class="tabla-comparar">
    <thead><tr><th></th>${cols
      .map((c) => `<th class="${c.alt.recomendada ? 'predeterminada' : ''}">${esc(c.alt.titulo)}<br><button type="button" data-elegir="${c.alt.id}">Ver en 3D</button></th>`)
      .join('')}</tr></thead>
    <tbody>
      <tr><th>Material principal</th>${celda((c) => esc(MATERIALES[c.alt.material].nombre))}</tr>
      <tr><th>Tipo de estructura</th>${celda((c) => esc(c.alt.estructura))}</tr>
      <tr><th>Pendiente usada / mínima</th>${celda((c) => `<span class="${c.s.pendiente >= c.s.pendienteMin ? 'bien' : 'mal'}">${c.s.pendiente} % / ${c.s.pendienteMin} %</span>`)}</tr>
      <tr><th>Altura inicial / final</th>${celda((c) => `${f2(c.s.alturaInicio)} m / ${f2(c.s.alturaFinal)} m`)}</tr>
      <tr><th>Altura libre bajo tijerales</th>${celda((c) => `<span class="${c.s.alturaLibre >= estado.alturaLibreMin ? 'bien' : 'mal'}">${f2(c.s.alturaLibre)} m</span>`)}</tr>
      <tr><th>Dirección del drenaje</th>${celda((c) => esc(textoDrenaje(c.r)))}</tr>
      <tr><th>Encuentro con el existente</th>${celda((c) => esc(MODOS_ENCUENTRO[c.s.encuentro]))}</tr>
      <tr><th>Traslapes transversales / correas</th>${celda((c) => `${c.s.traslapes} / ${c.s.correas}`)}</tr>
      <tr><th>Conflictos / avisos</th>${celda((c) => `<span class="${c.s.errores ? 'mal' : 'bien'}">${c.s.errores}</span> / ${c.s.avisos}`)}</tr>
      <tr><th>Ventajas</th>${celda((c) => lista(c.alt.ventajas))}</tr>
      <tr><th>Limitaciones</th>${celda((c) => lista(c.alt.limitaciones))}</tr>
      <tr><th>Por validar</th>${celda((c) => lista(c.alt.validar))}</tr>
    </tbody>
  </table>`;
  contenedor.querySelectorAll('[data-elegir]').forEach((b) =>
    b.addEventListener('click', () => alElegir(ALTERNATIVAS.find((a) => a.id === b.dataset.elegir))),
  );
}

/** Tabla cualitativa de materiales (sin precios). */
export function renderMateriales(contenedor) {
  const E = EVALUACION_MATERIALES;
  contenedor.innerHTML = `
  <table class="tabla-comparar">
    <thead><tr><th>Criterio</th>${E.alternativas.map((a) => `<th class="${a.id === 'C' ? 'predeterminada' : ''}">${esc(a.nombre)}</th>`).join('')}</tr></thead>
    <tbody>
      ${E.criterios
        .map(
          (crit, i) =>
            `<tr><th>${esc(crit)}</th>${E.alternativas.map((a) => `<td class="${a.id === 'C' ? 'predeterminada' : ''}">${esc(a.valores[i])}</td>`).join('')}</tr>`,
        )
        .join('')}
    </tbody>
  </table>
  <h3>Alternativa recomendada</h3>
  <p>${esc(E.eleccion)}</p>
  <h3>Qué cotizar localmente</h3>
  <ul>${E.cotizar.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  <p class="nota">No se indican precios: no fue posible verificarlos. Fuentes técnicas:
    ${Object.values(FUENTES)
      .map((f) => `<a href="${f.url}" target="_blank" rel="noopener">${esc(f.titulo)}</a>`)
      .join(' · ')}</p>`;
}
