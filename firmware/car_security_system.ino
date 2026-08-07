





#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <Keypad.h>
#include <SPIFFS.h>

// ========== Network Settings ==========
// IMPORTANT: replace these with your own network credentials before flashing.
// Do not commit real Wi-Fi credentials to version control.
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ========== Pin Definitions ==========
const int TILT_PIN = 35;     // Tilt sensor (active LOW when tilted)
const int BUZZER_PIN = 19;   // Buzzer
const int RELAY_PIN = 18;    // Relay (car lock)
const int STATUS_LED = 2;    // Built-in LED

// ========== Keypad Settings ==========
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33, 32};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ========== System Variables ==========
// IMPORTANT: change this default unlock PIN before deploying to a real vehicle.
String correctPassword = "1234";
String inputPassword = "";
int failedAttempts = 0;
bool theftAlert = false;
String theftType = "";
bool systemArmed = true;
unsigned long lastTiltDetection = 0;
unsigned long lastStatusUpdate = 0;
float gpsLat = 21.581354;    // Default coordinates (Jeddah)
float gpsLng = 39.1807571;

AsyncWebServer server(80);

// ========== Control Functions ==========
void controlBuzzer(bool state) { 
  digitalWrite(BUZZER_PIN, state ? HIGH : LOW); 
}

void controlRelay(bool state) { 
  digitalWrite(RELAY_PIN, state ? HIGH : LOW); 
}

void controlLED(bool state) { 
  digitalWrite(STATUS_LED, state ? HIGH : LOW); 
}

bool readTiltSensor() { 
  // Sensor is ACTIVE LOW when tilted
  return digitalRead(TILT_PIN) == LOW; 
}

void handleKeypad() {
  char key = keypad.getKey();
  if (!key) return;
  
  Serial.print("[KEYPAD] Key pressed: ");
  Serial.println(key);
  
  if (key == '#') { // Confirm button
    if (inputPassword == correctPassword) {
      // Unlock car
      controlRelay(true);
      failedAttempts = 0;
      theftAlert = false;
      systemArmed = false;
      Serial.println("[SYSTEM] ✅ Password correct - Car UNLOCKED");
      
      // Success signal
      for(int i = 0; i < 3; i++) {
        controlLED(HIGH);
        delay(100);
        controlLED(LOW);
        delay(100);
      }
    } else {
      // Wrong password
      failedAttempts++;
      Serial.print("[SECURITY] ❌ Wrong password. Attempts: ");
      Serial.println(failedAttempts);
      
      // Error signal
      controlLED(HIGH);
      delay(500);
      controlLED(LOW);
      
      if (failedAttempts >= 3) {
        theftAlert = true;
        theftType = "Theft attempt: Multiple wrong passwords (" + String(failedAttempts) + " times)";
        triggerTheftAlarm();
      }
    }
    inputPassword = "";
  } else if (key == '*') { // Clear button
    inputPassword = "";
    Serial.println("[KEYPAD] Input cleared");
    controlLED(LOW);
  } else if (key == 'A') { // Arm system
    systemArmed = true;
    controlRelay(false);
    Serial.println("[SYSTEM] 🔒 System ARMED - Car LOCKED");
  } else if (key == 'B') { // Disable alarm
    theftAlert = false;
    controlBuzzer(false);
    Serial.println("[SYSTEM] 🔕 Alarm DISABLED");
  } else if (key == 'C') { // Test buzzer
    testBuzzer();
  } else if (key == 'D') { // System status
    printSystemStatus();
  } else {
    // Add digit to password
    if (inputPassword.length() < 8) {
      inputPassword += key;
      Serial.print("[KEYPAD] Current input: ");
      Serial.println(inputPassword);
    }
  }
}

void triggerTheftAlarm() {
  Serial.println("[SECURITY] 🚨 THEFT ALERT: " + theftType);
  
  // Intermittent buzzer (alarm siren)
  for (int i = 0; i < 10; i++) {
    controlBuzzer(true);
    controlLED(HIGH);
    delay(200);
    controlBuzzer(false);
    controlLED(LOW);
    delay(200);
  }
}

void testBuzzer() {
  Serial.println("[SYSTEM] Testing buzzer...");
  for(int i = 0; i < 3; i++) {
    controlBuzzer(true);
    delay(100);
    controlBuzzer(false);
    delay(100);
  }
}

void printSystemStatus() {
  Serial.println("\n========== SYSTEM STATUS ==========");
  Serial.println("WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  Serial.println("IP Address: " + WiFi.localIP().toString());
  Serial.println("Car Lock: " + String(digitalRead(RELAY_PIN) ? "UNLOCKED" : "LOCKED"));
  Serial.println("Tilt Sensor: " + String(readTiltSensor() ? "TILTED" : "NORMAL"));
  Serial.println("Theft Alert: " + String(theftAlert ? "ACTIVE" : "INACTIVE"));
  Serial.println("Failed Attempts: " + String(failedAttempts));
  Serial.println("Password Attempt: " + inputPassword);
  Serial.println("GPS Location: " + String(gpsLat, 6) + ", " + String(gpsLng, 6));
  Serial.println("==================================\n");
}

// ========== Server Setup ==========
void setupServer() {
  // Initialize SPIFFS
  if(!SPIFFS.begin(true)){
    Serial.println("An Error has occurred while mounting SPIFFS");
    return;
  }
  
  // Serve static files from SPIFFS
  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");
  
  // API: Get system status
  server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request){
    Serial.println("[API] Status request");
    
    String json = "{";
    json += "\"tilt\":" + String(readTiltSensor() ? "true" : "false") + ",";
    json += "\"relay\":" + String(digitalRead(RELAY_PIN) ? "true" : "false") + ",";
    json += "\"buzzer\":" + String(digitalRead(BUZZER_PIN) ? "true" : "false") + ",";
    json += "\"theftAlert\":" + String(theftAlert ? "true" : "false") + ",";
    json += "\"theftType\":\"" + theftType + "\",";
    json += "\"failedAttempts\":" + String(failedAttempts) + ",";
    json += "\"systemArmed\":" + String(systemArmed ? "true" : "false") + ",";
    json += "\"gpsLat\":" + String(gpsLat, 6) + ",";
    json += "\"gpsLng\":" + String(gpsLng, 6);
    json += "}";
    
    request->send(200, "application/json", json);
  });
  
  // API: Control relay
  server.on("/api/relay", HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("state", true)) {
      String state = request->getParam("state", true)->value();
      controlRelay(state == "on");
      Serial.print("[API] Relay set to: ");
      Serial.println(state);
      request->send(200, "text/plain", "OK");
    } else {
      request->send(400, "text/plain", "Missing state parameter");
    }
  });
  
  // API: Control buzzer
  server.on("/api/buzzer", HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("state", true)) {
      String state = request->getParam("state", true)->value();
      controlBuzzer(state == "on");
      Serial.print("[API] Buzzer set to: ");
      Serial.println(state);
      request->send(200, "text/plain", "OK");
    } else {
      request->send(400, "text/plain", "Missing state parameter");
    }
  });
  
  // API: Verify password
  server.on("/api/password", HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("password", true)) {
      String password = request->getParam("password", true)->value();
      
      if (password == correctPassword) {
        controlRelay(true);
        failedAttempts = 0;
        theftAlert = false;
        systemArmed = false;
        request->send(200, "application/json", "{\"result\":\"success\",\"message\":\"Password correct\"}");
        Serial.println("[API] Password verification: SUCCESS");
      } else {
        failedAttempts++;
        if (failedAttempts >= 3) {
          theftAlert = true;
          theftType = "Theft attempt: Multiple wrong passwords via web";
          triggerTheftAlarm();
        }
        request->send(200, "application/json", "{\"result\":\"error\",\"message\":\"Wrong password\",\"attempts\":" + String(failedAttempts) + "}");
        Serial.println("[API] Password verification: FAILED");
      }
    } else {
      request->send(400, "text/plain", "Missing password parameter");
    }
  });
  
  // API: Reset system
  server.on("/api/reset", HTTP_POST, [](AsyncWebServerRequest *request){
    failedAttempts = 0;
    theftAlert = false;
    inputPassword = "";
    controlRelay(false);
    controlBuzzer(false);
    systemArmed = true;
    
    Serial.println("[API] System reset");
    request->send(200, "text/plain", "System reset successfully");
  });
  
  // API: Emergency stop
  server.on("/api/emergency", HTTP_POST, [](AsyncWebServerRequest *request){
    theftAlert = false;
    systemArmed = false;
    controlRelay(false);
    controlBuzzer(false);
    
    Serial.println("[API] Emergency stop");
    request->send(200, "text/plain", "Emergency stop executed");
  });
  
  // API: Arm/disarm system
  server.on("/api/arm", HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("state", true)) {
      String state = request->getParam("state", true)->value();
      systemArmed = (state == "on");
      if (systemArmed) {
        controlRelay(false);
      }
      Serial.print("[API] System armed: ");
      Serial.println(systemArmed);
      request->send(200, "text/plain", "OK");
    } else {
      request->send(400, "text/plain", "Missing state parameter");
    }
  });
  
  // Handler for unknown requests
  server.onNotFound([](AsyncWebServerRequest *request){
    Serial.print("[WEB] Not found: ");
    Serial.println(request->url());
    request->send(404, "text/plain", "Not Found");
  });
  
  server.begin();
  Serial.println("[SYSTEM] HTTP server started");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n========================================");
  Serial.println("🚗 Advanced Car Security System - ESP32");
  Serial.println("========================================\n");
  
  // Initialize pins
  pinMode(TILT_PIN, INPUT_PULLUP); // Use internal pull-up
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  
  controlBuzzer(false);
  controlRelay(false);
  controlLED(LOW);
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    controlLED(!digitalRead(STATUS_LED)); // Blink LED during connection
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("📡 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📡 Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    // Connection success signal
    for(int i = 0; i < 3; i++) {
      controlLED(HIGH);
      delay(100);
      controlLED(LOW);
      delay(100);
    }
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    // Connection failure signal
    for(int i = 0; i < 5; i++) {
      controlLED(HIGH);
      delay(500);
      controlLED(LOW);
      delay(500);
    }
    // Continue in AP mode
    // IMPORTANT: change this fallback access-point password before deployment.
    WiFi.softAP("CarSecuritySystem", "YOUR_AP_PASSWORD");
    Serial.print("📡 AP Mode - IP: ");
    Serial.println(WiFi.softAPIP());
  }
  
  // Setup server
  setupServer();
  
  Serial.println("\n✅ System ready!");
  Serial.println("📋 System Commands:");
  Serial.println("   A - Arm system (lock car)");
  Serial.println("   B - Disable alarm");
  Serial.println("   C - Test buzzer");
  Serial.println("   D - Print system status");
  Serial.println("   * - Clear password input");
  Serial.println("   # - Confirm password");
  Serial.println("========================================\n");
}

void loop() {
  // Handle keypad
  handleKeypad();
  
  // Monitor tilt sensor
  if (readTiltSensor()) {
    if (millis() - lastTiltDetection > 5000) { // Prevent repetition
      if (systemArmed && !theftAlert) {
        theftAlert = true;
        theftType = "Theft attempt: Car opening (tilt detected)";
        triggerTheftAlarm();
        Serial.println("[SECURITY] 🚨 Tilt sensor triggered!");
      }
      lastTiltDetection = millis();
    }
  } else {
    // Reset tilt detection if sensor returns to normal
    if (theftAlert && theftType.indexOf("tilt") != -1) {
      theftAlert = false;
      controlBuzzer(false);
    }
  }
  
  // Update LED status
  static unsigned long lastBlink = 0;
  if (millis() - lastBlink > 1000) {
    if (theftAlert) {
      // Fast blink during alert
      controlLED(!digitalRead(STATUS_LED));
    } else if (systemArmed) {
      // Slow blink when system armed
      static bool ledState = false;
      ledState = !ledState;
      controlLED(ledState);
    } else {
      // Turn off LED when system disarmed
      controlLED(LOW);
    }
    lastBlink = millis();
  }
  
  // Simulate GPS movement
  static unsigned long lastGPSUpdate = 0;
  if (millis() - lastGPSUpdate > 10000) { // Every 10 seconds
    // Simulate small GPS changes
    gpsLat += (random(-10, 10) / 1000000.0);
    gpsLng += (random(-10, 10) / 1000000.0);
    lastGPSUpdate = millis();
  }
  
  // Print system status every 30 seconds
  if (millis() - lastStatusUpdate > 30000) {
    printSystemStatus();
    lastStatusUpdate = millis();
  }
  
  delay(10);
}
