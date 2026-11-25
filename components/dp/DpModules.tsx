'use client';
import type { DpReport, Health, StockDetail } from '@/lib/dp-dashboard';
import { dpMoney, dpNumber } from '@/lib/dp-dashboard';
import { DpBars, DpLineChart } from './DpCharts';
export const dpCard='min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';
export const dpButton='min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 disabled:opacity-50';
export const dpField='mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';
export function DpHealth({ state }: { state: Health }) { const names={green:'On track',amber:'Needs review',red:'Needs action',unknown:'No target / data'};const colors={green:'bg-emerald-50 text-emerald-800',amber:'bg-amber-50 text-amber-800',red:'bg-red-50 text-red-800',unknown:'bg-slate-100 text-slate-600'};return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${colors[state]}`}>{names[state]}</span>; }
export function DpKpi({ title, value, detail, onClick, state }: { title: string; value: string; detail?: string; onClick?: () => void; state?: Health }) {
  return <button type="button" disabled={!onClick} onClick={onClick} className={`${dpCard} text-left disabled:cursor-default`}><span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{title}</span><strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{value}</strong><span className="mt-2 block text-xs text-slate-500">{detail||'No measurements recorded'}</span>{state&&<span className="mt-3 block"><DpHealth state={state}/></span>}</button>;
}
type Props={data:DpReport;onDetails:(kind:'sales'|'inventory'|'service'|'warranty',aging?:boolean)=>void;onOpenStock:(id:string)=>void;onSite:(site:string)=>void};
export function DpSales({data,onDetails}:Props) {const sales=data.sales;return <div className="space-y-4">
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DpKpi title="Units sold" value={dpNumber(sales.units)} detail={sales.target==null?'Set a monthly / annual target':`${dpNumber(sales.attainment,'%')} of ${sales.target} target · expected by now ${sales.paceTarget}`} state={sales.signal} onClick={()=>onDetails('sales')}/><DpKpi title="Recorded gross profit" value={dpMoney(sales.grossCents)} detail={`${dpNumber(sales.financialCoverage,'%')} coverage · target ${dpMoney(sales.grossTargetCents)} · prior ${dpMoney(sales.previousGrossCents)}`} onClick={()=>onDetails('sales')}/><DpKpi title="Conversion rate" value={dpNumber(sales.conversion,'%')} detail={`${sales.conversionNumerator}/${sales.conversionDenominator} enquiries in this cohort sold`}/><DpKpi title="Average gross / unit" value={dpMoney(sales.averageGrossCents)} detail="Across units with recorded gross"/></div>
  <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]"><DpLineChart title="Cumulative sales vs target pace" points={sales.trend.map(point=>({label:point.date,value:point.cumulativeUnits,target:point.target}))}/><section className={dpCard}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">Salesperson leaderboard</h3><button type="button" className="text-xs font-bold text-blue-700" onClick={()=>onDetails('sales')}>View sales</button></div><div className="mt-3 max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="pb-2">Salesperson</th><th>Units</th><th>Recorded gross</th></tr></thead><tbody>{sales.leaderboard.map((row,index)=><tr className="border-t" key={row.id}><td className="py-3 pr-2"><span className="mr-2 text-slate-400">{index+1}</span>{row.name}</td><td>{row.units}</td><td>{dpMoney(row.grossCents)}</td></tr>)}</tbody></table>{!sales.leaderboard.length&&<p className="py-6 text-sm text-slate-500">No sales recorded in this period.</p>}</div></section></div>
  <div className="grid gap-3 sm:grid-cols-3"><DpKpi title="Close ratio" value={dpNumber(sales.closeRatio,'%')} detail="Won outcomes / won plus approved losses"/><DpKpi title="Previous comparable period" value={dpNumber(sales.previousUnits)+' units'} detail={sales.unitChange==null?'No previous sales to compare':`${dpNumber(sales.unitChange,'%')} change in units`}/><DpKpi title="Approved losses" value={dpNumber(sales.losses)} detail="Manager-approved loss outcomes in this period"/></div>
</div>;}
export function DpInventory({data,onDetails,onOpenStock}:Props) {const stock=data.inventory;return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DpKpi title="Inventory book value" value={dpMoney(stock.valueCents)} detail={`${dpNumber(stock.valueCoverage,'%')} of stock has recorded cost`} onClick={()=>onDetails('inventory')}/><DpKpi title="Units in stock" value={dpNumber(stock.units)} detail="Current unsold stock" onClick={()=>onDetails('inventory')}/><DpKpi title="Days supply" value={dpNumber(stock.daysSupply,' days')} detail="Based on the latest 30 days of sales"/><DpKpi title="Inventory turn rate" value={dpNumber(stock.annualizedTurn,'×')} detail={`${stock.snapshotDays}/30 daily stock balances · annualized`}/></div>
 <p className="text-xs text-slate-500">Inventory is current as of {new Date(data.computedAt).toLocaleString('en-AU',{timeZone:'Australia/Melbourne'})}. {stock.turnBasis} Current-stock velocity proxy: {dpNumber(stock.annualizedTurnProxy,'×')} (annualized 30-day sales / current stock).</p>
 <div className="grid gap-4 lg:grid-cols-2"><DpBars title="Inventory aging · units" rows={stock.buckets.map(row=>({label:row.label==='Unknown age'?row.label:row.label+' days',value:row.units,display:`${row.units} · ${dpMoney(row.valueCents)}`}))}/><section className={dpCard}><h3 className="font-bold">Days supply by category</h3><p className="mt-1 text-xs text-slate-500">Target range {data.settings.daysSupplyMin}–{data.settings.daysSupplyMax} days</p><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-500"><tr><th>Category</th><th>Stock</th><th>30-day sold</th><th>Days</th><th>Health</th></tr></thead><tbody>{stock.categories.map(row=><tr className="border-t" key={row.category}><td className="py-3">{row.category}</td><td>{row.units}</td><td>{row.sold30}</td><td>{dpNumber(row.daysSupply)}</td><td><DpHealth state={row.signal}/></td></tr>)}</tbody></table></div></section></div>
 <div className="grid gap-4 lg:grid-cols-2"><section className={dpCard}><h3 className="font-bold">Hot models · high demand / low stock</h3><div className="mt-3 space-y-3">{stock.hotModels.map(row=><div key={row.name} className="flex flex-wrap justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm"><strong>{row.name}</strong><span>{row.stock} in stock · {row.enquiries} recent enquiries · {row.sold30} sales</span></div>)}{!stock.hotModels.length&&<p className="text-sm text-slate-500">No models currently meet the demand/supply rule.</p>}</div></section><section className={dpCard}><h3 className="font-bold">Carrying cost</h3><p className="mt-3 text-3xl font-extrabold">{dpMoney(stock.carryingCents)}</p><p className="mt-2 text-xs text-slate-500">Existing holding-cost policy: floorplan interest and recorded paid leads. Coverage: {dpNumber(stock.carryingCoverage,'%')}. Missing source dates or costs remain unavailable.</p></section></div>
 <section className={dpCard}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">Aging vehicles requiring action</h3><button className={dpButton} onClick={()=>onDetails('inventory',true)}>View all aged stock</button></div><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-500"><tr><th>Vehicle</th><th>Days</th><th>Current price</th><th>Carrying cost</th><th>Suggested review</th></tr></thead><tbody>{stock.aging.map(row=><tr key={row.id} className="border-t"><td className="py-3 pr-3"><button type="button" className="min-h-11 text-left font-semibold text-blue-700 underline" onClick={()=>onOpenStock(row.id)}>{[row.make,row.model].filter(Boolean).join(' ')||row.stockNumber||'Vehicle'}</button><span className="block text-xs text-slate-500">{row.site} · {row.stockNumber}</span></td><td>{row.days}</td><td>{dpMoney(row.priceCents)}</td><td>{dpMoney(row.carryingCents)}</td><td className="max-w-64 text-xs">{row.action}</td></tr>)}</tbody></table>{!stock.aging.length&&<p className="py-5 text-sm text-slate-500">No stock exceeds the configured aging threshold.</p>}</div></section>
 </div>;}
export function DpBenchmark({data,onSite}:Props) {return <div className="space-y-4"><div className="grid gap-4 lg:grid-cols-2"><DpBars title="Units sold by site" rows={data.benchmarks.map(row=>({label:row.site,value:row.units,display:dpNumber(row.units)}))} onSelect={onSite}/><DpBars title="Recorded gross by site" rows={data.benchmarks.map(row=>({label:row.site,value:row.grossCents,display:dpMoney(row.grossCents)}))} onSelect={onSite}/><DpBars title="CSI by site" rows={data.benchmarks.map(row=>({label:row.site,value:row.csi,display:dpNumber(row.csi)}))} onSelect={onSite}/><DpBars title="Annualized inventory turn by site" rows={data.benchmarks.map(row=>({label:row.site,value:row.inventoryTurn,display:dpNumber(row.inventoryTurn,'×')}))} onSelect={onSite}/></div><section className={dpCard}><h3 className="font-bold">Site comparison · select a site to drill down</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead><tr>{['Site','Sold / target','Gross','Gross coverage','Conversion','Stock value','Days supply','CSI','Service revenue','Warranty submitted','Active flags'].map(title=><th key={title} className="p-2">{title}</th>)}</tr></thead><tbody>{data.benchmarks.map(row=><tr className="border-t" key={row.site}><th className="p-2"><button className="min-h-11 text-left font-bold text-blue-700 underline" onClick={()=>onSite(row.site)}>{row.site}</button></th><td>{row.units}/{row.target??'—'}</td><td>{dpMoney(row.grossCents)}</td><td>{dpNumber(row.financialCoverage,'%')}</td><td>{dpNumber(row.conversion,'%')}</td><td>{dpMoney(row.stockValueCents)}</td><td>{dpNumber(row.daysSupply)}</td><td>{dpNumber(row.csi)}</td><td>{dpMoney(row.serviceRevenueCents)}</td><td>{row.warrantySubmitted!=null?dpNumber(row.warrantySubmitted):'—'}</td><td>{row.warrantyActiveFlags!=null?<span className={row.warrantyActiveFlags>0?'font-bold text-amber-700':''}>{row.warrantyActiveFlags}</span>:'—'}</td></tr>)}</tbody></table></div>{data.benchmarks.length<2&&<p className="mt-3 text-xs text-slate-500">Select the group view to compare multiple authorised sites.</p>}</section></div>;}
export function DpService({data,onDetails}:Props) {
  const service=data.service;
  const hasWarranty = service.warrantySubmitted != null || service.warrantyTotal != null;
  const warrantyVal = service.warrantySubmitted != null ? dpNumber(service.warrantySubmitted) : dpNumber(service.claimsOpened);
  const warrantyDetail = hasWarranty
    ? `${dpNumber(service.warrantyFlagged ?? 0)} flagged (${dpNumber(service.warrantyActiveFlags ?? 0)} active flags) · ${dpNumber(service.warrantyTotal ?? 0)} total`
    : `${dpNumber(service.claimsClosed)} closed · cycle ${dpNumber(service.claimCycleDays,' days')}`;
  const warrantyState = (service.warrantyActiveFlags && service.warrantyActiveFlags > 0) ? 'amber' : ((service.warrantySubmitted && service.warrantySubmitted > 0) ? 'green' : undefined);

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <DpKpi title="CSI score" value={dpNumber(service.csi)} detail={`${service.csiResponses} responses · target ${service.targets.csi}`}/>
      <DpKpi title="Warranty cases submitted" value={warrantyVal} detail={warrantyDetail} state={warrantyState} onClick={()=>onDetails('warranty')}/>
      <DpKpi title="Technician efficiency" value={dpNumber(service.technicianEfficiency,'%')} detail={`Productive / available hours · target ${service.targets.technicianEfficiency}%`}/>
      <DpKpi title="Average repair time" value={dpNumber(service.averageRepairHours,' h')} detail={`${service.repairs} repairs · target ≤ ${service.targets.repairHours} h`}/>
      <DpKpi title="Customer retention" value={dpNumber(service.retention,'%')} detail={`${service.retentionEligible} eligible customers · target ${service.targets.retention}%`}/>
      <DpKpi title="Service revenue" value={dpMoney(service.revenueCents)} detail={`${service.bookings} Sales Floor service bookings in this period`}/>
    </div>

    {hasWarranty && (
      <section className={dpCard}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900">Warranty Cases & Flags (South Morang Live Sites)</h3>
            <p className="mt-1 text-xs text-slate-500">Evidence backend sync for South Morang Hyundai, Kia, BYD and Chery. Click any metric to review cases and technician instructions.</p>
          </div>
          <button type="button" className={dpButton} onClick={()=>onDetails('warranty')}>View all warranty cases</button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <span className="text-xs font-semibold uppercase text-emerald-800">Submitted</span>
            <strong className="mt-1 block text-2xl font-extrabold text-emerald-950">{dpNumber(service.warrantySubmitted ?? 0)}</strong>
            <span className="text-xs text-emerald-700">Ready / complete submissions</span>
          </div>
          <div className={`rounded-xl border p-3 ${(service.warrantyActiveFlags ?? 0) > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-slate-100 bg-slate-50'}`}>
            <span className="text-xs font-semibold uppercase text-amber-800">Active Flags</span>
            <strong className={`mt-1 block text-2xl font-extrabold ${(service.warrantyActiveFlags ?? 0) > 0 ? 'text-amber-900' : 'text-slate-900'}`}>{dpNumber(service.warrantyActiveFlags ?? 0)}</strong>
            <span className="text-xs text-amber-700">{dpNumber(service.warrantyFlagged ?? 0)} flagged cases</span>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <span className="text-xs font-semibold uppercase text-blue-800">Awaiting Review</span>
            <strong className="mt-1 block text-2xl font-extrabold text-blue-950">{dpNumber(service.warrantyAwaitingReview ?? 0)}</strong>
            <span className="text-xs text-blue-700">Pending review</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-xs font-semibold uppercase text-slate-600">Uploading / In-Progress</span>
            <strong className="mt-1 block text-2xl font-extrabold text-slate-900">{dpNumber(service.warrantyUploading ?? 0)}</strong>
            <span className="text-xs text-slate-500">Evidence being gathered</span>
          </div>
        </div>
        {service.warrantyFlagReasons && Object.keys(service.warrantyFlagReasons).length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
            <p className="text-xs font-bold text-amber-900">Active flag reasons requiring correction:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(service.warrantyFlagReasons).map(([reason, count]) => (
                <span key={reason} className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                  <span>{reason.replace(/_/g, ' ')}:</span>
                  <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    )}

    <section className={dpCard}>
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-bold">Department KPI matrix</h3>
        <DpHealth state={service.health}/>
      </div>
      <p className="mt-2 text-xs text-slate-500">{service.source}. Missing measurements display —. Weighted totals avoid averaging percentages from different sample sizes.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead>
            <tr>{['Department','CSI','Claims / cases','Claims cycle / flags','Efficiency','Repair hours','Retention','Revenue','Health'].map(title=><th className="p-2" key={title}>{title}</th>)}</tr>
          </thead>
          <tbody>
            {service.departments.map(row=>{
              const isWarranty = row.department.toLowerCase() === 'warranty';
              return <tr className="border-t" key={row.department}>
                <th className="p-2 text-sm">{row.department}</th>
                <td>{dpNumber(row.csi)}</td>
                <td>
                  {isWarranty && service.warrantySubmitted != null ? (
                    <button type="button" className="font-semibold text-blue-700 underline" onClick={()=>onDetails('warranty')}>
                      {dpNumber(row.claimsOpened)} submitted
                    </button>
                  ) : dpNumber(row.claimsOpened)}
                </td>
                <td>
                  {isWarranty && service.warrantyActiveFlags != null ? (
                    <span className={service.warrantyActiveFlags > 0 ? "font-bold text-amber-700" : ""}>
                      {service.warrantyActiveFlags} active flags
                    </span>
                  ) : dpNumber(row.claimCycleDays,' d')}
                </td>
                <td>{dpNumber(row.technicianEfficiency,'%')}</td>
                <td>{dpNumber(row.averageRepairHours,' h')}</td>
                <td>{dpNumber(row.retention,'%')}</td>
                <td>{dpMoney(row.revenueCents)}</td>
                <td className="p-2"><DpHealth state={row.health}/></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {!service.records&&!hasWarranty&&<p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">No service measurements have been recorded. Managers can add CSI, labour, claims and revenue in “Record service data”. Existing bookings are shown separately.</p>}
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      <DpLineChart title="CSI trend · recorded months" points={service.trend.map(row=>({label:row.month,value:row.csi,target:service.targets.csi}))}/>
      <DpLineChart title="Technician efficiency trend" suffix="%" points={service.trend.map(row=>({label:row.month,value:row.technicianEfficiency,target:service.targets.technicianEfficiency}))}/>
      <DpLineChart title="Repair time trend" suffix=" h" points={service.trend.map(row=>({label:row.month,value:row.averageRepairHours,target:service.targets.repairHours}))}/>
      <DpLineChart title="Retention trend" suffix="%" points={service.trend.map(row=>({label:row.month,value:row.retention,target:service.targets.retention}))}/>
    </div>
  </div>;
}
