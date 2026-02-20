// Photzia v2 — Import, Undo/Redo, Save/Load Project, Layer Opacity + Blend Modes, Themes.

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
  // sync inputs
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

  history: {
    past: [],
    future: [],
    max: 40,
    // to avoid capturing too often while drawing, we capture on "commit" (pointerup, import, delete, clear, etc.)
  }
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

// ===== History (Undo/Redo) =====
// We store a serialized snapshot with per-layer PNG dataURL (content) + metadata.
// For a browser editor, this is a practical MVP (later you can optimize to ImageData diffs).
function layerToDataURL(layer){
  return layer.canvas.toDataURL("image/png");
}

function snapshot(){
  return {
    version: 2,
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

  // canvas size
  if (snap.w && snap.h){
    view.width = snap.w;
    view.height = snap.h;
  }

  // theme
  if (snap.theme) applyTheme(snap.theme);

  // rebuild layers
  state.layers = [];
  for (const L of snap.layers){
    const layer = makeLayer(L.name);
    layer.id = L.id;
    layer.visible = !!L.visible;
    layer.opacity = typeof L.opacity === "number" ? L.opacity : 1;
    layer.blend = L.blend || "source-over";
    layer.x = L.x || 0;
    layer.y = L.y || 0;

    // draw png into layer canvas
    await drawPngToLayer(layer, L.png);

    state.layers.push(layer);
  }

  state.activeLayerId = snap.activeLayerId || (state.layers[0]?.id ?? null);
  state.zoom = typeof snap.zoom === "number" ? snap.zoom : state.zoom;

  zoom.value = String(Math.round(state.zoom * 100));
  zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;

  renderLayersUI();
  syncActiveLayerPanel();
  drawComposite();
}

function commitHistory(reason=""){
  const snap = snapshot();
  state.history.past.push(snap);
  if (state.history.past.length > state.history.max) state.history.past.shift();
  state.history.future = []; // clear redo stack
  syncUndoRedoButtons();
}

async function undo(){
  // need at least 2 snapshots: current + previous
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

function drawComposite(){
  clearView();

  // zoom centered
  const z = state.zoom;
  const cx = view.width / 2;
  const cy = view.height / 2;
  vctx.setTransform(z, 0, 0, z, cx - cx*z, cy - cy*z);

  // background is CSS; canvas is transparent
  const ordered = [...state.layers].reverse();
  for (const layer of ordered){
    if (!layer.visible) continue;

    vctx.save();
    vctx.globalAlpha = layer.opacity;
    vctx.globalCompositeOperation = layer.blend;
    vctx.drawImage(layer.canvas, layer.x, layer.y);
    vctx.restore();
  }
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
  // tool shortcuts
  if (!e.ctrlKey && !e.metaKey && !e.altKey){
    if (e.key === "b" || e.key === "B") setTool("brush");
    if (e.key === "e" || e.key === "E") setTool("eraser");
    if (e.key === "v" || e.key === "V") setTool("move");
  }

  // undo/redo
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;

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

// Drawing to offscreen layer
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

// capture history only once per gesture/action
let gestureDidChange = false;

view.addEventListener("pointerdown", (e) => {
  view.setPointerCapture(e.pointerId);
  state.isPointerDown = true;

  const pos = getPointerPos(e);
  state.last = pos;
  gestureDidChange = false;

  const layer = getActiveLayer();
  if (!layer) return;

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

  if (gestureDidChange){
    commitHistory("gesture");
    gestureDidChange = false;
  }
});

// ===== Layers UI =====
function renderLayersUI(){
  layersEl.innerHTML = "";
  for (const layer of state.layers){
    const row = document.createElement("div");
    row.className = "layer" + (layer.id === state.activeLayerId ? " active" : "");
    row.addEventListener("click", () => {
      state.activeLayerId = layer.id;
      renderLayersUI();
      syncActiveLayerPanel();
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
      commitHistory("toggle visible");
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
  // commit only when user finishes edit
  const layer = getActiveLayer();
  if (!layer) return;
  commitHistory("rename layer");
});

layerOpacity.addEventListener("input", () => {
  const layer = getActiveLayer();
  if (!layer) return;
  layer.opacity = parseInt(layerOpacity.value, 10) / 100;
  layerOpacityLabel.textContent = `${Math.round(layer.opacity * 100)}%`;
  drawComposite();
});

layerOpacity.addEventListener("change", () => {
  const layer = getActiveLayer();
  if (!layer) return;
  commitHistory("layer opacity");
});

layerBlend.addEventListener("change", () => {
  const layer = getActiveLayer();
  if (!layer) return;
  layer.blend = layerBlend.value;
  renderLayersUI();
  drawComposite();
  commitHistory("layer blend");
});

btnClearLayer.addEventListener("click", () => {
  const layer = getActiveLayer();
  if (!layer) return;
  layer.ctx.clearRect(0,0,layer.canvas.width, layer.canvas.height);
  drawComposite();
  commitHistory("clear layer");
});

btnDeleteLayer.addEventListener("click", () => {
  const layer = getActiveLayer();
  if (!layer) return;
  const idx = state.layers.findIndex(l => l.id === layer.id);
  if (idx >= 0) state.layers.splice(idx, 1);
  state.activeLayerId = state.layers[0]?.id ?? null;
  renderLayersUI();
  syncActiveLayerPanel();
  drawComposite();
  commitHistory("delete layer");
});

// ===== Actions =====
function addLayer(name){
  const layer = makeLayer(name);
  state.layers.unshift(layer); // top
  state.activeLayerId = layer.id;
  renderLayersUI();
  syncActiveLayerPanel();
  drawComposite();
  commitHistory("add layer");
}

btnNewLayer.addEventListener("click", () => addLayer());

btnExport.addEventListener("click", () => {
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

  const img = await loadImageFromFile(file);

  const layer = makeLayer(file.name.replace(/\.[^.]+$/, "") || "Imported");
  // draw centered
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
  commitHistory("import image");
});

// ===== Save/Load Project =====
btnSaveProject.addEventListener("click", () => {
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

  // reset history, then restore, then re-seed history
  state.history.past = [];
  state.history.future = [];
  await restore(obj);
  commitHistory("open project"); // seed new baseline
});

// ===== Helpers for images =====
function loadImageFromFile(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
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
      // if it fails, keep blank
      layer.ctx.clearRect(0,0,layer.canvas.width, layer.canvas.height);
      resolve();
    };
    img.src = dataUrl;
  });
}

// ===== Init =====
function init(){
  applyTheme(DEFAULT_THEME);

  // base layer
  const base = makeLayer("Layer 1");
  state.layers = [base];
  state.activeLayerId = base.id;

  renderLayersUI();
  syncActiveLayerPanel();
  drawComposite();

  sizeLabel.textContent = size.value;
  opacityLabel.textContent = `${opacity.value}%`;
  zoomLabel.textContent = `${zoom.value}%`;

  // seed history baseline
  commitHistory("init");
  syncUndoRedoButtons();
}
init();
