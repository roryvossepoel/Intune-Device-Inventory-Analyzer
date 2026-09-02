import fs from 'node:fs/promises';

const target = new URL('../src/generated/windows-builds.json', import.meta.url);
const token = process.env.DEVICE_INTELLIGENCE_TOKEN?.trim();

if (!token) {
  console.log('DEVICE_INTELLIGENCE_TOKEN is not configured; using bundled Device Intelligence snapshot.');
  process.exit(0);
}

const response = await fetch('https://api.github.com/repos/roryvossepoel/Device-Intelligence-Database/contents/data/windows/builds.json?ref=main', {
  headers: {
    Accept: 'application/vnd.github.raw+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Intune-Device-Inventory-Analyzer-build'
  }
});

if (!response.ok) {
  throw new Error(`Device Intelligence sync failed: GitHub returned ${response.status} ${response.statusText}`);
}

const text = await response.text();
const parsed = JSON.parse(text);
if (!Array.isArray(parsed.records)) throw new Error('Device Intelligence sync failed: records is not an array.');
await fs.writeFile(target, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
console.log(`Synced ${parsed.records.length} Windows release records from Device-Intelligence-Database.`);
