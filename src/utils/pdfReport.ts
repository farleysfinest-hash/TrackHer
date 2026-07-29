import jsPDF from 'jspdf';
import type {
  Profile,
  Medication,
  MedicationAdministration,
  MedicationChange,
  SymptomCheckin,
  LabResult,
  ExtendedSymptomLog,
  QuickLogEvent,
} from '../types/database';
import type { DateRange } from '../stores/dashboardStore';
import { formatChartDateLong } from './chartHelpers';
import { todayISO } from './localDate';
import type { PdfPageContext } from './report/pdfTheme';
import { addNewPage, stampAllPageFooters } from './report/pdfTheme';
import { renderExecutiveSummaryPage } from './report/sections/executiveSummary';
import { renderPatientSummaryPage } from './report/sections/patientSummary';
import { renderMrsAssessmentPage } from './report/sections/mrsAssessment';
import { renderExtendedSymptomsPage } from './report/sections/extendedSymptoms';
import {
  renderLabResultsPage,
  hasLabResultsInRange,
} from './report/sections/labResults';
import {
  renderMedicationTimelinePage,
  hasMedicationsInRange,
} from './report/sections/medicationTimeline';

export interface ProviderReportData {
  profile: Profile;
  medications: Medication[];
  medicationChanges: MedicationChange[];
  checkins: SymptomCheckin[];
  labResults: LabResult[];
  extendedSymptomLogs: ExtendedSymptomLog[];
  quickLogEvents: QuickLogEvent[];
  /** Dose logs — required so trough-timing insights match the in-app engine. */
  administrations: MedicationAdministration[];
  dateRange: DateRange;
  timezone: string;
  includeSafeguarding: boolean;
  /** Optional companion-drafted prose for the executive summary. */
  companionNarrative?: string | null;
}

export async function generateProviderReport(data: ProviderReportData): Promise<Blob> {
  const doc = new jsPDF();
  const patientName = data.profile.display_name ?? 'Patient';
  const reportDate = formatChartDateLong(todayISO(data.timezone));
  const ctx: PdfPageContext = {
    doc,
    patientName,
    reportDate,
    pageNum: 1,
    // Real total is stamped after layout by `stampAllPageFooters`; sections may add pages.
    totalPages: 0,
  };

  const sortedCheckins = [...data.checkins]
    .filter((c) => c.checkin_date >= data.dateRange.start && c.checkin_date <= data.dateRange.end)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));

  const checkinDates = sortedCheckins.map((c) => c.checkin_date);

  renderExecutiveSummaryPage(ctx, {
    profile: data.profile,
    checkins: data.checkins,
    labResults: data.labResults,
    quickLogEvents: data.quickLogEvents,
    medications: data.medications,
    medicationChanges: data.medicationChanges,
    extendedSymptomLogs: data.extendedSymptomLogs,
    administrations: data.administrations,
    dateRange: data.dateRange,
    timezone: data.timezone,
    includeSafeguarding: data.includeSafeguarding,
    companionNarrative: data.companionNarrative ?? null,
  });
  addNewPage(ctx);
  renderPatientSummaryPage(
    ctx,
    data.profile,
    data.medications,
    checkinDates,
    data.dateRange,
    data.timezone,
  );
  addNewPage(ctx);
  renderMrsAssessmentPage(
    ctx,
    data.checkins,
    data.medicationChanges,
    data.medications,
    data.dateRange,
  );
  addNewPage(ctx);
  renderExtendedSymptomsPage(
    ctx,
    data.checkins,
    data.extendedSymptomLogs,
    data.quickLogEvents,
    data.dateRange,
    data.timezone,
  );

  if (hasLabResultsInRange(data.labResults, data.dateRange)) {
    addNewPage(ctx);
    renderLabResultsPage(ctx, data.labResults, data.dateRange);
  }

  if (hasMedicationsInRange(data.medications, data.dateRange)) {
    addNewPage(ctx);
    renderMedicationTimelinePage(
      ctx,
      data.medications,
      data.medicationChanges,
      data.checkins,
      data.dateRange,
    );
  }

  stampAllPageFooters(ctx);

  return doc.output('blob');
}
