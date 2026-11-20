import {fetchApi} from './api';
import type {Lead} from './types';
export type TrafficState='green'|'amber'|'red'|'grey';
export type TrafficMetric='customersUpdated'|'videosAdded'|'videosSent'|'nextActionsSet'|'tasksCompleted'|'sales';
export type TrafficProgress={newCustomers:number;fullyCovered:number;coveragePercent:number|null;coverageSignal:TrafficState;targets:Record<Exclude<TrafficMetric,'sales'>,number>;coverage:Record<Exclude<TrafficMetric,'sales'>,number>;signals:Record<TrafficMetric,TrafficState>;counts:Record<TrafficMetric,number>;allGreen:boolean};
export type TrafficMember=TrafficProgress&{id:string;name:string;events:{kind:string;at:string;leadId:string|null;customer:string;detail:string}[]};
export type TrafficData={date:string;today:string;timezone:string;computedAt:string;members:TrafficMember[];summary:TrafficProgress;dailyUnassigned:number;definitions:Record<string,string>;
 priorities:{unassigned:number;overdue:number;asOf:string;approvals:{total:number;loss:number;dates:number;consent:number;merges:number}}};
export type TrafficAction={id:string;leadId?:string;kind:'customer'|'task'|'sale';name?:string;customer?:string;title?:string;missing:string[];ownerId?:string;due_at?:string;createdAt?:string;at?:string};
export type TrafficQueueRow={lead:Lead;ageMinutes:number|null;dueAt:string|null};
export const trafficColumns:[TrafficMetric,string][]=[['customersUpdated','Customers updated'],['videosAdded','Videos added'],['videosSent','Videos sent'],['nextActionsSet','Next actions set'],['tasksCompleted','Tasks completed'],['sales','Sales']];
export const missingActionLabels:Record<string,string>={customersUpdated:'Update customer',videosAdded:'Add a video',videosSent:'Send a video',nextActionsSet:'Schedule follow-up',tasksCompleted:'Complete task'};
const query=(params:Record<string,string|number>)=>new URLSearchParams(Object.entries(params).map(([key,value])=>[key,String(value)])).toString();
export const trafficApi={
 summary:(params:Record<string,string|number>,options?:RequestInit)=>fetchApi<TrafficData>('/daily-traffic?'+query(params),options),
 actions:(params:Record<string,string|number>,options?:RequestInit)=>fetchApi<TrafficAction[]>('/daily-traffic/actions?'+query(params),options),
 queue:(params:Record<string,string|number>,options?:RequestInit)=>fetchApi<TrafficQueueRow[]>('/daily-traffic/queue?'+query(params),options),
};
export function exportDailyTraffic(data:TrafficData,scope:string){
 const rows:unknown[][]=[['Daily PULSE / Traffic report',scope],['Workday',data.date],['Timezone',data.timezone],['Generated',data.computedAt],['Daily new customers',data.summary.newCustomers],['Fully covered',data.summary.fullyCovered],['Team coverage',data.summary.coveragePercent===null?'Not applicable':data.summary.coveragePercent+'%'],
 ['Salesperson','Daily new','Fully covered','Coverage %',...trafficColumns.flatMap(([,title])=>[title+' activity',title+' coverage',title+' target',title+' light'])]];
 data.members.forEach(person=>rows.push([person.name,person.newCustomers,person.fullyCovered,person.coveragePercent??'Not applicable',...trafficColumns.flatMap(([key])=>[person.counts[key],key==='sales'?'No target':person.coverage[key],key==='sales'?'No target':person.targets[key],person.signals[key]])]));
 rows.push(['Current unassigned',data.priorities.unassigned],['Current pending approvals',data.priorities.approvals.total],['Current overdue SLA',data.priorities.overdue]);
 for(const [name,text]of Object.entries(data.definitions))rows.push([name,text]);
 const cell=(value:unknown)=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='daily-pulse-traffic-'+data.date+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
