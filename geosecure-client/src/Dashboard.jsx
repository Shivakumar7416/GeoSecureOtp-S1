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
} from "@mui/material";

import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";

import "./dashboard.css";

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
      // 👇 handle disabled user explicitly
      if (res.status === 403 && res.json?.error === "user-disabled") {
        alert("Your account is disabled. Please contact admin.");
      }
      throw new Error();
    }

    setProfile(res.json);
  } catch {
    clearToken();        // 🔥 clear JWT once
    onLogout();          // 🔥 reset app state
  }
}


  async function loadFiles() {
    const res = await authedFetch(`${API_BASE}/files`);
    if (res.ok) setFiles(res.json);
  }

  // ================= FILE VIEW =================
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

  // ================= ADMIN FILE ACTIONS =================
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
        <CircularProgress />
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
        {/* SIDEBAR */}
        <aside className="sidebar glass">
          <Typography variant="h6">GeoSecureOTP</Typography>

          <div className="profile-mini">
            <Avatar>
              {isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
            </Avatar>
            <div>
              <strong>{profile.email}</strong>
              <div className="muted">{roleName(profile.accessLevel)}</div>
            </div>
          </div>

          <button onClick={() => setActiveSection("files")}>📁 Files</button>

          {isAdmin && (
            <>
              <button onClick={() => setActiveSection("users")}>👥 Users</button>
              <button onClick={() => setActiveSection("create")}>👤 Create User</button>
              <button onClick={() => setActiveSection("geo")}>📍 Geo Boundary</button>
              <button onClick={() => setActiveSection("upload")}>⬆ Upload File</button>
            </>
          )}

          <div className="nav-footer">
            <IconButton onClick={loadFiles}><RefreshIcon /></IconButton>
            <IconButton onClick={onLogout}><LogoutIcon /></IconButton>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="content">
          {activeSection === "users" && isAdmin && (
            <Paper className="glass-card"><AdminUsers /></Paper>
          )}

          {activeSection === "create" && isAdmin && (
            <Paper className="glass-card"><AdminCreateUser /></Paper>
          )}

          {activeSection === "geo" && isAdmin && (
            <Paper className="glass-card"><AdminGeoBoundary /></Paper>
          )}

          {activeSection === "upload" && isAdmin && (
            <Paper className="glass-card">
              <AdminFileUpload onUploaded={loadFiles} />
            </Paper>
          )}

          {activeSection === "files" && (
            <Paper className="glass-card">
              <Typography fontWeight={700}>Secure Files</Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                {files.map((f) => (
                  <Paper key={f.id} className="glass-file">
                    <Typography sx={{ flexGrow: 1 }}>{f.filename}</Typography>

                    <Button onClick={() => viewFile(f)}>View</Button>

                    {isAdmin && (
                      <>
                        <Button color="warning" onClick={() => changeAccess(f)}>
                          Access
                        </Button>
                        <Button color="error" onClick={() => deleteFile(f)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Paper>
          )}
        </main>

        {/* FILE VIEWER */}
        {openViewer && activeFile && (
          <div className="viewer-overlay">
            <div className="viewer">
              {activeFile.ext === "pdf" && <iframe src={activeFile.url} />}
              {["png", "jpg", "jpeg", "gif", "webp"].includes(activeFile.ext) && (
                <img src={activeFile.url} />
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
            >
              Close
            </Button>
          </div>
        )}
      </Box>
    </Fade>
  );
}
