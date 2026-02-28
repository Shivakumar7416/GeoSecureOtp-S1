import React, { useState, useEffect, useRef, useCallback } from "react";
import { authedFetch } from "./auth";
import { API_BASE } from "./config";

import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  InputAdornment,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
} from "@mui/material";

import MyLocationIcon from "@mui/icons-material/MyLocation";
import PublicIcon from "@mui/icons-material/Public";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import PinDropIcon from "@mui/icons-material/PinDrop";
import CloseIcon from "@mui/icons-material/Close";

// ── Load Leaflet from CDN (no npm install needed) ─────────────────────────────
function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

// ── Shared input style ────────────────────────────────────────────────────────
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
  "& .MuiInputAdornment-root .MuiSvgIcon-root": { color: "#7a8ba8", fontSize: 18 },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminGeoBoundary() {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [radius, setRadius] = useState("");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", type: "success" });

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimer = useRef(null);

  // Map refs
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Initialize map ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    loadLeaflet().then((L) => {
      if (!mounted || !mapRef.current || leafletMap.current) return;

      const map = L.map(mapRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: true,
      });

      // Dark CartoDB tile layer — no API key needed
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "© OpenStreetMap © CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Click map to pick location
      map.on("click", (e) => {
        const { lat: clickLat, lng: clickLon } = e.latlng;
        setLat(clickLat.toFixed(6));
        setLon(clickLon.toFixed(6));
        placePin(L, map, clickLat, clickLon);
      });

      leafletMap.current = map;
      setMapReady(true);
    });

    return () => {
      mounted = false;
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  // ── Update circle when radius changes ──────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !lat || !lon) return;
    const L = window.L;
    if (!L || !leafletMap.current) return;
    placePin(L, leafletMap.current, parseFloat(lat), parseFloat(lon));
  }, [radius, mapReady]);

  // ── Draw / move marker + radius circle ─────────────────────────────────────
  function placePin(L, map, la, lo) {
    const latlng = [la, lo];
    const r = parseFloat(radius) || 300;

    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:18px;height:18px;
        background:#3b82f6;
        border:2.5px solid #fff;
        border-radius:50%;
        box-shadow:0 0 0 5px rgba(59,130,246,0.3),0 2px 10px rgba(0,0,0,0.5);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      markerRef.current = L.marker(latlng, { icon }).addTo(map);
    }

    if (circleRef.current) {
      circleRef.current.setLatLng(latlng);
      circleRef.current.setRadius(r);
    } else {
      circleRef.current = L.circle(latlng, {
        radius: r,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: "6 4",
      }).addTo(map);
    }

    map.setView(latlng, Math.max(map.getZoom(), 15));
  }

  // ── Nominatim search (debounced) ───────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearchOpen(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=7&addressdetails=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "GeoSecureOTP/1.0" } }
      );
      const data = await res.json();
      setResults(data);
      setSearchOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQueryChange(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(q), 420);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setSearchOpen(false);
    clearTimeout(searchTimer.current);
  }

  function selectResult(place) {
    const pLat = parseFloat(place.lat).toFixed(6);
    const pLon = parseFloat(place.lon).toFixed(6);
    setLat(pLat);
    setLon(pLon);
    setQuery(place.display_name.split(",").slice(0, 2).join(", "));
    setResults([]);
    setSearchOpen(false);

    if (leafletMap.current && window.L) {
      placePin(window.L, leafletMap.current, parseFloat(pLat), parseFloat(pLon));
    }
  }

  // ── Manual lat/lon → move map ──────────────────────────────────────────────
  function handleLatChange(e) {
    setLat(e.target.value);
    syncMap(e.target.value, lon);
  }
  function handleLonChange(e) {
    setLon(e.target.value);
    syncMap(lat, e.target.value);
  }
  function syncMap(la, lo) {
    if (!mapReady || !window.L || !leafletMap.current) return;
    const la_ = parseFloat(la), lo_ = parseFloat(lo);
    if (isNaN(la_) || isNaN(lo_)) return;
    if (la_ < -90 || la_ > 90 || lo_ < -180 || lo_ > 180) return;
    placePin(window.L, leafletMap.current, la_, lo_);
  }

  // ── Save boundary ──────────────────────────────────────────────────────────
  async function saveBoundary() {
    if (!lat || !lon || !radius) {
      setSnack({ open: true, msg: "All fields are required", type: "error" });
      return;
    }
    setSaving(true);
    const res = await authedFetch(`${API_BASE}/admin/set-boundary`, {
      method: "POST",
      body: { lat, lon, radius },
    });
    setSnack({
      open: true,
      msg: res.ok ? "Boundary saved successfully" : "Failed to save boundary",
      type: res.ok ? "success" : "error",
    });
    setSaving(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Stack spacing={2.5}>

        {/* SEARCH */}
        <Box sx={{ position: "relative" }}>
          <TextField
            fullWidth
            label="Search place or institution"
            value={query}
            onChange={handleQueryChange}
            placeholder="e.g. CVR College of Engineering, Hyderabad"
            sx={inputSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#3b82f6 !important", fontSize: "18px !important" }} />
                </InputAdornment>
              ),
              endAdornment: searching ? (
                <InputAdornment position="end">
                  <CircularProgress size={14} sx={{ color: "#3b82f6" }} />
                </InputAdornment>
              ) : query ? (
                <InputAdornment position="end" sx={{ cursor: "pointer" }} onClick={clearSearch}>
                  <CloseIcon sx={{ color: "#7a8ba8", fontSize: 16 }} />
                </InputAdornment>
              ) : null,
            }}
          />

          {/* Dropdown results */}
          {searchOpen && results.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                zIndex: 9999,
                bgcolor: "#0d1626",
                border: "1px solid rgba(99,155,255,0.2)",
                borderRadius: "10px",
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
                maxHeight: 300,
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(99,155,255,0.2)", borderRadius: 2 },
              }}
            >
              <List dense disablePadding>
                {results.map((r, i) => {
                  const primary = r.display_name.split(",")[0];
                  const secondary = r.display_name.split(",").slice(1, 3).join(",").trim();
                  const typeLabel = r.type || r.class || "";
                  return (
                    <ListItem
                      key={i}
                      disablePadding
                      sx={{
                        borderBottom: i < results.length - 1
                          ? "1px solid rgba(99,155,255,0.07)"
                          : "none",
                      }}
                    >
                      <ListItemButton
                        onClick={() => selectResult(r)}
                        sx={{
                          px: 2,
                          py: 1,
                          gap: 1.5,
                          alignItems: "flex-start",
                          "&:hover": { bgcolor: "rgba(59,130,246,0.08)" },
                        }}
                      >
                        <PinDropIcon sx={{ fontSize: 15, color: "#3b82f6", flexShrink: 0, mt: 0.2 }} />
                        <ListItemText
                          primary={primary}
                          secondary={secondary}
                          primaryTypographyProps={{
                            sx: {
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: "#e8edf5",
                              fontFamily: "'Sora', sans-serif",
                            },
                          }}
                          secondaryTypographyProps={{
                            sx: {
                              fontSize: "0.71rem",
                              color: "#7a8ba8",
                              fontFamily: "'Sora', sans-serif",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            },
                          }}
                        />
                        {typeLabel && (
                          <Chip
                            label={typeLabel}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.62rem",
                              bgcolor: "rgba(59,130,246,0.1)",
                              color: "#3b82f6",
                              border: "1px solid rgba(59,130,246,0.2)",
                              borderRadius: "4px",
                              fontFamily: "'Sora', sans-serif",
                              flexShrink: 0,
                              mt: 0.3,
                            }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          )}
        </Box>

        {/* MAP */}
        <Box
          sx={{
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid rgba(99,155,255,0.15)",
            position: "relative",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div ref={mapRef} style={{ height: 340, width: "100%", background: "#070d1a" }} />

          {/* Hint when no pin yet */}
          {!lat && !lon && (
            <Box
              sx={{
                position: "absolute",
                bottom: 14,
                left: "50%",
                transform: "translateX(-50%)",
                bgcolor: "rgba(7,13,26,0.88)",
                border: "1px solid rgba(99,155,255,0.18)",
                borderRadius: "20px",
                px: 2.5,
                py: 0.7,
                pointerEvents: "none",
                backdropFilter: "blur(8px)",
                whiteSpace: "nowrap",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: "#7a8ba8",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Search above or click on the map to pin a location
              </Typography>
            </Box>
          )}
        </Box>

        {/* LAT / LON side by side */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            label="Latitude"
            value={lat}
            onChange={handleLatChange}
            placeholder="e.g. 17.4065"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MyLocationIcon />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />
          <TextField
            label="Longitude"
            value={lon}
            onChange={handleLonChange}
            placeholder="e.g. 78.4772"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PublicIcon />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />
        </Box>

        {/* RADIUS */}
        <TextField
          label="Radius (meters)"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          fullWidth
          placeholder="e.g. 500"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <RadioButtonCheckedIcon />
              </InputAdornment>
            ),
          }}
          sx={inputSx}
        />

        {/* Coords summary badge */}
        {lat && lon && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
              p: 1.5,
              bgcolor: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.18)",
              borderRadius: "8px",
            }}
          >
            <PinDropIcon sx={{ fontSize: 15, color: "#3b82f6" }} />
            <Typography sx={{ fontSize: "0.78rem", color: "#7aa3f5", fontFamily: "'Sora', sans-serif" }}>
              <strong style={{ color: "#e8edf5" }}>Lat:</strong> {lat}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "#7aa3f5", fontFamily: "'Sora', sans-serif" }}>
              <strong style={{ color: "#e8edf5" }}>Lon:</strong> {lon}
            </Typography>
            {radius && (
              <Typography sx={{ fontSize: "0.78rem", color: "#7aa3f5", fontFamily: "'Sora', sans-serif" }}>
                <strong style={{ color: "#e8edf5" }}>Radius:</strong> {radius} m
              </Typography>
            )}
          </Box>
        )}

        {/* SAVE */}
        <Button
          onClick={saveBoundary}
          disabled={saving}
          startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
          sx={{
            py: 1.2,
            borderRadius: "8px",
            fontWeight: 700,
            fontFamily: "'Sora', sans-serif",
            fontSize: "0.82rem",
            textTransform: "none",
            background: saving
              ? "rgba(59,130,246,0.3)"
              : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            color: "#fff",
            boxShadow: "0 4px 20px rgba(59,130,246,0.25)",
            "&:hover:not(:disabled)": {
              background: "linear-gradient(135deg, #1e40af, #2563eb)",
              boxShadow: "0 6px 28px rgba(59,130,246,0.35)",
            },
          }}
        >
          {saving ? "Saving..." : "Save Boundary"}
        </Button>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.type} sx={{ fontFamily: "'Sora', sans-serif" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}