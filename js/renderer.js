// All Canvas drawing: pins, balls, bins, overlays, highlights

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.showPascal = false;
    this.showExpectedCurve = false;
    this.showStats = true;
    this.showPercentages = false;
  }

  clear() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(board, simulation, stats) {
    this.clear();
    this.drawFunnel(board);
    this.drawBinWalls(board);
    this.drawPins(board);

    if (this.showPascal) {
      this.drawPascalOverlay(board, stats);
    }

    this.drawSettledBalls(board, simulation);
    this.drawActiveBalls(board, simulation);
    this.drawHighlightedInfo(board, simulation);

    if (this.showExpectedCurve) {
      this.drawExpectedCurve(board, simulation, stats);
    }

    this.drawBinCounts(board, simulation, stats);
  }

  drawFunnel(board) {
    const ctx = this.ctx;
    const cx = board.centerX;
    const fy = board.funnelY;

    ctx.beginPath();
    ctx.moveTo(cx - 30, fy - 20);
    ctx.lineTo(cx - 5, fy + 5);
    ctx.lineTo(cx + 5, fy + 5);
    ctx.lineTo(cx + 30, fy - 20);
    ctx.strokeStyle = '#8899aa';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Funnel fill
    ctx.fillStyle = 'rgba(136, 153, 170, 0.15)';
    ctx.fill();
  }

  drawPins(board) {
    const ctx = this.ctx;
    ctx.fillStyle = '#c0c0c0';

    for (const row of board.pins) {
      for (const pin of row) {
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, board.pinRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawBinWalls(board) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(100, 140, 180, 0.4)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= board.numBins; i++) {
      const x = board.binRects[0].x + i * board.pinSpacingX;
      ctx.beginPath();
      ctx.moveTo(x, board.binTopY);
      ctx.lineTo(x, board.binFloorY);
      ctx.stroke();
    }

    // Floor
    ctx.beginPath();
    ctx.moveTo(board.binRects[0].x, board.binFloorY);
    ctx.lineTo(board.binRects[board.numBins - 1].x + board.pinSpacingX, board.binFloorY);
    ctx.strokeStyle = 'rgba(100, 140, 180, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawActiveBalls(board, simulation) {
    const ctx = this.ctx;

    for (const ball of [...simulation.activeBalls, ...simulation.dropOneBalls]) {
      // Draw trail for highlighted balls
      if (ball.highlighted && ball.trailPoints.length > 1) {
        this._drawTrail(ball);
      }

      ctx.beginPath();
      ctx.arc(ball.visualX, ball.visualY, board.ballRadius, 0, Math.PI * 2);

      if (ball.highlighted) {
        ctx.shadowColor = ball.getColor();
        ctx.shadowBlur = 12;
        ctx.fillStyle = ball.getColor();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw predicted path
        this._drawPredictedPath(ball, board);
      } else {
        ctx.fillStyle = ball.getColor();
        ctx.fill();
      }
    }
  }

  // Compute the scale factor so the tallest bin fits within the bin area
  _getBinScale(board, simulation) {
    const ballDiam = board.ballRadius * 2;
    const maxCount = Math.max(1, ...simulation.binStacks);
    const maxBarHeight = maxCount * ballDiam;
    const availableHeight = board.binFloorY - board.binTopY - 10;
    return maxBarHeight > availableHeight ? availableHeight / maxBarHeight : 1;
  }

  drawSettledBalls(board, simulation) {
    const ctx = this.ctx;
    const ballDiam = board.ballRadius * 2;
    const scale = this._getBinScale(board, simulation);

    for (let binIdx = 0; binIdx < board.numBins; binIdx++) {
      const count = simulation.binStacks[binIdx];
      if (count === 0) continue;

      const bin = board.binRects[binIdx];
      const cx = bin.x + bin.width / 2;

      if (count > 30 || scale < 1) {
        // Draw as a filled rectangle (always use bars when rescaled)
        const height = count * ballDiam * scale;
        const barY = board.binFloorY - height;

        const grad = ctx.createLinearGradient(0, barY, 0, board.binFloorY);
        grad.addColorStop(0, 'rgba(65, 131, 215, 0.9)');
        grad.addColorStop(1, 'rgba(45, 91, 175, 0.9)');
        ctx.fillStyle = grad;
        ctx.fillRect(bin.x + 2, barY, bin.width - 4, height);
      } else {
        // Draw individual balls
        for (let s = 0; s < count; s++) {
          const y = board.binFloorY - (s + 0.5) * ballDiam;
          ctx.beginPath();
          ctx.arc(cx, y, board.ballRadius - 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(65, 131, 215, 0.85)';
          ctx.fill();
        }
      }
    }

    // Draw highlighted settled balls on top
    for (const ball of simulation.highlightedBalls) {
      if (ball.state === 'settled') {
        // Recompute Y position with current scale
        const scaledY = board.binFloorY - (ball.stackPosition + 0.5) * ballDiam * scale;
        ctx.beginPath();
        ctx.arc(ball.settledX, scaledY, board.ballRadius + 1, 0, Math.PI * 2);
        ctx.shadowColor = ball.getColor();
        ctx.shadowBlur = 10;
        ctx.fillStyle = ball.getColor();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  _drawTrail(ball) {
    const ctx = this.ctx;
    const points = ball.trailPoints;
    const color = ball.getColor();

    for (let i = 0; i < points.length - 1; i++) {
      const alpha = (i / points.length) * 0.6;
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[i + 1].x, points[i + 1].y);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawPredictedPath(ball, board) {
    const ctx = this.ctx;
    const remaining = ball.getRemainingPath();
    const color = ball.getColor();

    for (const pos of remaining) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw target bin indicator
    const binCenter = board.getBinCenter(ball.finalBin);
    ctx.beginPath();
    ctx.moveTo(binCenter.x - 8, board.binTopY - 5);
    ctx.lineTo(binCenter.x, board.binTopY + 5);
    ctx.lineTo(binCenter.x + 8, board.binTopY - 5);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawHighlightedInfo(board, simulation) {
    const ctx = this.ctx;

    let infoY = 15;
    for (const ball of simulation.highlightedBalls) {
      const color = ball.getColor();
      const row = Math.min(ball.currentRow + 1, board.numRows);
      const pathStr = ball.getPathString();
      const label = ball.state === 'settled'
        ? `Ball #${ball.id}: Settled in bin ${ball.finalBin} | Path: ${pathStr}`
        : `Ball #${ball.id}: Row ${row}/${board.numRows} → Bin ${ball.finalBin} | ${pathStr}`;

      ctx.font = '11px monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(label, 10, infoY);
      infoY += 16;
    }
  }

  drawBinCounts(board, simulation, stats) {
    const ctx = this.ctx;
    const ballDiam = board.ballRadius * 2;
    const scale = this._getBinScale(board, simulation);
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(200, 220, 240, 0.8)';

    for (let i = 0; i < board.numBins; i++) {
      const count = simulation.binStacks[i];
      if (count === 0) continue;

      const bin = board.binRects[i];
      const cx = bin.x + bin.width / 2;
      const topY = board.binFloorY - count * ballDiam * scale;
      if (this.showPercentages && stats.totalSettled > 0) {
        const pct = (count / stats.totalSettled * 100).toFixed(1) + '%';
        ctx.fillText(pct, cx, topY - 5);
      } else {
        ctx.fillText(count, cx, topY - 5);
      }
    }
  }

  drawExpectedCurve(board, simulation, stats) {
    if (stats.totalSettled < 5) return;

    const ctx = this.ctx;
    const expected = stats.getExpectedDistribution(board.numRows, stats.totalSettled);
    const ballDiam = board.ballRadius * 2;
    const scale = this._getBinScale(board, simulation);

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;

    for (let i = 0; i < expected.length; i++) {
      const bin = board.binRects[i];
      const cx = bin.x + bin.width / 2;
      const barH = expected[i] * ballDiam * scale;
      const y = board.binFloorY - barH;

      if (i === 0) {
        ctx.moveTo(cx, y);
      } else {
        ctx.lineTo(cx, y);
      }
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawPascalOverlay(board, stats) {
    const ctx = this.ctx;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 150, 0.6)';

    for (let r = 0; r < board.numRows; r++) {
      const row = stats.getPascalRow(r);
      for (let c = 0; c <= r; c++) {
        const pin = board.pins[r][c];
        ctx.fillText(row[c], pin.x, pin.y - board.pinRadius - 4);
      }
    }

    // Final row: distribution numbers centered above each bin
    const finalRow = stats.getPascalRow(board.numRows);
    ctx.fillStyle = 'rgba(255, 200, 100, 0.8)';
    for (let c = 0; c < finalRow.length; c++) {
      const bin = board.binRects[c];
      const cx = bin.x + bin.width / 2;
      ctx.fillText(finalRow[c], cx, board.binTopY - 6);
    }
  }

  drawStatsPanel(board, stats, x, y) {
    // Stats are rendered in the HTML sidebar instead
  }
}
