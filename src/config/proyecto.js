/**
 * FUENTE DE VERDAD del proyecto: parámetros iniciales, datos de fabricantes,
 * alternativas y secciones provisionales. Este archivo no importa Three.js.
 *
 * Convención de coordenadas (metros, Y hacia arriba):
 *   x = ancho de la terraza (−ANCHO/2 = muro alto izquierdo visto desde el frente,
 *       +ANCHO/2 = parapeto bajo derecho).
 *   z = largo: z = 0 es el borde bajo del sobretecho existente; z = LARGO es el frente abierto.
 *       El sobretecho existente ocupa z ∈ [−fondoExistente, 0].
 *   y = altura sobre la losa de concreto.
 *
 * Cada dato lleva `verificado: true` solo si procede de una ficha técnica consultada;
 * el resto son referencias provisionales para visualizar y deben confirmarse.
 */

export const FUENTES = {
  tr4: {
    titulo: 'Precor · Tecnotecho TR-4 (ficha técnica)',
    url: 'https://precor.pe/admin_pmp_precor/public/data/product/download/TR4.pdf202109071215141.pdf',
  },
  tr4Traslucido: {
    titulo: 'Precor · Tecnotecho TR-4 traslúcido (policarbonato)',
    url: 'https://precor.pe/es/producto/tecnotecho-tr4-traslucido',
  },
  fibraforte: {
    titulo: 'Fibraforte · Techos, ficha técnica y guía de instalación',
    url: 'https://fibraforte.com/wp-content/uploads/2021/07/fibraforte-techos-ficha-tecnica.pdf',
  },
};

/** Régimen de lluvias: determina la pendiente mínima recomendada por cada fabricante. */
export const REGIMENES_LLUVIA = {
  esporadica: {
    nombre: 'Lluvias esporádicas (costa)',
    nota: 'Costa peruana. Considerar que un evento El Niño puede traer lluvias intensas en la costa norte.',
  },
  moderada: { nombre: 'Lluvias moderadas (sierra)', nota: '' },
  intensa: { nombre: 'Lluvias intensas o torrenciales (selva)', nota: '' },
};

/**
 * Materiales de cubierta. Las cifras con `verificado: true` están tomadas de las fichas
 * enlazadas en FUENTES; las demás son provisionales para el modelo.
 */
export const MATERIALES = {
  tr4: {
    id: 'tr4',
    alternativa: 'A',
    nombre: 'Aluzinc TR-4 opaco',
    nombreCorto: 'TR-4 aluzinc',
    fuente: 'tr4',
    perfil: 'trapezoidal',
    alturaPerfil: 0.045, // verificado (ficha TR-4: 45 mm)
    anchoUtil: 1.0, // verificado
    pasoNervio: 0.25, // 4 trapecios por metro útil
    largoMaxOpaca: { valor: 12.0, verificado: true }, // "a pedido, desde 1 m hasta 12 m"
    traslucida: null,
    pendienteMin: {
      verificado: true,
      esporadica: 5,
      moderada: 20,
      intensa: 30, // la ficha indica 25–30 % en selva; se toma el extremo conservador
      texto: '5 % costa · 20 % sierra · 25–30 % selva',
    },
    traslapeTransversal: { valor: 0.2, verificado: false, nota: 'Longitud no indicada en la ficha; usar el detalle de instalación de Precor (cinta butil 7/8").' },
    separacionCorreas: { valor: 1.2, verificado: false, nota: 'Provisional. Debe salir de la tabla de cargas del TR-4 según espesor y carga de diseño.' },
    voladizoMax: { valor: null, verificado: false, nota: 'Sin dato en la ficha consultada.' },
    fijacion:
      'Tornillo con arandela de neopreno en la cresta, sobre cada apoyo (la ficha indica autoperforante #10×3/4" sobre estructura y autorroscante #8×3/4" cada 750 mm en el traslape longitudinal; para correas de madera usar el tornillo para madera equivalente del fabricante).',
    sellos: 'Cinta butil 3/8" en traslape longitudinal y 7/8" en traslape transversal (ficha TR-4).',
    color: 0xc5cad0,
    metalico: true,
    pesoTexto: 'Ligero (≈3–5 kg/m² según espesor; verificar con el espesor elegido)',
  },
  tr4mixta: {
    id: 'tr4mixta',
    alternativa: 'C',
    nombre: 'Mixta: aluzinc TR-4 + policarbonato TR-4 traslúcido',
    nombreCorto: 'TR-4 + traslúcido TR-4',
    fuente: 'tr4',
    perfil: 'trapezoidal',
    alturaPerfil: 0.045,
    anchoUtil: 1.0,
    pasoNervio: 0.25,
    largoMaxOpaca: { valor: 12.0, verificado: true },
    traslucida: {
      nombre: 'Policarbonato TR-4 traslúcido 1 mm',
      fuente: 'tr4Traslucido',
      largos: [5.8, 11.6], // verificado (página del producto)
      verificado: true,
    },
    pendienteMin: {
      verificado: true,
      esporadica: 5,
      moderada: 20,
      intensa: 30,
      texto: '5 % costa · 20 % sierra · 25–30 % selva',
    },
    traslapeTransversal: { valor: 0.2, verificado: false, nota: 'Longitud no indicada en la ficha; usar el detalle de instalación de Precor.' },
    separacionCorreas: { valor: 1.2, verificado: false, nota: 'Provisional. El policarbonato puede exigir apoyos más cercanos que el acero: confirmar con Precor.' },
    voladizoMax: { valor: null, verificado: false, nota: 'Sin dato en la ficha consultada.' },
    fijacion:
      'Igual que TR-4; en policarbonato pre-taladrar con holgura para la dilatación y no sobre-apretar.',
    sellos: 'Cinta butil en todos los traslapes, también entre plancha metálica y traslúcida.',
    color: 0xc5cad0,
    metalico: true,
    pesoTexto: 'Ligero (acero ≈3–5 kg/m²; policarbonato 1 mm más liviano)',
  },
  fibraforte: {
    id: 'fibraforte',
    alternativa: 'B',
    nombre: 'Fibraforte Opaca 22 Onda 177 + Traslúcida 17 Onda 177',
    nombreCorto: 'Fibraforte Onda 177',
    fuente: 'fibraforte',
    perfil: 'onda',
    alturaPerfil: 0.056, // verificado (geometría onda 177: 56 mm)
    anchoUtil: 1.03, // verificado
    pasoNervio: 0.177,
    largoMaxOpaca: { valor: 3.05, verificado: true },
    traslucida: {
      nombre: 'Fibraforte Traslúcida 17 Onda 177',
      fuente: 'fibraforte',
      largos: [1.83, 3.05],
      verificado: true,
    },
    pendienteMin: {
      verificado: true,
      esporadica: 10,
      moderada: 25,
      intensa: 40,
      texto: '10 % esporádicas · 25 % moderadas · 40 % torrenciales',
    },
    traslapeTransversal: { valor: 0.15, verificado: true, nota: 'Traslape longitudinal mínimo recomendado 15 cm (ficha Fibraforte).' },
    separacionCorreas: {
      valor: 0.95,
      verificado: false,
      nota: 'Provisional. Usar el "cuadro de distanciamiento de correas" de la ficha (apoyos para 30 kg/m² según RNE).',
    },
    voladizoMax: { valor: 0.15, verificado: true, nota: 'Volado (alero) máximo de la plancha: 15 cm.' },
    fijacion: 'Tirafón 1/4"×4" galvanizado con arandela plástica en la cresta de la onda; pre-taladro 1/8" mayor; no presionar la onda.',
    sellos: 'Traslape lateral de 1/2 onda en Onda 177 para cualquier zona; silicona solo para reparar perforaciones.',
    color: 0x8f3b32,
    metalico: false,
    pesoTexto: 'Ligero (Opaca 22: 3.45 kg/m²; Traslúcida 17: 2.00 kg/m², según ficha)',
  },
};

export const DIRECCIONES = {
  longitudinal: { nombre: 'Longitudinal: cae hacia el frente (11.50 m)', corto: 'Longitudinal' },
  lateralDer: { nombre: 'Lateral: cae hacia el parapeto derecho (6.00 m)', corto: 'Lateral → derecha' },
  lateralIzq: { nombre: 'Lateral: cae hacia el muro izquierdo (6.00 m)', corto: 'Lateral → izquierda' },
};

export const PATRONES_TRASLUCIDAS = {
  ninguna: 'Sin planchas traslúcidas',
  cada4: '1 de cada 4 planchas',
  cada3: '1 de cada 3 planchas',
  alternas: 'Alternadas (1 de cada 2)',
  central: 'Franja central (2 planchas)',
};

/**
 * Secciones de madera PROVISIONALES solo para visualizar (b × h en metros, medidas
 * aproximadas de madera aserrada cepillada). Ninguna está calculada.
 */
export const SECCIONES = {
  poste: { b: 0.14, h: 0.14, texto: '≈ 6"×6"' },
  cordon: { b: 0.065, h: 0.14, texto: '≈ 3"×6"' },
  diagonal: { b: 0.045, h: 0.09, texto: '≈ 2"×4"' },
  vigaAmarre: { b: 0.065, h: 0.14, texto: '≈ 3"×6"' },
  larguero: { b: 0.065, h: 0.14, texto: '≈ 3"×6"' },
  correa: { b: 0.065, h: 0.09, texto: '≈ 3"×4"' },
  pieDeAmigo: { b: 0.065, h: 0.09, texto: '≈ 3"×4"' },
  riostra: { b: 0.045, h: 0.09, texto: '≈ 2"×4"' },
  tapacan: { b: 0.025, h: 0.19, texto: '≈ 1"×8"' },
};

/**
 * Valores de partida: configuración elegida por el propietario. Las alturas son
 * referencias comunicadas, no cotas verificadas.
 */
export const PARAMETROS_INICIALES = {
  material: 'fibraforte',
  regimen: 'moderada',
  direccion: 'longitudinal',
  pendiente: 8, // %
  alturaInicio: 4.5, // m, cara superior de la plancha en la línea del borde existente (z = 0)
  alturaLibreMin: 2.6, // m, criterio provisional para zonas de paso
  ancho: 6.0,
  largo: 11.55,
  voladizoFrontal: 0.35,
  voladizoLateral: 0.08,
  solape: 0.3,
  traslucidas: 'cada3',
  bajantes: 'fin',
  vanos: 4,
  peralteTijeral: 0.4,
  separacionCorreas: 1.0, // null = usar la provisional del material

  // Extensión trasera: solo cubierta (planchas sobre correas en voladizo), por encima del existente
  conExtension: true,
  extensionTrasera: 0.5, // m, entre 0.30 y 1.00

  // Sobretecho existente (estimado a partir de las fotos y de las alturas comunicadas)
  alturaInicioExistente: 4.0,
  alturaBordeExistente: 3.46,
  fondoExistente: 3.5, // NO medido: estimado en las fotos
  peralteBordeExistente: 0.2, // NO medido: plancha + correa + viga tubular de borde

  // Muros (estimados en las fotos; no medidos)
  alturaMuroIzquierdo: 2.85,
  alturaParapeto: 1.0,
  alturaEdificio: 6.2,
  espesorMuro: 0.15,
};

/** Constantes geométricas del modelo (provisionales). */
export const GEOMETRIA = {
  margenPoste: 0.25, // eje del poste al paramento interior del muro
  primerPortico: 0.3, // distancia del primer y último pórtico a los extremos del rectángulo
  holguraMuro: 0.03, // separación entre plancha y muro alto
  anchoCanalon: 0.15,
  altoCanalon: 0.11,
  pendienteCanalon: 0.5, // %
  holguraBajoExistente: 0.02, // mínima para pasar planchas bajo la viga de borde existente
  holguraBabero: 0.03,
  aleroSobreCorrea: 0.1, // plancha más allá de la última correa
  separacionLargueros: 1.5,
  diametroBajante: 0.09, // ≈ 3"
  posteExistenteZ: -0.1,
  posteExistenteDesdeMuro: 0.12, // estimado: postes metálicos en las esquinas del borde bajo
  posteExistenteLado: 0.1,
  vigaBordeExistente: { ancho: 0.1, z0: -0.15, z1: -0.05 },
  // Canalón de encuentro colgado de la viga de borde existente (modo independiente)
  canalonEncuentro: { z: 0.06, ancho: 0.2, alto: 0.15 },
  holguraTrasCanalon: 0.04, // entre el canalón de encuentro y el borde de la cubierta nueva
  holguraMaderaExistente: 0.1, // separación mínima de la madera nueva a postes, viga y canalón existentes
  voladoAmarre: 0.2, // la viga de amarre sobresale del primer y último pórtico
  holguraExtension: 0.05, // holgura vertical mínima entre la extensión trasera y lo existente
  extensionMin: 0.3,
  extensionMax: 1.0,
};

/**
 * Alternativas comparables. Todas conservan las dimensiones generales en uso;
 * solo cambian material, dirección, pendiente y distribución de traslúcidas.
 */
export const ALTERNATIVAS = [
  {
    id: 'C-lateral',
    titulo: 'C · Mixta TR-4 + traslúcidas · caída lateral',
    recomendada: true,
    material: 'tr4mixta',
    direccion: 'lateralDer',
    pendiente: 8,
    traslucidas: 'cada4',
    estructura: 'Pórticos transversales: 2 postes + tijeral inclinado de cordones paralelos; correas longitudinales.',
    ventajas: [
      'La caída corta (6 m) pierde poca altura: el borde bajo queda cerca de 2.8 m.',
      'Planchas de una sola pieza en la dirección de la pendiente (≈6 m): sin juntas transversales metálicas.',
      'Las traslúcidas TR-4 encajan con el perfil metálico y van de borde a borde.',
      'Estructura más simple: los tijerales siguen la pendiente y las correas van entre pórticos.',
    ],
    limitaciones: [
      'El encuentro con el sobretecho existente queda en dirección perpendicular a su caída: requiere un cierre triangular (tímpano) bajo la viga de borde.',
      'El agua del sobretecho existente cae sobre la nueva cubierta y suma caudal al canalón lateral.',
      'Las traslúcidas de 5.80 m necesitan un traslape corto (sobre correa) para llegar a ≈6 m.',
      'Cubierta metálica: más ruido con lluvia y más calor bajo la plancha.',
    ],
    validar: [
      'Altura real del borde bajo del sobretecho existente y de su viga de borde.',
      'Ubicación de los postes metálicos existentes (interfieren con el solape).',
      'Punto de descarga de las bajantes en la losa.',
      'Capacidad de la losa bajo los postes (idealmente sobre vigas o columnas del piso inferior).',
    ],
  },
  {
    id: 'C-longitudinal',
    titulo: 'C · Mixta TR-4 + traslúcidas · caída longitudinal',
    material: 'tr4mixta',
    direccion: 'longitudinal',
    pendiente: 5,
    traslucidas: 'cada4',
    estructura: 'Pórticos transversales con tijeral horizontal + largueros inclinados + correas transversales.',
    ventajas: [
      'Continúa la dirección de caída del sobretecho existente: encuentro simple con babero o solape.',
      'Un solo canalón en el frente.',
    ],
    limitaciones: [
      'Aun con la pendiente mínima del fabricante (5 %) se pierden ≈0.58 m en 11.50 m.',
      'La estructura necesita una capa más (largueros), que consume altura libre en el frente.',
      'Planchas de ≈12 m: transporte e izaje difíciles; posible traslape transversal.',
    ],
    validar: [
      'Altura libre real en el frente con secciones calculadas.',
      'Longitud máxima de plancha que se puede subir a la azotea.',
    ],
  },
  {
    id: 'B-lateral',
    titulo: 'B · Fibraforte Onda 177 · caída lateral',
    material: 'fibraforte',
    direccion: 'lateralDer',
    pendiente: 10,
    traslucidas: 'cada4',
    estructura: 'Pórticos transversales con tijeral inclinado; más correas por la menor separación entre apoyos.',
    ventajas: [
      'Plancha de polímero: no se corroe, es liviana y más silenciosa con lluvia.',
      'Traslúcida del mismo perfil (Onda 177).',
      'Manipulación sencilla: planchas de hasta 3.05 m.',
    ],
    limitaciones: [
      'Pendiente mínima del fabricante del 10 % (esporádicas) al 40 %: con lluvias moderadas la caída lateral deja el borde bajo cerca de 1.75 m.',
      'Planchas de 3.05 m: un traslape transversal en cada fila de 6 m.',
      'Más correas y fijaciones (pre-taladro en cada una).',
      'Alero máximo de 15 cm sobre la última correa.',
    ],
    validar: [
      'Cuadro de distanciamiento de correas de la ficha para el modelo exacto.',
      'Régimen de lluvias real del distrito.',
    ],
  },
  {
    id: 'B-longitudinal',
    titulo: 'B · Fibraforte Onda 177 · caída longitudinal',
    material: 'fibraforte',
    direccion: 'longitudinal',
    pendiente: 10,
    traslucidas: 'cada4',
    estructura: 'Pórticos con tijeral horizontal + largueros + correas transversales cada ≈1 m.',
    ventajas: ['Encuentro con el existente en la misma dirección de caída.'],
    limitaciones: [
      'Con 10 % se pierden 1.15 m en 11.50 m: el frente queda por debajo de la altura libre provisional.',
      'Cuatro filas de planchas con traslapes transversales.',
    ],
    validar: ['No recomendable salvo que se acepte una altura muy baja en el frente.'],
  },
  {
    id: 'A-lateral',
    titulo: 'A · Aluzinc TR-4 opaco · caída lateral',
    material: 'tr4',
    direccion: 'lateralDer',
    pendiente: 8,
    traslucidas: 'ninguna',
    estructura: 'Igual que la alternativa C lateral.',
    ventajas: ['La opción más simple y hermética: sin traslúcidas ni traslapes transversales.'],
    limitaciones: ['Sin luz natural bajo 69 m² de cubierta.', 'Mayor ganancia de calor.'],
    validar: ['Igual que la alternativa C lateral.'],
  },
];

/** Tabla cualitativa de evaluación de materiales (sin precios: deben cotizarse localmente). */
export const EVALUACION_MATERIALES = {
  criterios: [
    'Coste relativo',
    'Peso relativo',
    'Facilidad de montaje',
    'Mantenimiento',
    'Protección frente a lluvia',
    'Compatibilidad geométrica',
  ],
  alternativas: [
    {
      id: 'A',
      nombre: 'A · Aluzinc TR-4',
      valores: [
        'Medio. Plancha a medida; tornillería y cinta butil.',
        'Bajo.',
        'Alta: piezas largas, pocas juntas; cortar con cizalla, nunca con disco.',
        'Bajo. Vigilar corrosión en cortes y tornillos; aire salino de costa.',
        'Muy buena con planchas continuas en la pendiente.',
        'Alta: pendiente mínima de 5 % en costa conserva altura libre.',
      ],
    },
    {
      id: 'B',
      nombre: 'B · Fibraforte Onda 177',
      valores: [
        'Bajo a medio por plancha, pero requiere más correas y fijaciones.',
        'Bajo (2–3.5 kg/m² según ficha).',
        'Alta en manipulación; lenta por traslapes y pre-taladros.',
        'Bajo. Sin corrosión; exposición UV y deformación térmica a largo plazo.',
        'Buena solo si se respetan pendiente (10/25/40 %) y traslapes.',
        'Baja a media: pendiente mayor y planchas cortas.',
      ],
    },
    {
      id: 'C',
      nombre: 'C · Mixta TR-4 + policarbonato TR-4',
      valores: [
        'Medio; las traslúcidas cuestan más por m² que el acero.',
        'Bajo.',
        'Alta; las traslúcidas requieren más cuidado al fijar.',
        'Bajo a medio: limpiar el policarbonato y vigilar su envejecimiento.',
        'Muy buena si las traslúcidas tienen el mismo perfil y van de borde a borde.',
        'Alta (igual que A). Traslúcidas en 5.80 m y 11.60 m.',
      ],
    },
  ],
  cotizar: [
    'Planchas TR-4 por metro lineal y espesor (0.35–0.50 mm) y traslúcidas TR-4.',
    'Planchas Fibraforte Opaca 22 y Traslúcida 17 de 3.05 m, si se elige la alternativa B.',
    'Madera estructural tratada (postes, cordones, correas) por pie tablar, según las secciones que fije el cálculo.',
    'Preservante para madera de exteriores (sales CCA/CCB o equivalente según disponibilidad).',
    'Bases metálicas, pernos y anclajes según el diseño de anclaje aprobado.',
    'Tornillería de cubierta, cinta butil, cierres de espuma, remates, baberos, canalones y bajantes.',
    'Mano de obra de carpintería y de cubierta.',
  ],
  eleccion:
    'La configuración que se carga por defecto es la elegida por el propietario (Fibraforte, caída longitudinal al 8 %, inicio a 4.00 m); sus conflictos se muestran en el panel de resultados. Desde el punto de vista técnico se recomienda la alternativa C (mixta TR-4 + policarbonato TR-4) con caída lateral: la pendiente mínima que admite el TR-4 en la costa permite conservar altura libre, las planchas cubren los 6 m de caída sin juntas transversales metálicas, y las traslúcidas del mismo perfil aportan luz sin crear juntas especiales. Es económica sin recortar apoyos ni secciones.',
};
