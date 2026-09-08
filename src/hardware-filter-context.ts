const findMultiFilter=(root:ParentNode,label:string)=>{
  return [...root.querySelectorAll<HTMLElement>('.multiFilter')].find(element=>element.querySelector(':scope > span')?.textContent?.trim()===label)??null;
};

const singlePlatformSelection=()=>{
  const shell=document.querySelector('.deviceFilterShell');
  if(!shell)return null;
  const filter=findMultiFilter(shell,'Platform');
  const summary=filter?.querySelector<HTMLButtonElement>('.multiFilterTrigger > span')?.textContent?.trim()??'';
  if(!summary||summary==='All platforms'||/selected$/i.test(summary))return null;
  return summary;
};

const clearIfActive=(filter:HTMLElement|null)=>{
  if(!filter)return;
  const trigger=filter.querySelector<HTMLElement>('.multiFilterTrigger');
  if(!trigger?.classList.contains('hasValue'))return;
  filter.querySelector<HTMLButtonElement>('.multiFilterClear')?.click();
};

const setContextVisibility=(filter:HTMLElement|null,visible:boolean)=>{
  if(!filter)return;
  if(!visible)clearIfActive(filter);
  filter.hidden=!visible;
};

function syncHardwareFilterContext(){
  const hardware=document.querySelector('.hardwareFixedFilters');
  if(!hardware)return;

  const platform=singlePlatformSelection();
  const apple=findMultiFilter(hardware,'Apple device family');
  const cellular=findMultiFilter(hardware,'Cellular capability');

  // Keep both mobile hardware filters available for All platforms and multi-platform selections.
  // For a single platform, only show controls that can actually apply to that platform.
  const showApple=!platform||platform==='iOS/iPadOS';
  const showCellular=!platform||platform==='iOS/iPadOS'||platform==='Android';

  setContextVisibility(apple,showApple);
  setContextVisibility(cellular,showCellular);
}

let scheduled=false;
const scheduleSync=()=>{
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
    scheduled=false;
    syncHardwareFilterContext();
  });
};

const observer=new MutationObserver(scheduleSync);
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('change',scheduleSync,true);
document.addEventListener('click',scheduleSync,true);
window.addEventListener('load',scheduleSync);
scheduleSync();
