import React, { useState, useEffect } from "react";
import { API_BASE } from "./config";
import { saveToken } from "./auth";
import "./requestOtp.css";

export default function VerifyOtp({ email, onSuccess }) {
  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");
  const [msgType, setMsgType] = useState("info"); // info | error | warning
  const [locked, setLocked]   = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { setLocked(false); clearInterval(t); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [countdown]);

  function formatCountdown(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function verifyOtp(e) {
    e.preventDefault();
    if (!otp || locked) return;

    setLoading(true);
    setMsg("");

    try {
      const res  = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      // Lockout
      if (res.status === 429 || data.error === "account-locked") {
        const secsLeft = data.lockedUntil
          ? Math.ceil((data.lockedUntil - Date.now()) / 1000)
          : 15 * 60;
        setLocked(true);
        setCountdown(secsLeft);
        setMsgType("error");
        setMsg(data.message || "Account locked. Too many failed attempts.");
        setLoading(false);
        return;
      }

      if (res.ok && data.success && data.token) {
        saveToken(data.token);
        setMsgType("info");
        setMsg("OTP verified. Logging in...");
        setTimeout(() => { onSuccess(); window.location.reload(); }, 700);
      } else if (data.error === "wrong-otp") {
        setMsgType("error");
        setMsg("Invalid OTP. Please try again.");
      } else {
        setMsgType("error");
        setMsg("OTP expired or invalid. Please request a new one.");
      }
    } catch {
      setMsgType("error");
      setMsg("Server error while verifying OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="otp-page">
      <div className="otp-header">
        <h1>GeoSecureOTP</h1>
        <h3>OTP Verification</h3>
        <p>
          A One-Time Password has been sent to
          <br />
          <strong>{email}</strong>
        </p>
      </div>

      <form className="otp-card" onSubmit={verifyOtp}>
        <h2>Enter OTP</h2>
        <p className="sub">Enter the 6-digit OTP received in your email</p>

        {/* Lockout banner */}
        {locked && (
          <div style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "14px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "0.82rem", color: "#ef4444", fontWeight: 700, marginBottom: 4 }}>
              🔒 Account Temporarily Locked
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Too many failed attempts. Try again in
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ef4444", fontFamily: "monospace", marginTop: 4 }}>
              {formatCountdown(countdown)}
            </div>
          </div>
        )}

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          disabled={loading || locked}
        />

        <button disabled={loading || locked}>
          {loading ? "Verifying..." : locked ? `Locked (${formatCountdown(countdown)})` : "Verify OTP"}
        </button>

        {msg && (
          <div className="msg" style={{
            color: msgType === "error" ? "#ef4444" : msgType === "warning" ? "#f59e0b" : "#38bdf8"
          }}>
            {msg}
          </div>
        )}
      </form>

      <footer>Secure Authentication using OTP & Geolocation</footer>
    </div>
  );
}