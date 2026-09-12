import { isValidElement, useMemo, useState, type ReactNode } from 'react';

type FaqEntry={category:string;q:string;answer:ReactNode};

const entries:FaqEntry[]=[
  {category:'About',q:'Why does the Intune Device Inventory Analyzer exist?',answer:<>The Analyzer was built to make it easy to gain useful insight into Intune-managed devices without having to set up BI tooling, Microsoft Graph integrations or a separate backend. You simply create a native device inventory export in Intune and open the resulting ZIP or CSV file in your browser. The inventory is processed locally; device and user data is not uploaded or stored by the Analyzer. The project is open source, so you can inspect the code, run it as-is or self-host it in your own environment.</>},
  {category:'Dashboard',q:'Why are these four KPIs shown at the top of the dashboard?',answer:<>The KPI row is intentionally limited to four signals that answer different questions without duplicating the detailed cards below: <strong>Managed devices</strong> shows the size of the current scope, <strong>Compliant devices</strong> shows current management health, <strong>Lifecycle risk</strong> highlights devices that may require an OS or patching action, and <strong>No check-in for 30+ days</strong> identifies devices that have not recently reported back to Intune. Keeping the row small makes it an at-a-glance summary rather than a second dashboard.</>},
  {category:'Dashboard',q:'What do the dashboard colors mean?',answer:<>Colors are used as a visual aid and do not replace the underlying Intune status. <strong>Blue</strong> is informational and is mainly used for scope. <strong>Green</strong> represents a healthy or clear state, <strong>amber</strong> means attention may be needed, <strong>red</strong> represents a stronger risk or critical condition, and <strong>gray</strong> is used for unknown or unavailable information.<br/><br/>The colors inside charts describe individual device states. For example, Compliant and Encrypted are green, In grace period is amber, Noncompliant and Not encrypted are red, and Unknown is gray. The color of a card&apos;s header icon is different: it summarizes the overall health of the current scope.<br/><br/><strong>Compliance</strong> is green from 90%, amber from 75% to below 90%, and red below 75%. <strong>Encryption</strong> is green from 98%, amber from 90% to below 98%, and red below 90%. <strong>Security attention</strong> is green when no security signals are detected, amber when only warning-level signals are present, and red when at least one critical signal such as a jailbroken or rooted device is present.<br/><br/><strong>Lifecycle risk</strong> is green when no known risk is found, amber when risk is present but no assessed device is already out of support, and red when at least one assessed device is out of support. <strong>No check-in for 30+ days</strong> is green when no scoped devices exceed 30 days without a check-in and amber when one or more do.</>},
  {category:'Dashboard',q:'How are the dashboard KPIs calculated?',answer:<><strong>Managed devices</strong> is the number of devices in the current dashboard platform scope.<br/><br/><strong>Compliant devices</strong> is the percentage of scoped devices whose reported Intune compliance state is Compliant. The supporting number shows the device count.<br/><br/><strong>Lifecycle risk</strong> uses the most reliable lifecycle signal available per supported platform. Windows devices are counted as at risk when their detected release is out of support or reaches end of support within six months, using the applicable Home/Pro or Enterprise/Education lifecycle where the SKU can be determined. Android devices are counted as at risk when the reported security patch level is more than 90 days old. iOS/iPadOS and macOS are treated as supported while Apple is still publishing security updates for that OS branch; Apple does not publish fixed end-of-support dates for these releases. Linux lifecycle evaluation is currently limited to Ubuntu, where standard Canonical support dates are used and a release becomes a risk when support has ended or ends within six months. Linux distributions other than Ubuntu are not assessed. The supporting text shows how many scoped devices could be evaluated with these rules.<br/><br/><strong>No check-in for 30+ days</strong> counts scoped devices whose last reported Intune check-in is more than 30 days ago. The KPI subtitle shows what percentage of the current scope this represents. Devices without a usable last check-in timestamp are not counted.</>},
  {category:'Privacy',q:'Is my Intune data uploaded or stored?',answer:<>No. Your inventory is read and analyzed locally in your browser. Device and user data is not sent to an application backend and the loaded inventory is not persisted by the Analyzer.</>},
  {category:'Import',q:'How do I create the input file?',answer:<>Create a native device inventory export in Microsoft Intune and open the resulting ZIP or CSV file in the Analyzer. The application parses and normalizes the export locally.</>},
  {category:'Interface',q:'Why do some categories, cards or filters appear or disappear?',answer:<><strong>Intune Device Inventory Analyzer is inventory-aware.</strong> The interface adapts to the devices in your imported inventory and to the platform scope you select. Categories, dashboard cards and filters are only shown when they are relevant, so empty or inapplicable information does not clutter the interface.<br/><br/>For example, Apple-specific cards and filters are only shown when iOS/iPadOS devices are present, Cellular capability is only relevant to supported mobile platforms, and platform-specific architecture or management insights only appear when that platform exists in the current scope. Selecting a platform can therefore dynamically change which cards and filters are available.</>},
  {category:'Apple',q:'How are iPhone and iPad devices represented?',answer:<>The Analyzer presents managed iPhone and iPad devices consistently as <strong>iOS/iPadOS</strong> in the interface. Internally, related Intune platform values can still be normalized into one technical platform family so filtering and reporting remain consistent.</>},
  {category:'Privacy',q:'What happens when I close or reload the page?',answer:<>The loaded inventory is held only in the current browser session. Reloading or closing the page removes the loaded inventory from the application.</>},
  {category:'Project',q:'Is the project open source?',answer:<>Yes. The source code is public on GitHub. You can review how local processing works, download the project, fork it and adapt it for your own use.</>},
  {category:'Project',q:'Can I suggest a feature or contribute?',answer:<>Yes. Suggestions, additional data mappings, Device Intelligence sources and code contributions are welcome through GitHub.</>}
];

function textOf(node:ReactNode):string{
  if(typeof node==='string'||typeof node==='number')return String(node);
  if(Array.isArray(node))return node.map(textOf).join(' ');
  if(isValidElement<{children?:ReactNode}>(node))return textOf(node.props.children);
  return '';
}

export default function FaqPage(){
  const [query,setQuery]=useState('');
  const normalized=query.trim().toLowerCase();
  const filtered=useMemo(()=>normalized?entries.filter(entry=>`${entry.category} ${entry.q} ${textOf(entry.answer)}`.toLowerCase().includes(normalized)):entries,[normalized]);

  return <main className="faqPage">
    <section className="faqHero">
      <span className="faqEyebrow">FAQ</span>
      <h1>Questions about the Analyzer</h1>
      <p>How the Analyzer works, what your inventory data does, and how dashboard insights are calculated.</p>
      <div className="faqSearchWrap">
        <div className={`faqSearch ${query?'hasValue':''}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>
          <input value={query} onChange={event=>setQuery(event.target.value)} type="search" placeholder="Search questions, topics or answers…" aria-label="Search frequently asked questions"/>
          {query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear FAQ search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>}
        </div>
        <span className="faqSearchMeta">{normalized?`${filtered.length} ${filtered.length===1?'answer':'answers'} found`:`${entries.length} questions`}</span>
      </div>
    </section>

    {filtered.length>0?<section className="faqPageGrid" aria-live="polite">{filtered.map((entry,index)=><Faq key={entry.q} entry={entry} index={index}/>)}</section>:<section className="faqEmpty" aria-live="polite"><span className="faqEmptyIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg></span><h2>No matching questions</h2><p>Try a broader term such as <strong>encryption</strong>, <strong>lifecycle</strong>, <strong>privacy</strong> or <strong>export</strong>.</p><button type="button" onClick={()=>setQuery('')}>Clear search</button></section>}

    <section className="faqCta"><div><span>OPEN SOURCE</span><h2>Want to inspect, improve or extend it?</h2><p>The complete source is available on GitHub.</p></div><a href="https://github.com/roryvossepoel/Intune-Device-Inventory-Analyzer" target="_blank" rel="noreferrer">View project on GitHub <b>↗</b></a></section>
  </main>;
}

function Faq({entry,index}:{entry:FaqEntry;index:number}){
  return <details className="faqItem" name="faq" open={false}>
    <summary><span className="faqNumber">{String(index+1).padStart(2,'0')}</span><span className="faqQuestion"><small>{entry.category}</small><strong>{entry.q}</strong></span><span className="faqToggle" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg></span></summary>
    <div className="faqAnswer"><p>{entry.answer}</p></div>
  </details>;
}