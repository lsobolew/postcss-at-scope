import { test, expect } from "@playwright/test";
import postcss from "postcss";
import postcssScope from "../index.js";

async function polyfillStylesAndGetScreenshots(
  page,
  screenRootSelector,
  options = { depth: 10 }
) {
  const styles = await page.locator("style");
  const originalCss = await styles.textContent();

  const result = await postcss([postcssScope(options)]).process(originalCss, {
    from: undefined,
  });

  const nativeScopeStyleBuffer = await page
    .locator(screenRootSelector)
    .screenshot();
  // console.log(result.css);
  await styles.evaluate((el, css) => {
    el.innerHTML = css;
  }, result.css);

  const polyfilledScopeStyleBuffer = await page
    .locator(screenRootSelector)
    .screenshot();

  return [
    nativeScopeStyleBuffer.toString("base64"),
    polyfilledScopeStyleBuffer.toString("base64"),
  ];
}

async function prepareTest(page, testInfo, filename, options = { depth: 10 }) {
  await page.goto(`http://127.0.0.1:3333/tests/${filename}`);
  const nativeScopeScreenshot = await page.screenshot();
  await testInfo.attach("native @scope", {
    body: nativeScopeScreenshot,
    contentType: "image/png",
  });

  const [a, b] = await polyfillStylesAndGetScreenshots(page, "body", options);
  const polyfilledScopeScreenshot = await page.screenshot();
  await testInfo.attach("polyfilled @scope", {
    body: polyfilledScopeScreenshot,
    contentType: "image/png",
  });

  expect(a).toEqual(b);
}

test.use({
  viewport: { width: 400, height: 400 },
});

test("test 1 ", async ({ page }, testInfo) => {
  await prepareTest(page, testInfo, "test1.html");
});
test("test 2", async ({ page }, testInfo) => {
  await prepareTest(page, testInfo, "test2.html");
});
test("test 3", async ({ page }, testInfo) => {
  await prepareTest(page, testInfo, "test3.html");
});
test("test 4", async ({ page }, testInfo) => {
  await prepareTest(page, testInfo, "test4.html");
});
test("test 5", async ({ page }, testInfo) => {
  await prepareTest(page, testInfo, "test5.html");
});
test("test 6", async ({ page }, testInfo) => {
  await prepareTest(page, testInfo, "test6.html");
});
test("test 7", async ({ page }, testInfo) => {
  await prepareTest(page, testInfo, "test7.html");
});
