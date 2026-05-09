"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminUsers, type AdminUser } from "@/lib/api";

export default function AdminPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--fg)", padding: "32px", fontFamily: "monospace" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "13px", letterSpacing: "0.12em", color: "var(--fg-muted)" }}>ADMIN DASHBOARD</span>
          <div style={{ display: "flex", gap: "20px" }}>
            <Link href="/admin/roles" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none" }}>role management</Link>
            <Link href="/" style={{ fontSize: "12px", color: "var(--fg-muted)", textDecoration: "none" }}>← back</Link>
          </div>
        </div>

        <section style={{ marginBottom: "48px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: "var(--fg-muted)", marginBottom: "12px" }}>
            USERS {!loading && `(${users.length})`}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["user", "role", "scenes", "joined"].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 2 ? "right" : "left", padding: "8px 12px", color: "var(--fg-muted)", fontWeight: "normal", fontSize: "11px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: "16px 12px", color: "var(--fg-muted)" }}>loading...</td></tr>
              ) : users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div>{u.displayName}</div>
                    <div style={{ fontSize: "11px", color: "var(--fg-muted)" }}>{u.email}</div>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--fg-muted)", fontSize: "12px" }}>{u.role ?? "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>{u.sceneCount}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--fg-muted)", fontSize: "12px" }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <div style={{ fontSize: "11px", letterSpacing: "0.1em", color: "var(--fg-muted)", marginBottom: "12px" }}>GROUPS</div>
          <p style={{ fontSize: "13px", color: "var(--fg-muted)", fontStyle: "italic" }}>Coming soon.</p>
        </section>

      </div>
    </div>
  );
}
