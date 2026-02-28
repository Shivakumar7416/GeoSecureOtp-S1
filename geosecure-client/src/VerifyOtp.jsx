import React, { useState } from "react";
import { API_BASE } from "./config";
import { saveToken } from "./auth";
import "./requestOtp.css"; // reuse SAME CSS

export default function VerifyOtp({ email, onSuccess }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function verifyOtp(e) {
    e.preventDefault();
    if (!otp) {
      setMsg("Please enter the OTP");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        saveToken(data.token);
        setMsg("OTP verified. Logging in...");

        setTimeout(() => {
          onSuccess();
          window.location.reload();
        }, 700);
      } else {
        setMsg("Invalid OTP. Please try again.");
      }
    } catch {
      setMsg("Server error while verifying OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="otp-page">
      {/* HEADER */}
      <div className="otp-header">
        <h1>GeoSecureOTP</h1>
        <h3>OTP Verification</h3>
        <p>
          A One-Time Password has been sent to
          <br />
          <strong>{email}</strong>
        </p>
      </div>

      {/* CARD */}
      <form className="otp-card" onSubmit={verifyOtp}>
        <h2>Enter OTP</h2>
        <p className="sub">
          Enter the 6-digit OTP received in your email
        </p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, ""))
          }
          disabled={loading}
        />

        <button disabled={loading}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        {msg && <div className="msg">{msg}</div>}
      </form>

      {/* FOOTER */}
      <footer>
        Secure Authentication using OTP & Geolocation
      </footer>
    </div>
  );
}
