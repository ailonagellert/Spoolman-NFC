# OpenSpool NFC Format Implementation

This document describes the OpenSpool NFC format implementation in Spoolman, ensuring compatibility with the OpenSpool standard (https://openspool.io).

## Overview

Spoolman now writes NFC tags in the official **OpenSpool format**, an open-source NFC standard for 3D printing filament tracking. OpenSpool tags are compatible with OpenSpool readers (DIY ESP32 + PN532 hardware) that can automatically update printer settings when you load a new spool.

## OpenSpool Format Specification

According to the official specification, OpenSpool tags contain a JSON record with the following fields:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `protocol` | string | Always "openspool" | `"openspool"` |
| `version` | string | Protocol version | `"1.0"` |
| `type` | string | Material type | `"PLA"`, `"PETG"`, `"ABS"` |
| `subtype` | string | Filament variant/subtype | `"Basic"`, `"Rapid"`, `"Matte Black"` |
| `name` | string | Combined filament name | `"Generic PLA Basic"`, `"Elegoo PETG Rapid"` |
| `color_hex` | string | Color as hex code (no #) | `"FFAABB"` |
| `brand` | string | Manufacturer/vendor name | `"Polymaker"` |
| `min_temp` | number | Minimum print temperature (°C) | `190` |
| `max_temp` | number | Maximum print temperature (°C) | `220` |
| `spool_id` | number | Spoolman spool ID | `123` |

## Spoolman Implementation

### Data Mapping

Spoolman maps its internal data to the OpenSpool format as follows:

#### Material Type (`type`)
- Source: `spool.filament.material`
- Transformation: Converted to uppercase
- Default: `"PLA"` if not specified

#### Filament Subtype (`subtype`)
- Source: `spool.filament.name`
- Transformation: Trimmed whitespace
- Default: `"Basic"` if filament name not specified
- Examples: `"Matte Black"`, `"Rapid"`, `"Premium"`, `"Silk"`

#### Combined Name (`name`)
- Constructed from: `<brand> <type> <subtype>`
- Format: `"{brand} {type} {subtype}"`
- Examples: 
  - `"Generic PLA Basic"`
  - `"Elegoo PETG Rapid"`
  - `"Polymaker PLA Matte Black"`
- **Purpose**: Used by Orca Slicer and other slicers to display filament name
- **Firmware Note**: If your firmware needs to construct this field manually, use this exact format

#### Color (`color_hex`)
- Source: `spool.filament.color_hex`
- Transformation: Removes `#` prefix and converts to uppercase
- Default: `"FFFFFF"` (white) if not specified

#### Brand (`brand`)
- Source: `spool.filament.vendor.name`
- Default: `"Unknown"` if vendor not specified

#### Temperature Range (`min_temp` and `max_temp`)

Since Spoolman only stores a single extruder temperature, we use intelligent logic to determine the temperature range:

**If extruder temperature is configured:**
- `min_temp` = configured temp - 15°C
- `max_temp` = configured temp + 15°C

**If extruder temperature is NOT configured, use material-specific defaults:**

| Material | min_temp | max_temp |
|----------|----------|----------|
| PLA | 190°C | 220°C |
| PETG | 220°C | 250°C |
| ABS | 230°C | 260°C |
| TPU | 210°C | 240°C |
| NYLON | 240°C | 270°C |
| Other | 190°C | 230°C |

### NDEF Message Structure

When writing an NFC tag, Spoolman creates an NDEF message with multiple records for maximum compatibility:

1. **OpenSpool JSON Record** (PRIMARY)
   - Record Type: MIME type `application/json`
   - Contains: OpenSpool-compliant JSON data
   - Purpose: Compatibility with OpenSpool readers

2. **Text Record**
   - Record Type: Text
   - Contains: `"Spoolman Spool ID: {id}"`
   - Purpose: Simple identification with basic NFC readers

3. **URL Record**
   - Record Type: URL
   - Contains: Direct link to spool detail page
   - Purpose: Quick access from mobile devices

4. **Legacy Spoolman JSON Record**
   - Record Type: MIME type `application/json`
   - Contains: Extended spool data including weights, lengths, etc.
   - Purpose: Backwards compatibility with existing Spoolman integrations

5. **NFC ID Text Record** (optional)
   - Record Type: Text
   - Contains: `"NFC ID: {nfc_id}"`
   - Purpose: Included only if `nfc_id` extra field is set

### Example OpenSpool JSON Output

```json
{
  "protocol": "openspool",
  "version": "1.0",
  "spool_id": 123,
  "type": "PETG",
  "subtype": "Rapid",
  "name": "Elegoo PETG Rapid",
  "color_hex": "FF5733",
  "brand": "Elegoo",
  "min_temp": "225",
  "max_temp": "255",
  "bed_min_temp": "70",
  "bed_max_temp": "85"
}
```

### Orca Slicer Integration

**Orca Slicer Filament Name Format**: Orca Slicer expects filaments to be named in the format `"<brand> <type> <subtype>"`. 

**Example**: `"Generic PLA Basic"` or `"Elegoo PETG Rapid"`

**How SpoolMan Helps**:
- SpoolMan now includes both `subtype` and `name` fields in the OpenSpool JSON
- The `name` field is pre-constructed in the correct format for Orca Slicer
- The `subtype` field can be customized by editing the filament's name in SpoolMan

**For Firmware Developers**:
If your firmware (e.g., Snapmaker) reads OpenSpool tags, you can:
1. **Option 1**: Use the `name` field directly (recommended)
2. **Option 2**: Construct it manually: `name = brand + " " + type + " " + subtype`

Both approaches will give you the correct format for Orca Slicer's machine filaments.

## Compatible Hardware

### NFC Tags
- **NTAG215** or **NTAG216** (ISO 14443A)
- Widely available and inexpensive
- 504 bytes (NTAG215) or 888 bytes (NTAG216) storage
- OpenSpool data is small (~150 bytes), so either works

### Writing Devices
- **Android devices** with NFC (Chrome browser with Web NFC API)
- **Desktop USB readers** (ACR122U, ACR1252U, etc. with appropriate software)
- **iOS devices** with NFC (via native NFC writing in supported browsers)

### Reading Devices (OpenSpool Ecosystem)
- **OpenSpool Reader** (DIY ESP32 + PN532 NFC module)
  - Connects to Wi-Fi
  - Communicates with printer via MQTT
  - Currently supports: Bambu Lab X1C, X1E, P1S, P1P
  - Future support planned: OctoPrint, Prusa Connect, Klipper, Spoolman

Hardware kits and pre-assembled readers available at: https://www.tindie.com/products/spuder/openspool-mini/

## Benefits of OpenSpool Format

1. **Open Source** - No proprietary lock-in
2. **DIY-Friendly** - Build your own reader hardware
3. **Cross-Platform** - Works with iOS, Android, and desktop readers
4. **Printer Agnostic** - Add NFC detection to printers that don't officially support it
5. **Local Operation** - No cloud dependencies
6. **Simple Format** - Easy to implement and extend
7. **Community Driven** - Active development and support

## Usage in Spoolman

### Writing Tags
1. Navigate to any spool detail page
2. Click the **"Write to NFC Tag"** button
3. Hold an NFC tag near your device when prompted
4. The system automatically:
   - Reads the tag's unique ID (UID)
   - Writes OpenSpool format data to the tag
   - Saves the tag UID to the spool's `nfc_id` extra field
5. The tag UID is displayed in the success message

### Reading Tags
- Use the SimplyPrint mobile app or any NFC reader app
- OpenSpool readers will automatically send data to your printer
- Spoolman can look up spools by NFC ID via: `GET /api/v1/spool/find-by-nfc/{nfc_id}`

## Future Enhancements

Potential improvements for OpenSpool integration:

1. **Separate min/max temp fields** - Allow users to specify temperature ranges directly
2. **Reader integration** - Direct API for OpenSpool readers to update spool usage
3. **Weight tracking** - Explore extensions to the OpenSpool format for remaining weight
4. **Material profiles** - Expanded material database with optimized temperature ranges

## References

- **OpenSpool Official Website**: https://openspool.io
- **OpenSpool GitHub**: https://github.com/spuder/OpenSpool
- **SimplyPrint Documentation**: https://help.simplyprint.io/en/article/openspool-nfc-standard-in-simplyprint-14b7ljb/
- **OpenSpool Hardware**: https://www.tindie.com/products/spuder/openspool-mini/

## Implementation Files

- **Frontend**: `client/src/components/nfcWriter.tsx`
- **Documentation**: `NFC_FEATURE.md`
- **Type Definitions**: `client/src/pages/filaments/model.tsx`, `client/src/pages/spools/model.tsx`
