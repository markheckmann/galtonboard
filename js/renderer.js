// All Canvas drawing: pins, balls, bins, overlays, highlights

const THEMES = {
  dark: {
    bgGrad1: '#1a1a2e',
    bgGrad2: '#16213e',
    pin: '#c0c0c0',
    funnel: '#8899aa',
    funnelFill: 'rgba(136, 153, 170, 0.15)',
    binWall: 'rgba(100, 140, 180, 0.4)',
    binFloor: 'rgba(100, 140, 180, 0.6)',
    ballFill: 'rgba(65, 131, 215, 0.85)',
    barGrad1: 'rgba(65, 131, 215, 0.9)',
    barGrad2: 'rgba(45, 91, 175, 0.9)',
    binCountText: 'rgba(200, 220, 240, 0.8)',
    pascalText: 'rgba(255, 255, 150, 0.6)',
    pascalFinalText: 'rgba(255, 200, 100, 0.8)',
    highlightInfo: '#ffffff',
    expectedCurve: '#ff4444',
    bgCurveFill: 'rgba(65, 131, 215, 0.08)',
    bgCurveStroke: 'rgba(65, 131, 215, 0.2)',
    pinFlash: '#ffffff',
    meanLine: 'rgba(255, 220, 50, 0.8)',
    stddevLine: 'rgba(255, 220, 50, 0.4)',
  },
  light: {
    bgGrad1: '#eef2f7',
    bgGrad2: '#e0e8f0',
    pin: '#555555',
    funnel: '#556677',
    funnelFill: 'rgba(80, 100, 120, 0.12)',
    binWall: 'rgba(60, 90, 130, 0.3)',
    binFloor: 'rgba(60, 90, 130, 0.5)',
    ballFill: 'rgba(50, 110, 200, 0.85)',
    barGrad1: 'rgba(50, 110, 200, 0.85)',
    barGrad2: 'rgba(35, 80, 160, 0.85)',
    binCountText: 'rgba(30, 50, 80, 0.8)',
    pascalText: 'rgba(120, 90, 0, 0.7)',
    pascalFinalText: 'rgba(160, 100, 0, 0.9)',
    highlightInfo: '#1a1a2e',
    expectedCurve: '#cc2222',
    bgCurveFill: 'rgba(50, 110, 200, 0.07)',
    bgCurveStroke: 'rgba(50, 110, 200, 0.15)',
    pinFlash: '#ff9933',
    meanLine: 'rgba(200, 120, 0, 0.8)',
    stddevLine: 'rgba(200, 120, 0, 0.4)',
  },
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.showPascal = false;
    this.showExpectedCurve = false;
    this.showStats = true;
    this.showPercentages = false;
    this.showBackgroundCurve = false;
    this.abbreviatePascal = false;
    this.labelFontSize = 10;
    this.pascalFontSize = 9;
    this.showDistLines = false;
    this.theme = THEMES.dark;
  }

  setLightMode(light) {
    this.theme = light ? THEMES.light : THEMES.dark;
  }

  clear() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, this.theme.bgGrad1);
    grad.addColorStop(1, this.theme.bgGrad2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(board, simulation, stats) {
    this.clear();
    this.drawFunnel(board, simulation);
    this.drawBinWalls(board);
    if (this.showBackgroundCurve) {
      this.drawBackgroundCurve(board, simulation, stats);
    }
    this.drawPins(board, simulation);

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
    if (this.showDistLines) {
      this.drawDistributionLines(board, stats);
    }
    this.drawSplashes(board, simulation);
  }

  drawFunnel(board, simulation) {
    const ctx = this.ctx;
    const cx = board.centerX;
    const fy = board.funnelY;

    // Queued balls inside the funnel
    const remaining = simulation.totalBallsToSpawn - simulation.totalBallsSpawned;
    if (remaining > 0 && simulation.running) {
      const maxVisible = Math.min(remaining, 8);
      for (let i = 0; i < maxVisible; i++) {
        const spread = (i / maxVisible) * 18;
        const ballY = fy - 8 - i * board.ballRadius * 1.5;
        const ballX = cx + (Math.sin(i * 2.3) * spread * 0.3);
        ctx.beginPath();
        ctx.arc(ballX, ballY, board.ballRadius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = this.theme.ballFill;
        ctx.globalAlpha = 0.3 + 0.4 * (1 - i / maxVisible);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.moveTo(cx - 30, fy - 20);
    ctx.lineTo(cx - 5, fy + 5);
    ctx.lineTo(cx + 5, fy + 5);
    ctx.lineTo(cx + 30, fy - 20);
    ctx.strokeStyle = this.theme.funnel;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Funnel fill
    ctx.fillStyle = this.theme.funnelFill;
    ctx.fill();
  }

  drawPins(board, simulation) {
    const ctx = this.ctx;
    const flashes = simulation.pinFlashes;

    for (let r = 0; r < board.pins.length; r++) {
      const row = board.pins[r];
      for (let c = 0; c < row.length; c++) {
        const pin = row[c];
        const flash = flashes[r] ? flashes[r][c] : 0;

        if (flash > 0) {
          // Glow effect
          const intensity = flash / 0.3; // 0→1
          ctx.shadowColor = this.theme.pinFlash;
          ctx.shadowBlur = 8 * intensity;
          ctx.fillStyle = this.theme.pinFlash;
          ctx.globalAlpha = 0.4 + 0.6 * intensity;
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, board.pinRadius * (1 + 0.5 * intensity), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = this.theme.pin;
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, board.pinRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawBinWalls(board) {
    const ctx = this.ctx;
    ctx.strokeStyle = this.theme.binWall;
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
    ctx.strokeStyle = this.theme.binFloor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawBackgroundCurve(board, simulation, stats) {
    if (simulation.totalBallsToSpawn < 2) return;
    const ctx = this.ctx;
    const p = simulation.bias != null ? simulation.bias : 0.5;
    const expected = stats.getExpectedDistribution(board.numRows, simulation.totalBallsToSpawn, p);
    const ballDiam = board.ballRadius * 2;
    const maxExpected = Math.max(...expected);
    const scale = this._getBinScale(board, simulation, maxExpected);

    // Build curve points
    const points = [];
    for (let i = 0; i < expected.length; i++) {
      const bin = board.binRects[i];
      const cx = bin.x + bin.width / 2;
      const barH = expected[i] * ballDiam * scale;
      points.push({ x: cx, y: board.binFloorY - barH });
    }

    // Draw filled area with smooth curve
    ctx.beginPath();
    ctx.moveTo(points[0].x, board.binFloorY);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
    }
    // Final segment
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.lineTo(last.x, board.binFloorY);
    ctx.closePath();

    ctx.fillStyle = this.theme.bgCurveFill;
    ctx.fill();

    // Stroke the curve top
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
    }
    ctx.lineTo(last.x, last.y);
    ctx.strokeStyle = this.theme.bgCurveStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawActiveBalls(board, simulation) {
    const ctx = this.ctx;

    for (const ball of [...simulation.activeBalls, ...simulation.dropOneBalls]) {
      // Draw trail (faint for normal, bright for highlighted)
      if (ball.trailPoints.length > 1 && (ball.highlighted || board.trailDuration > 0)) {
        this._drawTrail(ball, board);
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

  // Compute the scale factor so the tallest bin/curve fits within the bin area
  _getBinScale(board, simulation, extraMax = 0) {
    const ballDiam = board.ballRadius * 2;
    const maxCount = Math.max(1, ...simulation.binStacks, extraMax);
    const maxBarHeight = maxCount * ballDiam;
    // Reserve space at top for overlays (Pascal row, dist lines, bar labels)
    let topReserve = 15; // base margin + label space
    if (this.showPascal) topReserve += this.pascalFontSize + 6;
    if (this.showDistLines) topReserve += this.labelFontSize + 12;
    if (this.labelFontSize > 0) topReserve += this.labelFontSize;
    const availableHeight = board.binFloorY - board.binTopY - topReserve;
    return maxBarHeight > availableHeight ? availableHeight / maxBarHeight : 1;
  }

  drawSettledBalls(board, simulation) {
    const ctx = this.ctx;
    const ballDiam = board.ballRadius * 2;
    const scale = this._getBinScale(board, simulation);

    // Draw fading trails from settled balls
    for (const ball of simulation.settledBalls) {
      if (ball.trailPoints.length > 1) {
        this._drawTrail(ball, board);
      }
    }

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
        grad.addColorStop(0, this.theme.barGrad1);
        grad.addColorStop(1, this.theme.barGrad2);
        ctx.fillStyle = grad;
        ctx.fillRect(bin.x + 2, barY, bin.width - 4, height);
      } else {
        // Draw individual balls
        for (let s = 0; s < count; s++) {
          const y = board.binFloorY - (s + 0.5) * ballDiam;
          ctx.beginPath();
          ctx.arc(cx, y, board.ballRadius - 0.5, 0, Math.PI * 2);
          ctx.fillStyle = this.theme.ballFill;
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

  _drawTrail(ball, board) {
    const ctx = this.ctx;
    const points = ball.trailPoints;
    if (points.length < 2) return;
    const color = ball.getColor();
    const maxAlpha = ball.highlighted ? 0.6 : 0.2;
    const lineWidth = ball.highlighted ? 2 : 1;
    const trailDuration = board.trailDuration || 5;

    for (let i = 0; i < points.length - 1; i++) {
      // Alpha based on remaining time-to-live
      const ttl = points[i].ttl != null ? points[i].ttl : 0;
      if (ttl <= 0) continue;
      const maxTtl = Math.max(trailDuration, ball.highlighted ? 5 : 1);
      const alpha = Math.min(1, ttl / maxTtl) * maxAlpha;
      if (alpha < 0.005) continue;
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(points[i + 1].x, points[i + 1].y);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
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
    if (this.labelFontSize <= 0) return;
    const ctx = this.ctx;
    const ballDiam = board.ballRadius * 2;
    const scale = this._getBinScale(board, simulation);
    ctx.font = `${this.labelFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = this.theme.binCountText;

    for (let i = 0; i < board.numBins; i++) {
      const count = simulation.binStacks[i];
      if (count === 0) continue;

      const bin = board.binRects[i];
      const cx = bin.x + bin.width / 2;
      const labelY = board.binFloorY - count * ballDiam * scale - 5;
      if (this.showPercentages && stats.totalSettled > 0) {
        const pct = (count / stats.totalSettled * 100).toFixed(1) + '%';
        ctx.fillText(pct, cx, labelY);
      } else {
        ctx.fillText(count, cx, labelY);
      }
    }
  }

  drawDistributionLines(board, stats) {
    if (stats.totalSettled < 5) return;
    const ctx = this.ctx;
    const mean = stats.getMean();
    const stddev = stats.getStdDev();
    const firstBinX = board.binRects[0].x;
    const binW = board.pinSpacingX;

    // Convert bin index (fractional) to canvas X
    const binToX = (bin) => firstBinX + (bin + 0.5) * binW;

    const meanX = binToX(mean);
    const stdLeftX = binToX(mean - stddev);
    const stdRightX = binToX(mean + stddev);
    // Position above the bin area, below Pascal final row if shown
    const pascalSpace = this.showPascal ? this.pascalFontSize + 6 : 0;
    const distTop = board.binTopY - 30 - pascalSpace;
    const bottom = board.binFloorY;
    const labelY = distTop + this.labelFontSize + 2;

    // Mean line
    ctx.beginPath();
    ctx.moveTo(meanX, distTop);
    ctx.lineTo(meanX, bottom);
    ctx.strokeStyle = this.theme.meanLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.stroke();

    // Mean label
    if (this.labelFontSize > 0) {
      ctx.font = `${this.labelFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = this.theme.meanLine;
      ctx.fillText('\u03BC', meanX, labelY);
    }

    // +/- 1 stddev lines
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = this.theme.stddevLine;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(stdLeftX, distTop);
    ctx.lineTo(stdLeftX, bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(stdRightX, distTop);
    ctx.lineTo(stdRightX, bottom);
    ctx.stroke();

    // Stddev bracket line
    ctx.beginPath();
    ctx.moveTo(stdLeftX, labelY + 4);
    ctx.lineTo(stdRightX, labelY + 4);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    if (this.labelFontSize > 0) {
      ctx.font = `${Math.max(this.labelFontSize - 1, 6)}px sans-serif`;
      ctx.fillStyle = this.theme.stddevLine;
      ctx.textAlign = 'right';
      ctx.fillText('-1\u03C3', stdLeftX - 3, labelY);
      ctx.textAlign = 'left';
      ctx.fillText('+1\u03C3', stdRightX + 3, labelY);
    }
  }

  drawSplashes(board, simulation) {
    const ctx = this.ctx;
    const ballDiam = board.ballRadius * 2;
    const scale = this._getBinScale(board, simulation);

    for (const splash of simulation.splashes) {
      const t = 1 - splash.timer / splash.maxTimer; // 0 → 1
      const alpha = (1 - t) * 0.6;
      const radius = board.ballRadius * (1 + t * 3);
      const y = board.binFloorY - (splash.stackPosition + 0.5) * ballDiam * scale;

      ctx.beginPath();
      ctx.arc(splash.x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.theme.ballFill;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawExpectedCurve(board, simulation, stats) {
    if (stats.totalSettled < 5) return;

    const ctx = this.ctx;
    const expected = stats.getExpectedDistribution(board.numRows, stats.totalSettled, simulation.bias != null ? simulation.bias : 0.5);
    const ballDiam = board.ballRadius * 2;
    const scale = this._getBinScale(board, simulation);

    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = this.theme.expectedCurve;
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

  _formatPascal(n) {
    if (!this.abbreviatePascal) return String(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'm';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
  }

  drawPascalOverlay(board, stats) {
    if (this.pascalFontSize <= 0) return;
    const ctx = this.ctx;
    ctx.font = `${this.pascalFontSize}px monospace`;
    ctx.fillStyle = this.theme.pascalText;

    for (let r = 0; r < board.numRows; r++) {
      const row = stats.getPascalRow(r);
      // Check if the widest number in this row would overlap
      const maxText = this._formatPascal(Math.max(...row));
      const textWidth = ctx.measureText(maxText).width;
      const needsRotation = textWidth > board.pinSpacingX * 0.85;

      for (let c = 0; c <= r; c++) {
        const pin = board.pins[r][c];
        const label = this._formatPascal(row[c]);
        if (needsRotation) {
          ctx.save();
          ctx.translate(pin.x, pin.y - board.pinRadius - 4);
          ctx.rotate(-Math.PI / 6); // -30 degrees
          ctx.textAlign = 'right';
          ctx.fillText(label, 0, 0);
          ctx.restore();
        } else {
          ctx.textAlign = 'center';
          ctx.fillText(label, pin.x, pin.y - board.pinRadius - 4);
        }
      }
    }

    // Final row: distribution numbers centered above each bin
    const finalRow = stats.getPascalRow(board.numRows);
    const maxFinalText = this._formatPascal(Math.max(...finalRow));
    const finalTextWidth = ctx.measureText(maxFinalText).width;
    const finalNeedsRotation = finalTextWidth > board.pinSpacingX * 0.85;

    ctx.fillStyle = this.theme.pascalFinalText;
    for (let c = 0; c < finalRow.length; c++) {
      const bin = board.binRects[c];
      const cx = bin.x + bin.width / 2;
      const label = this._formatPascal(finalRow[c]);
      if (finalNeedsRotation) {
        ctx.save();
        ctx.translate(cx, board.binTopY - 6);
        ctx.rotate(-Math.PI / 6);
        ctx.textAlign = 'right';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, board.binTopY - 6);
      }
    }
  }

  drawStatsPanel(board, stats, x, y) {
    // Stats are rendered in the HTML sidebar instead
  }
}
