export {};

type StickyEntry={
  wrap:HTMLElement;
  table:HTMLTableElement;
  head:HTMLTableSectionElement;
  floating:HTMLDivElement;
  track:HTMLDivElement;
  cloneTable:HTMLTableElement;
};

const entries=new Map<HTMLElement,StickyEntry>();
let frame=0;

function isDeviceTable(wrap:HTMLElement){
  const card=wrap.closest('.dataCard');
  return Boolean(card?.querySelector('.deviceFilterShell'));
}

function headerIndex(cell:Element|null){
  const row=cell?.parentElement;
  return row&&cell?Array.from(row.children).indexOf(cell):-1;
}

function originalCell(entry:StickyEntry,index:number){
  return index>=0?entry.head.querySelectorAll<HTMLTableCellElement>('tr:first-child > th')[index]??null:null;
}

function originalDragHandle(entry:StickyEntry,index:number){
  return originalCell(entry,index)?.querySelector<HTMLElement>('.columnDragHandle')??null;
}

function proxyDragEvent(type:'dragstart'|'dragover'|'drop'|'dragend',target:Element|null,entry:StickyEntry,sourceEvent:DragEvent){
  const cell=target?.closest('th');
  const index=headerIndex(cell);
  const original=type==='dragstart'||type==='dragend'?originalDragHandle(entry,index):originalCell(entry,index);
  if(!original)return;
  const event=new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:sourceEvent.dataTransfer});
  original.dispatchEvent(event);
  if(event.defaultPrevented)sourceEvent.preventDefault();
}

function copyHeader(entry:StickyEntry){
  const {head,cloneTable,table}=entry;
  const originalCells=Array.from(head.querySelectorAll<HTMLTableCellElement>('tr:first-child > th'));
  if(!originalCells.length)return;

  const clonedHead=head.cloneNode(true) as HTMLTableSectionElement;
  clonedHead.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.tabIndex=-1);

  const colgroup=document.createElement('colgroup');
  originalCells.forEach(cell=>{
    const col=document.createElement('col');
    col.style.width=`${cell.getBoundingClientRect().width}px`;
    colgroup.appendChild(col);
  });

  cloneTable.replaceChildren(colgroup,clonedHead);
  cloneTable.style.width=`${table.scrollWidth}px`;
}

function updateEntry(entry:StickyEntry){
  const {wrap,table,head,floating,track}=entry;
  if(!document.contains(wrap)){
    floating.remove();
    entries.delete(wrap);
    return;
  }

  const nav=document.querySelector<HTMLElement>('.topbar');
  const navBottom=Math.max(0,nav?.getBoundingClientRect().bottom??0);
  const headRect=head.getBoundingClientRect();
  const tableRect=table.getBoundingClientRect();
  const wrapRect=wrap.getBoundingClientRect();
  const shouldShow=headRect.top<navBottom&&tableRect.bottom>navBottom+headRect.height;

  if(!shouldShow){
    floating.hidden=true;
    return;
  }

  copyHeader(entry);
  floating.hidden=false;
  floating.style.top=`${navBottom}px`;
  floating.style.left=`${wrapRect.left}px`;
  floating.style.width=`${wrapRect.width}px`;
  floating.style.height=`${headRect.height}px`;
  track.style.width=`${table.scrollWidth}px`;
  track.style.transform=`translateX(${-wrap.scrollLeft}px)`;
}

function scheduleUpdate(){
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
    for(const entry of entries.values())updateEntry(entry);
  });
}

function addTable(wrap:HTMLElement){
  if(entries.has(wrap)||!isDeviceTable(wrap))return;
  const table=wrap.querySelector<HTMLTableElement>('table.smartTable');
  const head=table?.tHead;
  if(!table||!head)return;

  const floating=document.createElement('div');
  floating.className='deviceFloatingHeader';
  floating.hidden=true;

  const track=document.createElement('div');
  track.className='deviceFloatingHeaderTrack';

  const cloneTable=document.createElement('table');
  cloneTable.className='smartTable deviceFloatingTable';
  track.appendChild(cloneTable);
  floating.appendChild(track);
  document.body.appendChild(floating);

  const entry:StickyEntry={wrap,table,head,floating,track,cloneTable};
  entries.set(wrap,entry);

  floating.addEventListener('click',event=>{
    const button=(event.target as Element).closest('button');
    const cell=button?.closest('th');
    if(!button||!cell)return;
    const index=headerIndex(cell);
    const original=originalCell(entry,index)?.querySelector<HTMLButtonElement>('button');
    original?.click();
    requestAnimationFrame(scheduleUpdate);
  });

  floating.addEventListener('dragstart',event=>proxyDragEvent('dragstart',event.target as Element,entry,event));
  floating.addEventListener('dragover',event=>proxyDragEvent('dragover',event.target as Element,entry,event));
  floating.addEventListener('drop',event=>{
    proxyDragEvent('drop',event.target as Element,entry,event);
    requestAnimationFrame(scheduleUpdate);
  });
  floating.addEventListener('dragend',event=>{
    proxyDragEvent('dragend',event.target as Element,entry,event);
    requestAnimationFrame(scheduleUpdate);
  });

  wrap.addEventListener('scroll',scheduleUpdate,{passive:true});
  resizeObserver?.observe(wrap);
  resizeObserver?.observe(table);
  updateEntry(entry);
}

function scan(){
  document.querySelectorAll<HTMLElement>('.smartTableWrap').forEach(addTable);
  scheduleUpdate();
}

const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(scheduleUpdate):null;
const mutationObserver=new MutationObserver(scan);

window.addEventListener('scroll',scheduleUpdate,{passive:true});
window.addEventListener('resize',scheduleUpdate);
mutationObserver.observe(document.documentElement,{childList:true,subtree:true});
queueMicrotask(scan);
