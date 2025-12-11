// src/VerifyOtp.jsx
import React, { useState } from "react";
import { API_BASE } from "./config";
import { saveToken } from "./auth";

export default function VerifyOtp({ email, onSuccess }) {
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (data.success && data.token) {
        saveToken(data.token);
        setMsg("Verified — redirecting...");
        onSuccess();
      } else {
        setMsg("Verification failed: " + (data.error || JSON.stringify(data)));
      }
    } catch (err) {
      setMsg("Network error: " + err.message);
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleVerify} style={{maxWidth:420}}>
      <h3>Enter OTP for {email}</h3>
      <input value={otp} onChange={e=>setOtp(e.target.value)} required placeholder="123456" style={{width:"100%",padding:8,marginBottom:8}} />
      <button type="submit" disabled={loading}>{loading ? "Verifying..." : "Verify & Login"}</button>
      <div style={{marginTop:8,color:"gray"}}>{msg}</div>
    </form>
  );
}
