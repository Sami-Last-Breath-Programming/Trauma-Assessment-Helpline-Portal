import React, { useState } from 'react';
import {
  Shield,
  PhoneCall,
  Radio,
  FileText,
  ShieldAlert,
  HelpCircle,
  X,
  Scale,
  Sparkles,
  Phone,
  CheckCircle2,
  FolderLock
} from 'lucide-react';

export type AppRole = 'citizen' | 'authority';
export type CitizenTab = 'portal_intake' | 'my_cases';
export type AuthorityTab = 'triage_dashboard' | 'case_registry';

interface NavbarProps {
  currentRole: AppRole;
  onRoleChange: (role: AppRole) => void;
  citizenTab: CitizenTab;
  onCitizenTabChange: (tab: CitizenTab) => void;
  authorityTab: AuthorityTab;
  onAuthorityTabChange: (tab: AuthorityTab) => void;
  wsConnected: boolean;
  activeAlertCount: number;
  onOpenSimulator: () => void;
  isSimulatorOpen: boolean;
  showCitizenTabs: boolean;
  portalAuthHidden: boolean,
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  citizenTab,
  onCitizenTabChange,
  authorityTab,
  onAuthorityTabChange,
  wsConnected,
  activeAlertCount,
  onOpenSimulator,
  isSimulatorOpen,
  showCitizenTabs = false,
  portalAuthHidden = false,
}) => {
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  return (
    <>
      {/* Sleek, Unbloated Liquid Glass Top Bar */}
      <header className="sticky top-0 z-40 liquid-glass border-b border-white/80 transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Brand Minimalist Identity */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center text-white shadow-sm border border-white/40">
                <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-indigo-200" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold tracking-tight text-sm sm:text-base text-slate-900">
                    NHAA 14566
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60 hidden xs:inline-block">
                    24/7 Helpline
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 hidden md:block">
                  National Helpline Against Atrocities &bull; Support Portal
                </span>
              </div>
            </div>

            {/* Central Role Selector - Frosted Capsule */}
            <div className="flex items-center">
              <div className="liquid-glass-subtle p-0.5 sm:p-1 rounded-full border border-white/80 flex items-center space-x-0.5 shadow-xs">
                <button
                  id="role-btn-citizen"
                  onClick={() => onRoleChange('citizen')}
                  className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 cursor-pointer ${
                    currentRole === 'citizen'
                      ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600" />
                  <span className="text-xs">Citizen</span>
                </button>

                <button
                  id="role-btn-authority"
                  onClick={() => onRoleChange('authority')}
                  className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center space-x-1.5 relative cursor-pointer ${
                    currentRole === 'authority'
                      ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-700" />
                  <span className="text-xs">Responder</span>
                  {activeAlertCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping absolute -top-0.5 -right-0.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Right Action Tools - Minimal and Calm */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {/* Telemetry Micro Status */}
              <div
                className={`hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  wsConnected
                    ? 'bg-emerald-50/70 text-emerald-700 border-emerald-200/60'
                    : 'bg-amber-50/70 text-amber-700 border-amber-200/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span>{wsConnected ? 'Live' : 'Connecting'}</span>
              </div>

              {/* Call 14566 Simulator Pill */}
              <button
                id="btn-open-simulator"
                onClick={onOpenSimulator}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 border cursor-pointer ${
                  isSimulatorOpen
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200/70 shadow-xs'
                }`}
                title="Open 14566 Helpline Simulator"
              >
                <PhoneCall className={`w-3.5 h-3.5 ${isSimulatorOpen ? 'text-amber-300' : 'text-indigo-600'}`} />
                <span className="hidden sm:inline">14566 Call</span>
              </button>

              {/* Info / Protection drawer trigger */}
              <button
                onClick={() => setShowInfoSheet(true)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer"
                title="Helpline & Legal Rights Info"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop-only secondary tab strip (Clean, unbloated, hidden on mobile) */}
          <div className="hidden sm:flex items-center justify-between py-2 border-t border-slate-200/40 text-xs">
            {currentRole === 'citizen' ? (
              <div className="flex items-center space-x-1.5">
                <button
                  id="tab-citizen-intake"
                  onClick={() => onCitizenTabChange('portal_intake')}
                  className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                    citizenTab === 'portal_intake'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  Intake &amp; Counselor
                </button>
                <button
                  id="tab-citizen-cases"
                  onClick={() => onCitizenTabChange('my_cases')}
                  className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                    citizenTab === 'my_cases'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  My Cases &amp; Rights
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button
                  id="tab-authority-triage"
                  onClick={() => onAuthorityTabChange('triage_dashboard')}
                  className={`px-3 py-1 rounded-full font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                    authorityTab === 'triage_dashboard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  <span>Live Incident Triage</span>
                  {activeAlertCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                      {activeAlertCount}
                    </span>
                  )}
                </button>
                <button
                  id="tab-authority-registry"
                  onClick={() => onAuthorityTabChange('case_registry')}
                  className={`px-3 py-1 rounded-full font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                    authorityTab === 'case_registry'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <FolderLock className="w-3 h-3" />
                  <span>Case Registry</span>
                </button>
              </div>
            )}

            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Confidential support under PoA Framework</span>
            </div>
          </div>
        </div>
      </header>

      {/* Info & Legal Rights Modal Drawer (Hides bulky info from the top bar) */}
      {showInfoSheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg liquid-glass rounded-t-3xl sm:rounded-3xl shadow-xl p-5 sm:p-6 border border-white/90 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">About NHAA 14566</h3>
              </div>
              <button
                onClick={() => setShowInfoSheet(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600 leading-relaxed">
              <p>
                The <strong>National Helpline Against Atrocities (14566)</strong> is a toll-free 24/7 service by the Ministry of Social Justice and Empowerment, Government of India, dedicated to ensuring protection under the Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989.
              </p>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                <span className="font-semibold text-indigo-900 block">Section 15A: Protection &amp; Transit</span>
                <p className="text-slate-600">
                  Guarantees safety protection, safe transit facilities, and confidential support against harassment, threats, or intimidation.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-1.5">
                <span className="font-semibold text-slate-800 block">Rule 12(4): Immediate Relief</span>
                <p className="text-slate-600">
                  Provision for prompt economic and medical relief disbursed directly to eligible complainants.
                </p>
              </div>

              <button
                onClick={() => setShowInfoSheet(false)}
                className="w-full mt-2 py-2.5 rounded-full bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
