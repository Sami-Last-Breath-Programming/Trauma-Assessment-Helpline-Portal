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

export interface BaselineQuestion {
  id: string;
  prompt: string;
  type: 'choice';
  options: string[];
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

export interface LiveRiskUpdate {
  type: 'live_risk_update';
  caseId: string;
  caseNumber: string;
  victimName: string;
  callerNumber: string;
  location: string;
  stressScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  traumaCategory: string;
  emotionalState: string;
  criticalFlags: string[];
  responderUrgency: 'ROUTINE' | 'ELEVATED' | 'IMMEDIATE_INTERVENTION';
  recommendedActions: string[];
  lastStatement: string;
  counselingResponse: string;
  timestamp: string;
}

export interface SystemStats {
  totalCalls: number;
  activeCrises: number;
  criticalCases: number;
  highCases: number;
  dispatchedCount: number;
  averageRiskScore: number;
}
