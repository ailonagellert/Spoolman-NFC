<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/Donkie/Spoolman/assets/2332094/4e6e80ac-c7be-4ad2-9a33-dedc1b5ba30e">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/Donkie/Spoolman/assets/2332094/3c120b3a-1422-42f6-a16b-8d5a07c33000">
  <img alt="Icon of a filament spool" src="https://github.com/Donkie/Spoolman/assets/2332094/3c120b3a-1422-42f6-a16b-8d5a07c33000">
</picture>

<br/>

# 🏷️ NFC Feature Fork

> **This fork adds NFC/RFID tag support with OpenSpool format integration for physical spool identification and tracking.**

_Keep track of your inventory of 3D-printer filament spools._

Spoolman is a self-hosted web service designed to help you efficiently manage your 3D printer filament spools and monitor their usage. It acts as a centralized database that seamlessly integrates with popular 3D printing software like [OctoPrint](https://octoprint.org/) and [Klipper](https://www.klipper3d.org/)/[Moonraker](https://moonraker.readthedocs.io/en/latest/). When connected, it automatically updates spool weights as printing progresses, giving you real-time insights into filament usage.

[![Static Badge](https://img.shields.io/badge/Spoolman%20Wiki-blue?link=https%3A%2F%2Fgithub.com%2FDonkie%2FSpoolman%2Fwiki)](https://github.com/Donkie/Spoolman/wiki)
[![GitHub Release](https://img.shields.io/github/v/release/Donkie/Spoolman)](https://github.com/Donkie/Spoolman/releases)

### Features
* **🏷️ NFC Tag Support**: Write OpenSpool-format NFC tags directly from the web interface using the Web NFC API (Chrome on Android) or NFC Tools app. Tags include spool information and work with OpenSpool readers and Snapmaker U1.
* **🔌 Klipper Multi-Tool Integration**: Automatic spool assignment for multi-tool printers when NFC tags are scanned. Includes macros for Snapmaker U1 and other Klipper systems.
* **Filament Management**: Keep comprehensive records of filament types, manufacturers, and individual spools.
* **API Integration**: The [REST API](https://donkie.github.io/Spoolman/) allows easy integration with other software, facilitating automated workflows and data exchange.
* **Real-Time Updates**: Stay informed with live spool updates through Websockets, providing immediate feedback during printing operations.
* **Central Filament Database**: A community-supported database of manufacturers and filaments simplify adding new spools to your inventory. Contribute by heading to [SpoolmanDB](https://github.com/Donkie/SpoolmanDB).
* **Web-Based Client**: Spoolman includes a built-in web client that lets you manage data effortlessly:
  * View, create, edit, and delete filament data.
  * Add custom fields to tailor information to your specific needs.
  * Print labels with QR codes for easy spool identification and tracking.
  * Contribute to its translation into 18 languages via [Weblate](https://hosted.weblate.org/projects/spoolman/).
* **Database Support**: SQLite, PostgreSQL, MySQL, and CockroachDB.
* **Multi-Printer Management**: Handles spool updates from several printers simultaneously.
* **Advanced Monitoring**: Integrate with [Prometheus](https://prometheus.io/) for detailed historical analysis of filament usage, helping you track and optimize your printing processes. See the [Wiki](https://github.com/Donkie/Spoolman/wiki/Filament-Usage-History) for instructions on how to set it up.

**Spoolman integrates with:**
  * [Moonraker](https://moonraker.readthedocs.io/en/latest/configuration/#spoolman) and most front-ends (Fluidd, KlipperScreen, Mainsail, ...)
  * [OctoPrint](https://github.com/mdziekon/octoprint-spoolman)
  * [OctoEverywhere](https://octoeverywhere.com/spoolman?source=github_spoolman)
  * [Homeassistant](https://github.com/Disane87/spoolman-homeassistant)

**Web client preview:**
![image](https://github.com/Donkie/Spoolman/assets/2332094/33928d5e-440f-4445-aca9-456c4370ad0d)

## 🏷️ NFC Tag Features

This fork adds comprehensive NFC tag support for physical spool tracking and identification.

### What's New
- **OpenSpool Format**: Write NFC tags in the official [OpenSpool format](OPENSPOOL_FORMAT.md), compatible with OpenSpool readers and Snapmaker U1
- **Web NFC Writer**: Write tags directly from your phone's browser (Chrome on Android with HTTPS)
- **NFC Tag ID Field**: Store and track NFC tag UIDs in the `nfc_id` extra field
- **Klipper Integration**: Automatic spool assignment for multi-tool printers when tags are scanned

**NFC Writer Interface:**

<p align="center">
  <img src="images/nfc-write-button.png" alt="Write to NFC Tag button on spool detail page" width="45%">
  <img src="images/nfc-write-dialog.png" alt="NFC write confirmation dialog" width="45%">
</p>

### Usage
1. **Write Tags**: 
   - Navigate to any spool's detail page
   - Click "Write to NFC Tag"
   - Hold your NFC tag near your device
   - Tag is written with OpenSpool JSON including spool_id, material, temperatures, and color

2. **Klipper Integration** (Snapmaker U1 / Multi-Tool):
   - Copy `klipper/spoolman_nfc_integration.cfg` to your Klipper config
   - Include it: `[include spoolman_nfc_integration.cfg]`
   - Scan tags to automatically assign spools to tools
   - See [NFC_FEATURE.md](NFC_FEATURE.md) for full documentation

### OpenSpool Format
Tags written by Spoolman include:
```json
{
  "protocol": "openspool",
  "version": "1.0",
  "spool_id": 3,
  "type": "PETG",
  "color_hex": "FF0000",
  "brand": "Sunlu",
  "min_temp": "220",
  "max_temp": "250",
  "bed_min_temp": "70",
  "bed_max_temp": "85"
}
```

### Requirements
- **For Web NFC**: Chrome on Android, HTTPS connection
- **For Klipper**: Compatible NFC reader (Snapmaker U1 built-in or ESP32 + PN532)
- **Fallback**: Manual writing via NFC Tools app (instructions provided in UI)

See [NFC_FEATURE.md](NFC_FEATURE.md) and [OPENSPOOL_FORMAT.md](OPENSPOOL_FORMAT.md) for complete documentation.

---

## Installation
Please see the [Installation page on the Wiki](https://github.com/Donkie/Spoolman/wiki/Installation) for details how to install Spoolman.
