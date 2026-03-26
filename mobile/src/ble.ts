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
