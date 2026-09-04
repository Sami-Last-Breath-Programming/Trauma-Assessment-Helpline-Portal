import React, { useState, useEffect } from 'react';
import { UserProfile, BaselineQuestion, HelplineCase } from '../types';
import {
  User,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Mic,
  MicOff,
  Send,
  ArrowRight,
  UserPlus,
  LogIn,
  HeartHandshake,
  FileCheck,
  Scale,
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';

interface WebPortalProps {
  onDialHotline: (phone: string) => void;
  onAssessmentCompleted?: (score: number) => void;
  activeSubTab?: 'portal_intake' | 'my_cases';
  onSubTabChange?: (tab: 'portal_intake' | 'my_cases') => void;
  onUserChange?: (user: UserProfile | null) => void;
  onAuthScreenChange?: (isAuthScreen: boolean) => void;
}

export const WebPortal: React.FC<WebPortalProps> = ({
  onDialHotline,
  onAssessmentCompleted,
  activeSubTab = 'portal_intake',
  onSubTabChange,
  onUserChange,
  onAuthScreenChange,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [existingUsers, setExistingUsers] = useState<UserProfile[]>([]);
  const [userCases, setUserCases] = useState<HelplineCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration form
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    age: '',
    gender: 'Male',
    state: 'Uttar Pradesh',
    district: '',
    category: 'SC' as const,
    emergencyContact: '',
  });

  // Login form
  const [loginPhone, setLoginPhone] = useState('9876543210');

  // Baseline questions state
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questions, setQuestions] = useState<BaselineQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  // Chat / Grievance assessment state
  const [grievanceText, setGrievanceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    { sender: 'user' | 'assistant'; text: string; score?: number; category?: string; time: string }[]
  >([]);

  useEffect(() => {
    fetchUsers();
    fetchQuestions();
  }, []);

  // Notify parent when auth screen visibility changes
  useEffect(() => {
    const isAuthScreen = !currentUser && (authMode === 'login' || authMode === 'register');
    if (onAuthScreenChange) onAuthScreenChange(isAuthScreen);
  }, [currentUser, authMode, onAuthScreenChange]);

  useEffect(() => {
    if (currentUser?.phone) {
      fetchUserCases(currentUser.phone);
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setExistingUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/profile/questions');
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserCases = async (phone: string) => {
    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        const allCases: HelplineCase[] = await res.json();
        const filtered = allCases.filter(
          (c) => c.callerNumber === phone || c.userId === currentUser?.id
        );
        setUserCases(filtered);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      setError('Please provide your full name and 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setCurrentUser(data.user);
      if (onUserChange) onUserChange(data.user);
      setShowQuestionnaire(true);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginPhone) {
      setError('Please enter your registered mobile number.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setCurrentUser(data.user);
      if (onUserChange) onUserChange(data.user);
      setShowQuestionnaire(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (option: string) => {
    const qId = questions[currentQIndex]?.id;
    if (!qId) return;

    const nextAnswers = { ...questionAnswers, [qId]: option };
    setQuestionAnswers(nextAnswers);

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      submitBaselineQuestions(nextAnswers);
    }
  };

  const submitBaselineQuestions = async (answers: Record<string, string>) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/profile/save-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          responses: answers,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        if (onUserChange) onUserChange(data.user);
        setShowQuestionnaire(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await submitAssessment({ audioBase64: base64Audio, mimeType: 'audio/webm' });
        };
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setError('Microphone access was denied. You may also type your statement comfortably.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const submitAssessment = async ({
    text,
    audioBase64,
    mimeType,
  }: {
    text?: string;
    audioBase64?: string;
    mimeType?: string;
  }) => {
    if (!currentUser) return;
    setAssessing(true);
    setError(null);

    const userMsg = text || 'Voice statement submitted.';
    setChatHistory((prev) => [
      ...prev,
      { sender: 'user', text: userMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);

    try {
      const res = await fetch('/api/trauma/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: text,
          audioBase64,
          mimeType,
          callerNumber: currentUser.phone,
          channel: 'web_portal',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assessment failed');

      const asm = data.assessment;
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: asm.counselingResponse,
          score: asm.stressScore,
          category: asm.traumaCategory,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setGrievanceText('');
      if (currentUser?.phone) fetchUserCases(currentUser.phone);
      if (onAssessmentCompleted) onAssessmentCompleted(asm.stressScore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-7 px-3 sm:px-6 space-y-4 sm:space-y-6">
      {!currentUser ? (
        /* Sign-in / Registration Liquid Glass Card */
        <div className="liquid-glass rounded-3xl shadow-xl border border-white/90 overflow-hidden text-slate-800">
          <div className="p-6 sm:p-8 text-center border-b border-slate-200/50 bg-gradient-to-b from-white/60 to-transparent">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 mb-3 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              National Helpline (14566)
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
              Confidential grievance support &amp; assistance under the PoA framework.
            </p>
          </div>

          <div className="flex border-b border-slate-200/50 bg-slate-50/40 p-1">
            <button
              id="tab-login"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2.5 rounded-2xl text-center text-xs sm:text-sm font-medium transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px] ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-600" />
              <span>Registered Sign In</span>
            </button>
            <button
              id="tab-register"
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2.5 rounded-2xl text-center text-xs sm:text-sm font-medium transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px] ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>New Registration</span>
            </button>
          </div>

          <div className="p-5 sm:p-7">
            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs flex items-center space-x-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{error}</span>
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      id="login-phone-input"
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200/80 bg-white/70 focus:bg-white focus:border-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400 text-sm min-h-[44px] transition-all shadow-xs"
                    />
                  </div>
                </div>

                <button
                  id="btn-login"
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Verifying...' : 'Continue to Support Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {existingUsers.length > 0 && (
                  <div className="pt-4 border-t border-slate-200/50">
                    <p className="text-[11px] text-slate-500 mb-2 font-medium">Demo Registered Profiles:</p>
                    <div className="flex flex-col gap-2">
                      {existingUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setLoginPhone(u.phone)}
                          className="text-left text-xs p-3 rounded-2xl liquid-glass-subtle hover:bg-white border border-white/80 transition-all flex items-center justify-between cursor-pointer min-h-[44px]"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{u.fullName}</span>{' '}
                            <span className="text-slate-500">({u.category})</span>
                            <span className="text-slate-400 ml-1.5 text-[11px]">{u.district}, {u.state}</span>
                          </div>
                          <span className="text-indigo-600 font-mono text-xs">{u.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5 max-w-lg mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      id="reg-fullname"
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/80 bg-white/70 focus:bg-white focus:border-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400 text-sm min-h-[44px] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/80 bg-white/70 focus:bg-white focus:border-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400 text-sm min-h-[44px] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Category *
                    </label>
                    <select
                      id="reg-category"
                      value={formData.category}
                      onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/80 bg-white/70 focus:bg-white focus:border-indigo-500 focus:outline-none text-slate-900 text-sm min-h-[44px]"
                    >
                      <option value="SC">Scheduled Caste (SC)</option>
                      <option value="ST">Scheduled Tribe (ST)</option>
                      <option value="OBC">Other Backward Class (OBC)</option>
                      <option value="General">General</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Age
                    </label>
                    <input
                      id="reg-age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="e.g. 34"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/80 bg-white/70 focus:bg-white focus:border-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400 text-sm min-h-[44px] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      State *
                    </label>
                    <input
                      id="reg-state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/80 bg-white/70 focus:bg-white focus:border-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400 text-sm min-h-[44px] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      District *
                    </label>
                    <input
                      id="reg-district"
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="District"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/80 bg-white/70 focus:bg-white focus:border-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400 text-sm min-h-[44px] transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Trusted Emergency Contact (Optional)
                    </label>
                    <input
                      id="reg-emergency"
                      type="tel"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      placeholder="Emergency contact mobile"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/80 bg-white/70 focus:bg-white focus:border-indigo-500 focus:outline-none text-slate-900 placeholder:text-slate-400 text-sm min-h-[44px] transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-register-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Registering...' : 'Register Profile'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : showQuestionnaire ? (
        /* Baseline Questionnaire Screen - Calm & Clean */
        <div className="liquid-glass rounded-3xl shadow-xl border border-white/90 p-5 sm:p-7 text-slate-800">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200/50">
            <div>
              <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                Support Intake
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                Care &amp; Safety Needs
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-medium text-slate-600">
              {currentQIndex + 1} / {questions.length}
            </span>
          </div>

          {questions[currentQIndex] && (
            <div className="space-y-5">
              <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed">
                {questions[currentQIndex].prompt}
              </p>

              <div className="space-y-2">
                {questions[currentQIndex].options.map((option, idx) => (
                  <button
                    key={idx}
                    id={`opt-${currentQIndex}-${idx}`}
                    onClick={() => handleAnswerSelect(option)}
                    className="w-full text-left p-3.5 rounded-2xl border border-white/80 hover:border-indigo-300 liquid-glass-subtle hover:bg-white transition-all flex items-center justify-between group cursor-pointer min-h-[48px]"
                  >
                    <span className="text-xs sm:text-sm text-slate-800 font-medium">
                      {option}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>

              <div className="w-full bg-slate-200/60 rounded-full h-1.5 mt-4 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : activeSubTab === 'my_cases' ? (
        /* My Cases & Rights */
        <div className="space-y-4">
          {/* User Profile Bar */}
          <div className="liquid-glass rounded-3xl shadow-sm border border-white/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {currentUser.fullName[0]}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">{currentUser.fullName}</h3>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                    {currentUser.category || 'SC/ST'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center space-x-2.5 mt-0.5">
                  <span>{currentUser.phone}</span>
                  <span>&bull;</span>
                  <span>{currentUser.district}, {currentUser.state}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={() => onDialHotline(currentUser.phone)}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[40px]"
              >
                <Phone className="w-3 h-3 text-indigo-300" />
                <span>Call 14566</span>
              </button>

              <button
                onClick={() => setCurrentUser(null)}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Grievances List */}
          <div className="liquid-glass rounded-3xl shadow-sm border border-white/90 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/50">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <h4 className="font-semibold text-slate-900 text-sm">
                  Active Grievances ({userCases.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">Official Docket</span>
            </div>

            {userCases.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-slate-700">No grievance dockets recorded</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Submit a statement in the Intake tab to register assistance.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {userCases.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/80 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold text-indigo-600 text-xs">{c.caseNumber}</span>
                        <span className="text-xs font-medium text-slate-800">{c.category}</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          c.status === 'dispatched'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : c.status === 'escalated'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{c.summary}</p>

                    <div className="pt-1.5 border-t border-slate-200/40 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{c.location}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Statutory Protection Overview */}
          <div className="liquid-glass rounded-3xl shadow-sm border border-white/90 p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-200/50">
              <Scale className="w-4 h-4 text-indigo-600" />
              <h4 className="font-semibold text-slate-900 text-sm">
                Legal Entitlements &amp; Rights
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1">
                <span className="font-semibold text-indigo-900 block">Section 15A Protection</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Confidential safety, transit, and shelter protection for victims and witnesses.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-1">
                <span className="font-semibold text-emerald-900 block">Rule 12(4) Relief</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Direct financial and medical relief disbursed directly to the complainant.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 space-y-1">
                <span className="font-semibold text-slate-800 block">Legal Assistance</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Free legal assistance and fast-track special court proceedings.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Intake & Counseling Interface */
        <div className="space-y-4">
          {/* User Bar */}
          <div className="liquid-glass rounded-3xl shadow-sm border border-white/90 p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {currentUser.fullName[0]}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">{currentUser.fullName}</h3>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                    {currentUser.category || 'SC/ST'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center space-x-2.5 mt-0.5">
                  <span>{currentUser.phone}</span>
                  <span>&bull;</span>
                  <span>{currentUser.district}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                id="btn-switch-to-call"
                onClick={() => onDialHotline(currentUser.phone)}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer min-h-[40px]"
              >
                <Phone className="w-3 h-3 text-indigo-300" />
                <span>Call 14566</span>
              </button>

              <button
                onClick={() => setCurrentUser(null)}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Interactive Counseling & Intake Terminal */}
          <div className="liquid-glass rounded-3xl shadow-lg border border-white/90 overflow-hidden flex flex-col h-[440px] sm:h-[500px]">
            <div className="p-3.5 sm:p-4 border-b border-slate-200/50 bg-gradient-to-r from-white/80 via-white/50 to-indigo-50/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HeartHandshake className="w-4 h-4 text-indigo-600" />
                <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                  Confidential Intake &amp; Counseling
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 hidden xs:inline">
                24/7 Secure
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 bg-slate-50/20">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="font-medium text-slate-800 text-sm">How can we assist you?</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                    Share your situation or request for protection by voice or message. Our confidential team evaluates your needs and coordinates assistance.
                  </p>
                </div>
              ) : (
                chatHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-md rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-xs ${
                        item.sender === 'user'
                          ? 'bg-slate-900 text-white rounded-tr-none'
                          : 'liquid-glass text-slate-800 rounded-tl-none border border-white/90'
                      }`}
                    >
                      <p className="leading-relaxed">{item.text}</p>
                      {item.score !== undefined && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">
                            Support priority:{' '}
                            <span className={item.score > 70 ? 'text-indigo-600 font-semibold' : 'text-slate-700'}>
                              {item.score > 70 ? 'High' : 'Normal'}
                            </span>
                          </span>
                          <span className="italic text-slate-400">{item.category}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{item.time}</span>
                  </div>
                ))
              )}
              {assessing && (
                <div className="flex items-center space-x-2 text-xs text-indigo-600 p-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  <span>Processing statement and care assessment...</span>
                </div>
              )}
            </div>

            <div className="p-2.5 sm:p-3 border-t border-slate-200/50 bg-white/70">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="btn-portal-mic"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`p-2.5 rounded-full border transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    isRecording
                      ? 'bg-indigo-600 text-white border-indigo-500 animate-pulse'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Speak statement'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  id="input-grievance-text"
                  type="text"
                  value={grievanceText}
                  onChange={(e) => setGrievanceText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && grievanceText.trim() && !assessing) {
                      submitAssessment({ text: grievanceText });
                    }
                  }}
                  placeholder={
                    isRecording
                      ? 'Listening to microphone... tap to send'
                      : 'Type your question or statement...'
                  }
                  className="flex-1 px-3.5 py-2 rounded-full border border-slate-200/80 bg-white focus:outline-none focus:border-indigo-500 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 min-h-[44px]"
                />

                <button
                  type="button"
                  id="btn-portal-send"
                  disabled={!grievanceText.trim() || assessing}
                  onClick={() => submitAssessment({ text: grievanceText })}
                  className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition-all shadow-xs cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
