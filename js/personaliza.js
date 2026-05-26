/* ════════════════════════════════════════════════════════════════════════
   CONFIGURADOR DE MATE — flujo paso a paso
   ════════════════════════════════════════════════════════════════════════
   Lee las opciones seleccionadas en cada fieldset, mantiene el estado
   en memoria y va actualizando:
     · La foto del preview (cambia con la base elegida)
     · El nombre del mate
     · El resumen de configuración (base / virola / bombilla / grabado)
     · El total estimado (suma de precios + grabado si aplica)
     · El CTA WhatsApp (URL con mensaje pre-armado)
   Visual: las labels .cfg__opt se "marcan" con .is-selected vía JS
   cuando su input está checked (necesario porque [type=radio]:checked
   selectors no permiten subir al padre con CSS-only de manera limpia
   cross-browser para todos los casos).
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  const WA_PHONE = "59898507241";
  const GRABADO_PRICE = 400;

  // ─────────── DOM refs ───────────
  const previewImg   = document.getElementById("cfgPreviewImg");
  const sumName      = document.getElementById("cfgSummaryName");
  const sumBase      = document.getElementById("cfgSumBase");
  const sumVirola    = document.getElementById("cfgSumVirola");
  const sumBombilla  = document.getElementById("cfgSumBombilla");
  const sumGrabado   = document.getElementById("cfgSumGrabado");
  const totalEl      = document.getElementById("cfgTotal");
  const ctaEl        = document.getElementById("cfgCta");
  const grabadoTog   = document.getElementById("cfgGrabadoToggle");
  const grabadoInput = document.getElementById("cfgGrabadoText");

  if (!previewImg) return; // página equivocada

  // ─────────── Helpers ───────────
  function fmt(n) {
    return "$" + Math.round(n).toLocaleString("es-UY");
  }

  // Devuelve el input checked dentro de un fieldset[data-step="X"]
  function getSelected(step) {
    const input = document.querySelector(`.cfg__step[data-step="${step}"] input:checked`);
    return input || null;
  }

  // Marca la .cfg__opt padre como seleccionada (y desmarca a sus hermanas)
  function markSelected(input) {
    const fieldset = input.closest(".cfg__step");
    if (!fieldset) return;
    fieldset.querySelectorAll(".cfg__opt").forEach(opt => opt.classList.remove("is-selected"));
    const label = input.closest(".cfg__opt");
    if (label) label.classList.add("is-selected");
  }

  // ─────────── Render ───────────
  function render() {
    const base     = getSelected("base");
    const virola   = getSelected("virola");
    const bombilla = getSelected("bombilla");
    const wantsGrabado = grabadoTog.checked;
    const grabadoText  = grabadoInput.value.trim();

    if (!base || !virola || !bombilla) return;

    // Preview img + name
    previewImg.src = base.getAttribute("data-img");
    previewImg.alt = base.getAttribute("data-name");
    sumName.textContent = base.getAttribute("data-name");

    // Resumen
    sumBase.textContent     = base.getAttribute("data-name");
    sumVirola.textContent   = virola.getAttribute("data-name");
    sumBombilla.textContent = bombilla.getAttribute("data-name");
    sumGrabado.textContent  = wantsGrabado
      ? (grabadoText ? `"${grabadoText}"` : "(sin texto aún)")
      : "Sin grabado";

    // Total
    const basePrice     = parseFloat(base.getAttribute("data-price")) || 0;
    const virolaPrice   = parseFloat(virola.getAttribute("data-price")) || 0;
    const bombillaPrice = parseFloat(bombilla.getAttribute("data-price")) || 0;
    const grabadoPrice  = wantsGrabado ? GRABADO_PRICE : 0;
    const total = basePrice + virolaPrice + bombillaPrice + grabadoPrice;
    totalEl.textContent = fmt(total);

    // CTA WhatsApp con mensaje pre-armado
    const msgLines = [
      "Hola JIcrea! Quiero pedir un mate personalizado:",
      "",
      `• Base: ${base.getAttribute("data-name")} (${fmt(basePrice)})`,
      `• Virola: ${virola.getAttribute("data-name")}${virolaPrice ? " (+" + fmt(virolaPrice) + ")" : ""}`,
      `• Bombilla: ${bombilla.getAttribute("data-name")}${bombillaPrice ? " (+" + fmt(bombillaPrice) + ")" : ""}`,
    ];
    if (wantsGrabado) {
      msgLines.push(`• Grabado: ${grabadoText ? `"${grabadoText}"` : "personalizado (lo coordino por acá)"} (+${fmt(GRABADO_PRICE)})`);
    }
    msgLines.push("");
    msgLines.push(`Total estimado: ${fmt(total)}`);
    msgLines.push("");
    msgLines.push("¿Cómo coordinamos?");
    const msg = encodeURIComponent(msgLines.join("\n"));
    ctaEl.href = `https://wa.me/${WA_PHONE}?text=${msg}`;
  }

  // ─────────── Event bindings ───────────
  // Cualquier cambio en radios de los 3 pasos → re-render + marcar visual
  document.querySelectorAll('.cfg__step input[type="radio"]').forEach(input => {
    input.addEventListener("change", () => {
      markSelected(input);
      render();
    });
  });

  // Toggle del grabado — habilita/deshabilita el input de texto
  grabadoTog.addEventListener("change", () => {
    grabadoInput.disabled = !grabadoTog.checked;
    if (grabadoTog.checked) {
      // foco al input cuando se activa para que sea fluido escribir
      setTimeout(() => grabadoInput.focus(), 50);
    }
    render();
  });
  grabadoInput.addEventListener("input", render);

  // Marcar inicial las opciones por default (las que tienen `checked` en HTML)
  document.querySelectorAll('.cfg__step input[type="radio"]:checked').forEach(markSelected);
  render();
})();
