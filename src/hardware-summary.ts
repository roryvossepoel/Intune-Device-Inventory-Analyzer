export {};

type DistributionRow={label:string;count:number;percent:number};
type ArchitectureSource={platform:string;card:HTMLElement;rows:DistributionRow[];total:number};

const ARCHITECTURE_TITLES:[string,string][]=[
  ['Windows','Windows hardware'],
  ['macOS','macOS architecture'],
  ['Linux','Linux architecture']
];

function cardTitle(card:HTMLElement){return card.querySelector<HTMLElement>('.dashboardCardHead h2')?.textContent?.trim()||''}
function findFleetSection(){return Array.from(document.querySelectorAll<HTMLElement>('.dashboardCategory')).find(section=>section.querySelector<HTMLElement>('.dashboardCategoryHead>div>span')?.textContent?.trim()==='Fleet & Hardware')||null}
function findCard(grid:HTMLElement,title:string){return Array.from(grid.querySelectorAll<HTMLElement>(':scope > .dashboardCard')).find(card=>cardTitle(card)===title)||null}
function parseNumber(value:string){const cleaned=value.replace(/[^0-9.-]/g,'');const parsed=Number(cleaned);return Number.isFinite(parsed)?parsed:0}
function readRows(card:HTMLElement):DistributionRow[]{
  const list=card.querySelector<HTMLElement>('.distributionList');
  if(!list)return [];
  return Array.from(list.children).flatMap(child=>{
    if(!(child instanceof HTMLElement))return [];
    const label=child.querySelector<HTMLElement>('.truncate')?.textContent?.trim()||'';
    const count=parseNumber(child.querySelector<HTMLElement>('strong')?.textContent||'0');
    const percent=parseNumber(child.querySelector<HTMLElement>('small')?.textContent||'0');
    return label?[{label,count,percent}]:[];
  });
}
function rowTotal(rows:DistributionRow[]){return rows.reduce((sum,row)=>sum+row.count,0)}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>{if(char==='&')return '&amp;';if(char==='<')return '&lt;';if(char==='>')return '&gt;';if(char==='"')return '&quot;';return '&#39;'})}
function percent(count:number,total:number){return total?count/total*100:0}

function overallArchitectureRows(sources:ArchitectureSource[]):DistributionRow[]{
  const totals=new Map<string,number>();
  for(const source of sources){
    for(const row of source.rows){totals.set(row.label,(totals.get(row.label)||0)+row.count)}
  }
  const total=Array.from(totals.values()).reduce((sum,count)=>sum+count,0);
  return Array.from(totals.entries())
    .map(([label,count])=>({label,count,percent:percent(count,total)}))
    .sort((a,b)=>b.count-a.count);
}

function stackMarkup(rows:DistributionRow[],className:string){
  return `<div class="${className}">${rows.map((row,index)=>`<span class="architectureMixSegment architectureMixSegment${index%4}" style="width:${Math.max(0,Math.min(100,row.percent))}%" title="${escapeHtml(row.label)} ${row.percent.toFixed(1)}%"></span>`).join('')}</div>`;
}

function overallMarkup(sources:ArchitectureSource[]){
  const rows=overallArchitectureRows(sources);
  const total=rowTotal(rows);
  const values=rows.map(row=>`<div class="architectureOverallRow"><span>${escapeHtml(row.label)}</span><strong>${row.count.toLocaleString()}</strong><small>${row.percent.toFixed(1)}%</small></div>`).join('');
  return `<section class="architectureOverall"><header><strong>Overall mix</strong><span>${total.toLocaleString()} ${total===1?'device':'devices'}</span></header><div class="architectureOverallRows">${values}</div>${stackMarkup(rows,'architectureOverallStack')}</section>`;
}

function platformMarkup(source:ArchitectureSource){
  const rows=source.rows;
  const header=`<header><strong>${source.platform}</strong><span>${source.total.toLocaleString()} ${source.total===1?'device':'devices'}</span></header>`;
  if(rows.length===1){
    const row=rows[0];
    return `<section class="architecturePlatformBreakdown">${header}<div class="architectureOnlyLine"><span>${escapeHtml(row.label)} only</span><strong>${row.count.toLocaleString()}</strong></div></section>`;
  }
  const values=rows.map(row=>`<div class="architecturePlatformValue"><span>${escapeHtml(row.label)}</span><strong>${row.count.toLocaleString()}</strong><small>${row.percent.toFixed(1)}%</small></div>`).join('');
  return `<section class="architecturePlatformBreakdown">${header}<div class="architecturePlatformValues">${values}</div></section>`;
}

function architectureMarkup(sources:ArchitectureSource[]){
  return `<div class="architectureOverviewBody">${overallMarkup(sources)}<div class="architectureByPlatform"><div class="architectureByPlatformTitle">By platform</div>${sources.map(platformMarkup).join('')}</div></div>`;
}

function ensureArchitectureCard(grid:HTMLElement,sources:ArchitectureSource[]){
  let summary=grid.querySelector<HTMLElement>(':scope > .hardwareArchitectureSummaryCard');
  if(!sources.length){summary?.remove();return}
  if(!summary){summary=document.createElement('article');summary.className='dashboardCard extendedInsightCard hardwareArchitectureSummaryCard';grid.append(summary)}
  const signature=sources.map(source=>`${source.platform}:${source.rows.map(row=>`${row.label}:${row.count}:${row.percent}`).join(',')}`).join('|');
  if(summary.dataset.summarySignature===signature)return;
  summary.dataset.summarySignature=signature;
  summary.innerHTML=`<header class="dashboardCardHead insightCardHead"><div><h2>Processor architecture</h2><p>Architecture mix across desktop operating systems</p></div></header>${architectureMarkup(sources)}`;
}
function markCard(card:HTMLElement|null,className:string){if(card&&!card.classList.contains(className))card.classList.add(className)}
function setupFleet(){
  const section=findFleetSection();if(!section)return;
  const grid=section.querySelector<HTMLElement>('.dashboardCategoryContent .extendedInsightGrid.twoInsightGrid');if(!grid)return;
  grid.dataset.hardwareSummaryGrid='true';
  markCard(findCard(grid,'Device types'),'hardwareCardTypes');
  markCard(findCard(grid,'Manufacturers'),'hardwareCardManufacturers');
  markCard(findCard(grid,'Models'),'hardwareCardModels');

  const sources:ArchitectureSource[]=[];
  for(const [platform,title] of ARCHITECTURE_TITLES){
    const card=findCard(grid,title);if(!card)continue;
    card.classList.add('hardwareArchitectureSource');
    const rows=readRows(card);if(rows.length)sources.push({platform,card,rows,total:rowTotal(rows)});
  }
  ensureArchitectureCard(grid,sources);

  const family=findCard(grid,'iOS/iPadOS device family');
  if(family){family.classList.add('hardwareFamilyCard');const rows=readRows(family);family.classList.toggle('hardwareSingleFamily',rows.length===1)}
}

let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;setupFleet()})}
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{childList:true,subtree:true});
queueMicrotask(setupFleet);
