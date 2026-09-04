import React, { useState, useEffect } from 'react';
import { HelplineCase } from '../types';
import {
  FileText,
  Search,
  Shield,
  MapPin,
  Phone,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
  UserCheck,
  Building2,
} from 'lucide-react';

export const CaseRegistry: React.FC = () => {
  const [cases, setCases] = useState<HelplineCase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<HelplineCase | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        const data = await res.json();
        setCases(data);
        if (data.length > 0 && !selectedCase) {
          setSelectedCase(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.victimName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.callerNumber.includes(searchTerm);

    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header & Search Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            NHAA 14566 Case Grievance Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of complaints, trauma assessments, and emergency dispatches under PoA Act 1989.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              id="case-search-input"
              type="text"
              placeholder="Search case #, complainant, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs border rounded-2xl border-slate-200 bg-white/80 focus:bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs transition-all"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs py-2 px-3.5 border rounded-2xl border-slate-200 bg-white/80 text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="escalated">Escalated</option>
            <option value="dispatched">Dispatched</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Case List */}
        <div className="lg:col-span-1 bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] border border-white/90 overflow-hidden text-slate-800">
          <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>Recorded Dockets ({filteredCases.length})</span>
            <span className="text-[11px] text-slate-400 font-normal">Audit Log</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`p-4 cursor-pointer transition-all ${
                  selectedCase?.id === c.id
                    ? 'bg-blue-50/70 border-l-4 border-blue-600'
                    : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-600">{c.caseNumber}</span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                      c.riskLevel === 'CRITICAL'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : c.riskLevel === 'HIGH'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {c.riskLevel}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900">{c.victimName}</span>
                  <span className="text-[11px] font-mono text-slate-500">{c.callerNumber}</span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-1 mt-1">{c.summary}</p>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{c.location}</span>
                  </span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {filteredCases.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No matching case records found.
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed Case Inspection View */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCase ? (
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] border border-white/90 p-6 space-y-6 text-slate-800">
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-blue-600">
                      {selectedCase.caseNumber}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                        selectedCase.status === 'dispatched'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedCase.status === 'escalated'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {selectedCase.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedCase.victimName}</h3>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs text-slate-500">Trauma Risk Index</div>
                  <div className="text-2xl font-black text-slate-900">
                    {selectedCase.currentRiskScore}%
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">
                    Complainant Contact
                  </span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedCase.callerNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">
                    Incident Location
                  </span>
                  <span className="font-semibold text-slate-800">{selectedCase.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">
                    Intake Channel
                  </span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {selectedCase.channel.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">
                    Assigned Responder
                  </span>
                  <span className="font-semibold text-slate-800">{selectedCase.assignedOperator}</span>
                </div>
              </div>

              {/* Incident Summary */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Incident Synopsis &amp; Legal Categorization
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed p-4 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                  {selectedCase.summary}
                </p>
              </div>

              {/* Critical Threat Indicators */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Statutory Threat Flags under PoA Act 1989
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.criticalFlags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Emergency Escalation Status */}
              {selectedCase.escalationDetails && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1 text-emerald-900">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Emergency Quick Response Team (QRT) Dispatched</span>
                  </div>
                  <p className="text-slate-800">
                    Unit: {selectedCase.escalationDetails.unitType} &bull; Hotline:{' '}
                    {selectedCase.escalationDetails.contactNumber}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Dispatched on {new Date(selectedCase.escalationDetails.dispatchedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Verbatim Statements & Dialogue Records */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Verbatim Statement &amp; Transcript Records
                </h4>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedCase.transcripts.map((t, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl text-xs border ${
                        t.sender === 'caller'
                          ? 'bg-amber-50/70 border-amber-200/70 text-slate-900'
                          : 'bg-white border-slate-200/80 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between font-semibold text-slate-500 text-[10px] mb-1">
                        <span>
                          {t.sender === 'caller' ? `Complainant (${selectedCase.victimName})` : 'Intake Counselor / Officer'}
                        </span>
                        <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="leading-relaxed">{t.text}</p>
                      {t.stressScore !== undefined && (
                        <div className="mt-1.5 pt-1 text-[10px] text-amber-700 font-semibold">
                          Stress Score: {t.stressScore}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04)] border border-white/90 p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Select a case docket</p>
              <p className="text-xs text-slate-500 mt-1">
                Choose any grievance on the left to inspect transcripts, stress indices, and dispatch status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
