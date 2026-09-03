import DashboardSection from './DashboardSection';
import type { Device } from './types';

const fmt=(n:number)=>n.toLocaleString();
const pct=(n:number,total:number)=>total?`${(n/total*100).toFixed(1)}%`:'0.0%';
const clean=(v:string|null|undefined)=>v?.trim()||'Unknown';
function rawValue(device:Device,patterns:RegExp[]){for(const [name,value] of Object.entries(device.raw)){if(patterns.some(p=>p.test(name))&&value?.trim())return value.trim()}return ''}
function countValues(values:string[]){return Object.entries(values.reduce<Record<string,number>>((a,v)=>{a[v]=(a[v]??0)+1;return a},{})).sort((a,b)=>b[1]-a[1]) as [string,number][]}
function architecture(device:Device){return rawValue(device,[/^ProcessorArchitecture$/i,/^Architecture$/i])||'Unknown'}
function joinType(device:Device){return rawValue(device,[/^JoinType$/i,/^Join type$/i])||'Unknown'}
function sku(device:Device){return rawValue(device,[/^SkuFamily$/i,/^OS SKU$/i,/^SKU$/i])||'Unknown'}
function certExpiry(device:Device){return rawValue(device,[/^Management certificate expiration date$/i])}

export default function PlatformInsights({devices,platform}:{devices:Device[];platform:string|null}){
  if(!platform)return null;
  if(platform==='windows')return <WindowsInsights devices={devices}/>;
  if(platform==='android')return <AndroidInsights devices={devices}/>;
  if(platform==='applemobile')return <AppleMobileInsights devices={devices}/>;
  if(platform==='macos')return <MacInsights devices={devices}/>;
  if(platform==='linux')return <LinuxInsights devices={devices}/>;
  return null;
}

function WindowsInsights({devices}:{devices:Device[]}){
  const skus=countValues(devices.map(sku));
  const architectures=countValues(devices.map(architecture));
  const joins=countValues(devices.map(joinType));
  const bios=devices.filter(d=>!!rawValue(d,[/^SystemManagementBIOSVersion$/i])).length;
  const tpm=devices.filter(d=>!!rawValue(d,[/^TPMManufacturerId$/i,/^TPMManufacturerVersion$/i])).length;
  return <DashboardSection icon="updates" title="Windows intelligence" subtitle="Windows-specific edition, architecture, identity and firmware inventory signals.">
    <div className="extendedInsightGrid hardwareInsightGrid">
      <InsightCard title="Windows SKU / edition" subtitle="SKU family reported by the Intune inventory export"><Distribution rows={skus} total={devices.length}/></InsightCard>
      <InsightCard title="Processor architecture" subtitle="Reported Windows processor architecture"><Distribution rows={architectures} total={devices.length}/></InsightCard>
      <InsightCard title="Join type" subtitle="Microsoft Entra registration and join state"><Distribution rows={joins} total={devices.length}/></InsightCard>
    </div>
    <div className="extendedInsightGrid twoInsightGrid">
      <InsightCard title="Firmware inventory coverage" subtitle="Availability of BIOS and TPM inventory fields"><div className="metricTiles"><Metric label="BIOS reported" value={fmt(bios)}/><Metric label="TPM reported" value={fmt(tpm)}/></div><div className="inlineInsight"><span>BIOS coverage</span><strong>{pct(bios,devices.length)}</strong><small>TPM coverage {pct(tpm,devices.length)}</small></div></InsightCard>
    </div>
  </DashboardSection>
}

function AndroidInsights({devices}:{devices:Device[]}){
  const patches=countValues(devices.map(d=>rawValue(d,[/^Security patch level$/i])||'Unknown'));
  const modes=countValues(devices.map(androidMode));
  return <DashboardSection icon="updates" title="Android intelligence" subtitle="Android-specific patch and enrollment-mode information from the current inventory scope.">
    <div className="extendedInsightGrid twoInsightGrid">
      <InsightCard title="Security patch level" subtitle="Reported Android security patch levels"><Distribution rows={patches} total={devices.length}/></InsightCard>
      <InsightCard title="Management mode" subtitle="Android and AOSP enrollment modes reported by Intune"><Distribution rows={modes} total={devices.length}/></InsightCard>
    </div>
  </DashboardSection>
}

function AppleMobileInsights({devices}:{devices:Device[]}){
  const supervised=countValues(devices.map(d=>humanBoolean(rawValue(d,[/^Supervised$/i]))));
  const families=countValues(devices.map(appleDeviceFamily));
  return <DashboardSection icon="updates" title="iOS/iPadOS intelligence" subtitle="Apple Mobile details that are specific to managed iPhone and iPad devices.">
    <div className="extendedInsightGrid hardwareInsightGrid">
      <InsightCard title="Supervision status" subtitle="Supervised state reported by Intune"><Distribution rows={supervised} total={devices.length}/></InsightCard>
      <InsightCard title="Device family" subtitle="iPhone and iPad distribution in the current scope"><Distribution rows={families} total={devices.length}/></InsightCard>
      <CertificateExpiryCard devices={devices}/>
    </div>
  </DashboardSection>
}

function MacInsights({devices}:{devices:Device[]}){
  const architectures=countValues(devices.map(architecture));
  const joins=countValues(devices.map(joinType));
  return <DashboardSection icon="updates" title="macOS intelligence" subtitle="macOS-specific processor, identity and management-certificate information.">
    <div className="extendedInsightGrid hardwareInsightGrid">
      <InsightCard title="Processor architecture" subtitle="Apple Silicon and Intel architecture reported by inventory"><Distribution rows={architectures} total={devices.length}/></InsightCard>
      <InsightCard title="Join type" subtitle="Microsoft Entra registration and join state"><Distribution rows={joins} total={devices.length}/></InsightCard>
      <CertificateExpiryCard devices={devices}/>
    </div>
  </DashboardSection>
}

function LinuxInsights({devices}:{devices:Device[]}){
  const architectures=countValues(devices.map(architecture));
  const joins=countValues(devices.map(joinType));
  return <DashboardSection icon="updates" title="Linux intelligence" subtitle="Linux-specific architecture and identity information when supplied by the Intune export.">
    <div className="extendedInsightGrid twoInsightGrid">
      <InsightCard title="Processor architecture" subtitle="Reported Linux processor architecture"><Distribution rows={architectures} total={devices.length}/></InsightCard>
      <InsightCard title="Join type" subtitle="Reported Microsoft Entra registration or join state"><Distribution rows={joins} total={devices.length}/></InsightCard>
    </div>
  </DashboardSection>
}

function CertificateExpiryCard({devices}:{devices:Device[]}){
  const now=Date.now();
  const buckets:[string,number][]=[['Expired',0],['< 30 days',0],['30–90 days',0],['> 90 days',0],['Unknown',0]];
  for(const device of devices){const value=certExpiry(device);const time=value?Date.parse(value):Number.NaN;if(!Number.isFinite(time)){buckets[4][1]++;continue}const days=(time-now)/86400000;if(days<0)buckets[0][1]++;else if(days<30)buckets[1][1]++;else if(days<=90)buckets[2][1]++;else buckets[3][1]++}
  return <InsightCard title="Management certificate" subtitle="Time remaining on the reported Intune management certificate"><Distribution rows={buckets} total={devices.length}/></InsightCard>
}

function androidMode(device:Device){
  const source=clean(device.sourceOS);
  const match=source.match(/\((.+)\)/);
  if(match)return match[1];
  if(/^aosp/i.test(source))return source.replace(/^AOSP\s*/i,'AOSP ');
  return source==='Android'?'Android':source;
}
function appleDeviceFamily(device:Device){const value=`${device.sourceOS||''} ${device.model||''}`.toLowerCase();if(value.includes('ipad'))return 'iPad';if(value.includes('iphone'))return 'iPhone';return 'Unknown'}
function humanBoolean(value:string){if(/^true$/i.test(value))return 'Supervised';if(/^false$/i.test(value))return 'Not supervised';return value||'Unknown'}
function InsightCard({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <article className="dashboardCard extendedInsightCard"><header className="dashboardCardHead insightCardHead"><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>}
function Distribution({rows,total}:{rows:[string,number][];total:number}){return <div className="distributionList">{rows.filter(([,n])=>n>0).slice(0,8).map(([label,n],i)=><div key={label}><span className={`distributionDot dot${i%6}`}/><span className="truncate" title={label}>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small><i><b style={{width:pct(n,total)}}/></i></div>)}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="metricTile"><span>{label}</span><strong>{value}</strong></div>}
