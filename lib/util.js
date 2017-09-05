const path = require(`path`);
const klawSync = require(`klaw-sync`);
const statSync = require(`fs`).statSync;

const acceptOnlyKt = (item) => path.extname(item.path) === `.kt`;

module.exports = {
  toOptionsArray(options = []) {
    if (typeof options === `string`) {
      // wrap with array
      options = [options];
    }

    if (typeof options !== `object`) {
      throw new Error(`Invalid params passed. Expected JSON or array, but was ${typeof options}`);
    }

    if (!Array.isArray(options)) {
      const args = [];
      // convert object to array
      for (const key of Object.keys(options)) {
        let value = options[key];
        if (Array.isArray(value)) {
          value = value.join(` `);
        } else if (value === true) {
          value = void 0;
        }
        if (value === void 0 || value === null) {
          args.push(`-${key}`);
        } else {
          args.push(`-${key} ${value}`);
        }
      }
      options = args;
    }

    return options;
  },
  toSourcesArray(sources) {
    if (!sources) {
      throw new Error(`Source files/dir wasn't passed`);
    }

    if (typeof sources === `string`) {
      sources = [sources];
    }

    let filteredSources = [];
    for (const source of sources) {
      const fileStat = statSync(source);
      if (fileStat.isDirectory()) {
        const paths = klawSync(source, {filter: acceptOnlyKt});
        filteredSources = filteredSources.concat(paths.map((it) => it.path));
      } else {
        filteredSources.push(source);
      }
    }

    return filteredSources;
  }
};
