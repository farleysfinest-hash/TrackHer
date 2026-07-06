import type { InstrumentDefinition } from '../../types/instruments';
import { MRS_INSTRUMENT } from './mrs';
import { PERI_SS_INSTRUMENT } from './peri-ss';

const INSTRUMENT_REGISTRY: Record<string, InstrumentDefinition> = {
  mrs: MRS_INSTRUMENT,
  peri_ss: PERI_SS_INSTRUMENT,
};

function getInstrumentsForStage(strawStage: string): InstrumentDefinition[] {
  return Object.values(INSTRUMENT_REGISTRY).filter(
    (inst) => inst.targetStages.includes('*') || inst.targetStages.includes(strawStage),
  );
}

/** Phase 1: always MRS. Change this single function to activate Peri-SS for peri stages. */
function getPrimaryInstrument(strawStage: string): InstrumentDefinition {
  void strawStage;
  return MRS_INSTRUMENT;

  // Phase 2 (future):
  // const instruments = getInstrumentsForStage(strawStage);
  // const periSS = instruments.find((i) => i.id === 'peri_ss');
  // return periSS ?? MRS_INSTRUMENT;
}

function getInstrumentById(id: string): InstrumentDefinition | undefined {
  return INSTRUMENT_REGISTRY[id];
}

export {
  INSTRUMENT_REGISTRY,
  getInstrumentsForStage,
  getPrimaryInstrument,
  getInstrumentById,
};
