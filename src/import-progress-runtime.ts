import { INVENTORY_IMPORT_PROGRESS_EVENT } from './importer';
import type { ImportProgress, ImportProgressStage } from './importer';

type Step={id:Exclude<ImportProgressStage,'error'>;label:string;description:string};

let backdrop:HTMLDivElement|null=null;
let current:ImportProgress|null=null;
let finishTimer:number|undefined;
let closeTimer:number|undefined;

const stepsFor=(isZip:boolean):Step[]=>[
  {id:'read',label:'Read export',description:'Load the selected file in your browser'},
  ...(isZip?[{id:'extract' as const,label:'Extract archive',description:'Locate and read the inventory CSV'}]:[]),
  {id:'parse',label:'Parse CSV',description:'Read columns and inventory rows'},
  {id:'process',label:'Process devices',description:'Normalize platforms, versions and inventory fields'},
  {id:'build',label:'Build dashboard',description:'Generate insights, filters and reports'}
];

function fileIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5Z"/><path d="M14 3.5V8h4M8 12h8M8 16h6"/></svg>'}
function checkIcon(){return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.3 8.3 2.9 2.9 6.5-6.5"/></svg>'}
function lockIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'}
function arrowIcon(){return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9"/><path d="m9 4 4 4-4 4"/></svg>'}

function ensureOverlay(){
  if(backdrop)return backdrop;
  backdrop=document.createElement('div');
  backdrop.className='importProgressBackdrop';
  backdrop.innerHTML=`<section class="importProgressPanel" role="dialog" aria-modal="true" aria-label="Processing inventory export">
    <header class="importProgressHead"><span class="importProgressFileIcon">${fileIcon()}</span><div><span class="importProgressEyebrow">LOCAL INVENTORY PROCESSING</span><h2>Analyzing your inventory</h2><p class="importProgressFileName"></p></div></header>
    <div class="importProgressBody"><div class="importProgressCurrent"><div><strong></strong><span></span></div><b></b></div><div class="importProgressTrack" aria-hidden="true"><i></i></div><div class="importProgressSteps"></div><div class="importProgressReadyAction" hidden><button type="button"><span>Open dashboard</span>${arrowIcon()}</button><small></small></div></div>
    <div class="importProgressError" hidden><strong>Import failed</strong><p></p><button type="button">Close</button></div>
    <footer class="importProgressPrivacy">${lockIcon()}<span>Processing stays local in this browser. Inventory data is not uploaded.</span></footer>
  </section>`;
  backdrop.querySelector<HTMLButtonElement>('.importProgressError button')?.addEventListener('click',hideOverlay);
  backdrop.querySelector<HTMLButtonElement>('.importProgressReadyAction button')?.addEventListener('click',hideOverlay);
  document.body.append(backdrop);
  return backdrop;
}

function hideOverlay(){
  window.clearTimeout(finishTimer);window.clearTimeout(closeTimer);
  finishTimer=undefined;closeTimer=undefined;current=null;
  backdrop?.remove();backdrop=null;
}

function renderSteps(progress:ImportProgress,ready=false){
  if(!backdrop)return;
  const holder=backdrop.querySelector<HTMLElement>('.importProgressSteps');
  if(!holder)return;
  const steps=stepsFor(progress.isZip);
  const activeIndex=steps.findIndex(step=>step.id===progress.stage);
  holder.replaceChildren(...steps.map((step,index)=>{
    const complete=ready||activeIndex>=0&&index<activeIndex;
    const active=!ready&&step.id===progress.stage;
    const row=document.createElement('div');
    row.className=`importProgressStep${complete?' complete':''}${active?' active':''}`;
    const state=document.createElement('span');state.className='importStepState';state.innerHTML=complete?checkIcon():'<i></i>';
    const text=document.createElement('div');const title=document.createElement('strong');const description=document.createElement('small');
    title.textContent=ready&&step.id==='build'?'Dashboard ready':step.label;
    description.textContent=ready&&step.id==='build'?'Insights, filters and reports are ready':step.description;
    text.append(title,description);row.append(state,text);return row;
  }));
}

function render(progress:ImportProgress){
  current=progress;
  const root=ensureOverlay();
  const panel=root.querySelector<HTMLElement>('.importProgressPanel')!;
  const headTitle=root.querySelector<HTMLElement>('.importProgressHead h2')!;
  const fileName=root.querySelector<HTMLElement>('.importProgressFileName')!;
  const body=root.querySelector<HTMLElement>('.importProgressBody')!;
  const error=root.querySelector<HTMLElement>('.importProgressError')!;
  const readyAction=root.querySelector<HTMLElement>('.importProgressReadyAction')!;
  const currentLabel=root.querySelector<HTMLElement>('.importProgressCurrent strong')!;
  const currentDetail=root.querySelector<HTMLElement>('.importProgressCurrent span')!;
  const currentPercent=root.querySelector<HTMLElement>('.importProgressCurrent b')!;
  const track=root.querySelector<HTMLElement>('.importProgressTrack i')!;
  fileName.textContent=progress.fileName;

  if(progress.stage==='error'){
    panel.classList.remove('importReady');panel.classList.add('importFailed');headTitle.textContent='Could not process this export';body.hidden=true;error.hidden=false;readyAction.hidden=true;
    error.querySelector('p')!.textContent=progress.detail||'The export could not be read.';
    return;
  }

  panel.classList.remove('importFailed','importReady');headTitle.textContent='Analyzing your inventory';body.hidden=false;error.hidden=true;readyAction.hidden=true;
  currentLabel.textContent=progress.label;currentDetail.textContent=progress.detail;currentPercent.textContent=`${Math.round(progress.progress)}%`;track.style.width=`${Math.max(2,Math.min(100,progress.progress))}%`;
  renderSteps(progress);

  if(progress.stage==='build'){
    window.clearTimeout(finishTimer);
    finishTimer=window.setTimeout(()=>showReady(progress),300);
  }
}

function setReadyCountdown(seconds:number){
  const text=backdrop?.querySelector<HTMLElement>('.importProgressReadyAction small');
  if(text)text.textContent=`Opening dashboard in ${seconds} second${seconds===1?'':'s'}…`;
}

function showReady(progress:ImportProgress){
  if(!backdrop||current?.stage!=='build')return;
  const panel=backdrop.querySelector<HTMLElement>('.importProgressPanel')!;
  const headTitle=backdrop.querySelector<HTMLElement>('.importProgressHead h2')!;
  const currentLabel=backdrop.querySelector<HTMLElement>('.importProgressCurrent strong')!;
  const currentDetail=backdrop.querySelector<HTMLElement>('.importProgressCurrent span')!;
  const currentPercent=backdrop.querySelector<HTMLElement>('.importProgressCurrent b')!;
  const track=backdrop.querySelector<HTMLElement>('.importProgressTrack i')!;
  const readyAction=backdrop.querySelector<HTMLElement>('.importProgressReadyAction')!;
  panel.classList.add('importReady');
  headTitle.textContent='Inventory ready';
  currentLabel.textContent='Ready to go';
  currentDetail.textContent=progress.deviceCount!==undefined?`${progress.deviceCount.toLocaleString()} devices processed successfully`:'Your inventory was processed successfully';
  currentPercent.textContent='100%';
  track.style.width='100%';
  renderSteps(progress,true);
  readyAction.hidden=false;

  let remaining=5;
  setReadyCountdown(remaining);
  window.clearTimeout(closeTimer);
  const tick=()=>{
    remaining-=1;
    if(remaining<=0){hideOverlay();return}
    setReadyCountdown(remaining);
    closeTimer=window.setTimeout(tick,1000);
  };
  closeTimer=window.setTimeout(tick,1000);
}

window.addEventListener(INVENTORY_IMPORT_PROGRESS_EVENT,event=>{
  const progress=(event as CustomEvent<ImportProgress>).detail;
  if(progress)render(progress);
});