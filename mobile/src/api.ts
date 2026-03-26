import { ApiState } from "./types";

// Android emulator cannot reach localhost from the emulator VM.
const DEFAULT_BASE_URL = "http://10.0.2.2:3000";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;

export async function fetchRemoteState(): Promise<ApiState | null> {
  const response = await fetch(`${API_BASE_URL}/api/state`);
  if (!response.ok) return null;
  return (await response.json()) as ApiState;
}

export async function pushRemoteState(payload: ApiState): Promise<void> {
  await fetch(`${API_BASE_URL}/api/state`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
