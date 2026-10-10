# Sobrecubierta provisional para terraza · modelo 3D de estudio

Aplicación web (Vite + Three.js) que modela una sobrecubierta provisional de madera para una terraza de concreto de **6.00 × 11.50 m (≈69 m²)**, enlazada con el sobretecho metálico existente.

Su objetivo no es mostrar la cubierta más bonita. Sirve para discutir con un maestro de obra, un carpintero o un ingeniero una solución económica, y para **hacer visibles los conflictos** entre pendiente, altura libre, impermeabilidad y estructura.

> Modelo de estudio. **No es un plano de obra**: no incluye cálculo estructural, despiece definitivo ni presupuesto. Todas las secciones de madera son provisionales.

### Configuración que se carga por defecto (elegida por el propietario)

| Parámetro | Valor |
| --- | --- |
| Material y régimen de lluvias | Fibraforte Onda 177, una traslúcida de cada 3 planchas, lluvias moderadas (sierra) |
| Caída | Longitudinal hacia el frente, 8 % |
| Altura de inicio | 4.00 m en la línea del borde existente; altura final calculada de 3.08 m |
| Dimensiones | 6.00 × 11.55 m, voladizo frontal de 0.35 m y lateral de 0.08 m |
| Estructura | 4 vanos, tijeral de 0.40 m de peralte, correas cada 1.00 m |
| Altura libre mínima exigida | 2.60 m |
| Bajantes | En el lado del parapeto |
| Sobretecho existente | 4.00 m al inicio y 3.46 m en el borde bajo |
| Extensión trasera | Activada, 0.50 m |

Con esta configuración, la app muestra dos conflictos:

- La pendiente del 8 % es menor que el 25 % que pide Fibraforte para lluvias moderadas.
- La altura libre bajo los tijerales en el frente es de 2.41 m, por debajo del mínimo exigido de 2.60 m.

La altura de inicio se puede subir hasta 5.00 m. La alternativa técnicamente recomendada sigue siendo la C con caída lateral (sección 3).

---

## 1. Instalación y ejecución

Requisitos: Node.js 20.18 o superior y npm. El proyecto usa Vite 6, compatible con Node 20.18; Vite 7 y 8 exigen Node 20.19 o superior.

```bash
cd techo
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
npm test           # pruebas de las funciones de cálculo (node:test)
npm run build      # versión estática en dist/
npm run preview    # sirve dist/ para comprobar la compilación
```

El contenido de `dist/` se puede abrir desde cualquier servidor estático, porque usa `base: './'`.

### Uso rápido

- **Panel izquierdo**:
  - Alternativas predefinidas.
  - Material, régimen de lluvias y traslúcidas.
  - Dirección de caída, pendiente y altura de inicio. La altura final se calcula.
  - Dimensiones, voladizos, encuentro con el existente, bajantes, estructura provisional y visibilidad de capas.
  - Modo **estructura expuesta**.
- **Barra de vistas**: Isométrica, Frontal, Posterior, Izquierda, Derecha, Superior, Encuentro y Desde abajo. La tecla `R` vuelve a la isométrica, y la rueda o el arrastre manejan OrbitControls.
- **Panel derecho**: conflictos y avisos, geometría, encuentro, estructura, ficha del material, ventajas, limitaciones, puntos por validar y la lista conceptual de componentes. Cada valor lleva su origen: `calculado`, `ficha`, `provisional` o `estimado`.
- **Comparar alternativas** y **Evaluación de materiales** abren tablas comparativas sin recargar la escena.
- En pantallas estrechas, los paneles se abren con los botones «Configurar» y «Resultados».

---

## 2. Análisis de las fotografías (`images/`)

Se revisaron las 7 fotos: 2 desde el frente y 5 desde el fondo, bajo el sobretecho existente.

| Elemento | Lo que se ve | Cómo se modela |
| --- | --- | --- |
| Losa | Losa de concreto plana, con acabado rayado, sin juntas visibles. | Plano de 6.00 × 11.50 m. Capacidad **no verificada**. |
| Muro izquierdo (visto desde el frente) | Ladrillo con columnas de confinamiento cada ≈3 m, viga superior y fierros de espera: el muro seguirá creciendo. | Muro de ≈2.85 m **estimado**, editable. |
| Lado derecho | Muros de ladrillo de altura variable y un tramo hacia un terreno vecino más bajo. | Parapeto de ≈1.00 m **estimado**, editable. |
| Frente | Borde abierto que continúa hacia la losa vecina, sin un parapeto claro. | Parapeto bajo con la misma altura editable. Es el lado por donde se ventila la terraza. |
| Sobretecho existente | Estructura metálica con viga de borde tubular, correas C y planchas metálicas con algunas traslúcidas, a la altura del segundo nivel. | Altura de 4.00 m al inicio y 3.46 m en el borde bajo (referencias del propietario). Fondo de ≈3.50 m y peralte de borde de ≈0.20 m **estimados**. |
| Fachada del fondo | Edificio de ladrillo de dos niveles con puerta bajo el sobretecho. | Fachada de ≈6.2 m con puerta, solo como contexto. |
| Obstáculos permanentes | Dos tanques de agua sobre bases de ladrillo y un cerramiento bajo de ladrillo bajo el sobretecho, con planchas sueltas encima. | No se modelan como piezas. Se indican como condicionantes en las limitaciones. |

Se excluyó como ruido visual: ropa, cables, mangueras, tubos, ladrillos y bloques sueltos, el poste de tendedero, baldes, herramientas, mallas apoyadas en el muro, el perfil azul suelto junto al muro, personas, mobiliario y el detalle de los edificios vecinos.

Las fotos no permiten medir con certeza ninguna altura ni la ubicación exacta de los postes existentes. Por eso esos valores figuran como **estimados** y son editables.

---

## 3. Evaluación de materiales de cubierta

Comparación cualitativa sin precios, porque no fue posible verificarlos. Se basa en las fichas técnicas citadas al final.

| Criterio | A · Aluzinc TR-4 | B · Fibraforte Onda 177 | C · TR-4 + policarbonato TR-4 |
| --- | --- | --- | --- |
| Coste relativo | Medio | Bajo a medio por plancha, pero requiere más correas y fijaciones | Medio. La traslúcida cuesta más por m² |
| Peso | Bajo | Bajo (Opaca 22: 3.45 kg/m², según ficha) | Bajo |
| Facilidad de montaje | Alta: planchas largas y pocas juntas | Alta en manipulación, lenta por los traslapes | Alta. Las traslúcidas requieren más cuidado |
| Mantenimiento | Bajo. Vigilar la corrosión en cortes y tornillos | Bajo. Hay exposición UV | Bajo a medio. Limpiar y vigilar el policarbonato |
| Protección frente a la lluvia | Muy buena, con planchas continuas en la pendiente | Buena si se respeta la pendiente (10/25/40 %) | Muy buena, con traslúcidas del mismo perfil |
| Compatibilidad geométrica | Alta: pendiente mínima de 5 % en costa | Baja a media: pendiente mayor y planchas de 3.05 m | Alta. Traslúcidas de 5.80 y 11.60 m |

### Alternativa técnicamente recomendada: C con caída lateral hacia el parapeto derecho al 8 %

- El TR-4 admite el **5 % en la costa**, el mínimo más bajo de los evaluados. Esto deja margen de altura libre bajo el sobretecho existente.
- Con caída lateral, la longitud de caída es de 6 m. Con un 8 % el desnivel es de solo 0.48 m: de 3.25 a 2.77 m. La plancha de 6.04 m va **en una sola pieza**, sin traslapes transversales.
- Las traslúcidas del mismo perfil TR-4 dan luz natural sin cortar apoyos ni crear juntas especiales.
- El agua se lleva al lado del parapeto bajo y no contra el muro alto.

Resultados de las alternativas en el escenario de referencia: altura de inicio de 3.25 m, borde existente a 3.50 m, régimen de costa y mínimo provisional de 2.20 m:

| Alternativa | Pendiente | Inicio / final | Altura libre bajo tijerales | Traslapes transversales | Conflictos |
| --- | --- | --- | --- | --- | --- |
| C · lateral (recomendada) | 8 % | 3.25 / 2.77 m | 2.26 m | 0 | 0 |
| C · longitudinal | 5 % | 3.25 / 2.68 m | **2.02 m** | 6 | 1 (altura libre) |
| B · lateral | 10 % | 3.25 / 2.65 m | **2.13 m** | 24 | 1 (altura libre) |
| B · longitudinal | 10 % | 3.25 / 2.10 m | **1.44 m** | 24 | 2 |
| A · lateral | 8 % | 3.25 / 2.77 m | 2.26 m | 0 | 0 (sin luz natural) |

La caída longitudinal cubre 11.50 m, sigue la dirección del existente y simplifica el encuentro. A cambio, pierde mucha altura: a 5 % son 0.57 m de desnivel, y Fibraforte al 10 % baja 1.15 m. La app muestra ese conflicto en rojo en lugar de ocultarlo.

---

## 4. Pendiente, alturas y encuentro

- **Fórmula**: `desnivel = longitud de caída × pendiente / 100` y `altura final = altura de inicio − desnivel`. La longitud de caída es 11.50 m en caída longitudinal y 6.00 m en caída lateral.
- **Avisos**: la pendiente se compara con el mínimo del fabricante para el régimen de lluvias elegido. La altura libre se calcula bajo el cordón inferior del tijeral en cada pórtico y se compara con el mínimo configurable. Si la combinación deja la estructura a menos de 1.20 m sobre la losa, se marca como **geometría inviable** y se dibuja igualmente para mostrar el conflicto.
- **Encuentro con el existente**: se elige automáticamente según la holgura real.
  1. **Solape bajo el existente**: las planchas nuevas pasan bajo la viga de borde la longitud del solape, que es ajustable. Lleva un cierre: en caída lateral, un tímpano triangular más un babero lateral; en caída longitudinal, un cierre de espuma. También lleva collarines de sellado en los postes existentes. Se aplica si la holgura es de al menos 2 cm.
  2. **Babero sobre el existente**: cuando la cubierta nueva queda justo por debajo del borde, un babero metálico se fija sobre las planchas existentes y monta sobre las nuevas.
  3. **Canalón de encuentro bajo el borde existente**: cuando la cubierta nueva queda a la altura del borde o por encima, ya no puede recibir su agua. Ocurre con la configuración por defecto, que empieza a 4.00 m.
     - Un canalón de 0.20 m colgado de la viga de borde existente recoge el agua del existente.
     - Su bajante baja pegado al parapeto, entre el poste existente y el primer pórtico nuevo.
     - La cubierta nueva empieza 4 cm por delante del canalón.
     - Sin extensión trasera, el hueco entre las dos cubiertas queda abierto a la lluvia con viento y se marca como **conflicto**.
- **Extensión trasera** (0.30 a 1.00 m): prolonga solo la cubierta hacia atrás, por encima del canalón y del sobretecho existente.
  - Las planchas van sobre correas y largueros en voladizo desde el primer pórtico. No lleva postes y no se apoya en el existente.
  - La app comprueba que lo que vuela quede al menos 5 cm por encima de lo existente. Si no cabe, recorta la extensión y lo avisa, o la anula si no queda margen.
  - Solo se aplica cuando la cubierta nueva queda por encima del borde existente.
- **Separación entre la madera nueva y la estructura metálica existente**:
  - El primer pórtico se coloca para que la viga de amarre, que lo sobrepasa 0.20 m, quede al menos 0.10 m por delante de los postes existentes o del canalón de encuentro. Con la configuración por defecto, el primer pórtico queda en z = 0.46 m.
  - En el modo solape, las correas y los largueros no pasan por detrás de los postes existentes. Si por eso las planchas vuelan más de lo que permite el fabricante bajo el existente, se marca como conflicto.
- **Drenaje**: canalón en el borde bajo con pendiente del 0.5 % hacia los bajantes, que pueden ir al fondo, al frente, en ambos extremos o al centro. Los bajantes de PVC acometen a un sumidero cuya ubicación hay que verificar. Las flechas animadas muestran el recorrido del agua en las dos cubiertas, el canalón y los bajantes.

---

## 5. Resumen técnico: componentes conceptuales

Lista conceptual, **no es un despiece**. Las cantidades se actualizan en el panel derecho.

### Valores geométricos calculados por la app

- Desnivel, altura final, altura en el alero, altura libre mínima bajo los tijerales y su ubicación.
- Longitud de plancha en la pendiente, superficie en planta y superficie inclinada.
- Número de planchas y de traslúcidas, piezas por fila y traslapes transversales. Las juntas se centran sobre las correas.
- Número y separación real de correas, posición de los pórticos y separación entre ellos.
- Número aproximado de fijaciones (cresta × correa) y longitud del canalón.
- Longitud del babero contra el muro alto, modo de encuentro y holgura bajo el existente.

### Valores que requieren diseño estructural (en la app son provisionales)

- **Secciones de madera**:

  | Elemento | Sección aproximada |
  | --- | --- |
  | Postes | ≈6"×6" |
  | Cordones de tijeral | ≈3"×6" |
  | Diagonales y montantes | ≈2"×4" |
  | Vigas de amarre | ≈3"×6" |
  | Largueros | ≈3"×6" |
  | Correas | ≈3"×4" |
  | Pies de amigo | ≈3"×4" |
  | Riostras | ≈2"×4" |

  La especie, la clase estructural y el preservante también están por definir.
- **Separación de correas**: debe salir de la tabla de cargas del TR-4 o del cuadro de distanciamiento de Fibraforte, según el espesor y la carga.
- **Número de pórticos** (5 vanos por defecto) y **peralte del tijeral**.
- **Anclajes a la losa**: bases metálicas en U, pernos de anclaje y pernos pasantes. Requieren verificar la losa y el anclaje químico o mecánico.
- **Uniones**: cartelas metálicas, pernos, pies de amigo y cruces de San Andrés en los vanos extremos.
- **Arriostramiento de cubierta** con flejes cruzados.
- **Viento**: succión sobre la cubierta, anclajes, fijaciones de plancha, remates de borde y lados abiertos. No se usa lastre y no se calcula la succión. Nada de esto está certificado.

---

## 6. Limitaciones conocidas

- Las alturas del sobretecho existente (4.00 y 3.46 m) son **referencias del propietario**, no medidas verificadas. El fondo de ≈3.50 m y el peralte de borde de ≈0.20 m son **estimados**.
- Las alturas del muro izquierdo (≈2.85 m), de los parapetos (≈1.00 m) y del edificio del fondo son **estimadas** a partir de las fotos.
- Se desconoce la ubicación real de los postes y correas del existente: el modelo supone postes en las esquinas del borde bajo.
- **No se verificó la capacidad** de la losa, de los muros ni del sobretecho existente. El modelo no apoya nada en ellos: todo baja a la losa mediante postes propios, y eso también debe verificarse.
- No se extrajo la tabla de distanciamiento de correas de Fibraforte. La separación de 0.95 m es provisional.
- El traslape transversal del TR-4 (0.20 m) y la separación de correas (1.20 m) son provisionales: la ficha no los fija.
- **No se calcula** la succión ni la presión de viento, ni el caudal del canalón y los bajantes.
- No se conocen los puntos de descarga: los sumideros se dibujan como «por verificar».
- Obstáculos: los tanques de agua y el cerramiento bajo de ladrillo bajo el existente condicionan dónde colocar bajantes y postes cerca del fondo.
- Hay que confirmar el límite de propiedad antes de volar la cubierta sobre el parapeto derecho o el frente.
- Régimen de costa: un evento El Niño puede traer lluvias intensas. Conviene revisar la pendiente y el canalón para ese escenario; el selector de régimen de lluvias permite verlo.
- Los precios no se incluyen: deben cotizarse localmente. La lista de qué cotizar está en «Evaluación de materiales».

---

## 7. Estructura del código

```
techo/
├── index.html                 Paneles, barra de vistas y diálogos
├── src/
│   ├── main.js                Escena, render, capas, reconstrucción y bucle
│   ├── estilos.css            Diseño responsive (3 columnas → paneles deslizables)
│   ├── config/proyecto.js     Fuente de verdad: materiales, alternativas, secciones, parámetros
│   ├── calc/geometria.js      Cálculos puros (sin Three.js) y advertencias
│   ├── calc/geometria.test.js Pruebas, incluido un barrido de 648 combinaciones y holguras con lo existente
│   ├── escena/materiales.js   Materiales y texturas procedurales
│   ├── builders/              contexto, existente, estructura, cubierta, drenaje, anotaciones
│   ├── ui/                    panel, vistas, informe y comparaciones
│   └── utils/                 Colector de geometría y perfiles de plancha
└── images/                    Fotografías de referencia
```

Todo el modelo se reconstruye a partir de `calcularProyecto(parámetros)`. Cada control del panel modifica el estado y provoca una reconstrucción completa, así que ningún elemento queda desconectado al cambiar la pendiente, las alturas o las dimensiones. Las pruebas comprueban, para todas las combinaciones de material, dirección, pendiente y altura de inicio, lo siguiente:

- Las planchas cubren todo el ancho y toda la caída.
- Las piezas se traslapan entre sí.
- Las traslúcidas nunca quedan en los bordes.
- Las correas quedan bajo la cubierta.
- El canalón queda bajo la línea de goteo.
- Toda geometría inviable se avisa.

## Fuentes técnicas

- Precor · Tecnotecho TR-4 (ficha técnica): <https://precor.pe/admin_pmp_precor/public/data/product/download/TR4.pdf202109071215141.pdf>
- Precor · Tecnotecho TR-4 traslúcido: <https://precor.pe/es/producto/tecnotecho-tr4-traslucido>
- Fibraforte · Techos, ficha técnica y guía de instalación: <https://fibraforte.com/wp-content/uploads/2021/07/fibraforte-techos-ficha-tecnica.pdf>
