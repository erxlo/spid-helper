/*
 * Login Sielte ID simulato: credenziali -> codice grafico -> codice via SMS.
 * Tutto lato client; nessun dato viene salvato o trasmesso.
 */
(function () {
  "use strict";

  var ui = window.DemoUI;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var form = document.getElementById("credentials-form");
  var username = document.getElementById("username");
  var password = document.getElementById("password");
  var submitBtn = document.getElementById("submit-btn");
  var credStatus = document.getElementById("credentials-status");

  var stepCredentials = document.getElementById("step-credentials");
  var stepQr = document.getElementById("step-qr");
  var stepOtp = document.getElementById("step-otp");
  var qrTitle = document.getElementById("qr-title");
  var otpTitle = document.getElementById("otp-title");
  var qrBox = document.getElementById("qr-box");
  var simScanned = document.getElementById("sim-scanned");

  var otpForm = document.getElementById("otp-form");
  var otp = document.getElementById("otp");
  var otpSubmitBtn = document.getElementById("otp-submit-btn");
  var otpStatus = document.getElementById("otp-status");
  var otpResend = document.getElementById("otp-resend");

  /**
   * Disegna un motivo "a quadretti" astratto e deterministico (generatore
   * pseudo-casuale con seme fisso). Non codifica alcun dato: non è un QR reale.
   */
  function drawAbstractCode(container) {
    var n = 25; // moduli per lato
    var quiet = 2; // margine
    var size = n + quiet * 2;
    var seed = 424242;

    function rnd() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    function inFinder(x, y) {
      var near = function (v) { return v < 8; };
      var far = function (v) { return v > n - 9; };
      return (near(x) && near(y)) || (far(x) && near(y)) || (near(x) && far(y));
    }

    function inCenter(x, y) {
      return x >= 8 && x <= 16 && y >= 10 && y <= 14;
    }

    var d = "";
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (inFinder(x, y) || inCenter(x, y)) continue;
        if (rnd() < 0.48) d += "M" + (x + quiet) + " " + (y + quiet) + "h1v1h-1z";
      }
    }

    // Tre quadrati angolari stilizzati.
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) {
      var ox = p[0] + quiet;
      var oy = p[1] + quiet;
      d += "M" + ox + " " + oy + "h7v7h-7z" +
           "M" + (ox + 1) + " " + (oy + 1) + "v5h5v-5z" +
           "M" + (ox + 2) + " " + (oy + 2) + "h3v3h-3z";
    });

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("shape-rendering", "crispEdges");

    var bg = document.createElementNS(SVG_NS, "rect");
    bg.setAttribute("width", size);
    bg.setAttribute("height", size);
    bg.setAttribute("fill", "#ffffff");
    svg.appendChild(bg);

    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "#1f2a36");
    path.setAttribute("fill-rule", "evenodd");
    svg.appendChild(path);

    // Etichetta centrale "DEMO", per rendere evidente che il codice è fittizio.
    var label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", size / 2);
    label.setAttribute("y", size / 2 + 1);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "2.8");
    label.setAttribute("font-weight", "700");
    label.setAttribute("font-family", "system-ui, sans-serif");
    label.setAttribute("fill", "#7b6d8f");
    label.textContent = "DEMO";
    svg.appendChild(label);

    container.appendChild(svg);
  }

  drawAbstractCode(qrBox);

  ui.clearErrorOnInput([username, password, otp]);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var ok = ui.validateRequired([
      { input: username, message: "Inserire il nome utente." },
      { input: password, message: "Inserire la password." },
    ]);
    if (!ok) return;

    submitBtn.disabled = true;
    ui.setStatus(credStatus, "Verifica in corso…");

    setTimeout(function () {
      username.value = "";
      password.value = "";
      ui.setStatus(credStatus, "");
      stepCredentials.hidden = true;
      stepQr.hidden = false;
      ui.focusHeading(qrTitle);
    }, 1500);
  });

  simScanned.addEventListener("click", function () {
    stepQr.hidden = true;
    stepOtp.hidden = false;
    ui.focusHeading(otpTitle);
  });

  otpResend.addEventListener("click", function (event) {
    event.preventDefault();
    ui.toast("Nuovo codice inviato (simulazione). Usa il codice mostrato sul telefono.");
  });

  otpForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var ok = ui.validateRequired([
      { input: otp, message: "Inserire il codice di verifica ricevuto via SMS." },
    ]);
    if (!ok) return;

    otpSubmitBtn.disabled = true;
    otp.value = "";
    ui.setStatus(otpStatus, "Verifica del codice in corso…");
    setTimeout(function () {
      window.location.href = "cassetto-fiscale.html";
    }, 1500);
  });
})();
