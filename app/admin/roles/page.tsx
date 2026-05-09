"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminUsers, updateUserRole, type AdminUser } from "@/lib/api";

const ROLES = ["admin", "manager", "gm", "player", "viewer"] as const;

export default function RolesPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        setUsers(await getAdminUsers(token));
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  const handleRoleChange = async (userId: string, role: string) => {
    const token = await getToken();
    if (!token) return;
    setSaving(userId);
    try {
      await updateUserRole(token, userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--fg)", padding: "32px", fontFamily: "monospace" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "13px", letterSpacing: "0.12em", color: "var(--fg-muted)" }}>ROLE MANAGEMENT</span>
          <div style={{ display: "flex", gap: "20px" }}>
            <Link href="/admin" style={{ fontSize: "12px", color: "var(--fg-muted)", textDecoration: "none" }}>← admin</Link>
            <Link href="/" style={{ fontSize: "12px", color: "var(--fg-muted)", textDecoration: "none" }}>← back</Link>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--fg-muted)", fontWeight: "normal", fontSize: "11px" }}>user</th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--fg-muted)", fontWeight: "normal", fontSize: "11px" }}>role</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} style={{ padding: "16px 12px", color: "var(--fg-muted)" }}>loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <div>{u.displayName}</div>
                  <div style={{ fontSize: "11px", color: "var(--fg-muted)" }}>{u.email}</div>
                </td>
                <td style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <select
                    value={u.role ?? ""}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    disabled={saving === u.id}
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--fg)",
                      padding: "4px 8px",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      borderRadius: "4px",
                      cursor: "pointer",
                      opacity: saving === u.id ? 0.5 : 1,
                    }}
                  >
                    <option value="">— unassigned —</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {saving === u.id && (
                    <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>saving...</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}
