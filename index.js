/**
 * @type {import('postcss').PluginCreator}
 */

const { scopify } = require("./helpers/selectors");

module.exports = (opts = { depth: 10 }) => {
  const depth = opts.depth ? opts.depth : 10;

  return {
    postcssPlugin: "postcss-at-scope",

    AtRule: {
      scope: (atRule) => {
        const parsedParams = atRule.params.match(
          /\((.*?)\)(\s*to\s*\((.*?)\))?/i
        );
        const scopeStartSelector = parsedParams[1];
        const scopeEndSelector = parsedParams[3];

        atRule.walkRules((rule) => {
          rule.selector = scopify(
            rule,
            scopeStartSelector,
            scopeEndSelector,
            depth
          );
        });
        atRule.replaceWith(atRule.nodes);
      },
    },
  };
};

module.exports.postcss = true;
