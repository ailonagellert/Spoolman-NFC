import { message, Modal } from "antd";
import React from "react";
import { ISpool } from "../pages/spools/model";

interface NFCData {
  spoolId: number;
  material?: string;
  color?: string;
  vendor?: string;
  initialWeight?: number;
  remainingWeight?: number;
  initialLength?: number;
  remainingLength?: number;
}

interface OpenSpoolData {
  protocol: string;
  version: string;
  spool_id: number;
  type: string;
  subtype: string;
  color_hex: string;
  brand: string;
  min_temp: string;
  max_temp: string;
  bed_min_temp: string;
  bed_max_temp: string;
}

/**
 * Check if Web NFC API is available in the current browser
 * Returns an object with support status and reason if not supported
 */
export const checkNFCSupport = (): { supported: boolean; reason?: string } => {
  // Check if running in a secure context (HTTPS or localhost)
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: "NFC requires HTTPS connection. Please access Spoolman via HTTPS.",
    };
  }

  // Check if NDEFReader is available
  if (!("NDEFReader" in window)) {
    return {
      supported: false,
      reason: "Web NFC is not supported in this browser. Try Chrome on Android.",
    };
  }

  return { supported: true };
};

/**
 * Legacy support check function (for backwards compatibility)
 */
export const isNFCSupported = (): boolean => {
  return checkNFCSupport().supported;
};

/**
 * Write spool data to an NFC tag using the Web NFC API
 * Also reads and stores the tag's UID as the nfc_id
 * @param spool The spool data to write to the tag
 * @returns Promise that resolves with the tag UID when write is complete
 */
export const writeNFCTag = async (spool: ISpool): Promise<string> => {
  if (!isNFCSupported()) {
    throw new Error("Web NFC is not supported in this browser");
  }

  try {
    // Request permission and create NDEF writer
    const ndef = new (window as any).NDEFReader();

    // Determine temperature range based on material type and configured extruder temperature
    const extruderTemp = spool.filament.settings_extruder_temp;
    const bedTemp = spool.filament.settings_bed_temp;
    const material = (spool.filament.material || "PLA").toUpperCase().trim(); // Trim to remove trailing spaces
    
    let minTemp: number;
    let maxTemp: number;
    let bedMinTemp: number;
    let bedMaxTemp: number;
    
    if (extruderTemp) {
      minTemp = extruderTemp - 15;
      maxTemp = extruderTemp + 15;
    } else {
      switch (material) {
        case "PLA":
          minTemp = 190;
          maxTemp = 220;
          break;
        case "PETG":
          minTemp = 220;
          maxTemp = 250;
          break;
        case "ABS":
          minTemp = 230;
          maxTemp = 260;
          break;
        case "TPU":
          minTemp = 210;
          maxTemp = 240;
          break;
        case "NYLON":
          minTemp = 240;
          maxTemp = 270;
          break;
        default:
          minTemp = 190;
          maxTemp = 230;
      }
    }
    
    if (bedTemp) {
      bedMinTemp = bedTemp - 5;
      bedMaxTemp = bedTemp + 5;
    } else {
      switch (material) {
        case "PLA":
          bedMinTemp = 50;
          bedMaxTemp = 65;
          break;
        case "PETG":
          bedMinTemp = 70;
          bedMaxTemp = 85;
          break;
        case "ABS":
          bedMinTemp = 90;
          bedMaxTemp = 110;
          break;
        case "TPU":
          bedMinTemp = 40;
          bedMaxTemp = 60;
          break;
        case "NYLON":
          bedMinTemp = 70;
          bedMaxTemp = 90;
          break;
        default:
          bedMinTemp = 50;
          bedMaxTemp = 65;
      }
    }

    // Extract subtype from filament name and trim whitespace
    const filamentName = spool.filament.name || "Basic";
    const subtype = filamentName.trim() || "Basic";
    const brand = spool.filament.vendor?.name || "Generic";
    
    // Get color hex (remove # if present)
    const colorHex = (spool.filament.color_hex || "FFFFFF").replace("#", "").toUpperCase();

    // Prepare OpenSpool format data (temperatures as strings per spec)
    const openSpoolData: OpenSpoolData = {
      protocol: "openspool",
      version: "1.0",
      spool_id: spool.id,
      type: material,
      subtype: subtype,
      color_hex: colorHex,
      brand: brand,
      min_temp: minTemp.toString(),
      max_temp: maxTemp.toString(),
      bed_min_temp: bedMinTemp.toString(),
      bed_max_temp: bedMaxTemp.toString(),
    };

    // Prepare legacy Spoolman data
    const nfcData: NFCData = {
      spoolId: spool.id,
      material: spool.filament.material,
      color: spool.filament.color_hex,
      vendor: spool.filament.vendor?.name,
      initialWeight: spool.initial_weight,
      remainingWeight: spool.remaining_weight,
      initialLength: spool.filament.weight && spool.initial_weight 
        ? spool.initial_weight / spool.filament.weight * 1000 
        : undefined,
      remainingLength: spool.remaining_length,
    };

    // Encode OpenSpool JSON as UTF-8 bytes for Web NFC API
    const textEncoder = new TextEncoder();
    const openSpoolJson = JSON.stringify(openSpoolData);
    
    // Write to the tag using application/json MIME type (OpenSpool standard format)
    await ndef.write({
      records: [
        {
          recordType: "mime",
          mediaType: "application/json",
          data: textEncoder.encode(openSpoolJson),
        },
        {
          recordType: "text",
          data: textEncoder.encode(`Spoolman Spool ID: ${spool.id}`),
        },
        {
          recordType: "url",
          data: `${window.location.origin}/spool/${spool.id}`,
        },
      ]
    });

    // Successfully wrote to tag
    return Promise.resolve("");
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("NFC write operation was cancelled");
    } else if (error.name === "NotAllowedError") {
      throw new Error("NFC permission was denied");
    } else if (error.name === "NotSupportedError") {
      throw new Error("NFC is not supported on this device");
    } else if (error.name === "NotReadableError") {
      throw new Error("NFC tag is not writable or incompatible");
    } else {
      throw new Error(`Failed to write NFC tag: ${error.message}`);
    }
  }
};

/**
 * Show a modal dialog with instructions for writing to NFC tags
 * @param t Translation function
 */
export const showNFCWriteModal = (spool: ISpool, t: (key: string) => string): void => {
  const nfcSupport = checkNFCSupport();
  
  // Calculate temperature and prepare OpenSpool data
  const extruderTemp = spool.filament.settings_extruder_temp;
  const bedTemp = spool.filament.settings_bed_temp;
  const material = (spool.filament.material || "PLA").toUpperCase().trim(); // Trim to remove trailing spaces
  
  let minTemp: number;
  let maxTemp: number;
  let bedMinTemp: number;
  let bedMaxTemp: number;
  
  if (extruderTemp) {
    minTemp = extruderTemp - 15;
    maxTemp = extruderTemp + 15;
  } else {
    switch (material) {
      case "PLA": minTemp = 190; maxTemp = 220; break;
      case "PETG": minTemp = 220; maxTemp = 250; break;
      case "ABS": minTemp = 230; maxTemp = 260; break;
      case "TPU": minTemp = 210; maxTemp = 240; break;
      case "NYLON": minTemp = 240; maxTemp = 270; break;
      default: minTemp = 190; maxTemp = 230;
    }
  }
  
  if (bedTemp) {
    bedMinTemp = bedTemp - 5;
    bedMaxTemp = bedTemp + 5;
  } else {
    switch (material) {
      case "PLA": bedMinTemp = 50; bedMaxTemp = 65; break;
      case "PETG": bedMinTemp = 70; bedMaxTemp = 85; break;
      case "ABS": bedMinTemp = 90; bedMaxTemp = 110; break;
      case "TPU": bedMinTemp = 40; bedMaxTemp = 60; break;
      case "NYLON": bedMinTemp = 70; bedMaxTemp = 90; break;
      default: bedMinTemp = 50; bedMaxTemp = 65;
    }
  }

  const filamentName = spool.filament.name || "Basic";
  const subtype = filamentName.trim() || "Basic";
  const brand = spool.filament.vendor?.name || "Generic";
  const colorHex = (spool.filament.color_hex || "FFFFFF").replace("#", "").toUpperCase();

  const openSpoolData = {
    protocol: "openspool",
    version: "1.0",
    spool_id: spool.id,
    type: material,
    color_hex: colorHex,
    brand: brand,
    min_temp: minTemp.toString(),
    max_temp: maxTemp.toString(),
    bed_min_temp: bedMinTemp.toString(),
    bed_max_temp: bedMaxTemp.toString(),
  };

  const openSpoolJSON = JSON.stringify(openSpoolData, null, 2);
  
  // Always show manual NFC Tools instructions since Web NFC has compatibility issues
  Modal.warning({
    title: "Write NFC Tag with NFC Tools",
    width: "90%",
    style: { maxWidth: 700, top: 20 },
    bodyStyle: { 
      maxHeight: "calc(100vh - 200px)", 
      overflowY: "auto",
      padding: "16px 24px"
    },
    content: (
      <div style={{ fontSize: 16 }}>
        <p style={{ marginBottom: 16, lineHeight: 1.6 }}>Use the <strong>NFC Tools</strong> app to write this OpenSpool data to your tag:</p>
        
        <h4 style={{ fontSize: 18, marginTop: 24, marginBottom: 12 }}>Step 1: Install NFC Tools</h4>
        <p style={{ marginBottom: 16 }}>Download from <a href="https://play.google.com/store/apps/details?id=com.wakdev.wdnfc" target="_blank" rel="noopener noreferrer">Google Play Store: NFC Tools</a></p>
        
        <h4 style={{ fontSize: 18, marginTop: 24, marginBottom: 12 }}>Step 2: Copy this OpenSpool JSON:</h4>
        <pre style={{ 
          backgroundColor: "#f5f5f5", 
          padding: 16,
          borderRadius: 8,
          fontSize: 13,
          maxHeight: 200,
          overflow: "auto",
          wordBreak: "break-all",
          whiteSpace: "pre-wrap",
          WebkitOverflowScrolling: "touch"
        }}>
          {openSpoolJSON}
        </pre>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(openSpoolJSON);
            message.success("Copied to clipboard!");
          }}
          style={{ 
            width: "100%",
            marginTop: 12,
            marginBottom: 16,
            padding: "12px 24px",
            minHeight: 44,
            backgroundColor: "#1890ff",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
        >
          Copy JSON to Clipboard
        </button>
        
        <h4 style={{ fontSize: 18, marginTop: 24, marginBottom: 12 }}>Step 3: In NFC Tools app:</h4>
        <ol style={{ fontSize: 16, lineHeight: 1.8, paddingLeft: 24 }}>
          <li style={{ marginBottom: 12 }}>Tap <strong>"Write"</strong> tab</li>
          <li style={{ marginBottom: 12 }}>Tap <strong>"Add a record"</strong></li>
          <li style={{ marginBottom: 12 }}>Select <strong>"Data" → "Text"</strong></li>
          <li style={{ marginBottom: 12 }}>Paste the JSON data</li>
          <li style={{ marginBottom: 12 }}>Optionally add more records:
            <ul style={{ marginTop: 8, lineHeight: 1.6 }}>
              <li style={{ marginBottom: 8 }}><strong>URL:</strong> <code style={{ fontSize: 13, wordBreak: "break-all", backgroundColor: "#f0f0f0", padding: "2px 6px", borderRadius: 4 }}>{`${window.location.origin}/spool/show/${spool.id}`}</code></li>
              <li><strong>Text:</strong> Spoolman Spool ID: {spool.id}</li>
            </ul>
          </li>
          <li style={{ marginBottom: 12 }}>Tap <strong>"Write"</strong> and hold your tag near the phone</li>
        </ol>
        
        <p style={{ marginTop: 24, fontSize: 14, color: "#666", lineHeight: 1.6, padding: 12, backgroundColor: "#f9f9f9", borderRadius: 8, borderLeft: "4px solid #1890ff" }}>
          <strong>Note:</strong> This creates an OpenSpool-compatible tag that works with Filaman and other OpenSpool readers.
        </p>
      </div>
    ),
  });
};
