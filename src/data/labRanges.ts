import type { LabBiomarker, LabCategory, LabRangeStatus } from '../types/labs';

export const LAB_BIOMARKERS: LabBiomarker[] = [
  // ── Core HRT ──────────────────────────────────────────────
  {
    key: 'estradiol',
    label: 'Estradiol (E2)',
    unit: 'pg/mL',
    category: 'core_hrt',
    conventionalRange: { min: 0, max: 30 },
    optimalRange: { min: 50, max: 200 },
    context:
      'Primary estrogen. Postmenopausal untreated levels are typically below 30 pg/mL; transdermal or oral HRT targets 50–200 pg/mL for symptom relief and bone protection.',
    warningLow:
      'Very low estradiol may indicate inadequate HRT dosing, missed doses, or absorption issues. Symptoms like hot flashes, vaginal dryness, and mood changes may persist.',
    warningHigh:
      'Levels above 200 pg/mL may increase risk of breast tenderness, bloating, and thrombotic events. Discuss dose adjustment with your provider.',
  },
  {
    key: 'estrone',
    label: 'Estrone (E1)',
    unit: 'pg/mL',
    category: 'core_hrt',
    conventionalRange: { min: 10, max: 50 },
    optimalRange: { min: 30, max: 100 },
    context:
      'The dominant estrogen after menopause, produced mainly in adipose tissue. On HRT, estrone should rise proportionally with estradiol.',
    warningLow:
      'Low estrone may reflect insufficient estrogen replacement or poor conversion from estradiol.',
    warningHigh:
      'Elevated estrone relative to estradiol may suggest preferential conversion pathways; worth discussing with your provider.',
  },
  {
    key: 'progesterone',
    label: 'Progesterone',
    unit: 'ng/mL',
    category: 'core_hrt',
    conventionalRange: { min: 0.2, max: 25 },
    optimalRange: { min: 2, max: 20 },
    context:
      'Reference ranges vary by cycle phase in premenopausal women. On HRT with a uterus, progesterone or progestin protects the endometrium; target 2–20 ng/mL on micronized progesterone.',
    warningLow:
      'Low progesterone on cyclic HRT may leave the endometrium unprotected. Confirm you are taking progestin as prescribed.',
    warningHigh:
      'High progesterone can cause sedation, bloating, and breast tenderness. Often resolves with timing or dose adjustment.',
  },
  {
    key: 'total_testosterone',
    label: 'Total Testosterone',
    unit: 'ng/dL',
    category: 'core_hrt',
    conventionalRange: { min: 8, max: 48 },
    optimalRange: { min: 30, max: 70 },
    context:
      'Women produce testosterone from the ovaries and adrenals. On HRT, levels of 30–70 ng/dL may support energy, libido, and muscle mass without virilizing effects.',
    warningLow:
      'Low testosterone may contribute to fatigue, low libido, and reduced muscle strength. Consider adrenal and ovarian function.',
    warningHigh:
      'Levels above 70 ng/dL in women may cause acne, hair thinning, or clitoral enlargement. Review androgen supplementation dose.',
  },
  {
    key: 'free_testosterone',
    label: 'Free Testosterone',
    unit: 'pg/mL',
    category: 'core_hrt',
    conventionalRange: { min: 0.1, max: 6.3 },
    optimalRange: { min: 1.0, max: 4.5 },
    context:
      'The bioactive fraction of testosterone, unbound by SHBG. More clinically relevant than total testosterone when SHBG is altered by oral estrogen.',
    warningLow:
      'Low free testosterone may explain persistent fatigue or low libido despite normal total testosterone.',
    warningHigh:
      'Elevated free testosterone increases androgenic side-effect risk. Oral estrogen raises SHBG and can mask high free levels—interpret alongside total testosterone.',
  },
  {
    key: 'dhea_s',
    label: 'DHEA-S',
    unit: 'mcg/dL',
    category: 'core_hrt',
    conventionalRange: { min: 35, max: 430 },
    optimalRange: { min: 100, max: 300 },
    context:
      'Adrenal androgen precursor; declines with age. Reference range is age-dependent—peak in 20s, lower in 60s+. Optimal mid-range supports resilience and androgen substrate.',
    warningLow:
      'Low DHEA-S may reflect adrenal insufficiency or chronic stress. Consider morning cortisol and ACTH if symptomatic.',
    warningHigh:
      'High DHEA-S can indicate adrenal hyperactivity, PCOS, or excessive DHEA supplementation.',
  },
  {
    key: 'shbg',
    label: 'SHBG',
    unit: 'nmol/L',
    category: 'core_hrt',
    conventionalRange: { min: 18, max: 144 },
    optimalRange: { min: 40, max: 80 },
    context:
      'Sex hormone-binding globulin binds testosterone and estradiol, reducing their free fractions. Oral estrogen significantly raises SHBG; transdermal routes have less effect.',
    warningLow:
      'Low SHBG increases free hormone fractions and may occur with insulin resistance, obesity, or hypothyroidism.',
    warningHigh:
      'High SHBG (common on oral estrogen) reduces bioavailable testosterone. Free testosterone may be more informative than total.',
  },
  {
    key: 'fsh',
    label: 'FSH',
    unit: 'mIU/mL',
    category: 'core_hrt',
    conventionalRange: { min: 10, max: 25 },
    optimalRange: { min: 0, max: 10 },
    context:
      'Follicle-stimulating hormone. Postmenopausal untreated levels typically exceed 25 mIU/mL. Adequate estrogen replacement suppresses FSH below 10, confirming therapeutic effect.',
    warningLow:
      'Suppressed FSH on HRT indicates adequate estrogen exposure—this is expected and desirable.',
    warningHigh:
      'FSH above 25 mIU/mL suggests untreated menopausal status or insufficient estrogen dosing. Dose or route may need adjustment.',
  },
  {
    key: 'lh',
    label: 'LH',
    unit: 'mIU/mL',
    category: 'core_hrt',
    conventionalRange: { min: 10, max: 15 },
    optimalRange: { min: 0, max: 10 },
    context:
      'Luteinizing hormone rises in menopause when ovarian feedback is lost. Like FSH, LH below 10 on adequate estrogen confirms HRT is suppressing the hypothalamic-pituitary axis.',
    warningLow:
      'Suppressed LH on HRT is expected and indicates adequate estrogen replacement.',
    warningHigh:
      'LH above 15 mIU/mL may indicate insufficient estrogen or recent discontinuation of HRT.',
  },

  // ── Thyroid ───────────────────────────────────────────────
  {
    key: 'tsh',
    label: 'TSH',
    unit: 'mIU/L',
    category: 'thyroid',
    conventionalRange: { min: 0.4, max: 4.5 },
    optimalRange: { min: 0.5, max: 2.0 },
    context:
      'Thyroid-stimulating hormone is the primary screening test. Many functional medicine providers target 0.5–2.0 for optimal metabolism, mood, and energy.',
    warningLow:
      'Low TSH may indicate hyperthyroidism or over-replacement with levothyroxine. Can cause palpitations, anxiety, and bone loss.',
    warningHigh:
      'Elevated TSH suggests hypothyroidism, which worsens menopause symptoms, weight gain, and lipid profiles. Check free T4 and free T3.',
  },
  {
    key: 'free_t3',
    label: 'Free T3',
    unit: 'pg/mL',
    category: 'thyroid',
    conventionalRange: { min: 2.3, max: 4.2 },
    optimalRange: { min: 3.0, max: 4.0 },
    context:
      'The active thyroid hormone. Low free T3 despite normal TSH may indicate poor T4-to-T3 conversion, common with stress, illness, or certain medications.',
    warningLow:
      'Low free T3 causes fatigue, cold intolerance, brain fog, and constipation—symptoms that overlap with menopause.',
    warningHigh:
      'High free T3 may indicate hyperthyroidism or excessive T3 supplementation.',
  },
  {
    key: 'free_t4',
    label: 'Free T4',
    unit: 'ng/dL',
    category: 'thyroid',
    conventionalRange: { min: 0.8, max: 1.8 },
    optimalRange: { min: 1.0, max: 1.5 },
    context:
      'Prohormone produced by the thyroid gland, converted peripherally to T3. Useful for monitoring levothyroxine dosing.',
    warningLow:
      'Low free T4 confirms hypothyroidism or under-dosed thyroid replacement.',
    warningHigh:
      'High free T4 suggests hyperthyroidism or over-replacement. May cause anxiety, insomnia, and atrial fibrillation.',
  },

  // ── Metabolic ─────────────────────────────────────────────
  {
    key: 'cortisol_am',
    label: 'Cortisol (AM)',
    unit: 'mcg/dL',
    category: 'metabolic',
    conventionalRange: { min: 6, max: 23 },
    optimalRange: { min: 10, max: 18 },
    context:
      'Morning cortisol peaks within 30–60 minutes of waking. Draw before 9 AM for accurate assessment of HPA axis function and adrenal reserve.',
    warningLow:
      'Low morning cortisol may indicate adrenal insufficiency or chronic HPA axis suppression from long-term stress.',
    warningHigh:
      'Elevated morning cortisol suggests HPA axis overdrive, which can worsen insomnia, abdominal weight gain, and anxiety during menopause.',
  },
  {
    key: 'vitamin_d',
    label: 'Vitamin D (25-OH)',
    unit: 'ng/mL',
    category: 'metabolic',
    conventionalRange: { min: 30, max: 100 },
    optimalRange: { min: 50, max: 80 },
    context:
      'Essential for bone health, immune function, and mood. Menopausal women are at increased fracture risk; 50–80 ng/mL is a common functional target.',
    warningLow:
      'Deficiency below 30 ng/mL increases osteoporosis, falls, depression, and immune dysfunction risk. Supplement with D3 and recheck in 3 months.',
    warningHigh:
      'Levels above 100 ng/mL risk hypercalcemia and kidney stones. Reduce supplementation dose.',
  },
  {
    key: 'ferritin',
    label: 'Ferritin',
    unit: 'ng/mL',
    category: 'metabolic',
    conventionalRange: { min: 12, max: 150 },
    optimalRange: { min: 50, max: 100 },
    context:
      'Iron storage marker. Heavy or irregular perimenopausal bleeding can deplete iron stores. Optimal ferritin supports energy, hair health, and thyroid conversion.',
    warningLow:
      'Ferritin below 50 ng/mL may cause fatigue, hair loss, and restless legs even if hemoglobin is normal. Investigate bleeding and consider iron supplementation.',
    warningHigh:
      'High ferritin may indicate iron overload, inflammation, or fatty liver. Check CRP and consider hemochromatosis screening if persistently elevated.',
  },
  {
    key: 'fasting_insulin',
    label: 'Fasting Insulin',
    unit: 'mIU/L',
    category: 'metabolic',
    conventionalRange: { min: 2, max: 25 },
    optimalRange: { min: 2, max: 8 },
    context:
      'Early marker of insulin resistance, which increases sharply after menopause due to estrogen loss. Optimal below 8 mIU/L supports metabolic health and weight management.',
    warningLow:
      'Very low fasting insulin is uncommon; may occur with excellent metabolic health or certain medications.',
    warningHigh:
      'Insulin above 8–10 mIU/L suggests developing insulin resistance. Menopause accelerates this—prioritize protein, resistance training, and sleep.',
  },
  {
    key: 'hba1c',
    label: 'HbA1c',
    unit: '%',
    category: 'metabolic',
    conventionalRange: { min: 4.0, max: 5.6 },
    optimalRange: { min: 4.5, max: 5.3 },
    context:
      'Three-month average blood glucose. Estrogen decline increases diabetes risk; target below 5.3% for metabolic optimization.',
    warningLow:
      'HbA1c below 4.5% is rarely concerning unless symptomatic hypoglycemia is present.',
    warningHigh:
      'HbA1c 5.7% or above indicates prediabetes; 6.5% or above is diagnostic for diabetes. Menopause is a key inflection point—intervene early.',
  },
  {
    key: 'hs_crp',
    label: 'hs-CRP',
    unit: 'mg/L',
    category: 'metabolic',
    conventionalRange: { min: 0, max: 3.0 },
    optimalRange: { min: 0, max: 1.0 },
    context:
      'High-sensitivity C-reactive protein measures systemic inflammation. Cardiovascular risk rises post-menopause; optimal below 1.0 mg/L.',
    warningLow: undefined,
    warningHigh:
      'hs-CRP above 1.0 mg/L indicates elevated inflammation. Above 3.0 mg/L is high cardiovascular risk. Address sleep, diet, and oral estrogen timing.',
  },
  {
    key: 'homocysteine',
    label: 'Homocysteine',
    unit: 'umol/L',
    category: 'metabolic',
    conventionalRange: { min: 5, max: 15 },
    optimalRange: { min: 5, max: 8 },
    context:
      'Elevated homocysteine is linked to cardiovascular disease and cognitive decline. B vitamins (B12, folate, B6) and adequate estrogen help keep levels low.',
    warningLow: undefined,
    warningHigh:
      'Homocysteine above 8 umol/L may increase cardiovascular and cognitive risk. Check B12, folate, and MTHFR status; consider methylated B-complex.',
  },
  {
    key: 'prolactin',
    label: 'Prolactin',
    unit: 'ng/mL',
    category: 'metabolic',
    conventionalRange: { min: 2, max: 29 },
    optimalRange: { min: 2, max: 15 },
    context:
      'Prolactin is normally low in postmenopausal women. Elevated levels can suppress ovarian function, affect libido, and indicate pituitary issues.',
    warningLow:
      'Low prolactin is generally not clinically significant.',
    warningHigh:
      'Prolactin above 15–20 ng/mL warrants evaluation for prolactinoma, hypothyroidism, or certain medications. Can cause galactorrhea and low libido.',
  },
  {
    key: 'igf1',
    label: 'IGF-1',
    unit: 'ng/mL',
    category: 'metabolic',
    conventionalRange: { min: 80, max: 250 },
    optimalRange: { min: 120, max: 200 },
    context:
      'Insulin-like growth factor 1 reflects GH axis activity and declines with age. Reference ranges are age-dependent; mid-range is generally optimal for women in their 40s–50s.',
    warningLow:
      'Low IGF-1 may reflect GH deficiency, malnutrition, or hypothyroidism. Can affect body composition and bone density.',
    warningHigh:
      'High IGF-1 may indicate acromegaly or excessive GH supplementation. Associated with increased cancer risk at very high levels.',
  },

  // ── Lipid ─────────────────────────────────────────────────
  {
    key: 'total_cholesterol',
    label: 'Total Cholesterol',
    unit: 'mg/dL',
    category: 'lipid',
    conventionalRange: { min: 0, max: 200 },
    optimalRange: { min: 150, max: 200 },
    context:
      'Total cholesterol rises after menopause as estrogen\'s protective effect on lipids is lost. Target below 200 mg/dL; interpret alongside LDL, HDL, and triglycerides.',
    warningLow:
      'Very low cholesterol below 150 mg/dL is uncommon and may reflect malnutrition or hyperthyroidism.',
    warningHigh:
      'Total cholesterol above 200 mg/dL increases cardiovascular risk post-menopause. Lifestyle and possibly statin therapy should be discussed.',
  },
  {
    key: 'ldl',
    label: 'LDL Cholesterol',
    unit: 'mg/dL',
    category: 'lipid',
    conventionalRange: { min: 0, max: 100 },
    optimalRange: { min: 70, max: 100 },
    context:
      'LDL is the primary atherogenic lipoprotein. Menopause typically raises LDL 10–15%; transdermal estrogen may have a neutral or favorable effect compared to oral routes.',
    warningLow:
      'LDL below 70 mg/dL on statin therapy is often intentional for high-risk patients.',
    warningHigh:
      'LDL above 100 mg/dL is a major modifiable cardiovascular risk factor after menopause. Consider diet, exercise, and pharmacotherapy.',
  },
  {
    key: 'hdl',
    label: 'HDL Cholesterol',
    unit: 'mg/dL',
    category: 'lipid',
    conventionalRange: { min: 50, max: 200 },
    optimalRange: { min: 60, max: 90 },
    context:
      'HDL carries cholesterol away from arteries. Estrogen typically raises HDL; levels above 60 mg/dL are cardioprotective in women.',
    warningLow:
      'HDL below 50 mg/dL removes an important cardiovascular buffer. Exercise and moderate alcohol (if appropriate) can help raise HDL.',
    warningHigh:
      'Very high HDL above 90 mg/dL has been associated with increased mortality in some studies—discuss with your provider if persistently elevated.',
  },
  {
    key: 'triglycerides',
    label: 'Triglycerides',
    unit: 'mg/dL',
    category: 'lipid',
    conventionalRange: { min: 0, max: 150 },
    optimalRange: { min: 50, max: 100 },
    context:
      'Triglycerides often rise with menopause, insulin resistance, and oral estrogen. Fasting sample required for accurate interpretation.',
    warningLow:
      'Very low triglycerides are rarely clinically significant.',
    warningHigh:
      'Triglycerides above 150 mg/dL increase cardiovascular and pancreatitis risk. Address refined carbohydrates, alcohol, and insulin resistance.',
  },
];

export function getBiomarkerByKey(key: string): LabBiomarker | undefined {
  return LAB_BIOMARKERS.find((b) => b.key === key);
}

export const getLabBiomarker = getBiomarkerByKey;

export function getBiomarkersByCategory(category: LabCategory): LabBiomarker[] {
  return LAB_BIOMARKERS.filter((b) => b.category === category);
}

export function getLabRangeStatus(
  value: number,
  biomarker: LabBiomarker
): LabRangeStatus {
  const { optimalRange, conventionalRange } = biomarker;

  if (optimalRange && value >= optimalRange.min && value <= optimalRange.max) {
    return 'optimal';
  }

  if (conventionalRange) {
    if (value < conventionalRange.min) {
      return 'low';
    }
    if (value > conventionalRange.max) {
      return 'high';
    }
    return 'conventional';
  }

  if (optimalRange) {
    if (value < optimalRange.min) return 'low';
    if (value > optimalRange.max) return 'high';
  }

  return 'conventional';
}
