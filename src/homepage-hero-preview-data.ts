export {};

const managedDevices='3,642';
const explorerDevices='3,471 of 3,642 devices';

function applyHeroPreviewData(){
  const root=document.querySelector<HTMLElement>('.idaHeroProduct');
  if(!root||root.dataset.previewDataApplied==='true')return;

  const kpiValues=['3,642','84.8%','214','286'];
  root.querySelectorAll<HTMLElement>('.idaPreviewKpis strong').forEach((element,index)=>{
    if(kpiValues[index])element.textContent=kpiValues[index];
  });

  const encryptionRows=root.querySelectorAll<HTMLElement>('.idaPreviewMain .idaPreviewCard:not(.versions) > p');
  const encryptionData=[['3,460','95.0%'],['109','3.0%'],['73','2.0%']];
  encryptionRows.forEach((row,index)=>{
    const count=row.querySelector<HTMLElement>('b');
    const percentage=row.querySelector<HTMLElement>('em');
    if(count&&encryptionData[index])count.textContent=encryptionData[index][0];
    if(percentage&&encryptionData[index])percentage.textContent=encryptionData[index][1];
  });

  const versionCard=root.querySelector<HTMLElement>('.idaPreviewCard.versions');
  const versionMeta=versionCard?.querySelector<HTMLElement>(':scope > small');
  if(versionMeta)versionMeta.textContent='2,752 Windows devices · 3 reported versions';

  const versions=[
    {value:'1,284',width:'46.7%'},
    {value:'1,047',width:'38.0%'},
    {value:'421',width:'15.3%'}
  ];
  versionCard?.querySelectorAll<HTMLElement>('.idaPreviewBar').forEach((bar,index)=>{
    const value=bar.querySelector<HTMLElement>('strong');
    const fill=bar.querySelector<HTMLElement>('i > b');
    if(value&&versions[index])value.textContent=versions[index].value;
    if(fill&&versions[index])fill.style.width=versions[index].width;
  });

  const explorerCount=root.querySelector<HTMLElement>('.idaExplorerFloat > header span');
  if(explorerCount)explorerCount.textContent=explorerDevices;

  root.dataset.previewDataApplied='true';
}

function refresh(){requestAnimationFrame(applyHeroPreviewData)}
refresh();

const appRoot=document.getElementById('root');
if(appRoot)new MutationObserver(refresh).observe(appRoot,{childList:true,subtree:true});

void managedDevices;
