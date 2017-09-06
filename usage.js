'use strict';

const kotlinc = require(`kotlin-node`);

// Array params example
kotlinc([
  `-module-kind commonjs`,
  `-output out/server.js`,
  `-meta-info`
], [`src/**/*.kt`, `src/*.kt`]).catch(console.error);

// Object params example
kotlinc({
  'module-kind': `commonjs`,
  'output': `out/server.js`,
  'meta-info': true
}, [`src/**/*.kt`, `src/*.kt`]).catch(console.error);
