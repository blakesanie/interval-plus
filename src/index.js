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
    this.currentlyInInvocation = false;
    this.fresh = true;
    if (!["timeout", "interval"].includes(this.pauseableType))
      throw Error('pauseableType must be "interval" or "timeout"');
    this.startInterval(this.immediate);
  }

  setNextInvocation() {
    const now = new Date();
    now.setMilliseconds(now.getMilliseconds() + this.interval);
    this.activeTimeSinceInterval = 0;
    this.nextInvocation = now;
  }

  async startInterval(immediate = false) {
    this.stopped = false;
    if (this.verbose) console.log(this.name, "- start loop");
    const loopFunc = async () => {
      this.currentlyInInvocation = true;
      this.nextInvocation = "now";
      if (this.verbose) console.log(this.name, "- loop invocation");
      this.resumeWaitTime = undefined;
      this.prevInvocationStart = new Date();
      this.prevActiveStart = new Date();
      if (this.func[Symbol.toStringTag] === "AsyncFunction") {
        await this.func();
      } else {
        this.func();
      }
      this.prevInvocationEnd = new Date();
      this.setNextInvocation();
      this.currentlyInInvocation = false;
    };
    if (immediate) await loopFunc();
    if (this.stopped) return;
    this.setNextInvocation();
    if (this.pauseableType == "interval") {
      this.loop = setInterval(loopFunc, this.interval);
    } else {
      this.loop = setTimeout(loopFunc, this.interval);
    }
    this.fresh = false;
  }

  async waitForInvocationClearance() {
    if (this.verbose) console.log(this.name, "- waiting for invocation end");
    return new Promise((res) => {
      this.clearanceInterval = setInterval(() => {
        if (!this.currentlyInInvocation) {
          clearInterval(this.clearanceInterval);
          res();
        }
      }, 10);
    });
  }

  async pause() {
    if (this.paused && !this.resumeRequest) return;

    if (this.currentlyInInvocation) {
      await this.waitForInvocationClearance();
    }
    const now = new Date();
    this.resumeWaitTime = this.nextInvocation - now;
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
      this.nextInvocation = now;
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
    this.stopped = true;
    clearInterval(this.clearanceInterval);
    clearInterval(this.resumeRequest);
    clearInterval(this.loop);
    this.resumeRequest = undefined;
    this.loop = undefined;
    if (this.verbose) console.log(this.name, "- stop loop");
    if (this.currentlyInInvocation) {
      await this.waitForInvocationClearance();
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
        "unpaused ms since last invocation"
      );
    this.resumeWaitTime = Math.max(0, interval - timeElapsed);
    this.interval = interval;
    this.resume();
  }

  nextInvocationTime() {
    if (!this.hasFutureInvocations()) return;
    if (this.nextInvocation == "now") return this.nextInvocation;
    if (this.paused) return "paused";
    return new Date(this.nextInvocation.getTime());
  }

  nextInvocationActiveMs() {
    const time = this.nextInvocationTime();
    if (!time) return;
    if (time == "now") return time;
    if (this.paused) return this.resumeWaitTime;
    if (this.loop && !this.loop._destroyed)
      return this.resumeWaitTime || this.nextInvocation - new Date();
  }

  prevInvocationStartTime() {
    if (!this.prevInvocationStart) return;
    return new Date(this.prevInvocationStart.getTime());
  }

  prevInvocationEndTime() {
    if (!this.prevInvocationEnd) return;
    return new Date(this.prevInvocationEnd.getTime());
  }

  prevInvocationStartActiveMs() {
    if (!this.prevInvocationStartTime()) return;
    let out = this.activeTimeSinceInterval;
    if (this.prevActiveStart) {
      out += new Date() - this.prevActiveStart;
    }
    return out;
  }

  prevInvocationEndActiveMs() {
    if (!this.prevInvocationEndTime()) return;
    return (
      this.prevInvocationStartActiveMs() -
      (this.prevInvocationEndTime().getMilliseconds() -
        this.prevInvocationStartTime().getMilliseconds())
    );
  }

  skipToNextInvocation() {
    this.stop();
    this.startInterval(true);
  }

  hasFutureInvocations() {
    return (
      this.fresh ||
      (this.paused && this.resumeWaitTime > 0) ||
      (this.loop && !this.loop._destroyed) ||
      (this.resumeRequest && this.nextInvocation > new Date())
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
