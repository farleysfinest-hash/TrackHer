# Outstanding changes — risk review

Written 2026-07-26. Updated after the fix pass the same day. Every file and line reference
was checked against the working tree.

---

## Done this pass

0. **Committed** the four pending files as `ea6379f` (Remember-me removal, heatmap expand
   drop, triage doc, supabase persistent sessions).
1. **H4 — provider report administrations** — migration `029`, both loaders, PDF engine
   wiring, tests. **You still need to apply `029` in the SQL editor.**
2. **CI** — `.github/workflows/ci.yml` with an explicit note that placeholder env makes a
   green build non-deployable without real host secrets.
3. **Favicon** — 48×48 RGBA, cream negative space verified (~4KB).
4. **CSV export** — Settings button; formula-injection escaping tested.
5. **Onboarding avatar** — optional, never blocks Continue.

Header logo — confirmed no change needed.

---

## Still your call

- Apply `029_provider_report_administrations.sql` (and `028` if not already live).
- Whether to commit `docs/education/` (periods guide) — left untracked.
- Focus-trap / unbounded-read / mutation `user_id` hardening from the triage backlog.

See `docs/CODE_AUDIT.md` for the post-fix audit.
