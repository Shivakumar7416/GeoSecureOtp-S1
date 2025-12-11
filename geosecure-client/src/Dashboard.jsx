// src/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { authedFetch, clearToken } from "./auth";
import { API_BASE } from "./config";

export default function Dashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const res = await authedFetch(`${API_BASE}/profile`, { method: "GET" });
      if (res.ok) setProfile(res.json);
      else {
        setErr("Not authorized or token expired.");
        // auto logout
        clearToken();
        onLogout();
      }
    })();
  }, [onLogout]);

  if (err) return <div>{err}</div>;
  if (!profile) return <div>Loading profile...</div>;

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Email: <b>{profile.email}</b></p>
      <p>Role: <b>{profile.role}</b></p>

      <button onClick={() => { clearToken(); onLogout(); }}>Logout</button>
    </div>
  );
}
