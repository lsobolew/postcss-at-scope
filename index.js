/**
 * @type {import('postcss').PluginCreator}
 */

function combinations(n, length) {
  if (length === 1) {
    return Array.from({ length: n }, (_v, i) => [i]);
  }
  return Array.from({ length: n }, (_v, i) =>
    combinations(n - i, length - 1).map((el) => [i, ...el])
  ).flat();
}

function scopify(rule, scopeStartSelector, scopeEndSelector, depth) {
  const descendantCombinatorRegExp = new RegExp(
    "(?<=[^~>+])\\s+(?=[^~>+])",
    "g"
  );
  const childCombinatorRegExp = new RegExp("(?<=[^~>+])>(?=[^~>+])", "g");
  const adjacentSiblingCombinatorRegExp = new RegExp(
    "(?<=[^~>+])\\+(?=[^~>+])",
    "g"
  );
  const generalSiblingCombinatorRegExp = new RegExp(
    "(?<=[^~>+])~(?=[^~>+])",
    "g"
  );
  if (!scopeStartSelector) {
    return;
  }
  if (!scopeEndSelector) {
    rule.selector = `${rule.selector}:where(${scopeStartSelector} ${rule.selector})`;
    return;
  }

  const descendantGroups = rule.selector
    .split(descendantCombinatorRegExp)
    .map((subSelector) => {
      const arr = subSelector
        .split(childCombinatorRegExp)
        .map((subSubSelector) =>
          subSubSelector
            .split(adjacentSiblingCombinatorRegExp)
            .map((subSubSubSelector) => {
              const arr = subSubSubSelector
                .split(generalSiblingCombinatorRegExp)
                .map((atomSelector) => atomSelector.trim());
              return arr;
            })
        );
      return arr
        .map((sel) => {
          let lastElement = sel[sel.length - 1][sel[sel.length - 1].length - 1];
          sel[sel.length - 1][
            sel[sel.length - 1].length - 1
          ] = `${lastElement}:not(${scopeEndSelector})`;

          return sel.map((s) => s.join(" ~ "));
        })
        .map((s) => s.join(" + "));
    })
    .map((s) => s.join(" > "));

  const selectorWithScope = [
    `:where(${scopeStartSelector})`,
    ...descendantGroups,
  ];
  selectorWithScope.length;

  const comb = combinations(depth, selectorWithScope.length - 1);

  const scopedSelectors = comb.map((c) => {
    let bucket = "";
    selectorWithScope.forEach((subSelector, i) => {
      if (i === selectorWithScope.length - 1) {
        bucket += subSelector;
      } else {
        bucket += `${subSelector} > ${`:not(${scopeEndSelector}) > `.repeat(
          c[i]
        )}`;
      }
    });
    return bucket;
  });

  rule.selector = `${rule.selector}:where(${scopedSelectors.join(",")})`;
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
          scopify(rule, scopeStartSelector, scopeEndSelector, depth);
        });
        atRule.replaceWith(atRule.nodes);
      },
    },
  };
};

module.exports.postcss = true;
