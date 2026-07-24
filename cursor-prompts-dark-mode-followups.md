# Dark-mode follow-ups — 3 prompts missed from the Fable session

These are the three changes that were stashed (`git stash show stash@{0}`) but never committed after `3b78716 redesign: dark mode via theme token overrides, follows system appearance`.

---

## Prompt A — Prevent light FOUC on dark-mode launch

### Context
`main.tsx` adds `.dark` to `<html>` by listening to `prefers-color-scheme`, but the CSS and JS modules load *after* the browser paints the HTML. On a dark-mode device you see a white flash before React boots. The fix is a tiny synchronous script in `index.html` that runs before any stylesheet or module, so the class is present on first paint.

### Preconditions
- Branch: `redesign/03b-summary-restyle` (or wherever HEAD is). Clean tree.
- File (verified): `index.html`.

### Changes
In `index.html`, immediately after the `<title>` tag and before `</head>`, add:

```html
<script>
  // Apply scheme before CSS/JS modules paint to avoid a light FOUC.
  (function () {
    try {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    } catch (_) {}
  })();
</script>
```

Do not touch the `main.tsx` listener — it still handles *changes* after boot and sets the status-bar style on native.

### Verify
`npm run build`. Open the built `dist/index.html` — the `<script>` should appear inline before any `<script type="module">`. On device/simulator in dark mode, confirm no white flash on launch.

### Commit
```
git add index.html
git commit -m "fix: inline dark-class script to prevent light FOUC on launch"
```

---

## Prompt B — Fix dark-mode heatmap, chart contrast, and color-scheme declarations

### Context
Three CSS issues in the `.dark` block of `src/index.css`:

1. **Heatmap stops are wrong.** The current values go light → dark (`#2a1f26` → `#9a5a78`) — they need to be monotonically ordered for the dark surface so higher severity is *lighter*, not darker-into-background. Replace with a corrected set.
2. **Chart observation and conventional-band colors** are too dark to read on the plum surface. Lift them.
3. **`color-scheme` property is missing.** Without it, browser-native controls (scrollbars, form inputs, date pickers) stay light-themed even when the app is dark. Add `color-scheme: dark` inside `.dark` and `color-scheme: light` inside the base `html` rule.

### Preconditions
- File (verified): `src/index.css`.
- Current `.dark` heatmap block starts at the comment `/* Heatmap: same light→dark direction; pale floor above sand; empty distinct */` (around line 139).

### Changes

**1. Heatmap** — replace the heatmap comment and all six `--color-heat-*` values inside `.dark`:

```css
  /* Heatmap: light→dark rose on dark surface (monotonic); empty distinct from sand */
  --color-heat-0: #6e5a66;
  --color-heat-1: #5c4a56;
  --color-heat-2: #4a3a46;
  --color-heat-3: #3c2e38;
  --color-heat-4: #2e222a;
  --color-heat-empty: #241c22;
```

**2. Chart contrast** — in the `.dark` charts block, change these two values:

```
  --color-chart-observation: #6b4558;   →   --color-chart-observation: #c098ac;
  --color-chart-band-conventional: #57404c;   →   --color-chart-band-conventional: #8a6478;
```

**3. color-scheme declarations** — at the end of the `.dark` block (after `--color-on-accent: #ffffff;`), add:

```css
  color-scheme: dark;
```

And inside the `@layer base` `html` rule (after `overflow-x: hidden;`), add:

```css
    color-scheme: light;
```

### Verify
`npm run lint && npm run build`. On simulator in dark mode: heatmap cells should show higher severity as *lighter* rose tones, not darker ones disappearing into the background. Scrollbars and any native inputs should render dark. Chart observation windows and conventional-range bands should be visible, not swallowed.

### Commit
```
git add src/index.css
git commit -m "fix: dark-mode heatmap direction, chart contrast, color-scheme declarations"
```

---

## Prompt C — Guard pull-to-refresh while quick-log sheet is open

### Context
On the dashboard, `PullToRefresh` is enabled whenever `pathname === '/dashboard'`. But when the quick-log bottom sheet is open and you drag down, the pull-to-refresh gesture fires instead of the sheet's drag-to-dismiss. Disable pull-to-refresh when the sheet is open.

### Preconditions
- File (verified): `src/components/dashboard/DashboardLayout.tsx`.
- `useQuickLogStore` lives at `../../stores/quickLogStore` and exposes `isSheetOpen: boolean`.

### Changes

1. Add the import:

```ts
import { useQuickLogStore } from '../../stores/quickLogStore';
```

2. Inside `DashboardLayout()`, subscribe to the sheet state:

```ts
const quickLogOpen = useQuickLogStore((s) => s.isSheetOpen);
```

3. Change the `PullToRefresh` props from:

```tsx
<PullToRefresh enabled={pathname === '/dashboard'} onRefresh={handlePullRefresh}>
```

to:

```tsx
<PullToRefresh
  enabled={pathname === '/dashboard' && !quickLogOpen}
  onRefresh={handlePullRefresh}
>
```

### Verify
`npm run lint && npm run test && npm run build`. On device: open quick-log sheet on dashboard, drag down — sheet should dismiss, not trigger a refresh. Close sheet, pull down on dashboard — refresh should fire normally.

### Commit
```
git add src/components/dashboard/DashboardLayout.tsx
git commit -m "fix: disable pull-to-refresh while quick-log sheet is open"
```
