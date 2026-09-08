import type { Device } from './types';

function rawValue(device:Device,patterns:RegExp[]){
  for(const [name,value] of Object.entries(device.raw||{})){
    if(patterns.some(pattern=>pattern.test(name))&&value?.trim())return value.trim();
  }
  return '';
}

function platformFamily(platform:string){return platform==='ios'||platform==='ipados'?'applemobile':platform}

export function appleDeviceFamily(device:Device){
  const signal=`${device.model||''} ${device.sourceOS||''} ${rawValue(device,[/^ProductName$/i,/^Product name$/i])}`.toLowerCase();
  if(device.platform==='ipados'||signal.includes('ipad'))return 'iPad';
  if(device.platform==='ios'||signal.includes('iphone'))return 'iPhone';
  return 'Unknown';
}

export function hardwareType(device:Device){
  const explicit=rawValue(device,[/chassis/i,/form.?factor/i,/device.?type/i,/hardware.?type/i,/device.?category/i]).toLowerCase();
  const model=(device.model||'').toLowerCase();
  const manufacturer=(device.manufacturer||'').toLowerCase();
  const signal=`${explicit} ${model} ${manufacturer}`;
  if(platformFamily(device.platform)==='applemobile'){
    const family=appleDeviceFamily(device);
    if(family==='iPad')return 'Tablet';
    if(family==='iPhone')return 'Smartphone';
  }
  if(/virtual|vmware|hyper-v|parallels|virtualbox|kvm|virtual machine|virtual desktop|horizon|avd/.test(signal))return 'Virtual';
  if(/server/.test(signal))return 'Server';
  if(device.platform==='android'){
    if(/tablet|slate|galaxy tab|tab active|pixel tablet|sm-[xtp]/.test(signal))return 'Tablet';
    return 'Smartphone';
  }
  if(device.platform==='macos'){
    if(/macbook/.test(signal))return 'Laptop';
    if(/imac|mac mini|mac studio|mac pro/.test(signal))return 'Desktop';
  }
  if(/tablet|slate|ipad|galaxy tab|surface pro|surface go/.test(signal))return 'Tablet';
  if(/smartphone|phone|handheld/.test(explicit))return 'Smartphone';
  if(/laptop|notebook|portable|mobile workstation|macbook|latitude|thinkpad|thinkbook|ideapad|elitebook|probook|zbook|surface laptop|galaxy book|travelmate|lifebook|dynabook/.test(signal))return 'Laptop';
  if(/desktop|tower|mini pc|micro pc|small form factor|sff|optiplex|thinkcentre|prodesk|elitedesk|imac|mac mini|mac studio|mac pro|surface studio|workstation/.test(signal))return 'Desktop';
  return 'Unknown';
}

export function cellularCapability(device:Device){
  const technology=rawValue(device,[/^CellularTechnology$/i,/^Cellular technology$/i]).trim().toLowerCase();
  const identifier=rawValue(device,[/^IMEI$/i,/^EID$/i,/^ICCID$/i,/^MEID$/i,/^Phone number$/i,/^PhoneNumber$/i]);
  if(identifier)return 'Cellular capable';
  if(technology){
    if(['none','no','false','wifi','wi-fi','wifi only','wi-fi only','not supported','not applicable','n/a'].includes(technology))return 'Wi-Fi only';
    if(technology==='unknown')return 'Unknown';
    return 'Cellular capable';
  }
  if(appleDeviceFamily(device)==='iPhone')return 'Cellular capable';
  return 'Unknown';
}
