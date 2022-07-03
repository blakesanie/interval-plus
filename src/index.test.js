const intervalPlus = require("./");
const { IntervalPlus, TimeoutPlus } = intervalPlus;

async function sleep(ms) {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, ms);
  });
}

test("requires args", () => {
  expect(() => new IntervalPlus()).toThrow(Error);
  expect(() => new TimeoutPlus()).toThrow(Error);
  expect(() => new IntervalPlus(1)).toThrow(Error);
  expect(() => new TimeoutPlus(2)).toThrow(Error);
});

test("instantiation", () => {
  let ip = new IntervalPlus(() => {}, 1000);
  ip.stop();
  ip = new TimeoutPlus(() => {}, 1000, {});
  ip.stop();
});

test("immediate", async () => {
  let x = 0;
  let ip = new IntervalPlus(() => {
    x += 1;
  }, 1000000);
  await sleep(100);
  ip.stop();
  expect(x).toBe(0);
  ip = new IntervalPlus(
    () => {
      x += 1;
    },
    1000000,
    { immediate: true }
  );
  await sleep(100);
  ip.stop();
  expect(x).toBe(1);
});

test("basic timing", async () => {
  const start = new Date();
  let end;
  let ip = new TimeoutPlus(() => {
    end = new Date();
  }, 1000);
  await sleep(1100);
  ip.stop();
  expect(Math.abs(end - start - 1000)).toBeLessThan(99);
});

test("pause and resume", async () => {
  const start = new Date();
  let end;
  let ip = new TimeoutPlus(() => {
    end = new Date();
  }, 1000);
  await sleep(200);
  ip.pause();
  await sleep(200);
  ip.resume();
  await sleep(1000);
  ip.stop();
  expect(Math.abs(end - start - 1200)).toBeLessThan(99);
});

test("pause and resume and pause and resume", async () => {
  const start = new Date();
  let end;
  let ip = new TimeoutPlus(() => {
    end = new Date();
  }, 1000);
  await sleep(200);
  ip.pause();
  await sleep(200);
  ip.resume();
  await sleep(200);
  ip.pause();
  await sleep(200);
  ip.resume();
  await sleep(700);
  ip.stop();
  expect(Math.abs(end - start - 1400)).toBeLessThan(99);
});

test("change interval", async () => {
  const start = new Date();
  let markers = [];
  let ip = new TimeoutPlus(() => {
    markers.push(new Date());
  }, 200);
  await sleep(300);
  ip.changeInterval(400);
  await sleep(320);
  ip.stop();
  expect(Math.abs(markers[0] - start - 200)).toBeLessThan(99);
  expect(Math.abs(markers[1] - start - 600)).toBeLessThan(99);
});

test("next interval", async () => {
  const start = new Date();

  let ip = new IntervalPlus(() => {}, 400);
  await sleep(200);
  expect(Math.abs(ip.nextInvocationActiveMs() - 200)).toBeLessThan(99);
  expect(Math.abs(ip.nextInvocationTime() - start - 400)).toBeLessThan(99);
  ip.stop();
  expect(ip.nextInvocationTime()).toBeUndefined();
  expect(ip.nextInvocationActiveMs()).toBeUndefined();

  ip = new TimeoutPlus(() => {}, 100);
  await sleep(50);
  ip.pause();
  expect(ip.nextInvocationTime()).toEqual("paused");
  expect(Math.abs(ip.nextInvocationActiveMs() - 50)).toBeLessThan(49);
  ip.resume();
  await sleep(200);
  expect(ip.nextInvocationTime()).toBeUndefined();
  expect(ip.nextInvocationActiveMs()).toBeUndefined();
  ip.stop();

  ip = new IntervalPlus(
    async () => {
      await sleep(100);
    },
    400,
    {
      immediate: true,
    }
  );
  await sleep(10);
  expect(ip.nextInvocationTime()).toBe("now");
  expect(ip.nextInvocationActiveMs()).toBe("now");
  await ip.stop();
});

test("prev interval", async () => {
  const start = new Date();
  let ip = new IntervalPlus(
    async () => {
      await sleep(100);
    },
    400,
    { immediate: true }
  );
  await sleep(200);
  expect(Math.abs(ip.prevInvocationStartActiveMs() - 200)).toBeLessThan(99);
  expect(Math.abs(ip.prevInvocationEndActiveMs() - 100)).toBeLessThan(99);
  expect(Math.abs(ip.prevInvocationStartTime() - start)).toBeLessThan(99);
  expect(Math.abs(ip.prevInvocationEndTime() - start - 100)).toBeLessThan(99);
  ip.stop();
});

test("prev interval with pauses", async () => {
  const start = new Date();
  let ip = new IntervalPlus(
    async () => {
      await sleep(100);
    },
    400,
    { immediate: true }
  );
  await sleep(200);
  ip.pause();
  await sleep(300);
  ip.resume();
  await sleep(100);
  ip.stop();
  expect(Math.abs(ip.prevInvocationStartActiveMs() - 300)).toBeLessThan(99);
  expect(Math.abs(ip.prevInvocationEndActiveMs() - 200)).toBeLessThan(99);
  expect(Math.abs(ip.prevInvocationStartTime() - start)).toBeLessThan(99);
  expect(Math.abs(ip.prevInvocationEndTime() - start - 100)).toBeLessThan(99);
});

test("has future invocations", async () => {
  let ip = new IntervalPlus(() => {}, 10);
  expect(ip.hasFutureInvocations()).toBeTruthy();
  ip.pause();
  expect(ip.hasFutureInvocations()).toBeTruthy();
  ip.resume();
  expect(ip.hasFutureInvocations()).toBeTruthy();
  ip.stop();
  expect(ip.hasFutureInvocations()).toBeFalsy();

  ip = new TimeoutPlus(() => {}, 10);
  expect(ip.hasFutureInvocations()).toBeTruthy();
  await sleep(50);
  expect(ip.hasFutureInvocations()).toBeFalsy();
  ip.stop();
});

test("fail on non-interval-timeout", () => {
  const BaseClass = Object.getPrototypeOf(IntervalPlus);
  expect(() => {
    new BaseClass(() => {}, 10000, {
      pauseableType: "other",
    });
  }).toThrow('pauseableType must be "interval" or "timeout"');
});

test("skip to next invocation", async () => {
  const start = new Date();
  const checkpoints = [];
  let ip = new IntervalPlus(() => {
    checkpoints.push(new Date());
  }, 200);
  await sleep(300);
  ip.skipToNextInvocation();
  await sleep(300);
  expect(Math.abs(checkpoints[0] - start - 200)).toBeLessThan(99);
  expect(Math.abs(checkpoints[1] - start - 300)).toBeLessThan(99);
  expect(Math.abs(checkpoints[2] - start - 500)).toBeLessThan(99);
  ip.stop();
});

test("pause during invocation", async () => {
  let ip = new IntervalPlus(
    async () => {
      await sleep(200);
    },
    200,
    {
      immediate: true,
    }
  );
  await sleep(50);
  ip.pause();
  await sleep(100);
  expect(ip.paused).toBeFalsy();
  await sleep(70);
  expect(ip.paused).toBeTruthy();
  // ip.resume();
  ip.stop();
});

test("stop during invocation", async () => {
  const ip = new IntervalPlus(async () => {
    await sleep(200);
  }, 200);
  await sleep(250);
  const before = new Date();
  expect(ip.loop).toBeTruthy();
  await ip.stop();
  expect(ip.loop).toBeFalsy();
  expect(new Date() - before).toBeGreaterThan(100);
});

test("idempotent pause and resume and stop", async () => {
  const start = new Date();
  let end;
  let ip = new TimeoutPlus(() => {
    end = new Date();
  }, 1000);
  await sleep(200);
  ip.pause();
  ip.pause();
  ip.pause();
  await sleep(200);
  ip.resume();
  ip.resume();
  ip.resume();
  await sleep(1000);
  ip.stop();
  ip.stop();
  ip.stop();
  expect(Math.abs(end - start - 1200)).toBeLessThan(99);
});

test("no prev invocation", async () => {
  let ip = new IntervalPlus(
    async () => {
      await sleep(200);
    },
    200,
    {
      immediate: true,
    }
  );
  await sleep(10);
  expect(ip.prevInvocationStartTime()).toBeTruthy();
  expect(ip.prevInvocationStartActiveMs()).toBeTruthy();
  expect(ip.prevInvocationEndTime()).toBeFalsy();
  expect(ip.prevInvocationEndActiveMs()).toBeFalsy();
  await sleep(230);
  expect(ip.prevInvocationEndTime()).toBeTruthy();
  expect(ip.prevInvocationEndActiveMs()).toBeTruthy();
  await ip.stop();

  ip = new IntervalPlus(async () => {
    await sleep(200);
  }, 100);
  await sleep(150);
  expect(ip.prevInvocationStartTime()).toBeTruthy();
  expect(ip.prevInvocationStartActiveMs()).toBeTruthy();
  expect(ip.prevInvocationEndTime()).toBeFalsy();
  expect(ip.prevInvocationEndActiveMs()).toBeFalsy();
  await sleep(200);
  expect(ip.prevInvocationEndTime()).toBeTruthy();
  expect(ip.prevInvocationEndActiveMs()).toBeTruthy();
  await ip.stop();
});

// test("no prev invocation", async () => {
//   const ip = new IntervalPlus(
//     async () => {
//       await sleep(200);
//     },
//     200,
//     {
//       immediate: true,
//     }
//   );
//   await sleep(50);
//   // expect(ip.prevInvocationStartTime()).toBeTruthy();
//   // expect(ip.prevInvocationStartActiveMs).toBeTruthy();
//   // expect(ip.prevInvocationEndTime()).toBeFalsy();
//   // expect(ip.prevInvocationEndActiveMs).toBeFalsy();
//   // await sleep(200);
//   // expect(ip.prevInvocationEndTime()).toBeTruthy();
//   // expect(ip.prevInvocationEndActiveMs).toBeTruthy();
//   ip.stop();
// });
