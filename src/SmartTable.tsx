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

const pageSizes=[25,50,100,250];
const normalize=(value:string|number|null|undefined)=>value==null?'':value;
const csvCell=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;

export default function SmartTable<T>({rows,columns,rowKey,exportName,onRowClick,initialPageSize=50}:Props<T>){
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(initialPageSize);
  const [sortKey,setSortKey]=useState(columns[0]?.key??'');
  const [sortDirection,setSortDirection]=useState<SortDirection>('asc');

  useEffect(()=>setPage(1),[rows,pageSize]);

  const sorted=useMemo(()=>{
    const column=columns.find(c=>c.key===sortKey);
    if(!column) return [...rows];
    const direction=sortDirection==='asc'?1:-1;
    return [...rows].sort((a,b)=>{
      const av=normalize(column.value(a));
      const bv=normalize(column.value(b));
      if(column.numeric) return (Number(av)-Number(bv))*direction;
      return String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'})*direction;
    });
  },[rows,columns,sortKey,sortDirection]);

  const pageCount=Math.max(1,Math.ceil(sorted.length/pageSize));
  const safePage=Math.min(page,pageCount);
  const start=(safePage-1)*pageSize;
  const visible=sorted.slice(start,start+pageSize);

  function sort(column:SmartColumn<T>){
    if(sortKey===column.key) setSortDirection(d=>d==='asc'?'desc':'asc');
    else {setSortKey(column.key);setSortDirection('asc')}
    setPage(1);
  }

  function exportCsv(){
    const csv=[columns.map(c=>csvCell(c.label)).join(','),...sorted.map(row=>columns.map(c=>csvCell(c.value(row))).join(','))].join('\r\n');
    const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=`${exportName}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }

  const first=sorted.length?start+1:0;
  const last=Math.min(start+pageSize,sorted.length);

  return <>
    <div className="tableToolbar">
      <div className="tableResultCount"><strong>{sorted.length.toLocaleString()}</strong><span>items</span></div>
      <div className="tableToolbarActions">
        <label><span>Rows</span><select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{pageSizes.map(size=><option key={size} value={size}>{size}</option>)}</select></label>
        <button className="tableExport" onClick={exportCsv}><span>↓</span> Export CSV</button>
      </div>
    </div>
    <div className="tableWrap smartTableWrap"><table className="smartTable"><thead><tr>{columns.map(column=><th key={column.key} className={sortKey===column.key?'sorted':''}><button onClick={()=>sort(column)}><span>{column.label}</span><i>{sortKey===column.key?(sortDirection==='asc'?'↑':'↓'):'↕'}</i></button></th>)}</tr></thead><tbody>{visible.map(row=><tr key={rowKey(row)} className={onRowClick?'clickRow':''} onClick={()=>onRowClick?.(row)}>{columns.map(column=><td key={column.key}>{column.render?column.render(row):String(column.value(row)??'—')}</td>)}</tr>)}</tbody></table></div>
    <div className="tablePager">
      <span>Showing <strong>{first.toLocaleString()}</strong>–<strong>{last.toLocaleString()}</strong> of <strong>{sorted.length.toLocaleString()}</strong></span>
      <div><button disabled={safePage<=1} onClick={()=>setPage(1)}>«</button><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button><span>Page <strong>{safePage}</strong> of <strong>{pageCount}</strong></span><button disabled={safePage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>›</button><button disabled={safePage>=pageCount} onClick={()=>setPage(pageCount)}>»</button></div>
    </div>
  </>;
}
