import JSZip from 'jszip';
import Papa from 'papaparse';
import { describeOsVersion } from './deviceIntelligence';
import type { Device, ImportResult, PlatformFamily } from './types';

export type ImportProgressStage='read'|'extract'|'parse'|'process'|'build'|'error';
export type ImportProgress={stage:ImportProgressStage;label:string;detail:string;progress:number;fileName:string;isZip:boolean;deviceCount?:number};
export type ImportProgressHandler=(progress:ImportProgress)=>void;

export const INVENTORY_IMPORT_PROGRESS_EVENT='intune-inventory-import-progress';

const value = (row: Record<string, string>, ...keys: string[]) => {
  for (const key of keys) {
    const match = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
    if (match && row[match]?.trim()) return row[match].trim();
  }
  return null;
};

const report=(handler:ImportProgressHandler|undefined,progress:ImportProgress)=>{
  handler?.(progress);
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent<ImportProgress>(INVENTORY_IMPORT_PROGRESS_EVENT,{detail:progress}));
};
const allowUiPaint=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
const fileSize=(bytes:number)=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;

function normalizeManufacturer(input:string|null){
  if(!input) return null;
  const value=input.trim();
  const key=value.toLowerCase().replace(/\s+/g,' ');
  const aliases:Record<string,string>={
    'dell inc.':'Dell',
    'dell inc':'Dell',
    'dell':'Dell',
    'lenovo':'Lenovo',
    'samsung':'Samsung',
    'samsung electronics':'Samsung',
    'samsung electronics co., ltd.':'Samsung',
    'microsoft corporation':'Microsoft',
    'microsoft':'Microsoft',
    'apple inc.':'Apple',
    'apple inc':'Apple',
    'apple':'Apple',
    'hp':'HP',
    'hp inc.':'HP',
    'hp inc':'HP',
    'hewlett-packard':'HP',
    'hewlett packard':'HP',
    'logitech':'Logitech',
    'logitech inc.':'Logitech'
  };
  if(aliases[key]) return aliases[key];
  if(value===value.toUpperCase() || value===value.toLowerCase()) return value.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  return value;
}

function normalizeOwnership(input:string|null){
  if(!input)return null;
  const value=input.trim();
  if(/^company$|^corporate$/i.test(value))return 'Corporate';
  if(/^personal$/i.test(value))return 'Personal';
  return value;
}

function normalizePlatform(os: string | null, model: string | null, productName: string | null): PlatformFamily {
  const source = (os ?? '').toLowerCase();
  const hardware = `${model ?? ''} ${productName ?? ''}`.toLowerCase();
  if (source.includes('windows')) return 'windows';
  if (source.includes('android') || source.includes('aosp')) return 'android';
  if (source.includes('mac')) return 'macos';
  if (source.includes('linux')) return 'linux';
  if (hardware.includes('ipad')) return 'ipados';
  if (hardware.includes('iphone')) return 'ios';
  if (source.includes('ipad') && !source.includes('ios')) return 'ipados';
  if (source.includes('ios') || source.includes('iphone') || source.includes('ipad')) return 'ios';
  return 'unknown';
}

function normalizeRow(row: Record<string, string>, index: number, sourceFileName: string): Device {
  const sourceOS = value(row, 'OS', 'Operating system');
  const model = value(row, 'Model');
  const productName = value(row, 'ProductName', 'Product name');
  const platform = normalizePlatform(sourceOS, model, productName);
  const rawOsVersion = value(row, 'OS version');
  return {
    id: value(row, 'Device ID', 'DeviceId') ?? `${sourceFileName}:row-${index}`,
    sourceFileName,
    deviceName: value(row, 'Device name'),
    serialNumber: value(row, 'Serial number'),
    platform,
    sourceOS,
    osVersion: describeOsVersion(platform, rawOsVersion),
    manufacturer: normalizeManufacturer(value(row, 'Manufacturer')),
    model,
    userDisplayName: value(row, 'Primary user display name'),
    userUpn: value(row, 'Primary user UPN'),
    compliance: value(row, 'Compliance'),
    ownership: normalizeOwnership(value(row, 'Ownership')),
    managedBy: value(row, 'Managed by'),
    lastCheckIn: value(row, 'Last check-in'),
    raw: row,
  };
}

async function parseCsv(csv: string, sourceFileName: string, csvFileName: string, isZip:boolean, onProgress?:ImportProgressHandler): Promise<ImportResult> {
  report(onProgress,{stage:'parse',label:'Parsing inventory CSV',detail:`Reading columns and rows from ${csvFileName}`,progress:56,fileName:sourceFileName,isZip});
  await allowUiPaint();
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: header => header.replace(/^\uFEFF/, '').trim(),
      complete: async result => {
        if (result.errors.length && result.data.length === 0) {
          reject(new Error(result.errors[0].message));
          return;
        }
        const columns = result.meta.fields ?? [];
        report(onProgress,{stage:'process',label:'Processing device inventory',detail:`Normalizing ${result.data.length.toLocaleString()} inventory rows and ${columns.length.toLocaleString()} columns`,progress:75,fileName:sourceFileName,isZip,deviceCount:result.data.length});
        await allowUiPaint();
        const devices = result.data.map((row, index) => normalizeRow(row, index, sourceFileName));
        report(onProgress,{stage:'process',label:'Processing device inventory',detail:`Processed ${devices.length.toLocaleString()} devices`,progress:88,fileName:sourceFileName,isZip,deviceCount:devices.length});
        resolve({ sourceFileName, sourceFileNames: [sourceFileName], csvFileName, csvFileNames: [csvFileName], devices, columns, duplicateCount: 0 });
      },
      error: (error: Error) => reject(error),
    });
  });
}

async function finishImport(result:ImportResult,file:File,isZip:boolean,onProgress?:ImportProgressHandler){
  report(onProgress,{stage:'build',label:'Building dashboard',detail:`Preparing insights, filters and reports for ${result.devices.length.toLocaleString()} devices`,progress:94,fileName:file.name,isZip,deviceCount:result.devices.length});
  await allowUiPaint();
  return result;
}

async function importInventoryCore(file: File,onProgress?:ImportProgressHandler): Promise<ImportResult> {
  const lower = file.name.toLowerCase();
  const isZip=lower.endsWith('.zip');
  report(onProgress,{stage:'read',label:'Reading export',detail:`${file.name} · ${fileSize(file.size)}`,progress:10,fileName:file.name,isZip});
  await allowUiPaint();

  if (lower.endsWith('.csv')) {
    const csv=await file.text();
    report(onProgress,{stage:'read',label:'Reading export',detail:`Loaded ${file.name} into local memory`,progress:32,fileName:file.name,isZip:false});
    await allowUiPaint();
    return finishImport(await parseCsv(csv,file.name,file.name,false,onProgress),file,false,onProgress);
  }
  if (!isZip) throw new Error(`Unsupported file: ${file.name}. Select Intune inventory exports (.zip or .csv).`);

  report(onProgress,{stage:'extract',label:'Opening ZIP archive',detail:'Inspecting the archive for an inventory CSV',progress:28,fileName:file.name,isZip:true});
  await allowUiPaint();
  const zip = await JSZip.loadAsync(file);
  const csvFiles = Object.values(zip.files).filter(entry => !entry.dir && entry.name.toLowerCase().endsWith('.csv'));
  if (!csvFiles.length) throw new Error(`No CSV file was found inside ${file.name}.`);
  if (csvFiles.length > 1) throw new Error(`${file.name} contains ${csvFiles.length} CSV files. A single inventory CSV per ZIP is expected.`);
  const csvFile = csvFiles[0];
  report(onProgress,{stage:'extract',label:'Extracting inventory CSV',detail:`Found ${csvFile.name}`,progress:42,fileName:file.name,isZip:true});
  await allowUiPaint();
  const csv=await csvFile.async('text');
  report(onProgress,{stage:'extract',label:'Extracting inventory CSV',detail:`Loaded ${csvFile.name} from the archive`,progress:50,fileName:file.name,isZip:true});
  await allowUiPaint();
  return finishImport(await parseCsv(csv,file.name,csvFile.name,true,onProgress),file,true,onProgress);
}

export async function importInventory(file: File,onProgress?:ImportProgressHandler): Promise<ImportResult> {
  try{return await importInventoryCore(file,onProgress)}
  catch(error){
    const message=error instanceof Error?error.message:'The export could not be read.';
    report(onProgress,{stage:'error',label:'Import failed',detail:message,progress:100,fileName:file.name,isZip:file.name.toLowerCase().endsWith('.zip')});
    throw error;
  }
}

function newerDevice(a: Device, b: Device): Device {
  const aTime = a.lastCheckIn ? Date.parse(a.lastCheckIn) : Number.NaN;
  const bTime = b.lastCheckIn ? Date.parse(b.lastCheckIn) : Number.NaN;
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return bTime >= aTime ? b : a;
  return b;
}

export function mergeImportResults(results: ImportResult[]): ImportResult {
  const devices = new Map<string, Device>();
  let duplicateCount = results.reduce((sum, result) => sum + result.duplicateCount, 0);
  for (const result of results) {
    for (const device of result.devices) {
      const existing = devices.get(device.id);
      if (existing) {
        duplicateCount += 1;
        devices.set(device.id, newerDevice(existing, device));
      } else devices.set(device.id, device);
    }
  }
  const sourceFileNames = [...new Set(results.flatMap(result => result.sourceFileNames))];
  const csvFileNames = [...new Set(results.flatMap(result => result.csvFileNames))];
  const columns = [...new Set(results.flatMap(result => result.columns))];
  return {
    sourceFileName: sourceFileNames.length === 1 ? sourceFileNames[0] : `${sourceFileNames.length} inventory exports`,
    sourceFileNames,
    csvFileName: csvFileNames.length === 1 ? csvFileNames[0] : `${csvFileNames.length} CSV files`,
    csvFileNames,
    devices: [...devices.values()],
    columns,
    duplicateCount,
  };
}

export async function importInventories(files: File[]): Promise<ImportResult> {
  if (!files.length) throw new Error('Select one or more Intune inventory exports.');
  return mergeImportResults(await Promise.all(files.map(file=>importInventory(file))));
}