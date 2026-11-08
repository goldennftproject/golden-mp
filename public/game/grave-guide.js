/* Guía visual de la tumba propia. Sólo lee estado y cámara; no recoge, mueve ni guarda. */
(function () {
  "use strict";
  function positionFor(target, view, canvas, safe) {
    if (!target || !view || !(view.width > 0) || !(view.height > 0)) return null;
    if (target.x >= view.x && target.x <= view.x + view.width && target.y >= view.y && target.y <= view.y + view.height) return null;
    const sx = canvas.left + (target.x - view.x) / view.width * canvas.width;
    const sy = canvas.top + (target.y - view.y) / view.height * canvas.height;
    const cx = (safe.left + safe.right) / 2, cy = (safe.top + safe.bottom) / 2;
    const dx = sx - cx, dy = sy - cy;
    const tx = dx > 0 ? (safe.right - cx) / dx : dx < 0 ? (safe.left - cx) / dx : Infinity;
    const ty = dy > 0 ? (safe.bottom - cy) / dy : dy < 0 ? (safe.top - cy) / dy : Infinity;
    const k = Math.min(tx, ty);
    return { left: cx + dx * k, top: cy + dy * k, angle: Math.atan2(dy, dx) * 180 / Math.PI };
  }
  function visibleRect(id) {
    const el = document.getElementById(id);
    if (!el || !el.getBoundingClientRect) return null;
    const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (style && (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0)) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }
  function setText(el, text) { if (el.textContent !== text) el.textContent = text; }
  function attach(scene, options) {
    clear(scene);
    if (!document.body) return;
    if (!document.getElementById("grave-guide-style")) {
      const style = document.createElement("style"); style.id = "grave-guide-style";
      style.textContent = ".gf-grave-guide{position:fixed;z-index:8;pointer-events:none!important;display:flex;align-items:center;gap:7px;width:max-content;max-width:min(210px,70vw);box-sizing:border-box;padding:6px 9px;border:1px solid #d6a75e;border-radius:7px;background:rgba(40,28,17,.94);color:#fff0c6;box-shadow:0 2px 5px #0008;font:700 12px/1.3 system-ui,sans-serif;transform:translate(-50%,-50%)}.gf-grave-guide[hidden]{display:none}.gf-grave-guide svg{width:23px;height:23px;flex:none;overflow:visible;pointer-events:none}.gf-grave-guide small{display:block;color:#e4cfaa;font:600 11px/1.3 system-ui,sans-serif}.gf-grave-guide *{pointer-events:none!important}";
      document.head.appendChild(style);
    }
    const root = document.createElement("div"); root.className = "gf-grave-guide";
    root.setAttribute("role", "status"); root.setAttribute("aria-live", "off"); root.hidden = true;
    const ns = "http://www.w3.org/2000/svg", arrow = document.createElementNS(ns, "svg");
    arrow.setAttribute("viewBox", "0 0 24 24"); arrow.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M3 8h10V3l9 9-9 9v-5H3Z");
    path.setAttribute("fill", "#ffd66f"); path.setAttribute("stroke", "#7b4c20"); path.setAttribute("stroke-width", "1.3");
    arrow.appendChild(path);
    const body = document.createElement("span"), title = document.createElement("span"), detail = document.createElement("small");
    body.appendChild(title); body.appendChild(detail); root.appendChild(arrow); root.appendChild(body); document.body.appendChild(root);
    scene._graveGuide = { root, arrow, title, detail, options: options || {} };
  }
  function clear(scene) {
    if (scene._graveGuide) scene._graveGuide.root.remove();
    scene._graveGuide = null;
  }
  function update(scene) {
    const ui = scene._graveGuide;
    if (!ui) return;
    const t = ui.options.getOwnGrave ? ui.options.getOwnGrave(scene) : typeof tumba === "function" ? tumba() : null;
    const panel = document.getElementById("cuerpo-panel");
    const menu = document.getElementById("gmenu");
    const bloqueado = GF.uiOpen || GF.editMode || scene.leaving ||
      (typeof anyOvOpen === "function" && anyOvOpen()) ||
      (menu && !menu.classList.contains("collapsed")) ||
      (panel && panel.classList.contains("show"));
    const hasItems = t && (Array.isArray(t.items) ? t.items.length > 0 : t.hasItems === true);
    if (!t || (ui.options.isMine && !ui.options.isMine(t, scene)) || !hasItems || !(t.hasta > nowMs()) || bloqueado) { ui.root.hidden = true; return; }
    const cam = scene.cameras && scene.cameras.main;
    const canvas = scene.sys && scene.sys.game && scene.sys.game.canvas;
    if (!cam || !cam.worldView || cam.rotation || !canvas || !canvas.getBoundingClientRect) { ui.root.hidden = true; return; }
    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) { ui.root.hidden = true; return; }
    const area = { left: Math.max(0, rect.left) + 12, top: Math.max(0, rect.top) + 12,
      right: Math.min(window.innerWidth, rect.right) - 12, bottom: Math.min(window.innerHeight, rect.bottom) - 12 };
    const hud = visibleRect("hudbar"), hotbar = visibleRect("hotwrap");
    if (hud) area.top = Math.max(area.top, hud.bottom + 12);
    if (hotbar) area.bottom = Math.min(area.bottom, hotbar.top - 12);
    const leftUi = visibleRect("compras-accesos"), rightUi = visibleRect("morral");
    const centerX = (area.left + area.right) / 2;
    if (leftUi && leftUi.right < centerX) area.left = Math.max(area.left, leftUi.right + 12);
    if (rightUi && rightUi.left > centerX) area.right = Math.min(area.right, rightUi.left - 12);
    if (area.right - area.left < 130 || area.bottom - area.top < 70) { ui.root.hidden = true; return; }
    const sec = Math.ceil((t.hasta - nowMs()) / 1000);
    const queda = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
    let target = { x: t.x, y: t.y }, otherZone = !!(t.zona && t.zona !== scene.zonaKey), route = false;
    let zone = "";
    if (otherZone) {
      zone = typeof ZONA_DEF !== "undefined" && ZONA_DEF[t.zona] ? ZONA_DEF[t.zona].label : "otra zona";
      const custom = ui.options.getRouteTarget ? ui.options.getRouteTarget(t, scene) : null;
      if (custom && Number.isFinite(custom.x) && Number.isFinite(custom.y)) {
        route = true;
        target = {x: custom.x, y: custom.y};
      } else if (scene.portal && Number.isFinite(scene.portal.cx) && Number.isFinite(scene.portal.by)) {
        route = true;
        target = { x: scene.portal.cx, y: scene.portal.by };
      } else {
      const order = typeof ZONA_ORDER !== "undefined" ? ZONA_ORDER : [];
      const here = order.indexOf(scene.zonaKey), there = order.indexOf(t.zona);
      if (here >= 0 && there >= 0 && here !== there) {
        const right = there > here;
        route = right ? !!scene.salidaDer : !!scene.salidaIzq;
        target = right ? { x: scene.W - 30, y: scene.H / 2 } : { x: 26, y: scene.H / 2 };
      }
      }
    }
    setText(ui.title, otherZone ? "Tu calavera: " + zone : "Tu calavera");
    setText(ui.detail, (otherZone && route ? "Hacia el portal · Desaparece en " : "Desaparece en ") + queda);
    // Medir el tamaño real permite guardar toda la leyenda dentro de los límites en móvil y PC.
    ui.root.hidden = false; ui.root.style.visibility = "hidden";
    const bounds = ui.root.getBoundingClientRect(), halfW = bounds.width / 2, halfH = bounds.height / 2;
    const safe = { left: area.left + halfW, right: area.right - halfW, top: area.top + halfH, bottom: area.bottom - halfH };
    if (safe.left > safe.right || safe.top > safe.bottom) { ui.root.hidden = true; ui.root.style.visibility = ""; return; }
    let pos = otherZone && !route ? { left: (safe.left + safe.right) / 2, top: safe.top, angle: 0 } : positionFor(target, cam.worldView, rect, safe);
    if (!pos && otherZone && route) {
      // El portal ya está en pantalla: señalar el portal, nunca las coordenadas del otro mapa.
      const sx = rect.left + (target.x - cam.worldView.x) / cam.worldView.width * rect.width;
      const sy = rect.top + (target.y - cam.worldView.y) / cam.worldView.height * rect.height;
      pos = { left: Math.max(safe.left, Math.min(safe.right, sx)), top: Math.max(safe.top, Math.min(safe.bottom, sy - halfH - 16)), angle: 90 };
    }
    if (!pos) { ui.root.hidden = true; ui.root.style.visibility = ""; return; }
    ui.arrow.style.display = otherZone && !route ? "none" : "";
    ui.arrow.style.transform = "rotate(" + pos.angle + "deg)";
    ui.root.style.left = pos.left + "px"; ui.root.style.top = pos.top + "px"; ui.root.style.visibility = "";
  }
  window.GoldenGraveGuide = { attach, update, clear, positionFor };
})();
