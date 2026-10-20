/**
 * Cálculo dimensional de la cubierta. Funciones puras sin Three.js: reciben los
 * parámetros del panel y devuelven todas las magnitudes que usan la escena 3D,
 * el informe y la comparación de alternativas.
 *
 * Toda altura `altura(x, z)` es la cara superior de la plancha (crestas del perfil).
 */
import { MATERIALES, GEOMETRIA, REGIMENES_LLUVIA, DIRECCIONES, seccionesDe, TIPOS_ESTRUCTURA, esTipoMetal } from '../config/proyecto.js';

const EPS = 1e-6;
/** Por debajo de esta cota del cordón inferior no caben pies de amigo ni bases (m). */
export const ALTURA_MIN_CONSTRUIBLE = 1.2;
const redondear = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

/** desnivel = longitud de caída × pendiente porcentual / 100 */
export function desnivel(longitudCaida, pendientePct) {
  return (longitudCaida * pendientePct) / 100;
}

/** Plano de la nueva cubierta según la dirección de caída. */
export function planoCubierta({ direccion, pendiente, alturaInicio, ancho }) {
  const s = pendiente / 100;
  if (direccion === 'longitudinal') return (x, z) => alturaInicio - s * z;
  if (direccion === 'lateralDer') return (x) => alturaInicio - s * (x + ancho / 2);
  return (x) => alturaInicio - s * (ancho / 2 - x);
}

/** Datos del sobretecho existente (estimados). */
export function sobretechoExistente(p) {
  const hIni = p.alturaInicioExistente;
  const hFin = p.alturaBordeExistente;
  const fondo = p.fondoExistente;
  const viga = GEOMETRIA.vigaBordeExistente;
  const vigaInferior = hFin - p.peralteBordeExistente;
  const altura = (z) => hFin + ((hIni - hFin) * Math.min(fondo, Math.max(0, -z))) / fondo;
  // Cara inferior de lo existente (plancha, correas o viga de borde) en función de z.
  const caraInferior = (z) => {
    if (z >= viga.z0 - EPS && z <= viga.z1 + EPS) return vigaInferior;
    if (z > viga.z1) return hFin - 0.04;
    return altura(z) - p.peralteBordeExistente;
  };
  return {
    hIni,
    hFin,
    fondo,
    pendiente: ((hIni - hFin) / fondo) * 100,
    vigaInferior,
    altura,
    caraInferior,
  };
}

/** Posiciones equiespaciadas entre a y b con separación ≤ sep (incluye extremos). */
export function repartir(a, b, sep) {
  const n = Math.max(1, Math.ceil((b - a) / sep - EPS));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

/**
 * Divide una fila de planchas (longitud U en la pendiente, u = 0 en el borde alto)
 * en piezas de largo ≤ largoMax. Cada traslape se centra sobre una correa.
 * Devuelve las piezas de arriba hacia abajo; la pieza superior monta sobre la inferior.
 */
export function dividirPlancha(U, largoMax, traslape, correasU) {
  const piezas = [];
  let fin = U;
  let guard = 0;
  while (guard++ < 50) {
    if (fin <= largoMax + EPS) {
      piezas.unshift({ ini: 0, fin, juntaSobreCorrea: true });
      break;
    }
    const candidatas = correasU.filter(
      (u) => fin - (u - traslape / 2) <= largoMax + EPS && u - traslape / 2 > 0.05 && u + traslape / 2 < fin - 0.05,
    );
    let u;
    let sobreCorrea = true;
    if (candidatas.length) u = Math.min(...candidatas);
    else {
      u = fin - largoMax + traslape / 2;
      sobreCorrea = false;
    }
    piezas.unshift({ ini: u - traslape / 2, fin, juntaSobreCorrea: sobreCorrea });
    fin = u + traslape / 2;
  }
  return piezas;
}

/** Desplazamientos (desde el borde de la plancha) de las crestas donde van las fijaciones. */
export function crestasDePlancha(material, anchoPlancha) {
  const paso = material.pasoNervio;
  const out = [];
  if (material.perfil === 'trapezoidal') {
    for (let c = paso / 2; c < anchoPlancha - 0.02; c += paso) out.push(c);
  } else {
    // Onda sinusoidal: crestas en medio periodo; se fija en crestas alternas.
    let i = 0;
    for (let c = paso / 2; c < anchoPlancha - 0.02; c += paso, i++) if (i % 2 === 0) out.push(c);
  }
  return out;
}

function esTraslucida(patron, k, n) {
  if (k === 0 || k === n - 1) return false; // los bordes llevan remates y fijación perimetral
  switch (patron) {
    case 'cada4':
      return k % 4 === 2;
    case 'cada3':
      return k % 3 === 1;
    case 'alternas':
      return k % 2 === 1;
    case 'central': {
      const m = Math.floor(n / 2);
      return k === m - 1 || k === m;
    }
    default:
      return false;
  }
}

/**
 * Calcula todo el proyecto a partir de los parámetros del panel.
 * @param {object} p parámetros (ver PARAMETROS_INICIALES)
 */
export function calcularProyecto(p) {
  const G = GEOMETRIA;
  const mat = MATERIALES[p.material];
  const tipoEst = TIPOS_ESTRUCTURA[p.tipoEstructura] ? p.tipoEstructura : 'metalSimple';
  const S = seccionesDe(tipoEst);
  const esMetal = esTipoMetal(tipoEst);
  const esMetalSimple = tipoEst === 'metalSimple';
  const W = p.ancho;
  const L = p.largo;
  const s = p.pendiente / 100;
  const cosA = 1 / Math.sqrt(1 + s * s);
  const esLong = p.direccion === 'longitudinal';
  const altura = planoCubierta(p);
  const ex = sobretechoExistente(p);
  const perfil = mat.alturaPerfil;
  const sepCorreas = p.separacionCorreas ?? mat.separacionCorreas.valor;

  // --- Extensión en planta de la cubierta -----------------------------------------
  const xIzq = -W / 2 + G.holguraMuro + (p.direccion === 'lateralIzq' ? G.anchoCanalon * 0.6 : 0);
  const xDer = W / 2 + p.voladizoLateral;
  const zFin = L + p.voladizoFrontal;
  const alturaMaxEnZ = (z) => Math.max(altura(xIzq, z), altura(xDer, z));

  // --- Encuentro con el sobretecho existente --------------------------------------
  const zSolape = -p.solape;
  const muestrasZ = [zSolape, G.vigaBordeExistente.z0, G.vigaBordeExistente.z1, 0]
    .concat(Array.from({ length: 11 }, (_, i) => zSolape * (i / 10)))
    .filter((z) => z >= zSolape - EPS && z <= 0);
  const holguraBajoExistente = Math.min(...muestrasZ.map((z) => ex.caraInferior(z) - alturaMaxEnZ(z)));
  let modoEncuentro;
  let zIni;
  if (holguraBajoExistente >= G.holguraBajoExistente) {
    modoEncuentro = 'solape';
    zIni = zSolape;
  } else if (alturaMaxEnZ(G.holguraBabero) <= ex.hFin - G.holguraBabero) {
    modoEncuentro = 'babero';
    zIni = G.holguraBabero;
  } else {
    modoEncuentro = 'independiente';
    zIni = G.canalonEncuentro.z + G.canalonEncuentro.ancho / 2 + G.holguraTrasCanalon;
  }
  const zBaseCubierta = zIni;

  // --- Extensión trasera (solo cubierta, por encima del existente) -------------------
  // Profundidad bajo la cara superior de la plancha de lo que vuela: correas (+ largueros) o tapacán.
  const hC = S.correa.h;
  const hL = S.larguero.h;
  const profundidadVuelo = perfil + Math.max(hC + (esLong ? hL : 0), S.tapacan.h);
  const yCanalonEncuentro = ex.hFin - 0.05;
  const zFinCanalonEncuentro = G.canalonEncuentro.z + G.canalonEncuentro.ancho / 2;
  /** Cota superior de lo existente (planchas, borde o canalón de encuentro) en z. */
  const obstaculoExistente = (z) => {
    if (z <= 0) return ex.altura(z) + 0.03;
    if (z <= zFinCanalonEncuentro + 0.02) return yCanalonEncuentro + 0.01;
    return -Infinity;
  };
  const alturaMinEnZ = (z) => Math.min(altura(xIzq, z), altura(xDer, z));
  const holguraVuelo = (e) => {
    let h = Infinity;
    for (let i = 0; i <= 40; i++) {
      const z = zBaseCubierta - (e * i) / 40;
      h = Math.min(h, alturaMinEnZ(z) - profundidadVuelo - obstaculoExistente(z));
    }
    return h;
  };
  const solicitada = p.conExtension ? Math.min(G.extensionMax, Math.max(G.extensionMin, p.extensionTrasera)) : 0;
  let aplicada = 0;
  if (solicitada > 0 && modoEncuentro === 'independiente') {
    for (let e = solicitada; e >= G.extensionMin - EPS; e -= 0.01) {
      if (holguraVuelo(e) >= G.holguraExtension) {
        aplicada = redondear(e, 2);
        break;
      }
    }
  }
  const extension = {
    solicitada,
    aplicada,
    noAplicable: solicitada > 0 && modoEncuentro !== 'independiente',
    limitada: solicitada > 0 && modoEncuentro === 'independiente' && aplicada < solicitada - EPS,
    holgura: aplicada > 0 ? holguraVuelo(aplicada) : null,
  };
  zIni = zBaseCubierta - aplicada;

  // Primera coordenada z donde puede haber madera: en el solape, por delante de los postes existentes.
  const frentePosteExistente = G.posteExistenteZ + G.posteExistenteLado / 2;
  const zApoyo = modoEncuentro === 'solape' ? Math.max(zIni, frentePosteExistente + 0.03) : zIni;
  // Obstáculo existente más adelantado a ras de losa (postes y su placa, o canalón de encuentro y su bajante).
  const zObstaculo = modoEncuentro === 'independiente' ? zFinCanalonEncuentro : G.posteExistenteZ + 0.1;

  // --- Eje de caída: r = 0 en el borde alto, r = R en el borde bajo (horizontal) ---
  let eje;
  if (esLong) eje = { coord: 'z', alto: zIni, bajo: zFin, signo: 1 };
  else if (p.direccion === 'lateralDer') eje = { coord: 'x', alto: xIzq, bajo: xDer, signo: 1 };
  else eje = { coord: 'x', alto: xDer, bajo: xIzq, signo: -1 };
  const R = Math.abs(eje.bajo - eje.alto);
  const U = R / cosA; // longitud en la pendiente
  const rACoord = (r) => eje.alto + eje.signo * r;

  // Eje transversal (perpendicular a la caída)
  const trans = esLong ? { coord: 'x', a: xIzq, b: xDer } : { coord: 'z', a: zIni, b: zFin };

  // --- Correas ------------------------------------------------------------------
  // En caída longitudinal las correas no pasan por detrás de zApoyo (postes existentes).
  const rPrimera = (esLong ? zApoyo - zIni : 0) + 0.1;
  const voladoPlanchaTrasero = esLong ? rPrimera / cosA : 0;
  const rUltima = R - G.aleroSobreCorrea * cosA;
  const correasR = repartir(rPrimera, rUltima, sepCorreas * cosA);
  const correasU = correasR.map((r) => r / cosA);
  const sepCorreasReal = correasR.length > 1 ? (correasR[1] - correasR[0]) / cosA : 0;

  // --- Pórticos y apilado estructural -------------------------------------------
  // El primer pórtico (y la viga de amarre que lo sobrepasa) se separa de lo existente.
  const zPrimerPortico = Math.max(G.primerPortico, zObstaculo + G.holguraMaderaExistente + G.voladoAmarre);
  const zUltimoPortico = L - G.primerPortico;
  const porticos = repartir(zPrimerPortico, zUltimoPortico, (zUltimoPortico - zPrimerPortico) / p.vanos + EPS);
  const separacionPorticos = porticos.length > 1 ? porticos[1] - porticos[0] : 0;
  const voladizoTrasero = porticos[0] - zApoyo;
  const xPoste = W / 2 - G.margenPoste;
  // Metal: canto del tubo; V3 longitudinal usa el larguero como viga principal; madera: tijeral.
  const peralte = esMetal ? (esMetalSimple && esLong ? S.larguero.h : S.cordon.h) : p.peralteTijeral;
  /** Cara superior de la viga / cordón superior en (x, z). */
  const cordonSuperior = (x, z) => (esLong ? altura(0, z) - perfil - hC - hL : altura(x, z) - perfil - hC);
  const cordonInferior = (x, z) => cordonSuperior(x, z) - peralte;

  let alturaLibreEstructura = Infinity;
  let puntoCritico = null;
  for (const z of porticos) {
    for (const x of [-xPoste, xPoste]) {
      const y = cordonInferior(x, z);
      if (y < alturaLibreEstructura) {
        alturaLibreEstructura = y;
        puntoCritico = { x, z, y };
      }
    }
  }

  // Largueros (solo en caída longitudinal)
  const largueros = esLong ? repartir(xIzq + 0.12, xDer - 0.12, G.separacionLargueros) : [];

  // --- Alturas de referencia ------------------------------------------------------
  const longitudCaida = esLong ? L : W;
  const dsn = desnivel(longitudCaida, p.pendiente);
  const alturaFinal = p.alturaInicio - dsn;
  const alturaBajoPlanchaFinal = alturaFinal - perfil;
  const alturaAleroReal = esLong ? altura(0, zFin) : altura(eje.bajo, 0);

  // --- Planchas -----------------------------------------------------------------
  const anchoTrans = trans.b - trans.a;
  const nPlanchas = Math.max(1, Math.ceil(anchoTrans / mat.anchoUtil - 0.02));
  const patron = mat.traslucida ? p.traslucidas : 'ninguna';
  const largoMaxOpaca = mat.largoMaxOpaca.valor;
  const largoMaxTrasl = mat.traslucida ? Math.max(...mat.traslucida.largos) : largoMaxOpaca;
  const traslape = mat.traslapeTransversal.valor;
  const planchas = [];
  for (let k = 0; k < nPlanchas; k++) {
    const a = trans.a + k * mat.anchoUtil;
    // La última plancha absorbe hasta un 2 % de exceso: el ancho total de plancha supera al útil.
    const b = k === nPlanchas - 1 ? trans.b : a + mat.anchoUtil;
    const traslucida = esTraslucida(patron, k, nPlanchas);
    const piezas = dividirPlancha(U, traslucida ? largoMaxTrasl : largoMaxOpaca, traslape, correasU);
    planchas.push({ k, a, b, ancho: b - a, traslucida, piezas });
  }
  const nTraslucidas = planchas.filter((pl) => pl.traslucida).length;
  const traslapesTransversales = planchas.reduce((acc, pl) => acc + pl.piezas.length - 1, 0);
  const juntasFueraDeCorrea = planchas.reduce(
    (acc, pl) => acc + pl.piezas.filter((pz) => !pz.juntaSobreCorrea).length,
    0,
  );
  const piezasPorFila = Math.max(...planchas.map((pl) => pl.piezas.length));

  // Fijaciones: crestas × correas cubiertas por cada pieza
  let nFijaciones = 0;
  for (const pl of planchas) {
    const crestas = crestasDePlancha(mat, pl.ancho).length;
    for (const pz of pl.piezas) {
      nFijaciones += correasU.filter((u) => u >= pz.ini - EPS && u <= pz.fin + EPS).length * crestas;
    }
  }

  // --- Canalón y bajantes -------------------------------------------------------
  const yDrip = alturaAleroReal - perfil;
  const canalon = esLong
    ? { eje: 'x', fijo: zFin - 0.02, desde: xIzq, hasta: xDer, yTopAlto: yDrip - 0.04 }
    : { eje: 'z', fijo: eje.bajo - eje.signo * 0.02, desde: zIni, hasta: zFin, yTopAlto: yDrip - 0.04 };
  const Lg = canalon.hasta - canalon.desde;
  const g = GEOMETRIA.pendienteCanalon / 100;
  canalon.longitud = Lg;
  canalon.altura = (t) => {
    switch (p.bajantes) {
      case 'inicio':
        return canalon.yTopAlto - g * (Lg - t);
      case 'fin':
        return canalon.yTopAlto - g * t;
      case 'centro':
        return canalon.yTopAlto - g * (Lg / 2 - Math.abs(t - Lg / 2));
      default:
        return canalon.yTopAlto - g * Math.abs(t - Lg / 2);
    }
  };
  const tBajantes = { inicio: [0.15], fin: [Lg - 0.15], ambos: [0.15, Lg - 0.15], centro: [Lg / 2] }[p.bajantes] ?? [0.15];
  canalon.bajantes = tBajantes;

  // --- Encuentro con muro alto izquierdo ------------------------------------------
  const zMuro = [];
  for (let z = Math.max(zIni, 0); z <= zFin + EPS; z += 0.25) zMuro.push(z);
  const tramosBaberoMuro = zMuro.filter((z) => p.alturaMuroIzquierdo > altura(xIzq, z) - 0.02);
  const longitudBaberoMuro = tramosBaberoMuro.length * 0.25;

  // --- Áreas y conteos ---------------------------------------------------------------
  const areaPlanta = W * L;
  const areaInclinada = esLong ? (xDer - xIzq) * ((zFin - zIni) / cosA) : ((xDer - xIzq) / cosA) * (zFin - zIni);

  const resultado = {
    p,
    material: mat,
    tipoEstructura: tipoEst,
    tipoEstructuraInfo: TIPOS_ESTRUCTURA[tipoEst],
    esMetal,
    esMetalSimple,
    secciones: S,
    regimen: REGIMENES_LLUVIA[p.regimen],
    direccion: DIRECCIONES[p.direccion],
    esLong,
    altura,
    existente: ex,
    s,
    cosA,
    perfil,
    xIzq,
    xDer,
    zIni,
    zFin,
    zBaseCubierta,
    zApoyo,
    zObstaculo,
    extension,
    voladoPlanchaTrasero,
    voladizoTrasero,
    canalonEncuentro: { ...G.canalonEncuentro, yTop: yCanalonEncuentro },
    eje,
    R,
    U,
    rACoord,
    trans,
    modoEncuentro,
    holguraBajoExistente,
    correasR,
    correasU,
    sepCorreas,
    sepCorreasReal,
    porticos,
    separacionPorticos,
    xPoste,
    cordonSuperior,
    cordonInferior,
    peralte,
    largueros,
    alturaLibreEstructura,
    puntoCritico,
    longitudCaida,
    desnivel: dsn,
    alturaFinal,
    alturaAleroReal,
    alturaBajoPlanchaFinal,
    pendienteMin: mat.pendienteMin[p.regimen],
    planchas,
    nPlanchas,
    nTraslucidas,
    traslapesTransversales,
    juntasFueraDeCorrea,
    piezasPorFila,
    nFijaciones,
    canalon,
    longitudBaberoMuro,
    areaPlanta,
    areaInclinada,
    conteos: {
      postes: porticos.length * 2,
      tijerales: porticos.length,
      correas: correasR.length,
      largueros: largueros.length,
      longitudCorreas: correasR.length * (esLong ? xDer - xIzq : zFin - zIni),
    },
  };
  resultado.advertencias = evaluarAdvertencias(resultado);
  return resultado;
}

/**
 * Lista de conflictos y avisos. nivel: 'error' (incumple un criterio), 'aviso'
 * (requiere atención o solución especial) o 'info' (dato a validar).
 */
export function evaluarAdvertencias(r) {
  const { p, material: mat } = r;
  const out = [];
  const f = (v) => v.toFixed(2);

  if (p.pendiente + EPS < r.pendienteMin) {
    out.push({
      nivel: 'error',
      clave: 'pendiente',
      texto: `Pendiente ${p.pendiente} % menor que la recomendada por el fabricante (${r.pendienteMin} % para ${r.regimen.nombre.toLowerCase()}).`,
    });
  }
  if (r.alturaLibreEstructura < ALTURA_MIN_CONSTRUIBLE) {
    out.push({
      nivel: 'error',
      clave: 'inviable',
      texto: `Geometría inviable: con ${p.pendiente} % de pendiente desde ${f(p.alturaInicio)} m el tijeral baja a ${f(r.alturaLibreEstructura)} m sobre la losa; no caben pies de amigo ni paso de personas. Se dibuja solo para mostrar el conflicto: reducir la pendiente, subir la altura de inicio o cambiar la dirección de caída.`,
    });
  }
  if (r.alturaLibreEstructura < p.alturaLibreMin) {
    const bajo = r.esMetal ? 'bajo las vigas de pórtico' : 'bajo tijerales';
    out.push({
      nivel: 'error',
      clave: 'alturaLibre',
      texto: `Altura libre ${bajo} ${f(r.alturaLibreEstructura)} m < mínimo provisional ${f(p.alturaLibreMin)} m (pórtico en z = ${f(r.puntoCritico.z)} m).`,
    });
  }
  if (r.alturaBajoPlanchaFinal < p.alturaLibreMin) {
    out.push({
      nivel: 'error',
      clave: 'bordeBajo',
      texto: `El borde bajo queda a ${f(r.alturaBajoPlanchaFinal)} m bajo la plancha: menos que la altura libre provisional.`,
    });
  }
  const ext = r.extension;
  if (r.modoEncuentro === 'independiente') {
    out.push(
      ext.aplicada > 0
        ? {
            nivel: 'aviso',
            clave: 'encuentro',
            texto: `La nueva cubierta queda por encima del borde existente: el agua del existente se recoge en un canalón de encuentro colgado de su viga de borde, y la extensión trasera de ${f(ext.aplicada)} m lo cubre (holgura ${f(ext.holgura)} m sobre lo existente). Más coste y mantenimiento que un solape; la extensión no se apoya en el existente.`,
          }
        : {
            nivel: 'error',
            clave: 'encuentro',
            texto:
              'La nueva cubierta queda a la altura o por encima del borde del sobretecho existente: no puede recibir su agua. Hay un canalón de encuentro, pero el hueco entre cubiertas queda abierto a la lluvia con viento. Activar la extensión trasera o bajar la altura de inicio.',
          },
    );
  } else if (r.modoEncuentro === 'babero') {
    out.push({
      nivel: 'aviso',
      clave: 'encuentro',
      texto: `La nueva cubierta no cabe bajo la viga de borde existente (holgura ${f(r.holguraBajoExistente)} m): el encuentro se resuelve con un babero fijado sobre las planchas existentes que monta ${f(p.solape)} m sobre las nuevas.`,
    });
  } else {
    out.push({
      nivel: 'info',
      clave: 'encuentro',
      texto: `Las planchas nuevas pasan ${f(p.solape)} m bajo el sobretecho existente (holgura ${f(r.holguraBajoExistente)} m). Los postes metálicos existentes atraviesan el solape: necesitan recorte de plancha y collarín de sellado.`,
    });
  }
  if (ext.noAplicable) {
    out.push({
      nivel: 'info',
      clave: 'extension',
      texto: `Extensión trasera no aplicada: solo es posible si la cubierta nueva queda por encima del borde existente (ahora el encuentro es ${r.modoEncuentro === 'solape' ? 'un solape bajo el existente' : 'un babero sobre el existente'}). Subir la altura de inicio para usarla.`,
    });
  } else if (ext.limitada) {
    out.push({
      nivel: 'aviso',
      clave: 'extension',
      texto:
        ext.aplicada > 0
          ? `Extensión trasera limitada a ${f(ext.aplicada)} m (pedida ${f(ext.solicitada)} m): más larga, sus correas chocarían con el sobretecho existente (holgura mínima ${f(GEOMETRIA.holguraExtension)} m).`
          : `La extensión trasera no cabe: con esta altura de inicio sus correas chocarían con el sobretecho existente. Subir la altura de inicio al menos unos centímetros.`,
    });
  }
  if (r.voladizoTrasero > 0.9) {
    out.push({
      nivel: 'aviso',
      clave: 'voladizoTrasero',
      texto: `${r.esLong ? 'Largueros y correas' : 'Correas'} en voladizo ${f(r.voladizoTrasero)} m por detrás del primer pórtico (para no tocar la estructura existente): verificar en el cálculo; nada se apoya en el sobretecho existente.`,
    });
  }
  if (mat.voladizoMax.valor != null && r.voladoPlanchaTrasero > mat.voladizoMax.valor + EPS) {
    out.push({
      nivel: 'error',
      clave: 'voladoPlancha',
      texto: `Las planchas vuelan ${f(r.voladoPlanchaTrasero)} m detrás de la primera correa (que no puede pasar entre los postes existentes): supera el volado máximo del fabricante (${f(mat.voladizoMax.valor)} m). Reducir el solape.`,
    });
  }
  if (!r.esLong && r.modoEncuentro !== 'independiente') {
    out.push({
      nivel: 'aviso',
      clave: 'timpano',
      texto:
        'Caída lateral: entre el borde horizontal existente y la nueva cubierta inclinada queda un hueco triangular. Se cierra con un tímpano de plancha y babero lateral para que la lluvia con viento no entre bajo el sobretecho.',
    });
  }
  if (r.esLong && p.pendiente > r.existente.pendiente && r.modoEncuentro === 'solape') {
    out.push({
      nivel: 'aviso',
      clave: 'pendienteExistente',
      texto: `La nueva pendiente (${p.pendiente} %) supera la estimada del existente (${f(r.existente.pendiente)} %): comprobar la holgura en todo el solape.`,
    });
  }
  if (p.direccion === 'lateralIzq') {
    out.push({
      nivel: 'aviso',
      clave: 'canalonMuro',
      texto:
        'El canalón queda contra el muro alto: un rebose descargaría hacia el muro y la losa junto a él. Requiere babero de muro continuo y mantenimiento frecuente.',
    });
  }
  if (r.longitudBaberoMuro > 0) {
    out.push({
      nivel: 'info',
      clave: 'baberoMuro',
      texto: `El muro izquierdo (≈${f(p.alturaMuroIzquierdo)} m, estimado) supera la cubierta en ≈${f(r.longitudBaberoMuro)} m: babero contra muro con fijación no estructural y sellador.`,
    });
  }
  if (r.sepCorreas > mat.separacionCorreas.valor + EPS) {
    out.push({
      nivel: 'aviso',
      clave: 'correas',
      texto: `Separación de correas ${f(r.sepCorreas)} m mayor que la provisional del material (${f(mat.separacionCorreas.valor)} m).`,
    });
  }
  if (r.traslapesTransversales > 0) {
    out.push({
      nivel: 'info',
      clave: 'traslapes',
      texto: `${r.traslapesTransversales} traslapes transversales (hasta ${r.piezasPorFila} piezas por fila), centrados sobre correa. Plancha en la pendiente: ${f(r.U)} m.`,
    });
  }
  if (r.juntasFueraDeCorrea > 0) {
    out.push({
      nivel: 'error',
      clave: 'juntas',
      texto: `${r.juntasFueraDeCorrea} juntas transversales no coinciden con una correa: reducir la separación de correas.`,
    });
  }
  if (mat.voladizoMax.valor != null && GEOMETRIA.aleroSobreCorrea > mat.voladizoMax.valor + EPS) {
    out.push({ nivel: 'error', clave: 'alero', texto: 'El alero supera el máximo del fabricante.' });
  }
  const cantilever = p.largo + p.voladizoFrontal - r.porticos[r.porticos.length - 1];
  if (cantilever > 0.9) {
    out.push({
      nivel: 'aviso',
      clave: 'voladizo',
      texto: `Voladizo frontal de ${f(cantilever)} m desde el último pórtico: verificar en el cálculo.`,
    });
  }
  if (r.separacionPorticos > 3.0) {
    out.push({
      nivel: 'aviso',
      clave: 'porticos',
      texto: `Separación entre pórticos ${f(r.separacionPorticos)} m: luz grande para ${r.esMetal ? 'correas C metálicas' : 'correas de madera'}.`,
    });
  }
  if (mat.traslucida && p.traslucidas !== 'ninguna' && r.nTraslucidas > 0) {
    const largoT = r.planchas.find((pl) => pl.traslucida).piezas.map((pz) => pz.fin - pz.ini);
    const maxT = Math.max(...largoT);
    const disponible = mat.traslucida.largos.find((l) => l >= maxT - EPS);
    out.push({
      nivel: 'info',
      clave: 'traslucidas',
      texto: `Traslúcidas de ${f(maxT)} m: ${disponible ? `cortar de plancha de ${disponible.toFixed(2)} m` : 'requieren traslape'} (largos disponibles: ${mat.traslucida.largos.map((l) => l.toFixed(2)).join(' / ')} m).`,
    });
  }
  if (p.regimen === 'esporadica') {
    out.push({
      nivel: 'info',
      clave: 'nino',
      texto: 'Régimen de costa: en un evento El Niño la lluvia puede ser intensa; la pendiente y el canalón deben revisarse para ese escenario.',
    });
  }
  out.push({
    nivel: 'info',
    clave: 'provisional',
    texto: 'Secciones, separaciones y anclajes son provisionales: requieren cálculo estructural (cargas de viento incluidas) antes de construir.',
  });
  return out;
}

/** Resumen compacto para la tabla comparativa. */
export function resumenAlternativa(r) {
  return {
    material: r.material.nombreCorto,
    direccion: r.direccion.corto,
    pendiente: r.p.pendiente,
    pendienteMin: r.pendienteMin,
    alturaInicio: redondear(r.p.alturaInicio, 2),
    alturaFinal: redondear(r.alturaFinal, 2),
    alturaLibre: redondear(r.alturaLibreEstructura, 2),
    encuentro: r.modoEncuentro,
    traslapes: r.traslapesTransversales,
    correas: r.correasR.length,
    errores: r.advertencias.filter((a) => a.nivel === 'error').length,
    avisos: r.advertencias.filter((a) => a.nivel === 'aviso').length,
  };
}
