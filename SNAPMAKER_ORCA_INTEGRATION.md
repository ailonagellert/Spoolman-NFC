# Snapmaker & Orca Slicer Integration Guide

This document explains how SpoolMan's OpenSpool NFC tags work with Snapmaker firmware and Orca Slicer.

## The Problem (Now Solved!)

**Orca Slicer** requires filaments to be named in a specific format:
```
"<brand> <type> <subtype>"
```

Examples:
- ✅ `"Generic PLA Basic"`
- ✅ `"Elegoo PETG Rapid"`
- ✅ `"Polymaker PLA Matte Black"`
- ❌ `"PLA"` (missing brand and subtype)
- ❌ `"Generic PLA"` (missing subtype)

## The Solution

SpoolMan now writes NFC tags with **two additional fields** to make Orca Slicer integration seamless:

### 1. `subtype` Field
- Extracted from the filament's **Name** field in SpoolMan
- Examples: `"Basic"`, `"Rapid"`, `"Premium"`, `"Matte Black"`, `"Silk Gold"`
- Defaults to `"Basic"` if the filament name is empty

### 2. `name` Field  
- Pre-constructed combined name in the exact format Orca Slicer expects
- Format: `"{brand} {type} {subtype}"`
- Built automatically when writing the NFC tag

## Example OpenSpool Tag Data

```json
{
  "protocol": "openspool",
  "version": "1.0",
  "spool_id": 123,
  "brand": "Elegoo",
  "type": "PETG",
  "subtype": "Rapid",
  "name": "Elegoo PETG Rapid",
  "color_hex": "FF5733",
  "min_temp": "225",
  "max_temp": "255",
  "bed_min_temp": "70",
  "bed_max_temp": "85"
}
```

## For Firmware Developers

If you're developing firmware (ESP32 + PN532 reader) for Snapmaker or other OpenSpool-compatible printers:

### Option 1: Use the `name` Field Directly (Recommended)

```cpp
// Parse the OpenSpool JSON
JsonDocument doc;
deserializeJson(doc, nfcData);

// Extract the pre-built name
String filamentName = doc["name"]; // "Elegoo PETG Rapid"

// Send to Orca Slicer
sendToOrcaSlicer(filamentName, ...);
```

### Option 2: Construct the Name Manually

If you prefer to construct it yourself (for backward compatibility):

```cpp
String brand = doc["brand"];     // "Elegoo"
String type = doc["type"];       // "PETG"
String subtype = doc["subtype"]; // "Rapid"

// Construct the combined name
String name = brand + " " + type + " " + subtype; // "Elegoo PETG Rapid"

// Send to Orca Slicer
sendToOrcaSlicer(name, ...);
```

### Field Mapping for Orca Slicer

| OpenSpool Field | Orca Slicer Field | Example |
|----------------|-------------------|---------|
| `name` | Filament Name | `"Elegoo PETG Rapid"` |
| `type` | Material Type | `"PETG"` |
| `brand` | Vendor/Brand | `"Elegoo"` |
| `color_hex` | Color (RGB) | `"FF5733"` → RGB(255, 87, 51) |
| `min_temp` | Min Nozzle Temp | `"225"` |
| `max_temp` | Max Nozzle Temp | `"255"` |
| `bed_min_temp` | Min Bed Temp | `"70"` |
| `bed_max_temp` | Max Bed Temp | `"85"` |

### Example Firmware Implementation

Here's a basic example for ESP32 + PN532:

```cpp
#include <PN532.h>
#include <ArduinoJson.h>

void handleNFCTag() {
  // Read NFC tag data
  uint8_t data[256];
  int dataLength = nfc.readNdefMessage(data, sizeof(data));
  
  // Parse OpenSpool JSON
  JsonDocument doc;
  deserializeJson(doc, data);
  
  // Verify it's an OpenSpool tag
  if (doc["protocol"] != "openspool") {
    return; // Not an OpenSpool tag
  }
  
  // Extract fields
  String filamentName = doc["name"];        // "Elegoo PETG Rapid"
  String brand = doc["brand"];              // "Elegoo"
  String type = doc["type"];                // "PETG"
  String subtype = doc["subtype"];          // "Rapid"
  String colorHex = doc["color_hex"];       // "FF5733"
  int minTemp = doc["min_temp"].as<int>(); // 225
  int maxTemp = doc["max_temp"].as<int>(); // 255
  int spoolId = doc["spool_id"];           // 123
  
  // Send to printer/Orca Slicer
  updateMachineFilament(filamentName, type, colorHex, minTemp, maxTemp);
}
```

## Setting Up Filaments in SpoolMan

To ensure proper naming:

1. **Add/Edit a Filament** in SpoolMan
2. Set the **Vendor** (becomes `brand`): e.g., "Elegoo"
3. Set the **Material** (becomes `type`): e.g., "PETG"
4. Set the **Name** (becomes `subtype`): e.g., "Rapid"
5. Set the **Color** (becomes `color_hex`): e.g., "#FF5733"
6. Set **Extruder Temperature**: e.g., 240°C (becomes min_temp: 225, max_temp: 255)

Example filament configuration:
- Vendor: `Elegoo`
- Material: `PETG`
- Name: `Rapid`
- Color: `#FF5733`
- Extruder Temp: `240°C`

When you write this to an NFC tag, it will automatically include:
```json
{
  "brand": "Elegoo",
  "type": "PETG",
  "subtype": "Rapid",
  "name": "Elegoo PETG Rapid"
}
```

## Testing Your Implementation

1. **Create a test filament** in SpoolMan with Vendor="Test", Material="PLA", Name="Basic"
2. **Create a spool** with this filament
3. **Write to NFC tag** using the "Write to NFC Tag" button
4. **Scan with your reader** and verify it constructs: `"Test PLA Basic"`
5. **Check Orca Slicer** - the filament should appear correctly in machine filaments

## Troubleshooting

### Filament Name Not Appearing in Orca Slicer

**Problem**: The firmware reads the tag but Orca Slicer doesn't recognize it.

**Solutions**:
1. Verify your firmware is reading the `name` field or constructing it correctly
2. Check that the combined name matches the format: `"<brand> <type> <subtype>"`
3. Ensure there are no missing fields (all three components must be present)
4. Verify the firmware is sending the name to Orca Slicer through the correct API/interface

### Name Contains "Unknown" or "Basic"

**Problem**: The combined name shows as "Unknown PLA Basic"

**Solutions**:
1. In SpoolMan, edit the filament and set a proper **Vendor** name
2. Set a custom **Name** field (subtype) instead of leaving it empty
3. Re-write the NFC tag after updating the filament

### Legacy Tags Without `name` Field

**Problem**: Old NFC tags don't have the `name` or `subtype` fields.

**Solution**: Construct it manually in your firmware:
```cpp
if (!doc.containsKey("name")) {
  String subtype = doc.containsKey("subtype") ? doc["subtype"].as<String>() : "Basic";
  String name = String(doc["brand"]) + " " + String(doc["type"]) + " " + subtype;
  // Use this constructed name
}
```

## Reference Documentation

- **Full NFC Feature Documentation**: [NFC_FEATURE.md](NFC_FEATURE.md)
- **OpenSpool Format Details**: [OPENSPOOL_FORMAT.md](OPENSPOOL_FORMAT.md)
- **Klipper Integration Example**: [klipper/spoolman_nfc_integration.cfg](klipper/spoolman_nfc_integration.cfg)

## Firmware Repository

Snapmaker U1 Extended Firmware with OpenSpool support:
- **Location**: `D:\SnapmakerU1-Extended-Firmware`
- **Integration**: ESP32 + PN532 reader → Moonraker API → Orca Slicer

## Questions or Issues?

If you encounter any issues with the OpenSpool format or Orca Slicer integration:
1. Check this guide for common solutions
2. Verify your firmware is using the latest OpenSpool format (includes `name` and `subtype`)
3. Test with a freshly written NFC tag from SpoolMan
4. Check the firmware logs to see what data is being read from the tags

---

**Last Updated**: February 7, 2026  
**SpoolMan Version**: Latest (with Orca Slicer support)
