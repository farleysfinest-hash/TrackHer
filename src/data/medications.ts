import type {
  DeliveryMethod,
  HormoneCategory,
  MedicationFrequency,
} from '../types/database';
import type { MedicationOption } from '../types/medications';

export type { MedicationOption };

// ---------------------------------------------------------------------------
// Shared dose / frequency constants
// ---------------------------------------------------------------------------

const STANDARD_ESTRADIOL_PATCH_DOSES = [0.025, 0.0375, 0.05, 0.075, 0.1] as const;

const PATCH_APPLICATION_SITES = ['lower_abdomen', 'upper_buttock'] as const;

const WEEKLY_PATCH_FREQUENCY: MedicationFrequency[] = ['weekly'];

const DAILY_FREQUENCY: MedicationFrequency[] = ['daily'];

const CYCLIC_AND_DAILY_FREQUENCY: MedicationFrequency[] = ['daily', 'cyclic'];

const PELLET_DURATION_OPTIONS = [3, 4, 5, 6] as const;

// ---------------------------------------------------------------------------
// Estrogen patches
// ---------------------------------------------------------------------------

const ESTROGEN_PATCH_BASE = {
  hormoneCategory: 'estrogen' as const,
  deliveryMethod: 'patch' as const,
  isBioidentical: true,
  isCompounded: false,
  genericName: 'estradiol transdermal patch',
  doseOptions: {
    amounts: [...STANDARD_ESTRADIOL_PATCH_DOSES],
    unit: 'mg/day',
    description: 'Transdermal estradiol release rate; apply once weekly',
  },
  frequencyOptions: WEEKLY_PATCH_FREQUENCY,
  applicationSites: [...PATCH_APPLICATION_SITES],
  allowCustomDose: false,
} satisfies Partial<MedicationOption>;

const estrogenPatches: MedicationOption[] = [
  {
    ...ESTROGEN_PATCH_BASE,
    key: 'climara_patch',
    name: 'Climara',
    brandNames: ['Climara'],
    clinicalNotes:
      'Estradiol transdermal system by Bayer. Apply to clean, dry skin on lower abdomen or upper buttock. Rotate sites weekly. Avoid breasts, waistline, and irritated skin. May shower/swim with patch on.',
  },
  {
    ...ESTROGEN_PATCH_BASE,
    key: 'vivelle_dot_patch',
    name: 'Vivelle-Dot',
    brandNames: ['Vivelle-Dot', 'Vivelle'],
    clinicalNotes:
      'Small dot-matrix estradiol patch. Lower adhesive surface area than Climara; preferred by patients sensitive to patch adhesives. Apply weekly to lower abdomen or buttocks.',
  },
  {
    ...ESTROGEN_PATCH_BASE,
    key: 'minivelle_patch',
    name: 'Minivelle',
    brandNames: ['Minivelle'],
    clinicalNotes:
      'Ultra-low-profile estradiol patch, among the smallest available. Same estradiol matrix technology as Vivelle-Dot. Weekly application.',
  },
  {
    ...ESTROGEN_PATCH_BASE,
    key: 'alora_patch',
    name: 'Alora',
    brandNames: ['Alora'],
    clinicalNotes:
      'Estradiol transdermal system. Weekly application. Contains alcohol in adhesive; patients with alcohol sensitivity should be monitored for local reactions.',
  },
  {
    ...ESTROGEN_PATCH_BASE,
    key: 'dotti_patch',
    name: 'Dotti',
    brandNames: ['Dotti'],
    clinicalNotes:
      'Generic bioequivalent to Vivelle-Dot. Estradiol transdermal system applied weekly. Cost-effective alternative to brand-name dot patches.',
  },
  {
    ...ESTROGEN_PATCH_BASE,
    key: 'lyllana_patch',
    name: 'Lyllana',
    brandNames: ['Lyllana'],
    clinicalNotes:
      'Authorized generic estradiol patch equivalent to Vivelle-Dot/Minivelle. Weekly transdermal estradiol delivery.',
  },
  {
    key: 'menostar_patch',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'patch',
    name: 'Menostar',
    brandNames: ['Menostar'],
    genericName: 'estradiol transdermal patch',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.014],
      unit: 'mg/day',
      description: 'Ultra-low dose (14 mcg/day); FDA-approved for osteoporosis prevention in postmenopausal women',
    },
    frequencyOptions: WEEKLY_PATCH_FREQUENCY,
    applicationSites: [...PATCH_APPLICATION_SITES],
    clinicalNotes:
      'Lowest available estradiol patch dose. Primarily indicated for bone protection rather than vasomotor symptom relief. May be combined with other estrogen routes for symptom management.',
    allowCustomDose: false,
  },
  {
    ...ESTROGEN_PATCH_BASE,
    key: 'estraderm_patch',
    name: 'Estraderm',
    brandNames: ['Estraderm', 'Estraderm MX'],
    clinicalNotes:
      'Estradiol transdermal system; discontinued in the US market but still referenced in clinical literature and used internationally. Weekly application.',
  },
];

// ---------------------------------------------------------------------------
// Estrogen topical (gel / cream)
// ---------------------------------------------------------------------------

const estrogenTopical: MedicationOption[] = [
  {
    key: 'estrogel',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'gel',
    name: 'EstroGel',
    brandNames: ['EstroGel'],
    genericName: 'estradiol gel',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.75, 1.5, 2.25],
      unit: 'mg',
      description: '0.75 mg estradiol per pump actuation; typical 1–3 pumps daily',
    },
    frequencyOptions: DAILY_FREQUENCY,
    applicationSites: ['upper_arm', 'shoulder', 'forearm'],
    clinicalNotes:
      'Alcohol-based estradiol gel applied to one arm daily. Allow to dry 5 minutes before dressing. Do not wash application site for 1 hour. Avoid transfer to others via skin contact.',
    allowCustomDose: true,
  },
  {
    key: 'elestrin',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'gel',
    name: 'Elestrin',
    brandNames: ['Elestrin'],
    genericName: 'estradiol gel',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.52, 1.04, 1.56, 2.08, 2.6],
      unit: 'mg',
      description: '0.06% gel; 0.52 mg estradiol per metered pump actuation',
    },
    frequencyOptions: DAILY_FREQUENCY,
    applicationSites: ['upper_arm', 'forearm'],
    clinicalNotes:
      'Estradiol gel in metered-dose pump. Apply to upper arm once daily. Contains ethanol; allow to dry completely before covering with clothing.',
    allowCustomDose: true,
  },
  {
    key: 'divigel',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'gel',
    name: 'Divigel',
    brandNames: ['Divigel'],
    genericName: 'estradiol gel',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.25, 0.5, 0.75, 1.0, 1.25],
      unit: 'mg',
      description: '0.1% estradiol gel in unit-dose packets',
    },
    frequencyOptions: DAILY_FREQUENCY,
    applicationSites: ['upper_thigh', 'lower_abdomen'],
    clinicalNotes:
      'Unit-dose estradiol gel packets for precise dosing. Apply to clean, dry skin on thigh or abdomen once daily. Rub in gently until absorbed.',
    allowCustomDose: false,
  },
  {
    key: 'estradiol_compounded_cream',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'cream',
    name: 'Compounded Estradiol Cream',
    brandNames: [],
    genericName: 'estradiol cream (compounded)',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [0.5, 1, 2, 4],
      unit: 'mg/g',
      description: 'Typical compounded concentrations 0.5–4 mg/g; dose by grams applied',
    },
    frequencyOptions: DAILY_FREQUENCY,
    applicationSites: ['inner_wrist', 'inner_arm', 'vulva', 'vaginal'],
    clinicalNotes:
      'Custom-compounded bioidentical estradiol in transdermal cream base. Concentration and base (lipoderm, pluronic lecithin organogel, etc.) vary by pharmacy. Absorption depends on base vehicle and application site.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Estrogen spray
// ---------------------------------------------------------------------------

const estrogenSpray: MedicationOption[] = [
  {
    key: 'evamist',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'spray',
    name: 'Evamist',
    brandNames: ['Evamist'],
    genericName: 'estradiol transdermal spray',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [1.53, 3.06, 4.59],
      unit: 'mg',
      description: '1.53 mg estradiol per spray; typical 1–3 sprays daily to forearm',
    },
    frequencyOptions: DAILY_FREQUENCY,
    applicationSites: ['forearm'],
    clinicalNotes:
      'Estradiol transdermal spray applied to forearm once daily. Allow to dry before covering. Risk of transference to others via skin contact — cover site or wash before contact. Do not apply near breast tissue.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Estrogen oral
// ---------------------------------------------------------------------------

const estrogenOral: MedicationOption[] = [
  {
    key: 'estrace_oral',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'oral_tablet',
    name: 'Estrace',
    brandNames: ['Estrace'],
    genericName: 'estradiol oral tablet',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.5, 1, 2],
      unit: 'mg',
      description: 'Micronized estradiol tablets; take with food to reduce nausea',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'Oral micronized estradiol undergoes significant first-pass hepatic metabolism, elevating estrone relative to estradiol. Associated with higher VTE risk compared to transdermal routes. Consider transdermal if risk factors present.',
    allowCustomDose: false,
  },
  {
    key: 'estradiol_oral_generic',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'oral_tablet',
    name: 'Estradiol (Generic Oral)',
    brandNames: [],
    genericName: 'estradiol oral tablet',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.5, 1, 2],
      unit: 'mg',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'Generic micronized estradiol tablets bioequivalent to Estrace. Same considerations regarding first-pass metabolism and VTE risk as brand oral estradiol.',
    allowCustomDose: false,
  },
];

// ---------------------------------------------------------------------------
// Estrogen injection
// ---------------------------------------------------------------------------

const estrogenInjection: MedicationOption[] = [
  {
    key: 'delestrogen',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'injection',
    name: 'Delestrogen',
    brandNames: ['Delestrogen'],
    genericName: 'estradiol valerate injection',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [10, 20, 40],
      unit: 'mg',
      description: '10, 20, or 40 mg/mL IM injection; typical 10–40 mg every 1–4 weeks',
    },
    frequencyOptions: ['every_two_weeks', 'every_three_weeks', 'every_four_weeks', 'monthly'],
    clinicalNotes:
      'Estradiol valerate in oil for intramuscular injection. Long-acting ester provides sustained estradiol levels. Used off-label in gender-affirming care and when other routes are not tolerated. Monitor estradiol levels 3–5 days post-injection at trough.',
    allowCustomDose: true,
  },
  {
    key: 'depo_estradiol',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'injection',
    name: 'Depo-Estradiol',
    brandNames: ['Depo-Estradiol'],
    genericName: 'estradiol cypionate injection',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [1, 2, 3, 5],
      unit: 'mg',
      description: '5 mg/mL IM injection; typical 1–5 mg every 1–4 weeks',
    },
    frequencyOptions: ['every_two_weeks', 'every_three_weeks', 'every_four_weeks', 'monthly'],
    clinicalNotes:
      'Estradiol cypionate in oil; longer half-life than valerate. Less commonly used in menopause management. Monitor serum estradiol at appropriate interval for dosing schedule.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Estrogen pellets
// ---------------------------------------------------------------------------

const estrogenPellets: MedicationOption[] = [
  {
    key: 'estradiol_pellet_compounded',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'pellet',
    name: 'Compounded Estradiol Pellet',
    brandNames: [],
    genericName: 'estradiol subcutaneous pellet (compounded)',
    isBioidentical: true,
    isCompounded: true,
    isPellet: true,
    doseOptions: {
      amounts: [6.25, 12.5, 18.75, 25],
      unit: 'mg',
      description: 'Typical pellet doses 6.25–25 mg; release over 3–6 months',
    },
    frequencyOptions: ['every_three_months', 'every_four_months', 'every_five_months', 'every_six_months'],
    durationOptions: [...PELLET_DURATION_OPTIONS],
    clinicalNotes:
      'Subcutaneous estradiol pellets inserted in hip/buttock fat. Steady-state release over months. Not FDA-approved; compounding pharmacy preparation. Monitor estradiol levels 4–6 weeks post-insertion. Trough levels guide re-dosing.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Estrogen troches
// ---------------------------------------------------------------------------

const estrogenTroches: MedicationOption[] = [
  {
    key: 'estradiol_troche_compounded',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'troche',
    name: 'Compounded Estradiol Troche',
    brandNames: [],
    genericName: 'estradiol troche (compounded)',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [0.25, 0.5, 1, 2],
      unit: 'mg',
      description: 'Sublingual/buccal troche; dissolve over 15–30 minutes',
    },
    frequencyOptions: ['daily', 'twice_daily'],
    clinicalNotes:
      'Compounded estradiol troche for sublingual or buccal absorption, partially bypassing first-pass metabolism. Popular in functional medicine practices. Absorption and estradiol:estrone ratio vary; monitor levels.',
    allowCustomDose: true,
  },
  {
    key: 'biest_troche_compounded',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'troche',
    name: 'Biest Troche',
    brandNames: [],
    genericName: 'bi-est (estradiol + estriol) troche',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [0.5, 1, 2, 4],
      unit: 'mg',
      description: 'Combined estradiol + estriol; common ratios 80:20, 70:30, or 50:50 (E2:E3)',
    },
    frequencyOptions: ['daily', 'twice_daily'],
    clinicalNotes:
      'Compounded bi-est (bioidentical estrogens) combining estradiol and estriol. Estriol component thought to have selective estrogen receptor effects with potentially lower endometrial stimulation. Evidence base limited; monitor symptomatic response and endometrial safety in women with uterus.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Estrogen vaginal
// ---------------------------------------------------------------------------

const estrogenVaginal: MedicationOption[] = [
  {
    key: 'femring',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'vaginal_ring',
    name: 'Femring',
    brandNames: ['Femring'],
    genericName: 'estradiol acetate vaginal ring',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.05, 0.1],
      unit: 'mg/day',
      description: 'Systemic estradiol ring; replaced every 90 days',
    },
    frequencyOptions: ['every_three_months'],
    durationOptions: [3],
    clinicalNotes:
      'Estradiol acetate vaginal ring providing systemic estrogen levels. Distinct from local-only rings (Estring). Treats both vasomotor and GSM symptoms. Replace every 3 months.',
    allowCustomDose: false,
  },
  {
    key: 'estring',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'vaginal_ring',
    name: 'Estring',
    brandNames: ['Estring'],
    genericName: 'estradiol vaginal ring',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.0075],
      unit: 'mg/day',
      description: '2 mg ring releasing ~7.5 mcg/day locally; replaced every 90 days',
    },
    frequencyOptions: ['every_three_months'],
    durationOptions: [3],
    clinicalNotes:
      'Low-dose local estradiol ring for genitourinary syndrome of menopause (GSM). Minimal systemic absorption at 7.5 mcg/day. Safe for most breast cancer survivors per oncologist guidance. Replace every 90 days.',
    allowCustomDose: false,
  },
  {
    key: 'estrace_vaginal_cream',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'vaginal_cream',
    name: 'Estrace Vaginal Cream',
    brandNames: ['Estrace Vaginal Cream'],
    genericName: 'estradiol vaginal cream',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.5, 1, 1.5, 2],
      unit: 'mg',
      description: '0.1 mg estradiol per gram; applicator delivers 0.5–2 mg per dose',
    },
    frequencyOptions: ['daily', 'twice_weekly', 'three_times_weekly'],
    clinicalNotes:
      'Estradiol vaginal cream for GSM. Higher doses (2 g daily) produce systemic levels; low maintenance doses (0.5 g 1–3×/week) are primarily local. Use lowest effective dose for symptom relief.',
    allowCustomDose: true,
  },
  {
    key: 'premarin_vaginal_cream',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'vaginal_cream',
    name: 'Premarin Vaginal Cream',
    brandNames: ['Premarin Vaginal Cream'],
    genericName: 'conjugated estrogens vaginal cream',
    isBioidentical: false,
    isCompounded: false,
    doseOptions: {
      amounts: [0.625, 1.25],
      unit: 'mg',
      description: '0.625 mg conjugated estrogens per gram; cyclic or maintenance dosing',
    },
    frequencyOptions: ['daily', 'twice_weekly', 'three_times_weekly', 'cyclic'],
    clinicalNotes:
      'Conjugated equine estrogens vaginal cream. Non-bioidentical estrogen mixture. Effective for GSM; maintenance dosing typically 0.5 g twice weekly after initial loading phase.',
    allowCustomDose: true,
  },
  {
    key: 'vagifem',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'vaginal_tablet',
    name: 'Vagifem / Yuvafem',
    brandNames: ['Vagifem', 'Yuvafem'],
    genericName: 'estradiol vaginal tablet',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [10],
      unit: 'mcg',
      description: '10 mcg estradiol vaginal insert; daily × 2 weeks then twice weekly',
    },
    frequencyOptions: ['daily', 'twice_weekly'],
    clinicalNotes:
      'Ultra-low-dose local estradiol tablet for GSM. Yuvafem is the authorized generic. Minimal systemic absorption. Insert with applicator at bedtime. Loading dose daily for 2 weeks, then maintenance twice weekly.',
    allowCustomDose: false,
  },
];

// ---------------------------------------------------------------------------
// Estrogen non-bioidentical (oral)
// ---------------------------------------------------------------------------

const estrogenNonBioidentical: MedicationOption[] = [
  {
    key: 'premarin_oral',
    hormoneCategory: 'estrogen',
    deliveryMethod: 'oral_tablet',
    name: 'Premarin',
    brandNames: ['Premarin'],
    genericName: 'conjugated estrogens oral tablet',
    isBioidentical: false,
    isCompounded: false,
    doseOptions: {
      amounts: [0.3, 0.45, 0.625, 0.9, 1.25],
      unit: 'mg',
      description: 'Conjugated equine estrogens (CEE); 0.625 mg ≈ 1 mg oral estradiol',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'Conjugated equine estrogens derived from pregnant mare urine. Non-bioidentical estrogen mixture (estrone sulfate, equilin sulfate, others). Higher VTE and gallbladder disease risk vs transdermal bioidentical estradiol. Still widely used; WHI trial used Premarin 0.625 mg.',
    allowCustomDose: false,
  },
];

// ---------------------------------------------------------------------------
// Progesterone oral
// ---------------------------------------------------------------------------

const progesteroneOral: MedicationOption[] = [
  {
    key: 'prometrium',
    hormoneCategory: 'progesterone',
    deliveryMethod: 'oral_capsule',
    name: 'Prometrium',
    brandNames: ['Prometrium'],
    genericName: 'micronized progesterone oral capsule',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [100, 200, 300],
      unit: 'mg',
      description: 'Micronized progesterone in peanut oil capsules; take at bedtime with food',
    },
    frequencyOptions: CYCLIC_AND_DAILY_FREQUENCY,
    clinicalNotes:
      'Bioidentical micronized progesterone. Continuous: 100–200 mg nightly for endometrial protection with systemic estrogen. Cyclic: 200 mg nightly days 14–28 of calendar month (or days 1–12 of estrogen cycle). May cause drowsiness — take at bedtime. Contains peanut oil.',
    allowCustomDose: false,
  },
  {
    key: 'progesterone_oral_generic',
    hormoneCategory: 'progesterone',
    deliveryMethod: 'oral_capsule',
    name: 'Micronized Progesterone (Generic)',
    brandNames: [],
    genericName: 'micronized progesterone oral capsule',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [100, 200, 300],
      unit: 'mg',
    },
    frequencyOptions: CYCLIC_AND_DAILY_FREQUENCY,
    clinicalNotes:
      'Generic micronized progesterone capsules bioequivalent to Prometrium. Same continuous and cyclic scheduling options. Preferred progestogen for endometrial protection per NAMS guidelines.',
    allowCustomDose: false,
  },
];

// ---------------------------------------------------------------------------
// Progesterone vaginal
// ---------------------------------------------------------------------------

const progesteroneVaginal: MedicationOption[] = [
  {
    key: 'endometrin',
    hormoneCategory: 'progesterone',
    deliveryMethod: 'vaginal_tablet',
    name: 'Endometrin',
    brandNames: ['Endometrin'],
    genericName: 'progesterone vaginal insert',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [100],
      unit: 'mg',
      description: '100 mg vaginal insert; typically 2–3 times daily when used for luteal support',
    },
    frequencyOptions: ['daily', 'twice_daily', 'three_times_daily'],
    clinicalNotes:
      'Micronized progesterone vaginal insert. Primarily used in fertility treatment but sometimes prescribed off-label for menopausal progestogen delivery. Vaginal route achieves higher uterine concentrations with lower systemic levels than oral.',
    allowCustomDose: false,
  },
  {
    key: 'crinone',
    hormoneCategory: 'progesterone',
    deliveryMethod: 'vaginal_cream',
    name: 'Crinone',
    brandNames: ['Crinone'],
    genericName: 'progesterone vaginal gel',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [45, 90],
      unit: 'mg',
      description: '4% gel (45 mg) or 8% gel (90 mg) per applicator',
    },
    frequencyOptions: ['daily', 'twice_daily'],
    clinicalNotes:
      'Progesterone vaginal gel in single-use applicators. Bioadhesive gel stays in place after application. Used in fertility protocols; off-label for menopausal progestogen supplementation via vaginal route.',
    allowCustomDose: false,
  },
  {
    key: 'progesterone_vaginal_suppository_compounded',
    hormoneCategory: 'progesterone',
    deliveryMethod: 'vaginal_suppository',
    name: 'Compounded Progesterone Vaginal Suppository',
    brandNames: [],
    genericName: 'progesterone vaginal suppository (compounded)',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [100, 200, 400],
      unit: 'mg',
      description: 'Typical compounded vaginal suppository doses 100–400 mg',
    },
    frequencyOptions: ['daily', 'twice_daily', 'cyclic'],
    clinicalNotes:
      'Compounded micronized progesterone vaginal suppositories. Used off-label for endometrial protection or luteal-phase supplementation. Vaginal route provides high uterine progesterone exposure with modest systemic absorption.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Progesterone rectal
// ---------------------------------------------------------------------------

const progesteroneRectal: MedicationOption[] = [
  {
    key: 'progesterone_rectal_suppository_compounded',
    hormoneCategory: 'progesterone',
    deliveryMethod: 'rectal',
    name: 'Compounded Progesterone Rectal Suppository',
    brandNames: [],
    genericName: 'progesterone rectal suppository (compounded)',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [100, 200, 400],
      unit: 'mg',
      description: 'Typical rectal suppository doses 100–400 mg at bedtime',
    },
    frequencyOptions: ['daily', 'cyclic'],
    clinicalNotes:
      'Compounded progesterone rectal suppositories. Rectal absorption bypasses first-pass hepatic metabolism, producing higher serum progesterone than equivalent oral dose. Used when oral progesterone is not tolerated or in fertility protocols.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Progesterone cream
// ---------------------------------------------------------------------------

const progesteroneCream: MedicationOption[] = [
  {
    key: 'progesterone_cream_otc_compounded',
    hormoneCategory: 'progesterone',
    deliveryMethod: 'cream',
    name: 'Progesterone Cream (OTC / Compounded)',
    brandNames: ['Progest', 'Pro-Gest'],
    genericName: 'progesterone transdermal cream',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [20, 40, 100],
      unit: 'mg/g',
      description: 'OTC creams often 20 mg/g (1.6% USP); compounded 40–100 mg/g available',
    },
    frequencyOptions: DAILY_FREQUENCY,
    applicationSites: ['inner_arm', 'inner_thigh', 'neck', 'chest'],
    clinicalNotes:
      'OTC and compounded progesterone creams. Serum progesterone levels after topical application are unpredictable and often insufficient for endometrial protection with systemic estrogen. Not recommended as sole progestogen for women with uterus per NAMS/ACOG. May provide symptomatic relief for some patients.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Progesterone pellet
// ---------------------------------------------------------------------------

const progesteronePellet: MedicationOption[] = [
  {
    key: 'progesterone_pellet_compounded',
    hormoneCategory: 'progesterone',
    deliveryMethod: 'pellet',
    name: 'Compounded Progesterone Pellet',
    brandNames: [],
    genericName: 'progesterone subcutaneous pellet (compounded)',
    isBioidentical: true,
    isCompounded: true,
    isPellet: true,
    doseOptions: {
      amounts: [25, 50, 100, 200],
      unit: 'mg',
      description: 'Typical doses 25–200 mg; release over 3–6 months',
    },
    frequencyOptions: ['every_three_months', 'every_four_months', 'every_five_months', 'every_six_months'],
    durationOptions: [...PELLET_DURATION_OPTIONS],
    clinicalNotes:
      'Subcutaneous progesterone pellet, often combined with estradiol and/or testosterone pellets. Not FDA-approved. Endometrial protection adequacy not established — use with caution in women with uterus. Monitor symptomatic response.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Combination oral
// ---------------------------------------------------------------------------

const combinationOral: MedicationOption[] = [
  {
    key: 'bijuva',
    hormoneCategory: 'combination',
    deliveryMethod: 'oral_capsule',
    name: 'Bijuva',
    brandNames: ['Bijuva'],
    genericName: 'estradiol and progesterone oral capsule',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [0.5, 1],
      unit: 'mg estradiol',
      description: '0.5/100 mg or 1/100 mg estradiol/progesterone per capsule; fixed combination',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'FDA-approved oral combination of bioidentical estradiol and micronized progesterone in a single capsule (with 100 mg progesterone). First and only FDA-approved oral bioidentical combination. Take at bedtime with food. Suitable for women with uterus — progesterone component provides endometrial protection.',
    allowCustomDose: false,
  },
];

// ---------------------------------------------------------------------------
// Combination patches
// ---------------------------------------------------------------------------

const combinationPatches: MedicationOption[] = [
  {
    key: 'climara_pro',
    hormoneCategory: 'combination',
    deliveryMethod: 'patch',
    name: 'Climara Pro',
    brandNames: ['Climara Pro'],
    genericName: 'estradiol/levonorgestrel transdermal patch',
    isBioidentical: false,
    isCompounded: false,
    doseOptions: {
      amounts: [0.045, 0.05],
      unit: 'mg/day estradiol',
      description: '0.045/0.015 or 0.05/0.025 mg/day estradiol/levonorgestrel; weekly patch',
    },
    frequencyOptions: WEEKLY_PATCH_FREQUENCY,
    applicationSites: [...PATCH_APPLICATION_SITES],
    clinicalNotes:
      'Contains bioidentical estradiol plus synthetic progestin levonorgestrel. Levonorgestrel is a 19-nortestosterone derivative — not bioidentical progesterone. Provides endometrial protection without separate progestogen. Apply weekly. Monitor for androgenic side effects from levonorgestrel component.',
    allowCustomDose: false,
  },
  {
    key: 'combipatch',
    hormoneCategory: 'combination',
    deliveryMethod: 'patch',
    name: 'Combipatch',
    brandNames: ['Combipatch'],
    genericName: 'estradiol/medroxyprogesterone transdermal patch',
    isBioidentical: false,
    isCompounded: false,
    doseOptions: {
      amounts: [0.05],
      unit: 'mg/day estradiol',
      description: '0.05/0.14 or 0.05/0.25 mg/day estradiol/MPA; replaced twice weekly',
    },
    frequencyOptions: ['twice_weekly'],
    applicationSites: [...PATCH_APPLICATION_SITES],
    clinicalNotes:
      'Contains bioidentical estradiol plus synthetic progestin medroxyprogesterone acetate (MPA). MPA is not bioidentical progesterone — associated with different metabolic and mood profiles than micronized progesterone in observational data. Patch replaced every 3–4 days (twice weekly).',
    allowCustomDose: false,
  },
];

// ---------------------------------------------------------------------------
// Testosterone cream
// ---------------------------------------------------------------------------

const testosteroneCream: MedicationOption[] = [
  {
    key: 'testosterone_cream_compounded',
    hormoneCategory: 'testosterone',
    deliveryMethod: 'cream',
    name: 'Compounded Testosterone Cream',
    brandNames: [],
    genericName: 'testosterone transdermal cream (compounded)',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [0.5, 1, 2, 5, 10, 20],
      unit: 'mg/g',
      description: 'Concentrations 0.5–20 mg/g; typical female dose 0.5–2 mg testosterone daily',
    },
    frequencyOptions: DAILY_FREQUENCY,
    applicationSites: ['inner_thigh', 'inner_arm', 'vulva', 'labia'],
    clinicalNotes:
      'Compounded bioidentical testosterone cream for female HSDD or menopausal symptoms. Typical daily dose 0.5–2 mg applied to skin or vulva. Monitor total and free testosterone — target upper quartile of premenopausal range. Risk of transference; wash hands after application.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Testosterone troche
// ---------------------------------------------------------------------------

const testosteroneTroche: MedicationOption[] = [
  {
    key: 'testosterone_troche_compounded',
    hormoneCategory: 'testosterone',
    deliveryMethod: 'troche',
    name: 'Compounded Testosterone Troche',
    brandNames: [],
    genericName: 'testosterone troche (compounded)',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [0.5, 1, 2, 5, 10],
      unit: 'mg',
      description: 'Sublingual/buccal troche; typical female dose 0.5–5 mg daily',
    },
    frequencyOptions: ['daily', 'twice_daily'],
    clinicalNotes:
      'Compounded testosterone troche for sublingual absorption. Used off-label for low libido and menopausal symptoms. Serum levels can be variable; monitor total and free testosterone 2–4 hours after dosing. Not FDA-approved for women.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Testosterone pellet
// ---------------------------------------------------------------------------

const testosteronePellet: MedicationOption[] = [
  {
    key: 'testosterone_pellet_compounded',
    hormoneCategory: 'testosterone',
    deliveryMethod: 'pellet',
    name: 'Compounded Testosterone Pellet',
    brandNames: [],
    genericName: 'testosterone subcutaneous pellet (compounded)',
    isBioidentical: true,
    isCompounded: true,
    isPellet: true,
    doseOptions: {
      amounts: [12.5, 25, 50, 75, 100],
      unit: 'mg',
      description: 'Typical female doses 12.5–100 mg; release over 3–6 months',
    },
    frequencyOptions: ['every_three_months', 'every_four_months', 'every_five_months', 'every_six_months'],
    durationOptions: [...PELLET_DURATION_OPTIONS],
    clinicalNotes:
      'Subcutaneous testosterone pellet insertion. Often combined with estradiol pellets. Monitor testosterone levels 4–6 weeks post-insertion; levels may exceed premenopausal range. Watch for acne, hair growth, voice changes. Not FDA-approved for women.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Testosterone injection
// ---------------------------------------------------------------------------

const testosteroneInjection: MedicationOption[] = [
  {
    key: 'testosterone_cypionate_injection',
    hormoneCategory: 'testosterone',
    deliveryMethod: 'injection',
    name: 'Testosterone Cypionate',
    brandNames: ['Depo-Testosterone'],
    genericName: 'testosterone cypionate injection',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [1, 2, 5, 10],
      unit: 'mg',
      description: 'Female dosing typically 1–10 mg IM or SQ weekly to every 2 weeks (off-label)',
    },
    frequencyOptions: ['weekly', 'every_two_weeks'],
    clinicalNotes:
      'Testosterone cypionate injection used off-label at micro-doses for female HSDD and menopausal symptoms. Typical 1–5 mg weekly or 2–10 mg every 2 weeks subcutaneously or intramuscularly. FDA-approved products dosed for males — requires careful compounding or volumetric micro-dosing. Monitor hematocrit, lipids, and testosterone levels.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Combination pellets
// ---------------------------------------------------------------------------

const combinationPellets: MedicationOption[] = [
  {
    key: 'combination_pellet_e2_t',
    hormoneCategory: 'combination',
    deliveryMethod: 'pellet',
    name: 'Compounded Estradiol + Testosterone Pellet',
    brandNames: [],
    genericName: 'estradiol/testosterone subcutaneous pellet (compounded)',
    isBioidentical: true,
    isCompounded: true,
    isPellet: true,
    doseOptions: {
      amounts: [12.5, 25],
      unit: 'mg estradiol component',
      description: 'Common combinations e.g. 12.5 mg E2 + 50 mg T or 25 mg E2 + 100 mg T',
    },
    frequencyOptions: ['every_three_months', 'every_four_months', 'every_five_months', 'every_six_months'],
    durationOptions: [...PELLET_DURATION_OPTIONS],
    clinicalNotes:
      'Combined estradiol and testosterone subcutaneous pellets inserted simultaneously. Popular in hormone pellet practices. Women with uterus need separate progestogen for endometrial protection unless progesterone pellet included. Monitor estradiol, testosterone, and hematocrit.',
    allowCustomDose: true,
  },
  {
    key: 'combination_pellet_e2_t_p4',
    hormoneCategory: 'combination',
    deliveryMethod: 'pellet',
    name: 'Compounded Estradiol + Testosterone + Progesterone Pellet',
    brandNames: [],
    genericName: 'estradiol/testosterone/progesterone subcutaneous pellet (compounded)',
    isBioidentical: true,
    isCompounded: true,
    isPellet: true,
    doseOptions: {
      amounts: [12.5, 25],
      unit: 'mg estradiol component',
      description: 'Triple-hormone pellets with estradiol, testosterone, and progesterone components',
    },
    frequencyOptions: ['every_three_months', 'every_four_months', 'every_five_months', 'every_six_months'],
    durationOptions: [...PELLET_DURATION_OPTIONS],
    clinicalNotes:
      'Three-hormone pellet combination with estradiol, testosterone, and progesterone. Progesterone component intended for endometrial protection in women with uterus, though adequate protection not established in clinical trials. Monitor all hormone levels and endometrial thickness.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Oxytocin
// ---------------------------------------------------------------------------

const oxytocin: MedicationOption[] = [
  {
    key: 'oxytocin_troche_compounded',
    hormoneCategory: 'oxytocin',
    deliveryMethod: 'troche',
    name: 'Compounded Oxytocin Troche',
    brandNames: [],
    genericName: 'oxytocin troche (compounded)',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [10, 20, 40, 80, 100],
      unit: 'IU',
      description: 'Sublingual troche 10–100 IU; dissolve over 15–30 minutes',
    },
    frequencyOptions: ['daily', 'as_needed'],
    clinicalNotes:
      'Compounded oxytocin troche used off-label for mood, libido, and social bonding symptoms. Sublingual absorption bypasses GI degradation. Evidence in menopause limited to small studies. Not FDA-approved for oral/sublingual use. May cause uterine contractions — caution in pregnancy.',
    allowCustomDose: true,
  },
  {
    key: 'oxytocin_nasal_spray_compounded',
    hormoneCategory: 'oxytocin',
    deliveryMethod: 'nasal_spray',
    name: 'Compounded Oxytocin Nasal Spray',
    brandNames: [],
    genericName: 'oxytocin nasal spray (compounded)',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [10, 20, 40],
      unit: 'IU per spray',
      description: '10–40 IU per spray; typical 1–2 sprays as needed or daily',
    },
    frequencyOptions: ['daily', 'as_needed'],
    clinicalNotes:
      'Compounded intranasal oxytocin for rapid absorption. Studied for mood, anxiety, and sexual function. Intranasal route mimics physiological oxytocin release patterns. Refrigeration may be required depending on formulation. Off-label use; monitor for headache and nasal irritation.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// DHEA
// ---------------------------------------------------------------------------

const dhea: MedicationOption[] = [
  {
    key: 'dhea_oral',
    hormoneCategory: 'dhea',
    deliveryMethod: 'oral_capsule',
    name: 'DHEA (Oral)',
    brandNames: ['DHEA', 'dehydroepiandrosterone'],
    genericName: 'dehydroepiandrosterone oral capsule',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [5, 10, 25, 50, 100],
      unit: 'mg',
      description: 'OTC and prescription DHEA 5–100 mg daily',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'DHEA is a precursor hormone converting to androgens and estrogens peripherally. Levels decline with age. Evidence for menopausal symptom relief mixed. May improve bone density and sexual function in some studies. Monitor DHEA-S, testosterone, and estradiol. Contraindicated in hormone-sensitive cancers.',
    allowCustomDose: true,
  },
  {
    key: 'intrarosa',
    hormoneCategory: 'dhea',
    deliveryMethod: 'vaginal_suppository',
    name: 'Intrarosa',
    brandNames: ['Intrarosa'],
    genericName: 'prasterone vaginal insert',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [6.5],
      unit: 'mg',
      description: '6.5 mg prasterone (DHEA) vaginal insert daily at bedtime',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'FDA-approved prasterone (DHEA) vaginal insert for moderate-to-severe dyspareunia due to GSM. Converts locally to estrogen and testosterone in vaginal tissue with minimal systemic hormone elevation. Insert at bedtime with applicator. Onset of effect may take 8–12 weeks.',
    allowCustomDose: false,
  },
];

// ---------------------------------------------------------------------------
// Supplements — Saw Palmetto
// ---------------------------------------------------------------------------

const sawPalmetto: MedicationOption[] = [
  {
    key: 'saw_palmetto_160mg',
    hormoneCategory: 'supplement',
    deliveryMethod: 'oral_capsule',
    name: 'Saw Palmetto 160 mg',
    brandNames: ['Saw Palmetto', 'Prostagenix'],
    genericName: 'serenoa repens extract',
    isBioidentical: false,
    isCompounded: false,
    doseOptions: {
      amounts: [160],
      unit: 'mg',
      description: 'Standardized extract 160 mg once or twice daily',
    },
    frequencyOptions: ['daily', 'twice_daily'],
    clinicalNotes:
      'Saw palmetto (Serenoa repens) botanical supplement. Primarily studied for BPH in men; used off-label for hormonal balance and hair loss in women. May have mild anti-androgenic effects via 5-alpha-reductase inhibition. Evidence in menopausal women limited.',
    allowCustomDose: false,
  },
  {
    key: 'saw_palmetto_320mg',
    hormoneCategory: 'supplement',
    deliveryMethod: 'oral_capsule',
    name: 'Saw Palmetto 320 mg',
    brandNames: ['Saw Palmetto'],
    genericName: 'serenoa repens extract',
    isBioidentical: false,
    isCompounded: false,
    doseOptions: {
      amounts: [320],
      unit: 'mg',
      description: 'Standardized extract 320 mg once daily',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'Higher-dose saw palmetto standardized extract, typically 320 mg once daily. Same mechanism as 160 mg formulation. May interact with hormonal therapies due to anti-androgenic properties.',
    allowCustomDose: false,
  },
];

// ---------------------------------------------------------------------------
// Supplements — Pregnenolone
// ---------------------------------------------------------------------------

const pregnenolone: MedicationOption[] = [
  {
    key: 'pregnenolone_oral',
    hormoneCategory: 'supplement',
    deliveryMethod: 'oral_capsule',
    name: 'Pregnenolone',
    brandNames: ['Pregnenolone'],
    genericName: 'pregnenolone oral capsule',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [5, 10, 25, 50, 100],
      unit: 'mg',
      description: 'OTC pregnenolone 5–100 mg daily',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'Pregnenolone is a neurosteroid precursor to progesterone, DHEA, and other hormones. Used off-label for cognitive function, mood, and energy. Converts peripherally to other steroid hormones — may affect estrogen and progesterone levels. Limited clinical trial data in menopause.',
    allowCustomDose: true,
  },
];

// ---------------------------------------------------------------------------
// Thyroid
// ---------------------------------------------------------------------------

const thyroid: MedicationOption[] = [
  {
    key: 'levothyroxine',
    hormoneCategory: 'thyroid',
    deliveryMethod: 'oral_tablet',
    name: 'Levothyroxine',
    brandNames: ['Synthroid', 'Levoxyl', 'Tirosint', 'Unithroid'],
    genericName: 'levothyroxine sodium',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [25, 50, 75, 88, 100, 112, 125, 137, 150, 175, 200],
      unit: 'mcg',
      description: 'T4 replacement; take on empty stomach 30–60 min before food',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'Synthetic T4 (levothyroxine) for hypothyroidism. Menopausal women have increased hypothyroidism prevalence. Take consistently — same brand if possible — on empty stomach. Monitor TSH 6–8 weeks after dose changes. Target TSH 0.5–2.5 mIU/L for most patients.',
    allowCustomDose: false,
  },
  {
    key: 'liothyronine',
    hormoneCategory: 'thyroid',
    deliveryMethod: 'oral_tablet',
    name: 'Liothyronine (T3)',
    brandNames: ['Cytomel'],
    genericName: 'liothyronine sodium',
    isBioidentical: true,
    isCompounded: false,
    doseOptions: {
      amounts: [5, 10, 25],
      unit: 'mcg',
      description: 'Synthetic T3; shorter half-life than T4 — may split dose',
    },
    frequencyOptions: ['daily', 'twice_daily'],
    clinicalNotes:
      'Synthetic T3 (liothyronine). Sometimes added to T4 therapy for residual hypothyroid symptoms. Short half-life (~1 day) — some clinicians split dose twice daily. Monitor free T3 and TSH. Not recommended as monotherapy per ATA guidelines except in specific circumstances.',
    allowCustomDose: false,
  },
  {
    key: 'thyroid_compounded_t3_t4',
    hormoneCategory: 'thyroid',
    deliveryMethod: 'oral_capsule',
    name: 'Compounded T3/T4',
    brandNames: [],
    genericName: 'liothyronine/levothyroxine compounded capsule',
    isBioidentical: true,
    isCompounded: true,
    doseOptions: {
      amounts: [9.5, 19, 38],
      unit: 'mcg T4 component',
      description: 'Common ratios 4:1 T4:T3 (e.g. 38 mcg T4 + 9.5 mcg T3)',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'Compounded combination T4/T4 capsule with custom ratios. Used when standard levothyroxine monotherapy produces residual symptoms. Stability and absorption vary by compounding pharmacy. Monitor TSH, free T4, and free T3.',
    allowCustomDose: true,
  },
  {
    key: 'armour_thyroid',
    hormoneCategory: 'thyroid',
    deliveryMethod: 'oral_tablet',
    name: 'Armour Thyroid',
    brandNames: ['Armour Thyroid'],
    genericName: 'desiccated thyroid (porcine)',
    isBioidentical: false,
    isCompounded: false,
    doseOptions: {
      amounts: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      unit: 'grain',
      description: '1 grain = 60 mg desiccated thyroid (38 mcg T4 + 9 mcg T3 per grain)',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'Desiccated porcine thyroid gland containing T4, T3, T2, and T1. Non-standardized hormone ratios between batches. Some patients prefer over synthetic T4 for symptomatic relief. Take on empty stomach. Monitor TSH — target may differ from levothyroxine monotherapy.',
    allowCustomDose: false,
  },
  {
    key: 'np_thyroid',
    hormoneCategory: 'thyroid',
    deliveryMethod: 'oral_tablet',
    name: 'NP Thyroid',
    brandNames: ['NP Thyroid', 'Nature-Throid', 'WP Thyroid'],
    genericName: 'desiccated thyroid (porcine)',
    isBioidentical: false,
    isCompounded: false,
    doseOptions: {
      amounts: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      unit: 'grain',
      description: '1 grain = 65 mg desiccated thyroid; similar T4:T3 ratio to Armour',
    },
    frequencyOptions: DAILY_FREQUENCY,
    clinicalNotes:
      'Desiccated porcine thyroid alternative to Armour Thyroid. Contains T4, T3, and other thyroid hormones. Nature-Throid and WP Thyroid are related products from same manufacturer lineage. Batch-to-batch potency variability has been an FDA concern — check current availability.',
    allowCustomDose: false,
  },
];

// ---------------------------------------------------------------------------
// Custom medication fallback
// ---------------------------------------------------------------------------

const customMedication: MedicationOption = {
  key: 'custom_medication',
  hormoneCategory: 'other',
  deliveryMethod: 'other',
  name: 'Custom Medication',
  brandNames: [],
  genericName: 'user-defined medication',
  isBioidentical: false,
  isCompounded: false,
  doseOptions: {
    amounts: [],
    unit: 'custom',
    description: 'Enter your own medication name, dose, and unit',
  },
  frequencyOptions: ['daily', 'weekly', 'cyclic', 'as_needed', 'custom'],
  clinicalNotes:
    'Use this option for medications not listed in the catalog. You can specify any hormone, dose, unit, frequency, and delivery method.',
  allowCustomDose: true,
};

// ---------------------------------------------------------------------------
// Full catalog
// ---------------------------------------------------------------------------

export const MEDICATION_CATALOG: MedicationOption[] = [
  ...estrogenPatches,
  ...estrogenTopical,
  ...estrogenSpray,
  ...estrogenOral,
  ...estrogenInjection,
  ...estrogenPellets,
  ...estrogenTroches,
  ...estrogenVaginal,
  ...estrogenNonBioidentical,
  ...progesteroneOral,
  ...progesteroneVaginal,
  ...progesteroneRectal,
  ...progesteroneCream,
  ...progesteronePellet,
  ...combinationOral,
  ...combinationPatches,
  ...testosteroneCream,
  ...testosteroneTroche,
  ...testosteronePellet,
  ...testosteroneInjection,
  ...combinationPellets,
  ...oxytocin,
  ...dhea,
  ...sawPalmetto,
  ...pregnenolone,
  ...thyroid,
  customMedication,
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getMedicationsByCategory(category: HormoneCategory): MedicationOption[] {
  return MEDICATION_CATALOG.filter((med) => med.hormoneCategory === category);
}

export function getMedicationsByDeliveryMethod(method: DeliveryMethod): MedicationOption[] {
  return MEDICATION_CATALOG.filter((med) => med.deliveryMethod === method);
}

export function getMedicationByKey(key: string): MedicationOption | undefined {
  return MEDICATION_CATALOG.find((med) => med.key === key);
}
