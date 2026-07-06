import type { InstrumentDefinition } from '../../types/instruments';
import { buildInstrumentScore } from './scoring';

export const MRS_INSTRUMENT: InstrumentDefinition = {
  id: 'mrs',
  name: 'Menopause Rating Scale',
  abbreviation: 'MRS',
  version: '1.0',
  citation:
    'Heinemann K, et al. The Menopause Rating Scale (MRS) scale: A methodological review. Health Qual Life Outcomes. 2004;2(1):45.',
  description:
    'An internationally validated scale for assessing menopausal symptom severity across psychological, somatic, and urogenital domains.',
  recallPeriod: 'current',
  scoringMethod: 'sum',
  scaleRange: [0, 4],
  totalScoreRange: [0, 44],
  targetStages: ['*'],
  items: [
    {
      id: 'depressed_mood',
      label: 'Depressed mood',
      description:
        'Feeling down, sad, on the verge of crying, lack of drive, mood swings',
      subscale: 'psychological',
    },
    {
      id: 'irritability',
      label: 'Irritability',
      description: 'Feeling nervous, inner tension, feeling aggressive',
      subscale: 'psychological',
    },
    {
      id: 'anxiety',
      label: 'Anxiety',
      description: 'Inner restlessness, feeling panicky',
      subscale: 'psychological',
    },
    {
      id: 'physical_mental_exhaustion',
      storageKey: 'exhaustion',
      label: 'Physical and mental exhaustion',
      description:
        'General decrease in performance, impaired memory, decrease in concentration, forgetfulness',
      subscale: 'psychological',
    },
    {
      id: 'hot_flashes_sweating',
      storageKey: 'hot_flashes',
      label: 'Hot flashes, sweating',
      description: 'Episodes of sweating',
      subscale: 'somatic',
    },
    {
      id: 'heart_discomfort',
      label: 'Heart discomfort',
      description:
        'Unusual awareness of heart beat, heart skipping, heart racing, tightness',
      subscale: 'somatic',
    },
    {
      id: 'sleep_problems',
      label: 'Sleep problems',
      description:
        'Difficulty in falling asleep, difficulty in sleeping through, waking up early',
      subscale: 'somatic',
    },
    {
      id: 'joint_muscular_discomfort',
      storageKey: 'joint_muscle_pain',
      label: 'Joint and muscular discomfort',
      description: 'Pain in the joints, rheumatoid complaints',
      subscale: 'somatic',
    },
    {
      id: 'sexual_problems',
      label: 'Sexual problems',
      description: 'Change in sexual desire, in sexual activity and satisfaction',
      subscale: 'urogenital',
    },
    {
      id: 'bladder_problems',
      label: 'Bladder problems',
      description:
        'Difficulty in urinating, increased need to urinate, bladder incontinence',
      subscale: 'urogenital',
    },
    {
      id: 'vaginal_dryness',
      label: 'Dryness of vagina',
      description:
        'Sensation of dryness or burning in the vagina, difficulty with sexual intercourse',
      subscale: 'urogenital',
    },
  ],
  subscales: [
    {
      id: 'psychological',
      label: 'Psychological',
      items: [
        'depressed_mood',
        'irritability',
        'anxiety',
        'physical_mental_exhaustion',
      ],
      maxScore: 16,
      severityBands: {
        none: [0, 3],
        mild: [4, 7],
        moderate: [8, 11],
        severe: [12, 16],
      },
    },
    {
      id: 'somatic',
      label: 'Somatic',
      items: [
        'hot_flashes_sweating',
        'heart_discomfort',
        'sleep_problems',
        'joint_muscular_discomfort',
      ],
      maxScore: 16,
      severityBands: {
        none: [0, 3],
        mild: [4, 7],
        moderate: [8, 11],
        severe: [12, 16],
      },
    },
    {
      id: 'urogenital',
      label: 'Urogenital',
      items: ['sexual_problems', 'bladder_problems', 'vaginal_dryness'],
      maxScore: 12,
      severityBands: {
        none: [0, 2],
        mild: [3, 5],
        moderate: [6, 8],
        severe: [9, 12],
      },
    },
  ],
  totalSeverityBands: {
    none: [0, 4],
    mild: [5, 16],
    moderate: [17, 24],
    severe: [25, 44],
  },
  scoringFunction: (responses) => buildInstrumentScore(MRS_INSTRUMENT, responses),
};
