/**
 * Listado de compra a partir del resultado geométrico.
 * Las longitudes se agrupan en barras comerciales (típicamente 6 m en Perú).
 * No incluye precios ni desperdicio de corte más allá del redondeo a barras.
 * Marca todo como provisional / calculado geométrico.
 */

const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

/** Número de barras comerciales necesarias para una longitud total. */
function barrasDe(longitudTotal, largoBarra = 6) {
  if (longitudTotal <= 0) return { barras: 0, largoBarra, metros: 0 };
  return {
    barras: Math.ceil(longitudTotal / largoBarra - 1e-9),
    largoBarra,
    metros: longitudTotal,
  };
}

function item({ categoria, codigo, descripcion, especificacion, cantidad, unidad, detalle, origen = 'calc', nota }) {
  return { categoria, codigo, descripcion, especificacion, cantidad, unidad, detalle, origen, nota };
}

/**
 * Genera el listado completo agrupado por categoría.
 * @param {object} r resultado de calcularProyecto
 */
export function listarMateriales(r) {
  const { p, S = r.secciones, material: mat } = r;
  const esMetal = r.esMetal;
  const nPorticos = r.porticos.length;
  const nPostes = nPorticos * 2;
  const sepPort = r.separacionPorticos;
  const largoAmarre = r.porticos[r.porticos.length - 1] - r.porticos[0] + 2 * 0.2;
  const anchoViga = r.xDer - r.xIzq;
  const largoCorrea = r.esLong ? r.xDer - r.xIzq : r.zFin - r.zApoyo;
  const nCorreas = r.correasR.length;
  const nLargueros = r.largueros.length;
  const largoLarguero = r.esLong ? r.U : 0;
  const nBajantes = r.canalon.bajantes.length + (r.modoEncuentro === 'independiente' ? 1 : 0);

  const categorias = [];
  const push = (cat, ...items) => {
    const filtrados = items.filter(Boolean);
    if (filtrados.length) categorias.push({ id: cat.id, titulo: cat.titulo, items: filtrados });
  };

  // --- Estructura -----------------------------------------------------------------
  if (esMetal) {
    const simple = r.esMetalSimple;
    const posteAlturaMedia =
      r.porticos.reduce((acc, z) => acc + (r.cordonSuperior(r.xPoste, z) - 0.05), 0) / nPorticos;
    const barrasPoste = barrasDe(nPostes * posteAlturaMedia, S.poste.largoComercial ?? 6);
    // V3 longitudinal: no hay viga de pórtico por vano; sí viga de borde frontal.
    const metrosPortico = simple
      ? r.esLong
        ? anchoViga
        : nPorticos * anchoViga
      : nPorticos * anchoViga;
    const barrasVigaPortico = barrasDe(metrosPortico, S.cordon.largoComercial ?? 6);
    const barrasAmarre = simple ? null : barrasDe(2 * largoAmarre, S.vigaAmarre.largoComercial ?? 6);
    const barrasCorrea = barrasDe(nCorreas * largoCorrea, S.correa.largoComercial ?? 6);
    // V3 longitudinal: vigas inclinadas también en las líneas de postes (±xPoste)
    const nVigasIncl = r.esLong ? (simple ? nLargueros + 2 : nLargueros) : 0;
    const barrasLarguero = nVigasIncl ? barrasDe(nVigasIncl * largoLarguero, S.larguero.largoComercial ?? 6) : null;
    const nPies = simple ? 0 : nPorticos * 2 + nPostes * 2;
    const barrasPie = nPies ? barrasDe(nPies * 0.9, S.pieDeAmigo.largoComercial ?? 6) : null;
    const barrasRiostra = barrasDe(8 * Math.hypot(sepPort, 2.5), S.riostra.largoComercial ?? 6);
    const periRemate =
      2 * (r.zFin - r.zApoyo) + (r.xDer - r.xIzq) + (r.esLong ? r.xDer - r.xIzq : 0);
    const barrasRemate = barrasDe(periRemate, 6);

    push(
      {
        id: 'estructura',
        titulo: simple
          ? 'Estructura metálica V3 simple (provisional · sin amarre)'
          : 'Estructura metálica V2 (provisional · con amarre)',
      },
      item({
        codigo: 'EM-01',
        categoria: 'estructura',
        descripcion: 'Poste',
        especificacion: S.poste.texto,
        cantidad: barrasPoste.barras,
        unidad: `barra(s) de ${barrasPoste.largoBarra} m`,
        detalle: `${nPostes} postes × ≈${f2(posteAlturaMedia)} m = ${f2(barrasPoste.metros)} m`,
        nota: 'Soldar en cabeza la viga que recibe la cubierta. Verificar altura en cada pórtico.',
      }),
      item({
        codigo: 'EM-02',
        categoria: 'estructura',
        descripcion: simple && r.esLong ? 'Viga de borde frontal' : 'Viga de pórtico (transversal)',
        especificacion: S.cordon.texto,
        cantidad: barrasVigaPortico.barras,
        unidad: `barra(s) de ${barrasVigaPortico.largoBarra} m`,
        detalle: simple && r.esLong
          ? `1 viga frontal × ${f2(anchoViga)} m (cierra el marco como el existente)`
          : `${nPorticos} vigas × ${f2(anchoViga)} m = ${f2(barrasVigaPortico.metros)} m`,
      }),
      barrasAmarre &&
        item({
          codigo: 'EM-03',
          categoria: 'estructura',
          descripcion: 'Viga de amarre longitudinal',
          especificacion: S.vigaAmarre.texto,
          cantidad: barrasAmarre.barras,
          unidad: `barra(s) de ${barrasAmarre.largoBarra} m`,
          detalle: `2 líneas × ${f2(largoAmarre)} m = ${f2(barrasAmarre.metros)} m (solo V2)`,
        }),
      barrasLarguero &&
        item({
          codigo: 'EM-04',
          categoria: 'estructura',
          descripcion: simple ? 'Viga inclinada soldada al poste' : 'Viga inclinada (larguero)',
          especificacion: S.larguero.texto,
          cantidad: barrasLarguero.barras,
          unidad: `barra(s) de ${barrasLarguero.largoBarra} m`,
          detalle: `${nVigasIncl} vigas × ${f2(largoLarguero)} m en la pendiente = ${f2(barrasLarguero.metros)} m`,
        }),
      item({
        codigo: 'EM-05',
        categoria: 'estructura',
        descripcion: 'Correa C',
        especificacion: S.correa.texto,
        cantidad: barrasCorrea.barras,
        unidad: `barra(s) de ${barrasCorrea.largoBarra} m`,
        detalle: `${nCorreas} líneas × ${f2(largoCorrea)} m = ${f2(barrasCorrea.metros)} m`,
        nota: mat.separacionCorreas.nota,
      }),
      barrasPie &&
        item({
          codigo: 'EM-06',
          categoria: 'estructura',
          descripcion: 'Pie de amigo / riostra corta',
          especificacion: S.pieDeAmigo.texto,
          cantidad: barrasPie.barras,
          unidad: `barra(s) de ${barrasPie.largoBarra} m`,
          detalle: `≈${nPies} piezas × 0.9 m ≈ ${f2(barrasPie.metros)} m (solo V2)`,
        }),
      item({
        codigo: 'EM-07',
        categoria: 'estructura',
        descripcion: simple ? 'Diagonal entre postes' : 'Cruz de San Andrés (diagonal)',
        especificacion: S.riostra.texto,
        cantidad: barrasRiostra.barras,
        unidad: `barra(s) de ${barrasRiostra.largoBarra} m`,
        detalle: `Vanos extremos, ambos lados ≈ ${f2(barrasRiostra.metros)} m`,
        nota: simple ? 'En V3 sustituye al amarre: ejecutar bien estas diagonales y el fleje de cubierta.' : undefined,
      }),
      item({
        codigo: 'EM-08',
        categoria: 'estructura',
        descripcion: 'Fleje de arriostramiento de cubierta',
        especificacion: 'Fleje o pletina 40×4 mm (o similar)',
        cantidad: 4,
        unidad: 'tramo(s)',
        detalle: `2 cruces × 2 diagonales en vanos extremos (luz ≈ ${f2(sepPort)} m)`,
        nota: simple ? 'Crítico en V3: es el arriostramiento principal en el plano de cubierta.' : undefined,
      }),
      item({
        codigo: 'EM-09',
        categoria: 'estructura',
        descripcion: 'Placa base',
        especificacion: S.placaBase?.texto ?? '200×200×8 mm',
        cantidad: nPostes,
        unidad: 'unidad(es)',
        detalle: 'Una por poste; soldar en taller con cartelas',
      }),
      item({
        codigo: 'EM-10',
        categoria: 'estructura',
        descripcion: 'Cartela / chapa de unión',
        especificacion: 'Chapa 6 mm (recortes ≈ 200×150 mm)',
        cantidad: nPostes * 4 + nPorticos * 2,
        unidad: 'pieza(s)',
        detalle: 'Poste–placa y soldaduras de cabeza poste–viga',
        origen: 'prov',
      }),
      item({
        codigo: 'EM-11',
        categoria: 'estructura',
        descripcion: 'Ángulo / remate de borde',
        especificacion: S.tapacan.texto,
        cantidad: barrasRemate.barras,
        unidad: `barra(s) de ${barrasRemate.largoBarra} m`,
        detalle: `Perímetro rematado ≈ ${f2(periRemate)} m`,
      }),
      item({
        codigo: 'EM-12',
        categoria: 'estructura',
        descripcion: 'Pintura anticorrosiva + acabado',
        especificacion: 'Antióxido + esmalte para fierro (exterior)',
        cantidad: 1,
        unidad: 'juego',
        detalle: 'Cubrir todos los tubos, placas y cartelas',
        origen: 'prov',
        nota: 'Si se usa tubo galvanizado, confirmar compatibilidad de pintura.',
      }),
    );
  } else {
    const posteAlturaMedia =
      r.porticos.reduce((acc, z) => acc + (r.cordonSuperior(r.xPoste, z) - 0.05), 0) / nPorticos;
    push(
      { id: 'estructura', titulo: 'Estructura de madera (provisional · V1)' },
      item({
        codigo: 'MD-01',
        categoria: 'estructura',
        descripcion: 'Poste',
        especificacion: S.poste.texto,
        cantidad: nPostes,
        unidad: 'pieza(s)',
        detalle: `≈${f2(posteAlturaMedia)} m de largo cada uno`,
      }),
      item({
        codigo: 'MD-02',
        categoria: 'estructura',
        descripcion: 'Cordones de tijeral',
        especificacion: S.cordon.texto,
        cantidad: nPorticos * 2,
        unidad: 'pieza(s)',
        detalle: `Superior e inferior × ${f2(anchoViga)} m`,
      }),
      item({
        codigo: 'MD-03',
        categoria: 'estructura',
        descripcion: 'Diagonales / montantes',
        especificacion: S.diagonal.texto,
        cantidad: nPorticos * 8,
        unidad: 'pieza(s)',
        detalle: 'Celosía aproximada por tijeral',
        origen: 'prov',
      }),
      item({
        codigo: 'MD-04',
        categoria: 'estructura',
        descripcion: 'Viga de amarre',
        especificacion: S.vigaAmarre.texto,
        cantidad: 2,
        unidad: 'pieza(s)',
        detalle: `≈${f2(largoAmarre)} m c/u`,
      }),
      nLargueros > 0 &&
        item({
          codigo: 'MD-05',
          categoria: 'estructura',
          descripcion: 'Larguero',
          especificacion: S.larguero.texto,
          cantidad: nLargueros,
          unidad: 'pieza(s)',
          detalle: `≈${f2(largoLarguero)} m en la pendiente`,
        }),
      item({
        codigo: 'MD-06',
        categoria: 'estructura',
        descripcion: 'Correa',
        especificacion: S.correa.texto,
        cantidad: nCorreas,
        unidad: 'pieza(s)',
        detalle: `≈${f2(largoCorrea)} m c/u`,
      }),
      item({
        codigo: 'MD-07',
        categoria: 'estructura',
        descripcion: 'Preservante para madera de exterior',
        especificacion: 'Sales CCA/CCB o equivalente',
        cantidad: 1,
        unidad: 'tratamiento',
        detalle: 'Toda la estructura vista',
        origen: 'prov',
      }),
      item({
        codigo: 'MD-08',
        categoria: 'estructura',
        descripcion: 'Base metálica en U',
        especificacion: 'Base para poste de madera + anclaje',
        cantidad: nPostes,
        unidad: 'unidad(es)',
        detalle: 'Una por poste',
      }),
    );
  }

  // --- Anclajes y tornillería de estructura ----------------------------------------
  push(
    { id: 'anclajes', titulo: 'Anclajes y tornillería de estructura' },
    item({
      codigo: 'AN-01',
      categoria: 'anclajes',
      descripcion: 'Perno de anclaje a losa',
      especificacion: esMetal ? 'Perno Ø12–16 mm × ≈150 mm (o anclaje químico)' : 'Perno Ø12 mm × ≈120 mm',
      cantidad: nPostes * 4,
      unidad: 'unidad(es)',
      detalle: `4 por placa base × ${nPostes} postes`,
      origen: 'prov',
      nota: 'Diseño de anclaje pendiente de verificar capacidad de la losa.',
    }),
    item({
      codigo: 'AN-02',
      categoria: 'anclajes',
      descripcion: 'Perno / tornillo de unión estructural',
      especificacion: esMetal ? 'Perno Ø10–12 mm con tuerca y arandela' : 'Perno pasante Ø10 mm',
      cantidad: nPostes * 6 + nPorticos * 4,
      unidad: 'unidad(es)',
      detalle: 'Uniones poste–viga y cartelas',
      origen: 'prov',
    }),
    item({
      codigo: 'AN-03',
      categoria: 'anclajes',
      descripcion: 'Electrodos / consumible de soldadura',
      especificacion: esMetal ? 'E6013 o E7018 según acero' : 'N/A (madera)',
      cantidad: esMetal ? 1 : 0,
      unidad: esMetal ? 'kg (aprox.)' : '—',
      detalle: esMetal ? 'Soldadura de placas, cartelas y uniones de taller' : '',
      origen: 'prov',
      nota: esMetal ? 'Preferible fabricar pórticos en taller y atornillar en obra.' : undefined,
    }),
  );

  // --- Cubierta --------------------------------------------------------------------
  const piezasOpacas = [];
  const piezasTrasl = [];
  for (const pl of r.planchas) {
    for (const pz of pl.piezas) {
      const largo = pz.fin - pz.ini;
      (pl.traslucida ? piezasTrasl : piezasOpacas).push({ largo, ancho: pl.ancho });
    }
  }
  const largoOpacaMax = mat.largoMaxOpaca.valor;
  const largosTrasl = mat.traslucida?.largos ?? [];

  const agruparPorLargo = (piezas, comerciales) => {
    const mapa = new Map();
    for (const pz of piezas) {
      const comercial =
        comerciales.find((l) => l >= pz.largo - 1e-6) ??
        Math.ceil(pz.largo * 20) / 20;
      const key = f2(comercial);
      mapa.set(key, (mapa.get(key) ?? 0) + 1);
    }
    return [...mapa.entries()].map(([largo, n]) => ({ largo: Number(largo), n }));
  };

  const opacasAgrupadas = agruparPorLargo(piezasOpacas, [largoOpacaMax, 3.05, 2.44, 1.83].filter((l) => l <= largoOpacaMax + 1e-6));
  const traslAgrupadas = mat.traslucida ? agruparPorLargo(piezasTrasl, largosTrasl) : [];

  const itemsCubierta = [
    ...opacasAgrupadas.map((g, i) =>
      item({
        codigo: `CU-O${i + 1}`,
        categoria: 'cubierta',
        descripcion:
          mat.id === 'tf5'
            ? 'TF5 Termoacústico UPVC Blanco'
            : mat.nombreCorto + (mat.id === 'fibraforte' ? ' Opaca' : ' opaca'),
        especificacion:
          mat.id === 'tf5'
            ? `Trapezoidal · 3.60×1.07 m · ancho útil ${f2(mat.anchoUtil)} m · cód. 1331761`
            : `${mat.perfil === 'onda' ? 'Onda 177' : 'TR-4'} · ancho útil ${f2(mat.anchoUtil)} m`,
        cantidad: g.n,
        unidad: 'plancha(s)',
        detalle: `Largo de pieza ≈ ${f2(g.largo)} m (pedir ≥ ese largo; comercial TF5 = 3.60 m)`,
        origen: mat.largoMaxOpaca.verificado ? 'ficha' : 'calc',
        nota: mat.productoOpacoUrl ? `Producto: ${mat.productoOpacoUrl}` : undefined,
      }),
    ),
    ...traslAgrupadas.map((g, i) =>
      item({
        codigo: `CU-T${i + 1}`,
        categoria: 'cubierta',
        descripcion: mat.traslucida.nombre,
        especificacion:
          mat.id === 'tf5'
            ? `Trapezoidal traslúcido · 3.60×1.07 m · cód. 1332704 · compatible TF5 UPVC`
            : `Mismo perfil que la opaca · largo comercial ${largosTrasl.map(f2).join(' / ')} m`,
        cantidad: g.n,
        unidad: 'plancha(s)',
        detalle: `Pieza de ≈ ${f2(g.largo)} m`,
        origen: 'ficha',
        nota: mat.productoTraslucidoUrl ? `Producto: ${mat.productoTraslucidoUrl}` : undefined,
      }),
    ),
    item({
      codigo: 'CU-F1',
      categoria: 'cubierta',
      descripcion: 'Tornillo de fijación en cresta',
      especificacion:
        mat.id === 'tf5' || mat.id === 'fibraforte'
          ? 'Tirafón 1/4"×4" + arandela plástica'
          : 'Autoperforante #10 con arandela neopreno',
      cantidad: r.nFijaciones,
      unidad: 'unidad(es)',
      detalle: `${r.nFijaciones} fijaciones (cresta × correa) + 10 % de sobrante recomendado → pedir ≈ ${Math.ceil(r.nFijaciones * 1.1)}`,
      origen: 'calc',
      nota: mat.fijacion,
    }),
    item({
      codigo: 'CU-F2',
      categoria: 'cubierta',
      descripcion: 'Cinta / sello de traslape',
      especificacion:
        mat.id === 'tf5'
          ? 'Traslape transversal = 1 trapecio; longitudinal ≥ 25 cm'
          : mat.id === 'fibraforte'
            ? 'Traslape lateral ½ onda; silicona solo para reparar'
            : 'Cinta butil 3/8" y 7/8"',
      cantidad: 1,
      unidad: 'juego',
      detalle: `${r.traslapesTransversales} traslapes transversales + traslapes laterales entre ${r.nPlanchas} filas`,
      origen: mat.traslapeTransversal.verificado ? 'ficha' : 'prov',
      nota: mat.sellos,
    }),
    item({
      codigo: 'CU-R1',
      categoria: 'cubierta',
      descripcion: 'Remates / baberos de plancha',
      especificacion: 'Chapa galvanizada o aluzinc doblada a medida',
      cantidad: 1,
      unidad: 'juego',
      detalle:
        r.modoEncuentro === 'solape'
          ? `Cierre de encuentro + babero de muro ≈ ${f2(r.longitudBaberoMuro)} m`
          : r.modoEncuentro === 'babero'
            ? `Babero sobre existente (solape ${f2(p.solape)} m) + babero de muro`
            : `Remates de borde + extensión trasera; babero de muro ≈ ${f2(r.longitudBaberoMuro)} m`,
      origen: 'prov',
    }),
  ];
  push({ id: 'cubierta', titulo: `Cubierta · ${mat.nombre}` }, ...itemsCubierta);

  // --- Drenaje ---------------------------------------------------------------------
  const itemsDrenaje = [
    item({
      codigo: 'DR-01',
      categoria: 'drenaje',
      descripcion: 'Canalón principal',
      especificacion: 'Canalón metálico U ≈ 150 mm (o PVC equivalente)',
      cantidad: 1,
      unidad: 'tramo',
      detalle: `Longitud ≈ ${f2(r.canalon.longitud)} m · pendiente ${0.5} % hacia bajantes`,
    }),
    item({
      codigo: 'DR-02',
      categoria: 'drenaje',
      descripcion: 'Bajante PVC',
      especificacion: 'Tubo PVC Ø ≈ 3" (75–90 mm) + codos',
      cantidad: nBajantes,
      unidad: 'línea(s)',
      detalle: `Altura desde canalón hasta losa ≈ ${f1(r.alturaAleroReal)} m c/u + codos y sumidero`,
    }),
    item({
      codigo: 'DR-03',
      categoria: 'drenaje',
      descripcion: 'Abrazaderas / soportes de canalón',
      especificacion: 'Soporte metálico o PVC',
      cantidad: Math.ceil(r.canalon.longitud / 0.9),
      unidad: 'unidad(es)',
      detalle: 'Cada ≈ 0.9 m',
    }),
    item({
      codigo: 'DR-04',
      categoria: 'drenaje',
      descripcion: 'Sumidero / punto de descarga',
      especificacion: 'Por verificar en la losa',
      cantidad: nBajantes,
      unidad: 'punto(s)',
      detalle: 'Ubicación real pendiente de confirmar',
      origen: 'prov',
    }),
  ];
  if (r.modoEncuentro === 'independiente') {
    itemsDrenaje.push(
      item({
        codigo: 'DR-05',
        categoria: 'drenaje',
        descripcion: 'Canalón de encuentro (bajo borde existente)',
        especificacion: 'Canalón ≈ 200 mm colgado de la viga de borde existente',
        cantidad: 1,
        unidad: 'tramo',
        detalle: `Ancho de terraza ≈ ${f2(p.ancho)} m + bajante propio al parapeto`,
      }),
    );
  }
  push({ id: 'drenaje', titulo: 'Drenaje' }, ...itemsDrenaje);

  // --- Consumibles -----------------------------------------------------------------
  push(
    { id: 'varios', titulo: 'Varios y consumibles' },
    item({
      codigo: 'VR-01',
      categoria: 'varios',
      descripcion: 'Silicona / sellador exterior',
      especificacion: 'Sellador neutro para metal / plancha',
      cantidad: 4,
      unidad: 'cartucho(s)',
      detalle: 'Encuentro, baberos, collarines y remates',
      origen: 'prov',
    }),
    item({
      codigo: 'VR-02',
      categoria: 'varios',
      descripcion: 'Cierre de espuma / perfil de cierre',
      especificacion: 'Según perfil de plancha',
      cantidad: r.modoEncuentro === 'solape' && r.esLong ? 1 : 0,
      unidad: 'tramo',
      detalle: 'Solo si el encuentro es solape en caída longitudinal',
      origen: 'prov',
    }),
    item({
      codigo: 'VR-03',
      categoria: 'varios',
      descripcion: 'Disco de corte / consumible de taller',
      especificacion: 'Para metal o madera según versión',
      cantidad: 1,
      unidad: 'juego',
      detalle: 'Cortes de tubos/planchas en obra',
      origen: 'prov',
    }),
  );

  // Filtrar items con cantidad 0
  for (const cat of categorias) {
    cat.items = cat.items.filter((i) => i.cantidad > 0);
  }

  const totalItems = categorias.reduce((a, c) => a + c.items.length, 0);
  return {
    categorias: categorias.filter((c) => c.items.length),
    totalItems,
    resumen: {
      tipoEstructura: r.tipoEstructuraInfo.nombre,
      materialCubierta: mat.nombre,
      areaPlanta: r.areaPlanta,
      areaInclinada: r.areaInclinada,
      nPostes,
      nCorreas,
      nPlanchas: r.nPlanchas,
      nTraslucidas: r.nTraslucidas,
      nFijaciones: r.nFijaciones,
    },
    aviso:
      'Listado geométrico del modelo 3D. No es un despiece de corte ni un presupuesto: las secciones y anclajes son provisionales hasta el cálculo estructural (viento incluido). Cotizar localmente; no se incluyen precios.',
  };
}

/** Exporta el listado como texto TSV para pegar en una hoja de cálculo. */
export function listaComoTSV(lista) {
  const filas = [['Categoría', 'Código', 'Descripción', 'Especificación', 'Cantidad', 'Unidad', 'Detalle', 'Origen']];
  for (const cat of lista.categorias) {
    for (const it of cat.items) {
      filas.push([
        cat.titulo,
        it.codigo,
        it.descripcion,
        it.especificacion,
        String(it.cantidad),
        it.unidad,
        it.detalle,
        it.origen,
      ]);
    }
  }
  return filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join('\t')).join('\n');
}
