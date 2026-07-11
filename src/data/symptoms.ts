import type { SymptomDefinition, SymptomCategory } from '../types/symptoms';
import { SYMPTOM_BODY_SYSTEM_LABELS } from '../types/symptoms';
import {
  resolveBodySystem,
  resolvePhasePeak,
  resolveTier,
} from './symptomEnrichment';

type RawSymptom = Omit<SymptomDefinition, 'bodySystem' | 'phasePeak' | 'tier'>;

function enrich(symptom: RawSymptom): SymptomDefinition {
  return {
    ...symptom,
    bodySystem: resolveBodySystem(symptom.key, symptom.category),
    phasePeak: resolvePhasePeak(symptom.key, symptom.category, symptom.isMRSCore),
    tier: resolveTier(symptom.isMRSCore),
  };
}

const RAW_SYMPTOM_CATALOG: RawSymptom[] = [
  // ── MRS Core (11 canonical items) ──────────────────────────────────
  {
    key: 'hot_flashes',
    label: 'Hot flashes / night sweats',
    shortLabel: 'Hot flashes',
    description:
      'Sudden feeling of warmth, flushing, sweating — especially in the face, neck, and chest. Night sweats that disrupt sleep.',
    category: 'body',
    isMRSCore: true,
    mrsIndex: 1,
    mrsSubscale: 'somatic',
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'heart_discomfort',
    label: 'Heart discomfort / palpitations',
    shortLabel: 'Heart discomfort',
    description:
      'Unusual awareness of heartbeat, racing heart, skipped beats, or chest tightness.',
    category: 'body',
    isMRSCore: true,
    mrsIndex: 2,
    mrsSubscale: 'somatic',
    relatedHormones: ['estrogen_low', 'progesterone_low', 'thyroid_high'],
  },
  {
    key: 'sleep_problems',
    label: 'Sleep problems',
    description:
      'Difficulty falling asleep, staying asleep, waking too early, or feeling unrested.',
    category: 'body',
    isMRSCore: true,
    mrsIndex: 3,
    mrsSubscale: 'somatic',
    relatedHormones: ['estrogen_low', 'progesterone_low', 'cortisol_high'],
  },
  {
    key: 'depressed_mood',
    label: 'Depressed mood',
    description:
      'Feeling down, sad, tearful, hopeless, or lacking interest in things you usually enjoy.',
    category: 'mind',
    isMRSCore: true,
    mrsIndex: 4,
    mrsSubscale: 'psychological',
    relatedHormones: ['estrogen_low', 'testosterone_low', 'thyroid_low'],
  },
  {
    key: 'irritability',
    label: 'Irritability',
    description:
      'Feeling easily annoyed, snapping at people, inner tension, or feeling on edge.',
    category: 'mind',
    isMRSCore: true,
    mrsIndex: 5,
    mrsSubscale: 'psychological',
    relatedHormones: ['progesterone_low', 'estrogen_high', 'testosterone_high'],
  },
  {
    key: 'anxiety',
    label: 'Anxiety',
    description:
      'Worry, nervousness, inner restlessness, feeling panicky, or a sense of dread.',
    category: 'mind',
    isMRSCore: true,
    mrsIndex: 6,
    mrsSubscale: 'psychological',
    relatedHormones: ['progesterone_low', 'estrogen_low', 'cortisol_high'],
  },
  {
    key: 'exhaustion',
    label: 'Physical and mental exhaustion',
    shortLabel: 'Exhaustion',
    description:
      'Feeling drained, reduced stamina, difficulty concentrating, forgetfulness.',
    category: 'body',
    isMRSCore: true,
    mrsIndex: 7,
    mrsSubscale: 'psychological',
    relatedHormones: ['estrogen_low', 'testosterone_low', 'thyroid_low', 'cortisol_low'],
  },
  {
    key: 'sexual_problems',
    label: 'Sexual problems / low libido',
    shortLabel: 'Sexual problems',
    description:
      'Decreased sexual desire, difficulty with arousal or orgasm, changes in sexual enjoyment.',
    category: 'sexual_pelvic',
    isMRSCore: true,
    mrsIndex: 8,
    mrsSubscale: 'urogenital',
    relatedHormones: ['testosterone_low', 'estrogen_low', 'dhea_low'],
  },
  {
    key: 'bladder_problems',
    label: 'Bladder problems',
    description:
      'Increased urgency, frequency, difficulty urinating, leaking, or recurrent UTIs.',
    category: 'sexual_pelvic',
    isMRSCore: true,
    mrsIndex: 9,
    mrsSubscale: 'urogenital',
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'vaginal_dryness',
    label: 'Vaginal dryness',
    description:
      'Dryness, burning, itching, or discomfort in the vaginal area. Pain during intercourse.',
    category: 'sexual_pelvic',
    isMRSCore: true,
    mrsIndex: 10,
    mrsSubscale: 'urogenital',
    relatedHormones: ['estrogen_low', 'dhea_low'],
  },
  {
    key: 'joint_muscle_pain',
    label: 'Joint and muscle pain',
    shortLabel: 'Joint & muscle pain',
    description:
      'Aching, stiffness, or pain in joints or muscles — especially in the morning.',
    category: 'body',
    isMRSCore: true,
    mrsIndex: 11,
    mrsSubscale: 'somatic',
    relatedHormones: ['estrogen_low', 'testosterone_low'],
  },
  {
    key: 'dry_itchy_skin',
    label: 'Dry or itchy skin',
    description:
      'Skin feels dry, thin, or itchy. Loss of elasticity or moisture.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'brain_fog',
    label: 'Brain fog',
    description:
      'Difficulty concentrating, word-finding problems, mental sluggishness, feeling \'cloudy.\'',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low', 'testosterone_low', 'progesterone_low'],
  },
  {
    key: 'irregular_periods',
    label: 'Irregular periods',
    description:
      'Changes in cycle length, skipping periods, unpredictable timing.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'progesterone_low'],
  },
  {
    key: 'heavy_bleeding',
    label: 'Heavy menstrual bleeding',
    description:
      'Heavier flow than normal, prolonged periods, flooding, or passing clots.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'progesterone_low'],
  },
  {
    key: 'misophonia',
    label: 'Misophonia',
    description:
      'Increased sensitivity to sounds — chewing, tapping, breathing, or background noise feels unbearable.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  // ── Extended: Body ────────────────────────────────────────
  {
    key: 'headaches',
    label: 'Headaches',
    description:
      'General head pain or pressure not limited to one side. Hormonal fluctuations and sleep disruption are common triggers in perimenopause.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low', 'cortisol_high'],
  },
  {
    key: 'migraines',
    label: 'Migraines',
    description:
      'Intense, often one-sided headaches that may include nausea, light sensitivity, or aura. Migraine patterns often change around the menopause transition.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'estrogen_fluctuating', 'progesterone_low'],
  },
  {
    key: 'dizziness',
    label: 'Dizziness',
    description:
      'Feeling lightheaded, unsteady, or as though the room is spinning. May be linked to hormonal shifts, blood pressure changes, or thyroid imbalance.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low', 'cortisol_high'],
  },
  {
    key: 'palpitations',
    label: 'Palpitations',
    description:
      'Noticeable pounding, fluttering, or racing heartbeat, sometimes felt in the chest or throat. Often benign but worth tracking alongside other cardiac symptoms.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high', 'thyroid_low'],
  },
  {
    key: 'chest_tightness',
    label: 'Chest Tightness',
    description:
      'A squeezing, pressure, or constriction sensation in the chest not explained by exertion. Can overlap with anxiety and hormonal heart symptoms.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high', 'thyroid_low'],
  },
  {
    key: 'night_sweats',
    label: 'Night Sweats',
    description:
      'Episodes of heavy sweating during sleep, often severe enough to soak bedding or pajamas. Frequently occurs alongside or independent of daytime hot flashes.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  {
    key: 'weight_gain',
    label: 'Weight Gain',
    description:
      'Unintentional increase in body weight, often concentrated around the abdomen. Metabolic rate slows and fat distribution shifts during menopause.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low', 'cortisol_high', 'testosterone_low'],
  },
  {
    key: 'breast_tenderness',
    label: 'Breast Tenderness',
    description:
      'Soreness, swelling, or sensitivity in one or both breasts. Often linked to estrogen levels that are high relative to progesterone in perimenopause.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'progesterone_low', 'estrogen_fluctuating'],
  },
  {
    key: 'hair_loss',
    label: 'Hair Loss',
    description:
      'Thinning hair on the scalp, increased shedding, or widening part lines. Can result from low estrogen, thyroid dysfunction, or elevated androgens.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low', 'testosterone_high'],
  },
  {
    key: 'brittle_nails',
    label: 'Brittle Nails',
    description:
      'Nails that crack, peel, split, or break easily. Often reflects low thyroid function or reduced estrogen affecting keratin production.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['thyroid_low', 'estrogen_low'],
  },
  {
    key: 'tingling_limbs',
    label: 'Tingling in Limbs',
    description:
      'Pins-and-needles, numbness, or tingling in hands, feet, arms, or legs. May be related to estrogen effects on nerves or thyroid-related neuropathy.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low'],
  },
  {
    key: 'restless_legs',
    label: 'Restless Legs',
    description:
      'An urge to move the legs, especially at night, often with uncomfortable crawling or aching sensations. Sleep disruption can worsen other menopause symptoms.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  {
    key: 'acidosis',
    label: 'Acidosis',
    description:
      'A tendency toward acidic body chemistry with symptoms like fatigue, rapid breathing, or muscle weakness. Often linked to metabolic stress and adrenal or thyroid imbalance.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['cortisol_high', 'thyroid_low'],
  },
  {
    key: 'adrenal_fatigue',
    label: 'Adrenal Fatigue',
    description:
      'Persistent exhaustion, salt cravings, and difficulty recovering from stress despite adequate rest. Reflects dysregulated cortisol patterns common in midlife.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['cortisol_low', 'cortisol_high', 'dhea_low'],
  },
  {
    key: 'allergies',
    label: 'Allergies / Histamine Flares',
    description:
      'New or worsening allergic reactions, seasonal allergies, or histamine intolerance with sneezing, congestion, or itching. Hormonal shifts can affect immune reactivity.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'progesterone_low'],
  },
  {
    key: 'water_retention',
    label: 'Water Retention',
    description:
      'Puffiness, swelling in hands or feet, or feeling bloated from fluid buildup. Fluctuating estrogen and progesterone affect sodium and fluid balance.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'progesterone_low'],
  },
  {
    key: 'cold_intolerance',
    label: 'Cold Intolerance',
    description:
      'Feeling unusually cold, needing extra layers, or cold extremities even in warm environments. Often associated with low thyroid function or low estrogen.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['thyroid_low', 'estrogen_low'],
  },
  {
    key: 'heat_intolerance',
    label: 'Heat Intolerance',
    description:
      'Difficulty tolerating warm environments, feeling overheated easily, or excessive sweating outside of hot flashes. May reflect thyroid or autonomic changes.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['thyroid_high', 'estrogen_low'],
  },
  {
    key: 'muscle_weakness',
    label: 'Muscle Weakness',
    description:
      'Reduced strength, difficulty lifting usual weights, or muscles tiring quickly. Low testosterone, estrogen, and thyroid hormones all affect muscle mass.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['testosterone_low', 'estrogen_low', 'thyroid_low'],
  },
  {
    key: 'muscle_cramps',
    label: 'Muscle Cramps',
    description:
      'Sudden, painful muscle contractions, often in calves, feet, or hands. Magnesium shifts and hormonal changes can increase cramping.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low', 'thyroid_low'],
  },
  {
    key: 'back_pain',
    label: 'Back Pain',
    description:
      'Aching or stiffness in the upper, mid, or lower back not explained by injury alone. Estrogen decline affects connective tissue and spinal disc hydration.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'neck_pain',
    label: 'Neck Pain',
    description:
      'Stiffness, tension, or pain in the neck and upper shoulders. Stress, sleep disruption, and hormonal tissue changes can contribute.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high'],
  },
  {
    key: 'hip_pain',
    label: 'Hip Pain',
    description:
      'Aching or stiffness in the hip joints or surrounding muscles, especially after sitting or in the morning. Estrogen supports joint lubrication and cartilage health.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'joint_stiffness',
    label: 'Joint Stiffness',
    description:
      'Joints feel stiff or creaky, especially upon waking or after inactivity. Distinct from pain in emphasizing reduced mobility and rigidity.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_low'],
  },
  {
    key: 'whole_body_aches',
    label: 'Whole-Body Aches',
    description:
      'A diffuse, flu-like achiness affecting multiple areas without clear cause. Common during perimenopause and often worse with poor sleep.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low', 'cortisol_high'],
  },
  {
    key: 'shortness_of_breath',
    label: 'Shortness of Breath',
    description:
      'Feeling winded with minimal exertion or a sensation of not getting enough air. Can overlap with anxiety, anemia, or cardiac changes in menopause.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_high', 'cortisol_high'],
  },
  {
    key: 'chronic_fatigue',
    label: 'Chronic Fatigue',
    description:
      'Persistent, overwhelming tiredness that does not improve with rest and limits daily activities. Distinct from occasional exhaustion in its chronic nature.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low', 'cortisol_low', 'testosterone_low'],
  },
  {
    key: 'low_blood_pressure',
    label: 'Low Blood Pressure',
    description:
      'Dizziness on standing, lightheadedness, or readings below your usual baseline. Progesterone has vasodilating effects that can lower blood pressure.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['progesterone_high', 'estrogen_low'],
  },
  {
    key: 'high_blood_pressure',
    label: 'High Blood Pressure',
    description:
      'Elevated readings, headaches, or pressure sensations linked to rising blood pressure. Estrogen normally supports vascular health; its decline can affect blood pressure.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high'],
  },
  {
    key: 'tinnitus',
    label: 'Tinnitus',
    description:
      'Ringing, buzzing, or humming in the ears without an external source. Hormonal fluctuations and blood flow changes can trigger or worsen tinnitus.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low'],
  },
  {
    key: 'sinus_congestion',
    label: 'Sinus Congestion',
    description:
      'Stuffy nose, sinus pressure, or post-nasal drip without a clear infection. Estrogen affects mucous membrane thickness and sinus drainage.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'estrogen_high'],
  },
  {
    key: 'jaw_pain',
    label: 'Jaw Pain / TMJ',
    description:
      'Pain, clicking, or tightness in the jaw joint, often worse with clenching or stress. Hormonal changes and sleep bruxism can aggravate TMJ symptoms.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high'],
  },
  {
    key: 'bone_loss',
    label: 'Bone Loss / Osteopenia',
    description:
      'Reduced bone density, increased fracture risk, or aching in weight-bearing bones. Estrogen is critical for bone remodeling and calcium retention.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'reduced_stamina',
    label: 'Reduced Stamina',
    description:
      'Running out of energy sooner during physical activity than you used to. Reflects changes in cardiovascular fitness, muscle mass, and hormone levels.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_low', 'thyroid_low'],
  },
  {
    key: 'exercise_intolerance',
    label: 'Exercise Intolerance',
    description:
      'Feeling unusually exhausted, dizzy, or unwell during or after workouts that were previously manageable. May reflect adrenal, thyroid, or cardiovascular shifts.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['cortisol_low', 'thyroid_low', 'estrogen_low'],
  },
  {
    key: 'balance_problems',
    label: 'Balance Problems',
    description:
      'Feeling unsteady, stumbling more often, or difficulty maintaining balance. Estrogen influences the inner ear and proprioception.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'tremor',
    label: 'Tremor',
    description:
      'Fine shaking in hands or limbs, visible or felt internally. Can relate to anxiety, thyroid excess, blood sugar swings, or neurological sensitivity.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['thyroid_high', 'cortisol_high', 'estrogen_low'],
  },
  {
    key: 'internal_vibrations',
    label: 'Internal Vibrations',
    description:
      'A buzzing or vibrating sensation inside the body without visible shaking. Often reported in perimenopause and may relate to nervous system sensitivity.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high'],
  },
  {
    key: 'chills',
    label: 'Chills',
    description:
      'Sudden cold shivering or goosebumps unrelated to ambient temperature. Can occur alongside or separate from hot flashes as hormones fluctuate.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'estrogen_high', 'thyroid_low'],
  },
  {
    key: 'cold_hands_feet',
    label: 'Cold Hands & Feet',
    description:
      'Persistently cold extremities, sometimes with color changes or numbness. Reflects circulation changes, thyroid slowing, or estrogen decline.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['thyroid_low', 'estrogen_low'],
  },
  {
    key: 'swollen_joints',
    label: 'Swollen Joints',
    description:
      'Visible or felt swelling around joints, often with stiffness or warmth. Fluid retention and inflammatory shifts can worsen during hormonal transitions.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'progesterone_low'],
  },
  {
    key: 'shoulder_pain',
    label: 'Shoulder Pain',
    description:
      'Aching, frozen shoulder sensation, or limited range of motion in one or both shoulders. Connective tissue changes in menopause can affect the rotator cuff.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'knee_pain',
    label: 'Knee Pain',
    description:
      'Aching, grinding, or instability in the knees, especially on stairs or after sitting. Estrogen loss accelerates cartilage wear in weight-bearing joints.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'foot_pain',
    label: 'Foot Pain',
    description:
      'Aching arches, heel pain, or general foot discomfort, especially after standing or walking. Collagen loss and weight changes can affect foot structure.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'leg_cramps',
    label: 'Leg Cramps',
    description:
      'Painful cramping in the legs, often at night, that wakes you from sleep. Magnesium depletion and hormonal shifts are common contributors.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  {
    key: 'carpal_tunnel',
    label: 'Carpal Tunnel Symptoms',
    description:
      'Numbness, tingling, or pain in the thumb, index, and middle fingers, often worse at night. Fluid retention during hormonal shifts can compress the median nerve.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'progesterone_low'],
  },
  {
    key: 'facial_numbness',
    label: 'Facial Numbness',
    description:
      'Numbness, tingling, or altered sensation on the face or scalp. Estrogen affects nerve sensitivity and blood flow to facial tissues.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'electric_shock_sensations',
    label: 'Electric Shock Sensations',
    description:
      'Brief zapping or shock-like feelings under the skin, often in the head, neck, or limbs. A recognized perimenopause symptom linked to estrogen fluctuations.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'estrogen_high'],
  },
  {
    key: 'hypoglycemia',
    label: 'Hypoglycemia Symptoms',
    description:
      'Shakiness, sweating, irritability, or dizziness when going too long without eating. Insulin sensitivity changes during menopause can cause blood sugar swings.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high'],
  },
  {
    key: 'insulin_resistance',
    label: 'Insulin Resistance',
    description:
      'Difficulty managing blood sugar, weight gain around the midsection, or cravings despite eating. Estrogen decline affects how the body processes glucose.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'body_odor_changes',
    label: 'Body Odor Changes',
    description:
      'Noticeable changes in personal scent, increased sweating odor, or new smells from sweat or skin. Hormonal shifts alter apocrine gland activity and skin microbiome.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_high'],
  },
  {
    key: 'swelling_limbs',
    label: 'Swelling in Limbs',
    description:
      'Visible puffiness or tightness in arms, legs, or fingers, especially later in the day. Overlaps with water retention but emphasizes limb-specific swelling.',
    category: 'body',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'progesterone_low', 'thyroid_low'],
  },
  // ── Extended: Digestive ─────────────────────────────────────
  {
    key: 'bloating',
    label: 'Bloating',
    description:
      'Abdominal fullness, distension, or discomfort. Progesterone decline and fluctuating estrogen can affect fluid retention and gut motility.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['progesterone_low', 'estrogen_fluctuating', 'estrogen_high'],
  },
  {
    key: 'acid_reflux',
    label: 'Acid Reflux',
    description:
      'Burning sensation in the chest or throat, regurgitation, or worsening heartburn. Lower progesterone can relax the esophageal sphincter.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  {
    key: 'nausea',
    label: 'Nausea',
    description:
      'Queasiness or an unsettled stomach, with or without vomiting. Hormonal surges during perimenopause can trigger nausea similar to early pregnancy.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_fluctuating', 'progesterone_low', 'cortisol_high'],
  },
  {
    key: 'constipation',
    label: 'Constipation',
    description:
      'Infrequent bowel movements, hard stools, or straining. Thyroid slowing and progesterone changes can reduce gut motility.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['thyroid_low', 'progesterone_low', 'estrogen_low'],
  },
  {
    key: 'diarrhea',
    label: 'Diarrhea',
    description:
      'Loose or watery stools occurring more frequently than usual. Stress hormones and rapid estrogen shifts can affect gut function.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_fluctuating', 'cortisol_high', 'thyroid_low'],
  },
  {
    key: 'appetite_changes',
    label: 'Appetite Changes',
    description:
      'Noticeable increase or decrease in hunger, or changes in what you crave or enjoy eating. Hormonal and metabolic shifts can alter appetite regulation.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high', 'thyroid_low'],
  },
  {
    key: 'food_cravings',
    label: 'Food Cravings',
    description:
      'Strong urges for specific foods, especially sugar, salt, or carbohydrates. Often intensifies during luteal phase-like hormonal patterns in perimenopause.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low', 'cortisol_high'],
  },
  {
    key: 'bad_breath',
    label: 'Bad Breath',
    description:
      'Persistent unpleasant breath odor not resolved by brushing or mouthwash. Gut dysbiosis, reflux, and hormonal dry mouth can all contribute.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  {
    key: 'indigestion',
    label: 'Indigestion',
    description:
      'Uncomfortable fullness, burning, or upset stomach after eating. Slower digestion and sphincter relaxation from progesterone decline can worsen symptoms.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['progesterone_low', 'estrogen_low'],
  },
  {
    key: 'gas',
    label: 'Gas / Flatulence',
    description:
      'Excessive bloating from intestinal gas, belching, or flatulence. Gut motility changes and microbiome shifts during menopause affect gas production.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  {
    key: 'stomach_pain',
    label: 'Stomach Pain',
    description:
      'Pain or cramping in the upper abdomen, epigastric region, or stomach area. Stress, reflux, and hormonal gut sensitivity are common triggers.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['cortisol_high', 'estrogen_low'],
  },
  {
    key: 'abdominal_cramping',
    label: 'Abdominal Cramping',
    description:
      'Intermittent cramping across the abdomen not clearly tied to menstruation. Gut sensitivity and motility changes increase during perimenopause.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['progesterone_low', 'estrogen_high'],
  },
  {
    key: 'gallbladder_discomfort',
    label: 'Gallbladder Discomfort',
    description:
      'Pain or heaviness in the upper right abdomen after fatty meals. Estrogen influences bile composition and gallstone risk rises after menopause.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'estrogen_high'],
  },
  {
    key: 'fatty_food_intolerance',
    label: 'Fatty Food Intolerance',
    description:
      'Nausea, discomfort, or diarrhea after eating rich or high-fat foods. Reduced bile flow and slower digestion can make fatty meals harder to tolerate.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'sugar_crash',
    label: 'Sugar Crashes',
    description:
      'Energy crashes, shakiness, or irritability after eating sugary foods. Blood sugar instability worsens as estrogen-related insulin sensitivity declines.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high'],
  },
  {
    key: 'ibs_flares',
    label: 'IBS Flares',
    description:
      'Alternating constipation and diarrhea, abdominal pain, or urgency characteristic of irritable bowel syndrome. Hormonal shifts commonly trigger IBS exacerbations.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low', 'cortisol_high'],
  },
  {
    key: 'early_satiety',
    label: 'Early Satiety',
    description:
      'Feeling full quickly after eating small amounts of food. Slowed gastric emptying and hormonal gut changes can reduce appetite capacity.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  {
    key: 'belching',
    label: 'Belching / Burping',
    description:
      'Frequent burping or air regurgitation, often after meals. Swallowing air from anxiety or relaxed esophageal sphincter from progesterone decline can increase belching.',
    category: 'digestive',
    isMRSCore: false,
    relatedHormones: ['progesterone_low', 'cortisol_high'],
  },
  // ── Extended: Mind ──────────────────────────────────────────
  {
    key: 'mood_swings',
    label: 'Mood Swings',
    description:
      'Rapid shifts between emotional states—happy to tearful, calm to angry—often without a clear trigger. Classic perimenopause pattern driven by hormonal volatility.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_fluctuating', 'progesterone_low'],
  },
  {
    key: 'panic_attacks',
    label: 'Panic Attacks',
    description:
      'Sudden episodes of intense fear with physical symptoms such as racing heart, shortness of breath, sweating, or feeling of impending doom.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high', 'progesterone_low'],
  },
  {
    key: 'crying_spells',
    label: 'Crying Spells',
    description:
      'Sudden, overwhelming urge to cry or episodes of crying that feel out of proportion to the situation. Often linked to estrogen and progesterone fluctuations.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low', 'estrogen_fluctuating'],
  },
  {
    key: 'low_motivation',
    label: 'Low Motivation',
    description:
      'Difficulty starting tasks, reduced drive, or feeling apathetic about goals and responsibilities. May overlap with fatigue and low testosterone or thyroid.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_low', 'thyroid_low'],
  },
  {
    key: 'memory_lapses',
    label: 'Memory Lapses',
    description:
      'Forgetting names, appointments, or why you entered a room. Distinct from brain fog in focusing on recall failures rather than general mental sluggishness.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low', 'progesterone_low'],
  },
  {
    key: 'difficulty_concentrating',
    label: 'Difficulty Concentrating',
    description:
      'Trouble staying on task, following conversations, or completing work that requires sustained attention. Often reported alongside sleep disruption.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low', 'progesterone_low'],
  },
  {
    key: 'rage_episodes',
    label: 'Rage Episodes',
    description:
      'Intense, sudden anger that feels disproportionate or hard to control. Sometimes called "perimenopause rage" and linked to progesterone decline and estrogen swings.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['testosterone_high', 'estrogen_fluctuating', 'progesterone_low'],
  },
  {
    key: 'emotional_numbness',
    label: 'Emotional Numbness',
    description:
      'Feeling disconnected, flat, or unable to access emotions you would normally feel. Can occur alongside depression or as a distinct perimenopause experience.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  {
    key: 'apathy',
    label: 'Apathy',
    description:
      'Lack of interest, enthusiasm, or concern about things that previously mattered. Overlaps with low motivation but emphasizes indifference rather than fatigue.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_low', 'thyroid_low'],
  },
  {
    key: 'feeling_overwhelmed',
    label: 'Feeling Overwhelmed',
    description:
      'Sense that daily tasks, decisions, or responsibilities exceed your capacity to cope. Small stressors feel disproportionately burdensome during hormonal transitions.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['cortisol_high', 'estrogen_low', 'progesterone_low'],
  },
  {
    key: 'social_withdrawal',
    label: 'Social Withdrawal',
    description:
      'Pulling back from social activities, friends, or family interactions you once enjoyed. May stem from fatigue, mood changes, or increased sensitivity.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_low', 'cortisol_high'],
  },
  {
    key: 'decision_fatigue',
    label: 'Decision Fatigue',
    description:
      'Difficulty making even simple choices, procrastinating on decisions, or feeling paralyzed by options. Estrogen supports executive function and frontal lobe activity.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high'],
  },
  {
    key: 'word_finding_difficulty',
    label: 'Word-Finding Difficulty',
    description:
      'Tip-of-the-tongue moments, substituting wrong words, or losing your train of thought mid-sentence. Distinct from general brain fog in focusing on language retrieval.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low'],
  },
  {
    key: 'racing_thoughts',
    label: 'Racing Thoughts',
    description:
      'Mind jumping rapidly between ideas, unable to slow down or quiet internal chatter. Often accompanies anxiety, insomnia, or high cortisol.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['cortisol_high', 'estrogen_low', 'thyroid_high'],
  },
  {
    key: 'rumination',
    label: 'Rumination',
    description:
      'Repetitively dwelling on negative thoughts, past events, or worries without reaching resolution. Progesterone normally has calming GABA-like effects on the brain.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['progesterone_low', 'estrogen_low', 'cortisol_high'],
  },
  {
    key: 'loss_of_confidence',
    label: 'Loss of Confidence',
    description:
      'Feeling less capable, competent, or self-assured in work, relationships, or daily life. Hormonal shifts affecting mood and cognition can erode self-esteem.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_low', 'dhea_low'],
  },
  {
    key: 'emotional_lability',
    label: 'Emotional Lability',
    description:
      'Emotions changing quickly and intensely, laughing then crying, or feeling emotionally unpredictable. Classic perimenopause pattern from rapid hormone swings.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'estrogen_low', 'progesterone_low'],
  },
  {
    key: 'heightened_sensitivity',
    label: 'Heightened Sensitivity',
    description:
      'Feeling emotionally raw, easily hurt, or overwhelmed by stimuli like noise, criticism, or conflict. Estrogen modulates emotional processing in the brain.',
    category: 'mind',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  // ── Extended: Sexual & Pelvic ────────────────────────────────
  {
    key: 'low_libido',
    label: 'Low Libido',
    description:
      'Reduced interest in or desire for sexual activity. May stem from hormonal decline, vaginal discomfort, fatigue, or mood changes.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_low', 'progesterone_low'],
  },
  {
    key: 'painful_intercourse',
    label: 'Painful Intercourse',
    description:
      'Pain or discomfort during or after sex, often due to vaginal dryness and tissue thinning. Also called dyspareunia.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'orgasm_changes',
    label: 'Orgasm Changes',
    description:
      'Difficulty reaching orgasm, less intense orgasms, or changes in orgasmic response. Estrogen and testosterone both influence sexual response.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_low'],
  },
  {
    key: 'pelvic_pain',
    label: 'Pelvic Pain',
    description:
      'Pain or pressure in the lower abdomen or pelvic region not explained by menstruation alone. May relate to hormonal tissue changes or pelvic floor tension.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  {
    key: 'urinary_urgency',
    label: 'Urinary Urgency',
    description:
      'A sudden, compelling need to urinate that is difficult to postpone. Estrogen decline affects bladder lining and pelvic floor function.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'urinary_frequency',
    label: 'Urinary Frequency',
    description:
      'Needing to urinate more often than usual, including during the night. Common with genitourinary syndrome of menopause.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'dyspareunia',
    label: 'Dyspareunia',
    description:
      'Persistent or recurrent pain with penetration, deep thrusting, or after intercourse. The medical term for painful sex, often from vaginal atrophy or pelvic floor tension.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'increased_libido',
    label: 'Increased Libido',
    description:
      'Surprisingly heightened sexual desire or arousal during perimenopause, sometimes in cycles. Fluctuating testosterone relative to declining estrogen can temporarily increase libido.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['testosterone_high', 'estrogen_low'],
  },
  {
    key: 'vaginal_itching',
    label: 'Vaginal Itching',
    description:
      'Persistent itching in or around the vaginal opening without clear infection. Thinning vulvovaginal tissue and pH changes from low estrogen cause irritation.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'vaginal_burning',
    label: 'Vaginal Burning',
    description:
      'Burning sensation in the vaginal area at rest or with contact. A hallmark of genitourinary syndrome of menopause from estrogen decline.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'vulvar_pain',
    label: 'Vulvar Pain',
    description:
      'Pain, soreness, or rawness of the external genital area (vulva). Estrogen receptors in vulvar tissue make this area sensitive to hormonal changes.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'pelvic_heaviness',
    label: 'Pelvic Heaviness',
    description:
      'A dragging, pressure, or fullness sensation in the pelvis, especially when standing. Pelvic floor and connective tissue changes can create a heavy feeling.',
    category: 'sexual_pelvic',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'progesterone_low'],
  },
  // ── Extended: Skin & Hair ───────────────────────────────────
  {
    key: 'acne',
    label: 'Acne',
    description:
      'Breakouts, pimples, or cystic acne, often along the jawline or chin. Relative androgen excess during estrogen decline can trigger adult acne.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['testosterone_high', 'estrogen_fluctuating', 'estrogen_low'],
  },
  {
    key: 'facial_hair',
    label: 'Facial Hair',
    description:
      'Increased coarse or dark hair growth on the face, chin, or upper lip. May indicate relative testosterone elevation as estrogen declines.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['testosterone_high', 'estrogen_low'],
  },
  {
    key: 'thinning_hair',
    label: 'Thinning Hair',
    description:
      'Visible reduction in hair density on the scalp. Differs from general hair loss in emphasizing overall thinning rather than shedding patches.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low', 'testosterone_high'],
  },
  {
    key: 'dry_eyes',
    label: 'Dry Eyes',
    description:
      'Eyes that feel gritty, burning, or irritated, sometimes with blurred vision. Estrogen and androgen receptors in tear glands affect lubrication.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_low'],
  },
  {
    key: 'dry_mouth',
    label: 'Dry Mouth',
    description:
      'Persistent dryness in the mouth or throat, reduced saliva, or difficulty swallowing dry foods. Estrogen influences mucous membrane moisture.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'hives',
    label: 'Hives',
    description:
      'Raised, itchy welts on the skin that may appear suddenly and resolve within hours. Hormonal immune shifts can trigger or worsen urticaria.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_fluctuating', 'cortisol_high'],
  },
  {
    key: 'rosacea',
    label: 'Rosacea',
    description:
      'Facial redness, visible blood vessels, flushing, or acne-like bumps concentrated on the cheeks, nose, or chin. Hot flashes can exacerbate flares.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_fluctuating', 'cortisol_high', 'estrogen_low'],
  },
  {
    key: 'hirsutism',
    label: 'Hirsutism',
    description:
      'Excessive coarse hair growth on the face, chest, back, or abdomen. Relative androgen elevation as estrogen declines can cause male-pattern hair growth.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['testosterone_high', 'estrogen_low'],
  },
  {
    key: 'oily_skin',
    label: 'Oily Skin',
    description:
      'Increased skin oiliness, shininess, or clogged pores. Androgen fluctuations during perimenopause can stimulate sebaceous glands.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['testosterone_high', 'estrogen_low'],
  },
  {
    key: 'sagging_skin',
    label: 'Sagging Skin',
    description:
      'Loss of skin firmness, jowls, or crepey texture, especially on face, neck, or arms. Collagen and elastin production drop significantly with estrogen decline.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'age_spots',
    label: 'Age Spots',
    description:
      'Flat brown or tan spots on sun-exposed skin, also called liver spots. Estrogen influences melanin distribution and skin repair after UV damage.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_low'],
  },
  {
    key: 'eczema_flares',
    label: 'Eczema Flares',
    description:
      'Worsening dry, itchy, inflamed patches of eczema or atopic dermatitis. Skin barrier function weakens and immune reactivity shifts during menopause.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'cortisol_high'],
  },
  {
    key: 'itchy_scalp',
    label: 'Itchy Scalp',
    description:
      'Persistent scalp itching, flaking, or irritation without dandruff alone explaining it. Hormonal changes affect sebum production and scalp skin health.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'testosterone_high'],
  },
  {
    key: 'brittle_hair',
    label: 'Brittle Hair',
    description:
      'Hair that breaks easily, feels dry or straw-like, or lacks shine. Thyroid dysfunction and low estrogen both impair hair shaft integrity.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_low', 'thyroid_low'],
  },
  {
    key: 'hyperpigmentation',
    label: 'Hyperpigmentation',
    description:
      'Darkened patches of skin, melasma, or uneven skin tone. Estrogen influences melanocyte activity and pigmentation patterns.',
    category: 'skin_hair',
    isMRSCore: false,
    relatedHormones: ['estrogen_high', 'estrogen_low'],
  },
];

export const SYMPTOM_CATALOG: SymptomDefinition[] = RAW_SYMPTOM_CATALOG.map(enrich);

export const MRS_CORE_SYMPTOMS = SYMPTOM_CATALOG.filter((s) => s.isMRSCore);
export const MRS_CANONICAL_SYMPTOMS = MRS_CORE_SYMPTOMS;

export function getExtendedByCategory(category: SymptomCategory): SymptomDefinition[] {
  return SYMPTOM_CATALOG.filter((s) => !s.isMRSCore && s.category === category);
}

export function getSymptomByKey(key: string): SymptomDefinition | undefined {
  return SYMPTOM_CATALOG.find((s) => s.key === key);
}

/** Chip/tap label — uses shortLabel when set to avoid visual collision in quick-log contexts. */
export function getSymptomChipLabel(symptom: SymptomDefinition | undefined): string {
  if (!symptom) return '';
  return symptom.shortLabel ?? symptom.label;
}

export function searchSymptomCatalog(query: string, limit = 20): SymptomDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return SYMPTOM_CATALOG.filter((s) => {
    const bodyLabel = SYMPTOM_BODY_SYSTEM_LABELS[s.bodySystem];
    return `${s.label} ${bodyLabel}`.toLowerCase().includes(q);
  }).slice(0, limit);
}