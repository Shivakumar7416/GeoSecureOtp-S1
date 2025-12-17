import React, { useEffect, useState } from "react";
import AdminGeoBoundary from "./AdminGeoBoundary";
import AdminCreateUser from "./AdminCreateUser";
import AdminFileUpload from "./AdminFileUpload";
import { authedFetch, clearToken, getToken } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  AppBar,
  Toolbar,
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

export default function Dashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openViewer, setOpenViewer] = useState(false);
  const [activeFile, setActiveFile] = useState(null);

  // ---------------- LOAD PROFILE ----------------
  async function loadProfile() {
    try {
      const res = await authedFetch(`${API_BASE}/profile`);
      if (!res.ok) throw new Error();
      setProfile(res.json);
    } catch {
      setError("Session expired. Please login again.");
      clearToken();
    }
  }

  // ---------------- LOAD FILES ----------------
  async function loadFiles() {
    const res = await authedFetch(`${API_BASE}/files`);
    if (res.ok) setFiles(res.json);
  }

  // ---------------- VIEW FILE (ALL USERS) ----------------
  async function viewFile(file) {
    const token = getToken();

    const res = await fetch(`${API_BASE}/files/${file.id}/download`, {
      headers: { Authorization: "Bearer " + token },
    });

    if (!res.ok) {
      alert("Unauthorized");
      return;
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
  }

  // ---------------- ADMIN: CHANGE ACCESS ----------------
  async function changeAccess(file) {
    const level = prompt(
      "Enter access level:\n1 = User\n2 = Manager\n3 = Admin",
      file.accessLevel || 1
    );

    if (!level) return;

    const res = await authedFetch(
      `${API_BASE}/admin/files/${file.id}/access`,
      {
        method: "PUT",
        body: { accessLevel: Number(level) },
      }
    );

    if (res.ok) {
      alert("Access updated successfully");
      loadFiles();
    } else {
      alert("Failed to update access");
    }
  }

  // ---------------- ADMIN: DELETE FILE ----------------
  async function deleteFile(file) {
    const ok = window.confirm(
      `Are you sure you want to delete "${file.filename}"?`
    );
    if (!ok) return;

    const res = await authedFetch(
      `${API_BASE}/admin/files/${file.id}`,
      { method: "DELETE" }
    );

    if (res.ok) {
      alert("File deleted");
      loadFiles();
    } else {
      alert("Delete failed");
    }
  }

  // ---------------- INIT ----------------
  useEffect(() => {
    (async () => {
      await loadProfile();
      await loadFiles();
      setLoading(false);
    })();
  }, []);

  // ---------------- LOADING ----------------
  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // ---------------- ERROR ----------------
  if (error || !profile) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Paper sx={{ p: 4 }}>
          <Typography sx={{ mb: 2 }}>{error}</Typography>
          <Button
            variant="contained"
            onClick={() => {
              clearToken();
              onLogout();
            }}
          >
            Login again
          </Button>
        </Paper>
      </Box>
    );
  }

  const isAdmin = profile.accessLevel === 3;

  return (
    <Fade in>
      <Box sx={{ minHeight: "100vh", bgcolor: "#f1f5f9" }}>
        {/* TOP BAR */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography sx={{ flexGrow: 1, fontWeight: 700 }}>
              GeoSecureOTP
            </Typography>

            <IconButton onClick={loadFiles}>
              <RefreshIcon />
            </IconButton>

            <IconButton
              onClick={() => {
                clearToken();
                onLogout();
              }}
            >
              <LogoutIcon />
            </IconButton>

            <Avatar sx={{ ml: 2 }}>
              {isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
            </Avatar>
          </Toolbar>
        </AppBar>

        <Box sx={{ maxWidth: 1200, mx: "auto", mt: 4 }}>
          {/* PROFILE */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography fontWeight={700}>{profile.email}</Typography>
            <Typography color="text.secondary">
              {isAdmin ? "Administrator Access" : "Standard User"}
            </Typography>
          </Paper>

          {/* ADMIN MODULES */}
          {isAdmin && (
            <Stack spacing={3}>
              <Paper sx={{ p: 3 }}>
                <AdminCreateUser />
              </Paper>

              <Paper sx={{ p: 3 }}>
                <AdminGeoBoundary />
              </Paper>

              <Paper sx={{ p: 3 }}>
                <AdminFileUpload onUploaded={loadFiles} />
              </Paper>
            </Stack>
          )}

          {/* FILE LIST */}
          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography fontWeight={700}>Secure Files</Typography>
            <Divider sx={{ my: 2 }} />

            {files.length === 0 ? (
              <Typography>No files available.</Typography>
            ) : (
              <Stack spacing={2}>
                {files.map((f) => (
                  <Paper
                    key={f.id}
                    sx={{
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Typography sx={{ flexGrow: 1 }}>
                      {f.filename}
                    </Typography>

                    <Button variant="outlined" onClick={() => viewFile(f)}>
                      View
                    </Button>

                    {isAdmin && (
                      <>
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => changeAccess(f)}
                        >
                          Change Access
                        </Button>

                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => deleteFile(f)}
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
        </Box>

        {/* FILE VIEWER */}
        {openViewer && activeFile && (
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              bgcolor: "rgba(0,0,0,0.85)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box sx={{ width: "80%", height: "80%", bgcolor: "#000", p: 2 }}>
              {activeFile.ext === "pdf" && (
                <iframe
                  src={`${activeFile.url}#toolbar=0`}
                  width="100%"
                  height="100%"
                />
              )}

              {["png", "jpg", "jpeg", "gif", "webp"].includes(
                activeFile.ext
              ) && (
                <img
                  src={activeFile.url}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    display: "block",
                    margin: "auto",
                  }}
                />
              )}

              {["xml", "txt"].includes(activeFile.ext) && (
                <pre
                  style={{
                    color: "white",
                    overflow: "auto",
                    height: "100%",
                  }}
                >
                  {activeFile.textContent}
                </pre>
              )}
            </Box>

            <Button
              sx={{ position: "absolute", top: 20, right: 20 }}
              variant="contained"
              onClick={() => {
                URL.revokeObjectURL(activeFile.url);
                setActiveFile(null);
                setOpenViewer(false);
              }}
            >
              Close
            </Button>
          </Box>
        )}
      </Box>
    </Fade>
  );
}
