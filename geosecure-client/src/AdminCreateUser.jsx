import React, { useState } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  TextField,
  Button,
  MenuItem,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";

import PersonAddIcon from "@mui/icons-material/PersonAdd";

const inputSx = {
  "& .MuiInputBase-root": {
    borderRadius: "8px",
    bgcolor: "rgba(7,13,26,0.8)",
    color: "#e8edf5",
    fontSize: "0.85rem",
    fontFamily: "'Sora', sans-serif",
  },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.15)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.35)" },
  "& .MuiInputLabel-root": { color: "#7a8ba8", fontSize: "0.85rem", fontFamily: "'Sora', sans-serif" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.15)",
  },
  "& .MuiSelect-icon": { color: "#7a8ba8" },
};

export default function AdminCreateUser() {
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState(1);
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" });

  async function handleCreate() {
    const res = await authedFetch(`${API_BASE}/admin/create-user`, {
      method: "POST",
      body: { email, accessLevel },
    });

    if (res.ok) {
      setSnack({ open: true, msg: "User created successfully", type: "success" });
      setEmail("");
      setAccessLevel(1);
    } else {
      setSnack({ open: true, msg: "User already exists", type: "error" });
    }
  }

  return (
    <Box>
      <Stack spacing={2.5}>
        <TextField
          label="Email Address"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          sx={inputSx}
        />

        <TextField
          select
          label="User Role"
          fullWidth
          value={accessLevel}
          onChange={(e) => setAccessLevel(Number(e.target.value))}
          sx={inputSx}
        >
          <MenuItem value={1}>Employee</MenuItem>
          <MenuItem value={2}>Manager</MenuItem>
          <MenuItem value={3}>Administrator</MenuItem>
        </TextField>

        <Button
          variant="contained"
          onClick={handleCreate}
          startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />}
          sx={{
            py: 1.2,
            borderRadius: "8px",
            fontWeight: 700,
            fontFamily: "'Sora', sans-serif",
            fontSize: "0.82rem",
            textTransform: "none",
            background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            boxShadow: "0 4px 20px rgba(59,130,246,0.25)",
            "&:hover": {
              background: "linear-gradient(135deg, #1e40af, #2563eb)",
              boxShadow: "0 6px 28px rgba(59,130,246,0.35)",
            },
          }}
        >
          Create User
        </Button>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.type}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}