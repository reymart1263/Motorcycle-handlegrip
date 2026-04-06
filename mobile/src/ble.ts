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

// BLE Service & Characteristic UUIDs
export const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
export const WIFI_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
export const COMMAND_CHAR_UUID = "deadbeef-1234-5678-9abc-def012345678";
export const EVENT_CHAR_UUID = "abcdef01-1234-5678-9abc-def012345678";

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

function decodeBase64(input: string): string {
  let str = input.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 == 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (let bc = 0, bs = 0, buffer, i = 0;
    buffer = str.charAt(i++);
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
      bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    buffer = BASE64_CHARS.indexOf(buffer);
  }
  return output;
}

export async function connectToDevice(deviceId: string): Promise<boolean> {
  const m = getBleManager();
  if (!m) return false;
  try {
    m.stopDeviceScan();
    const device = await m.connectToDevice(deviceId, { autoConnect: true });
    await device.discoverAllServicesAndCharacteristics();
    
    // Request a larger MTU to handle JSON strings larger than 20 bytes
    if (Platform.OS === 'android') {
      await device.requestMTU(512);
    }
    
    return true;
  } catch (err) {
    console.error("Failed to connect", err);
    return false;
  }
}

export async function disconnectDevice(deviceId: string): Promise<void> {
  const m = getBleManager();
  if (!m) return;
  try {
    const isConn = await m.isDeviceConnected(deviceId);
    if (isConn) {
      await m.cancelDeviceConnection(deviceId);
    }
  } catch (e) {
    console.warn("Failed to disconnect", e);
  }
}

export async function sendWifiCredentials(deviceId: string, ssid: string, pass: string): Promise<boolean> {
  const m = getBleManager();
  if (!m) return false;

  try {
    const payload = JSON.stringify({ s: ssid, p: pass });
    const base64Data = encodeBase64(payload);
    
    await m.writeCharacteristicWithResponseForDevice(
      deviceId,
      SERVICE_UUID,
      WIFI_CHAR_UUID,
      base64Data
    );
    return true;
  } catch (err) {
    console.error("Failed to write to ESP32 characteristic", err);
    return false;
  }
}

export async function sendBleCommand(deviceId: string, command: object): Promise<boolean> {
  const m = getBleManager();
  if (!m) return false;

  try {
    const payload = JSON.stringify(command);
    const base64Data = encodeBase64(payload);
    
    await m.writeCharacteristicWithResponseForDevice(
      deviceId,
      SERVICE_UUID,
      COMMAND_CHAR_UUID,
      base64Data
    );
    return true;
  } catch (err) {
    console.error("Failed to send command to ESP32", err);
    return false;
  }
}

export async function enrollFingerprint(deviceId: string, id: number): Promise<boolean> {
  return sendBleCommand(deviceId, { cmd: "enroll", id });
}

export async function deleteFingerprint(deviceId: string, id: number): Promise<boolean> {
  return sendBleCommand(deviceId, { cmd: "delete", id });
}

export async function listFingerprints(deviceId: string): Promise<boolean> {
  return sendBleCommand(deviceId, { cmd: "list" });
}

export function monitorFingerprintEvents(
  deviceId: string,
  onEvent: (event: any) => void,
) {
  const m = getBleManager();
  if (!m) return { remove: () => {} };

  let isRemoved = false;
  let subscription: any = null;
  let retryTimeout: any = null;

  const start = async () => {
    if (isRemoved) return;
    try {
      const connected = await m.isDeviceConnected(deviceId);
      if (!connected) {
        retryTimeout = setTimeout(start, 2000);
        return;
      }
      
      subscription = m.monitorCharacteristicForDevice(
        deviceId,
        SERVICE_UUID,
        EVENT_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            if (error.message !== "Operation was cancelled") {
              console.warn("Fingerprint monitoring error:", error.message);
              // Retry monitoring after a small delay in case of transient disconnect
              if (!isRemoved) {
                if (retryTimeout) clearTimeout(retryTimeout);
                retryTimeout = setTimeout(start, 2000);
              }
            }
            return;
          }
          if (characteristic?.value) {
            try {
              const decoded = decodeBase64(characteristic.value);
              const eventData = JSON.parse(decoded);
              onEvent(eventData);
            } catch (e) {
              console.warn("Failed to parse event data", e);
            }
          }
        }
      );
    } catch (err) {
      console.warn("Failed to subscribe to fingerprint characteristic", err);
      if (!isRemoved) {
        if (retryTimeout) clearTimeout(retryTimeout);
        retryTimeout = setTimeout(start, 2000);
      }
    }
  };

  start();

  return {
    remove: () => {
      isRemoved = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (subscription) subscription.remove();
    }
  };
}

export async function resetFingerprintMemory(deviceId: string): Promise<boolean> {
  return sendBleCommand(deviceId, { cmd: "clear" });
}

export function scanAndConnect(
  targetDeviceId: string,
  onConnected: () => void,
  onTimeout: () => void
) {
  const m = getBleManager();
  if (!m) return;

  let found = false;
  startBleScan(async (device) => {
    if (device.id === targetDeviceId && !found) {
      found = true;
      stopBleScan();
      const success = await connectToDevice(device.id);
      if (success) {
        onConnected();
      } else {
        onTimeout();
      }
    }
  });

  setTimeout(() => {
    if (!found) {
      stopBleScan();
      onTimeout();
    }
  }, 15000); // 15s timeout
}
