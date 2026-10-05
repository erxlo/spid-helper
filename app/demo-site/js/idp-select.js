/*
 * Scelta del gestore SPID: i gestori non simulati mostrano un avviso in linea.
 * Poste ID e Sielte ID sono normali link alle rispettive pagine demo.
 */
(function () {
  "use strict";

  var buttons = document.querySelectorAll(".js-idp-unavailable");

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.addEventListener("click", function () {
      var noticeId = btn.getAttribute("aria-describedby");
      var notice = noticeId ? document.getElementById(noticeId) : null;
      if (notice) {
        notice.textContent = "Gestore non disponibile in questa demo.";
      }
    });
  });
})();
