// src/VerifyOtpMui.jsx
import React, { useState } from "react";
import { API_BASE } from "./config";
import { saveToken } from "./auth";

import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  IconButton,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import KeyIcon from "@mui/icons-material/Key";

export default function VerifyOtp({ email, onSuccess }) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "" });

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    setSnack({ open: false, message: "" });

    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        saveToken(data.token);
        setSnack({ open: true, message: "OTP Verified — Logging in..." });
        setTimeout(onSuccess, 800); // Smooth redirect delay
      } else {
        setSnack({
          open: true,
          message: "Invalid OTP. Try again.",
        });
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
          elevation={10}
          sx={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 3,
            p: 4,
            bgcolor: "#ffffff",
            boxShadow: "0 12px 35px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.06)",
            transition: ".2s",
            "&:hover": { transform: "translateY(-4px)" },
          }}
        >
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <KeyIcon sx={{ fontSize: 36, color: "#2563eb" }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
              Enter OTP to verify
            </Typography>
          </Box>

          <Typography sx={{ mb: 2, color: "#475569" }}>
            OTP sent to <strong>{email}</strong>
          </Typography>

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleVerify}
            sx={{ display: "grid", gap: 2 }}
          >
            <TextField
              label="6-digit OTP"
              required
              fullWidth
              disabled={loading}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
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
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={!loading ? null : null}
              sx={{
                py: 1.25,
                mt: 1,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: "1rem",
                textTransform: "none",
                background: "linear-gradient(135deg,#2563eb,#38bdf8)",
                color: "#fff",
                boxShadow: "0 8px 25px rgba(37,99,235,0.25)",
                "&:hover": {
                  background: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
                  boxShadow: "0 12px 30px rgba(37,99,235,0.35)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={18} sx={{ color: "#fff", mr: 1 }} />
                  Verifying...
                </>
              ) : (
                "Verify & Login"
              )}
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Snackbar (Blue) */}
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
            color: "#fff",
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
