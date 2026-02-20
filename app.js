// Photzia MVP — camadas, pincel/borracha/mover, zoom, temas.

const view = document.getElementById("view");
const vctx = view.getContext("2d");

const stage = document.getElementById("stage");
const layersEl = document.getElementById("layers");

const btnNewLayer = document.getElementById("btnNewLayer");
const btnExport = document.getElementById("btnExport");

const toolgrid = document.getElementById("toolgrid");

const size = document.getElementById("size");
const sizeLabel = document.getElementById("sizeLabel");
const color = document.getElementById("color");
const opacity = document.getElementById("opacity");
const opacityLabel = document.getElementById("opacityLabel");

const zoom = document.getElementById("zoom");
const zoomLabel = document.getElementById("zoomLabel");

// Tema modal
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
  // manter inputs alinhados
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

// Converte rgb(...) -> #rrggbb quando necessário
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

// ====== Estado do editor ======

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

  // mover camada
  moving: {
    start: null,
    layerStart: null,
  },
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
    canvas: c,
    ctx,
    x: 0,
    y: 0,
  };
}

function addLayer(){
  const layer = makeLayer();
  state.layers.unshift(layer); // topo por padrão
  state.activeLayerId = layer.id;
  renderLayersUI();
  drawComposite();
}

function getActiveLayer(){
  return state.layers.find(l => l.id === state.activeLayerId) || null;
}

function renderLayersUI(){
  layersEl.innerHTML = "";
  for (const layer of state.layers){
    const row = document.createElement("div");
    row.className = "layer" + (layer.id === state.activeLayerId ? " active" : "");
    row.addEventListener("click", () => {
      state.activeLayerId = layer.id;
      renderLayersUI();
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
    });

    const name = document.createElement("div");
    name.textContent = layer.name;

    const ren = document.createElement("button");
    ren.className = "rename";
    ren.textContent = "✎";
    ren.title = "Renomear";
    ren.addEventListener("click", (e) => {
      e.stopPropagation();
      const n = prompt("Nome da camada:", layer.name);
      if (n && n.trim()){
        layer.name = n.trim();
        renderLayersUI();
      }
    });

    row.appendChild(eye);
    row.appendChild(name);
    row.appendChild(ren);

    layersEl.appendChild(row);
  }
}

// ====== Render / composição ======
function clearView(){
  vctx.setTransform(1,0,0,1,0,0);
  vctx.clearRect(0,0,view.width, view.height);
}

function drawComposite(){
  clearView();

  // zoom centrado
  const z = state.zoom;
  const cx = view.width / 2;
  const cy = view.height / 2;
  vctx.setTransform(z, 0, 0, z, cx - cx*z, cy - cy*z);

  // desenhar do fundo -> topo (como layers estão unshift no topo, invert)
  const ordered = [...state.layers].reverse();
  for (const layer of ordered){
    if (!layer.visible) continue;
    vctx.drawImage(layer.canvas, layer.x, layer.y);
  }
}

// ====== Coordenadas (tela -> canvas) ======
function getPointerPos(e){
  const rect = view.getBoundingClientRect();
  const px = (e.clientX - rect.left);
  const py = (e.clientY - rect.top);

  // compensar zoom centrado
  const z = state.zoom;
  const cx = view.width / 2;
  const cy = view.height / 2;

  // converter pixel de CSS pra coordenada do canvas (considerando que canvas pode estar escalado pelo browser)
  const sx = view.width / rect.width;
  const sy = view.height / rect.height;

  let x = px * sx;
  let y = py * sy;

  // desfazer transform de zoom centrado
  x = (x - (cx - cx*z)) / z;
  y = (y - (cy - cy*z)) / z;

  return { x, y };
}

// ====== Ferramentas ======
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

// Atalhos
window.addEventListener("keydown", (e) => {
  if (e.key === "b" || e.key === "B") setTool("brush");
  if (e.key === "e" || e.key === "E") setTool("eraser");
  if (e.key === "v" || e.key === "V") setTool("move");
});

// Controles brush
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

// Pincel/borracha desenham na camada ativa (no canvas offscreen)
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

view.addEventListener("pointerdown", (e) => {
  view.setPointerCapture(e.pointerId);
  state.isPointerDown = true;

  const pos = getPointerPos(e);
  state.last = pos;

  const layer = getActiveLayer();
  if (!layer) return;

  if (state.tool === "move"){
    state.moving.start = pos;
    state.moving.layerStart = { x: layer.x, y: layer.y };
    return;
  }

  // “pingo” inicial
  strokeTo(layer, pos, {x: pos.x + 0.01, y: pos.y + 0.01}, state.tool === "eraser");
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
    layer.x = state.moving.layerStart.x + dx;
    layer.y = state.moving.layerStart.y + dy;
    drawComposite();
    return;
  }

  strokeTo(layer, state.last, pos, state.tool === "eraser");
  state.last = pos;
  drawComposite();
});

view.addEventListener("pointerup", () => {
  state.isPointerDown = false;
  state.last = null;
  state.moving.start = null;
  state.moving.layerStart = null;
});

// Botões
btnNewLayer.addEventListener("click", addLayer);

btnExport.addEventListener("click", () => {
  // export do composite atual
  const out = document.createElement("canvas");
  out.width = view.width;
  out.height = view.height;
  const octx = out.getContext("2d");

  const ordered = [...state.layers].reverse();
  for (const layer of ordered){
    if (!layer.visible) continue;
    octx.drawImage(layer.canvas, layer.x, layer.y);
  }

  const a = document.createElement("a");
  a.download = "photzia.png";
  a.href = out.toDataURL("image/png");
  a.click();
});

// Inicialização
applyTheme(DEFAULT_THEME);
addLayer(); // primeira camada
renderLayersUI();
drawComposite();
sizeLabel.textContent = size.value;
opacityLabel.textContent = `${opacity.value}%`;
zoomLabel.textContent = `${zoom.value}%`;
