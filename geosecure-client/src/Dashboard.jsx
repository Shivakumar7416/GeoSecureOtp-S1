import React, { useEffect, useState, useRef, useCallback } from "react";
import AdminGeoBoundary from "./AdminGeoBoundary";
import AdminCreateUser from "./AdminCreateUser";
import AdminFileUpload from "./AdminFileUpload";
import AdminUsers from "./AdminUsers";
import AdminLogs from "./AdminLogs";
import AdminLoginLogs from "./AdminLoginLogs";

import { authedFetch, clearToken, getToken } from "./auth";
import { API_BASE } from "./config";

import {
  Box, Typography, Avatar, Paper, Button,
  CircularProgress, Stack, Fade, Tooltip, Badge,
  TextField, InputAdornment, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select,
  Snackbar, Alert, IconButton, Popover, List, ListItemButton, ListItemIcon,
  ListItemText, Drawer, Divider,
} from "@mui/material";

import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderIcon from "@mui/icons-material/Folder";
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
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsIcon from "@mui/icons-material/Settings";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FolderSpecialIcon from "@mui/icons-material/FolderSpecial";
import CloseIcon from "@mui/icons-material/Close";

import "./dashboard.css";

// ─────────────────────────────────────────────────────────────────────────────
// SECURE VIEWER HOOK
// Attaches / detaches all anti-screenshot, anti-copy protections
// when the viewer is open, and removes them cleanly on close.
// ─────────────────────────────────────────────────────────────────────────────
function useSecureViewer(isOpen) {
  const devtoolsRef = useRef(false);
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // ── 1. Block right-click context menu ──────────────────────────────────
    const blockContext = (e) => e.preventDefault();

    // ── 2. Block dangerous keyboard shortcuts ──────────────────────────────
    const blockKeys = (e) => {
      const key = e.key?.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // PrintScreen
      if (key === "printscreen") { e.preventDefault(); blurContent(); return; }
      // Ctrl+S  (Save)
      if (ctrl && key === "s")   { e.preventDefault(); return; }
      // Ctrl+P  (Print)
      if (ctrl && key === "p")   { e.preventDefault(); return; }
      // Ctrl+Shift+S / Ctrl+Shift+I / Ctrl+Shift+J (DevTools / save)
      if (ctrl && e.shiftKey && ["s","i","j","c"].includes(key)) { e.preventDefault(); return; }
      // F12 (DevTools)
      if (key === "f12")         { e.preventDefault(); return; }
      // Win+Shift+S / Meta+Shift+4 (Snipping Tool / macOS)
      if (e.shiftKey && e.metaKey && ["s","4","3"].includes(key)) { e.preventDefault(); return; }
    };

    // ── 3. Block drag-to-download ───────────────────────────────────────────
    const blockDrag = (e) => e.preventDefault();

    // ── 4. DevTools size detection — hide content if devtools open ─────────
    const devtoolsCheck = () => {
      const threshold = 300;
      const widthDiff  = window.outerWidth  - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      // Require BOTH dimensions to exceed threshold to avoid false positives
      // from browser chrome (bookmarks bar, scrollbars, taskbar, etc.)
      const open = widthDiff > threshold && heightDiff > threshold;
      if (open !== devtoolsRef.current) {
        devtoolsRef.current = open;
        setDevtoolsOpen(open);
      }
    };
    const devtoolsTimer = setInterval(devtoolsCheck, 1000);

    // ── 5. Visibility change — blur when tab loses focus ───────────────────
    const handleVisibility = () => {
      const overlay = document.getElementById("secure-blur-overlay");
      if (overlay) overlay.style.display = document.hidden ? "flex" : "none";
    };

    document.addEventListener("contextmenu",   blockContext, true);
    document.addEventListener("keydown",        blockKeys,   true);
    document.addEventListener("dragstart",      blockDrag,   true);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("contextmenu",   blockContext, true);
      document.removeEventListener("keydown",        blockKeys,   true);
      document.removeEventListener("dragstart",      blockDrag,   true);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(devtoolsTimer);
      setDevtoolsOpen(false);
      devtoolsRef.current = false;
    };
  }, [isOpen]);

  return { devtoolsOpen };
}

function blurContent() {
  const overlay = document.getElementById("secure-blur-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    setTimeout(() => { overlay.style.display = "none"; }, 1500);
  }
}

export default function Dashboard({ onLogout }) {
  const [profile, setProfile]       = useState(null);
  const [files, setFiles]           = useState([]);
  const [folders, setFolders]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [activeSection, setActiveSection] = useState("files");
  const [openViewer, setOpenViewer] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolderFilter, setActiveFolderFilter] = useState(null); // null = all
  const [isDark, setIsDark]         = useState(true);
  const [assignDialog, setAssignDialog] = useState({ open: false, file: null, folderId: "" });
  const [snack, setSnack]           = useState({ open: false, msg: "", type: "success" });
  const [menuAnchor, setMenuAnchor] = useState(null);   // three-dot popover
  const [menuFile, setMenuFile]     = useState(null);   // file the menu belongs to
  const [settingsOpen, setSettingsOpen] = useState(false); // settings drawer
  const [openFolderId, setOpenFolderId] = useState(null);  // which folder is expanded

  // Unread denied log badge
  const [unreadDenied, setUnreadDenied] = useState(0);
  const lastSeenRef = useRef(Date.now());
  const pollRef     = useRef(null);

  // Idle logout — 15 minutes
  const idleTimer = useRef(null);
  const IDLE_MS   = 15 * 60 * 1000;

  function resetIdle() {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      clearToken();
      onLogout();
      alert("Session expired due to inactivity.");
    }, IDLE_MS);
  }

  useEffect(() => {
    const events = ["mousemove","keydown","click","scroll","touchstart"];
    events.forEach(e => window.addEventListener(e, resetIdle));
    resetIdle();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle));
      clearTimeout(idleTimer.current);
    };
  }, []);

  // Theme toggle — apply CSS class to body
  useEffect(() => {
    document.body.classList.toggle("light-theme", !isDark);
  }, [isDark]);

  // ── All anti-screenshot / anti-copy protections ──
  const { devtoolsOpen } = useSecureViewer(openViewer);

  async function loadProfile() {
    try {
      const res = await authedFetch(`${API_BASE}/profile`);
      if (!res.ok) {
        if (res.status === 403 && res.json?.error === "user-disabled")
          alert("Your account is disabled. Please contact admin.");
        throw new Error();
      }
      setProfile(res.json);
    } catch { clearToken(); onLogout(); }
  }

  async function loadFiles() {
    const res = await authedFetch(`${API_BASE}/files/with-folders`);
    if (res.ok) setFiles(res.json);
  }

  async function loadFolders() {
    const res = await authedFetch(`${API_BASE}/folders`);
    if (res.ok) setFolders(res.json);
  }

  async function assignFolder(fileId, folderId) {
    const res = await authedFetch(`${API_BASE}/admin/files/${fileId}/folder`, {
      method: "PUT", body: { folderId: folderId || null },
    });
    if (res.ok) { loadFiles(); setSnack({ open: true, msg: "File moved to folder", type: "success" }); }
    setAssignDialog({ open: false, file: null, folderId: "" });
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
      await loadFolders();
      setLoading(false);
    })();
    return () => { clearInterval(pollRef.current); clearTimeout(idleTimer.current); };
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
    { key: "files",      label: "Files",         icon: <FolderOpenIcon sx={{ fontSize: 16 }} />,   adminOnly: false },
    { key: "users",      label: "Users",          icon: <GroupIcon sx={{ fontSize: 16 }} />,         adminOnly: true  },
    { key: "create",     label: "Create User",    icon: <PersonAddIcon sx={{ fontSize: 16 }} />,     adminOnly: true  },
    { key: "geo",        label: "Geo Boundary",   icon: <MyLocationIcon sx={{ fontSize: 16 }} />,    adminOnly: true  },
    { key: "upload",     label: "Upload File",    icon: <CloudUploadIcon sx={{ fontSize: 16 }} />,   adminOnly: true  },
    { key: "logs",       label: "Access Logs",    icon: <AssignmentIcon sx={{ fontSize: 16 }} />,    adminOnly: true, badge: unreadDenied, onClick: handleLogsOpen },
    { key: "loginlogs",  label: "Login Activity", icon: <HistoryIcon sx={{ fontSize: 16 }} />,       adminOnly: true  },
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
            <Tooltip title="Settings">
              <button onClick={() => setSettingsOpen(true)}>
                <SettingsIcon sx={{ fontSize: 15 }} />Settings
              </button>
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

          {activeSection === "loginlogs" && isAdmin && (
            <Paper className="glass-card">
              <div className="card-header">
                <div className="card-header-icon"><HistoryIcon sx={{ fontSize: 18 }} /></div>
                <div><div className="card-title">Login Activity</div><div className="card-subtitle">OTP requests, logins, failed attempts & lockouts</div></div>
              </div>
              <AdminLoginLogs />
            </Paper>
          )}

          {activeSection === "files" && (() => {
            const filtered = files.filter(f =>
              !searchQuery || f.filename.toLowerCase().includes(searchQuery.toLowerCase())
            );

            // Build folder map: id → { meta, files[] }
            // "unfiled" key for files with no folder
            const folderMap = {};
            filtered.forEach(f => {
              const key = f.folder_id ?? "unfiled";
              if (!folderMap[key]) {
                folderMap[key] = {
                  id: f.folder_id ?? "unfiled",
                  label: f.folder_name || "Unfiled",
                  color: f.folder_color || "#45566e",
                  files: [],
                };
              }
              folderMap[key].files.push(f);
            });

            const folderGroups = Object.values(folderMap);

            return (
              <Paper className="glass-card">
                <div className="card-header">
                  <div className="card-header-icon"><FolderOpenIcon sx={{ fontSize: 18 }} /></div>
                  <div>
                    <div className="card-title">Secure Files</div>
                    <div className="card-subtitle">{files.length} file{files.length !== 1 ? "s" : ""} available</div>
                  </div>
                </div>

                {/* Search */}
                <Box sx={{ mb: 2 }}>
                  <TextField size="small" placeholder="Search files..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 15, color: "#7a8ba8" }} /></InputAdornment> }}
                    sx={{
                      width: "100%",
                      "& .MuiInputBase-root": { borderRadius: "8px", bgcolor: "rgba(7,13,26,0.6)", color: "#e8edf5", fontSize: "0.78rem", height: 34 },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.15)" },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.3)" },
                      "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3b82f6" },
                    }}
                  />
                </Box>

                {folderGroups.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 6, color: "#45566e" }}>
                    <FolderOpenIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
                    <Typography sx={{ fontSize: "0.82rem" }}>No files available</Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {folderGroups.map(group => {
                      const isOpen = openFolderId === group.id;
                      return (
                        <Box key={group.id}>
                          {/* ── Folder row — click to expand ── */}
                          <Box onClick={() => setOpenFolderId(isOpen ? null : group.id)} sx={{
                            display: "flex", alignItems: "center", gap: 1.5,
                            p: "10px 14px", borderRadius: "10px", cursor: "pointer",
                            bgcolor: isOpen ? `${group.color}12` : "rgba(7,13,26,0.4)",
                            border: `1px solid ${isOpen ? group.color + "40" : "rgba(99,155,255,0.1)"}`,
                            transition: "all 0.18s",
                            "&:hover": { bgcolor: `${group.color}0d`, borderColor: `${group.color}35` },
                          }}>
                            <FolderIcon sx={{ fontSize: 17, color: group.color, flexShrink: 0 }} />
                            <Typography sx={{ flexGrow: 1, fontSize: "0.8rem", fontWeight: 600, color: "#e8edf5", fontFamily: "'Sora',sans-serif" }}>
                              {group.label}
                            </Typography>
                            <Chip label={group.files.length} size="small" sx={{
                              height: 18, fontSize: "0.65rem", fontFamily: "'Sora',sans-serif",
                              bgcolor: `${group.color}18`, color: group.color,
                              border: `1px solid ${group.color}35`, borderRadius: "5px",
                              fontWeight: 700,
                            }} />
                            <ChevronRightIcon sx={{
                              fontSize: 16, color: "#7a8ba8", flexShrink: 0,
                              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }} />
                          </Box>

                          {/* ── Files inside folder (revealed on click) ── */}
                          {isOpen && (
                            <Stack spacing={0.8} sx={{ mt: 0.8, pl: 2 }}>
                              {group.files.map(f => (
                                <Paper key={f.id} className="glass-file" sx={{ position: "relative" }}>
                                  <div className="file-icon-wrap"><InsertDriveFileIcon sx={{ fontSize: 15 }} /></div>
                                  <Typography sx={{ flexGrow: 1, fontSize: "0.78rem", fontWeight: 500, color: "#e8edf5", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {f.filename}
                                  </Typography>
                                  {/* Three-dot menu button */}
                                  <IconButton size="small"
                                    onClick={e => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuFile(f); }}
                                    sx={{ color: "#7a8ba8", p: 0.5, "&:hover": { color: "#e8edf5", bgcolor: "rgba(99,155,255,0.1)" } }}>
                                    <MoreVertIcon sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </Paper>
                              ))}
                            </Stack>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            );
          })()}
        </main>

        {/* FILE VIEWER — SECURE */}
        {openViewer && activeFile && (
          <div
            className="viewer-overlay"
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* ── DevTools warning overlay ── */}
            {devtoolsOpen && (
              <Box sx={{
                position: "absolute", inset: 0, zIndex: 10001,
                bgcolor: "#070d1a",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 2,
              }}>
                <ShieldIcon sx={{ fontSize: 48, color: "#ef4444" }} />
                <Typography sx={{ color: "#ef4444", fontWeight: 700, fontSize: "1.1rem", fontFamily: "'Sora',sans-serif" }}>
                  Developer Tools Detected
                </Typography>
                <Typography sx={{ color: "#7a8ba8", fontSize: "0.82rem", fontFamily: "'Sora',sans-serif" }}>
                  File content is hidden while DevTools is open.
                </Typography>
              </Box>
            )}

            {/* ── Tab-blur overlay (shown when user switches tab) ── */}
            <Box
              id="secure-blur-overlay"
              sx={{
                display: "none",
                position: "absolute", inset: 0, zIndex: 10000,
                bgcolor: "rgba(7,13,26,0.97)",
                backdropFilter: "blur(20px)",
                flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 2,
              }}
            >
              <ShieldIcon sx={{ fontSize: 44, color: "#3b82f6" }} />
              <Typography sx={{ color: "#e8edf5", fontWeight: 700, fontFamily: "'Sora',sans-serif" }}>
                Content Hidden
              </Typography>
              <Typography sx={{ color: "#7a8ba8", fontSize: "0.8rem", fontFamily: "'Sora',sans-serif" }}>
                Return to this tab to continue viewing.
              </Typography>
            </Box>

            {/* ── Actual file content ── */}
            <div
              className="viewer"
              style={{
                // Disable text selection across all content
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
                // Disable touch callout on iOS (long-press save)
                WebkitTouchCallout: "none",
                // Pointer events kept on so scrolling still works
              }}
            >
              {activeFile.ext === "pdf" && (
                <iframe
                  src={activeFile.url}
                  title={activeFile.filename}
                  // Disable PDF toolbar (Save / Print buttons inside viewer)
                  style={{ pointerEvents: "auto" }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}

              {["png", "jpg", "jpeg", "gif", "webp"].includes(activeFile.ext) && (
                <img
                  src={activeFile.url}
                  alt={activeFile.filename}
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  style={{ pointerEvents: "none" }}
                />
              )}

              {["xml", "txt"].includes(activeFile.ext) && (
                <pre
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  style={{
                    color: "#e8edf5",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.82rem",
                    overflow: "auto",
                    height: "100%",
                    margin: 0,
                    lineHeight: 1.6,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                  }}
                >
                  {activeFile.textContent}
                </pre>
              )}
            </div>

            {/* ── Security badge + Close button ── */}
            <Box sx={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 1, alignItems: "center" }}>
              <Box sx={{
                display: "flex", alignItems: "center", gap: 0.6,
                bgcolor: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: "8px", px: 1.2, py: 0.5,
              }}>
                <ShieldIcon sx={{ fontSize: 13, color: "#3b82f6" }} />
                <Typography sx={{ fontSize: "0.68rem", color: "#3b82f6", fontWeight: 600, fontFamily: "'Sora',sans-serif" }}>
                  Protected View
                </Typography>
              </Box>

              <Button
                variant="contained"
                onClick={() => {
                  URL.revokeObjectURL(activeFile.url);
                  setActiveFile(null);
                  setOpenViewer(false);
                }}
                sx={{ bgcolor: "rgba(239,68,68,0.9)", "&:hover": { bgcolor: "#ef4444" }, minWidth: 0, px: 2 }}
              >
                Close
              </Button>
            </Box>
          </div>
        )}
        {/* ── THREE-DOT POPOVER ── */}
        <Popover
          open={Boolean(menuAnchor)}
          anchorEl={menuAnchor}
          onClose={() => { setMenuAnchor(null); setMenuFile(null); }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{ sx: { bgcolor: "#0d1626", border: "1px solid rgba(99,155,255,0.15)", borderRadius: "10px", minWidth: 160, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" } }}
        >
          <List dense disablePadding>
            <ListItemButton onClick={() => { viewFile(menuFile); setMenuAnchor(null); setMenuFile(null); }}
              sx={{ px: 2, py: 1.2, gap: 1.5, "&:hover": { bgcolor: "rgba(59,130,246,0.1)" } }}>
              <ListItemIcon sx={{ minWidth: 0 }}><VisibilityIcon sx={{ fontSize: 15, color: "#3b82f6" }} /></ListItemIcon>
              <ListItemText primary="View" primaryTypographyProps={{ fontSize: "0.78rem", fontFamily: "'Sora',sans-serif", color: "#e8edf5" }} />
            </ListItemButton>
            {isAdmin && (<>
              <ListItemButton onClick={() => { setAssignDialog({ open: true, file: menuFile, folderId: menuFile?.folder_id || "" }); setMenuAnchor(null); }}
                sx={{ px: 2, py: 1.2, gap: 1.5, "&:hover": { bgcolor: "rgba(139,92,246,0.1)" } }}>
                <ListItemIcon sx={{ minWidth: 0 }}><FolderSpecialIcon sx={{ fontSize: 15, color: "#8b5cf6" }} /></ListItemIcon>
                <ListItemText primary="Move to folder" primaryTypographyProps={{ fontSize: "0.78rem", fontFamily: "'Sora',sans-serif", color: "#e8edf5" }} />
              </ListItemButton>
              <ListItemButton onClick={() => { changeAccess(menuFile); setMenuAnchor(null); setMenuFile(null); }}
                sx={{ px: 2, py: 1.2, gap: 1.5, "&:hover": { bgcolor: "rgba(245,158,11,0.1)" } }}>
                <ListItemIcon sx={{ minWidth: 0 }}><LockIcon sx={{ fontSize: 15, color: "#f59e0b" }} /></ListItemIcon>
                <ListItemText primary="Change access" primaryTypographyProps={{ fontSize: "0.78rem", fontFamily: "'Sora',sans-serif", color: "#e8edf5" }} />
              </ListItemButton>
              <Divider sx={{ borderColor: "rgba(99,155,255,0.08)" }} />
              <ListItemButton onClick={() => { deleteFile(menuFile); setMenuAnchor(null); setMenuFile(null); }}
                sx={{ px: 2, py: 1.2, gap: 1.5, "&:hover": { bgcolor: "rgba(239,68,68,0.1)" } }}>
                <ListItemIcon sx={{ minWidth: 0 }}><DeleteOutlineIcon sx={{ fontSize: 15, color: "#ef4444" }} /></ListItemIcon>
                <ListItemText primary="Delete" primaryTypographyProps={{ fontSize: "0.78rem", fontFamily: "'Sora',sans-serif", color: "#ef4444" }} />
              </ListItemButton>
            </>)}
          </List>
        </Popover>

        {/* ── SETTINGS DRAWER ── */}
        <Drawer anchor="right" open={settingsOpen} onClose={() => setSettingsOpen(false)}
          PaperProps={{ sx: { width: 280, bgcolor: "#0d1626", borderLeft: "1px solid rgba(99,155,255,0.12)", p: 0 } }}>
          <Box sx={{ p: "20px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(99,155,255,0.08)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SettingsIcon sx={{ fontSize: 16, color: "#3b82f6" }} />
              <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "#e8edf5", fontFamily: "'Sora',sans-serif" }}>Settings</Typography>
            </Box>
            <IconButton size="small" onClick={() => setSettingsOpen(false)} sx={{ color: "#7a8ba8", p: 0.5 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Stack spacing={0} sx={{ p: 2 }}>
            {/* Theme */}
            <Typography sx={{ fontSize: "0.62rem", color: "#45566e", fontFamily: "'Sora',sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", mb: 1, px: 0.5 }}>Appearance</Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2.5 }}>
              {[{ label: "Dark", val: true }, { label: "Light", val: false }].map(opt => (
                <Box key={opt.label} onClick={() => setIsDark(opt.val)} sx={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                  p: 1.5, borderRadius: "10px", cursor: "pointer", border: "1px solid",
                  borderColor: isDark === opt.val ? "rgba(59,130,246,0.5)" : "rgba(99,155,255,0.1)",
                  bgcolor: isDark === opt.val ? "rgba(59,130,246,0.1)" : "transparent",
                  transition: "all 0.15s",
                }}>
                  {opt.val ? <DarkModeIcon sx={{ fontSize: 20, color: isDark === opt.val ? "#3b82f6" : "#45566e" }} />
                           : <LightModeIcon sx={{ fontSize: 20, color: isDark === opt.val ? "#3b82f6" : "#45566e" }} />}
                  <Typography sx={{ fontSize: "0.72rem", fontFamily: "'Sora',sans-serif", color: isDark === opt.val ? "#3b82f6" : "#7a8ba8", fontWeight: 600 }}>{opt.label}</Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ borderColor: "rgba(99,155,255,0.08)", mb: 2 }} />

            {/* Session */}
            <Typography sx={{ fontSize: "0.62rem", color: "#45566e", fontFamily: "'Sora',sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", mb: 1, px: 0.5 }}>Session</Typography>
            <Box sx={{ p: 1.5, bgcolor: "rgba(7,13,26,0.6)", borderRadius: "8px", border: "1px solid rgba(99,155,255,0.08)", mb: 2 }}>
              <Typography sx={{ fontSize: "0.73rem", color: "#7a8ba8", fontFamily: "'Sora',sans-serif" }}>Auto-logout after</Typography>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#e8edf5", fontFamily: "'Sora',sans-serif" }}>15 minutes idle</Typography>
            </Box>

            <Divider sx={{ borderColor: "rgba(99,155,255,0.08)", mb: 2 }} />

            {/* Actions */}
            <Typography sx={{ fontSize: "0.62rem", color: "#45566e", fontFamily: "'Sora',sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", mb: 1, px: 0.5 }}>Actions</Typography>
            <Button fullWidth startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
              onClick={() => { loadFiles(); loadFolders(); setSettingsOpen(false); }}
              sx={{ justifyContent: "flex-start", color: "#7a8ba8", fontFamily: "'Sora',sans-serif", fontSize: "0.78rem", textTransform: "none", mb: 1, p: "8px 12px", borderRadius: "8px", border: "1px solid rgba(99,155,255,0.1)", "&:hover": { color: "#3b82f6", bgcolor: "rgba(59,130,246,0.08)" } }}>
              Refresh Data
            </Button>
            <Button fullWidth startIcon={<LogoutIcon sx={{ fontSize: 15 }} />}
              onClick={onLogout}
              sx={{ justifyContent: "flex-start", color: "#ef4444", fontFamily: "'Sora',sans-serif", fontSize: "0.78rem", textTransform: "none", p: "8px 12px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.15)", "&:hover": { bgcolor: "rgba(239,68,68,0.08)" } }}>
              Logout
            </Button>
          </Stack>
        </Drawer>

        {/* ── ASSIGN FOLDER DIALOG ── */}
        <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, file: null, folderId: "" })}
          PaperProps={{ sx: { bgcolor: "#0d1626", border: "1px solid rgba(99,155,255,0.15)", borderRadius: "12px", minWidth: 320 } }}>
          <DialogTitle sx={{ fontFamily: "'Sora',sans-serif", fontSize: "0.9rem", fontWeight: 700, color: "#e8edf5" }}>Move to Folder</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: "0.78rem", color: "#7a8ba8", fontFamily: "'Sora',sans-serif", mb: 2 }}>{assignDialog.file?.filename}</Typography>
            <Select fullWidth value={assignDialog.folderId} onChange={e => setAssignDialog(d => ({ ...d, folderId: e.target.value }))} displayEmpty
              sx={{ bgcolor: "rgba(7,13,26,0.8)", color: "#e8edf5", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "'Sora',sans-serif",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(99,155,255,0.15)" }, "& .MuiSvgIcon-root": { color: "#7a8ba8" } }}>
              <MenuItem value=""><em style={{ color: "#7a8ba8" }}>No folder (Unfiled)</em></MenuItem>
              {folders.map(fo => (
                <MenuItem key={fo.id} value={fo.id} sx={{ fontFamily: "'Sora',sans-serif" }}>
                  <FolderIcon sx={{ fontSize: 15, color: fo.color, mr: 1 }} />{fo.name}
                </MenuItem>
              ))}
            </Select>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button onClick={() => setAssignDialog({ open: false, file: null, folderId: "" })} sx={{ color: "#7a8ba8", fontFamily: "'Sora',sans-serif", textTransform: "none", fontSize: "0.78rem" }}>Cancel</Button>
            <Button onClick={() => assignFolder(assignDialog.file?.id, assignDialog.folderId)}
              sx={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", fontFamily: "'Sora',sans-serif", textTransform: "none", fontSize: "0.78rem", borderRadius: "7px", px: 2 }}>
              Move
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
          <Alert severity={snack.type}>{snack.msg}</Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
}