'use strict';

const kotlinc = require(`kotlin-node`);

kotlinc([
  `-module-kind commonjs`,
  `-output out/server.js`,
  `-meta-info src/**/*.kt src/*.kt`
]).catch(console.error);
