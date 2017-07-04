#!/usr/bin/env node

'use strict';

const cli = require(`../lib/cli`);
const showHelp = () => cli(`-help`).then(console.log).catch(console.error);

const proxyArgs = process.argv.slice(2);

if (proxyArgs.length === 0) {
  showHelp();
} else {
  cli(proxyArgs).then(console.log).catch(console.error);
}
