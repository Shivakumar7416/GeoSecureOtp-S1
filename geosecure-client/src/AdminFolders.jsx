import React, { useState, useEffect } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";
import {
  Box, Typography, Stack, Paper, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, Snackbar, Alert,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

const COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

const inputSx = {
  "& .MuiInputBase-root": { borderRadius: "8px", bgcolor: "rgba(7,13,26,0.8)", color: "#e8edf5", fontSize: "0.85rem", fontFamily: "'Sora',sans-serif" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.15)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.35)" },
  "& .MuiInputLabel-root": { color: "#7a8ba8", fontSize: "0.85rem", fontFamily: "'Sora',sans-serif" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3b82f6", boxShadow: "0 0 0 3px rgba(59,130,246,0.15)" },
};

export default function AdminFolders({ onFoldersChanged }) {
  const [folders, setFolders]   = useState([]);
  const [fileCounts, setFileCounts] = useState({});
  const [dialog, setDialog]     = useState(false);
  const [editing, setEditing]   = useState(null);
  const [name, setName]         = useState("");
  const [color, setColor]       = useState(COLORS[0]);
  const [snack, setSnack]       = useState({ open: false, msg: "", type: "success" });

  async function load() {
    const res = await authedFetch(`${API_BASE}/admin/folders`);
    if (res.ok) setFolders(res.json);

    // Get file counts per folder
    const fr = await authedFetch(`${API_BASE}/files/with-folders`);
    if (fr.ok) {
      const counts = {};
      fr.json.forEach(f => {
        if (f.folder_id) counts[f.folder_id] = (counts[f.folder_id] || 0) + 1;
      });
      setFileCounts(counts);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setName(""); setColor(COLORS[0]); setDialog(true); }
  function openEdit(f)  { setEditing(f); setName(f.name); setColor(f.color); setDialog(true); }

  async function save() {
    if (!name.trim()) return;
    let res;
    if (editing) {
      res = await authedFetch(`${API_BASE}/admin/folders/${editing.id}`, { method: "PUT", body: { name, icon: "folder", color } });
    } else {
      res = await authedFetch(`${API_BASE}/admin/folders`, { method: "POST", body: { name, icon: "folder", color } });
    }
    if (res.ok) {
      setSnack({ open: true, msg: editing ? "Folder updated" : "Folder created", type: "success" });
      setDialog(false); load(); onFoldersChanged && onFoldersChanged();
    } else {
      setSnack({ open: true, msg: "Failed to save folder", type: "error" });
    }
  }

  async function deleteFolder(f) {
    if (!window.confirm(`Delete folder "${f.name}"? Files inside will be unassigned.`)) return;
    const res = await authedFetch(`${API_BASE}/admin/folders/${f.id}`, { method: "DELETE" });
    if (res.ok) { load(); onFoldersChanged && onFoldersChanged(); }
  }

  return (
    <Box>
      {/* Header row */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button size="small" startIcon={<AddIcon sx={{ fontSize: 15 }} />} onClick={openCreate}
          sx={{ fontFamily: "'Sora',sans-serif", fontSize: "0.78rem", fontWeight: 600, textTransform: "none",
            background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", px: 2, py: 0.8, borderRadius: "8px",
            boxShadow: "0 4px 14px rgba(59,130,246,0.25)", "&:hover": { background: "linear-gradient(135deg,#1e40af,#2563eb)" } }}>
          New Folder
        </Button>
      </Box>

      {folders.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 5, color: "#45566e" }}>
          <FolderIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
          <Typography sx={{ fontSize: "0.85rem", fontFamily: "'Sora',sans-serif" }}>No folders yet. Create one to organise files.</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {folders.map(f => (
            <Paper key={f.id} sx={{
              display: "flex", alignItems: "center", gap: 2,
              p: "14px 16px", bgcolor: "rgba(7,13,26,0.5)",
              border: `1px solid rgba(99,155,255,0.1)`, borderRadius: "10px",
              "&:hover": { borderColor: `${f.color}50` },
              transition: "border-color 0.15s",
            }}>
              {/* Folder icon */}
              <Box sx={{ width: 36, height: 36, borderRadius: "8px", bgcolor: `${f.color}18`, border: `1px solid ${f.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FolderIcon sx={{ fontSize: 18, color: f.color }} />
              </Box>

              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#e8edf5", fontFamily: "'Sora',sans-serif" }}>{f.name}</Typography>
              </Box>

              {/* File count badge */}
              <Chip
                icon={<InsertDriveFileIcon sx={{ fontSize: "13px !important", color: `${f.color} !important` }} />}
                label={`${fileCounts[f.id] || 0} file${fileCounts[f.id] !== 1 ? "s" : ""}`}
                size="small"
                sx={{ height: 22, fontSize: "0.68rem", fontFamily: "'Sora',sans-serif", bgcolor: `${f.color}18`, color: f.color, border: `1px solid ${f.color}40`, borderRadius: "6px" }}
              />

              <IconButton size="small" onClick={() => openEdit(f)} sx={{ color: "#7a8ba8", "&:hover": { color: "#3b82f6" }, p: 0.6 }}>
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" onClick={() => deleteFolder(f)} sx={{ color: "#7a8ba8", "&:hover": { color: "#ef4444" }, p: 0.6 }}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} PaperProps={{
        sx: { bgcolor: "#0d1626", border: "1px solid rgba(99,155,255,0.15)", borderRadius: "12px", minWidth: 340 }
      }}>
        <DialogTitle sx={{ fontFamily: "'Sora',sans-serif", fontSize: "0.95rem", fontWeight: 700, color: "#e8edf5", pb: 1 }}>
          {editing ? "Edit Folder" : "Create Folder"}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Folder Name" value={name} onChange={e => setName(e.target.value)} fullWidth sx={inputSx} placeholder="e.g. Important, Images, PDFs" />

            {/* Color picker */}
            <Box>
              <Typography sx={{ fontSize: "0.75rem", color: "#7a8ba8", fontFamily: "'Sora',sans-serif", mb: 1 }}>Folder Color</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {COLORS.map(c => (
                  <Box key={c} onClick={() => setColor(c)} sx={{
                    width: 28, height: 28, borderRadius: "50%", bgcolor: c, cursor: "pointer",
                    border: color === c ? `2px solid #fff` : "2px solid transparent",
                    boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
                    transition: "all 0.15s",
                  }} />
                ))}
              </Box>
            </Box>

            {/* Preview */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, bgcolor: `${color}12`, border: `1px solid ${color}30`, borderRadius: "8px" }}>
              <FolderIcon sx={{ color, fontSize: 22 }} />
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#e8edf5", fontFamily: "'Sora',sans-serif" }}>
                {name || "Folder Name"}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDialog(false)} sx={{ color: "#7a8ba8", fontFamily: "'Sora',sans-serif", textTransform: "none", fontSize: "0.8rem" }}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim()}
            sx={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", fontFamily: "'Sora',sans-serif", textTransform: "none", fontSize: "0.8rem", borderRadius: "7px", px: 2, "&:hover": { background: "linear-gradient(135deg,#1e40af,#2563eb)" } }}>
            {editing ? "Save Changes" : "Create Folder"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.type}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}