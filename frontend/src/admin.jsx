import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./assets/logo.png";
import axios from "axios";

const ADMIN_WS = import.meta.env.VITE_ADMIN_WS || ""; // e.g., wss://<host>/ws
const API_BASE = import.meta.env.VITE_API_BASE || ""; // e.g., http://localhost:5000

export default function Admin() {
  const nav = useNavigate();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("Offline");
  const [listeners, setListeners] = useState(0);
  const [startTime, setStartTime] = useState("--");
  const [logs, setLogs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  // helpers
  const decodeBase64Url = (s) => {
    try {
      s = s.replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      return atob(s);
    } catch {
      return "";
    }
  };

  const parseToken = (t) => {
    if (!t) return null;
    try {
      if (t.split(".").length === 3) {
        const [, payloadB64] = t.split(".");
        const json = decodeBase64Url(payloadB64);
        return JSON.parse(json);
      }
      const json = atob(t);
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const normalizeTs = (x) => {
    if (!x && x !== 0) return null;
    return x < 1e12 ? x * 1000 : x; // seconds->ms else keep
  };

  const admin = useMemo(() => {
    const p = parseToken(token);
    if (!p) return null;
    const iatMs = normalizeTs(p.iat);
    const expMs = normalizeTs(p.exp);
    return {
      raw: p,
      name: p.name || p.fullName || p.username || "—",
      email: p.email || p.sub || "—",
      iatMs,
      expMs,
    };
  }, [token]);

  const humanTime = (ms) => {
    if (!ms && ms !== 0) return "—";
    const d = new Date(ms);
    return d.toLocaleString();
  };

  const humanDur = (ms) => {
    if (ms == null) return "—";
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h) return `${h}h ${m}m ${ss}s`;
    if (m) return `${m}m ${ss}s`;
    return `${ss}s`;
  };

  // guard: must be logged in
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      alert("You must be logged in to view the admin dashboard.");
      nav("/");
    } else {
      setToken(t);
    }
  }, [nav]);

  // Live countdown
  const [expiresInMs, setExpiresInMs] = useState(null);
  const expired = admin?.expMs ? expiresInMs === 0 : false;

  useEffect(() => {
    if (!admin?.expMs) {
      setExpiresInMs(null);
      return;
    }
    const tick = () => {
      const left = admin.expMs - Date.now();
      setExpiresInMs(left > 0 ? left : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [admin?.expMs]);

  // Admin WS
  useEffect(() => {
    if (!token) return;

    const url =
      ADMIN_WS ||
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
    const socket = new WebSocket(url);

    const log = (m) =>
      setLogs((prev) => [{ ts: new Date(), text: m }, ...prev]);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "auth", role: "admin", token }));
      log("Connected to server as admin.");
    };

    socket.onmessage = ({ data }) => {
      let msg;
      try { msg = JSON.parse(data); } catch { log("Error parsing server message."); return; }

      switch (msg.type) {
        case "admin-update": {
          const { broadcasting, listenerCount, startTime } = msg;
          setStatus(broadcasting ? "Online 🟢" : "Offline 🔴");
          setListeners(listenerCount || 0);
          setStartTime(startTime ? new Date(startTime).toLocaleTimeString() : "--");
          break;
        }
        case "log":
          log(msg.message);
          break;
        default:
          break;
      }
    };

    socket.onerror = (err) => {
      log("WebSocket error.");
      console.error(err);
    };

    socket.onclose = () => {
      log("Disconnected from server.");
    };

    return () => socket.close();
  }, [token, ADMIN_WS]);

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    nav("/");
  };

  const addBroadcaster = async () => {
    setShowModal(true);
  }

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        email: formData.email,
        hashed_password: formData.password,
      };
      const res = await axios.post(`${API_BASE}/api/v1/broadcaster/register`, data, {withCredentials: true});

      if (res.statusText !== "OK") throw new Error("Failed to add broadcaster");

      setShowModal(false);
      setFormData({ name: "", email: "", password: "" });
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // UI
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-blue-900 text-white px-4 py-3 flex items-center gap-3">
        <img src={logo} alt="SMVDU Logo" className="h-12 w-auto" />
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <div className="ml-auto">
          <button
            onClick={addBroadcaster}
            className="bg-white text-blue-900 px-3 py-1.5 rounded hover:bg-gray-100 font-medium mr-3"
          >
            Add Broadcaster
          </button>
          <button
            onClick={logout}
            className="bg-white text-blue-900 px-3 py-1.5 rounded hover:bg-gray-100 font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid gap-4 md:grid-cols-2">
        {/* Admin Info Card */}
        <section className="bg-white rounded-xl shadow p-4 flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Admin Info</h2>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
              {(admin?.name || admin?.email || "?").toString().trim().charAt(0).toUpperCase()}
            </div>
            <div className="grid">
              <span className="font-semibold">{admin?.name || "—"}</span>
              <span className="text-sm text-gray-600">{admin?.email || "—"}</span>
            </div>
            <span
              className={`ml-auto px-2 py-0.5 rounded text-sm ${
                expired ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
              title={expired ? "Token expired" : "Token valid"}
            >
              {expired ? "Expired" : "Valid"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <p className="text-gray-500">Issued At</p>
              <p className="font-medium">{admin?.iatMs ? humanTime(admin.iatMs) : "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-gray-500">Expires At</p>
              <p className="font-medium">{admin?.expMs ? humanTime(admin.expMs) : "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-gray-500">Expires In</p>
              <p className={`font-medium ${expired ? "text-red-600" : "text-gray-900"}`} aria-live="polite">
                {admin?.expMs == null ? "—" : expired ? "—" : humanDur(expiresInMs)}
              </p>
            </div>
          </div>
        </section>

        {/* Status Card */}
        <section className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Broadcast Status</h2>
          <p><strong>Status:</strong> <span id="status">{status}</span></p>
          <p><strong>Listener Count:</strong> <span id="listeners">{listeners}</span></p>
          <p><strong>Start Time:</strong> <span id="start-time">{startTime}</span></p>
        </section>

        {/* Logs */}
        <section className="bg-white rounded-xl shadow p-4 md:col-span-2">
          <h2 className="text-lg font-semibold mb-2">Logs</h2>
          <div id="logs" className="max-h-[300px] overflow-y-auto border border-gray-300 p-2 font-mono bg-gray-100 rounded">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">No logs yet.</p>
            ) : (
              logs.map((l, i) => (
                <p key={i}>[{l.ts.toLocaleTimeString()}] {l.text}</p>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="text-center p-4 bg-gray-200">
        <p>&copy; 2025 SMVDU Internet Radio</p>
      </footer>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-3 text-gray-500 hover:text-red-500 text-xl"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold mb-4 text-center">Add Broadcaster</h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
