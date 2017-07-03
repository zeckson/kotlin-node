# kotlin-node
Kotlin Node.JS compiler installer and wrapper

It downloads and installs kotlinc-js compiler for [Кotlin](http://kotlinlang.org/) language

### Installation:
```sh
npm i kotlin-node -DE
```

### Usage:
```js
const kotlinc = require(`kotlin-node`);

kotlinc([
  `-module-kind commonjs`,
  `-output out/server.js`,
  `-meta-info src/**/*.kt src/*.kt`]
).catch(console.error);
```
