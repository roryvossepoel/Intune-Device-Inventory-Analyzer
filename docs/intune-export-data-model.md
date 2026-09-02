# Intune Device Inventory export data model

This document defines how the Analyzer interprets the native **Devices with inventory** export from Microsoft Intune.

## Input contract

The primary input is the ZIP file downloaded from Intune. The Analyzer must decompress and parse it **entirely in the browser**. Device inventory data must never be transmitted to a server.

The reference export used during initial development contains 53 columns. No production data or example rows from that export are stored in this repository.

## Design principles

1. Preserve the original row so technical detail is never lost.
2. Normalize values into a stable internal model before dashboards consume them.
3. Keep source data separate from derived/device-intelligence values.
4. Treat Windows, Android, iOS, iPadOS, macOS and Linux as first-class platforms.
5. Missing values are `null`; they must not silently become false, zero or `Unknown`.
6. UI labels may be friendly, but raw source values remain available on device detail pages.
7. Device Intelligence enrichments must record whether a value was mapped or inferred.

## Internal Device model

```ts
interface Device {
  identity: {
    intuneDeviceId: string | null;
    entraDeviceId: string | null;
    deviceName: string | null;
    serialNumber: string | null;
    managementName: string | null;
  };

  platform: {
    sourceOS: string | null;
    family: 'windows' | 'android' | 'ios' | 'ipados' | 'macos' | 'linux' | 'unknown';
    versionRaw: string | null;
    versionDisplay: string | null;
    build: string | null;
    securityPatchLevel: string | null;
    skuFamily: string | null;
  };

  hardware: {
    manufacturerRaw: string | null;
    manufacturerDisplay: string | null;
    modelRaw: string | null;
    modelDisplay: string | null;
    productName: string | null;
    processorArchitecture: string | null;
    biosVersion: string | null;
    tpmManufacturerId: string | null;
    tpmManufacturerVersion: string | null;
    totalStorageBytes: number | null;
    freeStorageBytes: number | null;
  };

  user: {
    userId: string | null;
    upn: string | null;
    email: string | null;
    displayName: string | null;
  };

  management: {
    managedBy: string | null;
    ownership: string | null;
    joinType: string | null;
    deviceState: string | null;
    category: string | null;
    intuneRegistered: boolean | null;
    entraRegistered: boolean | null;
    supervised: boolean | null;
    enrollmentDate: string | null;
    lastCheckIn: string | null;
    managementCertificateExpiration: string | null;
  };

  security: {
    compliance: string | null;
    complianceGracePeriodExpiration: string | null;
    encrypted: boolean | null;
    jailbroken: boolean | null;
  };

  network: {
    wifiMac: string | null;
    ethernetMac: string | null;
    wifiIPv4Address: string | null;
    wifiSubnetId: string | null;
  };

  cellular: {
    imei: string | null;
    meid: string | null;
    iccid: string | null;
    eid: string | null;
    phoneNumber: string | null;
    carrier: string | null;
    technology: string | null;
  };

  eas: {
    activated: boolean | null;
    activationId: string | null;
    lastSyncTime: string | null;
    reason: string | null;
    status: string | null;
  };

  intelligence: {
    osMatch: 'exact' | 'family' | 'unmapped' | null;
    hardwareMatch: 'exact' | 'alias' | 'unmapped' | null;
    updateStatus: 'current' | 'behind' | 'unsupported' | 'unknown' | null;
  };

  raw: Record<string, string>;
}
```

## Source column classification

### Identity
- Device ID
- Device name
- Azure AD Device ID
- Serial number
- Management name

### Dates and activity
- Enrollment date
- Last check-in
- Management certificate expiration date

### Platform / OS
- OS
- OS version
- Security patch level
- SkuFamily

### Hardware
- Manufacturer
- Model
- ProductName
- ProcessorArchitecture
- SystemManagementBIOSVersion
- TPMManufacturerId
- TPMManufacturerVersion
- Total storage
- Free storage

### User
- UserId
- Primary user UPN
- Primary user email address
- Primary user display name

### Management
- Managed by
- Ownership
- Device state
- Intune registered
- Azure AD registered
- Supervised
- JoinType
- Category

### Security / compliance
- Compliance
- Compliance grace period expiration
- Encrypted
- Jailbroken

### Network
- Wi-Fi MAC
- EthernetMAC
- WiFiIPv4Address
- WiFiSubnetID

### Cellular
- IMEI
- MEID
- ICCID
- EID
- Phone number
- Subscriber carrier
- CellularTechnology

### Exchange ActiveSync
- EAS activated
- EAS activation ID
- Last EAS sync time
- EAS reason
- EAS status

## Normalization rules

### Platform
Do not build dashboard logic directly against the raw `OS` value. Normalize it first. iPhone and iPad must remain distinguishable even if Intune supplies overlapping Apple OS values. Hardware/model intelligence can be used as a secondary discriminator where required.

### Boolean values
Intune exports may represent booleans as localized/display strings. Parsing must explicitly support known source representations. Empty means `null`, not `false`.

### Storage
Convert storage values to bytes in the internal model when the source format can be parsed reliably. Preserve the original source string in `raw`.

### Dates
Parse dates into a consistent internal ISO representation. Never discard the original value.

### Device Intelligence
`versionDisplay`, `manufacturerDisplay`, `modelDisplay`, lifecycle and update status are enrichment fields. They must never overwrite the raw Intune values.

## Privacy

The reference export contains device identifiers, serial numbers, user identities, network identifiers and potentially telephone/cellular identifiers. Therefore:

- reference exports must never be committed;
- ZIP/CSV parsing happens client-side;
- reports are generated client-side;
- the application may retrieve public Device Intelligence data, but it must not send device records with those requests;
- telemetry, if ever introduced, must not contain imported inventory values.
