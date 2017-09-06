'use strict';

const location = require(`./location`);
const path = require(`path`);
const compilerPath = path.resolve(__dirname, location.location);

const exec = require(`child_process`).exec;
const util = require(`./util`);

module.exports = (options, sources) => {
  sources = util.toSourcesArray(sources);
  options = util.toOptionsArray(options);

  return new Promise((resolve, reject) => {
    const command = `${compilerPath} ${options.concat(sources).join(` `)}`;
    console.log(`Running: ${command}`);
    exec(command, (err, stdout, stderr) => {
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

