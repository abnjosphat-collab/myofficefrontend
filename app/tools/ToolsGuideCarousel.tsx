'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ToolsIcon as Icon, type IconName } from './ToolsIcon';
import s from './tools.module.css';

const slides:{title:string;copy:string;action:string;icon:IconName}[]=[
  {title:'Find equipment quickly',copy:'Search by name, register number, serial number, location or employee.',action:'Start searching',icon:'search'},
  {title:'Record every handover',copy:'Issue equipment with its user, work location, assigned machine and return date.',action:'Issue equipment',icon:'out'},
  {title:'Keep a complete history',copy:'Returns, transfers, repairs and evidence stay connected to the equipment record.',action:'View history',icon:'history'},
];

export function ToolsGuideCarousel({onSearch,onIssue,onHistory,onHide}:{onSearch:()=>void;onIssue:()=>void;onHistory:()=>void;onHide:()=>void}){
  const [active,setActive]=useState(0);
  const [paused,setPaused]=useState(false);
  const reduced=useReducedMotion();
  useEffect(()=>{if(reduced||paused)return;const timer=window.setInterval(()=>setActive(current=>(current+1)%slides.length),90000);return()=>window.clearInterval(timer);},[paused,reduced]);
  const slide=slides[active];
  const actions=[onSearch,onIssue,onHistory];
  return <section className={s.guideCarousel} aria-label="Getting started" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setPaused(false);}}>
    <div className={s.guideViewport} aria-live="off"><AnimatePresence mode="wait" initial={false}><motion.div key={slide.title} className={s.guideSlide} initial={{opacity:0,x:reduced?0:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:reduced?0:-14}} transition={{duration:reduced?0:.24}}><span className={s.guideIcon}><Icon name={slide.icon} size={22}/></span><div><strong>{slide.title}</strong><p>{slide.copy}</p></div><button type="button" className={s.guideAction} onClick={actions[active]}>{slide.action}<Icon name="arrow" size={15}/></button></motion.div></AnimatePresence></div>
    <div className={s.guideControls}>{slides.map((item,index)=><button key={item.title} type="button" aria-label={`Show guide: ${item.title}`} aria-current={index===active?'true':undefined} onClick={()=>setActive(index)}/>)}</div>
    <button type="button" className={s.guideHide} title="You can restore this guide in Settings." onClick={onHide}><span>Hide guide</span><Icon name="close" size={14}/></button>
  </section>;
}
