# Dashboard redesign prompts — archive (01–13 + index)

All 13 prompts in one file, in execution order. Per git history these have ALL been run already (branch `redesign/13-dark-mode`); this archive is for reference and re-runs. Prompt 03b (summary restyle) lives in its own file.

Global rules for every prompt:
- Branch from current HEAD. Clean tree before starting.
- After changes: `npm run lint && npm run test && npm run build` must all pass.
- Explicit `git add <path>` for every file, always listing new files. Never `git commit -am`.

| # | Scope | Depends on |
|---|-------|-----------|
| 01 | DoseTapWidget + ExperimentWindowCard → Meds tab | — |
| 02 | Pulse + weekly prompt cards → Check In tab | — |
| 03 | Unlock merge, layout reorder, appointment chip, subtitle swap | 1, 2 |
| 03b | One-card date range + score summary (separate file) | 3 |
| 04 | Early-dashboard ghost/sparse charts | 3 |
| 05 | Shared check-in status store + tab highlight | 2 |
| 06 | Once-per-session tooltip over Check In tab | 5 |
| 07 | Dose-change windows as chart regions | 1, 3 |
| 08 | One contextual nudge on MRS summary | — |
| 09 | Weekly MRS notification: evening of due day, skip if done | 5 |
| 10 | Haptics, status bar, keyboard, input audit | — |
| 11 | QuickLogSheet drag-dismiss + dashboard pull-to-refresh | 3 |
| 12 | Extract hard-coded hex to @theme tokens | 3, 7 |
| 13 | Dark theme via token overrides, system-follow | 10, 12 |

---

## 01 — Move dose logging and observation window to the Meds tab

**Context.** Dose logging (`DoseTapWidget`) and the dose-change observation window (`ExperimentWindowCard`) belong to the medication domain. Move both to the Meds tab and remove them from the dashboard.

**Part A — Move the files.**
1. `git mv src/components/dashboard/DoseTapWidget.tsx src/components/medications/DoseTapWidget.tsx`
2. `git mv src/components/dashboard/ExperimentWindowCard.tsx src/components/medications/ExperimentWindowCard.tsx`
3. Fix relative imports inside both moved files: `./DashboardCardHeader` → `../dashboard/DashboardCardHeader`. Other imports (`../ui/Card`, `../../hooks/...` etc.) are same depth — verify each resolves.

**Part B — Mount on MedicationsPage** (`src/pages/MedicationsPage.tsx`): import both from `../components/medications/`, plus `useInsights` and `useCheckinStatus`. Order: page header → `<DoseTapWidget />` → `<ExperimentWindowCard insights={insights} hasCheckedInToday={hasCheckedInToday} />` → current medications → history.

**Part C — Remove from dashboard** (`DashboardLayout.tsx`): delete both imports and usages from BOTH branches. `useInsights` stays.

**Part D — Sweep.** Grep for `dashboard/DoseTapWidget` and `dashboard/ExperimentWindowCard`; update stragglers incl. tests.

**Commit.** `git add` the four touched paths + `git add -u`.

---

## 02 — Move check-in prompt cards to the Check In tab

**Context.** `PulsePromptCard` and `WeeklyCheckinPromptCard` (from `src/components/checkin/CheckinPromptWidget.tsx`) move to the top of `CheckinPage`. `QuickLogWidget` and `RecentLogs` stay on the dashboard.

**Part A — Mount on CheckinPage.** Extend the existing `useCheckinStatus()` destructure with `hasPulseToday`, `hasFullMrsToday`, `isDue`, `daysSinceLastCheckin`. Render weekly card first, then pulse card, above existing content. Since the cards now live ON `/checkin`, add optional `onStart?: () => void` props (default = current behavior) wired to the page's existing flow starters. Remove now-redundant start buttons so each mode has exactly one entry.

**Part B — Remove from dashboard.** Delete the `pulseCard`/`weeklyCard` consts and usages in `DashboardLayout`; keep `useCheckinStatus` (needed for prompt 03's subtitle swap).

---

## 03 — Dashboard reorder, unlock merge, appointment chip, subtitle swap

**Part A — Merge FullDashboardUnlockCard into UnlockProgress.** When `checkinCount >= FULL_DASHBOARD_CHECKINS`, render the one-time dismissible celebration (Sparkles copy, `setUiFlag('full_dashboard_seen')`) instead of null — only if flag unset and `profile?.ui_state != null`. Delete `FullDashboardUnlockCard.tsx` (`git rm`). Render `<UnlockProgress checkinCount={mrsCheckinCount} />` in both branches.

**Part B — Appointment chip.** Reduce `AppointmentCountdownCard` to a one-line chip ("Appointment in N days"), rendered only when `profile?.next_appointment_date` exists and is today-or-future; place directly above `ProviderReportButton`; remove from early branch; report button always renders in full branch.

**Part C — Reorder.** Full branch: safeguarding → QuickLogWidget → RecentLogs → UnlockProgress → DateRangeSelector → ScoreSummaryCards → DashboardInsightsPanel → StrawStageCard → StoryColumn → PersonalSymptomTrends → SubscaleChart+SymptomHeatmap grid → LabTrendChart → ActiveMedicationsSummary+LabSummaryWidget grid → DrillDownControls → appointment chip + ProviderReportButton. Early branch: safeguarding → QuickLogWidget → RecentLogs → UnlockProgress → WelcomeMessage → insights (existing conditional) → StrawStageCard → ActiveMedicationsSummary.

**Part D — Subtitle swap.** When the weekly check-in is open (same condition `WeeklyCheckinPromptCard` uses — read it, don't invent one): "Your weekly check-in is open — takes about 2 minutes." Else existing subtitle.

---

## 04 — Ghost / sparse charts on the early dashboard

**Part A.** New `src/components/dashboard/GhostChartFrame.tsx`: props `{ title, caption, children? }`; a `Card` with 2–3 desaturated static SVG polylines (sand-300/sage-200) over faint gridlines, ~160px, `aria-hidden`, no animation; caption `text-sm text-sage-500`.

**Part B.** Early branch, after `WelcomeMessage`: `mrsCheckinCount === 0` → two ghosts ("Symptom story", "Symptom domains") with captions using `mrsCheckinCount` of `FULL_DASHBOARD_CHECKINS`. `>= 1` → real `StoryColumn` + `SubscaleChart` with sparse data (reuse full-branch props) + caption "More check-ins will sharpen this — N of 7." No heatmap/labs/drill-down in early branch.

**Part C.** Copy calm and factual — no exclamation marks, no lock icons.

---

## 05 — Shared check-in status store + Check In tab highlight

**Part A.** New `src/stores/checkinStatusStore.ts` (match the codebase's Zustand pattern from `dashboardStore.ts`): state `status: CheckinStatus`, `isLoading`; action `refresh(userId, todayStr, checkinDay)` with the single-flight guard ported from the hook's `loadIdRef`; uses `loadCheckinStatusSnapshot` + `computeCheckinStatus`; initial `EMPTY_CHECKIN_STATUS`.

**Part B.** Refactor `useCheckinStatus` to read the store. RETURN SHAPE MUST NOT CHANGE — all consumers compile untouched.

**Part C.** Refresh triggers: after check-in save (in `checkinPersistence.ts` / `CheckinSummary` success path) and on `visibilitychange` → visible (registered once).

**Part D.** `MobileNav.tsx` + `Sidebar.tsx`: derive `needsCheckin` (pulse not done today OR weekly due — mirror the prompt cards' conditions). Due state: `bg-sage-100 rounded-full` capsule behind icon+label, `text-sage-600 font-medium`, icon swaps to `ClipboardList` (lucide); not due → `ClipboardCheck`, current styling. Capsule wins when active+due. Verify ONE snapshot fetch on app load.

---

## 06 — Once-per-session tooltip over the Check In tab

**Positioning is a hard requirement:** horizontally centered on the Check In tab item (measured via `getBoundingClientRect`), fully above the icon, caret pointing down at the icon center. Verify at 320pt and 430pt.

**Part A.** New `src/components/layout/CheckinDueTooltip.tsx`: props `{ anchorRef, label, onDismiss }`; fixed position `left = rect.left + rect.width/2`, `translateX(-50%)`, `bottom = innerHeight - rect.top + 8`; caret = rotated square centered under bubble; re-measure on resize; `bg-sage-700 text-white text-sm rounded-lg px-3 py-1.5`; fade+4px rise in, auto-fade at 4s, dismiss on any `pointerdown`; reduced motion → opacity only; `role="status"`.

**Part B.** In `MobileNav`: ref on the Check In NavLink; show when status loaded AND `needsCheckin` AND not shown this session. Session = module-level `lastShownAt`; reset when app hidden >4h (track via `visibilitychange`; `@capacitor/app` is NOT installed — do not add it). Label: weekly precedence: "Weekly check-in due" else "Daily check-in due". Mobile nav only.

**Part C.** After tooltip dismissal, capsule runs a settle animation: sage-300 ring, scale 1→1.4, opacity 0.5→0, ~1.2s, exactly 3 iterations, then static. Reduced motion → skip. Never loops indefinitely.

---

## 07 — Dose-change observation windows as chart regions

Read `StoryColumn.tsx` FIRST — if vertical change markers already exist, ADD the shaded region only. Export `WINDOW_DAYS = 21` from `ExperimentWindowCard.tsx` (or move to `medicationHelpers.ts`); never re-hardcode 21.

**Part A — StoryColumn.** For each change in the visible range: recharts `ReferenceArea` from `change_date` to `change_date + WINDOW_DAYS` (clamp; `addDaysISO` for math). `fill="var(--color-sage-100)"`, `fillOpacity ≈ 0.35`, no stroke, rendered beneath the lines.

**Part B — SubscaleChart.** Add optional `changes` prop; same regions; `DashboardLayout` passes `changes={changes}`.

**Part C.** One caption when ≥1 region visible: "Shaded area — observation window after a dose change." `text-xs text-sage-400`.

---

## 08 — One contextual nudge on the MRS summary screen

Gate everything on `mode === 'full'` (from `useCheckinStore`; `'quick'` = pulse). ONE nudge max, first match wins:
1. Most recent med change's 21-day window ended within last 7 days → "How did the dose change go? Review your medications" → `/medications`.
2. Newest lab 60+ days old, or meds exist with zero labs → "It's been a while since your last labs. Add recent results" → `/labs`.
3. No med list activity in 120+ days with ≥1 active med → "Is your medication list still current? Review it" → `/medications`.

New `src/components/checkin/PostCheckinNudge.tsx`: uses `useMedicationChanges`, `useLabResults`, `useMedications`; small `Card`, tappable row with chevron, `useNavigate`. Extract the priority logic as a pure function and unit-test it. Render inside `CheckinSummary` success state, below summary, above done button. No exclamation marks.

---

## 09 — Weekly MRS notification: evening of due day, skipped when done

**Part A.** In `reminderSync.ts`/`localNotifications.ts`: change the check-in notification (`CHECKIN_NOTIFICATION_ID = 1000`) from repeating weekly to a ONE-SHOT at the next occurrence of `profile.checkin_day` at the configured time; if that's today and the weekly minimum is already met, skip to next week. Extend `buildReminderNotifications` opts with `weeklyDone: boolean`; update all callers incl. tests. Resync (`resyncRemindersForCurrentUser()`) after every check-in save and on foreground; confirm cancel-before-reschedule covers the one-shot.

**Part B.** Default check-in reminder time in `reminderPrefs.ts` → 18:00; respect user-set values.

**Part C.** Deep link: `localNotificationActionPerformed` listener (guarded `Capacitor.isNativePlatform()`), `notification.id === CHECKIN_NOTIFICATION_ID` → `navigate('/checkin')`. Register once. Med reminders (2000+) unchanged.

Unit-test next-occurrence: today+done → next week; today+not-done → today 18:00; other weekday → next due day.

---

## 10 — Native polish: haptics, status bar, keyboard, input audit

Install `@capacitor/haptics @capacitor/status-bar @capacitor/keyboard`, then `npm run cap:sync`.

**Part A.** New `src/lib/haptics.ts`: `tapLight()` / `success()` / `selectionTick()` wrappers, guarded by `Capacitor.isNativePlatform()`, all try/catch.

**Part B — wiring (sparing).** DoseTapWidget: `tapLight()` on successful log. QuickLogSheet: `tapLight()` on save. CheckinSummary: `success()` once for full-mode save only. SeveritySlider: `selectionTick()` on actual value change. Nothing else.

**Part C.** Status bar: `StatusBar.setStyle({ style: Style.Light })` on native init. Keyboard: `Keyboard.setAccessoryBarVisible({ isVisible: false })`; `plugins.Keyboard.resize: 'body'` in `capacitor.config.ts` unless device testing says otherwise.

**Part D — input zoom.** Any focused input under 16px computed font-size triggers iOS viewport zoom. Grep inputs (start `src/components/ui/Input.tsx`); make native input elements ≥16px (`text-base`); do NOT add `maximum-scale=1`.

---

## 11 — QuickLogSheet drag-to-dismiss + dashboard pull-to-refresh

**Part A — QuickLogSheet.** Grabber (36×4 `bg-sand-300`); pointer-event drag, downward only with resistance; release >120px or high velocity → dismiss via the store's existing close action; else spring back (`cubic-bezier(0.32, 0.72, 0, 1)`, ~300ms). Don't hijack content scroll (drag starts only at scrollTop 0 or on grabber/header). Reduced motion → instant.

**Part B.** New `src/components/ui/PullToRefresh.tsx`: at `scrollTop === 0`, drag >70px → spinner (`Loader2`, `text-sage-400`) → `await onRefresh()`. IDENTIFY THE REAL SCROLL CONTAINER first (check `AppShell`/`PersistentTabs` — window vs inner div). Wrap dashboard content; `onRefresh` = `refreshAll()` + status store refresh. Watch iOS rubber-band double-trigger; `overscroll-behavior-y: contain` while armed if needed.

---

## 12 — Extract hard-coded hex colors into @theme tokens (zero visual change)

Files with hex (verified at time of writing): `ProgressRing`, `StoryColumn`, `SymptomBand`, `WeeklySegmentLines`, `LabTrendChart`, `SymptomHeatmap`, `RecentLogs`, `ScoreSummaryCards`. Re-grep: `grep -rn '#[0-9a-fA-F]\{6\}' src/components --include=*.tsx`.

**Tokens.** Severity ramp from `RecentLogs` (`#e5aac8 #c989a7 #be739a #a64d79 #7a3b5e`) → `--color-severity-1..5`; unify with heatmap ramp if same, else separate `--color-heat-*` (never silently change values). Chart colors → role-named tokens (`--color-chart-line-primary`, `--color-chart-grid`, …); reuse existing tokens where hex matches (e.g. `#be739a` = sage-500).

**Replace.** `bg-[#…]` → generated utilities; SVG/recharts props → `var(--color-…)`; three literal whites: `html` background in `index.css` → `var(--color-sand-50)`, `body` `bg-white` → `bg-sand-50`, `MobileNav`/`Sidebar` `bg-white` → `bg-sand-50`. `capacitor.config.ts` untouched. Final grep must return nothing unjustified. Screenshot-compare heatmap + story chart before/after.

---

## 13 — Dark mode: token overrides, system-follow, status bar

**Part A.** `.dark` block after `@theme` in `src/index.css` — every color token gets a dark value. Provided ramp:
sage: 50 `#241a20` 100 `#2e2129` 200 `#3c2b35` 300 `#57404c` 400 `#8a6478` 500 `#c98ca9` 600 `#d6a3bc` 700 `#e2bccf` 800 `#efd7e2` 900 `#f8ecf2` · sand: 50 `#171114` 100 `#1e161a` 200 `#2a1f25` 300 `#3a2c33` 400 `#6b5761` · clay: 400 `#b5788f` 500 `#c98ca9` 600 `#daa9c0` · moss: 100 `#232b1d` 300 `#4a5a3c` 500 `#93a67c` 600 `#a9bb90` 700 `#c2d1ab` · success `#7fae6e` warning `#d4a97e` danger `#d47a7a` info `#b492a4`.
Unlisted tokens (alert ramp, severity/chart tokens): same hue, flipped lightness, AA (≥4.5:1) at the pairings actually used. Severity ramp lightened so stop 1 is visible on `sand-100`; grid lines subtle; series lines lifted.

**Part B.** In `src/main.tsx` before React renders: `matchMedia('(prefers-color-scheme: dark)')` → toggle `dark` class on `documentElement`, plus change listener; same function flips StatusBar style (`Style.Dark` in dark / `Style.Light` in light) when native.

**Part C.** Sweep `bg-white` / `text-white` / gradients (e.g. UnlockProgress celebration `from-sage-50/80 to-white` → flat `bg-sage-50`); Card elevated variant gets `border-sand-200` so elevation reads without shadows; handle `<meta name="theme-color">` in `index.html` if present.

**Verify.** Every screen in both modes; live toggle mid-session; no white flashes; overscroll shows plum; AA spot-checks (body text, sage-500 on sand-100, severity 1 on heatmap bg).
