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

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

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
  "& .MuiMenuItem-root": { fontFamily: "'Sora', sans-serif" },
};

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
      <Stack spacing={2.5}>
        {/* File drop zone */}
        <Box
          component="label"
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            height: 120,
            border: "1.5px dashed",
            borderColor: file ? "rgba(59,130,246,0.5)" : "rgba(99,155,255,0.2)",
            borderRadius: "10px",
            bgcolor: file ? "rgba(59,130,246,0.05)" : "rgba(7,13,26,0.6)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: "rgba(59,130,246,0.45)",
              bgcolor: "rgba(59,130,246,0.05)",
            },
          }}
        >
          <input
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
          />
          {file ? (
            <>
              <InsertDriveFileIcon sx={{ fontSize: 28, color: "#3b82f6" }} />
              <Typography sx={{ fontSize: "0.8rem", color: "#3b82f6", fontWeight: 600 }}>
                {file.name}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "#7a8ba8" }}>
                {(file.size / 1024).toFixed(1)} KB — click to change
              </Typography>
            </>
          ) : (
            <>
              <CloudUploadIcon sx={{ fontSize: 28, color: "#45566e" }} />
              <Typography sx={{ fontSize: "0.82rem", color: "#7a8ba8", fontWeight: 500 }}>
                Click to select a file
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "#45566e" }}>
                PDF, image, text and more
              </Typography>
            </>
          )}
        </Box>

        {/* Access level */}
        <TextField
          select
          label="Minimum Access Level"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          fullWidth
          sx={inputSx}
        >
          <MenuItem value={1}>Employee</MenuItem>
          <MenuItem value={2}>Manager</MenuItem>
          <MenuItem value={3}>Administrator</MenuItem>
        </TextField>

        {/* Upload button */}
        <Button
          variant="contained"
          onClick={uploadFile}
          startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
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