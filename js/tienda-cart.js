/* ════════════════════════════════════════════════════════════════════════
   TIENDA — Carrito + modal de cantidad + notificación + isla flotante
   ════════════════════════════════════════════════════════════════════════
   FLUJO:
   1. Click "Agregar al carrito"  → abre modal de cantidad
   2. Usuario elige cantidad      → confirma
   3. Se agrega al carrito        → notificación cuero arriba-der
                                     con total y CTA "Finalizar compra"
   4. Notificación se va sola tras 5s OR al click "Seguir mirando"
   5. "Finalizar compra"          → abre carrito drawer
   6. En el drawer, total general + botón WhatsApp con el pedido completo
   ════════════════════════════════════════════════════════════════════════ */

(() => {
  const WA_PHONE = "59898507241";
  const STORAGE_KEY = "jicrea_cart_v2";

  // ─────────── Estado ───────────
  let cart = []; // [{ id, name, price, qty }]
  let pendingProduct = null; // producto en el modal de cantidad
  let pendingQty = 1;

  // ─────────── DOM refs ───────────
  const cartBtn      = document.getElementById("cartBtn");
  const cartCount    = document.getElementById("cartCount");
  const cartEl       = document.getElementById("cart");
  const cartBackdrop = document.getElementById("cartBackdrop");
  const cartClose    = document.getElementById("cartClose");
  const cartList     = document.getElementById("cartList");
  const cartEmpty    = document.getElementById("cartEmpty");
  const cartCheckout = document.getElementById("cartCheckout");
  const cartTotalAmount = document.getElementById("cartTotalAmount");

  // Modal cantidad
  const qtyModal      = document.getElementById("qtyModal");
  const qtyModalBack  = document.getElementById("qtyModalBackdrop");
  const qtyModalClose = document.getElementById("qtyModalClose");
  const qtyMinus      = document.getElementById("qtyMinus");
  const qtyPlus       = document.getElementById("qtyPlus");
  const qtyValue      = document.getElementById("qtyValue");
  const qtyConfirm    = document.getElementById("qtyConfirm");
  const qtyModalImg   = document.getElementById("qtyModalImg");
  const qtyModalName  = document.getElementById("qtyModalName");
  const qtyModalPrice = document.getElementById("qtyModalPrice");
  const qtySubtotal   = document.getElementById("qtySubtotal");

  // Notificación
  const cartNotif    = document.getElementById("cartNotif");
  const notifTitle   = document.getElementById("notifTitle");
  const notifDetail  = document.getElementById("notifDetail");
  const notifTotal   = document.getElementById("notifTotal");
  const notifKeep    = document.getElementById("notifKeep");
  const notifCheckout = document.getElementById("notifCheckout");

  // Isla flotante
  const floatingIsland = document.getElementById("floatingIsland");

  // ─────────── Persistencia ───────────
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) cart = JSON.parse(raw);
    } catch (e) { cart = []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) {}
  }

  // ─────────── Formato precios ───────────
  function fmt(n) {
    return "$" + Math.round(n).toLocaleString("es-UY");
  }
  function totalQty() {
    return cart.reduce((s, it) => s + it.qty, 0);
  }
  function totalPrice() {
    return cart.reduce((s, it) => s + (it.price || 0) * it.qty, 0);
  }

  // ─────────── Mutaciones ───────────
  function addItem(id, name, price, qty, img) {
    const existing = cart.find(it => it.id === id);
    if (existing) {
      existing.qty += qty;
      // Si el item legacy en localStorage no tiene .img, le seteamos
      // la del producto para que se muestre el thumb correctamente.
      if (img && !existing.img) existing.img = img;
    } else {
      cart.push({ id, name, price, qty, img });
    }
    save();
    renderCart();
    pulseCount();
  }
  function changeQty(id, delta) {
    const item = cart.find(it => it.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(it => it.id !== id);
    save();
    renderCart();
  }
  function removeItem(id) {
    cart = cart.filter(it => it.id !== id);
    save();
    renderCart();
  }

  // ─────────── Render cart drawer ───────────
  function renderCart() {
    const tq = totalQty();
    const tp = totalPrice();

    cartCount.textContent = tq;
    cartCount.classList.toggle("is-visible", tq > 0);

    cartList.innerHTML = "";
    if (cart.length === 0) {
      cartEmpty.style.display = "block";
      cartList.style.display = "none";
      cartCheckout.disabled = true;
      if (cartTotalAmount) cartTotalAmount.textContent = "$0";
    } else {
      cartEmpty.style.display = "none";
      cartList.style.display = "flex";
      cartCheckout.disabled = false;
      if (cartTotalAmount) cartTotalAmount.textContent = fmt(tp);
      cart.forEach(item => {
        const li = document.createElement("li");
        li.className = "cart-item";
        // Si el item no trae .img (carrito legacy en localStorage), usamos
        // un placeholder transparente — no rompe el layout.
        const imgSrc = item.img ? escapeHtml(item.img) : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>";
        li.innerHTML = `
          <div class="cart-item__thumb"><img src="${imgSrc}" alt="${escapeHtml(item.name)}" loading="lazy"></div>
          <div class="cart-item__info">
            <span class="cart-item__name">${escapeHtml(item.name)}</span>
            <span class="cart-item__price">${fmt(item.price)} c/u</span>
          </div>
          <div class="cart-item__qty">
            <button class="cart-item__qty-btn" data-action="minus" data-id="${item.id}" aria-label="Restar">−</button>
            <span class="cart-item__qty-value">${item.qty}</span>
            <button class="cart-item__qty-btn" data-action="plus" data-id="${item.id}" aria-label="Sumar">+</button>
          </div>
          <button class="cart-item__remove" data-action="remove" data-id="${item.id}" aria-label="Quitar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        `;
        cartList.appendChild(li);
      });
    }
  }
  function pulseCount() {
    cartCount.classList.remove("is-pulse");
    void cartCount.offsetWidth;
    cartCount.classList.add("is-pulse");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
  }

  // ─────────── Drawer ───────────
  function openCart() {
    cartEl.classList.add("is-open");
    cartEl.setAttribute("aria-hidden", "false");
    cartBackdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    cartEl.classList.remove("is-open");
    cartEl.setAttribute("aria-hidden", "true");
    cartBackdrop.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  // ─────────── Modal de cantidad ───────────
  function openQtyModal(productData) {
    pendingProduct = productData;
    pendingQty = 1;
    qtyModalImg.src = productData.img || "";
    qtyModalName.textContent = productData.name;
    qtyModalPrice.textContent = fmt(productData.price);
    qtyValue.textContent = pendingQty;
    qtySubtotal.textContent = fmt(productData.price);
    qtyModal.classList.add("is-open");
    qtyModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeQtyModal() {
    qtyModal.classList.remove("is-open");
    qtyModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    pendingProduct = null;
  }
  function updateQtyModal() {
    qtyValue.textContent = pendingQty;
    if (pendingProduct) qtySubtotal.textContent = fmt(pendingProduct.price * pendingQty);
  }
  function confirmQty() {
    if (!pendingProduct) return;
    addItem(pendingProduct.id, pendingProduct.name, pendingProduct.price, pendingQty, pendingProduct.img);
    const addedQty = pendingQty;
    const addedName = pendingProduct.name;
    const addedImg = pendingProduct.img;
    const addedSubtotal = pendingProduct.price * pendingQty;
    closeQtyModal();
    showNotif(addedName, addedQty, addedSubtotal, addedImg);
  }

  // ─────────── Notificación ───────────
  let notifTimer = null;
  function showNotif(name, qty, subtotal, img) {
    notifTitle.textContent = "Agregado al carrito";
    notifDetail.textContent = `${qty}× ${name} · ${fmt(subtotal)}`;
    notifTotal.textContent = fmt(totalPrice());
    // Set la imagen del producto en el thumb de la notificación.
    // El #notifImg lo agregamos al HTML en su sección .cart-notif__thumb.
    const notifImg = document.getElementById("notifImg");
    if (notifImg && img) {
      notifImg.src = img;
      notifImg.alt = name;
      notifImg.style.display = "block";
    } else if (notifImg) {
      notifImg.style.display = "none";
    }
    cartNotif.classList.add("is-visible");
    clearTimeout(notifTimer);
    notifTimer = setTimeout(hideNotif, 6000);
  }
  function hideNotif() {
    cartNotif.classList.remove("is-visible");
    clearTimeout(notifTimer);
  }

  // ─────────── Checkout WhatsApp ───────────
  function checkout() {
    if (cart.length === 0) return;
    const lines = ["Hola JIcrea! Quiero hacer este pedido:", ""];
    cart.forEach(item => {
      lines.push(`• ${item.qty}× ${item.name}  —  ${fmt(item.price)} c/u`);
    });
    lines.push("");
    lines.push(`Total estimado: ${fmt(totalPrice())} (${totalQty()} unidad${totalQty() === 1 ? "" : "es"})`);
    lines.push("");
    lines.push("¿Cómo coordinamos la entrega y el pago?");
    const msg = encodeURIComponent(lines.join("\n"));
    window.open("https://wa.me/" + WA_PHONE + "?text=" + msg, "_blank", "noopener");
  }

  // ─────────── Categorías dinámicas ───────────
  // Lee tiendaCategoriesData (JSON inline) y devuelve el array.
  // Si no existe (o falla parseo), devuelve []. Las features dependientes
  // (floating-island, filters) hacen no-op cuando no hay data.
  function loadCategoriesData() {
    const node = document.getElementById("tiendaCategoriesData");
    if (!node) return [];
    try {
      const data = JSON.parse(node.textContent || "[]");
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[JIcrea] tiendaCategoriesData parse error:", e);
      return [];
    }
  }

  // Inyecta los links de categoría en el floating-island al principio
  // (antes del separator y de los links Personalizados/Mayoristas).
  function renderFloatingIslandCategories(categories) {
    if (!floatingIsland) return;
    const sep = floatingIsland.querySelector(".floating-island__sep");
    if (!sep) return;
    categories.forEach(cat => {
      const a = document.createElement("a");
      a.href = "#" + cat.slug;
      a.className = "floating-island__link";
      a.setAttribute("data-target", cat.slug);
      a.textContent = cat.name;
      // insertar antes del separator (que está delante de Personalizados)
      floatingIsland.insertBefore(a, sep);
    });
  }

  // Inyecta las filter pills (una por categoría) en el toolbar de tienda.
  // La pill "Todos" ya está en HTML.
  function renderFilterPills(categories) {
    const container = document.getElementById("tiendaFilters");
    if (!container) return;
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tienda-filter";
      btn.setAttribute("data-filter", cat.slug);
      btn.textContent = cat.name;
      container.appendChild(btn);
    });
  }

  // ─────────── Buscador + filtros ───────────
  // Búsqueda por nombre/descripción (case-insensitive). Filter por
  // categoría (slug = id de la <section>). Cuando hay filter activo,
  // se muestran sólo los productos de esa sección. Cuando hay
  // búsqueda activa, se muestran los productos que matchean en
  // CUALQUIER sección visible (respetando el filter activo).
  let activeFilter = "all";
  let activeSearch = "";

  function applySearchAndFilter() {
    const sections = document.querySelectorAll(".seccion-prod");
    const q = activeSearch.toLowerCase().trim();
    let totalVisible = 0;

    sections.forEach(section => {
      const slug = section.id;
      const matchesFilter = activeFilter === "all" || activeFilter === slug;

      if (!matchesFilter) {
        section.style.display = "none";
        return;
      }

      // Sección visible por filter — ahora aplicamos search a sus productos
      let sectionVisible = 0;
      section.querySelectorAll(".prod").forEach(prod => {
        if (!q) {
          prod.style.display = "";
          sectionVisible++;
          return;
        }
        const name = (prod.querySelector(".prod__name")?.textContent || "").toLowerCase();
        const desc = (prod.querySelector(".prod__desc")?.textContent || "").toLowerCase();
        const match = name.includes(q) || desc.includes(q);
        prod.style.display = match ? "" : "none";
        if (match) sectionVisible++;
      });

      // Si la sección no tiene resultados, ocultamos la sección entera
      section.style.display = sectionVisible > 0 ? "" : "none";
      totalVisible += sectionVisible;
    });

    // Empty state cuando no hay resultados
    const emptyEl = document.getElementById("tiendaEmpty");
    if (emptyEl) emptyEl.hidden = totalVisible > 0;
  }

  function initSearchAndFilters() {
    const searchInput = document.getElementById("tiendaSearchInput");
    const searchClear = document.getElementById("tiendaSearchClear");
    const filters = document.getElementById("tiendaFilters");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        activeSearch = searchInput.value;
        if (searchClear) searchClear.hidden = !activeSearch;
        applySearchAndFilter();
      });
    }
    if (searchClear) {
      searchClear.addEventListener("click", () => {
        searchInput.value = "";
        activeSearch = "";
        searchClear.hidden = true;
        applySearchAndFilter();
        searchInput.focus();
      });
    }
    if (filters) {
      filters.addEventListener("click", (e) => {
        const btn = e.target.closest(".tienda-filter");
        if (!btn) return;
        activeFilter = btn.getAttribute("data-filter") || "all";
        filters.querySelectorAll(".tienda-filter").forEach(b => b.classList.toggle("is-active", b === btn));
        applySearchAndFilter();
        // Scroll suave al toolbar para que veas las cards filtradas
        const toolbar = document.querySelector(".tienda-toolbar");
        if (toolbar) {
          const headerH = document.getElementById("header")?.offsetHeight || 0;
          const y = window.scrollY + toolbar.getBoundingClientRect().top - headerH - 20;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      });
    }
  }

  // ─────────── ISLA FLOTANTE — show/hide en scroll up ───────────
  function initFloatingIsland() {
    if (!floatingIsland) return;
    const links = floatingIsland.querySelectorAll(".floating-island__link");
    const targets = Array.from(links)
      .map(l => ({ link: l, el: document.getElementById(l.getAttribute("data-target")) }))
      .filter(t => t.el);

    let lastScroll = window.scrollY;
    let ticking = false;

    function update() {
      const cur = window.scrollY;
      const goingUp = cur < lastScroll;
      // Solo mostrar la isla cuando ya scrolleaste un poco abajo (>500px)
      // y vas hacia arriba. Ocultar cuando vas hacia abajo o estás muy arriba.
      const shouldShow = goingUp && cur > 500;
      floatingIsland.classList.toggle("is-visible", shouldShow);
      lastScroll = cur;

      // Highlight de sección activa
      const offset = window.innerHeight * 0.35;
      let active = null;
      targets.forEach(t => {
        const top = t.el.getBoundingClientRect().top;
        if (top - offset <= 0) active = t;
      });
      links.forEach(l => l.classList.remove("is-active"));
      if (active) active.link.classList.add("is-active");

      ticking = false;
    }
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    // Click suave en cada link de la isla
    links.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const id = link.getAttribute("data-target");
        const target = document.getElementById(id);
        if (!target) return;
        const header = document.getElementById("header");
        const headerH = header ? header.offsetHeight : 0;
        const y = window.scrollY + target.getBoundingClientRect().top - headerH - 20;
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });
  }

  // ─────────── Event bindings ───────────
  function bindEvents() {
    // Productos: click "Agregar al carrito" → abrir modal de cantidad
    document.querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id    = btn.getAttribute("data-id");
        const name  = btn.getAttribute("data-name");
        const price = parseFloat(btn.getAttribute("data-price")) || 0;
        const img   = btn.getAttribute("data-img") || "";
        if (!id || !name) return;
        openQtyModal({ id, name, price, img });
      });
    });

    // Modal de cantidad
    qtyMinus.addEventListener("click", () => {
      pendingQty = Math.max(1, pendingQty - 1);
      updateQtyModal();
    });
    qtyPlus.addEventListener("click", () => {
      pendingQty++;
      updateQtyModal();
    });
    qtyConfirm.addEventListener("click", confirmQty);
    qtyModalClose.addEventListener("click", closeQtyModal);
    qtyModalBack.addEventListener("click", closeQtyModal);

    // Notificación
    notifKeep.addEventListener("click", hideNotif);
    notifCheckout.addEventListener("click", () => {
      hideNotif();
      openCart();
    });

    // Carrito drawer
    cartBtn.addEventListener("click", openCart);
    cartClose.addEventListener("click", closeCart);
    cartBackdrop.addEventListener("click", closeCart);
    cartCheckout.addEventListener("click", checkout);

    // Botones +/- y remove dentro del drawer (delegación)
    cartList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      if (action === "plus") changeQty(id, +1);
      else if (action === "minus") changeQty(id, -1);
      else if (action === "remove") removeItem(id);
    });

    // ESC cierra modal o carrito
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (qtyModal.classList.contains("is-open")) closeQtyModal();
      else if (cartEl.classList.contains("is-open")) closeCart();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAYORISTA PICKER — selector de compra mayorista (min 10 unidades)
  // ═══════════════════════════════════════════════════════════════════
  // Lee los productos directamente del DOM (data-attributes en las
  // .prod__btn de las secciones de la tienda). Así no duplicamos la base.
  // Estado independiente del carrito normal — la compra mayorista se
  // arma y envía por WhatsApp en una sola operación.
  const MAYORISTA_MIN = 10;
  let mayoristaCatalog = []; // [{id, name, price, img, cat}]
  let mayoristaQty = {};     // { id: qty }

  function initMayorista() {
    const openBtn = document.getElementById("openMayoristaPicker");
    const modal   = document.getElementById("mayoristaModal");
    if (!openBtn || !modal) return;

    const backdrop = document.getElementById("mayoristaBackdrop");
    const closeBtn = document.getElementById("mayoristaClose");
    const grid     = document.getElementById("mayoristaGrid");
    const countEl  = document.getElementById("mayoristaCount");
    const extraEl  = document.getElementById("mayoristaExtra");
    const totalEl  = document.getElementById("mayoristaTotal");
    const barEl    = document.getElementById("mayoristaBar");
    const confirm  = document.getElementById("mayoristaConfirm");
    const confLbl  = document.getElementById("mayoristaConfirmLabel");

    // Construir catálogo leyendo las secciones de la tienda
    function buildCatalog() {
      mayoristaCatalog = [];
      document.querySelectorAll(".seccion-prod").forEach(sec => {
        const headEl = sec.querySelector(".seccion-prod__head .manifesto__title");
        const cat    = headEl ? headEl.textContent.trim() : "";
        sec.querySelectorAll("[data-add]").forEach(btn => {
          const id    = btn.getAttribute("data-id");
          const name  = btn.getAttribute("data-name");
          const price = parseFloat(btn.getAttribute("data-price")) || 0;
          const img   = btn.getAttribute("data-img") || "";
          if (!id || !name) return;
          mayoristaCatalog.push({ id, name, price, img, cat });
        });
      });
    }

    function renderGrid() {
      grid.innerHTML = "";
      mayoristaCatalog.forEach(p => {
        const q = mayoristaQty[p.id] || 0;
        const card = document.createElement("article");
        card.className = "mayo-card" + (q > 0 ? " is-selected" : "");
        card.innerHTML = `
          <div class="mayo-card__img"><img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
          <span class="mayo-card__cat">${escapeHtml(p.cat)}</span>
          <h3 class="mayo-card__name">${escapeHtml(p.name)}</h3>
          <p class="mayo-card__price">${fmt(p.price)}</p>
          <div class="mayo-card__qty">
            <button class="mayo-card__qty-btn" data-mayo-action="minus" data-id="${p.id}" aria-label="Restar" ${q === 0 ? "disabled" : ""}>−</button>
            <span class="mayo-card__qty-value">${q}</span>
            <button class="mayo-card__qty-btn" data-mayo-action="plus" data-id="${p.id}" aria-label="Sumar">+</button>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    function totalUnits() {
      return Object.values(mayoristaQty).reduce((s, n) => s + n, 0);
    }
    function totalAmount() {
      return mayoristaCatalog.reduce((s, p) => s + (mayoristaQty[p.id] || 0) * p.price, 0);
    }
    function updateFooter() {
      const units = totalUnits();
      const amount = totalAmount();
      countEl.textContent = units;
      totalEl.textContent = fmt(amount);
      const pct = Math.min(100, (units / MAYORISTA_MIN) * 100);
      barEl.style.width = pct + "%";
      const met = units >= MAYORISTA_MIN;
      barEl.classList.toggle("is-met", met);
      confirm.disabled = !met;
      if (met) {
        const extra = units - MAYORISTA_MIN;
        extraEl.textContent = extra > 0 ? `· ${extra} extra` : "· mínimo cumplido";
        confLbl.textContent = "Enviar pedido por WhatsApp";
      } else {
        const falt = MAYORISTA_MIN - units;
        extraEl.textContent = "";
        confLbl.textContent = `Elegí ${falt} unidad${falt === 1 ? "" : "es"} más`;
      }
    }
    function rerenderItem(id) {
      // Actualización quirúrgica de UNA card (evita rebuildear todo el grid)
      const q = mayoristaQty[id] || 0;
      const card = grid.querySelector(`[data-id="${id}"]`)?.closest(".mayo-card");
      if (!card) return;
      card.classList.toggle("is-selected", q > 0);
      const val = card.querySelector(".mayo-card__qty-value");
      if (val) val.textContent = q;
      const minus = card.querySelector('[data-mayo-action="minus"]');
      if (minus) minus.disabled = q === 0;
    }

    function open() {
      buildCatalog();
      renderGrid();
      updateFooter();
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function close() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    function sendWhatsApp() {
      const units = totalUnits();
      if (units < MAYORISTA_MIN) return;
      // Loading state — feedback visual mientras se arma la URL y abre WA.
      // Aunque el armado sea instantáneo, en mobile abrir WA puede tardar
      // 200-600ms y la sensación sin spinner es de "no pasó nada".
      confirm.classList.add("is-loading");
      const lines = ["Hola JIcrea! Quiero pedir esta compra MAYORISTA:", ""];
      mayoristaCatalog.forEach(p => {
        const q = mayoristaQty[p.id] || 0;
        if (q > 0) lines.push(`• ${q}× ${p.name}  —  ${fmt(p.price)} c/u`);
      });
      lines.push("");
      lines.push(`Total: ${fmt(totalAmount())} (${units} unidades)`);
      lines.push("");
      lines.push("¿Cómo coordinamos el envío y el pago?");
      const msg = encodeURIComponent(lines.join("\n"));
      window.open("https://wa.me/" + WA_PHONE + "?text=" + msg, "_blank", "noopener");
      // Quitamos el spinner después de 1.2s — suficiente para que el
      // browser haya disparado el window.open. Si el user vuelve a la
      // pestaña, el botón está listo de nuevo.
      setTimeout(() => confirm.classList.remove("is-loading"), 1200);
    }

    // Bindings
    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);
    confirm.addEventListener("click", sendWhatsApp);

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mayo-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-mayo-action");
      mayoristaQty[id] = mayoristaQty[id] || 0;
      if (action === "plus") mayoristaQty[id]++;
      else if (action === "minus") mayoristaQty[id] = Math.max(0, mayoristaQty[id] - 1);
      rerenderItem(id);
      updateFooter();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) close();
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // CAROUSEL STACK genérico — categorías + secciones de productos
  // ─────────────────────────────────────────────────────────────────
  // Crea un mazo apilado: 1 card al frente (is-active), 3 detrás
  // (is-pos-1/2/3). Cada N segundos rota: la del frente va al fondo.
  // Pausa al touch/click + reanuda 4s después.
  function makeStackCarousel({ cards, container, rotateMs, pauseMs }) {
    if (!cards || cards.length < 2) return null;
    const ROTATE_MS = rotateMs || 2400;
    const PAUSE_AFTER_TOUCH_MS = pauseMs || 4000;
    let activeIdx = 0;
    let intervalId = null;
    let pauseTimeoutId = null;
    let dotsRoot = null;

    function applyClasses() {
      const n = cards.length;
      // FAN layout (cartas de naipe):
      //   rel 0    → active (centro)
      //   rel 1    → pos-1  (asoma derecha, "siguiente")
      //   rel n-1  → pos-3  (asoma izquierda, "anterior")
      //   resto    → pos-2  (atrás, casi oculto)
      // FAN layout (cartas españolas de naipe). El user lo prefirió a
      // un stack apilado tipo deck.
      //   pos-3 ← active → pos-1 (centro), pos-2 atrás casi oculta
      const styles = {
        active: { opacity: 1,    transform: "scale(1) translateX(0) rotate(0deg)",       z: 4 },
        pos1:   { opacity: 0.82, transform: "scale(0.9) translateX(38%) rotate(8deg)",   z: 3 },
        pos3:   { opacity: 0.82, transform: "scale(0.9) translateX(-38%) rotate(-8deg)", z: 3 },
        pos2:   { opacity: 0.35, transform: "scale(0.82) translateY(-12px)",             z: 1 },
      };
      cards.forEach((c, i) => {
        const rel = (i - activeIdx + n) % n;
        c.classList.remove("is-active", "is-pos-1", "is-pos-2", "is-pos-3");
        let s;
        if (rel === 0)        { c.classList.add("is-active"); s = styles.active; }
        else if (rel === 1)   { c.classList.add("is-pos-1");  s = styles.pos1; }
        else if (rel === n-1) { c.classList.add("is-pos-3");  s = styles.pos3; }
        else                  { c.classList.add("is-pos-2");  s = styles.pos2; }
        c.style.setProperty("opacity",   s.opacity,  "important");
        c.style.setProperty("transform", s.transform, "important");
        c.style.setProperty("z-index",   s.z, "important");
        c.style.setProperty("pointer-events", rel === 0 ? "auto" : "none", "important");
      });
      if (dotsRoot) {
        Array.from(dotsRoot.children).forEach((dot, i) => {
          dot.classList.toggle("is-active", i === activeIdx);
        });
      }
    }
    function next() { activeIdx = (activeIdx + 1) % cards.length; applyClasses(); }
    function goTo(idx) { activeIdx = idx; applyClasses(); pauseAutoRotate(); }
    function startAutoRotate() {
      stopAutoRotate();
      intervalId = setInterval(next, ROTATE_MS);
    }
    function stopAutoRotate() { if (intervalId) { clearInterval(intervalId); intervalId = null; } }
    function pauseAutoRotate() {
      stopAutoRotate();
      if (pauseTimeoutId) clearTimeout(pauseTimeoutId);
      pauseTimeoutId = setTimeout(startAutoRotate, PAUSE_AFTER_TOUCH_MS);
    }
    function buildDots() {
      dotsRoot = document.createElement("div");
      dotsRoot.className = "cards-carousel-dots";
      cards.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.className = "cards-carousel-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", `Ir a card ${i + 1}`);
        dot.addEventListener("click", (e) => { e.stopPropagation(); goTo(i); });
        dotsRoot.appendChild(dot);
      });
      container.insertAdjacentElement("afterend", dotsRoot);
    }
    function activate() {
      if (!dotsRoot) buildDots();
      dotsRoot.style.display = "";
      applyClasses();
      // Agregar .is-tween a los cards DESPUÉS del primer paint (2 rAFs).
      // Esto evita el bug de Chrome donde transition + inline styles
      // !important entran en estado raro y los styles no se aplican.
      // Después del primer paint las animaciones funcionan normales.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          cards.forEach(c => c.classList.add("is-tween"));
        });
      });
      startAutoRotate();
    }
    function deactivate() {
      stopAutoRotate();
      cards.forEach(c => {
        c.classList.remove("is-active", "is-pos-1", "is-pos-2", "is-pos-3", "is-tween");
        c.style.removeProperty("opacity");
        c.style.removeProperty("transform");
        c.style.removeProperty("z-index");
        c.style.removeProperty("pointer-events");
      });
      if (dotsRoot) dotsRoot.style.display = "none";
    }

    // Touch swipe
    let touchStartX = null;
    container.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    container.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) < 40) return;
      activeIdx = (activeIdx + (dx < 0 ? 1 : -1) + cards.length) % cards.length;
      applyClasses();
      pauseAutoRotate();
    }, { passive: true });
    // Click pausa
    cards.forEach(c => c.addEventListener("click", () => pauseAutoRotate()));

    return { activate, deactivate };
  }

  // Categorías (.tienda-card en .cards__inner--tienda) — rotación 2.4s
  function initCategoryCarousel() {
    const mq = window.matchMedia("(max-width: 640px)");
    const cards = Array.from(document.querySelectorAll(".cards__inner--tienda .tienda-card"));
    if (cards.length < 2) return;
    const container = cards[0].parentElement;
    const carousel = makeStackCarousel({ cards, container, rotateMs: 2400, pauseMs: 4000 });
    if (!carousel) return;
    function handleMQ() { if (mq.matches) carousel.activate(); else carousel.deactivate(); }
    if (mq.addEventListener) mq.addEventListener("change", handleMQ);
    else if (mq.addListener) mq.addListener(handleMQ);
    handleMQ();
  }

  // Productos por sección — CAROUSEL CLÁSICO (scroll horizontal con
  // 2 cards visibles a la vez). Diferente del fan-style de categorías:
  // este usa scroll-snap nativo del browser + auto-advance cada 4s.
  function initProductCarousels() {
    const mq = window.matchMedia("(max-width: 640px)");
    const grids = Array.from(document.querySelectorAll(".seccion-prod__grid"));
    if (!grids.length) return;
    const ROTATE_MS = 4000;
    const PAUSE_AFTER_TOUCH_MS = 6000;
    const carousels = grids.map(grid => {
      const cards = Array.from(grid.querySelectorAll(".prod"));
      if (cards.length < 2) return null;
      let currentIdx = 0;
      let intervalId = null;
      let pauseTimeoutId = null;
      let userScrolling = false;
      let dotsRoot = null;

      function scrollToCard(idx) {
        const card = cards[idx];
        if (!card) return;
        // Calcular el scroll left: card.offsetLeft relativo al grid
        const left = card.offsetLeft - grid.offsetLeft - parseInt(getComputedStyle(grid).paddingLeft || 0);
        grid.scrollTo({ left, behavior: "smooth" });
        currentIdx = idx;
        updateDots();
      }
      function next() {
        // Avanzamos de a 1 card. Cuando el currentIdx alcanza
        // length-2, volvemos al inicio (la última pareja ya se vio
        // y el último jump volvería a mostrar las 2 mismas cards).
        const maxIdx = Math.max(0, cards.length - 2);
        let nextIdx = currentIdx + 1;
        if (nextIdx > maxIdx) nextIdx = 0;
        scrollToCard(nextIdx);
      }
      function startAuto() {
        stopAuto();
        intervalId = setInterval(next, ROTATE_MS);
      }
      function stopAuto() { if (intervalId) { clearInterval(intervalId); intervalId = null; } }
      function pauseAuto() {
        stopAuto();
        if (pauseTimeoutId) clearTimeout(pauseTimeoutId);
        pauseTimeoutId = setTimeout(() => { if (mq.matches) startAuto(); }, PAUSE_AFTER_TOUCH_MS);
      }
      function updateDots() {
        if (!dotsRoot) return;
        Array.from(dotsRoot.children).forEach((dot, i) => {
          dot.classList.toggle("is-active", i === currentIdx);
        });
      }
      function buildDots() {
        dotsRoot = document.createElement("div");
        dotsRoot.className = "cards-carousel-dots";
        // 1 dot por card (no por par). Usuario ve cuál está al frente.
        cards.forEach((_, i) => {
          const dot = document.createElement("button");
          dot.className = "cards-carousel-dot";
          dot.type = "button";
          dot.setAttribute("aria-label", `Ir a producto ${i + 1}`);
          dot.addEventListener("click", (e) => {
            e.stopPropagation();
            scrollToCard(i);
            pauseAuto();
          });
          dotsRoot.appendChild(dot);
        });
        grid.insertAdjacentElement("afterend", dotsRoot);
      }
      // Detect user scroll → pausar auto
      let scrollDebounce = null;
      grid.addEventListener("scroll", () => {
        if (!mq.matches) return;
        clearTimeout(scrollDebounce);
        scrollDebounce = setTimeout(() => {
          // Detectar cuál card está a la izquierda (el active)
          const scrollL = grid.scrollLeft;
          let closest = 0;
          let minDiff = Infinity;
          cards.forEach((c, i) => {
            const left = c.offsetLeft - grid.offsetLeft - parseInt(getComputedStyle(grid).paddingLeft || 0);
            const diff = Math.abs(left - scrollL);
            if (diff < minDiff) { minDiff = diff; closest = i; }
          });
          currentIdx = closest;
          updateDots();
        }, 120);
      }, { passive: true });
      // Touch → pausar
      grid.addEventListener("touchstart", pauseAuto, { passive: true });

      function activate() {
        if (!dotsRoot) buildDots();
        dotsRoot.style.display = "";
        currentIdx = 0;
        // Reset scroll AL INICIO. requestAnimationFrame para que el layout
        // ya esté pintado antes de scrollear (sino el grid puede no haber
        // calculado el width y scrollLeft=0 no significa nada).
        requestAnimationFrame(() => {
          grid.scrollLeft = 0;
          requestAnimationFrame(() => { grid.scrollLeft = 0; });
        });
        updateDots();
        // Delay del primer auto-rotate para que el user vea card[0] tranquilo
        if (intervalId) clearInterval(intervalId);
        setTimeout(startAuto, 1500);
      }
      function deactivate() {
        stopAuto();
        if (dotsRoot) dotsRoot.style.display = "none";
        grid.scrollLeft = 0;
      }
      return { activate, deactivate };
    }).filter(Boolean);
    function handleMQ() {
      carousels.forEach(c => { if (mq.matches) c.activate(); else c.deactivate(); });
    }
    if (mq.addEventListener) mq.addEventListener("change", handleMQ);
    else if (mq.addListener) mq.addListener(handleMQ);
    handleMQ();
  }


  // ─────────── Init ───────────
  document.addEventListener("DOMContentLoaded", () => {
    if (!cartBtn) return;
    load();
    renderCart();
    bindEvents();
    // Categorías dinámicas — primero, para que cuando initFloatingIsland
    // lea los links ya estén los de categorías inyectados.
    const categories = loadCategoriesData();
    renderFloatingIslandCategories(categories);
    renderFilterPills(categories);
    initSearchAndFilters();
    initFloatingIsland();
    initMayorista();
    initCategoryCarousel();
    initProductCarousels();
  });
})();
