'use client';

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  Leaf,
  LoaderCircle,
  PackageSearch,
  Plus,
  QrCode,
  RefreshCw,
  Sparkles,
  Store,
  Target,
  TrendingUp,
} from 'lucide-react';

type FarmerOSSection = 'overview' | 'farm-planning' | 'profitability' | 'buyer-demand' | 'traceability' | 'ai-advisor';

type JsonRecord = Record<string, unknown>;

function n(value: unknown) { return Number(value || 0); }
function money(value: unknown) { return `NPR ${new Intl.NumberFormat('en-NP', { maximumFractionDigits: 0 }).format(n(value))}`; }
function text(value: unknown) { return value == null ? '' : String(value); }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store', ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="farmer-os-stat"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

function Empty({ children }: { children: ReactNode }) { return <div className="farmer-os-empty">{children}</div>; }

export function FarmerOSWorkbench({ section }: { section: FarmerOSSection }) {
  const [data, setData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<JsonRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const endpoint = useMemo(() => ({
    overview: '/api/farmer-os/overview',
    'farm-planning': '/api/farmer-os/crop-cycles',
    profitability: '/api/farmer-os/profitability',
    'buyer-demand': '/api/farmer-os/buyer-demands',
    traceability: '/api/farmer-os/traceability',
    'ai-advisor': '/api/farmer-os/recommendations',
  }[section]), [section]);

  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const payload = await api<any>(endpoint);
      setData(payload);
      if (section === 'overview') {
        const rec = await api<{ data?: JsonRecord[] }>('/api/farmer-os/recommendations').catch(() => ({ data: [] }));
        setRecommendations(rec.data || []);
      } else if (section === 'ai-advisor') setRecommendations(payload.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load Farmer OS'); }
    finally { setBusy(false); }
  }, [endpoint, section]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(url: string, body: JsonRecord) {
    setBusy(true); setError(''); setNotice('');
    try { await api(url, { method: 'POST', body: JSON.stringify(body) }); setNotice('Saved successfully.'); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save'); }
    finally { setBusy(false); }
  }

  if (section === 'overview') return <Overview data={data} recs={recommendations} busy={busy} error={error} refresh={refresh} />;
  if (section === 'farm-planning') return <FarmPlanning data={data} busy={busy} error={error} notice={notice} onSubmit={(x) => submit('/api/farmer-os/crop-cycles', x)} refresh={refresh} />;
  if (section === 'profitability') return <Profitability data={data} busy={busy} error={error} notice={notice} onSubmit={(x) => submit('/api/farmer-os/expenses', x)} refresh={refresh} />;
  if (section === 'buyer-demand') return <BuyerDemand data={data} busy={busy} error={error} notice={notice} onSubmit={(x) => submit('/api/farmer-os/buyer-demand-offers', x)} refresh={refresh} />;
  if (section === 'traceability') return <Traceability data={data} busy={busy} error={error} notice={notice} onSubmit={(x) => submit('/api/farmer-os/traceability', x)} refresh={refresh} />;
  return <Advisor recs={recommendations} busy={busy} error={error} refresh={refresh} />;
}

function Toolbar({ title, subtitle, busy, refresh, icon }: { title:string; subtitle:string; busy:boolean; refresh:()=>void; icon:ReactNode }) {
  return <div className="farmer-os-toolbar"><div className="farmer-os-toolbar-title"><span className="farmer-os-icon">{icon}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div><button className="btn btn-secondary" onClick={refresh} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16}/> : <RefreshCw size={16}/>} Refresh</button></div>;
}

function Overview({ data, recs, busy, error, refresh }: any) {
  const m = data?.metrics || {};
  return <div className="farmer-os-stack">
    <Toolbar title="Farmer command center" subtitle="Sales, farm economics, stock, harvest and buyer-demand signals in one place." busy={busy} refresh={refresh} icon={<Gauge size={20}/>} />
    {error && <div className="farmer-os-error">{error}</div>}
    <div className="farmer-os-stats farmer-os-stats-4">
      <Stat label="30-day farmer revenue" value={money(m.revenue30dNpr)} hint={`${n(m.orderCount30d)} fulfilled orders`} />
      <Stat label="Farm expenses" value={money(m.farmExpense30dNpr)} hint={`Contribution ${money(m.operatingContribution30dNpr)}`} />
      <Stat label="Pending payout" value={money(m.pendingPayoutNpr)} hint="Marketplace settlement" />
      <Stat label="Buyer opportunities" value={n(m.matchingBuyerDemands)} hint={`${n(m.businessCustomers)} B2B customers`} />
    </div>
    <div className="farmer-os-stats farmer-os-stats-4">
      <Stat label="Active products" value={n(m.activeProducts)} hint={`${n(m.stockUnits)} stock units`} />
      <Stat label="Low-stock products" value={n(m.lowStockProducts)} hint="Needs attention" />
      <Stat label="Expiring lots" value={n(m.expiringLots)} hint={`${n(m.expiringQuantity)} units at risk`} />
      <Stat label="Upcoming harvest" value={n(m.upcomingHarvestCycles)} hint={`${n(m.upcomingHarvestQuantity)} expected units`} />
    </div>
    <div className="farmer-os-grid farmer-os-grid-2">
      <section className="farmer-os-card"><div className="farmer-os-section-title"><Sparkles size={18}/><div><h4>Hariyo recommendations</h4><p>Actionable signals generated from your live tenant data.</p></div></div>{recs.length ? <div className="farmer-os-list">{recs.slice(0,6).map((r:JsonRecord,i:number)=><Recommendation key={i} item={r}/>)}</div> : <Empty>No urgent recommendations right now.</Empty>}</section>
      <section className="farmer-os-card"><div className="farmer-os-section-title"><Target size={18}/><div><h4>Fast actions</h4><p>Move directly from insight to operations.</p></div></div><div className="farmer-os-actions"><Link href="/farmer/farm-planning">Plan crop cycle</Link><Link href="/farmer/profitability">Record farm expense</Link><Link href="/farmer/buyer-demand">Find B2B demand</Link><Link href="/farmer/traceability">Trace produce lots</Link><Link href="/farmer/list-harvest">Publish harvest</Link><Link href="/farmer/business-center">Review SaaS plan</Link></div></section>
    </div>
  </div>;
}

function FarmPlanning({ data,busy,error,notice,onSubmit,refresh }:any) {
  const [form,setForm]=useState({cropName:'',areaValue:'1',areaUnit:'ropani',plantingDate:'',expectedHarvestDate:'',expectedQuantity:'',unit:'kg',targetPriceNpr:'',budgetNpr:'',status:'planned'});
  const rows=(data?.data || []) as JsonRecord[];
  function go(e:FormEvent){e.preventDefault();onSubmit({...form,areaValue:Number(form.areaValue),expectedQuantity:Number(form.expectedQuantity),targetPriceNpr:Number(form.targetPriceNpr||0),budgetNpr:Number(form.budgetNpr||0)});}
  return <div className="farmer-os-stack"><Toolbar title="Crop & harvest planner" subtitle="Plan planting, quantity, budget, target price and harvest timing before produce reaches inventory." busy={busy} refresh={refresh} icon={<CalendarDays size={20}/>} />{error&&<div className="farmer-os-error">{error}</div>}{notice&&<div className="farmer-os-success">{notice}</div>}
    <div className="farmer-os-grid farmer-os-grid-2"><form className="farmer-os-card farmer-os-form" onSubmit={go}><h4><Plus size={17}/> New crop cycle</h4><Field label="Crop" value={form.cropName} set={(v)=>setForm({...form,cropName:v})}/><div className="farmer-os-form-row"><Field label="Area" value={form.areaValue} set={(v)=>setForm({...form,areaValue:v})} type="number"/><Select label="Area unit" value={form.areaUnit} set={(v)=>setForm({...form,areaUnit:v})} options={['ropani','hectare','bigha','kattha','sqm','acre']}/></div><div className="farmer-os-form-row"><Field label="Planting date" value={form.plantingDate} set={(v)=>setForm({...form,plantingDate:v})} type="date"/><Field label="Expected harvest" value={form.expectedHarvestDate} set={(v)=>setForm({...form,expectedHarvestDate:v})} type="date"/></div><div className="farmer-os-form-row"><Field label="Expected quantity" value={form.expectedQuantity} set={(v)=>setForm({...form,expectedQuantity:v})} type="number"/><Field label="Unit" value={form.unit} set={(v)=>setForm({...form,unit:v})}/></div><div className="farmer-os-form-row"><Field label="Target price / unit" value={form.targetPriceNpr} set={(v)=>setForm({...form,targetPriceNpr:v})} type="number"/><Field label="Budget" value={form.budgetNpr} set={(v)=>setForm({...form,budgetNpr:v})} type="number"/></div><Select label="Status" value={form.status} set={(v)=>setForm({...form,status:v})} options={['planned','planted','growing','ready','harvesting','completed']}/><button className="btn btn-primary" disabled={busy||!form.cropName||!form.expectedQuantity}>Save crop cycle</button></form>
      <section className="farmer-os-card"><h4><Leaf size={17}/> Active crop cycles</h4>{rows.length?<div className="farmer-os-list">{rows.map((r,i)=><div className="farmer-os-row" key={text(r.id)||i}><div><strong>{text(r.crop_name)}</strong><span>{text(r.status)} · {text(r.expected_harvest_date)||'No harvest date'}</span></div><div className="farmer-os-row-right"><b>{n(r.expected_quantity)} {text(r.unit)}</b><small>Projected {money(r.projected_revenue_npr)}</small><small>Cost {money(r.actual_cost_npr)}</small></div></div>)}</div>:<Empty>Create your first crop cycle to begin production planning.</Empty>}</section>
    </div></div>;
}

function Profitability({data,busy,error,notice,onSubmit,refresh}:any){
  const s=data?.summary||{}; const cycles=(data?.cropCycles||[]) as JsonRecord[]; const spend=(data?.categorySpend||[]) as JsonRecord[];
  const [form,setForm]=useState({expenseDate:new Date().toISOString().slice(0,10),category:'labor',description:'',amountNpr:'',paymentMethod:'cash',paymentStatus:'paid',cropCycleId:''});
  function go(e:FormEvent){e.preventDefault();onSubmit({...form,amountNpr:Number(form.amountNpr),cropCycleId:form.cropCycleId||undefined});}
  return <div className="farmer-os-stack"><Toolbar title="Farm profitability" subtitle="Track crop cost, farm spending, marketplace income and contribution margin." busy={busy} refresh={refresh} icon={<TrendingUp size={20}/>} />{error&&<div className="farmer-os-error">{error}</div>}{notice&&<div className="farmer-os-success">{notice}</div>}
    <div className="farmer-os-stats farmer-os-stats-4"><Stat label="Revenue" value={money(s.revenueNpr)}/><Stat label="Farm expenses" value={money(s.farmExpensesNpr)}/><Stat label="Waste loss" value={money(s.wasteLossNpr)}/><Stat label="Operating contribution" value={money(s.operatingContributionNpr)}/></div>
    <div className="farmer-os-grid farmer-os-grid-2"><form className="farmer-os-card farmer-os-form" onSubmit={go}><h4><CircleDollarSign size={17}/> Record expense</h4><div className="farmer-os-form-row"><Field label="Date" value={form.expenseDate} set={(v)=>setForm({...form,expenseDate:v})} type="date"/><Select label="Category" value={form.category} set={(v)=>setForm({...form,category:v})} options={['seed','fertilizer','labor','irrigation','electricity','equipment','rent','packaging','transport','storage','commission','certification','other']}/></div><Field label="Description" value={form.description} set={(v)=>setForm({...form,description:v})}/><Field label="Amount NPR" value={form.amountNpr} set={(v)=>setForm({...form,amountNpr:v})} type="number"/><label><span>Crop cycle (optional)</span><select value={form.cropCycleId} onChange={(e)=>setForm({...form,cropCycleId:e.target.value})}><option value="">General farm expense</option>{cycles.map((c)=><option value={text(c.id)} key={text(c.id)}>{text(c.crop_name)}</option>)}</select></label><button className="btn btn-primary" disabled={busy||!form.description||!form.amountNpr}>Record expense</button></form>
      <section className="farmer-os-card"><h4><BarChart3 size={17}/> 90-day cost mix</h4>{spend.length?<div className="farmer-os-list">{spend.map((r,i)=><div className="farmer-os-row" key={i}><div><strong>{text(r.category).replaceAll('_',' ')}</strong></div><div className="farmer-os-row-right"><b>{money(r.value)}</b></div></div>)}</div>:<Empty>No farm expenses have been recorded yet.</Empty>}</section></div>
    <section className="farmer-os-card"><h4>Crop economics</h4><div className="farmer-os-table-wrap"><table className="farmer-os-table"><thead><tr><th>Crop</th><th>Status</th><th>Area</th><th>Expected/Actual</th><th>Cost</th><th>Est. revenue</th><th>Est. margin</th></tr></thead><tbody>{cycles.map((c)=><tr key={text(c.id)}><td>{text(c.crop_name)}</td><td>{text(c.status)}</td><td>{n(c.area_value)} {text(c.area_unit)}</td><td>{n(c.actual_quantity)||n(c.expected_quantity)} {text(c.unit)}</td><td>{money(c.actual_cost_npr)}</td><td>{money(c.estimated_revenue_npr)}</td><td>{money(n(c.estimated_revenue_npr)-n(c.actual_cost_npr))}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function BuyerDemand({data,busy,error,notice,onSubmit,refresh}:any){const rows=(data?.data||[]) as JsonRecord[];const [draft,setDraft]=useState<Record<string,{quantity:string;price:string}>>({});return <div className="farmer-os-stack"><Toolbar title="Buyer demand network" subtitle="Match your available or upcoming produce with restaurants, hotels, retailers and institutional buyers." busy={busy} refresh={refresh} icon={<Target size={20}/>} />{error&&<div className="farmer-os-error">{error}</div>}{notice&&<div className="farmer-os-success">{notice}</div>}{rows.length?<div className="farmer-os-demand-grid">{rows.map((r)=>{const id=text(r.id);const f=draft[id]||{quantity:text(r.quantity),price:text(r.target_price_npr||'')};return <article className="farmer-os-card farmer-os-demand" key={id}><div className="farmer-os-demand-score">{n(r.match_score)}% match</div><h4>{text(r.product_name)}</h4><p>{text(r.buyer_name)} · {text(r.buyer_type)}</p><div className="farmer-os-mini-stats"><span><b>{n(r.quantity)} {text(r.unit)}</b> demand</span><span><b>{text(r.frequency).replaceAll('_',' ')}</b> frequency</span><span><b>{text(r.district)||text(r.province)||'Flexible'}</b> delivery</span><span><b>{r.target_price_npr?money(r.target_price_npr):'Open'}</b> target</span></div>{r.offer_status?<div className="farmer-os-success">Your offer: {n(r.offer_quantity)} units @ {money(r.offer_price_npr)}</div>:<div className="farmer-os-inline-form"><input aria-label="Offer quantity" type="number" value={f.quantity} onChange={(e)=>setDraft({...draft,[id]:{...f,quantity:e.target.value}})} placeholder="Qty"/><input aria-label="Offer unit price" type="number" value={f.price} onChange={(e)=>setDraft({...draft,[id]:{...f,price:e.target.value}})} placeholder="NPR/unit"/><button className="btn btn-primary" disabled={busy||!f.quantity||!f.price} onClick={()=>onSubmit({demandId:id,quantity:Number(f.quantity),unitPriceNpr:Number(f.price),deliveryFeeNpr:0})}>Send offer</button></div>}</article>})}</div>:<Empty>No matching buyer requirements right now. New B2B demand will appear here automatically.</Empty>}</div>}

function Traceability({data,busy,error,notice,onSubmit,refresh}:any){const rows=(data?.data||[]) as JsonRecord[];const [lotId,setLotId]=useState('');const [eventType,setEventType]=useState('packed');const [location,setLocation]=useState('');function go(e:FormEvent){e.preventDefault();onSubmit({lotId,eventType,eventAt:new Date().toISOString(),locationLabel:location,details:{source:'farmer-studio'}});}return <div className="farmer-os-stack"><Toolbar title="QR produce traceability" subtitle="Create a transparent farm-to-customer timeline for each lot." busy={busy} refresh={refresh} icon={<QrCode size={20}/>} />{error&&<div className="farmer-os-error">{error}</div>}{notice&&<div className="farmer-os-success">{notice}</div>}<div className="farmer-os-grid farmer-os-grid-2"><form className="farmer-os-card farmer-os-form" onSubmit={go}><h4><Plus size={17}/> Add trace event</h4><label><span>Lot</span><select value={lotId} onChange={(e)=>setLotId(e.target.value)} required><option value="">Choose produce lot</option>{rows.map((r)=><option value={text(r.id)} key={text(r.id)}>{text(r.lot_code)} — {text(r.product_name)}</option>)}</select></label><Select label="Event" value={eventType} set={setEventType} options={['planted','harvested','received','quality_checked','graded','packed','stored','transferred','dispatched','delivered','returned','disposed','note']}/><Field label="Location / hub" value={location} set={setLocation}/><button className="btn btn-primary" disabled={busy||!lotId}>Add trace event</button></form><section className="farmer-os-card"><h4><PackageSearch size={17}/> Traceable lots</h4>{rows.length?<div className="farmer-os-list">{rows.map((r)=><div className="farmer-os-row" key={text(r.id)}><div><strong>{text(r.product_name)} · {text(r.lot_code)}</strong><span>{text(r.origin_label)||text(r.farm_name)||'Origin recorded'} · {n(r.event_count)} events</span></div><div className="farmer-os-row-right">{r.public_token?<Link className="farmer-os-trace-link" href={`/trace/${text(r.public_token)}`} target="_blank"><QrCode size={14}/> Public trace</Link>:<small>Add an event to enable public trace</small>}</div></div>)}</div>:<Empty>Create produce lots first to activate QR traceability.</Empty>}</section></div></div>}

function Advisor({recs,busy,error,refresh}:any){
  const [question,setQuestion]=useState('What should I focus on this week?');
  const [language,setLanguage]=useState<'en'|'ne'>('en');
  const [answer,setAnswer]=useState('');
  const [source,setSource]=useState('');
  const [aiBusy,setAiBusy]=useState(false);
  const [aiError,setAiError]=useState('');
  async function ask(){setAiBusy(true);setAiError('');try{const p=await api<{answer?:string;source?:string;usage?:{used?:number;limit?:number|null}}>('/api/farmer-os/ai-assistant',{method:'POST',body:JSON.stringify({question,language})});setAnswer(p.answer||'');setSource(`${p.source||'data-engine'}${p.usage?.limit?` · ${p.usage.used}/${p.usage.limit} monthly usage`:''}`)}catch(e){setAiError(e instanceof Error?e.message:'Hariyo AI is unavailable')}finally{setAiBusy(false)}}
  return <div className="farmer-os-stack"><Toolbar title="Hariyo AI farm-business copilot" subtitle="Ask questions against your live tenant sales, crops, expenses, stock and buyer-demand data." busy={busy} refresh={refresh} icon={<Sparkles size={20}/>} />{error&&<div className="farmer-os-error">{error}</div>}<div className="farmer-os-advisor-hero"><Sparkles size={28}/><div><span>HARIYO AI + DATA ENGINE</span><h3>{recs.length ? `${recs.length} actions found for your farm` : 'Your farm signals look healthy'}</h3><p>Workers AI enriches answers when available; tenant-data recommendations remain available as a resilient fallback.</p></div></div><section className="farmer-os-card farmer-os-ai-chat"><div className="farmer-os-section-title"><Sparkles size={18}/><div><h4>Ask Hariyo AI</h4><p>English or नेपाली. The assistant is instructed not to invent missing market, weather, disease or legal facts.</p></div></div><div className="farmer-os-ai-controls"><select value={language} onChange={(e)=>setLanguage(e.target.value as 'en'|'ne')}><option value="en">English</option><option value="ne">नेपाली</option></select><input value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder="Ask about sales, expenses, crops, buyer demand…"/><button className="btn btn-primary" onClick={()=>void ask()} disabled={aiBusy||question.trim().length<2}>{aiBusy?<LoaderCircle className="spin" size={16}/>:<Sparkles size={16}/>} Ask</button></div>{aiError&&<div className="farmer-os-error">{aiError}</div>}{answer&&<div className="farmer-os-ai-answer"><span>{source}</span><p>{answer}</p></div>}</section>{recs.length?<div className="farmer-os-grid farmer-os-grid-2">{recs.map((r:JsonRecord,i:number)=><Recommendation item={r} key={i}/>)}</div>:<Empty>No immediate interventions are required.</Empty>}</div>}


function Recommendation({item}:{item:JsonRecord}){const priority=text(item.priority||'medium');return <div className={`farmer-os-recommendation priority-${priority}`}><div className="farmer-os-rec-icon">{priority==='critical'||priority==='high'?<AlertTriangle size={17}/>:<Sparkles size={17}/>}</div><div><span>{text(item.type).toUpperCase()} · {priority.toUpperCase()}</span><strong>{text(item.title)}</strong><p>{text(item.message)}</p>{item.actionHref&&<Link href={text(item.actionHref)}>{text(item.actionLabel||'Open')}</Link>}</div></div>}
function Field({label,value,set,type='text'}:{label:string;value:string;set:(v:string)=>void;type?:string}){return <label><span>{label}</span><input type={type} value={value} onChange={(e)=>set(e.target.value)}/></label>}
function Select({label,value,set,options}:{label:string;value:string;set:(v:string)=>void;options:string[]}){return <label><span>{label}</span><select value={value} onChange={(e)=>set(e.target.value)}>{options.map((o)=><option value={o} key={o}>{o.replaceAll('_',' ')}</option>)}</select></label>}

export function BuyerDemandPortal(){
  const [rows,setRows]=useState<JsonRecord[]>([]); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState('');
  const [form,setForm]=useState({buyerName:'',buyerType:'restaurant',productName:'',quantity:'',unit:'kg',frequency:'weekly',targetPriceNpr:'',province:'bagmati',district:'Kathmandu',deliveryDate:''});
  const refresh=useCallback(async()=>{setBusy(true);setError('');try{const p=await api<{data?:JsonRecord[]}>('/api/farmer-os/buyer-demands?scope=mine');setRows(p.data||[])}catch(e){setError(e instanceof Error?e.message:'Unable to load demand')}finally{setBusy(false)}},[]);
  useEffect(()=>{void refresh()},[refresh]);
  async function go(e:FormEvent){e.preventDefault();setBusy(true);setError('');setNotice('');try{await api('/api/farmer-os/buyer-demands',{method:'POST',body:JSON.stringify({...form,quantity:Number(form.quantity),targetPriceNpr:form.targetPriceNpr?Number(form.targetPriceNpr):undefined})});setNotice('Requirement published to matching farmers.');setForm({...form,productName:'',quantity:'',targetPriceNpr:''});await refresh()}catch(e){setError(e instanceof Error?e.message:'Unable to publish')}finally{setBusy(false)}}
  return <div className="farmer-os-stack"><Toolbar title="Business procurement demand" subtitle="Tell verified farmers what your restaurant, hotel, store or institution needs and collect supply offers." busy={busy} refresh={refresh} icon={<Store size={20}/>} />{error&&<div className="farmer-os-error">{error}</div>}{notice&&<div className="farmer-os-success">{notice}</div>}<div className="farmer-os-grid farmer-os-grid-2"><form className="farmer-os-card farmer-os-form" onSubmit={go}><h4><Plus size={17}/> Publish requirement</h4><Field label="Business / buyer name" value={form.buyerName} set={(v)=>setForm({...form,buyerName:v})}/><div className="farmer-os-form-row"><Select label="Buyer type" value={form.buyerType} set={(v)=>setForm({...form,buyerType:v})} options={['restaurant','hotel','retailer','wholesaler','school','hospital','processor','corporate','cooperative','other']}/><Field label="Product" value={form.productName} set={(v)=>setForm({...form,productName:v})}/></div><div className="farmer-os-form-row"><Field label="Quantity" value={form.quantity} set={(v)=>setForm({...form,quantity:v})} type="number"/><Field label="Unit" value={form.unit} set={(v)=>setForm({...form,unit:v})}/></div><div className="farmer-os-form-row"><Select label="Frequency" value={form.frequency} set={(v)=>setForm({...form,frequency:v})} options={['one_time','weekly','biweekly','monthly','contract']}/><Field label="Target NPR/unit" value={form.targetPriceNpr} set={(v)=>setForm({...form,targetPriceNpr:v})} type="number"/></div><div className="farmer-os-form-row"><Field label="Province" value={form.province} set={(v)=>setForm({...form,province:v})}/><Field label="District" value={form.district} set={(v)=>setForm({...form,district:v})}/></div><Field label="Needed by" value={form.deliveryDate} set={(v)=>setForm({...form,deliveryDate:v})} type="date"/><button className="btn btn-primary" disabled={busy||!form.buyerName||!form.productName||!form.quantity}>Publish to farmer network</button></form><section className="farmer-os-card"><h4>Your requirements</h4>{rows.length?<div className="farmer-os-list">{rows.map((r)=><div className="farmer-os-row" key={text(r.id)}><div><strong>{text(r.product_name)}</strong><span>{n(r.quantity)} {text(r.unit)} · {text(r.frequency).replaceAll('_',' ')} · {text(r.status)}</span></div><div className="farmer-os-row-right"><b>{n(r.offer_count)} offers</b><small>{r.best_offer_npr?`Best ${money(r.best_offer_npr)}/unit`:'Waiting for offers'}</small></div></div>)}</div>:<Empty>Publish your first produce requirement.</Empty>}</section></div></div>
}
