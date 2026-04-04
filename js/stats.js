// Distribution tracking, binomial PMF, Pascal's triangle data

export class Stats {
  constructor() {
    this.binCounts = [];
    this.totalSettled = 0;
  }

  reset(numBins) {
    this.binCounts = new Array(numBins).fill(0);
    this.totalSettled = 0;
  }

  recordBall(binIndex) {
    if (binIndex >= 0 && binIndex < this.binCounts.length) {
      this.binCounts[binIndex]++;
      this.totalSettled++;
    }
  }

  getMean() {
    if (this.totalSettled === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.binCounts.length; i++) {
      sum += i * this.binCounts[i];
    }
    return sum / this.totalSettled;
  }

  getStdDev() {
    if (this.totalSettled === 0) return 0;
    const mean = this.getMean();
    let sumSq = 0;
    for (let i = 0; i < this.binCounts.length; i++) {
      sumSq += this.binCounts[i] * (i - mean) ** 2;
    }
    return Math.sqrt(sumSq / this.totalSettled);
  }

  // Binomial PMF: P(k) = C(n,k) * 0.5^n
  getExpectedDistribution(numRows, totalBalls) {
    const n = numRows;
    const expected = [];
    for (let k = 0; k <= n; k++) {
      expected.push(this.binomialPMF(n, k) * totalBalls);
    }
    return expected;
  }

  binomialPMF(n, k) {
    return this.binomialCoeff(n, k) * Math.pow(0.5, n);
  }

  binomialCoeff(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 0; i < Math.min(k, n - k); i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  }

  getPascalRow(row) {
    const result = [];
    for (let c = 0; c <= row; c++) {
      result.push(this.binomialCoeff(row, c));
    }
    return result;
  }

  getChiSquared(numRows) {
    if (this.totalSettled < 10) return null;
    const expected = this.getExpectedDistribution(numRows, this.totalSettled);
    let chi2 = 0;
    for (let i = 0; i < this.binCounts.length; i++) {
      if (expected[i] > 0) {
        chi2 += (this.binCounts[i] - expected[i]) ** 2 / expected[i];
      }
    }
    return chi2;
  }

  getFitLabel(numRows) {
    if (this.totalSettled < 10) return 'Not enough data';
    if (this.totalSettled < 50) return 'Emerging pattern';
    const chi2 = this.getChiSquared(numRows);
    if (chi2 === null) return 'Not enough data';
    const df = this.binCounts.length - 1;
    const normalizedChi2 = chi2 / df;
    if (normalizedChi2 < 1.5) return 'Excellent fit';
    if (normalizedChi2 < 3) return 'Close to expected';
    if (normalizedChi2 < 6) return 'Moderate fit';
    return 'Emerging pattern';
  }

  getMaxBinCount() {
    return Math.max(0, ...this.binCounts);
  }
}
