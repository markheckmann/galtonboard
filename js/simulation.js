// Main simulation loop: spawning, stepping, settling, timing control

import { Ball } from './ball.js';
import { PhysicsBall } from './physics-ball.js';

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
    this.physicsMode = true;
    this.trailLength = 10; // default trail length for all balls
    this.sequentialMode = false; // wait for previous ball to pass 2 pins before dropping next
    this.totalBallsToSpawn = 1000;
    this.totalBallsSpawned = 0;
    this.dropAccumulator = 0;

    // Bin stacks: track count per bin for stacking
    this.binStacks = new Array(board.numBins).fill(0);

    // Splash effects when balls land
    this.splashes = [];
    this._settledWithTrails = []; // settled balls still having visible trails

    // Pin flash timers [row][col] — set when a ball hits a pin
    this.pinFlashes = [];
    this._initPinFlashes();

    // Base duration for one hop between pins (seconds)
    this.baseHopDuration = 0.6;

    // Drop-one mode: a single ball animating independently of running state
    this.dropOneBalls = [];
  }

  _initPinFlashes() {
    this.pinFlashes = [];
    for (let r = 0; r < this.board.numRows; r++) {
      this.pinFlashes.push(new Float32Array(r + 1)); // initialized to 0
    }
  }

  _consumeHitPin(ball) {
    if (ball.hitPin) {
      this.flashPin(ball.hitPin.row, ball.hitPin.col);
      ball.hitPin = null;
    }
  }

  flashPin(row, col) {
    if (row >= 0 && row < this.pinFlashes.length && col >= 0 && col < this.pinFlashes[row].length) {
      this.pinFlashes[row][col] = 0.3; // flash duration in seconds
    }
  }

  reset() {
    this.activeBalls = [];
    this.settledBalls = [];
    this.dropOneBalls = [];
    this.splashes = [];
    this._settledWithTrails = [];
    this._initPinFlashes();
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

    // Decay settled trails (whole trail fades uniformly after landing)
    for (let i = this._settledWithTrails.length - 1; i >= 0; i--) {
      const ball = this._settledWithTrails[i];
      ball.decayTrail(dt);
      if (ball.trailPoints.length === 0) {
        this._settledWithTrails.splice(i, 1);
      }
    }

    // Decay pin flashes
    for (let r = 0; r < this.pinFlashes.length; r++) {
      const row = this.pinFlashes[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] > 0) row[c] = Math.max(0, row[c] - dt);
      }
    }

    // Decay splash effects
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      this.splashes[i].timer -= dt;
      if (this.splashes[i].timer <= 0) {
        this.splashes.splice(i, 1);
      }
    }

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
      this._consumeHitPin(ball);
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
      this._consumeHitPin(ball);

      if (ball.state === 'settled') {
        this.settleBall(ball);
        this.activeBalls.splice(i, 1);
      }
    }
  }

  _createBall() {
    return this.physicsMode
      ? new PhysicsBall(this.board, this.bias)
      : new Ball(this.board, this.bias);
  }

  spawnBall() {
    const ball = this._createBall();
    this.activeBalls.push(ball);
    this.totalBallsSpawned++;
    return ball;
  }

  dropOneBall() {
    const ball = this._createBall();
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
    if (ball.trailPoints.length > 0) {
      // Set TTL on all points so the whole trail fades together
      const dur = ball.highlighted
        ? Math.max(this.board.trailDuration || 2, 5)
        : (this.board.trailDuration || 2);
      for (const p of ball.trailPoints) {
        p.ttl = dur;
      }
      this._settledWithTrails.push(ball);
    }
    this.stats.recordBall(binIndex);

    // Create splash effect (store bin/stack so position adapts to rescaling)
    this.splashes.push({
      x: ball.settledX,
      binIndex: binIndex,
      stackPosition: stackPos,
      timer: 0.4,
      maxTimer: 0.4,
    });
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
