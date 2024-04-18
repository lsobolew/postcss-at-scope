const parser = require("postcss-selector-parser");

function combinations(n, length) {
  if (length === 0) {
    return [];
  }
  if (length === 1) {
    return Array.from({ length: Math.max(n, 1) }, (_v, i) => [i]);
  }

  return Array.from({ length: n }, (_v, i) =>
    combinations(n - i, length - 1).map((el) => [i, ...el])
  )
    .flat()
    .sort((a, b) => (a[0] + a[1] < b[0] + b[1] ? -1 : 1));
}

function getMaxNDepthSelector(depth, middleSelector) {
  let partial = middleSelector;
  if (!partial) {
    partial = parser.universal();
  }

  if (depth <= 1) {
    return partial;
  }

  const innerSelector = parser.selector();
  innerSelector.append(partial);
  for (let d = 1; d < depth; d++) {
    innerSelector.append(parser.combinator({ value: " > " }));
    innerSelector.append(partial);
  }
  return innerSelector;
}

function getSelectorMatchingElementMinDepth(selector) {
  let depth = 0;
  selector.walkCombinators((combinator) => {
    if ([" ", ">"].includes(combinator.value)) {
      depth++;
    }
  });
  return depth;
}

function replaceDescendantCombinatorsWithChildCombinators(selector, depth) {
  const transformRoot = (root) => {
    const newRoot = parser.root();

    root.each((selector) => {
      const numberOfChildCombinators = selector.reduce(
        (accumulator, node) =>
          accumulator +
          (node.type === "combinator" && node.value === " " ? 1 : 0),
        0
      );
      const selectorMatchingElementMinDepth =
        getSelectorMatchingElementMinDepth(selector);

      const combinationsArray = combinations(
        Math.max(depth - selectorMatchingElementMinDepth + 1, 1),
        numberOfChildCombinators
      );

      combinationsArray.forEach((c) => {
        const selectorClone = selector.clone();
        const d = selectorClone.filter(
          (node) => node.type === "combinator" && node.value === " "
        );
        c.forEach((el, index) => {
          if (el === 0) {
            d[index].replaceWith(parser.combinator({ value: " > " }));
          } else {
            const maxNDepthSelector = getMaxNDepthSelector(el);
            const replacement = parser.selector();
            replacement.append(parser.combinator({ value: " > " }));
            replacement.append(maxNDepthSelector);
            replacement.append(parser.combinator({ value: " > " }));
            d[index].replaceWith(replacement);
          }
        });
        newRoot.append(selectorClone);
      });
    });

    return newRoot;
  };

  const processor = parser(transformRoot);
  const result = processor.transformSync(selector);
  return result;
}

function encapsulateScopeRoot(selector) {
  const transformRoot = (root) => {
    const newRoot = parser.root();

    root.each((selector) => {
      const newSelector = parser.selector();
      const innerSelector = parser.selector();
      let beforeScope = true;
      const wrapper = parser.pseudo({ value: `:is` });
      selector.each((node, index) => {
        if (beforeScope === true) {
          innerSelector.append(node.clone());
          if (node.value === ":scope") {
            wrapper.append(innerSelector);
            newSelector.prepend(wrapper);
            beforeScope = false;
          }
        } else {
          newSelector.append(node);
        }
      });

      newRoot.append(newSelector);
    });

    return newRoot;
  };

  const processor = parser(transformRoot);
  const result = processor.transformSync(selector);
  return result;
}

function limitEveryDescendantWithScopeEndSelector(selector, selectorEnd) {
  const transformRoot = (root) => {
    const newRoot = parser.root();

    let limitSelector;
    const parsedScopeStartSelector = parser().astSync(selectorEnd);
    if (parsedScopeStartSelector.nodes.length === 1) {
      limitSelector = parser.pseudo({ value: `:not(${selectorEnd})` });
    } else {
      limitSelector = parser.pseudo({
        value: parsedScopeStartSelector
          .map((node) => `:not(${node.toString().trim()})`)
          .join(""),
      });
    }

    root.each((selector) => {
      const selectorClone = selector.clone();
      const list = selectorClone.split((selector) => {
        return selector.type === "combinator";
      });
      const listToBeLimited = list.filter((elem, i) => {
        if (i === 0) {
          return false;
        }
        if (i === list.length - 1) {
          return true;
        }
        if (elem[elem.length - 1].value === ">") {
          return true;
        }
        return false;
      });

      listToBeLimited.forEach((element) => {
        const universal = element.find((e) => {
          return e.type === "universal";
        });
        const tag = element.find((e) => {
          return e.type === "tag";
        });
        const pseudo = element.find((e) => {
          return e.type === "pseudo";
        });
        if (universal !== undefined) {
          universal.parent.insertAfter(universal, limitSelector);
        } else if (tag !== undefined) {
          tag.parent.insertAfter(tag, limitSelector);
        } else if (pseudo !== undefined) {
          pseudo.parent.insertBefore(pseudo, limitSelector);
        }
      });

      newRoot.append(selectorClone);
    });
    return newRoot;
  };

  const processor = parser(transformRoot);

  const result = processor.transformSync(selector);

  return result;
}

function prefixSelectorWithScopePseudoClass(selector) {
  const scopePseudoClass = parser().astSync(":scope");
  const transformRoot = (root) => {
    const newRoot = parser.root();
    root.each((selector) => {
      const selectorClone = selector.clone();

      let scopeRootCandidate;
      selectorClone.walkNesting((node) => {
        scopeRootCandidate = node;
      });
      selectorClone.walkPseudos((node) => {
        if (node.value === ":scope") {
          scopeRootCandidate = node;
        }
      });
      if (scopeRootCandidate?.value === "&") {
        scopeRootCandidate.replaceWith(scopePseudoClass);
      }

      if (!scopeRootCandidate) {
        selectorClone.prepend(parser.combinator({ value: " " }));
        selectorClone.prepend(scopePseudoClass);
      }
      newRoot.append(selectorClone);
    });
    return newRoot;
  };

  const processor = parser(transformRoot);

  const result = processor.transformSync(selector);

  return result;
}

function replaceScopePsudoClassWithSelector(selector, scopeStartSelector) {
  const transformRoot = (root) => {
    const newRoot = parser.root();
    root.each((selector) => {
      const selectorClone = selector.clone();
      selectorClone.walkPseudos((pseudo) => {
        if (pseudo.value === ":scope") {
          const parsedScopeStartSelector = parser().astSync(scopeStartSelector);
          if (parsedScopeStartSelector.nodes.length === 1) {
            pseudo.replaceWith(parser().astSync(scopeStartSelector));
          } else {
            pseudo.replaceWith(
              parser.pseudo({ value: `:where(${scopeStartSelector})` })
            );
          }
        }
      });
      newRoot.append(selectorClone);
    });
    return newRoot;
  };

  const processor = parser(transformRoot);

  const result = processor.transformSync(selector);

  return result;
}

function restoreSelectorSpecificity(modifiedSelector, originalSelector) {
  const transformRoot = (root) => {
    const newRoot = parser.root();
    root.each((selector) => {
      const newSelector = parser.selector();
      newSelector.append(parser().astSync(originalSelector));
      if (selector.nodes.length > 0) {
        newSelector.append(parser.pseudo({ value: `:where(${selector})` }));
      }
      newRoot.append(newSelector);
    });
    return newRoot;
  };

  const processor = parser(transformRoot);
  const result = processor.transformSync(modifiedSelector);

  return result;
}

function replaceNestingWithSelector(selector, scopeStartSelector) {
  const transformRoot = (root) => {
    const newRoot = parser.root();
    root.each((selector) => {
      const selectorClone = selector.clone();
      const wrapper = parser.pseudo({ value: `:is` });
      wrapper.append(parser().astSync(scopeStartSelector));
      selectorClone.walkNesting((node) => {
        node.replaceWith(wrapper);
      });

      newRoot.append(selectorClone);
    });
    return newRoot;
  };

  const processor = parser(transformRoot);

  const result = processor.transformSync(selector);

  return result;
}

function replaceScopePseudoClassWithSelector(selector, scopeStartSelector) {
  const transformRoot = (root) => {
    const newRoot = parser.root();
    root.each((selector) => {
      const selectorClone = selector.clone();
      const wrapper = parser.pseudo({ value: `:is` });
      wrapper.append(parser.pseudo({ value: ":scope" }));
      wrapper.append(parser().astSync(`:where(${scopeStartSelector})`));

      selectorClone.walkPseudos((node) => {
        if (node.value === ":scope") {
          node.replaceWith(wrapper);
        }
      });

      newRoot.append(selectorClone);
    });
    return newRoot;
  };

  const processor = parser(transformRoot);

  const result = processor.transformSync(selector);

  return result;
}

function scopify(selector, scopeStartSelector, scopeEndSelector, depth) {
  const selectorPrefixedWithScopeSelector =
    prefixSelectorWithScopePseudoClass(selector);

  const selectorWithEncapsulatedScopeRoot = encapsulateScopeRoot(
    selectorPrefixedWithScopeSelector.toString()
  );
  // console.log(selectorWithEncapsulatedScopeRoot.toString());
  const selectorWithoutDescendantCombinators =
    replaceDescendantCombinatorsWithChildCombinators(
      selectorWithEncapsulatedScopeRoot.toString(),
      depth
    );
  // console.log(selectorWithoutDescendantCombinators.toString());
  const selectorWithLimitedDescandants = scopeEndSelector
    ? limitEveryDescendantWithScopeEndSelector(
        selectorWithoutDescendantCombinators.toString(),
        scopeEndSelector
      )
    : selectorWithoutDescendantCombinators;
  // console.log(selectorWithLimitedDescandants.toString());
  const selectorWithScopePseudoClassReplaced =
    replaceScopePsudoClassWithSelector(
      selectorWithLimitedDescandants.toString(),
      scopeStartSelector
    );
  // console.log(selectorWithScopePseudoClassReplaced.toString());
  const selectorWithRestoredSpecificity = restoreSelectorSpecificity(
    selectorWithScopePseudoClassReplaced.toString(),
    selector
  );
  // console.log(selectorWithRestoredSpecificity.toString());
  const selectorWithScopeStartSelectorInsteadOfNestingSelectors =
    replaceNestingWithSelector(
      selectorWithRestoredSpecificity.toString(),
      scopeStartSelector
    );
  // console.log(
  //   selectorWithScopeStartSelectorInsteadOfNestingSelectors.toString()
  // );
  const selectorWithScopeStartSelectorInsteadOfScopePseudoClass =
    replaceScopePseudoClassWithSelector(
      selectorWithScopeStartSelectorInsteadOfNestingSelectors.toString(),
      scopeStartSelector
    );

  // console.log(
  //   selectorWithScopeStartSelectorInsteadOfScopePseudoClass.toString()
  // );

  return selectorWithScopeStartSelectorInsteadOfScopePseudoClass;
}

module.exports = {
  scopify,
};
