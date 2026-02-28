import React, { useEffect, useState } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
} from "@mui/material";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  async function loadUsers() {
    const res = await authedFetch(`${API_BASE}/admin/users`);
    if (res.ok) setUsers(res.json);
  }

  async function disableUser(email) {
    if (!window.confirm(`Disable ${email}?`)) return;
    const res = await authedFetch(
      `${API_BASE}/admin/users/${email}/disable`,
      { method: "PUT" }
    );
    if (res.ok) loadUsers();
  }

  async function enableUser(email) {
    const res = await authedFetch(
      `${API_BASE}/admin/users/${email}/enable`,
      { method: "PUT" }
    );
    if (res.ok) loadUsers();
  }

  async function changeRole(email, level) {
    const res = await authedFetch(
      `${API_BASE}/admin/users/${email}/role`,
      {
        method: "PUT",
        body: { accessLevel: level },
      }
    );
    if (res.ok) loadUsers();
  }

  function roleLabel(level) {
    if (level === 1) return "Employee";
    if (level === 2) return "Manager";
    return "Administrator";
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <Box>
      <Typography fontWeight={700} mb={2}>
        User Management
      </Typography>

      <Stack spacing={2}>
        {users.map((u) => (
          <Paper key={u.email} className="glass-file">
            <Typography sx={{ flexGrow: 1 }}>
              {u.email}
            </Typography>

            <Chip label={roleLabel(u.access_level)} />

            <Chip
              label={u.enabled ? "Active" : "Disabled"}
              color={u.enabled ? "primary" : "error"}
            />

            {/* Promote / Demote */}
            {u.enabled && u.access_level === 1 && (
              <Button onClick={() => changeRole(u.email, 2)}>
                Promote → Manager
              </Button>
            )}

            {u.enabled && u.access_level === 2 && (
              <Button onClick={() => changeRole(u.email, 1)}>
                Demote → Employee
              </Button>
            )}

            {/* Disable / Enable */}
            {u.enabled && u.access_level !== 3 && (
              <Button
                color="error"
                onClick={() => disableUser(u.email)}
              >
                Disable
              </Button>
            )}

            {!u.enabled && (
              <Button
                color="success"
                onClick={() => enableUser(u.email)}
              >
                Enable
              </Button>
            )}
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
