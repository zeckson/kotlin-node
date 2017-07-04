'use strict';

const location = require(`./location`);
const path = require(`path`);
const compilerPath = path.resolve(__dirname, location.location);

const exec = require(`child_process`).exec;

module.exports = (params = []) => {
  if (typeof params === `string`) {
    // wrap with array
    params = [params];
  }

  if (typeof params !== `object`) {
    throw new Error(`Invalid params passed. Expected JSON or array, but was ${typeof params}`);
  }

  if (!Array.isArray(params)) {
    const args = [];
    // convert object to array
    for (const key of Object.keys(params)) {
      let value = params[key];
      if (Array.isArray(value)) {
        value = value.join(` `);
      }
      args.push(`-${key} ${value}`);
    }
    params = args;
  }

  return new Promise((resolve, reject) => {
    exec(`${compilerPath} ${params.join(` `)}`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else if (stderr) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
};

