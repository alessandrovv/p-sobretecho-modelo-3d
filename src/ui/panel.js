import {
  MATERIALES,
  REGIMENES_LLUVIA,
  DIRECCIONES,
  PATRONES_TRASLUCIDAS,
  ALTERNATIVAS,
} from '../config/proyecto.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

function llenarSelect(select, opciones) {
  select.innerHTML = '';
  for (const [valor, texto] of opciones) {
    const o = document.createElement('option');
    o.value = valor;
    o.textContent = texto;
    select.append(o);
  }
}

/** ¿Coinciden los parámetros con una alternativa predefinida? */
export function alternativaActiva(estado) {
  return ALTERNATIVAS.find(
    (a) =>
      a.material === estado.material &&
      a.direccion === estado.direccion &&
      a.pendiente === estado.pendiente &&
      (MATERIALES[a.material].traslucida ? a.traslucidas === estado.traslucidas : true),
  );
}

/**
 * Enlaza los controles del panel lateral con el estado. Cada cambio llama a
 * `alCambiar(clave)`; las capas de visibilidad llaman a `alCambiarCapas()`.
 */
export function crearPanel({ estado, capas, alCambiar, alCambiarCapas, alRestablecer }) {
  llenarSelect($('#sel-material'), Object.values(MATERIALES).map((m) => [m.id, `${m.alternativa} · ${m.nombre}`]));
  llenarSelect($('#sel-regimen'), Object.entries(REGIMENES_LLUVIA).map(([k, v]) => [k, v.nombre]));
  llenarSelect($('#sel-traslucidas'), Object.entries(PATRONES_TRASLUCIDAS));
  llenarSelect($('#sel-direccion'), Object.entries(DIRECCIONES).map(([k, v]) => [k, v.nombre]));

  // Alternativas
  const lista = $('#alternativas');
  for (const alt of ALTERNATIVAS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.alternativa = alt.id;
    b.innerHTML = `${alt.titulo}${alt.recomendada ? ' <span class="insignia insignia-calculado">recomendada</span>' : ''}<small>Pendiente ${alt.pendiente} % · ${MATERIALES[alt.material].nombreCorto}</small>`;
    b.addEventListener('click', () => aplicarAlternativa(alt));
    lista.append(b);
  }

  function aplicarAlternativa(alt) {
    estado.material = alt.material;
    estado.direccion = alt.direccion;
    estado.pendiente = alt.pendiente;
    estado.traslucidas = alt.traslucidas;
    estado.separacionCorreas = null;
    alCambiar('alternativa');
  }

  // Parámetros
  for (const el of $$('[data-param]')) {
    const clave = el.dataset.param;
    const evento = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evento, () => {
      estado[clave] = el.type === 'range' ? Number(el.value) : el.type === 'checkbox' ? el.checked : el.value;
      if (clave === 'material') estado.separacionCorreas = null;
      alCambiar(clave);
    });
  }

  // Capas
  for (const el of $$('[data-capa]')) {
    el.addEventListener('change', () => {
      capas[el.dataset.capa] = el.checked;
      alCambiarCapas();
    });
  }

  $('#btn-restablecer').addEventListener('click', alRestablecer);

  // Paneles deslizantes en pantallas pequeñas
  for (const b of $$('[data-abrir]')) {
    b.addEventListener('click', () => {
      $$('.panel').forEach((p) => p.classList.remove('abierto'));
      document.getElementById(b.dataset.abrir).classList.add('abierto');
    });
  }
  for (const b of $$('[data-cerrar]')) {
    b.addEventListener('click', () => document.getElementById(b.dataset.cerrar).classList.remove('abierto'));
  }

  /** Refleja el estado y los valores calculados en los controles. */
  function sincronizar(r) {
    for (const el of $$('[data-param]')) {
      const clave = el.dataset.param;
      let valor = estado[clave];
      if (el.type === 'checkbox') {
        el.checked = !!valor;
        continue;
      }
      if (clave === 'separacionCorreas' && valor == null) valor = r.sepCorreas;
      if (document.activeElement !== el) el.value = valor;
      const salida = $(`[data-salida="${clave}"]`);
      if (salida) {
        const dec = el.dataset.dec != null ? Number(el.dataset.dec) : 2;
        let texto = `${Number(valor).toFixed(dec)}${el.dataset.unidad ? ` ${el.dataset.unidad}` : ''}`;
        if (clave === 'separacionCorreas' && estado.separacionCorreas == null) texto += ' (material)';
        if (clave === 'extensionTrasera') {
          const ext = r.extension;
          if (!estado.conExtension) texto = 'desactivada';
          else if (ext.noAplicable) texto += ' (no aplica)';
          else if (ext.limitada) texto += ` → ${ext.aplicada.toFixed(2)} m`;
        }
        salida.textContent = texto;
      }
    }
    $('[data-param="extensionTrasera"]').disabled = !estado.conExtension;
    $('#out-altura-final').textContent = `${r.alturaFinal.toFixed(2)} m`;
    $('#out-altura-final').style.color = r.alturaBajoPlanchaFinal < estado.alturaLibreMin ? 'var(--error)' : '';

    const selT = $('#sel-traslucidas');
    selT.disabled = !r.material.traslucida;
    if (!r.material.traslucida) selT.value = 'ninguna';

    const etiquetasBajantes = r.esLong
      ? { inicio: 'Lado izquierdo (muro alto)', fin: 'Lado derecho (parapeto)', ambos: 'Ambos extremos', centro: 'Centro del canalón' }
      : { inicio: 'Fondo (junto al existente)', fin: 'Frente', ambos: 'Ambos extremos (fondo y frente)', centro: 'Centro del canalón' };
    const selB = $('#sel-bajantes');
    llenarSelect(selB, Object.entries(etiquetasBajantes));
    selB.value = estado.bajantes;

    const activa = alternativaActiva(estado);
    for (const b of $$('[data-alternativa]')) b.classList.toggle('activa', b.dataset.alternativa === activa?.id);
    for (const el of $$('[data-capa]')) el.checked = !!capas[el.dataset.capa];
  }

  return { sincronizar, aplicarAlternativa };
}
