/**
 * @type {import('postcss').PluginCreator}
 */

function generateChildCombinatorSelectorArray(scopeEndSelector, depth) {
  const arr = [];
  for (let i = 0; i < depth; i++) {
    arr.push(` > :not(${scopeEndSelector})`.repeat(i));
  }
  return arr;
}

function scopify(rule, scopeStartSelector, scopeEndSelector, depth) {
  if (!scopeStartSelector) {
    return;
  }
  if (!scopeEndSelector) {
    rule.selector = `${rule.selector}:where(${scopeStartSelector} ${rule.selector})`;
    return;
  }

  const childCombinatorSelectorArray = generateChildCombinatorSelectorArray(
    scopeEndSelector,
    depth
  );

  const subSelectors = childCombinatorSelectorArray.map(
    (childCombinatorSelector) => {
      return `${scopeStartSelector} ${childCombinatorSelector} > ${rule.selector}:not(${scopeEndSelector})`;
    }
  );

  rule.selector = `${rule.selector}:where(${subSelectors.join(",")})`;
}

module.exports = ({ depth = 10 }) => {
  return {
    postcssPlugin: "postcss-scope",

    AtRule: {
      scope: (atRule) => {
        const parsedParams = atRule.params.match(
          /\((.*?)\)(\s*to\s*\((.*?)\))?/i
        );
        const scopeStartSelector = parsedParams[1];
        const scopeEndSelector = parsedParams[3];

        atRule.walkRules((rule) => {
          scopify(
            rule,
            `:where(${scopeStartSelector})`,
            `:where(${scopeEndSelector})`,
            depth
          );
        });
        atRule.replaceWith(atRule.nodes);
      },
    },
  };
};

module.exports.postcss = true;
