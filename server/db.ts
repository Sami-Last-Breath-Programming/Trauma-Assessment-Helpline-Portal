import fs from 'fs';
import path from 'path';

export interface UserProfile {
  id: string;
  phone: string;
  fullName: string;
  age?: number;
  gender?: string;
  state?: string;
  district?: string;
  category?: 'SC' | 'ST' | 'OBC' | 'General' | 'Other';
  emergencyContact?: string;
  baselineScores?: {
    priorTraumaIndex: number;
    safetyConcernLevel: string;
    completedAt: string;
    responses: Record<string, string>;
  };
  createdAt: string;
}

export interface TraumaAssessment {
  id: string;
  sessionId: string;
  userId?: string;
  callerNumber: string;
  channel: 'web_portal' | 'phone_call';
  userMessage: string;
  stressScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  traumaCategory: string;
  emotionalState: string;
  criticalFlags: string[];
  responderUrgency: 'ROUTINE' | 'ELEVATED' | 'IMMEDIATE_INTERVENTION';
  recommendedActions: string[];
  counselingResponse: string;
  timestamp: string;
}

export interface HelplineCase {
  id: string;
  caseNumber: string;
  callerNumber: string;
  userId?: string;
  victimName: string;
  location: string;
  channel: 'web_portal' | 'phone_call';
  currentRiskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  status: 'active' | 'escalated' | 'dispatched' | 'resolved';
  category: string;
  summary: string;
  transcripts: {
    sender: 'caller' | 'assistant' | 'responder';
    text: string;
    stressScore?: number;
    timestamp: string;
  }[];
  criticalFlags: string[];
  assignedOperator: string;
  escalationDetails?: {
    dispatchedAt: string;
    unitType: string;
    contactNumber: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface DatabaseSchema {
  users: UserProfile[];
  assessments: TraumaAssessment[];
  cases: HelplineCase[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_USERS: UserProfile[] = [
];

const INITIAL_CASES: HelplineCase[] = [
  
];

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialData: DatabaseSchema = {
        users: INITIAL_USERS,
        assessments: [],
        cases: INITIAL_CASES,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    // Ensure shape and provide defaults for missing keys
    const safe: DatabaseSchema = {
      users: Array.isArray(parsed.users) ? parsed.users : INITIAL_USERS,
      assessments: Array.isArray(parsed.assessments) ? parsed.assessments : [],
      cases: Array.isArray(parsed.cases) ? parsed.cases : INITIAL_CASES,
    };
    return safe;
  } catch (err) {
    console.error('Failed to read database, falling back to memory copy', err);
    return {
      users: INITIAL_USERS,
      assessments: [],
      cases: INITIAL_CASES,
    };
  }
}

function writeDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Failed to write database', err);
  }
}

export const db = {
  getUsers: (): UserProfile[] => readDb().users,

  findUserByPhone: (phone: string): UserProfile | undefined => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return readDb().users.find((u) => u.phone.replace(/\D/g, '').slice(-10) === cleanPhone);
  },

  findUserById: (id: string): UserProfile | undefined => {
    return readDb().users.find((u) => u.id === id);
  },

  createUser: (profile: Omit<UserProfile, 'id' | 'createdAt'>): UserProfile => {
    const data = readDb();
    const newUser: UserProfile = {
      ...profile,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    data.users.push(newUser);
    writeDb(data);
    return newUser;
  },

  updateUserBaseline: (
    userId: string,
    baselineScores: UserProfile['baselineScores']
  ): UserProfile | null => {
    const data = readDb();
    const idx = data.users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    data.users[idx].baselineScores = baselineScores;
    writeDb(data);
    return data.users[idx];
  },

  getCases: (): HelplineCase[] => readDb().cases,

  findCaseById: (id: string): HelplineCase | undefined => {
    return readDb().cases.find((c) => c.id === id);
  },

  findActiveCaseByPhone: (phone: string): HelplineCase | undefined => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return readDb().cases.find(
      (c) =>
        c.callerNumber.replace(/\D/g, '').slice(-10) === cleanPhone &&
        (c.status === 'active' || c.status === 'escalated')
    );
  },

  createCase: (newCase: Omit<HelplineCase, 'id' | 'caseNumber' | 'createdAt' | 'updatedAt'>): HelplineCase => {
    const data = readDb();
    const caseItem: HelplineCase = {
      ...newCase,
      id: `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseNumber: `NHAA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.cases.unshift(caseItem);
    writeDb(data);
    return caseItem;
  },

  updateCase: (id: string, patch: Partial<HelplineCase>): HelplineCase | null => {
    const data = readDb();
    const idx = data.cases.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    data.cases[idx] = {
      ...data.cases[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    writeDb(data);
    return data.cases[idx];
  },

  appendTranscript: (
    caseId: string,
    message: HelplineCase['transcripts'][number],
    latestRiskScore?: number,
    criticalFlags?: string[]
  ): HelplineCase | null => {
    const data = readDb();
    const idx = data.cases.findIndex((c) => c.id === caseId);
    if (idx === -1) return null;

    data.cases[idx].transcripts.push(message);
    if (latestRiskScore !== undefined) {
      data.cases[idx].currentRiskScore = latestRiskScore;
      if (latestRiskScore >= 80) data.cases[idx].riskLevel = 'CRITICAL';
      else if (latestRiskScore >= 60) data.cases[idx].riskLevel = 'HIGH';
      else if (latestRiskScore >= 35) data.cases[idx].riskLevel = 'MODERATE';
      else data.cases[idx].riskLevel = 'LOW';
    }
    if (criticalFlags && criticalFlags.length > 0) {
      const existing = new Set(data.cases[idx].criticalFlags);
      criticalFlags.forEach((f) => existing.add(f));
      data.cases[idx].criticalFlags = Array.from(existing);
    }
    data.cases[idx].updatedAt = new Date().toISOString();
    writeDb(data);
    return data.cases[idx];
  },

  logAssessment: (assessment: Omit<TraumaAssessment, 'id' | 'timestamp'>): TraumaAssessment => {
    const data = readDb();
    const item: TraumaAssessment = {
      ...assessment,
      id: `asm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    data.assessments.unshift(item);
    if (data.assessments.length > 100) {
      data.assessments = data.assessments.slice(0, 100);
    }
    writeDb(data);
    return item;
  },

  getRecentAssessments: (limit = 20): TraumaAssessment[] => {
    return readDb().assessments.slice(0, limit);
  },
};
