/**
 * Overlay di aiuto in Shadow DOM chiuso.
 *
 * Tutto vive in un solo host <div id="spid-helper-root"> in document.body,
 * con style.all = "initial" e tutto il CSS dentro lo shadow root. La pagina
 * ospite non riceve stili, classi o modifiche ai suoi elementi: anche il
 * contorno che evidenzia il target è un anello nostro, posizionato sopra il
 * getBoundingClientRect() dell'elemento, non uno stile applicato all'elemento.
 */
(function () {
  "use strict";

  var NS = (window.SPID_HELPER = window.SPID_HELPER || {});
  var C = NS.CONST;

  // Testi fissi dell'interfaccia (regole easy-read-it).
  var TEXT = Object.freeze({
    regionLabel: "Aiuto per entrare con SPID",
    hintLabel: "Un consiglio per te",
    doneButton: "Ho fatto questo passaggio",
  });

  // Ordine degli angoli: prima quello standard, poi l'opposto, poi gli altri due.
  var CORNERS = ["br", "tl", "bl", "tr"];

  var CSS = [
    ":host{all:initial}",
    "[hidden]{display:none !important}",
    ".panel{position:fixed;z-index:2147483647;box-sizing:border-box;",
    "width:min(380px,calc(100vw - 32px));max-height:min(70vh,calc(100vh - 32px));overflow:auto;",
    "margin:0;padding:20px;background:#ffffff;color:#111111;",
    "border:3px solid #0b3d91;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.28);",
    "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;",
    "font-size:20px;line-height:1.5;text-align:left;letter-spacing:normal;word-spacing:normal}",
    ".panel[data-corner=br]{right:16px;bottom:16px}",
    ".panel[data-corner=bl]{left:16px;bottom:16px}",
    ".panel[data-corner=tr]{right:16px;top:16px}",
    ".panel[data-corner=tl]{left:16px;top:16px}",
    ".head{display:flex;align-items:center;gap:14px;margin:0 0 10px}",
    ".icon{flex:none;width:56px;height:56px;color:#0b3d91}",
    ".icon svg{display:block;width:100%;height:100%}",
    ".progress{margin:0;font-size:18px;font-weight:700;color:#333333}",
    ".title{margin:0 0 10px;font-size:24px;line-height:1.3;font-weight:700;color:#111111}",
    ".text p{margin:0 0 8px}",
    ".hint{margin:14px 0 0;padding:12px 14px;background:#eaf2fc;color:#111111;",
    "border:2px solid #0b3d91;border-left-width:8px;border-radius:10px}",
    ".hint-label{margin:0 0 6px;font-weight:700;color:#0b3d91}",
    ".hint-body p{margin:0 0 6px}",
    ".done{display:block;box-sizing:border-box;width:100%;min-height:56px;margin:16px 0 0;",
    "padding:12px 16px;border:2px solid #0b3d91;border-radius:10px;background:#0b3d91;color:#ffffff;",
    "font-family:inherit;font-size:20px;font-weight:700;line-height:1.3;cursor:pointer}",
    ".done:hover{background:#082d6b}",
    ".done:focus{outline:3px solid #ffbf47;outline-offset:0;box-shadow:0 0 0 7px #111111}",
    ".done:focus:not(:focus-visible){outline:none;box-shadow:none}",
    ".ring{position:fixed;z-index:2147483646;box-sizing:border-box;pointer-events:none;",
    "border:4px solid #ffbf47;border-radius:12px;box-shadow:0 0 0 3px #0b3d91,inset 0 0 0 2px #0b3d91}",
    ".ring::after{content:'';position:absolute;inset:-4px;box-sizing:border-box;border:4px solid #ffbf47;",
    "border-radius:14px;animation:shp-pulse 1.6s ease-out infinite}",
    "@keyframes shp-pulse{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.12)}}",
    "@media (prefers-reduced-motion: reduce){.ring{border-width:7px}.ring::after{animation:none;display:none}}",
    "@media (forced-colors: active){.panel,.hint,.done,.ring{border-color:CanvasText}}",
  ].join("");

  var host = null;
  var shadow = null;
  var els = null;
  var rafId = 0;
  var view = null; // ultima vista mostrata, per ricostruire l'overlay se la pagina rimuove l'host
  var hintLines = null;
  var ringWanted = false;

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function stop(e) {
    // Gli eventi nel pannello non arrivano ai gestori della pagina ospite
    // (es. "clic fuori chiude il menu").
    e.stopPropagation();
  }

  function build() {
    var old = document.getElementById(C.ROOT_ID);
    if (old && old !== host && old.parentNode) old.parentNode.removeChild(old);

    host = document.createElement("div");
    host.id = C.ROOT_ID;
    host.style.all = "initial";
    shadow = host.attachShadow({ mode: "closed" });

    var style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);

    var panel = el("section", "panel");
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", TEXT.regionLabel);
    panel.setAttribute("lang", "it");
    panel.setAttribute("data-corner", CORNERS[0]);

    var head = el("div", "head");
    var icon = el("span", "icon");
    icon.setAttribute("aria-hidden", "true");
    var progress = el("p", "progress");
    head.appendChild(icon);
    head.appendChild(progress);

    var live = el("div", "live");
    live.setAttribute("aria-live", "polite");
    var title = el("h2", "title");
    var text = el("div", "text");
    var hint = el("div", "hint");
    hint.hidden = true;
    var hintLabel = el("p", "hint-label");
    hintLabel.textContent = TEXT.hintLabel;
    var hintBody = el("div", "hint-body");
    hint.appendChild(hintLabel);
    hint.appendChild(hintBody);
    live.appendChild(title);
    live.appendChild(text);
    live.appendChild(hint);

    var done = el("button", "done");
    done.type = "button";
    done.textContent = TEXT.doneButton;
    // Premendo il pulsante mentre si è in una casella, la casella perde il
    // focus e lo step può completarsi in automatico prima del clic. Se la
    // vista è cambiata tra la pressione e il clic, il clic si ignora: così
    // un solo gesto non fa avanzare di due passi.
    var pressedView = null;
    var press = function () {
      pressedView = view;
    };
    done.addEventListener("pointerdown", press);
    done.addEventListener("mousedown", press);
    done.addEventListener("touchstart", press, { passive: true });
    done.addEventListener("click", function () {
      var pressed = pressedView;
      pressedView = null;
      if (pressed && pressed !== view) return;
      if (view && typeof view.onDone === "function") view.onDone();
    });

    panel.appendChild(head);
    panel.appendChild(live);
    panel.appendChild(done);
    ["click", "mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "touchend", "keydown"].forEach(
      function (type) {
        panel.addEventListener(type, stop);
      }
    );

    var ring = el("div", "ring");
    ring.hidden = true;
    ring.setAttribute("aria-hidden", "true");

    shadow.appendChild(panel);
    shadow.appendChild(ring);

    els = {
      panel: panel,
      icon: icon,
      progress: progress,
      title: title,
      text: text,
      hint: hint,
      hintBody: hintBody,
      done: done,
      ring: ring,
    };

    document.body.appendChild(host);
    window.addEventListener("scroll", scheduleRefresh, { capture: true, passive: true });
    window.addEventListener("resize", scheduleRefresh, { passive: true });
  }

  function teardown() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    window.removeEventListener("scroll", scheduleRefresh, { capture: true });
    window.removeEventListener("resize", scheduleRefresh);
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null;
    shadow = null;
    els = null;
  }

  function ensureMounted() {
    if (host && host.isConnected) return true;
    if (!document.body) return false;
    if (host) teardown();
    build();
    return true;
  }

  function setLines(container, lines) {
    while (container.firstChild) container.removeChild(container.firstChild);
    (lines || []).forEach(function (line) {
      var p = document.createElement("p");
      p.textContent = line;
      container.appendChild(p);
    });
  }

  function renderAll() {
    if (!view || !els) return;
    els.icon.innerHTML = NS.icons.get(view.icon); // markup statico da icons.js, mai dati esterni
    els.progress.textContent = view.progressText || "";
    els.progress.hidden = !view.progressText;
    els.title.textContent = view.title || "";
    setLines(els.text, view.lines);
    renderHint();
    els.done.hidden = !view.showDone;
    refresh();
  }

  function renderHint() {
    if (!els) return;
    var has = !!(hintLines && hintLines.length);
    setLines(els.hintBody, has ? hintLines : []);
    els.hint.hidden = !has;
  }

  function targetRect() {
    var selector = view && view.targetSelector;
    if (!selector) return null;
    var target;
    try {
      target = document.querySelector(selector);
    } catch (e) {
      return null;
    }
    if (!target) return null;
    var r = target.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    return r;
  }

  function placeRing(rect) {
    var ring = els.ring;
    if (!ringWanted || !rect) {
      ring.hidden = true;
      return;
    }
    var pad = C.RING_PADDING_PX;
    ring.style.left = rect.left - pad + "px";
    ring.style.top = rect.top - pad + "px";
    ring.style.width = rect.width + pad * 2 + "px";
    ring.style.height = rect.height + pad * 2 + "px";
    ring.hidden = false;
  }

  function cornerBox(corner, w, h, vw, vh, m) {
    var left = corner === "bl" || corner === "tl" ? m : vw - m - w;
    var top = corner === "tl" || corner === "tr" ? m : vh - m - h;
    return { left: left, top: top, right: left + w, bottom: top + h };
  }

  function overlaps(a, b, gap) {
    return !(
      a.right + gap <= b.left ||
      b.right + gap <= a.left ||
      a.bottom + gap <= b.top ||
      b.bottom + gap <= a.top
    );
  }

  // Il pannello resta nell'angolo standard; se coprirebbe il target passa
  // all'angolo opposto, poi agli altri due. Se li copre tutti resta dov'è.
  function placePanel(rect) {
    var chosen = CORNERS[0];
    if (rect) {
      var pr = els.panel.getBoundingClientRect();
      var docEl = document.documentElement;
      var vw = docEl.clientWidth || window.innerWidth;
      var vh = docEl.clientHeight || window.innerHeight;
      for (var i = 0; i < CORNERS.length; i++) {
        if (!overlaps(cornerBox(CORNERS[i], pr.width, pr.height, vw, vh, C.PANEL_MARGIN_PX), rect, 8)) {
          chosen = CORNERS[i];
          break;
        }
      }
    }
    if (els.panel.getAttribute("data-corner") !== chosen) els.panel.setAttribute("data-corner", chosen);
  }

  function refresh() {
    if (!view) return;
    if (!host || !host.isConnected) {
      if (!ensureMounted()) return;
      renderAll();
      return;
    }
    var rect = targetRect();
    placeRing(rect);
    placePanel(rect);
  }

  function scheduleRefresh() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      refresh();
    });
  }

  NS.overlay = {
    TEXT: TEXT,

    /**
     * Mostra una vista. view = { icon, title, lines: string[],
     *   progressText: string|null, showDone: boolean, onDone: function|null,
     *   targetSelector: string|null }
     * L'aiuto e l'anello si azzerano a ogni nuova vista.
     */
    show: function (nextView) {
      view = nextView;
      hintLines = null;
      ringWanted = false;
      if (!ensureMounted()) return;
      renderAll();
    },

    setHint: function (lines) {
      hintLines = lines && lines.length ? lines.slice() : null;
      renderHint();
      refresh();
    },

    setRing: function (on) {
      ringWanted = !!on;
      if (els) refresh();
    },

    /** Riallinea anello e angolo del pannello (scroll, resize, mutazioni). */
    refresh: function () {
      if (view) refresh();
    },

    unmount: function () {
      view = null;
      hintLines = null;
      ringWanted = false;
      teardown();
    },

    /** true se il nodo è l'host dell'overlay (gli eventi dallo shadow root arrivano retargettati sull'host). */
    isOwnNode: function (node) {
      if (!node) return false;
      if (node === host) return true;
      return node.nodeType === 1 && node.id === C.ROOT_ID;
    },
  };
})();
