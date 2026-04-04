// Main simulation loop: spawning, stepping, settling, timing control

import { Ball } from './ball.js';

export class Simulation {
  constructor(board, stats) {
    this.board = board;
    this.stats = stats;

    this.activeBalls = [];
    this.settledBalls = [];
    this.highlightedBalls = new Set();

    this.running = false;
    this.speedMultiplier = 1;
    this.dropRate = 1; // balls per second
    this.bias = 0.5; // probability of going right (0.5 = fair)
    this.sequentialMode = false; // wait for previous ball to pass 2 pins before dropping next
    this.totalBallsToSpawn = 500;
    this.totalBallsSpawned = 0;
    this.dropAccumulator = 0;

    // Bin stacks: track count per bin for stacking
    this.binStacks = new Array(board.numBins).fill(0);

    // Base duration for one hop between pins (seconds)
    this.baseHopDuration = 0.6;

    // Drop-one mode: a single ball animating independently of running state
    this.dropOneBalls = [];
  }

  reset() {
    this.activeBalls = [];
    this.settledBalls = [];
    this.dropOneBalls = [];
    this.highlightedBalls.clear();
    this.totalBallsSpawned = 0;
    this.dropAccumulator = 0;
    this.binStacks = new Array(this.board.numBins).fill(0);
    this.stats.reset(this.board.numBins);
  }

  start() {
    this.running = true;
  }

  pause() {
    this.running = false;
  }

  toggleRunning() {
    this.running = !this.running;
    return this.running;
  }

  update(dt) {
    const hopDuration = this.baseHopDuration / this.speedMultiplier;

    // Expire highlighted balls 5 seconds after they settle
    for (const ball of this.highlightedBalls) {
      if (ball.state === 'settled') {
        ball.highlightTimer -= dt;
        if (ball.highlightTimer <= 0) {
          ball.setHighlighted(false, -1);
          this.highlightedBalls.delete(ball);
        }
      }
    }

    // Always animate drop-one balls, even when paused
    for (let i = this.dropOneBalls.length - 1; i >= 0; i--) {
      const ball = this.dropOneBalls[i];
      ball.step(dt, hopDuration);
      if (ball.state === 'settled') {
        this.settleBall(ball);
        this.dropOneBalls.splice(i, 1);
      }
    }

    if (!this.running) return;

    const effectiveDt = dt * this.speedMultiplier;

    // Spawn new balls
    if (this.totalBallsSpawned < this.totalBallsToSpawn) {
      if (this.sequentialMode) {
        // Only spawn when no active ball exists or the newest is 1.5 pins ahead
        const newest = this.activeBalls[this.activeBalls.length - 1];
        const canSpawn = !newest ||
          newest.currentRow >= 2 ||
          (newest.currentRow === 1 && newest.progress >= 0.5);
        if (canSpawn) {
          this.spawnBall();
        }
      } else {
        this.dropAccumulator += effectiveDt * this.dropRate / this.speedMultiplier;
        while (this.dropAccumulator >= 1 && this.totalBallsSpawned < this.totalBallsToSpawn) {
          this.spawnBall();
          this.dropAccumulator -= 1;
        }
      }
    }

    // Step active balls
    for (let i = this.activeBalls.length - 1; i >= 0; i--) {
      const ball = this.activeBalls[i];
      ball.step(dt, hopDuration);

      if (ball.state === 'settled') {
        this.settleBall(ball);
        this.activeBalls.splice(i, 1);
      }
    }
  }

  spawnBall() {
    const ball = new Ball(this.board, this.bias);
    this.activeBalls.push(ball);
    this.totalBallsSpawned++;
    return ball;
  }

  dropOneBall() {
    const ball = new Ball(this.board, this.bias);
    this.dropOneBalls.push(ball);
    return ball;
  }

  settleBall(ball) {
    const binIndex = ball.binIndex;
    if (binIndex < 0 || binIndex >= this.board.numBins) return;

    const stackPos = this.binStacks[binIndex];
    this.binStacks[binIndex]++;
    ball.stackPosition = stackPos;

    // Compute settled visual position
    const bin = this.board.binRects[binIndex];
    ball.settledX = bin.x + bin.width / 2;
    ball.settledY = this.board.binFloorY - (stackPos + 0.5) * this.board.ballRadius * 2;

    ball.visualX = ball.settledX;
    ball.visualY = ball.settledY;

    this.settledBalls.push(ball);
    this.stats.recordBall(binIndex);
  }

  // Click handling: find nearest active ball
  findBallAt(canvasX, canvasY) {
    let closest = null;
    let closestDist = Infinity;
    const threshold = 20;

    for (const ball of [...this.activeBalls, ...this.dropOneBalls]) {
      const dx = ball.visualX - canvasX;
      const dy = ball.visualY - canvasY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold && dist < closestDist) {
        closest = ball;
        closestDist = dist;
      }
    }

    // Also check settled balls
    for (const ball of this.settledBalls) {
      const dx = ball.visualX - canvasX;
      const dy = ball.visualY - canvasY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold && dist < closestDist) {
        closest = ball;
        closestDist = dist;
      }
    }

    return closest;
  }

  toggleHighlight(ball) {
    if (!ball) return;

    if (this.highlightedBalls.has(ball)) {
      ball.setHighlighted(false, -1);
      this.highlightedBalls.delete(ball);
    } else {
      // Remove the oldest highlighted ball if at capacity
      if (this.highlightedBalls.size >= 5) {
        const oldest = this.highlightedBalls.values().next().value;
        oldest.setHighlighted(false, -1);
        this.highlightedBalls.delete(oldest);
      }

      // Find next available color index
      const usedIndices = new Set();
      for (const b of this.highlightedBalls) {
        usedIndices.add(b.highlightColorIndex);
      }
      let colorIndex = 0;
      while (usedIndices.has(colorIndex)) colorIndex++;

      ball.setHighlighted(true, colorIndex);
      this.highlightedBalls.add(ball);
    }
  }

  get allBalls() {
    return [...this.activeBalls, ...this.settledBalls];
  }

  get isComplete() {
    return this.totalBallsSpawned >= this.totalBallsToSpawn && this.activeBalls.length === 0;
  }
}
