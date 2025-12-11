// src/App.js
import React, { useEffect, useState } from "react";
import RequestOtp from "./RequestOtp";
import VerifyOtp from "./VerifyOtp";
import Dashboard from "./Dashboard";
import { getToken } from "./auth";

function App() {
  const [email, setEmail] = useState(null);
  const [loggedIn, setLoggedIn] = useState(!!getToken());

  useEffect(() => {
    if (getToken()) setLoggedIn(true);
  }, []);

  if (loggedIn) {
    return <Dashboard onLogout={() => setLoggedIn(false)} />;
  }

  return (
    <div style={{padding:20}}>
      {!email ? (
        <RequestOtp onSent={(e) => setEmail(e)} />
      ) : (
        <VerifyOtp email={email} onSuccess={() => setLoggedIn(true)} />
      )}
    </div>
  );
}

export default App;
