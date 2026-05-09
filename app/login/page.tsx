"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const result = mode === "login"
        ? await login(email, password)
        : await register(email, displayName, password);
      saveAuth(result.token, result.user);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "var(--fg)", marginBottom: "4px" }}>
            Scene Builder
          </h1>
          <p style={{ color: "var(--fg-muted)", fontSize: "13px" }}>
            {mode === "login" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "6px", fontFamily: "monospace" }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "9px 12px", fontSize: "14px", borderRadius: "4px", outline: "none", fontFamily: "Georgia, serif" }}
            />
          </div>

          {mode === "register" && (
            <div>
              <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "6px", fontFamily: "monospace" }}>DISPLAY NAME</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "9px 12px", fontSize: "14px", borderRadius: "4px", outline: "none", fontFamily: "Georgia, serif" }}
              />
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: "6px", fontFamily: "monospace" }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--fg)", padding: "9px 12px", fontSize: "14px", borderRadius: "4px", outline: "none", fontFamily: "Georgia, serif" }}
            />
          </div>

          {error && (
            <p style={{ color: "var(--red)", fontSize: "13px" }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading ? "var(--accent-dim)" : "var(--accent)",
              color: "#000",
              border: "none",
              padding: "10px",
              fontSize: "13px",
              fontFamily: "monospace",
              letterSpacing: "0.08em",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "4px",
            }}
          >
            {loading ? "..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>

          <button
            onClick={() => { setMode(m => m === "login" ? "register" : "login"); setError(""); }}
            style={{ background: "none", border: "none", color: "var(--fg-muted)", fontSize: "13px", cursor: "pointer", fontFamily: "Georgia, serif" }}
          >
            {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}