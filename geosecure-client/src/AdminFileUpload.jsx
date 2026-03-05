import React, { useState, useEffect } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";

import {
  Box, Typography, Button, MenuItem, TextField,
  Snackbar, Alert, Stack, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from "@mui/material";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import FolderIcon from "@mui/icons-material/Folder";
import AddIcon from "@mui/icons-material/Add";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

const inputSx = {
  "& .MuiInputBase-root": { borderRadius: "8px", bgcolor: "rgba(7,13,26,0.8)", color: "#e8edf5", fontSize: "0.82rem", fontFamily: "'Sora', sans-serif" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.15)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.35)" },
  "& .MuiInputLabel-root": { color: "#7a8ba8", fontSize: "0.82rem", fontFamily: "'Sora', sans-serif" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3b82f6", boxShadow: "0 0 0 3px rgba(59,130,246,0.15)" },
  "& .MuiSelect-icon": { color: "#7a8ba8" },
};

export default function AdminFileUpload({ onUploaded }) {
  const [file, setFile]           = useState(null);
  const [level, setLevel]         = useState(1);
  const [folders, setFolders]     = useState([]);
  const [folderId, setFolderId]   = useState("");
  const [snack, setSnack]         = useState({ open: false, msg: "", type: "success" });
  const [createOpen, setCreateOpen]     = useState(false);
  const [newFolderName, setNewFolderName]   = useState("");
  const [newFolderColor, setNewFolderColor] = useState(COLORS[0]);

  async function loadFolders() {
    const res = await authedFetch(`${API_BASE}/folders`);
    if (res.ok) setFolders(res.json);
  }

  useEffect(() => { loadFolders(); }, []);

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const res = await authedFetch(`${API_BASE}/admin/folders`, {
      method: "POST",
      body: { name: newFolderName.trim(), icon: "folder", color: newFolderColor },
    });
    if (res.ok) {
      setSnack({ open: true, msg: `Folder "${newFolderName}" created`, type: "success" });
      setCreateOpen(false);
      setNewFolderName("");
      await loadFolders();
      setFolderId(res.json.id);
    } else {
      setSnack({ open: true, msg: "Failed to create folder", type: "error" });
    }
  }

  async function uploadFile() {
    if (!file) { setSnack({ open: true, msg: "Select a file first", type: "error" }); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("minAccessLevel", level);
    if (folderId) fd.append("folderId", folderId);
    const res = await authedFetch(`${API_BASE}/admin/upload-file`, { method: "POST", body: fd });
    if (res.ok) {
      setSnack({ open: true, msg: "File uploaded successfully", type: "success" });
      setFile(null); setFolderId("");
      onUploaded && onUploaded();
    } else {
      setSnack({ open: true, msg: "Upload failed", type: "error" });
    }
  }

  const selectedFolder = folders.find(f => f.id === folderId);

  return (
    <Box>
      <Stack spacing={2.5}>
        {/* File drop zone */}
        <Box component="label" sx={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 1, height: 110, border: "1.5px dashed",
          borderColor: file ? "rgba(59,130,246,0.5)" : "rgba(99,155,255,0.2)",
          borderRadius: "10px", bgcolor: file ? "rgba(59,130,246,0.05)" : "rgba(7,13,26,0.6)",
          cursor: "pointer", transition: "all 0.2s ease",
          "&:hover": { borderColor: "rgba(59,130,246,0.45)", bgcolor: "rgba(59,130,246,0.05)" },
        }}>
          <input type="file" hidden onChange={e => setFile(e.target.files[0])} />
          {file ? (
            <>
              <InsertDriveFileIcon sx={{ fontSize: 26, color: "#3b82f6" }} />
              <Typography sx={{ fontSize: "0.78rem", color: "#3b82f6", fontWeight: 600, fontFamily: "'Sora',sans-serif" }}>{file.name}</Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "#7a8ba8", fontFamily: "'Sora',sans-serif" }}>{(file.size / 1024).toFixed(1)} KB · click to change</Typography>
            </>
          ) : (
            <>
              <CloudUploadIcon sx={{ fontSize: 26, color: "#45566e" }} />
              <Typography sx={{ fontSize: "0.78rem", color: "#7a8ba8", fontWeight: 500, fontFamily: "'Sora',sans-serif" }}>Click to select a file</Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "#45566e", fontFamily: "'Sora',sans-serif" }}>PDF, image, text and more</Typography>
            </>
          )}
        </Box>

        {/* Access level */}
        <TextField select label="Minimum Access Level" value={level} onChange={e => setLevel(Number(e.target.value))} fullWidth sx={inputSx}>
          <MenuItem value={1}>Employee</MenuItem>
          <MenuItem value={2}>Manager</MenuItem>
          <MenuItem value={3}>Administrator</MenuItem>
        </TextField>

        {/* Folder picker */}
        <Box>
          <Divider sx={{ borderColor: "rgba(99,155,255,0.08)", mb: 2 }}>
            <Typography sx={{ fontSize: "0.65rem", color: "#45566e", fontFamily: "'Sora',sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", px: 1 }}>
              Add to Folder (optional)
            </Typography>
          </Divider>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, mb: 1.5 }}>
            {/* No folder */}
            <Box onClick={() => setFolderId("")} sx={{
              display: "flex", alignItems: "center", gap: 0.7, px: 1.2, py: 0.7,
              borderRadius: "8px", cursor: "pointer", border: "1px solid",
              borderColor: folderId === "" ? "rgba(99,155,255,0.4)" : "rgba(99,155,255,0.12)",
              bgcolor: folderId === "" ? "rgba(99,155,255,0.1)" : "transparent", transition: "all 0.15s",
              "&:hover": { borderColor: "rgba(99,155,255,0.3)" },
            }}>
              <FolderIcon sx={{ fontSize: 13, color: "#45566e" }} />
              <Typography sx={{ fontSize: "0.72rem", color: folderId === "" ? "#e8edf5" : "#7a8ba8", fontFamily: "'Sora',sans-serif", fontWeight: 500 }}>No folder</Typography>
            </Box>

            {folders.map(fo => (
              <Box key={fo.id} onClick={() => setFolderId(fo.id)} sx={{
                display: "flex", alignItems: "center", gap: 0.7, px: 1.2, py: 0.7,
                borderRadius: "8px", cursor: "pointer", border: "1px solid",
                borderColor: folderId === fo.id ? `${fo.color}60` : "rgba(99,155,255,0.12)",
                bgcolor: folderId === fo.id ? `${fo.color}15` : "transparent", transition: "all 0.15s",
                "&:hover": { borderColor: `${fo.color}40` },
              }}>
                <FolderIcon sx={{ fontSize: 13, color: fo.color }} />
                <Typography sx={{ fontSize: "0.72rem", color: folderId === fo.id ? "#e8edf5" : "#7a8ba8", fontFamily: "'Sora',sans-serif", fontWeight: 500 }}>{fo.name}</Typography>
              </Box>
            ))}

            {/* Create new */}
            <Box onClick={() => setCreateOpen(true)} sx={{
              display: "flex", alignItems: "center", gap: 0.7, px: 1.2, py: 0.7,
              borderRadius: "8px", cursor: "pointer", border: "1px dashed rgba(59,130,246,0.25)",
              bgcolor: "transparent", transition: "all 0.15s",
              "&:hover": { borderColor: "rgba(59,130,246,0.5)", bgcolor: "rgba(59,130,246,0.06)" },
            }}>
              <AddIcon sx={{ fontSize: 13, color: "#3b82f6" }} />
              <Typography sx={{ fontSize: "0.72rem", color: "#3b82f6", fontFamily: "'Sora',sans-serif", fontWeight: 600 }}>New folder</Typography>
            </Box>
          </Box>

          {selectedFolder && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: "7px 12px", bgcolor: `${selectedFolder.color}10`, border: `1px solid ${selectedFolder.color}30`, borderRadius: "8px" }}>
              <FolderIcon sx={{ fontSize: 13, color: selectedFolder.color }} />
              <Typography sx={{ fontSize: "0.72rem", color: selectedFolder.color, fontFamily: "'Sora',sans-serif", fontWeight: 600 }}>
                Will be added to: {selectedFolder.name}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Upload button */}
        <Button variant="contained" onClick={uploadFile} startIcon={<CloudUploadIcon sx={{ fontSize: 15 }} />}
          sx={{
            py: 1.1, borderRadius: "8px", fontWeight: 700, fontFamily: "'Sora', sans-serif",
            fontSize: "0.78rem", textTransform: "none",
            background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            boxShadow: "0 4px 20px rgba(59,130,246,0.25)",
            "&:hover": { background: "linear-gradient(135deg, #1e40af, #2563eb)" },
          }}>
          Upload File
        </Button>
      </Stack>

      {/* Create Folder Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}
        PaperProps={{ sx: { bgcolor: "#0d1626", border: "1px solid rgba(99,155,255,0.15)", borderRadius: "12px", minWidth: 320 } }}>
        <DialogTitle sx={{ fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", fontWeight: 700, color: "#e8edf5", pb: 1 }}>
          <CreateNewFolderIcon sx={{ fontSize: 15, mr: 1, verticalAlign: "middle", color: "#3b82f6" }} />
          Create New Folder
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              fullWidth sx={inputSx} placeholder="e.g. Reports, Images, Legal" />
            <Box>
              <Typography sx={{ fontSize: "0.7rem", color: "#7a8ba8", fontFamily: "'Sora',sans-serif", mb: 1 }}>Color</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {COLORS.map(c => (
                  <Box key={c} onClick={() => setNewFolderColor(c)} sx={{
                    width: 22, height: 22, borderRadius: "50%", bgcolor: c, cursor: "pointer",
                    border: newFolderColor === c ? "2px solid #fff" : "2px solid transparent",
                    boxShadow: newFolderColor === c ? `0 0 0 2px ${c}` : "none", transition: "all 0.15s",
                  }} />
                ))}
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: "8px 12px", bgcolor: `${newFolderColor}12`, border: `1px solid ${newFolderColor}30`, borderRadius: "8px" }}>
              <FolderIcon sx={{ color: newFolderColor, fontSize: 16 }} />
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#e8edf5", fontFamily: "'Sora',sans-serif" }}>
                {newFolderName || "Folder preview"}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: "#7a8ba8", fontFamily: "'Sora',sans-serif", textTransform: "none", fontSize: "0.75rem" }}>Cancel</Button>
          <Button onClick={createFolder} disabled={!newFolderName.trim()}
            sx={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", fontFamily: "'Sora',sans-serif", textTransform: "none", fontSize: "0.75rem", borderRadius: "7px", px: 2, "&:hover": { background: "linear-gradient(135deg,#1e40af,#2563eb)" } }}>
            Create Folder
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.type}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}