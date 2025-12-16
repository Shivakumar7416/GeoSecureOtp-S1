import React, { useEffect, useState } from "react";
import AdminGeoBoundary from "./AdminGeoBoundary";
import AdminCreateUser from "./AdminCreateUser";
import { authedFetch, clearToken } from "./auth";
import { API_BASE } from "./config";

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
    async function loadProfile() {
      try {
        const res = await authedFetch(`${API_BASE}/profile`);
        if (!res.ok) throw new Error();
        setProfile(res.json);
      } catch {
        setError("Session expired. Please login again.");
        clearToken();
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Paper sx={{ p: 4 }}>
          <Typography sx={{ mb: 2 }}>{error}</Typography>
          <Button
            variant="contained"
            onClick={() => {
              clearToken();
              onLogout();
            }}
          >
            Login again
          </Button>
        </Paper>
      </Box>
    );
  }

  const isAdmin = profile.accessLevel === 3;

  return (
    <Fade in>
      <Box sx={{ minHeight: "100vh", bgcolor: "#f1f5f9" }}>
        {/* TOP BAR */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography sx={{ flexGrow: 1, fontWeight: 700 }}>
              GeoSecureOTP
            </Typography>

            <IconButton>
              <RefreshIcon />
            </IconButton>

            <IconButton
              onClick={() => {
                clearToken();
                onLogout();
              }}
            >
              <LogoutIcon />
            </IconButton>

            <Avatar sx={{ ml: 2, bgcolor: isAdmin ? "#2563eb" : "#64748b" }}>
              {isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
            </Avatar>
          </Toolbar>
        </AppBar>

        {/* CONTENT */}
        <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
          {/* PROFILE */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography fontWeight={700}>{profile.email}</Typography>
            <Typography color="text.secondary">
              {isAdmin ? "Administrator Access" : "Standard User"}
            </Typography>
          </Paper>

          {/* ADMIN SECTION */}
          {isAdmin && (
            <Stack spacing={3}>
              <Paper sx={{ p: 3 }}>
                <Typography fontWeight={700} mb={2}>
                  User Management
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <AdminCreateUser />
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Typography fontWeight={700} mb={2}>
                  Access Control
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <AdminGeoBoundary />
              </Paper>
            </Stack>
          )}

          {/* FILES */}
          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography fontWeight={700}>Secure Files</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography>No files available.</Typography>
          </Paper>
        </Box>
      </Box>
    </Fade>
  );
}
