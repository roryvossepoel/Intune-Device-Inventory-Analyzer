import JSZip from 'jszip';
import Papa from 'papaparse';
import { describeOsVersion } from './deviceIntelligence';
import type { Device, ImportResult, PlatformFamily } from './types';

const value = (row: Record<string, string>, ...keys: string[]) => {
  for (const key of keys) {
    const match = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
    if (match && row[match]?.trim()) return row[match].trim();
  }
  return null;
};

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

function normalizePlatform(os: string | null, model: string | null): PlatformFamily {
  const source = (os ?? '').toLowerCase();
  const hardware = (model ?? '').toLowerCase();
  if (source.includes('windows')) return 'windows';
  if (source.includes('android') || source.includes('aosp')) return 'android';
  if (source.includes('mac')) return 'macos';
  if (source.includes('linux')) return 'linux';
  // Intune presents iPhone and iPad management as the Apple Mobile platform.
  // Keep the actual operating-system name in sourceOS, but use one platform key for UI filtering/reporting.
  if (source.includes('ipad') || hardware.includes('ipad')) return 'ios';
  if (source.includes('ios') || source.includes('iphone') || hardware.includes('iphone')) return 'ios';
  return 'unknown';
}

function normalizeRow(row: Record<string, string>, index: number, sourceFileName: string): Device {
  const sourceOS = value(row, 'OS', 'Operating system');
  const model = value(row, 'Model');
  const platform = normalizePlatform(sourceOS, model);
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
    ownership: value(row, 'Ownership'),
    managedBy: value(row, 'Managed by'),
    lastCheckIn: value(row, 'Last check-in'),
    raw: row,
  };
}

function parseCsv(csv: string, sourceFileName: string, csvFileName: string): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: header => header.replace(/^\uFEFF/, '').trim(),
      complete: result => {
        if (result.errors.length && result.data.length === 0) {
          reject(new Error(result.errors[0].message));
          return;
        }
        const columns = result.meta.fields ?? [];
        const devices = result.data.map((row, index) => normalizeRow(row, index, sourceFileName));
        resolve({ sourceFileName, sourceFileNames: [sourceFileName], csvFileName, csvFileNames: [csvFileName], devices, columns, duplicateCount: 0 });
      },
      error: (error: Error) => reject(error),
    });
  });
}

export async function importInventory(file: File): Promise<ImportResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv')) return parseCsv(await file.text(), file.name, file.name);
  if (!lower.endsWith('.zip')) throw new Error(`Unsupported file: ${file.name}. Select Intune inventory exports (.zip or .csv).`);

  const zip = await JSZip.loadAsync(file);
  const csvFiles = Object.values(zip.files).filter(entry => !entry.dir && entry.name.toLowerCase().endsWith('.csv'));
  if (!csvFiles.length) throw new Error(`No CSV file was found inside ${file.name}.`);
  if (csvFiles.length > 1) throw new Error(`${file.name} contains ${csvFiles.length} CSV files. A single inventory CSV per ZIP is expected.`);
  const csvFile = csvFiles[0];
  return parseCsv(await csvFile.async('text'), file.name, csvFile.name);
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
  return mergeImportResults(await Promise.all(files.map(importInventory)));
}
