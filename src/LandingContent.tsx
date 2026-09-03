export default function LandingContent(){
  const openExport=()=>document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
  const openDemo=()=>document.querySelector<HTMLButtonElement>('.mainNav button')?.click();
  return <div className="landingStory landingReference">
    <section className="referenceHero">
      <div className="referenceHeroCopy">
        <span className="referenceEyebrow">PRIVATE BY DESIGN · OPEN SOURCE</span>
        <h1>Understand your<br/>Intune environment.<br/><em>Fully in control.</em></h1>
        <p>Turn a native Microsoft Intune inventory export into clear insights about devices, compliance, security and updates — all processed locally in your browser.</p>
        <div className="referenceCtas">
          <button className="referencePrimary" onClick={openExport}><span>↥</span> Open Intune export</button>
          <button className="referenceSecondary" onClick={openDemo}>Try with demo data →</button>
        </div>
        <small>CSV or ZIP export from Microsoft Intune</small>
        <div className="referencePrivacyNote"><LockMini/><b>100% private.</b> Your data never leaves your device.</div>
      </div>
      <DashboardPreview/>
    </section>

    <section className="howPanel landingSectionCard">
      <header><span>HOW IT WORKS</span><h2>From Intune export to usable insight</h2></header>
      <div className="howSteps">
        <HowStep icon="export" n="1" title="Export from Intune" text="Create a native device inventory export in Microsoft Intune as CSV or ZIP."/>
        <HowArrow/>
        <HowStep icon="local" n="2" title="Open locally" text="Open the file in your browser. Nothing is uploaded to a backend service."/>
        <HowArrow/>
        <HowStep icon="analyze" n="3" title="Analyze & explore" text="Use dashboards, filters and drill-down to find the devices behind each insight."/>
        <HowArrow/>
        <HowStep icon="report" n="4" title="Share insights" text="Prepare focused exports and management-ready reporting from the same inventory."/>
      </div>
    </section>

    <section className="insightsPanel landingSectionCard">
      <div className="insightsCopy">
        <span>BUILT FOR REAL INVENTORIES</span>
        <h2>Powerful insights,<br/>complete control.</h2>
        <p>Go beyond native inventory views with a workspace built for exploration, security review, operating-system analysis, hardware insights and reporting.</p>
        <ul><li>Drill down from dashboard cards to the underlying devices</li><li>Review compliance, encryption, activity and attention signals</li><li>Explore hardware, manufacturers, models and operating systems</li><li>Filter and prepare clean device exports for further use</li></ul>
        <button onClick={openDemo}>Explore the dashboard</button>
      </div>
      <FleetPreview/>
    </section>

    <section className="privacyPanel landingSectionCard">
      <span className="privacyShield"><ShieldCheck/></span>
      <div className="privacyLead"><span>PRIVATE. SECURE. OPEN SOURCE.</span><h2>Your inventory stays with you.</h2><p>The Analyzer runs entirely in your browser. No inventory is stored or transmitted, and the source is public so you can review, fork and extend it yourself.</p></div>
      <PrivacyFact icon="local" title="100% local" text="Inventory processing stays in your browser. No data leaves your device."/>
      <PrivacyFact icon="source" title="Open source" text="Transparent, reviewable and ready to extend for your own environment."/>
      <PrivacyFact icon="control" title="You’re in control" text="Use your own export, reload when you want and keep ownership of your data."/>
    </section>
  </div>
}

function DashboardPreview(){return <div className="heroPreview"><div className="previewTop"><strong>Dashboard</strong><span>Current inventory view</span></div><div className="previewKpis"><PreviewKpi label="Devices" value="6.541"/><PreviewKpi label="Users" value="3.473"/><PreviewKpi label="Compliance" value="82.1%" tone="good"/><PreviewKpi label="Stale > 30 days" value="923" tone="warn"/></div><div className="previewGrid"><PreviewDonut title="Compliance status" value="82.1%"/><PreviewDonut title="Encryption status" value="98.0%" encryption/><div className="attentionPreview"><h3>Needs attention</h3><p><i className="red"/>Noncompliant <b>1.061</b></p><p><i className="orange"/>Not encrypted <b>132</b></p><p><i className="orange"/>Stale check-in <b>923</b></p><a>View details →</a></div></div></div>}
function PreviewKpi({label,value,tone='blue'}:{label:string;value:string;tone?:string}){return <div className={`previewKpi ${tone}`}><span>{label}</span><strong>{value}</strong></div>}
function PreviewDonut({title,value,encryption=false}:{title:string;value:string;encryption?:boolean}){return <div className="previewDonut"><h3>{title}</h3><div className={`miniDonut ${encryption?'encryption':''}`}><div><strong>{value}</strong><span>{encryption?'encrypted':'compliant'}</span></div></div><a>View details →</a></div>}
function HowStep({icon,n,title,text}:{icon:'export'|'local'|'analyze'|'report';n:string;title:string;text:string}){return <article><span className="howIcon"><HowIcon name={icon}/></span><strong>{n}. {title}</strong><p>{text}</p></article>}
function HowArrow(){return <span className="howArrow">→</span>}
function FleetPreview(){return <div className="fleetPreview"><aside><b>Dashboard</b><span>Devices</span><span>Updates</span><span>Reports</span></aside><div className="fleetCanvas"><h3>Inventory dashboard</h3><div className="fleetCards currentPreviewCards"><div><b>Hardware type</b><p>Laptop <strong>45.1%</strong></p><p>Tablet <strong>25.9%</strong></p><p>Smartphone <strong>14.9%</strong></p></div><div><b>Hardware manufacturers</b><p>Dell <strong>36.2%</strong></p><p>Apple <strong>24.9%</strong></p><p>Samsung <strong>13.6%</strong></p></div><div><b>Operating systems</b><p>Windows <strong>60.2%</strong></p><p>Apple Mobile <strong>24.9%</strong></p><p>Android <strong>14.9%</strong></p></div><div><b>Activity distribution</b><p>0–7 days <strong>74.0%</strong></p><p>8–30 days <strong>11.9%</strong></p><p>&gt;90 days <strong>7.6%</strong></p></div><div><b>Devices per user</b><p>1 device <strong>1.299</strong></p><p>2 devices <strong>1.924</strong></p><p>3+ devices <strong>250</strong></p></div><div><b>Inventory anomalies</b><p>Duplicate names <strong>166</strong></p><p>Missing serial <strong>91</strong></p><p>Unknown platform <strong>0</strong></p></div></div></div></div>}
function PrivacyFact({icon,title,text}:{icon:'local'|'source'|'control';title:string;text:string}){return <article><span><FactIcon name={icon}/></span><div><strong>{title}</strong><small>{text}</small></div></article>}
function HowIcon({name}:{name:string}){if(name==='export')return <svg viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18v2h14v-2"/></svg>;if(name==='local')return <svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.5-1.4A4.7 4.7 0 0 0 7 18Z"/><path d="M9 14h6"/></svg>;if(name==='analyze')return <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 16v-4m4 4V8m4 8v-6"/></svg>;return <svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6m-6 4h6"/></svg>}
function FactIcon({name}:{name:string}){if(name==='local')return <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="12" rx="2"/><path d="M9 21h6m-3-4v4M9 10h6"/></svg>;if(name==='source')return <svg viewBox="0 0 24 24"><path d="m9 8-4 4 4 4m6-8 4 4-4 4m-2-10-2 12"/></svg>;return <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="10" cy="17" r="1.5"/></svg>}
function ShieldCheck(){return <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 2.9 7.3 7 9 4.1-1.7 7-4.5 7-9V6l-7-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>}
function LockMini(){return <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>}
