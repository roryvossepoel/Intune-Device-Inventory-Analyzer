export {};

type Row={label:string;count:number};

function cardTitle(card:HTMLElement){return card.querySelector<HTMLElement>('.dashboardCardHead h2')?.textContent?.trim()||''}
function findUsersSection(){return Array.from(document.querySelectorAll<HTMLElement>('.dashboardCategory')).find(section=>section.querySelector<HTMLElement>('.dashboardCategoryHead>div>span')?.textContent?.trim()==='Users & Ownership')||null}
function findCard(grid:HTMLElement,title:string){return Array.from(grid.querySelectorAll<HTMLElement>(':scope > .dashboardCard')).find(card=>cardTitle(card)===title)||null}
function parseNumber(value:string){const parsed=Number(value.replace(/[^0-9.-]/g,''));return Number.isFinite(parsed)?parsed:0}
function readRows(card:HTMLElement|null):Row[]{if(!card)return[];const list=card.querySelector<HTMLElement>('.distributionList');if(!list)return[];return Array.from(list.children).map(child=>({label:child.querySelector<HTMLElement>('.truncate')?.textContent?.trim()||'',count:parseNumber(child.querySelector<HTMLElement>('strong')?.textContent||'0')})).filter(row=>row.label&&row.count>0)}
function fmt(value:number){return value.toLocaleString()}
function pct(count:number,total:number){const value=total?count/total*100:0;const rounded=Math.round(value*10)/10;return `${Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1)}%`}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>char==='&'?'&amp;':char==='<'?'&lt;':char==='>'?'&gt;':char==='"'?'&quot;':'&#39;')}

function donutMarkup(rows:Row[],total:number,center:string,label:string){let cursor=0;const stops=rows.map((row,index)=>{const start=cursor;cursor+=total?row.count/total*100:0;return `var(--chart-${index%6}) ${start}% ${cursor}%`});return `<div class="usersDonut" style="background:conic-gradient(${stops.join(',')||'#e7eef7 0 100%'})"><div><strong>${escapeHtml(center)}</strong><span>${escapeHtml(label)}</span></div></div>`}
function legendMarkup(rows:Row[],total:number){return `<div class="usersLegend">${rows.filter(row=>row.count>0).map((row,index)=>`<div><i class="usersLegendDot usersLegendDot${index%6}"></i><span>${escapeHtml(row.label)}</span><strong>${fmt(row.count)}</strong><small>${pct(row.count,total)}</small></div>`).join('')}</div>`}
function distributionMarkup(rows:Row[],total:number){return `<div class="usersDensityList">${rows.filter(row=>row.count>0).map((row,index)=>`<div><span>${escapeHtml(row.label)}</span><strong>${fmt(row.count)}</strong><small>${pct(row.count,total)}</small><i><b style="width:${pct(row.count,total)}"></b></i></div>`).join('')}</div>`}
function header(title:string,subtitle:string){return `<header class="dashboardCardHead insightCardHead"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div></header>`}

function setupUsersOwnership(){
  const section=findUsersSection();if(!section)return;
  const grid=section.querySelector<HTMLElement>('.dashboardCategoryContent .extendedInsightGrid');if(!grid)return;
  const assignment=findCard(grid,'User assignment')||findCard(grid,'Primary user coverage');
  const ownership=findCard(grid,'Ownership');
  if(!assignment||!ownership)return;

  const assignmentRows=readRows(assignment);
  const ownershipRows=readRows(ownership);
  const totalDevices=ownershipRows.reduce((sum,row)=>sum+row.count,0);
  if(!totalDevices)return;
  const noPrimary=assignmentRows.find(row=>row.label==='No primary user')?.count||0;
  const assigned=Math.max(0,totalDevices-noPrimary);
  const densityRows=assignmentRows.filter(row=>row.label!=='No primary user');
  const identifiedUsers=densityRows.reduce((sum,row)=>sum+row.count,0);
  const coverageRows:Row[]=[{label:'Primary user assigned',count:assigned},{label:'No primary user',count:noPrimary}];

  grid.classList.add('usersOwnershipGrid');
  assignment.classList.add('usersPrimaryCoverageCard');
  assignment.classList.remove('usersDensityCard');
  assignment.innerHTML=`${header('Primary user coverage','Devices with an identified primary user')}<div class="usersDonutLayout">${donutMarkup(coverageRows,totalDevices,fmt(totalDevices),'devices')}${legendMarkup(coverageRows,totalDevices)}</div>`;

  let density=grid.querySelector<HTMLElement>(':scope > .usersDensityCard');
  if(identifiedUsers>0){
    if(!density){density=document.createElement('article');density.className='dashboardCard extendedInsightCard usersDensityCard';grid.append(density)}
    density.innerHTML=`${header('Devices per user','Managed-device density for identified primary users')}<div class="usersDensitySummary"><strong>${fmt(identifiedUsers)}</strong><span>${identifiedUsers===1?'identified user':'identified users'}</span></div>${distributionMarkup(densityRows,identifiedUsers)}`;
  }else density?.remove();

  ownership.classList.add('usersOwnershipCard');
  ownership.innerHTML=`${header('Ownership','Corporate, personal and other ownership states')}<div class="usersDonutLayout">${donutMarkup(ownershipRows,totalDevices,fmt(totalDevices),'devices')}${legendMarkup(ownershipRows,totalDevices)}</div>`;

  const signature=`${totalDevices}|${noPrimary}|${densityRows.map(row=>`${row.label}:${row.count}`).join(',')}|${ownershipRows.map(row=>`${row.label}:${row.count}`).join(',')}`;
  grid.dataset.usersOwnershipSignature=signature;
}

let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;setupUsersOwnership()})}
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{childList:true,subtree:true});
queueMicrotask(setupUsersOwnership);
