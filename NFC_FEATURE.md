# NFC/RFID Tag Support Implementation

This document describes the NFC/RFID tag support feature added to Spoolman, allowing users to write tag UIDs to spools and use NFC tags for physical spool identification.

## Features Implemented

### 1. **Predefined NFC ID Extra Field**
- Added a predefined `nfc_id` extra field for spools
- Type: Text field
- Optional and user-configurable
- Automatically appears in spool create/edit forms
- File: `spoolman/settings.py`

### 2. **Database Migration**
- Migration file: `migrations/versions/2026_01_03_1200-a1b2c3d4e5f6_add_nfc_id_extra_field.py`
- Automatically adds the `nfc_id` field definition to existing installations
- Backward compatible - won't overwrite if field already exists
- Safe to upgrade and downgrade

### 3. **Backend API Endpoint**
- New endpoint: `GET /api/v1/spool/find-by-nfc/{nfc_id}`
- Allows external NFC readers to look up spools by their NFC tag ID
- Returns full spool details with filament and vendor information
- Returns 404 if no matching spool found
- Files modified:
  - `spoolman/api/v1/spool.py` - Added endpoint
  - `spoolman/database/spool.py` - Added `get_by_extra_field()` function

### 4. **Frontend NFC Writing Feature**
- **"Write to NFC Tag" button** on spool detail page
- Uses Web NFC API (Chrome/Android compatible)
- **Automatic Tag UID Capture** - Reads and stores the tag's unique ID as `nfc_id` automatically
- **OpenSpool Format Compliant** - Writes tags in the official OpenSpool format (https://openspool.io)
- Writes NDEF message with multiple records:
  1. **OpenSpool JSON record** (primary): Standard OpenSpool format compatible with OpenSpool readers
     - Protocol: "openspool"
     - Version: "1.0"
     - Material type, subtype, combined name (for Orca Slicer), color (hex), brand, min/max temperatures
     - **New fields for Orca Slicer**: `subtype` and `name` (combined brand + type + subtype)
  2. **Text record**: Simple spool ID for basic readers
  3. **URL record**: Direct link to spool detail page
  4. **Legacy JSON record**: Complete spool data for backwards compatibility
  5. **NFC ID record**: Includes stored nfc_id if present

- **Temperature handling**: 
  - Uses configured extruder temperature ±15°C for range
  - Falls back to material-specific defaults (PLA: 190-220°C, PETG: 220-250°C, ABS: 230-260°C, etc.)
- **Fallback for unsupported browsers**: Shows modal with instructions for mobile apps
- Files added:
  - `client/src/components/nfcWriter.tsx` - NFC writing logic with OpenSpool format
- Files modified:
  - `client/src/pages/spools/show.tsx` - Added button and integration
  - `client/public/locales/en/common.json` - Added translations

### 5. **Label Printing Integration**
- Added `{extra.nfc_id}` template variable support
- Updated default label template to include NFC tag ID
- Template syntax: `{NFC: {extra.nfc_id}}` - only shows if nfc_id is set
- Works with existing extra fields system
- File modified: `client/src/pages/printing/spoolQrCodePrintingDialog.tsx`

## Usage Guide

### For End Users

#### Writing NFC Tags
1. Navigate to a spool's detail page
2. Click the **"Write to NFC Tag"** button
3. Hold your NFC tag near your device when prompted
4. The tag's unique ID (UID) is automatically read and saved to the spool's `nfc_id` field
5. The tag is written with OpenSpool-compliant data
5. Wait for the success message

#### Reading NFC Tags
- Use the API endpoint: `GET /api/v1/spool/find-by-nfc/{tag_id}`
- Or scan the URL record with any NFC reader app
- The URL will navigate directly to the spool detail page

#### Label Printing with NFC Info
1. Go to "Print Labels" for a spool
2. Edit the template to include `{extra.nfc_id}` or `{NFC: {extra.nfc_id}}`
3. The NFC tag ID will be printed on the label (if set)

### Orca Slicer / Snapmaker Integration

#### Overview
SpoolMan's NFC tags are fully compatible with Orca Slicer and Snapmaker firmware. The tags include special fields to ensure proper filament name recognition.

#### Filament Name Format
Orca Slicer expects filaments to be named as: **`"<brand> <type> <subtype>"`**

Examples:
- `"Generic PLA Basic"`
- `"Elegoo PETG Rapid"`
- `"Polymaker PLA Matte Black"`

#### How SpoolMan Handles This
When writing NFC tags, SpoolMan automatically includes:

1. **`subtype` field**: Extracted from the filament's name field
   - If filament name is "Matte Black", subtype = "Matte Black"
   - If filament name is empty, subtype = "Basic"
   
2. **`name` field**: Pre-constructed combined name in the correct format
   - Format: `"{brand} {type} {subtype}"`
   - Example: `"Elegoo PETG Rapid"`

#### Setting Up Your Filaments
To ensure proper naming in Orca Slicer:

1. **In SpoolMan**: When creating/editing a filament, set the **Name** field to your desired subtype:
   - Examples: `"Basic"`, `"Rapid"`, `"Premium"`, `"Matte Black"`, `"Silk Gold"`
   
2. **Write the NFC tag**: The combined name will be constructed automatically

3. **In your firmware**: Your OpenSpool reader can use the `name` field directly, or construct it from:
   ```
   NAME = brand + " " + type + " " + subtype
   ```

#### Example Tag Data
```json
{
  "protocol": "openspool",
  "version": "1.0",
  "brand": "Elegoo",
  "type": "PETG",
  "subtype": "Rapid",
  "name": "Elegoo PETG Rapid",
  "color_hex": "FF5733",
  "min_temp": "225",
  "max_temp": "255"
}
```

#### Firmware Implementation Note
If you're developing firmware to read these tags (e.g., for Snapmaker):
- **Recommended**: Use the `name` field directly
- **Alternative**: Construct it: `const name = ${brand} ${type} ${subtype}`
- Both approaches work with Orca Slicer's machine filaments

### For Developers

#### JSON Payload Format (MIME Record)
```json
{
  "version": "1.0",
  "source": "Spoolman",
  "spool": {
    "spoolId": 123,
    "material": "PLA",
    "color": "#FF5733",
    "vendor": "Example Brand",
    "initialWeight": 1000,
    "remainingWeight": 750,
    "initialLength": 330000,
    "remainingLength": 247500
  },
  "timestamp": "2026-01-03T12:00:00.000Z"
}
```

#### API Endpoint Example
```bash
# Look up spool by NFC ID
curl http://localhost:7912/api/v1/spool/find-by-nfc/04:AB:CD:EF:12:34:56

# Response: Full Spool object with filament and vendor
{
  "id": 123,
  "filament": { ... },
  "extra": {
    "nfc_id": "04:AB:CD:EF:12:34:56"
  },
  ...
}
```

#### Adding Custom NFC Logic
The `nfcWriter.tsx` component exposes:
- `isNFCSupported()` - Check browser support
- `writeNFCTag(spool: ISpool)` - Write tag programmatically
- `showNFCWriteModal(spool, t)` - Show the write modal

## Browser Compatibility

### Web NFC API Support
- ✅ **Chrome/Edge Android** (v89+)
- ✅ **Chrome Desktop** (with experimental flag enabled)
- ❌ **Safari/iOS** (not supported - shows fallback instructions)
- ❌ **Firefox** (not supported - shows fallback instructions)

### Fallback Behavior
When Web NFC is not supported, the modal provides instructions for:
- **Android**: Use NFC Tools or similar apps
- **iOS**: Use NFC Tools or Shortcuts app
- Manual entry of spool ID or URL

## Technical Details

### Extra Field Implementation
The `nfc_id` field is implemented as a predefined extra field, which means:
- It's stored in the `spool_field` table with key `nfc_id`
- Values are JSON-encoded strings: `"\"04:AB:CD:EF:12:34:56\""`
- Indexed for fast lookups
- Appears automatically in all spool forms
- No schema changes required to existing spool table

### NDEF Message Structure
```
Record 1: Text (UTF-8)
  - "Spoolman Spool ID: 123"

Record 2: URL
  - "https://your-instance.com/spool/show/123"

Record 3: MIME (application/json)
  - Full JSON payload with spool data

Record 4: Text (if nfc_id is set)
  - "NFC ID: 04:AB:CD:EF:12:34:56"
```

### Security Considerations
- No authentication on the lookup endpoint (by design for external readers)
- NFC tag data is read-only after writing
- Web NFC API requires user interaction (button click)
- HTTPS required for Web NFC API to work

## Migration Notes

### Upgrading
```bash
# Run migrations to add the nfc_id field definition
alembic upgrade head
```

The migration will:
1. Check if `extra_fields_spool` setting exists
2. Add `nfc_id` field definition if not present
3. Preserve any existing extra fields

### Rollback
```bash
# Revert the migration
alembic downgrade -1
```

This will remove the `nfc_id` field definition (data in spool_field table is preserved).

## Future Enhancements

Potential improvements:
1. **NFC Reading**: Add complementary "Scan NFC Tag" button to auto-navigate to spools
2. **Batch NFC Writing**: Write multiple tags in sequence
3. **NFC Standards**: Full OpenSpool/OpenTag3D specification compliance
4. **Custom NDEF Templates**: User-configurable NDEF message formats
5. **NFC History**: Track which tags have been written and when

## Troubleshooting

### "Web NFC is not supported"
- Ensure you're using Chrome/Edge on Android
- Check that the page is served over HTTPS
- Try enabling chrome://flags/#enable-experimental-web-platform-features

### "NFC permission was denied"
- Check browser permissions for the site
- Try reloading the page and clicking the button again

### "NFC tag is not writable"
- Ensure the tag is NDEF-compatible (ISO 14443 Type A/B or Type F)
- Check if the tag is locked or read-only
- Try a different NFC tag

### API Lookup Returns 404
- Verify the nfc_id is set in the spool's extra fields
- Check the exact format of the NFC ID string
- Ensure the value matches exactly (case-sensitive)

## References

- [Web NFC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API)
- [NDEF Message Format](https://learn.adafruit.com/adafruit-pn532-rfid-nfc/ndef)
- [OpenSpool Standard](https://github.com/OpenSpools) (conceptual reference)
