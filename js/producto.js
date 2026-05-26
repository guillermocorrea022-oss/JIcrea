/* ════════════════════════════════════════════════════════════════════════
   PRODUCTO — Lee ?id= de la URL y renderiza el producto correspondiente.
   Si no hay id o id inválido → redirige a tienda.html
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  const PRODUCTOS = window.JICREA_PRODUCTOS || {};

  function getId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function fmt(n) {
    return "$" + Math.round(n).toLocaleString("es-UY");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const id = getId();
    const prod = PRODUCTOS[id];

    if (!prod) {
      // ID inválido → volver a la tienda
      window.location.href = "tienda.html";
      return;
    }

    document.title = `JIcrea — ${prod.name}`;

    // Breadcrumb
    const bcCategory = document.getElementById("bcCategory");
    const bcName = document.getElementById("bcName");
    if (bcCategory) bcCategory.textContent = prod.cat;
    if (bcName) bcName.textContent = prod.name;

    // Hero
    document.getElementById("prodCategory").textContent = prod.cat;
    document.getElementById("prodTitle").textContent = prod.name;
    document.getElementById("prodPrice").textContent = fmt(prod.price);
    document.getElementById("prodShort").textContent = prod.short;

    // Galería
    const mainImg = document.getElementById("prodMainImg");
    const thumbs = document.getElementById("prodThumbs");
    const gallery = (prod.gallery && prod.gallery.length ? prod.gallery : [prod.img]);
    mainImg.src = gallery[0];
    mainImg.alt = prod.name;
    thumbs.innerHTML = "";
    gallery.forEach((src, i) => {
      const btn = document.createElement("button");
      btn.className = "producto-hero__thumb" + (i === 0 ? " is-active" : "");
      btn.innerHTML = `<img src="${src}" alt="">`;
      btn.addEventListener("click", () => {
        mainImg.src = src;
        thumbs.querySelectorAll(".producto-hero__thumb").forEach(t => t.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
      thumbs.appendChild(btn);
    });

    // Add to cart
    const addBtn = document.getElementById("prodAddBtn");
    addBtn.setAttribute("data-add", "");
    addBtn.setAttribute("data-id", prod.id);
    addBtn.setAttribute("data-name", prod.name);
    addBtn.setAttribute("data-price", prod.price);
    addBtn.setAttribute("data-img", prod.img);

    // Dudas WhatsApp con nombre del producto pre-cargado en el msg.
    const doubtsBtn = document.getElementById("prodDoubtsBtn");
    if (doubtsBtn) {
      const msg = `Hola JIcrea, tengo una consulta sobre el ${prod.name}.`;
      doubtsBtn.href = "https://wa.me/59898507241?text=" + encodeURIComponent(msg);
    }

    // Botones de compartir
    const productUrl = window.location.href;
    const shareWa = document.getElementById("prodShareWa");
    if (shareWa) {
      const waMsg = `Mirá este ${prod.name} de JIcrea: ${productUrl}`;
      shareWa.href = "https://wa.me/?text=" + encodeURIComponent(waMsg);
    }
    const shareCopy = document.getElementById("prodShareCopy");
    if (shareCopy) {
      shareCopy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(productUrl);
          const originalLabel = shareCopy.getAttribute("aria-label");
          shareCopy.setAttribute("aria-label", "Link copiado ✓");
          shareCopy.classList.add("is-copied");
          setTimeout(() => {
            shareCopy.classList.remove("is-copied");
            shareCopy.setAttribute("aria-label", originalLabel);
          }, 1800);
        } catch (e) {
          // Fallback: select text manually (raro pero seguro).
          window.prompt("Copiá el link:", productUrl);
        }
      });
    }

    // Historia
    document.getElementById("prodStory").textContent = prod.story;
    const stepsEl = document.getElementById("prodSteps");
    stepsEl.innerHTML = "";
    (prod.steps || []).forEach(step => {
      const item = document.createElement("div");
      item.className = "info-grid__item";
      item.innerHTML = `
        <span class="info-grid__num">${escapeHtml(step.num)}</span>
        <h4 class="info-grid__title">${escapeHtml(step.title)}</h4>
        <p class="info-grid__text">${escapeHtml(step.text)}</p>
      `;
      stepsEl.appendChild(item);
    });

    // Relacionados — siempre 4 cards.
    // 1) Usamos los que vienen en prod.similares (en orden).
    // 2) Si quedan menos de 4, completamos con otros productos del
    //    catálogo (cualquier id que no sea el actual ni ya esté en
    //    la lista). Así nunca queda con 2 o 3 cards huérfanas.
    const RELACIONADOS_N = 4;
    const ids = [];
    (prod.similares || []).forEach(simId => {
      if (PRODUCTOS[simId] && simId !== prod.id && !ids.includes(simId)) {
        ids.push(simId);
      }
    });
    // Fallback: rellenar con resto del catálogo si faltan
    if (ids.length < RELACIONADOS_N) {
      Object.keys(PRODUCTOS).forEach(otherId => {
        if (ids.length >= RELACIONADOS_N) return;
        if (otherId === prod.id || ids.includes(otherId)) return;
        ids.push(otherId);
      });
    }

    const similaresEl = document.getElementById("similaresGrid");
    similaresEl.innerHTML = "";
    ids.slice(0, RELACIONADOS_N).forEach(simId => {
      const sim = PRODUCTOS[simId];
      if (!sim) return;
      const card = document.createElement("article");
      card.className = "prod";
      // Misma estructura que las cards de la tienda (.prod__link >
      // .prod__img > h3 + p + price + .prod__btn). El loading="lazy"
      // está en el img porque la sección está below-the-fold.
      card.innerHTML = `
        <a class="prod__link" href="producto.html?id=${escapeHtml(sim.id)}">
          <div class="prod__img"><img loading="lazy" decoding="async" src="${escapeHtml(sim.img)}" alt="${escapeHtml(sim.name)}"></div>
          <h3 class="prod__name">${escapeHtml(sim.name)}</h3>
          <p class="prod__desc">${escapeHtml(sim.short.substring(0, 80))}${sim.short.length > 80 ? '…' : ''}</p>
          <span class="prod__price">${fmt(sim.price)}</span>
        </a>
        <button class="prod__btn" data-add data-id="${escapeHtml(sim.id)}" data-name="${escapeHtml(sim.name)}" data-price="${sim.price}" data-img="${escapeHtml(sim.img)}">Agregar al carrito</button>
      `;
      similaresEl.appendChild(card);
    });
  });
})();
