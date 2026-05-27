import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  MessageSquare, 
  FlaskConical, 
  UserCircle, 
  Settings, 
  Fingerprint,
  Activity,
  Flame,
  Send,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Zap,
  Target,
  Cpu,
  Skull,
  Eraser,
  Copy,
  Terminal,
  Binary,
  Hash,
  LogOut,
  Radio,
  Users,
  Search,
  ChevronRight,
  FileText,
  Upload,
  ThumbsUp,
  Heart,
  Rocket,
  Smile,
  Paperclip,
  Brain,
  X,
  Plus,
  ShieldAlert,
  Check,
  Unlock,
  Ban,
  Mic,
  MicOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  deleteDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, auth, signInWithGoogle } from './lib/firebase';
import { Cipher, CipherType } from './lib/cipher';
import VigenereSquare from './components/VigenereSquare';
import TypingDecoderText from './components/TypingDecoderText';
import PythonTerminal from './components/PythonTerminal';
import { AudioVisualizer } from './components/AudioVisualizer';

// Global Types (Consolidated)
export interface AgentProfile {
  codename: string;
  avatar: string;
  color: string;
  customColor?: string;
  customAvatar?: string;
  receiveAnimation?: string;
}

export interface ChatMessage {
  id?: string;
  content: string;
  sender: string;
  timestamp: number;
  crypto_key: string;
  crypto_shift: number;
  crypto_type: CipherType;
  burn: boolean;
  profile: AgentProfile;
  readBy?: string[];
  isAttachment?: boolean;
  fileName?: string;
  reactions?: Record<string, string[]>;
  decryptLogs?: {
    uid: string;
    codename: string;
    timestamp: number;
    color: string;
    customColor?: string;
  }[];
}

export const COLOR_OPTIONS = [
  { id: 'indigo', name: 'Indigo Pulse', hex: '#6366f1', textClass: 'text-indigo-400', bgClass: 'bg-indigo-600', ringClass: 'ring-indigo-500/50' },
  { id: 'emerald', name: 'Neon Green', hex: '#10b981', textClass: 'text-emerald-400', bgClass: 'bg-emerald-600', ringClass: 'ring-emerald-500/50' },
  { id: 'cyan', name: 'Cyber Blue', hex: '#06b6d4', textClass: 'text-cyan-400', bgClass: 'bg-cyan-600', ringClass: 'ring-cyan-500/50' },
  { id: 'amber', name: 'Tactical Orange', hex: '#f59e0b', textClass: 'text-amber-400', bgClass: 'bg-amber-600', ringClass: 'ring-amber-500/50' },
  { id: 'rose', name: 'Hazard Red', hex: '#f43f5e', textClass: 'text-rose-400', bgClass: 'bg-rose-600', ringClass: 'ring-rose-500/50' },
  { id: 'violet', name: 'Phantom Purple', hex: '#8b5cf6', textClass: 'text-violet-400', bgClass: 'bg-violet-600', ringClass: 'ring-violet-500/50' }
];

export const AVATAR_OPTIONS = [
  { id: 'Shield', icon: <Shield size={16} /> },
  { id: 'UserCircle', icon: <UserCircle size={16} /> },
  { id: 'Activity', icon: <Activity size={16} /> },
  { id: 'Flame', icon: <Flame size={16} /> },
  { id: 'Zap', icon: <Zap size={16} /> },
  { id: 'Target', icon: <Target size={16} /> },
  { id: 'Cpu', icon: <Cpu size={16} /> },
  { id: 'Skull', icon: <Skull size={16} /> }
];

const getAvatarIcon = (p: AgentProfile, size = 24) => {
  if (p.customAvatar) {
    return <img src={p.customAvatar} alt="Avatar" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  
  switch (p.avatar) {
    case 'Shield': return <Shield size={size} />;
    case 'UserCircle': return <UserCircle size={size} />;
    case 'Activity': return <Activity size={size} />;
    case 'Flame': return <Flame size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Target': return <Target size={size} />;
    case 'Cpu': return <Cpu size={size} />;
    case 'Skull': return <Skull size={size} />;
    default: return <UserCircle size={size} />;
  }
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't necessarily want to crash the UI for offline, but we should log it
  if (errInfo.error.includes('offline')) {
    // handled by isOffline state
  } else {
    throw new Error(JSON.stringify(errInfo));
  }
};

const ADMIN_EMAILS = ['omsnew7@gmail.com', 'siddhi68sharma@gmail.com'];
const SYSTEM_ADMIN_KEY = '14062013';

const getVigenereKeyStrength = (key: string) => {
  const trimmed = key.trim();
  if (!trimmed) {
    return { score: 0, label: 'EMPTY', color: 'bg-slate-800', text: 'text-slate-500', width: '0%' };
  }
  const len = trimmed.length;
  const uniqueCount = new Set(trimmed).size;
  const ratio = uniqueCount / len;

  let score = 0;
  
  // 1. Length contribution (up to 60 points)
  if (len >= 10) {
    score += 60;
  } else if (len >= 8) {
    score += 50;
  } else if (len >= 6) {
    score += 40;
  } else if (len >= 4) {
    score += 25;
  } else {
    score += 10;
  }

  // 2. Character complexity / variety contribution (up to 40 points)
  // Percentage of unique characters
  score += Math.floor(ratio * 40);

  // Caps/adjustments for security realities
  if (len < 4) {
    score = Math.min(25, score); // Strictly Weak
  } else if (len < 7) {
    score = Math.min(65, score); // Max Medium
  }

  // Handle pathological case of repeating characters (e.g. AAAAA)
  if (uniqueCount === 1 && len > 1) {
    score = Math.min(15, score);
  }

  // Determine label and color
  let label = 'WEAK';
  let color = 'bg-rose-500';
  let text = 'text-rose-500';

  if (score >= 75) {
    label = 'STRONG';
    color = 'bg-emerald-500';
    text = 'text-emerald-400';
  } else if (score >= 35) {
    label = 'MEDIUM';
    color = 'bg-amber-500';
    text = 'text-amber-400';
  }

  return {
    score,
    label,
    color,
    text,
    width: `${score}%`
  };
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  
  // --- Auth State ---
  const [isGlobalAuthorized, setIsGlobalAuthorized] = useState(false);
  const [globalCode, setGlobalCode] = useState('');
  const [globalError, setGlobalError] = useState(false);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [showNewUserQuery, setShowNewUserQuery] = useState(false);
  const [userMasterKey, setUserMasterKey] = useState('');
  const [gatePassword, setGatePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gateError, setGateError] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [adminAuthStep, setAdminAuthStep] = useState(0); // 0: none, 1: level 1 pass, 2: fully escalated
  const [impersonatedAgent, setImpersonatedAgent] = useState<any>(null);

  // onboarding temp state
  const [onboardingCodename, setOnboardingCodename] = useState('');
  const [onboardingKey, setOnboardingKey] = useState('');
  const [onboardingPersonalPassword, setOnboardingPersonalPassword] = useState('');
  const [userPersonalPassword, setUserPersonalPassword] = useState('');
  const [globalFailedAttempts, setGlobalFailedAttempts] = useState(0);
  const [gateFailedAttempts, setGateFailedAttempts] = useState(0);

  // Reset Password states
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isOriginalVerified, setIsOriginalVerified] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Lab copy status
  const [encodeCopied, setEncodeCopied] = useState(false);
  const [decodeCopied, setDecodeCopied] = useState(false);

  useEffect(() => {
    if (user?.email === 'omsnew7@gmail.com') {
      setOnboardingCodename('OMS');
      setOnboardingKey('14062013');
      setOnboardingPersonalPassword('14062013');
    }
  }, [user]);

  // --- Profile State ---
  const [profile, setProfile] = useState<AgentProfile>({
    codename: `AGENT_${Math.floor(Math.random() * 9000 + 1000)}`,
    avatar: 'Shield',
    color: 'indigo',
    receiveAnimation: 'none'
  });
  const [userStatus, setUserStatus] = useState<'online' | 'busy' | 'away'>('online');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [draftProfile, setDraftProfile] = useState<AgentProfile>({
    codename: '',
    avatar: 'Shield',
    color: 'indigo',
    receiveAnimation: 'none'
  });
  const [draftStatus, setDraftStatus] = useState<'online' | 'busy' | 'away'>('online');
  const [previewAnimKey, setPreviewAnimKey] = useState(0);

  useEffect(() => {
    if (showProfileModal) {
      setPreviewAnimKey(prev => prev + 1);
    }
  }, [
    draftProfile.receiveAnimation,
    draftProfile.color,
    draftProfile.customColor,
    draftProfile.avatar,
    draftProfile.customAvatar,
    showProfileModal
  ]);

  const openProfileModal = () => {
    setDraftProfile(profile);
    setDraftStatus(userStatus);
    setShowProfileModal(true);
  };

  // --- View State ---
  const [activeTab, setActiveTab] = useState<'chat' | 'lab'>('chat');

  // --- Crypto State ---
  const [vigenereKey, setVigenereKey] = useState('UTOPIA');
  const [caesarShift, setCaesarShift] = useState(0);
  const [activeCipherType, setActiveCipherType] = useState<CipherType>(CipherType.HYBRID);
  const [burnMode, setBurnMode] = useState(false);
  const [autoEncrypt, setAutoEncrypt] = useState(true);

  // --- Command & Fun State ---
  const [showCommands, setShowCommands] = useState(false);
  const [isHacking, setIsHacking] = useState(false);
  const [hackTarget, setHackTarget] = useState('');
  const [systemAlert, setSystemAlert] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<{ cipherText: string; plainText: string; hint: string; type: string } | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [isSudoMode, setIsSudoMode] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [quickActionSearch, setQuickActionSearch] = useState('');
  const [infiniteMode, setInfiniteMode] = useState(false);

  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSystemAlert('WEB SPEECH API NOT SUPPORTED IN THIS BROWSER.');
      playSynthSound?.('alarm');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error while stopping speech recognition:', e);
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      setInterimTranscript('');
      playSynthSound?.('beep');
      setSystemAlert('VOICE RECOGNITION PAUSED.');
    } else {
      // Clean up any stale reference first
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
        playSynthSound?.('beep');
        setSystemAlert('VOICE RECOGNITION ONLINE. LISTEN TO CAPTURE...');
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;
        
        if (event.error === 'not-allowed') {
          setSystemAlert('MIC ACCESS DENIED. CHECK PERMISSIONS.');
        } else if (event.error === 'network') {
          setSystemAlert('NETWORK DISCONNECTION. SPEECH RECOGNITION SERVICE OFFLINE.');
        } else if (event.error === 'aborted') {
          setSystemAlert('VOICE SESSION ABORTED.');
        } else {
          setSystemAlert(`VOICE RECON ERROR: ${event.error.toUpperCase()}`);
        }
        playSynthSound?.('alarm');
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const spoken = finalTranscript.trim().toLowerCase();
          let interpretedCommand: string | null = null;
          
          if (
            spoken.startsWith('slash ') || 
            spoken.startsWith('backslash ') || 
            spoken.startsWith('run ') || 
            spoken.startsWith('execute ') || 
            spoken.startsWith('command ') || 
            spoken.startsWith('protocol ')
          ) {
            const cleanSpoken = spoken
              .replace(/^(slash|backslash|run|execute|command|protocol)\s+/, '')
              .trim();
            
            if (cleanSpoken.startsWith('help')) {
              interpretedCommand = '/help';
            } else if (cleanSpoken.startsWith('matrix') || cleanSpoken.startsWith('rain') || cleanSpoken.startsWith('digital rain')) {
              interpretedCommand = '/matrix';
            } else if (cleanSpoken.startsWith('hack')) {
              const target = cleanSpoken.replace(/^hack\s+/, '').trim();
              interpretedCommand = target ? `/hack ${target}` : '/hack';
            } else if (cleanSpoken.startsWith('burn') || cleanSpoken.startsWith('self destruct') || cleanSpoken.startsWith('self-destruct')) {
              interpretedCommand = '/burn';
            } else if (cleanSpoken.startsWith('who am i') || cleanSpoken.startsWith('whoami') || cleanSpoken.startsWith('clearance')) {
              interpretedCommand = '/whoami';
            } else if (cleanSpoken.startsWith('ping') || cleanSpoken.startsWith('latency')) {
              interpretedCommand = '/ping';
            } else if (cleanSpoken.startsWith('sudo') || cleanSpoken.startsWith('super user') || cleanSpoken.startsWith('super-user')) {
              interpretedCommand = '/sudo';
            } else if (cleanSpoken.startsWith('shake') || cleanSpoken.startsWith('screen shake')) {
              interpretedCommand = '/shake';
            } else if (cleanSpoken.startsWith('status')) {
              const statusArg = cleanSpoken.replace(/^status\s+/, '').trim();
              interpretedCommand = statusArg ? `/status ${statusArg}` : '/status';
            } else if (cleanSpoken.startsWith('sound')) {
              const soundArg = cleanSpoken.replace(/^sound\s+/, '').trim();
              interpretedCommand = soundArg ? `/sound ${soundArg}` : '/sound';
            } else if (cleanSpoken.startsWith('challenge') || cleanSpoken.startsWith('packet')) {
              interpretedCommand = '/challenge';
            } else if (cleanSpoken.startsWith('submit')) {
              const codeArg = cleanSpoken.replace(/^submit\s+/, '').trim();
              interpretedCommand = codeArg ? `/submit ${codeArg}` : '/submit';
            } else {
              interpretedCommand = `/${cleanSpoken}`;
            }
          } else if (
            spoken.startsWith('double slash ') || 
            spoken.startsWith('slash slash ') || 
            spoken.startsWith('infinite') || 
            spoken.toLowerCase().includes('infinite') ||
            spoken.startsWith('double-slash ')
          ) {
            const cleanSpoken = spoken
              .replace(/^(double\s+slash|slash\s+slash|double-slash)\s+/, '')
              .trim();
            if (cleanSpoken.startsWith('infinite') || spoken.includes('infinite')) {
              interpretedCommand = '//infinite';
            } else {
              interpretedCommand = cleanSpoken ? `//${cleanSpoken}` : '//infinite';
            }
          } else if (spoken === 'infinite' || spoken === 'infinite mode') {
            interpretedCommand = '//infinite';
          }

          if (interpretedCommand) {
            playSynthSound?.('success');
            setSystemAlert(`VOICE COMMAND INTERCEPTED: "${interpretedCommand.toUpperCase()}"`);
            processCommand(interpretedCommand);
            setInterimTranscript('');
          } else {
            setInputMessage((prev) => {
              const separator = prev ? ' ' : '';
              return prev + separator + finalTranscript.trim();
            });
            playSynthSound?.('success');
            setSystemAlert('VOICE TRANSCRIPTION CAPTURED AND COMMITTED.');
            setInterimTranscript('');
          }
        } else if (interimText) {
          setInterimTranscript(interimText);
        }
      };

      recognitionRef.current = rec;

      try {
        rec.start();
      } catch (err: any) {
        console.error('Failed to start speech recognition:', err);
        setSystemAlert('FAILED TO ACQUIRE AUDIO CHANNEL.');
        playSynthSound?.('alarm');
        setIsListening(false);
        setInterimTranscript('');
        recognitionRef.current = null;
      }
    }
  };
  // --- Real-time Typing Indicator State ---
  const [localIsTyping, setLocalIsTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const labContainerRef = useRef<HTMLDivElement>(null);
  const [isDictionaryMode, setIsDictionaryMode] = useState(false);

  // --- Real-time Typing Update Handlers ---
  const setFirestoreTyping = async (isTyping: boolean) => {
    if (!user || !isAuthenticated) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isTyping
      });
    } catch (err) {
      console.warn("Failed to set typing status", err);
    }
  };

  useEffect(() => {
    if (!user || !isAuthenticated) return;

    if (inputMessage.trim().length > 0) {
      if (!localIsTyping) {
        setLocalIsTyping(true);
        setFirestoreTyping(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setLocalIsTyping(false);
        setFirestoreTyping(false);
      }, 4000);
    } else {
      if (localIsTyping) {
        setLocalIsTyping(false);
        setFirestoreTyping(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [inputMessage, user, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (user && isAuthenticated) {
        updateDoc(doc(db, 'users', user.uid), {
          isTyping: false
        }).catch(() => {});
      }
    };
  }, [user, isAuthenticated]);

  // --- AI State ---
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);

  // --- Users Directory ---
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [showDirectory, setShowDirectory] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [adminBanEmail, setAdminBanEmail] = useState('');
  const [adminBanReason, setAdminBanReason] = useState('');
  const [bannedEmailsList, setBannedEmailsList] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Quick Command Overlay ---
  const [showQuickCommand, setShowQuickCommand] = useState(false);
  const [quickCommandSearch, setQuickCommandSearch] = useState('');
  const [quickCommandSelectedIdx, setQuickCommandSelectedIdx] = useState(0);
  const mainChatInputRef = useRef<HTMLInputElement>(null);
  const quickCommandSearchInputRef = useRef<HTMLInputElement>(null);
  const protocolKeyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showQuickCommand) {
      setTimeout(() => {
        if (quickCommandSearchInputRef.current) {
          quickCommandSearchInputRef.current.focus();
        }
      }, 50);
    }
  }, [showQuickCommand]);

  // --- Presence System ---
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const updatePresence = async (status: string) => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          status,
          lastActive: Date.now()
        });
      } catch (err) {
        console.error("Presence update failed", err);
      }
    };

    // Initial status
    updatePresence(userStatus);

    const interval = setInterval(() => {
      // If manually set to busy or away, don't change based on visibility alone
      if (userStatus !== 'online') {
        updatePresence(userStatus);
        return;
      }
      
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      } else {
        updatePresence('away');
      }
    }, 60000); // Every minute

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      } else {
        updatePresence('away');
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isAuthenticated]);

  // --- Network Jam State ---
  const [networkJam, setNetworkJam] = useState<{ jammedUntil: number; jammedBy: string } | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());

  // Keep current local time synchronized
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Infinite Mode Activity Stream Simulator
  useEffect(() => {
    if (!infiniteMode) return;

    // Initial chime
    playSynthSound?.('radar');

    const interval = setInterval(() => {
      const logs = [
        "DECRYPTING FREQUENCY OVERFLOW SYNC...",
        "INBOUND CARRIER DETECTED: 2.45GHz [98% SIGNAL]",
        "STABILIZING HYBRID ENCRYPTION ALGORITHM...",
        "MOCK INTERCEPT: 'THE EAGLE HAS DEPARTED' [VIG+CAE CERTIFIED]",
        "FLUSHING CIPHER BUFFER CACHE... COMPLETED.",
        "SYS_ALERT: HIGH ENTROPY DISCOVERED IN BUFFER 0x7F2C",
        "MATRIX SIGNAL OVERLOAD: STREAM RATE IS SPEEDING UP..."
      ];
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      setSystemAlert(`//STREAM: ${randomLog}`);
      playSynthSound?.('morse');

      // Randomly trigger minor shaking animations for signal disturbance effect
      if (Math.random() > 0.6) {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 200);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [infiniteMode]);

  // Listen for global jam signal
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const unsub = onSnapshot(doc(db, 'globals', 'network'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.jammedUntil > Date.now()) {
          setNetworkJam({
            jammedUntil: data.jammedUntil,
            jammedBy: data.jammedBy
          });
        } else {
          setNetworkJam(null);
        }
      } else {
        setNetworkJam(null);
      }
    }, (err) => {
      console.warn("Could not load network jam configuration", err);
    });
    return () => unsub();
  }, [isAuthenticated, user]);

  // Fetch all agents
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const q = query(collection(db, 'users'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const agents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllAgents(agents);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    return () => unsub();
  }, [isAuthenticated, user]);

  // Fetch banned emails (Admin only)
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const isAdminEmail = user?.email && ADMIN_EMAILS.includes(user?.email || '');
    if (!isAdminEmail) return;

    const q = query(collection(db, 'banned_emails'), orderBy('bannedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBannedEmailsList(list);
    }, (err) => {
      console.error("Failed to load banned emails", err);
    });
    return () => unsub();
  }, [isAuthenticated, user]);

  const handleBanEmail = async () => {
    if (!user || !adminBanEmail.trim()) return;
    const emailToBan = adminBanEmail.trim().toLowerCase();
    
    // Prevent banning yourself
    if (emailToBan === user.email?.toLowerCase()) {
      alert("Self-ban prevention: An administrator cannot blacklist their own identity.");
      return;
    }

    try {
      await setDoc(doc(db, 'banned_emails', emailToBan), {
        email: emailToBan,
        bannedAt: Date.now(),
        bannedBy: user.uid,
        reason: adminBanReason.trim() || 'No explicit reason recorded by administration.'
      });
      setAdminBanEmail('');
      setAdminBanReason('');
    } catch (err) {
      console.error("Banishment protocol failed", err);
      alert(`Banishment protocol failed: ${(err as Error).message}`);
    }
  };

  const handleUnbanEmail = async (emailToUnban: string) => {
    try {
      await deleteDoc(doc(db, 'banned_emails', emailToUnban));
    } catch (err) {
      console.error("Pardon protocol failed", err);
      alert(`Pardon protocol failed: ${(err as Error).message}`);
    }
  };

  // Read Receipt Logic
  useEffect(() => {
    if (!user || activeTab !== 'chat') return;
    
    // Squelch read receipts if network is jammed (network-wide signal disturbance)
    if (networkJam && networkJam.jammedUntil > Date.now() && networkJam.jammedBy !== user.uid) {
      return;
    }
    
    const unreadMessages = messages.filter(m => 
      m.sender !== user.uid && 
      (!m.readBy || !m.readBy.includes(user.uid))
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach(async (msg) => {
        if (!msg.id) return;
        try {
          await updateDoc(doc(db, 'messages', msg.id), {
            readBy: [...(msg.readBy || []), user.uid]
          });
        } catch (err) {
          console.error("Read receipt update failed", err);
        }
      });
    }
  }, [messages, user, activeTab, networkJam]);

  // Arrow key scrolling logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated || !user) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const container = activeTab === 'chat' ? scrollContainerRef.current : labContainerRef.current;
      if (!container) return;

      if (e.key === 'ArrowUp') {
        container.scrollBy({ top: -40, behavior: 'smooth' });
      } else if (e.key === 'ArrowDown') {
        container.scrollBy({ top: 40, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, user]);

  // Handle Auth Persistence and Firebase Login
  useEffect(() => {
    let userUnsub: (() => void) | undefined;
    let bannedUnsub: (() => void) | undefined;

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (u.email) {
          bannedUnsub = onSnapshot(doc(db, 'banned_emails', u.email), (bannedSnap) => {
            if (bannedSnap.exists()) {
              setIsUserBanned(true);
              setIsAuthenticated(false);
            } else {
              setIsUserBanned(false);
            }
          }, (err) => {
            console.error("Banned state listen failed", err);
          });
        }

        // Use onSnapshot for user data to handle offline gracefully
        userUnsub = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setProfile(userData.profile);
            setUserMasterKey(userData.masterKey);
            setUserPersonalPassword(userData.personalPassword || '');
            if (userData.status) setUserStatus(userData.status);
            setIsOnboarding(false);
            setShowNewUserQuery(false);

            // Self-healing: if email is missing or out of sync, update it
            if (u.email && userData.email !== u.email) {
              updateDoc(doc(db, 'users', u.uid), { email: u.email }).catch(console.error);
            }
          } else {
            setShowNewUserQuery(true);
          }
        }, (err) => {
          // If it's a "client is offline" error, we just let the UI handle it via the isOffline state
          if (err.message.includes('offline')) {
            setIsOffline(true);
          } else {
            handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
          }
        });
      } else {
        setIsAuthenticated(false);
        setIsOnboarding(false);
        setIsEscalated(false);
        setIsUserBanned(false);
        if (userUnsub) userUnsub();
        if (bannedUnsub) bannedUnsub();
      }
    });

    return () => {
      unsub();
      if (userUnsub) userUnsub();
      if (bannedUnsub) bannedUnsub();
    };
  }, []);

  // Monitor Connection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for Messages
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const q = query(
      collection(db, 'messages'), 
      orderBy('timestamp', 'asc'), 
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'messages');
      if (err.message.includes('offline')) setIsOffline(true);
    });

    return () => unsub();
  }, [isAuthenticated, user]);

  // --- Lab State ---
  const [scratchpad, setScratchpad] = useState('');
  const [decodeMode, setDecodeMode] = useState<'single' | 'batch'>('single');
  const [batchScratchpad, setBatchScratchpad] = useState('');
  const [labTab, setLabTab] = useState<'decrypt' | 'encode' | 'square' | 'terminal'>('terminal');
  const [encodePlaintext, setEncodePlaintext] = useState('');
  const [encodeCipherType, setEncodeCipherType] = useState<CipherType>(CipherType.HYBRID);
  const [encodeKey, setEncodeKey] = useState('UTOPIA');
  const [encodeShift, setEncodeShift] = useState(3);
  const [encodeRails, setEncodeRails] = useState(3);

  const calculateEntropy = (str: string): number => {
    if (!str) return 0;
    const freqs: Record<string, number> = {};
    for (const char of str) {
      freqs[char] = (freqs[char] || 0) + 1;
    }
    let entropy = 0;
    const len = str.length;
    for (const char in freqs) {
      const p = freqs[char] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  };

  const handleEntropyAudit = () => {
    if (!scratchpad.trim()) {
      setSystemAlert("ERROR: BUFFER EMPTY. INPUT DATA REQUIRED.");
      playSynthSound('alarm');
      return;
    }
    const entropy = calculateEntropy(scratchpad);
    playSynthSound('success');
    let classification = "LOW ENTROPY (HUMAN TEXT/SIMPLE CIPHER)";
    if (entropy > 5.5) {
      classification = "CRYPTONITE ENCRYPTED STATUS (HIGH RANDOMNESS)";
    } else if (entropy > 4.5) {
      classification = "MEDIUM DISTORTION (STANDARD POLYALPHABETIC)";
    }
    setSystemAlert(`ENTROPY AUDIT: ${entropy.toFixed(3)} BITS/CHAR [${classification}]`);
  };

  const handleClearBuffer = () => {
    setScratchpad('');
    playSynthSound('beep');
    setSystemAlert("BUFFER CLEARED.");
  };

  const getEncodedOutput = (): string => {
    if (!encodePlaintext) return '';
    if (encodeCipherType === CipherType.RAILFENCE) {
      return Cipher.railfence(encodePlaintext, encodeRails, false);
    }
    return Cipher.encrypt(encodePlaintext, encodeKey, encodeShift, encodeCipherType);
  };

  const getDecodedScratchpad = (): string => {
    if (!scratchpad) return '';
    if (activeCipherType === CipherType.RAILFENCE) {
      return Cipher.railfence(scratchpad, encodeRails, true);
    }
    return Cipher.decrypt(scratchpad, vigenereKey, caesarShift, activeCipherType);
  };

  // Scroll to bottom effect
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Auth Gate
  const handleUnlock = async () => {
    const isAdminEmail = user?.email && ADMIN_EMAILS.includes(user.email);
    const isOmsUser = user?.email === 'omsnew7@gmail.com';
    
    // Unified Authorization Check
    const isAuthorized = 
      gatePassword === userMasterKey || 
      (userPersonalPassword && gatePassword === userPersonalPassword) ||
      (isAdminEmail && gatePassword === SYSTEM_ADMIN_KEY) ||
      (gatePassword === SYSTEM_ADMIN_KEY) ||
      (isOmsUser && !userMasterKey && gatePassword === '14062013');

    if (isAuthorized) {
      if (gatePassword === SYSTEM_ADMIN_KEY || (isOmsUser && gatePassword === '14062013')) {
        setIsEscalated(true);
        setProfile(p => ({ ...p, color: 'rose', avatar: 'Skull' }));
      }
      
      setVigenereKey(gatePassword.toUpperCase());
      setIsAuthenticated(true);
      setGateFailedAttempts(0);
    } else {
      setGateError(true);
      setGateFailedAttempts(prev => prev + 1);
      setTimeout(() => setGateError(false), 2000);
    }
  };

  const handleOnboardingComplete = async () => {
    const isOmsUser = user?.email === 'omsnew7@gmail.com';
    const finalKey = onboardingKey || (isOmsUser ? SYSTEM_ADMIN_KEY : '');
    const finalPersonalPassword = onboardingPersonalPassword || (isOmsUser ? SYSTEM_ADMIN_KEY : '');

    if (!user || finalKey.length < 4 || !onboardingCodename.trim()) return;

    const newProfile = {
      codename: onboardingCodename,
      avatar: 'Shield',
      color: 'indigo'
    };

    try {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        profile: newProfile,
        masterKey: finalKey,
        personalPassword: finalPersonalPassword,
        createdAt: Date.now()
      });
      setProfile(newProfile);
      setUserMasterKey(finalKey);
      setUserPersonalPassword(finalPersonalPassword);
      setIsOnboarding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  const handleProfileSync = async () => {
    playSynthSound?.('success');
    const finalProfile = draftProfile;
    const finalStatus = draftStatus;
    
    // Core state updates
    setProfile(finalProfile);
    setUserStatus(finalStatus);
    
    if (!user) {
      setSystemAlert('LOCAL PROFILE SYNCHRONIZED SUCCESSFULLY.');
      setShowProfileModal(false);
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        profile: finalProfile,
        status: finalStatus,
        lastActive: Date.now()
      });
      setShowProfileModal(false);
      setSystemAlert('IDENTITY CLOUD PROFILE SYNCHRONIZED.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleVerifyOriginalPassword = () => {
    setPwdError('');
    setPwdSuccess('');
    if (!currentPasswordInput) {
      setPwdError('Please enter your original password.');
      return;
    }
    
    // Check if matches userMasterKey or userPersonalPassword
    if (currentPasswordInput === userMasterKey || (userPersonalPassword && currentPasswordInput === userPersonalPassword)) {
      setIsOriginalVerified(true);
      setPwdSuccess('Original password verified. Enter your new password below.');
      playSynthSound('success');
    } else {
      setPwdError('Invalid original password.');
      playSynthSound('alarm');
    }
  };

  const handleUpdateMasterPassword = async () => {
    setPwdError('');
    setPwdSuccess('');
    if (!user) return;
    if (newPasswordInput.length < 6) {
      setPwdError('New master password must be at least 6 characters.');
      playSynthSound('alarm');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        masterKey: newPasswordInput
      });
      setUserMasterKey(newPasswordInput);
      setPwdSuccess('Master password updated successfully.');
      playSynthSound('success');
      // Reset fields
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setIsOriginalVerified(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      setPwdError('Failed to update password.');
      playSynthSound('alarm');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    setIsGlobalAuthorized(false);
    setShowNewUserQuery(false);
    setIsOnboarding(false);
  };

  const playSynthSound = (type: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'alarm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(640, ctx.currentTime + 0.2);
        osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'radar') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'morse') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'plugin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(600, ctx.currentTime + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.25);
        gain2.gain.setValueAtTime(0.01, ctx.currentTime + 0.05);
        gain2.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("AudioContext initialization blocked by client security sandboxing style.", e);
    }
  };

  // Handle Message Submission
  const processCommand = (text: string): boolean => {
    if (!text.startsWith('/') && !text.startsWith('//')) return false;

    const isDouble = text.startsWith('//');
    const startIdx = isDouble ? 2 : 1;
    const parts = text.split(' ');
    const command = parts[0].substring(startIdx).toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'infinite':
        setInfiniteMode(prev => !prev);
        playSynthSound('radar');
        setSystemAlert(`INFINITE SEQUENCE PROTOCOL: ${!infiniteMode ? 'ACTIVATED. SYSTEM SIMULATOR ON.' : 'DEENGAGED. RESTORE STABILITY.'}`);
        break;
      case 'ai':
      case 'neural':
        if (args.length > 0) {
          handleNeuralInsight(args.join(' '));
        } else {
          setShowAIPanel(true);
        }
        break;
      case 'key':
        if (args[0]) {
          setVigenereKey(args[0].toUpperCase());
          playSynthSound('beep');
          setSystemAlert(`PROTOCOL KEY UPDATED TO: ${args[0].toUpperCase()}`);
        }
        break;
      case 'shift':
        if (args[0]) {
          const s = parseInt(args[0]);
          if (!isNaN(s)) {
            setCaesarShift(s);
            playSynthSound('beep');
            setSystemAlert(`ENTROPY SHIFT UPDATED TO: ${s}`);
          }
        }
        break;
      case 'burn':
        setBurnMode(!burnMode);
        playSynthSound(burnMode ? 'beep' : 'alarm');
        setSystemAlert(`SELF-DESTRUCT PROTOCOL: ${!burnMode ? 'ARMED' : 'DISARMED'}`);
        break;
      case 'auto':
      case 'autoencrypt':
        setAutoEncrypt(!autoEncrypt);
        playSynthSound('beep');
        setSystemAlert(`AUTO-ENCRYPTION PROTOCOL: ${!autoEncrypt ? 'ENABLED' : 'PASTETHRU (BYPASS)'}`);
        break;
      case 'theme':
        if (args[0]) {
          const lowerArg = args[0].toLowerCase();
          if (lowerArg === 'matrix') {
            setProfile(p => ({ ...p, color: 'emerald', customColor: '#00ff00' }));
            setShowMatrix(true);
            playSynthSound('success');
            setSystemAlert("MATRIX_GRID INTRUSION FEED: PLUGGED IN");
          } else if (lowerArg === 'cyberpunk') {
            setProfile(p => ({ ...p, color: 'rose', customColor: '#ff007f' }));
            playSynthSound('success');
            setSystemAlert("CYBERPUNK NEON DRIFT ACTIVED!");
          } else if (lowerArg === 'blood') {
            setProfile(p => ({ ...p, color: 'rose', customColor: '#991b1b' }));
            setScreenShake(true);
            playSynthSound('alarm');
            setTimeout(() => setScreenShake(false), 800);
            setSystemAlert("ALERT: HIGH-THREAT HOSTILE THEME APPLIED");
          } else if (lowerArg === 'ghost') {
            setProfile(p => ({ ...p, color: 'indigo', customColor: '#64748b' }));
            playSynthSound('radar');
            setSystemAlert("GHOST PROFILE CAMOUFLAGE ACTIVED");
          } else if (lowerArg.startsWith('#')) {
            setProfile(p => ({ ...p, customColor: lowerArg }));
            playSynthSound('success');
            setSystemAlert(`TRANSMISSION SKIN OVERWRITTEN: ${lowerArg}`);
          } else {
            const theme = COLOR_OPTIONS.find(c => c.id === lowerArg);
            if (theme) {
              setProfile(p => ({ ...p, color: theme.id, customColor: undefined }));
              playSynthSound('beep');
              setSystemAlert(`IDENTITY THEME UPDATED: ${theme.name}`);
            } else {
              setSystemAlert("SKINS: indigo, emerald, cyan, amber, rose, violet, matrix, cyberpunk, blood, ghost, or #[hex]");
            }
          }
        } else {
          setSystemAlert("USE: /theme <indigo|emerald|cyan|amber|rose|violet|matrix|cyberpunk|blood|ghost|#[hex_code]>");
        }
        break;
      case 'status':
        if (['online', 'busy', 'away'].includes(args[0]?.toLowerCase())) {
          setUserStatus(args[0].toLowerCase() as any);
          playSynthSound('beep');
          setSystemAlert(`AVAILABILITY UPDATED: ${args[0].toUpperCase()}`);
        }
        break;
      case 'hack':
        if (args[0]) {
          setIsHacking(true);
          setHackTarget(args[0].toUpperCase());
          playSynthSound('alarm');
          setTimeout(() => {
            setIsHacking(false);
            playSynthSound('success');
          }, 5000);
          setSystemAlert(`INITIALIZING_BRUTE_FORCE_ON: ${args[0].toUpperCase()}`);
        } else {
          setSystemAlert("USE: /hack <target_node>");
        }
        break;
      case 'ping':
        playSynthSound('morse');
        setSystemAlert(`PONG! IR_LATENCY: ${Math.floor(Math.random() * 50) + 10}ms // SECURE_RELAY_STABLE`);
        break;
      case 'whoami':
        playSynthSound('radar');
        setSystemAlert(`AGENT_ID: ${profile.codename} // CID: ${user?.uid.substring(0, 8)} // LEVEL: ${isEscalated ? 'ADM' : (isSudoMode ? 'SUPER' : 'OP')}`);
        break;
      case 'matrix':
      case 'rain':
        setShowMatrix(!showMatrix);
        playSynthSound('success');
        setSystemAlert(`MATRIX SIMULATION: ${!showMatrix ? 'ENGAGED' : 'ABORTED'}`);
        break;
      case 'sound':
        if (args[0]) {
          playSynthSound(args[0].toLowerCase());
          setSystemAlert(`TRIGGERED FREQUENCY: ${args[0].toUpperCase()}`);
        } else {
          setSystemAlert("SYNTH SOUNDS: beep, success, alarm, radar, morse");
        }
        break;
      case 'shake':
        setScreenShake(true);
        playSynthSound('alarm');
        setSystemAlert("DANGER: INTEGRITY LEAK RECOGNIZED!");
        setTimeout(() => setScreenShake(false), 1500);
        break;
      case 'jam':
        if (!user) {
          setSystemAlert("PROTOCOL ERROR: SECURITY AUTHENTICATION UNRESOLVED.");
          break;
        }
        setDoc(doc(db, 'globals', 'network'), {
          jammedUntil: Date.now() + 30000,
          jammedBy: user.uid
        }).then(() => {
          playSynthSound('alarm');
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 1000);
          setSystemAlert("SIGNAL DISTURBANCE ENGAGED: NETWORK-WIDE JAMMING INITIATED (30S)");
        }).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, 'globals/network');
        });
        break;
      case 'sudo':
        setIsSudoMode(!isSudoMode);
        playSynthSound('alarm');
        if (!isSudoMode) {
          setSystemAlert("PRIVILEGE ESCALATION: SUPERUSER ALIAS DEPLOYED");
          setProfile(p => ({ ...p, codename: `ROOT#ROOT_${p.codename.replace('AGENT_', '') || 'SYS'}` }));
        } else {
          setSystemAlert("SUPERUSER DEACTIVATED: RESTORING CLASSIFIED BOUNDARIES");
          setProfile(p => ({ ...p, codename: `AGENT_${Math.floor(Math.random() * 9000 + 1000)}` }));
        }
        break;
      case 'joke':
      case 'fortune':
        const jokes = [
          "10 types of nodes in cyber space: those who decode dual variables, and those who don't.",
          "My software has zero glitches, it only introduces randomized features.",
          "Algorithms are like encryption recipes: we just tend to bake them with too much salt.",
          "A Vigenère coder enters the lounge. The host says, 'Give me a key or we'll salt your hash.'",
          "Hacker's lullaby: All in all, we are just another stream in the firewall flow.",
          "To understand security recursion, you must first understand security recursion."
        ];
        playSynthSound('beep');
        setSystemAlert(jokes[Math.floor(Math.random() * jokes.length)]);
        break;
      case 'challenge':
        const challenges = [
          { cipherText: "KHOOR ZRUOG", plainText: "HELLO WORLD", hint: "Caesar shift of 3", type: "caesar" },
          { cipherText: "WTAAA VMZTL", plainText: "CYBER SPACE", hint: "Vigenère coded with key: UTOPIA", type: "vigenere" },
          { cipherText: "GXS QXQAO", plainText: "TOP SECRET", hint: "Vigenère coded with key: MATRIX", type: "vigenere" },
          { cipherText: "XUBBY KHAFJE", plainText: "HELLO CRYPTO", hint: "Caesar shift of 16", type: "caesar" },
          { cipherText: "PZCHBBM EVVV", plainText: "SECURITY DATA", hint: "Vigenère coded with key: CYBER", type: "vigenere" }
        ];
        const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
        setActiveChallenge(randomChallenge);
        playSynthSound('radar');
        setSystemAlert("INTERCEPTING SECURITY PACKET! BREAK IT IN THE CRYPTANALYSIS LAB SHEETS!");
        break;
      case 'submit':
        if (!activeChallenge) {
          setSystemAlert("WARNING: NO ACTIVE PACKET CHALLENGE FOUND. RUN /challenge TO SNIFF FOR INBOUND TRAFFIC.");
          break;
        }
        const userSubmission = args.join(' ').trim().toUpperCase();
        if (userSubmission === activeChallenge.plainText) {
          playSynthSound('success');
          setSystemAlert("SUCCESS! CODENAME CRACKED. ESCALATING PROFILE TO LEGENDARY!");
          setProfile(p => ({ ...p, codename: `LEGENDARY_${p.codename.replace('AGENT_', '').replace('ROOT#ROOT_', '')}` }));
          setActiveChallenge(null);
        } else {
          playSynthSound('alarm');
          setSystemAlert(`REJECTED CODE: '${userSubmission}' IS REDUNDANT. RETRY OR REVIEW FREQUENCIES!`);
        }
        break;
      case 'help':
        setSystemAlert("PROTOCOLS: /ai, /key, /shift, /burn, /autoencrypt, /theme, /status, /hack, /ping, /whoami, /matrix, /sound, /shake, /sudo, /joke, /challenge, /submit");
        break;
      default:
        setSystemAlert(`UNKNOWN PROTOCOL: ${command}`);
        return false;
    }

    // Larger timeout for jokes/help
    const alertTimeout = ['joke', 'fortune', 'help'].includes(command) ? 6000 : 3500;
    setTimeout(() => setSystemAlert(null), alertTimeout);
    return true;
  };

  const sendMessageDirectly = async (msgText: string) => {
    if (!msgText.trim() || !user) return;

    // Check for slash/double-slash command
    if (processCommand(msgText.trim())) {
      setInputMessage('');
      return;
    }

    const encrypted = autoEncrypt 
      ? Cipher.encrypt(msgText, vigenereKey, caesarShift, activeCipherType)
      : msgText;
    
    // We omit 'id' as Firestore will generate it
    const newMessage = {
      content: encrypted,
      sender: impersonatedAgent ? impersonatedAgent.id : user.uid,
      timestamp: Date.now(),
      crypto_key: autoEncrypt ? vigenereKey : "",
      crypto_shift: autoEncrypt ? caesarShift : 0,
      crypto_type: autoEncrypt ? activeCipherType : CipherType.HYBRID,
      burn: burnMode,
      profile: impersonatedAgent ? impersonatedAgent.profile : profile,
      readBy: []
    };

    try {
      await addDoc(collection(db, 'messages'), newMessage);
      setInputMessage('');
      if (burnMode) setBurnMode(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'messages');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageDirectly(inputMessage);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 20000) {
      alert("FILE TOO LARGE: Cryptographic buffer limit exceeded (MAX: 20KB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        const encrypted = autoEncrypt 
          ? Cipher.encrypt(text, vigenereKey, caesarShift, activeCipherType)
          : text;
        const newMessage = {
          content: encrypted,
          sender: user.uid,
          timestamp: Date.now(),
          crypto_key: autoEncrypt ? vigenereKey : "",
          crypto_shift: autoEncrypt ? caesarShift : 0,
          crypto_type: autoEncrypt ? activeCipherType : CipherType.HYBRID,
          burn: burnMode,
          profile: profile,
          readBy: [],
          isAttachment: true,
          fileName: file.name
        };
        try {
          await addDoc(collection(db, 'messages'), newMessage);
          if (burnMode) setBurnMode(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'messages');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAiInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isAiLoading) return;

    const userMsg = aiPrompt;
    setAiPrompt('');
    setAiHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsAiLoading(true);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: userMsg,
          context: `Current Vigenère Key: ${vigenereKey}, Caesar Shift: ${caesarShift}`
        }),
      });
      const data = await response.json();
      setAiHistory(prev => [...prev, { role: 'ai', content: data.response || data.error || 'Connection failed.' }]);
    } catch (err) {
      setAiHistory(prev => [...prev, { role: 'ai', content: 'Protocol error: AI uplink severed.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleNeuralInsight = async (msgContent: string) => {
    if (isAnalysing) return;
    setIsAnalysing(true);
    setShowAIPanel(true);
    setAiPrompt(`Analyze this intercepted packet: "${msgContent}"`);
    // Automated trigger
    const pseudoEvent = { preventDefault: () => {} } as React.FormEvent;
    
    // We need to wait for state to update or just call the logic
    await (async () => {
      setAiHistory(prev => [...prev, { role: 'user', content: `Analyze this intercepted packet: "${msgContent}"` }]);
      try {
        const response = await fetch('/api/gemini/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: `Analyze this intercepted packet: "${msgContent}"`,
            context: `Key: ${vigenereKey}, Shift: ${caesarShift}`
          }),
        });
        const data = await response.json();
        setAiHistory(prev => [...prev, { role: 'ai', content: data.response || data.error }]);
      } catch (err) {
        setAiHistory(prev => [...prev, { role: 'ai', content: 'Uplink error.' }]);
      } finally {
        setIsAiLoading(false);
        setIsAnalysing(false);
        setAiPrompt('');
      }
    })();
  };

  // --- Quick Command List Definitions & Logic ---
  const quickCommandsList = [
    {
      command: '/ai',
      parameters: '<prompt>',
      description: 'Invoke Neural Cryptanalyst or toggle assistant panel',
      category: 'Agent AI',
      icon: 'Brain',
      action: (arg?: string) => {
        if (arg) {
          handleNeuralInsight(arg);
        } else {
          setShowAIPanel(prev => !prev);
        }
      }
    },
    {
      command: '/key',
      parameters: '<text>',
      description: 'Update Vigenère secret encryption key keyword',
      category: 'Cryptography',
      icon: 'Key',
      action: (arg?: string) => {
        if (arg) {
          setVigenereKey(arg.toUpperCase());
          playSynthSound('beep');
          setSystemAlert(`PROTOCOL KEY UPDATED TO: ${arg.toUpperCase()}`);
        } else {
          setSystemAlert("USE: /key <text_key>");
        }
      }
    },
    {
      command: '/shift',
      parameters: '<num>',
      description: 'Adjust Caesar Shift entropy index factor',
      category: 'Cryptography',
      icon: 'RefreshCw',
      action: (arg?: string) => {
        if (arg) {
          const s = parseInt(arg);
          if (!isNaN(s)) {
            setCaesarShift(s);
            playSynthSound('beep');
            setSystemAlert(`ENTROPY SHIFT UPDATED TO: ${s}`);
          }
        } else {
          setSystemAlert("USE: /shift <number>");
        }
      }
    },
    {
      command: '/autoencrypt',
      description: 'Toggle automatic encryption for sent messages',
      category: 'Cryptography',
      icon: 'Shield',
      action: () => {
        setAutoEncrypt(prev => !prev);
        playSynthSound('beep');
        setSystemAlert(`AUTO-ENCRYPTION PROTOCOL: ${!autoEncrypt ? 'ENABLED' : 'PASTETHRU (BYPASS)'}`);
      }
    },
    {
      command: '/burn',
      description: 'Toggle message auto-destruct burn protocol state',
      category: 'Operation',
      icon: 'Flame',
      action: () => {
        setBurnMode(!burnMode);
        playSynthSound(burnMode ? 'beep' : 'alarm');
        setSystemAlert(`SELF-DESTRUCT PROTOCOL: ${!burnMode ? 'ARMED' : 'DISARMED'}`);
      }
    },
    {
      command: '/theme',
      parameters: '<skin>',
      description: 'Switch Identity Skin (indigo | emerald | cyan | amber | rose | violet | matrix | cyberpunk | blood | ghost | [hex])',
      category: 'Skins',
      icon: 'Eye',
      action: (arg?: string) => {
        if (arg) {
          const lowerArg = arg.toLowerCase();
          if (lowerArg === 'matrix') {
            setProfile(p => ({ ...p, color: 'emerald', customColor: '#00ff00' }));
            setShowMatrix(true);
            playSynthSound('success');
            setSystemAlert("MATRIX_GRID INTRUSION FEED: PLUGGED IN");
          } else if (lowerArg === 'cyberpunk') {
            setProfile(p => ({ ...p, color: 'rose', customColor: '#ff007f' }));
            playSynthSound('success');
            setSystemAlert("CYBERPUNK NEON DRIFT ACTIVED!");
          } else if (lowerArg === 'blood') {
            setProfile(p => ({ ...p, color: 'rose', customColor: '#991b1b' }));
            setScreenShake(true);
            playSynthSound('alarm');
            setTimeout(() => setScreenShake(false), 800);
            setSystemAlert("ALERT: HIGH-THREAT HOSTILE THEME APPLIED");
          } else if (lowerArg === 'ghost') {
            setProfile(p => ({ ...p, color: 'indigo', customColor: '#64748b' }));
            playSynthSound('radar');
            setSystemAlert("GHOST PROFILE CAMOUFLAGE ACTIVED");
          } else if (lowerArg.startsWith('#')) {
            setProfile(p => ({ ...p, customColor: lowerArg }));
            playSynthSound('success');
            setSystemAlert(`TRANSMISSION SKIN OVERWRITTEN: ${lowerArg}`);
          } else {
            const theme = COLOR_OPTIONS.find(c => c.id === lowerArg);
            if (theme) {
              setProfile(p => ({ ...p, color: theme.id, customColor: undefined }));
              playSynthSound('beep');
              setSystemAlert(`IDENTITY THEME UPDATED: ${theme.name}`);
            } else {
              setSystemAlert("SKINS: indigo, emerald, cyan, amber, rose, violet, matrix, cyberpunk, blood, ghost, or #[hex]");
            }
          }
        } else {
          setSystemAlert("USE: /theme <indigo|emerald|cyan|amber|rose|violet|matrix|cyberpunk|blood|ghost|#[hex_code]>");
        }
      }
    },
    {
      command: '/status',
      parameters: '<online|busy|away>',
      description: 'Change agent signal status label',
      category: 'Agent AI',
      icon: 'Activity',
      action: (arg?: string) => {
        if (arg && ['online', 'busy', 'away'].includes(arg.toLowerCase())) {
          setUserStatus(arg.toLowerCase() as any);
          playSynthSound('beep');
          setSystemAlert(`AVAILABILITY UPDATED: ${arg.toUpperCase()}`);
        } else {
          setSystemAlert("USE: /status <online|busy|away>");
        }
      }
    },
    {
      command: '/challenge',
      description: 'Intercept and register cryptographic telemetry packet challenge',
      category: 'Minigames',
      icon: 'Binary',
      action: () => {
        const challenges = [
          { cipherText: "KHOOR ZRUOG", plainText: "HELLO WORLD", hint: "Caesar shift of 3", type: "caesar" },
          { cipherText: "WTAAA VMZTL", plainText: "CYBER SPACE", hint: "Vigenère coded with key: UTOPIA", type: "vigenere" },
          { cipherText: "GXS QXQAO", plainText: "TOP SECRET", hint: "Vigenère coded with key: MATRIX", type: "vigenere" },
          { cipherText: "XUBBY KHAFJE", plainText: "HELLO CRYPTO", hint: "Caesar shift of 16", type: "caesar" },
          { cipherText: "PZCHBBM EVVV", plainText: "SECURITY DATA", hint: "Vigenère coded with key: CYBER", type: "vigenere" }
        ];
        const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
        setActiveChallenge(randomChallenge);
        playSynthSound('radar');
        setSystemAlert("INTERCEPTING SECURITY PACKET! BREAK IT IN THE CRYPTANALYSIS LAB!");
      }
    },
    {
      command: '/submit',
      parameters: '<plaintext>',
      description: 'Submit decrypted text to solve current active packet challenge',
      category: 'Minigames',
      icon: 'Check',
      action: (arg?: string) => {
        if (!arg) {
          setSystemAlert("USE: /submit <plaintext>");
          return;
        }
        if (!activeChallenge) {
          setSystemAlert("WARNING: NO ACTIVE PACKET CHALLENGE FOUND. RUN /challenge FIRST.");
          return;
        }
        const userSubmission = arg.trim().toUpperCase();
        if (userSubmission === activeChallenge.plainText) {
          playSynthSound('success');
          setSystemAlert("SUCCESS! CODENAME CRACKED. ESCALATING PROFILE TO LEGENDARY!");
          setProfile(p => ({ ...p, codename: `LEGENDARY_${p.codename.replace('AGENT_', '').replace('ROOT#ROOT_', '')}` }));
          setActiveChallenge(null);
        } else {
          playSynthSound('alarm');
          setSystemAlert(`REJECTED CODE: '${userSubmission}' IS INCORRECT. RETRY!`);
        }
      }
    },
    {
      command: '/hack',
      parameters: '<node_ip>',
      description: 'Execute deep terminal sweep protocol simulator on input core',
      category: 'Minigames',
      icon: 'Target',
      action: (arg?: string) => {
        if (arg) {
          setIsHacking(true);
          setHackTarget(arg.toUpperCase());
          playSynthSound('alarm');
          setTimeout(() => {
            setIsHacking(false);
            playSynthSound('success');
          }, 5000);
          setSystemAlert(`INITIALIZING_BRUTE_FORCE_ON: ${arg.toUpperCase()}`);
        } else {
          setSystemAlert("USE: /hack <target_node>");
        }
      }
    },
    {
      command: '/sudo',
      description: 'Activating superuser override mode configuration',
      category: 'Operation',
      icon: 'Shield',
      action: () => {
        setIsSudoMode(!isSudoMode);
        playSynthSound('alarm');
        if (!isSudoMode) {
          setSystemAlert("PRIVILEGE ESCALATION: SUPERUSER ALIAS DEPLOYED");
          setProfile(p => ({ ...p, codename: `ROOT#ROOT_${p.codename.replace('AGENT_', '') || 'SYS'}` }));
        } else {
          setSystemAlert("SUPERUSER DEACTIVATED: RESTORING DEFAULTS");
          setProfile(p => ({ ...p, codename: `AGENT_${Math.floor(Math.random() * 9000 + 1000)}` }));
        }
      }
    },
    {
      command: '/joke',
      description: 'Fetch random offline security humor logs',
      category: 'Utility',
      icon: 'Smile',
      action: () => {
        const jokes = [
          "10 types of nodes in cyber space: those who decode dual variables, and those who don't.",
          "My software has zero glitches, it only introduces randomized features.",
          "Algorithms are like encryption recipes: we just tend to bake them with too much salt.",
          "A Vigenère coder enters the lounge. The host says, 'Give me a key or we'll salt your hash.'",
          "Hacker's lullaby: All in all, we are just another stream in the firewall flow.",
          "To understand security recursion, you must first understand security recursion."
        ];
        playSynthSound('beep');
        setSystemAlert(jokes[Math.floor(Math.random() * jokes.length)]);
      }
    },
    {
      command: '/ping',
      description: 'Measure node signal round-trip time latency to server proxy',
      category: 'Utility',
      icon: 'Zap',
      action: () => {
        playSynthSound('morse');
        setSystemAlert(`PONG! IR_LATENCY: ${Math.floor(Math.random() * 50) + 10}ms // SECURE_RELAY_STABLE`);
      }
    },
    {
      command: '/whoami',
      description: 'Diagnose current network authorization profile metadata',
      category: 'Utility',
      icon: 'UserCircle',
      action: () => {
        playSynthSound('radar');
        setSystemAlert(`AGENT_ID: ${profile.codename} // CID: ${user?.uid.substring(0, 8)} // LEVEL: ${isEscalated ? 'ADM' : (isSudoMode ? 'SUPER' : 'OP')}`);
      }
    },
    {
      command: '/matrix',
      description: 'Toggle viewport binary computer matrix rainfall visualizer',
      category: 'Skins',
      icon: 'Binary',
      action: () => {
        setShowMatrix(!showMatrix);
        playSynthSound('success');
        setSystemAlert(`MATRIX SIMULATION: ${!showMatrix ? 'ENGAGED' : 'ABORTED'}`);
      }
    },
    {
      command: '/shake',
      description: 'Force visual shock tremor screen vibration feedback feed',
      category: 'Utility',
      icon: 'Activity',
      action: () => {
        setScreenShake(true);
        playSynthSound('alarm');
        setSystemAlert("DANGER: INTEGRITY LEAK RECOGNIZED!");
        setTimeout(() => setScreenShake(false), 1500);
      }
    },
    {
      command: '//infinite',
      description: 'Toggle simulated infinite signal buffer feed activity simulator',
      category: 'Simulations',
      icon: 'Cpu',
      action: () => {
        setInfiniteMode(prev => !prev);
        playSynthSound('radar');
        setSystemAlert(`INFINITE SEQUENCE PROTOCOL: ${!infiniteMode ? 'ACTIVATED. SYSTEM SIMULATOR ON.' : 'DEENGAGED. RESTORE STABILITY.'}`);
      }
    }
  ];

  // Match and filter commands based on query (strip prefix for better index search)
  const filteredCommands = quickCommandsList.filter(cmd => {
    const queryClean = quickCommandSearch.trim().toLowerCase().replace(/^\/+/, '');
    const cmdClean = cmd.command.toLowerCase().replace(/^\/+/, '');
    return (
      cmdClean.includes(queryClean) ||
      cmd.description.toLowerCase().includes(queryClean) ||
      cmd.category.toLowerCase().includes(queryClean)
    );
  });

  const triggerQuickCommand = (cmd: typeof quickCommandsList[0]) => {
    const searchVal = quickCommandSearch.trim();
    const parts = searchVal.split(' ');
    const hasTypedArgs = searchVal.startsWith(cmd.command) && parts.length > 1;
    const typedArgsValue = hasTypedArgs ? parts.slice(1).join(' ') : null;

    setShowQuickCommand(false);
    setQuickCommandSearch('');
    
    if (!cmd.parameters || hasTypedArgs) {
      if (hasTypedArgs) {
        cmd.action(typedArgsValue || undefined);
      } else {
        cmd.action();
      }
    } else {
      setInputMessage(`${cmd.command} `);
      setTimeout(() => {
        if (mainChatInputRef.current) {
          mainChatInputRef.current.focus();
        }
      }, 50);
    }
  };

  // Keyboard shortcut listener for '/' and 'Ctrl+K' / navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated || !user) return;

      // Escape to close quick command list
      if (e.key === 'Escape' && showQuickCommand) {
        e.preventDefault();
        setShowQuickCommand(false);
        return;
      }

      // Alt+K focuses the protocol key input or toggles back to chat input
      if (e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (document.activeElement === protocolKeyInputRef.current) {
          if (mainChatInputRef.current) {
            mainChatInputRef.current.focus();
            setSystemAlert('DESK CONTROL: RE-ENGAGING CENTRAL COMMUNICATIONS.');
          }
        } else {
          if (protocolKeyInputRef.current) {
            protocolKeyInputRef.current.focus();
            protocolKeyInputRef.current.select();
            setSystemAlert('KEY CONTROL: KEY CONSOLE ENGAGED. ENTER THE DISPATCH DECRYPTION SEED.');
          }
        }
        playSynthSound?.('beep');
        return;
      }

      // Ctrl + Enter or Cmd + Enter to broadcast message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !showQuickCommand) {
        e.preventDefault();
        if (inputMessage.trim()) {
          sendMessageDirectly(inputMessage);
          setSystemAlert('BROADCAST SHED: ENCRYPTING AND DISPATCHING PACKET...');
          playSynthSound?.('success');
        }
        return;
      }

      // Ctrl + K or Cmd + K toggles palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowQuickCommand(prev => !prev);
        setQuickCommandSearch('');
        setQuickCommandSelectedIdx(0);
        return;
      }

      // '/' toggles palette when not inside an input field
      if (e.key === '/' && !showQuickCommand) {
        if (
          document.activeElement?.tagName !== 'INPUT' && 
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          setShowQuickCommand(true);
          setQuickCommandSearch('');
          setQuickCommandSelectedIdx(0);
          return;
        }
      }

      // Intercept movement and submit keys when quick commands is open
      if (showQuickCommand) {
        const totalFiltered = filteredCommands.length;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setQuickCommandSelectedIdx(prev => (totalFiltered > 0 ? (prev + 1) % totalFiltered : 0));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setQuickCommandSelectedIdx(prev => (totalFiltered > 0 ? (prev - 1 + totalFiltered) % totalFiltered : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (totalFiltered > 0 && quickCommandSelectedIdx < totalFiltered) {
            triggerQuickCommand(filteredCommands[quickCommandSelectedIdx]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, user, showQuickCommand, quickCommandSearch, quickCommandSelectedIdx, filteredCommands, inputMessage]);

  const renderQuickCommandIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain': return <Brain size={14} />;
      case 'Key': return <Key size={14} />;
      case 'RefreshCw': return <RefreshCw size={14} />;
      case 'Flame': return <Flame size={14} />;
      case 'Eye': return <Eye size={14} />;
      case 'Activity': return <Activity size={14} />;
      case 'Binary': return <Binary size={14} />;
      case 'Check': return <Check size={14} />;
      case 'Target': return <Target size={14} />;
      case 'Shield': return <Shield size={14} />;
      case 'Smile': return <Smile size={14} />;
      case 'Zap': return <Zap size={14} />;
      case 'UserCircle': return <UserCircle size={14} />;
      case 'Cpu': return <Cpu size={14} />;
      default: return <Terminal size={14} />;
    }
  };

  // UI Components
  if (isUserBanned) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 z-[9999] border-4 border-rose-950 font-mono">
        <div className="max-w-md w-full bg-rose-950/15 border border-rose-500/30 p-8 rounded-2xl text-center space-y-6 shadow-2xl backdrop-blur-sm">
          <div className="w-20 h-20 mx-auto bg-rose-500/10 border-2 border-rose-500 rounded-full flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/20 animate-pulse">
            <Skull size={36} className="text-rose-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-rose-500 tracking-[0.2em] uppercase">ACCESS DENIED</h1>
            <p className="text-[10px] text-rose-400/70 uppercase tracking-widest font-black">YOUR SECURITY CLEARANCE HAS BEEN PERMANENTLY REVOKED</p>
          </div>
          <p className="p-4 bg-black/60 rounded-xl border border-rose-500/15 text-slate-400 text-[11px] leading-relaxed">
            Your connection to the Vigenère Secret Network has been terminated. This account has been blacklisted by network administration.
          </p>
          <div className="pt-2">
            <button 
              onClick={handleLogout}
              className="px-6 py-3 bg-rose-950/40 hover:bg-rose-900 border border-rose-500 text-rose-200 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all"
            >
              Disconnect Node
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (globalFailedAttempts >= 3 || gateFailedAttempts >= 3) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center p-4 z-[200]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="max-w-md w-full bg-slate-900 shadow-2xl border border-rose-500/30 rounded-3xl p-10 text-center space-y-8"
        >
          <div className="relative flex items-center justify-center w-28 h-28 mx-auto">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, -2, 2, 0] 
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 4,
                ease: "easeInOut"
              }}
              onClick={() => {
                setGlobalFailedAttempts(0);
                setGateFailedAttempts(0);
                setGlobalCode('');
                setGatePassword('');
                playSynthSound('success');
              }}
              className="relative flex items-center justify-center w-28 h-28 cursor-pointer select-none group"
            >
              <div className="absolute inset-0 bg-rose-600 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <Shield className="w-24 h-24 text-rose-600 fill-rose-600/10 group-hover:scale-105 group-hover:text-rose-500 transition-transform duration-300" />
              <Ban className="w-10 h-10 text-white absolute group-hover:scale-110 transition-transform duration-300" />
            </motion.div>
          </div>

          <div className="space-y-4">
            <h1 className="text-xl font-bold uppercase text-rose-500 tracking-tight font-sans">
              Oops. You can\'t go there.
            </h1>
            <div className="text-2xl font-black tracking-widest text-white uppercase font-sans animate-pulse">
              Om says NO!
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isGlobalAuthorized) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-slate-900 shadow-2xl border border-slate-800 rounded-3xl p-10 space-y-8"
        >
          <div className="text-center space-y-4">
            <div className={`w-20 h-20 mx-auto bg-black rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-lg shadow-indigo-500/10 ${adminAuthStep > 0 ? 'border-rose-500/40 text-rose-500 shadow-rose-500/10' : ''}`}>
              <Terminal size={40} />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                {adminAuthStep === 1 ? 'Admin Verification L2' : 'Program Access'}
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                {adminAuthStep === 1 ? 'High-Level Credentials Required' : 'Encrypted Shell v4.2.0'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input 
                type="password"
                value={globalCode}
                onChange={(e) => setGlobalCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (adminAuthStep === 0) {
                      if (globalCode.toLowerCase() === 'omed') {
                        setIsGlobalAuthorized(true);
                        setGlobalCode('');
                        setGlobalFailedAttempts(0);
                      } else if (globalCode === '14062013') {
                        setAdminAuthStep(1);
                        setGlobalCode('');
                        setGlobalFailedAttempts(0);
                      } else {
                        setGlobalError(true);
                        setGlobalFailedAttempts(prev => prev + 1);
                        setTimeout(() => setGlobalError(false), 1000);
                      }
                    } else if (adminAuthStep === 1) {
                      const cleanCode = globalCode.toLowerCase();
                      if (cleanCode === 'omed' || cleanCode === 'ciphers!') {
                        setAdminAuthStep(2);
                        setIsGlobalAuthorized(true);
                        setIsEscalated(true);
                        setGlobalCode('');
                        setGlobalFailedAttempts(0);
                      } else {
                        setGlobalError(true);
                        setGlobalFailedAttempts(prev => prev + 1);
                        setTimeout(() => setGlobalError(false), 1000);
                      }
                    }
                  }
                }}
                className={`w-full bg-black border ${globalError ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-6 py-4 text-center tracking-[0.5em] text-white focus:outline-none focus:border-indigo-600 transition-all font-mono text-xl`}
                placeholder={adminAuthStep === 1 ? "ADMIN_SECRET" : "PROG_CODE"}
                autoFocus
              />
              {globalError && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-rose-500 font-bold uppercase tracking-widest"
                >
                  Access Denied: Invalid {adminAuthStep === 1 ? 'Secret' : 'Code'}
                </motion.p>
              )}
            </div>

            <button 
              onClick={() => {
                if (adminAuthStep === 0) {
                  if (globalCode.toLowerCase() === 'omed') {
                    setIsGlobalAuthorized(true);
                    setGlobalCode('');
                    setGlobalFailedAttempts(0);
                  } else if (globalCode === '14062013') {
                    setAdminAuthStep(1);
                    setGlobalCode('');
                    setGlobalFailedAttempts(0);
                  } else {
                    setGlobalError(true);
                    setGlobalFailedAttempts(prev => prev + 1);
                    setTimeout(() => setGlobalError(false), 1000);
                  }
                } else if (adminAuthStep === 1) {
                  const cleanCode = globalCode.toLowerCase();
                  if (cleanCode === 'omed' || cleanCode === 'ciphers!') {
                    setAdminAuthStep(2);
                    setIsGlobalAuthorized(true);
                    setIsEscalated(true);
                    setGlobalCode('');
                    setGlobalFailedAttempts(0);
                  } else {
                    setGlobalError(true);
                    setGlobalFailedAttempts(prev => prev + 1);
                    setTimeout(() => setGlobalError(false), 1000);
                  }
                }
              }}
              className={`w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black tracking-[0.3em] uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-95 ${adminAuthStep === 1 ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : ''}`}
            >
              {adminAuthStep === 1 ? 'Escalate Privileges' : 'Initialize Boot Sequence'}
            </button>
          </div>

          <p className="text-[8px] text-center text-slate-600 uppercase tracking-widest leading-loose">
            Authorized Personnel Only // Global Encryption Standard v9.1
          </p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto border border-indigo-500/20 bg-slate-950 rounded-2xl flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/10">
              {isOnboarding ? <Fingerprint className="w-10 h-10" /> : <Shield className="w-10 h-10" />}
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold uppercase tracking-tight text-white">
                {isOnboarding ? 'Agent Initialization' : 'Vigenère Secret Network'}
              </h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                {isOnboarding ? 'Set your permanent network identity' : 'Security Level: Class 1 Encryption'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {!user ? (
               <div className="space-y-4">
                 <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold">Authentication Required to join the network</p>
                 <button 
                  onClick={() => signInWithGoogle().catch(console.error)}
                  className="w-full py-4 bg-white text-slate-950 rounded-xl text-xs font-black tracking-widest uppercase shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-slate-100"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" /> Establish Google Identity
                </button>
               </div>
            ) : showNewUserQuery ? (
              <div className="space-y-6 text-center">
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase text-indigo-400 tracking-widest">Protocol Sync Failure</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-black">Agent profile not found in global directory. Are you a new recruit?</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setIsOnboarding(true);
                      setShowNewUserQuery(false);
                    }}
                    className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Yes, Initializing
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    No, Abort
                  </button>
                </div>
              </div>
            ) : isOnboarding ? (
              <div className="space-y-6">
                 <div className="space-y-4">
                   <div>
                     <label className="text-[9px] font-black uppercase text-slate-500 block mb-2 px-1">Network Codename</label>
                     <input 
                       type="text"
                       value={onboardingCodename}
                       onChange={(e) => setOnboardingCodename(e.target.value)}
                       className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none focus:border-indigo-500"
                       placeholder="e.g. PHANTOM_PILOT"
                     />
                   </div>
                   <div>
                     <label className="text-[9px] font-black uppercase text-slate-500 block mb-2 px-1">Master Access Key (Permanent)</label>
                     <input 
                       type="password"
                       value={onboardingKey}
                       onChange={(e) => setOnboardingKey(e.target.value)}
                       className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none focus:border-indigo-500"
                       placeholder="Minimum 4 characters"
                     />
                   </div>
                   <div>
                     <label className="text-[9px] font-black uppercase text-slate-500 block mb-2 px-1 font-bold">Personal Password (Optional)</label>
                     <input 
                       type="password"
                       value={onboardingPersonalPassword}
                       onChange={(e) => setOnboardingPersonalPassword(e.target.value)}
                       className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none focus:border-indigo-500"
                       placeholder="Set custom personal unlock password"
                     />
                   </div>
                 </div>
                 <button 
                  onClick={handleOnboardingComplete}
                  disabled={onboardingKey.length < 4 || !onboardingCodename.trim()}
                  className="w-full py-4 bg-indigo-600 disabled:opacity-50 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-[0.25em] uppercase shadow-lg transition-all active:scale-95 border border-indigo-500/30"
                >
                  Confirm Identity Link
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full py-3 text-[10px] text-slate-600 uppercase font-bold hover:text-slate-400 text-center"
                >
                  Cancel Connection
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={gatePassword}
                    onChange={(e) => setGatePassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                    className={`w-full bg-slate-950/80 border ${gateError ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-4 py-3.5 text-center tracking-[0.4em] text-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all font-mono text-lg`}
                    placeholder="••••••••"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-indigo-400 p-2"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {gateError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-rose-500 text-[10px] font-bold uppercase tracking-widest text-center"
                  >
                    Protocol verification mismatch
                  </motion.p>
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={handleUnlock}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 border border-indigo-500/30"
                  >
                    <Fingerprint size={16} /> Open Gateway
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-12 h-14 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl flex items-center justify-center transition-all"
                    title="Disconnect"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
          
          {isOffline && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-3">
               <AlertTriangle size={16} className="text-rose-500" />
               <p className="text-[9px] font-bold text-rose-400 uppercase">Network connection unstable. Retrying...</p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const activeColor = COLOR_OPTIONS.find(c => c.id === profile.color) || COLOR_OPTIONS[0];

  return (
    <motion.div 
      animate={screenShake ? { x: [-12, 12, -12, 12, -6, 6, -3, 3, 0], y: [-4, 4, -4, 4, -2, 2, -1, 1, 0] } : {}}
      transition={{ duration: 0.6 }}
      className="flex flex-col min-h-screen bg-[#020617] text-slate-200 font-sans overflow-y-auto p-6 gap-6"
    >
      <AnimatePresence>
        {showMatrix && (
          <MatrixRainOverlay 
            onClose={() => setShowMatrix(false)} 
            playSynthSound={playSynthSound} 
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">Vigenère Secret Network <span className="text-slate-500 font-normal">/ SECURITY_HUB</span></h1>
            {isEscalated ? (
              <div className="flex items-center gap-3">
                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1">
                  <Lock size={8} /> Admin Override Mode Active
                </p>
                {impersonatedAgent && (
                  <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded text-[9px] font-black uppercase text-rose-400 tracking-wider">
                    <span>Impersonating: {impersonatedAgent.profile.codename}</span>
                    <button 
                      onClick={() => setImpersonatedAgent(null)}
                      className="hover:text-white underline underline-offset-2"
                    >
                      Withdraw
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">System Integrity & Cryptographic Relay — Secure Link Established.</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-4">
            <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 font-mono">NODE_ID: #F882-X9</div>
            <div className={`px-3 py-1 rounded text-[10px] font-semibold flex items-center gap-2 ${isEscalated ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isEscalated ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
              {isEscalated ? 'UNSTABLE ACCESS' : 'SYSTEM SECURE'}
            </div>
          </div>
          
          <button 
            onClick={() => setActiveCipherType(activeCipherType === CipherType.MORSE ? CipherType.HYBRID : CipherType.MORSE)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all shadow-sm ${activeCipherType === CipherType.MORSE ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80'}`}
            title="Toggle Morse Modulation"
          >
            <Radio size={14} className={activeCipherType === CipherType.MORSE ? 'animate-pulse' : ''} />
            <span className="text-[10px] font-black tracking-widest uppercase">Morse</span>
          </button>

          <button 
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all shadow-sm ${showAIPanel ? 'bg-rose-500 border-rose-400 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80'}`}
            title="Neural Link (Gemini AI)"
          >
            <Brain size={14} className={isAiLoading ? 'animate-pulse' : ''} />
            <span className="text-[10px] font-black tracking-widest uppercase">Neural Link</span>
          </button>

          <button 
            onClick={() => setShowDirectory(!showDirectory)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all shadow-sm ${showDirectory ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80'}`}
          >
            <Users size={14} />
            <span className="text-[10px] font-black tracking-widest uppercase">Directory</span>
          </button>

          <button 
            onClick={openProfileModal}
            className={`flex items-center gap-3 px-4 py-2 border rounded-xl transition-all shadow-sm ${impersonatedAgent ? 'bg-rose-900/40 border-rose-500/50' : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/80'}`}
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: impersonatedAgent ? (impersonatedAgent.profile.customColor || '#f43f5e') : (profile.customColor || activeColor.hex) }} 
            />
            <span className="text-[10px] font-black tracking-widest uppercase">
              {impersonatedAgent ? `IMPERSONATING: ${impersonatedAgent.profile.codename}` : profile.codename}
            </span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 hover:text-rose-400 transition-all shadow-sm"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        <main className="flex-1 flex flex-col gap-6 overflow-hidden relative">
          {/* Controls Bar (Mini Bento) */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex justify-between items-center px-6 shrink-0 shadow-sm">
            <div className="flex items-center gap-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Key size={12} className="text-indigo-400" />
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Protocol Key</span>
                </div>
                <div className="relative">
                  <input 
                    ref={protocolKeyInputRef}
                    type="text" 
                    value={vigenereKey}
                    onChange={(e) => setVigenereKey(e.target.value.toUpperCase())}
                    className="bg-black/40 border border-slate-800 rounded px-2 py-1 text-[10px] font-mono text-indigo-300 w-28 uppercase focus:border-indigo-500/50 outline-none block"
                    placeholder="KEYWORD..."
                  />
                  {(() => {
                    const strObj = getVigenereKeyStrength(vigenereKey);
                    return (
                      <div className="mt-1 space-y-0.5 w-28">
                        <div className="h-1 w-full bg-slate-900 border border-slate-800/80 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${strObj.color}`} 
                            style={{ width: strObj.width }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[6px] font-mono font-black tracking-widest px-0.5">
                          <span className="text-slate-600">STRENGTH</span>
                          <span className={strObj.text}>{strObj.label}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RefreshCw size={12} className="text-cyan-400" />
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Entropy Shift</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" min="0" max="94"
                    value={caesarShift}
                    onChange={(e) => setCaesarShift(parseInt(e.target.value))}
                    className="w-24 accent-cyan-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 border border-cyan-500/20 px-1.5 rounded">{caesarShift}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield size={12} className={autoEncrypt ? "text-emerald-400 animate-pulse" : "text-rose-400"} />
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Auto Encrypt</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAutoEncrypt(!autoEncrypt);
                    playSynthSound('beep');
                    setSystemAlert(`AUTO-ENCRYPTION MODE: ${!autoEncrypt ? 'ACTIVATED' : 'BYPASSED'}`);
                  }}
                  className={`px-3 py-1 text-[9px] font-black tracking-widest rounded uppercase transition-all font-mono border block ${
                    autoEncrypt 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  }`}
                  title="Toggle Automatic Encryption"
                >
                  {autoEncrypt ? 'ENABLED' : 'PASTETHRU'}
                </button>
              </div>
            </div>

            <div className="flex gap-1 bg-black/40 p-1 border border-slate-800 rounded-xl">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 text-[9px] uppercase font-black tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 hover:text-white'}`}
              >
                <MessageSquare size={12} /> Secure Tunnel
              </button>
              <button 
                onClick={() => setActiveTab('lab')}
                className={`px-4 py-2 text-[9px] uppercase font-black tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === 'lab' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 hover:text-white'}`}
              >
                <FlaskConical size={12} /> Cryptanalysis
              </button>
            </div>
          </div>

          {/* Tab Views */}
          <div className="flex-1 overflow-hidden relative flex gap-6">
            <AnimatePresence mode="wait">
               {activeTab === 'chat' ? (
                 <motion.div 
                   key="chat"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="h-full flex flex-col gap-4 overflow-hidden w-full font-sans"
                 >
                    <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-sm relative">
                      {networkJam && networkJam.jammedUntil > currentTimestamp && (
                        <div 
                          id="signal-jammed-alert-banner" 
                          className="bg-amber-950/45 border-b border-amber-500/25 p-3 flex items-center justify-between shrink-0 select-none animate-pulse"
                        >
                          <div className="flex items-center gap-2">
                            <Zap size={14} className="text-amber-400 rotate-12" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Signal Disturbance Active</span>
                              <span className="text-[8px] font-mono text-amber-500 uppercase tracking-wider">
                                Read receipts & decrypt logging are offline.
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              JAMMER: {networkJam.jammedBy === user?.uid ? "YOU" : "UNKNOWN_SOURCE"}
                            </span>
                            <span className="text-[10px] font-black font-mono text-amber-400">
                              -{Math.ceil((networkJam.jammedUntil - currentTimestamp) / 1000)}S
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                        {activeChallenge && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-950/20 border-2 border-emerald-500/30 rounded-xl p-4 text-emerald-400 space-y-2 relative overflow-hidden shrink-0"
                          >
                            <div className="absolute right-2 top-2 opacity-10">
                              <Target size={64} className="text-emerald-400" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Radio size={14} className="text-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Packet Intercepted Challenge Active</span>
                            </div>
                            <p className="text-[11px] font-mono leading-relaxed max-w-xl text-emerald-200">
                              Our deep sensors intercepted an encrypted packet. Use our decrypter tools ("Cryptanalysis" tab) to decipher it. Submit the correct plaintext using <strong className="text-white font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/35">/submit [plaintext]</strong> to escalate your security clearance.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                              <div className="bg-black/50 p-2.5 rounded-lg border border-emerald-500/15 flex flex-col gap-0.5 shrink-0">
                                <span className="text-[8px] text-emerald-600 font-black uppercase">Intercepted Ciphertext</span>
                                <span className="text-xs font-mono font-bold tracking-widest select-all bg-emerald-900/10 px-1.5 py-1 rounded text-white">{activeChallenge.cipherText}</span>
                              </div>
                              <div className="bg-black/30 px-3 py-2.5 rounded-lg border border-emerald-500/10 text-[9px] text-emerald-300 leading-relaxed font-mono">
                                <strong className="text-emerald-500 font-black">HINT:</strong> {activeChallenge.hint}
                              </div>
                            </div>
                          </motion.div>
                        )}
                        {messages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                            <Lock size={48} className="opacity-20 translate-y-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest italic opacity-50">Secure link established. Awaiting inbound packets...</p>
                          </div>
                        ) : (
                          messages.map(msg => (
                            <MessageBubble 
                              key={msg.id} 
                              msg={msg} 
                              currentKey={vigenereKey} 
                              currentShift={caesarShift}
                              currentType={activeCipherType}
                              onAnalyze={handleNeuralInsight}
                              currentUserProfile={profile}
                              networkJam={networkJam}
                              playSynthSound={playSynthSound}
                              allAgents={allAgents}
                              autoEncrypt={autoEncrypt}
                            />
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>                       <div className="p-6 border-t border-slate-800 bg-black/20">
                        {/* Real-time active typing agents */}
                        {allAgents.filter(agent => agent.id !== user?.uid && agent.isTyping === true).length > 0 && (
                          <div id="active-typing-indicators" className="flex items-center gap-2 mb-2 font-mono text-[8.5px] text-slate-400 select-none pl-1 transition-all">
                            <span className="flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                              <span className="font-extrabold uppercase tracking-widest text-[7.5px] text-indigo-400">Stream uplink:</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {allAgents.filter(agent => agent.id !== user?.uid && agent.isTyping === true).map((agent, index, arr) => {
                                const codename = agent.profile?.codename || 'UNKNOWN';
                                const matchingColor = COLOR_OPTIONS.find(c => c.id === agent.profile?.color) || COLOR_OPTIONS[0];
                                const displayColor = agent.profile?.customColor || matchingColor.hex;
                                return (
                                  <span key={agent.id} className="flex items-center gap-1 font-black uppercase text-slate-300">
                                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: displayColor }} />
                                    <span style={{ color: displayColor }}>{codename}</span>
                                    {index < arr.length - 1 && <span className="text-slate-650">,</span>}
                                  </span>
                                );
                              })}
                              <span className="text-slate-500 animate-pulse font-normal lowercase tracking-wide">is typing...</span>
                            </div>
                          </div>
                        )}

                        <form 
                          onSubmit={handleSendMessage}
                          className="space-y-4"
                        >
                          {isListening && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-rose-950/20 border border-rose-500/35 rounded-xl px-4 py-3 text-[10px] font-mono text-rose-300 flex items-center justify-between gap-3 animate-pulse"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                </span>
                                <span className="font-extrabold uppercase tracking-widest text-rose-450 text-[8.5px]">VOICE_CAPT:</span>
                                <div className="text-rose-250 truncate italic select-none">
                                  {interimTranscript || 'Listening to vocal stream... Speak now.'}
                                </div>
                              </div>
                              <div className="text-[8px] border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 rounded uppercase font-black tracking-widest shrink-0 text-rose-400 animate-bounce">
                                UPLINK_LIVE
                              </div>
                            </motion.div>
                          )}

                          <div className="flex gap-4">
                             <div className="flex-1 relative">
                               {systemAlert && (
                                 <motion.div 
                                   initial={{ opacity: 0, scale: 0.9 }}
                                   animate={{ opacity: 1, scale: 1 }}
                                   className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-4 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/40 z-50 flex items-center gap-2"
                                 >
                                   <Zap size={12} /> {systemAlert}
                                 </motion.div>
                               )}

                               <input 
                                 ref={mainChatInputRef}
                                 type="text" 
                                 value={inputMessage}
                                 onChange={(e) => setInputMessage(e.target.value)}
                                 placeholder="ENCRYPT_DATA_PACKET... (Press '/' or 'Ctrl+K' for protocols)"
                                 className={`w-full bg-black/40 border border-slate-800 rounded-xl pl-4 py-3 text-xs outline-none focus:border-indigo-500/50 text-white font-mono transition-all ${isListening ? 'pr-32' : 'pr-20'}`}
                               />
                               <div className="absolute right-3 top-2 flex items-center gap-1.5">
                                 {isListening && (
                                   <AudioVisualizer isListening={isListening} />
                                 )}
                                 <div className="relative group/mic">
                                   <button
                                     id="voice-recognition-btn"
                                     type="button"
                                     onClick={toggleSpeechRecognition}
                                     className={`p-1.5 rounded-lg border transition-all ${
                                       isListening 
                                         ? 'bg-rose-500/20 border-rose-500/45 text-rose-400' 
                                         : 'border-transparent text-slate-500 hover:text-slate-300'
                                     }`}
                                     title={isListening ? "Disengage Voice Transcription" : "Transcribe Voice Input"}
                                   >
                                     {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                                   </button>

                                   {/* Voice Commands Hover Tooltip */}
                                   <div className="absolute bottom-full right-0 mb-2 w-52 bg-slate-950/95 border border-slate-800 text-slate-300 rounded-xl p-3 text-[10px] font-mono shadow-xl opacity-0 scale-95 pointer-events-none group-hover/mic:opacity-100 group-hover/mic:scale-100 transition-all duration-200 z-50">
                                     <div className="text-[9px] font-black uppercase text-indigo-400 tracking-wider mb-2 border-b border-slate-800/80 pb-1 flex items-center justify-between">
                                       <span>Voice Protocols</span>
                                       <span className="text-[8px] text-rose-400 animate-pulse">● Active</span>
                                     </div>
                                     <div className="space-y-1.5 text-slate-400">
                                       <div className="flex justify-between items-center">
                                         <span className="text-white font-bold">/matrix</span>
                                         <span className="text-slate-500 text-[9px]">Toggle Matrix</span>
                                       </div>
                                       <div className="flex justify-between items-center">
                                         <span className="text-white font-bold">/hack</span>
                                         <span className="text-slate-500 text-[9px]">Run scan</span>
                                       </div>
                                       <div className="flex justify-between items-center">
                                         <span className="text-white font-bold">/clear</span>
                                         <span className="text-slate-500 text-[9px]">Flush logs</span>
                                       </div>
                                     </div>
                                     <div className="mt-2 text-[8px] text-slate-500 border-t border-slate-800/50 pt-1.5 leading-relaxed text-center">
                                       Speak command to execute protocol
                                     </div>
                                   </div>
                                 </div>
                                 <button 
                                   type="button"
                                   onClick={() => {
                                     if (fileInputRef.current) fileInputRef.current.click();
                                   }}
                                   className={`p-1.5 rounded-lg border transition-all text-slate-500 border-transparent hover:text-slate-300`}
                                   title="Encapsulate as Attachment"
                                 >
                                   <Paperclip size={14} />
                                 </button>
                               </div>
                               <input 
                                 type="file"
                                 ref={fileInputRef}
                                 onChange={handleFileUpload}
                                 className="hidden"
                                 accept=".txt,.json,.md,.log"
                               />
                             </div>
                             <div className="flex gap-2">
                               <button 
                                 type="button"
                                 onClick={() => {
                                   setAutoEncrypt(!autoEncrypt);
                                   playSynthSound('beep');
                                   setSystemAlert(`AUTO-ENCRYPTION MODE: ${!autoEncrypt ? 'ACTIVATED' : 'BYPASSED'}`);
                                 }}
                                 className={`px-3 rounded-xl border transition-all flex items-center gap-1.5 ${
                                   autoEncrypt 
                                     ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                                     : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                 }`}
                                 title={autoEncrypt ? "Auto Encryption: Enabled" : "Auto Encryption: Disabled"}
                               >
                                 {autoEncrypt ? <Lock size={12} className="text-emerald-400" /> : <Unlock size={12} className="text-rose-400" />}
                                 <span className="text-[8px] font-black uppercase tracking-wider hidden sm:inline">
                                   {autoEncrypt ? 'SECURE' : 'BYPASS'}
                                 </span>
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setBurnMode(!burnMode)}
                                 className={`px-4 rounded-xl border transition-all flex items-center gap-2 ${burnMode ? 'bg-rose-500 border-rose-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                                 title="Self-Destruct Protocol"
                               >
                                 <Flame size={14} />
                               </button>
                               <button 
                                 type="submit"
                                 disabled={!inputMessage.trim()}
                                 className={`px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg ${
                                   autoEncrypt 
                                     ? 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:hover:bg-indigo-600 shadow-indigo-600/20' 
                                     : 'bg-rose-600 hover:bg-rose-500 text-white disabled:hover:bg-rose-600 shadow-rose-600/20'
                                 }`}
                               >
                                 {autoEncrypt ? 'Broadcast' : 'Broadcast Plain'}
                               </button>
                             </div>
                          </div>

                          {inputMessage.trim() && (
                            <div className="text-[9px] font-mono px-4 py-2.5 bg-black/40 border border-slate-800/60 rounded-xl flex items-center justify-between text-slate-400 gap-4 transition-all">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {autoEncrypt ? (
                                  <>
                                    <Lock size={10} className="text-emerald-500 shrink-0" />
                                    <span className="text-emerald-500 font-extrabold uppercase tracking-widest shrink-0">AUTO-ENCRYPT PREVIEW:</span>
                                    <span className="truncate break-all select-all text-slate-200">
                                      {Cipher.encrypt(inputMessage, vigenereKey, caesarShift, activeCipherType)}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock size={10} className="text-rose-500 shrink-0 animate-pulse" />
                                    <span className="text-rose-500 font-extrabold uppercase tracking-widest shrink-0 animate-pulse">PLAINTEXT OVERPASS (BYPASS ENCRYPTION):</span>
                                    <span className="truncate break-all text-slate-400">
                                      {inputMessage}
                                    </span>
                                  </>
                                )}
                              </div>
                              <span className="text-[7.5px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 uppercase shrink-0 font-sans font-black tracking-widest shadow-inner">
                                {autoEncrypt ? `VIG+CAE [${activeCipherType}]` : 'BYPASSING CIPHERS'}
                              </span>
                            </div>
                          )}
                        </form>
                      </div>

                      {/* Floating Quick Actions Trigger FAB & Launcher Menu */}
                      <div className="absolute bottom-[92px] right-6 z-40 flex flex-col items-end gap-2">
                        <AnimatePresence>
                          {showQuickActions && (
                            <>
                              {/* Backdrop backdrop-blur mask to click outside */}
                              <div 
                                className="fixed inset-0 z-40 cursor-default bg-transparent" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowQuickActions(false);
                                }} 
                              />
                              
                              {/* Menu container */}
                              <motion.div
                                id="quick-actions-popover-menu"
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="z-50 w-64 bg-slate-950/95 border border-slate-800/90 rounded-2xl p-3 shadow-2xl shadow-black/90 space-y-2 select-none font-mono"
                              >
                                {(() => {
                                  const allActions = [
                                    { label: 'Arm Self-Destruct', cmd: '/burn', sub: 'Toggles burn on next broadcast', active: burnMode, icon: <Flame size={11} className={burnMode ? "text-rose-400 animate-pulse" : "text-slate-400"} /> },
                                    { label: 'Integrity Ping', cmd: '/ping', sub: 'Latency and secure relay test', icon: <Activity size={11} className="text-cyan-400" /> },
                                    { label: 'Clearance Status', cmd: '/whoami', sub: 'Agent clearance level & profiling', icon: <UserCircle size={11} className="text-amber-400" /> },
                                    { label: 'Signal Disturbance', cmd: '/jam', sub: 'Disrupt tracking system for 30s', active: networkJam && networkJam.jammedUntil > currentTimestamp, icon: <Zap size={11} className={networkJam && networkJam.jammedUntil > currentTimestamp ? "text-amber-300 animate-pulse" : "text-amber-500"} /> },
                                    { label: 'Sniff Security Packet', cmd: '/challenge', sub: 'Deploy new decryption challenge', active: !!activeChallenge, icon: <Radio size={11} className={activeChallenge ? "text-emerald-400 animate-pulse" : "text-emerald-500"} /> },
                                    { label: 'Privilege Escalation', cmd: '/sudo', sub: 'Attempt superuser privilege mode', active: isSudoMode, icon: <Terminal size={11} className={isSudoMode ? "text-indigo-400 animate-pulse" : "text-indigo-500"} /> },
                                    { label: 'Digital Rain Theme', cmd: '/matrix', sub: 'Engage matrix simulation overlay', active: showMatrix, icon: <Binary size={11} className={showMatrix ? "text-green-400 animate-pulse" : "text-green-500"} /> },
                                  ];

                                  const filteredActions = allActions.filter(act => {
                                    if (!quickActionSearch) return true;
                                    const query = quickActionSearch.toLowerCase().trim();
                                    
                                    // Custom sequential fuzzy-matching function
                                    const fuzzyMatchString = (target: string) => {
                                      const cleanTarget = target.toLowerCase();
                                      let queryIdx = 0;
                                      for (let i = 0; i < cleanTarget.length; i++) {
                                        if (cleanTarget[i] === query[queryIdx]) {
                                          queryIdx++;
                                          if (queryIdx === query.length) return true;
                                        }
                                      }
                                      return false;
                                    };

                                    return (
                                      fuzzyMatchString(act.label) || 
                                      fuzzyMatchString(act.cmd) || 
                                      fuzzyMatchString(act.sub)
                                    );
                                  });

                                  return (
                                    <>
                                      <div className="flex items-center justify-between text-[7px] font-black tracking-widest text-slate-500 border-b border-slate-900 pb-2 uppercase">
                                        <span className="flex items-center gap-1">
                                          <Terminal size={8} className="text-indigo-400 animate-pulse" /> Secure Protocols
                                        </span>
                                        <span>{quickActionSearch ? `${filteredActions.length} of ${allActions.length} matched` : `${allActions.length} Actions`}</span>
                                      </div>

                                      {/* Styled Terminal Filter input */}
                                      <div className="relative flex items-center bg-black/50 border border-slate-800/80 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500/50 transition-all">
                                        <Search size={10} className="text-slate-500 mr-2 shrink-0" />
                                        <input
                                          type="text"
                                          value={quickActionSearch}
                                          onChange={(e) => setQuickActionSearch(e.target.value)}
                                          placeholder="Fuzzy filter protocols... (e.g. 'burn')"
                                          className="w-full bg-transparent text-[9px] text-white font-mono outline-none placeholder-slate-600"
                                          onClick={(e) => e.stopPropagation()}
                                          onKeyDown={(e) => e.stopPropagation()}
                                        />
                                        {quickActionSearch && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setQuickActionSearch('');
                                            }}
                                            className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 pl-1"
                                            title="Clear filter"
                                          >
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>

                                      <div className="space-y-1 max-h-[220px] overflow-y-auto scrollbar-none pr-0.5">
                                        {filteredActions.length > 0 ? (
                                          filteredActions.map((act, index) => {
                                            return (
                                              <button
                                                key={index}
                                                id={`quick-action-${act.cmd.substring(1)}`}
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  processCommand(act.cmd);
                                                  setShowQuickActions(false);
                                                }}
                                                className={`w-full text-left flex items-start gap-2.5 px-2.5 py-1.5 rounded-xl transition-all border border-transparent ${
                                                  act.active 
                                                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' 
                                                    : 'hover:bg-slate-900/60 hover:border-slate-800/40 text-slate-300'
                                                }`}
                                              >
                                                <div className="mt-0.5 shrink-0">
                                                  {act.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center justify-between font-black text-[9px] tracking-tight">
                                                    <span className="uppercase">{act.label}</span>
                                                    <span className="text-[7.5px] font-bold text-slate-600 bg-slate-950 px-1 py-0.5 rounded border border-slate-900 font-mono leading-none">
                                                      {act.cmd}
                                                    </span>
                                                  </div>
                                                  <p className="text-[7px] text-slate-500 font-sans mt-0.5 leading-tight truncate">
                                                    {act.sub}
                                                  </p>
                                                </div>
                                              </button>
                                            );
                                          })
                                        ) : (
                                          <div className="py-5 px-3 text-center border border-dashed border-slate-800/60 rounded-xl bg-black/20">
                                            <Terminal size={12} className="mx-auto text-rose-500/40 mb-1.5 animate-pulse" />
                                            <p className="text-[8px] font-black uppercase text-rose-400/80 tracking-wider">Protocol Not Found</p>
                                            <p className="text-[7px] text-slate-500 font-sans mt-0.5 leading-normal">No subnet match found for filtering constraint</p>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>

                        {/* Trigger button */}
                        <button
                          type="button"
                          id="quick-actions-floating-button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowQuickActions(!showQuickActions);
                            playSynthSound('beep');
                          }}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-xl transition-all cursor-pointer font-mono text-[9px] font-black tracking-widest uppercase active:scale-95 duration-150 ${
                            showQuickActions 
                              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/45 hover:border-rose-400/50 shadow-rose-950/10' 
                              : 'bg-indigo-950/80 border-indigo-500/35 text-indigo-300 hover:bg-indigo-950/95 hover:border-indigo-400/55 hover:text-white hover:shadow-indigo-500/10'
                          }`}
                        >
                          <Terminal size={11} className={showQuickActions ? "rotate-90 text-rose-400" : "animate-pulse text-indigo-400"} />
                          <span>Quick Actions</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
               ) : (
                 <motion.div 
                   key="lab"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="h-full flex flex-col gap-6 lg:overflow-hidden overflow-y-auto w-full"
                 >
                                        {/* Lab Sub-navigation */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase text-indigo-400 font-mono flex items-center gap-1.5 leading-none">
                          <Activity className="w-4 h-4 text-indigo-500 animate-pulse" /> Cryptanalysis Lab
                        </h4>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                          SIMPLIFIED SIGNAL DECIPHERING CHASSIS
                        </p>
                      </div>

                      {/* Cipher selection and parameters in a neat row */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block leading-none">Select Cipher Protocol</label>
                          <select
                            value={encodeCipherType}
                            onChange={(e) => {
                              setEncodeCipherType(e.target.value as CipherType);
                              playSynthSound('beep');
                            }}
                            className="bg-black border border-slate-800 rounded-xl px-3 py-2 text-[10px] text-indigo-400 font-mono outline-none focus:border-indigo-500/50"
                          >
                            <option value={CipherType.HYBRID}>Hybrid_Vig_Cae.v2</option>
                            <option value={CipherType.ATBASH}>Mirror_Atbash.idx</option>
                            <option value={CipherType.REVERSE}>Rev_Seq_Buffer</option>
                            <option value={CipherType.BASE64}>B64_Binary_Map</option>
                            <option value={CipherType.MORSE}>Morse_Code_Pulse</option>
                            <option value={CipherType.ROT13}>ROT13_Classic</option>
                            <option value={CipherType.RAILFENCE}>Rail_Fence_ZigZag</option>
                            <option value={CipherType.VIGENERE}>Vigenere_Standard</option>
                            <option value={CipherType.CAESAR}>Caesar_Shift</option>
                            <option value={CipherType.BACONIAN}>Baconian_Bicall</option>
                          </select>
                        </div>

                        {/* Param: Vigenère key */}
                        {(encodeCipherType === CipherType.VIGENERE || encodeCipherType === CipherType.HYBRID) && (
                          <div className="flex flex-col gap-1 w-24">
                            <label className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block leading-none">Security Key</label>
                            <input 
                              type="text" 
                              value={encodeKey}
                              onChange={(e) => setEncodeKey(e.target.value.toUpperCase())}
                              className="bg-black border border-slate-800 rounded-xl px-2.5 py-1.5 text-[10px] font-mono text-indigo-300 uppercase focus:border-indigo-500/55 outline-none font-bold"
                              placeholder="KEY..."
                            />
                          </div>
                        )}

                        {/* Param: Caesar Shift */}
                        {(encodeCipherType === CipherType.CAESAR || encodeCipherType === CipherType.HYBRID) && (
                          <div className="flex flex-col gap-1 w-24">
                            <div className="flex justify-between items-center text-[8px] uppercase tracking-wider text-slate-500 font-bold leading-none">
                              <span>Shift</span>
                              <span className="text-indigo-400 font-mono font-bold">{encodeShift}</span>
                            </div>
                            <input 
                              type="range" min="0" max="94"
                              value={encodeShift}
                              onChange={(e) => setEncodeShift(parseInt(e.target.value))}
                              className="w-full accent-indigo-500 h-1 bg-slate-855 rounded-full appearance-none cursor-pointer mt-1"
                            />
                          </div>
                        )}

                        {/* Param: Railfence rails */}
                        {encodeCipherType === CipherType.RAILFENCE && (
                          <div className="flex flex-col gap-1 w-24">
                            <div className="flex justify-between items-center text-[8px] uppercase tracking-wider text-slate-500 font-bold leading-none">
                              <span>Rails</span>
                              <span className="text-indigo-400 font-mono font-bold">{encodeRails}</span>
                            </div>
                            <input 
                              type="range" min="2" max="10"
                              value={encodeRails}
                              onChange={(e) => setEncodeRails(parseInt(e.target.value))}
                              className="w-full accent-indigo-500 h-1 bg-slate-855 rounded-full appearance-none cursor-pointer mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Left/Right Twin Panel Workspace */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden min-h-0">
                      
                      {/* ENCODE WORKSPACE PANEL */}
                      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col h-[550px] lg:h-full overflow-hidden">
                        <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-3 shrink-0">
                          <Lock className="w-3.5 h-3.5 text-indigo-400" />
                          <h5 className="text-[10px] font-black uppercase text-indigo-400 font-mono tracking-widest leading-none">1. Encoder Workspace</h5>
                        </div>

                        {/* Inputs/outputs container */}
                        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
                          <div className="flex-1 flex flex-col min-h-0">
                            <label className="text-[8px] font-bold uppercase text-slate-500 mb-1.5 block shrink-0">Encode Text (Plaintext Input)</label>
                            <textarea 
                              value={encodePlaintext}
                              onChange={(e) => {
                                setEncodePlaintext(e.target.value);
                                setEncodeCopied(false);
                              }}
                              placeholder="Type original text here to encode..."
                              className="flex-1 w-full bg-black/40 border border-slate-800/80 rounded-xl p-3 text-xs font-mono text-zinc-300 outline-none focus:border-indigo-500/50 resize-none transition-all placeholder:text-slate-700 font-medium"
                            />
                          </div>

                          <div className="flex-1 flex flex-col min-h-0">
                            <label className="text-[8px] font-bold uppercase text-slate-500 mb-1.5 block shrink-0">Encoded Version (Result Output)</label>
                            <div className="flex-1 w-full bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3 font-mono text-xs text-indigo-300 break-all overflow-y-auto relative select-all border-dashed font-bold">
                              {encodePlaintext ? (
                                encodeCipherType === CipherType.RAILFENCE 
                                  ? Cipher.railfence(encodePlaintext, encodeRails, false)
                                  : Cipher.encrypt(encodePlaintext, encodeKey, encodeShift, encodeCipherType)
                              ) : (
                                <span className="text-slate-700 italic font-black text-[9px] tracking-widest block text-center mt-6 uppercase font-sans">
                                  Awaiting Plaintext Buffer Injection...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          disabled={!encodePlaintext}
                          onClick={() => {
                            const res = encodeCipherType === CipherType.RAILFENCE 
                              ? Cipher.railfence(encodePlaintext, encodeRails, false)
                              : Cipher.encrypt(encodePlaintext, encodeKey, encodeShift, encodeCipherType);
                            navigator.clipboard.writeText(res);
                            playSynthSound('success');
                            setEncodeCopied(true);
                            setTimeout(() => setEncodeCopied(false), 1500);
                          }}
                          className="w-full py-3 mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Copy size={11} /> {encodeCopied ? 'Copied to Clipboard!' : 'Copy Encoded Version'}
                        </button>
                      </div>

                      {/* DECODE WORKSPACE PANEL */}
                      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col h-[550px] lg:h-full overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-3 shrink-0">
                          <div className="flex items-center gap-2">
                            <Unlock className="w-3.5 h-3.5 text-cyan-400" />
                            <h5 className="text-[10px] font-black uppercase text-cyan-400 font-mono tracking-widest leading-none">2. Decoder Workspace</h5>
                          </div>
                          
                          {/* Tab Selection */}
                          <div className="flex bg-black/40 border border-slate-800/65 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setDecodeMode('single');
                                playSynthSound('beep');
                              }}
                              className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                                decodeMode === 'single'
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  : 'text-slate-500 hover:text-slate-400 border border-transparent'
                              }`}
                            >
                              Single
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDecodeMode('batch');
                                playSynthSound('beep');
                              }}
                              className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all ${
                                decodeMode === 'batch'
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  : 'text-slate-500 hover:text-slate-400 border border-transparent'
                              }`}
                            >
                              Batch
                            </button>
                          </div>
                        </div>

                        {/* Inputs/outputs container */}
                        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
                          {decodeMode === 'single' ? (
                            <>
                              <div className="flex-1 flex flex-col min-h-0">
                                <label className="text-[8px] font-bold uppercase text-slate-500 mb-1.5 block shrink-0">Decode Text (Encoded Input)</label>
                                <textarea 
                                  value={scratchpad}
                                  onChange={(e) => {
                                    setScratchpad(e.target.value);
                                    setDecodeCopied(false);
                                  }}
                                  placeholder="Enter encoded text here to decode..."
                                  className="flex-1 w-full bg-black/40 border border-slate-800/80 rounded-xl p-3 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500/50 resize-none transition-all placeholder:text-slate-700 font-medium"
                                />
                              </div>

                              <div className="flex-1 flex flex-col min-h-0">
                                <label className="text-[8px] font-bold uppercase text-slate-500 mb-1.5 block shrink-0">Decoded Version (Result Output)</label>
                                <div className="flex-1 w-full bg-cyan-950/20 border border-cyan-500/10 rounded-xl p-3 font-mono text-xs text-cyan-300 break-all overflow-y-auto relative select-all border-dashed font-bold">
                                  {scratchpad ? (
                                    encodeCipherType === CipherType.RAILFENCE 
                                      ? Cipher.railfence(scratchpad, encodeRails, true)
                                      : Cipher.decrypt(scratchpad, encodeKey, encodeShift, encodeCipherType)
                                  ) : (
                                    <span className="text-slate-700 italic font-black text-[9px] tracking-widest block text-center mt-6 uppercase font-sans">
                                      Awaiting Ciphertext Buffer Injection...
                                    </span>
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 flex flex-col min-h-0">
                                <label className="text-[8px] font-bold uppercase text-slate-500 mb-1.5 block shrink-0">Batch Ciphertext (One line per ciphertext)</label>
                                <textarea 
                                  value={batchScratchpad}
                                  onChange={(e) => {
                                    setBatchScratchpad(e.target.value);
                                    setDecodeCopied(false);
                                  }}
                                  placeholder="Paste multiple lines of ciphertext here...&#10;Line 1: ciphertext&#10;Line 2: ciphertext"
                                  className="flex-1 w-full bg-black/40 border border-slate-800/80 rounded-xl p-3 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500/50 resize-none transition-all placeholder:text-slate-750 font-medium"
                                />
                              </div>

                              <div className="flex-1 flex flex-col min-h-0">
                                <label className="text-[8px] font-bold uppercase text-slate-500 mb-1.5 block shrink-0">Batch Decoded Output</label>
                                <div className="flex-1 w-full bg-cyan-950/20 border border-cyan-500/10 rounded-xl p-2 font-mono text-xs text-cyan-300 overflow-y-auto border-dashed flex flex-col gap-1.5">
                                  {batchScratchpad ? (
                                    batchScratchpad.split('\n').map((line, idx) => {
                                      const decrypted = line === '' ? '' : (
                                        encodeCipherType === CipherType.RAILFENCE 
                                          ? Cipher.railfence(line, encodeRails, true)
                                          : Cipher.decrypt(line, encodeKey, encodeShift, encodeCipherType)
                                      );
                                      return (
                                        <div key={idx} className="flex gap-2 items-center bg-black/40 border border-slate-800/50 rounded-lg p-2 hover:border-cyan-500/25 transition-all">
                                          <div className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-1 py-0.5 rounded shrink-0 leading-none">
                                            L{idx + 1}
                                          </div>
                                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                                            <div className="text-[8px] text-slate-500 truncate select-all" title="Original Ciphertext">
                                              CIPHER: {line || <span className="italic text-slate-700">[EMPTY]</span>}
                                            </div>
                                            <div className="text-[10px] text-cyan-300 font-bold break-all select-all">
                                              PLAIN: {decrypted || <span className="italic opacity-30">[EMPTY]</span>}
                                            </div>
                                          </div>
                                          {decrypted && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(decrypted);
                                                playSynthSound('success');
                                              }}
                                              className="text-slate-500 hover:text-cyan-400 transition-all p-1 hover:bg-slate-800/40 rounded"
                                              title="Copy decrypted line"
                                            >
                                              <Copy size={11} />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <span className="text-slate-700 italic font-black text-[9px] tracking-widest block text-center mt-6 uppercase font-sans">
                                      Awaiting Batch Ciphertext...
                                    </span>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {decodeMode === 'single' ? (
                          <button 
                            type="button"
                            disabled={!scratchpad}
                            onClick={() => {
                              const res = encodeCipherType === CipherType.RAILFENCE 
                                ? Cipher.railfence(scratchpad, encodeRails, true)
                                : Cipher.decrypt(scratchpad, encodeKey, encodeShift, encodeCipherType);
                              navigator.clipboard.writeText(res);
                              playSynthSound('success');
                              setDecodeCopied(true);
                              setTimeout(() => setDecodeCopied(false), 1500);
                            }}
                            className="w-full py-3 mt-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Copy size={11} /> {decodeCopied ? 'Copied to Clipboard!' : 'Copy Decoded Version'}
                          </button>
                        ) : (
                          <button 
                            type="button"
                            disabled={!batchScratchpad}
                            onClick={() => {
                              const decryptedJoined = batchScratchpad.split('\n').map(line => {
                                if (line === '') return '';
                                return encodeCipherType === CipherType.RAILFENCE 
                                  ? Cipher.railfence(line, encodeRails, true)
                                  : Cipher.decrypt(line, encodeKey, encodeShift, encodeCipherType);
                              }).join('\n');
                              navigator.clipboard.writeText(decryptedJoined);
                              playSynthSound('success');
                              setDecodeCopied(true);
                              setTimeout(() => setDecodeCopied(false), 1500);
                            }}
                            className="w-full py-3 mt-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Copy size={11} /> {decodeCopied ? 'All Decrypted Copied!' : 'Copy All Decrypted (Newline Joined)'}
                          </button>
                        )}
                      </div>

                    </div>
                 </motion.div>
               )}
            </AnimatePresence>

            <AnimatePresence>
              {showAIPanel && (
                <motion.div 
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 300 }}
                  className="w-80 shrink-0 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col overflow-hidden backdrop-blur-xl shadow-2xl h-full"
                >
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-rose-500/5">
                    <div className="flex items-center gap-2">
                       <Brain size={16} className="text-rose-500" />
                       <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Neural Cryptanalyst</h3>
                    </div>
                    <button onClick={() => setShowAIPanel(false)} className="text-slate-500 hover:text-white">
                       <Eraser size={14} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
                     {aiHistory.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-700 text-center space-y-4 p-4">
                          <Cpu size={32} className="opacity-10" />
                          <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">Neural engine idle. Input ciphertext for deep pattern extraction...</p>
                       </div>
                     ) : (
                       aiHistory.map((h, i) => (
                         <div key={i} className={`flex flex-col gap-1.5 ${h.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`text-[8px] font-black uppercase tracking-widest ${h.role === 'user' ? 'text-indigo-400' : 'text-rose-400'}`}>
                              {h.role === 'user' ? 'Uplink' : 'Terminal Response'}
                            </div>
                            <div className={`p-3 rounded-xl text-[10px] leading-relaxed font-mono ${h.role === 'user' ? 'bg-indigo-600/10 text-indigo-100 border border-indigo-500/20' : 'bg-black/40 text-slate-300 border border-slate-800'}`}>
                              {h.content}
                            </div>
                         </div>
                       ))
                     )}
                  </div>

                  <div className="p-4 border-t border-slate-800 bg-black/40">
                    <form onSubmit={handleAiInquiry} className="relative">
                      <input 
                         type="text"
                         value={aiPrompt}
                         onChange={(e) => setAiPrompt(e.target.value)}
                         placeholder="NEURAL_QUERY..."
                         className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-[10px] text-white font-mono outline-none focus:border-rose-500/40 transition-all"
                      />
                      <button 
                        type="submit"
                        disabled={isAiLoading || !aiPrompt.trim()}
                        className="absolute right-2 top-1.5 p-1 text-slate-500 hover:text-rose-400 disabled:opacity-20"
                      >
                         <Send size={14} />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showDirectory && (
                <motion.div 
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 300 }}
                  className="w-80 shrink-0 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col overflow-hidden backdrop-blur-xl shadow-2xl h-full font-sans"
                >
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-indigo-500/5">
                    <div className="flex items-center gap-2">
                       <Users size={16} className="text-indigo-400" />
                       <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Agent Directory</h3>
                    </div>
                    <button onClick={() => setShowDirectory(false)} className="text-slate-500 hover:text-white transition-colors">
                       <X size={14} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                    {/* Banishment Console (ADMIN ONLY) */}
                    {user?.email && ADMIN_EMAILS.includes(user.email) && (
                      <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-4">
                        <div className="flex items-center gap-2 border-b border-rose-500/10 pb-2">
                          <ShieldAlert size={14} className="text-rose-400 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Banishment Command</span>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-rose-500 font-mono">Target Email Address</label>
                            <input 
                              type="email"
                              placeholder="codename_email@gmail.com..."
                              value={adminBanEmail}
                              onChange={(e) => setAdminBanEmail(e.target.value)}
                              className="w-full bg-black/40 border border-rose-500/20 rounded px-2.5 py-1.5 text-[10px] text-white font-mono outline-none focus:border-rose-500/50"
                            />
                          </div>
                          <div className="space-y-1 block">
                            <label className="text-[8px] font-black uppercase tracking-widest text-rose-500 font-mono">Banishment Reason</label>
                            <input 
                              type="text"
                              placeholder="Security compromise / Hostile intruder..."
                              value={adminBanReason}
                              onChange={(e) => setAdminBanReason(e.target.value)}
                              className="w-full bg-black/40 border border-rose-500/20 rounded px-2.5 py-1.5 text-[10px] text-white font-mono outline-none focus:border-rose-500/50"
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={handleBanEmail}
                            className="w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/30 text-rose-200 rounded text-[9px] font-black tracking-widest uppercase transition-all shadow-md shadow-rose-950/40"
                          >
                            Execute Ban Sequence
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Search Field */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-black/40 border border-slate-800 rounded-xl">
                        <Search size={12} className="text-slate-500" />
                        <input 
                          type="text"
                          placeholder="PROBE ACTIVE IDENTS..."
                          value={agentSearch}
                          onChange={(e) => setAgentSearch(e.target.value)}
                          className="w-full bg-transparent text-[10px] outline-none text-white font-mono placeholder:text-slate-650"
                        />
                      </div>
                    </div>

                    {/* Display List of Agents */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1 border-b border-slate-800 pb-1.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 font-mono">Active Handshakes</span>
                        <span className="text-[8px] font-mono text-slate-500">{
                          allAgents.filter(agent => {
                            const codename = (agent.profile?.codename || '').toLowerCase();
                            const email = (agent.email || '').toLowerCase();
                            const search = agentSearch.toLowerCase();
                            return codename.includes(search) || email.includes(search);
                          }).length
                        } Agents</span>
                      </div>
                      
                      <div className="space-y-2.5">
                        {allAgents.filter(agent => {
                          const codename = (agent.profile?.codename || '').toLowerCase();
                          const email = (agent.email || '').toLowerCase();
                          const search = agentSearch.toLowerCase();
                          return codename.includes(search) || email.includes(search);
                        }).length === 0 ? (
                          <p className="text-[9px] text-slate-600 uppercase text-center py-4 font-mono">No matching agents probed.</p>
                        ) : (
                          allAgents.filter(agent => {
                            const codename = (agent.profile?.codename || '').toLowerCase();
                            const email = (agent.email || '').toLowerCase();
                            const search = agentSearch.toLowerCase();
                            return codename.includes(search) || email.includes(search);
                          }).map((agent) => {
                            const isSelf = agent.id === user?.uid;
                            const isAgentAdmin = agent.email && ADMIN_EMAILS.includes(agent.email);
                            const isAgentBanned = bannedEmailsList.some(b => b.email === agent.email?.toLowerCase());

                            return (
                              <div 
                                key={agent.id} 
                                className="p-3 bg-black/30 border border-slate-800/60 rounded-xl flex items-center justify-between gap-3 hover:border-indigo-500/20 transition-all font-mono"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="relative">
                                    <div 
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black italic shadow-inner"
                                      style={{ backgroundColor: agent.profile?.customColor || '#4f46e5', color: '#ffffff' }}
                                    >
                                      {agent.profile?.codename?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
                                      agent.status === 'online' ? 'bg-emerald-500' :
                                      agent.status === 'busy' ? 'bg-rose-500' :
                                      agent.status === 'away' ? 'bg-amber-500' : 'bg-slate-600'
                                    }`} />
                                  </div>
                                  <div className="overflow-hidden space-y-0.5">
                                     <div className="flex items-center gap-1.5 flex-wrap">
                                       <span className="text-[10px] font-bold text-slate-200 truncate block">{agent.profile?.codename}</span>
                                       {isSelf && <span className="bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-sans uppercase font-black tracking-widest text-[5px]">Self</span>}
                                       {isAgentAdmin && <span className="text-[5px] text-cyan-400 bg-cyan-400/5 px-1 border border-cyan-400/20 rounded font-sans font-black tracking-widest">Admin</span>}
                                       {isAgentBanned && <span className="text-[5px] text-rose-400 bg-rose-400/5 px-1 border border-rose-400/20 rounded font-sans font-black tracking-widest animate-pulse">Banned</span>}
                                     </div>
                                     {agent.email && (
                                       <span className="text-[8px] text-slate-500 truncate block select-all">{agent.email}</span>
                                     )}
                                     <span className="text-[7px] text-slate-600 uppercase tracking-wider block">KEY: {agent.masterKey?.substring(0, 10)}...</span>
                                  </div>
                                </div>
                                {user?.email && ADMIN_EMAILS.includes(user.email) && agent.email && !isSelf && !ADMIN_EMAILS.includes(agent.email) && (
                                  <button 
                                     onClick={() => {
                                       setAdminBanEmail(agent.email || '');
                                       setAdminBanReason(`Administrative action against codename "${agent.profile?.codename}"`);
                                     }}
                                     className="px-2 py-1 bg-rose-950/20 border border-rose-900/30 rounded hover:bg-rose-900 hover:text-white hover:border-transparent text-rose-500 text-[8px] font-bold tracking-widest uppercase transition-all shrink-0 animate-pulse"
                                     title="Load ban parameters"
                                  >
                                     Banish
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Banned Emails Logs (ADMIN ONLY) */}
                    {user?.email && ADMIN_EMAILS.includes(user.email) && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center px-1 border-b border-rose-900/20 pb-1.5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-rose-400 font-mono flex items-center gap-1">
                            <Skull size={10} />
                            Banishment Registry
                          </span>
                          <span className="text-[8px] font-mono text-rose-500">{bannedEmailsList.length} entities</span>
                        </div>
                        <div className="space-y-2">
                           {bannedEmailsList.length === 0 ? (
                             <p className="text-[9px] text-slate-600 uppercase text-center py-4 font-mono">The blacklist registry is empty.</p>
                           ) : (
                             bannedEmailsList.map((banDoc) => (
                               <div 
                                 key={banDoc.id} 
                                 className="p-3 bg-rose-950/5 border border-rose-955 rounded-xl space-y-1.5 font-mono relative group"
                               >
                                 <div className="flex items-center justify-between gap-2">
                                   <span className="text-[9px] font-bold text-rose-400 truncate w-36 block select-all">{banDoc.email}</span>
                                   <button 
                                     onClick={() => handleUnbanEmail(banDoc.email)}
                                     className="px-1.5 py-0.5 border border-emerald-800 text-emerald-400 rounded text-[7px] font-black tracking-widest uppercase bg-emerald-950/20 hover:bg-emerald-800 hover:text-white hover:border-transparent transition-all"
                                   >
                                     Pardon
                                   </button>
                                 </div>
                                 <div className="space-y-0.5 text-[7px] text-slate-500 uppercase">
                                   <div className="truncate"><span className="text-rose-900 font-black">Reason:</span> {banDoc.reason}</div>
                                   <div><span className="text-rose-900 font-black">Stamp:</span> {new Date(banDoc.bannedAt).toLocaleString()}</div>
                                 </div>
                               </div>
                             ))
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <AnimatePresence>
          {isHacking && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="w-96 text-center space-y-6">
                <motion.div 
                   animate={{ scale: [1, 1.1, 1] }}
                   transition={{ repeat: Infinity, duration: 0.5 }}
                   className="w-24 h-24 mx-auto border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-500"
                >
                   <Skull size={48} />
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-4xl font-black text-emerald-500 tracking-tighter uppercase italic">BREAL_TIME_INJECTION</h2>
                  <p className="text-xs text-emerald-500/50 font-mono">TARGET_NODE: {hackTarget}</p>
                </div>
                <div className="h-2 w-full bg-emerald-900/30 rounded-full overflow-hidden border border-emerald-500/20">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-[8px] font-mono text-emerald-500/40 text-left">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      {Math.random().toString(36).substring(2, 12).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar (Bento Stack) */}
        <aside className="w-80 flex flex-col gap-6 shrink-0 hidden lg:flex">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest italic">Identity Dossier</h3>
              <button 
                onClick={openProfileModal} 
                className="text-[10px] text-indigo-400 font-bold uppercase hover:text-indigo-300 transition-colors"
              >
                Sync Profile
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-center text-indigo-400"
                style={{ 
                  borderColor: (impersonatedAgent?.profile.customColor || profile.customColor || activeColor.hex), 
                  color: (impersonatedAgent?.profile.customColor || profile.customColor || activeColor.hex), 
                  boxShadow: `0 0 20px ${(impersonatedAgent?.profile.customColor || profile.customColor || activeColor.hex)}15` 
                }}
              >
                {getAvatarIcon(impersonatedAgent ? impersonatedAgent.profile : profile, 32)}
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-white leading-none">{impersonatedAgent ? impersonatedAgent.profile.codename : profile.codename}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {impersonatedAgent ? 'Hacked Identity' : 'Network Operative'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest italic">Node Status</h3>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Active Cipher Cluster</label>
                <select 
                  value={activeCipherType}
                  onChange={(e) => setActiveCipherType(e.target.value as CipherType)}
                  className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value={CipherType.HYBRID}>Hybrid_Vig_Cae.v2</option>
                  <option value={CipherType.ATBASH}>Mirror_Atbash.idx</option>
                  <option value={CipherType.REVERSE}>Rev_Seq_Buffer</option>
                  <option value={CipherType.BASE64}>B64_Binary_Map</option>
                  <option value={CipherType.MORSE}>Morse_Code_Pulse</option>
                  <option value={CipherType.ROT13}>ROT13_Classic</option>
                  <option value={CipherType.RAILFENCE}>Rail_Fence_ZigZag</option>
                </select>
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-tighter">
                    <span className="text-slate-500">Signal Integrity</span>
                    <span className="text-emerald-400">99.8%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[99.8%]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-black/20 p-3 rounded-xl border border-slate-800/50">
                    <p className="text-[8px] text-slate-600 font-black uppercase mb-1">Inbound</p>
                    <p className="text-sm font-mono text-indigo-400 font-bold">1.2 KB/s</p>
                  </div>
                  <div className="bg-black/20 p-3 rounded-xl border border-slate-800/50">
                    <p className="text-[8px] text-slate-600 font-black uppercase mb-1">Outbound</p>
                    <p className="text-sm font-mono text-cyan-400 font-bold">0.8 KB/s</p>
                  </div>
                </div>
              </div>
            </div>
            
            <footer className="pt-6 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-600 font-mono">
              <span className="uppercase italic">Uptime: 04h 12m</span>
              <span className="uppercase">v4.2.0-STABLE</span>
            </footer>
          </div>
        </aside>
      </div>


      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="text-center">
                <h3 className="text-lg font-black uppercase tracking-wider text-white italic">Identity Architecture</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Refine your network footprint</p>
              </div>

              <div className="space-y-6">
                <div>
                   <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Agent Codename</label>
                   <input 
                    type="text" 
                    value={draftProfile.codename}
                    onChange={(e) => setDraftProfile({ ...draftProfile, codename: e.target.value })}
                    className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-white font-mono"
                   />
                </div>

                <div>
                   <label className="text-[9px] font-black uppercase text-slate-500 block mb-3">Signal Signature (Icon / Custom Avatar)</label>
                   <div className="grid grid-cols-4 gap-3 mb-4">
                     {AVATAR_OPTIONS.map(opt => (
                       <button 
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          playSynthSound?.('beep');
                          setDraftProfile(p => ({ ...p, avatar: opt.id, customAvatar: undefined }));
                        }}
                        className={`h-10 rounded-xl flex items-center justify-center transition-all border ${draftProfile.avatar === opt.id && !draftProfile.customAvatar ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'}`}
                       >
                         {opt.icon}
                       </button>
                     ))}
                   </div>
                   
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-black border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        {draftProfile.customAvatar ? (
                          <img src={draftProfile.customAvatar} className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle size={20} className="text-slate-700" />
                        )}
                      </div>
                      <label className="flex-1">
                        <span className="text-[10px] text-indigo-400 font-bold uppercase cursor-pointer hover:text-indigo-300">Upload Transmission Image</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setDraftProfile(p => ({ ...p, customAvatar: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                   </div>
                </div>

                <div>
                   <label className="text-[9px] font-black uppercase text-slate-500 block mb-3">Chromance Frequency (Color)</label>
                   <div className="grid grid-cols-6 gap-2 mb-4">
                     {COLOR_OPTIONS.map(opt => (
                       <button 
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          playSynthSound?.('beep');
                          setDraftProfile(p => ({ ...p, color: opt.id, customColor: undefined }));
                        }}
                        className={`w-8 h-8 rounded-full transition-all border-2 ${opt.bgClass} ${(draftProfile.color === opt.id && !draftProfile.customColor) ? 'border-white scale-110 shadow-lg ring-2 ring-indigo-500/20' : 'border-transparent opacity-50 hover:opacity-100'}`}
                       />
                     ))}
                   </div>
                   
                   <div className="flex items-center gap-4">
                     <input 
                        type="color" 
                        value={draftProfile.customColor || '#6366f1'}
                        onChange={(e) => setDraftProfile(p => ({ ...p, customColor: e.target.value }))}
                        className="w-10 h-10 bg-transparent border-0 cursor-pointer p-0"
                     />
                     <span className="text-[10px] text-slate-500 uppercase font-black">Custom Chromatic Variable</span>
                   </div>
                </div>

                <div>
                   <label className="text-[9px] font-black uppercase text-slate-500 block mb-3">Signal Presence (Status)</label>
                   <div className="flex gap-2">
                     {[
                       { id: 'online', label: 'Online', color: 'bg-emerald-500' },
                       { id: 'busy', label: 'Busy', color: 'bg-rose-500' },
                       { id: 'away', label: 'Away', color: 'bg-amber-500' }
                     ].map(s => (
                       <button 
                         key={s.id}
                         type="button"
                         onClick={() => {
                           playSynthSound?.('beep');
                           setDraftStatus(s.id as any);
                         }}
                         className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest ${draftStatus === s.id ? 'bg-slate-800 border-slate-600 text-white shadow-lg' : 'bg-black/20 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                       >
                         <div className={`w-2 h-2 rounded-full ${s.color}`} />
                         {s.label}
                       </button>
                     ))}
                   </div>
                </div>

                <div>
                   <label className="text-[9px] font-black uppercase text-slate-500 block mb-3">Arrival Frequency (Transmit Animation)</label>
                   <div className="grid grid-cols-3 gap-2">
                     {[
                       { id: 'none', label: 'Standard' },
                       { id: 'pulse', label: 'Warp Pulse' },
                       { id: 'shake', label: 'Vibe Shake' },
                       { id: 'neon', label: 'Neon Flare' },
                       { id: 'glitch', label: 'Glitch Hack' },
                       { id: 'bounce', label: 'Drop Bounce' }
                     ].map(anim => (
                       <button 
                         key={anim.id}
                         type="button"
                         onClick={() => {
                           playSynthSound?.('beep');
                           setDraftProfile(p => ({ ...p, receiveAnimation: anim.id }));
                         }}
                         className={`flex items-center justify-center py-2.5 rounded-xl border transition-all text-[8px] font-black uppercase tracking-wider ${draftProfile.receiveAnimation === anim.id || (!draftProfile.receiveAnimation && anim.id === 'none') ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-black/20 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                       >
                         {anim.label}
                       </button>
                     ))}
                   </div>
                </div>

                {/* Reset Master Password Access */}
                <div className="pt-5 border-t border-slate-800 space-y-4">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-400 tracking-widest">
                    <Key size={12} className="text-indigo-500 shrink-0" /> Restructure Master Key
                  </div>

                  {!isOriginalVerified ? (
                    <div className="space-y-2 bg-black/40 p-4 border border-slate-800/80 rounded-2xl text-left">
                      <label className="text-[8px] font-black uppercase text-slate-500 block">Original Master Password</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={currentPasswordInput}
                          onChange={(e) => {
                            setCurrentPasswordInput(e.target.value);
                            setPwdError('');
                            setPwdSuccess('');
                          }}
                          placeholder="Verify original password to enable changes"
                          className="flex-1 min-w-0 bg-black/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOriginalPassword}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] uppercase px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/10 font-mono shrink-0"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-indigo-950/10 p-4 border border-indigo-500/20 rounded-2xl relative text-left">
                      <div className="absolute top-3 right-3 text-[7px] bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 font-black uppercase tracking-widest font-mono">
                        Verified
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase text-slate-500 block">New Master Password</label>
                        <input
                          type="password"
                          value={newPasswordInput}
                          onChange={(e) => {
                            setNewPasswordInput(e.target.value);
                            setPwdError('');
                          }}
                          placeholder="Set custom master key (min 6 characters)"
                          className="w-full bg-black border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOriginalVerified(false);
                            setCurrentPasswordInput('');
                            setNewPasswordInput('');
                            setPwdError('');
                            setPwdSuccess('');
                            playSynthSound('beep');
                          }}
                          className="flex-1 py-2 border border-slate-800 text-[8.5px] font-black uppercase text-slate-500 hover:bg-slate-800 rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdateMasterPassword}
                          className="flex-1 py-2 bg-indigo-600 text-[8.5px] font-black uppercase text-white hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/10"
                        >
                          Commit New Key
                        </button>
                      </div>
                    </div>
                  )}

                  {pwdError && (
                    <p className="text-[8.5px] font-black text-rose-500 uppercase tracking-widest pl-1 leading-none text-left">
                      // {pwdError}
                    </p>
                  )}
                  {pwdSuccess && (
                    <p className="text-[8.5px] font-black text-emerald-400 uppercase tracking-widest pl-1 leading-none text-left">
                      // {pwdSuccess}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-4 border border-slate-800 rounded-2xl text-[10px] uppercase font-black text-slate-500 hover:bg-slate-800 transition-all"
                >
                  Abort
                </button>
                <button 
                  onClick={handleProfileSync}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] uppercase font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Save & Sync Identity
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Quick Command Palette Overlay */}
        {showQuickCommand && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 md:p-12 z-[500] font-sans">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] mt-10 md:mt-16"
            >
              {/* Search Bar */}
              <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-black/40 relative">
                <Search size={14} className="text-slate-500 absolute left-8 top-1/2 -translate-y-1/2" />
                <input 
                  ref={quickCommandSearchInputRef}
                  type="text"
                  placeholder="Query protocol or shortcut (e.g. /key, /ai, /theme...)"
                  value={quickCommandSearch}
                  onChange={(e) => {
                    setQuickCommandSearch(e.target.value);
                    setQuickCommandSelectedIdx(0);
                  }}
                  className="w-full bg-slate-950/80 border border-slate-800/80 rounded-2xl py-3 pl-10 pr-10 text-xs text-white font-mono outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
                />
                <button 
                  onClick={() => setShowQuickCommand(false)}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Commands List container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 max-h-[50vh]">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 font-mono">Available Protocol Directives</span>
                  <span className="text-[8px] font-mono text-slate-500">{filteredCommands.length} command{filteredCommands.length === 1 ? '' : 's'}</span>
                </div>

                <div className="space-y-1">
                  {filteredCommands.length === 0 ? (
                    <div className="text-center py-8 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                      <Terminal size={24} className="mx-auto text-slate-600 animate-pulse" />
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-relaxed">
                        No protocols found inside current sweep.<br />
                        Type a valid keyword or clear query parameters.
                      </p>
                    </div>
                  ) : (
                    filteredCommands.map((cmd, idx) => {
                      const isHighlighted = idx === quickCommandSelectedIdx;
                      return (
                        <div 
                          key={cmd.command}
                          onClick={() => triggerQuickCommand(cmd)}
                          onMouseEnter={() => setQuickCommandSelectedIdx(idx)}
                          className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none font-mono ${
                            isHighlighted 
                              ? 'bg-indigo-600/10 border-indigo-500/40 shadow-inner' 
                              : 'bg-black/20 border-slate-800/40 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                              isHighlighted 
                                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' 
                                : 'bg-slate-900/60 border-slate-800 text-slate-500'
                            }`}>
                              {renderQuickCommandIcon(cmd.icon)}
                            </div>

                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[11px] font-black uppercase tracking-wide transition-colors ${
                                  isHighlighted ? 'text-white' : 'text-slate-200'
                                }`}>
                                  {cmd.command}
                                </span>
                                {cmd.parameters && (
                                  <span className="text-[8px] font-normal text-indigo-400/80 bg-indigo-500/5 border border-indigo-500/20 px-1 rounded">
                                    {cmd.parameters}
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-500 truncate">{cmd.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[7px] text-zinc-500 border border-slate-800 rounded px-1.5 py-0.5 uppercase font-medium bg-slate-950 font-sans tracking-widest shadow-sm">
                              {cmd.category}
                            </span>
                            {isHighlighted && (
                              <ChevronRight size={12} className="text-indigo-500 animate-pulse" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Instructions Footer */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between font-mono text-[8px] tracking-widest text-[#64748b]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 text-[8px]">▲▼</kbd> Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 text-[8px]">⏎</kbd> Run / Pre-fill
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 text-[8px]">ESC</kbd> Close
                  </span>
                </div>
                <div className="hidden sm:block text-slate-500 font-sans uppercase font-black text-[7px] tracking-[0.2em]">
                  DIRECT_ACCESS_TUNNEL v2.0
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Sub-components
function CmdHint({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-[10px] font-mono text-emerald-400 tracking-widest">{cmd}</span>
      <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider">{desc}</span>
    </div>
  );
}

function MatrixRainOverlay({ onClose, playSynthSound }: { onClose: () => void; playSynthSound?: (type: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Trigger the digital plug-in sound effect on launch!
    playSynthSound?.('plugin');

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const columns = Math.floor(width / 16);
    const yPositions = Array(columns).fill(0);
    const chars = "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ█🔮💾⚡💀⚙️";

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = '15px monospace';

      for (let i = 0; i < yPositions.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 16;
        const y = yPositions[i];

        if (Math.random() > 0.985) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#10b981'; // Cyber neon green
        }

        ctx.fillText(char, x, y);

        if (y > 100 + Math.random() * 10000) {
          yPositions[i] = 0;
        } else {
          yPositions[i] += 16;
        }
      }
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-0 bg-black z-[120] font-mono flex flex-col justify-between p-6 select-none cursor-pointer" 
      onClick={onClose}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 flex justify-between items-center bg-black/70 border border-emerald-500/20 px-4 py-2 rounded-xl backdrop-blur-md self-start text-emerald-400 text-xs font-black uppercase tracking-widest leading-none pointer-events-none">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          Matrix Code Rain Activated
        </span>
      </div>
      <div className="relative z-10 text-center text-[10px] text-emerald-400/80 font-black uppercase tracking-widest pointer-events-none select-none bg-black/80 px-4 py-2 rounded-lg border border-emerald-500/10 self-center max-w-xs md:max-w-md">
        Click anywhere to return to main terminal interface
      </div>
    </motion.div>
  );
}

interface MatrixMorphTextProps {
  ciphertext: string;
  plaintext: string;
}

function MatrixMorphText({ ciphertext, plaintext }: MatrixMorphTextProps) {
  const L = plaintext.length;
  // Progress goes from 0 to 1
  const [progress, setProgress] = useState(0);
  const [glitchTrigger, setGlitchTrigger] = useState(0);

  // Snappy timing: minimum 800ms, maximum 1800ms based on length
  const duration = Math.min(800 + L * 6, 1800);

  useEffect(() => {
    const startTime = performance.now();
    let animationFrameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const currentProgress = Math.min(elapsed / duration, 1);
      setProgress(currentProgress);
      setGlitchTrigger(prev => prev + 1);

      if (currentProgress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    // Initial cyber chime sound
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.012, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {}

    return () => cancelAnimationFrame(animationFrameId);
  }, [plaintext, ciphertext, duration]);

  // Matrix digital rain character set
  const glyphs = '日ﾊﾐﾋｰｳｼﾅﾓｶｷﾑ山千★☣⚡01A🤖🧬🔒🔑💡🎯⚡';

  // Tick clicks sound effect
  useEffect(() => {
    if (progress > 0 && progress < 1 && Math.random() < 0.2) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200 + Math.random() * 400, ctx.currentTime);
          gain.gain.setValueAtTime(0.003, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);
          osc.start();
          osc.stop(ctx.currentTime + 0.02);
        }
      } catch (e) {}
    }
  }, [glitchTrigger, progress]);

  return (
    <span className="break-words whitespace-pre-wrap block tracking-wide select-text">
      {Array.from(plaintext).map((plaintextChar, i) => {
        // Retain whitespace structures (newlines, tabs, spaces) natively to prevent layout shifts
        if (/\s/.test(plaintextChar)) {
          return <span key={i}>{plaintextChar}</span>;
        }

        const charStart = i / L;
        const ciphertextChar = ciphertext[i] || plaintextChar;

        if (progress >= charStart) {
          // 1. REVEALED PLAINTEXT - fades in cleanly and adopts bubble base text color
          return (
            <span 
              key={i} 
              className="transition-all duration-300 animate-[fade-in_0.2s_ease-out]"
            >
              {plaintextChar}
            </span>
          );
        } else if (progress >= Math.max(0, charStart - 0.15)) {
          // 2. ACTIVE GLITCH FRONTIER - bright cyber cyan with ambient glow
          const randomGlyph = glyphs[Math.floor(Math.random() * glyphs.length)];
          return (
            <span 
              key={i} 
              className="text-cyan-400 font-extrabold select-none shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse"
            >
              {randomGlyph}
            </span>
          );
        } else {
          // 3. ENCRYPTED CORES - muted slate characters waiting for Sweep Wave
          return (
            <span 
              key={i} 
              className="opacity-40 text-slate-500/80 font-mono select-none"
            >
              {ciphertextChar}
            </span>
          );
        }
      })}
    </span>
  );
}

interface MessageBubbleProps {
  key?: any;
  msg: ChatMessage;
  currentKey: string;
  currentShift: number;
  currentType: CipherType;
  onAnalyze?: (content: string) => void | Promise<void>;
  currentUserProfile: AgentProfile;
  networkJam?: { jammedUntil: number; jammedBy: string } | null;
  playSynthSound?: (type: string) => void;
  allAgents?: any[];
  autoEncrypt?: boolean;
}

const REACTION_OPTIONS = [
  { emoji: '👍', label: 'THUMBS_UP' },
  { emoji: '❤️', label: 'HEART_TRACE' },
  { emoji: '🔥', label: 'THERMAL_FLAME' },
  { emoji: '🚀', label: 'ORBITAL_UP' },
  { emoji: '🎯', label: 'DATA_TARGET' },
  { emoji: '💀', label: 'DEAD_DROP' },
];

function MessageBubble({ msg, currentKey, currentShift, currentType, onAnalyze, currentUserProfile, networkJam, playSynthSound, allAgents, autoEncrypt }: MessageBubbleProps) {
  const [isBurned, setIsBurned] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasRevealedOnce, setHasRevealedOnce] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [showReadersList, setShowReadersList] = useState(false);
  
  const isMe = msg.sender === "LOCAL_USER" || msg.sender === auth.currentUser?.uid;
  const isPlaintext = !msg.crypto_key && msg.crypto_shift === 0;
  const deciphered = isPlaintext 
    ? msg.content 
    : (autoEncrypt 
        ? Cipher.decrypt(msg.content, msg.crypto_key || "", msg.crypto_shift || 0, msg.crypto_type || CipherType.HYBRID)
        : Cipher.decrypt(msg.content, currentKey, currentShift, currentType)
      );
  const isDecryptedProperly = isPlaintext || autoEncrypt || (msg.crypto_key === currentKey && msg.crypto_shift === currentShift && msg.crypto_type === currentType);

  // Decryption Reveal Logging Effect
  useEffect(() => {
    if (!auth.currentUser || !msg.id) return;
    const currentUid = auth.currentUser.uid;
    
    // Only log if the viewer is different from the sender to track recipients' decryptions
    if (msg.sender === currentUid) return;

    // Squelch trace updates if network is jammed (network-wide signal disturbance)
    if (networkJam && networkJam.jammedUntil > Date.now() && networkJam.jammedBy !== currentUid) {
      return;
    }

    const hasOpened = isDecryptedProperly || isRevealed;
    if (!hasOpened) return;

    // Check if we already logged this decryption
    const alreadyLogged = msg.decryptLogs?.some(log => log.uid === currentUid);
    if (alreadyLogged) return;

    // Log the decryption in Firestore!
    const logEntry = {
      uid: currentUid,
      codename: currentUserProfile?.codename || 'UNKNOWN_AGENT',
      timestamp: Date.now(),
      color: currentUserProfile?.color || 'slate',
      customColor: currentUserProfile?.customColor || ''
    };

    const updateLogs = async () => {
      try {
        await updateDoc(doc(db, 'messages', msg.id!), {
          decryptLogs: [...(msg.decryptLogs || []), logEntry]
        });
      } catch (err) {
        console.error("Failed to log decryption reveal", err);
      }
    };

    updateLogs();
  }, [isDecryptedProperly, isRevealed, msg.id, msg.sender, msg.decryptLogs, currentUserProfile, networkJam]);

  const handleToggleReaction = async (emoji: string) => {
    if (!auth.currentUser || !msg.id) return;
    const uid = auth.currentUser.uid;
    const currentReactions = { ...(msg.reactions || {}) };
    const users = [...(currentReactions[emoji] || [])];
    
    if (users.includes(uid)) {
      currentReactions[emoji] = users.filter(id => id !== uid);
      if (currentReactions[emoji].length === 0) {
        delete currentReactions[emoji];
      }
    } else {
      currentReactions[emoji] = [...users, uid];
    }

    try {
      await updateDoc(doc(db, 'messages', msg.id), {
        reactions: currentReactions
      });
      setShowReactionPicker(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `messages/${msg.id}`);
    }
  };

  useEffect(() => {
    if (msg.burn && isDecryptedProperly && !isBurned) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsBurned(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [msg.burn, isDecryptedProperly, isBurned]);

  const activeColor = COLOR_OPTIONS.find(c => c.id === msg.profile.color) || COLOR_OPTIONS[0];

  if (isBurned) {
    return (
      <div className={`flex gap-4 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
         <div className="w-10 h-10 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-center text-slate-600 shadow-sm">
           <Shield size={16} />
         </div>
         <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl italic text-[10px] text-rose-500/60 uppercase tracking-widest font-black flex items-center gap-2">
            <AlertTriangle size={12} /> Payload Self-Destructed
         </div>
      </div>
    );
  }

  const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

  const animType = msg.profile.receiveAnimation || 'none';
  const glowHex = msg.profile.customColor || activeColor.hex;

  let initialValues: any = { opacity: 0, scale: 0.95 };
  let animateValues: any = { opacity: 1, scale: 1 };
  let transitionStyle: any = { duration: 0.35, ease: 'easeOut' };

  if (animType === 'pulse') {
    initialValues = { opacity: 0, scale: 0.4 };
    animateValues = { opacity: 1, scale: [0.4, 1.15, 0.95, 1] };
    transitionStyle = { duration: 0.5, times: [0, 0.5, 0.8, 1] };
  } else if (animType === 'shake') {
    initialValues = { opacity: 0, x: -30 };
    animateValues = { opacity: 1, x: [-20, 20, -10, 10, -5, 5, 0] };
    transitionStyle = { duration: 0.6, times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1] };
  } else if (animType === 'neon') {
    initialValues = { opacity: 0, scale: 0.95, filter: 'drop-shadow(0 0 0px rgba(0,0,0,0))' };
    animateValues = { 
      opacity: 1, 
      scale: 1, 
      filter: [
        'drop-shadow(0 0 0px rgba(0,0,0,0))',
        `drop-shadow(0 0 15px ${glowHex}E0)`,
        `drop-shadow(0 0 3px ${glowHex}40)`
      ]
    };
    transitionStyle = { duration: 0.8, times: [0, 0.4, 1] };
  } else if (animType === 'glitch') {
    initialValues = { opacity: 0, skewX: 0, scale: 0.95 };
    animateValues = { 
      opacity: 1, 
      scale: 1,
      skewX: [0, -15, 15, -7, 3, 0],
      y: [0, -3, 3, -1, 1, 0]
    };
    transitionStyle = { duration: 0.5, times: [0, 0.15, 0.3, 0.45, 0.6, 1] };
  } else if (animType === 'bounce') {
    initialValues = { opacity: 0, y: 35 };
    animateValues = { opacity: 1, y: [35, -10, 3, 0] };
    transitionStyle = { duration: 0.55, times: [0, 0.6, 0.85, 1], ease: 'easeOut' };
  } else {
    // none (and default)
    initialValues = { opacity: 0, y: 24 };
    animateValues = { opacity: 1, y: 0 };
    transitionStyle = { 
      duration: 0.5, 
      ease: [0.16, 1, 0.3, 1] 
    };
  }

  return (
    <motion.div 
      initial={initialValues}
      animate={animateValues}
      transition={transitionStyle}
      className={`flex gap-4 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse text-right' : 'mr-auto text-left'}`}
    >
       <div 
        className="w-10 h-10 rounded-xl bg-black/40 border flex items-center justify-center shrink-0 self-end shadow-sm overflow-hidden"
        style={{ borderColor: msg.profile.customColor || activeColor.hex, color: msg.profile.customColor || activeColor.hex, boxShadow: `0 0 10px ${(msg.profile.customColor || activeColor.hex)}20` }}
       >
         {getAvatarIcon(msg.profile, 24)}
       </div>
       <div className="space-y-1.5 flex flex-col group relative">
         <div className={`flex items-center gap-2 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: msg.profile.customColor || activeColor.hex }}>{msg.profile.codename}</span>
            <span className="text-[8px] text-slate-600 font-mono tracking-tighter">{new Date(msg.timestamp).toLocaleTimeString()}</span>
         </div>
         <div className={`relative px-5 py-4 rounded-2xl text-[11px] font-medium leading-relaxed font-mono shadow-sm transition-all ${isMe ? 'bg-indigo-600 text-white rounded-br-none border border-indigo-500/50' : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-bl-none'} ${msg.crypto_type === CipherType.MORSE ? 'border-amber-500/30' : ''}`}>
           {msg.crypto_type === CipherType.MORSE && (
             <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-amber-900/40">
               <Radio size={10} className="text-white" />
             </div>
           )}
           {(isDecryptedProperly || isRevealed) ? (
             <div className="space-y-3">
               {msg.isAttachment && (
                 <div className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl mb-2">
                   <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                     <FileText size={16} />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-[10px] font-black uppercase tracking-widest truncate">{msg.fileName || 'UNNAMED_TRANSMISSION'}</p>
                     <button 
                       onClick={() => {
                         const content = isRevealed ? (isPlaintext ? msg.content : Cipher.decrypt(msg.content, msg.crypto_key, msg.crypto_shift, msg.crypto_type)) : deciphered;
                         const blob = new Blob([content], { type: 'text/plain' });
                         const url = URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = msg.fileName || 'decrypted_file.txt';
                         a.click();
                         URL.revokeObjectURL(url);
                       }}
                       className="text-[8px] text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-widest underline underline-offset-2"
                     >
                       EXTRACT_PAYLOAD
                     </button>
                   </div>
                 </div>
               )}
               {isRevealed ? (
                  <MatrixMorphText 
                    ciphertext={msg.content} 
                    plaintext={isPlaintext ? msg.content : Cipher.decrypt(msg.content, msg.crypto_key, msg.crypto_shift, msg.crypto_type)} 
                  />
                ) : (
                  <span className="break-words whitespace-pre-wrap block">
                    {deciphered}
                  </span>
                )}
             </div>
           ) : (
             <div className="opacity-40">
               <div className="mb-2 text-[8px] font-black tracking-widest uppercase flex items-center gap-1">
                 <Lock size={8} /> [Cryptographic Lockdown]
               </div>
               <span className="break-all text-[10px] italic">{msg.content.substring(0, 80)}...</span>
             </div>
           )}
           
           <div className={`absolute top-2 ${isMe ? 'right-auto -left-8' : 'left-auto -right-8'} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
             {!isDecryptedProperly && (
                <button 
                 onClick={() => {
                   const nextRevealed = !isRevealed;
                   setIsRevealed(nextRevealed);
                   if (nextRevealed && !hasRevealedOnce) {
                     setHasRevealedOnce(true);
                     playSynthSound?.('success');
                   }
                 }}
                className={`p-1.5 rounded-lg bg-black/40 border border-white/10 hover:bg-black/60 text-slate-400`}
                title="Quick Decrypt"
               >
                  {isRevealed ? <Lock size={10} className="text-emerald-400" /> : <Eye size={10} />}
               </button>
             )}
             <button 
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className={`p-1.5 rounded-lg bg-black/40 border border-white/10 hover:bg-black/60 text-slate-400 ${showReactionPicker ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400 opacity-100' : ''}`}
                title="Add Reaction"
             >
                <Plus size={10} />
              </button>

           </div>

           <AnimatePresence>
             {showReactionPicker && (
               <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className={`absolute z-10 bottom-full mb-2 ${isMe ? 'left-0' : 'right-0'} bg-slate-900 border border-slate-800 p-2 rounded-2xl flex gap-1 shadow-2xl`}
               >
                 {REACTION_OPTIONS.map(reactionOpt => (
                   <button 
                    key={reactionOpt.emoji}
                     onClick={() => handleToggleReaction(reactionOpt.emoji)}
                    className={`w-8 h-8 flex items-center justify-center text-[13px] rounded-lg hover:bg-white/5 transition-colors ${msg.reactions?.[reactionOpt.emoji]?.includes(auth.currentUser?.uid || '') ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'text-slate-400 hover:text-white'}`}
                    title={reactionOpt.label}
                    >
                      {reactionOpt.emoji}
                   </button>
                 ))}
               </motion.div>
             )}
           </AnimatePresence>
         </div>

         {hasReactions && (
           <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
             {Object.entries(msg.reactions || {}).map(([emoji, users]) => {
               const opt = REACTION_OPTIONS.find(o => o.emoji === emoji);
               if (!opt) return null;
               const isOwn = users.includes(auth.currentUser?.uid || '');
               return (
                 <button 
                  key={emoji}
                   onClick={() => handleToggleReaction(emoji)}
                   className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] tracking-wide transition-all ${isOwn ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-black/20 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    <span>{emoji}</span>
                   <span>{users.length}</span>
                 </button>
               );
             })}
           </div>
         )}

         {msg.decryptLogs && msg.decryptLogs.length > 0 && (
            <div id={`decrypt-log-${msg.id}`} className={`mt-1.5 bg-black/45 border border-slate-800/80 rounded-xl p-2 px-3 space-y-1.5 w-full max-w-[210px] ${isMe ? 'self-end' : 'self-start'}`}>
              <div className="flex items-center justify-between text-[7px] font-mono font-black text-slate-500 tracking-widest border-b border-slate-800/40 pb-1 uppercase">
                <span className="flex items-center gap-1">
                  <Activity size={8} className="text-cyan-400 animate-pulse" /> Decrypt Stream
                </span>
                <span>{msg.decryptLogs.length} RX</span>
              </div>
              <div className="space-y-1 max-h-[85px] overflow-y-auto w-full">
                {msg.decryptLogs.map((log, idx) => {
                  const matchingColor = COLOR_OPTIONS.find(c => c.id === log.color) || COLOR_OPTIONS[0];
                  const displayColor = log.customColor || matchingColor.hex;
                  return (
                    <div key={idx} id={`decrypt-log-row-${msg.id}-${idx}`} className="flex items-center justify-between text-[8px] font-mono leading-none py-1 hover:bg-white/5 px-1 rounded transition-colors gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: displayColor }} />
                        <span className="font-bold tracking-tight uppercase truncate" style={{ color: displayColor }}>
                          {log.codename}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[7px] shrink-0 font-bold">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`flex gap-3 items-center px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
           <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-black/20 px-1.5 py-0.5 rounded border border-slate-800/50">ALG: {msg.crypto_type}</span>
           {msg.readBy && msg.readBy.length > 0 && (
             <button
               type="button"
               onClick={() => {
                 playSynthSound?.('beep');
                 setShowReadersList(!showReadersList);
               }}
               className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] tracking-wide transition-all bg-black/20 border-slate-800/60 text-indigo-400 hover:border-indigo-500/30 font-mono font-bold"
               title="Expand Decrypted/Read Receipts"
             >
               <Eye size={9} />
               <span>SEEN: {msg.readBy.length}</span>
               <span className="text-[6px] opacity-60 text-slate-400">{showReadersList ? '▼' : '▲'}</span>
             </button>
           )}
           {isRevealed && (
             <span className="text-[7px] text-amber-500 font-black uppercase flex items-center gap-1">
               <Binary size={8} /> Original Key used
             </span>
           )}
           {msg.burn && isDecryptedProperly && (
             <div className="flex items-center gap-1.5 text-[8px] text-rose-500 font-black animate-pulse bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
               <Flame size={8} /> FUSE: {timeLeft}S
             </div>
           )}
         </div>

         <AnimatePresence>
           {showReadersList && msg.readBy && msg.readBy.length > 0 && (
             <motion.div
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               exit={{ opacity: 0, height: 0 }}
               className={`overflow-hidden mt-2 pt-2 border-t border-slate-800/40 flex flex-wrap gap-1.5 w-full ${isMe ? 'justify-end' : 'justify-start'}`}
             >
               <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest flex items-center h-5 font-mono">
                 DECRYPTED_BY:
               </span>
               {msg.readBy.map(uid => {
                 const agent = allAgents?.find(a => a.id === uid);
                 const agentCodename = agent?.profile?.codename || `AGENT_PROBE_${uid.slice(0, 4).toUpperCase()}`;
                 const matchingColor = COLOR_OPTIONS.find(c => c.id === agent?.profile?.color) || COLOR_OPTIONS[0];
                 const agentColor = agent?.profile?.customColor || matchingColor.hex;
                 return (
                   <div
                     key={uid}
                     className="flex items-center gap-1 bg-black/30 border border-slate-800/60 px-1.5 py-0.5 rounded-lg text-[8px] font-mono"
                     style={{ borderColor: `${agentColor}33` }}
                   >
                     <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: agentColor }} />
                     <span className="font-extrabold uppercase tracking-tight" style={{ color: agentColor }}>
                       {agentCodename}
                     </span>
                   </div>
                 );
               })}
             </motion.div>
           )}
         </AnimatePresence>
       </div>
    </motion.div>
  );
}

function AnalysisTool({ title, icon, color, children }: { title: string, icon: React.ReactNode, color: string, children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className={`text-${color}-400`}>{icon}</span>
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 italic">{title}</h4>
        </div>
        <span className="text-[8px] font-mono text-slate-600">active_analysis.log</span>
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function FrequencyAnalyzer({ text }: { text: string }) {
  const [data, setData] = useState<{ char: string, count: number, percent: number }[]>([]);

  useEffect(() => {
    const normalized = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!normalized) {
      setData([]);
      return;
    }
    const counts: Record<string, number> = {};
    for (const char of normalized) {
      counts[char] = (counts[char] || 0) + 1;
    }
    const total = normalized.length;
    const sorted = Object.entries(counts)
      .map(([char, count]) => ({ char, count, percent: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 14);
    setData(sorted);
  }, [text]);

  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[9px] text-slate-600 uppercase font-black tracking-widest text-center italic border border-dashed border-slate-800 rounded-xl">
        Awaiting input buffer analysis...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      {data.map(item => (
        <div key={item.char} className="space-y-1">
          <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 tracking-tighter">
            <span className="text-emerald-400 font-mono">{item.char}</span>
            <span>{item.percent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden border border-slate-800/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${item.percent}%` }}
              className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
