// src/RequestOtp.jsx
import React, { useState } from "react";
import { API_BASE } from "./config";

export default function RequestOtp({ onSent }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("OTP sent — check the inbox of your registered account.");
        onSent(email);
      } else {
        setMsg("Error: " + (data.error || JSON.stringify(data)));
      }
    } catch (err) {
      setMsg("Network error: " + err.message);
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{maxWidth:420}}>
      <h3>Sign in — enter email</h3>
      <input type="email" placeholder="you@example.com" required
        value={email} onChange={e => setEmail(e.target.value)} style={{width:"100%",padding:8,marginBottom:8}}/>
      <button type="submit" disabled={loading}>{loading ? "Sending..." : "Send OTP"}</button>
      <div style={{marginTop:8,color:"gray"}}>{msg}</div>
    </form>
  );
}
