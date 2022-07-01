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
  expect(Math.abs(end - start - 1000)).toBeLessThan(25);
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
