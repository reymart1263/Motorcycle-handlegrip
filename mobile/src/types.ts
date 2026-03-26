export type Screen =
  | "setup"
  | "bluetooth"
  | "hotspot"
  | "fingerprintRegistration"
  | "fingerprintNaming"
  | "fingerprintVerification"
  | "passwordCreation"
  | "emailRegistration"
  | "dashboard";

export interface User {
  name: string;
  email: string;
  password?: string;
}

export interface FingerprintData {
  id: string;
  name: string;
  userId: string;
  slot: number;
}

export interface ApiState {
  user: User;
  usersList: Array<{ id: string; name: string; email: string }>;
  fingerprints: FingerprintData[];
}
