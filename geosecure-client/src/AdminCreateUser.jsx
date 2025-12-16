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
  const [accessLevel, setAccessLevel] = useState(1); // default = lower
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" });

  async function handleCreate() {
    const res = await authedFetch(`${API_BASE}/admin/create-user`, {
      method: "POST",
      body: { email, accessLevel },
    });

    if (res.ok) {
      setSnack({
        open: true,
        msg: "User created successfully",
        type: "success",
      });
      setEmail("");
      setAccessLevel(1);
    } else {
      setSnack({
        open: true,
        msg: "User already exists",
        type: "error",
      });
    }
  }

  return (
    <Box>
      <Typography fontWeight={700} mb={2}>
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
        label="User Role"
        fullWidth
        value={accessLevel}
        onChange={(e) => setAccessLevel(Number(e.target.value))}
        sx={{ mb: 2 }}
      >
        <MenuItem value={1}>Lower User</MenuItem>
        <MenuItem value={2}>Middle User</MenuItem>
        <MenuItem value={3}>Admin</MenuItem>
      </TextField>

      <Button variant="contained" onClick={handleCreate} sx={{ fontWeight: 700 }}>
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
