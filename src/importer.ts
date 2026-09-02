import JSZip from 'jszip';
import Papa from 'papaparse';
import type { Device, ImportResult, PlatformFamily } from './types';

const value = (row: Record<string, string>, ...keys: string[]) => {
  for (const key of keys) {
    const match = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
    if (match && row[match]?.trim()) return row[match].trim();
  }
  return null;
};

function normalizePlatform(os: string | null, model: string | null): PlatformFamily {
  const source = (os ?? '').toLowerCase();
  const hardware = (model ?? '').toLowerCase();
  if (source.includes('windows')) return 'windows';
  if (source.includes('android') || source.includes('aosp')) return 'android';
  if (source.includes('mac')) return 'macos';
  if (source.includes('linux')) return 'linux';
  if (source.includes('ipad') || hardware.includes('ipad')) return 'ipados';
  if (source.includes('ios') || source.includes('iphone') || hardware.includes('iphone')) return 'ios';
  return 'unknown';
}

function normalizeRow(row: Record<string, string>, index: number): Device {
  const sourceOS = value(row, 'OS', 'Operating system');
  const model = value(row, 'Model');
  return {
    id: value(row, 'Device ID', 'DeviceId') ?? `row-${index}`,
    deviceName: value(row, 'Device name'),
    serialNumber: value(row, 'Serial number'),
    platform: normalizePlatform(sourceOS, model),
    sourceOS,
    osVersion: value(row, 'OS version'),
    manufacturer: value(row, 'Manufacturer'),
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
        const devices = result.data.map(normalizeRow);
        resolve({ sourceFileName, csvFileName, devices, columns });
      },
      error: error => reject(error),
    });
  });
}

export async function importInventory(file: File): Promise<ImportResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv')) {
    return parseCsv(await file.text(), file.name, file.name);
  }
  if (!lower.endsWith('.zip')) throw new Error('Select an Intune inventory export (.zip or .csv).');

  const zip = await JSZip.loadAsync(file);
  const csvFiles = Object.values(zip.files).filter(entry => !entry.dir && entry.name.toLowerCase().endsWith('.csv'));
  if (!csvFiles.length) throw new Error('No CSV file was found inside this ZIP export.');
  if (csvFiles.length > 1) throw new Error(`This ZIP contains ${csvFiles.length} CSV files. A single inventory CSV is expected.`);
  const csvFile = csvFiles[0];
  return parseCsv(await csvFile.async('text'), file.name, csvFile.name);
}