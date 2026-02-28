import React, { useState } from "react";
import { API_BASE } from "./config";
import "./requestOtp.css";

export default function RequestOtp({ onSent }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function sendOtp(e) {
    e.preventDefault();
    if (!email) {
      setMsg("Please enter your email");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMsg("OTP sent successfully. Check your email.");
        onSent(email);
      } else {
        setMsg(data.error || "Email not registered");
      }
    } catch {
      setMsg("Server not reachable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="otp-page">
      {/* HEADER */}
      <div className="otp-header">
        <h1>GeoSecureOTP</h1>
        <h3>Secure Media Access using OTP & Geolocation</h3>
        <p>
          A cybersecurity system that ensures files are accessed only by
          authorized users within approved geographic locations using OTP and
          real-time location verification.
        </p>
      </div>

      {/* CARD */}
      <form className="otp-card" onSubmit={sendOtp}>
        <h2>Login</h2>
        <p className="sub">
          Enter your registered email to receive a One-Time Password
        </p>

        <input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <button disabled={loading}>
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>

        {msg && <div className="msg">{msg}</div>}
      </form>

      {/* FOOTER */}
      <footer>
        Project Stage – I | CSE (Cyber Security) | CVR College of Engineering
      </footer>
    </div>
  );
}
