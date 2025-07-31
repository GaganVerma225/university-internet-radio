import { useEffect, useRef, useState } from "react";
import carosel1 from "./assets/carousel/4805067.jpg";
import carosel2 from "./assets/carousel/girl-cafe-with-smartphone.jpg";
import carosel3 from "./assets/carousel/podcast-template-design_23-2151537128.jpg";
import logo from "./assets/logo.png";
import axios from "axios";

// ENV (Vite): .env me VITE_* keys define karo
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";
const API_BASE = import.meta.env.VITE_API_BASE || ""; // e.g., http://localhost:5000
const WS_URL = import.meta.env.VITE_WS_URL || ""; // e.g., wss://your-ws-server

export default function App() {
  // dark mode — Tailwind uses `dark` class on <html>
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      <Header dark={dark} onToggleDark={() => setDark((d) => !d)} />
      <main className="flex-1 p-6 space-y-8 bg-white">
        <Accordion />
        <Carousel />
        <PastPrograms />
        <SuggestionForm />
      </main>
      <FooterPlayer />
    </div>
  );
}

function Header({ dark, onToggleDark }) {
  return (
    <header className="w-full bg-blue-900 text-white px-6 md:px-8 py-4 flex items-center gap-4">
      <div className="shrink-0">
        <img src={logo} alt="SMVDU Logo" className="h-12" />
      </div>

      <nav className="ml-auto flex items-center gap-3">
        <button
          onClick={onToggleDark}
          className="rounded-md bg-blue-700 hover:bg-blue-600 px-3 py-2 text-sm"
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {dark ? "☀️" : "🌙"}
        </button>
        <LoginForm />
      </nav>
    </header>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      // Admin short-circuit (demo only)
      if (
        email === ADMIN_EMAIL &&
        password === ADMIN_PASSWORD &&
        ADMIN_EMAIL &&
        ADMIN_PASSWORD
      ) {
        const payload = {
          email,
          name: "Kaushal Kumar Gupta",
          iat: Date.now(),
          exp: Date.now() + 60 * 60 * 1000,
        };
        const token = btoa(JSON.stringify(payload));
        localStorage.setItem("token", token);
        setMsg("Admin login successful!");
        setTimeout(() => (window.location.href = "/admin"), 800);
        return;
      }

      // API login
      const data = {
        email,
        hashed_password: password,
      };
      const res = await axios.post(`${API_BASE}/api/v1/broadcaster/login`, data, {withCredentials: true});
    
      if (res.statusText === "OK") {
        setMsg("Login successful!");
        if (data?.token) localStorage.setItem("token", data.token);
        setTimeout(
          () => (window.location.href = "/broadcaster"),
          1500
        );
      } else {
        setMsg(data?.message || "Login failed.");
      }
    } catch (err) {
      console.error(err);
      setMsg("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Email"
        className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-900 bg-white"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder="Password"
          className="px-2 py-1 pr-8 rounded border border-gray-300 text-sm text-gray-900 bg-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-1 top-1/2 -translate-y-1/2 px-1"
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "Hide password" : "Show password"}
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-3 py-1 rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-60 text-sm "
      >
        {loading ? "Logging in…" : "Login"}
      </button>
      {msg && (
        <p className="ml-2 text-sm" aria-live="polite">
          {msg}
        </p>
      )}
    </form>
  );
}

function Accordion() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [max, setMax] = useState(0);

  useEffect(() => {
    if (open && ref.current) {
      setMax(ref.current.scrollHeight);
    } else {
      setMax(0);
    }
  }, [open]);

  return (
    <section className="space-y-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left bg-gray-700 text-white px-4 py-3 rounded hover:bg-gray-600"
      >
        {open ? "Upcoming Streams ⌃" : "Upcoming Streams ⌄"}
      </button>
      <div
        className="overflow-hidden border-x-2 border-b-2 border-gray-300 bg-gray-50 dark:bg-gray-800 px-4"
        style={{ maxHeight: max, transition: "max-height .4s ease" }}
      >
        <ul ref={ref} className="py-4 space-y-1 text-gray-800 dark:text-gray-100">
          <li>
            <strong>July 15:</strong> Mental Health Awareness Talk – 11:00 AM
          </li>
          <li>
            <strong>July 18:</strong> Music Hour with Alumni – 4:00 PM
          </li>
          <li>
            <strong>July 20:</strong> Sports Recap and Student Panel – 6:00 PM
          </li>
        </ul>
      </div>
    </section>
  );
}

function Carousel() {
  const items = [
    { src: carosel1, caption: "Live Talk with Students" },
    { src: carosel2, caption: "Campus News Hour" },
    { src: carosel3, caption: "Alumni Interviews" },
  ];
  const [idx, setIdx] = useState(0);
  const trackRef = useRef(null);
  const itemRef = useRef(null);

  const go = (n) => setIdx((i) => (i + n + items.length) % items.length);
  const width = useElementWidth(itemRef);

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${idx * width}px)`;
    }
  }, [idx, width]);

  // auto-advance
  useEffect(() => {
    const t = setInterval(() => go(1), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="bg-gray-200 rounded-lg p-4">
      <h2 className="text-lg font-semibold">Featured Streams</h2>
      <div className="relative mt-4 overflow-hidden flex items-center">
        <button
          onClick={() => go(-1)}
          className="z-10 text-3xl px-3 py-2 bg-black/40 hover:bg-black/70 text-white rounded"
          aria-label="Previous"
        >
          ⟨
        </button>
        <div className="w-full overflow-hidden">
          <div
            ref={trackRef}
            className="flex transition-transform duration-500"
            style={{ width: "100%" }}
          >
            {items.map((it, i) => (
              <div key={i} ref={i === 0 ? itemRef : null} className="min-w-full text-center px-2">
                <img
                  src={it.src}
                  alt={`Stream ${i + 1}`}
                  className="max-h-64 mx-auto rounded mb-2"
                />
                <p>{it.caption}</p>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => go(1)}
          className="z-10 text-3xl px-3 py-2 bg-black/40 hover:bg-black/70 text-white rounded"
          aria-label="Next"
        >
          ⟩
        </button>
      </div>
    </section>
  );
}

function PastPrograms() {
  const [programs] = useState([]); // hook up to API later
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Past Programs</h2>
      {programs.length === 0 ? (
        <p className="text-sm text-gray-500">No programs yet.</p>
      ) : (
        <ul className="list-disc pl-6">
          {programs.map((p, i) => (
            <li key={i}>{p.title}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SuggestionForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resp, setResp] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setResp("");
    if (!name || !message) {
      setResp("Please fill in all required fields.");
      return;
    }
    // You can POST to an API here if needed
    setResp("✅ Thank you for your suggestion!");
    console.log("Suggestion sent:", { name, email, message });
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <section className="space-y-3 mb-14">
      <h2 className="text-xl font-semibold">Send a Suggestion</h2>
      <form onSubmit={submit} className="flex flex-col max-w-xl gap-3">
        <input
          className="border border-gray-300 rounded px-3 py-2 text-gray-900"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          className="border border-gray-300 rounded px-3 py-2 text-gray-900"
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <textarea
          className="border border-gray-300 rounded px-3 py-2 min-h-[120px] text-gray-900"
          placeholder="Your Suggestion"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <button className="self-start bg-blue-700 hover:bg-blue-600 text-white rounded px-4 py-2">
          Submit
        </button>
        {resp && (
          <p className={resp.startsWith("✅") ? "text-green-600" : "text-red-600"}>{resp}</p>
        )}
      </form>
    </section>
  );
}

function FooterPlayer() {
  const audioRef = useRef(null);
  const { nowPlaying } = useRadioPlayer(audioRef);

  return (
    <footer className="fixed bottom-0 inset-x-0 bg-blue-900 text-white px-6 py-3 shadow-[0_-2px_5px_rgba(0,0,0,0.2)] flex items-center justify-between z-[999]">
      <div className="font-medium">
        <span>🎶 Now Playing: {nowPlaying}</span>
      </div>
      <div className="flex items-center gap-3">
        <audio ref={audioRef} autoPlay className="hidden" />
        <button
          onClick={() => audioRef.current?.play()}
          className="bg-white text-gray-900 rounded-xl px-5 py-2.5 text-lg md:text-xl font-semibold hover:bg-gray-200 shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ▶ Play
        </button>
        <button
          onClick={() => audioRef.current?.pause()}
          className="bg-white text-gray-900 rounded-xl px-5 py-2.5 text-lg md:text-xl font-semibold hover:bg-gray-200 shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ⏹ Stop
        </button>
      </div>
    </footer>
  );
}

function useRadioPlayer(audioRef) {
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const [nowPlaying] = useState("University Radio");

  useEffect(() => {
    if (!WS_URL) {
      console.warn("WS_URL missing. Set VITE_WS_URL in .env");
      return;
    }

    let disposed = false;
    let retry = 0;

    const connect = () => {
      if (disposed) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WS connected");
        retry = 0;
        ws.send(JSON.stringify({ type: "listener" }));
      };

      ws.onerror = (e) => {
        console.error("WS error:", e);
      };

      ws.onclose = (e) => {
        console.warn("WS closed:", e.code, e.reason);
        // Reconnect only in dev or when abnormal close
        if (!disposed && (import.meta.env.DEV || e.code === 1006)) {
          const delay = Math.min(1000 * Math.pow(2, retry++), 8000);
          setTimeout(connect, delay);
        }
      };

      ws.onmessage = async ({ data }) => {
        const msg = safeParse(data);
        if (!msg) return;

        if (msg.type === "offer") {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });
          pcRef.current = pc;

          pc.ontrack = (event) => {
            const el = audioRef.current;
            if (el) {
              el.srcObject = event.streams[0];
              el.play().catch((err) =>
                console.error("Auto-play blocked:", err)
              );
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              ws.send(
                JSON.stringify({
                  type: "candidate",
                  candidate: event.candidate,
                  targetId: msg.senderId,
                })
              );
            }
          };

          try {
            await pc.setRemoteDescription(msg.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(
              JSON.stringify({
                type: "answer",
                answer: pc.localDescription,
                targetId: msg.senderId,
              })
            );
          } catch (err) {
            console.error("SDP error:", err);
          }
        }

        if (msg.type === "candidate" && pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(msg.candidate);
          } catch (err) {
            console.error("ICE error", err);
          }
        }
      };
    };

    connect();

    return () => {
      // Mark disposed first so reconnect avoids firing
      disposed = true;

      // Close the exact same socket we created
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.close(1000, "component unmount"); } catch {}
      }
      wsRef.current = null;

      try { pcRef.current?.close(); } catch {}
      pcRef.current = null;
    };
  }, []); // <-- run once

  return { nowPlaying };
}


function useElementWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      setW(ref.current.offsetWidth || 0);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [ref]);
  return w;
}

function safeParse(data) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
