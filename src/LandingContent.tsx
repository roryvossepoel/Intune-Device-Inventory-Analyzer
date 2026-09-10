type Props={onOpenExport?:()=>void;onOpenDemo?:()=>void;onOpenReports?:()=>void;busy?:boolean;error?:string|null};

export default function LandingContent({onOpenExport=()=>document.querySelector<HTMLInputElement>('input[type="file"]')?.click(),onOpenDemo=()=>document.querySelector<HTMLButtonElement>('.mainNav button')?.click(),onOpenReports=()=>document.querySelectorAll<HTMLButtonElement>('.mainNav button')[2]?.click(),busy=false,error=null}:Props={}){
  return <div className="idaHome">
    <section className="idaHero">
      <div className="idaHeroCopy">
        <span className="idaEyebrow"><i/> LOCAL-FIRST INTUNE INVENTORY ANALYSIS</span>
        <h1>Turn Intune inventory into <em>answers you can act on.</em></h1>
        <p>Open a native Microsoft Intune device inventory export and move from raw rows to a clear dashboard, device-level exploration and reusable management stories. Everything runs locally in your browser.</p>
        <div className="idaHeroActions"><button className="idaPrimary" onClick={onOpenExport}><UploadIcon/>Open Intune export</button><button className="idaSecondary" onClick={onOpenDemo}>Explore demo inventory <span>→</span></button></div>
        <div className="idaHeroMeta"><span><ShieldIcon/>No upload or backend</span><span><FileIcon/>CSV or ZIP</span><span><CodeIcon/>Open source</span></div>
      </div>
      <HeroProductPreview/>
    </section>

    <section className="idaDropZone" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const input=document.querySelector<HTMLInputElement>('input[type="file"]');const file=event.dataTransfer.files[0];if(input&&file){const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))}}} onClick={onOpenExport}>
      <span className="idaDropIcon"><UploadIcon/></span><div><strong>Open your Intune inventory export</strong><span>Drop a CSV or ZIP here, or click to browse. Processing stays on this device.</span></div><b>CSV · ZIP</b>
    </section>
    {busy&&<div className="idaHomeState">Reading and normalizing inventory…</div>}
    {error&&<div className="idaHomeState error">{error}</div>}

    <section className="idaHomeIntro">
      <span>ONE INVENTORY · THREE WAYS TO USE IT</span>
      <h2>Built around the questions you actually ask.</h2>
      <p>The Analyzer keeps overview, investigation and communication connected. Every high-level signal can lead back to the devices behind it.</p>
    </section>

    <section className="idaCapabilityGrid">
      <CapabilityCard className="dashboard" eyebrow="01 · DASHBOARD" title="See the estate before you start digging" text="Compliance, encryption, activity, hardware, users, OS versions and lifecycle are organized into focused sections instead of one giant export." action="Explore dashboard" onClick={onOpenDemo}><DashboardMini/></CapabilityCard>
      <CapabilityCard className="explorer" eyebrow="02 · DEVICE EXPLORER" title="Move from a percentage to the exact devices" text="Use fixed filters, dashboard drill-through, search and original Intune fields to inspect the inventory without losing the context behind the finding." action="Open Device Explorer" onClick={onOpenDemo}><ExplorerMini/></CapabilityCard>
      <CapabilityCard className="reports" eyebrow="03 · REPORTS" title="Turn findings into a story, not another screenshot" text="Reports are being built around three reusable stories that combine plain-language interpretation with the graph or diagram that proves the point." action="Preview Reports" onClick={onOpenReports}><ReportMini/></CapabilityCard>
    </section>

    <section className="idaRealExamples">
      <div className="idaRealExamplesCopy"><span>REAL ANALYZER BUILDING BLOCKS</span><h2>Examples come straight from the workspace.</h2><p>The homepage now reflects the same concepts you see after importing an inventory. No generic product mockups.</p><button onClick={onOpenDemo}>Open the complete demo <span>→</span></button></div>
      <div className="idaExampleStack"><ExampleRow icon="shield" title="Encryption status" text="Encrypted, not encrypted and unknown states with direct drill-through." stat="95.0%"/><ExampleRow icon="devices" title="Primary user coverage" text="See which devices have an identified primary user and which do not." stat="92.2%"/><ExampleRow icon="os" title="OS versions by platform" text="Windows, Android, iOS/iPadOS, macOS and Linux version distributions." stat="5 platforms"/><ExampleRow icon="activity" title="Check-in age" text="Find active devices and stale inventory without manually calculating dates." stat="30+ days"/></div>
    </section>

    <section className="idaWorkflow">
      <header><span>FROM EXPORT TO INSIGHT</span><h2>Four steps. No data pipeline required.</h2></header>
      <div><WorkflowStep n="1" title="Export" text="Create the native device inventory export in Microsoft Intune."/><WorkflowArrow/><WorkflowStep n="2" title="Open locally" text="Read and normalize the CSV or ZIP directly in the browser."/><WorkflowArrow/><WorkflowStep n="3" title="Explore" text="Use dashboard cards and Device Explorer to isolate the devices behind a signal."/><WorkflowArrow/><WorkflowStep n="4" title="Tell the story" text="Use Reports to combine a concise conclusion with the graph or diagram that supports it."/></div>
    </section>

    <section className="idaReportsTeaser">
      <div className="idaReportsTeaserCopy"><span>REPORTS · IN DEVELOPMENT</span><h2>Three ready-to-use stories from one inventory.</h2><p>The report format is designed for actual reuse: a short interpretation, the supporting visual and the underlying inventory context stay together.</p><div><ReportPoint title="Security posture" text="Compliance, encryption and activity in one management-ready story."/><ReportPoint title="Estate composition" text="Platform, manufacturer, model and OS-version standardization."/><ReportPoint title="Lifecycle & updates" text="Lifecycle exposure and update position by platform."/></div><button onClick={onOpenReports}>See the report preview <span>→</span></button></div>
      <ReportDocumentPreview/>
    </section>

    <section className="idaTrustPanel">
      <div className="idaTrustLead"><span className="idaTrustIcon"><ShieldIcon/></span><div><small>PRIVATE BY DESIGN</small><h2>Your inventory stays with you.</h2><p>The browser does the work. Device and user data is not uploaded, stored or sent to an application backend.</p></div></div>
      <TrustFact title="Local processing" text="Open and analyze the export on the device in front of you."/><TrustFact title="Transparent" text="The project is open source and the processing logic can be reviewed."/><TrustFact title="Portable" text="No tenant connection, account or service database is required to start analyzing."/>
    </section>
  </div>;
}

function HeroProductPreview(){return <div className="idaHeroProduct"><div className="idaProductWindow"><header><span><i/><i/><i/></span><strong>Inventory dashboard</strong><small>Example inventory</small></header><div className="idaPreviewNav"><b>Dashboard</b><span>Device Explorer</span><span>Reports</span><em>All platforms⌄</em></div><div className="idaPreviewKpis"><MiniKpi label="Managed devices" value="6,541"/><MiniKpi label="Compliant" value="82.1%"/><MiniKpi label="Lifecycle risk" value="128"/><MiniKpi label="No check-in 30+ days" value="923"/></div><div className="idaPreviewMain"><div className="idaPreviewCard"><span>Encryption status</span><small>Reported device encryption state</small><div className="idaPreviewDonut"><div><strong>95.0%</strong><small>encrypted</small></div></div><p><i className="good"/>Encrypted <b>6,214</b><em>95.0%</em></p><p><i className="bad"/>Not encrypted <b>196</b><em>3.0%</em></p><p><i/>Unknown <b>131</b><em>2.0%</em></p></div><div className="idaPreviewCard versions"><span>Windows versions</span><small>90 devices · 4 reported versions</small><PreviewBar label="Windows 11 25H2" value="63" width="70%"/><PreviewBar label="Windows 11 24H2" value="24" width="26.7%"/><PreviewBar label="Windows 11 23H2" value="3" width="3.3%"/></div></div></div><div className="idaExplorerFloat"><header><strong>Device Explorer</strong><span>171 of 180 devices</span></header><div className="idaFloatFilters"><span>Platform · Windows⌄</span><span>Encryption · Encrypted⌄</span></div><p><b>ADMIN-SL7-01</b><span>Windows 11 25H2</span><em>Compliant</em></p><p><b>LAPTOP-042</b><span>Windows 11 24H2</span><em>Compliant</em></p></div></div>}
function MiniKpi({label,value}:{label:string;value:string}){return <div><span>{label}</span><strong>{value}</strong></div>}
function PreviewBar({label,value,width}:{label:string;value:string;width:string}){return <div className="idaPreviewBar"><div><span>{label}</span><strong>{value}</strong></div><i><b style={{width}}/></i></div>}
function CapabilityCard({className,eyebrow,title,text,action,onClick,children}:{className:string;eyebrow:string;title:string;text:string;action:string;onClick:()=>void;children:React.ReactNode}){return <article className={`idaCapability ${className}`}><div className="idaCapabilityCopy"><span>{eyebrow}</span><h3>{title}</h3><p>{text}</p><button onClick={onClick}>{action} <b>→</b></button></div>{children}</article>}
function DashboardMini(){return <div className="idaDashboardMini"><div><strong>Compliance status</strong><span className="idaMiniRing">82%</span><p><i/>Compliant <b>148</b></p><p><i/>Noncompliant <b>26</b></p></div><div><strong>Devices per user</strong><PreviewBar label="1 device" value="18" width="45%"/><PreviewBar label="2 devices" value="16" width="40%"/><PreviewBar label="5+ devices" value="6" width="15%"/></div></div>}
function ExplorerMini(){return <div className="idaExplorerMini"><div className="idaExplorerMiniFilters"><span>Device type⌄</span><span>Platform⌄</span><span>Manufacturer⌄</span></div><div className="idaExplorerMiniHead"><span>DEVICE</span><span>PLATFORM</span><span>MODEL</span><span>COMPLIANCE</span></div><ExplorerMiniRow device="ADMIN-014" platform="Windows" model="Surface Laptop 7"/><ExplorerMiniRow device="IOS-0042" platform="iOS/iPadOS" model="iPhone 16"/><ExplorerMiniRow device="AND-0081" platform="Android" model="Galaxy A56"/></div>}
function ExplorerMiniRow({device,platform,model}:{device:string;platform:string;model:string}){return <div className="idaExplorerMiniRow"><strong>{device}</strong><span>{platform}</span><span>{model}</span><em>Compliant</em></div>}
function ReportMini(){return <div className="idaReportMini"><header><span>01</span><div><small>COMPLIANCE & PROTECTION</small><strong>Security posture</strong></div></header><p><b>82.1%</b> of devices are compliant. Reported encryption coverage is <b>95.0%</b>, while 923 devices have not checked in for more than 30 days.</p><div><span><b>82.1%</b><small>Compliance</small></span><span><b>95.0%</b><small>Encryption</small></span><span><b>923</b><small>Stale</small></span></div></div>}
function ExampleRow({icon,title,text,stat}:{icon:string;title:string;text:string;stat:string}){return <article><span className={`idaExampleIcon ${icon}`}><ExampleIcon name={icon}/></span><div><strong>{title}</strong><p>{text}</p></div><b>{stat}</b></article>}
function WorkflowStep({n,title,text}:{n:string;title:string;text:string}){return <article><span>{n}</span><strong>{title}</strong><p>{text}</p></article>}
function WorkflowArrow(){return <i className="idaWorkflowArrow">→</i>}
function ReportPoint({title,text}:{title:string;text:string}){return <article><i>✓</i><div><strong>{title}</strong><span>{text}</span></div></article>}
function ReportDocumentPreview(){return <div className="idaReportDoc"><header><span>INTUNE INVENTORY REPORT</span><b>01</b></header><h3>Security posture</h3><p>The current inventory has a strong encryption baseline, while compliance and stale-device signals identify a smaller set that needs attention.</p><div className="idaDocMetrics"><span><b>82.1%</b><small>Compliant</small></span><span><b>95.0%</b><small>Encrypted</small></span><span><b>923</b><small>30+ days</small></span></div><div className="idaDocChart"><PreviewBar label="Compliant" value="5,371" width="82.1%"/><PreviewBar label="Encrypted" value="6,214" width="95%"/><PreviewBar label="Active ≤30 days" value="5,618" width="85.9%"/></div><footer><span>Generated locally from the current inventory</span><b>intuneinventory.com</b></footer></div>}
function TrustFact({title,text}:{title:string;text:string}){return <article><strong>{title}</strong><span>{text}</span></article>}
function UploadIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v5h14v-5"/></svg>}
function ShieldIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 2.9 7.3 7 9 4.1-1.7 7-4.5 7-9V6l-7-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>}
function FileIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6m-6 4h6"/></svg>}
function CodeIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 8-4 4 4 4m6-8 4 4-4 4m-2-10-2 12"/></svg>}
function ExampleIcon({name}:{name:string}){if(name==='shield')return <ShieldIcon/>;if(name==='devices')return <svg viewBox="0 0 24 24"><rect x="3" y="4" width="13" height="10" rx="2"/><rect x="16" y="8" width="5" height="11" rx="1.5"/><path d="M7 19h5m-2.5-5v5"/></svg>;if(name==='os')return <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg>;return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>}
