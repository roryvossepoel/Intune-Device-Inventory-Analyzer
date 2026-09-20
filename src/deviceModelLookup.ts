import modelData from './data/device-models.json';
import type { PlatformFamily } from './types';

type DeviceModelRecord={
  manufacturer:string;
  models?:string[];
  productNames?:string[];
  displayModel:string;
  family?:string;
  deviceType?:string;
};

export type DeviceModelMatch={
  matched:boolean;
  manufacturer:string|null;
  sourceModel:string|null;
  productName:string|null;
  displayModel:string|null;
  family:string|null;
  deviceType:string|null;
};

const records=(modelData.devices??[]) as DeviceModelRecord[];

function key(value:string|null|undefined){
  return (value??'').trim().toLowerCase().replace(/\s+/g,' ');
}

function manufacturerMatches(record:DeviceModelRecord,manufacturer:string|null){
  return key(record.manufacturer)===key(manufacturer);
}

export function resolveDeviceModel({
  manufacturer,
  model,
  productName,
  platform
}:{
  manufacturer:string|null;
  model:string|null;
  productName:string|null;
  platform?:PlatformFamily;
}):DeviceModelMatch{
  const modelKey=key(model);
  const productKey=key(productName);

  const candidates=records.filter(record=>manufacturerMatches(record,manufacturer));

  // ProductName is the strongest signal for Apple mobile hardware identifiers
  // such as iPhone17,5 and iPad16,3.
  if(productKey){
    const record=candidates.find(item=>(item.productNames??[]).some(value=>key(value)===productKey));
    if(record)return {
      matched:true,
      manufacturer:record.manufacturer,
      sourceModel:model,
      productName,
      displayModel:record.displayModel,
      family:record.family??null,
      deviceType:record.deviceType??null
    };
  }

  if(modelKey){
    const record=candidates.find(item=>(item.models??[]).some(value=>key(value)===modelKey));
    if(record)return {
      matched:true,
      manufacturer:record.manufacturer,
      sourceModel:model,
      productName,
      displayModel:record.displayModel,
      family:record.family??null,
      deviceType:record.deviceType??null
    };
  }

  return {
    matched:false,
    manufacturer,
    sourceModel:model,
    productName,
    displayModel:model,
    family:null,
    deviceType:null
  };
}

export function getDeviceModelDataVersion(){
  return {
    schemaVersion:modelData.schemaVersion,
    updated:modelData.updated,
    recordCount:records.length
  };
}
