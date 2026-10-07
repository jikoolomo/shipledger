"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { IncidentRecord } from "@/app/api/v1/incidents/route";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [type, setType] = useState<IncidentRecord["type"]>("ACTIVELY_EXPLOITED_VULNERABILITY");
  const [awarenessTime, setAwarenessTime] = useState("");
  const [impactSummary, setImpactSummary] = useState("");
  const [mitigationStatus, setMitigationStatus] = useState("");
  const [reporter, setReporter] = useState("Security Lead (lead@oruvena.com)");

  useEffect(() => {
    fetchIncidents();
    // Default awareness time to current time formatted for datetime-local
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setAwarenessTime(now.toISOString().slice(0, 16));
  }, []);

  async function fetchIncidents() {
    try {
      const res = await fetch("/api/v1/incidents");
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error("Failed to load incidents", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !awarenessTime) return;

    try {
      const res = await fetch("/api/v1/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          confirmed_awareness_time: new Date(awarenessTime).toISOString(),
          impact_summary: impactSummary,
          mitigation_status: mitigationStatus,
          confirmed_by: reporter,
          release_id: "rel-production-v0.8.3",
          release_tag: "v0.8.3",
          repository: "oruvena/tobi"
        })
      });

      if (res.ok) {
        setShowModal(false);
        setTitle("");
        setImpactSummary("");
        setMitigationStatus("");
        fetchIncidents();
      }
    } catch (err) {
      console.error("Failed to create incident", err);
    }
  }

  function copyDraft(inc: IncidentRecord) {
    const draftText = `[CRA Article 14 ENISA SRP Draft]
Incident: ${inc.id}
Product: ${inc.repository} (${inc.release_tag})
Type: ${inc.type}
Confirmed Awareness: ${inc.confirmed_awareness_time}
24h Early Warning Deadline: ${inc.deadlines.early_warning_24h}
72h Full Notification Deadline: ${inc.deadlines.full_notification_72h}
Impact: ${inc.impact_summary}
Mitigation: ${inc.mitigation_status}`;

    navigator.clipboard.writeText(draftText);
    setCopiedId(inc.id);
    setTimeout(() => setCopiedId(null), 3000);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                CRA Article 14 Incident Workspace
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-800">
                EU CYBER RESILIENCE ACT
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Mandatory notification management for actively exploited vulnerabilities and severe security incidents under Regulation (EU) 2024/2847.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-amber-950/30 transition-colors flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span>
              Open Incident
            </button>
          </div>
        </div>

        {/* Legal Awareness Principle Card */}
        <div className="bg-card border border-amber-900/40 rounded-xl p-5 bg-gradient-to-r from-amber-950/20 to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-amber-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Awareness Time Rule (Section 44)
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automated scanner detection timestamps do <span className="text-white font-medium">NOT</span> automatically constitute legal awareness.
              Deadlines (24h early warning / 72h notification) start strictly upon <span className="text-amber-200 font-medium">responsible human confirmation</span>.
            </p>
          </div>
          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-background/80 border border-border text-muted-foreground shrink-0">
            ENISA SRP Target: Ready
          </div>
        </div>

        {/* Active Incidents List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Active Incident Dossiers</h2>
            <span className="text-xs text-muted-foreground">
              {incidents.length} Registered Case{incidents.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading CRA dossiers...</div>
          ) : incidents.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-950/40 text-emerald-400 mx-auto flex items-center justify-center text-xl font-bold">
                ✓
              </div>
              <h3 className="text-sm font-semibold text-white">No Open CRA Incidents</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No active severe incidents or actively exploited vulnerabilities are currently open.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-border/80 transition-all space-y-6"
                >
                  {/* Top info */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted">
                          {inc.id}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800">
                          {inc.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-mono text-blue-400">
                          {inc.repository} @ {inc.release_tag}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white">{inc.title}</h3>
                      <p className="text-xs text-muted-foreground">{inc.impact_summary}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copyDraft(inc)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors flex items-center gap-1.5 border border-border"
                      >
                        {copiedId === inc.id ? "✓ Copied!" : "📋 Copy ENISA Draft"}
                      </button>
                      <a
                        href={`/api/v1/incidents/${inc.id}/dossier?format=markdown`}
                        download
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5"
                      >
                        ⬇ Export Dossier
                      </a>
                    </div>
                  </div>

                  {/* CRA Article 14 Countdown Timers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background/50 border border-border/60 p-4 rounded-lg">
                    {/* 24h Early Warning Timer */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          24h Early Warning
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {inc.deadlines.early_warning_remaining_hours > 0
                            ? `${inc.deadlines.early_warning_remaining_hours}h remaining`
                            : "OVERDUE"}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, (inc.deadlines.early_warning_remaining_hours / 24) * 100)
                            )}%`
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground flex justify-between font-mono">
                        <span>Awareness: {new Date(inc.confirmed_awareness_time).toLocaleTimeString()}</span>
                        <span>Due: {new Date(inc.deadlines.early_warning_24h).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* 72h Full Notification Timer */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          72h Full Notification
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {inc.deadlines.full_notification_remaining_hours > 0
                            ? `${inc.deadlines.full_notification_remaining_hours}h remaining`
                            : "OVERDUE"}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, (inc.deadlines.full_notification_remaining_hours / 72) * 100)
                            )}%`
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground flex justify-between font-mono">
                        <span>Awareness: {new Date(inc.confirmed_awareness_time).toLocaleDateString()}</span>
                        <span>Due: {new Date(inc.deadlines.full_notification_72h).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mitigation & Responsible Confirmer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border/40 pt-4">
                    <div>
                      <span className="text-white font-medium">Mitigation Status:</span> {inc.mitigation_status}
                    </div>
                    <div className="font-mono text-[11px]">
                      Confirmed by: <span className="text-foreground">{inc.confirmed_by}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Open Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-semibold text-white">Open CRA Article 14 Incident</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Incident Title / Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CVE-2026-3391 remote parser buffer overflow"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Incident Classification</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as IncidentRecord["type"])}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ACTIVELY_EXPLOITED_VULNERABILITY">
                    ACTIVELY EXPLOITED VULNERABILITY (24h Early Warning Required)
                  </option>
                  <option value="SEVERE_SECURITY_INCIDENT">
                    SEVERE SECURITY INCIDENT
                  </option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="space-y-1.5 bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg">
                <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  Confirmed Awareness Time (Section 44)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  This timestamp legally triggers the 24h & 72h Article 14 reporting clocks. Confirm only after responsible review.
                </p>
                <input
                  type="datetime-local"
                  required
                  value={awarenessTime}
                  onChange={(e) => setAwarenessTime(e.target.value)}
                  className="w-full mt-2 px-3 py-2 text-xs bg-background border border-border rounded-lg text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Impact Summary</label>
                <textarea
                  rows={2}
                  placeholder="Summarize affected systems, reachability, and severity..."
                  value={impactSummary}
                  onChange={(e) => setImpactSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Mitigation Status</label>
                <input
                  type="text"
                  placeholder="e.g. Patch in staging, workaround published"
                  value={mitigationStatus}
                  onChange={(e) => setMitigationStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Responsible Reviewer / Reporter</label>
                <input
                  type="text"
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-muted-foreground hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors"
                >
                  Start CRA Article 14 Timers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
