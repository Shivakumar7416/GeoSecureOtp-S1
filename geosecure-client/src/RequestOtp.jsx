// src/RequestOtpMui.jsx
import React, { useState } from "react";
import { API_BASE } from "./config";
import {
  Box,
  Paper,
  Avatar,
  Typography,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Snackbar,
  IconButton,
} from "@mui/material";

import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";

export default function RequestOtp({ onSent }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    setSnack({ open: false, message: "" });
    setSentOk(false);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (res.ok && data?.success) {
        setSentOk(true);
        setSnack({ open: true, message: "OTP sent — check your inbox." });
        onSent && onSent(email);
      } else {
        const msg = String(data?.error || "").toLowerCase();
        const notFound =
          res.status === 404 ||
          msg.includes("not found") ||
          msg.includes("doesn't exist") ||
          msg.includes("not registered");

        if (notFound) {
          setSnack({ open: true, message: "Email doesn't exist." });
        } else {
          setSnack({
            open: true,
            message: "Error: " + (data?.error || `Server error (${res.status})`),
          });
        }
      }
    } catch (err) {
      setSnack({ open: true, message: "Network error: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", px: 2, py: 6 }}>
        <Paper
          elevation={12}
          sx={{
            width: "100%",
            maxWidth: 520,
            borderRadius: 3,
            p: { xs: 3, md: 4 },
            bgcolor: "#ffffff",
            transition: "transform .2s, box-shadow .2s",
            "&:hover": { transform: "translateY(-4px)" },
            boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Avatar
              sx={{
                width: 62,
                height: 62,
                bgcolor: "#ffffff",
                border: "2px solid #2563eb",
                color: "#2563eb",
                boxShadow: "0 4px 14px rgba(37,99,235,0.15)",
                transform: "rotate(-4deg)",
                transition: ".22s",
                "&:hover": { transform: "rotate(0deg)" },
              }}
            >
              <PersonIcon sx={{ fontSize: 32 }} />
            </Avatar>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Sign in with email
              </Typography>
              <Typography variant="body2" sx={{ color: "#475569" }}>
                We'll send a one-time code to your inbox.
              </Typography>
            </Box>
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: "grid", gap: 2 }} noValidate>
            <TextField
              label="Email address"
              type="email"
              required
              fullWidth
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailOutlineIcon sx={{ color: "#475569" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                  border: "1px solid rgba(0,0,0,0.08)",
                },
                "& .MuiOutlinedInput-root.Mui-focused": {
                  borderColor: "#2563eb",
                  boxShadow: "0 0 0 4px rgba(37,99,235,0.15)",
                },
                "& .MuiInputLabel-root": {
                  color: "#475569",
                },
              }}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              startIcon={!loading && !sentOk ? <SendIcon /> : sentOk ? <CheckCircleOutlineIcon /> : null}
              disabled={loading}
              sx={{
                py: 1.25,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                fontSize: "1rem",
                background: "linear-gradient(135deg,#2563eb,#38bdf8)",
                color: "#ffffff",
                boxShadow: "0 8px 25px rgba(37,99,235,0.25)",
                "&:hover": {
                  background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 12px 30px rgba(37,99,235,0.35)",
                },
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={18} sx={{ color: "#fff", mr: 1 }} />
                  Sending...
                </>
              ) : sentOk ? (
                "Sent"
              ) : (
                "Send OTP"
              )}
            </Button>

            {/* Spacer */}
            <Typography sx={{ minHeight: 20 }} />
          </Box>
        </Paper>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4200}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Paper
          elevation={6}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1,
            bgcolor: "#2563eb",
            color: "#ffffff",
            minWidth: 240,
            borderRadius: 2,
          }}
        >
          <Typography sx={{ flex: 1, fontSize: 13 }}>{snack.message}</Typography>
          <IconButton
            size="small"
            onClick={() => setSnack((s) => ({ ...s, open: false }))}
            sx={{ color: "#fff" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Snackbar>
    </>
  );
}
