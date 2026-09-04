import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldAlert,
  User,
  MapPin,
  AlertCircle,
  Play,
  Radio,
  Sparkles,
  X,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { UserProfile, HelplineCase } from '../types';

interface PhoneCallSimulatorProps {
  initialCallerNumber?: string;
  onCallEvent?: (data: any) => void;
  wsConnected: boolean;
  onClose?: () => void;
}

export const PhoneCallSimulator: React.FC<PhoneCallSimulatorProps> = ({
  initialCallerNumber = '9876543210',
  onCallEvent,
  wsConnected,
  onClose,
}) => {
  const [callerNumber, setCallerNumber] = useState(initialCallerNumber);
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Caller identification
  const [callerProfile, setCallerProfile] = useState<UserProfile | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [activeCase, setActiveCase] = useState<HelplineCase | null>(null);
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [newCallerForm, setNewCallerForm] = useState({
    fullName: '',
    district: '',
    state: 'Madhya Pradesh',
    category: 'SC' as const,
  });

  // Call audio & speech interaction
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [callerSpeechInput, setCallerSpeechInput] = useState('');
  const [counselorSpeechOutput, setCounselorSpeechOutput] = useState('');
  const [currentStressScore, setCurrentStressScore] = useState<number>(50);
  const [currentRiskLevel, setCurrentRiskLevel] = useState<string>('MODERATE');
  const [traumaFlags, setTraumaFlags] = useState<string[]>([]);
  const [processingSpeech, setProcessingSpeech] = useState(false);
  const [callLog, setCallLog] = useState<{ sender: 'caller' | 'counselor'; text: string; time: string; score?: number }[]>(
    []
  );
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDial14566 = async () => {
    if (!callerNumber) return;
    setCallActive(true);
    setCallLog([]);
    setProcessingSpeech(true);

    try {
      const res = await fetch('/api/phone/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerNumber }),
      });
      const data = await res.json();

      setIsRegistered(data.isRegistered);
      if (data.isRegistered && data.user) {
        setCallerProfile(data.user);
        setActiveCase(data.activeCase);
        const greeting = data.greeting;
        setCounselorSpeechOutput(greeting);
        speakText(greeting);
        setCallLog([{ sender: 'counselor', text: greeting, time: formatDuration(0) }]);
      } else {
        setCallerProfile(null);
        setActiveCase(null);
        setShowNewProfileModal(true);
        const greeting = data.greeting;
        setCounselorSpeechOutput(greeting);
        speakText(greeting);
        setCallLog([{ sender: 'counselor', text: greeting, time: formatDuration(0) }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingSpeech(false);
    }
  };

  const handleSaveNewCallerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCallerForm.fullName) return;

    try {
      const res = await fetch('/api/phone/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: callerNumber,
          fullName: newCallerForm.fullName,
          district: newCallerForm.district,
          state: newCallerForm.state,
          category: newCallerForm.category,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCallerProfile(data.user);
        setActiveCase(data.activeCase);
        setIsRegistered(true);
        setShowNewProfileModal(false);

        const responseText = data.message;
        setCounselorSpeechOutput(responseText);
        speakText(responseText);
        setCallLog((prev) => [
          ...prev,
          { sender: 'counselor', text: responseText, time: formatDuration(callDuration) },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndCall = () => {
    setCallActive(false);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakText = (text: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = 'hi-IN';
    window.speechSynthesis.speak(utterance);
  };

  const handleSendSpeech = async (customText?: string) => {
    const textToSend = customText || callerSpeechInput;
    if (!textToSend.trim() || !callActive) return;

    setProcessingSpeech(true);
    setCallLog((prev) => [
      ...prev,
      { sender: 'caller', text: textToSend, time: formatDuration(callDuration) },
    ]);

    try {
      const res = await fetch('/api/trauma/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: textToSend,
          callerNumber,
          channel: 'phone_call',
          caseId: activeCase?.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.assessment) {
        const asm = data.assessment;
        setCurrentStressScore(asm.stressScore);
        setCurrentRiskLevel(asm.riskLevel);
        setTraumaFlags(asm.criticalFlags || []);
        setCounselorSpeechOutput(asm.counselingResponse);
        speakText(asm.counselingResponse);

        setCallLog((prev) => [
          ...prev,
          {
            sender: 'counselor',
            text: asm.counselingResponse,
            time: formatDuration(callDuration),
            score: asm.stressScore,
          },
        ]);

        if (onCallEvent) onCallEvent(asm);
      }
      setCallerSpeechInput('');
    } catch (err) {
      console.error('Call speech assess error:', err);
    } finally {
      setProcessingSpeech(false);
    }
  };

  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setProcessingSpeech(true);
          try {
            const res = await fetch('/api/trauma/assess', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: 'audio/webm',
                callerNumber,
                channel: 'phone_call',
                caseId: activeCase?.id,
              }),
            });
            const data = await res.json();
            if (data.success && data.assessment) {
              const asm = data.assessment;
              setCurrentStressScore(asm.stressScore);
              setCurrentRiskLevel(asm.riskLevel);
              setTraumaFlags(asm.criticalFlags || []);
              setCounselorSpeechOutput(asm.counselingResponse);
              speakText(asm.counselingResponse);

              setCallLog((prev) => [
                {
                  sender: 'caller',
                  text: asm.transcript || 'Spoken audio from caller',
                  time: formatDuration(callDuration),
                },
                ...prev,
                {
                  sender: 'counselor',
                  text: asm.counselingResponse,
                  time: formatDuration(callDuration),
                  score: asm.stressScore,
                },
              ]);
            }
          } catch (e) {
            console.error(e);
          } finally {
            setProcessingSpeech(false);
          }
        };
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access error:', err);
    }
  };

  const stopMicRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Pre-configured crisis test statements for quick demo
  const sampleScenarios = [
    {
      title: '🚨 Mob Threat at House',
      text: 'Help me please, 15 people with weapons have surrounded my home in Varanasi shouting caste abuses. They are trying to set fire to the shed!',
    },
    {
      title: '💧 Drinking Water Denial',
      text: 'The panchayat members beat up my brother when he tried to fetch water from the borewell. They said Dalits cannot touch village water.',
    },
    {
      title: '🚫 Police Refusing FIR',
      text: 'The SHO at the local police station tore up my complaint paper and threatened to lock me up if I persist in filing under the Atrocities Act.',
    },
    {
      title: '🌾 Agricultural Land Boycott',
      text: 'Dominant community landlords have blocked the pathway to our farms and imposed a strict social boycott prohibiting shops from selling us food.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <div className="bg-white/85 backdrop-blur-2xl rounded-3xl shadow-[0_12px_45px_rgba(0,0,0,0.06)] border border-white/90 overflow-hidden text-slate-800">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/60 bg-gradient-to-r from-blue-50/50 via-white to-amber-50/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">
                  14566 National Helpline Telephony Simulator
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  IVR &amp; Voice Desk
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Interactive voice intake channel with real-time trauma evaluation and responder sync.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-full border border-slate-200 bg-white/70 hover:bg-white text-slate-600 cursor-pointer transition-colors"
              title={soundEnabled ? 'Speech audio synthesis enabled' : 'Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full border border-slate-200 bg-white/70 hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                title="Close Simulator"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/60">
          {/* Column 1: Phone Handset & Dialer */}
          <div className="p-6 space-y-5 bg-slate-50/40">
            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                Calling Mobile Number (Caller ID)
              </label>
              <div className="flex space-x-2">
                <input
                  id="sim-caller-number"
                  type="tel"
                  disabled={callActive}
                  value={callerNumber}
                  onChange={(e) => setCallerNumber(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            {/* Simulated Smartphone Screen */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 text-center">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                  Connected Hotline
                </span>
                <div className="text-2xl font-black text-slate-900 tracking-tight">14566</div>
                <div className="text-xs text-slate-500">NHAA Emergency Intake</div>
              </div>

              {callActive ? (
                <div className="py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {formatDuration(callDuration)}
                  </span>
                </div>
              ) : (
                <div className="py-3 px-4 rounded-2xl bg-slate-100 text-slate-500 text-xs font-medium">
                  Call Ready &bull; Line Idle
                </div>
              )}

              {/* Call / End Call Buttons */}
              <div className="pt-2 flex justify-center space-x-4">
                {!callActive ? (
                  <button
                    id="btn-dial-hotline"
                    onClick={handleDial14566}
                    className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                    title="Dial 14566 Toll-Free Helpline"
                  >
                    <Phone className="w-6 h-6" />
                  </button>
                ) : (
                  <button
                    id="btn-end-call"
                    onClick={handleEndCall}
                    className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                    title="Disconnect Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Caller Profile Match Details */}
            {callerProfile && (
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70 text-xs space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-blue-900">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Identified Complainant Profile</span>
                </div>
                <div className="text-slate-800 font-semibold">{callerProfile.fullName} ({callerProfile.category})</div>
                <div className="text-slate-500 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{callerProfile.district}, {callerProfile.state}</span>
                </div>
                <div className="text-slate-600 text-[11px] pt-1">
                  Baseline Trauma: <span className="font-bold text-blue-700">{callerProfile.baselineScores?.priorTraumaIndex ?? 40}/100</span>
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Live Counselor Speech & Audio Ingest */}
          <div className="p-6 space-y-5 lg:col-span-2">
            {/* Counselor Speech Response Bubble */}
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block mb-2">
                Helpline Counselor Live Response (Spoken via 14566)
              </span>
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 min-h-[100px] flex flex-col justify-between">
                <p className="text-sm text-slate-800 leading-relaxed italic">
                  {counselorSpeechOutput || (callActive ? 'Listening to caller...' : 'Dial 14566 to initiate caller intake.')}
                </p>
                {processingSpeech && (
                  <div className="mt-3 flex items-center space-x-2 text-xs text-blue-600 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span>Processing speech stream &amp; formulating clinical intake response...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Caller Input Controls */}
            {callActive && (
              <div className="space-y-4 pt-2">
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block mb-1.5">
                    Speak or Type as Complainant
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      id="btn-call-mic"
                      type="button"
                      onClick={isRecording ? stopMicRecording : startMicRecording}
                      className={`p-3 rounded-full border transition-all cursor-pointer ${
                        isRecording
                          ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-md shadow-rose-600/30'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                      title={isRecording ? 'Stop Recording' : 'Speak into Microphone'}
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <input
                      id="call-speech-text"
                      type="text"
                      value={callerSpeechInput}
                      onChange={(e) => setCallerSpeechInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && callerSpeechInput.trim() && !processingSpeech) {
                          handleSendSpeech();
                        }
                      }}
                      placeholder={
                        isRecording
                          ? 'Recording your voice... tap red mic to submit speech'
                          : 'Type complainant statement or tap microphone...'
                      }
                      className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
                    />

                    <button
                      id="btn-send-speech"
                      type="button"
                      disabled={!callerSpeechInput.trim() || processingSpeech}
                      onClick={() => handleSendSpeech()}
                      className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
                    >
                      Speak
                    </button>
                  </div>
                </div>

                {/* Scenario Presets for Fast Testing */}
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block mb-2">
                    Emergency Crisis Scenario Presets (Quick Test)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sampleScenarios.map((sc, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendSpeech(sc.text)}
                        disabled={processingSpeech}
                        className="text-left p-3 rounded-2xl bg-slate-50/70 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 transition-all text-xs cursor-pointer group"
                      >
                        <span className="font-semibold text-slate-900 group-hover:text-blue-700 block mb-0.5">
                          {sc.title}
                        </span>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                          {sc.text}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Call Transcript Audit */}
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block mb-2">
                    Call Transcript History
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-2xl bg-slate-50/40 border border-slate-200/60 text-xs">
                    {callLog.map((log, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border ${
                          log.sender === 'caller'
                            ? 'bg-amber-50/70 border-amber-200/70 text-slate-900'
                            : 'bg-white border-slate-200/80 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5 font-medium">
                          <span>{log.sender === 'caller' ? 'Complainant' : 'Helpline Counselor'}</span>
                          <span>{log.time}</span>
                        </div>
                        <p className="leading-relaxed">{log.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
