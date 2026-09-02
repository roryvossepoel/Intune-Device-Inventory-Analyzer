export type PlatformFamily = 'windows' | 'android' | 'ios' | 'ipados' | 'macos' | 'linux' | 'unknown';

export interface Device {
  id: string;
  deviceName: string | null;
  serialNumber: string | null;
  platform: PlatformFamily;
  sourceOS: string | null;
  osVersion: string | null;
  manufacturer: string | null;
  model: string | null;
  userDisplayName: string | null;
  userUpn: string | null;
  compliance: string | null;
  ownership: string | null;
  managedBy: string | null;
  lastCheckIn: string | null;
  raw: Record<string, string>;
}

export interface ImportResult {
  sourceFileName: string;
  csvFileName: string;
  devices: Device[];
  columns: string[];
}