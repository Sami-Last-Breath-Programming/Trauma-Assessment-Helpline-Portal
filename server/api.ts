import express, { Request, Response } from 'express';
import { db } from './db.js';
import { transcribeAudio, evaluateTraumaAndRespond } from './gemini.js';
import { broadcastToResponders } from './ws.js';

export const apiRouter = express.Router();

apiRouter.use(express.json({ limit: '25mb' }));

const BASELINE_QUESTIONS = [
  {
    id: 'q1',
    prompt: 'Are you or your family currently facing any immediate physical threats or violence?',
    type: 'choice',
    options: [
      'Yes, active threat right now',
      'Recent threats within last 48 hours',
      'Persistent verbal intimidation / harassment',
      'No physical threat, seeking grievance assistance',
    ],
  },
  {
    id: 'q2',
    prompt: 'Have you experienced caste-based slurs, social boycott, or denial of access to public amenities?',
    type: 'choice',
    options: [
      'Severe public humiliation / caste atrocities',
      'Denial of drinking water, pathways, or public resources',
      'Workplace or school harassment',
      'Not applicable in this incident',
    ],
  },
  {
    id: 'q3',
    prompt: 'Have you approached local authorities (Police Station / SDM / Welfare Officer)?',
    type: 'choice',
    options: [
      'Yes, but FIR was refused or delayed',
      'Yes, complaint filed but no protection provided',
      'No, afraid of retaliation from perpetrators',
      'First time reaching out to 14566 helpline',
    ],
  },
  {
    id: 'q4',
    prompt: 'How would you describe your current emotional and mental state?',
    type: 'choice',
    options: [
      'Overwhelmed with panic, trembling, cannot sleep',
      'Deep anxiety and fear for family safety',
      'Angry, distressed, but coping',
      'Calm and seeking legal guidance',
    ],
  },
  {
    id: 'q5',
    prompt: 'Do you require immediate safe shelter or medical attention?',
    type: 'choice',
    options: [
      'Immediate medical care and safe evacuation needed',
      'Safe temporary shelter required',
      'Legal and police protection required',
      'Counseling and legal advisory only',
    ],
  },
];

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { fullName, phone, age, gender, state, district, category, emergencyContact } = req.body;

  if (!fullName || !phone) {
    return res.status(400).json({ error: 'Full name and phone number are required.' });
  }

  const existing = db.findUserByPhone(phone);
  if (existing) {
    return res.json({ success: true, isNew: false, user: existing });
  }

  const user = db.createUser({
    fullName,
    phone,
    age: age ? Number(age) : undefined,
    gender,
    state,
    district,
    category: category || 'SC',
    emergencyContact,
  });

  return res.json({ success: true, isNew: true, user });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const user = db.findUserByPhone(phone);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found. Please register first.' });
  }

  return res.json({ success: true, user });
});

apiRouter.get('/auth/users', (_req: Request, res: Response) => {
  return res.json(db.getUsers());
});

apiRouter.get('/profile/questions', (_req: Request, res: Response) => {
  return res.json(BASELINE_QUESTIONS);
});

apiRouter.post('/profile/save-questions', (req: Request, res: Response) => {
  const { userId, responses } = req.body;
  if (!userId || !responses) {
    return res.status(400).json({ error: 'userId and responses are required.' });
  }

  let priorTraumaIndex = 30;
  if (responses.q1?.includes('active threat right now')) priorTraumaIndex += 30;
  else if (responses.q1?.includes('Recent threats')) priorTraumaIndex += 20;

  if (responses.q2?.includes('Severe public humiliation')) priorTraumaIndex += 20;
  if (responses.q3?.includes('FIR was refused') || responses.q3?.includes('afraid')) priorTraumaIndex += 15;
  if (responses.q4?.includes('Overwhelmed with panic')) priorTraumaIndex += 20;
  if (responses.q5?.includes('Immediate medical care')) priorTraumaIndex += 25;

  priorTraumaIndex = Math.min(100, Math.max(15, priorTraumaIndex));
  const safetyConcernLevel =
    priorTraumaIndex >= 75 ? 'Critical' : priorTraumaIndex >= 50 ? 'High' : 'Moderate';

  const updated = db.updateUserBaseline(userId, {
    priorTraumaIndex,
    safetyConcernLevel,
    completedAt: new Date().toISOString(),
    responses,
  });

  if (!updated) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ success: true, user: updated });
});

apiRouter.post('/phone/lookup', (req: Request, res: Response) => {
  const { callerNumber } = req.body;
  if (!callerNumber) {
    return res.status(400).json({ error: 'callerNumber is required.' });
  }

  const user = db.findUserByPhone(callerNumber);
  const activeCase = db.findActiveCaseByPhone(callerNumber);

  if (user) {
    return res.json({
      isRegistered: true,
      user,
      activeCase: activeCase || null,
      greeting: `Welcome back, ${user.fullName}. You are connected to National Helpline Against Atrocities (14566). We are reviewing your record. How can we protect and assist you right now?`,
    });
  }

  return res.json({
    isRegistered: false,
    callerNumber,
    greeting: `Namaste. You have reached the National Helpline Against Atrocities (14566). Since you are calling from a new number, please tell us your name and where you are calling from so we can record your grievance immediately.`,
  });
});

apiRouter.post('/phone/create-profile', (req: Request, res: Response) => {
  const { phone, fullName, district, state, category, emergencyContact } = req.body;
  if (!phone || !fullName) {
    return res.status(400).json({ error: 'Phone and full name are required.' });
  }

  let user = db.findUserByPhone(phone);
  if (!user) {
    user = db.createUser({
      phone,
      fullName,
      district: district || 'Unassigned',
      state: state || 'Unassigned',
      category: category || 'SC',
      emergencyContact,
      baselineScores: {
        priorTraumaIndex: 50,
        safetyConcernLevel: 'High',
        completedAt: new Date().toISOString(),
        responses: { initialInquiry: 'Captured via 14566 phone call IVR' },
      },
    });
  }

  let activeCase = db.findActiveCaseByPhone(phone);
  if (!activeCase) {
    activeCase = db.createCase({
      callerNumber: phone,
      userId: user.id,
      victimName: user.fullName,
      location: `${user.district}, ${user.state}`,
      channel: 'phone_call',
      currentRiskScore: 60,
      riskLevel: 'HIGH',
      status: 'active',
      category: 'Inbound 14566 Phone Helpline Case',
      summary: `Initial registration via 14566 phone bot for ${user.fullName}.`,
      transcripts: [],
      criticalFlags: ['NEW_COMPLAINT_INTAKE'],
      assignedOperator: 'Emergency Intake Officer',
    });
  }

  return res.json({
    success: true,
    user,
    activeCase,
    message: `Thank you, ${user.fullName}. Your profile is saved. Please describe your situation.`,
  });
});

apiRouter.post('/trauma/assess', async (req: Request, res: Response) => {
  try {
    const { userInput, audioBase64, mimeType, callerNumber = '9876543210', channel = 'web_portal', caseId } =
      req.body;

    let textToAnalyze = userInput || '';
    if (audioBase64) {
      textToAnalyze = await transcribeAudio(audioBase64, mimeType || 'audio/webm');
    }

    if (!textToAnalyze || !textToAnalyze.trim()) {
      return res.status(400).json({ error: 'No audio or text input provided.' });
    }

    const userProfile = db.findUserByPhone(callerNumber) || null;
    let activeCase = caseId ? db.findCaseById(caseId) : db.findActiveCaseByPhone(callerNumber);

    if (!activeCase) {
      activeCase = db.createCase({
        callerNumber,
        userId: userProfile?.id,
        victimName: userProfile?.fullName || 'Anonymous Complainant',
        location: userProfile ? `${userProfile.district || ''}, ${userProfile.state || ''}` : 'Location Unconfirmed',
        channel,
        currentRiskScore: 45,
        riskLevel: 'MODERATE',
        status: 'active',
        category: 'Real-Time Trauma Assessment Intake',
        summary: textToAnalyze.slice(0, 120),
        transcripts: [],
        criticalFlags: [],
        assignedOperator: 'NHAA Crisis Desk',
      });
    }

    const assessment = await evaluateTraumaAndRespond({
      userInput: textToAnalyze,
      userProfile,
      history: activeCase.transcripts.slice(-6).map((t) => ({ sender: t.sender, text: t.text })),
      channel,
    });

    db.appendTranscript(
      activeCase.id,
      {
        sender: 'caller',
        text: textToAnalyze,
        stressScore: assessment.stressScore,
        timestamp: new Date().toISOString(),
      },
      assessment.stressScore,
      assessment.criticalFlags
    );

    db.appendTranscript(activeCase.id, {
      sender: 'assistant',
      text: assessment.counselingResponse,
      timestamp: new Date().toISOString(),
    });

    db.logAssessment({
      sessionId: activeCase.id,
      userId: userProfile?.id,
      callerNumber,
      channel,
      userMessage: textToAnalyze,
      stressScore: assessment.stressScore,
      riskLevel: assessment.riskLevel,
      traumaCategory: assessment.traumaCategory,
      emotionalState: assessment.emotionalState,
      criticalFlags: assessment.criticalFlags,
      responderUrgency: assessment.responderUrgency,
      recommendedActions: assessment.recommendedActions,
      counselingResponse: assessment.counselingResponse,
    });

    broadcastToResponders({
      type: 'live_risk_update',
      caseId: activeCase.id,
      caseNumber: activeCase.caseNumber,
      victimName: activeCase.victimName,
      callerNumber: activeCase.callerNumber,
      location: activeCase.location,
      stressScore: assessment.stressScore,
      riskLevel: assessment.riskLevel,
      traumaCategory: assessment.traumaCategory,
      emotionalState: assessment.emotionalState,
      criticalFlags: assessment.criticalFlags,
      responderUrgency: assessment.responderUrgency,
      recommendedActions: assessment.recommendedActions,
      lastStatement: textToAnalyze,
      counselingResponse: assessment.counselingResponse,
      timestamp: new Date().toISOString(),
    });

    const updatedCase = db.findCaseById(activeCase.id);

    return res.json({
      success: true,
      assessment: {
        ...assessment,
        transcript: textToAnalyze,
      },
      case: updatedCase,
    });
  } catch (err: any) {
    console.error('Trauma assess error:', err);
    return res.status(500).json({ error: 'Assessment failed', details: err?.message });
  }
});

apiRouter.get('/cases', (_req: Request, res: Response) => {
  return res.json(db.getCases());
});

apiRouter.get('/cases/:id', (req: Request, res: Response) => {
  const caseItem = db.findCaseById(req.params.id);
  if (!caseItem) return res.status(404).json({ error: 'Case not found' });
  return res.json(caseItem);
});

apiRouter.post('/cases/:id/dispatch', (req: Request, res: Response) => {
  const { unitType, contactNumber, notes } = req.body;
  const caseItem = db.findCaseById(req.params.id);
  if (!caseItem) return res.status(404).json({ error: 'Case not found' });

  const updated = db.updateCase(req.params.id, {
    status: 'dispatched',
    escalationDetails: {
      dispatchedAt: new Date().toISOString(),
      unitType: unitType || 'NHAA Quick Response Police / Social Welfare Team',
      contactNumber: contactNumber || '112-QRT-ESC',
      status: notes || 'Emergency unit dispatched to victim premises.',
    },
  });

  broadcastToResponders({
    type: 'emergency_dispatched',
    caseId: req.params.id,
    caseNumber: caseItem.caseNumber,
    victimName: caseItem.victimName,
    unitType: unitType || 'NHAA Quick Response Unit',
    timestamp: new Date().toISOString(),
  });

  return res.json({ success: true, case: updated });
});

apiRouter.get('/stats', (_req: Request, res: Response) => {
  const cases = db.getCases();
  const totalCalls = cases.length;
  const criticalCases = cases.filter((c) => c.riskLevel === 'CRITICAL').length;
  const highCases = cases.filter((c) => c.riskLevel === 'HIGH').length;
  const dispatched = cases.filter((c) => c.status === 'dispatched' || c.status === 'escalated').length;

  const totalScore = cases.reduce((acc, c) => acc + c.currentRiskScore, 0);
  const averageRisk = cases.length > 0 ? Math.round(totalScore / cases.length) : 0;

  return res.json({
    totalCalls,
    activeCrises: criticalCases + highCases,
    criticalCases,
    highCases,
    dispatchedCount: dispatched,
    averageRiskScore: averageRisk,
    recentAssessments: db.getRecentAssessments(10),
  });
});
