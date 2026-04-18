// =============================================================================
//  Motorcycle Fingerprint Lock — with NEO-6M GPS (GPS6MV2)
// =============================================================================
//
// ── PIEZO BUZZER WIRING ───────────────────────────────────────────────────────
//   (+) Positive → ESP32 GPIO27   (or any available GPIO)
//   (-) Negative → ESP32 GND
//   ⚠️  Use a passive buzzer (not active). Active buzzers make their own tone
//       and ignore frequency — passive ones require PWM so you can control pitch.
//       If your buzzer has only 2 pins with no "+" marking, try both orientations.
//
// ── ZW101 LED BEHAVIOUR ──────────────────────────────────────────────────────
//   On valid fingerprint  : solid green (1 second)
//   On invalid fingerprint: single red blink
//   During cooldown       : fast blue blink (continuous, until cooldown ends)
//   The ZW101 LED is controlled via the Adafruit library's LEDcontrol() call.
//   No extra wiring needed — it uses the same UART connection as fingerprint data.
//
// ── LIBRARY REQUIREMENTS ─────────────────────────────────────────────────────
//   - ESP32Servo     (Library Manager: "ESP32Servo")
//   - TinyGPSPlus    (Library Manager: "TinyGPSPlus" by Mikal Hart)
//   - Adafruit_Fingerprint
//   - ArduinoJson
// =============================================================================

#include <Adafruit_Fingerprint.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ESP32Servo.h>
#include <TinyGPS++.h> // Changed slightly from TinyGPSPlus.h to support the canonical header name

// ── UUIDs (must match mobile app) ────────────────────────────────────────────
#define SERVICE_UUID      "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define WIFI_CHAR_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define COMMAND_CHAR_UUID "deadbeef-1234-5678-9abc-def012345678"
#define EVENT_CHAR_UUID   "abcdef01-1234-5678-9abc-def012345678"

// ── Hardware Pins ─────────────────────────────────────────────────────────────
#define FINGERPRINT_RX  16    // Fingerprint sensor TX → ESP32 RX
#define FINGERPRINT_TX  17    // Fingerprint sensor RX → ESP32 TX
#define GPS_RX_PIN      34    // GPS TX  → ESP32 GPIO34 (input-only, 3.3V safe)
#define GPS_TX_PIN      12    // GPS RX  → ESP32 GPIO12
#define SERVO_PIN       13    // SG90 signal (orange/yellow)
#define BOOT_BUTTON_PIN 0     // Built-in ESP32 BOOT button (Active-Low)
#define BUZZER_PIN      27    // Passive piezo buzzer signal pin

// ── Servo angles ──────────────────────────────────────────────────────────────
#define SERVO_UNLOCKED  180   // Valid fingerprint   → clockwise   → unlocked
#define SERVO_LOCKED    0     // Invalid fingerprint → counterclockwise → locked

// ── GPS baud rate ─────────────────────────────────────────────────────────────
#define GPS_BAUD        9600  // NEO-6M default

// ── Objects ───────────────────────────────────────────────────────────────────
HardwareSerial fingerprintSerial(2);   // UART2 for fingerprint sensor
HardwareSerial gpsSerial(1);           // UART1 for GPS module
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerprintSerial);
TinyGPSPlus    gps;
Servo          lockServo;
Preferences    preferences; // To store WiFi credentials & MAC lock

// ── Variables ─────────────────────────────────────────────────────────────────
String storedSSID = "";
String storedPASS = "";
String storedEMAIL = "";  // Email for FormSubmit alerts
String storedNAME = "";   // Profile Name
String storedFPNAMES = ""; // JSON string mapped to fingerprint slots
String storedMPASS = "";   // Master Password
String storedARCHIVED = ""; // Comma-separated list of archived slot IDs
// ── BLE objects ───────────────────────────────────────────────────────────────
BLEServer*         pServer              = nullptr;
BLECharacteristic* pEventCharacteristic = nullptr;
bool deviceConnected    = false;
bool oldDeviceConnected = false;
int  enrollSlot         = -1;

// Thread-safe command requests to be handled in main loop
bool requestList = false;
bool requestClear = false;
bool requestFullReset = false;
int  requestDeleteSlot = -1;

// =============================================================================
//  Access Log Helper
//  Keeps track of access attempts for monitoring
// =============================================================================
void logAccess(int slot, int status) {
  time_t now = time(nullptr);
  // Offset to UTC+8 if you want local time encoded directly, or handle in mobile.
  // The phone will sync exact epoch (UTC). We'll assume the epoch is standard UTC.
  String entry = String(now) + "," + String(slot) + "," + String(status) + ";";
  String currentLog = preferences.getString("log", "");
  currentLog = entry + currentLog;
  
  // Keep only the last 40 entries to prevent memory overflow
  int semicolons = 0;
  for (int i=0; i < currentLog.length(); i++) {
    if (currentLog[i] == ';') {
      semicolons++;
      if (semicolons >= 40) {
        currentLog = currentLog.substring(0, i+1);
        break;
      }
    }
  }
  preferences.putString("log", currentLog);
}

// =============================================================================
//  GPS helper — feed NMEA sentences from serial into TinyGPSPlus
//  Call this frequently so the GPS object stays up to date.
// =============================================================================
void feedGPS() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }
}

// =============================================================================
//  GPS ready check — true when we have a valid location fix
// =============================================================================
bool gpsReady() {
  return gps.location.isValid() && gps.location.age() < 2000;
}

// =============================================================================
//  Print GPS coordinates to Serial Monitor (triggered on invalid fingerprint)
// =============================================================================
void printGPSToSerial() {
  feedGPS();   // flush any buffered data first

  Serial.println("--------------------------------------------------");
  Serial.println("[GPS] === INTRUDER ALERT — Location Data ===");

  if (gpsReady()) {
    Serial.print("[GPS] Latitude  : ");
    Serial.println(gps.location.lat(), 6);

    Serial.print("[GPS] Longitude : ");
    Serial.println(gps.location.lng(), 6);

    if (gps.altitude.isValid()) {
      Serial.print("[GPS] Altitude  : ");
      Serial.print(gps.altitude.meters(), 1);
      Serial.println(" m");
    }

    if (gps.speed.isValid()) {
      Serial.print("[GPS] Speed     : ");
      Serial.print(gps.speed.kmph(), 1);
      Serial.println(" km/h");
    }

    if (gps.satellites.isValid()) {
      Serial.print("[GPS] Satellites: ");
      Serial.println(gps.satellites.value());
    }

    if (gps.date.isValid() && gps.time.isValid()) {
      char buf[40];
      snprintf(buf, sizeof(buf),
               "[GPS] Time (UTC): %04d-%02d-%02d %02d:%02d:%02d",
               gps.date.year(), gps.date.month(), gps.date.day(),
               gps.time.hour(), gps.time.minute(), gps.time.second());
      Serial.println(buf);
    }
  } else {
    Serial.println("[GPS] No fix yet — coordinates unavailable.");
    Serial.print("[GPS] Satellites visible: ");
    Serial.println(gps.satellites.isValid() ? gps.satellites.value() : 0);
    Serial.println("[GPS] Move the device outdoors for a better signal.");
  }

  Serial.println("--------------------------------------------------");
}

String macToString(uint8_t* bda) {
  char buf[20];
  sprintf(buf, "%02X:%02X:%02X:%02X:%02X:%02X", 
          bda[0], bda[1], bda[2], bda[3], bda[4], bda[5]);
  return String(buf);
}

// =============================================================================
//  URL Encode helper — converts special characters for form-urlencoded data
// =============================================================================
String urlEncode(String str) {
  String encoded = "";
  char c;
  for (int i = 0; i < str.length(); i++) {
    c = str.charAt(i);
    if (c == ' ') {
      encoded += "+";
    } else if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
      encoded += c;
    } else {
      encoded += '%';
      if (c < 16) encoded += '0';
      encoded += String(c, HEX);
    }
  }
  return encoded;
}

// =============================================================================
//  HTTP / Email Alert Sender
// =============================================================================
void sendEmailAlert() {
  tone(BUZZER_PIN, 500); // Start 500Hz tone immediately
  finger.LEDcontrol(2, 50, 2, 0); // Fast blue blink (infinite count)
  if (storedEMAIL == "") {
    Serial.println("[ALARM] No Target Email saved. Skipping email alert.");
    goto lockdown;
  }
  
  { // Start of alert scope
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ALARM] WiFi not connected. Connecting...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(storedSSID.c_str(), storedPASS.c_str());
    // Give it up to 10 seconds to connect on the fly
    unsigned int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 20) {
      feedGPS();
      delay(500);
      Serial.print(".");
      retries++;
    }
    Serial.println();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[ALARM] Could not connect to hotspot. Email alert skipped.");
      goto lockdown;
    }
    // Give DNS and stack a moment to stabilize
    delay(2000); 
  }

  Serial.print("[ALARM] Local IP: ");
  Serial.println(WiFi.localIP());

  // ── Debug DNS ──────────────────────────────────────────────────────────
  IPAddress res;
  if (WiFi.hostByName("www.formsubmit.co", res)) {
    Serial.print("[ALARM] DNS Success. www.formsubmit.co: ");
    Serial.println(res);
  } else {
    Serial.println("[ALARM] DNS Failed for www.formsubmit.co");
  }

  Serial.print("[ALARM] Free Heap: ");
  Serial.println(ESP.getFreeHeap());

  // ── Sync Clock for SSL ──────────────────────────────────────────────────
  // Try GPS first, then NTP
  if (gps.date.isValid() && gps.time.isValid() && gps.date.year() >= 2024) {
    struct tm t;
    t.tm_year = gps.date.year() - 1900;
    t.tm_mon = gps.date.month() - 1;
    t.tm_mday = gps.date.day();
    t.tm_hour = gps.time.hour();
    t.tm_min = gps.time.minute();
    t.tm_sec = gps.time.second();
    t.tm_isdst = 0;
    time_t timeSinceEpoch = mktime(&t);
    struct timeval tv = { .tv_sec = timeSinceEpoch, .tv_usec = 0 };
    settimeofday(&tv, NULL);
    Serial.println("[ALARM] System time synced from GPS.");
  } else {
    Serial.println("[ALARM] Syncing time via NTP...");
    configTime(0, 0, "pool.ntp.org", "time.google.com");
    int retry = 0;
    while (time(nullptr) < 1000000 && retry < 10) {
      feedGPS();
      delay(500);
      retry++;
    }
  }

  // Verify time and apply PHT timezone offset (UTC+8)
  time_t now = time(nullptr);
  now += 28800; // 8 hours offset for Philippines
  struct tm* now_tm = gmtime(&now);
  char timeBuf[64];
  strftime(timeBuf, sizeof(timeBuf), "%Y-%m-%d %H:%M:%S (PHT)", now_tm);
  Serial.print("[ALARM] Current System Time: ");
  Serial.println(timeBuf);
  
  Serial.print("[ALARM] Free Heap before BLE pause: ");
  Serial.println(ESP.getFreeHeap());

  // SSL handshakes require ~40KB of contiguous heap. We must turn off BLE temporarily.
  Serial.println("[ALARM] Pausing BLE to free memory for SSL handshake...");
  BLEDevice::deinit(true);
  delay(500);
  
  Serial.print("[ALARM] Free Heap after BLE pause: ");
  Serial.println(ESP.getFreeHeap());

  WiFiClientSecure client;
  client.setInsecure();  
  HTTPClient http;

  String url = "https://formsubmit.co/ajax/" + storedEMAIL; // Use AJAX endpoint to avoid 429 HTML block!
  Serial.print("[ALARM] Target URL: ");
  Serial.println(url);
  
  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Accept", "application/json");
    http.addHeader("User-Agent", "ESP32-Motorcycle-Lock/2.0");
    http.addHeader("Origin", "https://localhost");
    http.addHeader("Referer", "https://localhost/");
    http.setTimeout(15000); 

    String latStr = gpsReady() ? String(gps.location.lat(), 6) : "Unknown";
    String lonStr = gpsReady() ? String(gps.location.lng(), 6) : "Unknown";
    String mapsLink = gpsReady() 
          ? "https://www.google.com/maps/search/?api=1&query=" + latStr + "," + lonStr 
          : "Location unavailable (Check GPS fix)";

    // Build JSON body for FormSubmit AJAX API
    StaticJsonDocument<512> jsonBody;
    jsonBody["_captcha"] = "false";
    jsonBody["_subject"] = "URGENT: Motorcycle Intruder Alert!";
    jsonBody["message"] = "3 consecutive unauthorized fingerprint scans were just detected on your motorcycle lock.";
    jsonBody["latitude"] = latStr;
    jsonBody["longitude"] = lonStr;
    jsonBody["google_maps_link"] = mapsLink;
    jsonBody["timestamp"] = timeBuf;

    String requestBody;
    serializeJson(jsonBody, requestBody);

    Serial.println("[ALARM] Sending intrusion alert email via JSON AJAX...");
    Serial.print("[ALARM] Request length: ");
    Serial.println(requestBody.length());
    
    int httpCode = http.POST(requestBody);
    
    if (httpCode > 0) {
      Serial.printf("[ALARM] POST Success! Status: %d\n", httpCode);
      String payload = http.getString();
      Serial.println("[ALARM] Response: " + payload);
    } else {
      Serial.printf("[ALARM] POST Error! Code: %d — %s\n", httpCode, http.errorToString(httpCode).c_str());
      // Extra info for -1 error
      if (httpCode == -1) {
        Serial.println("[ALARM] Hint: -1 often means the server is unreachable or the connection was reset instantly.");
        Serial.print("[ALARM] Wi-Fi Status: ");
        Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "LOST");
      }
    }
    http.end();
  } else {
    Serial.println("[ALARM] HTTP begin failed.");
  }
  } // End of alert scope

lockdown:

  // After sending alert, enforce a 30-second security cooldown
  Serial.println("==================================================");
  Serial.println("[ALARM] INTRUDER LOCKDOWN ACTIVATED — BUZZER ON");
  Serial.println("==================================================");
  
  for (int i = 30; i > 0; i--) {
    Serial.printf("[ALARM] System locked. Cooldown remaining: %d seconds...\n", i);
    
    // Steady 500Hz Pulsing Alarm
    for (int j = 0; j < 2; j++) {
      tone(BUZZER_PIN, 500);
      finger.LEDcontrol(2, 25, 2, 1); // Blue Flash
      delay(500);
      noTone(BUZZER_PIN);
      delay(500);
    }
  }

  noTone(BUZZER_PIN); // Stop the tone
  finger.LEDcontrol(4, 0, 0, 0); // Turn off LED
  Serial.println("[ALARM] Cooldown finished! Rebooting system to restore normal functions...");
  ESP.restart();
}

// =============================================================================
//  BLE helpers
// =============================================================================
void sendEvent(String json) {
  if (deviceConnected && pEventCharacteristic != nullptr) {
    pEventCharacteristic->setValue(json.c_str());
    pEventCharacteristic->notify();
    Serial.println("Sent Event: " + json);
  }
}

void sendStatus(String event, int id = -1, int total = -1,
                int step = -1, String reason = "") {
  StaticJsonDocument<200> doc;
  doc["event"] = event;
  if (id     != -1) doc["id"]     = id;
  if (total  != -1) doc["total"]  = total;
  if (step   != -1) doc["step"]   = step;
  if (reason != "") doc["reason"] = reason;

  String output;
  serializeJson(doc, output);
  sendEvent(output);
}

// =============================================================================
//  BLE Callbacks
// =============================================================================
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer, esp_ble_gatts_cb_param_t *param) override {
    String peerMac = macToString(param->connect.remote_bda);
    Serial.print("[BLE] Connection from: ");
    Serial.println(peerMac);
    deviceConnected = true;
  }

  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] Device Disconnected");
  }
};

class CommandCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) override {
    String value = pCharacteristic->getValue().c_str();
    if (value.length() == 0) return;

    Serial.print("[BLE] Received Command: ");
    Serial.println(value);

    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, value)) return;

    String cmd = doc["cmd"] | "";
    int    id  = doc["id"]  | -1;

    if (cmd == "enroll") {
      enrollSlot = id;
      sendStatus("enroll_start", enrollSlot);
    }
    else if (cmd == "delete") {
      requestDeleteSlot = id;
    }
    else if (cmd == "clear") {
      requestClear = true;
    }
    else if (cmd == "full_reset") {
      requestFullReset = true;
    }
    else if (cmd == "list") {
      requestList = true;
    }
    else if (cmd == "set_identity") {
      String name = doc["name"] | "";
      String fp_names = doc["fp_names"] | "";
      if (name != "") {
        storedNAME = name;
        preferences.putString("uname", storedNAME);
        Serial.println("[BLE] Set user name: " + name);
      }
      if (fp_names != "") {
        storedFPNAMES = fp_names;
        preferences.putString("fpnames", storedFPNAMES);
        Serial.println("[BLE] Set fp labels: " + fp_names);
      }
      if (doc.containsKey("archived")) {
        storedARCHIVED = doc["archived"] | "";
        preferences.putString("archived", storedARCHIVED);
        Serial.println("[BLE] Set archived slots: " + storedARCHIVED);
      }
      sendStatus("identity_ok");
    }
    else if (cmd == "set_pass") {
      String p = doc["pass"] | "";
      if (p != "") {
        storedMPASS = p;
        preferences.putString("mpass", storedMPASS);
        Serial.println("[BLE] Master Password Saved to hardware.");
      }
      sendStatus("pass_ok");
    }
    else if (cmd == "get_identity") {
      StaticJsonDocument<512> ldoc;
      ldoc["event"] = "identity";
      ldoc["name"] = storedNAME;
      ldoc["email"] = storedEMAIL;
      if (storedMPASS != "") {
        ldoc["pass"] = storedMPASS;
      }
      if (storedFPNAMES != "") {
        // Must send empty string as null in frontend or handle gracefully
        ldoc["fp_names"] = storedFPNAMES;
      }
      if (storedARCHIVED != "") {
        ldoc["archived"] = storedARCHIVED;
      }
      String output;
      serializeJson(ldoc, output);
      sendEvent(output);
      Serial.println("[BLE] Sent Identity Bundle to newly connected phone.");
    }
    else if (cmd == "get_log") {
      String rawLog = preferences.getString("log", "");
      StaticJsonDocument<1024> ldoc;
      ldoc["event"] = "access_log";
      ldoc["data"] = rawLog;
      String output;
      serializeJson(ldoc, output);
      sendEvent(output);
      Serial.println("[BLE] Sent Access Log.");
    }
    else if (cmd == "clear_log") {
      preferences.remove("log");
      sendStatus("log_cleared");
    }
    else if (cmd == "sync_settings") {
      String email = doc["email"] | "";
      long   phoneTime = doc["time"] | 0;

      if (email != "") {
        storedEMAIL = email;
        preferences.putString("email", storedEMAIL);
        Serial.println("[BLE] Updated Email: " + storedEMAIL);
      }
      
      if (phoneTime > 1000000) {
        struct timeval tv = { .tv_sec = phoneTime, .tv_usec = 0 };
        settimeofday(&tv, NULL);
        Serial.println("[BLE] Clock Synced to Phone Time.");
      }
      sendStatus("sync_ok");
    }
    // Handle the 'Track Location' request from Mobile App
    else if (cmd == "get_location") {
      if (gpsReady()) {
        StaticJsonDocument<200> ldoc;
        ldoc["event"] = "location";
        ldoc["lat"] = gps.location.lat();
        ldoc["lon"] = gps.location.lng();
        String output;
        serializeJson(ldoc, output);
        sendEvent(output);
      } else {
        sendStatus("location_fail", -1, -1, -1, "No GPS Fix. Ensure module has clear view to the sky.");
      }
    }
  }
};

// =============================================================================
//  Enrollment
// =============================================================================
uint8_t getFingerprintEnroll() {
  int p = -1;
  sendStatus("place_finger", enrollSlot, -1, 1);

  while (p != FINGERPRINT_OK) {
    feedGPS();   // keep GPS data fresh during blocking waits
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) continue;
    if (p != FINGERPRINT_OK) return p;
  }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    sendStatus("enroll_fail", enrollSlot, -1, -1, "Failed to convert first fingerprint image");
    return p;
  }

  sendStatus("remove_finger");
  // Feed GPS during the 2-second wait instead of a blocking delay
  unsigned long start = millis();
  while (millis() - start < 2000) { feedGPS(); }

  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    feedGPS();
    p = finger.getImage();
  }

  sendStatus("place_finger", enrollSlot, -1, 2);
  p = -1;
  while (p != FINGERPRINT_OK) {
    feedGPS();
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) continue;
    if (p != FINGERPRINT_OK) {
      sendStatus("enroll_fail", enrollSlot, -1, -1, "Failed to capture second fingerprint");
      return p;
    }
  }

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    sendStatus("enroll_fail", enrollSlot, -1, -1, "Failed to convert second fingerprint image");
    return p;
  }

  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    sendStatus("enroll_fail", enrollSlot, -1, -1, "Fingerprints do not match - try again");
    return p;
  }

  p = finger.storeModel(enrollSlot);
  if (p == FINGERPRINT_OK) {
    finger.getTemplateCount();
    sendStatus("enroll_ok", enrollSlot, finger.templateCount);
    return FINGERPRINT_OK;
  }

  sendStatus("enroll_fail", enrollSlot, -1, -1, "Failed to store template");
  return p;
}

// =============================================================================
//  Setup
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("==============================================");
  Serial.println("  Motorcycle Lock — Booting...");
  Serial.println("==============================================");

  // ── Hardware Buttons ────────────────────────────────────────────────────
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // ── Load Preferences ────────────────────────────────────────────────────
  preferences.begin("grip-app", false);
  storedSSID = preferences.getString("ssid", "");
  storedPASS = preferences.getString("pass", "");
  storedEMAIL = preferences.getString("email", "");
  storedNAME = preferences.getString("uname", "");
  storedFPNAMES = preferences.getString("fpnames", "");
  storedMPASS = preferences.getString("mpass", "");
  storedARCHIVED = preferences.getString("archived", "");

  Serial.println("[PREFS] Loaded SSID: " + (storedSSID == "" ? "None" : storedSSID));
  Serial.println("[PREFS] Loaded Email: " + (storedEMAIL == "" ? "None" : storedEMAIL));
  Serial.println("[PREFS] Loaded Name: " + (storedNAME == "" ? "None" : storedNAME));

  // ── Connect WiFi if available ───────────────────────────────────────────
  if (storedSSID != "") {
    Serial.println("[WIFI] Background connecting to " + storedSSID + "...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(storedSSID.c_str(), storedPASS.c_str());
    // Non-blocking, connects in background during boot
  }

  // ── Fingerprint sensor ──────────────────────────────────────────────────
  fingerprintSerial.begin(57600, SERIAL_8N1, FINGERPRINT_RX, FINGERPRINT_TX);
  finger.begin(57600);
  if (finger.verifyPassword()) {
    Serial.println("[FP]  Fingerprint sensor found (ZW101)");
  } else {
    Serial.println("[FP]  ERROR: Fingerprint sensor not found!");
  }

  // ── GPS module ──────────────────────────────────────────────────────────
  // UART1 — RX=GPIO34 (input-only), TX=GPIO12
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] Initializing NEO-6M on UART1...");
  Serial.println("[GPS] RX=GPIO34, TX=GPIO12, Baud=9600");
  Serial.println("[GPS] Power: 3.3V (onboard LDO handles regulation)");
  Serial.println("[GPS] Waiting for satellite fix — go outdoors for best signal.");

  // Brief non-blocking check so we show the initial GPS state on boot
  unsigned long gpsCheckStart = millis();
  while (millis() - gpsCheckStart < 3000) {
    feedGPS();
  }
  if (gpsReady()) {
    Serial.println("[GPS] Ready — fix acquired!");
  } else {
    Serial.println("[GPS] Not yet fixed — will report when fix arrives.");
  }

  // ── Servo ───────────────────────────────────────────────────────────────
  lockServo.attach(SERVO_PIN);
  lockServo.write(SERVO_LOCKED);
  delay(500);
  Serial.println("[SERVO] SG90 attached on GPIO13 — starting LOCKED (0 deg)");

  // ── BLE ─────────────────────────────────────────────────────────────────
  BLEDevice::init("Motorcycle Handlegrip");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  class WifiCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pCharacteristic) override {
      String value = pCharacteristic->getValue().c_str();
      if (value.length() == 0) return;

      Serial.print("[BLE] Received WiFi Config payload: ");
      Serial.println(value);

      StaticJsonDocument<256> doc;
      if (deserializeJson(doc, value)) return;

      storedSSID = doc["s"] | "";
      storedPASS = doc["p"] | "";
      storedEMAIL = doc["e"] | "";

      preferences.putString("ssid", storedSSID);
      preferences.putString("pass", storedPASS);
      if (storedEMAIL != "") preferences.putString("email", storedEMAIL);

      Serial.println("[WIFI] Saved credentials. Reconnecting to Hotspot...");
      WiFi.mode(WIFI_STA);
      WiFi.disconnect();
      WiFi.begin(storedSSID.c_str(), storedPASS.c_str());
    }
  };

  BLECharacteristic* pWifiChar = pService->createCharacteristic(
    WIFI_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pWifiChar->setCallbacks(new WifiCallbacks());

  BLECharacteristic* pCmdChar = pService->createCharacteristic(
    COMMAND_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pCmdChar->setCallbacks(new CommandCallbacks());

  pEventCharacteristic = pService->createCharacteristic(
    EVENT_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  pEventCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Ready — advertising as 'Motorcycle Handlegrip'");
  Serial.println("==============================================");
}

// =============================================================================
//  Loop
// =============================================================================

// Tracks when we last printed GPS status during idle (every 10 s)
unsigned long lastGpsStatusPrint = 0;
int consecutiveFails = 0;
unsigned long buttonPressStart = 0;
bool buttonIsPressed = false;

void loop() {
  // Always feed GPS data so the fix stays current
  feedGPS();

  // ── Hardware Override (BOOT Button) ──────────────────────────────────────
  if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
    if (!buttonIsPressed) {
      buttonIsPressed = true;
      buttonPressStart = millis();
    } else {
      if (millis() - buttonPressStart >= 5000) {
        Serial.println("[SYSTEM] BOOT button held for 5 seconds. TRIGGERING FACTORY RESET...");
        requestFullReset = true;
        buttonPressStart = millis(); // Reset timer so it doesn't spam if held down
      }
    }
  } else {
    buttonIsPressed = false;
  }

  // ── Print GPS fix status to serial every 10 s until fix acquired ─────────
  if (!gpsReady() && millis() - lastGpsStatusPrint > 10000) {
    Serial.print("[GPS] Still waiting for fix... Satellites seen: ");
    Serial.println(gps.satellites.isValid() ? gps.satellites.value() : 0);
    
    // NEW DIAGNOSTIC: Check if we are receiving any bytes at all
    if (gps.charsProcessed() < 10) {
      Serial.println("[GPS] WARNING: No data received from GPS module yet. Check your wiring (TX/RX)!");
    } else {
      Serial.print("[GPS] Data is flowing (Chars: ");
      Serial.print(gps.charsProcessed());
      Serial.println("). Wiring is OK, just needs a better view of the sky.");
    }
    
    lastGpsStatusPrint = millis();
  }
  if (gpsReady() && lastGpsStatusPrint != 0 &&
      millis() - lastGpsStatusPrint > 10000) {
    // Once fixed, print confirmation once then stop periodic messages
    Serial.println("[GPS] Fix acquired — coordinates are live.");
    lastGpsStatusPrint = 0;   // stop printing
  }

  // ── BLE reconnection ──────────────────────────────────────────────────────
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    BLEDevice::startAdvertising();
    Serial.println("[BLE] Advertising restarted");
    oldDeviceConnected = false;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = true;
    Serial.println("[BLE] Connection recognized");
  }

  // ── Hardware Operations / Interrupt Requests (Thread Safe) ───────────────
  if (enrollSlot != -1) {
    getFingerprintEnroll();
    enrollSlot = -1;
    return;
  }
  if (requestList) {
    finger.getTemplateCount();
    sendStatus("count", -1, finger.templateCount);
    requestList = false;
    return;
  }
  if (requestDeleteSlot != -1) {
    if (finger.deleteModel(requestDeleteSlot) == FINGERPRINT_OK) {
      sendStatus("delete_ok", requestDeleteSlot);
    } else {
      sendStatus("delete_fail", requestDeleteSlot, -1, -1, "Sensor error");
    }
    requestDeleteSlot = -1;
    return;
  }
  if (requestClear) {
    if (finger.emptyDatabase() == FINGERPRINT_OK) {
      sendStatus("clear_ok");
    } else {
      sendStatus("clear_fail");
    }
    requestClear = false;
    return;
  }
  if (requestFullReset) {
    finger.emptyDatabase();
    preferences.clear();
    storedSSID = ""; storedPASS = ""; storedEMAIL = "";
    storedNAME = ""; storedFPNAMES = ""; storedARCHIVED = "";
    WiFi.disconnect(true, true);
    Serial.println("[SYSTEM] FULL RESET PERFORMED. Database and all NVS preferences entirely wiped.");
    sendStatus("clear_ok"); 
    requestFullReset = false;
    return;
  }

  // ── Fingerprint scan + servo + GPS ───────────────────────────────────────
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_OK) {

    p = finger.image2Tz();
    if (p == FINGERPRINT_OK) {

      p = finger.fingerFastSearch();

      if (p == FINGERPRINT_OK && finger.confidence > 0) {
        // Check if archived
        String searchStr = "," + String(finger.fingerID) + ",";
        if (storedARCHIVED.indexOf(searchStr) >= 0) {
          // ZW101 auto-flashes GREEN naturally when it finds a match. 
          // Override it by explicitly flashing RED (2=flash, 25=speed, 1=red, 10=count)
          finger.LEDcontrol(2, 25, 1, 10);
          
          consecutiveFails++;
          Serial.print("[FP] Matched, but fingerprint is ARCHIVED. Access denied. ID: ");
          Serial.println(finger.fingerID);
          lockServo.write(SERVO_LOCKED);     // always write — self-correcting
          logAccess(finger.fingerID, 2); // Log archived attempt
          delay(500);
          sendStatus("verify_archived", finger.fingerID);

          if (consecutiveFails >= 3) {
            StaticJsonDocument<200> ldoc;
            ldoc["event"] = "intrusion_alert";
            if (gpsReady()) { ldoc["lat"] = gps.location.lat(); ldoc["lon"] = gps.location.lng(); }
            String output; serializeJson(ldoc, output); sendEvent(output);
            printGPSToSerial(); sendEmailAlert();
            consecutiveFails = 0;
          }
        } else {
          consecutiveFails = 0; // Reset consecutive failures count
          
          // ── VALID — unlock servo, no GPS triggered ────────────────────────
          finger.LEDcontrol(3, 100, 4, 0); // Solid Green (using color code 4 or 2 depending on sensor, usually 4 is green)
          Serial.print("[FP] Matched! ID: ");
          Serial.print(finger.fingerID);
          Serial.print("  Confidence: ");
          Serial.println(finger.confidence);

          lockServo.write(SERVO_UNLOCKED);   // always write — self-correcting
          logAccess(finger.fingerID, 1); // Log successful unlock
          delay(500);
          sendStatus("verify_ok", finger.fingerID);
        }

      } else if (p == FINGERPRINT_NOTFOUND || (p == FINGERPRINT_OK && finger.confidence == 0)) {
        consecutiveFails++;
        
        // ── INVALID — lock servo AND print GPS coordinates ─────────────────
        Serial.print("[FP] No match — access denied. Attempt: ");
        Serial.println(consecutiveFails);

        finger.LEDcontrol(2, 25, 1, 1); // Single Red Blink
        lockServo.write(SERVO_LOCKED);     // always write — self-correcting
        logAccess(-1, 0); // Log failed attempt
        delay(500);
        
        if (consecutiveFails >= 3) {
          // Broadcast the intrusion_alert event with GPS details!
          StaticJsonDocument<200> ldoc;
          ldoc["event"] = "intrusion_alert";
          if (gpsReady()) {
            ldoc["lat"] = gps.location.lat();
            ldoc["lon"] = gps.location.lng();
          }
          String output;
          serializeJson(ldoc, output);
          sendEvent(output);

          // Print GPS coordinates to Serial Monitor
          printGPSToSerial();

          // Send Email alert directly from hardware
          sendEmailAlert();
          
          consecutiveFails = 0; // Reset counter after triggering alert
        } else {
          // Send standard UI rejection
          sendStatus("verify_fail");
        }
      }
    }
    
    // CRITICAL: Block any further scanning until the finger is physically lifted.
    // This perfectly prevents getting 3 rapid strikes from holding an incorrect finger!
    while (finger.getImage() == FINGERPRINT_OK) { 
      delay(100); 
    }
    delay(500); // Breathe before allowing next full attempt
  }

  delay(50);
}

