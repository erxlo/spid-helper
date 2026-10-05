/*
 * Login Poste ID simulato: credenziali -> notifica sul telefono -> conferma biometrica.
 * Tutto lato client; le credenziali non vengono salvate né trasmesse.
 */
(function () {
  "use strict";

  var ui = window.DemoUI;

  var form = document.getElementById("credentials-form");
  var username = document.getElementById("username");
  var password = document.getElementById("password");
  var submitBtn = document.getElementById("submit-btn");
  var credStatus = document.getElementById("credentials-status");

  var stepCredentials = document.getElementById("step-credentials");
  var stepMfa = document.getElementById("step-mfa");
  var mfaTitle = document.getElementById("mfa-title");
  var pushBlock = document.getElementById("push-block");
  var bioBlock = document.getElementById("bio-block");
  var simBtn = document.getElementById("sim-open-notification");
  var simDone = document.getElementById("sim-done");
  var bioConfirmBtn = document.getElementById("bio-confirm-btn");
  var bioStatus = document.getElementById("bio-status");

  ui.clearErrorOnInput([username, password]);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var ok = ui.validateRequired([
      { input: username, message: "Il campo Nome utente è obbligatorio." },
      { input: password, message: "Il campo Password è obbligatorio." },
    ]);
    if (!ok) return;

    submitBtn.disabled = true;
    ui.setStatus(credStatus, "Verifica in corso…");

    setTimeout(function () {
      // Le credenziali non servono più: si svuotano i campi prima di nascondere il modulo.
      username.value = "";
      password.value = "";
      ui.setStatus(credStatus, "");
      stepCredentials.hidden = true;
      stepMfa.hidden = false;
      ui.focusHeading(mfaTitle);
    }, 1500);
  });

  simBtn.addEventListener("click", function () {
    pushBlock.hidden = true;
    bioBlock.hidden = false;
    simBtn.hidden = true;
    simDone.hidden = false;
    bioConfirmBtn.focus();
  });

  bioConfirmBtn.addEventListener("click", function () {
    bioConfirmBtn.disabled = true;
    ui.setStatus(bioStatus, "Accesso autorizzato. Ritorno al servizio in corso…");
    setTimeout(function () {
      window.location.href = "cassetto-fiscale.html";
    }, 1500);
  });
})();
