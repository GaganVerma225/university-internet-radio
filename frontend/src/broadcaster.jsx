import React, { useEffect, useRef, useState } from "react";
import logo from "./assets/logo.png";
import axios from "axios";

// ENV — if not provided, fallback to same origin /ws
const API_BASE = import.meta.env.VITE_API_BASE || "";
const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;

export default function Broadcaster() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Header />
      <main className="max-w-6xl mx-auto p-4 grid gap-4 sm:grid-cols-2">
        <ProfileCard />
        <ScheduleCard />
        <NotifyCard />
        <HealthCard />
      </main>
    </div>
  );
}

function Header() {
  const logout = async () => {
    try {
      await axios.post(`${API_BASE}/api/v1/broadcaster/logout`, {}, {withCredentials: true});
      setTimeout(
          () => (window.location.href = "/"),
          800
        );
    } catch (error) {
      console.log("Error on logout: ", error);
    }
  }
  return (
    <header className="w-full bg-white shadow">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <img src={logo} alt="SMVDU Logo" className="h-10 w-auto" />
        <h1 className="text-xl font-semibold">Broadcaster Dashboard</h1>
        <div className="ml-auto">
          <button
            onClick={logout}
            className="bg-gray-300 text-blue-900 px-3 py-1.5 rounded hover:bg-gray-400 font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function ProfileCard() {
  // TODO: replace with real user data / token payload
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        // Fetch initial data
        setTimeout(
          () => {},
          1500
        );
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE}/api/v1/broadcaster/current-Broadcaster`,
          { withCredentials: true }
        );

        const data = response.data.data;

        setName(data.name)
        setEmail(data.email)

        
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Login required");
          setTimeout(
            () => (window.location.href = "/"),
            100
          );
      }
    };

    fetchAvatars(); // Call the function
  }, []); // Remove buttons from dependency array
  return (
    <section className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">My Profile</h2>
      <p><strong>Name:</strong> {name}</p>
      <p><strong>Email:</strong> {email}</p>
      <p><strong>Role:</strong> Broadcaster</p>
    </section>
  );
}

function ScheduleCard() {
  const [rows] = useState([
    { day: "Mon", time: "10:00–11:00", program: "Morning Show" },
    { day: "Wed", time: "15:00–16:00", program: "Campus Buzz" },
  ]);

  return (
    <section className="bg-white rounded-xl shadow p-4 overflow-x-auto">
      <h2 className="text-lg font-semibold mb-3">My Broadcast Schedule</h2>
      <table className="min-w-full text-left text-sm border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-2 px-3 border-b">Day</th>
            <th className="py-2 px-3 border-b">Time</th>
            <th className="py-2 px-3 border-b">Program</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              <td className="py-2 px-3 border-b">{r.day}</td>
              <td className="py-2 px-3 border-b">{r.time}</td>
              <td className="py-2 px-3 border-b">{r.program}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function NotifyCard() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const send = async () => {
    if (!message.trim()) return;
    try {
      // TODO: plug your API
      setStatus("✅ Notification sent");
      console.log("Notify:", message);
      setMessage("");
    } catch (e) {
      setStatus("Failed to send");
      console.error(e);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold">Notify Listeners</h2>
      <textarea
        className="mt-2 mb-2 w-full min-h-[100px] p-2 border rounded"
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        onClick={send}
        className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Send Notification
      </button>
      {status && <p className="mt-2 text-sm">{status}</p>}
    </section>
  );
}

function HealthCard() {
  const wsRef = useRef(null);
  const peersRef = useRef(new Map()); // listenerId -> RTCPeerConnection
  const streamRef = useRef(null);

  const [online, setOnline] = useState(false);
  const [statusText, setStatusText] = useState("Disconnected");
  const [bitrate, setBitrate] = useState("-- kbps");
  const [lastPing, setLastPing] = useState("--");

  // Safe WS send
  const wsend = (obj) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  };

  const start = async () => {
    if (!WS_URL) {
      setStatusText("WS URL missing");
      return;
    }

    try {
      // 1) Connect WS
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      setStatusText("Connecting to signaling server...");

      // Wait for WS open
      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          setStatusText("Connected to signaling server");
          setOnline(true);
          const token = localStorage.getItem("token") || "";
          ws.send(JSON.stringify({ type: "auth", role: "broadcaster", token }));

          // keepalive ping (proxies)
          const pingId = setInterval(() => {
            try {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "ping" }));
                setLastPing(new Date().toLocaleTimeString());
              }
            } catch {}
          }, 30000);
          wsRef.current._pingId = pingId;

          resolve();
        };
        ws.onerror = reject;
      });

      // 2) Get mic
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = mediaStream;
      } catch (e) {
        setStatusText("Mic permission denied");
        throw e;
      }

      // 3) 👉 Mark broadcast started IMMEDIATELY (no need to wait for a listener)
      wsend({ type: "broadcast-start" });

      // 4) Set handlers for signaling
      wsRef.current.onmessage = async ({ data }) => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }

        if (msg.type === "broadcaster-already-connected") {
          setStatusText("Another broadcaster already connected");
          return;
        }

        if (msg.type === "new-listener") {
          const listenerId = msg.listenerId;
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          // Add audio
          const s = streamRef.current;
          if (s) for (const tr of s.getTracks()) pc.addTrack(tr, s);

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              wsend({ type: "candidate", candidate: event.candidate, targetId: listenerId });
            }
          };
          pc.onconnectionstatechange = () => {
            const st = pc.connectionState;
            if (st === "failed" || st === "closed" || st === "disconnected") {
              peersRef.current.delete(listenerId);
            }
          };

          const offer = await pc.createOffer({ offerToReceiveAudio: false });
          await pc.setLocalDescription(offer);
          wsend({ type: "offer", offer: pc.localDescription, targetId: listenerId });

          peersRef.current.set(listenerId, pc);
        }

        if (msg.type === "answer") {
          const pc = peersRef.current.get(msg.senderId);
          if (pc) await pc.setRemoteDescription(msg.answer);
        }

        if (msg.type === "candidate") {
          const pc = peersRef.current.get(msg.senderId);
          if (pc) {
            try { await pc.addIceCandidate(msg.candidate); } catch (e) { console.error("ICE add failed:", e); }
          }
        }
      };

      wsRef.current.onerror = (e) => {
        console.error("WS error:", e);
        setStatusText("WebSocket error");
      };
      wsRef.current.onclose = () => {
        setOnline(false);
        setStatusText("Disconnected");
        if (wsRef.current?._pingId) clearInterval(wsRef.current._pingId);
      };

      // Optional UI
      setBitrate("~128 kbps");
      setLastPing(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Start error:", e);
      setStatusText("Failed to start (WS/Mic)");
      setOnline(false);
    }
  };


  const stop = () => {
    // 1) Tell server broadcast stopped
    try { wsend({ type: "broadcast-stop" }); } catch {}

    // 2) Close peers
    peersRef.current.forEach((pc) => { try { pc.close(); } catch {} });
    peersRef.current.clear();

    // 3) Stop tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // 4) Close WS
    try {
      const ws = wsRef.current;
      if (ws?._pingId) clearInterval(ws._pingId);
      ws?.close();
    } catch {}
    wsRef.current = null;

    // 5) UI
    setOnline(false);
    setStatusText("Disconnected");
  };

  // Cleanup on unmount
  useEffect(() => () => stop(), []);

  return (
    <section className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Broadcast Health</h2>
      <p> Status: <span id="streamStatus">{online ? "🟢 Online" : "🔴 Offline"}</span></p>
      <p> 📶 Bitrate: <span id="bitrate">{bitrate}</span></p>
      <p> ⏱️ Last Ping: <span id="lastPing">{lastPing}</span></p>
      <div className="mt-3 flex gap-2">
        <button onClick={start} disabled={online} className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50">
          🎙️ Start Broadcast
        </button>
        <button onClick={stop} disabled={!online} className="rounded bg-red-600 text-white px-4 py-2 disabled:opacity-50">
          🛑 Stop Broadcast
        </button>
      </div>
      <p className="mt-2 text-sm" id="status">{statusText}</p>
    </section>
  );
}
