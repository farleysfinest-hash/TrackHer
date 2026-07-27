# Review — Periods guide source-accuracy audit

**Date:** 2026-07-25  
**Method:** Manual check of every clinical number, red-flag criterion, and glossary term against the original user-supplied guide. Content was written from that source — not regenerated from a separate model pass.

**Verdict:** Pass. No invented prevalence figures, thresholds, drugs, or conditions. One intentional product-adjacent sentence in the tracking article (noted below).

---

## Spelling / style

| Choice | Status |
|--------|--------|
| British `-oe-` (oestrogen, amenorrhoea, haemorrhage-class terms) | Consistent across all files |
| US dual refs where source has them (10p / quarter; paracetamol/acetaminophen) | Present |
| Mental model quote | Exact: “oestrogen builds, progesterone holds, and the withdrawal of progesterone releases.” |

---

## Locked numbers (source → shipped)

| Claim | Source | Shipped |
|-------|--------|---------|
| Adult cycle length | 21–35 days | ✓ |
| Bleeding duration | 2–7 days | ✓ |
| Blood loss | 30–80 ml; >80 ml heavy | ✓ |
| Menarche ages | 10–15 (avg ~12) | ✓ |
| Menopause average | ~51 (45–55 typical) | ✓ |
| Egg counts | 1–2M → 300–400k → ~400 ovulated | ✓ |
| LH surge lead | 24–36 hours | ✓ |
| BBT rise | 0.3–0.5 °C after ovulation | ✓ |
| Egg / sperm survival | 12–24 h / up to 5 days | ✓ |
| Fertile window | ~6 days (5 before + day of) | ✓ |
| Luteal length | 12–14 days | ✓ |
| Corpus luteum lifespan (no implant) | ~10–12 days | ✓ |
| Mittelschmerz | ~1 in 5 | ✓ |
| Clot threshold | 10p / quarter (~2.5 cm) | ✓ |
| Cycle variation | ~7–9 days | ✓ |
| Early-cycle length OK | up to 45 days first years | ✓ |
| PMS prevalence | ~3 in 4 | ✓ |
| PMDD | 2–5% strict; up to 8% looser | ✓ |
| TSS incidence | 1–3 / 100,000 / year | ✓ |
| Tampon max wear | never exceed 8 hours | ✓ |
| Endometriosis | 1 in 10; delay 7–10 y (1.5–11) | ✓ |
| PCOS | 8–13% | ✓ |
| Fibroids by 50 | majority | ✓ |
| POI | ~1%, before 40 | ✓ |
| Primary amenorrhoea | no period by 15; or by 13 with no puberty signs | ✓ |
| Secondary amenorrhoea | 3+ months | ✓ |
| Perimenopause contraception | 12 mo if >50; 24 mo if <50 | ✓ |
| Infertility workup | 12 mo; 6 mo if >35 | ✓ |
| Breast-dev → menarche | 2–2.5 years | ✓ |

---

## Red-flag audit (§15)

### Book an appointment (13/13)

1. Soaking hourly for several consecutive hours — ✓  
2. Periods >7 days — ✓  
3. Clots >10p / quarter (~2.5 cm) — ✓  
4. Pain stopping work/school or not touched by painkillers — ✓  
5. Cycles consistently <21 or >35 — ✓  
6. No period 3+ months (pregnancy ruled out) — ✓  
7. Bleeding between periods, after sex, or after menopause — ✓  
8. Anaemia symptoms — ✓  
9. Severe premenstrual mood symptoms — ✓  
10. Pain during sex, urination, or bowel movements — ✓  
11. Sustained change from own normal — ✓  
12. No period by 15 / no puberty signs by 13 — ✓  
13. Trying 12 months (6 if >35) — ✓  

### Seek urgent care (4/4)

1. Sudden severe pelvic pain + fever/fainting/vomiting — ✓  
2. TSS signs (tampon or cup) — ✓  
3. Very heavy bleeding + dizziness/racing heart/breathlessness — ✓  
4. Positive pregnancy test + severe one-sided pain and/or bleeding (ectopic) — ✓  

### Also preserved elsewhere

- Postmenopausal bleeding → prompt assessment (lifespan article) — ✓  
- Grey/foul-smelling discharge → see doctor (blood article) — ✓  
- Function-stopping pain → raise endometriosis explicitly — ✓  

---

## Glossary (23/23)

Adenomyosis, Amenorrhoea, Anovulation, BBT, Corpus luteum, Dysmenorrhoea, Endometrium, Follicle, hCG, HPO axis, Luteal phase, Menarche, Menopause, Menorrhagia, Mittelschmerz, Myometrium, Oligomenorrhoea, Perimenopause, PMDD, PMS, POI, Prostaglandins, TSS — all present, one-sentence each, source wording.

---

## Myths (10/10)

All ten source myths present with corrections. No new myths added.

---

## Intentional deltas (not clinical drift)

| Change | Why |
|--------|-----|
| Split conditions into separate files under `conditions/` | Prompt 13a–d; easier deep-linking |
| Short dek lines under H1s | Article scannability |
| Cross-link “Next” / “See also” lines | Prompt 00 index |
| One TrackHer sentence in tracking article | Prompt 11 allowed a gentle product note; no invented features |
| MASTER.md renumbered H1s | Single-file reading order |

---

## Files shipped

```
docs/education/periods/
  index.md
  MASTER.md
  REVIEW.md          ← this file
  articles/01…17     (no 13 — conditions folder)
  conditions/        (8 condition articles + README)
```

---

## Not done (out of scope for this pass)

- In-app React screens / routing for these articles  
- Clinical re-verification against primary literature (source was treated as the lock)  
- Commit (not requested)
