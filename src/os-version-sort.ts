export {};

type SortMode='version-desc'|'version-asc'|'devices-desc'|'devices-asc';
type VersionRecord={label:string;count:number;element:HTMLElement;version:number[]};
type CardState={records:VersionRecord[];platform:string;list:HTMLElement;renderKey?:string};

const cardStates=new WeakMap<HTMLElement,CardState>();
let sortMode:SortMode='version-desc';
let scheduled=false;

const number=(value:string)=>Number(value.replace(/[^0-9]/g,''))||0;
const labelOf=(row:HTMLElement)=>row.querySelector<HTMLElement>('.truncate')?.textContent?.trim()||'';
const countOf=(row:HTMLElement)=>number(row.querySelector<HTMLElement>('strong')?.textContent||'0');

function windowsReleaseLabel(label:string){
  const release=label.match(/Windows\s+11(?:,\s*version)?\s*(23H2|24H2|25H2)/i)?.[1]?.toUpperCase();
  if(release)return `Windows 11 ${release}`;
  const build=label.match(/(?:10\.0\.)?(22631|26100|26200)(?:\.|\b)/)?.[1];
  if(build==='22631')return 'Windows 11 23H2';
  if(build==='26100')return 'Windows 11 24H2';
  if(build==='26200')return 'Windows 11 25H2';
  return label.replace(/,\s*version\s*/i,' ').replace(/\s*·\s*build\s+.*$/i,'').trim();
}

function versionParts(label:string,platform:string){
  if(platform==='windows'){
    const match=windowsReleaseLabel(label).match(/Windows\s+11\s+(\d{2})H([12])/i);
    if(match)return [2000+Number(match[1]),Number(match[2])];
  }
  const values=label.match(/\d+/g)?.map(Number)??[];
  return values.length?values:[-1];
}

function compareVersionDesc(a:number[],b:number[]){
  const length=Math.max(a.length,b.length);
  for(let i=0;i<length;i++){
    const difference=(b[i]??0)-(a[i]??0);
    if(difference)return difference;
  }
  return 0;
}

function platformOf(card:HTMLElement){
  if(card.querySelector('.platformCardLogo-windows'))return 'windows';
  if(card.querySelector('.platformCardLogo-android'))return 'android';
  if(card.querySelector('.platformCardLogo-applemobile'))return 'applemobile';
  if(card.querySelector('.platformCardLogo-macos'))return 'macos';
  if(card.querySelector('.platformCardLogo-linux'))return 'linux';
  const title=card.querySelector('h2')?.textContent||'';
  return title.toLowerCase().split(' ')[0];
}

function capture(card:HTMLElement):CardState|null{
  const list=card.querySelector<HTMLElement>('.distributionList');
  if(!list)return null;
  const platform=platformOf(card);
  const rows=[...list.children].filter((node):node is HTMLElement=>node instanceof HTMLElement&&!node.dataset.osSortGenerated);
  if(!rows.length)return cardStates.get(card)??null;
  const records=rows.map(element=>{
    const rawLabel=labelOf(element);
    const label=platform==='windows'?windowsReleaseLabel(rawLabel):rawLabel;
    return {label,count:countOf(element),element,version:versionParts(label,platform)};
  });
  const state:CardState={records,platform,list};
  cardStates.set(card,state);
  return state;
}

function sorted(records:VersionRecord[],mode:SortMode=sortMode){
  return [...records].sort((a,b)=>{
    if(mode==='devices-desc')return b.count-a.count||compareVersionDesc(a.version,b.version);
    if(mode==='devices-asc')return a.count-b.count||compareVersionDesc(a.version,b.version);
    const byVersion=compareVersionDesc(a.version,b.version);
    return mode==='version-asc'?-byVersion:byVersion||b.count-a.count;
  });
}

function groupedWindows(records:VersionRecord[]){
  const grouped=new Map<string,VersionRecord>();
  for(const record of records){
    const existing=grouped.get(record.label);
    if(existing){existing.count+=record.count;continue}
    grouped.set(record.label,{...record});
  }
  return [...grouped.values()];
}

function rowsForState(state:CardState){return state.platform==='windows'?groupedWindows(state.records):state.records}

function updateRow(row:HTMLElement,label:string,count:number,total:number,index:number){
  row.dataset.osSortGenerated='1';
  const labelNode=row.querySelector<HTMLElement>('.truncate');
  const countNode=row.querySelector<HTMLElement>('strong');
  const percentNode=row.querySelector<HTMLElement>('small');
  const bar=row.querySelector<HTMLElement>('i > b');
  const percentage=total?count/total*100:0;
  const rounded=Math.round(percentage*10)/10;
  const formatted=`${Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1)}%`;
  if(labelNode){labelNode.textContent=label;labelNode.title=label}
  if(countNode)countNode.textContent=count.toLocaleString();
  if(percentNode)percentNode.textContent=formatted;
  if(bar)bar.style.width=formatted;
  row.style.setProperty('--os-row-order',String(index));
}

function renderWindows(card:HTMLElement,state:CardState){
  const rows=sorted(groupedWindows(state.records));
  const total=state.records.reduce((sum,row)=>sum+row.count,0);
  const renderKey=`${sortMode}|${rows.map(row=>`${row.label}:${row.count}`).join('|')}`;
  const allGenerated=[...state.list.children].every(node=>node instanceof HTMLElement&&node.dataset.osSortGenerated==='1');
  if(state.renderKey===renderKey&&allGenerated)return;
  state.list.replaceChildren(...rows.map((record,index)=>{
    const row=document.createElement('div');
    row.innerHTML=record.element.innerHTML;
    row.className='osVersionSummaryRow';
    updateRow(row,record.label,record.count,total,index);
    return row;
  }));
  state.renderKey=renderKey;
  const subtitle=card.querySelector<HTMLElement>('.insightCardHead p');
  if(subtitle)subtitle.textContent=`${total.toLocaleString()} devices · ${rows.length} reported version${rows.length===1?'':'s'}`;
}

function renderStandard(state:CardState){
  const desired=sorted(state.records).map(record=>record.element);
  const current=[...state.list.children];
  if(current.length===desired.length&&desired.every((element,index)=>current[index]===element))return;
  state.list.append(...desired);
}

function polishPlatformIcon(card:HTMLElement,platform:string){
  const icon=card.querySelector<HTMLElement>('.platformCardLogo');
  if(!icon||icon.dataset.osIconPolished)return;
  if(platform==='applemobile'){
    icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="10" height="17" rx="2"/><path d="M7.5 17.5h2M16 6.5h4.5v11H16"/></svg>';
    icon.dataset.osIconPolished='1';
  }else if(platform==='macos'){
    icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2.5 19h19M9.5 16h5"/></svg>';
    icon.dataset.osIconPolished='1';
  }
}

function enhanceCard(card:HTMLElement){
  let state:CardState|null|undefined=cardStates.get(card);
  const current=[...card.querySelectorAll<HTMLElement>('.distributionList > *')];
  const hasFresh=current.some(row=>!row.dataset.osSortGenerated);
  if(!state||hasFresh&&!state.records.every(record=>current.includes(record.element)))state=capture(card);
  if(!state)return;
  polishPlatformIcon(card,state.platform);
  if(state.platform==='windows')renderWindows(card,state);else renderStandard(state);
}

function orderSignature(state:CardState,mode:SortMode){return sorted(rowsForState(state),mode).map(row=>row.label).join('|')}

function updateHint(section:HTMLElement){
  const hint=section.querySelector<HTMLElement>('.osVersionSortHint');
  if(!hint)return;
  const states=[...section.querySelectorAll<HTMLElement>('.osVersionsGrid .platformSpecificCard')].map(card=>cardStates.get(card)).filter((state):state is CardState=>!!state);
  if(sortMode!=='devices-desc'){hint.textContent='';hint.hidden=true;return}
  const identical=states.length>0&&states.every(state=>orderSignature(state,'version-desc')===orderSignature(state,'devices-desc'));
  hint.textContent=identical?'Same order in this inventory':'';
  hint.hidden=!identical;
}

function addControl(section:HTMLElement){
  if(section.querySelector('.osVersionSortControl'))return;
  section.classList.add('osVersionSortEnhanced');
  const header=section.querySelector<HTMLElement>('.dashboardCategoryHead');
  if(!header)return;
  const wrap=document.createElement('div');
  wrap.className='osVersionSortWrap';
  wrap.innerHTML='<label class="osVersionSortControl"><span>Sort</span><select aria-label="Sort OS versions"><option value="version-desc">Newest version</option><option value="version-asc">Oldest version</option><option value="devices-desc">Most devices</option><option value="devices-asc">Fewest devices</option></select></label><span class="osVersionSortHint" hidden></span>';
  const select=wrap.querySelector('select')!;
  select.value=sortMode;
  select.addEventListener('change',()=>{sortMode=select.value as SortMode;apply()});
  header.append(wrap);
}

function normalizePercentageText(root:HTMLElement){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes:Text[]=[];
  while(walker.nextNode())nodes.push(walker.currentNode as Text);
  for(const node of nodes){
    const value=node.nodeValue;
    if(!value||!value.includes('%'))continue;
    const next=value.replace(/\b(\d+(?:[.,]\d+)?)%/g,(_,raw:string)=>{
      const numberValue=Number(raw.replace(',','.'));
      if(!Number.isFinite(numberValue))return `${raw}%`;
      const rounded=Math.round(numberValue*10)/10;
      return `${Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1)}%`;
    });
    if(next!==value)node.nodeValue=next;
  }
}

function apply(){
  const dashboard=document.querySelector<HTMLElement>('.inventoryDashboard');
  if(dashboard)normalizePercentageText(dashboard);
  const sections=[...document.querySelectorAll<HTMLElement>('.dashboardCategory')];
  const section=sections.find(item=>item.querySelector('.osVersionsGrid'));
  if(!section)return;
  addControl(section);
  section.querySelectorAll<HTMLElement>('.osVersionsGrid .platformSpecificCard').forEach(enhanceCard);
  updateHint(section);
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;apply()});
}

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
schedule();
