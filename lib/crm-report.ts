import {fetchApi} from './api';
import type {Lead} from './types';
export type Rate={numerator:number;denominator:number;value:number|null};
export type CrmMetrics={leads:number;contacted:number;appointments:number;confirmedAppointments:number;shows:number;sales:number;firstResponse:{medianMinutes:number|null;samples:number;internetUnder5:Rate};contactRate:Rate;appointmentRate:Rate;showRate:Rate;closeRate:Rate;conversion:Rate;videosSent:number};
export type CrmReport={window:{from:string;to:string;asOf:string;previousFrom:string;timezone:string};computedAt:string;settings:{firstResponseMinutes:number;followUpHours:number;conversionTarget:number;monthlyTarget:number};metrics:CrmMetrics;previous:CrmMetrics;
  daily:({date:string}&CrmMetrics)[];stages:{stage:string;count:number;valueCents:number;valuedLeads:number}[];
  operations:{active:number;unactioned:number;overdue:number;opportunities:number;atRisk:number;inPlay:number;handled:number;stepIns7d:number};
  engagement:{videoMessages:number;videoViewRate:Rate;emailOpenRate:null;websiteSignalsAvailable:boolean;deliveredMessages:number};
  segments:Record<string,({name:string}&CrmMetrics)[]>;definitions:Record<string,string>;dataQuality:Record<string,number>};
export type PriorityLead={lead:Lead;state:string;reasons:{key:string;text:string;next:string;weight:number}[];intent:string[];score:number;suggestedNext:string;key:string;handled:boolean;revision:number|null;
  firstResponse:{targetMinutes:number;breached:boolean;dueAt:string|null;ageMinutes:number|null};lastContactAt:string|null;minutesSinceContact:number|null;
  signals:Record<string,number|boolean|null>;appointments:{id:string;when:string;status:string;confirmed:boolean;shownAt?:string}[];deals:{id:string;appointmentId:string|null}[]};
export const crmQuery=(params:Record<string,string|number>)=>new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)])).toString();
export const priorityLeads=(params:Record<string,string|number>,options?:RequestInit)=>fetchApi<PriorityLead[]>('/crm/report/leads?'+crmQuery(params),options);
export const rateText=(rate:Rate)=>rate.value===null?'—':rate.value+'%';
export function exportCrmReport(report:CrmReport,scope:string){
  const rows:unknown[][]=[['PULSE Sales CRM report',scope],['Generated',report.computedAt],['From',report.window.from],['Through',report.window.asOf],['Timezone',report.window.timezone],['Metric','Value','Numerator','Denominator'],
    ['Leads',report.metrics.leads],['Median first response (minutes)',report.metrics.firstResponse.medianMinutes ?? 'Unavailable']];
  for(const key of ['contactRate','appointmentRate','showRate','closeRate','conversion'] as const){const r=report.metrics[key];rows.push([key,r.value===null?'Unavailable':r.value+'%',r.numerator,r.denominator]);}
  rows.push(['Video messages sent',report.engagement.videoMessages],['Pipeline stage','Customers','Known value (AUD)','Customers with known value']);
  report.stages.forEach(row=>rows.push([row.stage,row.count,row.valueCents/100,row.valuedLeads]));
  rows.push(['Daily cohort','Leads','Contact rate','Appointment rate','Show rate','Conversion']);
  report.daily.forEach(row=>rows.push([row.date,row.leads,rateText(row.contactRate),rateText(row.appointmentRate),rateText(row.showRate),rateText(row.conversion)]));
  for(const [name,definition] of Object.entries(report.definitions))rows.push([name,definition]);
  const cell=(value:unknown)=>{let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='booran-pulse-report.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
