import { NativeModules, Platform, PermissionsAndroid } from "react-native";
import { BleManager, Device, State } from "react-native-ble-plx";

let manager: BleManager | null = null;

export function getBleManager(): BleManager | null {
  if (!manager) {
    try {
      manager = new BleManager();
    } catch (err) {
      console.warn("BleManager not available: Native module is null. Are you using Expo Go?");
      return null;
    }
  }
  return manager;
}

export type ScannedBleDevice = {
  id: string;
  name: string | null;
  rssi: number | null;
  mtu: number | null;
};

/** Android: Bluetooth + (location on older APIs). iOS: handled by system when scanning. */
export async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const api = typeof Platform.Version === "number" ? Platform.Version : 0;

  if (api >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }

  const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return fine === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getBluetoothState(): Promise<State> {
  const m = getBleManager();
  if (!m) return "Unknown" as State;
  return m.state();
}

export function deviceToRow(device: Device): ScannedBleDevice {
  return {
    id: device.id,
    name: device.name ?? device.localName ?? null,
    rssi: device.rssi ?? null,
    mtu: device.mtu ?? null,
  };
}

export function startBleScan(
  onDevice: (device: ScannedBleDevice) => void,
  onError?: (message: string) => void,
): void {
  const m = getBleManager();
  if (!m) {
    onError?.("BLE is not supported on this device/environment (e.g. Expo Go). Use a Dev Client or physical device.");
    return;
  }
  m.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
    if (error) {
      onError?.(error.message);
      return;
    }
    if (device) {
      onDevice(deviceToRow(device));
    }
  });
}

export function stopBleScan(): void {
  getBleManager()?.stopDeviceScan();
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function encodeBase64(input: string): string {
  let str = input;
  let output = '';
  for (let block = 0, charCode, i = 0, map = BASE64_CHARS;
  str.charAt(i | 0) || (map = '=', i % 1);
  output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3/4);
    if (charCode > 0xFF) {
      console.warn("btoa failed: characters outside Latin1");
    }
    block = block << 8 | charCode;
  }
  return output;
}

export async function connectToDevice(deviceId: string): Promise<boolean> {
  const m = getBleManager();
  if (!m) return false;
  try {
    m.stopDeviceScan();
    const device = await m.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
    return true;
  } catch (err) {
    console.error("Failed to connect", err);
    return false;
  }
}

export async function sendWifiCredentials(deviceId: string, ssid: string, pass: string): Promise<boolean> {
  const m = getBleManager();
  if (!m) return false;

  // Typical UUIDs used in ESP32 tutorials. These should match your ESP32 Arduino sketch.
  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  try {
    const payload = JSON.stringify({ s: ssid, p: pass });
    const base64Data = encodeBase64(payload);
    
    await m.writeCharacteristicWithResponseForDevice(
      deviceId,
      SERVICE_UUID,
      CHAR_UUID,
      base64Data
    );
    return true;
  } catch (err) {
    console.error("Failed to write to ESP32 characteristic", err);
    return false;
  }
}

export function monitorFingerprintVerification(
  deviceId: string,
  onVerified: () => void,
) {
  const m = getBleManager();
  if (!m) return { remove: () => {} };

  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"; 
  const CHAR_UUID_FINGERPRINT = "abcdef01-1234-5678-9abc-def012345678"; // Define a characteristic for the fingerprint module

  try {
    const subscription = m.monitorCharacteristicForDevice(
      deviceId,
      SERVICE_UUID,
      CHAR_UUID_FINGERPRINT,
      (error, characteristic) => {
        if (error) {
          console.warn("Fingerprint monitoring error:", error.message);
          return;
        }
        if (characteristic?.value) {
          onVerified();
        }
      }
    );
    return subscription;
  } catch (err) {
    console.warn("Failed to subscribe to fingerprint characteristic", err);
    return { remove: () => {} };
  }
}
