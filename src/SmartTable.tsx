import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type SortDirection = 'asc' | 'desc';

export type SmartColumn<T> = {
  key: string;
  label: string;
  value: (row:T)=>string|number|null|undefined;
  render?: (row:T)=>ReactNode;
  numeric?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: SmartColumn<T>[];
  rowKey: (row:T)=>string;
  exportName: string;
  onRowClick?: (row:T)=>void;
  initialPageSize?: number;
};

type DeviceLike={platform?:string;compliance?:string|null;manufacturer?:string|null;model?:string|null;ownership?:string|null;userUpn?:string|null;userDisplayName?:string|null;lastCheckIn?:string|null;raw?:Record<string,string>};
const pageSizes=[25,50,100,250];
const normalize=(value:string|number|null|undefined)=>value==null?'':value;
const csvCell=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;
const unique=(values:(string|null|undefined)[])=>[...new Set(values.map(v=>v?.trim()).filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
const rawValue=(row:DeviceLike,pattern:RegExp)=>Object.entries(row.raw||{}).find(([name])=>pattern.test(name))?.[1]?.trim()||'';
const encryption=(row:DeviceLike)=>{const v=rawValue(row,/^encrypted$|encryption status|is encrypted/i).toLowerCase();return ['true','yes','1','encrypted'].includes(v)?'Encrypted':['false','no','0','not encrypted','unencrypted'].includes(v)?'Not encrypted':'Unknown'};
const ageDays=(value?:string|null)=>{if(!value)return null;const t=Date.parse(value);return Number.isFinite(t)?Math.max(0,(Date.now()-t)/86400000):null};

export default function SmartTable<T>({rows,columns,rowKey,exportName,onRowClick,initialPageSize=50}:Props<T>){
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(initialPageSize);
  const [sortKey,setSortKey]=useState(columns[0]?.key??'');
  const [sortDirection,setSortDirection]=useState<SortDirection>('asc');
  const isDevices=exportName==='intune-devices';
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [manufacturer,setManufacturer]=useState('');
  const [model,setModel]=useState('');
  const [compliance,setCompliance]=useState('');
  const [encrypted,setEncrypted]=useState('');
  const [ownership,setOwnership]=useState('');
  const [userState,setUserState]=useState('');
  const [checkin,setCheckin]=useState('');
  const [maxAge,setMaxAge]=useState(180);
  const [columnsOpen,setColumnsOpen]=useState(false);
  const [visibleKeys,setVisibleKeys]=useState<string[]>(()=>columns.map(c=>c.key));

  const devices=rows as unknown as DeviceLike[];
  const manufacturers=useMemo(()=>unique(devices.map(d=>d.manufacturer)),[rows]);
  const models=useMemo(()=>unique(devices.filter(d=>!manufacturer||d.manufacturer===manufacturer).map(d=>d.model)),[rows,manufacturer]);
  const compliances=useMemo(()=>unique(devices.map(d=>d.compliance)),[rows]);
  const ownerships=useMemo(()=>unique(devices.map(d=>d.ownership)),[rows]);
  const activeFilterCount=[manufacturer,model,compliance,encrypted,ownership,userState,checkin,maxAge<180?'age':''].filter(Boolean).length;

  const filteredRows=useMemo(()=>!isDevices?rows:rows.filter(row=>{const d=row as unknown as DeviceLike;if(manufacturer&&d.manufacturer!==manufacturer)return false;if(model&&d.model!==model)return false;if(compliance&&d.compliance!==compliance)return false;if(encrypted&&encryption(d)!==encrypted)return false;if(ownership&&d.ownership!==ownership)return false;const hasUser=Boolean(d.userUpn||d.userDisplayName);if(userState==='with'&&!hasUser)return false;if(userState==='without'&&hasUser)return false;const age=ageDays(d.lastCheckIn);if(checkin==='0-7'&&(age===null||age>7))return false;if(checkin==='8-30'&&(age===null||age<8||age>30))return false;if(checkin==='31-90'&&(age===null||age<31||age>90))return false;if(checkin==='90+'&&(age===null||age<=90))return false;if(maxAge<180&&(age===null||age>maxAge))return false;return true}),[rows,isDevices,manufacturer,model,compliance,encrypted,ownership,userState,checkin,maxAge]);
  const shownColumns=columns.filter(c=>visibleKeys.includes(c.key));

  useEffect(()=>setPage(1),[filteredRows,pageSize]);
  useEffect(()=>setVisibleKeys(keys=>{const valid=keys.filter(k=>columns.some(c=>c.key===k));return valid.length?valid:columns.map(c=>c.key)}),[columns]);

  const sorted=useMemo(()=>{
    const column=columns.find(c=>c.key===sortKey);
    if(!column) return [...filteredRows];
    const direction=sortDirection==='asc'?1:-1;
    return [...filteredRows].sort((a,b)=>{const av=normalize(column.value(a));const bv=normalize(column.value(b));if(column.numeric)return(Number(av)-Number(bv))*direction;return String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'})*direction});
  },[filteredRows,columns,sortKey,sortDirection]);

  const pageCount=Math.max(1,Math.ceil(sorted.length/pageSize));const safePage=Math.min(page,pageCount);const start=(safePage-1)*pageSize;const visible=sorted.slice(start,start+pageSize);
  function sort(column:SmartColumn<T>){if(sortKey===column.key)setSortDirection(d=>d==='asc'?'desc':'asc');else{setSortKey(column.key);setSortDirection('asc')}setPage(1)}
  function exportCsv(){const csv=[shownColumns.map(c=>csvCell(c.label)).join(','),...sorted.map(row=>shownColumns.map(c=>csvCell(c.value(row))).join(','))].join('\r\n');const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${exportName}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)}
  function clearFilters(){setManufacturer('');setModel('');setCompliance('');setEncrypted('');setOwnership('');setUserState('');setCheckin('');setMaxAge(180)}
  const first=sorted.length?start+1:0;const last=Math.min(start+pageSize,sorted.length);

  return <>
    {isDevices&&<div className="deviceFilterShell">
      <div className="deviceFilterTop"><div><strong>Explore devices</strong><span>{sorted.length.toLocaleString()} of {rows.length.toLocaleString()} devices{activeFilterCount?` · ${activeFilterCount} explorer filter${activeFilterCount===1?'':'s'}`:''}</span></div><div><button className={filtersOpen?'active':''} onClick={()=>setFiltersOpen(v=>!v)}>☷ Filters {activeFilterCount>0&&<b>{activeFilterCount}</b>}</button><button className={columnsOpen?'active':''} onClick={()=>setColumnsOpen(v=>!v)}>▦ Columns</button>{activeFilterCount>0&&<button className="clearExplorer" onClick={clearFilters}>Clear filters</button>}</div></div>
      {filtersOpen&&<div className="deviceFilterPanel">
        <label><span>Manufacturer</span><select value={manufacturer} onChange={e=>{setManufacturer(e.target.value);setModel('')}}><option value="">All manufacturers</option>{manufacturers.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>Model</span><select value={model} onChange={e=>setModel(e.target.value)}><option value="">All models</option>{models.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>Compliance</span><select value={compliance} onChange={e=>setCompliance(e.target.value)}><option value="">All states</option>{compliances.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>Encryption</span><select value={encrypted} onChange={e=>setEncrypted(e.target.value)}><option value="">All states</option><option>Encrypted</option><option>Not encrypted</option><option>Unknown</option></select></label>
        <label><span>Ownership</span><select value={ownership} onChange={e=>setOwnership(e.target.value)}><option value="">All ownership</option>{ownerships.map(v=><option key={v}>{v}</option>)}</select></label>
        <label><span>Primary user</span><select value={userState} onChange={e=>setUserState(e.target.value)}><option value="">Any</option><option value="with">Has primary user</option><option value="without">No primary user</option></select></label>
        <label className="checkinPresets"><span>Last check-in</span><select value={checkin} onChange={e=>setCheckin(e.target.value)}><option value="">Any age</option><option value="0-7">0–7 days</option><option value="8-30">8–30 days</option><option value="31-90">31–90 days</option><option value="90+">Over 90 days</option></select></label>
        <label className="ageSlider"><span>Checked in within <b>{maxAge>=180?'180+':maxAge} days</b></span><input type="range" min="1" max="180" value={maxAge} onChange={e=>setMaxAge(Number(e.target.value))}/><div><small>1 day</small><small>30</small><small>90</small><small>180+</small></div></label>
      </div>}
      {columnsOpen&&<div className="columnPicker"><div><strong>Visible columns</strong><span>CSV export uses this selection too.</span></div><div>{columns.map(c=><label key={c.key}><input type="checkbox" checked={visibleKeys.includes(c.key)} onChange={()=>setVisibleKeys(keys=>keys.includes(c.key)?(keys.length>1?keys.filter(k=>k!==c.key):keys):[...keys,c.key])}/><span>{c.label}</span></label>)}</div></div>}
    </div>}
    <div className="tableToolbar"><div className="tableResultCount"><strong>{sorted.length.toLocaleString()}</strong><span>{isDevices?`of ${rows.length.toLocaleString()} devices`:'items'}</span></div><div className="tableToolbarActions"><label><span>Rows</span><select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{pageSizes.map(size=><option key={size} value={size}>{size}</option>)}</select></label><button className="tableExport" onClick={exportCsv}><span>↓</span> Export CSV</button></div></div>
    <div className="tableWrap smartTableWrap"><table className="smartTable"><thead><tr>{shownColumns.map(column=><th key={column.key} className={sortKey===column.key?'sorted':''}><button onClick={()=>sort(column)}><span>{column.label}</span><i>{sortKey===column.key?(sortDirection==='asc'?'↑':'↓'):'↕'}</i></button></th>)}</tr></thead><tbody>{visible.map(row=><tr key={rowKey(row)} className={onRowClick?'clickRow':''} onClick={()=>onRowClick?.(row)}>{shownColumns.map(column=><td key={column.key}>{column.render?column.render(row):String(column.value(row)??'—')}</td>)}</tr>)}</tbody></table></div>
    <div className="tablePager"><span>Showing <strong>{first.toLocaleString()}</strong>–<strong>{last.toLocaleString()}</strong> of <strong>{sorted.length.toLocaleString()}</strong></span><div><button disabled={safePage<=1} onClick={()=>setPage(1)}>«</button><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button><span>Page <strong>{safePage}</strong> of <strong>{pageCount}</strong></span><button disabled={safePage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>›</button><button disabled={safePage>=pageCount} onClick={()=>setPage(pageCount)}>»</button></div></div>
  </>;
}
