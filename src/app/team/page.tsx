"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Building,
  AlertCircle,
  Key,
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "INTERNAL_AUDITOR",
    department: "Internal Audit",
    designation: "Auditor",
    approvalLimit: "50000",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/organizations/members");
      const data = await res.json();
      setMembers(data.members || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch("/api/organizations/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          approvalLimit: Number(formData.approvalLimit),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite member");

      setFeedback(data.message);
      setInviteModal(false);
      setFormData({
        name: "",
        email: "",
        role: "INTERNAL_AUDITOR",
        department: "Internal Audit",
        designation: "Auditor",
        approvalLimit: "50000",
      });
      fetchMembers();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Team Members & Role-Based Access Controls
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization members, segregation of duties (SOD), and single-approval thresholds
          </p>
        </div>

        <button
          onClick={() => setInviteModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Active Organization Members</h2>
          <span className="text-xs text-slate-500">{members.length} members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Member Name & Email</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Role (RBAC)</th>
                <th className="py-3 px-6 text-right">Approval Ceiling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading team members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.membershipId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900">{m.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{m.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{m.department || "General"}</td>
                    <td className="py-3.5 px-4 text-slate-600">{m.designation || "Staff"}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                        <Key className="h-3 w-3" />
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-semibold text-slate-900">
                      {m.approvalLimit > 0 ? formatINR(m.approvalLimit) : "No Approval Power"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                Invite Team Member
              </h3>
              <button
                onClick={() => setInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Priya Nair"
                  className="w-full p-2 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="priya@company.com"
                  className="w-full p-2 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="INTERNAL_AUDITOR">Internal Auditor</option>
                    <option value="AP_OPERATOR">AP Operator</option>
                    <option value="FINANCE_MANAGER">Finance Manager</option>
                    <option value="PROCUREMENT_MANAGER">Procurement Manager</option>
                    <option value="WAREHOUSE_OPERATOR">Warehouse Operator</option>
                    <option value="READ_ONLY_EXEC">Read-Only Exec</option>
                    <option value="ADMIN">Organization Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Approval Ceiling (₹)</label>
                  <input
                    type="number"
                    value={formData.approvalLimit}
                    onChange={(e) => setFormData({ ...formData, approvalLimit: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInviteModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  {submitting ? "Inviting..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
