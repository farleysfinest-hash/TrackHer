import jsPDF from 'jspdf';
import type {
  Profile,
  Medication,
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
import { addPageFooter, addNewPage, setTotalPages } from './report/pdfTheme';
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
  dateRange: DateRange;
  timezone: string;
  includeSafeguarding: boolean;
}

function countReportPages(data: ProviderReportData): number {
  let pages = 4; // executive summary, patient summary, MRS, extended symptoms
  if (hasLabResultsInRange(data.labResults, data.dateRange)) pages += 1;
  if (hasMedicationsInRange(data.medications, data.dateRange)) pages += 1;
  return pages;
}

export async function generateProviderReport(data: ProviderReportData): Promise<Blob> {
  const doc = new jsPDF();
  const patientName = data.profile.display_name ?? 'Patient';
  const reportDate = formatChartDateLong(todayISO(data.timezone));
  const totalPages = countReportPages(data);

  const ctx: PdfPageContext = {
    doc,
    patientName,
    reportDate,
    pageNum: 1,
    totalPages,
  };

  setTotalPages(ctx, totalPages);

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
    dateRange: data.dateRange,
    timezone: data.timezone,
    includeSafeguarding: data.includeSafeguarding,
  });
  addPageFooter(ctx);

  addNewPage(ctx);
  renderPatientSummaryPage(
    ctx,
    data.profile,
    data.medications,
    checkinDates,
    data.dateRange,
    data.timezone,
  );
  addPageFooter(ctx);

  addNewPage(ctx);
  renderMrsAssessmentPage(
    ctx,
    data.checkins,
    data.medicationChanges,
    data.medications,
    data.dateRange,
  );
  addPageFooter(ctx);

  addNewPage(ctx);
  renderExtendedSymptomsPage(
    ctx,
    data.checkins,
    data.extendedSymptomLogs,
    data.quickLogEvents,
    data.dateRange,
    data.timezone,
  );
  addPageFooter(ctx);

  if (hasLabResultsInRange(data.labResults, data.dateRange)) {
    addNewPage(ctx);
    renderLabResultsPage(ctx, data.labResults, data.dateRange);
    addPageFooter(ctx);
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
    addPageFooter(ctx);
  }

  return doc.output('blob');
}
