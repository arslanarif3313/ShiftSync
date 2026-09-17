"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    const res = await signIn("credentials", { email, password, redirect: false });
    setPending(false);

    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(params.get("callbackUrl") || "/");
    router.refresh();
  }

  const demoAccounts = [
    { role: "Admin",   email: "admin@coastaleats.test" },
    { role: "Manager", email: "manager.west@coastaleats.test" },
    { role: "Staff",   email: "staff.sarah@coastaleats.test" },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", marginBottom: "4px" }}>
            Sign in to ShiftSync
          </h1>
          <p style={{ fontSize: "13.5px", color: "#6b7280" }}>
            Coastal Eats Scheduling Platform
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgb(0 0 0 / .08), 0 1px 2px rgb(0 0 0 / .05)",
            padding: "28px",
          }}
        >
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="form-label">Email address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                defaultValue="manager.west@coastaleats.test"
                placeholder="you@coastaleats.test"
                className="form-input"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  defaultValue="password123"
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "4px",
                    transition: "color 150ms",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#4b5563"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  color: "#b91c1c",
                  fontSize: "13px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={pending}
              className="btn btn-primary btn-lg"
              style={{ width: "100%", justifyContent: "center", marginTop: "4px" }}
            >
              {pending ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Signing in…
                </>
              ) : "Sign in"}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div
          style={{
            marginTop: "16px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "16px 20px",
            boxShadow: "0 1px 2px rgb(0 0 0 / .04)",
          }}
        >
          <p style={{ fontSize: "11.5px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
            Demo accounts · password123
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {demoAccounts.map(({ role, email }) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  const emailEl = document.getElementById("login-email") as HTMLInputElement;
                  const passEl  = document.getElementById("login-password") as HTMLInputElement;
                  if (emailEl) emailEl.value = email;
                  if (passEl)  passEl.value  = "password123";
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  textAlign: "left",
                  width: "100%",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", minWidth: "52px" }}>{role}</span>
                <span style={{ fontSize: "12px", color: "#6b7280", fontFamily: "monospace" }}>{email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
