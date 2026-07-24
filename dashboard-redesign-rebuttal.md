# Dashboard redesign — decisions and prompt

## Decided changes

These are the changes I'm making. Not proposals — decisions.

**1. Remove all action cards from Dashboard**
- Remove `PulsePromptCard` 
- Remove `WeeklyCheckinPromptCard`
- Remove `DoseTapWidget`
- Remove `ExperimentWindowCard`
- Remove `FullDashboardUnlockCard` (merge into `UnlockProgress`)
- Keep `QuickLogWidget` — open question, see below
- Dashboard becomes data-only: safeguarding → scores → charts → insights

**2. Check In tab owns all check-in prompting**
- Weekly MRS prompt card moves here (with full status: due/done/overdue)
- Daily pulse prompt card moves here
- QuickLogWidget may move here (see open question)
- Check-in history stays here
- This tab is the single place for all logging that isn't medication or lab-specific

**3. DoseTapWidget and ExperimentWindowCard move to Meds tab**
- "Today's doses" section at top of Meds with one-tap logging
- Observation window card sits above the medication list when active
- Everything medication-related lives in one tab

**4. Badge dot on Check In tab icon**
- Small rose dot (no number) on the Check In icon in the bottom nav
- Appears when daily pulse or weekly MRS is due
- Clears when the action is completed
- Visible from every screen in the app

**5. Tooltip bubble on app open**
- When the app opens and a check-in is due, a tooltip-style callout appears above the Check In tab icon: "Weekly check-in due"
- Points down at the tab icon
- Fades after ~4 seconds, leaving the badge dot behind
- Only appears once per app session
- Teaches the user where to go without taking dashboard space

**6. Post-MRS contextual nudges**
- After completing a weekly check-in, the summary screen shows soft suggestions based on data state:
  - "Log a dose change" — if experiment window ended or dose change not logged recently
  - "Add recent lab results" — if last labs were 90+ days ago
  - "Update medications" — if med list hasn't changed in a long time
- Tappable links, not modals. Not blocking. Only shown when relevant.

**7. Dashboard layout (full, after these changes)**
1. Safeguarding cards
2. Score summary (MRS score, severity, trend) — above the fold
3. QuickLogWidget (if it stays — see open question)
4. Story column / symptom trend charts
5. Dose-change windows rendered as chart markers, not standalone cards
6. Insights panel
7. Subscale breakdown, heatmap
8. Lab trend chart
9. Meds + labs summary widgets
10. Drill-down controls, provider report

**8. Dashboard layout (early, < 7 MRS check-ins)**
1. Safeguarding cards
2. Unlock progress (absorbs FullDashboardUnlockCard — one component, not two)
3. Welcome message
4. Whatever data exists so far

## Open questions — want your input

**QuickLogWidget:** This is in-the-moment symptom logging ("I'm having a hot flash right now"), not a scheduled action. It's reactive. Part of me thinks it stays on Dashboard as the one action surface since it's "what's happening now." But it could live on Check In since it is a form of checking in. The mockup I'm working from puts it on Check In. What's the stronger case?

**DoseTapWidget accessibility:** Daily dose logging is a daily action like pulse. Moving it to Meds is cleaner, but is one extra tab tap acceptable for a daily action? Or does it need a shortcut? My instinct is the Meds tab is fine — dose logging isn't time-sensitive the way a hot flash log is.

## Rejected

**The Today strip.** It's consolidation, not simplification. The strip is a mini remote control for the other tabs — the same actions in two places, just compressed into dots. If the tabs own their domains, the dashboard can't also be a switchboard. The strip solves the scroll problem but not the redundancy problem.

**Contextual landing tab.** Agreed — fixed landing = spatial memory. The app always opens to Dashboard. A tooltip bubble + badge dot gives the contextual benefit without the ambush of opening into a form. This matters especially for a 40-60 audience where "the app opened to a different screen" is disorienting.

---

## Prompt

Here's the context you need to work with this. The app is TrackHer — a symptom tracking and HRT management app for women going through menopause/perimenopause. React 19 + Vite + Tailwind 4 + Zustand + Supabase + Capacitor iOS. Five bottom-nav tabs: Dashboard, Meds, Check In, Labs, Insights.

The current dashboard leads with 5-7 action cards (QuickLogWidget, PulsePromptCard, DoseTapWidget, WeeklyCheckinPromptCard, FullDashboardUnlockCard, ExperimentWindowCard, AppointmentCountdownCard) stacked above all data. On mobile, users scroll past 3-4 screens of "do something" prompts before seeing any scores or charts. Meanwhile, the Check In and Meds tabs exist as dedicated spaces for those same actions, creating redundancy.

The core daily loop is: log → see what changed. Users check in once daily (10-sec pulse) and once weekly (2-min MRS clinical symptom scale). They log doses as taken and occasionally add lab results.

The app's tone is calm and clinical — rose/sage palette, no gamification, no guilt, no streaks-as-pressure. The audience is women 40-60 managing hormone therapy. Simple navigation matters.

I've decided on the changes listed above. The Today strip approach (consolidating all actions into one compact dashboard card with status dots) was considered and rejected — it's still redundancy, just smaller. I want each tab to fully own its domain. The dashboard's job is to show data and insights, not to prompt actions.

The notification model is three quiet escalating signals: badge dot on tab icon (persistent), tooltip bubble on app open (fades after 4 seconds, leaves the dot), and one local push notification for weekly MRS only (evening of due day if still open). The notification infrastructure exists (`localNotifications.ts`, `reminderSync.ts`) but has no settings UI yet — that's a separate item.

After completing a weekly MRS check-in, the summary screen should surface contextual nudges — tappable links to log dose changes, add labs, or update medications — only when relevant based on the user's data state.

Give me your take on the two open questions (QuickLogWidget placement, DoseTapWidget accessibility) and then let's plan the implementation order for these changes.
