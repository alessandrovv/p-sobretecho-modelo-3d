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
    titulo: 'Fibraforte · Techos, ficha técnica y guía de instalación (Onda 177)',
    url: 'https://fibraforte.com/wp-content/uploads/2021/07/fibraforte-techos-ficha-tecnica.pdf',
  },
  tf5: {
    titulo: 'Fibraforte · TF5 UPVC Termoacústico (ficha técnica)',
    url: 'https://fibraforte.com/wp-content/uploads/2025/10/Ficha-tecnica_TF5-UPVC-1.pdf',
  },
  tf5Producto: {
    titulo: 'Fibraforte TF5 Termoacústico UPVC Blanco 3.60×1.07 m',
    url: 'https://fibraforte.com/product/fibraforte-tf5-termoacustico-upvc-blanco-3-60-m-x-1-07-m/',
  },
  tf5Traslucido: {
    titulo: 'Fibraforte TF5 Traslúcido trapezoidal 3.60×1.07 m',
    url: 'https://fibraforte.com/product/fibraforte-tf5-trapezoidal-3-60-m-x-1-07-m/',
  },
  tf5Volante: {
    titulo: 'Fibraforte · Ficha volante TF5 UPVC (pendientes y traslapes)',
    url: 'https://fibraforte.com/wp-content/uploads/2025/10/Ficha-volante-UPVC.pdf',
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
  /** Cubierta predeterminada: TF5 UPVC blanco termoacústico + TF5 traslúcido compatible. */
  tf5: {
    id: 'tf5',
    alternativa: 'B',
    nombre: 'Fibraforte TF5 Termoacústico UPVC Blanco + TF5 Traslúcido',
    nombreCorto: 'TF5 UPVC blanco',
    fuente: 'tf5',
    perfil: 'trapezoidal',
    alturaPerfil: 0.035, // verificado (ficha TF5: geometría 35 mm)
    anchoUtil: 1.0, // verificado (ficha: ancho útil 1000 mm; nominal 1070 mm)
    pasoNervio: 0.2, // 5 trapecios en 1.00 m útil (TF5)
    largoMaxOpaca: { valor: 3.6, verificado: true }, // producto 3.60 × 1.07 m, código 1331761
    traslucida: {
      nombre: 'Fibraforte TF5 Traslúcido trapezoidal',
      fuente: 'tf5Traslucido',
      largos: [3.6], // verificado (producto 3.60 × 1.07 m, código 1332704)
      verificado: true,
      nota: 'Compatible con techos TF5 UPVC (misma geometría trapezoidal).',
    },
    pendienteMin: {
      verificado: true,
      esporadica: 10,
      moderada: 25,
      intensa: 40,
      texto: '10 % esporádicas · 25 % moderadas · 40 % torrenciales (ficha volante TF5)',
    },
    traslapeTransversal: {
      valor: 0.25,
      verificado: true,
      nota: 'Traslape longitudinal mínimo 25 cm (ficha volante TF5 UPVC).',
    },
    separacionCorreas: {
      valor: 0.9,
      verificado: false,
      nota: 'Provisional. Confirmar con el cuadro de distanciamiento de apoyos de la ficha TF5 (30 kg/m² RNE).',
    },
    voladizoMax: {
      valor: 0.17,
      verificado: true,
      nota: 'Volado máximo ≈17 cm según guía de instalación TF5 (borde libre hasta fijación).',
    },
    fijacion:
      'Pre-taladro 1/8" mayor que el tirafón; fijar en la cresta del trapecio con arandela; no aplastar el perfil (guía TF5).',
    sellos: 'Traslape transversal = 1 trapecio; traslape longitudinal ≥ 25 cm. Capuchones y cumbrera TF5 opcionales.',
    color: 0xeceff1, // blanco UPVC: refleja más radiación que el rojo
    metalico: false,
    pesoTexto: 'Ligero (UPVC 1.50 mm; verificar peso en ficha). Blanco: menor absorción de calor que colores oscuros.',
    productoOpacoUrl: 'https://fibraforte.com/product/fibraforte-tf5-termoacustico-upvc-blanco-3-60-m-x-1-07-m/',
    productoTraslucidoUrl: 'https://fibraforte.com/product/fibraforte-tf5-trapezoidal-3-60-m-x-1-07-m/',
  },
  /** Opción antigua Onda 177 (se mantiene para comparar). */
  fibraforte: {
    id: 'fibraforte',
    alternativa: 'B·onda',
    nombre: 'Fibraforte Opaca 22 Onda 177 + Traslúcida 17 Onda 177',
    nombreCorto: 'Fibraforte Onda 177',
    fuente: 'fibraforte',
    perfil: 'onda',
    alturaPerfil: 0.056,
    anchoUtil: 1.03,
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
    traslapeTransversal: { valor: 0.15, verificado: true, nota: 'Traslape longitudinal mínimo 15 cm (ficha Onda 177).' },
    separacionCorreas: {
      valor: 0.95,
      verificado: false,
      nota: 'Provisional. Cuadro de distanciamiento de la ficha Onda 177.',
    },
    voladizoMax: { valor: 0.15, verificado: true, nota: 'Volado máximo 15 cm (Onda 177).' },
    fijacion: 'Tirafón 1/4"×4" galvanizado con arandela plástica en la cresta; pre-taladro 1/8" mayor.',
    sellos: 'Traslape lateral de 1/2 onda; silicona solo para reparar.',
    color: 0x8f3b32,
    metalico: false,
    pesoTexto: 'Ligero (Opaca 22: 3.45 kg/m²; Traslúcida 17: 2.00 kg/m²)',
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
 * Versiones del modelo. V3 (metal simple) es la predeterminada: como el
 * sobretecho existente — vigas que sostienen la cubierta soldadas a los postes,
 * sin vigas de amarre longitudinales. V2 añade amarre + pies de amigo; V1 es madera.
 */
export const TIPOS_ESTRUCTURA = {
  metalSimple: {
    id: 'metalSimple',
    version: 3,
    nombre: 'V3 · Metal simple (como el existente)',
    corto: 'Metal simple',
    descripcion:
      'Postes + vigas inclinadas / de pórtico soldadas a los postes + correas C. Sin vigas de amarre laterales. Misma lógica que el sobretecho metálico ya construido.',
    ventajas: [
      'Más barata y rápida: menos metros de tubo y menos uniones.',
      'Más parecida al sobretecho existente: el herrero ya conoce el sistema.',
      'Más altura libre y menos piezas a la vista bajo la cubierta.',
      'Menos peso propio sobre la losa.',
    ],
    limitaciones: [
      'Menos rigidez frente a viento lateral y sismo: depende más de las soldaduras en cabeza de poste y del arriostramiento en el plano de cubierta.',
      'Sin viga de amarre, los postes se arriostran solo con diagonales y flejes: hay que ejecutar bien las cruces y el fleje de cubierta.',
      'Cualquier falla en una soldadura de cabeza tiene más consecuencias (no hay un segundo “anillo” horizontal).',
      'Sigue siendo provisional: requiere criterio de herrero/ingeniero para viento.',
    ],
  },
  metal: {
    id: 'metal',
    version: 2,
    nombre: 'V2 · Tubos metálicos (con amarre)',
    corto: 'Metal + amarre',
    descripcion:
      'Como V3, más vigas de amarre longitudinales, pies de amigo y cruces de San Andrés en los vanos extremos. Más rígida y más cara.',
    ventajas: [
      'Mayor rigidez lateral: el amarre “amarra” los postes en un marco continuo.',
      'Mejor comportamiento ante viento y deformaciones diferenciales.',
      'Más redundancia si falla una soldadura puntual.',
    ],
    limitaciones: [
      'Más metros de tubo, más soldaduras y más coste.',
      'Algo más de peso y de piezas a la vista bajo la cubierta.',
    ],
  },
  madera: {
    id: 'madera',
    version: 1,
    nombre: 'V1 · Madera tratada',
    corto: 'Madera',
    descripcion: 'Pórticos de madera con tijeral de cordones paralelos (estudio inicial).',
    ventajas: ['Madera trabajable en obra sin soldadura.', 'Aislante térmico algo mejor que el acero desnudo.'],
    limitaciones: [
      'Secciones gruesas: pierde altura libre.',
      'Requiere preservante y mantenimiento frente a humedad/insectos.',
      'Uniones y anclajes distintos al sobretecho existente.',
    ],
  },
};

/**
 * Secciones PROVISIONALES solo para visualizar (b × h en metros). Ninguna está calculada.
 * Metal: perfiles comerciales habituales en Perú (tubo negro / galvanizado).
 */
export const SECCIONES_MADERA = {
  poste: { b: 0.14, h: 0.14, texto: '≈ 6"×6"', material: 'madera' },
  cordon: { b: 0.065, h: 0.14, texto: '≈ 3"×6"', material: 'madera' },
  diagonal: { b: 0.045, h: 0.09, texto: '≈ 2"×4"', material: 'madera' },
  vigaAmarre: { b: 0.065, h: 0.14, texto: '≈ 3"×6"', material: 'madera' },
  larguero: { b: 0.065, h: 0.14, texto: '≈ 3"×6"', material: 'madera' },
  correa: { b: 0.065, h: 0.09, texto: '≈ 3"×4"', material: 'madera' },
  pieDeAmigo: { b: 0.065, h: 0.09, texto: '≈ 3"×4"', material: 'madera' },
  riostra: { b: 0.045, h: 0.09, texto: '≈ 2"×4"', material: 'madera' },
  tapacan: { b: 0.025, h: 0.19, texto: '≈ 1"×8"', material: 'madera' },
};

/** Tubo cuadrado / rectangular y perfil C — espesor e ≈ 3 mm salvo indicación. */
export const SECCIONES_METAL = {
  poste: { b: 0.1, h: 0.1, e: 0.003, texto: 'Tubo cuadrado 100×100×3 mm', material: 'acero', largoComercial: 6 },
  /** Viga transversal del pórtico (RHS): sustituye al tijeral profundo de madera. */
  cordon: { b: 0.05, h: 0.1, e: 0.003, texto: 'Tubo rectangular 100×50×3 mm', material: 'acero', largoComercial: 6 },
  diagonal: { b: 0.04, h: 0.04, e: 0.002, texto: 'Tubo cuadrado 40×40×2 mm', material: 'acero', largoComercial: 6 },
  vigaAmarre: { b: 0.05, h: 0.1, e: 0.003, texto: 'Tubo rectangular 100×50×3 mm', material: 'acero', largoComercial: 6 },
  /** Vigas inclinadas en caída longitudinal (como las del sobretecho existente). */
  larguero: { b: 0.04, h: 0.08, e: 0.003, texto: 'Tubo rectangular 80×40×3 mm', material: 'acero', largoComercial: 6 },
  /** Correa C para Fibraforte / plancha ligera. */
  correa: { b: 0.05, h: 0.1, e: 0.002, texto: 'Perfil C 100×50×2 mm', material: 'acero', largoComercial: 6 },
  pieDeAmigo: { b: 0.05, h: 0.05, e: 0.002, texto: 'Tubo cuadrado 50×50×2 mm', material: 'acero', largoComercial: 6 },
  riostra: { b: 0.04, h: 0.04, e: 0.002, texto: 'Tubo cuadrado 40×40×2 mm', material: 'acero', largoComercial: 6 },
  tapacan: { b: 0.003, h: 0.15, texto: 'Ángulo L 50×50×3 mm / remate de borde', material: 'acero', largoComercial: 6 },
  placaBase: { b: 0.2, h: 0.008, texto: 'Placa base 200×200×8 mm', material: 'acero' },
  cartela: { b: 0.006, h: 0.15, texto: 'Cartela de chapa 6 mm', material: 'acero' },
};

/** Alias histórico: secciones de la versión activa por defecto (metal). */
export const SECCIONES = SECCIONES_METAL;

export function seccionesDe(tipo) {
  return tipo === 'madera' ? SECCIONES_MADERA : SECCIONES_METAL;
}

export function esTipoMetal(tipo) {
  return tipo === 'metal' || tipo === 'metalSimple';
}

/**
 * Valores de partida: V3 metal simple + TF5 UPVC blanco (configuración pedida).
 * Las alturas son referencias comunicadas, no cotas verificadas.
 */
export const PARAMETROS_INICIALES = {
  tipoEstructura: 'metalSimple', // V3 por defecto
  material: 'tf5',
  regimen: 'moderada',
  direccion: 'longitudinal',
  pendiente: 8, // %
  alturaInicio: 5, // m, cara superior de la plancha en la línea del borde existente (z = 0)
  alturaLibreMin: 2.6, // m, criterio provisional para zonas de paso
  ancho: 6.0,
  largo: 11.55,
  voladizoFrontal: 0.35,
  voladizoLateral: 0.08,
  solape: 0.3,
  traslucidas: 'cada3',
  bajantes: 'fin',
  vanos: 4,
  peralteTijeral: 0.4, // solo aplica a V1 madera; en metal el peralte es el canto de la viga
  separacionCorreas: null, // null = usar la provisional del material (0.90 m TF5)

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
    titulo: 'B · TF5 UPVC blanco · caída lateral',
    material: 'tf5',
    direccion: 'lateralDer',
    pendiente: 10,
    traslucidas: 'cada4',
    estructura: 'Estructura metálica V3/V2 + correas C; planchas TF5 3.60 m.',
    ventajas: [
      'UPVC blanco termoacústico: no oxida y refleja más calor que el rojo.',
      'Traslúcido TF5 del mismo perfil trapezoidal (compatible).',
      'Planchas de 3.60 m: menos juntas que la Onda 177 de 3.05 m en 6 m de caída.',
    ],
    limitaciones: [
      'Pendiente mínima 10/25/40 % según régimen (ficha TF5).',
      'Traslape longitudinal ≥ 25 cm: más solapes que en TR-4 continuo.',
      'Volado máximo ≈17 cm.',
    ],
    validar: [
      'Cuadro de distanciamiento de apoyos de la ficha TF5.',
      'Régimen de lluvias real del distrito.',
    ],
  },
  {
    id: 'B-longitudinal',
    titulo: 'B · TF5 UPVC blanco · caída longitudinal',
    material: 'tf5',
    direccion: 'longitudinal',
    pendiente: 10,
    traslucidas: 'cada4',
    estructura: 'Estructura metálica V3/V2 + vigas inclinadas + correas C.',
    ventajas: [
      'Misma dirección de caída que el existente.',
      'Cubierta blanca termoacústica + traslúcidas TF5.',
    ],
    limitaciones: [
      'Con 10 % se pierden 1.15 m en 11.50 m: el frente baja mucho.',
      'Varias filas de planchas de 3.60 m con traslapes de 25 cm.',
    ],
    validar: ['Altura libre real en el frente; posible subir inicio o bajar pendiente si el régimen lo permite.'],
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
      nombre: 'B · TF5 UPVC blanco + traslúcido',
      valores: [
        'Medio (UPVC termoacústico); planchas fijas 3.60 m.',
        'Bajo (UPVC 1.50 mm).',
        'Alta; traslapes de 25 cm y pre-taladro en cresta.',
        'Bajo. No oxida; anti-UV; blanco refleja más calor que el rojo.',
        'Buena si se respetan pendiente 10/25/40 % y traslape ≥ 25 cm.',
        'Media: pendiente como Onda 177; planchas 3.60 m encajan bien en 6 m de caída.',
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
    'Planchas TF5 Termoacústico UPVC Blanco 3.60×1.07 (cód. 1331761) y TF5 Traslúcido 3.60×1.07 (cód. 1332704).',
    'Madera estructural tratada (postes, cordones, correas) por pie tablar, según las secciones que fije el cálculo.',
    'Preservante para madera de exteriores (sales CCA/CCB o equivalente según disponibilidad).',
    'Bases metálicas, pernos y anclajes según el diseño de anclaje aprobado.',
    'Tornillería de cubierta, cinta butil, cierres de espuma, remates, baberos, canalones y bajantes.',
    'Mano de obra de carpintería y de cubierta.',
  ],
  eleccion:
    'Por defecto se carga V3 (metal simple, como el existente) con cubierta TF5 UPVC blanco + traslúcido TF5: el blanco refleja más calor, no oxida y el traslúcido es compatible. Los conflictos de pendiente (8 % vs 25 % en lluvias moderadas) se muestran en el panel. Técnicamente, la alternativa C (TR-4 + policarbonato) con caída lateral sigue siendo la que menos altura pierde en costa (pendiente mínima 5 %).',
};
