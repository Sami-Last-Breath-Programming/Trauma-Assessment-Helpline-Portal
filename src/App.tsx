import React, { useState, useEffect, useRef } from 'react';
import { Navbar, AppRole, CitizenTab, AuthorityTab } from './components/Navbar';
import { WebPortal } from './components/WebPortal';
import { PhoneCallSimulator } from './components/PhoneCallSimulator';
import { ResponderDashboard } from './components/ResponderDashboard';
import { CaseRegistry } from './components/CaseRegistry';
import { LiveRiskUpdate } from './types';
import {
  ShieldCheck,
  PhoneCall,
  Radio,
  FileText,
  X,
  Phone,
  FolderLock,
  HeartHandshake,
  Bell
} from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<AppRole>('citizen');
  const [citizenTab, setCitizenTab] = useState<CitizenTab>('portal_intake');
  const [authorityTab, setAuthorityTab] = useState<AuthorityTab>('triage_dashboard');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveRiskUpdate[]>([]);
  const [activeAlertCount, setActiveAlertCount] = useState(1);
  const [activeDialNumber, setActiveDialNumber] = useState('9876543210');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        ws.send(JSON.stringify({ type: 'register_role', role: 'responder' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'live_risk_update') {
            setLiveEvents((prev) => [data, ...prev.slice(0, 20)]);
            if (data.stressScore >= 70) {
              setActiveAlertCount((prev) => prev + 1);
              showToast(`Priority support requested for ${data.victimName || 'complainant'}`);
            }
          } else if (data.type === 'emergency_dispatched') {
            showToast(`Support team assigned to case ${data.caseNumber}`);
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleDialHotline = (phone: string) => {
    setActiveDialNumber(phone);
    setIsSimulatorOpen(true);
  };

  const handleAssessmentCompleted = (score: number) => {
    if (score >= 70) {
      setActiveAlertCount((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-600 selection:text-white antialiased">
      {/* Calm Liquid Glass Ambient Aurora Glows */}
      <div className="fixed -top-[12%] -left-[10%] w-[55%] h-[55%] bg-sky-200/35 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[180px] pointer-events-none z-0" />
      <div className="fixed -bottom-[15%] left-[10%] w-[50%] h-[50%] bg-teal-100/30 rounded-full blur-[170px] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Unbloated Liquid Glass Navbar */}
        <Navbar
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          citizenTab={citizenTab}
          onCitizenTabChange={setCitizenTab}
          authorityTab={authorityTab}
          onAuthorityTabChange={setAuthorityTab}
          showCitizenTabs={currentRole === 'citizen'}
          portalAuthHidden={false}
          wsConnected={wsConnected}
          activeAlertCount={activeAlertCount}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          isSimulatorOpen={isSimulatorOpen}
        />

        {/* Global Toast Notification (Calm Liquid Glass Pill) */}
        {toastMessage && (
          <div className="fixed top-18 right-4 left-4 sm:left-auto sm:max-w-sm z-50 liquid-glass text-slate-900 px-4 py-3 rounded-2xl shadow-[0_12px_36px_rgba(15,23,42,0.08)] border border-white/90 flex items-center space-x-3 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Bell className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xs font-medium text-slate-800 flex-1">{toastMessage}</div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area: Responsive padding for phone bottom nav */}
        <main className="flex-1 pb-24 sm:pb-10">
          {currentRole === 'citizen' ? (
            <WebPortal
              onDialHotline={handleDialHotline}
              onAssessmentCompleted={handleAssessmentCompleted}
              activeSubTab={citizenTab}
              onSubTabChange={setCitizenTab}
            />
          ) : (
            authorityTab === 'triage_dashboard' ? (
              <ResponderDashboard
                liveEvents={liveEvents}
                onSelectCase={() => setAuthorityTab('case_registry')}
              />
            ) : (
              <CaseRegistry />
            )
          )}
        </main>

        {/* Smartphone & Android Liquid Glass Bottom Navigation Bar */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-1 pointer-events-auto">
          <div className="liquid-glass rounded-3xl p-1.5 flex items-center justify-around shadow-[0_10px_35px_rgba(15,23,42,0.08)] border border-white/95">
            {currentRole === 'citizen' ? (
              <>
                <button
                  id="mobile-tab-intake"
                  onClick={() => setCitizenTab('portal_intake')}
                  className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    citizenTab === 'portal_intake'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4 mb-0.5" />
                  <span className="text-[11px] font-medium">Intake</span>
                </button>

                <button
                  id="mobile-call-hotline"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="mx-1 min-h-[44px] px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center space-x-1.5 shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
                  title="Call 14566 Helpline"
                >
                  <Phone className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold">14566</span>
                </button>

                <button
                  id="mobile-tab-cases"
                  onClick={() => setCitizenTab('my_cases')}
                  className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    citizenTab === 'my_cases'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 mb-0.5" />
                  <span className="text-[11px] font-medium">My Cases</span>
                </button>
              </>
            ) : (
              <>
                <button
                  id="mobile-tab-triage"
                  onClick={() => setAuthorityTab('triage_dashboard')}
                  className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    authorityTab === 'triage_dashboard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Radio className="w-4 h-4 mb-0.5" />
                  <span className="text-[11px] font-medium">Live Triage</span>
                </button>

                <button
                  id="mobile-call-authority"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="mx-1 min-h-[44px] px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center space-x-1.5 shadow-md shadow-slate-900/20 active:scale-95 transition-all cursor-pointer"
                  title="Helpline Call Simulator"
                >
                  <PhoneCall className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-semibold">Simulator</span>
                </button>

                <button
                  id="mobile-tab-registry"
                  onClick={() => setAuthorityTab('case_registry')}
                  className={`flex-1 min-h-[44px] py-1.5 px-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    authorityTab === 'case_registry'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderLock className="w-4 h-4 mb-0.5" />
                  <span className="text-[11px] font-medium">Registry</span>
                </button>
              </>
            )}
          </div>
        </nav>

        {/* 14566 Voice Simulator Modal / Mobile Sheet */}
        {isSimulatorOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
            <div className="w-full sm:max-w-5xl my-auto">
              <PhoneCallSimulator
                initialCallerNumber={activeDialNumber}
                wsConnected={wsConnected}
                onClose={() => setIsSimulatorOpen(false)}
                onCallEvent={(asm) => {
                  if (asm.stressScore >= 70) {
                    setActiveAlertCount((prev) => prev + 1);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Floating Desktop Quick Action Pill */}
        {!isSimulatorOpen && (
          <div className="hidden sm:block fixed bottom-6 right-6 z-40">
            <button
              id="btn-floating-simulator"
              onClick={() => setIsSimulatorOpen(true)}
              className="px-4 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-medium shadow-md backdrop-blur-xl border border-white/20 flex items-center space-x-2 transition-all hover:scale-102 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
              <span>14566 Simulator</span>
            </button>
          </div>
        )}

        {/* Subtle Footer */}
        <footer className="hidden sm:block liquid-glass-subtle text-slate-500 border-t border-slate-200/50 text-xs py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-800">
                National Helpline Against Atrocities (14566)
              </span>
              <span className="text-slate-400">&bull; Safe &amp; Confidential Support</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Protection framework under SC/ST (PoA) Act 1989
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
