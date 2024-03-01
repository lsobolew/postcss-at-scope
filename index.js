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

function prepareLeafSelector(selector, scopeEndSelector) {
  const firstDescendantOrChildSelector = new RegExp(
    "(?<=[^~>+])\\s+(?=[^~>+])|(?<=[^~>+])>(?=[^~>+])"
  );
  const match = selector.match(firstDescendantOrChildSelector);

  if (match === null) {
    return `${selector}:not(${scopeEndSelector})`;
  }

  const ancestorSelector = selector.slice(0, match.index);
  const descendantOrChildSelector = selector.slice(match.index);

  return `${ancestorSelector}:not(${scopeEndSelector})${descendantOrChildSelector}`;
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
      const preparedLeafSelector = prepareLeafSelector(
        rule.selector,
        scopeEndSelector
      );
      return `${scopeStartSelector} ${childCombinatorSelector} > ${preparedLeafSelector}`;
    }
  );

  rule.selector = `${rule.selector}:where(${subSelectors.join(",")})`;
}

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
