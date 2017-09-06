#!/usr/bin/env node

'use strict';

const cli = require(`../lib/cli`);
const resolve = require(`path`).resolve;
const existsSync = require(`fs`).existsSync;

const showHelp = () => cli(`-help`).then(console.log).catch(console.error);

const proxyArgs = process.argv.slice(2);

if (proxyArgs.length === 0) {
  showHelp();
} else {
  const sources = [];
  for (let i = proxyArgs.length; i--;) {
    const path = proxyArgs[i];
    const resolved = resolve(process.cwd(), path);
    if (existsSync(resolved)) {
      sources.push(path);
    } else {
      break;
    }
  }
  cli(proxyArgs, sources.reverse()).then(console.log).catch((e) => {
    console.error(e);
    // eslint-disable-next-line
    process.exit(1);
  });
}
