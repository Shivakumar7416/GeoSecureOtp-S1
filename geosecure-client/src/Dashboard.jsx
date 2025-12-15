import React, { useEffect, useState } from "react";
import AdminGeoBoundary from "./AdminGeoBoundary";
import { authedFetch, clearToken } from "./auth";
import { API_BASE } from "./config";
import AdminCreateUser from "./AdminCreateUser";

import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Paper,
  Divider,
  Button,
  CircularProgress,
  Stack,
  Fade,
  Slide,
} from "@mui/material";

import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";

export default function Dashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      try {
        const res = await authedFetch(`${API_BASE}/profile`);
        if (!res || !res.ok || !res.json) throw new Error();
        if (alive) setProfile(res.json);
      } catch {
        if (alive) {
          setError("Session expired. Please login again.");
          clearToken();
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProfile();
    return () => (alive = false);
  }, []);

  /* ---------- STATES ---------- */
  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#0f172a" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#0f172a" }}>
        <Fade in>
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Typography sx={{ mb: 2 }}>{error}</Typography>
            <Button variant="contained" onClick={() => { clearToken(); onLogout(); }}>
              Login again
            </Button>
          </Paper>
        </Fade>
      </Box>
    );
  }

  const isAdmin = profile.role === "admin";

  /* ---------- UI ---------- */
  return (
    <Fade in timeout={600}>
      <Box sx={{ minHeight: "100vh", bgcolor: "#f1f5f9" }}>
        {/* TOP BAR */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: "#020617",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <Toolbar sx={{ maxWidth: 1280, mx: "auto", width: "100%" }}>
            <Typography sx={{ flexGrow: 1, fontWeight: 700, color: "#e5e7eb" }}>
              GeoSecureOTP
            </Typography>

            <IconButton
              sx={{
                color: "#94a3b8",
                transition: "0.2s",
                "&:hover": { color: "#38bdf8", transform: "rotate(90deg)" },
              }}
            >
              <RefreshIcon />
            </IconButton>

            <IconButton
              sx={{
                color: "#94a3b8",
                transition: "0.2s",
                "&:hover": { color: "#ef4444" },
              }}
              onClick={() => {
                clearToken();
                onLogout();
              }}
            >
              <LogoutIcon />
            </IconButton>

            <Avatar
              sx={{
                ml: 2,
                bgcolor: isAdmin ? "#2563eb" : "#64748b",
                transition: "0.3s",
                "&:hover": { transform: "scale(1.1)" },
              }}
            >
              {isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
            </Avatar>
          </Toolbar>
        </AppBar>

        {/* CONTENT */}
        <Box sx={{ maxWidth: 1280, mx: "auto", mt: 4, px: 2 }}>
          {/* PROFILE */}
          <Slide in direction="up" timeout={500}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                mb: 3,
                backdropFilter: "blur(10px)",
                transition: "0.3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
                },
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: isAdmin ? "#2563eb" : "#64748b",
                    width: 48,
                    height: 48,
                  }}
                >
                  {isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                </Avatar>

                <Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    {profile.email}
                  </Typography>
                  <Typography sx={{ color: "#475569", fontSize: 14 }}>
                    {isAdmin ? "Administrator Access" : "Standard User"}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Slide>

          {/* ADMIN */}
{isAdmin && (
  <Slide in direction="up" timeout={650}>
    <Stack spacing={3}>
      {/* CREATE USER */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 4,
          transition: "0.3s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
          },
        }}
      >
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          User Management
        </Typography>
        <Typography sx={{ color: "#64748b", fontSize: 14, mb: 2 }}>
          Create and manage user accounts
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <AdminCreateUser />
      </Paper>

      {/* GEO BOUNDARY */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 4,
          transition: "0.3s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
          },
        }}
      >
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          Access Control
        </Typography>
        <Typography sx={{ color: "#64748b", fontSize: 14, mb: 2 }}>
          Configure geographic access rules
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <AdminGeoBoundary />
      </Paper>
    </Stack>
  </Slide>
)}


          {/* FILES */}
          <Slide in direction="up" timeout={800}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                transition: "0.3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
                },
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                Secure Files
              </Typography>
              <Typography sx={{ color: "#64748b", fontSize: 14 }}>
                Files visible based on your access
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ color: "#94a3b8" }}>
                No files available.
              </Typography>
            </Paper>
          </Slide>
        </Box>
      </Box>
    </Fade>
  );
}
