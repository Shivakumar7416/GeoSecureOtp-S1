import React, { useEffect, useState } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  Avatar,
} from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  async function loadUsers() {
    const res = await authedFetch(`${API_BASE}/admin/users`);
    if (res.ok) setUsers(res.json);
  }

  async function disableUser(email) {
    if (!window.confirm(`Disable ${email}?`)) return;
    const res = await authedFetch(
      `${API_BASE}/admin/users/${email}/disable`,
      { method: "PUT" }
    );
    if (res.ok) loadUsers();
  }

  async function enableUser(email) {
    const res = await authedFetch(
      `${API_BASE}/admin/users/${email}/enable`,
      { method: "PUT" }
    );
    if (res.ok) loadUsers();
  }

  async function changeRole(email, level) {
    const res = await authedFetch(
      `${API_BASE}/admin/users/${email}/role`,
      { method: "PUT", body: { accessLevel: level } }
    );
    if (res.ok) loadUsers();
  }

  function roleLabel(level) {
    if (level === 1) return "Employee";
    if (level === 2) return "Manager";
    return "Administrator";
  }

  function roleColor(level) {
    if (level === 1) return { bg: "rgba(34,197,94,0.08)", color: "#22c55e", border: "rgba(34,197,94,0.25)" };
    if (level === 2) return { bg: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "rgba(245,158,11,0.25)" };
    return { bg: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "rgba(59,130,246,0.25)" };
  }

  function initials(email) {
    return email ? email[0].toUpperCase() : "U";
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (users.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 5, color: "#45566e" }}>
        <PersonIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
        <Typography sx={{ fontSize: "0.85rem" }}>No users found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={1.5}>
        {users.map((u) => {
          const rc = roleColor(u.access_level);
          return (
            <Paper
              key={u.email}
              className="glass-file"
              sx={{ flexWrap: "wrap", gap: "10px !important" }}
            >
              {/* Avatar */}
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: rc.bg,
                  border: `1px solid ${rc.border}`,
                  color: rc.color,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                  flexShrink: 0,
                }}
              >
                {initials(u.email)}
              </Avatar>

              {/* Email */}
              <Typography
                sx={{
                  flexGrow: 1,
                  fontSize: "0.82rem",
                  color: "#e8edf5",
                  fontWeight: 500,
                  minWidth: 160,
                }}
              >
                {u.email}
              </Typography>

              {/* Role chip */}
              <Chip
                label={roleLabel(u.access_level)}
                size="small"
                sx={{
                  bgcolor: rc.bg,
                  color: rc.color,
                  border: `1px solid ${rc.border}`,
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  height: 24,
                  borderRadius: "6px",
                }}
              />

              {/* Status chip */}
              <Chip
                label={u.enabled ? "Active" : "Disabled"}
                size="small"
                sx={{
                  bgcolor: u.enabled ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  color: u.enabled ? "#22c55e" : "#ef4444",
                  border: `1px solid ${u.enabled ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  height: 24,
                  borderRadius: "6px",
                }}
              />

              {/* Promote / Demote */}
              {u.enabled && u.access_level === 1 && (
                <Button
                  size="small"
                  startIcon={<ArrowUpwardIcon sx={{ fontSize: 13 }} />}
                  onClick={() => changeRole(u.email, 2)}
                  sx={{
                    fontSize: "0.72rem",
                    py: 0.4,
                    px: 1.2,
                    bgcolor: "rgba(245,158,11,0.08)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.2)",
                    "&:hover": { bgcolor: "rgba(245,158,11,0.16)" },
                  }}
                >
                  Promote
                </Button>
              )}

              {u.enabled && u.access_level === 2 && (
                <Button
                  size="small"
                  startIcon={<ArrowDownwardIcon sx={{ fontSize: 13 }} />}
                  onClick={() => changeRole(u.email, 1)}
                  sx={{
                    fontSize: "0.72rem",
                    py: 0.4,
                    px: 1.2,
                    bgcolor: "rgba(99,155,255,0.08)",
                    color: "#7aa3f5",
                    border: "1px solid rgba(99,155,255,0.2)",
                    "&:hover": { bgcolor: "rgba(99,155,255,0.16)" },
                  }}
                >
                  Demote
                </Button>
              )}

              {/* Disable / Enable */}
              {u.enabled && u.access_level !== 3 && (
                <Button
                  size="small"
                  startIcon={<BlockIcon sx={{ fontSize: 13 }} />}
                  onClick={() => disableUser(u.email)}
                  sx={{
                    fontSize: "0.72rem",
                    py: 0.4,
                    px: 1.2,
                    bgcolor: "rgba(239,68,68,0.08)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)",
                    "&:hover": { bgcolor: "rgba(239,68,68,0.16)" },
                  }}
                >
                  Disable
                </Button>
              )}

              {!u.enabled && (
                <Button
                  size="small"
                  startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 13 }} />}
                  onClick={() => enableUser(u.email)}
                  sx={{
                    fontSize: "0.72rem",
                    py: 0.4,
                    px: 1.2,
                    bgcolor: "rgba(34,197,94,0.08)",
                    color: "#22c55e",
                    border: "1px solid rgba(34,197,94,0.2)",
                    "&:hover": { bgcolor: "rgba(34,197,94,0.16)" },
                  }}
                >
                  Enable
                </Button>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}