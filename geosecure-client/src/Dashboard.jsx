// src/DashboardMui.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Paper,
  Tooltip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import DownloadIcon from "@mui/icons-material/Download";
import LinkIcon from "@mui/icons-material/Link";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PersonIcon from "@mui/icons-material/Person";

import { authedFetch, clearToken } from "./auth";
import { API_BASE } from "./config";

export default function Dashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  // Fetch profile
  async function fetchProfile() {
    try {
      const res = await authedFetch(`${API_BASE}/profile`);
      if (!res.ok) {
        clearToken();
        onLogout();
        return;
      }
      const data = await res.json();
      setProfile(data);
    } catch {
      setSnack({ open: true, severity: "error", message: "Failed to load profile" });
    } finally {
      setLoadingProfile(false);
    }
  }

  // Fetch files
  async function fetchFiles() {
    try {
      const res = await authedFetch(`${API_BASE}/files`);
      if (!res.ok) {
        setSnack({ open: true, severity: "error", message: "Failed to load files" });
        return;
      }
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      setSnack({ open: true, severity: "error", message: "Failed to load files" });
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => {
    fetchProfile();
    fetchFiles();
  }, []);

  // Download file
  async function handleDownload(file) {
    try {
      const res = await authedFetch(`${API_BASE}/files/${file.id}/download`);
      if (!res.ok) {
        setSnack({ open: true, severity: "error", message: "Download failed" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename || "file";
      a.click();
      URL.revokeObjectURL(url);
      setSnack({ open: true, severity: "success", message: "Download started" });
    } catch {
      setSnack({ open: true, severity: "error", message: "Download error" });
    }
  }

  // View file
  function handleView(file) {
    const url = file.url || `${API_BASE}/files/${file.id}/view`;
    window.open(url, "_blank");
  }

  // Copy link
  function handleCopy(file) {
    const url = file.url || `${API_BASE}/files/${file.id}/view`;
    navigator.clipboard.writeText(url).then(() =>
      setSnack({ open: true, severity: "success", message: "Link copied" })
    );
  }

  // Refresh
  function handleRefresh() {
    fetchProfile();
    fetchFiles();
    setSnack({ open: true, severity: "info", message: "Refreshed" });
  }

  // Logout
  function handleLogout() {
    clearToken();
    onLogout();
  }

  // Pagination
  const displayed = files.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: "#f8fafc" }}>
      {/* TOP NAVBAR */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: "1px solid #eee" }}>
        <Toolbar sx={{ maxWidth: 1200, mx: "auto", width: "100%" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1, color: "#0f172a" }}>
            User Dashboard
          </Typography>

          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} size="large">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Logout">
            <IconButton onClick={handleLogout} size="large">
              <LogoutIcon />
            </IconButton>
          </Tooltip>

          <Avatar
            sx={{
              ml: 2,
              bgcolor: "#fff",
              border: "2px solid #2563eb",
              color: "#2563eb",
            }}
          >
            {profile?.email?.charAt(0).toUpperCase() || <PersonIcon />}
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* PROFILE SECTION UNDER TOP BAR */}
      <Box sx={{ maxWidth: 1200, mx: "auto", mt: 3, px: 2 }}>
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          {loadingProfile ? (
            <Typography>Loading profile...</Typography>
          ) : (
            <>
              <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                {profile?.name || profile?.email || "User"}
              </Typography>
              <Typography sx={{ color: "#475569" }}>
                {profile?.email}
              </Typography>
              <Typography sx={{ color: "#2563eb", mt: 1 }}>
                Role: <b>{profile?.role || "Member"}</b>
              </Typography>
            </>
          )}
        </Paper>

        {/* FILES SECTION */}
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Your Files
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <TableContainer sx={{ maxHeight: 480 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loadingFiles ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : files.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      No files available.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>{file.filename}</TableCell>
                      <TableCell>{new Date(file.uploadedAt).toLocaleString()}</TableCell>
                      <TableCell>{humanFileSize(file.size)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                          <Tooltip title="Download">
                            <IconButton size="small" onClick={() => handleDownload(file)}>
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => handleView(file)}>
                              <LinkIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Copy link">
                            <IconButton size="small" onClick={() => handleCopy(file)}>
                              <ContentCopyIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={files.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(e, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 8, 12]}
          />
        </Paper>
      </Box>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function humanFileSize(bytes) {
  if (!bytes) return "0 B";
  const thresh = 1000;
  if (bytes < thresh) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (bytes >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + " " + units[u];
}
