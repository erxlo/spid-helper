/**
 * Icone dell'overlay: pittogrammi a linee, SVG inline definiti qui.
 * Nessun file esterno e nessun URL: l'estensione non scarica nulla.
 * Una icona per ciascun valore semantico di `icon` in steps.js.
 * L'attributo xmlns è omesso di proposito: le stringhe vengono inserite
 * come HTML nello Shadow DOM, dove il parser assegna da solo il namespace SVG.
 */
(function () {
  "use strict";

  var NS = (window.SPID_HELPER = window.SPID_HELPER || {});

  var OPEN =
    '<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" ' +
    'stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var CLOSE = "</svg>";

  var SHAPES = {
    // Telefono con due segni di vibrazione: "arriva un messaggio".
    phone:
      '<rect x="15" y="4" width="18" height="40" rx="4"/>' +
      '<path d="M21 9h6"/>' +
      '<circle cx="24" cy="38" r="1.5"/>' +
      '<path d="M8 18v12M40 18v12"/>',

    // Cornice di inquadratura con un codice a quadretti stilizzato.
    scan:
      '<path d="M6 15V8a2 2 0 0 1 2-2h7"/>' +
      '<path d="M33 6h7a2 2 0 0 1 2 2v7"/>' +
      '<path d="M42 33v7a2 2 0 0 1-2 2h-7"/>' +
      '<path d="M15 42H8a2 2 0 0 1-2-2v-7"/>' +
      '<rect x="14" y="14" width="8" height="8"/>' +
      '<rect x="26" y="14" width="8" height="8"/>' +
      '<rect x="14" y="26" width="8" height="8"/>' +
      '<path d="M26 26h3v3M34 30v4h-4"/>',

    // Impronta digitale: archi concentrici.
    fingerprint:
      '<path d="M10 30v-8a14 14 0 0 1 28 0v4"/>' +
      '<path d="M16 37V22a8 8 0 0 1 16 0v8a10 10 0 0 1-3 7"/>' +
      '<path d="M24 21v11a6 6 0 0 1-3 5"/>' +
      '<path d="M38 32a16 16 0 0 1-2 8"/>',

    // Puntatore con piccoli raggi: "tocca qui".
    cursor:
      '<path d="M18 14v26l6-6 5 10 4-2-5-10h9z"/>' +
      '<path d="M13 9l-3-3M18 8V4M12 14H8"/>',

    // Tastiera: "scrivi".
    keyboard:
      '<rect x="4" y="12" width="40" height="24" rx="3"/>' +
      '<path d="M10 19h2M16 19h2M22 19h2M28 19h2M34 19h4"/>' +
      '<path d="M10 25h2M16 25h2M22 25h2M28 25h2M34 25h4"/>' +
      '<path d="M15 31h18"/>',

    // Cerchio con segno di spunta: "fatto".
    check: '<circle cx="24" cy="24" r="19"/>' + '<path d="M15 25l6 6 12-13"/>',
  };

  var FALLBACK = "cursor";

  NS.icons = {
    names: Object.freeze(Object.keys(SHAPES)),
    /** Restituisce il markup SVG dell'icona; per nomi sconosciuti usa "cursor". */
    get: function (name) {
      var shape = Object.prototype.hasOwnProperty.call(SHAPES, name) ? SHAPES[name] : SHAPES[FALLBACK];
      return OPEN + shape + CLOSE;
    },
  };
})();
