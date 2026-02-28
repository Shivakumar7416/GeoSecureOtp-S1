import React, { useState, useEffect, useRef } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Paper,
} from "@mui/material";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import RouterIcon from "@mui/icons-material/Router";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FmdBadIcon from "@mui/icons-material/FmdBad";

// ── reason label map ──────────────────────────────────────────────────────────
const REASON_LABELS = {
  "outside-allowed-location": "Outside boundary",
  "not-allowed": "Insufficient access",
  "geo-not-configured": "Geo not configured",
};

const REASON_COLOR = {
  "outside-allowed-location": { bg: "rgba(239,68,68,0.1)", color: "#ef4444", border: "rgba(239,68,68,0.25)" },
  "not-allowed": { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "rgba(245,158,11,0.25)" },
  "geo-not-configured": { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.2)" },
};

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  });
}

function formatCoords(lat, lon) {
  if (lat == null || lon == null) return "—";
  return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
}

function mapsLink(lat, lon) {
  if (lat == null || lon == null) return null;
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminLogs({ onUnreadReset }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function loadLogs(f = filter) {
    setLoading(true);
    const res = await authedFetch(`${API_BASE}/admin/logs?filter=${f}&limit=200`);
    if (res.ok) setLogs(res.json);
    setLoading(false);
    onUnreadReset && onUnreadReset();
  }

  useEffect(() => {
    loadLogs(filter);
  }, [filter]);

  const denied = logs.filter((l) => l.status === "denied").length;
  const success = logs.filter((l) => l.status === "success").length;

  return (
    <Box>
      {/* ── Stats row ── */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          {
            label: "Total Events",
            value: logs.length,
            icon: <AccessTimeIcon sx={{ fontSize: 18 }} />,
            accent: "#3b82f6",
            bg: "rgba(59,130,246,0.08)",
            border: "rgba(59,130,246,0.2)",
          },
          {
            label: "Successful",
            value: success,
            icon: <CheckCircleIcon sx={{ fontSize: 18 }} />,
            accent: "#22c55e",
            bg: "rgba(34,197,94,0.08)",
            border: "rgba(34,197,94,0.2)",
          },
          {
            label: "Denied",
            value: denied,
            icon: <BlockIcon sx={{ fontSize: 18 }} />,
            accent: "#ef4444",
            bg: "rgba(239,68,68,0.08)",
            border: "rgba(239,68,68,0.2)",
          },
        ].map((s) => (
          <Box
            key={s.label}
            sx={{
              flex: "1 1 140px",
              p: 2,
              borderRadius: "10px",
              bgcolor: s.bg,
              border: `1px solid ${s.border}`,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box sx={{ color: s.accent }}>{s.icon}</Box>
            <Box>
              <Typography sx={{ fontSize: "1.3rem", fontWeight: 700, color: "#e8edf5", lineHeight: 1, fontFamily: "'Sora',sans-serif" }}>
                {s.value}
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "#7a8ba8", fontFamily: "'Sora',sans-serif" }}>
                {s.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* ── Filter + Refresh ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              fontFamily: "'Sora',sans-serif",
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "#7a8ba8",
              border: "1px solid rgba(99,155,255,0.15)",
              textTransform: "none",
              px: 2,
              py: 0.5,
              "&.Mui-selected": {
                bgcolor: "rgba(59,130,246,0.12)",
                color: "#3b82f6",
                borderColor: "rgba(59,130,246,0.3)",
              },
              "&:hover": { bgcolor: "rgba(59,130,246,0.07)" },
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="denied">Denied Only</ToggleButton>
          <ToggleButton value="success">Success Only</ToggleButton>
        </ToggleButtonGroup>

        <Button
          size="small"
          startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
          onClick={() => loadLogs(filter)}
          sx={{
            fontFamily: "'Sora',sans-serif",
            fontSize: "0.72rem",
            color: "#7a8ba8",
            border: "1px solid rgba(99,155,255,0.15)",
            textTransform: "none",
            px: 1.5,
            "&:hover": { bgcolor: "rgba(59,130,246,0.07)", color: "#3b82f6" },
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* ── Log entries ── */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={28} sx={{ color: "#3b82f6" }} />
        </Box>
      ) : logs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6, color: "#45566e" }}>
          <AccessTimeIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
          <Typography sx={{ fontSize: "0.85rem", fontFamily: "'Sora',sans-serif" }}>No access logs yet</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {logs.map((log) => {
            const isDenied = log.status === "denied";
            const rc = isDenied
              ? REASON_COLOR[log.reason] || REASON_COLOR["geo-not-configured"]
              : null;
            const link = mapsLink(log.lat, log.lon);

            return (
              <Paper
                key={log.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  p: "14px 16px",
                  bgcolor: isDenied ? "rgba(239,68,68,0.04)" : "rgba(7,13,26,0.5)",
                  border: `1px solid ${isDenied ? "rgba(239,68,68,0.18)" : "rgba(99,155,255,0.1)"}`,
                  borderRadius: "10px",
                  transition: "border-color 0.15s",
                  "&:hover": {
                    borderColor: isDenied ? "rgba(239,68,68,0.35)" : "rgba(99,155,255,0.25)",
                  },
                }}
              >
                {/* Row 1: status + file + timestamp */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>

                  {/* Status indicator */}
                  {isDenied ? (
                    <WarningAmberIcon sx={{ fontSize: 15, color: "#ef4444", flexShrink: 0 }} />
                  ) : (
                    <CheckCircleIcon sx={{ fontSize: 15, color: "#22c55e", flexShrink: 0 }} />
                  )}

                  {/* Status chip */}
                  <Chip
                    label={isDenied ? "Denied" : "Success"}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      fontFamily: "'Sora',sans-serif",
                      bgcolor: isDenied ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                      color: isDenied ? "#ef4444" : "#22c55e",
                      border: `1px solid ${isDenied ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                      borderRadius: "5px",
                    }}
                  />

                  {/* Filename */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                    <InsertDriveFileIcon sx={{ fontSize: 13, color: "#7a8ba8" }} />
                    <Typography sx={{ fontSize: "0.8rem", color: "#e8edf5", fontWeight: 600, fontFamily: "'Sora',sans-serif" }}>
                      {log.filename || `File #${log.file_id}` || "Unknown file"}
                    </Typography>
                  </Box>

                  {/* Reason chip (denied only) */}
                  {isDenied && log.reason && (
                    <Chip
                      icon={<FmdBadIcon sx={{ fontSize: "12px !important", color: `${rc?.color} !important` }} />}
                      label={REASON_LABELS[log.reason] || log.reason}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        fontFamily: "'Sora',sans-serif",
                        bgcolor: rc?.bg,
                        color: rc?.color,
                        border: `1px solid ${rc?.border}`,
                        borderRadius: "5px",
                      }}
                    />
                  )}

                  {/* Timestamp — pushed right */}
                  <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                    <AccessTimeIcon sx={{ fontSize: 12, color: "#45566e" }} />
                    <Typography sx={{ fontSize: "0.7rem", color: "#45566e", fontFamily: "'Sora',sans-serif" }}>
                      {formatTime(log.timestamp)}
                    </Typography>
                  </Box>
                </Box>

                {/* Row 2: user + location + IP */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flexWrap: "wrap", pl: "23px" }}>

                  {/* User */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 13, color: "#7a8ba8" }} />
                    <Typography sx={{ fontSize: "0.75rem", color: "#7a8ba8", fontFamily: "'Sora',sans-serif" }}>
                      {log.user_email}
                    </Typography>
                  </Box>

                  {/* Location */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <LocationOnIcon sx={{ fontSize: 13, color: log.reason === "outside-allowed-location" ? "#ef4444" : "#7a8ba8" }} />
                    {link ? (
                      <Typography
                        component="a"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: "0.75rem",
                          color: log.reason === "outside-allowed-location" ? "#f87171" : "#7a8ba8",
                          fontFamily: "'Sora',sans-serif",
                          textDecoration: "none",
                          "&:hover": { color: "#3b82f6", textDecoration: "underline" },
                        }}
                      >
                        {formatCoords(log.lat, log.lon)}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: "0.75rem", color: "#45566e", fontFamily: "'Sora',sans-serif" }}>
                        —
                      </Typography>
                    )}
                  </Box>

                  {/* IP */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <RouterIcon sx={{ fontSize: 13, color: "#7a8ba8" }} />
                    <Typography
                      sx={{
                        fontSize: "0.73rem",
                        color: "#7a8ba8",
                        fontFamily: "'JetBrains Mono',monospace",
                      }}
                    >
                      {log.ip || "—"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}