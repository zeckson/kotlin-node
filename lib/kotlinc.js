const location = require(`./location`);
const path = require(`path`);
const compilerPath = path.resolve(__dirname, location.location);

const exec = require('child_process').exec;

module.exports = (params = []) => new Promise((resolve, reject) => {
  exec(`${compilerPath} ${params.join(` `)}`, (err, stdout, stderr) => {
    if (err) {
      console.error(stderr);
      reject(err);
      return;
    }
    console.log(stdout);
    resolve();
  });
});