#include <Adafruit_Fingerprint.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>
#include <WiFi.h>

// --- UUIDs (Must match mobile app) ---
#define SERVICE_UUID           "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define WIFI_CHAR_UUID          "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define COMMAND_CHAR_UUID       "deadbeef-1234-5678-9abc-def012345678"
#define EVENT_CHAR_UUID         "abcdef01-1234-5678-9abc-def012345678"

// --- Hardware Pins ---
#define FINGERPRINT_RX 16 // Connect to Sensor TX
#define FINGERPRINT_TX 17 // Connect to Sensor RX

HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

BLEServer *pServer = NULL;
BLECharacteristic *pEventCharacteristic;
bool deviceConnected = false;
bool oldDeviceConnected = false;
int enrollSlot = -1;

// --- Helper Functions ---
void sendEvent(String json) {
  if (deviceConnected) {
    pEventCharacteristic->setValue(json.c_str());
    pEventCharacteristic->notify();
    Serial.println("Sent Event: " + json);
  }
}

void sendStatus(String event, int id = -1, int total = -1, int step = -1, String reason = "") {
  StaticJsonDocument<200> doc;
  doc["event"] = event;
  if (id != -1) doc["id"] = id;
  if (total != -1) doc["total"] = total;
  if (step != -1) doc["step"] = step;
  if (reason != "") doc["reason"] = reason;
  
  String output;
  serializeJson(doc, output);
  sendEvent(output);
}

// --- BLE Callbacks ---
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("Device Connected");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("Device Disconnected");
    }
};

class CommandCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String value = pCharacteristic->getValue().c_str();
      if (value.length() > 0) {
        Serial.print("Received Command: ");
        Serial.println(value);

        StaticJsonDocument<256> doc;
        DeserializationError error = deserializeJson(doc, value);
        if (error) return;

        String cmd = doc["cmd"];
        int id = doc["id"];

        if (cmd == "enroll") {
          enrollSlot = id;
          sendStatus("enroll_start", enrollSlot);
        } else if (cmd == "delete") {
          if (finger.deleteModel(id) == FINGERPRINT_OK) {
            sendStatus("delete_ok", id);
          } else {
            sendStatus("delete_fail", id, -1, -1, "Sensor error");
          }
        } else if (cmd == "clear") {
          if (finger.emptyDatabase() == FINGERPRINT_OK) {
            sendStatus("clear_ok");
          } else {
            sendStatus("clear_fail");
          }
        } else if (cmd == "list") {
          finger.getTemplateCount();
          sendStatus("count", -1, finger.templateCount);
        }
      }
    }
};

uint8_t getFingerprintEnroll() {
  int p = -1;
  sendStatus("place_finger", enrollSlot, -1, 1);
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) continue;
    if (p != FINGERPRINT_OK) return p;
  }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) return p;
  sendStatus("remove_finger");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
  }

  sendStatus("place_finger", enrollSlot, -1, 2);
  p = -1;
  while (p != FINGERPRINT_OK) {
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

// --- Setup & Main Loop ---
void setup() {
  Serial.begin(115200);
  
  // Fingerprint sensor
  mySerial.begin(57600, SERIAL_8N1, FINGERPRINT_RX, FINGERPRINT_TX);
  finger.begin(57600);
  if (finger.verifyPassword()) {
    Serial.println("Found ZW101 fingerprint sensor!");
  } else {
    Serial.println("Did not find fingerprint sensor :(");
  }

  // BLE Setup
  BLEDevice::init("Motorcycle Handlegrip");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // WIFI Characteristic (Placeholder)
  BLECharacteristic *pWifiChar = pService->createCharacteristic(
      WIFI_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);

  // Command Characteristic
  BLECharacteristic *pCmdChar = pService->createCharacteristic(
      COMMAND_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pCmdChar->setCallbacks(new CommandCallbacks());

  // Event Characteristic (Notify)
  pEventCharacteristic = pService->createCharacteristic(
      EVENT_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  pEventCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  // Advertising Configuration
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // set value to help with iPhone connections
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("BLE Ready. Waiting for connection...");
}

void loop() {
  // --- Reconnection Logic ---
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // Give the local bluetooth stack time to clean up
    BLEDevice::startAdvertising(); // restart advertising globally with exact same config
    Serial.println("Bluetooth advertising restarted");
    oldDeviceConnected = deviceConnected;
  }
  
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
    Serial.println("Bluetooth connection recognized");
  }

  if (enrollSlot != -1) {
    getFingerprintEnroll();
    enrollSlot = -1;
  }

  // Active Verification mode
  uint8_t p = finger.getImage();
  if (p == FINGERPRINT_OK) {
    p = finger.image2Tz();
    if (p == FINGERPRINT_OK) {
      p = finger.fingerFastSearch();
      if (p == FINGERPRINT_OK) {
        sendStatus("verify_ok", finger.fingerID);
        delay(2000); // Wait 2s to prevent BLE queue flood
      } else if (p == FINGERPRINT_NOTFOUND) {
        sendStatus("verify_fail");
        delay(1000); // Wait before scanning again
      }
    }
  }
  delay(50); // Small base delay for loop stability
}
