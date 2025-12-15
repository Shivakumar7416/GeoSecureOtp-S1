import React, { useState } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  Fade,
} from "@mui/material";

import LocationOnIcon from "@mui/icons-material/LocationOn";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import RadarIcon from "@mui/icons-material/Radar";

export default function AdminGeoBoundary() {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [radius, setRadius] = useState("");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" });

  async function saveBoundary() {
    if (!lat || !lon || !radius) {
      setSnack({ open: true, msg: "All fields are required", type: "error" });
      return;
    }

    setSaving(true);

    const res = await authedFetch(`${API_BASE}/admin/set-boundary`, {
      method: "POST",
      body: { lat, lon, radius },
    });

    if (res.ok) {
      setSnack({ open: true, msg: "Boundary saved successfully", type: "success" });
    } else {
      setSnack({ open: true, msg: "Failed to save boundary", type: "error" });
    }

    setSaving(false);
  }

  return (
    <Fade in timeout={500}>
      <Box>
        {/* HEADER */}
        <Stack direction="row" spacing={1} alignItems="center" mb={3}>
          <RadarIcon sx={{ color: "#38bdf8", fontSize: 28 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            Location Boundary Configuration
          </Typography>
        </Stack>

        {/* FORM */}
        <Stack spacing={2}>
          <TextField
            label="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <MyLocationIcon sx={{ mr: 1, color: "#38bdf8" }} />,
            }}
            sx={inputStyle}
          />

          <TextField
            label="Longitude"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <LocationOnIcon sx={{ mr: 1, color: "#38bdf8" }} />,
            }}
            sx={inputStyle}
          />

          <TextField
            label="Radius (meters)"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: <RadarIcon sx={{ mr: 1, color: "#38bdf8" }} />,
            }}
            sx={inputStyle}
          />

          {/* BUTTON */}
          <Button
            onClick={saveBoundary}
            disabled={saving}
            sx={{
              mt: 2,
              py: 1.2,
              borderRadius: 2,
              fontWeight: 700,
              textTransform: "none",
              background: "linear-gradient(135deg,#2563eb,#38bdf8)",
              color: "#fff",
              boxShadow: "0 10px 30px rgba(37,99,235,0.35)",
              transition: "0.3s",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 14px 40px rgba(37,99,235,0.45)",
              },
            }}
          >
            {saving ? "Saving..." : "Save Boundary"}
          </Button>
        </Stack>

        {/* SNACKBAR */}
        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={() => setSnack({ ...snack, open: false })}
        >
          <Alert severity={snack.type} sx={{ width: "100%" }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
}

/* ---------------- STYLES ---------------- */

const inputStyle = {
  "& .MuiInputBase-root": {
    borderRadius: 2,
    bgcolor: "rgba(15,23,42,0.6)",
    backdropFilter: "blur(8px)",
    color: "#e5e7eb",
    transition: "0.3s",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "rgba(148,163,184,0.3)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "#38bdf8",
  },
  "& .MuiInputLabel-root": {
    color: "#94a3b8",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#38bdf8",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#38bdf8",
    boxShadow: "0 0 0 4px rgba(56,189,248,0.2)",
  },
};
