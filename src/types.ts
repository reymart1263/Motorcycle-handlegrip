export type Screen = 
  | 'setup' 
  | 'bluetooth' 
  | 'hotspot' 
  | 'fingerprintRegistration'
  | 'fingerprintNaming'
  | 'fingerprintVerification'
  | 'passwordCreation' 
  | 'emailRegistration' 
  | 'dashboard'
  | 'editUserInfo'
  | 'manageFingerprint'
  | 'renameFingerprint'
  | 'verifyPassword'
  | 'changePassword'
  | 'userFingerprints'
  | 'renameUser'
  | 'profileOptions'
  | 'whoseFingerprint'
  | 'forgotPasswordConfirmation'
  | 'terminated';

export type VerificationAction = 
  | 'saveUserInfo' 
  | 'deleteFingerprint' 
  | 'resetFingerprintMemory'
  | 'changePassword'
  | 'accessHomepage'
  | 'deleteProfile'
  | 'login';

export interface Device {
  id: string;
  name: string;
  connected: boolean;
}

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
