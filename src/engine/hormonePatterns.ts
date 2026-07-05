export interface HormonePattern {
  key: string;
  label: string;
  description: string;
  primarySymptoms: string[];
  secondarySymptoms: string[];
  relatedLabs: Array<{
    biomarkerKey: string;
    expectedDirection: 'low' | 'high' | 'either';
  }>;
  discussionPoints: string[];
}

export const HORMONE_PATTERNS: HormonePattern[] = [
  {
    key: 'estrogen_low',
    label: 'Low Estrogen Pattern',
    description:
      'Your symptom profile includes several hallmarks commonly associated with insufficient estrogen levels — hot flashes, vaginal dryness, sleep disruption, and joint pain are among the most characteristic signs of estrogen deficiency.',
    primarySymptoms: ['hot_flashes', 'vaginal_dryness', 'sleep_problems', 'joint_muscle_pain'],
    secondarySymptoms: [
      'brain_fog',
      'depressed_mood',
      'dry_itchy_skin',
      'bladder_problems',
      'exhaustion',
      'heart_discomfort',
      'headaches',
      'dry_eyes',
      'dry_mouth',
    ],
    relatedLabs: [
      { biomarkerKey: 'estradiol', expectedDirection: 'low' },
      { biomarkerKey: 'fsh', expectedDirection: 'high' },
    ],
    discussionPoints: [
      'Could my estradiol dose be increased?',
      'Would switching delivery methods improve absorption?',
      'Should we check my estradiol level with a blood test?',
    ],
  },
  {
    key: 'estrogen_high',
    label: 'Estrogen Dominance Pattern',
    description:
      'Your symptoms include several that are commonly associated with estrogen levels being too high relative to progesterone — breast tenderness, bloating, headaches, and mood instability can indicate estrogen excess or an imbalanced estrogen-to-progesterone ratio.',
    primarySymptoms: ['breast_tenderness', 'heavy_bleeding', 'irregular_periods', 'headaches'],
    secondarySymptoms: [
      'bloating',
      'water_retention',
      'mood_swings',
      'irritability',
      'anxiety',
      'weight_gain',
      'nausea',
      'brain_fog',
    ],
    relatedLabs: [
      { biomarkerKey: 'estradiol', expectedDirection: 'high' },
      { biomarkerKey: 'progesterone', expectedDirection: 'low' },
      { biomarkerKey: 'shbg', expectedDirection: 'high' },
    ],
    discussionPoints: [
      'Could my estrogen dose be too high?',
      'Would adding or increasing progesterone help balance things?',
      'Should we check my estradiol-to-progesterone ratio?',
      'If I am on oral estrogen, would switching to transdermal reduce estrogen dominance symptoms?',
    ],
  },
  {
    key: 'progesterone_low',
    label: 'Low Progesterone Pattern',
    description:
      'Your symptom profile suggests progesterone may be insufficient. Anxiety, insomnia (especially waking between 2-4 AM), irritability, and mood swings are classic signs that progesterone — the calming hormone — may be low relative to your estrogen level.',
    primarySymptoms: ['anxiety', 'sleep_problems', 'irritability', 'mood_swings'],
    secondarySymptoms: [
      'heavy_bleeding',
      'irregular_periods',
      'panic_attacks',
      'rage',
      'breast_tenderness',
      'bloating',
      'depressed_mood',
      'headaches',
    ],
    relatedLabs: [{ biomarkerKey: 'progesterone', expectedDirection: 'low' }],
    discussionPoints: [
      'Would adding or increasing progesterone help with my sleep and anxiety?',
      'Am I on the right type of progesterone for my symptoms?',
      'If I have a uterus, is my current progesterone adequate for endometrial protection?',
      'Should we check my progesterone level?',
    ],
  },
  {
    key: 'testosterone_low',
    label: 'Low Testosterone Pattern',
    description:
      'Your symptoms — low libido, fatigue, difficulty building motivation, and mental fogginess — align with patterns commonly seen when testosterone is insufficient. Testosterone supports energy, drive, sexual function, and cognitive sharpness in women.',
    primarySymptoms: ['sexual_problems', 'exhaustion', 'low_motivation', 'brain_fog'],
    secondarySymptoms: [
      'depressed_mood',
      'joint_muscle_pain',
      'muscle_atrophy',
      'hair_loss',
      'low_self_esteem',
    ],
    relatedLabs: [
      { biomarkerKey: 'total_testosterone', expectedDirection: 'low' },
      { biomarkerKey: 'free_testosterone', expectedDirection: 'low' },
      { biomarkerKey: 'dhea_s', expectedDirection: 'low' },
    ],
    discussionPoints: [
      'Would low-dose testosterone therapy help with my energy and libido?',
      'Should we check my free testosterone level (not just total)?',
      'Is my SHBG high?',
      'Would DHEA supplementation be appropriate?',
    ],
  },
  {
    key: 'testosterone_high',
    label: 'Testosterone Excess Pattern',
    description:
      'Your symptoms include acne, unwanted hair growth, and scalp hair thinning — signs that may indicate testosterone levels are higher than optimal.',
    primarySymptoms: ['acne', 'hirsutism', 'hair_loss'],
    secondarySymptoms: ['increased_libido', 'rage', 'irritability', 'oily_skin'],
    relatedLabs: [
      { biomarkerKey: 'total_testosterone', expectedDirection: 'high' },
      { biomarkerKey: 'free_testosterone', expectedDirection: 'high' },
      { biomarkerKey: 'dhea_s', expectedDirection: 'high' },
    ],
    discussionPoints: [
      'Should my testosterone dose be reduced?',
      'Could my testosterone cream concentration be too high?',
      'Should we check my free testosterone and DHEA-S levels?',
    ],
  },
  {
    key: 'thyroid_low',
    label: 'Thyroid Overlap Pattern',
    description:
      'Several of your symptoms — fatigue, weight gain, brain fog, hair loss, and depression — overlap significantly with hypothyroidism. Thyroid dysfunction is common in women over 40 and can compound menopause symptoms.',
    primarySymptoms: ['exhaustion', 'weight_gain', 'brain_fog', 'hair_loss', 'depressed_mood'],
    secondarySymptoms: [
      'constipation',
      'dry_itchy_skin',
      'muscle_cramps',
      'cold_flashes',
      'joint_muscle_pain',
    ],
    relatedLabs: [
      { biomarkerKey: 'tsh', expectedDirection: 'high' },
      { biomarkerKey: 'free_t3', expectedDirection: 'low' },
      { biomarkerKey: 'free_t4', expectedDirection: 'low' },
    ],
    discussionPoints: [
      'Have my thyroid levels been checked recently?',
      'Should we test free T3 and free T4 in addition to TSH?',
      'Could suboptimal thyroid function be contributing to my fatigue and brain fog?',
    ],
  },
  {
    key: 'cortisol_high',
    label: 'Stress/Cortisol Pattern',
    description:
      'Your symptoms suggest your stress response system may be overactivated. Anxiety, sleep disruption, exhaustion, and blood sugar issues are associated with elevated cortisol.',
    primarySymptoms: ['anxiety', 'sleep_problems', 'exhaustion'],
    secondarySymptoms: [
      'weight_gain',
      'blood_sugar_dysregulation',
      'irritability',
      'brain_fog',
      'heart_discomfort',
    ],
    relatedLabs: [
      { biomarkerKey: 'cortisol_am', expectedDirection: 'high' },
      { biomarkerKey: 'dhea_s', expectedDirection: 'low' },
    ],
    discussionPoints: [
      'Should we check my morning cortisol level?',
      'Would adrenal support be appropriate?',
      'Could high cortisol be suppressing my sex hormones?',
    ],
  },
];
