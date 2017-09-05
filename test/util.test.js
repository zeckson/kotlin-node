const assert = require(`assert`);
const util = require(`../lib/util`);
const path = require(`path`);
const toOptions = util.toOptionsArray;
const toSources = util.toSourcesArray;

describe(`File utils`, () => {
  describe(`#toOptionsArray()`, () => {
    it(`empty`, () => {
      assert.deepEqual(toOptions(), []);
    });
    it(`string param`, () => {
      assert.deepEqual(toOptions(`test`), [`test`]);
    });
    it(`array param`, () => {
      assert.deepEqual(toOptions([`test`]), [`test`]);
      assert.deepEqual(toOptions([`test`, `test2`]), [`test`, `test2`]);
    });
    it(`object param regular`, () => {
      assert.deepEqual(toOptions({
        'module-kind': `commonjs`,
        'output': `out/server.js`
      }), [`-module-kind commonjs`, `-output out/server.js`]);
    });
    it(`object param flag`, () => {
      assert.deepEqual(toOptions({
        'module-kind': null,
        'output': void 0,
        'meta-info': true
      }), [`-module-kind`, `-output`, `-meta-info`]);
    });
  });
  describe(`#toSourcesArray()`, () => {
    const resolve = (...paths) => {
      return paths.map((it) => path.resolve(__dirname, it));
    };
    it(`empty`, () => {
      assert.deepEqual(toSources(), []);
    });
    it(`one file`, () => {
      const file = resolve(`./src/test.kt`)[0];
      assert.deepEqual(toSources(file), [file]);
    });
    it(`file array`, () => {
      const files = resolve(`./src/test.kt`, `./src/test2.kt`);
      assert.deepEqual(toSources(files), files);
    });
    it(`file dir`, () => {
      const files = resolve(`./src/com`);
      assert.deepEqual(toSources(files), resolve(`./src/com/github/zeckson/inner.kt`));
    });
  });
});
