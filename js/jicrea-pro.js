document.addEventListener("DOMContentLoaded", () => {
  // ═══════════════════════════════════════════════════════════════════
  // ░░░░░░░░░░░░░ 0. PAGE CURTAIN TRANSITION ░░░░░░░░░░░░░░░░░░░░░░░░
  // ═══════════════════════════════════════════════════════════════════
  // Sustituye la transición vieja que animaba width/height del header
  // logo (capas layout pesadas → stutter de ~2s entrada + 1.2s salida).
  // El curtain es un overlay fixed que sólo anima opacity + transform
  // del logo (GPU-only, sin reflows). Total: ~870ms en vez de ~4s.
  // ═══════════════════════════════════════════════════════════════════
  const header = document.getElementById("header");

  // 1) Limpiar la clase vieja is-transitioning del header (si está en
  //    el HTML por compatibilidad). El logo del header queda en su pose
  //    natural inmediatamente. La curtain está encima ocultando todo.
  if (header && header.classList.contains("is-transitioning")) {
    header.classList.remove("is-transitioning");
  }

  // 2) Obtener (o crear) el curtain. Idealmente está en el HTML para
  //    evitar flash; si no, lo creamos dinámicamente como fallback.
  let curtain = document.getElementById("pageCurtain");
  if (!curtain) {
    curtain = document.createElement("div");
    curtain.id = "pageCurtain";
    curtain.className = "page-curtain";
    curtain.innerHTML = '<img class="page-curtain__logo" src="img/logotipo-blanco.png" alt="JIcrea">';
    document.body.prepend(curtain);
  }

  // 3) Fade out el curtain. Triggereamos la clase is-hidden tras un
  //    breve delay (50ms) — suficiente para que el primer paint muestre
  //    el curtain en su estado inicial (opacity 1), después la clase
  //    activa la transición CSS hacia opacity 0. setTimeout es más
  //    confiable que doble-rAF en algunos entornos (background tabs,
  //    headless renderers).
  setTimeout(() => {
    curtain.classList.add("is-hidden");
  }, 50);

  // 4) Navegación entre páginas — al click en un link interno, mostramos
  //    el curtain de nuevo (fade in), esperamos 320ms (~60% de la
  //    transición de 550ms; salir antes del 100% se siente más vivo
  //    que esperar el fin), y navegamos.
  const internalLinks = document.querySelectorAll('a[href]:not([href^="#"]):not([target="_blank"])');
  internalLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      // Saltarse links externos (otro dominio) o protocolos especiales
      const raw = link.getAttribute("href");
      if (!raw) return;
      if (raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) return;
      try {
        const u = new URL(link.href);
        if (u.origin !== location.origin) return; // dominio externo
      } catch (_) { /* relative link → continúa */ }

      e.preventDefault();
      const target = link.href;
      curtain.classList.remove("is-hidden");
      setTimeout(() => { window.location.href = target; }, 320);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // COOKIE BANNER — aviso legal sutil con acepto / dismiss persistente
  // ─────────────────────────────────────────────────────────────────
  // Si ya aceptó (localStorage), no se muestra. Si rechaza/cierra,
  // tampoco vuelve a aparecer hasta el próximo browser refresh sin
  // localStorage. Spec mínimo: cumplir aviso, no molestar.
  (function initCookieBanner(){
    const STORAGE_KEY = "jicrea_cookies_v1";
    try { if (localStorage.getItem(STORAGE_KEY) === "accepted") return; } catch(e){}
    // Crear DOM dinámicamente para no ensuciar cada HTML
    const banner = document.createElement("aside");
    banner.className = "cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Aviso de cookies");
    banner.innerHTML = `
      <p class="cookie-banner__text">Usamos cookies para que tu experiencia sea mejor. Sin trampas, sólo lo necesario.</p>
      <div class="cookie-banner__actions">
        <button type="button" class="cookie-banner__btn cookie-banner__btn--primary" data-action="accept">Aceptar</button>
        <button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-action="dismiss">Más tarde</button>
      </div>
    `;
    document.body.appendChild(banner);
    // Mostrar con un pequeño delay para no atropellar el primer paint
    setTimeout(() => banner.classList.add("is-visible"), 1200);

    banner.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.getAttribute("data-action");
      if (!action) return;
      if (action === "accept") {
        try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch(e){}
      }
      banner.classList.remove("is-visible");
      setTimeout(() => banner.remove(), 400);
    });
  })();

  // 1. Initialize Lenis for smooth scroll
  const lenis = typeof Lenis !== 'undefined' ? new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  }) : null;

  if (lenis) {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Ensure GSAP works with Lenis
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  } else {
    console.error("GSAP or ScrollTrigger not loaded");
    return;
  }

  // 3. Header Scroll
  if (header) {
    // Normal shrink behavior
    ScrollTrigger.create({
      start: "top -50",
      end: 99999,
      toggleClass: {className: "is-scrolled", targets: header}
    });

    // Smart Navbar Color Toggle — global scroll listener que revisa qué
    // sección [data-bg] está justo debajo del header en cada frame de
    // scroll. Funciona aunque entres directo a una sección (sin cruzar
    // las anteriores). El footer también cuenta como "dark".
    function updateNavTheme() {
      const headerH = header.offsetHeight;
      const sections = document.querySelectorAll('[data-bg], .footer');
      let currentBg = 'light';
      for (let i = sections.length - 1; i >= 0; i--) {
        const s = sections[i];
        const r = s.getBoundingClientRect();
        if (r.top <= headerH && r.bottom > 0) {
          currentBg = s.classList.contains('footer') ? 'dark' : s.dataset.bg;
          break;
        }
      }
      // 3 estados: dark (tierra negro), light (crudo), leather (cuero terracotta)
      header.classList.toggle('is-dark-bg', currentBg === 'dark');
      header.classList.toggle('is-leather-bg', currentBg === 'leather');
    }
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: updateNavTheme,
      onRefresh: updateNavTheme
    });
    updateNavTheme();
  }

  // 4. Proceso Story Image Switcher
  const procesoSteps = document.querySelectorAll('.proceso-story__step');
  const procesoImgs = document.querySelectorAll('.proceso-story__img');
  
  procesoSteps.forEach(step => {
    ScrollTrigger.create({
      trigger: step,
      start: "top center", // Cuando el paso llega al medio de la pantalla
      end: "bottom center",
      onEnter: () => activateProcesoImg(step.dataset.step),
      onEnterBack: () => activateProcesoImg(step.dataset.step)
    });
  });

  function activateProcesoImg(id) {
    if(!id) return;
    procesoImgs.forEach(img => img.classList.remove('is-active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('is-active');
  }

  // 5. Transform all .line pseudo-elements to real DOM elements for GSAP animation
  const textLines = document.querySelectorAll(".line[data-text]");
  textLines.forEach(line => {
    const text = line.getAttribute('data-text');
    line.innerHTML = `<span class="line-inner" style="display:block; transform:translateY(100%);">${text}</span>`;
    line.removeAttribute('data-text');
  });

  // Hero Title Animation
  if (document.querySelector(".hero__title")) {
    gsap.to(".hero__title .line-inner", {
      y: 0,
      duration: 1.2,
      stagger: 0.2,
      ease: "power4.out",
      delay: 1.2 // Wait for intro
    });
  }

  const heroSubtitle = document.querySelector(".hero__subtitle");
  if (heroSubtitle) {
    gsap.to(heroSubtitle, {
      opacity: 1,
      duration: 1,
      delay: 2,
      ease: "power2.out"
    });
  }

  const heroMedia = document.querySelector(".hero__media");
  if (heroMedia) {
    gsap.to(heroMedia, {
      scale: 1,
      duration: 2,
      delay: 0.5,
      ease: "power2.out"
    });

    // Parallax on scroll
    gsap.to(heroMedia, {
      yPercent: 30,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });
  }

  // 5. Generic Reveals
  const revealElements = document.querySelectorAll("[data-reveal]");
  revealElements.forEach(el => {
    let delay = el.getAttribute("data-delay") || 0;
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      delay: delay * 0.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
      }
    });
  });

  // 6. Cards Animation
  const cardsSection = document.querySelector(".cards");
  if (cardsSection) {
    const cardLeft = document.querySelector(".card--left");
    const cardCenter = document.querySelector(".card--center");
    const cardRight = document.querySelector(".card--right");

    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: cardsSection,
        start: "top 70%",
        end: "top 10%",
        scrub: 1
      }
    });

    tl.to(cardLeft, {
      xPercent: -100,
      rotation: -14,
      ease: "power2.out"
    }, 0);

    tl.to(cardCenter, {
      rotation: 0,
      ease: "power2.out"
    }, 0);

    tl.to(cardRight, {
      xPercent: 100,
      rotation: 14,
      ease: "power2.out"
    }, 0);
  }

  // 7. Sticky Section & other text line scroll reveals
  const scrollTextSections = document.querySelectorAll(".sticky__giant, .amargor__giant, .pillar__title");
  
  scrollTextSections.forEach(section => {
    const lines = section.querySelectorAll(".line-inner");
    if (lines.length > 0) {
      gsap.to(lines, {
        y: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: section.classList.contains("sticky") ? "top 80%" : "top 80%",
          end: section.classList.contains("sticky") ? "bottom 20%" : "bottom 60%",
          scrub: section.classList.contains("sticky") ? 1 : false,
          toggleActions: "play none none reverse"
        }
      });
    }
  });

  // 8. Pillars Parallax
  const pillars = document.querySelectorAll(".pillar");
  pillars.forEach(pillar => {
    const img = pillar.querySelector(".pillar__media img");
    if (img) {
      gsap.fromTo(img, 
        { scale: 1.1, yPercent: -10 },
        { scale: 1.1, yPercent: 10, ease: "none", scrollTrigger: {
            trigger: pillar,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        }
      );
    }
  });

  // 9. Productos Logic
  const tabs = document.querySelectorAll(".productos__tab");
  const imgTarget = document.getElementById("productosMate");
  const descTarget = document.getElementById("productosDesc");

  const productData = {
    "porongo": {
      img: "img/mate-porongo.png",
      desc: "Calabaza curada. La forma más antigua de tomar mate."
    },
    "porongo-cuero": {
      img: "img/mate-porongo-concuero.png",
      desc: "Calabaza forrada en cuero vacuno con tiento."
    },
    "algarrobo": {
      img: "img/mate-algarrobo.png",
      desc: "Madera torneada a mano, sabor suave y duradero."
    },
    "imperial": {
      img: "img/mate-imperial.png",
      desc: "Virola de alpaca y cuero crudo. Elegancia absoluta."
    }
  };

  // Preload los 4 PNGs ni bien arranca el JS — así el swap entre tabs es
  // instantáneo (las imágenes ya están en cache del browser).
  Object.values(productData).forEach(p => {
    const preimg = new Image();
    preimg.src = p.img;
  });

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Remove active class
      tabs.forEach(t => t.classList.remove("is-active", "aria-selected"));
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");

      const mateKey = tab.getAttribute("data-mate");
      const data = productData[mateKey];

      if (data && imgTarget && descTarget) {
        // Fade out rápido → swap → fade in rápido. Total ~0.3s.
        gsap.to([imgTarget, descTarget], {
          opacity: 0,
          duration: 0.12,
          ease: "power2.out",
          onComplete: () => {
            imgTarget.src = data.img;
            descTarget.textContent = data.desc;
            gsap.to([imgTarget, descTarget], {
              opacity: 1,
              duration: 0.18,
              ease: "power2.out"
            });
          }
        });
      }
    });
  });

  // ============================================================================
  // 10. PROCESO 3D — scroll-pinned section con model-viewer
  //
  // La sección .proceso-3d tiene 400vh. Adentro un .proceso-3d__pin queda
  // sticky a 100vh. El scroll progress (0→1) controla:
  //   - cameraOrbit del model-viewer (rotación continua, 0→720deg)
  //   - cambio de modelo en cuartos (0-25-50-75-100%)
  //   - texto (num, título, desc) con crossfade
  //   - barra de progreso
  // ============================================================================
  const proceso3D = document.querySelector(".proceso-3d");
  if (proceso3D) {
    // ─── VIDEO scrubeable (reemplazó al sistema 3D + 6 capas de fotos) ──
    // El video sustituye toda la animación: scrub currentTime con scroll.
    // Si el video no carga, el `procesoVideo` será null o sin duration y
    // el código degrada silenciosamente — la sección queda en negro.
    const procesoVideo = document.getElementById("procesoVideo");

    /* ───────────── [DESHABILITADO — sistema 3D + fotos] ──────────────
       Las queries de model-viewers y capas de fondo se mantienen
       comentadas para revertir fácil si se decide volver al sistema 3D.
       Para revertir: descomentar este bloque + el HTML + applyProgress.
    const models     = Array.from(document.querySelectorAll(".proceso-3d__model"));
    const bgLayerEls = {
      s0:      document.querySelector('.proceso-3d__bg-layer[data-step="0"]'),
      s1:      document.querySelector('.proceso-3d__bg-layer[data-step="1"]'),
      s1Mate:  document.querySelector('.proceso-3d__bg-layer[data-step="1-mate"]'),
      s2:      document.querySelector('.proceso-3d__bg-layer[data-step="2"]'),
      s2Mate:  document.querySelector('.proceso-3d__bg-layer[data-step="2-mate"]'),
      s2Final: document.querySelector('.proceso-3d__bg-layer[data-step="2-final"]'),
    };
    const bgEl       = document.getElementById("procesoBg");
    const viewerEl   = document.getElementById("procesoViewer");
    ────────────────────────────────────────────────────────────────── */
    const textBlock  = document.getElementById("procesoText");
    const numEl      = textBlock?.querySelector(".proceso-3d__num");
    const titleEl    = textBlock?.querySelector(".proceso-3d__title");
    const descEl     = textBlock?.querySelector(".proceso-3d__desc");
    const barFill    = document.getElementById("procesoBar");
    const countEl    = document.getElementById("procesoCount");
    const dataEl     = document.getElementById("procesoSteps");
    // El bloque de texto (núm/título/desc) y el indicador (barra + count)
    // se ocultan completos durante las fases de foto-visible y se hacen
    // visibles SOLO durante la rotación del mate 3D libre en el dark.
    // El usuario pidió: las fotos no llevan texto encima, el texto entra
    // "por el camino" cuando el mate flota.
    const copyLeftEl  = document.querySelector(".proceso-3d__copy-left");
    const copyRightEl = document.querySelector(".proceso-3d__copy-right");

    // stepsData solo se usa si el overlay de texto está activo. Como el
    // proceso ahora es un video (overlay comentado), dataEl puede ser null.
    let stepsData = [];
    if (dataEl) {
      try { stepsData = JSON.parse(dataEl.textContent); } catch (e) { console.warn("[JIcrea] proceso: error parsing steps", e); }
    }

    const stepCount = stepsData.length;
    // Inicializados en 0 (no -1) para que la PRIMERA llamada a changeStep(0)
    // sea no-op y no se dispare animación de entrada del texto al cargar.
    // El texto del primer step ya está renderizado en HTML, no necesitamos
    // animarlo en el initial paint.
    let currentStep = 0;
    let currentModelStep = 0;

    function changeStep(step) {
      if (step === currentStep) return;
      const data = stepsData[step];
      if (!data) return;
      currentStep = step;

      // data-step en la sección (sirve para reglas CSS contextuales)
      proceso3D.setAttribute("data-step", String(step));

      // Animación 2-tiempos tipo oryzo:
      //   1) is-changing → texto sale ARRIBA (clip-path mask), 350ms
      //   2) cambiamos el contenido en blanco, ponemos is-entering (instant
      //      snap a abajo del clip), forzamos reflow, sacamos is-entering
      //      → texto entra desde ABAJO con stagger 0.05/0.13/0.21s
      if (textBlock) textBlock.classList.add("is-changing");
      setTimeout(() => {
        if (numEl)   numEl.textContent   = data.num;
        if (titleEl) titleEl.innerHTML   = data.title; // permite <br> en el título
        if (descEl)  descEl.textContent  = data.desc;
        if (countEl) countEl.textContent = (step + 1) + " / " + stepCount;
        if (textBlock) {
          textBlock.classList.remove("is-changing");
          textBlock.classList.add("is-entering");
          // Forzar reflow para que el snap a posición inicial aplique
          void textBlock.offsetWidth;
          requestAnimationFrame(() => {
            textBlock.classList.remove("is-entering");
          });
        }
      }, 350);
    }

    /* ───────────── [DESHABILITADO — changeModel del sistema 3D] ──────
       Cuando había 3 model-viewers, esta función swappeaba is-visible.
       Con el video no hace falta. Se mantiene comentado por si se revierte.
    function changeModel(step) {
      if (step === currentModelStep) return;
      currentModelStep = step;
      models.forEach((m, i) => {
        m.classList.toggle("is-visible", i === step);
      });
    }
    ──────────────────────────────────────────────────────────────── */

    // ════════════════════════════════════════════════════════════════════
    // ░░░░░░░ ⚠️ CALIBRACIÓN LOCKEADA — NO TOCAR (referencia oficial) ░░░░
    // ════════════════════════════════════════════════════════════════════
    // Estos 3 valores son la POSE OFICIAL de cada mate 3D, calibrados por
    // el usuario para que matcheen la posición y tamaño del mate dentro
    // de cada foto. Las animaciones (crecimiento, rotación, transiciones)
    // deben SIEMPRE respetar estos valores como anchor.
    //
    // El mate emerge SIEMPRE al tamaño calibrado (matchea exactamente la
    // foto). Después crece un poquito (BUMP_FACTOR) mientras rota libre
    // en el dark. Antes de entrar a la próxima foto vuelve al calibrado
    // para que el "metido" en la foto sea limpio. La calibración NUNCA
    // se altera — el bump es transitorio dentro de la fase oscura.
    //
    // ┌─────────────────────────────────────────────────────────────────┐
    // │  REGLA de ejes:                                                 │
    // │   - TAMAÑO  → más alto = más grande, más bajo = más chico       │
    // │   - POSICIÓN (vh) → positivo BAJA el mate, negativo lo SUBE     │
    // │   - POSICION_X (vw) → positivo DERECHA, negativo IZQUIERDA      │
    // │   - 1vh ≈ 7.7px / 1vw ≈ 19px en pantalla 1920x1080              │
    // └─────────────────────────────────────────────────────────────────┘

    //   ┌─── STEP 1 ──────────────────────────────────────────────────────
    //   │ Modelo:   mate-3d-1-torno.glb (CRUDO — porongo recién cortado)
    //   │ Foto:     proceso-fondo1.png (porongo colgando del parral)
    //   │ Texto:    "Corte y lavado"
    //   └─────────────────────────────────────────────────────────────────
    const STEP1_CRUDO_TAMAÑO     = 1.2;   // ← TAMAÑO del mate 3D crudo
    const STEP1_CRUDO_POSICION   = 10;   // ← POSICIÓN Y (vh) del mate 3D crudo
    const STEP1_CRUDO_POSICION_X = 0;     // ← POSICIÓN X (vw) — negativo izquierda, positivo derecha

    //   ┌─── STEP 2 ──────────────────────────────────────────────────────
    //   │ Modelo:   mate-3d-2-lija.glb (LIJADO — pulido en el torno)
    //   │ Foto:     proceso-fondo2.png (taller con mate sobre la mesa)
    //   │ Texto:    "El torno y la lija"
    //   └─────────────────────────────────────────────────────────────────
    const STEP2_LIJADO_TAMAÑO     = 1.1;  // ← TAMAÑO del mate 3D lijado
    const STEP2_LIJADO_POSICION   = 5;// ← POSICIÓN Y (vh) del mate 3D lijado
    const STEP2_LIJADO_POSICION_X = -1;    // ← POSICIÓN X (vw) — negativo izquierda, positivo derecha

    //   ┌─── STEP 3 ──────────────────────────────────────────────────────
    //   │ Modelo:   mate-meshy-amber.glb (FINAL — barnizado con virola)
    //   │ Foto:     proceso-fondo3.png (2 personas con mate sobre la mesa)
    //   │ Texto:    "Barnizado y virola"
    //   └─────────────────────────────────────────────────────────────────
    const STEP3_FINAL_TAMAÑO     = 0.8;  // ← TAMAÑO del mate 3D final
    const STEP3_FINAL_POSICION   = 10;    // ← POSICIÓN Y (vh) del mate 3D final
    const STEP3_FINAL_POSICION_X = 0.2;     // ← POSICIÓN X (vw) — negativo izquierda, positivo derecha

    // ════════════════════════════════════════════════════════════════════
    // (No tocar lo de abajo — el JS arma los arrays con los valores arriba)
    // ════════════════════════════════════════════════════════════════════
    const stepYOffsets   = [STEP1_CRUDO_POSICION,   STEP2_LIJADO_POSICION,   STEP3_FINAL_POSICION];
    const stepXOffsets   = [STEP1_CRUDO_POSICION_X, STEP2_LIJADO_POSICION_X, STEP3_FINAL_POSICION_X];
    const stepRestScales = [STEP1_CRUDO_TAMAÑO,     STEP2_LIJADO_TAMAÑO,     STEP3_FINAL_TAMAÑO];

    // Crecimiento sutil DURANTE la rotación en el dark (entre fotos).
    // El mate emerge a calibrado (matchea foto), crece a calibrado*BUMP
    // mientras rota libre, y vuelve a calibrado para "meterse" en la
    // próxima foto. NUNCA altera la calibración de anclaje con la foto.
    // 1.08 = +8% — suficiente para vender "se despegó y respira", poco
    // para no romper la lectura de tamaño del mate.
    const BUMP_FACTOR = 1.08;

    // ═══════════════════════════════════════════════════════════════════
    // ░░░░░░░░░░░░░░░░░░░░░ APPLY PROGRESS (VIDEO) ░░░░░░░░░░░░░░░░░░░░░
    // ═══════════════════════════════════════════════════════════════════
    // Reescrita para scrubear un <video> con scroll. Reemplaza al sistema
    // anterior de 3D mate + 6 capas de fotos (todo el bloque viejo queda
    // comentado abajo para revertir fácil).
    //
    // RESPONSABILIDADES:
    //   1) Scrubear video.currentTime con el progreso del scroll (lineal).
    //   2) Cambiar el contenido del texto (changeStep) en los límites
    //      de cada step, en el momento "valle" donde el texto está oculto.
    //   3) Controlar opacity de texto + indicador para que aparezcan
    //      durante el "núcleo" de cada step y se oculten en los bordes
    //      (transiciones entre steps van limpias, sin texto encima).
    //   4) Actualizar la barra de progreso global.
    //
    // SCROLL → VIDEO MAPPING:
    //   Lineal: video.currentTime = video.duration * p
    //   El scrub se siente fluido porque ScrollTrigger usa scrub:0.4
    //   (interpola el progreso entre frames de scroll).
    //
    // TEXTO POR STEP:
    //   0.00..0.20  hidden (apenas entró el step — el ojo lee el video)
    //   0.20..0.30  fade-in
    //   0.30..0.75  visible
    //   0.75..0.88  fade-out
    //   0.88..1.00  hidden (transición al próximo step)
    // ═══════════════════════════════════════════════════════════════════
    function applyProgress(p) {
      p = Math.max(0, Math.min(1, p));

      // [DESHABILITADO — scrub de video con scroll]
      // El video ahora se reproduce SOLO (autoplay loop). Hacer scrub
      // contra autoplay fightearía y daría flicker. Si querés volver al
      // scrub: descomentar la línea de abajo + sacar autoplay del HTML.
      // if (procesoVideo && procesoVideo.duration && !isNaN(procesoVideo.duration)) {
      //   procesoVideo.currentTime = procesoVideo.duration * p;
      // }

      // Step cálculo — se usa para el cambio de texto y la opacity overlay
      const stepRaw    = p * stepCount;
      const step       = Math.max(0, Math.min(stepCount - 1, Math.floor(stepRaw - 0.0001)));
      // Texto: cambia 0.08 ANTES del límite — cae en la fase oculta del
      // step saliente (texto opacity ya = 0), así el reveal del siguiente
      // arranca durante el dark profundo y no se ve "saltar" el contenido.
      const modelStepF = Math.max(0, Math.min(stepCount - 1, Math.floor(stepRaw + 0.08 - 0.0001)));
      changeStep(Math.max(0, modelStepF));

      const stepProgress = Math.max(0, Math.min(1, stepRaw - step));
      const isLastStep   = step === stepCount - 1;
      const isFirstStep  = step === 0;

      // ─── EASINGS ────────────────────────────────────────────────────
      const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // ─── TEXTO + INDICADOR — visibles en el núcleo de cada step ─────
      // El video sigue corriendo sin pausas, pero el texto solo se
      // muestra en el ~50% central de cada step. Eso deja "respiros"
      // limpios entre steps donde el video se ve sin overlays.
      //
      //   0.00..0.20  hidden  (entrando — dejá leer el video)
      //   0.20..0.30  fade-in (easeInOutCubic)
      //   0.30..0.75  visible
      //   0.75..0.88  fade-out
      //   0.88..1.00  hidden  (salida — preparando próximo step)
      let textOpacity = 0;
      if (stepProgress >= 0.20 && stepProgress < 0.30) {
        textOpacity = easeInOutCubic((stepProgress - 0.20) / 0.10);
      } else if (stepProgress >= 0.30 && stepProgress < 0.75) {
        textOpacity = 1;
      } else if (stepProgress >= 0.75 && stepProgress < 0.88) {
        textOpacity = 1 - easeInOutCubic((stepProgress - 0.75) / 0.13);
      }
      if (copyLeftEl)  copyLeftEl.style.opacity  = textOpacity.toFixed(3);
      if (copyRightEl) copyRightEl.style.opacity = textOpacity.toFixed(3);

      // Barra de progreso global (dentro de copy-right; hereda su opacity).
      if (barFill) barFill.style.transform = "scaleX(" + p + ")";
    }

    /* ─────────── [DESHABILITADO — applyProgress del sistema 3D] ─────
       Toda la lógica que sigue manejaba el sistema de 6 capas de fotos
       + 3 mate 3D con cross-fades. Se mantiene comentada para revertir.
       Para reactivar: borrar esta capa + el applyProgress de arriba +
       descomentar los queries (models, bgLayerEls) + el changeModel.
    function applyProgress_OLD_3D(p) {
      p = Math.max(0, Math.min(1, p));
      const stepRaw    = p * stepCount;
      const step       = Math.max(0, Math.min(stepCount - 1, Math.floor(stepRaw - 0.0001)));
      const modelStepF = Math.max(0, Math.min(stepCount - 1, Math.floor(stepRaw + 0.08 - 0.0001)));
      changeStep(Math.max(0, modelStepF));
      changeModel(Math.max(0, modelStepF));
      const stepProgress = Math.max(0, Math.min(1, stepRaw - step));
      const isLastStep   = step === stepCount - 1;
      const isFirstStep  = step === 0;
      const BUMP = BUMP_FACTOR;
      const easeInOutCubic = (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
      const easeOutQuart   = (t) => 1 - Math.pow(1-t, 4);
      // ... (resto del código viejo eliminado por brevedad — git history lo conserva)
    }
    ──────────────────────────────────────────────────────────────── */

    // ─── VIDEO AUTOPLAY + INTERSECTION OBSERVER + TÍTULO INTRO ──────
    // El video tiene autoplay+loop+muted en el HTML (autoplay solo funciona
    // muted en browsers modernos). El IO pausa el video cuando NO está en
    // viewport (ahorra batería + decoder) y lo reanuda al volver.
    //
    // El título overlay aparece SOLO la primera vez que la sección entra
    // al viewport: fade-in suave, queda 4.5s visible, luego fade-out. Una
    // vez mostrado, nunca vuelve (la bandera titleHasShown lo evita) —
    // así el video corre limpio en revisitas o scroll back.
    const titleOverlay = document.querySelector(".proceso-3d__title-overlay");
    let titleHasShown = false;
    function showTitleOnce() {
      if (titleHasShown || !titleOverlay) return;
      titleHasShown = true;
      // Pequeño retraso para que el video tenga tiempo de empezar a
      // renderizar antes que aparezca el título — match más cinemático.
      setTimeout(() => {
        titleOverlay.classList.add("is-visible");
        // Sólo 2s visible — pedido del cliente para no robarle protagonismo
        // al video. Después fade-out con la transición CSS 1.2s.
        setTimeout(() => {
          titleOverlay.classList.remove("is-visible");
        }, 2000);
      }, 300);
    }

    if (procesoVideo) {
      // Asegurarse que arranque (autoplay puede ser bloqueado en algunos
      // contextos). Llamamos play() explícito como respaldo.
      const tryPlay = () => {
        const playPromise = procesoVideo.play();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise.catch((err) => {
            console.info("[JIcrea] proceso video: autoplay diferido", err && err.name);
          });
        }
      };
      if (procesoVideo.readyState >= 2) tryPlay();
      else procesoVideo.addEventListener("loadeddata", tryPlay, { once: true });

      // IntersectionObserver: pausa cuando sale del viewport, reanuda al
      // entrar. Además dispara el título intro la primera vez que entra.
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (procesoVideo.paused) tryPlay();
              showTitleOnce();
            } else {
              if (!procesoVideo.paused) procesoVideo.pause();
            }
          });
        }, { threshold: 0.25 });
        io.observe(proceso3D);
      } else {
        // Fallback sin IntersectionObserver: mostrar título al cargar.
        showTitleOnce();
      }
    }

    // ─── MUTE TOGGLE ────────────────────────────────────────────────
    // Botón sutil bottom-right del proceso. Toggle muted del video con
    // estado visual sincronizado vía aria-pressed (CSS reacciona).
    const muteToggleBtn = document.getElementById("procesoMuteToggle");
    if (muteToggleBtn && procesoVideo) {
      muteToggleBtn.addEventListener("click", () => {
        const willMute = !procesoVideo.muted;
        procesoVideo.muted = willMute;
        muteToggleBtn.setAttribute("aria-pressed", String(!willMute));
        muteToggleBtn.setAttribute("aria-label", willMute ? "Activar sonido" : "Silenciar");
        // Si vamos a unmute y el video estaba pausado por IO, reanudar
        if (!willMute && procesoVideo.paused) {
          procesoVideo.play().catch(() => {});
        }
      });
    }

    // ScrollTrigger es compatible con Lenis. El scroll nativo no se dispara
    // cuando Lenis intercepta el wheel — ScrollTrigger sí escucha al RAF de
    // Lenis y dispara onUpdate con el progreso real.
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: proceso3D,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.4,
        onUpdate: (self) => applyProgress(self.progress)
      });
    } else {
      // Fallback sin GSAP
      window.addEventListener("scroll", () => {
        const rect = proceso3D.getBoundingClientRect();
        const total = proceso3D.offsetHeight - window.innerHeight;
        applyProgress(total > 0 ? -rect.top / total : 0);
      }, { passive: true });
    }

    applyProgress(0);
  }

});
