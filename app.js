// Photzia v3 — Seleção (marquee) + Transform (move/scale), Copy/Cut/Paste, Commit/Cancel.

const view = document.getElementById("view");
const vctx = view.getContext("2d");

const layersEl = document.getElementById("layers");

const btnNewLayer = document.getElementById("btnNewLayer");
const btnExport = document.getElementById("btnExport");
const btnUndo = document.getElementById("btnUndo");
const btnRedo = document.getElementById("btnRedo");
const btnSaveProject = document.getElementById("btnSaveProject");

const fileImportImage = document.getElementById("fileImportImage");
const fileOpenProject = document.getElementById("fileOpenProject");

const toolgrid = document.getElementById("toolgrid");

const size = document.getElementById("size");
const sizeLabel = document.getElementById("sizeLabel");
const color = document.getElementById("color");
const opacity = document.getElementById("opacity");
const opacityLabel = document.getElementById("opacityLabel");

const zoom = document.getElementById("zoom");
const zoomLabel = document.getElementById("zoomLabel");

// Active layer props
const noActiveLayer = document.getElementById("noActiveLayer");
const activeLayerProps = document.getElementById("activeLayerProps");
const layerName = document.getElementById("layerName");
const layerOpacity = document.getElementById("layerOpacity");
const layerOpacityLabel = document.getElementById("layerOpacityLabel");
const layerBlend = document.getElementById("layerBlend");
const btnClearLayer = document.getElementById("btnClearLayer");
const btnDeleteLayer = document.getElementById("btnDeleteLayer");

// Selection UI
const selEmpty = document.getElementById("selEmpty");
const selProps = document.getElementById("selProps");
const selWH = document.getElementById("selWH");
const selXY = document.getElementById("selXY");
const btnSelCommit = document.getElementById("btnSelCommit");
const btnSelCancel = document.getElementById("btnSelCancel");
const btnSelCopy = document.getElementById("btnSelCopy");
const btnSelCut = document.getElementById("btnSelCut");
const btnSelPaste = document.getElementById("btnSelPaste");

// Theme modal
const btnTheme = document.getElementById("btnTheme");
const themeModal = document.getElementById("themeModal");
const themeModalBackdrop = document.getElementById("themeModalBackdrop");
const btnCloseTheme = document.getElementById("btnCloseTheme");
const btnSaveTheme = document.getElementById("btnSaveTheme");
const btnResetTheme = document.getElementById("btnResetTheme");
const themePresetsEl = document.getElementById("themePresets");
const themeName = document.getElementById("themeName");

const t_bg = document.getElementById("t_bg");
const t_panel = document.getElementById("t_panel");
const t_text = document.getElementById("t_text");
const t_accent = document.getElementById("t_accent");
const t_border = document.getElementById("t_border");
const t_canvas = document.getElementById("t_canvas");

const DEFAULT_THEME = {
  "--bg": "#0b0f14",
  "--panel": "#111827",
  "--panel2": "#0f172a",
  "--text": "#e5e7eb",
  "--muted": "#94a3b8",
  "--accent": "#7c3aed",
  "--border": "#243041",
  "--canvas": "#0a0a0a",
};

function applyTheme(themeObj){
  for (const [k,v] of Object.entries(themeObj)){
    document.documentElement.style.setProperty(k, v);
  }
  t_bg.value = cssToHex(getCss("--bg"));
  t_panel.value = cssToHex(getCss("--panel"));
  t_text.value = cssToHex(getCss("--text"));
  t_accent.value = cssToHex(getCss("--accent"));
  t_border.value = cssToHex(getCss("--border"));
  t_canvas.value = cssToHex(getCss("--canvas"));
}
function getCss(varName){
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}
function cssToHex(c){
  if (!c) return "#000000";
  if (c.startsWith("#")) return c;
  const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
  if (!m) return "#000000";
  const [r,g,b] = m.slice(1).map(n => parseInt(n,10));
  return "#" + [r,g,b].map(x => x.toString(16).padStart(2,"0")).join("");
}
function openTheme(){
  themeModal.hidden = false;
  themeModalBackdrop.hidden = false;
  applyTheme({
    "--bg": getCss("--bg"),
    "--panel": getCss("--panel"),
    "--text": getCss("--text"),
    "--accent": getCss("--accent"),
    "--border": getCss("--border"),
    "--canvas": getCss("--canvas"),
  });
  renderPresets();
}
function closeTheme(){
  themeModal.hidden = true;
  themeModalBackdrop.hidden = true;
}
btnTheme.addEventListener("click", openTheme);
btnCloseTheme.addEventListener("click", closeTheme);
themeModalBackdrop.addEventListener("click", closeTheme);

function getPresets(){
  return JSON.parse(localStorage.getItem("photzia_theme_presets") || "{}");
}
function setPresets(p){
  localStorage.setItem("photzia_theme_presets", JSON.stringify(p));
}
function currentThemeObj(){
  return {
    "--bg": t_bg.value,
    "--panel": t_panel.value,
    "--text": t_text.value,
    "--accent": t_accent.value,
    "--border": t_border.value,
    "--canvas": t_canvas.value,
  };
}
[t_bg, t_panel, t_text, t_accent, t_border, t_canvas].forEach(inp => {
  inp.addEventListener("input", () => applyTheme(currentThemeObj()));
});
btnSaveTheme.addEventListener("click", () => {
  const name = (themeName.value || "").trim();
  if (!name) return;
  const presets = getPresets();
  presets[name] = currentThemeObj();
  setPresets(presets);
  renderPresets();
  themeName.value = "";
});
btnResetTheme.addEventListener("click", () => {
  applyTheme(DEFAULT_THEME);
  renderPresets();
});
function renderPresets(){
  const presets = getPresets();
  themePresetsEl.innerHTML = "";
  const names = Object.keys(presets);
  if (!names.length){
    const p = document.createElement("div");
    p.className = "muted";
    p.textContent = "Nenhum preset salvo ainda.";
    themePresetsEl.appendChild(p);
    return;
  }
  for (const name of names){
    const wrap = document.createElement("div");
    wrap.className = "preset";
    const label = document.createElement("span");
    label.className = "muted";
    label.textContent = name;

    const btnLoad = document.createElement("button");
    btnLoad.textContent = "Carregar";
    btnLoad.addEventListener("click", () => applyTheme(presets[name]));

    const btnDel = document.createElement("button");
    btnDel.textContent = "Apagar";
    btnDel.addEventListener("click", () => {
      const p = getPresets();
      delete p[name];
      setPresets(p);
      renderPresets();
    });

    wrap.appendChild(label);
    wrap.appendChild(btnLoad);
    wrap.appendChild(btnDel);
    themePresetsEl.appendChild(wrap);
  }
}

// ===== State =====
const state = {
  tool: "brush",
  brushSize: parseInt(size.value, 10),
  brushColor: color.value,
  opacity: parseInt(opacity.value, 10) / 100,
  zoom: parseInt(zoom.value, 10) / 100,

  layers: [],
  activeLayerId: null,

  isPointerDown: false,
  last: null,

  moving: { start: null, layerStart: null },

  // selection + transform
  selection: {
    active: false,
    // selection rect in document(canvas) coords
    x: 0, y: 0, w: 0, h: 0,

    // floating buffer (pixels)
    buffer: null, // canvas
    bufferW: 0,
    bufferH: 0,

    // transform of buffer
    tx: 0, ty: 0, // top-left in document coords
    tw: 0, th: 0, // transformed size

    mode: "idle", // "creating" | "moving" | "scaling"
    anchor: null, // handle id
    start: null,  // pointer start info
    lifted: false, // whether pixels have been removed from layer already
    changed: false,
  },

  clipboard: null, // { png, w, h } or { canvas }
  history: { past: [], future: [], max: 40 }
};

function makeLayer(name){
  const c = document.createElement("canvas");
  c.width = view.width;
  c.height = view.height;
  const ctx = c.getContext("2d");

  return {
    id: crypto.randomUUID(),
    name: name || `Layer ${state.layers.length + 1}`,
    visible: true,
    opacity: 1,
    blend: "source-over",
    canvas: c,
    ctx,
    x: 0,
    y: 0,
  };
}

function getActiveLayer(){
  return state.layers.find(l => l.id === state.activeLayerId) || null;
}

// ===== History =====
function layerToDataURL(layer){
  return layer.canvas.toDataURL("image/png");
}
function snapshot(){
  return {
    version: 3,
    w: view.width,
    h: view.height,
    zoom: state.zoom,
    activeLayerId: state.activeLayerId,
    layers: state.layers.map(l => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      opacity: l.opacity,
      blend: l.blend,
      x: l.x,
      y: l.y,
      png: layerToDataURL(l),
    })),
    theme: {
      "--bg": getCss("--bg"),
      "--panel": getCss("--panel"),
      "--panel2": getCss("--panel2"),
      "--text": getCss("--text"),
      "--muted": getCss("--muted"),
      "--accent": getCss("--accent"),
      "--border": getCss("--border"),
      "--canvas": getCss("--canvas"),
    }
  };
}

async function restore(snap){
  if (!snap || !snap.layers) return;

  // cancel any selection (avoid half-state)
  cancelSelection(false);

  if (snap.w && snap.h){
    view.width = snap.w;
    view.height = snap.h;
  }
  if (snap.theme) applyTheme(snap.theme);

  state.layers = [];
  for (const L of snap.layers){
    const layer = makeLayer(L.name);
    layer.id = L.id;
    layer.visible = !!L.visible;
    layer.opacity = typeof L.opacity === "number" ? L.opacity : 1;
    layer.blend = L.blend || "source-over";
    layer.x = L.x || 0;
    layer.y = L.y || 0;
    await drawPngToLayer(layer, L.png);
    state.layers.push(layer);
  }

  state.activeLayerId = snap.activeLayerId || (state.layers[0]?.id ?? null);
  state.zoom = typeof snap.zoom === "number" ? snap.zoom : state.zoom;

  zoom.value = String(Math.round(state.zoom * 100));
  zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;

  renderLayersUI();
  syncActiveLayerPanel();
  syncSelectionPanel();
  drawComposite();
}

function commitHistory(){
  const snap = snapshot();
  state.history.past.push(snap);
  if (state.history.past.length > state.history.max) state.history.past.shift();
  state.history.future = [];
  syncUndoRedoButtons();
}

async function undo(){
  if (state.history.past.length <= 1) return;
  const current = state.history.past.pop();
  state.history.future.push(current);
  const prev = state.history.past[state.history.past.length - 1];
  await restore(prev);
  syncUndoRedoButtons();
}
async function redo(){
  if (!state.history.future.length) return;
  const next = state.history.future.pop();
  state.history.past.push(next);
  await restore(next);
  syncUndoRedoButtons();
}
function syncUndoRedoButtons(){
  btnUndo.disabled = state.history.past.length <= 1;
  btnRedo.disabled = state.history.future.length === 0;
  btnUndo.style.opacity = btnUndo.disabled ? .5 : 1;
  btnRedo.style.opacity = btnRedo.disabled ? .5 : 1;
}

// ===== Rendering =====
function clearView(){
  vctx.setTransform(1,0,0,1,0,0);
  vctx.clearRect(0,0,view.width, view.height);
}

function applyZoomTransform(ctx){
  const z = state.zoom;
  const cx = view.width / 2;
  const cy = view.height / 2;
  ctx.setTransform(z, 0, 0, z, cx - cx*z, cy - cy*z);
}

function drawComposite(){
  clearView();
  applyZoomTransform(vctx);

  const ordered = [...state.layers].reverse();
  for (const layer of ordered){
    if (!layer.visible) continue;
    vctx.save();
    vctx.globalAlpha = layer.opacity;
    vctx.globalCompositeOperation = layer.blend;
    vctx.drawImage(layer.canvas, layer.x, layer.y);
    vctx.restore();
  }

  drawSelectionOverlay();
}

function drawSelectionOverlay(){
  const sel = state.selection;
  if (!sel.active) return;

  // Selection box is in document coords; just draw on top using same transform.
  vctx.save();
  vctx.globalAlpha = 1;
  vctx.globalCompositeOperation = "source-over";

  // box
  vctx.setLineDash([6, 4]);
  vctx.lineWidth = 1 / state.zoom; // keep visually stable
  vctx.strokeStyle = "rgba(255,255,255,0.9)";
  vctx.strokeRect(sel.tx, sel.ty, sel.tw, sel.th);

  // handles (corners)
  vctx.setLineDash([]);
  const hs = 8 / state.zoom;
  const handles = getHandles(sel);
  vctx.fillStyle = "rgba(255,255,255,0.95)";
  vctx.strokeStyle = "rgba(0,0,0,0.55)";
  vctx.lineWidth = 1 / state.zoom;

  for (const h of handles){
    vctx.beginPath();
    vctx.rect(h.x - hs/2, h.y - hs/2, hs, hs);
    vctx.fill();
    vctx.stroke();
  }

  // floating buffer preview (if lifted)
  if (sel.buffer){
    vctx.save();
    vctx.globalAlpha = 0.95;
    vctx.globalCompositeOperation = "source-over";
    vctx.drawImage(sel.buffer, sel.tx, sel.ty, sel.tw, sel.th);
    vctx.restore();
  }

  vctx.restore();
}

// ===== Pointer coords =====
function getPointerPos(e){
  const rect = view.getBoundingClientRect();
  const px = (e.clientX - rect.left);
  const py = (e.clientY - rect.top);

  const z = state.zoom;
  const cx = view.width / 2;
  const cy = view.height / 2;

  const sx = view.width / rect.width;
  const sy = view.height / rect.height;

  let x = px * sx;
  let y = py * sy;

  x = (x - (cx - cx*z)) / z;
  y = (y - (cy - cy*z)) / z;

  return { x, y };
}

// ===== Tools =====
function setTool(tool){
  state.tool = tool;
  [...toolgrid.querySelectorAll(".tool")].forEach(b => {
    b.classList.toggle("active", b.dataset.tool === tool);
  });
}
toolgrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".tool");
  if (!btn) return;
  setTool(btn.dataset.tool);
});

// Shortcuts
window.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;

  // tools
  if (!ctrl && !e.altKey){
    if (e.key === "b" || e.key === "B") setTool("brush");
    if (e.key === "e" || e.key === "E") setTool("eraser");
    if (e.key === "v" || e.key === "V") setTool("move");
    if (e.key === "m" || e.key === "M") setTool("select");
  }

  // selection control
  if (e.key === "Escape"){
    if (state.selection.active){
      e.preventDefault();
      cancelSelection(true);
      drawComposite();
    }
    return;
  }

  if (e.key === "Enter"){
    if (state.selection.active){
      e.preventDefault();
      commitSelection();
    }
    return;
  }

  // undo/redo
  if (ctrl){
    if ((e.key === "z" || e.key === "Z") && e.shiftKey){
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === "z" || e.key === "Z"){
      e.preventDefault();
      undo();
      return;
    }
    if (e.key === "y" || e.key === "Y"){
      e.preventDefault();
      redo();
      return;
    }

    // clipboard internal
    if (e.key === "c" || e.key === "C"){
      if (state.selection.active){ e.preventDefault(); copySelection(); }
      return;
    }
    if (e.key === "x" || e.key === "X"){
      if (state.selection.active){ e.preventDefault(); cutSelection(); }
      return;
    }
    if (e.key === "v" || e.key === "V"){
      // paste is allowed even without selection
      e.preventDefault();
      pasteClipboard();
      return;
    }
  }
});

// Brush controls
size.addEventListener("input", () => {
  state.brushSize = parseInt(size.value, 10);
  sizeLabel.textContent = String(state.brushSize);
});
color.addEventListener("input", () => state.brushColor = color.value);
opacity.addEventListener("input", () => {
  state.opacity = parseInt(opacity.value, 10) / 100;
  opacityLabel.textContent = `${Math.round(state.opacity * 100)}%`;
});

// Zoom
zoom.addEventListener("input", () => {
  state.zoom = parseInt(zoom.value, 10) / 100;
  zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  drawComposite();
});

// ===== Drawing to layer =====
function strokeTo(layer, from, to, erase=false){
  const ctx = layer.ctx;
  ctx.save();
  ctx.globalAlpha = state.opacity;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = state.brushSize;

  if (erase){
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = state.brushColor;
  }

  ctx.beginPath();
  ctx.moveTo(from.x - layer.x, from.y - layer.y);
  ctx.lineTo(to.x - layer.x, to.y - layer.y);
  ctx.stroke();
  ctx.restore();
}

// gesture commit
let gestureDidChange = false;

view.addEventListener("pointerdown", (e) => {
  view.setPointerCapture(e.pointerId);
  state.isPointerDown = true;

  const pos = getPointerPos(e);
  state.last = pos;
  gestureDidChange = false;

  const layer = getActiveLayer();
  if (!layer) return;

  // selection tool
  if (state.tool === "select"){
    pointerDownSelect(pos);
    drawComposite();
    return;
  }

  // if user starts drawing with an active selection, commit it first (like “apply before paint”)
  if (state.selection.active){
    commitSelection(false);
  }

  if (state.tool === "move"){
    state.moving.start = pos;
    state.moving.layerStart = { x: layer.x, y: layer.y };
    return;
  }

  // dot
  strokeTo(layer, pos, {x: pos.x + 0.01, y: pos.y + 0.01}, state.tool === "eraser");
  gestureDidChange = true;
  drawComposite();
});

view.addEventListener("pointermove", (e) => {
  if (!state.isPointerDown) return;
  const pos = getPointerPos(e);

  const layer = getActiveLayer();
  if (!layer) return;

  if (state.tool === "select"){
    pointerMoveSelect(pos);
    drawComposite();
    return;
  }

  if (state.tool === "move"){
    const dx = pos.x - state.moving.start.x;
    const dy = pos.y - state.moving.start.y;
    if (dx !== 0 || dy !== 0) gestureDidChange = true;
    layer.x = state.moving.layerStart.x + dx;
    layer.y = state.moving.layerStart.y + dy;
    drawComposite();
    return;
  }

  strokeTo(layer, state.last, pos, state.tool === "eraser");
  gestureDidChange = true;
  state.last = pos;
  drawComposite();
});

view.addEventListener("pointerup", () => {
  state.isPointerDown = false;
  state.last = null;
  state.moving.start = null;
  state.moving.layerStart = null;

  // selection tool finalization is handled in pointerUpSelect
  if (state.tool === "select"){
    pointerUpSelect();
    drawComposite();
    return;
  }

  if (gestureDidChange){
    commitHistory();
    gestureDidChange = false;
  }
});

// ===== Selection core =====
function normalizeRect(x1,y1,x2,y2){
  const x = Math.min(x1,x2);
  const y = Math.min(y1,y2);
  const w = Math.abs(x2-x1);
  const h = Math.abs(y2-y1);
  return {x,y,w,h};
}

function setSelectionRect(x,y,w,h){
  const sel = state.selection;
  sel.active = true;
  sel.x = x; sel.y = y; sel.w = w; sel.h = h;

  // initial transform matches selection box
  sel.tx = x; sel.ty = y; sel.tw = w; sel.th = h;

  sel.changed = false;
  sel.mode = "idle";
  sel.anchor = null;
  sel.start = null;
  sel.lifted = false;

  sel.buffer = null;
  sel.bufferW = 0;
  sel.bufferH = 0;

  syncSelectionPanel();
}

function clearSelectionState(){
  const sel = state.selection;
  sel.active = false;
  sel.x=sel.y=sel.w=sel.h=0;
  sel.tx=sel.ty=sel.tw=sel.th=0;
  sel.buffer = null;
  sel.bufferW = 0; sel.bufferH = 0;
  sel.mode = "idle";
  sel.anchor = null;
  sel.start = null;
  sel.lifted = false;
  sel.changed = false;
  syncSelectionPanel();
}

function syncSelectionPanel(){
  const sel = state.selection;
  const has = sel.active;
  selEmpty.hidden = has;
  selProps.hidden = !has;
  if (!has) return;

  selWH.textContent = `${Math.round(sel.tw)}×${Math.round(sel.th)}`;
  selXY.textContent = `${Math.round(sel.tx)},${Math.round(sel.ty)}`;
}

// handles: four corners
function getHandles(sel){
  const x1 = sel.tx, y1 = sel.ty;
  const x2 = sel.tx + sel.tw, y2 = sel.ty + sel.th;
  return [
    { id:"nw", x:x1, y:y1 },
    { id:"ne", x:x2, y:y1 },
    { id:"se", x:x2, y:y2 },
    { id:"sw", x:x1, y:y2 },
  ];
}

function hitTestHandle(pos){
  const sel = state.selection;
  if (!sel.active) return null;
  const hs = 10 / state.zoom;
  for (const h of getHandles(sel)){
    if (Math.abs(pos.x - h.x) <= hs && Math.abs(pos.y - h.y) <= hs){
      return h.id;
    }
  }
  return null;
}

function pointInRect(px,py,x,y,w,h){
  return px>=x && py>=y && px<=x+w && py<=y+h;
}

function ensureBufferFromLayer(){
  const sel = state.selection;
  const layer = getActiveLayer();
  if (!layer) return false;

  // if already has buffer, ok
  if (sel.buffer) return true;

  // create buffer from pixels in selection area (document coords -> layer coords)
  const bw = Math.max(1, Math.floor(sel.w));
  const bh = Math.max(1, Math.floor(sel.h));
  const buf = document.createElement("canvas");
  buf.width = bw;
  buf.height = bh;
  const bctx = buf.getContext("2d");

  // source area in the layer is (sel.x - layer.x, sel.y - layer.y)
  const sx = Math.floor(sel.x - layer.x);
  const sy = Math.floor(sel.y - layer.y);

  bctx.drawImage(layer.canvas, sx, sy, bw, bh, 0, 0, bw, bh);

  sel.buffer = buf;
  sel.bufferW = bw;
  sel.bufferH = bh;

  return true;
}

function liftPixelsIfNeeded(){
  const sel = state.selection;
  const layer = getActiveLayer();
  if (!layer) return;

  if (sel.lifted) return;
  if (!sel.buffer) return;

  // remove pixels from original region (cut-out)
  layer.ctx.save();
  layer.ctx.globalCompositeOperation = "destination-out";
  layer.ctx.fillStyle = "rgba(0,0,0,1)";
  layer.ctx.fillRect(sel.x - layer.x, sel.y - layer.y, sel.w, sel.h);
  layer.ctx.restore();

  sel.lifted = true;
}

function pointerDownSelect(pos){
  const sel = state.selection;

  // if there is an active selection: allow move/scale
  if (sel.active){
    const handle = hitTestHandle(pos);
    if (handle){
      // start scaling
      ensureBufferFromLayer();
      liftPixelsIfNeeded();
      sel.mode = "scaling";
      sel.anchor = handle;
      sel.start = {
        px: pos.x, py: pos.y,
        tx: sel.tx, ty: sel.ty, tw: sel.tw, th: sel.th
      };
      return;
    }

    // inside selection -> move
    if (pointInRect(pos.x, pos.y, sel.tx, sel.ty, sel.tw, sel.th)){
      ensureBufferFromLayer();
      liftPixelsIfNeeded();
      sel.mode = "moving";
      sel.start = {
        px: pos.x, py: pos.y,
        tx: sel.tx, ty: sel.ty
      };
      return;
    }

    // click outside -> start a new selection (cancel old without committing)
    cancelSelection(true);
  }

  // start creating
  sel.active = true;
  sel.mode = "creating";
  sel.start = { px: pos.x, py: pos.y };
  sel.x = pos.x; sel.y = pos.y; sel.w = 0; sel.h = 0;
  sel.tx = pos.x; sel.ty = pos.y; sel.tw = 0; sel.th = 0;
  sel.buffer = null;
  sel.lifted = false;
  sel.changed = false;
  syncSelectionPanel();
}

function pointerMoveSelect(pos){
  const sel = state.selection;
  if (!sel.active) return;

  if (sel.mode === "creating"){
    const r = normalizeRect(sel.start.px, sel.start.py, pos.x, pos.y);
    sel.x = r.x; sel.y = r.y; sel.w = r.w; sel.h = r.h;
    sel.tx = r.x; sel.ty = r.y; sel.tw = r.w; sel.th = r.h;
    syncSelectionPanel();
    return;
  }

  if (sel.mode === "moving"){
    const dx = pos.x - sel.start.px;
    const dy = pos.y - sel.start.py;
    sel.tx = sel.start.tx + dx;
    sel.ty = sel.start.ty + dy;
    sel.changed = true;
    syncSelectionPanel();
    return;
  }

  if (sel.mode === "scaling"){
    const dx = pos.x - sel.start.px;
    const dy = pos.y - sel.start.py;

    let { tx, ty, tw, th } = sel.start;

    // scale based on which handle is being dragged
    // Keep opposite corner fixed.
    const x1 = tx;
    const y1 = ty;
    const x2 = tx + tw;
    const y2 = ty + th;

    let nx1 = x1, ny1 = y1, nx2 = x2, ny2 = y2;

    switch(sel.anchor){
      case "nw": nx1 = x1 + dx; ny1 = y1 + dy; break;
      case "ne": nx2 = x2 + dx; ny1 = y1 + dy; break;
      case "se": nx2 = x2 + dx; ny2 = y2 + dy; break;
      case "sw": nx1 = x1 + dx; ny2 = y2 + dy; break;
    }

    // prevent flip (minimum size)
    const minSize = 4;
    if (Math.abs(nx2 - nx1) < minSize) nx2 = nx1 + Math.sign(nx2 - nx1 || 1) * minSize;
    if (Math.abs(ny2 - ny1) < minSize) ny2 = ny1 + Math.sign(ny2 - ny1 || 1) * minSize;

    sel.tx = Math.min(nx1,nx2);
    sel.ty = Math.min(ny1,ny2);
    sel.tw = Math.abs(nx2-nx1);
    sel.th = Math.abs(ny2-ny1);

    sel.changed = true;
    syncSelectionPanel();
    return;
  }
}

function pointerUpSelect(){
  const sel = state.selection;
  if (!sel.active) return;

  if (sel.mode === "creating"){
    // if too small, cancel
    if (sel.w < 2 || sel.h < 2){
      clearSelectionState();
      return;
    }
    sel.mode = "idle";
    sel.start = null;
    sel.anchor = null;
    // do not create buffer yet (lazy)
    syncSelectionPanel();
    return;
  }

  if (sel.mode === "moving" || sel.mode === "scaling"){
    sel.mode = "idle";
    sel.start = null;
    sel.anchor = null;
    syncSelectionPanel();
    return;
  }
}

function commitSelection(pushHistory=true){
  const sel = state.selection;
  const layer = getActiveLayer();
  if (!sel.active || !layer) return;

  // if there were no changes and not lifted, just keep selection? We'll end selection without changing.
  if (!sel.buffer){
    // selection exists but no transform; nothing to apply
    clearSelectionState();
    drawComposite();
    return;
  }

  // Draw buffer back to layer with transformed bounds
  layer.ctx.save();
  layer.ctx.globalCompositeOperation = "source-over";
  layer.ctx.globalAlpha = 1;
  layer.ctx.drawImage(sel.buffer, sel.tx - layer.x, sel.ty - layer.y, sel.tw, sel.th);
  layer.ctx.restore();

  clearSelectionState();
  drawComposite();
  if (pushHistory) commitHistory();
}

function cancelSelection(pushHistory){
  const sel = state.selection;
  const layer = getActiveLayer();

  if (!sel.active){
    syncSelectionPanel();
    return;
  }

  // If we lifted pixels, we must restore them to original place
  if (sel.buffer && sel.lifted && layer){
    layer.ctx.save();
    layer.ctx.globalCompositeOperation = "source-over";
    layer.ctx.globalAlpha = 1;
    // restore original at original selection rect
    layer.ctx.drawImage(sel.buffer, sel.x - layer.x, sel.y - layer.y, sel.w, sel.h);
    layer.ctx.restore();

    if (pushHistory) commitHistory();
  }

  clearSelectionState();
}

// ===== Clipboard ops =====
function copySelection(){
  const sel = state.selection;
  if (!sel.active) return;
  if (!ensureBufferFromLayer()) return;

  // store PNG to keep simple and resilient
  state.clipboard = {
    png: sel.buffer.toDataURL("image/png"),
    w: sel.bufferW,
    h: sel.bufferH,
  };
}

function cutSelection(){
  const sel = state.selection;
  if (!sel.active) return;
  if (!ensureBufferFromLayer()) return;

  copySelection();
  // lift immediately (remove from layer)
  liftPixelsIfNeeded();
  sel.changed = true;
  drawComposite();
  commitHistory();
}

async function pasteClipboard(){
  if (!state.clipboard) return;
  const layer = getActiveLayer();
  if (!layer) return;

  // commit any active selection first
  if (state.selection.active){
    commitSelection(false);
  }

  const img = await loadImageFromDataURL(state.clipboard.png);

  // create a buffer canvas from clipboard
  const buf = document.createElement("canvas");
  buf.width = img.width;
  buf.height = img.height;
  buf.getContext("2d").drawImage(img, 0, 0);

  // center paste
  const x = Math.round((view.width - img.width) / 2);
  const y = Math.round((view.height - img.height) / 2);

  const sel = state.selection;
  sel.active = true;
  sel.x = x; sel.y = y; sel.w = img.width; sel.h = img.height;
  sel.tx = x; sel.ty = y; sel.tw = img.width; sel.th = img.height;

  sel.buffer = buf;
  sel.bufferW = img.width;
  sel.bufferH = img.height;

  sel.lifted = true; // it's a floating paste, not from layer pixels
  sel.changed = true;
  sel.mode = "idle";
  sel.start = null;
  sel.anchor = null;

  syncSelectionPanel();
  drawComposite();
}

btnSelCommit.addEventListener("click", () => commitSelection(true));
btnSelCancel.addEventListener("click", () => { cancelSelection(true); drawComposite(); });
btnSelCopy.addEventListener("click", () => copySelection());
btnSelCut.addEventListener("click", () => cutSelection());
btnSelPaste.addEventListener("click", () => pasteClipboard());

// ===== Layers UI =====
function renderLayersUI(){
  layersEl.innerHTML = "";
  for (const layer of state.layers){
    const row = document.createElement("div");
    row.className = "layer" + (layer.id === state.activeLayerId ? " active" : "");
    row.addEventListener("click", () => {
      // if selection exists, apply before switching (avoids confusion)
      if (state.selection.active) commitSelection(false);

      state.activeLayerId = layer.id;
      renderLayersUI();
      syncActiveLayerPanel();
      syncSelectionPanel();
      drawComposite();
    });

    const eye = document.createElement("button");
    eye.className = "eye";
    eye.textContent = layer.visible ? "👁" : "🚫";
    eye.title = "Visibilidade";
    eye.addEventListener("click", (e) => {
      e.stopPropagation();
      layer.visible = !layer.visible;
      renderLayersUI();
      drawComposite();
      commitHistory();
    });

    const name = document.createElement("div");
    name.textContent = layer.name;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.title = "Blend";
    badge.textContent = shortBlend(layer.blend);

    row.appendChild(eye);
    row.appendChild(name);
    row.appendChild(badge);

    layersEl.appendChild(row);
  }
}

function shortBlend(b){
  const map = {
    "source-over": "N",
    "multiply": "M",
    "screen": "S",
    "overlay": "O",
    "darken": "D",
    "lighten": "L",
  };
  return map[b] || "?";
}

function syncActiveLayerPanel(){
  const layer = getActiveLayer();
  const has = !!layer;

  noActiveLayer.hidden = has;
  activeLayerProps.hidden = !has;

  if (!layer) return;

  layerName.value = layer.name;
  layerOpacity.value = String(Math.round(layer.opacity * 100));
  layerOpacityLabel.textContent = `${Math.round(layer.opacity * 100)}%`;
  layerBlend.value = layer.blend;
}

layerName.addEventListener("input", () => {
  const layer = getActiveLayer();
  if (!layer) return;
  layer.name = layerName.value;
  renderLayersUI();
});
layerName.addEventListener("change", () => {
  const layer = getActiveLayer();
  if (!layer) return;
  commitHistory();
});

layerOpacity.addEventListener("input", () => {
  const layer = getActiveLayer();
  if (!layer) return;
  layer.opacity = parseInt(layerOpacity.value, 10) / 100;
  layerOpacityLabel.textContent = `${Math.round(layer.opacity * 100)}%`;
  drawComposite();
});
layerOpacity.addEventListener("change", () => commitHistory());

layerBlend.addEventListener("change", () => {
  const layer = getActiveLayer();
  if (!layer) return;
  layer.blend = layerBlend.value;
  renderLayersUI();
  drawComposite();
  commitHistory();
});

btnClearLayer.addEventListener("click", () => {
  // apply selection first to avoid “sumir”
  if (state.selection.active) commitSelection(false);

  const layer = getActiveLayer();
  if (!layer) return;
  layer.ctx.clearRect(0,0,layer.canvas.width, layer.canvas.height);
  drawComposite();
  commitHistory();
});

btnDeleteLayer.addEventListener("click", () => {
  if (state.selection.active) commitSelection(false);

  const layer = getActiveLayer();
  if (!layer) return;
  const idx = state.layers.findIndex(l => l.id === layer.id);
  if (idx >= 0) state.layers.splice(idx, 1);
  state.activeLayerId = state.layers[0]?.id ?? null;
  renderLayersUI();
  syncActiveLayerPanel();
  drawComposite();
  commitHistory();
});

// ===== Actions =====
function addLayer(name){
  if (state.selection.active) commitSelection(false);

  const layer = makeLayer(name);
  state.layers.unshift(layer);
  state.activeLayerId = layer.id;
  renderLayersUI();
  syncActiveLayerPanel();
  drawComposite();
  commitHistory();
}

btnNewLayer.addEventListener("click", () => addLayer());

btnExport.addEventListener("click", () => {
  if (state.selection.active) commitSelection(false);

  const out = document.createElement("canvas");
  out.width = view.width;
  out.height = view.height;
  const octx = out.getContext("2d");

  const ordered = [...state.layers].reverse();
  for (const layer of ordered){
    if (!layer.visible) continue;
    octx.save();
    octx.globalAlpha = layer.opacity;
    octx.globalCompositeOperation = layer.blend;
    octx.drawImage(layer.canvas, layer.x, layer.y);
    octx.restore();
  }

  const a = document.createElement("a");
  a.download = "photzia.png";
  a.href = out.toDataURL("image/png");
  a.click();
});

btnUndo.addEventListener("click", () => undo());
btnRedo.addEventListener("click", () => redo());

// ===== Import image as layer =====
fileImportImage.addEventListener("change", async () => {
  const file = fileImportImage.files?.[0];
  fileImportImage.value = "";
  if (!file) return;

  if (state.selection.active) commitSelection(false);

  const img = await loadImageFromFile(file);

  const layer = makeLayer(file.name.replace(/\.[^.]+$/, "") || "Imported");
  const scale = Math.min(view.width / img.width, view.height / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const x = Math.round((view.width - w) / 2);
  const y = Math.round((view.height - h) / 2);

  layer.ctx.drawImage(img, x, y, w, h);

  state.layers.unshift(layer);
  state.activeLayerId = layer.id;
  renderLayersUI();
  syncActiveLayerPanel();
  drawComposite();
  commitHistory();
});

// ===== Save/Load Project =====
btnSaveProject.addEventListener("click", () => {
  if (state.selection.active) commitSelection(false);

  const snap = snapshot();
  const blob = new Blob([JSON.stringify(snap)], { type: "application/json" });
  const a = document.createElement("a");
  a.download = "photzia.project.json";
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

fileOpenProject.addEventListener("change", async () => {
  const file = fileOpenProject.files?.[0];
  fileOpenProject.value = "";
  if (!file) return;

  const text = await file.text();
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    alert("Esse arquivo não parece ser um projeto Photzia válido.");
    return;
  }

  state.history.past = [];
  state.history.future = [];
  await restore(obj);
  commitHistory(); // baseline
});

// ===== Helpers =====
function loadImageFromFile(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
function loadImageFromDataURL(dataUrl){
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = dataUrl;
  });
}
function drawPngToLayer(layer, dataUrl){
  return new Promise((resolve) => {
    if (!dataUrl){
      layer.ctx.clearRect(0,0,layer.canvas.width, layer.canvas.height);
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => {
      layer.ctx.clearRect(0,0,layer.canvas.width, layer.canvas.height);
      layer.ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.onerror = () => {
      layer.ctx.clearRect(0,0,layer.canvas.width, layer.canvas.height);
      resolve();
    };
    img.src = dataUrl;
  });
}

// ===== Init =====
function init(){
  applyTheme(DEFAULT_THEME);

  const base = makeLayer("Layer 1");
  state.layers = [base];
  state.activeLayerId = base.id;

  renderLayersUI();
  syncActiveLayerPanel();
  syncSelectionPanel();
  drawComposite();

  sizeLabel.textContent = size.value;
  opacityLabel.textContent = `${opacity.value}%`;
  zoomLabel.textContent = `${zoom.value}%`;

  commitHistory();
  syncUndoRedoButtons();
}
init();
