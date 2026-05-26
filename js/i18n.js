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
   - Para agregar más strings: sumar al objeto TRANSLATIONS (mismas keys
     en ambos idiomas) y poner data-i18n="key" en el HTML.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  const STORAGE_KEY = "jicrea_lang";
  const DEFAULT_LANG = "es";

  // ─────────── Diccionario ───────────
  // Mantenemos las keys cortas y semánticas. Los valores admiten HTML
  // simple (por ejemplo <em>) para mantener el styling cuando se
  // intercala con clases como .text-accent-green.
  const TRANSLATIONS = {
    es: {
      // Navbar
      "nav.home":          "Inicio",
      "nav.shop":          "Tienda",
      "nav.process":       "Proceso",
      "nav.customize":     "Personalizá tu mate",
      "nav.history":       "Nuestra Historia",

      // Hero index
      "hero.eyebrow":      "— Productores uruguayos",
      "hero.title.l1":     "DEL CAMPO",
      "hero.title.l2":     "A TUS MANOS",
      "hero.subtitle":     "Del porongo natural al mate terminado. Una pieza hecha con tiempo, oficio y origen.",
      "hero.cta":          "Conocé el proceso",

      // Hero tienda
      "shop.hero.title.l1":  "PIEZAS",
      "shop.hero.title.l2":  "HECHAS A MANO",
      "shop.hero.subtitle":  "Mates, posa mates, materas y yerberos. Una pieza para cada momento.",
      "shop.hero.cta":       "Ver los productos",
      "shop.ship":           "Envío gratis en compras de más de $2.500",
      "shop.search":         "Buscar productos...",
      "shop.filter.all":     "Todos",

      // Hero nuestra historia
      "history.hero.eyebrow":  "— Desde 2015",
      "history.hero.title.l1": "NUESTRA",
      "history.hero.title.l2": "HISTORIA",
      "history.hero.subtitle": "Productores uruguayos. Hecho a mano en Paysandú, con los tiempos que pide el oficio.",
      "history.hero.cta":      "Conocé el origen",

      // Configurador
      "cfg.eyebrow":       "— Diseñá tu mate",
      "cfg.title":         "Armá tu mate paso a paso.",
      "cfg.lead":          "Elegí cada pieza — base, virola, bombilla y grabado. Te armamos un mate único y lo coordinamos por WhatsApp.",
      "cfg.cta":           "Pedir mi mate",

      // 404
      "404.title.l1":      "Te perdiste",
      "404.title.l2":      "en el campo.",
      "404.sub":           "La página que buscás no existe — o se la llevó el viento. Volvé al taller y empezamos de nuevo.",
      "404.back":          "Volver al inicio",
      "404.shop":          "Ir a la tienda",

      // Footer
      "footer.contact":    "Contacto",
      "footer.menu":       "Menu",
      "footer.where":      "Dónde estamos",
      "footer.shop":       "Tienda",
      "footer.tagline":    "Del campo a tus manos.",

      // Cookies
      "cookies.text":      "Usamos cookies para que tu experiencia sea mejor. Sin trampas, sólo lo necesario.",
      "cookies.accept":    "Aceptar",
      "cookies.dismiss":   "Más tarde",

      // Lang toggle
      "lang.toggle":       "EN",
    },
    en: {
      "nav.home":          "Home",
      "nav.shop":          "Shop",
      "nav.process":       "Process",
      "nav.customize":     "Customize",
      "nav.history":       "Our Story",

      "hero.eyebrow":      "— Uruguayan craftsmen",
      "hero.title.l1":     "FROM THE FIELD",
      "hero.title.l2":     "TO YOUR HANDS",
      "hero.subtitle":     "From the natural porongo to the finished mate. A piece made with time, craft and origin.",
      "hero.cta":          "Discover the process",

      "shop.hero.title.l1":  "PIECES",
      "shop.hero.title.l2":  "MADE BY HAND",
      "shop.hero.subtitle":  "Mates, coasters, mate bags and yerba holders. A piece for every moment.",
      "shop.hero.cta":       "See the products",
      "shop.ship":           "Free shipping on orders over $2,500 UYU",
      "shop.search":         "Search products...",
      "shop.filter.all":     "All",

      "history.hero.eyebrow":  "— Since 2015",
      "history.hero.title.l1": "OUR",
      "history.hero.title.l2": "STORY",
      "history.hero.subtitle": "Uruguayan craftsmen. Handmade in Paysandú, at the pace the craft requires.",
      "history.hero.cta":      "Discover the origin",

      "cfg.eyebrow":       "— Design your mate",
      "cfg.title":         "Build your mate step by step.",
      "cfg.lead":          "Choose every piece — base, ring, bombilla and engraving. We craft a unique mate and coordinate via WhatsApp.",
      "cfg.cta":           "Order my mate",

      "404.title.l1":      "You got lost",
      "404.title.l2":      "in the field.",
      "404.sub":           "The page you're looking for doesn't exist — or the wind carried it away. Head back to the workshop.",
      "404.back":          "Back to home",
      "404.shop":          "Go to shop",

      "footer.contact":    "Contact",
      "footer.menu":       "Menu",
      "footer.where":      "Where we are",
      "footer.shop":       "Shop",
      "footer.tagline":    "From the field to your hands.",

      "cookies.text":      "We use cookies to make your experience better. No tricks, just the basics.",
      "cookies.accept":    "Accept",
      "cookies.dismiss":   "Later",

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
      // Si tiene data-i18n-attr, traduce ese atributo. Si no, textContent.
      // data-i18n-attr admite múltiples atributos separados por coma.
      const attr = el.getAttribute("data-i18n-attr");
      if (attr) {
        attr.split(",").forEach(a => el.setAttribute(a.trim(), val));
      } else {
        // Para .line spans con data-text (animación char-mask), seteamos
        // data-text en vez de textContent para no romper el reveal.
        if (el.classList.contains("line") && el.hasAttribute("data-text")) {
          el.setAttribute("data-text", val);
          // Si el span ya fue procesado por GSAP (tiene un .line-inner adentro),
          // actualizamos su textContent también.
          const inner = el.querySelector(".line-inner");
          if (inner) inner.textContent = val;
        } else {
          el.innerHTML = val;
        }
      }
    });
    // Actualiza el botón toggle (muestra el OTRO idioma).
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

    // Toggle button — busca cualquier elemento con #i18nToggle
    const toggle = document.getElementById("i18nToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const current = getLang();
        const next = current === "es" ? "en" : "es";
        setLang(next);
      });
    }
  });

  // Expose globally por si alguna feature quiere leerlo
  window.JIcrea_i18n = { getLang, setLang, TRANSLATIONS };
})();
