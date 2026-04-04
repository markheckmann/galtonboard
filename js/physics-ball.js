// Physics-style ball: follows pin-to-pin grid like path mode,
// but uses parabolic arcs (gravity) and bounce deflections instead of smooth easing.

let nextPhysicsId = 100000;

const HIGHLIGHT_COLORS = ['#FFD700', '#FF00FF', '#00FFFF', '#32CD32', '#FF8C00'];

export class PhysicsBall {
  constructor(board, bias = 0.5) {
    this.id = nextPhysicsId++;
    this.board = board;
    this.state = 'falling';
    this.currentRow = -1;
    this.currentCol = 0;
    this.path = [];

    // Pre-generate full path (same as Ball)
    for (let i = 0; i < board.numRows; i++) {
      this.path.push(Math.random() < bias ? 'R' : 'L');
    }
    this.finalBin = this.path.reduce((col, dir) => col + (dir === 'R' ? 1 : 0), 0);

    // Current hop: source → target with gravity arc
    const drop = board.getDropPosition();
    this.sourceX = drop.x;
    this.sourceY = drop.y;
    this.targetX = 0;
    this.targetY = 0;
    this.visualX = drop.x;
    this.visualY = drop.y;
    this.progress = 0;

    this._computeNextTarget();

    // Appearance
    this.highlighted = false;
    this.highlightColorIndex = -1;
    this.highlightTimer = 0;
    this.trailPoints = [];
    this.maxTrail = 20;
    this.hitPin = null;

    // Bin stacking
    this.binIndex = -1;
    this.stackPosition = 0;
    this.settledX = 0;
    this.settledY = 0;
  }

  _computeNextTarget() {
    const nextRow = this.currentRow + 1;
    if (nextRow >= this.board.numRows) {
      const binCenter = this.board.getBinCenter(this.finalBin);
      this.targetX = binCenter.x;
      this.targetY = this.board.binTopY;
    } else {
      let col = 0;
      for (let i = 0; i <= this.currentRow && i < this.path.length; i++) {
        if (this.path[i] === 'R') col++;
      }
      const pos = this.board.getPinPosition(nextRow, col);
      this.targetX = pos.x;
      this.targetY = pos.y;
    }
  }

  step(dt, hopDuration) {
    if (this.state === 'settled') return;

    // Slightly extend duration for long hops to tame end acceleration
    const hopDy = this.targetY - this.sourceY;
    const normalDy = this.board.pinSpacingY;
    const ratio = Math.max(1, hopDy / normalDy);
    // Gentle scaling: cube root so a 4x drop only takes ~1.6x as long
    const durationScale = Math.pow(ratio, 1/3);
    this.progress += dt / (hopDuration * durationScale);
    const t = Math.min(this.progress, 1);

    // Ballistic arc with fixed upward bounce.
    // Every hop starts with the same upward launch velocity (vy0),
    // then gravity (g) is solved to land exactly at the target at t=1:
    //   y(1) = vy0 + 0.5*g = dy  →  g = 2*(dy - vy0)
    //
    // vy0 is negative (upward), based on normal pin spacing.

    const dx = this.targetX - this.sourceX;
    const dy = this.targetY - this.sourceY;
    const vy0 = -this.board.pinSpacingY * 0.8; // fixed upward bounce
    // Solve g to land at target, accounting for scaled duration (t goes 0→1)
    const g = 2 * (dy - vy0);

    this.visualX = this.sourceX + dx * t;
    this.visualY = this.sourceY + vy0 * t + 0.5 * g * t * t;

    if (this.progress >= 1) {
      // Arrived at next pin — advance
      this.currentRow++;

      let col = 0;
      for (let i = 0; i <= this.currentRow && i < this.path.length; i++) {
        if (this.path[i] === 'R') col++;
      }
      this.currentCol = col;

      // Signal pin hit for flash effect
      // The pin column is based on decisions before this row (path[0..currentRow-1])
      if (this.currentRow >= 0 && this.currentRow < this.board.numRows) {
        let pinCol = 0;
        for (let i = 0; i < this.currentRow && i < this.path.length; i++) {
          if (this.path[i] === 'R') pinCol++;
        }
        this.hitPin = { row: this.currentRow, col: pinCol };
      }

      this.sourceX = this.targetX;
      this.sourceY = this.targetY;
      this.progress = 0;

      if (this.currentRow >= this.board.numRows) {
        this.state = 'settled';
        this.binIndex = this.finalBin;
        return;
      }

      this._computeNextTarget();
    }

    // Record trail with time-based decay
    const trailDuration = this.board.trailDuration || 0;
    if (trailDuration > 0 || this.highlighted) {
      const dur = this.highlighted ? Math.max(trailDuration, 5) : trailDuration;
      this.trailPoints.push({ x: this.visualX, y: this.visualY, ttl: dur });
    }
  }

  // --- Same interface as Ball for renderer compatibility ---

  decayTrail(dt) {
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      this.trailPoints[i].ttl -= dt;
      if (this.trailPoints[i].ttl <= 0) {
        this.trailPoints.splice(i, 1);
      }
    }
  }

  setHighlighted(highlighted, colorIndex) {
    this.highlighted = highlighted;
    this.highlightColorIndex = colorIndex;
    this.highlightTimer = highlighted ? 5 : 0;
    if (highlighted) {
      this.trailPoints = [{ x: this.visualX, y: this.visualY }];
    } else {
      this.trailPoints = [];
    }
  }

  getColor() {
    if (this.highlighted && this.highlightColorIndex >= 0) {
      return HIGHLIGHT_COLORS[this.highlightColorIndex % HIGHLIGHT_COLORS.length];
    }
    return 'rgba(65, 131, 215, 0.85)';
  }

  getPathString() {
    return this.path.slice(0, this.currentRow + 1).join(' ');
  }

  getRemainingPath() {
    const positions = [];
    let col = this.currentCol;
    for (let r = this.currentRow + 1; r < this.board.numRows; r++) {
      if (this.path[r] === 'R') col++;
      positions.push(this.board.getPinPosition(r, col));
    }
    return positions;
  }

  static getHighlightColors() {
    return HIGHLIGHT_COLORS;
  }
}
