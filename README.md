# 🚗 Smart Vehicle Anti-Theft and Monitoring System

![Platform](https://img.shields.io/badge/platform-ESP32-red)
![Firmware](https://img.shields.io/badge/firmware-Arduino-00979D)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

An ESP32-based vehicle security system that combines a physical keypad lock, tilt-based intrusion detection, and a live web dashboard for remote monitoring and control.

## Overview

This project turns an ESP32 into a self-contained car security controller. A 4x4 keypad handles PIN entry to arm/disarm and unlock the vehicle, a tilt sensor detects unauthorized movement (e.g. the car being jacked or broken into), and a buzzer + relay provide audible alerts and lock control. The ESP32 also hosts its own web server and serves a real-time dashboard (HTML/CSS/JS) over Wi-Fi, so the system's status, theft alerts, and controls are accessible from any browser on the network — with an automatic fallback to a self-hosted access point if no Wi-Fi network is available.

## Key Features

- Keypad-based PIN entry to lock/unlock and arm/disarm the system
- Tilt-sensor intrusion detection with automatic alarm triggering
- Audible buzzer alarm and relay-controlled locking mechanism
- Built-in web dashboard served directly from the ESP32 (via SPIFFS) with live status, charts, and remote controls
- REST-style HTTP API (`/api/status`, `/api/relay`, `/api/buzzer`, `/api/password`, `/api/arm`, `/api/reset`, `/api/emergency`)
- Automatic fallback to Wi-Fi Access Point mode if the configured network is unreachable
- Failed-attempt tracking with automatic theft-alarm escalation after repeated wrong PIN entries

## Technologies Used

| Category | Technology |
|---|---|
| Microcontroller | ESP32 |
| Firmware | Arduino framework (C++) |
| Libraries | WiFi, AsyncTCP, ESPAsyncWebServer, Keypad, SPIFFS |
| Dashboard | HTML, CSS, JavaScript, Chart.js |

## Project Structure

```
smart-vehicle-anti-theft-system/
├── firmware/
│   ├── car_security_system.ino   # ESP32 firmware: sensors, keypad, alarm, web server
│   └── data/                     # Dashboard served from the device over SPIFFS
│       ├── index.html
│       ├── script.js
│       └── style.css
├── docs/
│   ├── Report.pdf
│   └── Poster.jpg
├── LICENSE
└── README.md
```

## Installation

**Hardware:** ESP32 dev board, 4x4 matrix keypad, tilt sensor, buzzer, relay module, status LED.

**Firmware setup (Arduino IDE):**
1. Install the ESP32 board package and the following libraries: `AsyncTCP`, `ESPAsyncWebServer`, `Keypad`.
2. Open `firmware/car_security_system.ino`.
3. **Set your own Wi-Fi credentials** — replace the placeholder `ssid`/`password` values near the top of the file. Never commit real network credentials.
4. **Set your own unlock PIN** — replace the placeholder `correctPassword` value.
5. Upload the `firmware/data/` folder to the ESP32's SPIFFS filesystem (via the "ESP32 Sketch Data Upload" tool) so the dashboard can be served locally.
6. Flash the sketch to the board.

## Usage

- Enter a PIN on the keypad and press `#` to unlock, `*` to clear, `A` to arm, `B` to disable an active alarm, `C` to test the buzzer, and `D` to print system status to Serial.
- On boot, the ESP32 connects to the configured Wi-Fi network and prints its IP address to Serial — open that address in a browser to view the live dashboard.
- If the configured network isn't reachable, the device automatically starts its own access point (`CarSecuritySystem`) so the dashboard is still reachable directly.

## Demo



https://github.com/user-attachments/assets/dd10b1b0-0519-415a-853c-407a4b04d97f




## Future Improvements

- Move Wi-Fi and PIN credentials out of source code into a separate config file (e.g. loaded from SPIFFS) so firmware can be shared without any editing
- Add real GPS module integration to replace the current simulated coordinates
- Add persistent theft-event logging (with timestamps) viewable from the dashboard
- Support push/SMS notifications on theft detection in addition to the on-device alarm

## Security Notes

This firmware is a prototype. Before any real-world deployment:
- Never commit real Wi-Fi credentials, unlock PINs, or access-point passwords to source control
- Use a strong, unique PIN and AP password
- Consider adding HTTPS/authentication to the web dashboard before exposing it beyond a trusted local network

## License

Released under the [MIT License](LICENSE).
