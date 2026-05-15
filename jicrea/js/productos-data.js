/* ════════════════════════════════════════════════════════════════════════
   PRODUCTOS — Base de datos central. Se usa en tienda.html y producto.html.
   ════════════════════════════════════════════════════════════════════════ */
window.JICREA_PRODUCTOS = {

  // ─── MATES ───────────────────────────────────────────────────────────
  "mate-porongo": {
    id: "mate-porongo",
    cat: "Mates",
    catLink: "tienda.html#mates",
    name: "Mate Porongo",
    price: 1500,
    short: "Calabaza curada de manera tradicional. La forma más antigua de tomar mate.",
    img: "img/mate-porongo.png",
    gallery: ["img/mate-porongo.png", "img/porongo-bruto.png", "img/proceso-fondo1.png"],
    story: "Cada porongo nace en el campo, colgando de las viñas. Esperamos su tiempo de madurez para cortarlo, después se lo cura — un proceso que toma semanas para que la calabaza pierda la humedad y quede lista para tomar. Sale del taller con su carácter único, sin dos iguales.",
    steps: [
      { num: "01", title: "Cosecha", text: "Recolección del porongo maduro de la viña." },
      { num: "02", title: "Curado", text: "Limpieza y secado tradicional durante semanas." },
      { num: "03", title: "Entrega", text: "Listo para curar con yerba al gusto." }
    ],
    similares: ["mate-porongo-cuero", "mate-algarrobo", "mate-imperial"]
  },

  "mate-porongo-cuero": {
    id: "mate-porongo-cuero",
    cat: "Mates",
    catLink: "tienda.html#mates",
    name: "Mate Porongo con Cuero",
    price: 2200,
    short: "Porongo forrado en cuero genuino, con virola engarzada. Una pieza premium hecha para durar generaciones.",
    img: "img/mate-porongo-concuero.png",
    gallery: ["img/mate-porongo-concuero.png", "img/posa-mate.png", "img/momento3.jpg"],
    story: "Sobre la base del porongo curado tradicional, lo forramos con cuero vacuno curtido, cosido a mano hilo por hilo. La virola la engarzamos en bronce o alpaca según el modelo. Cada pieza es única — el cuero respira, el porongo respira y el sabor del mate sale auténtico.",
    steps: [
      { num: "01", title: "Curado base", text: "Porongo curado tradicional, listo para el cuero." },
      { num: "02", title: "Forrado", text: "Cuero cortado, cocido a mano sobre la calabaza." },
      { num: "03", title: "Virola", text: "Engarzada con la pieza terminada, soldada y pulida." }
    ],
    similares: ["mate-porongo", "mate-imperial", "posa-cuero-premium"]
  },

  "mate-algarrobo": {
    id: "mate-algarrobo",
    cat: "Mates",
    catLink: "tienda.html#mates",
    name: "Mate de Algarrobo",
    price: 1800,
    short: "Madera maciza torneada a mano. Resistente, cálido, con vetas únicas en cada pieza.",
    img: "img/mate-algarrobo.png",
    gallery: ["img/mate-algarrobo.png", "img/proceso-fondo2.png", "img/momento3.jpg"],
    story: "El algarrobo es una de las maderas más nobles del litoral uruguayo. Lo torneamos en seco, dándole forma con paciencia. Después se lo lija fino y se le aplica aceite natural para resaltar las vetas. Cada mate sale diferente porque cada árbol es diferente.",
    steps: [
      { num: "01", title: "Selección", text: "Búsqueda de tarugo de algarrobo seco y firme." },
      { num: "02", title: "Torneado", text: "Forma a mano en el torno, sin apuro." },
      { num: "03", title: "Acabado", text: "Lijado fino y aceite vegetal para proteger." }
    ],
    similares: ["mate-porongo", "yerbero-algarrobo", "posa-madera"]
  },

  "mate-imperial": {
    id: "mate-imperial",
    cat: "Mates",
    catLink: "tienda.html#mates",
    name: "Mate Imperial",
    price: 2500,
    short: "Cerámica artesanal con detalles en cuero. Una propuesta elegante, ideal para regalar.",
    img: "img/mate-imperial.png",
    gallery: ["img/mate-imperial.png", "img/posa-mate.png", "img/momento1.jpg"],
    story: "El Imperial combina la cerámica torneada con cuero natural. El cuerpo se torna en arcilla, se cuece a alta temperatura y se cubre con cuero curtido. La virola, en alpaca, se engarza al final. Es nuestro mate más elegante — pesado, equilibrado, distinto.",
    steps: [
      { num: "01", title: "Cerámica", text: "Arcilla torneada y cocida en horno propio." },
      { num: "02", title: "Cuero", text: "Forrado parcial en cuero curtido vegetal." },
      { num: "03", title: "Virola", text: "Alpaca engarzada y pulida a mano." }
    ],
    similares: ["mate-porongo-cuero", "mate-algarrobo", "matera-clasica"]
  },

  // ─── POSA MATES ──────────────────────────────────────────────────────
  "posa-cuero-clasico": {
    id: "posa-cuero-clasico",
    cat: "Posa Mates",
    catLink: "tienda.html#posa-mates",
    name: "Posa Cuero Clásico",
    price: 800,
    short: "Cuero curtido natural cosido a mano. Diseño liso, combina con cualquier mate.",
    img: "img/posa-mate.png",
    gallery: ["img/posa-mate.png", "img/mate-porongo.png", "img/momento3.jpg"],
    story: "Una pieza simple pero esencial. Cuero curtido vegetal, cortado en círculo y cosido por dentro para que el mate quede estable sobre cualquier superficie. Sin curtientes químicos — solo cuero natural que envejece bien.",
    steps: [
      { num: "01", title: "Cuero", text: "Curtido vegetal seleccionado del lote más firme." },
      { num: "02", title: "Corte", text: "Forma circular ajustada a la base estándar." },
      { num: "03", title: "Costura", text: "Hilo encerado, cosido a mano por dentro." }
    ],
    similares: ["posa-cuero-trenzado", "posa-madera", "posa-cuero-premium"]
  },

  "posa-cuero-trenzado": {
    id: "posa-cuero-trenzado",
    cat: "Posa Mates",
    catLink: "tienda.html#posa-mates",
    name: "Posa Cuero Trenzado",
    price: 1100,
    short: "Borde superior trenzado a mano. Un detalle artesanal que se nota.",
    img: "img/posa-mate.png",
    gallery: ["img/posa-mate.png", "img/momento1.jpg", "img/mate-algarrobo.png"],
    story: "Sobre la base del cuero clásico, agregamos un trenzado a mano en el borde superior con tiras del mismo cuero. Le da firmeza, decora y dura más. Es el detalle artesanal que distingue una posa común de una pieza única.",
    steps: [
      { num: "01", title: "Base", text: "Cuero curtido vegetal, base sólida." },
      { num: "02", title: "Trenzado", text: "Tiras cortadas y trenzadas a mano alrededor." },
      { num: "03", title: "Acabado", text: "Cosido interior y aceite protector." }
    ],
    similares: ["posa-cuero-clasico", "posa-cuero-premium", "mate-porongo-cuero"]
  },

  "posa-madera": {
    id: "posa-madera",
    cat: "Posa Mates",
    catLink: "tienda.html#posa-mates",
    name: "Posa de Madera",
    price: 700,
    short: "Madera maciza torneada. Robusta, cálida y con vetas únicas en cada pieza.",
    img: "img/posa-mate.png",
    gallery: ["img/posa-mate.png", "img/mate-algarrobo.png", "img/momento1.jpg"],
    story: "Algarrobo o lapacho, torneado en una sola pieza. La base es ancha para dar estabilidad. Acabado en aceite natural que resalta la veta sin tapar el grano. Una posa que dura una vida.",
    steps: [
      { num: "01", title: "Madera", text: "Selección de tarugo seco de algarrobo." },
      { num: "02", title: "Torneado", text: "Forma de plato en torno manual." },
      { num: "03", title: "Acabado", text: "Aceite natural y pulido fino." }
    ],
    similares: ["posa-cuero-clasico", "mate-algarrobo", "yerbero-algarrobo"]
  },

  "posa-cuero-premium": {
    id: "posa-cuero-premium",
    cat: "Posa Mates",
    catLink: "tienda.html#posa-mates",
    name: "Posa Cuero Premium",
    price: 1500,
    short: "Cuero doble vuelta, virola dorada engarzada, isotipo grabado a fuego.",
    img: "img/posa-mate.png",
    gallery: ["img/posa-mate.png", "img/mate-porongo-concuero.png", "img/mate-imperial.png"],
    story: "La versión más elaborada. Dos capas de cuero — base estructural y exterior decorativo. Anillo superior en alpaca dorada engarzada. Isotipo JIcrea grabado a fuego en el cuero exterior. Para los que buscan una pieza única.",
    steps: [
      { num: "01", title: "Doble cuero", text: "Capa interna estructural + capa externa fina." },
      { num: "02", title: "Anillo", text: "Alpaca dorada engarzada en el borde." },
      { num: "03", title: "Grabado", text: "Isotipo a fuego, marca permanente." }
    ],
    similares: ["mate-porongo-cuero", "mate-imperial", "posa-cuero-trenzado"]
  },

  // ─── MATERAS ─────────────────────────────────────────────────────────
  "matera-clasica": {
    id: "matera-clasica",
    cat: "Materas",
    catLink: "tienda.html#materas",
    name: "Matera Clásica",
    price: 4500,
    short: "Cuero curtido vegetal. Compartimentos para mate, termo, yerbera y bombilla.",
    img: "img/momento1.jpg",
    gallery: ["img/momento1.jpg", "img/momento3.jpg", "img/proceso-fondo2.png"],
    story: "La matera tradicional uruguaya. Cuero curtido vegetal, compartimentos internos rígidos para que cada elemento tenga su lugar — mate, termo, yerbera, bombilla. Hebillas reforzadas en bronce. Bandolera ajustable. Pensada para usarse, no para guardar.",
    steps: [
      { num: "01", title: "Patrón", text: "Diseño y corte del cuero según pieza." },
      { num: "02", title: "Compartimentos", text: "Refuerzos internos y costura a mano." },
      { num: "03", title: "Acabado", text: "Hebillas en bronce, bandolera ajustable." }
    ],
    similares: ["matera-lona", "matera-compacta", "yerbero-cuero"]
  },

  "matera-lona": {
    id: "matera-lona",
    cat: "Materas",
    catLink: "tienda.html#materas",
    name: "Matera Lona y Cuero",
    price: 3800,
    short: "Lona resistente al agua con detalles en cuero. Liviana, ideal para el día a día.",
    img: "img/momento1.jpg",
    gallery: ["img/momento1.jpg", "img/momento2.jpg", "img/proceso-fondo2.png"],
    story: "Lona impermeabilizada con detalles en cuero curtido en hebillas, manijas y refuerzos. Más liviana que la clásica, ideal para llevar todos los días. Compartimentos amplios, lavable.",
    steps: [
      { num: "01", title: "Lona", text: "Lona algodón impermeabilizada al agua." },
      { num: "02", title: "Detalles", text: "Cuero curtido en bordes, manijas y hebillas." },
      { num: "03", title: "Costura", text: "Doble costura reforzada en zonas de tensión." }
    ],
    similares: ["matera-clasica", "matera-compacta", "mate-porongo"]
  },

  "matera-compacta": {
    id: "matera-compacta",
    cat: "Materas",
    catLink: "tienda.html#materas",
    name: "Matera Compacta",
    price: 3200,
    short: "Versión reducida para llevar lo esencial — mate, termo, bombilla. Bandolera ajustable.",
    img: "img/momento1.jpg",
    gallery: ["img/momento1.jpg", "img/momento2.jpg", "img/momento3.jpg"],
    story: "Una matera pensada para el que no quiere cargar de más. Sólo compartimentos para mate, termo y bombilla — sin yerbera. Más chica, más liviana, igual de bien terminada que la clásica.",
    steps: [
      { num: "01", title: "Diseño", text: "Patrón reducido optimizado para 3 piezas." },
      { num: "02", title: "Cuero", text: "Curtido vegetal, mismas terminaciones que clásica." },
      { num: "03", title: "Bandolera", text: "Ajustable con hebilla en bronce." }
    ],
    similares: ["matera-clasica", "matera-lona", "yerbero-cuero"]
  },

  // ─── YERBEROS ────────────────────────────────────────────────────────
  "yerbero-algarrobo": {
    id: "yerbero-algarrobo",
    cat: "Yerberos",
    catLink: "tienda.html#yerberos",
    name: "Yerbero de Algarrobo",
    price: 1200,
    short: "Madera maciza torneada, tapa con sello hermético, etiquetado a fuego con el isotipo.",
    img: "img/momento2.jpg",
    gallery: ["img/momento2.jpg", "img/mate-algarrobo.png", "img/momento3.jpg"],
    story: "Recipiente cilíndrico de algarrobo torneado en una pieza. Tapa con junta de cuero para sellar herméticamente — la yerba se mantiene fresca y aromática por más tiempo. Isotipo JIcrea grabado a fuego en la tapa.",
    steps: [
      { num: "01", title: "Torneado", text: "Cuerpo y tapa torneados por separado." },
      { num: "02", title: "Junta", text: "Cuero curtido en el cierre para sellar." },
      { num: "03", title: "Grabado", text: "Isotipo a fuego en la tapa." }
    ],
    similares: ["mate-algarrobo", "posa-madera", "yerbero-cuero"]
  },

  "yerbero-cuero": {
    id: "yerbero-cuero",
    cat: "Yerberos",
    catLink: "tienda.html#yerberos",
    name: "Yerbero Cuero",
    price: 1400,
    short: "Estructura interna sellada, exterior forrado en cuero curtido. Liviano para llevar de viaje.",
    img: "img/momento2.jpg",
    gallery: ["img/momento2.jpg", "img/momento1.jpg", "img/mate-porongo-concuero.png"],
    story: "Cuerpo interno en madera o aluminio sellado, con exterior forrado en cuero curtido vegetal. Más liviano que el de algarrobo, ideal para llevar de viaje. La tapa también va forrada y cierra con presión.",
    steps: [
      { num: "01", title: "Estructura", text: "Interior sellado para preservar el aroma." },
      { num: "02", title: "Forro", text: "Cuero curtido cosido sobre el exterior." },
      { num: "03", title: "Tapa", text: "Cierre a presión con junta interior." }
    ],
    similares: ["yerbero-algarrobo", "matera-clasica", "matera-compacta"]
  }
};
