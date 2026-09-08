import { useEffect, useMemo, useRef, useState } from 'react';
import { appleDeviceFamily, cellularCapability, hardwareType } from './hardwareClassification';
import type { Device } from './types';

export type HardwareExplorerFilterState={
  deviceTypes:string[];
  appleFamilies:string[];
  cellularCapabilities:string[];
};

export const emptyHardwareExplorerFilters=():HardwareExplorerFilterState=>({deviceTypes:[],appleFamilies:[],cellularCapabilities:[]});

const unique=(values:string[])=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
const isAppleMobile=(device:Device)=>device.platform==='ios'||device.platform==='ipados';
const isMobile=(device:Device)=>isAppleMobile(device)||device.platform==='android';

export function hardwareExplorerFilterMatches(device:Device,filters:HardwareExplorerFilterState){
  if(filters.deviceTypes.length&&!filters.deviceTypes.includes(hardwareType(device)))return false;
  if(filters.appleFamilies.length&&(!isAppleMobile(device)||!filters.appleFamilies.includes(appleDeviceFamily(device))))return false;
  if(filters.cellularCapabilities.length&&(!isMobile(device)||!filters.cellularCapabilities.includes(cellularCapability(device))))return false;
  return true;
}

function Chevron({open}:{open:boolean}){return <svg className="multiFilterChevron" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={open?'m4.5 9.5 3.5-3 3.5 3':'m4.5 6.5 3.5 3 3.5-3'}/></svg>}

function MultiSelect({label,values,selected,onChange,allLabel}:{label:string;values:string[];selected:string[];onChange:(values:string[])=>void;allLabel:string}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const summary=selected.length===0?allLabel:selected.length===1?selected[0]:`${selected.length} selected`;
  function toggle(value:string){onChange(selected.includes(value)?selected.filter(item=>item!==value):[...selected,value])}
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[open]);
  return <div className="multiFilter hardwareFixedMultiFilter" ref={root}>
    <span>{label}</span>
    <div className="multiFilterControl">
      <button type="button" className={`multiFilterTrigger ${open?'open':''} ${selected.length?'hasValue':''}`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><span>{summary}</span><Chevron open={open}/></button>
      {selected.length>0&&<button type="button" className="multiFilterClear" aria-label={`Clear ${label} filter`} title={`Clear ${label} filter`} onClick={()=>{onChange([]);setOpen(false)}}><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m5 5 6 6M11 5l-6 6"/></svg></button>}
      {open&&<div className="multiFilterMenu"><button type="button" onClick={()=>{onChange([]);setOpen(false)}} className={selected.length===0?'selected':''}>{allLabel}</button>{values.map(value=><label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={()=>toggle(value)}/><span>{value}</span></label>)}</div>}
    </div>
  </div>;
}

export default function HardwareExplorerFilters({devices,value,onChange}:{devices:Device[];value:HardwareExplorerFilterState;onChange:(value:HardwareExplorerFilterState)=>void}){
  const deviceTypes=useMemo(()=>unique(devices.map(hardwareType)),[devices]);
  const appleFamilies=useMemo(()=>unique(devices.filter(isAppleMobile).map(appleDeviceFamily)),[devices]);
  const cellularCapabilities=useMemo(()=>unique(devices.filter(isMobile).map(cellularCapability)),[devices]);
  const active=value.deviceTypes.length+value.appleFamilies.length+value.cellularCapabilities.length;
  return <section className="hardwareFixedFilters" aria-label="Hardware filters">
    <div className="hardwareFixedFiltersHead"><div><strong>Hardware filters</strong><span>Persistent inventory filters for device form factor and mobile hardware.</span></div>{active>0&&<button type="button" onClick={()=>onChange(emptyHardwareExplorerFilters())}>Clear hardware filters</button>}</div>
    <div className="deviceFilterPanel hardwareFixedFilterPanel">
      <MultiSelect label="Device type" values={deviceTypes} selected={value.deviceTypes} onChange={deviceTypes=>onChange({...value,deviceTypes})} allLabel="All device types"/>
      {appleFamilies.length>0&&<MultiSelect label="Apple device family" values={appleFamilies} selected={value.appleFamilies} onChange={appleFamilies=>onChange({...value,appleFamilies})} allLabel="All Apple families"/>}
      {cellularCapabilities.length>0&&<MultiSelect label="Cellular capability" values={cellularCapabilities} selected={value.cellularCapabilities} onChange={cellularCapabilities=>onChange({...value,cellularCapabilities})} allLabel="All mobile devices"/>}
    </div>
  </section>;
}
