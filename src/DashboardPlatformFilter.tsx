import { useEffect, useRef, useState } from 'react';

const platformLabel:Record<string,string>={windows:'Windows',android:'Android',applemobile:'iOS/iPadOS',macos:'macOS',linux:'Linux',unknown:'Unknown'};

function Chevron({open}:{open:boolean}){
  return <svg className="multiFilterChevron" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={open?'m4.5 9.5 3.5-3 3.5 3':'m4.5 6.5 3.5 3 3.5-3'}/></svg>;
}

export default function DashboardPlatformFilter({platforms,selected,onChange}:{platforms:[string,number][];selected:string[];onChange:(values:string[])=>void}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const labels=selected.map(value=>platformLabel[value]||value);
  const summary=selected.length===0?'All platforms':selected.length===1?labels[0]:selected.length===2?labels.join(', '):`${selected.length} platforms selected`;

  function toggle(value:string){
    onChange(selected.includes(value)?selected.filter(item=>item!==value):[...selected,value]);
  }

  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[open]);

  return <div className="dashboardPlatformFilter multiFilter" ref={root}>
    <span>Platform</span>
    <div className="multiFilterControl">
      <button type="button" className={`multiFilterTrigger ${open?'open':''} ${selected.length?'hasValue':''}`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><span>{summary}</span><Chevron open={open}/></button>
      {selected.length>0&&<button type="button" className="multiFilterClear" aria-label="Clear platform filter" title="Clear platform filter" onClick={()=>{onChange([]);setOpen(false)}}><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m5 5 6 6M11 5l-6 6"/></svg></button>}
      {open&&<div className="multiFilterMenu">
        <button type="button" onClick={()=>{onChange([]);setOpen(false)}} className={selected.length===0?'selected':''}>All platforms</button>
        {platforms.map(([platform])=><label key={platform}><input type="checkbox" checked={selected.includes(platform)} onChange={()=>toggle(platform)}/><span>{platformLabel[platform]||platform}</span></label>)}
      </div>}
    </div>
  </div>;
}
