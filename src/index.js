class Pauseable {
  constructor(func, interval, options = {}) {
    this.func = func;
    this.interval = interval;
    this.activeTimeSinceInterval = 0;
    this.paused = false;
    this.verbose = options.verbose || false;
    this.name = options.name || "PauseableInterval";
    this.immediate = options.immediate || false;
    this.pauseableType = options.pauseableType;
    this.currentlyInIteration = false;
    this.startInterval();
  }

  setNextIteration() {
    const now = new Date();
    now.setMilliseconds(now.getMilliseconds() + this.interval);
    this.activeTimeSinceInterval = 0;
    this.nextIteration = now;
  }

  async startInterval(immediate = false) {
    if (this.verbose) console.log(this.name, "- start loop");
    const loopFunc = async () => {
      this.currentlyInIteration = true;
      if (this.verbose) console.log(this.name, "- loop iteration");
      this.resumeWaitTime = undefined;
      this.prevIterationStart = new Date();
      this.prevActiveStart = new Date();
      if (this.func[Symbol.toStringTag] === "AsyncFunction") {
        await this.func();
      } else {
        this.func();
      }
      this.prevIterationEnd = new Date();
      this.setNextIteration();
      this.currentlyInIteration = false;
    };
    if (immediate || this.immediate) await loopFunc();
    this.setNextIteration();
    if (this.pauseableType == "interval") {
      this.loop = setInterval(loopFunc, this.interval);
    } else if (this.pauseableType == "timeout") {
      this.loop = setTimeout(loopFunc, this.interval);
    } else {
      throw Error('pauseableType must be "interval" or "timeout"');
    }
  }

  async pause() {
    if (!this.paused) {
      if (this.currentlyInIteration) {
        await new Promise((res) => {
          setInterval(() => {
            if (!this.currentlyInIteration) res();
          }, 10);
        });
      }
      clearInterval(this.loop);
      this.activeTimeSinceInterval += new Date() - this.prevActiveStart;
      this.prevActiveStart = undefined;
      this.resumeRequest = undefined;
      const now = new Date();
      this.resumeWaitTime = this.nextIteration - now;
      this.paused = true;
      if (this.verbose)
        console.log(this.name, "- pause,", this.resumeWaitTime, "ms remaining");
    } else if (this.resumeRequest) {
      clearInterval(this.resumeRequest);
      this.activeTimeSinceInterval += new Date() - this.prevActiveStart;
      this.prevActiveStart = undefined;
      this.resumeRequest = undefined;
      const now = new Date();
      this.resumeWaitTime = this.nextIteration - now;
      if (this.verbose)
        console.log(
          this.name,
          "- paused again,",
          this.resumeWaitTime,
          "ms remaining now"
        );
    }
  }

  resume() {
    if (this.paused) {
      if (this.verbose)
        console.log(this.name, "- queue resume in", this.resumeWaitTime, "ms");
      this.prevActiveStart = new Date();
      const now = new Date();
      now.setMilliseconds(now.getMilliseconds() + this.resumeWaitTime);
      this.nextIteration = now;
      this.resumeRequest = setTimeout(() => {
        if (this.verbose) console.log(this.name, "- resuming now");
        this.resumeRequest = undefined;
        this.startInterval(true);
        this.paused = false;
      }, this.resumeWaitTime);
      this.resumeWaitTime = undefined;
    }
  }

  stop() {
    clearInterval(this.resumeRequest);
    clearInterval(this.loop);
    this.resumeRequest = undefined;
    this.loop = undefined;
    // this.paused = true;
    // this.nextIteration = undefined;
    // this.resumeWaitTime = undefined;
    if (this.verbose) console.log(this.name, "- stop loop");
  }

  changeInterval(interval) {
    if (this.verbose) console.log(this.name, "- change interval");
    this.pause();
    this.stop();
    const timeElapsed = this.interval - this.resumeWaitTime;
    if (this.verbose)
      console.log(
        this.name,
        "- been",
        timeElapsed,
        "unpaused ms since last iteration"
      );
    this.resumeWaitTime = Math.max(0, interval - timeElapsed);
    this.interval = interval;
    this.resume();
  }

  nextIterationTime() {
    if (!this.hasFutureIterations()) return;
    if (this.paused) return "paused";
    return this.nextIteration;
  }

  nextIterationActiveMs() {
    if (!this.hasFutureIterations()) return;
    if (this.paused) return this.resumeWaitTime;
    if (this.loop && !this.loop._destroyed)
      return this.resumeWaitTime || this.nextIteration - new Date();
    return;
  }

  prevIterationStartTime() {
    return this.prevIterationStart;
  }

  prevIterationEndTime() {
    return this.prevIterationEnd;
  }

  prevIterationStartActiveMs() {
    let out = this.activeTimeSinceInterval;
    if (this.prevActiveStart) {
      out += new Date() - this.prevActiveStart;
    }
    return out;
  }

  prevIterationEndActiveMs() {
    return (
      this.prevIterationStartActiveMs() -
      (this.prevIterationEndTime().getMilliseconds() -
        this.prevIterationStartTime().getMilliseconds())
    );
  }

  skipToNextIteration() {
    this.stop();
    this.startInterval(true);
  }

  hasFutureIterations() {
    return (
      (this.paused && this.resumeWaitTime > 0) ||
      (this.loop && !this.loop._destroyed) ||
      (this.resumeRequest && this.nextIteration > new Date())
    );
  }
}

function ensureTypeInArgs(args, type) {
  if (args.length < 2) throw Error("make sure to pass 2 arguments");
  if (typeof args[args.length - 1] === "object") {
    args[args.length - 1].pauseableType = type;
  } else {
    args.push({
      pauseableType: type,
    });
  }
}

class IntervalPlus extends Pauseable {
  constructor(...args) {
    ensureTypeInArgs(args, "interval");
    super(...args);
  }
}

class TimeoutPlus extends Pauseable {
  constructor(...args) {
    ensureTypeInArgs(args, "timeout");
    super(...args);
  }
}

try {
  module.exports = {
    IntervalPlus,
    TimeoutPlus,
  };
} catch (e) {}
