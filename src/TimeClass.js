abstract class BaseTimer {
  protected time: number = 0;
  protected interval: ReturnType<typeof setInterval> | null = null;

  constructor(protected displayElement: HTMLElement) {}

  protected updateDisplay() {
    this.displayElement.textContent = `${this.time}s`;
  }

  abstract start(): void;
  abstract stop(): void;
  abstract reset(): void;
}

class Stopwatch extends BaseTimer {
  start() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.time++;
      this.updateDisplay();
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  reset() {
    this.stop();
    this.time = 0;
    this.updateDisplay();
  }
}

class CountdownTimer extends BaseTimer {
  constructor(displayElement: HTMLElement, private startTime: number) {
    super(displayElement);
    this.time = startTime;
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      if (this.time > 0) {
        this.time--;
        this.updateDisplay();
      } else {
        this.stop();
        alert("Czas minął!");
      }
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  reset() {
    this.stop();
    this.time = this.startTime;
    this.updateDisplay();
  }
}

const stopwatch = new Stopwatch(document.getElementById("stopwatch")!);
const countdown = new CountdownTimer(document.getElementById("countdown")!, 30);



