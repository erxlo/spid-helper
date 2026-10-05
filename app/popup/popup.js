/**
 * Dashboard del popup — legge shp_sessions da chrome.storage.local
 * e mostra le metriche di progresso dell'utente.
 * Nessuna chiamata di rete. Solo storage locale.
 */
(function () {
  "use strict";

  var KEY = "shp_sessions";

  // ── utils ─────────────────────────────────────────────────────────────────

  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
  }

  /** Formatta millisecondi in "X min YY sec" oppure "N sec". */
  function fmtMs(ms) {
    if (!ms || ms <= 0) return "–";
    var tot = Math.round(ms / 1000);
    var m = Math.floor(tot / 60);
    var s = tot % 60;
    if (m === 0) return s + " sec";
    return m + " min " + (s < 10 ? "0" : "") + s;
  }

  /** Arrotonda a 1 decimale, omettendo il decimale se intero. */
  function fmtFloat(n) {
    var r = Math.round(n * 10) / 10;
    return r === Math.floor(r) ? String(Math.floor(r)) : r.toFixed(1);
  }

  /** Badge HTML per il confronto prima / dopo. */
  function trendBadge(before, after, lowerIsBetter) {
    var diff = after - before;
    if (Math.abs(diff) < 0.01) {
      return '<span class="trend trend-neutral">→ stabile</span>';
    }
    var improved = lowerIsBetter ? diff < 0 : diff > 0;
    return improved
      ? '<span class="trend trend-good">↗ migliorato</span>'
      : '<span class="trend trend-bad">↘ aumentato</span>';
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  function card(icon, label, value, sub) {
    return (
      '<div class="card">' +
        '<div class="card-icon">' + icon + '</div>' +
        '<div class="card-label">' + label + '</div>' +
        '<div class="card-value">' + value + '</div>' +
        (sub ? '<div class="card-sub">' + sub + '</div>' : '') +
      '</div>'
    );
  }

  function renderEmpty() {
    document.getElementById("content").innerHTML =
      '<div class="empty">' +
        '<div class="empty-icon">🎯</div>' +
        '<p>Nessuna sessione completata ancora.</p>' +
        '<p>Apri il sito e segui la guida.</p>' +
      '</div>';
  }

  function renderError(msg) {
    document.getElementById("content").innerHTML =
      '<p class="error-msg">' + msg + '</p>';
  }

  function render(sessions) {
    var completed = sessions.filter(function (s) {
      return s && s.outcome === "completed";
    });
    var inProgress = sessions.some(function (s) {
      return s && s.outcome === "in_progress";
    });

    if (completed.length === 0) {
      renderEmpty();
      return;
    }

    var n = completed.length;
    var first = completed[0];
    var last  = completed[n - 1];
    var hasTrend = n >= 2;

    // ── metrica 1: sessioni completate ────────────────────────────────────
    var totalVal  = String(n);
    var totalSub  = n === 1 ? "ottimo inizio!" : "sessioni portate a termine";

    // ── metrica 2: durata (ultima vs. prima) ──────────────────────────────
    var durLast  = last.durationMs  || 0;
    var durFirst = first.durationMs || 0;
    var durVal   = fmtMs(durLast);
    var durSub;
    if (hasTrend) {
      durSub =
        "Prima: " + fmtMs(durFirst) +
        " &rarr; Ora: " + fmtMs(durLast) +
        " " + trendBadge(durFirst, durLast, true);
    } else {
      durSub = "prima sessione";
    }

    // ── metrica 3: blocchi rilevati (ultima vs. prima) ────────────────────
    var blkLast  = last.blocksDetected  || 0;
    var blkFirst = first.blocksDetected || 0;
    var blkVal   = fmtFloat(blkLast);
    var blkSub;
    if (hasTrend) {
      blkSub =
        "Prima: " + fmtFloat(blkFirst) +
        " &rarr; Ora: " + fmtFloat(blkLast) +
        " " + trendBadge(blkFirst, blkLast, true);
    } else {
      blkSub = "blocchi in questa sessione";
    }

    // ── metrica 4: % passi senza aiuto (media di tutte le sessioni) ───────
    function noHintPct(s) {
      return s.stepsCompleted > 0
        ? (s.stepsCompletedWithoutHint / s.stepsCompleted) * 100
        : 0;
    }
    var avgNoHint = avg(completed.map(noHintPct));
    var noHintFirst = noHintPct(first);
    var noHintLast  = noHintPct(last);
    var noHintVal   = Math.round(avgNoHint) + "%";
    var noHintSub;
    if (hasTrend) {
      noHintSub =
        "Prima: " + Math.round(noHintFirst) + "%" +
        " &rarr; Ora: " + Math.round(noHintLast) + "%" +
        " " + trendBadge(noHintFirst, noHintLast, false);
    } else {
      noHintSub = "passi fatti da solo";
    }

    // ── componi HTML ──────────────────────────────────────────────────────
    var banner = inProgress
      ? '<div class="banner">⚡ 1 sessione in corso</div>'
      : "";

    document.getElementById("content").innerHTML =
      banner +
      '<div class="grid">' +
        card("🏆", "Sessioni completate",  totalVal,   totalSub)  +
        card("⏱",  "Tempo per sessione",   durVal,     durSub)    +
        card("🛑", "Blocchi rilevati",      blkVal,     blkSub)    +
        card("✅", "Passi fatti da solo",   noHintVal,  noHintSub) +
      "</div>";
  }

  // ── caricamento ───────────────────────────────────────────────────────────

  function load() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.local
    ) {
      renderError("I dati non sono disponibili in questa pagina.");
      return;
    }

    chrome.storage.local.get([KEY], function (res) {
      if (chrome.runtime && chrome.runtime.lastError) {
        renderError("Impossibile leggere i progressi salvati.");
        return;
      }
      var sessions = Array.isArray(res[KEY]) ? res[KEY] : [];
      render(sessions);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
