// Ball class: state, path decisions, interpolation, highlighting

let nextId = 0;

const HIGHLIGHT_COLORS = ['#FFD700', '#FF00FF', '#00FFFF', '#32CD32', '#FF8C00'];

export class Ball {
  constructor(board) {
    this.id = nextId++;
    this.state = 'falling'; // falling | settled
    this.currentRow = -1; // -1 = above first pin
    this.currentCol = 0;
    this.path = [];
    this.board = board;

    // Pre-generate full path
    for (let i = 0; i < board.numRows; i++) {
      this.path.push(Math.random() < 0.5 ? 'L' : 'R');
    }

    // Compute final bin index
    this.finalBin = this.path.reduce((col, dir) => col + (dir === 'R' ? 1 : 0), 0);

    // Visual interpolation
    const drop = board.getDropPosition();
    this.visualX = drop.x;
    this.visualY = drop.y;
    this.sourceX = drop.x;
    this.sourceY = drop.y;
    this.targetX = 0;
    this.targetY = 0;
    this.progress = 0;
    this._computeNextTarget();

    // Appearance
    this.highlighted = false;
    this.highlightColorIndex = -1;
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
      // Heading to bin
      const binCenter = this.board.getBinCenter(this.finalBin);
      this.targetX = binCenter.x;
      this.targetY = this.board.binTopY;
    } else {
      // Compute column at next row
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

    // Ease-in-out interpolation
    const t = Math.min(this.progress, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this.visualX = this.sourceX + (this.targetX - this.sourceX) * eased;
    this.visualY = this.sourceY + (this.targetY - this.sourceY) * eased;

    // Record trail for highlighted balls
    if (this.highlighted) {
      this.trailPoints.push({ x: this.visualX, y: this.visualY });
      if (this.trailPoints.length > this.maxTrail) {
        this.trailPoints.shift();
      }
    }

    if (this.progress >= 1) {
      this.currentRow++;
      this.progress = 0;

      // Update column based on decisions made so far
      let col = 0;
      for (let i = 0; i <= this.currentRow && i < this.path.length; i++) {
        if (this.path[i] === 'R') col++;
      }
      this.currentCol = col;

      this.sourceX = this.targetX;
      this.sourceY = this.targetY;

      if (this.currentRow >= this.board.numRows) {
        // Ball reached the bins
        this.state = 'settled';
        this.binIndex = this.finalBin;
        return;
      }

      this._computeNextTarget();
    }
  }

  setHighlighted(highlighted, colorIndex) {
    this.highlighted = highlighted;
    this.highlightColorIndex = colorIndex;
    this.highlightTimer = highlighted ? 5 : 0; // seconds after settling until auto-remove
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
    // Return future pin positions this ball will visit
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
