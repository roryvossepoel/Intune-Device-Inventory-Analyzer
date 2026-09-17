export type ImportUiStage='read'|'extract'|'parse'|'process'|'build'|'ready'|'error';

export type ImportUiProgress={
  stage:ImportUiStage;
  label:string;
  detail?:string;
  progress:number;
  fileName:string;
  isZip:boolean;
};

type Step={id:Exclude<ImportUiStage,'ready'|'error'>;label:string;description:string};

function CheckIcon(){return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.3 8.3 2.9 2.9 6.5-6.5"/></svg>}
function FileIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5Z"/><path d="M14 3.5V8h4M8 12h8M8 16h6"/></svg>}

export default function ImportProgressOverlay({progress,onClose}:{progress:ImportUiProgress;onClose:()=>void}){
  const steps:Step[]=[
    {id:'read',label:'Read export',description:'Load the selected file in your browser'},
    ...(progress.isZip?[{id:'extract' as const,label:'Extract archive',description:'Locate and read the inventory CSV'}]:[]),
    {id:'parse',label:'Parse CSV',description:'Read columns and inventory rows'},
    {id:'process',label:'Process devices',description:'Normalize platforms, versions and inventory fields'},
    {id:'build',label:'Build dashboard',description:'Generate insights, filters and reports'}
  ];
  const activeIndex=steps.findIndex(step=>step.id===progress.stage);
  const finished=progress.stage==='ready';
  const failed=progress.stage==='error';

  return <div className="importProgressBackdrop" role="presentation">
    <section className={`importProgressPanel${failed?' importFailed':''}`} role="dialog" aria-modal="true" aria-label={failed?'Inventory import failed':'Processing inventory export'}>
      <header className="importProgressHead">
        <span className="importProgressFileIcon"><FileIcon/></span>
        <div><span className="importProgressEyebrow">LOCAL INVENTORY PROCESSING</span><h2>{failed?'Could not process this export':finished?'Inventory ready':'Analyzing your inventory'}</h2><p>{progress.fileName}</p></div>
      </header>

      {!failed&&<>
        <div className="importProgressCurrent"><div><strong>{progress.label}</strong><span>{progress.detail}</span></div><b>{Math.round(progress.progress)}%</b></div>
        <div className="importProgressTrack" aria-hidden="true"><i style={{width:`${Math.max(2,Math.min(100,progress.progress))}%`}}/></div>
        <div className="importProgressSteps">
          {steps.map((step,index)=>{
            const complete=finished||activeIndex>=0&&index<activeIndex;
            const active=!finished&&step.id===progress.stage;
            return <div key={step.id} className={`importProgressStep${complete?' complete':''}${active?' active':''}`}>
              <span className="importStepState">{complete?<CheckIcon/>:<i/>}</span>
              <div><strong>{step.label}</strong><small>{step.description}</small></div>
            </div>;
          })}
        </div>
      </>}

      {failed&&<div className="importProgressError"><strong>Import failed</strong><p>{progress.detail||'The export could not be read.'}</p><button type="button" onClick={onClose}>Close</button></div>}

      <footer className="importProgressPrivacy"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>Processing stays local in this browser. Inventory data is not uploaded.</span></footer>
    </section>
  </div>;
}
