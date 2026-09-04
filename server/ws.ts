import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { db } from './db.js';
import { transcribeAudio, evaluateTraumaAndRespond } from './gemini.js';

interface ClientMetadata {
  ws: WebSocket;
  role: 'caller' | 'responder';
  sessionId?: string;
  callerNumber?: string;
}

const clients = new Map<WebSocket, ClientMetadata>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    clients.set(ws, { ws, role: 'responder' });

    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to NHAA 14566 Real-Time Stream Engine',
        timestamp: new Date().toISOString(),
      })
    );

    ws.on('message', async (data) => {
      try {
        let payload: any;
        if (typeof data === 'string') {
          payload = JSON.parse(data);
        } else if (Buffer.isBuffer(data)) {
          try {
            payload = JSON.parse(data.toString('utf-8'));
          } catch {
            payload = {
              type: 'audio_payload',
              audioBase64: data.toString('base64'),
              mimeType: 'audio/webm',
            };
          }
        } else {
          return;
        }

        if (payload.type === 'register_role') {
          const clientMeta = clients.get(ws);
          if (clientMeta) {
            clientMeta.role = payload.role || 'caller';
            clientMeta.sessionId = payload.sessionId;
            clientMeta.callerNumber = payload.callerNumber;
          }
          ws.send(JSON.stringify({ type: 'role_registered', role: payload.role }));
          return;
        }

        if (payload.type === 'caller_message' || payload.type === 'audio_payload') {
          let userText = payload.text || '';
          if (payload.audioBase64) {
            userText = await transcribeAudio(payload.audioBase64, payload.mimeType || 'audio/webm');
          }

          if (!userText.trim()) return;

          const callerNumber = payload.callerNumber || '9876543210';
          const userProfile = db.findUserByPhone(callerNumber) || null;
          let activeCase = db.findActiveCaseByPhone(callerNumber);

          if (!activeCase) {
            activeCase = db.createCase({
              callerNumber,
              userId: userProfile?.id,
              victimName: userProfile?.fullName || 'Helpline Caller',
              location: userProfile ? `${userProfile.district || ''}, ${userProfile.state || ''}` : 'Location Pending',
              channel: payload.channel || 'phone_call',
              currentRiskScore: 40,
              riskLevel: 'MODERATE',
              status: 'active',
              category: 'Active Inbound Helpline Assessment',
              summary: userText.slice(0, 140),
              transcripts: [],
              criticalFlags: [],
              assignedOperator: 'Duty Officer (NHAA Redressal)',
            });
          }

          const assessment = await evaluateTraumaAndRespond({
            userInput: userText,
            userProfile,
            history: activeCase.transcripts.slice(-6).map((t) => ({ sender: t.sender, text: t.text })),
            channel: payload.channel || 'phone_call',
          });

          db.appendTranscript(
            activeCase.id,
            {
              sender: 'caller',
              text: userText,
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
            sessionId: payload.sessionId || activeCase.id,
            userId: userProfile?.id,
            callerNumber,
            channel: payload.channel || 'phone_call',
            userMessage: userText,
            stressScore: assessment.stressScore,
            riskLevel: assessment.riskLevel,
            traumaCategory: assessment.traumaCategory,
            emotionalState: assessment.emotionalState,
            criticalFlags: assessment.criticalFlags,
            responderUrgency: assessment.responderUrgency,
            recommendedActions: assessment.recommendedActions,
            counselingResponse: assessment.counselingResponse,
          });

          const callerResult = {
            type: 'ai_response',
            transcript: userText,
            counselingResponse: assessment.counselingResponse,
            stressScore: assessment.stressScore,
            riskLevel: assessment.riskLevel,
            traumaCategory: assessment.traumaCategory,
            caseId: activeCase.id,
            timestamp: new Date().toISOString(),
          };
          ws.send(JSON.stringify(callerResult));

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
            lastStatement: userText,
            counselingResponse: assessment.counselingResponse,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcastToResponders(eventData: any) {
  const payload = JSON.stringify(eventData);
  for (const [ws, meta] of clients.entries()) {
    if (meta.role === 'responder' && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}
