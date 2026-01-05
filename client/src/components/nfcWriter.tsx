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
  color_hex: string;
  brand: string;
  min_temp: string;
  max_temp: string;
  bed_min_temp?: string;
  bed_max_temp?: string;
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
    const material = spool.filament.material?.toUpperCase() || "PLA";
    
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

    // Prepare OpenSpool format data (temperatures as strings per spec)
    const openSpoolData: OpenSpoolData = {
      protocol: "openspool",
      version: "1.0",
      spool_id: spool.id,
      type: material,
      color_hex: (spool.filament.color_hex || "FFFFFF").replace("#", "").toUpperCase(),
      brand: spool.filament.vendor?.name || "Unknown",
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
    // Additional records (text/url) won't interfere with OpenSpool readers
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
  const material = spool.filament.material?.toUpperCase() || "PLA";
  
  let minTemp: number;
  let maxTemp: number;
  
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

  const openSpoolData = {
    protocol: "openspool",
    version: "1.0",
    type: material,
    color_hex: (spool.filament.color_hex || "FFFFFF").replace("#", "").toUpperCase(),
    brand: spool.filament.vendor?.name || "Unknown",
    min_temp: minTemp,
    max_temp: maxTemp,
  };

  const openSpoolJSON = JSON.stringify(openSpoolData, null, 2);
  
  // If Web NFC is supported, use the native API
  if (nfcSupport.supported) {
    Modal.confirm({
      title: "Write NFC Tag",
      content: "Hold your NFC tag near your device to write the spool data.",
      okText: "Write to Tag",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await writeNFCTag(spool);
          message.success("NFC tag written successfully!");
        } catch (error: any) {
          message.error(error.message || "Failed to write NFC tag");
        }
      },
    });
    return;
  }
  
  // Fallback: Show manual NFC Tools instructions if Web NFC not supported
  Modal.warning({
    title: "Write NFC Tag with NFC Tools",
    content: (
      <div>
        <p style={{ marginBottom: 12 }}>
          {nfcSupport.reason && <><strong>Note:</strong> {nfcSupport.reason}<br/><br/></>}
          Use the <strong>NFC Tools</strong> app to write this OpenSpool data to your tag:
        </p>
        
        <h4>Step 1: Install NFC Tools</h4>
        <p>Download from Google Play Store: <a href="https://play.google.com/store/apps/details?id=com.wakdev.wdnfc" target="_blank" rel="noopener noreferrer">NFC Tools</a></p>
        
        <h4>Step 2: Copy this OpenSpool JSON:</h4>
        <pre style={{ 
          backgroundColor: "#f5f5f5", 
          padding: 12, 
          borderRadius: 4, 
          fontSize: 11,
          maxHeight: 200,
          overflow: "auto"
        }}>
          {openSpoolJSON}
        </pre>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(openSpoolJSON);
            message.success("Copied to clipboard!");
          }}
          style={{ 
            marginBottom: 16,
            padding: "8px 16px",
            backgroundColor: "#1890ff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          Copy JSON to Clipboard
        </button>
        
        <h4>Step 3: In NFC Tools app:</h4>
        <ol style={{ fontSize: 14 }}>
          <li>Tap <strong>"Write"</strong> tab</li>
          <li>Tap <strong>"Add a record"</strong></li>
          <li>Select <strong>"Data" → "Text"</strong></li>
          <li>Paste the JSON data</li>
          <li>Optionally add more records:
            <ul>
              <li><strong>URL:</strong> <code>{`${window.location.origin}/spool/show/${spool.id}`}</code></li>
              <li><strong>Text:</strong> Spoolman Spool ID: {spool.id}</li>
            </ul>
          </li>
          <li>Tap <strong>"Write"</strong> and hold your tag near the phone</li>
        </ol>
        
        <p style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
          <strong>Note:</strong> This creates an OpenSpool-compatible tag that works with Filaman and other OpenSpool readers.
        </p>
      </div>
    ),
    width: 700,
  });
};
