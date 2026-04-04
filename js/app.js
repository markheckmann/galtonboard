// Bootstrap, wire UI controls to simulation, animation frame loop

import { Board } from './board.js';
import { Simulation } from './simulation.js';
import { Renderer } from './renderer.js';
import { Stats } from './stats.js';

const canvas = document.getElementById('galton-canvas');
const board = new Board(10);
const stats = new Stats();
const simulation = new Simulation(board, stats);
const renderer = new Renderer(canvas);

// --- Canvas sizing ---
function resizeCanvas() {
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  board.recalculate(rect.width, rect.height);
}

resizeCanvas();
board.trailDuration = 2; // default trail duration in seconds
stats.reset(board.numBins);

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas();
});
resizeObserver.observe(canvas.parentElement);

// --- UI Controls ---
const rowsSlider = document.getElementById('rows-slider');
const rowsValue = document.getElementById('rows-value');
const ballsInput = document.getElementById('balls-input');
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');
const rateSlider = document.getElementById('rate-slider');
const rateValue = document.getElementById('rate-value');
const playPauseBtn = document.getElementById('play-pause-btn');
const resetBtn = document.getElementById('reset-btn');
const dropOneBtn = document.getElementById('drop-one-btn');
const sequentialCheck = document.getElementById('sequential-check');
const biasSlider = document.getElementById('bias-slider');
const biasValue = document.getElementById('bias-value');
const biasLeft = document.getElementById('bias-left');
const biasRight = document.getElementById('bias-right');
const labelSizeSlider = document.getElementById('label-size-slider');
const labelSizeValue = document.getElementById('label-size-value');
const pascalSizeSlider = document.getElementById('pascal-size-slider');
const pascalSizeValue = document.getElementById('pascal-size-value');
const trailSlider = document.getElementById('trail-slider');
const trailValue = document.getElementById('trail-value');
const trailWidthSlider = document.getElementById('trail-width-slider');
const trailWidthValue = document.getElementById('trail-width-value');
const distlinesCheck = document.getElementById('distlines-check');
const pascalAbbrCheck = document.getElementById('pascal-abbr-check');
const bgCurveCheck = document.getElementById('bgcurve-check');
const physicsCheck = document.getElementById('physics-check');
const themeBtn = document.getElementById('theme-btn');
const compactCheck = document.getElementById('compact-check');
const pascalCheck = document.getElementById('pascal-check');
const pctCheck = document.getElementById('pct-check');
const curveCheck = document.getElementById('curve-check');
const statsCheck = document.getElementById('stats-check');
const statsPanel = document.getElementById('stats-panel');

// Row count
rowsSlider.addEventListener('change', () => {
  const newRows = parseInt(rowsSlider.value);
  rowsValue.textContent = newRows;
  board.setNumRows(newRows);
  simulation.reset();
  updateStatsDisplay();
});
rowsSlider.addEventListener('input', () => {
  rowsValue.textContent = rowsSlider.value;
});

// Compact / auto-scale
compactCheck.addEventListener('change', () => {
  board.compactMode = compactCheck.checked;
  board.recalculate(board.canvasWidth, board.canvasHeight);
  simulation.reset();
  updateStatsDisplay();
});

// Bias
function updateBiasDisplay(pct) {
  const leftPct = 100 - pct;
  biasValue.textContent = leftPct === pct ? '50/50' : `${leftPct}/${pct}`;
  biasLeft.textContent = `L ${leftPct}%`;
  biasRight.textContent = `R ${pct}%`;
}
biasSlider.addEventListener('change', () => {
  const pct = parseInt(biasSlider.value);
  simulation.bias = pct / 100;
  simulation.reset();
  updateStatsDisplay();
});
biasSlider.addEventListener('input', () => {
  updateBiasDisplay(parseInt(biasSlider.value));
});

// Total balls
ballsInput.addEventListener('change', () => {
  simulation.totalBallsToSpawn = Math.max(1, Math.min(100000, parseInt(ballsInput.value) || 500));
  ballsInput.value = simulation.totalBallsToSpawn;
});

// Speed
const speedSteps = [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8, 10];
speedSlider.addEventListener('input', () => {
  const idx = parseInt(speedSlider.value);
  simulation.speedMultiplier = speedSteps[idx];
  speedValue.textContent = speedSteps[idx] + 'x';
});

// Drop rate (exponential: slider 0–100 maps to 1–10000)
function sliderToRate(val) {
  return Math.round(Math.pow(10, val / 100 * 4)); // 10^0=1 to 10^4=10000
}
rateSlider.addEventListener('input', () => {
  const rate = sliderToRate(parseInt(rateSlider.value));
  simulation.dropRate = rate;
  rateValue.textContent = rate;
});

// Play/Pause
playPauseBtn.addEventListener('click', () => {
  const running = simulation.toggleRunning();
  playPauseBtn.textContent = running ? 'Pause' : 'Play';
  playPauseBtn.classList.toggle('active', running);
});

// Reset
resetBtn.addEventListener('click', () => {
  simulation.reset();
  simulation.pause();
  playPauseBtn.textContent = 'Play';
  playPauseBtn.classList.remove('active');
  updateStatsDisplay();
});

// Drop One Ball
dropOneBtn.addEventListener('click', () => {
  simulation.dropOneBall();
});

// Sequential mode
sequentialCheck.addEventListener('change', () => {
  simulation.sequentialMode = sequentialCheck.checked;
});

// Physics mode
physicsCheck.addEventListener('change', () => {
  simulation.physicsMode = physicsCheck.checked;
  simulation.reset();
  updateStatsDisplay();
});

// Trail width
trailWidthSlider.addEventListener('input', () => {
  const w = parseFloat(trailWidthSlider.value);
  renderer.trailWidth = w;
  trailWidthValue.textContent = w;
});

// Label size
labelSizeSlider.addEventListener('input', () => {
  const size = parseInt(labelSizeSlider.value);
  renderer.labelFontSize = size;
  labelSizeValue.textContent = size;
});

// Pascal label size
pascalSizeSlider.addEventListener('input', () => {
  const size = parseInt(pascalSizeSlider.value);
  renderer.pascalFontSize = size;
  pascalSizeValue.textContent = size;
});

// Trail duration (seconds)
trailSlider.addEventListener('input', () => {
  const dur = parseFloat(trailSlider.value);
  board.trailDuration = dur;
  trailValue.textContent = dur > 0 ? dur + 's' : 'off';
  // Clear all trails immediately when turned off
  if (dur === 0) {
    for (const ball of [...simulation.activeBalls, ...simulation.settledBalls, ...simulation.dropOneBalls]) {
      if (!ball.highlighted) ball.trailPoints = [];
    }
  }
});

// Theme toggle button
let lightMode = false;
themeBtn.addEventListener('click', () => {
  lightMode = !lightMode;
  document.body.classList.toggle('light', lightMode);
  renderer.setLightMode(lightMode);
  themeBtn.classList.toggle('active', lightMode);
});

// Toggles
pascalCheck.addEventListener('change', () => {
  renderer.showPascal = pascalCheck.checked;
});
pascalAbbrCheck.addEventListener('change', () => {
  renderer.abbreviatePascal = pascalAbbrCheck.checked;
});
distlinesCheck.addEventListener('change', () => {
  renderer.showDistLines = distlinesCheck.checked;
});
bgCurveCheck.addEventListener('change', () => {
  renderer.showBackgroundCurve = bgCurveCheck.checked;
});
pctCheck.addEventListener('change', () => {
  renderer.showPercentages = pctCheck.checked;
});
curveCheck.addEventListener('change', () => {
  renderer.showExpectedCurve = curveCheck.checked;
});
statsCheck.addEventListener('change', () => {
  renderer.showStats = statsCheck.checked;
  statsPanel.style.display = statsCheck.checked ? 'block' : 'none';
});

// Speed preset buttons
document.querySelectorAll('.speed-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const speed = parseFloat(btn.dataset.speed);
    simulation.speedMultiplier = speed;
    const idx = speedSteps.indexOf(speed);
    if (idx >= 0) speedSlider.value = idx;
    speedValue.textContent = speed + 'x';
  });
});

// --- Canvas click for ball selection ---
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const ball = simulation.findBallAt(x, y);
  if (ball) {
    simulation.toggleHighlight(ball);
  }
});

// --- Fullscreen ---
const fullscreenBtn = document.getElementById('fullscreen-btn');
const appEl = document.querySelector('.app');
fullscreenBtn.addEventListener('click', () => {
  appEl.classList.toggle('fullscreen');
  resizeCanvas();
  // Clear all trail points since coordinates are now invalid
  for (const ball of [...simulation.activeBalls, ...simulation.settledBalls, ...simulation.dropOneBalls]) {
    ball.trailPoints = [];
  }
});

// --- Info overlay ---
const infoOverlay = document.getElementById('info-overlay');
document.getElementById('info-btn').addEventListener('click', () => {
  infoOverlay.classList.add('visible');
});
document.getElementById('info-close').addEventListener('click', () => {
  infoOverlay.classList.remove('visible');
});
infoOverlay.addEventListener('click', (e) => {
  if (e.target === infoOverlay) infoOverlay.classList.remove('visible');
});

// --- Keyboard shortcuts ---
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return; // Don't capture when typing in inputs

  if (e.code === 'Escape') {
    infoOverlay.classList.remove('visible');
  } else if (e.code === 'KeyF') {
    fullscreenBtn.click();
  } else if (e.code === 'Space') {
    e.preventDefault();
    playPauseBtn.click();
  } else if (e.code === 'KeyR') {
    resetBtn.click();
  }
});

// --- Stats display ---
function updateStatsDisplay() {
  const meanEl = document.getElementById('stat-mean');
  const stddevEl = document.getElementById('stat-stddev');
  const totalEl = document.getElementById('stat-total');
  const fitEl = document.getElementById('stat-fit');
  const spawnedEl = document.getElementById('stat-spawned');

  meanEl.textContent = stats.totalSettled > 0 ? stats.getMean().toFixed(2) : '—';
  stddevEl.textContent = stats.totalSettled > 0 ? stats.getStdDev().toFixed(2) : '—';
  totalEl.textContent = stats.totalSettled;
  spawnedEl.textContent = simulation.totalBallsSpawned;
  fitEl.textContent = stats.getFitLabel(board.numRows, simulation.bias);
}

// --- Progress bar ---
const progressFill = document.getElementById('progress-fill');
function updateProgress() {
  const pct = simulation.totalBallsToSpawn > 0
    ? Math.min(100, (simulation.totalBallsSpawned / simulation.totalBallsToSpawn) * 100)
    : 0;
  progressFill.style.width = pct + '%';
}

// --- Shortcut toast (auto-fade after 5 seconds) ---
const shortcutToast = document.getElementById('shortcut-toast');
setTimeout(() => shortcutToast.classList.add('hidden'), 5000);

// --- URL state encoding ---
function getStateFromURL() {
  const p = new URLSearchParams(window.location.hash.slice(1));
  return {
    rows: p.has('rows') ? parseInt(p.get('rows')) : null,
    balls: p.has('balls') ? parseInt(p.get('balls')) : null,
    bias: p.has('bias') ? parseInt(p.get('bias')) : null,
    speed: p.has('speed') ? parseInt(p.get('speed')) : null,
    rate: p.has('rate') ? parseInt(p.get('rate')) : null,
    seq: p.has('seq') ? p.get('seq') === '1' : null,
    physics: p.has('physics') ? p.get('physics') === '1' : null,
    compact: p.has('compact') ? p.get('compact') === '1' : null,
    pascal: p.has('pascal') ? p.get('pascal') === '1' : null,
    abbr: p.has('abbr') ? p.get('abbr') === '1' : null,
    bgcurve: p.has('bgcurve') ? p.get('bgcurve') === '1' : null,
    distlines: p.has('distlines') ? p.get('distlines') === '1' : null,
    curve: p.has('curve') ? p.get('curve') === '1' : null,
    pct: p.has('pct') ? p.get('pct') === '1' : null,
    trail: p.has('trail') ? parseFloat(p.get('trail')) : null,
    tw: p.has('tw') ? parseFloat(p.get('tw')) : null,
    light: p.has('light') ? p.get('light') === '1' : null,
    labelSize: p.has('ls') ? parseInt(p.get('ls')) : null,
    pascalSize: p.has('ps') ? parseInt(p.get('ps')) : null,
  };
}

function saveStateToURL() {
  const p = new URLSearchParams();
  p.set('rows', rowsSlider.value);
  p.set('balls', ballsInput.value);
  p.set('bias', biasSlider.value);
  p.set('speed', speedSlider.value);
  p.set('rate', rateSlider.value);
  p.set('seq', sequentialCheck.checked ? '1' : '0');
  p.set('physics', physicsCheck.checked ? '1' : '0');
  p.set('compact', compactCheck.checked ? '1' : '0');
  p.set('pascal', pascalCheck.checked ? '1' : '0');
  p.set('abbr', pascalAbbrCheck.checked ? '1' : '0');
  p.set('bgcurve', bgCurveCheck.checked ? '1' : '0');
  p.set('distlines', distlinesCheck.checked ? '1' : '0');
  p.set('curve', curveCheck.checked ? '1' : '0');
  p.set('pct', pctCheck.checked ? '1' : '0');
  p.set('trail', trailSlider.value);
  p.set('tw', trailWidthSlider.value);
  p.set('light', lightMode ? '1' : '0');
  p.set('ls', labelSizeSlider.value);
  p.set('ps', pascalSizeSlider.value);
  history.replaceState(null, '', '#' + p.toString());
}

function applyURLState() {
  const s = getStateFromURL();
  if (s.rows != null) { rowsSlider.value = s.rows; rowsValue.textContent = s.rows; board.setNumRows(s.rows); }
  if (s.balls != null) { ballsInput.value = s.balls; simulation.totalBallsToSpawn = s.balls; }
  if (s.bias != null) { biasSlider.value = s.bias; simulation.bias = s.bias / 100; updateBiasDisplay(s.bias); }
  if (s.speed != null) { speedSlider.value = s.speed; const sp = speedSteps[s.speed]; simulation.speedMultiplier = sp; speedValue.textContent = sp + 'x'; }
  if (s.rate != null) { rateSlider.value = s.rate; simulation.dropRate = sliderToRate(s.rate); rateValue.textContent = sliderToRate(s.rate); }
  if (s.seq != null) { sequentialCheck.checked = s.seq; simulation.sequentialMode = s.seq; }
  if (s.physics != null) { physicsCheck.checked = s.physics; simulation.physicsMode = s.physics; }
  if (s.compact != null) { compactCheck.checked = s.compact; board.compactMode = s.compact; board.recalculate(board.canvasWidth, board.canvasHeight); }
  if (s.pascal != null) { pascalCheck.checked = s.pascal; renderer.showPascal = s.pascal; }
  if (s.abbr != null) { pascalAbbrCheck.checked = s.abbr; renderer.abbreviatePascal = s.abbr; }
  if (s.bgcurve != null) { bgCurveCheck.checked = s.bgcurve; renderer.showBackgroundCurve = s.bgcurve; }
  if (s.distlines != null) { distlinesCheck.checked = s.distlines; renderer.showDistLines = s.distlines; }
  if (s.curve != null) { curveCheck.checked = s.curve; renderer.showExpectedCurve = s.curve; }
  if (s.pct != null) { pctCheck.checked = s.pct; renderer.showPercentages = s.pct; }
  if (s.trail != null) { trailSlider.value = s.trail; board.trailDuration = s.trail; trailValue.textContent = s.trail > 0 ? s.trail + 's' : 'off'; }
  if (s.tw != null) { trailWidthSlider.value = s.tw; renderer.trailWidth = s.tw; trailWidthValue.textContent = s.tw; }
  if (s.light != null && s.light) { lightMode = true; document.body.classList.add('light'); renderer.setLightMode(true); themeBtn.classList.add('active'); }
  if (s.labelSize != null) { labelSizeSlider.value = s.labelSize; renderer.labelFontSize = s.labelSize; labelSizeValue.textContent = s.labelSize; }
  if (s.pascalSize != null) { pascalSizeSlider.value = s.pascalSize; renderer.pascalFontSize = s.pascalSize; pascalSizeValue.textContent = s.pascalSize; }
  stats.reset(board.numBins);
}

// Apply URL state on load (if hash present)
if (window.location.hash.length > 1) {
  applyURLState();
  simulation.reset();
}

// Save state on any control change (debounced)
let saveTimeout = null;
function scheduleSaveState() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveStateToURL, 300);
}
// Attach to all controls
[rowsSlider, biasSlider, ballsInput, speedSlider, rateSlider, trailSlider,
 labelSizeSlider, pascalSizeSlider, sequentialCheck, physicsCheck, compactCheck,
 pascalCheck, pascalAbbrCheck, bgCurveCheck, distlinesCheck, curveCheck, pctCheck, statsCheck,
 themeBtn].forEach(el => el.addEventListener('change', scheduleSaveState));
[rowsSlider, biasSlider, speedSlider, rateSlider, trailSlider, trailWidthSlider,
 labelSizeSlider, pascalSizeSlider].forEach(el => el.addEventListener('input', scheduleSaveState));
themeBtn.addEventListener('click', scheduleSaveState);

// --- Animation loop ---
let lastTime = 0;
let statsUpdateTimer = 0;

function frame(timestamp) {
  const dt = lastTime === 0 ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05); // Cap dt at 50ms
  lastTime = timestamp;

  simulation.update(dt);
  renderer.draw(board, simulation, stats);

  // Update stats display and progress bar periodically (not every frame)
  statsUpdateTimer += dt;
  if (statsUpdateTimer > 0.2) {
    statsUpdateTimer = 0;
    updateStatsDisplay();
    updateProgress();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
