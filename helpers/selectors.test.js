const { scopify } = require("./selectors");

test("scopifies", () => {
  expect(scopify("p", ".start1, .start2", ".end1, .end2", 3).toString()).toBe(
    "p:where(:where(.start1, .start2) > p:not(.end1):not(.end2)),p:where(:where(.start1, .start2) > *:not(.end1):not(.end2) > p:not(.end1):not(.end2)),p:where(:where(.start1, .start2) > *:not(.end1):not(.end2) > *:not(.end1):not(.end2) > p:not(.end1):not(.end2))"
  );
});
