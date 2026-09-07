export {};

type StickyEntry={
  wrap:HTMLElement;
  table:HTMLTableElement;
  head:HTMLTableSectionElement;
  floating:HTMLDivElement;
  track:HTMLDivElement;
  cloneTable:HTMLTableElement;
  draggingKey:string|null;
};

const entries=new Map<HTMLElement,StickyEntry>();
let frame=0;

function isDeviceTable(wrap:HTMLElement){
  const card=wrap.closest('.dataCard');
  return Boolean(card?.querySelector('.deviceFilterShell'));
}

function columnKey(target:Element|null){
  return target?.closest<HTMLTableCellElement>('th[data-column-key]')?.dataset.columnKey??null;
}

function originalCell(entry:StickyEntry,key:string|null){
  if(!key)return null;
  return Array.from(entry.head.querySelectorAll<HTMLTableCellElement>('tr:first-child > th[data-column-key]')).find(cell=>cell.dataset.columnKey===key)??null;
}

function originalDragHandle(entry:StickyEntry,key:string|null){
  return originalCell(entry,key)?.querySelector<HTMLElement>('.columnDragHandle')??null;
}

function dispatchDrag(target:Element|null,type:'dragstart'|'dragover'|'drop'|'dragend',sourceEvent:DragEvent){
  if(!target)return false;
  const proxy=new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:sourceEvent.dataTransfer});
  const accepted=!target.dispatchEvent(proxy)||proxy.defaultPrevented;
  if(proxy.defaultPrevented)sourceEvent.preventDefault();
  return accepted;
}

function clearDragVisuals(entry:StickyEntry){
  entry.head.querySelectorAll('.columnDragging,.columnDropTarget').forEach(node=>node.classList.remove('columnDragging','columnDropTarget'));
  entry.cloneTable.querySelectorAll('.columnDragging,.columnDropTarget').forEach(node=>node.classList.remove('columnDragging','columnDropTarget'));
}

function finishDrag(entry:StickyEntry,sourceEvent:DragEvent){
  const sourceKey=entry.draggingKey;
  if(sourceKey)dispatchDrag(originalDragHandle(entry,sourceKey),'dragend',sourceEvent);
  entry.draggingKey=null;
  requestAnimationFrame(()=>{
    clearDragVisuals(entry);
    scheduleUpdate();
  });
}

function copyHeader(entry:StickyEntry){
  const {head,cloneTable,table}=entry;
  const originalCells=Array.from(head.querySelectorAll<HTMLTableCellElement>('tr:first-child > th'));
  if(!originalCells.length)return;

  const clonedHead=head.cloneNode(true) as HTMLTableSectionElement;
  clonedHead.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.tabIndex=-1);
  clonedHead.querySelectorAll<HTMLElement>('.columnDragHandle').forEach(handle=>{
    handle.draggable=true;
    handle.setAttribute('draggable','true');
  });

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

  // Never replace the cloned DOM while a native drag is in progress.
  if(!entry.draggingKey)copyHeader(entry);
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

  const entry:StickyEntry={wrap,table,head,floating,track,cloneTable,draggingKey:null};
  entries.set(wrap,entry);

  floating.addEventListener('click',event=>{
    if(entry.draggingKey){event.preventDefault();return;}
    const target=event.target as Element;
    if(target.closest('.columnDragHandle'))return;
    const key=columnKey(target);
    const originalButton=originalCell(entry,key)?.querySelector<HTMLButtonElement>('button');
    if(!originalButton)return;
    originalButton.click();
    requestAnimationFrame(scheduleUpdate);
  });

  floating.addEventListener('dragstart',event=>{
    const target=event.target as Element;
    if(!target.closest('.columnDragHandle'))return;
    const key=columnKey(target);
    const originalHandle=originalDragHandle(entry,key);
    if(!key||!originalHandle){event.preventDefault();return;}
    entry.draggingKey=key;
    event.dataTransfer?.setData('text/plain',key);
    if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
    dispatchDrag(originalHandle,'dragstart',event);
  });

  floating.addEventListener('dragover',event=>{
    if(!entry.draggingKey)return;
    const targetKey=columnKey(event.target as Element);
    const targetCell=originalCell(entry,targetKey);
    if(!targetCell||targetKey===entry.draggingKey)return;
    event.preventDefault();
    if(event.dataTransfer)event.dataTransfer.dropEffect='move';
    dispatchDrag(targetCell,'dragover',event);
  });

  floating.addEventListener('dragleave',event=>{
    if(!entry.draggingKey)return;
    const targetKey=columnKey(event.target as Element);
    const targetCell=originalCell(entry,targetKey);
    targetCell?.dispatchEvent(new DragEvent('dragleave',{bubbles:true,cancelable:false,dataTransfer:event.dataTransfer}));
  });

  floating.addEventListener('drop',event=>{
    if(!entry.draggingKey)return;
    const targetKey=columnKey(event.target as Element);
    const targetCell=originalCell(entry,targetKey);
    if(targetCell&&targetKey!==entry.draggingKey){
      event.preventDefault();
      dispatchDrag(targetCell,'drop',event);
    }
    finishDrag(entry,event);
  });

  floating.addEventListener('dragend',event=>{
    if(!entry.draggingKey)return;
    finishDrag(entry,event);
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
