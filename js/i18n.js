/* ════════════════════════════════════════════════════════════════════════
   i18n — sistema simple ES/EN
   ════════════════════════════════════════════════════════════════════════
   Cómo funciona:
   - Cada elemento con `data-i18n="key"` se reemplaza con el valor del
     diccionario según el idioma activo.
   - El idioma se persiste en localStorage 'jicrea_lang' (es/en).
   - Default: 'es'. Toggle EN/ES via el botón #i18nToggle del header.
   - Para data-i18n-attr="placeholder,key": traduce el atributo en vez
     del textContent. Útil para inputs.
   - Los valores admiten HTML simple (<em>, <br>, <strong>) que se
     insertan via innerHTML — útil para acentos verdes, saltos de
     línea y mantener tags como <strong> dentro de párrafos.
   - Para .line spans con data-text: actualiza data-text + el
     .line-inner para no romper la animación GSAP del hero.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  const STORAGE_KEY = "jicrea_lang";
  const DEFAULT_LANG = "es";

  // ─────────── Diccionario ───────────
  const TRANSLATIONS = {
    es: {
      // ═══ NAVBAR ═══
      "nav.home":          "Inicio",
      "nav.shop":          "Tienda",
      "nav.process":       "Proceso",
      "nav.customize":     "Grabamos tu mate",
      "nav.history":       "Nuestra Historia",

      // ═══ HERO INDEX ═══
      "hero.eyebrow":      "— Productores uruguayos",
      "hero.title.l1":     "DEL CAMPO",
      "hero.title.l2":     "A TUS MANOS",
      "hero.subtitle":     "Del porongo natural al mate terminado. Una pieza hecha con tiempo, oficio y origen.",
      "hero.cta":          "Conocé el proceso",

      // ═══ ORIGEN MUSEO (index) ═══
      "origen.title":      "El Origen de la Calabaza",
      "origen.c1.title":   "Cultivo del porongo",
      "origen.c1.text":    "El mate nace del cultivo del porongo, una calabaza natural que crece durante meses al sol hasta desarrollar su forma y resistencia.",
      "origen.c2.title":   "Maduración natural",
      "origen.c2.text":    "El fruto permanece en la planta hasta madurar completamente, endureciendo su cáscara de manera natural.",
      "origen.c3.title":   "Cosecha y secado",
      "origen.c3.text":    "Una vez listo, el porongo se cosecha y atraviesa un proceso de secado lento que permite conservar su durabilidad y carácter único.",
      "origen.c4.title":   "Origen del mate",
      "origen.c4.text":    "Tras el secado, la calabaza queda preparada para convertirse en la base del mate tradicional, manteniendo intacta su esencia natural.",

      // ═══ PROCESO VIDEO (index) ═══
      "proceso.eyebrow":   "El oficio",
      "proceso.title":     "Las manos<br>que le dan vida<br>a la cultura",

      // ═══ MANIFESTO LA IMPORTANCIA DEL MATE (index) ═══
      "importancia.title": "La importancia del mate",
      "importancia.text":  "En Uruguay el mate está en todo lugar y momento — en la mañana, en la tarde, en la noche. Acompaña charlas, silencios, momentos en compañía, en soledad. Une generaciones y comparte nuestra cultura.",

      // ═══ AMARGOR (index) ═══
      "amargor.l1":        "ES AMARGO",
      "amargor.l2":        "ES LENTO",
      "amargor.l3":        "ES NUESTRO",
      "amargor.text":      "La primera vez no se entiende, la segunda no se comparte, y después ya es parte de todos los días.",

      // ═══ PRODUCTOS SELECTOR (index) ═══
      "productos.eyebrow":     "Calidad<br>en lo sencillo",
      "productos.giant.l1":    "Nuestros",
      "productos.giant.l2":    "Mates",
      "productos.tab.porongo": "Porongo",
      "productos.tab.cuero":   "Porongo c/cuero",
      "productos.tab.algarrobo": "Algarrobo",
      "productos.tab.imperial": "Imperial",
      "productos.desc.porongo":   "Calabaza curada. La forma más antigua de tomar mate.",
      "productos.desc.cuero":     "Porongo forrado en cuero, virola engarzada.",
      "productos.desc.algarrobo": "Madera maciza torneada a mano.",
      "productos.desc.imperial":  "Cerámica artesanal con detalles en cuero.",

      // ═══ STATS V2 (index) ═══
      "stats.eyebrow":     "JIcrea en números",
      "stats.label.1":     "Clientes activos",
      "stats.label.2":     "Hechos a mano",
      "stats.label.3":     "Productos",
      "stats.label.4":     "Origen uruguayo",

      // ═══ IG GALLERY (index) ═══
      "ig.eyebrow":        "— JIcrea en imágenes",
      "ig.title":          "El taller, las manos, los mates.",
      "ig.lead":           "Seguinos en Instagram para ver cómo nace cada pieza.",

      // ═══ B2B-V2 / MAYORISTA (index) ═══
      "b2b.eyebrow":       "— Para distribuidores",
      "b2b.title":         "¿Querés vender <em>JIcrea?</em>",
      "b2b.lead":          "Trabajamos con supermercados, agroveterinarias, ferreterías, estaciones de servicio y muchos comercios más en todo Uruguay. Stock permanente, entregas regulares y atención directa.",
      "b2b.f1.title":      "Stock permanente",
      "b2b.f1.text":       "Producción continua para garantizar disponibilidad todo el año.",
      "b2b.f2.title":      "Catálogo completo",
      "b2b.f2.text":       "Más de 50 productos para elegir según el perfil de tu local.",
      "b2b.f3.title":      "Atención directa",
      "b2b.f3.text":       "Un referente comercial dedicado a tu cuenta.",
      "b2b.cta":           "Contactar al equipo comercial",

      // ═══ TIENDA — HERO ═══
      "shop.hero.title.l1":  "PIEZAS",
      "shop.hero.title.l2":  "HECHAS A MANO",
      "shop.hero.subtitle":  "Mates, posa mates, materas y yerberos. Una pieza para cada momento.",
      "shop.hero.cta":       "Ver los productos",

      // ═══ TIENDA — banner + toolbar ═══
      "shop.ship":           "<strong>Envío gratis</strong> en compras de más de <strong>$2.500</strong>",
      "shop.search":         "Buscar productos...",
      "shop.filter.all":     "Todos",

      // ═══ TIENDA — manifesto ═══
      "shop.manifesto.title": "Cada etapa,<br>en nuestras manos.",
      "shop.manifesto.text":  "Estamos en cada una de las etapas del proceso,<br>haciendo foco en la <em class=\"text-accent-green\">calidad de lo sencillo</em>.",

      // ═══ TIENDA — sección personalizados ═══
      "perso.eyebrow":     "— Para empresas y regalos",
      "perso.title":       "Mates con <em class=\"text-accent-green\">tu identidad</em>.",
      "perso.lead":        "Grabamos a fuego tu logo o una frase personalizada en el mate. Pensado para regalos corporativos, eventos, aniversarios o ese detalle único para alguien importante.",
      "perso.f1":          "Logo de tu empresa grabado a fuego",
      "perso.f2":          "Frases personalizadas para regalos únicos",
      "perso.f3":          "Pedidos desde 1 unidad hasta lote completo",
      "perso.cta":         "Consultá por personalizados",

      // ═══ TIENDA — mayorista banner ═══
      "may.title":         "Productores directos.",
      "may.lead":          "Somos productores. Controlamos cada etapa, desde la semilla hasta el mate terminado. Tenemos capacidad para abastecer tu negocio y te asesoramos en los modelos que mejor se adaptan a tu cliente. Calidad que se ve, se toca y se vende sola.",
      "may.pillar1.title": "Origen y control",
      "may.pillar1.text":  "Cada etapa la hacemos nosotros — desde la calabaza en el campo hasta el mate terminado en tu tienda. Productores directos, sin intermediarios, calidad garantizada en cada lote.",
      "may.pillar2.title": "Amplitud",
      "may.pillar2.text":  "Catálogo con 28 referencias entre mates, posa mates, materas y yerberos. Mínimos desde 10 unidades surtidas — podés mezclar líneas en el mismo pedido.",
      "may.pillar3.title": "Asesoramiento",
      "may.pillar3.text":  "No solo vendemos. Te ayudamos a elegir los modelos que mejor se adaptan a tu cliente final. Envíos a todo Uruguay con plazos pactados según el lote.",
      "may.clients":       "Trabajamos con",
      "may.client.1":      "Supermercados",
      "may.client.2":      "Agroveterinarias",
      "may.client.3":      "Ferreterías",
      "may.client.4":      "Estaciones de servicio",
      "may.client.5":      "Tiendas y comercios",
      "may.client.6":      "Y más",
      "may.cta.bag":       "Armar compra mayorista",
      "may.cta.quote":     "Pedir cotización",
      "may.cta.advisory":  "Asesoramiento",

      // ═══ TIENDA — FAQ ═══
      "faq.eyebrow":       "— Preguntas frecuentes",
      "faq.title":         "Lo que más nos preguntan.",
      "faq.q1":            "¿Cuánto tarda el envío?",
      "faq.a1":            "Despachamos en 24/48hs hábiles desde Paysandú. La entrega depende del destino: 1-3 días para Montevideo, 2-5 días para el interior. Para mayoristas coordinamos plazos según el lote.",
      "faq.q2":            "¿El envío tiene costo?",
      "faq.a2":            "En compras de más de <strong>$2.500</strong> el envío es gratis a todo Uruguay. Por debajo de ese monto cobramos el costo de DAC o agencia según destino.",
      "faq.q3":            "¿Cómo curo un mate nuevo?",
      "faq.a3":            "Para mates de calabaza: llenalo con yerba usada y agua caliente (no hirviendo), dejalo reposar 12-24hs, vacialo y raspá las paredes internas con una cuchara. Repetí 3-4 veces antes del primer mate. Para mates de algarrobo y cerámica el curado es opcional — alcanza con enjuagar bien antes del primer uso.",
      "faq.q4":            "¿Cuál es la diferencia entre los modelos?",
      "faq.a4":            "<strong>Porongo:</strong> calabaza natural, el más tradicional, requiere curado y mejora con el uso.<br><strong>Algarrobo:</strong> madera maciza torneada, resistente, no necesita curado.<br><strong>Imperial:</strong> cerámica con detalles en cuero, elegante, ideal para regalo.<br><strong>Con cuero:</strong> el porongo forrado en cuero curtido, premium y duradero.",
      "faq.q5":            "¿Cuál es el mínimo para mayorista?",
      "faq.a5":            "Desde <strong>10 unidades surtidas</strong> — podés mezclar mates, posa mates, materas, yerberos y accesorios en el mismo pedido. Tenemos stock permanente y precios diferenciales para comercios.",
      "faq.q6":            "¿Hacen mates personalizados con logo o frases?",
      "faq.a6":            "Sí — grabamos a fuego el logo de tu empresa o frases personalizadas en el mate. Trabajamos con regalos corporativos, eventos, casamientos y aniversarios. Desde 1 unidad. Coordinamos diseño previo por WhatsApp.",
      "faq.q7":            "¿Tienen garantía?",
      "faq.a7":            "Todos nuestros productos tienen garantía de fábrica de <strong>6 meses</strong> contra defectos de fabricación. Si algo falla por mal uso (caída, fuego, etc.), también podemos repararlo con un costo mínimo — somos productores, conocemos cada pieza.",
      "faq.more":          "¿No encontraste lo que buscabas?",
      "faq.more.cta":      "Escribinos por WhatsApp →",

      // ═══ PRODUCTO DETAIL ═══
      "prod.addCart":      "Agregar al carrito",
      "prod.note":         "El pago y la entrega se coordinan por WhatsApp.",
      "prod.doubts":       "¿Tenés dudas? Escribinos",
      "prod.share":        "Compartir:",
      "prod.howmade":      "Cómo se hace",
      "prod.related":      "Productos relacionados",
      "prod.related.sub":  "Otras piezas que también te pueden gustar.",

      // ═══ HERO NUESTRA HISTORIA ═══
      "history.hero.eyebrow":  "— Desde 2015",
      "history.hero.title.l1": "NUESTRA",
      "history.hero.title.l2": "HISTORIA",
      "history.hero.subtitle": "Productores uruguayos. Hecho a mano en Paysandú, <em class=\"text-accent-green\">con los tiempos que pide el oficio</em>.",
      "history.hero.cta":      "Conocé el origen",

      // ═══ HISTORIA — bloques ═══
      "hist.origen.eyebrow":  "El origen",
      "hist.origen.title":    "De 50 mates<br>a más de 100 clientes.",
      "hist.origen.lead":     "JIcrea es una empresa uruguaya productora y fabricante de mates, fundada formalmente en 2017 a partir de un emprendimiento personal iniciado en 2015–2016.",
      "hist.origen.p1":       "Lo que comenzó con <strong>50 mates, una tabla y una lija</strong>, se transformó en una empresa con galpón propio en Paysandú, equipo de producción y más de <strong>100 clientes mayoristas</strong> en todo Uruguay.",
      "hist.origen.p2":       "Hoy producimos entre 1.000 y 1.500 mates mensuales, controlando cada etapa del proceso: desde la calabaza en el campo hasta el mate terminado. Nuestro fuerte es la <em>calabaza natural</em>, pero también trabajamos con cerámica, algarrobo y una amplia gama de accesorios.",
      "hist.origen.sign":     "JIcrea no es solo una marca.<br>Es la historia de construir algo real, con las manos, desde cero.",

      "hist.timeline.eyebrow": "El recorrido",
      "hist.timeline.title":   "De un mate a una marca.",
      "hist.tl1.title":        "El inicio",
      "hist.tl1.text":         "Los primeros 50 mates con una tabla, una lija y la convicción de hacer algo distinto.",
      "hist.tl2.title":        "Fundación formal",
      "hist.tl2.text":         "JIcrea se constituye como empresa. Galpón propio en Paysandú, equipo de producción y proceso documentado.",
      "hist.tl3.title":        "Escala mayorista",
      "hist.tl3.text":         "Llegamos a más de 50 comercios distribuidos en todo Uruguay. Catálogo ampliado a posa mates, materas y yerberos.",
      "hist.tl4.year":         "Hoy",
      "hist.tl4.title":        "+100 clientes activos",
      "hist.tl4.text":         "Producimos entre 1.000 y 1.500 mates al mes. La próxima etapa: exportar la cultura del mate al mundo.",

      "hist.stats.year":   "Año de inicio",
      "hist.stats.month":  "Mates por mes",
      "hist.stats.clients": "Clientes mayoristas",
      "hist.stats.where":  "Paysandú, Uruguay",

      "hist.callout.eyebrow": "Slogan oficial",
      "hist.callout.text":    "\"Del campo a tus manos.\"",

      "hist.quote.eyebrow": "La frase de la marca",
      "hist.quote.title":   "La marca, en una sola frase.",
      "hist.quote.text":    "Se siembra, se cosecha, se procesa, se lava, se pule, se toma con las manos y se trasciende de generación en generación en una ronda de mates.",

      "hist.filo.eyebrow": "Filosofía",
      "hist.filo.title":   "Calidad en lo sencillo.",
      "hist.filo.lead":    "No buscamos lo complejo ni lo artificioso. La calidad está en <em class=\"text-accent-green\">la materia prima</em>, en el proceso honesto, en el producto que habla por sí solo.",

      "hist.pillars.eyebrow": "Identidad",
      "hist.pillars.title":   "Cuatro pilares.",
      "hist.p1.name":      "Las manos",
      "hist.p1.desc":      "El hilo conductor de todo lo que hacemos y comunicamos.",
      "hist.p2.name":      "El origen",
      "hist.p2.desc":      "Uruguayo, del campo, con raíz cultural profunda.",
      "hist.p3.name":      "Productores y fabricantes",
      "hist.p3.desc":      "Controlamos cada etapa del proceso.",
      "hist.p4.name":      "Calidad en lo sencillo",
      "hist.p4.desc":      "Buscamos lo sencillo, el detalle en lo tradicional.",

      "hist.founder.eyebrow": "— Detrás del mate",
      "hist.founder.quote":   "Empezamos con 50 mates y una tabla. Diez años después seguimos curando cada porongo igual que el primero. Lo que sale de acá es lo mismo que tomamos en casa — por eso lo firmamos.",
      "hist.founder.sign":    "— Juan Ignacio Armas, fundador de JIcrea",

      "hist.vision.eyebrow": "Visión",
      "hist.vision.title":   "A dónde vamos.",
      "hist.v1.title":     "Marca premium de referencia",
      "hist.v1.text":      "Consolidarnos como la marca premium de referencia en mates uruguayos.",
      "hist.v2.title":     "Proveedor mayorista líder",
      "hist.v2.text":      "Ser el proveedor mayorista más completo y confiable del mercado local.",
      "hist.v3.title":     "Internacionalizar la cultura",
      "hist.v3.text":      "Llevar la historia, el proceso y la identidad uruguaya al mundo entero.",

      "hist.mision.eyebrow": "Nuestra misión",
      "hist.mision.text":   "Exportar la cultura del mate<br>uruguayo al mundo.",
      "hist.mision.slogan1": "Del campo a tus manos,",
      "hist.mision.slogan2": "de tus manos al mundo.",
      "hist.mision.cta":    "Conocé los mates →",

      // ═══ 404 ═══
      "404.title.l1":      "Te perdiste",
      "404.title.l2":      "en el campo.",
      "404.sub":           "La página que buscás no existe — o se la llevó el viento.<br>Volvé al taller y empezamos de nuevo.",
      "404.back":          "Volver al inicio",
      "404.shop":          "Ir a la tienda",

      // ═══ FOOTER ═══
      "footer.contact":    "Contacto",
      "footer.menu":       "Menu",
      "footer.where":      "Dónde estamos",
      "footer.shop":       "Tienda",
      "footer.commerce":   "Comercios",
      "footer.wholesale":  "Venta por mayor",
      "footer.tagline":    "Del campo a tus manos.",
      "footer.where.p1":   "Paysandú, Uruguay",
      "footer.where.p2":   "Productores y fabricantes desde 2015",
      "footer.copy":       "© 2026 JIcrea — Mates uruguayos hechos a mano",

      // ═══ COOKIES ═══
      "cookies.text":      "Usamos cookies para que tu experiencia sea mejor. Sin trampas, sólo lo necesario.",
      "cookies.accept":    "Aceptar",
      "cookies.dismiss":   "Más tarde",

      // ═══ CART DRAWER ═══
      "cart.title":        "Tu pedido",
      "cart.empty":        "Tu carrito está vacío.",
      "cart.empty.sub":    "Agregá productos para coordinar la compra por WhatsApp.",
      "cart.total":        "Total",
      "cart.note":         "El pago y la entrega los coordinamos por WhatsApp.",
      "cart.checkout":     "Finalizar compra",

      // ═══ LANG TOGGLE ═══
      "lang.toggle":       "EN",
    },

    en: {
      // ═══ NAVBAR ═══
      "nav.home":          "Home",
      "nav.shop":          "Shop",
      "nav.process":       "Process",
      "nav.customize":     "Engraving",
      "nav.history":       "Our Story",

      // ═══ HERO INDEX ═══
      "hero.eyebrow":      "— Uruguayan craftsmen",
      "hero.title.l1":     "FROM THE FIELD",
      "hero.title.l2":     "TO YOUR HANDS",
      "hero.subtitle":     "From the natural gourd to the finished mate. A piece made with time, craft and origin.",
      "hero.cta":          "Discover the process",

      // ═══ ORIGEN MUSEO ═══
      "origen.title":      "The Origin of the Gourd",
      "origen.c1.title":   "Growing the gourd",
      "origen.c1.text":    "The mate is born from the gourd plant, a natural calabash that grows for months under the sun until it develops its shape and strength.",
      "origen.c2.title":   "Natural ripening",
      "origen.c2.text":    "The fruit stays on the plant until fully ripe, naturally hardening its shell.",
      "origen.c3.title":   "Harvest and drying",
      "origen.c3.text":    "Once ready, the gourd is harvested and goes through a slow drying process that preserves its durability and unique character.",
      "origen.c4.title":   "Origin of the mate",
      "origen.c4.text":    "After drying, the gourd is ready to become the base of the traditional mate, keeping its natural essence intact.",

      "proceso.eyebrow":   "The craft",
      "proceso.title":     "The hands<br>that give life<br>to the culture",

      "importancia.title": "Why mate matters",
      "importancia.text":  "In Uruguay, mate is everywhere — morning, afternoon, night. It accompanies conversations, silences, moments with others, moments alone. It connects generations and shares our culture.",

      "amargor.l1":        "IT'S BITTER",
      "amargor.l2":        "IT'S SLOW",
      "amargor.l3":        "IT'S OURS",
      "amargor.text":      "The first time you don't get it. The second, you don't share it. After that, it's part of every day.",

      "productos.eyebrow":     "Quality<br>in simplicity",
      "productos.giant.l1":    "Our",
      "productos.giant.l2":    "Mates",
      "productos.tab.porongo": "Gourd",
      "productos.tab.cuero":   "Gourd w/leather",
      "productos.tab.algarrobo": "Carob wood",
      "productos.tab.imperial": "Imperial",
      "productos.desc.porongo":   "Cured gourd. The oldest way to drink mate.",
      "productos.desc.cuero":     "Gourd wrapped in leather, with metal rim.",
      "productos.desc.algarrobo": "Solid wood, hand-turned.",
      "productos.desc.imperial":  "Hand-crafted ceramic with leather details.",

      "stats.eyebrow":     "JIcrea by the numbers",
      "stats.label.1":     "Active clients",
      "stats.label.2":     "Handmade",
      "stats.label.3":     "Products",
      "stats.label.4":     "Uruguayan origin",

      "ig.eyebrow":        "— JIcrea in pictures",
      "ig.title":          "The workshop, the hands, the mates.",
      "ig.lead":           "Follow us on Instagram to see how each piece is born.",

      "b2b.eyebrow":       "— For distributors",
      "b2b.title":         "Want to sell <em>JIcrea?</em>",
      "b2b.lead":          "We work with supermarkets, vet supply stores, hardware stores, gas stations and many other shops across Uruguay. Constant stock, regular deliveries and direct support.",
      "b2b.f1.title":      "Constant stock",
      "b2b.f1.text":       "Continuous production to guarantee availability year-round.",
      "b2b.f2.title":      "Full catalog",
      "b2b.f2.text":       "Over 50 products to match the profile of your store.",
      "b2b.f3.title":      "Direct support",
      "b2b.f3.text":       "A dedicated account manager just for you.",
      "b2b.cta":           "Contact our sales team",

      "shop.hero.title.l1":  "PIECES",
      "shop.hero.title.l2":  "MADE BY HAND",
      "shop.hero.subtitle":  "Mates, coasters, mate bags and yerba holders. A piece for every moment.",
      "shop.hero.cta":       "See the products",

      "shop.ship":           "<strong>Free shipping</strong> on orders over <strong>$2,500 UYU</strong>",
      "shop.search":         "Search products...",
      "shop.filter.all":     "All",

      "shop.manifesto.title": "Every stage,<br>in our hands.",
      "shop.manifesto.text":  "We're present in every step of the process,<br>focusing on <em class=\"text-accent-green\">quality in simplicity</em>.",

      "perso.eyebrow":     "— For companies and gifts",
      "perso.title":       "Mates with <em class=\"text-accent-green\">your identity</em>.",
      "perso.lead":        "We fire-engrave your logo or a personalized phrase on the mate. Made for corporate gifts, events, anniversaries or that unique detail for someone important.",
      "perso.f1":          "Your company logo fire-engraved",
      "perso.f2":          "Custom phrases for unique gifts",
      "perso.f3":          "Orders from 1 unit to bulk",
      "perso.cta":         "Ask about custom engraving",

      "may.title":         "Direct producers.",
      "may.lead":          "We're the producers. We control every stage, from the seed to the finished mate. We have capacity to supply your business and advise you on the best models for your customers. Quality you can see, touch and sell easily.",
      "may.pillar1.title": "Origin and control",
      "may.pillar1.text":  "Every stage is done by us — from the gourd in the field to the finished mate in your store. Direct producers, no middlemen, quality guaranteed in every batch.",
      "may.pillar2.title": "Range",
      "may.pillar2.text":  "Catalog with 28 references across mates, coasters, bags and yerba holders. Minimums from 10 assorted units — mix lines in the same order.",
      "may.pillar3.title": "Advisory",
      "may.pillar3.text":  "We don't just sell. We help you choose the models that fit your customer best. Shipping across Uruguay with agreed timelines per batch.",
      "may.clients":       "We work with",
      "may.client.1":      "Supermarkets",
      "may.client.2":      "Vet supply stores",
      "may.client.3":      "Hardware stores",
      "may.client.4":      "Gas stations",
      "may.client.5":      "Shops and retail",
      "may.client.6":      "And more",
      "may.cta.bag":       "Build wholesale order",
      "may.cta.quote":     "Request a quote",
      "may.cta.advisory":  "Get advice",

      "faq.eyebrow":       "— Frequently asked",
      "faq.title":         "Most asked questions.",
      "faq.q1":            "How long does shipping take?",
      "faq.a1":            "We ship within 24/48 business hours from Paysandú. Delivery depends on destination: 1-3 days for Montevideo, 2-5 days for the rest of the country. For wholesalers we agree timelines per batch.",
      "faq.q2":            "Is shipping free?",
      "faq.a2":            "Orders over <strong>$2,500 UYU</strong> ship free across Uruguay. Below that we charge the DAC or courier cost depending on destination.",
      "faq.q3":            "How do I cure a new mate?",
      "faq.a3":            "For gourd mates: fill it with used yerba and hot water (not boiling), let it sit for 12-24h, empty and scrape the inner walls with a spoon. Repeat 3-4 times before the first mate. For carob wood and ceramic mates curing is optional — just rinse well before first use.",
      "faq.q4":            "What's the difference between the models?",
      "faq.a4":            "<strong>Gourd:</strong> natural calabash, the most traditional, needs curing and gets better with use.<br><strong>Carob wood:</strong> hand-turned solid wood, resistant, no curing needed.<br><strong>Imperial:</strong> ceramic with leather details, elegant, ideal as a gift.<br><strong>With leather:</strong> the gourd wrapped in tanned leather, premium and durable.",
      "faq.q5":            "What's the wholesale minimum?",
      "faq.a5":            "From <strong>10 assorted units</strong> — you can mix mates, coasters, bags, yerba holders and accessories in the same order. We keep constant stock and have wholesale pricing for retailers.",
      "faq.q6":            "Do you make custom mates with logos or phrases?",
      "faq.a6":            "Yes — we fire-engrave your company logo or custom phrases on the mate. We work with corporate gifts, events, weddings and anniversaries. From 1 unit. We discuss design over WhatsApp.",
      "faq.q7":            "Do you offer warranty?",
      "faq.a7":            "All our products have a <strong>6-month</strong> manufacturer warranty against defects. If something fails due to misuse (drops, fire, etc.), we can still repair it for a minimum fee — we're the producers, we know every piece.",
      "faq.more":          "Couldn't find what you were looking for?",
      "faq.more.cta":      "Write to us on WhatsApp →",

      "prod.addCart":      "Add to cart",
      "prod.note":         "Payment and delivery coordinated via WhatsApp.",
      "prod.doubts":       "Got questions? Write us",
      "prod.share":        "Share:",
      "prod.howmade":      "How it's made",
      "prod.related":      "Related products",
      "prod.related.sub":  "Other pieces you might also like.",

      "history.hero.eyebrow":  "— Since 2015",
      "history.hero.title.l1": "OUR",
      "history.hero.title.l2": "STORY",
      "history.hero.subtitle": "Uruguayan craftsmen. Handmade in Paysandú, <em class=\"text-accent-green\">at the pace the craft requires</em>.",
      "history.hero.cta":      "Discover the origin",

      "hist.origen.eyebrow":  "The origin",
      "hist.origen.title":    "From 50 mates<br>to over 100 clients.",
      "hist.origen.lead":     "JIcrea is a Uruguayan mate-making company, formally founded in 2017 from a personal project started in 2015–2016.",
      "hist.origen.p1":       "What began with <strong>50 mates, a board and sandpaper</strong>, became a company with its own workshop in Paysandú, a production team and over <strong>100 wholesale clients</strong> across Uruguay.",
      "hist.origen.p2":       "Today we produce between 1,000 and 1,500 mates a month, controlling every step of the process: from the gourd in the field to the finished mate. Our strength is the <em>natural gourd</em>, but we also work with ceramic, carob wood and a wide range of accessories.",
      "hist.origen.sign":     "JIcrea is more than a brand.<br>It's the story of building something real, with our hands, from scratch.",

      "hist.timeline.eyebrow": "The path",
      "hist.timeline.title":   "From a mate to a brand.",
      "hist.tl1.title":        "The beginning",
      "hist.tl1.text":         "The first 50 mates with a board, sandpaper and the will to do things differently.",
      "hist.tl2.title":        "Formal founding",
      "hist.tl2.text":         "JIcrea is registered as a company. Own workshop in Paysandú, production team and documented process.",
      "hist.tl3.title":        "Wholesale scale",
      "hist.tl3.text":         "We reach over 50 shops across Uruguay. Catalog expanded to coasters, bags and yerba holders.",
      "hist.tl4.year":         "Today",
      "hist.tl4.title":        "+100 active clients",
      "hist.tl4.text":         "We produce 1,000 to 1,500 mates per month. Next stage: exporting the culture of mate to the world.",

      "hist.stats.year":   "Founded",
      "hist.stats.month":  "Mates per month",
      "hist.stats.clients": "Wholesale clients",
      "hist.stats.where":  "Paysandú, Uruguay",

      "hist.callout.eyebrow": "Official slogan",
      "hist.callout.text":    "\"From the field to your hands.\"",

      "hist.quote.eyebrow": "The brand phrase",
      "hist.quote.title":   "The brand, in a single phrase.",
      "hist.quote.text":    "It's planted, harvested, processed, washed, polished, drunk with the hands — and passed down generation to generation in a round of mates.",

      "hist.filo.eyebrow": "Philosophy",
      "hist.filo.title":   "Quality in simplicity.",
      "hist.filo.lead":    "We don't seek the complex or the artificial. Quality lives in <em class=\"text-accent-green\">the raw material</em>, in the honest process, in the product that speaks for itself.",

      "hist.pillars.eyebrow": "Identity",
      "hist.pillars.title":   "Four pillars.",
      "hist.p1.name":      "The hands",
      "hist.p1.desc":      "The thread that runs through everything we do and say.",
      "hist.p2.name":      "The origin",
      "hist.p2.desc":      "Uruguayan, from the field, with deep cultural roots.",
      "hist.p3.name":      "Producers and makers",
      "hist.p3.desc":      "We control every stage of the process.",
      "hist.p4.name":      "Quality in simplicity",
      "hist.p4.desc":      "We seek the simple, the detail in the traditional.",

      "hist.founder.eyebrow": "— Behind the mate",
      "hist.founder.quote":   "We started with 50 mates and a board. Ten years later we still cure each gourd like the first. What leaves our workshop is what we drink at home — that's why we sign it.",
      "hist.founder.sign":    "— Juan Ignacio Armas, founder of JIcrea",

      "hist.vision.eyebrow": "Vision",
      "hist.vision.title":   "Where we're heading.",
      "hist.v1.title":     "Premium reference brand",
      "hist.v1.text":      "Become the premium reference brand in Uruguayan mates.",
      "hist.v2.title":     "Leading wholesale supplier",
      "hist.v2.text":      "Become the most complete and trusted wholesale supplier in the local market.",
      "hist.v3.title":     "Internationalize the culture",
      "hist.v3.text":      "Bring the story, the process and the Uruguayan identity to the world.",

      "hist.mision.eyebrow": "Our mission",
      "hist.mision.text":   "Export the culture of<br>Uruguayan mate to the world.",
      "hist.mision.slogan1": "From the field to your hands,",
      "hist.mision.slogan2": "from your hands to the world.",
      "hist.mision.cta":    "Discover the mates →",

      "404.title.l1":      "You got lost",
      "404.title.l2":      "in the field.",
      "404.sub":           "The page you're looking for doesn't exist — or the wind carried it away.<br>Head back to the workshop and we start over.",
      "404.back":          "Back to home",
      "404.shop":          "Go to shop",

      "footer.contact":    "Contact",
      "footer.menu":       "Menu",
      "footer.where":      "Where we are",
      "footer.shop":       "Shop",
      "footer.commerce":   "For retailers",
      "footer.wholesale":  "Wholesale",
      "footer.tagline":    "From the field to your hands.",
      "footer.where.p1":   "Paysandú, Uruguay",
      "footer.where.p2":   "Producers and makers since 2015",
      "footer.copy":       "© 2026 JIcrea — Uruguayan handmade mates",

      "cookies.text":      "We use cookies to make your experience better. No tricks, just the basics.",
      "cookies.accept":    "Accept",
      "cookies.dismiss":   "Later",

      "cart.title":        "Your order",
      "cart.empty":        "Your cart is empty.",
      "cart.empty.sub":    "Add products to coordinate your purchase via WhatsApp.",
      "cart.total":        "Total",
      "cart.note":         "Payment and delivery coordinated via WhatsApp.",
      "cart.checkout":     "Checkout",

      "lang.toggle":       "ES",
    },
  };

  // ─────────── Helpers ───────────
  function getLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch (e) {
      return DEFAULT_LANG;
    }
  }
  function setLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.documentElement.setAttribute("lang", lang);
    applyTranslations(lang);
  }

  function applyTranslations(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const val = dict[key];
      if (val == null) return;
      const attr = el.getAttribute("data-i18n-attr");
      if (attr) {
        attr.split(",").forEach(a => el.setAttribute(a.trim(), val));
      } else {
        if (el.classList.contains("line") && el.hasAttribute("data-text")) {
          el.setAttribute("data-text", val);
          const inner = el.querySelector(".line-inner");
          if (inner) inner.textContent = val;
        } else {
          el.innerHTML = val;
        }
      }
    });
    // Update toggle button
    const toggle = document.getElementById("i18nToggle");
    if (toggle) {
      const otherLang = lang === "es" ? "en" : "es";
      toggle.textContent = TRANSLATIONS[otherLang]["lang.toggle"] || (lang === "es" ? "EN" : "ES");
      toggle.setAttribute("aria-label", lang === "es" ? "Switch to English" : "Cambiar a Español");
      toggle.setAttribute("data-current", lang);
    }
  }

  // ─────────── Init ───────────
  document.addEventListener("DOMContentLoaded", () => {
    const lang = getLang();
    setLang(lang);
    const toggle = document.getElementById("i18nToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const current = getLang();
        const next = current === "es" ? "en" : "es";
        setLang(next);
      });
    }
  });

  window.JIcrea_i18n = { getLang, setLang, TRANSLATIONS };
})();
