'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ToolsIcon as Icon, type IconName } from './ToolsIcon';
import { AnimatedText, ToolsDialog } from './ToolsUI';
import s from './tools.module.css';

export type UsageEvent={id:string;name:string;detail?:string;at:string;by?:string};
export type ClientError={id:string;message:string;at:string};
export type FeedbackRecord={id:string;text?:string;audioName?:string;audioUrl?:string;at:string;by:string};
type Panel='features'|'theme'|'errors'|'feedback'|'trend'|'heatmap';
type TrendRange='daily'|'weekly'|'monthly';
type TrendPoint={key:string;label:string;count:number};
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const TIME_BLOCKS=['00-04','04-08','08-12','12-16','16-20','20-24'];

function dayKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function startOfWeek(date:Date){const copy=new Date(date);copy.setHours(0,0,0,0);copy.setDate(copy.getDate()-((copy.getDay()+6)%7));return copy;}
export function buildUsageTrend(usage:UsageEvent[],range:TrendRange):TrendPoint[]{
  const now=new Date();
  if(range==='daily') return Array.from({length:14},(_,offset)=>{const date=new Date(now);date.setHours(0,0,0,0);date.setDate(date.getDate()-(13-offset));const key=dayKey(date);return{key,label:date.toLocaleDateString('en-GB',{day:'numeric',month:'short'}),count:usage.filter(event=>dayKey(new Date(event.at))===key).length};});
  if(range==='weekly') return Array.from({length:12},(_,offset)=>{const date=startOfWeek(now);date.setDate(date.getDate()-7*(11-offset));const end=new Date(date);end.setDate(end.getDate()+7);return{key:dayKey(date),label:date.toLocaleDateString('en-GB',{day:'numeric',month:'short'}),count:usage.filter(event=>{const value=new Date(event.at);return value>=date&&value<end;}).length};});
  return Array.from({length:12},(_,offset)=>{const date=new Date(now.getFullYear(),now.getMonth()-(11-offset),1);const end=new Date(date.getFullYear(),date.getMonth()+1,1);return{key:`${date.getFullYear()}-${date.getMonth()}`,label:date.toLocaleDateString('en-GB',{month:'short'}),count:usage.filter(event=>{const value=new Date(event.at);return value>=date&&value<end;}).length};});
}

export function ToolsAnalytics({usage,errors,feedback}:{usage:UsageEvent[];errors:ClientError[];feedback:FeedbackRecord[]}) {
  const [detail,setDetail]=useState<Panel|null>(null);
  const [trendRange,setTrendRange]=useState<TrendRange>('daily');
  const [activePoint,setActivePoint]=useState<number|null>(null);
  const reduced=useReducedMotion();
  const counts=useMemo(()=>usage.reduce<Record<string,number>>((out,event)=>({...out,[event.name]:(out[event.name]||0)+1}),{}),[usage]);
  const features=Object.entries(counts).filter(([name])=>name!=='theme changed').sort((a,b)=>b[1]-a[1]);
  const max=Math.max(1,...features.map(item=>item[1]));
  const light=usage.filter(item=>item.name==='theme changed'&&item.detail==='Light').length;
  const dark=usage.filter(item=>item.name==='theme changed'&&item.detail==='Dark').length;
  const totalTheme=light+dark;const darkPct=totalTheme?Math.round(dark/totalTheme*100):0;
  const accounts=new Set(usage.map(event=>event.by).filter(Boolean)).size;
  const trendPoints=useMemo(()=>buildUsageTrend(usage,trendRange),[usage,trendRange]);
  const trendMax=Math.max(1,...trendPoints.map(point=>point.count));
  const polyline=trendPoints.map((point,index)=>`${18+index/(trendPoints.length-1)*684},${142-point.count/trendMax*112}`).join(' ');
  const selectedPoint=trendPoints[activePoint??trendPoints.length-1];
  const heat=useMemo(()=>Array.from({length:7},(_,day)=>Array.from({length:6},(_,block)=>usage.filter(event=>{const date=new Date(event.at);return date.getDay()===day&&Math.floor(date.getHours()/4)===block;}).length)),[usage]);
  const heatMax=Math.max(1,...heat.flat());
  const peak=heat.flatMap((row,day)=>row.map((count,block)=>({count,day,block}))).sort((a,b)=>b.count-a.count)[0];
  const cards:{label:string;value:number;hint:string;icon:IconName;tone:string}[]=[
    {label:'Recorded actions',value:usage.length,hint:'Across all accounts',icon:'history',tone:'brand'},
    {label:'Active accounts',value:accounts,hint:'Contributing activity',icon:'user',tone:'success'},
    {label:'Captured errors',value:errors.length,hint:'Reported automatically',icon:'alert',tone:'danger'},
    {label:'Feedback received',value:feedback.length,hint:'Suggestions and recordings',icon:'edit',tone:'warm'},
  ];
  const panelMotion={initial:{opacity:0,y:reduced?0:12},animate:{opacity:1,y:0},whileHover:reduced?undefined:{y:-3,boxShadow:'0 16px 34px rgba(59,35,120,.1)'}};
  const bars=<div className={s.featureBars}>{features.slice(0,12).map(([name,count],index)=><div key={name}><span>{name}</span><i><motion.b initial={{width:0}} animate={{width:`${Math.max(8,count/max*100)}%`}} transition={{duration:reduced?0:.55,delay:index*.04}}/></i><strong>{count}</strong></div>)}</div>;
  const errorsList=<div className={s.errorList}>{errors.map(error=><div key={error.id}><Icon name="alert" size={16}/><span><strong>{error.message}</strong><small>{new Date(error.at).toLocaleString()}</small></span></div>)}</div>;
  const feedbackList=<div className={s.errorList}>{feedback.map(item=><div key={item.id}><Icon name={item.audioName?'attachment':'edit'} size={16}/><span><strong>{item.text||item.audioName}</strong><small>{item.by} · {new Date(item.at).toLocaleString()}</small></span></div>)}</div>;
  const ranges=<div className={s.trendRanges} aria-label="Usage trend period">{(['daily','weekly','monthly'] as TrendRange[]).map(value=><button key={value} type="button" aria-pressed={trendRange===value} onClick={event=>{event.stopPropagation();setTrendRange(value);setActivePoint(null);}}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>;
  const trend=<div className={s.trendChart}><div className={s.trendCurrent}><span>{selectedPoint.label}</span><strong>{selectedPoint.count} {selectedPoint.count===1?'action':'actions'}</strong></div><svg viewBox="0 0 720 160" role="img" aria-label={`${trendRange} Tools usage`}><defs><linearGradient id="tools-trend" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity=".18"/><stop offset="1" stopColor="var(--brand)" stopOpacity="0"/></linearGradient></defs><line x1="18" x2="702" y1="142" y2="142" className={s.trendBaseline}/><polygon points={`18,142 ${polyline} 702,142`} fill="url(#tools-trend)"/><motion.polyline points={polyline} fill="none" stroke="var(--brand)" strokeWidth="2.25" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:reduced?0:.65}}/>{trendPoints.map((point,index)=>{const x=18+index/(trendPoints.length-1)*684;const y=142-point.count/trendMax*112;return <g key={point.key} tabIndex={0} role="img" aria-label={`${point.label}: ${point.count} actions`} onMouseEnter={()=>setActivePoint(index)} onMouseLeave={()=>setActivePoint(null)} onFocus={()=>setActivePoint(index)} onBlur={()=>setActivePoint(null)}><circle cx={x} cy={y} r={activePoint===index?5:3.5} className={s.trendPoint}/><title>{point.label}: {point.count} actions</title></g>;})}</svg><div className={s.trendAxis}><span>{trendPoints[0].label}</span><span>{trendPoints.at(-1)?.label}</span></div></div>;
  const heatmap=<div className={s.usageHeatmap}><div className={s.heatHours}><span/>{TIME_BLOCKS.map(block=><span key={block}>{block}</span>)}</div>{heat.map((row,day)=><div className={s.heatRow} key={DAYS[day]}><strong>{DAYS[day]}</strong>{row.map((count,block)=><i key={block} style={{opacity:.1+(count/heatMax)*.9}} title={`${DAYS[day]} ${TIME_BLOCKS[block]} · ${count} actions`}/>)}</div>)}<div className={s.heatLegend}><span>Less</span><i/><i style={{opacity:.35}}/><i style={{opacity:.65}}/><i style={{opacity:1}}/><span>More</span></div></div>;
  const trendPeriod=trendRange==='daily'?'Last 14 days':trendRange==='weekly'?'Last 12 weeks':'Last 12 months';
  return <><div className={s.analyticsGrid}>
    <section className={s.analyticsSummary}>{cards.map((card,index)=><motion.div key={card.label} data-tone={card.tone} {...panelMotion} transition={{delay:reduced?0:index*.05,duration:.25}}><span className={s.metricIcon}><Icon name={card.icon} size={18}/></span><div><span>{card.label}</span><strong><AnimatedText value={card.value}>{card.value}</AnimatedText></strong><small>{card.hint}</small></div></motion.div>)}</section>
    <motion.section className={`${s.analyticsPanel} ${s.analyticsWide}`} {...panelMotion}><div className={`${s.fieldHeading} ${s.trendHeading}`}><div><h2>Usage trend</h2><span>{trendPeriod} · all accounts</span></div>{ranges}</div>{trend}<button type="button" className={s.openDetail} onClick={()=>setDetail('trend')}>Open details <Icon name="chevron" size={13}/></button></motion.section>
    <motion.section className={`${s.analyticsPanel} ${s.heatmapPanel}`} {...panelMotion} onClick={()=>setDetail('heatmap')} tabIndex={0} role="button"><div className={s.fieldHeading}><h2>When people use Tools</h2><span>{peak.count?`Peak: ${DAYS[peak.day]} ${TIME_BLOCKS[peak.block]}`:'Waiting for activity'}</span></div>{heatmap}<span className={s.openDetail}>Open details <Icon name="chevron" size={13}/></span></motion.section>
    <motion.section className={s.analyticsPanel} {...panelMotion} onClick={()=>setDetail('features')} tabIndex={0} role="button"><div className={s.fieldHeading}><h2>Feature use</h2><span>Most frequent actions</span></div>{features.length?bars:<div className={s.analyticsEmpty}><Icon name="history" size={25}/><p>Usage will appear as people work in the module.</p></div>}<span className={s.openDetail}>Open details <Icon name="chevron" size={13}/></span></motion.section>
    <motion.section className={s.analyticsPanel} {...panelMotion} onClick={()=>setDetail('theme')} tabIndex={0} role="button"><div className={s.fieldHeading}><h2>Appearance preference</h2><span>Light and dark choices</span></div><div className={s.themeChart}><div className={s.themeDonut} style={{background:`conic-gradient(var(--brand) 0 ${darkPct}%,var(--chart-soft,var(--soft)) ${darkPct}% 100%)`}}><span><strong>{totalTheme}</strong><small>changes</small></span></div><div><p><i className={s.darkLegend}/>Dark <strong>{dark}</strong></p><p><i className={s.lightLegend}/>Light <strong>{light}</strong></p></div></div><span className={s.openDetail}>Open details <Icon name="chevron" size={13}/></span></motion.section>
    <motion.section className={s.analyticsPanel} {...panelMotion} onClick={()=>setDetail('errors')} tabIndex={0} role="button"><div className={s.fieldHeading}><h2>Errors</h2><span>Automatically captured</span></div>{errors.length?errorsList:<div className={s.analyticsEmpty}><Icon name="check" size={25}/><p>No errors captured.</p></div>}<span className={s.openDetail}>Open details <Icon name="chevron" size={13}/></span></motion.section>
    <motion.section className={s.analyticsPanel} {...panelMotion} onClick={()=>setDetail('feedback')} tabIndex={0} role="button"><div className={s.fieldHeading}><h2>Latest feedback</h2><span>Text and audio</span></div>{feedback.length?feedbackList:<div className={s.analyticsEmpty}><Icon name="edit" size={25}/><p>No suggestions have been sent yet.</p></div>}<span className={s.openDetail}>Open details <Icon name="chevron" size={13}/></span></motion.section>
  </div><ToolsDialog open={!!detail} onClose={()=>setDetail(null)} title={detail==='features'?'Feature use details':detail==='theme'?'Appearance preference':detail==='errors'?'Captured errors':detail==='feedback'?'Latest feedback':detail==='trend'?`${trendPeriod} usage`:'Weekly usage pattern'} description="Activity across all Tools & Equipment accounts." wide>{detail==='features'&&(features.length?bars:<p className={s.formHint}>No feature activity has been recorded yet.</p>)}{detail==='theme'&&<div className={s.analyticsDetail}><strong>{dark>light?'Dark is used more often':light>dark?'Light is used more often':'No leading theme yet'}</strong><p>Dark: {dark} changes · Light: {light} changes</p></div>}{detail==='errors'&&(errors.length?errorsList:<p className={s.formHint}>No errors have been captured.</p>)}{detail==='feedback'&&(feedback.length?feedbackList:<p className={s.formHint}>No feedback has been saved.</p>)}{detail==='trend'&&<><div className={s.dialogTrendRanges}>{ranges}</div>{trend}</>}{detail==='heatmap'&&heatmap}</ToolsDialog></>;
}
