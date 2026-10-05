/*
 * Utilità comuni del sito dimostrativo.
 * Nessuna chiamata di rete, nessun salvataggio di dati (niente storage/cookie).
 */
(function () {
  "use strict";

  var toastTimer = null;

  function toast(message) {
    var el = document.getElementById("demo-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-toast";
      el.className = "demo-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.textContent = "";
    }, 3500);
  }

  function setError(input, message) {
    var errorEl = document.getElementById(input.id + "-error");
    if (message) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
    if (errorEl) {
      errorEl.textContent = message || "";
    }
  }

  /**
   * Valida campi obbligatori. fields = [{ input, message }].
   * Restituisce true se tutti i campi hanno un valore non vuoto.
   */
  function validateRequired(fields) {
    var firstInvalid = null;
    fields.forEach(function (f) {
      if (f.input.value.trim() === "") {
        setError(f.input, f.message);
        if (!firstInvalid) firstInvalid = f.input;
      } else {
        setError(f.input, "");
      }
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  /** Rimuove l'errore di un campo appena l'utente ricomincia a scrivere. */
  function clearErrorOnInput(inputs) {
    inputs.forEach(function (input) {
      input.addEventListener("input", function () {
        if (input.value.trim() !== "") setError(input, "");
      });
    });
  }

  /** Mostra (o svuota) un messaggio di stato con spinner. */
  function setStatus(el, message) {
    el.textContent = "";
    if (!message) return;
    var spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    var text = document.createElement("span");
    text.textContent = message;
    el.appendChild(spinner);
    el.appendChild(text);
  }

  /** Porta il focus su un titolo appena mostrato (per tastiera e lettori di schermo). */
  function focusHeading(el) {
    if (!el) return;
    el.setAttribute("tabindex", "-1");
    el.focus();
  }

  // Link fittizi: nessuna navigazione, solo un avviso.
  document.addEventListener("click", function (event) {
    var link = event.target.closest ? event.target.closest("a.js-dummy") : null;
    if (!link) return;
    event.preventDefault();
    toast(link.getAttribute("data-demo-message") || "Funzione non disponibile nel sito dimostrativo.");
  });

  window.DemoUI = {
    toast: toast,
    setError: setError,
    validateRequired: validateRequired,
    clearErrorOnInput: clearErrorOnInput,
    setStatus: setStatus,
    focusHeading: focusHeading,
  };
})();
