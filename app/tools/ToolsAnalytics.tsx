'use client';

import { useId, useMemo, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toolsChartTheme } from '@/lib/charts';
import { ToolsIcon as Icon, type IconName } from './ToolsIcon';
import { AnimatedText, ToolsDialog } from './ToolsUI';
import s from './tools.module.css';

export type UsageEvent={id:string;name:string;detail?:string;at:string;by?:string};
export type ClientError={id:string;message:string;at:string};
export type FeedbackRecord={id:string;text?:string;audioName?:string;audioUrl?:string;at:string;by:string};
type Panel='features'|'errors'|'feedback'|'trend'|'heatmap';
export type TrendRange='daily'|'weekly'|'monthly';
export type TrendPoint={key:string;label:string;count:number};
export type TrendSummary={direction:'increasing'|'decreasing'|'stable';deltaPercent:number|null;total:number;peak:TrendPoint};

const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TIME_BLOCKS=['00-04','04-08','08-12','12-16','16-20','20-24'];

function dayKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function startOfWeek(date:Date){const copy=new Date(date);copy.setHours(0,0,0,0);copy.setDate(copy.getDate()-((copy.getDay()+6)%7));return copy;}
function readableAction(name:string){return name.replace(/[_-]+/g,' ').replace(/^./,letter=>letter.toUpperCase());}

export function buildUsageTrend(usage:UsageEvent[],range:TrendRange):TrendPoint[]{
  const now=new Date();
  if(range==='daily') return Array.from({length:14},(_,offset)=>{const date=new Date(now);date.setHours(0,0,0,0);date.setDate(date.getDate()-(13-offset));const key=dayKey(date);return{key,label:date.toLocaleDateString('en-GB',{day:'numeric',month:'short'}),count:usage.filter(event=>dayKey(new Date(event.at))===key).length};});
  if(range==='weekly') return Array.from({length:12},(_,offset)=>{const date=startOfWeek(now);date.setDate(date.getDate()-7*(11-offset));const end=new Date(date);end.setDate(end.getDate()+7);return{key:dayKey(date),label:date.toLocaleDateString('en-GB',{day:'numeric',month:'short'}),count:usage.filter(event=>{const value=new Date(event.at);return value>=date&&value<end;}).length};});
  return Array.from({length:12},(_,offset)=>{const date=new Date(now.getFullYear(),now.getMonth()-(11-offset),1);const end=new Date(date.getFullYear(),date.getMonth()+1,1);return{key:`${date.getFullYear()}-${date.getMonth()}`,label:date.toLocaleDateString('en-GB',{month:'short'}),count:usage.filter(event=>{const value=new Date(event.at);return value>=date&&value<end;}).length};});
}

export function summarizeUsageTrend(points:TrendPoint[]):TrendSummary{
  const midpoint=Math.ceil(points.length/2);
  const earlier=points.slice(0,midpoint).reduce((total,point)=>total+point.count,0);
  const recent=points.slice(midpoint).reduce((total,point)=>total+point.count,0);
  const change=recent-earlier;
  const tolerance=Math.max(1,Math.round((earlier+recent)*.05));
  const direction=Math.abs(change)<=tolerance?'stable':change>0?'increasing':'decreasing';
  const deltaPercent=earlier?Math.round(change/earlier*100):recent?null:0;
  const peak=points.reduce((highest,point)=>point.count>highest.count?point:highest,points[0]||{key:'none',label:'No activity',count:0});
  return {direction,deltaPercent,total:earlier+recent,peak};
}

function UsageTrendChart({points,range,expanded=false}:{points:TrendPoint[];range:TrendRange;expanded?:boolean}){
  const reduced=useReducedMotion();
  const colors=toolsChartTheme();
  const gradientId=`tools-usage-${useId().replace(/:/g,'')}`;
  return <div className={s.polishedChart} role="img" aria-label={`${range} Tools usage trend`}>
    <ResponsiveContainer width="100%" height={expanded?320:238}>
      <AreaChart data={points} margin={{top:12,right:12,bottom:2,left:-6}} accessibilityLayer>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="4%" stopColor={colors.accent} stopOpacity={.3}/><stop offset="96%" stopColor={colors.accent} stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid strokeDasharray="4 5" stroke={colors.grid} vertical={false}/>
        <XAxis dataKey="label" tick={{fill:colors.axis,fontSize:10}} axisLine={false} tickLine={false} minTickGap={24}/>
        <YAxis tick={{fill:colors.axis,fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false} width={34}/>
        <Tooltip contentStyle={colors.tooltip} cursor={{stroke:colors.accent,strokeOpacity:.22,strokeWidth:1}} formatter={(value:number)=>[`${value} action${value===1?'':'s'}`,'Activity']}/>
        <Area type="monotone" dataKey="count" stroke={colors.accent} strokeWidth={2.5} fill={`url(#${gradientId})`} dot={{r:2.8,fill:'var(--paper)',stroke:colors.accent,strokeWidth:2}} activeDot={{r:5.5,fill:colors.accent,stroke:'var(--paper)',strokeWidth:3}} isAnimationActive={!reduced} animationDuration={700} animationEasing="ease-out"/>
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

function FeatureUseChart({features}:{features:Array<[string,number]>}){
  const reduced=useReducedMotion();
  const colors=toolsChartTheme();
  const data=features.slice(0,8).map(([name,count])=>({name:readableAction(name),count}));
  return <div className={s.featureChart} role="img" aria-label="Most frequently used Tools features"><ResponsiveContainer width="100%" height={Math.max(210,data.length*38)}><BarChart data={data} layout="vertical" margin={{top:8,right:18,bottom:2,left:2}} accessibilityLayer>
    <CartesianGrid strokeDasharray="4 5" stroke={colors.grid} horizontal={false}/>
    <XAxis type="number" allowDecimals={false} tick={{fill:colors.axis,fontSize:10}} axisLine={false} tickLine={false}/>
    <YAxis type="category" dataKey="name" width={116} tick={{fill:colors.axis,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(value:string)=>value.length>18?`${value.slice(0,17)}…`:value}/>
    <Tooltip contentStyle={colors.tooltip} cursor={{fill:colors.grid,fillOpacity:.55}} formatter={(value:number)=>[`${value} use${value===1?'':'s'}`,'Activity']}/>
    <Bar dataKey="count" barSize={17} radius={[0,8,8,0]} isAnimationActive={!reduced} animationDuration={650}>{data.map((entry,index)=><Cell key={entry.name} fill={colors.series[index%colors.series.length]} fillOpacity={.88}/>)}</Bar>
  </BarChart></ResponsiveContainer></div>;
}

export function ToolsAnalytics({usage,errors,feedback}:{usage:UsageEvent[];errors:ClientError[];feedback:FeedbackRecord[]}) {
  const [detail,setDetail]=useState<Panel|null>(null);
  const [trendRange,setTrendRange]=useState<TrendRange>('daily');
  const reduced=useReducedMotion();
  const counts=useMemo(()=>usage.reduce<Record<string,number>>((out,event)=>({...out,[event.name]:(out[event.name]||0)+1}),{}),[usage]);
  const features=Object.entries(counts).filter(([name])=>name!=='theme changed').sort((a,b)=>b[1]-a[1]);
  const accounts=new Set(usage.map(event=>event.by).filter(Boolean)).size;
  const trendPoints=useMemo(()=>buildUsageTrend(usage,trendRange),[usage,trendRange]);
  const trendSummary=useMemo(()=>summarizeUsageTrend(trendPoints),[trendPoints]);
  const heat=useMemo(()=>Array.from({length:7},(_,day)=>Array.from({length:6},(_,block)=>usage.filter(event=>{const date=new Date(event.at);return date.getDay()===day&&Math.floor(date.getHours()/4)===block;}).length)),[usage]);
  const heatMax=Math.max(1,...heat.flat());
  const peak=heat.flatMap((row,day)=>row.map((count,block)=>({count,day,block}))).sort((a,b)=>b.count-a.count)[0];
  const cards:{label:string;value:number;hint:string;icon:IconName;tone:string}[]=[
    {label:'Recorded actions',value:usage.length,hint:'Across all accounts',icon:'history',tone:'brand'},
    {label:'Active accounts',value:accounts,hint:'Contributing activity',icon:'user',tone:'success'},
    {label:'Captured errors',value:errors.length,hint:'Reported automatically',icon:'alert',tone:'danger'},
    {label:'Feedback received',value:feedback.length,hint:'Suggestions and recordings',icon:'edit',tone:'warm'},
  ];
  const panelMotion={initial:{opacity:0,y:reduced?0:12},animate:{opacity:1,y:0}};
  const errorsList=<div className={s.errorList}>{errors.map(error=><div key={error.id}><Icon name="alert" size={16}/><span><strong>{error.message}</strong><small>{new Date(error.at).toLocaleString()}</small></span></div>)}</div>;
  const feedbackList=<div className={s.errorList}>{feedback.map(item=><div key={item.id}><Icon name={item.audioName?'attachment':'edit'} size={16}/><span><strong>{item.text||item.audioName}</strong><small>{item.by} · {new Date(item.at).toLocaleString()}</small></span></div>)}</div>;
  const ranges=<div className={s.trendRanges} aria-label="Usage trend period">{(['daily','weekly','monthly'] as TrendRange[]).map(value=><button key={value} type="button" aria-pressed={trendRange===value} onClick={()=>setTrendRange(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>;
  const heatmap=<div className={s.usageHeatmap}><div className={s.heatHours}><span/>{TIME_BLOCKS.map(block=><span key={block}>{block}</span>)}</div>{heat.map((row,day)=><div className={s.heatRow} key={DAYS[day]}><strong>{DAYS[day]}</strong>{row.map((count,block)=>{const label=`${DAYS[day]} ${TIME_BLOCKS[block]} · ${count} actions`;return <button type="button" className={s.heatCell} key={block} style={{'--heat-strength':`${Math.round((.1+count/heatMax*.9)*100)}%`} as CSSProperties} title={label} aria-label={label}/>;})}</div>)}<div className={s.heatLegend}><span>Less</span>{[18,38,68,100].map(value=><i key={value} style={{'--heat-strength':`${value}%`} as CSSProperties}/>)}<span>More</span></div></div>;
  const trendPeriod=trendRange==='daily'?'Last 14 days':trendRange==='weekly'?'Last 12 weeks':'Last 12 months';
  const trendInsight=trendSummary.direction==='stable'?'Activity is stable':trendSummary.deltaPercent===null?'Activity started in the latest half':`${Math.abs(trendSummary.deltaPercent)}% ${trendSummary.direction}`;
  return <><div className={s.analyticsGrid}>
    <section className={s.analyticsSummary}>{cards.map((card,index)=><motion.div key={card.label} data-tone={card.tone} {...panelMotion} transition={{delay:reduced?0:index*.05,duration:.25}}><span className={s.metricIcon}><Icon name={card.icon} size={18}/></span><div><span>{card.label}</span><strong><AnimatedText value={card.value}>{card.value}</AnimatedText></strong><small>{card.hint}</small></div></motion.div>)}</section>
    <motion.section className={`${s.analyticsPanel} ${s.analyticsWide} ${s.analyticsTrendPanel}`} {...panelMotion}><div className={`${s.fieldHeading} ${s.trendHeading}`}><div><div className={s.chartTitle}><span className={s.chartIcon}><Icon name="analytics" size={16}/></span><h2>Usage trend</h2><i data-direction={trendSummary.direction}>{trendSummary.direction}</i></div><span>{trendPeriod} · {trendInsight} · Peak {trendSummary.peak.label}</span></div>{ranges}</div><UsageTrendChart points={trendPoints} range={trendRange}/><button type="button" className={s.openDetail} onClick={()=>setDetail('trend')}>Explore trend <Icon name="chevron" size={13}/></button></motion.section>
    <motion.section className={`${s.analyticsPanel} ${s.heatmapPanel}`} {...panelMotion}><div className={s.fieldHeading}><div className={s.chartTitle}><span className={s.chartIcon}><Icon name="history" size={16}/></span><h2>Usage pattern</h2></div><span>{peak.count?`Peak: ${DAYS[peak.day]} ${TIME_BLOCKS[peak.block]}`:'Waiting for activity'}</span></div>{heatmap}<button type="button" className={s.openDetail} onClick={()=>setDetail('heatmap')}>Explore pattern <Icon name="chevron" size={13}/></button></motion.section>
    <motion.section className={s.analyticsPanel} {...panelMotion}><div className={s.fieldHeading}><div className={s.chartTitle}><span className={s.chartIcon}><Icon name="analytics" size={16}/></span><h2>Feature use</h2></div><span>Most frequent actions</span></div>{features.length?<FeatureUseChart features={features}/>:<div className={s.analyticsEmpty}><Icon name="history" size={25}/><p>Usage will appear as people work in the module.</p></div>}<button type="button" className={s.openDetail} onClick={()=>setDetail('features')}>Explore features <Icon name="chevron" size={13}/></button></motion.section>
    <motion.section className={s.analyticsPanel} {...panelMotion}><div className={s.fieldHeading}><h2>Errors</h2><span>Automatically captured</span></div>{errors.length?errorsList:<div className={s.analyticsEmpty}><Icon name="check" size={25}/><p>No errors captured.</p></div>}<button type="button" className={s.openDetail} onClick={()=>setDetail('errors')}>Open details <Icon name="chevron" size={13}/></button></motion.section>
    <motion.section className={s.analyticsPanel} {...panelMotion}><div className={s.fieldHeading}><h2>Latest feedback</h2><span>Text and audio</span></div>{feedback.length?feedbackList:<div className={s.analyticsEmpty}><Icon name="edit" size={25}/><p>No suggestions have been sent yet.</p></div>}<button type="button" className={s.openDetail} onClick={()=>setDetail('feedback')}>Open details <Icon name="chevron" size={13}/></button></motion.section>
  </div><ToolsDialog open={!!detail} onClose={()=>setDetail(null)} title={detail==='features'?'Feature use details':detail==='errors'?'Captured errors':detail==='feedback'?'Latest feedback':detail==='trend'?`${trendPeriod} usage`:'Weekly usage pattern'} description="Activity across all Tools & Equipment accounts." wide>{detail==='features'&&(features.length?<FeatureUseChart features={features}/>:<p className={s.formHint}>No feature activity has been recorded yet.</p>)}{detail==='errors'&&(errors.length?errorsList:<p className={s.formHint}>No errors have been captured.</p>)}{detail==='feedback'&&(feedback.length?feedbackList:<p className={s.formHint}>No feedback has been saved.</p>)}{detail==='trend'&&<><div className={s.dialogTrendRanges}>{ranges}</div><UsageTrendChart points={trendPoints} range={trendRange} expanded/></>}{detail==='heatmap'&&heatmap}</ToolsDialog></>;
}

