import React, { useState, useEffect } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";
import {
  Box, Typography, Stack, Chip, Button, CircularProgress, Paper,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LockIcon from "@mui/icons-material/Lock";
import EmailIcon from "@mui/icons-material/Email";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import RouterIcon from "@mui/icons-material/Router";
import RefreshIcon from "@mui/icons-material/Refresh";

const EVENT_META = {
  "login-success":            { label: "Login Success",        color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)",   icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  "otp-sent":                 { label: "OTP Sent",             color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)",  icon: <EmailIcon sx={{ fontSize: 14 }} /> },
  "verify-fail-wrong-otp":    { label: "Wrong OTP",            color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} /> },
  "verify-fail-expired":      { label: "OTP Expired",          color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} /> },
  "account-locked":           { label: "Account Locked",       color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   icon: <LockIcon sx={{ fontSize: 14 }} /> },
  "verify-blocked-locked":    { label: "Blocked (Locked)",     color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   icon: <LockIcon sx={{ fontSize: 14 }} /> },
  "otp-request-locked":       { label: "OTP Req Blocked",      color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   icon: <LockIcon sx={{ fontSize: 14 }} /> },
  "otp-request-unknown-email":{ label: "Unknown Email",        color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)",  icon: <PersonIcon sx={{ fontSize: 14 }} /> },
};

function getMeta(event) {
  return EVENT_META[event] || { label: event, color: "#7a8ba8", bg: "rgba(99,155,255,0.08)", border: "rgba(99,155,255,0.15)", icon: <AccessTimeIcon sx={{ fontSize: 14 }} /> };
}

function formatTime(ts) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
}

export default function AdminLoginLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await authedFetch(`${API_BASE}/admin/login-logs?limit=200`);
    if (res.ok) setLogs(res.json);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const successes = logs.filter(l => l.event === "login-success").length;
  const failures  = logs.filter(l => l.event.includes("fail") || l.event.includes("locked") || l.event.includes("wrong")).length;

  return (
    <Box>
      {/* Stats */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Events", value: logs.length,  accent: "#3b82f6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)"  },
          { label: "Successful Logins", value: successes, accent: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.2)"   },
          { label: "Failed Attempts",   value: failures,  accent: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)"   },
        ].map(s => (
          <Box key={s.label} sx={{ flex: "1 1 130px", p: 2, borderRadius: "10px", bgcolor: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: "1.3rem", fontWeight: 700, color: "#e8edf5", lineHeight: 1, fontFamily: "'Sora',sans-serif" }}>{s.value}</Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "#7a8ba8", fontFamily: "'Sora',sans-serif" }}>{s.label}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Refresh */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 14 }} />} onClick={load}
          sx={{ fontFamily: "'Sora',sans-serif", fontSize: "0.72rem", color: "#7a8ba8", border: "1px solid rgba(99,155,255,0.15)", textTransform: "none", px: 1.5, "&:hover": { color: "#3b82f6" } }}>
          Refresh
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={28} sx={{ color: "#3b82f6" }} />
        </Box>
      ) : logs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6, color: "#45566e" }}>
          <AccessTimeIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
          <Typography sx={{ fontSize: "0.85rem", fontFamily: "'Sora',sans-serif" }}>No login activity yet</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {logs.map(log => {
            const m = getMeta(log.event);
            return (
              <Paper key={log.id} sx={{
                display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
                p: "12px 16px", bgcolor: "rgba(7,13,26,0.5)",
                border: `1px solid ${m.border}`, borderRadius: "9px",
                transition: "border-color 0.15s",
                "&:hover": { borderColor: m.color + "60" },
              }}>
                <Chip label={m.label} size="small" icon={m.icon}
                  sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700, fontFamily: "'Sora',sans-serif", bgcolor: m.bg, color: m.color, border: `1px solid ${m.border}`, borderRadius: "6px", "& .MuiChip-icon": { color: `${m.color} !important`, ml: "6px" } }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 13, color: "#7a8ba8" }} />
                  <Typography sx={{ fontSize: "0.78rem", color: "#e8edf5", fontFamily: "'Sora',sans-serif" }}>{log.email}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <RouterIcon sx={{ fontSize: 13, color: "#7a8ba8" }} />
                  <Typography sx={{ fontSize: "0.73rem", color: "#7a8ba8", fontFamily: "'JetBrains Mono',monospace" }}>{log.ip || "—"}</Typography>
                </Box>
                <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 12, color: "#45566e" }} />
                  <Typography sx={{ fontSize: "0.7rem", color: "#45566e", fontFamily: "'Sora',sans-serif" }}>{formatTime(log.timestamp)}</Typography>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}