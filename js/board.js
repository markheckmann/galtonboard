// Board geometry: pin positions, bin boundaries, layout calculations

export class Board {
  constructor(numRows = 10) {
    this.numRows = numRows;
    this.numBins = numRows + 1;
    this.pins = [];
    this.binRects = [];
    this.pinRadius = 4;
    this.ballRadius = 5;
    this.pinSpacingX = 0;
    this.pinSpacingY = 0;
    this.funnelY = 0;
    this.binFloorY = 0;
    this.binTopY = 0;
    this.centerX = 0;
    this.canvasWidth = 0;
    this.canvasHeight = 0;
  }

  recalculate(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.centerX = canvasWidth / 2;
    this.numBins = this.numRows + 1;

    // Layout proportions
    const topMargin = 60;
    const binAreaHeight = canvasHeight * 0.30;
    const pinAreaHeight = canvasHeight - topMargin - binAreaHeight - 20;

    this.funnelY = topMargin;
    this.binFloorY = canvasHeight - 10;
    this.binTopY = canvasHeight - binAreaHeight;

    // Compute spacing based on available area
    this.pinSpacingY = Math.min(pinAreaHeight / (this.numRows + 1), 50);
    // Horizontal spacing: ensure bins fit within canvas
    const maxBinWidth = (canvasWidth - 40) / this.numBins;
    this.pinSpacingX = Math.min(maxBinWidth, 50);

    this.ballRadius = Math.min(this.pinSpacingX * 0.25, 6);
    this.pinRadius = Math.min(this.pinSpacingX * 0.08, 4);

    // Compute pin positions
    this.pins = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c <= r; c++) {
        row.push(this.getPinPosition(r, c));
      }
      this.pins.push(row);
    }

    // Compute bin rectangles
    this.binRects = [];
    const totalBinWidth = this.numBins * this.pinSpacingX;
    const binStartX = this.centerX - totalBinWidth / 2;
    for (let i = 0; i < this.numBins; i++) {
      this.binRects.push({
        x: binStartX + i * this.pinSpacingX,
        y: this.binTopY,
        width: this.pinSpacingX,
        height: this.binFloorY - this.binTopY,
      });
    }
  }

  getPinPosition(row, col) {
    const x = this.centerX + (col - row / 2) * this.pinSpacingX;
    const y = this.funnelY + 30 + row * this.pinSpacingY;
    return { x, y };
  }

  // Get the position a ball should be at between rows (in the gap after a pin decision)
  getBallTarget(row, col) {
    // After the last row, return the bin center position
    if (row >= this.numRows) {
      const bin = this.binRects[col];
      return {
        x: bin ? bin.x + bin.width / 2 : this.centerX,
        y: this.binTopY,
      };
    }
    return this.getPinPosition(row, col);
  }

  getDropPosition() {
    return {
      x: this.centerX,
      y: this.funnelY,
    };
  }

  getBinCenter(binIndex) {
    const bin = this.binRects[binIndex];
    if (!bin) return { x: this.centerX, y: this.binFloorY };
    return { x: bin.x + bin.width / 2, y: this.binFloorY };
  }

  setNumRows(numRows) {
    this.numRows = Math.max(1, Math.min(25, numRows));
    this.recalculate(this.canvasWidth, this.canvasHeight);
  }
}
