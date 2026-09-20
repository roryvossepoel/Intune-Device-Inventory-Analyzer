# Device model translation data

Intune Device Inventory Analyzer keeps device-model translations in a data file rather than hard-coding model names in the application.

## Files

- `src/data/device-models.json` — editable translation/classification table
- `src/deviceModelLookup.ts` — generic lookup engine

The importer keeps the original Intune row in `device.raw`. Only the normalized `device.model` value is replaced with a friendly display name when a match is found.

## Matching

Matching is case-insensitive and manufacturer-scoped.

The lookup order is:

1. `ProductName` — useful for Apple identifiers such as `iPhone17,5`
2. `Model` — useful for OEM identifiers such as `SM-A556B`
3. No match — the original model value is shown unchanged

This means a missing entry never hides or destroys source data.

## Schema

```json
{
  "manufacturer": "Samsung",
  "models": ["SM-A556B"],
  "displayModel": "Galaxy A55 5G",
  "family": "Galaxy A",
  "deviceType": "Smartphone"
}
```

An entry may contain multiple aliases:

```json
{
  "manufacturer": "Dell",
  "models": [
    "Latitude 3550",
    "Dell Latitude 3550"
  ],
  "displayModel": "Latitude 3550",
  "family": "Latitude",
  "deviceType": "Laptop"
}
```

Apple devices can additionally match on `productNames`:

```json
{
  "manufacturer": "Apple",
  "productNames": ["iPhone17,5"],
  "models": ["iPhone"],
  "displayModel": "iPhone 16e",
  "family": "iPhone",
  "deviceType": "Smartphone"
}
```

## Updating the table

For a new model, edit only `src/data/device-models.json`.

Guidelines:

- use the manufacturer name after Analyzer normalization, for example `Samsung`, `Dell`, `Lenovo`, `Apple`;
- add the exact Intune-reported value to `models` or `productNames`;
- put the human-friendly marketing name in `displayModel`;
- keep aliases in the same record instead of creating duplicate records;
- use `Laptop`, `Desktop`, `Tablet`, `Smartphone`, `Virtual`, or `Server` for `deviceType` where known;
- if a mapping is uncertain, leave it out. The Analyzer will safely fall back to the original Intune value.

The JSON file is bundled with the static site, so no external API, service, or separate repository is required.
