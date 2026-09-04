import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Radio,
  CheckCircle,
  MapPin,
  Phone,
  Send,
  User,
  Activity,
  FileCheck2,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { LiveRiskUpdate, HelplineCase } from '../types';

interface ResponderDashboardProps {
  liveEvents: LiveRiskUpdate[];
  onSelectCase?: (caseId: string) => void;
}

export const ResponderDashboard: React.FC<ResponderDashboardProps> = ({
  liveEvents,
  onSelectCase,
}) => {
  const [activeCases, setActiveCases] = useState<HelplineCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<HelplineCase | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'overview' | 'details'>('overview');
  const [sopChecklist, setSopChecklist] = useState<Record<string, boolean>>({
    sop1: true,
    sop2: true,
    sop3: false,
    sop4: true,
    sop5: false,
  });
  const [dispatchForm, setDispatchForm] = useState({
    unitType: 'Special Protection Assistance Van (District Cell)',
    contactNumber: '112-QRT-POLICE',
    notes: 'Support unit assigned for complainant assistance.',
  });

  const latestEvent: LiveRiskUpdate | undefined = liveEvents[0];

  useEffect(() => {
    fetchCases();
    const interval = setInterval(fetchCases, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        const data: HelplineCase[] = await res.json();
        setActiveCases(data);
        if (!selectedCase && data.length > 0) {
          setSelectedCase(data[0]);
        } else if (selectedCase) {
          const fresh = data.find((c) => c.id === selectedCase.id);
          if (fresh) setSelectedCase(fresh);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDispatch = async () => {
    if (!selectedCase) return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/cases/${selectedCase.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedCase(data.case);
        setSopChecklist((prev) => ({ ...prev, sop3: true }));
        setDispatchSuccess(`Assistance unit assigned to ${selectedCase.location}`);
        setTimeout(() => setDispatchSuccess(null), 5000);
        fetchCases();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDispatching(false);
    }
  };

  const currentRiskScore = latestEvent ? latestEvent.stressScore : (selectedCase?.currentRiskScore ?? 65);
  const isHighRisk = currentRiskScore >= 70;

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-6">
      {/* Officer Security Header Banner - Minimalist */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl liquid-glass border border-white/80 text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-900">
            Responder Console &bull; NHAA-OPS-41
          </span>
          <span className="text-slate-400 hidden md:inline">|</span>
          <span className="hidden md:inline text-slate-500">Protection Assistance Cell</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-slate-400">Standard Protocol:</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
            PoA Section 15A
          </span>
        </div>
      </div>

      {/* Reassuring Priority Notice Banner (Calm, non-scary) */}
      {isHighRisk && (
        <div className="liquid-glass rounded-3xl p-4 sm:p-5 border border-indigo-200/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm sm:text-base text-slate-900">
                  Priority Assistance Required
                </span>
                <span className="px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium border border-indigo-100">
                  Care Level: Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Stress index: <span className="font-medium text-slate-800">{currentRiskScore}%</span> &bull; Support requested for{' '}
                <span className="font-semibold text-slate-800">
                  {latestEvent?.victimName || selectedCase?.victimName || 'Complainant'}
                </span>
              </p>
            </div>
          </div>

          <button
            id="btn-emergency-escalate"
            onClick={handleDispatch}
            disabled={dispatching || selectedCase?.status === 'dispatched'}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-all shrink-0 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-300" />
            <span>
              {selectedCase?.status === 'dispatched'
                ? 'Unit Dispatched'
                : 'Dispatch Assistance Unit'}
            </span>
          </button>
        </div>
      )}

      {dispatchSuccess && (
        <div className="p-3.5 rounded-2xl liquid-glass border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center space-x-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{dispatchSuccess}</span>
        </div>
      )}

      {/* Mobile view switcher for smartphone users */}
      <div className="sm:hidden flex liquid-glass-subtle p-1 rounded-2xl border border-white/80">
        <button
          onClick={() => setMobileView('overview')}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
            mobileView === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Incident Telemetry
        </button>
        <button
          onClick={() => setMobileView('details')}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
            mobileView === 'details' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Case &amp; Queue ({activeCases.length})
        </button>
      </div>

      {/* Main Grid: Responsive 2-column or stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Telemetry & Transcripts */}
        <div className={`lg:col-span-2 space-y-4 sm:space-y-6 ${mobileView === 'details' ? 'hidden sm:block' : 'block'}`}>
          {/* Calm Telemetry Gauge */}
          <div className="liquid-glass rounded-3xl shadow-sm border border-white/90 p-4 sm:p-6 text-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Assessment Indicators
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">Incident Triage Meter</h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  currentRiskScore >= 75
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : currentRiskScore >= 45
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {currentRiskScore >= 75
                  ? 'Priority Follow-up'
                  : currentRiskScore >= 45
                  ? 'Active Review'
                  : 'Standard Intake'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 py-2">
              <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="text-slate-100 stroke-current"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className={`transition-all duration-700 stroke-current ${
                      currentRiskScore >= 75
                        ? 'text-indigo-600'
                        : currentRiskScore >= 45
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                    }`}
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * currentRiskScore) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-slate-900">{currentRiskScore}%</span>
                  <span className="text-[10px] text-slate-400 font-medium">Care Index</span>
                </div>
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Emotional Distress Metric</span>
                    <span className="font-semibold text-slate-800">{Math.min(100, currentRiskScore + 5)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, currentRiskScore + 5)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Urgency &amp; Safety Needs</span>
                    <span className="font-semibold text-slate-800">{Math.min(100, Math.max(0, currentRiskScore - 8))}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, currentRiskScore - 8)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>PoA Statutory Eligibility</span>
                    <span className="font-semibold text-slate-800">{Math.min(100, currentRiskScore + 2)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, currentRiskScore + 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Tags */}
            <div className="mt-3 pt-3 border-t border-slate-200/50 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1">Active Tags:</span>
              {(latestEvent?.criticalFlags || selectedCase?.criticalFlags || ['POA_ACT_REVIEW']).map(
                (flag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                  >
                    {flag}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Transcripts Stream */}
          <div className="liquid-glass rounded-3xl shadow-sm border border-white/90 overflow-hidden text-slate-800">
            <div className="p-3.5 sm:p-4 border-b border-slate-200/50 bg-white/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-indigo-600" />
                <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                  Statement Stream &amp; Counselor Notes
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedCase?.caseNumber || 'Active'}
              </span>
            </div>

            <div className="p-3.5 max-h-64 overflow-y-auto space-y-2.5 text-xs bg-slate-50/20">
              {selectedCase?.transcripts && selectedCase.transcripts.length > 0 ? (
                selectedCase.transcripts.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all ${
                      t.sender === 'caller'
                        ? 'liquid-glass-subtle border-white/80 text-slate-900'
                        : 'bg-white border-slate-200/70 text-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-medium text-slate-700">
                        {t.sender === 'caller' ? `Complainant (${selectedCase.victimName})` : 'Helpline Counselor'}
                      </span>
                      <span>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="leading-relaxed">{t.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  Live transcripts will appear as statements are submitted.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Active Queue & Checklist */}
        <div className={`space-y-4 sm:space-y-6 ${mobileView === 'overview' ? 'hidden sm:block' : 'block'}`}>
          {/* Active Cases Queue */}
          <div className="liquid-glass rounded-3xl shadow-sm border border-white/90 p-4 sm:p-5 text-slate-800">
            <h4 className="font-semibold text-slate-900 text-xs sm:text-sm mb-2.5 flex items-center justify-between">
              <span>Active Queue</span>
              <span className="text-[11px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-medium">
                {activeCases.length} Cases
              </span>
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {activeCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCase(c);
                    setMobileView('overview');
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer min-h-[44px] ${
                    selectedCase?.id === c.id
                      ? 'border-indigo-400 bg-white text-slate-900 shadow-xs'
                      : 'border-white/80 liquid-glass-subtle text-slate-700 hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-medium text-xs text-slate-900">{c.victimName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({c.caseNumber})</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                      {c.location} &bull; {c.category}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Action Checklist */}
          <div className="liquid-glass rounded-3xl shadow-sm border border-white/90 p-4 sm:p-5 text-slate-800">
            <h4 className="font-semibold text-slate-900 text-xs sm:text-sm mb-2.5 flex items-center space-x-1.5">
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              <span>Care Action Checklist</span>
            </h4>
            <div className="space-y-2">
              {[
                { id: 'sop1', label: 'Verify safe coordinates & communication channel' },
                { id: 'sop2', label: 'Review case statement under PoA Section 15A' },
                { id: 'sop3', label: 'Assign Special Protection Assistance Van' },
                { id: 'sop4', label: 'Provide trauma counseling & psychological reassurance' },
                { id: 'sop5', label: 'Prepare relief documentation under Rule 12(4)' },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-center space-x-2.5 p-2.5 rounded-2xl liquid-glass-subtle border border-white/80 text-xs font-normal text-slate-700 hover:bg-white cursor-pointer transition-all min-h-[40px]"
                >
                  <input
                    type="checkbox"
                    checked={sopChecklist[item.id] || (item.id === 'sop3' && selectedCase?.status === 'dispatched')}
                    onChange={(e) =>
                      setSopChecklist((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                    className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 focus:ring-slate-500 cursor-pointer"
                  />
                  <span
                    className={
                      sopChecklist[item.id] || (item.id === 'sop3' && selectedCase?.status === 'dispatched')
                        ? 'text-slate-400 line-through'
                        : 'text-slate-800'
                    }
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
