# PostCSS @scope polyfill

PostCSS plugin to partially polyfill experimental `@scope` at-rule.

## The idea

If we consider limited depth of DOM tree then we can polyfill some parts of [styles scoping specification](https://drafts.csswg.org/css-cascade-6/#scoped-styles). For example this selector in scoping rule

```css
@scope (.scoping-root) to (.scoping-limit) {
  a {
    color: rebeccapurple;
  }
}
```

can be rewritten to list of selectors

```css
.scoping-root > a:not(.scoping-limit),
.scoping-root > :not(.scoping-limit) > a:not(.scoping-limit),
.scoping-root
  > :not(.scoping-limit)
  > :not(.scoping-limit)
  > a:not(.scoping-limit) {
  color: rebeccapurple;
}
```

And to preserve original specificity of selector we cen wrap it in `:where()` pseudo class:

```css
a:where(
    .scoping-root > a:not(.scoping-limit),
    .scoping-root > :not(.scoping-limit) > a:not(.scoping-limit),
    .scoping-root
      > :not(.scoping-limit)
      > :not(.scoping-limit)
      > a:not(.scoping-limit)
  ) {
  color: rebeccapurple;
}
```

## Limitations

### DOM depth

Main limitation of this polyfill is that it will not work for unlimited depth of DOM tree (or to be more specific the distance from scoping root to matched element). For example above result will look like this:

```html
<div class="scoping-root">
  <a>in the scope</a>
  <a class="scoping-limit">not in the scope</a>
  <div>
    <div>
      <div>
        <a>in the scope but not matched because of depth limitation</a>
      </div>
    </div>
  </div>
</div>
```

This should't be a major problem for application based on components. Usually we would limit scoping so that it wouldn't match html elements inside inner components. For example

```jsx
function SomeComponent(props) {
  return (
    <div className="scoping-root">
      <a href="#">in the scope</a>
      <div className="scoping-limit">
        <SomeOtherComponent />
      </div>
    </div>
  );
}
```

### Scope proximity

[Scope Proximity](https://drafts.csswg.org/css-cascade-6/#cascade-proximity) could probably be polyfilled using [Style Queries](https://developer.chrome.com/docs/css-ui/style-queries). The problem is that [browser support for style queries](https://caniuse.com/css-container-queries-style) is even more limited the [support for native scoping](https://caniuse.com/css-cascade-scope) so for now this is not supported by this plugin.

## Performance

### Size of output CSS

Size of output css can grow really high with increasing value of `depth` option so this should be taken into consideration. On the other hand beacause of repetitiveness in the output code it compresses extremely well. Here are some examples for .css file conting simple example from this README:

```css
@scope (.scoping-root) to (.scoping-limit) {
  a {
    color: rebeccapurple;
  }
}
```

![Impact of depth option on size of output file and level of compression](/README/compression.png)

_Note: This requires more "real life" examples to test_

### Style calculation

Using this polyfill instead of native scoping can increase style recalculation time. This may differ between browser. Polyfilled code extensively uses child combinator (`>`) and this should help browsers to "fast reject" during element matching but nevertheless this problem requires more testing and deep diving into it.

## PostCSS Options

```js
module.exports = {
  plugins: [
    require("postcss-at-scope")({
      /* options */
    }),
  ],
};
```

- `depth` number: maximum DOM tree depth to support scoping.
  Default value: `10`.
