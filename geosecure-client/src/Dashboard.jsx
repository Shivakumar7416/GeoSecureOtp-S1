import React, { useEffect, useState } from "react";
import AdminGeoBoundary from "./AdminGeoBoundary";
import AdminCreateUser from "./AdminCreateUser";
import AdminFileUpload from "./AdminFileUpload";
import AdminUsers from "./AdminUsers";

import { authedFetch, clearToken, getToken } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Paper,
  Divider,
  Button,
  CircularProgress,
  Stack,
  Fade,
  Tooltip,
} from "@mui/material";

import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import GroupIcon from "@mui/icons-material/Group";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ShieldIcon from "@mui/icons-material/Shield";

import "./dashboard.css";

const NAV_ITEMS = [
  { key: "files", label: "Files", icon: <FolderOpenIcon sx={{ fontSize: 16 }} />, adminOnly: false },
  { key: "users", label: "Users", icon: <GroupIcon sx={{ fontSize: 16 }} />, adminOnly: true },
  { key: "create", label: "Create User", icon: <PersonAddIcon sx={{ fontSize: 16 }} />, adminOnly: true },
  { key: "geo", label: "Geo Boundary", icon: <MyLocationIcon sx={{ fontSize: 16 }} />, adminOnly: true },
  { key: "upload", label: "Upload File", icon: <CloudUploadIcon sx={{ fontSize: 16 }} />, adminOnly: true },
];

const inputSx = {
  "& .MuiInputBase-root": {
    borderRadius: "8px",
    bgcolor: "rgba(7,13,26,0.8)",
    color: "#e8edf5",
    fontSize: "0.85rem",
  },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.15)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.35)" },
  "& .MuiInputLabel-root": { color: "#7a8ba8", fontSize: "0.85rem" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.15)",
  },
};

export default function Dashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeSection, setActiveSection] = useState("files");
  const [openViewer, setOpenViewer] = useState(false);
  const [activeFile, setActiveFile] = useState(null);

  async function loadProfile() {
    try {
      const res = await authedFetch(`${API_BASE}/profile`);

      if (!res.ok) {
        if (res.status === 403 && res.json?.error === "user-disabled") {
          alert("Your account is disabled. Please contact admin.");
        }
        throw new Error();
      }

      setProfile(res.json);
    } catch {
      clearToken();
      onLogout();
    }
  }

  async function loadFiles() {
    const res = await authedFetch(`${API_BASE}/files`);
    if (res.ok) setFiles(res.json);
  }

  async function viewFile(file) {
    if (!navigator.geolocation) {
      return alert("Geolocation not supported");
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const token = getToken();

        const res = await fetch(
          `${API_BASE}/files/${file.id}/download`,
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          return alert(
            err.error === "outside-allowed-location"
              ? "Access denied: Outside allowed location"
              : "Unauthorized"
          );
        }

        const blob = await res.blob();
        const ext = file.filename.split(".").pop().toLowerCase();
        const url = URL.createObjectURL(blob);

        let textContent = null;
        if (["xml", "txt"].includes(ext)) {
          textContent = await blob.text();
        }

        setActiveFile({ ...file, ext, url, textContent });
        setOpenViewer(true);
      },
      () => alert("Location permission denied")
    );
  }

  async function changeAccess(file) {
    const level = prompt(
      "Enter access level:\n1 = Employee\n2 = Manager\n3 = Administrator",
      file.min_access_level || 1
    );
    if (!level) return;

    const res = await authedFetch(
      `${API_BASE}/admin/files/${file.id}/access`,
      { method: "PUT", body: { accessLevel: Number(level) } }
    );

    if (res.ok) loadFiles();
  }

  async function deleteFile(file) {
    if (!window.confirm(`Delete "${file.filename}"?`)) return;

    const res = await authedFetch(
      `${API_BASE}/admin/files/${file.id}`,
      { method: "DELETE" }
    );

    if (res.ok) loadFiles();
  }

  useEffect(() => {
    (async () => {
      await loadProfile();
      await loadFiles();
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <Box className="center">
        <CircularProgress size={32} sx={{ color: "#3b82f6" }} />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box className="center">
        <Paper className="glass-card">
          <Typography sx={{ mb: 2 }}>{error}</Typography>
          <Button variant="contained" onClick={onLogout}>
            Login again
          </Button>
        </Paper>
      </Box>
    );
  }

  const isAdmin = profile.accessLevel === 3;

  function roleName(level) {
    if (level === 1) return "Employee";
    if (level === 2) return "Manager";
    return "Administrator";
  }

  return (
    <Fade in>
      <Box className="dashboard-grid">
        {/* ── SIDEBAR ── */}
        <aside className="sidebar glass">
          {/* Logo */}
          <div className="sidebar-logo">
            <ShieldIcon sx={{ fontSize: 16 }} />
            GeoSecureOTP
          </div>

          {/* Profile */}
          <div className="profile-mini">
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: "rgba(59,130,246,0.15)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "#3b82f6",
              }}
            >
              {isAdmin
                ? <AdminPanelSettingsIcon sx={{ fontSize: 17 }} />
                : <PersonIcon sx={{ fontSize: 17 }} />}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <strong>{profile.email}</strong>
              <div className="muted">{roleName(profile.accessLevel)}</div>
            </div>
          </div>

          {/* Nav label */}
          <div className="nav-label">Navigation</div>

          {/* Nav items */}
          {NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin).map((n) => (
            <button
              key={n.key}
              className={activeSection === n.key ? "active" : ""}
              onClick={() => setActiveSection(n.key)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </button>
          ))}

          {/* Footer actions */}
          <div className="nav-footer">
            <Tooltip title="Refresh">
              <button onClick={loadFiles}>
                <RefreshIcon sx={{ fontSize: 15 }} />
                Refresh
              </button>
            </Tooltip>
            <Tooltip title="Logout">
              <button onClick={onLogout}>
                <LogoutIcon sx={{ fontSize: 15 }} />
                Logout
              </button>
            </Tooltip>
          </div>
        </aside>

        {/* ── CONTENT ── */}
        <main className="content">

          {/* USERS */}
          {activeSection === "users" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon">
                  <GroupIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <div className="card-title">User Management</div>
                  <div className="card-subtitle">Manage roles and access</div>
                </div>
              </div>
              <AdminUsers />
            </Paper>
          )}

          {/* CREATE USER */}
          {activeSection === "create" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon">
                  <PersonAddIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <div className="card-title">Create New User</div>
                  <div className="card-subtitle">Add a user to the system</div>
                </div>
              </div>
              <AdminCreateUser />
            </Paper>
          )}

          {/* GEO BOUNDARY */}
          {activeSection === "geo" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon">
                  <MyLocationIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <div className="card-title">Geo Boundary</div>
                  <div className="card-subtitle">Set the allowed access zone</div>
                </div>
              </div>
              <AdminGeoBoundary />
            </Paper>
          )}

          {/* UPLOAD FILE */}
          {activeSection === "upload" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon">
                  <CloudUploadIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <div className="card-title">Upload Secure File</div>
                  <div className="card-subtitle">Add a file with access controls</div>
                </div>
              </div>
              <AdminFileUpload onUploaded={loadFiles} />
            </Paper>
          )}

          {/* FILES */}
          {activeSection === "files" && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon">
                  <FolderOpenIcon sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <div className="card-title">Secure Files</div>
                  <div className="card-subtitle">{files.length} file{files.length !== 1 ? "s" : ""} available</div>
                </div>
              </div>

              {files.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 6,
                    color: "#45566e",
                  }}
                >
                  <FolderOpenIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
                  <Typography sx={{ fontSize: "0.85rem" }}>No files available</Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {files.map((f) => (
                    <Paper key={f.id} className="glass-file">
                      <div className="file-icon-wrap">
                        <InsertDriveFileIcon sx={{ fontSize: 16 }} />
                      </div>

                      <Typography
                        sx={{
                          flexGrow: 1,
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          color: "#e8edf5",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {f.filename}
                      </Typography>

                      <Button
                        size="small"
                        startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                        onClick={() => viewFile(f)}
                        sx={{
                          bgcolor: "rgba(59,130,246,0.08)",
                          color: "#3b82f6",
                          border: "1px solid rgba(59,130,246,0.2)",
                          "&:hover": { bgcolor: "rgba(59,130,246,0.16)" },
                          px: 1.5,
                        }}
                      >
                        View
                      </Button>

                      {isAdmin && (
                        <>
                          <Button
                            size="small"
                            startIcon={<LockIcon sx={{ fontSize: 14 }} />}
                            color="warning"
                            onClick={() => changeAccess(f)}
                            sx={{
                              bgcolor: "rgba(245,158,11,0.08)",
                              border: "1px solid rgba(245,158,11,0.2)",
                              "&:hover": { bgcolor: "rgba(245,158,11,0.16)" },
                              px: 1.5,
                            }}
                          >
                            Access
                          </Button>
                          <Button
                            size="small"
                            startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                            color="error"
                            onClick={() => deleteFile(f)}
                            sx={{
                              bgcolor: "rgba(239,68,68,0.08)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              "&:hover": { bgcolor: "rgba(239,68,68,0.16)" },
                              px: 1.5,
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          )}
        </main>

        {/* ── FILE VIEWER ── */}
        {openViewer && activeFile && (
          <div className="viewer-overlay">
            <div className="viewer">
              {activeFile.ext === "pdf" && <iframe src={activeFile.url} title={activeFile.filename} />}
              {["png", "jpg", "jpeg", "gif", "webp"].includes(activeFile.ext) && (
                <img src={activeFile.url} alt={activeFile.filename} />
              )}
              {["xml", "txt"].includes(activeFile.ext) && (
                <pre>{activeFile.textContent}</pre>
              )}
            </div>

            <Button
              className="viewer-close"
              variant="contained"
              onClick={() => {
                URL.revokeObjectURL(activeFile.url);
                setActiveFile(null);
                setOpenViewer(false);
              }}
              sx={{
                bgcolor: "rgba(239,68,68,0.9)",
                "&:hover": { bgcolor: "#ef4444" },
              }}
            >
              Close
            </Button>
          </div>
        )}
      </Box>
    </Fade>
  );
}