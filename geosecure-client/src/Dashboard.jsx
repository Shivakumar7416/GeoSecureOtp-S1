import React, { useEffect, useState, useRef } from "react";
import AdminGeoBoundary from "./AdminGeoBoundary";
import AdminCreateUser from "./AdminCreateUser";
import AdminFileUpload from "./AdminFileUpload";
import AdminUsers from "./AdminUsers";
import AdminLogs from "./AdminLogs";

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
  Badge,
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
import AssignmentIcon from "@mui/icons-material/Assignment";

import "./dashboard.css";

export default function Dashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeSection, setActiveSection] = useState("files");
  const [openViewer, setOpenViewer] = useState(false);
  const [activeFile, setActiveFile] = useState(null);

  // Unread denied log badge
  const [unreadDenied, setUnreadDenied] = useState(0);
  const lastSeenRef = useRef(Date.now());
  const pollRef = useRef(null);

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

  async function pollUnread() {
    const res = await authedFetch(
      `${API_BASE}/admin/logs/unread-count?since=${lastSeenRef.current}`
    );
    if (res.ok) setUnreadDenied(res.json.count || 0);
  }

  function handleLogsOpen() {
    setActiveSection("logs");
    lastSeenRef.current = Date.now();
    setUnreadDenied(0);
  }

  function handleUnreadReset() {
    lastSeenRef.current = Date.now();
    setUnreadDenied(0);
  }

  async function viewFile(file) {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const token = getToken();
        const res = await fetch(`${API_BASE}/files/${file.id}/download`, {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        });
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
        if (["xml", "txt"].includes(ext)) textContent = await blob.text();
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
    const res = await authedFetch(`${API_BASE}/admin/files/${file.id}/access`, {
      method: "PUT", body: { accessLevel: Number(level) },
    });
    if (res.ok) loadFiles();
  }

  async function deleteFile(file) {
    if (!window.confirm(`Delete "${file.filename}"?`)) return;
    const res = await authedFetch(`${API_BASE}/admin/files/${file.id}`, { method: "DELETE" });
    if (res.ok) loadFiles();
  }

  useEffect(() => {
    (async () => {
      await loadProfile();
      await loadFiles();
      setLoading(false);
    })();
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (profile?.accessLevel === 3) {
      pollUnread();
      pollRef.current = setInterval(pollUnread, 30000);
    }
  }, [profile]);

  if (loading) {
    return <Box className="center"><CircularProgress size={32} sx={{ color: "#3b82f6" }} /></Box>;
  }
  if (error || !profile) {
    return (
      <Box className="center">
        <Paper className="glass-card">
          <Typography sx={{ mb: 2 }}>{error}</Typography>
          <Button variant="contained" onClick={onLogout}>Login again</Button>
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

  const NAV_ITEMS = [
    { key: "files",  label: "Files",        icon: <FolderOpenIcon sx={{ fontSize: 16 }} />,  adminOnly: false },
    { key: "users",  label: "Users",         icon: <GroupIcon sx={{ fontSize: 16 }} />,        adminOnly: true  },
    { key: "create", label: "Create User",   icon: <PersonAddIcon sx={{ fontSize: 16 }} />,    adminOnly: true  },
    { key: "geo",    label: "Geo Boundary",  icon: <MyLocationIcon sx={{ fontSize: 16 }} />,   adminOnly: true  },
    { key: "upload", label: "Upload File",   icon: <CloudUploadIcon sx={{ fontSize: 16 }} />,  adminOnly: true  },
    { key: "logs",   label: "Access Logs",   icon: <AssignmentIcon sx={{ fontSize: 16 }} />,   adminOnly: true,
      badge: unreadDenied, onClick: handleLogsOpen },
  ];

  return (
    <Fade in>
      <Box className="dashboard-grid">
        {/* SIDEBAR */}
        <aside className="sidebar glass">
          <div className="sidebar-logo">
            <ShieldIcon sx={{ fontSize: 16 }} />
            GeoSecureOTP
          </div>

          <div className="profile-mini">
            <Avatar sx={{ width: 34, height: 34, bgcolor: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
              {isAdmin ? <AdminPanelSettingsIcon sx={{ fontSize: 17 }} /> : <PersonIcon sx={{ fontSize: 17 }} />}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <strong>{profile.email}</strong>
              <div className="muted">{roleName(profile.accessLevel)}</div>
            </div>
          </div>

          <div className="nav-label">Navigation</div>

          {NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin).map((n) => (
            <button
              key={n.key}
              className={activeSection === n.key ? "active" : ""}
              onClick={n.onClick ? n.onClick : () => setActiveSection(n.key)}
            >
              <span className="nav-icon">
                {n.badge > 0 ? (
                  <Badge badgeContent={n.badge} max={99} sx={{ "& .MuiBadge-badge": { bgcolor: "#ef4444", color: "#fff", fontSize: "0.55rem", minWidth: 14, height: 14, padding: "0 3px" } }}>
                    {n.icon}
                  </Badge>
                ) : n.icon}
              </span>
              {n.label}
              {n.badge > 0 && (
                <Box component="span" sx={{ ml: "auto", bgcolor: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", fontSize: "0.6rem", fontWeight: 700, px: 0.8, py: 0.2, lineHeight: 1.4 }}>
                  {n.badge} new
                </Box>
              )}
            </button>
          ))}

          <div className="nav-footer">
            <Tooltip title="Refresh">
              <button onClick={loadFiles}><RefreshIcon sx={{ fontSize: 15 }} />Refresh</button>
            </Tooltip>
            <Tooltip title="Logout">
              <button onClick={onLogout}><LogoutIcon sx={{ fontSize: 15 }} />Logout</button>
            </Tooltip>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="content">

          {activeSection === "users" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon"><GroupIcon sx={{ fontSize: 18 }} /></div>
                <div><div className="card-title">User Management</div><div className="card-subtitle">Manage roles and access</div></div>
              </div>
              <AdminUsers />
            </Paper>
          )}

          {activeSection === "create" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon"><PersonAddIcon sx={{ fontSize: 18 }} /></div>
                <div><div className="card-title">Create New User</div><div className="card-subtitle">Add a user to the system</div></div>
              </div>
              <AdminCreateUser />
            </Paper>
          )}

          {activeSection === "geo" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon"><MyLocationIcon sx={{ fontSize: 18 }} /></div>
                <div><div className="card-title">Geo Boundary</div><div className="card-subtitle">Set the allowed access zone</div></div>
              </div>
              <AdminGeoBoundary />
            </Paper>
          )}

          {activeSection === "upload" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon"><CloudUploadIcon sx={{ fontSize: 18 }} /></div>
                <div><div className="card-title">Upload Secure File</div><div className="card-subtitle">Add a file with access controls</div></div>
              </div>
              <AdminFileUpload onUploaded={loadFiles} />
            </Paper>
          )}

          {activeSection === "logs" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon"><AssignmentIcon sx={{ fontSize: 18 }} /></div>
                <div><div className="card-title">Access Logs</div><div className="card-subtitle">File access history — location, IP & timestamps</div></div>
              </div>
              <AdminLogs onUnreadReset={handleUnreadReset} />
            </Paper>
          )}

          {activeSection === "files" && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon"><FolderOpenIcon sx={{ fontSize: 18 }} /></div>
                <div><div className="card-title">Secure Files</div><div className="card-subtitle">{files.length} file{files.length !== 1 ? "s" : ""} available</div></div>
              </div>

              {files.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6, color: "#45566e" }}>
                  <FolderOpenIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
                  <Typography sx={{ fontSize: "0.85rem" }}>No files available</Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {files.map((f) => (
                    <Paper key={f.id} className="glass-file">
                      <div className="file-icon-wrap"><InsertDriveFileIcon sx={{ fontSize: 16 }} /></div>
                      <Typography sx={{ flexGrow: 1, fontSize: "0.85rem", fontWeight: 500, color: "#e8edf5", fontFamily: "'JetBrains Mono', monospace" }}>
                        {f.filename}
                      </Typography>
                      <Button size="small" startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />} onClick={() => viewFile(f)}
                        sx={{ bgcolor: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)", "&:hover": { bgcolor: "rgba(59,130,246,0.16)" }, px: 1.5 }}>
                        View
                      </Button>
                      {isAdmin && (<>
                        <Button size="small" startIcon={<LockIcon sx={{ fontSize: 14 }} />} color="warning" onClick={() => changeAccess(f)}
                          sx={{ bgcolor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", "&:hover": { bgcolor: "rgba(245,158,11,0.16)" }, px: 1.5 }}>
                          Access
                        </Button>
                        <Button size="small" startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />} color="error" onClick={() => deleteFile(f)}
                          sx={{ bgcolor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", "&:hover": { bgcolor: "rgba(239,68,68,0.16)" }, px: 1.5 }}>
                          Delete
                        </Button>
                      </>)}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          )}
        </main>

        {/* FILE VIEWER */}
        {openViewer && activeFile && (
          <div className="viewer-overlay">
            <div className="viewer">
              {activeFile.ext === "pdf" && <iframe src={activeFile.url} title={activeFile.filename} />}
              {["png", "jpg", "jpeg", "gif", "webp"].includes(activeFile.ext) && <img src={activeFile.url} alt={activeFile.filename} />}
              {["xml", "txt"].includes(activeFile.ext) && <pre>{activeFile.textContent}</pre>}
            </div>
            <Button className="viewer-close" variant="contained"
              onClick={() => { URL.revokeObjectURL(activeFile.url); setActiveFile(null); setOpenViewer(false); }}
              sx={{ bgcolor: "rgba(239,68,68,0.9)", "&:hover": { bgcolor: "#ef4444" } }}>
              Close
            </Button>
          </div>
        )}
      </Box>
    </Fade>
  );
}