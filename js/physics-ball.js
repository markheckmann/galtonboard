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

    this.progress += dt / hopDuration;
    const t = Math.min(this.progress, 1);

    // Ballistic arc: ball launches from pin at an angle, arcs upward,
    // then curves down under gravity to the next pin — like a projectile.
    //
    // We solve for launch velocity that lands exactly at the target:
    //   x(t) = sourceX + vx * t        (constant horizontal speed)
    //   y(t) = sourceY + vy * t + 0.5 * g * t^2   (gravity pulls down)
    //
    // At t=1: x=targetX, y=targetY → vx = dx, vy = dy - 0.5*g
    // g controls the arc height: larger g = taller arc

    const dx = this.targetX - this.sourceX;
    const dy = this.targetY - this.sourceY;
    const g = this.board.pinSpacingY * 2.5; // gravity strength — controls arc height

    const vx = dx;           // horizontal launch velocity
    const vy = dy - 0.5 * g; // vertical launch velocity (upward component)

    this.visualX = this.sourceX + vx * t;
    this.visualY = this.sourceY + vy * t + 0.5 * g * t * t;

    if (this.progress >= 1) {
      // Arrived at next pin — advance
      this.currentRow++;

      let col = 0;
      for (let i = 0; i <= this.currentRow && i < this.path.length; i++) {
        if (this.path[i] === 'R') col++;
      }
      this.currentCol = col;

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

    // Record trail for highlighted balls
    if (this.highlighted) {
      this.trailPoints.push({ x: this.visualX, y: this.visualY });
      if (this.trailPoints.length > this.maxTrail) {
        this.trailPoints.shift();
      }
    }
  }

  // --- Same interface as Ball for renderer compatibility ---

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
