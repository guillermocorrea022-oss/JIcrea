document.addEventListener("DOMContentLoaded", () => {
  // ═══════════════════════════════════════════════════════════════════
  // ░░░░░░░░░░░░░ AOS — Entry animations site-wide ░░░░░░░░░░░░░░░░░░
  // ═══════════════════════════════════════════════════════════════════
  // Sistema AOS-like nativo con IntersectionObserver. Aplica .aos-in
  // a cualquier elemento con [data-aos] cuando entra al viewport.
  // El CSS hace el resto (transforms + opacity transition).
  // Soporta data-aos-delay="ms" para escalonar grupos.
  (function initAOS(){
    const items = document.querySelectorAll("[data-aos]");
    if (!items.length || !("IntersectionObserver" in window)) {
      // Fallback: mostrar todo de una si no hay IO support
      items.forEach(el => el.classList.add("aos-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.getAttribute("data-aos-delay") || "0", 10);
          if (delay > 0) {
            setTimeout(() => el.classList.add("aos-in"), delay);
          } else {
            el.classList.add("aos-in");
          }
          io.unobserve(el);  // un solo trigger, no se re-ejecuta al volver
        }
      });
    }, {
      rootMargin: "0px 0px -10% 0px",  // dispara un poco antes del bottom
      threshold: 0.05
    });
    items.forEach(el => io.observe(el));
  })();

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

  // 3) Fade out el curtain. Doble requestAnimationFrame es más confiable
  //    que setTimeout — garantiza que el primer paint haya pintado el
  //    curtain en estado inicial (opacity:1) antes de activar la
  //    transición hacia opacity:0. Esto evita el "salto" que se siente
  //    cuando el delay es muy corto y la transición no llega a engancharse.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      curtain.classList.add("is-hidden");
    });
  });

  // 4) Navegación entre páginas — al click en un link interno, mostramos
  //    el curtain de nuevo (fade in 500ms) y navegamos cuando casi
  //    completó (~440ms = 88%). Antes era 320ms (~60%) y se cortaba antes
  //    de que el curtain terminara de aparecer → flash visible de la
  //    página anterior justo antes del nav.
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
      setTimeout(() => { window.location.href = target; }, 440);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // HAMBURGER + MOBILE MENU — toggle del overlay full-screen.
  // ─────────────────────────────────────────────────────────────────
  // El mobile-menu vive como sibling del header, fixed full-screen.
  // Hamburger toggle: agrega .is-open al menú + .menu-open al body
  // (que bloquea scroll). Cierra al hacer click en X, en cualquier
  // link interno del menú, o con tecla Escape.
  (function initMobileMenu(){
    const ham   = document.getElementById("hamburger");
    const menu  = document.getElementById("mobileMenu");
    const close = document.getElementById("mobileMenuClose");
    const langMobile = document.getElementById("i18nToggleMobile");
    if (!ham || !menu) return;

    function openMenu(){
      menu.classList.add("is-open");
      menu.removeAttribute("inert");
      menu.setAttribute("aria-hidden", "false");
      ham.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
    }
    function closeMenu(){
      menu.classList.remove("is-open");
      menu.setAttribute("inert", "");
      menu.setAttribute("aria-hidden", "true");
      ham.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }

    ham.addEventListener("click", () => {
      if (menu.classList.contains("is-open")) closeMenu(); else openMenu();
    });
    if (close) close.addEventListener("click", closeMenu);
    // Click en cualquier link interno cierra el menú (la navegación
    // la gestiona el page-curtain transition arriba).
    menu.querySelectorAll(".mobile-menu__link").forEach(a => {
      a.addEventListener("click", () => {
        // Pequeño delay para que la transición del curtain se vea
        setTimeout(closeMenu, 50);
      });
    });
    // Esc cierra
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) closeMenu();
    });
    // El toggle de idioma mobile dispara el mismo evento que el desktop
    if (langMobile) {
      langMobile.addEventListener("click", () => {
        const desktop = document.getElementById("i18nToggle");
        if (desktop) desktop.click();
        // Actualizar el texto del botón mobile para reflejar el nuevo estado
        setTimeout(() => {
          if (desktop) langMobile.textContent = desktop.textContent;
        }, 50);
      });
      // Sincronizar el texto inicial con el del desktop
      const desktop = document.getElementById("i18nToggle");
      if (desktop) {
        // Esperar a que i18n haya inicializado
        setTimeout(() => { langMobile.textContent = desktop.textContent; }, 200);
      }
    }
  })();

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
      // 3 estados: dark (tierra negro / leaf verde profundo / dark-leaf),
      // light (crudo) y leather (cuero terracotta). Las secciones verdes
      // oscuras también necesitan nav cream para legibilidad — por eso
      // las agrupamos junto con 'dark' en la misma clase is-dark-bg.
      const isDark = (currentBg === 'dark' || currentBg === 'leaf' || currentBg === 'dark-leaf');
      header.classList.toggle('is-dark-bg', isDark);
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

  // ─────────────────────────────────────────────────────────────────
  // SMART HEADER (PC only) — ocultar al scroll-down, mostrar al up
  // ─────────────────────────────────────────────────────────────────
  // Comportamiento clásico tipo Medium/Squarespace. Solo en desktop
  // (>900px) — mobile mantiene el header siempre visible por el blur
  // backdrop. Excepción: cuando estamos sobre un hero (la sección
  // .hero), el header SIEMPRE se mantiene visible — los heroes son
  // la "primera impresión" y queremos navegación accesible ahí.
  (function initSmartHeader(){
    const header = document.getElementById("header");
    if (!header) return;
    const mqDesktop = window.matchMedia("(min-width: 901px)");
    const SCROLL_THRESHOLD = 80;  // px que tiene que scrollear hasta empezar a esconder
    const SCROLL_DELTA = 8;       // mínimo delta entre frames para considerar "scroll"
    let lastScrollY = window.scrollY;
    let ticking = false;

    function isOverHero() {
      // Si la última sección con .hero todavía toca la zona del header
      // (top <= header height), seguimos sobre el hero → header visible.
      const heroes = document.querySelectorAll(".hero");
      const headerH = header.offsetHeight || 80;
      for (const h of heroes) {
        const r = h.getBoundingClientRect();
        if (r.top <= headerH && r.bottom > headerH) return true;
      }
      return false;
    }

    function update() {
      ticking = false;
      // Solo aplicamos el smart-hide en desktop
      if (!mqDesktop.matches) {
        header.classList.remove("is-hidden");
        lastScrollY = window.scrollY;
        return;
      }
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      // No reaccionar a micro-scrolls (jitter)
      if (Math.abs(delta) < SCROLL_DELTA) {
        lastScrollY = currentY;
        return;
      }
      // Cerca del top o sobre un hero → siempre visible
      if (currentY < SCROLL_THRESHOLD || isOverHero()) {
        header.classList.remove("is-hidden");
      } else if (delta > 0) {
        // Scroll DOWN → ocultar
        header.classList.add("is-hidden");
      } else {
        // Scroll UP → mostrar
        header.classList.remove("is-hidden");
      }
      lastScrollY = currentY;
    }

    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    // Cuando cambia el viewport (resize / rotación), reset
    function handleMQ() {
      if (!mqDesktop.matches) header.classList.remove("is-hidden");
    }
    if (mqDesktop.addEventListener) mqDesktop.addEventListener("change", handleMQ);
    else if (mqDesktop.addListener) mqDesktop.addListener(handleMQ);
  })();

  // ─────────────────────────────────────────────────────────────────
  // PROCESO VIDEO — swap mobile/desktop via JS
  // ─────────────────────────────────────────────────────────────────
  // Chrome no respeta <source media> en <video> de forma confiable
  // (a diferencia de <picture>) ni en load ni al resize del devtools.
  // Solución: matchMedia + setter del src directo. Re-evalúa también
  // en resize por si el usuario rota el celu o usa el inspector.
  (function initProcesoVideo(){
    const video = document.getElementById("procesoVideo");
    if (!video) return;
    const mobileSrc = video.dataset.srcMobile;
    const desktopSrc = video.dataset.srcDesktop;
    if (!mobileSrc || !desktopSrc) return;

    const mq = window.matchMedia("(max-width: 768px)");
    let lastSrc = "";

    function setSrc() {
      const target = mq.matches ? mobileSrc : desktopSrc;
      if (target === lastSrc) return;
      lastSrc = target;
      // Reemplaza el contenido del <video> con un solo <source> nuevo,
      // después llama load() para que el browser re-fetchee el src
      // correcto. play() después porque load() lo pausa.
      video.innerHTML = `<source src="${target}" type="video/mp4">`;
      video.load();
      // autoplay puede fallar si el user no interactuó — lo ignoramos
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    }
    setSrc();
    // Cambio de viewport (resize / rotación / devtools toggle)
    if (mq.addEventListener) mq.addEventListener("change", setSrc);
    else if (mq.addListener) mq.addListener(setSrc); /* legacy iOS */
  })();

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
  // 10. PROCESO — sección con video cinemático + título intro.
  //
  // El sistema viejo (3D model-viewer + scrub + 6 capas de fotos) fue
  // reemplazado por un solo <video> autoplay+loop+muted. Este bloque solo
  // maneja: (1) play/pause con IntersectionObserver, (2) fade-in/out del
  // título overlay la primera vez que la sección entra al viewport.
  // ============================================================================
  const proceso3D = document.querySelector(".proceso-3d");
  if (proceso3D) {
    const procesoVideo = document.getElementById("procesoVideo");
    const titleOverlay = document.querySelector(".proceso-3d__title-overlay");

    // Título intro — aparece SOLO la primera vez que la sección entra al
    // viewport: fade-in suave, 2s visible, luego fade-out con la transición
    // CSS. Después nunca vuelve (titleHasShown lo evita).
    let titleHasShown = false;
    function showTitleOnce() {
      if (titleHasShown || !titleOverlay) return;
      titleHasShown = true;
      setTimeout(() => {
        titleOverlay.classList.add("is-visible");
        setTimeout(() => {
          titleOverlay.classList.remove("is-visible");
        }, 2000);
      }, 300);
    }

    if (procesoVideo) {
      // Autoplay puede ser bloqueado por el browser — llamamos play()
      // explícito como respaldo + cuando el video tiene data lista.
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

      // IntersectionObserver: pausa fuera del viewport (ahorra batería) y
      // dispara el título intro la primera vez que la sección entra.
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
        showTitleOnce();
      }
    }
  }

});
