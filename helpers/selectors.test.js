const { scopify } = require("./selectors");

test("scopifies", () => {
  expect(scopify("& .bom & span", ".bim", ".bom", 1).toString()).toBe(
    ":is(.bim) .bom :is(.bim) span:where(:is(:is(.bim) .bom .bim) > span:not(.bom))"
  );
});
test("scopifies2", () => {
  expect(scopify("& .bom :scope span", ".bim", ".bom", 1).toString()).toBe(
    ":is(.bim) .bom :is(:scope,:where(.bim)) span:where(:is(:is(.bim) .bom .bim) > span:not(.bom))"
  );
});
test("scopifies3", () => {
  expect(scopify("span", ".bim", ".bom", 1).toString()).toBe(
    "span:where(:is(.bim) > span:not(.bom))"
  );
});
