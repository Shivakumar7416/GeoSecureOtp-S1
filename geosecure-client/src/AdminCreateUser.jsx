import React, { useState } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  TextField,
  Button,
  MenuItem,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

export default function AdminCreateUser() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("lower");
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" });

  async function handleCreate() {
    const res = await authedFetch(`${API_BASE}/admin/create-user`, {
      method: "POST",
      body: { email, role },
    });

    if (res.ok) {
      setSnack({ open: true, msg: "User created successfully", type: "success" });
      setEmail("");
    } else {
      setSnack({ open: true, msg: "User already exists", type: "error" });
    }
  }

  return (
    <Box>
      <Typography sx={{ fontWeight: 700, mb: 2 }}>
        Create New User
      </Typography>

      <TextField
        label="User Email"
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        select
        label="Role"
        fullWidth
        value={role}
        onChange={(e) => setRole(e.target.value)}
        sx={{ mb: 2 }}
      >
        <MenuItem value="lower">Normal User</MenuItem>
        <MenuItem value="admin">Admin</MenuItem>
      </TextField>

      <Button
        variant="contained"
        onClick={handleCreate}
        sx={{ fontWeight: 700 }}
      >
        Create User
      </Button>

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
