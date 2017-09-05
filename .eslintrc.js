module.exports = {
  ecmaVersion: 6,
  env: {
    es6: true,
    node: true,
    commonjs: true,
    mocha: true
  },
  extends: 'htmlacademy/es6',
  rules: {
    'no-console': 'off',
    'indent': ['error', 2, {
      SwitchCase: 1,
      // continuation indent
      VariableDeclarator: 1, // indent is multiplier * indent = 1 * 2
      MemberExpression: 2,   // indent is multiplier * indent = 1 * 2
      FunctionDeclaration: {parameters: 2},
      FunctionExpression: {parameters: 2},
      CallExpression: {arguments: 2}
    }],
  }
};