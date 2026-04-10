/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Bike, 
  Wifi, 
  Bluetooth as BluetoothIcon, 
  Lock, 
  ChevronRight, 
  ArrowLeft, 
  MapPin, 
  User as UserIcon, 
  Fingerprint, 
  Settings,
  Plus,
  Trash2,
  LogOut,
  Smartphone,
  Pencil,
  Check,
  X,
  Eye,
  EyeOff,
  Mail
} from 'lucide-react';
import { Screen, Device, User, FingerprintData, VerificationAction, PersistedAppState } from './types';

// --- Components ---

const Header = ({ title, onBack }: { title: string; onBack?: () => void }) => (
  <div className="px-6 pt-8 pb-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
      )}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </div>
  </div>
);

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`w-14 h-8 rounded-full transition-colors relative ${enabled ? 'bg-black' : 'bg-zinc-200'}`}
  >
    <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
  </button>
);

// --- Screens ---

const SetupScreen = ({ onNext }: { onNext: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
    <div className="mb-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Connect</h1>
      <p className="text-zinc-900 font-bold text-lg leading-tight">Secure your ride, your way.</p>
    </div>
    <div className="relative mb-12">
      <div className="w-32 h-32 bg-zinc-100 rounded-full flex items-center justify-center">
        <Shield size={64} className="text-black" />
      </div>
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 border-2 border-zinc-200 rounded-full -m-4" 
      />
      <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl">
        <Bike size={32} />
      </div>
      <div className="absolute -top-2 -left-2 bg-white p-3 rounded-2xl shadow-xl">
        <Wifi size={32} className="text-zinc-900" />
      </div>
    </div>
    <p className="text-zinc-500 mb-12 font-medium">Connect your device and complete the set up</p>
    <button onClick={onNext} className="btn-primary">
      Connect
    </button>
  </div>
);

const FingerprintRegistrationScreen = ({ onBack, onNext, onSkip }: { onBack: () => void; onNext: () => void; onSkip: () => void }) => {
  const [placements, setPlacements] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const totalRequired = 5;

  // Simulate hardware interaction for the demo
  useEffect(() => {
    if (placements < totalRequired) {
      const timer = setTimeout(() => {
        setIsScanning(true);
        const scanTimer = setTimeout(() => {
          setIsScanning(false);
          setPlacements(prev => prev + 1);
        }, 1200);
        return () => clearTimeout(scanTimer);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(onNext, 1500);
      return () => clearTimeout(timer);
    }
  }, [placements, onNext]);

  const progress = (placements / totalRequired) * 100;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header title="Fingerprint Registration" onBack={onBack} />
      <div className="px-6 flex-1 flex flex-col items-center justify-between pb-8 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold mb-1">Fingerprint Registration</h2>
            <p className="text-zinc-500 text-sm px-4 leading-tight">
              Place your finger on the throttle for {totalRequired - placements} {totalRequired - placements > 1 ? 'times' : 'time'} until registration is complete.
            </p>
          </div>

          <div className="relative mb-6 scale-90 sm:scale-100">
            <div className="w-40 h-40 rounded-full border-4 border-zinc-100 flex items-center justify-center relative overflow-hidden">
              <Fingerprint 
                size={64} 
                className={`transition-colors duration-500 ${isScanning ? 'text-emerald-500' : placements > 0 ? 'text-black' : 'text-zinc-200'}`} 
              />
              {progress > 0 && (
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${progress}%` }}
                  className="absolute bottom-0 left-0 right-0 bg-black/5 pointer-events-none"
                />
              )}
            </div>
            
            <svg className="absolute inset-0 -m-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="84"
                fill="none"
                stroke="#f4f4f5"
                strokeWidth="6"
              />
              <motion.circle
                cx="88"
                cy="88"
                r="84"
                fill="none"
                stroke="black"
                strokeWidth="6"
                strokeDasharray="527"
                animate={{ strokeDashoffset: 527 - (527 * progress) / 100 }}
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="bg-zinc-50 p-4 rounded-2xl text-center max-w-xs border border-zinc-100 mb-4">
            <p className="text-xs text-zinc-600 leading-relaxed">
              Please use the <span className="font-bold text-black">throttle hardware</span> to scan your fingerprint. 
              The registration process happens directly on the device, not on your phone screen.
            </p>
          </div>

          <div className="h-6 flex items-center justify-center">
            {placements === totalRequired ? (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
              >
                <Check size={18} />
                Registration Complete!
              </motion.div>
            ) : isScanning ? (
              <motion.div 
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex items-center gap-2 text-emerald-500 font-bold text-sm"
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                Scanning hardware...
              </motion.div>
            ) : (
              <p className="text-zinc-400 text-sm font-medium animate-pulse">Waiting for placement on throttle...</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 mt-auto">
          <div className="flex gap-2">
            {Array.from({ length: totalRequired }).map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-all duration-500 ${i < placements ? 'bg-black scale-110' : 'bg-zinc-200'}`} 
              />
            ))}
          </div>

          <button 
            onClick={onSkip}
            className="text-zinc-400 font-bold text-sm hover:text-black transition-colors"
          >
            Setup Later
          </button>
        </div>
      </div>
    </div>
  );
};

const FingerprintNamingScreen = ({ 
  onBack, 
  onSave, 
  onSkip,
  defaultName,
  slot
}: { 
  onBack: () => void; 
  onSave: (name: string) => void; 
  onSkip: () => void;
  defaultName: string;
  slot?: number;
}) => {
  const [name, setName] = useState('');

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Name Fingerprint" onBack={onBack} />
      <div className="px-6 flex-1 flex flex-col">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Fingerprint size={48} className="text-black" />
          </div>
          <h2 className="text-xl font-bold mb-2">Give it a name</h2>
          <p className="text-zinc-500">
            Helpful for identifying which finger is registered (e.g., "Right Thumb").
          </p>
          {slot && (
            <p className="mt-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Registering to Slot {slot}
            </p>
          )}
        </div>

        <div className="space-y-2 mb-8">
          <label className="text-xs font-bold text-zinc-400 uppercase px-1">Fingerprint Name</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder={defaultName}
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            autoFocus
          />
        </div>

        <div className="mt-auto pb-10 space-y-4">
          <button 
            onClick={() => onSave(name || defaultName)}
            className="btn-primary"
          >
            Save Name
          </button>
          <button 
            onClick={onSkip}
            className="w-full py-4 text-zinc-400 font-bold hover:text-black transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

const FingerprintVerificationScreen = ({ onBack, onVerify }: { onBack: () => void; onVerify: () => void }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const startScan = () => {
    setIsScanning(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => onVerify(), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Verification" onBack={onBack} />
      <div className="px-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-10">
          <div className="w-32 h-32 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Fingerprint size={64} className={isScanning ? "text-emerald-500" : "text-zinc-300"} />
            {isScanning && (
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * progress) / 100}
                  className="transition-all duration-200"
                />
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-3">Verify Identity</h2>
          <p className="text-zinc-500 max-w-[240px] mx-auto">
            Place your registered finger on the sensor to access the homepage.
          </p>
        </div>

        {!isScanning ? (
          <button 
            onClick={startScan}
            className="btn-primary"
          >
            Start Verification
          </button>
        ) : (
          <div className="w-full max-w-[200px] h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-200" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const PasswordCreationScreen = ({ onBack, onNext }: { onBack: () => void; onNext: (pass: string) => void }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[*!@#$%^&()]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const isLongEnough = password.length >= 8;
  const isStrong = hasNumber && hasSymbol && hasUpper && hasLower && isLongEnough;
  const matches = password === confirmPassword && password.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Password Creation" onBack={onBack} />
      <div className="px-6 flex-1 flex flex-col items-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mb-6">
          <Lock size={32} />
        </div>
        <p className="text-zinc-500 mb-6 text-center text-sm">Create a secure password for your account</p>
        
        <div className="w-full space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter password" 
                className="input-field pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 px-1">
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-1 h-1 rounded-full ${isLongEnough ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                <span className={isLongEnough ? 'text-emerald-600' : 'text-zinc-400'}>8+ characters</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-1 h-1 rounded-full ${hasNumber ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                <span className={hasNumber ? 'text-emerald-600' : 'text-zinc-400'}>Numbers</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-1 h-1 rounded-full ${hasSymbol ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                <span className={hasSymbol ? 'text-emerald-600' : 'text-zinc-400'}>Symbols (* or !)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-1 h-1 rounded-full ${(hasUpper && hasLower) ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                <span className={(hasUpper && hasLower) ? 'text-emerald-600' : 'text-zinc-400'}>Upper & Lowercase</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Confirm New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Confirm password" 
                className="input-field pr-12"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {confirmPassword && !matches && (
              <p className="text-[10px] text-red-500 px-1">Passwords do not match</p>
            )}
          </div>

          <button 
            onClick={() => onNext(password.trim())} 
            disabled={!isStrong || !matches}
            className="btn-primary mt-4"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const EmailRegistrationScreen = ({ onBack, onNext }: { onBack: () => void; onNext: (email: string) => void }) => {
  const [email, setEmail] = useState('');

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Email Registration" onBack={onBack} />
      <div className="px-6 flex-1">
        <div className="space-y-6 mb-12">
          <input 
            type="email" 
            placeholder="Email address" 
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-zinc-400 text-center px-4">
            By continuing, you agree to our <span className="text-black underline">Terms of Service</span> & <span className="text-black underline">Privacy Policy</span>
          </p>
          <button 
            onClick={() => onNext(email)} 
            disabled={!email.includes('@')}
            className="btn-primary"
          >
            Continue
          </button>
        </div>

        <div className="relative mb-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-zinc-400">Or continue with</span>
          </div>
        </div>

        <div className="space-y-4">
          <button className="btn-secondary flex items-center justify-center gap-3">
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>
          <button className="btn-secondary flex items-center justify-center gap-3">
            <div className="w-5 h-5 bg-[#00a4ef] flex items-center justify-center rounded-sm">
              <div className="grid grid-cols-2 gap-[1px]">
                <div className="w-1.5 h-1.5 bg-white opacity-80" />
                <div className="w-1.5 h-1.5 bg-white opacity-80" />
                <div className="w-1.5 h-1.5 bg-white opacity-80" />
                <div className="w-1.5 h-1.5 bg-white opacity-80" />
              </div>
            </div>
            Continue with Microsoft
          </button>
        </div>
      </div>
    </div>
  );
};

const ForgotPasswordConfirmationScreen = ({ onBackToHome }: { onBackToHome: () => void }) => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-8">
          <Mail size={32} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold mb-4">Check Your Email</h2>
        <p className="text-zinc-500 mb-12 max-w-[280px]">
          A confirmation email has been sent to your registered email.
        </p>
        <button 
          onClick={onBackToHome} 
          className="btn-primary"
        >
          Back to Homepage
        </button>
      </div>
    </div>
  );
};

const TerminatedScreen = () => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mb-8">
          <LogOut size={32} className="text-zinc-400" />
        </div>
        <h2 className="text-xl font-bold mb-4">Session Terminated</h2>
        <p className="text-zinc-500 mb-8 max-w-[280px]">
          Your session has been securely closed. You can now safely close this window.
        </p>
        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Backend Signal Received
          </p>
        </div>
      </div>
    </div>
  );
};

const VerifyPasswordScreen = ({ 
  currentPassword,
  onBack, 
  onVerify,
  onForgotPassword,
  hasEmail
}: { 
  currentPassword?: string;
  onBack: () => void; 
  onVerify: (pass: string) => void;
  onForgotPassword: () => void;
  hasEmail: boolean;
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleVerify = () => {
    if (currentPassword) {
      if (password.trim() === currentPassword.trim()) {
        onVerify(password.trim());
      } else {
        setError(true);
      }
    } else if (password.length >= 6) {
      onVerify(password);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Verify Password" onBack={onBack} />
      <div className="px-6 flex-1 flex flex-col items-center pt-12">
        <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mb-8">
          <Lock size={32} className="text-zinc-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">Security Check</h2>
        <p className="text-zinc-500 mb-8 text-center">Please enter your password to confirm this action</p>
        
        <div className="w-full space-y-4">
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Enter password" 
              className={`input-field pr-12 ${error ? 'ring-2 ring-red-500' : ''}`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              autoFocus
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 px-2">Incorrect password. Please try again.</p>}
          <button 
            onClick={handleVerify} 
            className="btn-primary mt-4"
          >
            Verify & Continue
          </button>
          
          <button 
            onClick={onForgotPassword}
            disabled={!hasEmail}
            className={`w-full py-4 text-sm font-medium transition-colors ${
              hasEmail ? 'text-zinc-500 hover:text-black' : 'text-zinc-300 cursor-not-allowed'
            }`}
          >
            Forgot Password?
          </button>
          {!hasEmail && (
            <p className="text-[10px] text-zinc-400 text-center">
              Please register an email address to use this feature.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const BluetoothScreen = ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => {
  const [hasWebBluetooth, setHasWebBluetooth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Array<{ id: string; name: string | null }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setHasWebBluetooth(typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!navigator.bluetooth);
  }, []);

  useEffect(() => {
    return () => {
      scanCleanupRef.current?.();
      scanCleanupRef.current = null;
    };
  }, []);

  const chooseDevice = async () => {
    if (!navigator.bluetooth) return;
    setError(null);
    scanCleanupRef.current?.();
    scanCleanupRef.current = null;
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [],
      });
      setDevices([{ id: device.id, name: device.name ?? null }]);
      setSelectedId(device.id);
    } catch (e) {
      const err = e as Error;
      if (err.name === 'NotFoundError') return;
      setError(err.message || 'Could not open Bluetooth device picker.');
    }
  };

  const startLiveScan = async () => {
    if (!navigator.bluetooth) return;
    setError(null);
    setDevices([]);
    setSelectedId(null);
    scanCleanupRef.current?.();
    scanCleanupRef.current = null;

    const nav = navigator.bluetooth as Bluetooth & {
      requestLEScan?: (options: { acceptAllAdvertisements?: boolean }) => Promise<{ stop: () => void; active: boolean }>;
    };

    if (typeof nav.requestLEScan !== 'function') {
      setError('Live BLE scanning is not supported in this browser. Use “Search with system picker” or the native mobile app for full scanning.');
      return;
    }

    try {
      const scan = await nav.requestLEScan({ acceptAllAdvertisements: true });
      const seen = new Map<string, { id: string; name: string | null }>();

      const onAdv = (event: Event) => {
        const ev = event as { device?: BluetoothDevice };
        const d = ev.device;
        if (!d) return;
        seen.set(d.id, { id: d.id, name: d.name ?? null });
        setDevices(Array.from(seen.values()));
      };

      navigator.bluetooth.addEventListener('advertisementreceived', onAdv);
      setScanning(true);

      scanCleanupRef.current = () => {
        navigator.bluetooth?.removeEventListener('advertisementreceived', onAdv);
        scan.stop();
        setScanning(false);
      };
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'BLE scan failed. Try the system picker instead.');
    }
  };

  const stopLiveScan = () => {
    scanCleanupRef.current?.();
    scanCleanupRef.current = null;
    setScanning(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Bluetooth Pairing" onBack={onBack} />
      <div className="px-6 flex-1 flex flex-col pb-8">
        {!hasWebBluetooth && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-900 leading-relaxed">
            Web Bluetooth is not available here. Use <span className="font-bold">Chrome or Edge</span> on desktop or Android, served over <span className="font-bold">https</span> or <span className="font-bold">localhost</span>. For continuous BLE scanning, use the native mobile app.
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl mb-6">
          <div className="flex items-center gap-4">
            <BluetoothIcon size={24} className={hasWebBluetooth ? 'text-blue-500' : 'text-zinc-400'} />
            <span className="font-medium">Bluetooth</span>
          </div>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {hasWebBluetooth ? 'Ready' : 'Unavailable'}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          <button
            type="button"
            disabled={!hasWebBluetooth}
            onClick={chooseDevice}
            className="w-full py-4 bg-black text-white font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Search with system picker
          </button>
          <p className="text-[11px] text-zinc-500 text-center px-2">
            Opens the browser/OS Bluetooth chooser — these are real devices the system can see.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasWebBluetooth}
              onClick={startLiveScan}
              className="flex-1 py-3 bg-zinc-100 text-zinc-900 font-bold rounded-xl text-sm disabled:opacity-40"
            >
              Scan nearby (BLE)
            </button>
            <button
              type="button"
              disabled={!scanning}
              onClick={stopLiveScan}
              className="flex-1 py-3 bg-zinc-900 text-white font-bold rounded-xl text-sm disabled:opacity-40"
            >
              Stop scan
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 text-center px-2">
            Live BLE scan works only in browsers that support <span className="font-mono">requestLEScan</span> (often Chrome on Android). iOS Safari does not support Web Bluetooth.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-4 min-h-[120px]">
          <div className="relative mb-6">
            <Smartphone size={64} className="text-zinc-200" />
            {scanning && (
              <>
                <motion.div 
                  animate={{ scale: [1, 2], opacity: [1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 border-2 border-blue-500 rounded-full -m-4" 
                />
                <motion.div 
                  animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 border-2 border-blue-400 rounded-full -m-8" 
                />
              </>
            )}
          </div>
          <p className="text-zinc-500 text-sm text-center">
            {scanning ? 'Scanning for BLE advertisements…' : devices.length ? `${devices.length} device(s) seen` : 'Search for a device to continue'}
          </p>
        </div>

        {devices.length > 0 && (
          <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
            {devices.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-colors ${
                  selectedId === d.id ? 'border-black bg-zinc-50' : 'border-zinc-100 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                    <Bike size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{d.name || '(No name)'}</p>
                    <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[220px]">{d.id}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto space-y-3">
          <button
            type="button"
            disabled={!selectedId}
            onClick={onNext}
            className="w-full py-4 bg-black text-white font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const HotspotScreen = ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => {
  const [isWifiOn, setIsWifiOn] = useState(true);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Hotspot Connection" onBack={onBack} />
      <div className="px-6 flex-1">
        <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl mb-8">
          <div className="flex items-center gap-4">
            <Wifi size={24} className={isWifiOn ? 'text-emerald-500' : 'text-zinc-400'} />
            <span className="font-medium">WiFi Hotspot</span>
          </div>
          <Toggle enabled={isWifiOn} onChange={setIsWifiOn} />
        </div>

        <div className="flex justify-center gap-8 items-center mb-12">
          <Smartphone size={48} className="text-zinc-300" />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-2 h-2 rounded-full bg-zinc-300"
              />
            ))}
          </div>
          <Bike size={48} className="text-zinc-300" />
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-500 px-1">Searching for available hotspots...</p>
          <input 
            type="text" 
            placeholder="Hotspot Name" 
            className="input-field"
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="pt-4">
            <button 
              onClick={onNext} 
              disabled={!ssid || !password}
              className="btn-primary"
            >
              Connect to Hotspot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditUserInfoScreen = ({ 
  user, 
  onBack, 
  onSave, 
  onEditPassword 
}: { 
  user: User; 
  onBack: () => void; 
  onSave: (u: User) => void;
  onEditPassword: () => void;
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) {
      setError("User name cannot be blank. Please enter a valid name.");
      return;
    }
    setError(null);
    onSave({ ...user, name: name.trim(), email });
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Edit User Info" onBack={onBack} />
      <div className="px-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-pulse">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase px-1">Full Name</label>
          <input 
            type="text" 
            className={`input-field ${error ? 'border-red-300 bg-red-50/30' : ''}`} 
            value={name} 
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setError(null);
            }} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase px-1">Email Address</label>
          <input 
            type="email" 
            className="input-field" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase px-1">Password</label>
          <div className="flex gap-3">
            <input 
              type="text" 
              className="input-field flex-1 bg-zinc-50 text-zinc-400" 
              value="******" 
              readOnly 
            />
            <button 
              onClick={onEditPassword}
              className="px-4 bg-zinc-100 text-zinc-900 rounded-2xl text-xs font-bold whitespace-nowrap"
            >
              Edit Password
            </button>
          </div>
        </div>
        
        <div className="flex gap-4 mt-8">
          <button 
            onClick={onBack}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="btn-primary flex-1"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const ChangePasswordScreen = ({ onBack, onSave }: { onBack: () => void; onSave: (pass: string) => void }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[*!@#$%^&()]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const isLongEnough = password.length >= 8;
  const isStrong = hasNumber && hasSymbol && hasUpper && hasLower && isLongEnough;
  const matches = password === confirmPassword && password.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      <Header title="New Password" onBack={onBack} />
      <div className="px-6 space-y-6">
        <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Lock size={32} className="text-zinc-400" />
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter new password" 
                className="input-field pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div className="bg-zinc-50 p-3 rounded-xl space-y-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase">Security Requirements:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <div className={`w-1 h-1 rounded-full ${isLongEnough ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                  <span className={isLongEnough ? 'text-emerald-600' : 'text-zinc-400'}>8+ characters</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <div className={`w-1 h-1 rounded-full ${hasNumber ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                  <span className={hasNumber ? 'text-emerald-600' : 'text-zinc-400'}>Numbers</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <div className={`w-1 h-1 rounded-full ${hasSymbol ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                  <span className={hasSymbol ? 'text-emerald-600' : 'text-zinc-400'}>Symbols (* or !)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <div className={`w-1 h-1 rounded-full ${(hasUpper && hasLower) ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                  <span className={(hasUpper && hasLower) ? 'text-emerald-600' : 'text-zinc-400'}>Upper & Lowercase</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase px-1">Confirm New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Confirm new password" 
                className="input-field pr-12"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {confirmPassword && !matches && (
              <p className="text-[10px] text-red-500 px-1">Passwords do not match</p>
            )}
          </div>
        </div>

        <button 
          onClick={() => onSave(password.trim())} 
          disabled={!isStrong || !matches}
          className="btn-primary mt-4"
        >
          Update Password
        </button>
      </div>
    </div>
  );
};

const ProfileOptionsScreen = ({ 
  user, 
  onBack, 
  onRename, 
  onManageFingerprints, 
  onDelete 
}: { 
  user: { id: string, name: string }, 
  onBack: () => void, 
  onRename: () => void, 
  onManageFingerprints: () => void, 
  onDelete: () => void 
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <Header title="Profile Options" onBack={onBack} />
      <div className="px-6 space-y-4">
        <div className="bg-zinc-50 p-6 rounded-3xl flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <UserIcon size={40} className="text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold">{user.name}</h2>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Fingerprint Profile</p>
        </div>

        <button 
          onClick={onRename}
          className="w-full p-5 bg-white border border-zinc-100 rounded-2xl flex items-center gap-4 hover:bg-zinc-50 transition-colors"
        >
          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
            <Pencil size={20} />
          </div>
          <div className="text-left">
            <p className="font-bold">Edit User Name</p>
            <p className="text-xs text-zinc-400">Change the display name</p>
          </div>
        </button>

        <button 
          onClick={onManageFingerprints}
          className="w-full p-5 bg-white border border-zinc-100 rounded-2xl flex items-center gap-4 hover:bg-zinc-50 transition-colors"
        >
          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
            <Fingerprint size={20} />
          </div>
          <div className="text-left">
            <p className="font-bold">Manage Fingerprints</p>
            <p className="text-xs text-zinc-400">Rename or rescan fingerprints</p>
          </div>
        </button>

        <div className="pt-4">
          <button 
            onClick={onDelete}
            className="w-full p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 hover:bg-red-100 transition-colors group"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-red-200 transition-colors">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <div className="text-left">
              <p className="font-bold text-red-600">Delete Profile</p>
              <p className="text-xs text-red-400">Remove this user and all data</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const WhoseFingerprintScreen = ({ 
  users, 
  onBack, 
  onAssign 
}: { 
  users: { id: string, name: string }[], 
  onBack: () => void, 
  onAssign: (userId: string | 'new') => void 
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <Header title="Assign Fingerprint" onBack={onBack} />
      <div className="px-6 flex-1">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Whose fingerprint is this?</h2>
          <p className="text-zinc-500 text-sm">Assign this new fingerprint to a profile.</p>
        </div>

        <div className="space-y-3">
          {users.map((u) => (
            <button 
              key={u.id}
              onClick={() => onAssign(u.id)}
              className="w-full p-5 bg-zinc-50 rounded-2xl flex items-center justify-between hover:bg-zinc-100 transition-colors border border-transparent active:border-zinc-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <UserIcon size={20} className="text-zinc-600" />
                </div>
                <span className="font-bold">{u.name}</span>
              </div>
              <ChevronRight size={20} className="text-zinc-300" />
            </button>
          ))}

          {users.length < 3 && (
            <button 
              onClick={() => onAssign('new')}
              className="w-full p-5 bg-white border-2 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 hover:text-black hover:border-black transition-all"
            >
              <Plus size={20} />
              <span className="font-bold">Add to New Profile</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const DashboardScreen = ({ 
  user, 
  fingerprints, 
  usersList,
  onEditProfile, 
  onProfileOptions,
  onAddFingerprint, 
  onResetFingerprints, 
  onResetApp,
  onLogout,
  onManageUserFingerprints
}: { 
  user: User; 
  fingerprints: FingerprintData[]; 
  usersList: { id: string, name: string, email: string }[];
  onEditProfile: () => void;
  onProfileOptions: (userId: string) => void;
  onAddFingerprint: () => void; 
  onResetFingerprints: () => void;
  onResetApp: () => void;
  onLogout: () => void;
  onManageUserFingerprints: (userId: string) => void;
}) => {

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Homepage</h1>
        <button 
          onClick={onLogout} 
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors"
        >
          <LogOut size={18} /> Exit
        </button>
      </div>

      <div className="px-6 flex-1 overflow-y-auto pb-12">
        {/* Location */}
        <div className="bg-zinc-50 p-6 rounded-3xl mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <MapPin size={20} className="text-zinc-600" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 font-medium">Current Location</p>
                <p className="font-bold text-sm">40.7128° N, 74.0060° W</p>
              </div>
            </div>
          </div>
          <button className="w-full py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold shadow-sm active:scale-[0.98] transition-all">
            Track Location
          </button>
        </div>

        {/* User Info */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h4 className="font-bold">User Information</h4>
          </div>
          <div className="bg-zinc-50 p-5 rounded-3xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center">
                <UserIcon size={24} className="text-zinc-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold">{user.name}</p>
                  <button 
                    onClick={onEditProfile} 
                    className="p-1 text-zinc-400 hover:text-black transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="text-xs text-zinc-400">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fingerprint Access */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-6 px-1">
            <h4 className="font-bold">Fingerprint Access</h4>
          </div>
          
          <div className="space-y-3">
            {usersList.map((fUser) => (
              <div 
                key={fUser.id}
                className="w-full bg-zinc-50 p-5 rounded-2xl flex items-center justify-between group border border-transparent"
              >
                <button 
                  onClick={() => onManageUserFingerprints(fUser.id)}
                  className="flex items-center gap-4 flex-1 text-left"
                >
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <UserIcon size={20} className="text-zinc-600" />
                  </div>
                  <div>
                    <span className="block font-bold text-base">{fUser.name}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tap to manage access</span>
                  </div>
                </button>
                <button 
                  onClick={() => onProfileOptions(fUser.id)}
                  className="p-2 bg-white rounded-lg shadow-sm hover:bg-zinc-100 transition-colors"
                >
                  <Pencil size={16} className="text-zinc-400 group-hover:text-black transition-colors" />
                </button>
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => onAddFingerprint()}
            disabled={usersList.length >= 3}
            className={`w-full mt-8 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all ${
              usersList.length >= 3 
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none' 
                : 'bg-black text-white shadow-black/10'
            }`}
          >
            <Plus size={18} /> Add Fingerprint
          </button>

          <div className="mt-12 pt-8 border-t border-zinc-100">
            <button 
              onClick={onResetFingerprints}
              className="w-full py-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Reset Fingerprint Memory
            </button>
            <button 
              onClick={onResetApp}
              className="w-full py-2 mt-2 text-zinc-300 text-[10px] font-bold uppercase tracking-widest hover:text-zinc-500 transition-colors"
            >
              System Reset (Testing Only)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserFingerprintsScreen = ({ 
  fUser, 
  fingerprints, 
  onBack, 
  onEditFingerprint, 
  onAddFingerprint
}: { 
  fUser: { id: string, name: string }, 
  fingerprints: FingerprintData[], 
  onBack: () => void,
  onEditFingerprint: (id: string) => void,
  onAddFingerprint: (userId: string, slot: number) => void
}) => {
  const userFingerprints = fingerprints.filter(fp => fp.userId === fUser.id);
  const slots = Array.from({ length: 5 }, (_, i) => {
    return userFingerprints.find(fp => fp.slot === i + 1) || null;
  });

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="flex-1 flex flex-col">
      <Header title={`${fUser.name}'s Access`} onBack={onBack} />
      <div className="px-6 flex-1 flex flex-col">
        <div className="mb-8">
          <p className="text-zinc-500 text-[11px] mb-4 px-1">
            Manage up to 5 fingerprints for this user. Swipe to browse slots.
          </p>
          
          <div className="relative overflow-hidden px-1">
            <motion.div 
              drag="x"
              dragConstraints={{ left: - (slots.length - 1) * 240, right: 0 }}
              onDragEnd={(_, info) => {
                const offset = info.offset.x;
                const velocity = info.velocity.x;
                
                if (offset < -50 || velocity < -500) {
                  if (activeIndex < slots.length - 1) setActiveIndex(prev => prev + 1);
                } else if (offset > 50 || velocity > 500) {
                  if (activeIndex > 0) setActiveIndex(prev => prev - 1);
                }
              }}
              animate={{ x: -activeIndex * 240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex gap-4 pb-4 cursor-grab active:cursor-grabbing"
            >
              {slots.map((fp, index) => (
                <div 
                  key={fp ? fp.id : `slot-${index}`}
                  className="flex-shrink-0 w-56"
                >
                  <div className={`h-64 rounded-[24px] border-2 flex flex-col items-center justify-center p-5 transition-all ${
                    fp ? 'bg-zinc-50 border-transparent shadow-sm' : 'bg-white border-dashed border-zinc-200'
                  }`}>
                    <div className="mb-3">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${fp ? 'bg-white shadow-md' : 'bg-zinc-50'}`}>
                        <Fingerprint size={28} className={fp ? 'text-black' : 'text-zinc-200'} />
                      </div>
                    </div>
                    
                    <h3 className="text-base font-bold mb-1 truncate w-full text-center px-2">
                      {fp ? fp.name : `Slot ${index + 1}`}
                    </h3>
                    <p className="text-zinc-400 text-[10px] mb-5 text-center font-medium">
                      {fp ? 'Registered' : 'Empty Slot'}
                    </p>

                    {fp ? (
                      <button 
                        onClick={() => onEditFingerprint(fp.id)}
                        className="w-full py-2.5 bg-black text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 active:scale-[0.95] transition-all"
                      >
                        <Settings size={14} /> Manage
                      </button>
                    ) : (
                      <button 
                        onClick={() => onAddFingerprint(fUser.id, index + 1)}
                        className="w-full py-2.5 bg-zinc-100 text-zinc-900 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 active:scale-[0.95] transition-all"
                      >
                        <Plus size={14} /> Register
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
            
            {/* Swipe Indicator */}
            <div className="flex justify-center gap-1.5 mt-2">
              {slots.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-black w-4' : 'bg-zinc-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RenameUserScreen = ({ 
  user, 
  index,
  onBack, 
  onSave
}: { 
  user: { id: string, name: string }; 
  index: number;
  onBack: () => void; 
  onSave: (name: string) => void;
}) => {
  const [name, setName] = useState(user.name);

  const handleSave = () => {
    const finalName = name.trim() || `User ${index + 1}`;
    onSave(finalName);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Rename User" onBack={onBack} />
      <div className="px-6 space-y-6">
        <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <UserIcon size={48} className="text-zinc-400" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase px-1">User Name</label>
          <input 
            type="text" 
            className="input-field" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder={`User ${index + 1}`}
            autoFocus
          />
        </div>
        <div className="space-y-4 pt-4">
          <button 
            onClick={handleSave}
            className="btn-primary"
          >
            Save Name
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageFingerprintScreen = ({ 
  fingerprint, 
  onBack, 
  onRename,
  onRescan,
  onDelete
}: { 
  fingerprint: FingerprintData; 
  onBack: () => void; 
  onRename: () => void;
  onRescan: () => void;
  onDelete: () => void;
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <Header title="Manage Fingerprint" onBack={onBack} />
      <div className="px-6 space-y-8">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center shadow-xl shadow-black/20">
            <Fingerprint size={48} />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold">{fingerprint.name}</h3>
            <p className="text-zinc-400 text-sm">Registered Fingerprint</p>
            <p className="mt-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-full inline-block">
              Slot {fingerprint.slot}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onRename}
            className="w-full p-5 bg-zinc-50 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Pencil size={20} className="text-zinc-600" />
              </div>
              <span className="font-bold">Rename Fingerprint</span>
            </div>
            <ChevronRight size={20} className="text-zinc-300 group-hover:text-black transition-colors" />
          </button>

          <button 
            onClick={onRescan}
            className="w-full p-5 bg-zinc-50 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Smartphone size={20} className="text-zinc-600" />
              </div>
              <span className="font-bold">Re-scan / Replace</span>
            </div>
            <ChevronRight size={20} className="text-zinc-300 group-hover:text-black transition-colors" />
          </button>

          <button 
            onClick={onDelete}
            className="w-full p-5 bg-red-50 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <span className="font-bold text-red-500">Delete Fingerprint</span>
            </div>
            <ChevronRight size={20} className="text-red-200 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};

const RenameFingerprintScreen = ({ 
  fingerprint, 
  onBack, 
  onSave
}: { 
  fingerprint: FingerprintData; 
  onBack: () => void; 
  onSave: (name: string) => void;
}) => {
  const [name, setName] = useState(fingerprint.name);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Rename Fingerprint" onBack={onBack} />
      <div className="px-6 space-y-6">
        <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <Fingerprint size={48} className="text-zinc-400" />
        </div>
        <div className="text-center mb-4">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Editing Slot {fingerprint.slot}
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase px-1">Fingerprint Name</label>
          <input 
            type="text" 
            className="input-field" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            autoFocus
          />
        </div>
        <div className="space-y-4 pt-4">
          <button 
            onClick={() => onSave(name)}
            className="btn-primary"
          >
            Save Name
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const INITIAL_USERS = [
  { id: 'user1', name: 'John Doe', email: 'john@example.com' },
  { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: 'user3', name: 'Mike Johnson', email: 'mike@example.com' },
];

const INITIAL_FINGERPRINTS: FingerprintData[] = [
  { id: 'fp1', name: 'Thumb', userId: 'user1', slot: 1 },
  { id: 'fp2', name: 'Index', userId: 'user1', slot: 2 },
  { id: 'fp3', name: 'Thumb', userId: 'user2', slot: 1 },
];

const DEFAULT_STATE: PersistedAppState = {
  user: { name: INITIAL_USERS[0].name, email: INITIAL_USERS[0].email },
  usersList: INITIAL_USERS,
  fingerprints: INITIAL_FINGERPRINTS,
};

const LOCAL_STATE_KEY = 'grip_app_state';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('setup');
  const [user, setUser] = useState<User>(DEFAULT_STATE.user);
  const [usersList, setUsersList] = useState(DEFAULT_STATE.usersList);
  const [fingerprints, setFingerprints] = useState<FingerprintData[]>(DEFAULT_STATE.fingerprints);
  const [hasHydratedState, setHasHydratedState] = useState(false);
  const [editingFingerprintId, setEditingFingerprintId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);
  const [userFingerprintsBackScreen, setUserFingerprintsBackScreen] = useState<Screen>('dashboard');
  const [verificationAction, setVerificationAction] = useState<{ type: VerificationAction; data?: any } | null>(null);

  useEffect(() => {
    // Load device-local cache first, then backend state as source of truth.
    const loadState = async () => {
      const cached = localStorage.getItem(LOCAL_STATE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as PersistedAppState;
          setUser(parsed.user ?? DEFAULT_STATE.user);
          setUsersList(Array.isArray(parsed.usersList) ? parsed.usersList : DEFAULT_STATE.usersList);
          setFingerprints(Array.isArray(parsed.fingerprints) ? parsed.fingerprints : DEFAULT_STATE.fingerprints);
        } catch (error) {
          console.error('Failed to parse local state cache:', error);
        }
      }

      try {
        const response = await fetch('/api/state');
        if (response.ok) {
          const remote = (await response.json()) as PersistedAppState;
          setUser(remote.user ?? DEFAULT_STATE.user);
          setUsersList(Array.isArray(remote.usersList) ? remote.usersList : DEFAULT_STATE.usersList);
          setFingerprints(Array.isArray(remote.fingerprints) ? remote.fingerprints : DEFAULT_STATE.fingerprints);
        }
      } catch (error) {
        console.error('Failed to load backend state:', error);
      } finally {
        setHasHydratedState(true);
      }
    };

    loadState();
  }, []);

  useEffect(() => {
    if (!hasHydratedState) return;

    const state: PersistedAppState = { user, usersList, fingerprints };
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));

    const timeout = setTimeout(async () => {
      try {
        await fetch('/api/state', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(state)
        });
      } catch (error) {
        console.error('Failed to sync state to backend:', error);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [hasHydratedState, user, usersList, fingerprints]);

  const navigate = (screen: Screen) => setCurrentScreen(screen);

  const handleSaveProfile = (updatedUser: User) => {
    triggerVerification('saveUserInfo', updatedUser);
  };

  const handleEditFingerprint = (id: string) => {
    setEditingFingerprintId(id);
    const fp = fingerprints.find(f => f.id === id);
    if (fp) {
      setTargetUserId(fp.userId);
      setTargetSlot(fp.slot);
    }
    navigate('manageFingerprint');
  };

  const handleSaveFingerprintName = (newName: string) => {
    if (editingFingerprintId) {
      setFingerprints(fingerprints.map(fp => 
        fp.id === editingFingerprintId ? { ...fp, name: newName } : fp
      ));
      navigate('userFingerprints');
    }
  };

  const handleAddFingerprint = (userId?: string, slot?: number) => {
    setEditingFingerprintId(null);
    setTargetUserId(userId || null);
    setTargetSlot(slot || null);
    setUserFingerprintsBackScreen('dashboard');
    navigate('fingerprintRegistration');
  };

  const handleFingerprintRegistered = () => {
    if (editingFingerprintId) {
      // Replacement mode
      if (!user.password) {
        navigate('passwordCreation');
      } else {
        navigate('userFingerprints');
      }
    } else {
      // New registration mode
      const newId = Math.random().toString(36).substr(2, 9);
      const newFp = { 
        id: newId, 
        name: targetSlot ? `Slot ${targetSlot}` : `Fingerprint ${fingerprints.length + 1}`, 
        userId: targetUserId || '',
        slot: targetSlot || 1
      };
      setFingerprints([...fingerprints, newFp]);
      setEditingFingerprintId(newId);
      
      if (!user.password) {
        navigate('passwordCreation');
      } else if (targetUserId) {
        navigate('fingerprintNaming');
      } else {
        navigate('whoseFingerprint');
      }
    }
  };

  const handleAssignFingerprint = (userId: string | 'new') => {
    if (editingFingerprintId) {
      let finalUserId = userId;
      if (userId === 'new') {
        const newId = `user${usersList.length + 1}`;
        const newUser = { id: newId, name: `User ${usersList.length + 1}`, email: '' };
        setUsersList([...usersList, newUser]);
        finalUserId = newId;
      }
      
      // Find the next available slot for this user if not already set
      let finalSlot = targetSlot;
      if (!finalSlot) {
        const userFps = fingerprints.filter(fp => fp.userId === finalUserId);
        const usedSlots = userFps.map(fp => fp.slot);
        for (let i = 1; i <= 5; i++) {
          if (!usedSlots.includes(i)) {
            finalSlot = i;
            break;
          }
        }
      }

      setFingerprints(fingerprints.map(fp => 
        fp.id === editingFingerprintId ? { ...fp, userId: finalUserId, slot: finalSlot || 1 } : fp
      ));
      setTargetUserId(finalUserId);
      setTargetSlot(finalSlot || 1);
      navigate('fingerprintNaming');
    }
  };

  const handleFingerprintNamed = (name: string) => {
    if (editingFingerprintId) {
      setFingerprints(fingerprints.map(fp => 
        fp.id === editingFingerprintId ? { ...fp, name: name } : fp
      ));
      
      if (!user.password) {
        navigate('passwordCreation');
      } else {
        navigate('userFingerprints');
      }
    }
  };

  const handlePasswordCreated = (pass: string) => {
    setUser(prev => ({ ...prev, password: pass }));
    navigate('emailRegistration');
  };

  const handleEmailRegistered = (email: string) => {
    setUser(prev => ({ ...prev, email }));
    navigate('dashboard');
  };

  const triggerVerification = (type: VerificationAction, data?: any) => {
    setVerificationAction({ type, data });
    navigate('verifyPassword');
  };

  const handleVerificationSuccess = () => {
    if (!verificationAction) return;

    if (verificationAction.type === 'deleteFingerprint') {
      setFingerprints(fingerprints.filter(fp => fp.id !== verificationAction.data));
      setEditingFingerprintId(null);
      setVerificationAction(null);
      navigate('userFingerprints');
    } else if (verificationAction.type === 'resetFingerprintMemory') {
      setFingerprints([]);
      setVerificationAction(null);
      navigate('dashboard');
    } else if (verificationAction.type === 'saveUserInfo') {
      setUser(verificationAction.data);
      setVerificationAction(null);
      navigate('dashboard');
    } else if (verificationAction.type === 'changePassword') {
      navigate('changePassword');
    } else if (verificationAction.type === 'accessHomepage') {
      setVerificationAction(null);
      navigate('dashboard');
    } else if (verificationAction.type === 'login') {
      setVerificationAction(null);
      navigate('dashboard');
    } else if (verificationAction.type === 'deleteProfile') {
      const userId = verificationAction.data;
      setUsersList(usersList.filter(u => u.id !== userId));
      setFingerprints(fingerprints.filter(fp => fp.userId !== userId));
      setVerificationAction(null);
      navigate('dashboard');
    }
  };

  const handleUpdatePassword = (newPassword: string) => {
    setUser(prev => ({ ...prev, password: newPassword }));
    setVerificationAction(null);
    navigate('dashboard');
  };

  const handleLogout = async () => {
    try {
      // Trigger backend exit routine
      const response = await fetch('/api/exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        navigate('terminated');
      } else {
        console.error("Failed to terminate session on backend");
        // Fallback behavior if backend fails
        if (user.password) {
          setVerificationAction({ type: 'login' });
          navigate('verifyPassword');
        } else {
          navigate('setup');
        }
      }
    } catch (error) {
      console.error("Error during exit routine:", error);
      // Fallback behavior
      if (user.password) {
        setVerificationAction({ type: 'login' });
        navigate('verifyPassword');
      } else {
        navigate('setup');
      }
    }
  };

  const handleResetApp = () => {
    const defaultUser = { name: INITIAL_USERS[0].name, email: INITIAL_USERS[0].email };
    setUser(defaultUser);
    setFingerprints([]);
    setUsersList(INITIAL_USERS);
    setEditingFingerprintId(null);
    setTargetUserId(null);
    setTargetSlot(null);
    setUserFingerprintsBackScreen('dashboard');
    localStorage.removeItem(LOCAL_STATE_KEY);
    navigate('setup');
  };

  return (
    <div className="mobile-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex-1 flex flex-col"
        >
          {currentScreen === 'setup' && (
            <SetupScreen onNext={() => {
              navigate('bluetooth');
            }} />
          )}
          {currentScreen === 'bluetooth' && (
            <BluetoothScreen onBack={() => navigate('setup')} onNext={() => navigate('hotspot')} />
          )}
          {currentScreen === 'hotspot' && (
            <HotspotScreen 
              onBack={() => navigate('bluetooth')} 
              onNext={() => {
                if (user.password) {
                  navigate('fingerprintVerification');
                } else {
                  navigate('fingerprintRegistration');
                }
              }} 
            />
          )}
          {currentScreen === 'fingerprintRegistration' && (
            <FingerprintRegistrationScreen 
              onBack={() => {
                if (editingFingerprintId) {
                  navigate('manageFingerprint');
                } else if (targetUserId) {
                  navigate('userFingerprints');
                } else if (user.password) {
                  navigate('dashboard');
                } else {
                  navigate('hotspot');
                }
              }} 
              onNext={handleFingerprintRegistered} 
              onSkip={() => {
                if (targetUserId) {
                  navigate('userFingerprints');
                } else if (user.password) {
                  navigate('dashboard');
                } else {
                  navigate('passwordCreation');
                }
              }}
            />
          )}
          {currentScreen === 'fingerprintVerification' && (
            <FingerprintVerificationScreen 
              onBack={() => navigate('hotspot')}
              onVerify={() => navigate('dashboard')}
            />
          )}
          {currentScreen === 'fingerprintNaming' && editingFingerprintId && (
            <FingerprintNamingScreen 
              onBack={() => {
                if (targetUserId) {
                  navigate('userFingerprints');
                } else {
                  navigate('whoseFingerprint');
                }
              }}
              onSave={handleFingerprintNamed}
              onSkip={() => handleFingerprintNamed(`Fingerprint ${editingFingerprintId}`)}
              defaultName={`Fingerprint ${editingFingerprintId}`}
              slot={targetSlot || undefined}
            />
          )}
          {currentScreen === 'passwordCreation' && (
            <PasswordCreationScreen 
              onBack={() => {
                navigate('fingerprintRegistration');
              }} 
              onNext={handlePasswordCreated} 
            />
          )}
          {currentScreen === 'emailRegistration' && (
            <EmailRegistrationScreen onBack={() => navigate(user.password ? 'dashboard' : 'passwordCreation')} onNext={handleEmailRegistered} />
          )}
          {currentScreen === 'dashboard' && (
            <DashboardScreen 
              user={user}
              fingerprints={fingerprints}
              usersList={usersList}
              onEditProfile={() => navigate('editUserInfo')}
              onProfileOptions={(userId) => {
                setTargetUserId(userId);
                navigate('profileOptions');
              }}
              onAddFingerprint={handleAddFingerprint}
              onResetFingerprints={() => triggerVerification('resetFingerprintMemory')}
              onResetApp={handleResetApp}
              onLogout={handleLogout}
              onManageUserFingerprints={(userId) => {
                setTargetUserId(userId);
                setUserFingerprintsBackScreen('dashboard');
                navigate('userFingerprints');
              }}
            />
          )}
          {currentScreen === 'profileOptions' && targetUserId && (
            <ProfileOptionsScreen 
              user={usersList.find(u => u.id === targetUserId)!}
              onBack={() => navigate('dashboard')}
              onRename={() => navigate('renameUser')}
              onManageFingerprints={() => {
                setUserFingerprintsBackScreen('profileOptions');
                navigate('userFingerprints');
              }}
              onDelete={() => triggerVerification('deleteProfile', targetUserId)}
            />
          )}
          {currentScreen === 'whoseFingerprint' && (
            <WhoseFingerprintScreen 
              users={usersList}
              onBack={() => navigate(user.password ? 'dashboard' : 'fingerprintRegistration')}
              onAssign={handleAssignFingerprint}
            />
          )}
          {currentScreen === 'userFingerprints' && targetUserId && (
            <UserFingerprintsScreen 
              fUser={usersList.find(u => u.id === targetUserId)!}
              fingerprints={fingerprints}
              onBack={() => {
                navigate(userFingerprintsBackScreen);
              }}
              onEditFingerprint={handleEditFingerprint}
              onAddFingerprint={(userId, slot) => {
                setTargetUserId(userId);
                setTargetSlot(slot);
                navigate('fingerprintRegistration');
              }}
            />
          )}
          {currentScreen === 'renameUser' && targetUserId && (
            <RenameUserScreen 
              user={usersList.find(u => u.id === targetUserId)!}
              index={usersList.findIndex(u => u.id === targetUserId)}
              onBack={() => navigate('profileOptions')}
              onSave={(newName) => {
                setUsersList(usersList.map(u => u.id === targetUserId ? { ...u, name: newName } : u));
                navigate('profileOptions');
              }}
            />
          )}
          {currentScreen === 'editUserInfo' && (
            <EditUserInfoScreen 
              user={user} 
              onBack={() => navigate('dashboard')} 
              onSave={handleSaveProfile} 
              onEditPassword={() => triggerVerification('changePassword')}
            />
          )}
          {currentScreen === 'changePassword' && (
            <ChangePasswordScreen 
              onBack={() => navigate('dashboard')} 
              onSave={handleUpdatePassword} 
            />
          )}
          {currentScreen === 'manageFingerprint' && editingFingerprintId && (
            <ManageFingerprintScreen 
              fingerprint={fingerprints.find(fp => fp.id === editingFingerprintId)!}
              onBack={() => {
                navigate('userFingerprints');
              }}
              onRename={() => navigate('renameFingerprint')}
              onRescan={() => navigate('fingerprintRegistration')}
              onDelete={() => triggerVerification('deleteFingerprint', editingFingerprintId)}
            />
          )}
          {currentScreen === 'renameFingerprint' && editingFingerprintId && (
            <RenameFingerprintScreen 
              fingerprint={fingerprints.find(fp => fp.id === editingFingerprintId)!}
              onBack={() => navigate('manageFingerprint')}
              onSave={handleSaveFingerprintName}
            />
          )}
          {currentScreen === 'verifyPassword' && (
            <VerifyPasswordScreen 
              currentPassword={user.password}
              hasEmail={!!user.email}
              onForgotPassword={() => navigate('forgotPasswordConfirmation')}
              onBack={() => {
                if (verificationAction?.type === 'accessHomepage') {
                  setVerificationAction(null);
                  navigate('fingerprintRegistration');
                } else if (verificationAction?.type === 'login') {
                  setVerificationAction(null);
                  navigate('setup');
                } else {
                  setVerificationAction(null);
                  navigate('dashboard');
                }
              }} 
              onVerify={handleVerificationSuccess} 
            />
          )}
          {currentScreen === 'forgotPasswordConfirmation' && (
            <ForgotPasswordConfirmationScreen onBackToHome={() => {
              if (verificationAction?.type === 'login') {
                setVerificationAction(null);
                navigate('setup');
              } else {
                setVerificationAction(null);
                navigate('dashboard');
              }
            }} />
          )}
          {currentScreen === 'terminated' && (
            <TerminatedScreen />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
