import React, { useState } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  Typography,
  Button,
  MenuItem,
  TextField,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";

export default function AdminFileUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState(1);
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" });

  async function uploadFile() {
    if (!file) {
      setSnack({ open: true, msg: "Select a file", type: "error" });
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("minAccessLevel", level);

    const res = await authedFetch(`${API_BASE}/admin/upload-file`, {
      method: "POST",
      body: fd,
    });

    if (res.ok) {
      setSnack({ open: true, msg: "File uploaded", type: "success" });
      setFile(null);
      onUploaded && onUploaded();
    } else {
      setSnack({ open: true, msg: "Upload failed", type: "error" });
    }
  }

  return (
    <Box>
      <Typography fontWeight={700} mb={2}>
        Upload Secure File
      </Typography>

      <Stack spacing={2}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />

        <TextField
          select
          label="Minimum Access Level"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
        >
          <MenuItem value={1}>Lower User</MenuItem>
          <MenuItem value={2}>Middle User</MenuItem>
          <MenuItem value={3}>Admin</MenuItem>
        </TextField>

        <Button variant="contained" onClick={uploadFile}>
          Upload File
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
