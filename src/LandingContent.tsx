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
        <div className="referencePrivacyNote"><span>♙</span><b>100% private.</b> Your data never leaves your device.</div>
      </div>
      <DashboardPreview/>
    </section>

    <section className="howPanel">
      <header><span>HOW IT WORKS</span><h2>From Intune export to usable insight</h2></header>
      <div className="howSteps">
        <HowStep icon="↓" n="1" title="Export from Intune" text="Create a native device inventory export in Microsoft Intune as CSV or ZIP."/>
        <HowArrow/>
        <HowStep icon="☁" n="2" title="Open locally" text="Open the file in your browser. Nothing is uploaded to a backend service."/>
        <HowArrow/>
        <HowStep icon="▥" n="3" title="Analyze & explore" text="Use dashboards, filters and drill-down to find the devices behind each insight."/>
        <HowArrow/>
        <HowStep icon="▤" n="4" title="Share insights" text="Prepare focused exports and management-ready reporting from the same inventory."/>
      </div>
    </section>

    <section className="insightsPanel">
      <div className="insightsCopy">
        <span>BUILT FOR REAL INVENTORIES</span>
        <h2>Powerful insights,<br/>complete control.</h2>
        <p>Go beyond native inventory views with a workspace built for exploration, security review, fleet analysis and reporting.</p>
        <ul><li>Deep dive and drill down into your data</li><li>Security, compliance, updates and usage</li><li>Actionable insights for IT and management</li><li>Built around native Intune exports</li></ul>
        <button onClick={openDemo}>Explore the dashboard</button>
      </div>
      <FleetPreview/>
    </section>

    <section className="privacyPanel">
      <span className="privacyShield">✓</span>
      <div className="privacyLead"><span>PRIVATE. SECURE. OPEN SOURCE.</span><h2>Your inventory stays with you.</h2><p>The Analyzer runs entirely in your browser. No inventory is stored or transmitted, and the source is public so you can review, fork and extend it yourself.</p></div>
      <PrivacyFact icon="▣" title="100% local" text="No data leaves your device."/>
      <PrivacyFact icon="◇" title="Open source" text="Transparent and community-driven."/>
      <PrivacyFact icon="▤" title="You’re in control" text="Use it on your data, on your terms."/>
    </section>
  </div>
}

function DashboardPreview(){return <div className="heroPreview"><div className="previewTop"><strong>Overview</strong><span>Live inventory view</span></div><div className="previewKpis"><PreviewKpi label="Devices" value="6.541"/><PreviewKpi label="Users" value="3.473"/><PreviewKpi label="Encrypted" value="98.0%" tone="good"/><PreviewKpi label="Attention" value="132" tone="warn"/></div><div className="previewGrid"><PreviewDonut title="Compliance status" value="82.1%"/><PreviewDonut title="Platform distribution" value="60.2%" alt/><div className="attentionPreview"><h3>Needs attention</h3><p><i className="red"/>Not encrypted <b>132</b></p><p><i className="orange"/>In grace period <b>108</b></p><p><i className="orange"/>Stale check-in <b>923</b></p><a>View details →</a></div></div></div>}
function PreviewKpi({label,value,tone='blue'}:{label:string;value:string;tone?:string}){return <div className={`previewKpi ${tone}`}><span>{label}</span><strong>{value}</strong></div>}
function PreviewDonut({title,value,alt=false}:{title:string;value:string;alt?:boolean}){return <div className="previewDonut"><h3>{title}</h3><div className={`miniDonut ${alt?'alt':''}`}><div><strong>{value}</strong><span>{alt?'Windows':'compliant'}</span></div></div><a>View details →</a></div>}
function HowStep({icon,n,title,text}:{icon:string;n:string;title:string;text:string}){return <article><span className="howIcon">{icon}</span><strong>{n}. {title}</strong><p>{text}</p></article>}
function HowArrow(){return <span className="howArrow">→</span>}
function FleetPreview(){return <div className="fleetPreview"><aside><b>Overview</b><span>Devices</span><span>Updates</span><span>Reports</span></aside><div className="fleetCanvas"><h3>Fleet & Hardware</h3><div className="fleetCards"><div><b>Platform distribution</b><span className="fleetDonut"/></div><div><b>Model distribution</b><p>Surface Laptop 4 <strong>832</strong></p><p>Surface Pro 8 <strong>621</strong></p><p>Latitude 5430 <strong>512</strong></p><p>MacBook Air M1 <strong>341</strong></p></div><div><b>Ownership</b><span className="fleetDonut alt"/></div><div><b>CPU distribution</b><p>Intel <strong>64.3%</strong></p><p>Apple Silicon <strong>18.7%</strong></p><p>AMD <strong>12.1%</strong></p></div><div><b>Memory distribution</b><p>8 - 15 GB <strong>45.2%</strong></p><p>16 - 31 GB <strong>42.1%</strong></p><p>32 GB or more <strong>12.7%</strong></p></div><div><b>Disk usage</b><p className="goodText">Healthy <strong>78.9%</strong></p><p className="warnText">Low <strong>12.3%</strong></p><p className="badText">Critical <strong>8.8%</strong></p></div></div></div></div>}
function PrivacyFact({icon,title,text}:{icon:string;title:string;text:string}){return <article><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></article>}
