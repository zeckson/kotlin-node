const assert = require(`assert`);
const toOptions = require(`../lib/util`).toOptionsArray;

describe(`File utils`, () => {
  describe(`#toOptionsArray()`, function () {
    it(`empty`, function () {
      assert.deepEqual(toOptions(), []);
    });
    it(`string param`, function () {
      assert.deepEqual(toOptions(`test`), [`test`]);
    });
    it(`array param`, function () {
      assert.deepEqual(toOptions([`test`]), [`test`]);
      assert.deepEqual(toOptions([`test`, `test2`]), [`test`, `test2`]);
    });
    it(`object param regular`, function () {
      assert.deepEqual(toOptions({
        'module-kind': `commonjs`,
        'output': `out/server.js`
      }), [`-module-kind commonjs`, `-output out/server.js`]);
    });
    it(`object param flag`, function () {
      assert.deepEqual(toOptions({
        'module-kind': null,
        'output': void 0,
        'meta-info': true
      }), [`-module-kind`, `-output`, `-meta-info`]);
    });
  });
});
