class Pauseable {
  constructor(func, interval, options = {}) {
    this.func = func;
    this.interval = interval;
    this.activeTimeSinceInterval = 0;
    this.paused = false;
    this.verbose = options.verbose || false;
    this.name = options.name || "IntervalPlus";
    this.immediate = options.immediate || false;
    this.pauseableType = options.pauseableType;
    this.currentlyInIteration = false;
    this.startInterval(this.immediate);
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
      this.nextIteration = "now";
      if (this.verbose) console.log(this.name, "- loop iteration");
      this.resumeWaitTime = undefined;
      this.prevIterationStart = new Date();
      this.prevActiveStart = new Date();
      if (this.func[Symbol.toStringTag] === "AsyncFunction") {
        console.log("start func");
        await this.func();
        console.log("end func");
      } else {
        this.func();
      }
      this.prevIterationEnd = new Date();
      this.setNextIteration();
      this.currentlyInIteration = false;
    };
    if (immediate) await loopFunc();
    this.setNextIteration();
    if (this.pauseableType == "interval") {
      this.loop = setInterval(loopFunc, this.interval);
    } else if (this.pauseableType == "timeout") {
      this.loop = setTimeout(loopFunc, this.interval);
    } else {
      throw Error('pauseableType must be "interval" or "timeout"');
    }
  }

  async waitForIterationClearance() {
    if (this.verbose) console.log(this.name, "- waiting for invocation end");
    return new Promise((res) => {
      console.log("waiting");
      this.clearanceInterval = setInterval(() => {
        if (!this.currentlyInIteration) {
          console.log("resolving promise");
          clearInterval(this.clearanceInterval);
          res();
        } else {
          // console.log("still waiting", new Date());
        }
      }, 10);
      console.log("after setInterval");
    });
  }

  async pause() {
    if (this.paused && !this.resumeRequest) return;

    if (this.currentlyInIteration) {
      await this.waitForIterationClearance();
    }
    const now = new Date();
    this.resumeWaitTime = this.nextIteration - now;
    if (this.resumeRequest) {
      clearInterval(this.resumeRequest);
      this.resumeRequest = undefined;
      if (this.verbose)
        console.log(
          this.name,
          "- paused again,",
          this.resumeWaitTime,
          "ms remaining now"
        );
    } else if (this.loop) {
      clearInterval(this.loop);
      this.loop = undefined;
      if (this.verbose)
        console.log(this.name, "- pause,", this.resumeWaitTime, "ms remaining");
    }

    this.paused = true;
    this.activeTimeSinceInterval += new Date() - this.prevActiveStart;
    this.prevActiveStart = undefined;
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

  async stop() {
    clearInterval(this.clearanceInterval);
    clearInterval(this.resumeRequest);
    clearInterval(this.loop);
    console.log("cleared intervals");
    this.resumeRequest = undefined;
    this.loop = undefined;
    if (this.verbose) console.log(this.name, "- stop loop");
    if (this.currentlyInIteration) {
      console.log("start wait");
      await this.waitForIterationClearance();
      console.log("end wait");
    }
  }

  async changeInterval(interval) {
    // needs to wait until end of current execution
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
