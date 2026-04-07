// =============================================================================
//  Motorcycle Fingerprint Lock — with NEO-6M GPS (GPS6MV2)
// =============================================================================
//
// ── GPS6MV2 WIRING ────────────────────────────────────────────────────────────
//   VCC  → ESP32 3.3V   ✅ Use 3.3V, NOT 5V.
//                          The GPS6MV2 has an onboard LDO regulator that
//                          accepts 3.3V–5V, but because ESP32 UART pins are
//                          3.3V logic, powering from 3.3V avoids any risk of
//                          feeding 5V logic back into the ESP32 RX pin.
//   GND  → ESP32 GND
//   TX   → ESP32 GPIO34  (ESP32 RX — input only pin, safe choice)
//   RX   → ESP32 GPIO12  (ESP32 TX → GPS RX)
//
// ── GPS BEHAVIOUR ─────────────────────────────────────────────────────────────
//   On boot: Serial monitor shows "GPS initializing..." then either
//             "[GPS] Ready — fix acquired" or "[GPS] Waiting for fix..."
//             Updated every second while waiting.
//   On INVALID fingerprint: reads current GPS data and prints
//             latitude, longitude, speed, and satellites to Serial.
//   On VALID  fingerprint: servo unlocks. GPS is NOT triggered.
//
// ── SG90 WIRING ───────────────────────────────────────────────────────────────
//   Brown/Black  → ESP32 GND
//   Red          → ESP32 VIN (5V)  ← must be 5V, not 3.3V
//   Orange/Yellow→ ESP32 GPIO13
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
String storedEMAIL = "";
String primaryMac = ""; // "XX:XX:XX:XX:XX:XX" format

// ── BLE objects ───────────────────────────────────────────────────────────────
BLEServer*         pServer              = nullptr;
BLECharacteristic* pEventCharacteristic = nullptr;
bool deviceConnected    = false;
bool oldDeviceConnected = false;
int  enrollSlot         = -1;

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
//  HTTP / Email Alert Sender
// =============================================================================
void sendEmailAlert() {
  if (storedEMAIL == "") {
    Serial.println("[ALARM] No Target Email saved. Cannot send alert.");
    return;
  }
  
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
      Serial.println("[ALARM] Could not connect to hotspot. Email alert aborted.");
      return;
    }
    // Give DNS and stack a moment to stabilize
    delay(2000); 
  }

  Serial.print("[ALARM] Local IP: ");
  Serial.println(WiFi.localIP());

  IPAddress remote_ip;
  if (WiFi.hostByName("formsubmit.co", remote_ip)) {
    Serial.print("[ALARM] Resolved formsubmit.co to: ");
    Serial.println(remote_ip);
  } else {
    Serial.println("[ALARM] DNS Failed: Could not resolve formsubmit.co");
  }

  // ── Sync Clock from GPS or HTTP for SSL ──────────────────────────────────
  if (gps.date.isValid() && gps.time.isValid()) {
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
    Serial.println("[ALARM] No GPS fix. Syncing time via HTTP header...");
    HTTPClient check;
    // We use plain HTTP (Port 80) to avoid the "date loop" problem
    if (check.begin("http://google.com")) {
      const char * headerKeys[] = {"Date"};
      check.collectHeaders(headerKeys, 1);
      int httpCode = check.sendRequest("HEAD");
      if (httpCode > 0) {
        String dateStr = check.header("Date");
        Serial.print("[ALARM] HTTP Date Header: ");
        Serial.println(dateStr);
        // Basic parser for "Fri, 07 Apr 2026 14:15:00 GMT"
        // Minimal set: just get year/month/day to satisfy SSL
        configTime(0, 0, "pool.ntp.org"); // start ntp machine anyway
      }
      check.end();
    }
    // Fallback: Use manual sync if NTP/HTTP fails to update system time
    // ESP32 configTime is usually better if at least one UDP packet gets through
    configTime(0, 0, "pool.ntp.org", "time.google.com");
    delay(2000);
  }

  // Verify time
  time_t now = time(nullptr);
  struct tm* now_tm = localtime(&now);
  char timeBuf[64];
  strftime(timeBuf, sizeof(timeBuf), "%Y-%m-%d %H:%M:%S", now_tm);
  Serial.print("[ALARM] Current System Time: ");
  Serial.println(timeBuf);

  if (now < 1000000) {
    Serial.println("[ALARM] WARNING: Time still not synced. Trying manual override...");
    // If all else fails, set to a hardcoded "recent" date so SSL passes
    struct timeval tv = { .tv_sec = 1775537383, .tv_usec = 0 }; // Approx April 2026
    settimeofday(&tv, NULL);
  }

  WiFiClientSecure client;
  client.setInsecure(); // FormSubmit https without certificate bundle tracking
  client.setHandshakeTimeout(15000); 
  HTTPClient http;

  String url = "https://formsubmit.co/ajax/" + storedEMAIL;
  Serial.print("[ALARM] Target URL: ");
  Serial.println(url);
  
  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Accept", "application/json");
    http.addHeader("User-Agent", "Mozilla/5.0 (ESP32; MotorcycleSecurity)");
    http.addHeader("Origin", "https://motorcycle-security-app.com");
    http.addHeader("Referer", "https://motorcycle-security-app.com/");
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    http.setTimeout(15000); 

    String latStr = gpsReady() ? String(gps.location.lat(), 6) : "Unknown (No GPS Fix)";
    String lonStr = gpsReady() ? String(gps.location.lng(), 6) : "Unknown (No GPS Fix)";
    String mapsLink = gpsReady() 
          ? "https://www.google.com/maps/search/?api=1&query=" + latStr + "," + lonStr 
          : "Location unavailable (Device indoors or acquiring satellites)";

    StaticJsonDocument<512> postDoc;
    postDoc["_subject"] = "🚨 URGENT: Motorcycle Intruder Alert!";
    postDoc["message"] = "3 consecutive unauthorized fingerprint scans were natively detected by hardware lock over Wi-Fi.";
    postDoc["latitude"] = latStr;
    postDoc["longitude"] = lonStr;
    postDoc["google_maps_link"] = mapsLink;

    String requestBody;
    serializeJson(postDoc, requestBody);

    Serial.println("[ALARM] Firing native hardware webhook...");
    int httpCode = http.POST(requestBody);
    
    if (httpCode > 0) {
      Serial.printf("[ALARM] POST Success! Status: %d\n", httpCode);
      String payload = http.getString();
      Serial.println("[ALARM] Response: " + payload);
    } else {
      Serial.printf("[ALARM] POST Error! HTTP fail: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("[ALARM] HTTP begin failed.");
  }
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
    Serial.print("[BLE] Connection attempt from: ");
    Serial.println(peerMac);

    if (primaryMac == "" || primaryMac == "00:00:00:00:00:00") {
      primaryMac = peerMac;
      preferences.putString("prim_mac", primaryMac);
      Serial.println("[BLE] *** LOCKED TO NEW PRIMARY DEVICE: " + primaryMac + " ***");
      deviceConnected = true;
    } 
    else if (peerMac == primaryMac) {
      Serial.println("[BLE] Authorized Primary Device recognized.");
      deviceConnected = true;
    } 
    else {
      Serial.println("[BLE] !!! UNAUTHORIZED DEVICE BLOCKED (Disconnecting) !!!");
      pServer->disconnect(param->connect.conn_id);
      deviceConnected = false;
      return; 
    }
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
      if (finger.deleteModel(id) == FINGERPRINT_OK) {
        sendStatus("delete_ok", id);
      } else {
        sendStatus("delete_fail", id, -1, -1, "Sensor error");
      }
    }
    else if (cmd == "clear") {
      if (finger.emptyDatabase() == FINGERPRINT_OK) {
        Serial.println("[FP] Fingerprint Database cleared.");
        sendStatus("clear_ok");
      } else {
        sendStatus("clear_fail");
      }
    }
    else if (cmd == "full_reset") {
      finger.emptyDatabase();
      primaryMac = "";
      preferences.putString("prim_mac", "");
      Serial.println("[SYSTEM] FULL RESET PERFORMED. Database cleared & Bluetooth Bond wiped.");
      sendStatus("clear_ok"); // Mobile app listens for this to confirm reset
    }
    else if (cmd == "list") {
      finger.getTemplateCount();
      sendStatus("count", -1, finger.templateCount);
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
  if (p != FINGERPRINT_OK) return p;

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
    if (p != FINGERPRINT_OK) return p;
  }

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) return p;

  p = finger.createModel();
  if (p == FINGERPRINT_OK) {
    p = finger.storeModel(enrollSlot);
    if (p == FINGERPRINT_OK) {
      finger.getTemplateCount();
      sendStatus("enroll_ok", enrollSlot, finger.templateCount);
      return FINGERPRINT_OK;
    }
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

  // ── Load Preferences ────────────────────────────────────────────────────
  preferences.begin("grip-app", false);
  storedSSID = preferences.getString("ssid", "");
  storedPASS = preferences.getString("pass", "");
  storedEMAIL = preferences.getString("email", "");
  primaryMac = preferences.getString("prim_mac", "");

  Serial.println("[PREFS] Loaded SSID: " + (storedSSID == "" ? "None" : storedSSID));
  Serial.println("[PREFS] Loaded Email: " + (storedEMAIL == "" ? "None" : storedEMAIL));
  Serial.println("[PREFS] Primary Device Lock: " + (primaryMac == "" ? "UNLOCKED (Ready for pairing)" : primaryMac));

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
  String deviceName = "Motorcycle - Setup";
  if (primaryMac != "") {
     deviceName = "Motorcycle Lock (Private)";
  }
  
  BLEDevice::init(deviceName.c_str());
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

void loop() {

  // Always feed GPS data so the fix stays current
  feedGPS();

  // ── Print GPS fix status to serial every 10 s until fix acquired ─────────
  if (!gpsReady() && millis() - lastGpsStatusPrint > 10000) {
    Serial.print("[GPS] Still waiting for fix... Satellites seen: ");
    Serial.println(gps.satellites.isValid() ? gps.satellites.value() : 0);
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

  // ── Enrollment takes priority ─────────────────────────────────────────────
  if (enrollSlot != -1) {
    getFingerprintEnroll();
    enrollSlot = -1;
    return;
  }

  // ── Fingerprint scan + servo + GPS ───────────────────────────────────────
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_OK) {

    p = finger.image2Tz();
    if (p == FINGERPRINT_OK) {

      p = finger.fingerFastSearch();

      if (p == FINGERPRINT_OK) {
        consecutiveFails = 0; // Reset consecutive failures count
        
        // ── VALID — unlock servo, no GPS triggered ────────────────────────
        Serial.print("[FP] Matched! ID: ");
        Serial.print(finger.fingerID);
        Serial.print("  Confidence: ");
        Serial.println(finger.confidence);

        lockServo.write(SERVO_UNLOCKED);   // always write — self-correcting
        delay(500);
        sendStatus("verify_ok", finger.fingerID);
        delay(1500);

      } else if (p == FINGERPRINT_NOTFOUND) {
        consecutiveFails++;
        
        // ── INVALID — lock servo AND print GPS coordinates ─────────────────
        Serial.print("[FP] No match — access denied. Attempt: ");
        Serial.println(consecutiveFails);

        lockServo.write(SERVO_LOCKED);     // always write — self-correcting
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

          // Native Independent HTTP Alert Firing!
          sendEmailAlert();
          
          consecutiveFails = 0; // Reset counter after triggering email alert
        } else {
          // Send standard UI rejection
          sendStatus("verify_fail");
        }

        delay(500);
      }
    }
  }

  delay(50);
}
