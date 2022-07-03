# Interval Plus

Truly pauseable, time-extendable, functionally dynamic intervals and timeouts in a lightweight package

[![CI-CD](https://github.com/blakesanie/interval-plus/actions/workflows/CI-CD.yml/badge.svg)](https://github.com/blakesanie/interval-plus/actions/workflows/CI-CD.yml)
<img src="https://img.shields.io/npm/v/interval-plus" />
<img src="https://img.shields.io/npm/l/interval-plus" />

## Features

1. Pause and Resume
2. Variable time interval
3. Immediate function invocation
4. Function updating
5. Interval progress and status tracking
6. Invocation skipping
7. Asynchronous execution (`async`/`await`)

## Motivation

JavaScript's `setInterval` and `setTimeout` offerings are fundamentally weak due to their inflexibility. To achieve their desired interval behavior, developers often have to re-instantiate intervals, manage or track interval instances, or implement other workaround solutions. I first developed this package to support the features above necessary in my personal projects, then decided to open source the package.

## Getting Started

### Install and Import

#### Node.js

```sh
npm i interval-plus
```

```js
const { IntervalPlus, TimeoutPlus } = require("interval-plus")

// or

import {IntervalPlus, TimeoutPlus} from "interval-plus"
```

#### Browser

```html
<script src="https://cdn.jsdelivr.net/npm/interval-plus@latest/src/index.js"></script>
```

## Usage

### Instantiation


```js
const interval = new IntervalPlus(func, ms, options)
const timeout = new TimeoutPlus(func, ms, options)
```

#### Constructor Parameters:

1. func: _function_, **required**
    *  a function to be invoked. Pass an `async` function to ensure asynchronous execution
2. ms: _number_, **required**
    * how many milliseconds to observe before re-invoking `func`

3. options: _Object_ (optional)
    * name: _String_ (optional), default `"IntervalPlus"`
      * An identifier to represent the IntervalPlus or TimeoutPlus object logs.
    * verbose: boolean (optional), default `false`
      * Whether or not to output logs to the console during key interval events
    * immediate: boolean (optional), default `false
      * Whether or not to immediately invoke `func` once instantiated

### Instantiation Examples

```js
const interval = new IntervalPlus(() => {
    console.log("it's been 1 second!")
}), 1000)

const timeout = new TimeoutPlus(() => {
    console.log("Execute once after 2 seconds")
}), 2000, {
    name: "myFirstTimeout",
    verbose: true
})

const immediateInterval = new IntervalPlus(() => {
    console.log("Execute now, then every 3 seconds")
}), 3000, {
    immediate: true
})
```

## Operations

#### pause()

```js
await interval.pause()
```

Allow the interval to sleep, freezing the amount of active time to elapse before next invocation.

This operation is idempotent - calling it multiple times sequentially is a the same as a single call.

If called during invocation, this operation will apply as soon as invocation terminates.

#### resume()

```js
interval.resume()
```

Wake the interval from its sleep, counting down the remaining active time until next invocation.

This operation is idempotent - calling it multiple times sequentially is a the same as a single call.

#### stop()

```js
await interval.stop()
```

Terminate the interval and its future invocation schedule.

Under the hood, this method calls `clearInterval` to ensure no ongoing asynchronous processes remain.

This operation is idempotent - calling it multiple times sequentially is a the same as a single call.

If called during invocation, this operation will apply as soon as invocation terminates.

#### changeInterval(ms)

```js
await changeInterval(2500)
```

##### Function Parameters

1. ms: _number_, **required**

Adjust the interval's millisecond wait between invocations to equal ms.

If called during invocation, this operation will apply as soon as invocation terminates.

#### nextIterationTime()

Obtain a Date object corresponding to the next invocation, assuming no pausing.

Returns `"now"` if currently executing.
Returns `"paused"` if paused.

#### nextIterationActiveMs()

Get the number of active milliseconds until next invocation. Active means time passing while in a non-paused state.

Returns `"now"` if currently executing.
Returns `"paused"` if paused.

#### prevIterationStartTime()

Obtain a Date object corresponding to the start of the previous invocation.

Returns `undefined` if no previous invocation.

#### prevIterationEndTime()

Obtain a Date object corresponding to the end of the previous invocation.

Returns `undefined` if no previous invocation end.

#### prevIterationStartActiveMs()

Get the number of active milliseconds since the previous invocation start. Active means time passed while in a non-paused state.

Returns `undefined` if no previous invocation.

#### prevIterationEndActiveMs()

Get the number of active milliseconds since the previous invocation end. Active means time passed while in a non-paused state.

Returns `undefined` if no previous invocation end.

#### skipToNextIteration()

Immediately skip forward to the next invocation, respecting a constant time interval afterwards.

#### hasFutureIterations()

Returns a boolean describing whether or not future invocations will be made. For instance, this function returns `false` once `stop()` has been called.