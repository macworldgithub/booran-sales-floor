import { fetchApi } from './api';
export type Health = 'green' | 'amber' | 'red' | 'unknown';
export type DpSettings = { monthlyUnitsTarget: number | null; annualUnitsTarget: number | null; grossTargetCents: number | null; conversionTarget: number;
  daysSupplyMin: number; daysSupplyMax: number; agingWarningDays: number; annualCarryingRate: number;
  serviceTargets: { csi: number; technicianEfficiency: number; repairHours: number; retention: number; claimCycleDays: number };
  widgets: string[]; customKpis: { title: string; metric: string; target: number; direction: 'above' | 'below' }[] };
export type ServiceValues = { csi: number | null; csiResponses: number; claimsOpened: number | null; claimsClosed: number | null; claimCycleDays: number | null;
  technicianEfficiency: number | null; averageRepairHours: number | null; revenueCents: number | null; retention: number | null; retentionEligible: number; repairs: number; records: number;
  warrantySubmitted?: number | null; warrantyFlagged?: number | null; warrantyActiveFlags?: number | null; warrantyTotal?: number | null; warrantyAwaitingReview?: number | null; warrantyUploading?: number | null; warrantyFlagReasons?: Record<string, number> };
export type DpReport = {
  computedAt: string; timezone: string; range: { mode: string; first: string; last: string; today: string; days: number };
  availableSites: string[]; sites: string[]; settings: DpSettings; settingsRevision: number; modules: { id: string; title: string }[];
  sales: { units: number; target: number | null; paceTarget: number | null; attainment: number | null; previousUnits: number; unitChange: number | null;
    grossCents: number | null; previousGrossCents: number | null; grossTargetCents: number | null; grossAttainment: number | null; financialCoverage: number | null; averageGrossCents: number | null; conversion: number | null; conversionNumerator: number; conversionDenominator: number;
    closeRatio: number | null; losses: number; signal: Health; trend: { date: string; units: number; cumulativeUnits: number; grossCents: number | null; target: number | null }[];
    leaderboard: { id: string; name: string; units: number; grossCents: number | null; grossKnown: number }[] };
  inventory: { units: number; valueCents: number | null; valueCoverage: number | null; carryingCents: number | null; carryingCoverage: number | null; daysSupply: number | null; annualizedTurn: number | null; snapshotDays: number; averageInventory: number | null; annualizedTurnProxy: number | null; turnBasis: string;
    buckets: { label: string; units: number; valueCents: number | null; valuedUnits: number }[];
    categories: { category: string; units: number; sold30: number; daysSupply: number | null; signal: Health }[];
    hotModels: { name: string; stock: number; enquiries: number; sold30: number }[];
    aging: StockDetail[] };
  service: ServiceValues & { health: Health; signals: Record<string, Health>; targets: DpSettings['serviceTargets']; bookings: number; source: string; updatedAt: string | null;
    departments: (ServiceValues & { department: string; health: Health; signals: Record<string, Health>; warrantyFlags?: number })[];
    trend: (ServiceValues & { month: string })[] };
  benchmarks: { site: string; units: number; target: number | null; attainment: number | null; grossCents: number | null; financialCoverage: number | null; conversion: number | null; stockUnits: number; stockValueCents: number | null; daysSupply: number | null; turnProxy: number | null; inventoryTurn: number | null; csi: number | null; serviceRevenueCents: number | null; signal: Health; warrantySubmitted?: number | null; warrantyFlagged?: number | null; warrantyActiveFlags?: number | null; warrantyTotal?: number | null }[];
  alerts: { id: string; module: string; tone: Health; title: string; detail: string }[];
  customKpis: { title: string; metric: string; target: number; direction: string; value: number | null; signal: Health }[];
  sources: { name: string; state: string; detail: string }[]; definitions: Record<string, string>;
};
export type StockDetail = { id: string; site: string; stockNumber?: string; vin?: string; make?: string; model?: string; category: string; days: number | null; costCents: number | null; priceCents: number | null; carryingCents: number | null; carryingPerDayCents: number | null; action?: string };
export const serviceFields = ['csiPoints','csiResponses','claimsOpened','claimsClosed','claimCycleHours','claimCycleSamples','productiveHours','availableHours','repairHours','repairs','revenueCents','retainedCustomers','eligibleCustomers'] as const;
export type ServiceEntry = { dealership: string; date: string; department: string; revision: number } & Record<typeof serviceFields[number], number | null>;
export type SaleDetail = { id: string; dealership: string; at: string; leadId?: string; stockNumber?: string; vin?: string; make?: string; model?: string; ownerName: string; units: number; grossCents: number | null; revenueCents: number | null; origin: string };
export type WarrantyFlag = { reasonCode: string; reasonLabel: string; instruction?: string; flaggedAt?: string; flaggedBy?: string; resolvedAt?: string | null };
export type WarrantyDetail = { id: string; caseNumber: string; roNumber: string; claimNumber: string; site: string; siteId: string; dealership: string; date: string; createdAt: string; submittedAt: string | null; status: 'Draft' | 'Uploading' | 'Awaiting Review' | 'Flagged' | 'Submitted' | 'Closed' | 'Withdrawn'; make: string; model: string; year: number | string; vin: string; technicianName: string; concernTitle: string; faultCategory: string; flagCount: number; activeFlags: number; flagHistory: WarrantyFlag[] };
export type DpDetail = SaleDetail | StockDetail | WarrantyDetail | (ServiceEntry & { id: string; site: string });
export const dpQuery = (params: Record<string, string | number>) => new URLSearchParams(Object.entries(params).map(([key,value]) => [key,String(value)])).toString();
export const dpApi = {
  summary: (params: Record<string,string|number>, options?: RequestInit) => fetchApi<DpReport>('/dp/dashboard?' + dpQuery(params), options),
  details: (params: Record<string,string|number>, options?: RequestInit) => fetchApi<DpDetail[]>('/dp/drilldown?' + dpQuery(params), options),
  settings: (rooftop: string, input: Partial<DpSettings> & { revision: number }) => fetchApi('/dp/settings?rooftop=' + encodeURIComponent(rooftop), { method: 'PATCH', body: JSON.stringify(input) }),
  entry: (rooftop: string, date: string, department: string, signal?: AbortSignal) => fetchApi<ServiceEntry>('/dp/service-entry?' + dpQuery({ rooftop, date, department }), { signal }),
  saveEntry: (input: ServiceEntry & { requestId: string }) => fetchApi<ServiceEntry>('/dp/service-entry?rooftop=' + encodeURIComponent(input.dealership), { method: 'PUT', body: JSON.stringify(input) }),
  sync: (rooftop: string) => fetchApi<{ processed: number }>('/dp/sales/sync?rooftop=' + encodeURIComponent(rooftop), { method: 'POST', body: '{}', timeoutMs: 120000 }),
  onboard: (name: string) => fetchApi('/dp/sites', { method: 'POST', body: JSON.stringify({ name }) }),
};
export const dpMoney = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value / 100);
export const dpNumber = (value: number | null | undefined, suffix = '') => value == null ? '—' : new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 }).format(value) + suffix;
export function exportDpReport(data: DpReport) {
  const rows: unknown[][] = [['Dealer Principal report', data.sites.join(' / ')], ['Period', data.range.first, data.range.last], ['Timezone', data.timezone], ['Updated', data.computedAt],
    ['Site','Units sold','Target','Gross AUD','Gross coverage %','Conversion %','Stock units','Stock value AUD','Days supply','CSI','Service revenue AUD'],
    ...data.benchmarks.map(row => [row.site,row.units,row.target,row.grossCents==null?'Unavailable':row.grossCents/100,row.financialCoverage,row.conversion,row.stockUnits,row.stockValueCents==null?'Unavailable':row.stockValueCents/100,row.daysSupply,row.csi,row.serviceRevenueCents==null?'Unavailable':row.serviceRevenueCents/100]),
    ['Department','CSI','Claims opened','Claims closed','Claim cycle days','Technician efficiency %','Average repair hours','Retention %','Revenue AUD'],
    ...data.service.departments.map(row => [row.department,row.csi,row.claimsOpened,row.claimsClosed,row.claimCycleDays,row.technicianEfficiency,row.averageRepairHours,row.retention,row.revenueCents==null?'Unavailable':row.revenueCents/100]),
    ...Object.entries(data.definitions).map(([name,value]) => [name,value])];
  const cell = (value: unknown) => { let text = value == null ? 'Unavailable' : String(value); if (/^[=+\-@\t\r]/.test(text)) text="'"+text; return '"'+text.replaceAll('"','""')+'"'; };
  const url = URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`dealer-principal-${data.range.first}-${data.range.last}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
