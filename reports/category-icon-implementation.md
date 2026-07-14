# Category Icon Implementation

## Canonical registry

`src/lib/category-icons.js` owns every category icon preset, display label, custom SVG sanitizer, browser SVG parser, and SVG markup renderer.

## Presets

The owner interface now exposes more than twenty consistent outline icons for cashback, deals, retail, gaming, food, delivery, subscriptions, payments, web methods, and related categories.

## Custom icons

Custom SVG uploads are converted to a constrained definition:

```json
{
  "viewBox": "0 0 24 24",
  "paths": ["M4 12h16"]
}
```

Only validated path data is persisted. Scripts, event handlers, embedded images, styles, foreign objects, transforms, and arbitrary raw SVG markup are not stored.

## Sizing

Preset and custom SVGs use `preserveAspectRatio="xMidYMid meet"` and fixed square CSS slots. The original viewBox is preserved so uploads remain centered and proportional without changing surrounding layout.

## Surfaces

The same category icon metadata is used by:

- Categories panel
- New Method category creator
- Owner category preview
- New Method category picker
- Homepage category strip
- Guide cards
- Desktop navigation
- Mobile navigation
- Guide pages
