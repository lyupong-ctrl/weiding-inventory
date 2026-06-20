import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, remove } from "firebase/database";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// ─── 設計常數（移至最頂端，修正 PRIMARY 未定義問題）──────────────────────────
const PRIMARY       = "#1a3a6b";
const PRIMARY_LIGHT = "rgba(26,58,107,0.08)";

// ─── Firebase 初始化 ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAcuYthtp7QteUP0yYGNbV8QmZfQ8St25s",
  authDomain:        "weiding-inventory.firebaseapp.com",
  databaseURL:       "https://weiding-inventory-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "weiding-inventory",
  storageBucket:     "weiding-inventory.firebasestorage.app",
  messagingSenderId: "444197108322",
  appId:             "1:444197108322:web:4275c1d1251d03d2e2af3b"
};
const firebaseApp = initializeApp(firebaseConfig);
const db   = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);

const SHEETS = [
  { id: "gf-food", label: "功夫食材", color: "#B85C1A", icon: "🥩" },
  { id: "gf-pack", label: "功夫包材", color: PRIMARY,   icon: "📦" },
  { id: "hb-food", label: "紅巴食材", color: "#1A6E45", icon: "🥬" },
  { id: "hb-pack", label: "紅巴包材", color: "#5B2D8E", icon: "🗃️" },
  { id: "al-food", label: "阿檸食材", color: "#C0392B", icon: "🍋" },
  { id: "al-pack", label: "阿檸包材", color: "#27AE60", icon: "🧃" },
];
const COMPANY = "威登國際管理顧問有限公司";
const SLOTS   = 3;
// SETTINGS_PWD 已移除，改用 Firebase Authentication

// ─── 功能模組定義（對應主頁顯示開關）────────────────────────────────────────
const ALL_MODULES = [
  { id: "warehouse", label: "倉庫盤點",  icon: "🏭", sub: "盤點 · 庫存管理",    color: PRIMARY,     href: "#warehouse" },
  { id: "driver",    label: "司機",      icon: "🚚", sub: "車輛點檢 · 里程",    color: "#1a6e45",   href: "#driver" },
  { id: "logistics", label: "後勤人員",  icon: "📋", sub: "物流 · 配送資料",    color: "#8b3a0f",   href: "#logistics" },
  { id: "route",     label: "路線規劃",  icon: "🗺️", sub: "派送 · 路線優化",    color: "#2471a3",   href: "#route" },
];

// ─── useAuth Hook ──────────────────────────────────────────────────────────────
function useAuth() {
  const [user,    setUser]    = useState(undefined); // undefined=確認中, null=未登入
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);
  return { user, loading };
}

// ─── SplashScreen ─────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 28, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>威</div>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: 2 }}>載入中...</div>
    </div>
  );
}

// ─── LoginPage ────────────────────────────────────────────────────────────────
function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError("請輸入帳號和密碼"); return; }
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const msg = {
        "auth/invalid-credential":     "帳號或密碼錯誤",
        "auth/user-not-found":         "找不到此帳號",
        "auth/wrong-password":         "密碼錯誤",
        "auth/too-many-requests":      "嘗試次數過多，請稍後再試",
        "auth/network-request-failed": "網路連線失敗",
      }[err.code] || "登入失敗，請再試一次";
      setError(msg);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", fontFamily: "'Noto Sans TC', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700;900&display=swap'); * { box-sizing: border-box; } input:focus { outline: none; border-color: #1a3a6b !important; box-shadow: 0 0 0 3px rgba(26,58,107,0.12) !important; }`}</style>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: PRIMARY, color: "#fff", fontSize: 28, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: `0 8px 24px ${PRIMARY}44` }}>威</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: "#111" }}>威登國際管理顧問</div>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4, letterSpacing: 1 }}>WEIDING INTERNATIONAL</div>
      </div>
      <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>登入系統</div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 24 }}>輸入帳號密碼進入</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>電子郵件</div>
          <input type="email" inputMode="email" autoCapitalize="none" value={email}
            onChange={e => { setEmail(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="your@weiding.com"
            style={{ width: "100%", padding: "13px 16px", border: "1.5px solid #e4e4e4", borderRadius: 12, fontSize: 15, color: "#1a1a1a", background: "#fff" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>密碼</div>
          <input type="password" value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="輸入密碼"
            style={{ width: "100%", padding: "13px 16px", border: "1.5px solid #e4e4e4", borderRadius: 12, fontSize: 15, color: "#1a1a1a", background: "#fff" }} />
        </div>
        {error && <div style={{ background: "#fff0f0", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#dc2626", fontWeight: 600, marginBottom: 16 }}>⚠️ {error}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{ width: "100%", padding: "15px", background: loading ? "#aaa" : PRIMARY, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: loading ? "none" : `0 4px 16px ${PRIMARY}44` }}>
          {loading ? "登入中..." : "登入"}
        </button>
      </div>
      <div style={{ marginTop: 24, fontSize: 11, color: "#ccc", letterSpacing: 2 }}>WEIDING INTERNATIONAL · INTERNAL SYSTEM</div>
    </div>
  );
}

function parseHash() {
  const h = window.location.hash.replace("#", "");
  if (h === "warehouse") return { view: "warehouse" };
  if (h === "inventory") return { view: "inventory" };
  if (h === "driver") return { view: "driver" };
  if (h === "driver-check") return { view: "driver-check" };
  if (h === "driver-log") return { view: "driver-log" };
  if (h === "driver-settings") return { view: "driver-settings" };
  if (h === "logistics") return { view: "logistics" };
  if (h === "logistics-settings") return { view: "logistics-settings" };
  if (h === "route") return { view: "route" };
  if (h === "route-settings") return { view: "route-settings" };
  if (h === "route-dispatch") return { view: "route-dispatch" };
  if (h === "settings") return { view: "settings" };
  if (h === "history") return { view: "history" };
  if (h === "system-settings") return { view: "system-settings" };
  if (h.startsWith("sheet/")) return { view: "sheet", id: h.replace("sheet/", "") };
  if (h.startsWith("review/")) return { view: "review", id: h.replace("review/", "") };
  return { view: "landing" };
}
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function todayStr() { return new Date().toLocaleDateString("zh-TW"); }

function QRImg({ url, size = 100 }) {
  return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`} alt="QR" style={{ width: size, height: size, borderRadius: 6 }} />;
}

function PwdModal({ title, onSuccess, onClose }) {
  // 已登入才能到達需要 PwdModal 的頁面，直接放行
  useEffect(() => { onSuccess(); onClose(); }, []);
  return null;
}

function SettingsLock({ label = "設定", hash }) {
  return (
    <a href={`#${hash}`} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${PRIMARY}`, background: "#fff", color: PRIMARY, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "inline-block" }}>
      ⚙️ {label}
    </a>
  );
}

function TrendChart({ data, safetyStock, color }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const PAD = { top: 20, right: 20, bottom: 40, left: 48 };
    const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;
    const vals = data.map(d => d.total);
    const maxVal = Math.max(...vals, safetyStock || 0) * 1.2 || 10;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#f0f0f0"; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (plotH / 4) * i;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + plotW, y); ctx.stroke();
      ctx.fillStyle = "#aaa"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), PAD.left - 6, y + 4);
    }
    if (safetyStock > 0) {
      const sy = PAD.top + plotH * (1 - safetyStock / maxVal);
      ctx.save(); ctx.strokeStyle = "#E74C3C"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(PAD.left, sy); ctx.lineTo(PAD.left + plotW, sy); ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#E74C3C"; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`安全庫存 ${safetyStock}`, PAD.left + 4, sy - 4);
    }
    data.forEach((d, i) => {
      const x = PAD.left + (plotW / (data.length - 1)) * i;
      ctx.fillStyle = "#999"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(d.date.slice(5), x, H - 8);
    });
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    data.forEach((d, i) => {
      const x = PAD.left + (plotW / (data.length - 1)) * i;
      const y = PAD.top + plotH * (1 - d.total / maxVal);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + plotH);
    grad.addColorStop(0, color + "33"); grad.addColorStop(1, color + "05");
    ctx.save(); ctx.fillStyle = grad; ctx.beginPath();
    data.forEach((d, i) => {
      const x = PAD.left + (plotW / (data.length - 1)) * i;
      const y = PAD.top + plotH * (1 - d.total / maxVal);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(PAD.left + plotW, PAD.top + plotH); ctx.lineTo(PAD.left, PAD.top + plotH);
    ctx.closePath(); ctx.fill(); ctx.restore();
    data.forEach((d, i) => {
      const x = PAD.left + (plotW / (data.length - 1)) * i;
      const y = PAD.top + plotH * (1 - d.total / maxVal);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = color; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(d.total, x, y - 10);
    });
  }, [data, safetyStock, color]);
  if (data.length < 2) return <div style={{ color: "#ccc", fontSize: 13, padding: "12px 0" }}>至少需要兩次紀錄才能顯示趨勢圖</div>;
  return <canvas ref={canvasRef} width={640} height={220} style={{ width: "100%", height: "auto", borderRadius: 8 }} />;
}

export default function App() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState(parseHash());

  useEffect(() => {
    const h = () => setRoute(parseHash());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  // 1. 確認登入狀態中
  if (loading) return <SplashScreen />;

  // 2. 未登入 → 登入頁（review 頁面允許未登入存取，給經理填寫用）
  if (!user && route.view !== "review") return <LoginPage />;

  // 3. 已登入 → 原本路由
  if (route.view === "warehouse")          return <WarehousePage />;
  if (route.view === "inventory")          return <InventoryHomePage />;
  if (route.view === "driver")             return <DriverPage />;
  if (route.view === "driver-check")       return <DriverCheckPage />;
  if (route.view === "driver-log")         return <DriverLogPage />;
  if (route.view === "driver-settings")    return <DriverSettingsPage />;
  if (route.view === "logistics")          return <LogisticsPage />;
  if (route.view === "logistics-settings") return <LogisticsSettingsPage />;
  if (route.view === "route")              return <RoutePlanningPage />;
  if (route.view === "route-settings")     return <RouteSettingsPage />;
  if (route.view === "route-dispatch")     return <RouteDispatchPage />;
  if (route.view === "settings")           return <InventorySettingsPage />;
  if (route.view === "history")            return <HistoryPage />;
  if (route.view === "review")             return <ReviewPage id={route.id} />;
  if (route.view === "system-settings")    return <SystemSettingsPage />;
  if (route.view === "sheet") {
    const sheet = SHEETS.find(s => s.id === route.id);
    if (!sheet) return <div style={{ padding: 40 }}>找不到 <a href="#">返回</a></div>;
    return <SheetPage sheet={sheet} />;
  }
  return <LandingPage />;
}

// ─── Landing ──────────────────────────────────────────────────────────────────
function LandingPage() {
  const now      = new Date();
  const dateStr  = now.toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "long" });
  const hour     = now.getHours();
  const greeting = hour < 12 ? "早安" : hour < 18 ? "午安" : "晚安";
  const [enabledModules, setEnabledModules] = useState(null); // null = 載入中

  useEffect(() => {
    get(ref(db, "settings/modules")).then(snap => {
      if (snap.exists()) {
        setEnabledModules(snap.val()); // { warehouse: true, driver: false, ... }
      } else {
        // 預設全開
        const defaults = {};
        ALL_MODULES.forEach(m => { defaults[m.id] = true; });
        setEnabledModules(defaults);
      }
    });
  }, []);

  const visibleModules = ALL_MODULES.filter(m => enabledModules?.[m.id] !== false);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", flexDirection: "column" }}>
      <BottomTabBar />
      <GlobalStyle />
      {/* App Header */}
      <div style={{ background: PRIMARY, padding: "20px 20px 28px" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>威登國際</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>{greeting} 👋</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{dateStr}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>威</div>
          </div>
        </div>
      </div>
      {/* Role Cards */}
      <div style={{ flex: 1, padding: "20px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: 1.5, marginBottom: 14, textTransform: "uppercase" }}>選擇身份進入系統</div>
        {enabledModules === null ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
          </div>
        ) : visibleModules.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#ccc", fontSize: 14 }}>
            尚未啟用任何功能模組<br />
            <a href="#system-settings" style={{ color: PRIMARY, fontWeight: 700, fontSize: 13, marginTop: 8, display: "inline-block" }}>前往系統設定 →</a>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {visibleModules.map(item => (
              <a key={item.href} href={item.href} style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 16px", background: "#fff", borderRadius: 16, textDecoration: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderTop: `3px solid ${item.color}` }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${item.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#111" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{item.sub}</div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 系統設定入口（已登入者才顯示） */}
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <a href="#system-settings" style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fff", borderRadius: 14, textDecoration: "none", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>系統設定</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>功能開關 · 模組管理</div>
            </div>
          </a>
          <button onClick={() => signOut(auth)} style={{ padding: "14px 18px", background: "#fff", border: "none", borderRadius: 14, color: "#aaa", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", fontFamily: "inherit" }}>
            登出
          </button>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "12px", fontSize: 10, color: "#ccc", letterSpacing: 2, paddingBottom: 80 }}>WEIDING INTERNATIONAL · INTERNAL SYSTEM</div>
      <BottomTabBar />
    </div>
  );
}

// ─── Warehouse Landing ─────────────────────────────────────────────────────────
function WarehousePage() {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <div style={{ ...S.brandMark, background: PRIMARY }}>🏭</div>
            <div><div style={S.brandName}>倉庫人員</div><div style={S.brandSub}>{COMPANY}</div></div>
          </div>
          <SettingsLock label="設定品項" hash="settings" />
        </div>
      </header>
      <main style={{ ...S.main, maxWidth: 640 }}>
        <div style={S.pageTitle}>功能選單</div>
        <div style={S.pageSub}>{new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a href="#inventory" style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", background: "#fff", borderRadius: 16, textDecoration: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderLeft: `4px solid ${PRIMARY}` }}>
            <div style={{ fontSize: 36 }}>📦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>庫存盤點</div>
              <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>功夫 / 紅巴 / 阿檸 · 食材 / 包材</div>
            </div>
            <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
          </a>
          <a href="#history" style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", background: "#fff", borderRadius: 16, textDecoration: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderLeft: "4px solid #555" }}>
            <div style={{ fontSize: 36 }}>📋</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>歷史盤點紀錄</div>
              <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>查閱 · 下載 · 趨勢分析</div>
            </div>
            <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
          </a>
        </div>
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Inventory Home ────────────────────────────────────────────────────────────
function InventoryHomePage() {
  const [meta, setMeta] = useState({});
  const base = window.location.href.split("#")[0];
  useEffect(() => {
    SHEETS.forEach(s => {
      onValue(ref(db, `sheets/${s.id}/meta`), snap => {
        if (snap.exists()) setMeta(prev => ({ ...prev, [s.id]: snap.val() }));
      });
    });
  }, []);
  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#warehouse" style={S.backBtn}>← 倉庫</a>
            <div style={{ ...S.brandMark, background: PRIMARY }}>📦</div>
            <div><div style={S.brandName}>庫存盤點</div><div style={S.brandSub}>{COMPANY}</div></div>
          </div>
        </div>
      </header>
      <main style={S.main}>
        <div style={S.pageTitle}>選擇盤點區域</div>
        <div style={S.pageSub}>{new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</div>
        <div style={S.grid}>
          {SHEETS.map(sheet => {
            const m = meta[sheet.id];
            const url = `${base}#sheet/${sheet.id}`;
            return (
              <div key={sheet.id} style={{ ...S.card, borderTop: `4px solid ${sheet.color}` }}>
                <div style={S.cardHeader}>
                  <div style={{ fontSize: 26 }}>{sheet.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={S.cardTitle}>{sheet.label}盤點表</div>
                    <div style={S.cardMeta}>{m ? `${m.itemCount ?? 0} 品項 · ${m.operator || "未填負責人"}` : "尚未開始盤點"}</div>
                  </div>
                  <div style={S.statusPill(m?.status)}>{!m ? "未開始" : m.status === "done" ? "✓ 完成" : "盤點中"}</div>
                </div>
                <div style={S.qrRow}>
                  <QRImg url={url} size={80} />
                  <div style={{ flex: 1 }}>
                    {m?.date && <div style={S.metaLine}>最後更新：{m.date}</div>}
                    {m?.completedCount !== undefined && <div style={S.metaLine}>完成 {m.completedCount}/{m.itemCount} 品項</div>}
                    <a href={`#sheet/${sheet.id}`} style={{ ...S.btnPrimary, background: sheet.color, marginTop: 10, display: "inline-block" }}>進入盤點 →</a>
                  </div>
                </div>
                <div style={S.urlRow}>
                  <span style={S.urlText}>{url}</span>
                  <button style={S.copyBtn} onClick={() => navigator.clipboard.writeText(url)}>複製</button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Driver Landing ────────────────────────────────────────────────────────────
function DriverPage() {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <div style={{ ...S.brandMark, background: "#1a6e45" }}>🚚</div>
            <div><div style={S.brandName}>司機系統</div><div style={S.brandSub}>{COMPANY}</div></div>
          </div>
          <SettingsLock label="設定" hash="driver-settings" />
        </div>
      </header>
      <main style={{ ...S.main, maxWidth: 600 }}>
        <div style={S.pageTitle}>功能選單</div>
        <div style={S.pageSub}>{todayStr()}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a href="#driver-check" style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px", background: "#fff", borderRadius: 16, textDecoration: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderLeft: "4px solid #1a6e45" }}>
            <div style={{ fontSize: 38 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>每日車輛檢查</div>
              <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>勾選檢查項目 · 填寫里程數</div>
            </div>
            <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
          </a>
          <a href="#driver-log" style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px", background: "#fff", borderRadius: 16, textDecoration: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderLeft: "4px solid #2e86c1" }}>
            <div style={{ fontSize: 38 }}>📋</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>查閱檢查紀錄</div>
              <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>查看每天填寫狀況</div>
            </div>
            <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
          </a>
        </div>
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Driver Check ──────────────────────────────────────────────────────────────
function DriverCheckPage() {
  const [vehicles, setVehicles] = useState([]);
  const [checkItems, setCheckItems] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [checks, setChecks] = useState({});
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState("");
  const [driverName, setDriverName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      get(ref(db, "driver-settings/vehicles")),
      get(ref(db, "driver-settings/checkItems")),
    ]).then(([vSnap, cSnap]) => {
      const vList = vSnap.exists() ? Object.entries(vSnap.val()).map(([k, v]) => ({ key: k, ...v })) : [];
      const cList = cSnap.exists() ? Object.entries(cSnap.val()).map(([k, v]) => ({ key: k, ...v })) : [];
      setVehicles(vList);
      setCheckItems(cList);
      if (vList.length > 0) setSelectedVehicle(vList[0].key);
      const init = {}; cList.forEach(c => { init[c.key] = false; });
      setChecks(init);
      setLoading(false);
    });
  }, []);

  async function submit() {
    if (!driverName.trim()) { alert("請填寫司機姓名"); return; }
    if (!mileage) { alert("請填寫里程數"); return; }
    setSaving(true);
    const allPassed = checkItems.every(c => checks[c.key]);
    await set(ref(db, `driver-records/${uid()}`), {
      vehicleKey: selectedVehicle,
      vehicleName: vehicles.find(v => v.key === selectedVehicle)?.name || "",
      driverName: driverName.trim(),
      date: todayStr(),
      createdAt: new Date().toLocaleString("zh-TW"),
      mileage: Number(mileage),
      fuel: fuel ? Number(fuel) : null,
      checks: Object.fromEntries(checkItems.map(c => [c.key, { label: c.name, checked: checks[c.key] }])),
      allPassed,
    });
    setSaving(false);
    setSubmitted(true);
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>載入中...</div>;

  return (
    <div style={S.page}>

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#driver" style={S.backBtn}>← 返回</a>
            <div style={{ ...S.brandMark, background: "#1A6E45" }}>✅</div>
            <div><div style={S.brandName}>每日車輛檢查</div><div style={S.brandSub}>{todayStr()}</div></div>
          </div>
        </div>
      </header>
      <main style={{ ...S.main, maxWidth: 640 }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <div style={{ fontWeight: 900, fontSize: 24, color: "#1A6E45", marginBottom: 8 }}>提交成功！</div>
            <div style={{ color: "#888", marginBottom: 28 }}>今日車輛檢查已記錄完成</div>
            <a href="#driver" style={{ ...S.btnPrimary, background: "#1A6E45", display: "inline-block" }}>返回司機系統</a>
          </div>
        ) : vehicles.length === 0 ? (
          <div style={S.emptyState}>尚未設定車輛，請管理員前往設定</div>
        ) : (
          <>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#1A6E45" }}>👤 司機資料</div>
              <div style={S.metaField}>
                <label style={S.fieldLabel}>姓名</label>
                <input style={{ ...S.fieldInput, flex: 1 }} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="輸入司機姓名" />
              </div>
            </div>

            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#1A6E45" }}>🚚 選擇車輛</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {vehicles.map(v => (
                  <button key={v.key} style={{ ...DR.vehicleBtn, background: selectedVehicle === v.key ? "#1A6E45" : "#f5f5f5", color: selectedVehicle === v.key ? "#fff" : "#333" }} onClick={() => setSelectedVehicle(v.key)}>
                    🚚 {v.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#1A6E45" }}>📍 累計里程數（公里）</div>
              <input style={{ ...S.fieldInput, fontSize: 22, fontWeight: 700, textAlign: "center", width: "100%", padding: "14px" }} type="number" inputMode="numeric" min="0" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="輸入目前里程數" />
            </div>

            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#1A6E45" }}>⛽ 加油金額（元）<span style={{ fontSize: 13, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>選填</span></div>
              <input style={{ ...S.fieldInput, fontSize: 22, fontWeight: 700, textAlign: "center", width: "100%", padding: "14px" }} type="number" inputMode="numeric" min="0" value={fuel} onChange={e => setFuel(e.target.value)} placeholder="今日未加油請留空" />
            </div>

            <div style={{ ...S.card, marginBottom: 24 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#1A6E45" }}>✅ 檢查項目</div>
              {checkItems.length === 0 ? (
                <div style={{ color: "#ccc", fontSize: 13 }}>尚未設定檢查項目，請管理員前往設定</div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {checkItems.map(item => (
                      <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: checks[item.key] ? "#E8F5EE" : "#fafafa", borderRadius: 10, cursor: "pointer", border: `1.5px solid ${checks[item.key] ? "#1A6E45" : "#eee"}`, transition: "all 0.15s" }}>
                        <input type="checkbox" checked={checks[item.key] || false} onChange={e => setChecks(p => ({ ...p, [item.key]: e.target.checked }))} style={{ width: 22, height: 22, accentColor: "#1A6E45", cursor: "pointer", flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</span>
                        {checks[item.key] && <span style={{ marginLeft: "auto", color: "#1A6E45", fontWeight: 700 }}>✓</span>}
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 13, color: "#aaa" }}>已勾選 {Object.values(checks).filter(Boolean).length} / {checkItems.length} 項</div>
                </>
              )}
            </div>

            <button style={{ ...S.btnPrimary, background: saving ? "#aaa" : "#1A6E45", width: "100%", padding: "16px", fontSize: 18, borderRadius: 12 }} onClick={submit} disabled={saving}>
              {saving ? "提交中..." : "✅ 提交今日檢查"}
            </button>
          </>
        )}
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Driver Log ────────────────────────────────────────────────────────────────
function DriverLogPage() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [expandedRec, setExpandedRec] = useState(null);

  useEffect(() => {
    Promise.all([
      get(ref(db, "driver-records")),
      get(ref(db, "driver-settings/vehicles")),
    ]).then(([rSnap, vSnap]) => {
      const rList = rSnap.exists() ? Object.entries(rSnap.val()).map(([k, v]) => ({ key: k, ...v })) : [];
      rList.sort((a, b) => b.key.localeCompare(a.key));
      setRecords(rList);
      const vList = vSnap.exists() ? Object.entries(vSnap.val()).map(([k, v]) => ({ key: k, ...v })) : [];
      setVehicles(vList);
      if (vList.length > 0) setActiveVehicle(vList[0].key);
      setLoading(false);
    });
  }, []);

  const filtered = records.filter(r => !activeVehicle || r.vehicleKey === activeVehicle);

  return (
    <div style={S.page}>

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#driver" style={S.backBtn}>← 返回</a>
            <div style={{ ...S.brandMark, background: "#2E86C1" }}>📋</div>
            <div><div style={S.brandName}>檢查紀錄查閱</div><div style={S.brandSub}>{COMPANY}</div></div>
          </div>
        </div>
      </header>
      <main style={S.main}>
        {loading ? <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>載入中...</div> : (
          <>
            <div style={S.tabs}>
              {vehicles.map(v => (
                <button key={v.key} style={{ ...S.tab, ...(activeVehicle === v.key ? { borderBottom: "3px solid #2E86C1", color: "#2E86C1", fontWeight: 700 } : {}) }} onClick={() => setActiveVehicle(v.key)}>
                  🚚 {v.name}
                </button>
              ))}
            </div>
            {filtered.length === 0 ? <div style={S.emptyState}>此車輛尚無檢查紀錄</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map(rec => {
                  const isExpanded = expandedRec === rec.key;
                  const checkList = rec.checks ? Object.values(rec.checks) : [];
                  const passCount = checkList.filter(c => c.checked).length;
                  return (
                    <div key={rec.key} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                      <button style={{ width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}
                        onClick={() => setExpandedRec(isExpanded ? null : rec.key)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: rec.allPassed ? "#1A6E45" : "#E74C3C", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{rec.date}</div>
                            <div style={{ fontSize: 13, color: "#888" }}>司機：{rec.driverName} · 里程：{rec.mileage?.toLocaleString()} km{rec.fuel ? ` · 加油：$${rec.fuel.toLocaleString()}` : ""}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ background: rec.allPassed ? "#E8F5EE" : "#FFF0F0", color: rec.allPassed ? "#1A6E45" : "#E74C3C", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            {rec.allPassed ? "✓ 全數通過" : `⚠️ ${passCount}/${checkList.length}`}
                          </span>
                          <span style={{ color: "#ccc" }}>{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div style={{ padding: "0 18px 18px", borderTop: "1px solid #f0f0f0" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                            {checkList.map((c, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: c.checked ? "#E8F5EE" : "#FFF0F0", borderRadius: 8 }}>
                                <span style={{ fontSize: 16 }}>{c.checked ? "✅" : "❌"}</span>
                                <span style={{ fontWeight: 600 }}>{c.label}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: 10, fontSize: 12, color: "#aaa" }}>提交時間：{rec.createdAt}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Driver Settings ───────────────────────────────────────────────────────────
function DriverSettingsPage() {
  const [vehicles, setVehicles] = useState([]);
  const [checkItems, setCheckItems] = useState([]);
  const [newVehicle, setNewVehicle] = useState("");
  const [newCheck, setNewCheck] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get(ref(db, "driver-settings/vehicles")),
      get(ref(db, "driver-settings/checkItems")),
    ]).then(([vSnap, cSnap]) => {
      const vList = vSnap.exists() ? Object.entries(vSnap.val()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [];
      const cList = cSnap.exists() ? Object.entries(cSnap.val()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [];
      setVehicles(vList); setCheckItems(cList); setLoading(false);
    });
  }, []);

  function flash() { setSaved("✓ 已儲存"); setTimeout(() => setSaved(""), 1500); }

  async function saveVehicles(list) {
    const obj = {}; list.forEach((v, idx) => { obj[v.key] = { name: v.name, order: idx }; });
    await set(ref(db, "driver-settings/vehicles"), obj); setVehicles(list); flash();
  }
  async function saveChecks(list) {
    const obj = {}; list.forEach((c, idx) => { obj[c.key] = { name: c.name, order: idx }; });
    await set(ref(db, "driver-settings/checkItems"), obj); setCheckItems(list); flash();
  }
  function addVehicle() { if (!newVehicle.trim()) return; saveVehicles([...vehicles, { key: uid(), name: newVehicle.trim(), order: vehicles.length }]); setNewVehicle(""); }
  function removeVehicle(key) { if (!confirm("確定刪除此車輛？")) return; saveVehicles(vehicles.filter(v => v.key !== key)); }
  function addCheck() { if (!newCheck.trim()) return; saveChecks([...checkItems, { key: uid(), name: newCheck.trim(), order: checkItems.length }]); setNewCheck(""); }
  function removeCheck(key) { if (!confirm("確定刪除此項目？")) return; saveChecks(checkItems.filter(c => c.key !== key)); }

  return (
    <div style={S.page}>

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#driver" style={S.backBtn}>← 返回</a>
            <div style={{ ...S.brandMark, background: "#1A6E45" }}>⚙️</div>
            <div><div style={S.brandName}>司機系統設定</div><div style={S.brandSub}>管理車輛 · 設定檢查項目 · 拖拉排序</div></div>
          </div>
          {saved && <div style={S.savedTag}>{saved}</div>}
        </div>
      </header>
      <main style={{ ...S.main, maxWidth: 700 }}>
        {loading ? <div style={{ color: "#aaa", textAlign: "center", padding: 40 }}>載入中...</div> : (
          <>
            <div style={{ ...S.card, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "#1A6E45" }}>🚚 車輛管理</div>
              <div style={{ fontSize: 12, color: "#bbb", marginBottom: 14 }}>☰ 長按拖拉可調整順序</div>
              {vehicles.length === 0 && <div style={{ color: "#ccc", fontSize: 13, marginBottom: 12 }}>尚未新增車輛</div>}
              <DraggableList
                items={vehicles}
                onReorder={saveVehicles}
                renderItem={(v) => (
                  <div style={{ ...S.settingRow, background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#ccc", fontSize: 18, cursor: "grab", userSelect: "none" }}>☰</span>
                      <div style={S.settingName}>🚚 {v.name}</div>
                    </div>
                    <button style={S.deleteBtn} onClick={() => removeVehicle(v.key)}>✕ 刪除</button>
                  </div>
                )}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <input style={{ ...S.fieldInput, flex: 1, color: "#1a1a1a" }} value={newVehicle} onChange={e => setNewVehicle(e.target.value)} onKeyDown={e => e.key === "Enter" && addVehicle()} placeholder="新增車輛名稱或車牌" />
                <button style={{ ...S.btnPrimary, background: "#1A6E45" }} onClick={addVehicle}>＋ 新增</button>
              </div>
            </div>

            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "#1A6E45" }}>✅ 檢查項目</div>
              <div style={{ fontSize: 12, color: "#bbb", marginBottom: 14 }}>☰ 長按拖拉可調整順序</div>
              {checkItems.length === 0 && <div style={{ color: "#ccc", fontSize: 13, marginBottom: 12 }}>尚未新增項目</div>}
              <DraggableList
                items={checkItems}
                onReorder={saveChecks}
                renderItem={(c, idx) => (
                  <div style={{ ...S.settingRow, background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#ccc", fontSize: 18, cursor: "grab", userSelect: "none" }}>☰</span>
                      <div style={S.settingName}>{idx + 1}. {c.name}</div>
                    </div>
                    <button style={S.deleteBtn} onClick={() => removeCheck(c.key)}>✕ 刪除</button>
                  </div>
                )}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <input style={{ ...S.fieldInput, flex: 1, color: "#1a1a1a" }} value={newCheck} onChange={e => setNewCheck(e.target.value)} onKeyDown={e => e.key === "Enter" && addCheck()} placeholder="新增檢查項目" />
                <button style={{ ...S.btnPrimary, background: "#1A6E45" }} onClick={addCheck}>＋ 新增</button>
              </div>
            </div>
          </>
        )}
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Inventory Settings ────────────────────────────────────────────────────────
function InventorySettingsPage() {
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [newNames, setNewNames] = useState({});
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(SHEETS[0].id);

  useEffect(() => { get(ref(db, "settings/items")).then(snap => { setItems(snap.exists() ? snap.val() : {}); setLoading(false); }); }, []);

  function getOrderedItems(sheetId) {
    if (!items[sheetId]) return [];
    return Object.entries(items[sheetId])
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  async function saveItems(sheetId, list) {
    const obj = {};
    list.forEach((item, idx) => { obj[item.key] = { name: item.name, safetyStock: item.safetyStock ?? 0, order: idx }; });
    const next = { ...items, [sheetId]: obj };
    setItems(next); await set(ref(db, "settings/items"), next); flash();
  }

  async function addItem(sheetId) {
    const name = (newNames[sheetId] || "").trim(); if (!name) return;
    const key = uid();
    const current = getOrderedItems(sheetId);
    const newItem = { key, name, safetyStock: 0, order: current.length };
    const obj = {};
    [...current, newItem].forEach((item, idx) => { obj[item.key] = { name: item.name, safetyStock: item.safetyStock ?? 0, order: idx }; });
    const next = { ...items, [sheetId]: obj };
    setItems(next); await set(ref(db, "settings/items"), next);
    setNewNames(p => ({ ...p, [sheetId]: "" })); flash();
  }

  async function removeItem(sheetId, key) {
    if (!confirm("確定刪除此品項？")) return;
    const current = getOrderedItems(sheetId).filter(i => i.key !== key);
    await saveItems(sheetId, current);
  }

  async function updateSafety(sheetId, key, val) {
    const current = getOrderedItems(sheetId).map(i => i.key === key ? { ...i, safetyStock: Number(val) } : i);
    await saveItems(sheetId, current);
  }

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1500); }

  const sheet = SHEETS.find(s => s.id === activeTab);
  const sheetItems = getOrderedItems(activeTab);

  return (
    <div style={S.page}>

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#warehouse" style={S.backBtn}>← 返回</a>
            <div style={S.brandMark}>威</div>
            <div><div style={S.brandName}>品項設定</div><div style={S.brandSub}>管理品項 · 設定安全庫存 · 拖拉排序</div></div>
          </div>
          {saved && <div style={S.savedTag}>✓ 已儲存</div>}
        </div>
      </header>
      <main style={S.main}>
        <div style={S.tabs}>
          {SHEETS.map(s => <button key={s.id} style={{ ...S.tab, ...(activeTab === s.id ? { borderBottom: `3px solid ${s.color}`, color: s.color, fontWeight: 700 } : {}) }} onClick={() => setActiveTab(s.id)}>{s.icon} {s.label}</button>)}
        </div>
        <div style={{ ...S.card, marginTop: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: sheet.color }}>{sheet.icon} {sheet.label} — 品項清單</div>
          <div style={{ fontSize: 12, color: "#bbb", marginBottom: 16 }}>☰ 長按拖拉可調整順序</div>
          {loading ? <div style={{ color: "#aaa" }}>載入中...</div> : (
            <>
              {sheetItems.length === 0 && <div style={S.emptyState}>尚無品項</div>}
              <DraggableList
                items={sheetItems}
                onReorder={list => saveItems(activeTab, list)}
                renderItem={(item) => (
                  <div style={{ ...S.settingRow, background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#ccc", fontSize: 18, cursor: "grab", userSelect: "none" }}>☰</span>
                      <div style={S.settingName}>{item.name}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#888" }}>安全庫存：</span>
                      <input type="number" min="0" inputMode="numeric"
                        style={{ ...S.fieldInput, width: 80, textAlign: "center" }}
                        value={item.safetyStock || 0}
                        onChange={e => updateSafety(activeTab, item.key, e.target.value)} />
                      <button style={S.deleteBtn} onClick={() => removeItem(activeTab, item.key)}>✕ 刪除</button>
                    </div>
                  </div>
                )}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <input style={{ ...S.fieldInput, flex: 1 }} value={newNames[activeTab] || ""}
                  onChange={e => setNewNames(p => ({ ...p, [activeTab]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addItem(activeTab)}
                  placeholder={`新增${sheet.label}品項名稱`} />
                <button style={{ ...S.btnPrimary, background: sheet.color }} onClick={() => addItem(activeTab)}>＋ 新增</button>
              </div>
            </>
          )}
        </div>
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Sheet Page ────────────────────────────────────────────────────────────────
function SheetPage({ sheet }) {
  const [items, setItems] = useState([]);
  const [operator, setOperator] = useState("");
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [reviewLink, setReviewLink] = useState(null);
  const [lotHistory, setLotHistory] = useState({});
  const [lotDropdown, setLotDropdown] = useState(null);

  useEffect(() => {
    get(ref(db, `settings/items/${sheet.id}`)).then(snap => {
      setItems(snap.exists() ? Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : []);
    });
    onValue(ref(db, `sheets/${sheet.id}`), snap => {
      if (snap.exists()) {
        const d = snap.val();
        const savedDate = d.meta?.date || "";
        const today = todayStr();
        if (savedDate && savedDate !== today) {
          // 日期不同 → 清空進入新一天盤點
          setOperator(d.meta?.operator || "");
          setDate(today);
          setEntries({});
        } else {
          setOperator(d.meta?.operator || "");
          setDate(d.meta?.date || today);
          setEntries(d.entries || {});
        }
      }
      setLoading(false);
    });
    get(ref(db, "history")).then(snap => {
      if (!snap.exists()) return;
      const arr = Object.values(snap.val()).filter(r => r.sheetId === sheet.id);
      arr.sort((a, b) => b.createdAt?.localeCompare(a.createdAt));
      const hist = {};
      arr.slice(0, 10).forEach(rec => {
        (rec.rows || []).forEach(row => {
          if (!hist[row.name]) hist[row.name] = [];
          (row.slots || []).forEach(s => { if (s?.lot && !hist[row.name].includes(s.lot)) hist[row.name].push(s.lot); });
        });
      });
      Object.keys(hist).forEach(k => { hist[k] = hist[k].slice(0, 3); });
      setLotHistory(hist);
    });
  }, [sheet.id]);

  async function persist(newEntries, op, dt, done = false) {
    setSaving(true);
    const completedCount = items.filter(item => (newEntries[item.key] || []).some(s => s?.lot || s?.qty)).length;
    const status = done ? "done" : (completedCount === items.length && items.length > 0 ? "done" : "partial");
    const meta = { operator: op, date: dt, itemCount: items.length, completedCount, status };
    await set(ref(db, `sheets/${sheet.id}`), { meta, entries: newEntries });
    setSaving(false); setSavedMsg("✓ 已儲存"); setTimeout(() => setSavedMsg(""), 1800);
  }

  function updateSlot(itemKey, slotIdx, field, value) {
    const current = entries[itemKey] || Array(SLOTS).fill({ lot: "", qty: "" });
    const slots = current.map((s, i) => i === slotIdx ? { ...s, [field]: value } : s);
    const next = { ...entries, [itemKey]: slots };
    setEntries(next); persist(next, operator, date);
  }
  function applyLot(itemKey, slotIdx, lot) { updateSlot(itemKey, slotIdx, "lot", lot); setLotDropdown(null); }

  async function buildAndDownload() {
    const isPack = sheet.id.includes("pack");
    const safetyAlerts = [];
    const rows = items.map(item => {
      const slots = entries[item.key] || [];
      const total = slots.reduce((a, s) => a + (parseFloat(s.qty) || 0), 0);
      const isLow = item.safetyStock > 0 && total < item.safetyStock;
      if (isLow) safetyAlerts.push({ name: item.name, total, safetyStock: item.safetyStock });
      return { item, slots, total, isLow };
    });
    const now = new Date().toLocaleString("zh-TW");
    // 日期格式 YYYY-MM-DD
    const dateForFile = date.replace(/\//g, "-");

    const tableHeaders = isPack
      ? `<th style="width:4%">#</th><th style="width:30%">品項名稱</th><th>數量1</th><th>數量2</th><th>數量3</th><th>合計</th><th>安全庫存</th><th>狀態</th>`
      : `<th style="width:4%">#</th><th style="width:18%">品項名稱</th><th>批號1</th><th>數量1</th><th>批號2</th><th>數量2</th><th>批號3</th><th>數量3</th><th>合計</th><th>安全庫存</th><th>狀態</th>`;

    const tableRows = rows.map((r, idx) => {
      const cells = isPack
        ? [0,1,2].map(i => `<td style="text-align:right">${r.slots[i]?.qty||"—"}</td>`).join("")
        : [0,1,2].map(i => `<td style="font-family:monospace;font-size:11px">${r.slots[i]?.lot||"—"}</td><td style="text-align:right">${r.slots[i]?.qty||"—"}</td>`).join("");
      return `<tr class="${r.isLow?"low":""}"><td>${idx+1}</td><td><strong>${r.item.name}</strong></td>${cells}<td style="text-align:right;font-weight:900;color:${sheet.color}">${r.total||"—"}</td><td style="text-align:right;color:#888">${r.item.safetyStock>0?r.item.safetyStock:"—"}</td><td style="text-align:center">${r.isLow?"⚠️ 不足":r.total>0?"✓":"—"}</td></tr>`;
    }).join("");

    const alertPage = safetyAlerts.length > 0 ? `
<div style="page-break-before:always;padding:24px;font-family:'Noto Sans TC',sans-serif;">
  <div style="border-bottom:2px solid #E74C3C;padding-bottom:14px;margin-bottom:20px;">
    <div style="font-size:11px;color:#aaa">${COMPANY}</div>
    <div style="font-size:20px;font-weight:900;color:#E74C3C;">⚠️ 低於安全庫存 — 到貨回覆表</div>
    <div style="font-size:12px;color:#888;margin-top:4px">${sheet.label} · 盤點日期：${date} · 請填寫後截圖回傳</div>
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#E74C3C;">
        <th style="color:#fff;padding:10px;text-align:left;font-size:12px;width:4%">#</th>
        <th style="color:#fff;padding:10px;text-align:left;font-size:12px;width:22%">品項名稱</th>
        <th style="color:#fff;padding:10px;text-align:right;font-size:12px;width:9%">現有</th>
        <th style="color:#fff;padding:10px;text-align:right;font-size:12px;width:9%">安全庫存</th>
        <th style="color:#fff;padding:10px;text-align:right;font-size:12px;width:9%">缺口</th>
        <th style="color:#fff;padding:10px;text-align:center;font-size:12px;width:22%">預計到貨日期</th>
        <th style="color:#fff;padding:10px;text-align:center;font-size:12px;width:15%">訂購數量</th>
        <th style="color:#fff;padding:10px;text-align:left;font-size:12px;width:10%">備註</th>
      </tr>
    </thead>
    <tbody>
      ${safetyAlerts.map((a, i) => `
      <tr style="background:${i%2===0?"#fff":"#fafafa"}">
        <td style="padding:10px;border-bottom:1px solid #eee">${i+1}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">${a.name}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;color:#C0392B;font-weight:700">${a.total}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${a.safetyStock}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;color:#C0392B;font-weight:900">-${a.safetyStock - a.total}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">
          <div style="display:flex;gap:4px;align-items:center;justify-content:center">
            <select id="m${i}" style="padding:5px 4px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;background:#fff;cursor:pointer;color:#1a1a1a">
              <option value="">月</option>
              ${Array.from({length:12},(_,k)=>`<option value="${k+1}">${k+1}月</option>`).join("")}
            </select>
            <select id="d${i}" style="padding:5px 4px;border:1.5px solid #ddd;border-radius:6px;font-size:13px;background:#fff;cursor:pointer;color:#1a1a1a">
              <option value="">日</option>
              ${Array.from({length:31},(_,k)=>`<option value="${k+1}">${k+1}日</option>`).join("")}
            </select>
          </div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">
          <input id="q${i}" type="number" min="0" style="width:80px;padding:5px 8px;border:1.5px solid #ddd;border-radius:6px;font-size:14px;font-weight:700;text-align:center;color:#1a1a1a" placeholder="數量" />
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee">
          <input id="n${i}" type="text" style="width:100%;padding:5px 8px;border:1.5px solid #ddd;border-radius:6px;font-size:12px;color:#1a1a1a" placeholder="備註" />
        </td>
      </tr>`).join("")}
    </tbody>
  </table>
  <div style="margin-top:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
    <div style="font-size:12px;color:#aaa">經理簽核：___________________　　回覆日期：___________________</div>
    <button onclick="window.print()" style="margin-left:auto;padding:8px 20px;background:#E74C3C;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px;">📸 截圖 / 列印</button>
  </div>
</div>` : "";


    const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Noto Sans TC',sans-serif;color:#1a1a1a;padding:24px;font-size:13px;}table{width:100%;border-collapse:collapse;margin-bottom:24px;}th{background:${sheet.color};color:#fff;padding:8px 10px;text-align:left;font-size:12px;}td{padding:7px 10px;border-bottom:1px solid #eee;}tr:nth-child(even) td{background:#fafafa;}.low td{background:#FFF0F0!important;color:#C0392B;font-weight:700;}.footer{text-align:center;color:#bbb;font-size:11px;margin-top:30px;padding-top:14px;border-top:1px solid #eee;}@media print{@page{margin:1cm;}button{display:none!important;}}</style></head><body><button class="close-btn" onclick="window.close()">✕ 關閉</button><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid ${sheet.color};"><div><div style="font-size:11px;color:#aaa">${COMPANY}</div><div style="font-size:22px;font-weight:900;color:${sheet.color}">${sheet.icon} ${sheet.label}盤點表</div><div style="font-size:12px;color:#666;margin-top:4px">負責人：${operator||"—"} | 盤點日期：${date} | 產出時間：${now}</div></div><div style="border:2px solid ${sheet.color};border-radius:6px;padding:4px 14px;color:${sheet.color};font-weight:700;font-size:12px;">共 ${items.length} 品項</div></div><table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>${safetyAlerts.length>0?`<div style="background:#FFF0F0;border:1.5px solid #E74C3C;border-radius:8px;padding:12px;font-size:12px;color:#C0392B;font-weight:700;">⚠️ 共 ${safetyAlerts.length} 項低於安全庫存，詳見第二頁到貨追蹤表</div>`:`<div style="text-align:center;padding:12px;color:#1A6E45;font-weight:700;">✓ 所有品項均達安全庫存標準</div>`}<div class="footer">${COMPANY} · 庫存盤點管理系統 · ${now}</div>${alertPage}</body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.setTimeout(() => { w.print(); }, 600);

    // 標記為完成
    const histKey = `${sheet.id}_${dateForFile}`;
    persist(entries, operator, date, true);
    set(ref(db, `history/${histKey}`), {
      sheetId: sheet.id, sheetLabel: sheet.label, operator, date,
      createdAt: now,
      rows: rows.map(r => ({ name: r.item.name, slots: r.slots, total: r.total, safetyStock: r.item.safetyStock, isLow: r.isLow })),
      alertCount: safetyAlerts.length,
    });

    // 如果有低庫存，產生經理回覆連結
    if (safetyAlerts.length > 0) {
      const reviewKey = `${sheet.id}_${dateForFile}`;
      const base = window.location.href.split("#")[0];
      const link = `${base}#review/${reviewKey}`;
      await set(ref(db, `manager-reviews/${reviewKey}`), {
        sheetId: sheet.id,
        sheetLabel: sheet.label,
        sheetColor: sheet.color,
        sheetIcon: sheet.icon,
        operator, date, createdAt: now,
        alerts: safetyAlerts,
        status: "pending",
      });
      setReviewLink(link);
    }
  }

  const isPack = sheet.id.includes("pack");
  const completedCount = items.filter(item => {
    const slots = entries[item.key] || [];
    return isPack
      ? slots.some(s => s?.qty)
      : slots.some(s => s?.lot || s?.qty);
  }).length;
  const allDone = items.length > 0 && completedCount === items.length;

  return (
    <div style={S.page} onClick={() => setLotDropdown(null)}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#warehouse" style={S.backBtn}>← 返回</a>
            <div style={{ ...S.brandMark, background: sheet.color }}>{sheet.icon}</div>
            <div><div style={S.brandName}>{sheet.label}盤點表</div><div style={S.brandSub}>{COMPANY}</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saving && <span style={{ fontSize: 12, color: "#aaa" }}>儲存中...</span>}
            {savedMsg && <span style={{ fontSize: 12, color: "#1A6E45", fontWeight: 700 }}>{savedMsg}</span>}
            <button style={{ ...S.btnPrimary, background: sheet.color }} onClick={buildAndDownload}>📥 遞交並下載</button>
          </div>
        </div>
      </header>
      {loading ? <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>載入中...</div> : (
        <main style={S.main}>
          <div style={S.metaRow}>
            <div style={S.metaField}><label style={S.fieldLabel}>負責人</label><input style={S.fieldInput} value={operator} onChange={e => { setOperator(e.target.value); persist(entries, e.target.value, date); }} placeholder="輸入姓名" /></div>
            <div style={S.metaField}><label style={S.fieldLabel}>盤點日期</label><input style={S.fieldInput} value={date} onChange={e => { setDate(e.target.value); persist(entries, operator, e.target.value); }} /></div>
            <div style={{ marginLeft: "auto", fontSize: 13, color: "#888", fontWeight: 600 }}>完成 {completedCount} / {items.length} 品項</div>
          </div>
          {items.length === 0 ? <div style={S.emptyState}><div style={{ fontSize: 36, marginBottom: 10 }}>📋</div><div>尚未設定品項</div></div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((item, idx) => {
                const slots = entries[item.key] || Array(SLOTS).fill({ lot: "", qty: "" });
                const total = slots.reduce((a, s) => a + (parseFloat(s?.qty) || 0), 0);
                const isLow = item.safetyStock > 0 && total < item.safetyStock && total > 0;
                const hasFilled = slots.some(s => s?.lot || s?.qty);
                const recentLots = lotHistory[item.name] || [];
                return (
                  <div key={item.key} style={{ ...S.itemCard, borderLeft: `4px solid ${hasFilled ? sheet.color : "#ddd"}`, background: isLow ? "#FFF8F8" : "#fff" }}>
                    <div style={S.itemHeader}>
                      <div style={S.itemNum}>{idx + 1}</div>
                      <div style={S.itemName}>{item.name}</div>
                      {item.safetyStock > 0 && <div style={{ fontSize: 12, color: "#aaa" }}>安全庫存：{item.safetyStock}</div>}
                      {total > 0 && <div style={{ ...S.totalBadge, background: isLow ? "#FFF0F0" : "#F0F9F4", color: isLow ? "#C0392B" : sheet.color, border: `1px solid ${isLow ? "#E74C3C" : sheet.color}` }}>{isLow ? "⚠️" : "✓"} 合計：{total}</div>}
                    </div>
                    <div style={S.slotsRow}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={S.slot}>
                          <div style={S.slotLabel}>第 {i + 1} 組</div>
                          {!isPack && (
                            <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                              <input
                                style={S.slotInput}
                                inputMode="numeric"
                                value={slots[i]?.lot || ""}
                                onChange={e => updateSlot(item.key, i, "lot", e.target.value)}
                                placeholder="批號"
                              />
                              {recentLots.length > 0 && (
                                <button
                                  style={{ ...S.lotHistBtn, width: "100%", marginTop: 4, fontSize: 11, padding: "4px 6px", color: "#aaa", textAlign: "left" }}
                                  onClick={() => setLotDropdown(lotDropdown?.itemKey === item.key && lotDropdown?.slotIdx === i ? null : { itemKey: item.key, slotIdx: i })}
                                >
                                  🕐 最近批號
                                </button>
                              )}
                              {lotDropdown?.itemKey === item.key && lotDropdown?.slotIdx === i && (
                                <div style={S.lotDropdown}>
                                  <div style={S.lotDropdownTitle}>最近批號</div>
                                  {recentLots.map((lot, li) => <button key={li} style={S.lotOption} onClick={() => applyLot(item.key, i, lot)}>{lot}</button>)}
                                </div>
                              )}
                            </div>
                          )}
                          <input style={{ ...S.slotInput, textAlign: "right" }} type="number" min="0" inputMode="numeric" value={slots[i]?.qty || ""} onChange={e => updateSlot(item.key, i, "qty", e.target.value)} placeholder="數量" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {items.length > 0 && (
            <div style={{ textAlign: "center", marginTop: 30, paddingBottom: 20 }}>
              <button
                style={{ ...S.btnPrimary, background: allDone ? "#1A6E45" : sheet.color, fontSize: 16, padding: "16px 44px", borderRadius: 14, opacity: items.length === 0 ? 0.5 : 1 }}
                onClick={buildAndDownload}
              >
                {allDone ? "✅ 遞交完成並下載" : "📥 遞交並下載盤點表"}
              </button>
              {!allDone && <div style={{ marginTop: 8, fontSize: 12, color: "#aaa" }}>尚有 {items.length - completedCount} 個品項未填寫</div>}

              {/* 經理回覆連結 */}
              {reviewLink && (
                <div style={{ marginTop: 20, background: "#FFF8E8", border: "1.5px solid #F39C12", borderRadius: 14, padding: "18px 20px", textAlign: "left" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#B7770D", marginBottom: 6 }}>📨 傳給楊經理填寫</div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>經理打開連結即可選日期、填數量，填完截圖傳回群組</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #eee" }}>
                    <span style={{ fontSize: 12, color: "#666", flex: 1, wordBreak: "break-all" }}>{reviewLink}</span>
                    <button style={{ ...S.btnPrimary, background: "#F39C12", fontSize: 13, padding: "8px 14px", flexShrink: 0 }}
                      onClick={() => { navigator.clipboard.writeText(reviewLink); alert("連結已複製！"); }}>
                      複製連結
                    </button>
                  </div>
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    <QRImg url={reviewLink} size={100} />
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>或掃描 QR Code</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────
function HistoryPage() {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(SHEETS[0].id);
  const [deletePwd, setDeletePwd] = useState({ open: false, rec: null });
  const [expandedItem, setExpandedItem] = useState(null);
  const [viewModal, setViewModal] = useState(null); // { rec, sheet, html }

  function loadData() {
    get(ref(db, "history")).then(snap => {
      const g = {}; SHEETS.forEach(s => { g[s.id] = []; });
      if (snap.exists()) {
        const arr = Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v }));
        arr.sort((a, b) => b.key.localeCompare(a.key));
        arr.forEach(r => { if (g[r.sheetId]) g[r.sheetId].push(r); });
      }
      setGrouped(g); setLoading(false);
    });
  }
  useEffect(() => { loadData(); }, []);
  async function deleteRecord(rec) { await remove(ref(db, `history/${rec.key}`)); loadData(); }

  function buildTrend(records) {
    const names = new Set();
    records.forEach(rec => (rec.rows || []).forEach(r => names.add(r.name)));
    const trends = {};
    names.forEach(name => {
      const pts = [];
      records.slice().reverse().forEach(rec => {
        const row = (rec.rows || []).find(r => r.name === name);
        if (row) pts.push({ date: rec.date, total: row.total || 0, safetyStock: row.safetyStock || 0 });
      });
      if (pts.length >= 2) trends[name] = pts;
    });
    return trends;
  }

  function buildHtml(rec, sheet) {
    const alertPage = rec.alertCount > 0 ? `<div style="page-break-before:always;padding:24px;"><div style="border-bottom:2px solid #E74C3C;padding-bottom:12px;margin-bottom:20px;"><div style="font-size:11px;color:#aaa">${COMPANY}（歷史）</div><div style="font-size:20px;font-weight:900;color:#E74C3C;">⚠️ 低於安全庫存 — 到貨追蹤表</div></div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#E74C3C;"><th style="color:#fff;padding:8px;font-size:12px;">#</th><th style="color:#fff;padding:8px;font-size:12px;">品項</th><th style="color:#fff;padding:8px;font-size:12px;text-align:right">現有</th><th style="color:#fff;padding:8px;font-size:12px;text-align:right">安全</th><th style="color:#fff;padding:8px;font-size:12px;text-align:right">缺口</th><th style="color:#fff;padding:8px;font-size:12px;">到貨日期</th></tr></thead><tbody>${(rec.rows||[]).filter(r=>r.isLow).map((r,i)=>`<tr><td style="padding:10px;border-bottom:1px solid #eee">${i+1}</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">${r.name}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right;color:#C0392B;font-weight:700">${r.total}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${r.safetyStock}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right;color:#C0392B;font-weight:900">-${r.safetyStock-r.total}</td><td style="padding:10px;border-bottom:1px solid #eee"><div style="border-bottom:1px solid #ddd;height:24px;margin:0 8px"></div></td></tr>`).join("")}</tbody></table></div>` : "";
    return `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:sans-serif;padding:24px;font-size:13px;}table{width:100%;border-collapse:collapse;}th{background:${sheet.color};color:#fff;padding:8px 10px;text-align:left;font-size:12px;}td{padding:8px 10px;border-bottom:1px solid #eee;}tr:nth-child(even) td{background:#fafafa;}.low td{background:#FFF0F0!important;color:#C0392B;font-weight:700;}</style></head><body><button class="close-btn" onclick="window.close()">✕ 關閉</button><div style="border-bottom:2px solid ${sheet.color};padding-bottom:12px;margin-bottom:18px;"><div style="font-size:11px;color:#aaa">${COMPANY}（歷史）</div><div style="font-size:20px;font-weight:900;color:${sheet.color}">${sheet.icon} ${rec.sheetLabel}盤點表</div><div style="font-size:12px;color:#888;margin-top:4px">負責人：${rec.operator||"—"} | 日期：${rec.date} | 產出：${rec.createdAt}</div></div><table><thead><tr><th>#</th><th>品項</th><th>批號1</th><th>數量1</th><th>批號2</th><th>數量2</th><th>批號3</th><th>數量3</th><th>合計</th><th>狀態</th></tr></thead><tbody>${(rec.rows||[]).map((r,i)=>`<tr class="${r.isLow?"low":""}"><td>${i+1}</td><td><strong>${r.name}</strong></td>${[0,1,2].map(j=>`<td>${r.slots?.[j]?.lot||"—"}</td><td style="text-align:right">${r.slots?.[j]?.qty||"—"}</td>`).join("")}<td style="text-align:right;font-weight:900;color:${sheet.color}">${r.total||0}</td><td>${r.isLow?"⚠️":"✓"}</td></tr>`).join("")}</tbody></table>${rec.alertCount>0?`<div style="background:#FFF0F0;border:1.5px solid #E74C3C;border-radius:8px;padding:12px;margin-top:16px;color:#C0392B;font-weight:700;">⚠️ ${rec.alertCount} 項低於安全庫存</div>`:`<div style="text-align:center;padding:12px;color:#1A6E45;font-weight:700;margin-top:16px">✓ 所有品項達標</div>`}${alertPage}</body></html>`;
  }

  // 純讀取，不寫入任何資料到 Firebase
  function viewRecord(rec, sheet) {
    const html = buildHtml(rec, sheet);
    setViewModal({ rec, sheet, html });
  }
  function downloadRecord(rec, sheet) {
    const w = window.open("", "_blank");
    w.document.write(buildHtml(rec, sheet));
    w.document.close();
    w.setTimeout(() => { w.print(); }, 600);
  }

  const sheet = SHEETS.find(s => s.id === activeTab);
  const records = grouped[activeTab] || [];
  const trends = buildTrend(records);

  return (
    <div style={S.page}>

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#warehouse" style={S.backBtn}>← 返回</a>
            <div style={S.brandMark}>威</div>
            <div><div style={S.brandName}>歷史盤點紀錄</div><div style={S.brandSub}>{COMPANY}</div></div>
          </div>
        </div>
      </header>
      <main style={S.main}>
        <div style={S.tabs}>
          {SHEETS.map(s => (
            <button key={s.id} style={{ ...S.tab, ...(activeTab === s.id ? { borderBottom: `3px solid ${s.color}`, color: s.color, fontWeight: 700 } : {}) }} onClick={() => { setActiveTab(s.id); setExpandedItem(null); }}>
              {s.icon} {s.label}{grouped[s.id]?.length > 0 && <span style={{ marginLeft: 6, background: s.color, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>{grouped[s.id].length}</span>}
            </button>
          ))}
        </div>
        {loading ? <div style={{ color: "#aaa", textAlign: "center", padding: 60 }}>載入中...</div> : (
          <>
            {records.length === 0 ? <div style={S.emptyState}>此盤點表尚無歷史紀錄</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                {records.map(rec => (
                  <div key={rec.key} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ ...S.brandMark, background: sheet.color, fontSize: 18 }}>{sheet.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{rec.date}</div>
                        <div style={{ fontSize: 13, color: "#888" }}>負責人：{rec.operator || "未填"} · {rec.rows?.length || 0} 品項</div>
                        <div style={{ fontSize: 12, color: "#aaa" }}>產出：{rec.createdAt}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {rec.alertCount > 0 && <span style={{ background: "#FFF0F0", color: "#C0392B", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⚠️ {rec.alertCount} 項不足</span>}
                      <button style={{ ...S.btnPrimary, background: "#555", fontSize: 13 }} onClick={() => viewRecord(rec, sheet)}>👁 查閱</button>
                      <button style={{ ...S.btnPrimary, background: sheet.color, fontSize: 13 }} onClick={() => downloadRecord(rec, sheet)}>⬇️ 下載</button>
                      <button style={{ ...S.btnPrimary, background: "#e74c3c", fontSize: 13 }} onClick={() => setDeletePwd({ open: true, rec })}>🗑 刪除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(trends).length > 0 && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>📈 庫存趨勢分析</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.keys(trends).map(name => {
                    const data = trends[name]; const latest = data[data.length - 1];
                    const isLow = latest.safetyStock > 0 && latest.total < latest.safetyStock;
                    const isExpanded = expandedItem === name;
                    return (
                      <div key={name} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                        <button style={{ width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => setExpandedItem(isExpanded ? null : name)}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ fontWeight: 700 }}>{name}</div>
                            {isLow && <span style={{ background: "#FFF0F0", color: "#C0392B", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>⚠️ 低庫存</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, color: sheet.color, fontWeight: 700 }}>最新：{latest.total}</span>
                            <span style={{ color: "#ccc" }}>{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${sheet.color}20` }}>
                            <TrendChart data={data} safetyStock={latest.safetyStock} color={sheet.color} />
                            <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 12, color: "#888" }}>
                              <span>最高：{Math.max(...data.map(d => d.total))}</span>
                              <span>最低：{Math.min(...data.map(d => d.total))}</span>
                              <span>平均：{Math.round(data.reduce((a, d) => a + d.total, 0) / data.length)}</span>
                              {latest.safetyStock > 0 && <span style={{ color: "#E74C3C" }}>安全庫存：{latest.safetyStock}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
      {deletePwd.open && <PwdModal title="🔒 確認刪除此筆紀錄" onSuccess={() => deleteRecord(deletePwd.rec)} onClose={() => setDeletePwd({ open: false, rec: null })} />}

      {/* 查閱 Modal */}
      {viewModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#fff", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{viewModal.rec.sheetLabel}盤點表 · {viewModal.rec.date}</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>負責人：{viewModal.rec.operator || "—"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...S.btnPrimary, background: SHEETS.find(s => s.id === viewModal.rec.sheetId)?.color || "#555" }} onClick={() => downloadRecord(viewModal.rec, viewModal.sheet)}>⬇️ 下載 PDF</button>
              <button style={{ ...S.btnPrimary, background: "#333" }} onClick={() => setViewModal(null)}>✕ 關閉</button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto", background: "#f5f5f5", padding: 16 }}>
            <iframe
              srcDoc={viewModal.html}
              style={{ width: "100%", height: "100%", border: "none", borderRadius: 8, background: "#fff" }}
              title="盤點紀錄查閱"
            />
          </div>
        </div>
      )}

      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Logistics Page ────────────────────────────────────────────────────────────
function LogisticsPage() {
  const LOGISTICS_COLOR = "#8B3A0F";
  const [poNumbers, setPoNumbers] = useState([]);
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    get(ref(db, "logistics-settings/poNumbers")).then(snap => {
      if (snap.exists()) setPoNumbers(Object.values(snap.val()).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
    });
  }, []);

  async function handleFile(f) {
    if (!f) return;
    setFile(f);
    setResults(null);
    setError("");
    setProcessing(true);
    try {
      // Use SheetJS (xlsx) which is available in browser
      const buf = await f.arrayBuffer();
      // We'll process in the component using a script tag approach
      // Since we're in React, we parse manually via a FileReader
      processExcel(buf);
    } catch (e) {
      setError("檔案讀取失敗：" + e.message);
      setProcessing(false);
    }
  }

  function processExcel(buf) {
    // Dynamically import SheetJS
    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.onload = () => parseWithXLSX(buf);
      script.onerror = () => { setError("無法載入解析工具，請檢查網路連線"); setProcessing(false); };
      document.head.appendChild(script);
    } else {
      parseWithXLSX(buf);
    }
  }

  function parseWithXLSX(buf) {
    try {
      const XLSX = window.XLSX;
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // Find each PO number in rows
      const found = [];
      const targets = poNumbers.map(p => p.code?.trim()).filter(Boolean);

      rows.forEach((row, idx) => {
        const cellStr = String(row[0] || "");
        // Match pattern: 商品：XXXXXXXX(...)
        const match = cellStr.match(/商品：(\w+)\(/);
        if (match) {
          const code = match[1];
          if (targets.length === 0 || targets.includes(code)) {
            // Get product name from parentheses
            const nameMatch = cellStr.match(/商品：\w+\(([^)]+)\)/);
            const productName = nameMatch ? nameMatch[1] : code;
            // Data is in next non-empty row
            let dataRow = null;
            for (let r = idx + 1; r < Math.min(idx + 5, rows.length); r++) {
              if (rows[r][0] && String(rows[r][0]).includes("/")) { dataRow = rows[r]; break; }
              if (rows[r][1] && String(rows[r][1]).match(/^\d{8,}/)) { dataRow = rows[r]; break; }
            }
            if (dataRow) {
              // Col: 0=日期, 1=銷貨單號, 3=客戶, 4=業務, 6=數量, 8=單價, 9=金額, 11=倉庫
              const dateVal = dataRow[0];
              const dateStr = dateVal instanceof Date
                ? dateVal.toLocaleDateString("zh-TW")
                : String(dateVal).replace(/(\d{4})(\d{2})(\d{2})/, "$1/$2/$3");
              found.push({
                code,
                productName,
                date: dateStr,
                orderNo: String(dataRow[1] || ""),
                customer: String(dataRow[3] || ""),
                sales: String(dataRow[4] || ""),
                qty: String(dataRow[6] || ""),
                unitPrice: String(dataRow[8] || ""),
                amount: String(dataRow[9] || ""),
                warehouse: String(dataRow[11] || ""),
              });
            }
          }
        }
      });

      setResults(found);
      setProcessing(false);
    } catch (e) {
      setError("解析失敗：" + e.message);
      setProcessing(false);
    }
  }

  function downloadResults() {
    if (!results || results.length === 0) return;
    const now = new Date().toLocaleString("zh-TW");
    const dateForFile = new Date().toLocaleDateString("zh-TW").replace(/\//g, "-");
    const rows = results.map((r, i) => `
      <tr style="${i % 2 === 0 ? "background:#fafafa" : "background:#fff"}">
        <td style="padding:8px 10px;border-bottom:1px solid #eee">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:monospace;font-weight:700;color:${LOGISTICS_COLOR}">${r.code}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee">${r.productName}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee">${r.date}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee">${r.customer}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${r.qty}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${r.unitPrice}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${LOGISTICS_COLOR}">${r.amount}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee">${r.orderNo}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Noto Sans TC',sans-serif;padding:24px;font-size:13px;color:#1a1a1a;}
  table{width:100%;border-collapse:collapse;margin-top:20px;}
  th{background:${LOGISTICS_COLOR};color:#fff;padding:9px 10px;text-align:left;font-size:12px;}
  .footer{text-align:center;color:#bbb;font-size:11px;margin-top:24px;padding-top:14px;border-top:1px solid #eee;}
  @media print{@page{margin:1cm;}}
</style></head><body>
<div style="border-bottom:2px solid ${LOGISTICS_COLOR};padding-bottom:12px;margin-bottom:4px;">
  <div style="font-size:11px;color:#aaa">${COMPANY}</div>
  <div style="font-size:22px;font-weight:900;color:${LOGISTICS_COLOR}">📋 銷貨明細查詢結果</div>
  <div style="font-size:12px;color:#666;margin-top:4px">檔案：${file?.name || "—"} ｜ 產出時間：${now} ｜ 共 ${results.length} 筆</div>
</div>
<table>
  <thead><tr>
    <th style="width:4%">#</th>
    <th style="width:12%">商品代號</th>
    <th style="width:22%">品名規格</th>
    <th style="width:10%">銷貨日期</th>
    <th style="width:15%">客戶</th>
    <th style="width:7%;text-align:right">數量</th>
    <th style="width:10%;text-align:right">單價</th>
    <th style="width:10%;text-align:right">金額</th>
    <th style="width:10%">銷貨單號</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">${COMPANY} · 後勤查詢系統 · ${now}</div>
</body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.setTimeout(() => w.print(), 600);
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#" style={S.backBtn}>← 返回</a>
            <div style={{ ...S.brandMark, background: LOGISTICS_COLOR }}>📋</div>
            <div><div style={S.brandName}>後勤人員</div><div style={S.brandSub}>{COMPANY}</div></div>
          </div>
          <SettingsLock label="⚙️ 設定" hash="logistics-settings" />
        </div>
      </header>
      <main style={{ ...S.main, maxWidth: 800 }}>
        <div style={S.pageTitle}>銷貨明細查詢</div>
        <div style={S.pageSub}>上傳 Excel 自動抓取設定的商品代號資料</div>

        {/* 上傳區 */}
        <div
          style={{ ...S.card, border: `2px dashed ${file ? LOGISTICS_COLOR : "#ddd"}`, background: file ? `${LOGISTICS_COLOR}08` : "#fff", cursor: "pointer", textAlign: "center", padding: "36px 20px", marginBottom: 20 }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        >
          <input ref={fileRef} type="file" accept=".xls,.xlsx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
          {file ? (
            <div>
              <div style={{ fontWeight: 700, color: LOGISTICS_COLOR, fontSize: 15 }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>點擊重新選擇</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#555" }}>點擊或拖放 Excel 檔案</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>支援 .xls / .xlsx</div>
            </div>
          )}
        </div>

        {/* 狀態 */}
        {processing && (
          <div style={{ ...S.card, textAlign: "center", padding: "30px", color: LOGISTICS_COLOR, fontWeight: 700 }}>
            ⏳ 解析中...
          </div>
        )}
        {error && (
          <div style={{ ...S.card, background: "#FFF0F0", border: "1px solid #E74C3C", color: "#C0392B", fontWeight: 600, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* 結果 */}
        {results !== null && !processing && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {results.length === 0 ? "找不到符合的商品代號" : `找到 ${results.length} 筆資料`}
              </div>
              {results.length > 0 && (
                <button style={{ ...S.btnPrimary, background: LOGISTICS_COLOR }} onClick={downloadResults}>
                  📥 下載報表
                </button>
              )}
            </div>

            {results.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <thead>
                    <tr style={{ background: LOGISTICS_COLOR }}>
                      {["#", "商品代號", "品名", "日期", "客戶", "數量", "單價", "金額"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#fff", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#bbb" }}>{i + 1}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: LOGISTICS_COLOR }}>{r.code}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{r.productName.split("/")[0]}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, whiteSpace: "nowrap" }}>{r.date}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{r.customer}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", fontWeight: 700 }}>{r.qty}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right" }}>{r.unitPrice}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "right", fontWeight: 700, color: LOGISTICS_COLOR }}>{r.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 已設定的 PO 號碼提示 */}
        {poNumbers.length > 0 && (
          <div style={{ ...S.card, marginTop: 20, background: "#FFF8E8", border: "1px solid #FFE0A0" }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>目前設定的商品代號（{poNumbers.length} 組）</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {poNumbers.map((p, i) => (
                <span key={i} style={{ background: `${LOGISTICS_COLOR}15`, color: LOGISTICS_COLOR, padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>{p.code}</span>
              ))}
            </div>
          </div>
        )}
        {poNumbers.length === 0 && (
          <div style={{ ...S.card, marginTop: 20, background: "#f8f8f8", textAlign: "center", color: "#aaa", fontSize: 13 }}>
            尚未設定商品代號，上傳後將顯示全部資料。<br />
            <a href="#logistics-settings" style={{ color: LOGISTICS_COLOR, fontWeight: 700 }}>前往設定 →</a>
          </div>
        )}
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Logistics Settings ────────────────────────────────────────────────────────
function LogisticsSettingsPage() {
  const LOGISTICS_COLOR = "#8B3A0F";
  const [poNumbers, setPoNumbers] = useState([]);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(ref(db, "logistics-settings/poNumbers")).then(snap => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        setPoNumbers(list);
      }
      setLoading(false);
    });
  }, []);

  function flash() { setSaved("✓ 已儲存"); setTimeout(() => setSaved(""), 1500); }

  async function saveList(list) {
    const obj = {};
    list.forEach((p, idx) => { obj[p.key] = { code: p.code, label: p.label || "", order: idx }; });
    await set(ref(db, "logistics-settings/poNumbers"), obj);
    setPoNumbers(list); flash();
  }

  function addCode() {
    if (!newCode.trim()) return;
    saveList([...poNumbers, { key: uid(), code: newCode.trim().toUpperCase(), label: newLabel.trim(), order: poNumbers.length }]);
    setNewCode(""); setNewLabel("");
  }

  function removeCode(key) {
    if (!confirm("確定刪除此代號？")) return;
    saveList(poNumbers.filter(p => p.key !== key));
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#logistics" style={S.backBtn}>← 返回</a>
            <div style={{ ...S.brandMark, background: LOGISTICS_COLOR }}>⚙️</div>
            <div><div style={S.brandName}>後勤設定</div><div style={S.brandSub}>管理商品代號 · 拖拉排序</div></div>
          </div>
          {saved && <div style={S.savedTag}>{saved}</div>}
        </div>
      </header>
      <main style={{ ...S.main, maxWidth: 700 }}>
        {loading ? <div style={{ color: "#aaa", textAlign: "center", padding: 40 }}>載入中...</div> : (
          <div style={S.card}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: LOGISTICS_COLOR }}>📋 商品代號清單</div>
            <div style={{ fontSize: 12, color: "#bbb", marginBottom: 16 }}>上傳 Excel 時，系統會自動比對這些代號並抓取對應資料。☰ 可拖拉排序</div>

            {poNumbers.length === 0 && <div style={{ color: "#ccc", fontSize: 13, marginBottom: 16 }}>尚未新增代號，新增後上傳 Excel 將自動篩選</div>}

            <DraggableList
              items={poNumbers}
              onReorder={saveList}
              renderItem={(p) => (
                <div style={{ ...S.settingRow, background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#ccc", fontSize: 18, cursor: "grab", userSelect: "none" }}>☰</span>
                    <div>
                      <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 15, color: LOGISTICS_COLOR }}>{p.code}</div>
                      {p.label && <div style={{ fontSize: 12, color: "#aaa" }}>{p.label}</div>}
                    </div>
                  </div>
                  <button style={S.deleteBtn} onClick={() => removeCode(p.key)}>✕ 刪除</button>
                </div>
              )}
            />

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 8 }}>新增商品代號</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  style={{ ...S.fieldInput, flex: 1, minWidth: 140, fontFamily: "monospace", fontWeight: 700 }}
                  value={newCode} onChange={e => setNewCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCode()}
                  placeholder="商品代號（如 PO0010009）"
                />
                <input
                  style={{ ...S.fieldInput, flex: 1, minWidth: 120 }}
                  value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCode()}
                  placeholder="備註名稱（選填）"
                />
                <button style={{ ...S.btnPrimary, background: LOGISTICS_COLOR }} onClick={addCode}>＋ 新增</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}


// ─── Review Page（經理填寫）────────────────────────────────────────────────────
function ReviewPage({ id }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState({}); // { idx: { month, day, qty, note } }
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    get(ref(db, `manager-reviews/${id}`)).then(snap => {
      if (snap.exists()) {
        const d = snap.val();
        setData(d);
        // 初始化回覆狀態，如果已有回覆資料就填入
        if (d.responses) {
          setResponses(d.responses);
        } else {
          const init = {};
          (d.alerts || []).forEach((_, i) => { init[i] = { month: "", day: "", qty: "", note: "" }; });
          setResponses(init);
        }
        if (d.status === "replied") setSubmitted(true);
      }
      setLoading(false);
    });
  }, [id]);

  function updateResponse(idx, field, value) {
    setResponses(prev => ({ ...prev, [idx]: { ...prev[idx], [field]: value } }));
  }

  async function submitReply() {
    await set(ref(db, `manager-reviews/${id}/responses`), responses);
    await set(ref(db, `manager-reviews/${id}/status`), "replied");
    await set(ref(db, `manager-reviews/${id}/repliedAt`), new Date().toLocaleString("zh-TW"));
    setSubmitted(true);
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#aaa", fontFamily: "sans-serif" }}>載入中...</div>;
  if (!data) return <div style={{ padding: 60, textAlign: "center", color: "#aaa", fontFamily: "sans-serif" }}>找不到此回覆表，連結可能已失效</div>;

  const color = data.sheetColor || "#E74C3C";
  const alerts = data.alerts || [];
  const filledCount = Object.values(responses).filter(r => r.month && r.day && r.qty).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F2F3F5", fontFamily: "'Noto Sans TC', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { color-scheme: light only; }
        body { font-family: 'Noto Sans TC', sans-serif; background: #F2F3F5; }
        select, input { color: #1a1a1a !important; background: #fff !important; -webkit-text-fill-color: #1a1a1a !important; }
      `}</style>

      {/* Header */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, #E74C3C)` }} />
      <div style={{ background: "#fff", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", padding: "16px 20px" }}>
        <div style={{ fontSize: 11, color: "#aaa" }}>{COMPANY}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color }}>⚠️ 低庫存到貨回覆表</div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 3 }}>
          {data.sheetIcon} {data.sheetLabel} · 盤點日期：{data.date} · 負責人：{data.operator || "—"}
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>
        {submitted ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: "40px 24px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#1A6E45", marginBottom: 8 }}>回覆已送出！</div>
            <div style={{ color: "#888", marginBottom: 24, fontSize: 14 }}>請截圖此頁面傳回群組</div>
            {/* 回覆摘要 */}
            <div style={{ textAlign: "left", marginTop: 16 }}>
              {alerts.map((a, i) => {
                const r = responses[i] || {};
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: i % 2 === 0 ? "#fafafa" : "#fff", borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700 }}>{a.name}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#666" }}>
                      {r.month && r.day ? <span style={{ color, fontWeight: 700 }}>{r.month}月{r.day}日到貨</span> : <span style={{ color: "#ccc" }}>未填日期</span>}
                      {r.qty ? <span style={{ fontWeight: 700 }}>訂 {r.qty} 件</span> : <span style={{ color: "#ccc" }}>未填數量</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <button style={{ marginTop: 20, padding: "12px 28px", background: color, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
              onClick={() => setSubmitted(false)}>
              ✏️ 修改回覆
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: "#FFF8E8", border: "1px solid #FFE0A0", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#B7770D" }}>
              共 {alerts.length} 項低於安全庫存，請填寫預計到貨日期和訂購數量後送出
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.map((a, i) => {
                const r = responses[i] || {};
                const filled = r.month && r.day && r.qty;
                return (
                  <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderLeft: `4px solid ${filled ? "#1A6E45" : "#E74C3C"}` }}>
                    {/* 品項資訊 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
                          現有 <span style={{ color: "#E74C3C", fontWeight: 700 }}>{a.total}</span> ／ 安全庫存 {a.safetyStock} ／ 缺口 <span style={{ color: "#E74C3C", fontWeight: 700 }}>-{a.safetyStock - a.total}</span>
                        </div>
                      </div>
                      {filled && <span style={{ background: "#E8F5EE", color: "#1A6E45", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✓ 已填</span>}
                    </div>

                    {/* 日期選擇 */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>預計到貨日期</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select
                          value={r.month || ""}
                          onChange={e => updateResponse(i, "month", e.target.value)}
                          style={{ flex: 1, padding: "10px 8px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 15, background: "#fff", color: "#1a1a1a" }}
                        >
                          <option value="">選擇月份</option>
                          {Array.from({ length: 12 }, (_, k) => (
                            <option key={k} value={k + 1}>{k + 1} 月</option>
                          ))}
                        </select>
                        <select
                          value={r.day || ""}
                          onChange={e => updateResponse(i, "day", e.target.value)}
                          style={{ flex: 1, padding: "10px 8px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 15, background: "#fff", color: "#1a1a1a" }}
                        >
                          <option value="">選擇日期</option>
                          {Array.from({ length: 31 }, (_, k) => (
                            <option key={k} value={k + 1}>{k + 1} 日</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 訂購數量 */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>訂購數量</div>
                      <input
                        type="number" min="0" inputMode="numeric"
                        value={r.qty || ""}
                        onChange={e => updateResponse(i, "qty", e.target.value)}
                        placeholder="輸入數量"
                        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 16, fontWeight: 700, textAlign: "center", background: "#fff", color: "#1a1a1a" }}
                      />
                    </div>

                    {/* 備註 */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>備註（選填）</div>
                      <input
                        type="text"
                        value={r.note || ""}
                        onChange={e => updateResponse(i, "note", e.target.value)}
                        placeholder="如有特殊說明請填寫"
                        style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, background: "#fff", color: "#1a1a1a" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, paddingBottom: 40 }}>
              <div style={{ textAlign: "center", fontSize: 13, color: "#aaa", marginBottom: 12 }}>
                已填寫 {filledCount} / {alerts.length} 項
              </div>
              <button
                style={{ ...S.btnPrimary, width: "100%", padding: "16px", fontSize: 18, borderRadius: 14, background: filledCount === alerts.length ? "#1A6E45" : "#E74C3C", textAlign: "center" }}
                onClick={submitReply}
              >
                {filledCount === alerts.length ? "✅ 送出回覆" : `📤 送出（${filledCount}/${alerts.length} 項已填）`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Route Planning Landing ────────────────────────────────────────────────────
const ROUTE_COLOR = "#2471A3";
const MAX_CARGO = 180;
const MAX_CUPS = 35;

function RoutePlanningPage() {
  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <div style={{ ...S.brandMark, background: ROUTE_COLOR }}>🗺️</div>
            <div><div style={S.brandName}>動態路線規劃</div><div style={S.brandSub}>{COMPANY}</div></div>
          </div>
          <SettingsLock label="設定" hash="route-settings" />
        </div>
      </header>
      <main style={{ ...S.main, maxWidth: 640 }}>
        <div style={S.pageTitle}>功能選單</div>
        <div style={S.pageSub}>{new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a href="#route-dispatch" style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px", background: "#fff", borderRadius: 16, textDecoration: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderLeft: `4px solid ${ROUTE_COLOR}` }}>
            <div style={{ fontSize: 38 }}>🚀</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>今日派送規劃</div>
              <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>輸入訂單 · 選車司機 · 自動路線優化</div>
            </div>
            <div style={{ fontSize: 18, color: "#ccc" }}>›</div>
          </a>
        </div>
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Route Settings ────────────────────────────────────────────────────────────
function RouteSettingsPage() {
  const [stores, setStores] = useState([]);
  const [groups, setGroups] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stores");
  const [saved, setSaved] = useState("");
  const [geocoding, setGeocoding] = useState({});

  // New item inputs
  const [newStore, setNewStore] = useState({ name: "", address: "", group: "" });
  const [newGroup, setNewGroup] = useState("");
  const [newVehicle, setNewVehicle] = useState("");
  const [newDriver, setNewDriver] = useState("");

  useEffect(() => {
    Promise.all([
      get(ref(db, "route-settings/stores")),
      get(ref(db, "route-settings/groups")),
      get(ref(db, "route-settings/vehicles")),
      get(ref(db, "route-settings/drivers")),
    ]).then(([sSnap, gSnap, vSnap, dSnap]) => {
      setStores(sSnap.exists() ? Object.entries(sSnap.val()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : []);
      setGroups(gSnap.exists() ? Object.entries(gSnap.val()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : []);
      setVehicles(vSnap.exists() ? Object.entries(vSnap.val()).map(([k, v]) => ({ key: k, ...v })) : []);
      setDrivers(dSnap.exists() ? Object.entries(dSnap.val()).map(([k, v]) => ({ key: k, ...v })) : []);
      setLoading(false);
    });
  }, []);

  function flash(msg = "✓ 已儲存") { setSaved(msg); setTimeout(() => setSaved(""), 2000); }

  async function saveStores(list) {
    const obj = {}; list.forEach((s, i) => { obj[s.key] = { name: s.name, address: s.address, group: s.group || "", lat: s.lat || null, lng: s.lng || null, order: i }; });
    await set(ref(db, "route-settings/stores"), obj); setStores(list); flash();
  }
  async function saveGroups(list) {
    const obj = {}; list.forEach((g, i) => { obj[g.key] = { name: g.name, order: i }; });
    await set(ref(db, "route-settings/groups"), obj); setGroups(list); flash();
  }
  async function saveVehicles(list) {
    const obj = {}; list.forEach((v, i) => { obj[v.key] = { name: v.name, order: i }; });
    await set(ref(db, "route-settings/vehicles"), obj); setVehicles(list); flash();
  }
  async function saveDrivers(list) {
    const obj = {}; list.forEach((d, i) => { obj[d.key] = { name: d.name, order: i }; });
    await set(ref(db, "route-settings/drivers"), obj); setDrivers(list); flash();
  }

  async function geocodeAddress(key, address) {
    setGeocoding(p => ({ ...p, [key]: "loading" }));
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ", 台灣")}&format=json&limit=1`, {
        headers: { "Accept-Language": "zh-TW", "User-Agent": "WeidingInventory/1.0" }
      });
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const updated = stores.map(s => s.key === key ? { ...s, lat: parseFloat(lat), lng: parseFloat(lon) } : s);
        await saveStores(updated);
        setGeocoding(p => ({ ...p, [key]: "done" }));
        flash("✓ 座標已取得");
      } else {
        setGeocoding(p => ({ ...p, [key]: "error" }));
        flash("⚠️ 找不到地址，請檢查後重試");
      }
    } catch {
      setGeocoding(p => ({ ...p, [key]: "error" }));
      flash("⚠️ 網路錯誤");
    }
  }

  async function addStore() {
    if (!newStore.name.trim() || !newStore.address.trim()) return;
    const key = uid();
    const next = [...stores, { key, name: newStore.name.trim(), address: newStore.address.trim(), group: newStore.group, lat: null, lng: null, order: stores.length }];
    await saveStores(next);
    setNewStore({ name: "", address: "", group: groups[0]?.key || "" });
    // Auto geocode
    setTimeout(() => geocodeAddress(key, newStore.address.trim()), 500);
  }

  const tabs = [
    { id: "stores", label: "🏪 店家管理" },
    { id: "groups", label: "📍 區域群組" },
    { id: "vehicles", label: "🚚 車輛" },
    { id: "drivers", label: "👤 司機" },
  ];

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#route" style={S.backBtn}>← 返回</a>
            <div style={{ ...S.brandMark, background: ROUTE_COLOR }}>⚙️</div>
            <div><div style={S.brandName}>路線系統設定</div><div style={S.brandSub}>店家 · 區域 · 車輛 · 司機</div></div>
          </div>
          {saved && <div style={S.savedTag}>{saved}</div>}
        </div>
      </header>
      <main style={S.main}>
        {/* Tabs */}
        <div style={S.tabs}>
          {tabs.map(t => (
            <button key={t.id} style={{ ...S.tab, ...(activeTab === t.id ? { borderBottom: `3px solid ${ROUTE_COLOR}`, color: ROUTE_COLOR, fontWeight: 700 } : {}) }} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>載入中...</div> : (
          <>
            {/* 店家管理 */}
            {activeTab === "stores" && (
              <div style={{ ...S.card, marginTop: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: ROUTE_COLOR }}>🏪 店家清單（{stores.length} 間）</div>
                <div style={{ fontSize: 12, color: "#bbb", marginBottom: 16 }}>新增店家後系統自動取得座標・☰ 拖拉排序</div>

                <DraggableList
                  items={stores}
                  onReorder={saveStores}
                  renderItem={(store) => {
                    const gc = geocoding[store.key];
                    return (
                      <div style={{ ...S.settingRow, flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                          <span style={{ color: "#ccc", fontSize: 18, cursor: "grab" }}>☰</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{store.name}</div>
                            <div style={{ fontSize: 12, color: "#888" }}>{store.address}</div>
                            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                              {store.group && <span style={{ background: `${ROUTE_COLOR}15`, color: ROUTE_COLOR, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{groups.find(g => g.key === store.group)?.name || store.group}</span>}
                              {store.lat ? <span style={{ background: "#E8F5EE", color: "#1A6E45", padding: "2px 8px", borderRadius: 10, fontSize: 11 }}>✓ 座標已取得</span>
                                : gc === "loading" ? <span style={{ color: "#aaa", fontSize: 11 }}>取得座標中...</span>
                                : <button style={{ background: "#FFF8E8", color: "#B7770D", border: "1px solid #FFE0A0", padding: "2px 10px", borderRadius: 10, fontSize: 11, cursor: "pointer", fontWeight: 600 }} onClick={() => geocodeAddress(store.key, store.address)}>🔍 取得座標</button>}
                            </div>
                          </div>
                          <button style={S.deleteBtn} onClick={() => saveStores(stores.filter(s => s.key !== store.key))}>✕</button>
                        </div>
                      </div>
                    );
                  }}
                />

                {/* 新增店家 */}
                <div style={{ marginTop: 20, padding: "16px", background: "#f8f9fa", borderRadius: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#555", marginBottom: 12 }}>新增店家</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input style={{ ...S.fieldInput, color: "#1a1a1a" }} value={newStore.name} onChange={e => setNewStore(p => ({ ...p, name: e.target.value }))} placeholder="店家名稱（例：台北信義店）" />
                    <input style={{ ...S.fieldInput, color: "#1a1a1a" }} value={newStore.address} onChange={e => setNewStore(p => ({ ...p, address: e.target.value }))} placeholder="地址（例：台北市信義區信義路五段7號）" />
                    <div style={{ display: "flex", gap: 8 }}>
                      <select style={{ ...S.fieldInput, flex: 1, color: "#1a1a1a" }} value={newStore.group} onChange={e => setNewStore(p => ({ ...p, group: e.target.value }))}>
                        <option value="">選擇區域群組（選填）</option>
                        {groups.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}
                      </select>
                      <button style={{ ...S.btnPrimary, background: ROUTE_COLOR }} onClick={addStore}>＋ 新增</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 區域群組 */}
            {activeTab === "groups" && (
              <div style={{ ...S.card, marginTop: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: ROUTE_COLOR }}>📍 區域群組</div>
                <div style={{ fontSize: 12, color: "#bbb", marginBottom: 16 }}>用來分類店家，例如「北區」「中區」「南區」</div>
                <DraggableList items={groups} onReorder={saveGroups} renderItem={(g) => (
                  <div style={S.settingRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#ccc", fontSize: 18, cursor: "grab" }}>☰</span>
                      <div style={{ fontWeight: 700 }}>{g.name}</div>
                      <span style={{ fontSize: 12, color: "#aaa" }}>（{stores.filter(s => s.group === g.key).length} 間店）</span>
                    </div>
                    <button style={S.deleteBtn} onClick={() => saveGroups(groups.filter(x => x.key !== g.key))}>✕ 刪除</button>
                  </div>
                )} />
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <input style={{ ...S.fieldInput, flex: 1, color: "#1a1a1a" }} value={newGroup} onChange={e => setNewGroup(e.target.value)} onKeyDown={e => e.key === "Enter" && newGroup.trim() && saveGroups([...groups, { key: uid(), name: newGroup.trim(), order: groups.length }]) && setNewGroup("")} placeholder="新增區域群組名稱" />
                  <button style={{ ...S.btnPrimary, background: ROUTE_COLOR }} onClick={() => { if (!newGroup.trim()) return; saveGroups([...groups, { key: uid(), name: newGroup.trim(), order: groups.length }]); setNewGroup(""); }}>＋ 新增</button>
                </div>
              </div>
            )}

            {/* 車輛 */}
            {activeTab === "vehicles" && (
              <div style={{ ...S.card, marginTop: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: ROUTE_COLOR }}>🚚 車輛管理</div>
                <div style={{ fontSize: 12, color: "#bbb", marginBottom: 16 }}>每台車上限：{MAX_CARGO} 貨（含 {MAX_CUPS} 杯）</div>
                <DraggableList items={vehicles} onReorder={saveVehicles} renderItem={(v) => (
                  <div style={S.settingRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#ccc", fontSize: 18, cursor: "grab" }}>☰</span>
                      <div style={{ fontWeight: 700 }}>🚚 {v.name}</div>
                    </div>
                    <button style={S.deleteBtn} onClick={() => saveVehicles(vehicles.filter(x => x.key !== v.key))}>✕ 刪除</button>
                  </div>
                )} />
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <input style={{ ...S.fieldInput, flex: 1, color: "#1a1a1a" }} value={newVehicle} onChange={e => setNewVehicle(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newVehicle.trim()) { saveVehicles([...vehicles, { key: uid(), name: newVehicle.trim() }]); setNewVehicle(""); } }} placeholder="車輛名稱或車牌" />
                  <button style={{ ...S.btnPrimary, background: ROUTE_COLOR }} onClick={() => { if (!newVehicle.trim()) return; saveVehicles([...vehicles, { key: uid(), name: newVehicle.trim() }]); setNewVehicle(""); }}>＋ 新增</button>
                </div>
              </div>
            )}

            {/* 司機 */}
            {activeTab === "drivers" && (
              <div style={{ ...S.card, marginTop: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: ROUTE_COLOR }}>👤 司機管理</div>
                <div style={{ fontSize: 12, color: "#bbb", marginBottom: 16 }}>最多 3 位</div>
                <DraggableList items={drivers} onReorder={saveDrivers} renderItem={(d) => (
                  <div style={S.settingRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#ccc", fontSize: 18, cursor: "grab" }}>☰</span>
                      <div style={{ fontWeight: 700 }}>👤 {d.name}</div>
                    </div>
                    <button style={S.deleteBtn} onClick={() => saveDrivers(drivers.filter(x => x.key !== d.key))}>✕ 刪除</button>
                  </div>
                )} />
                {drivers.length < 3 && (
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <input style={{ ...S.fieldInput, flex: 1, color: "#1a1a1a" }} value={newDriver} onChange={e => setNewDriver(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newDriver.trim()) { saveDrivers([...drivers, { key: uid(), name: newDriver.trim() }]); setNewDriver(""); } }} placeholder="司機姓名" />
                    <button style={{ ...S.btnPrimary, background: ROUTE_COLOR }} onClick={() => { if (!newDriver.trim()) return; saveDrivers([...drivers, { key: uid(), name: newDriver.trim() }]); setNewDriver(""); }}>＋ 新增</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── Route Dispatch ────────────────────────────────────────────────────────────
function RouteDispatchPage() {
  const [stores, setStores] = useState([]);
  const [groups, setGroups] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState(null);

  // 今日設定
  const [selectedVehicles, setSelectedVehicles] = useState({});  // { vehicleKey: driverKey }
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [orders, setOrders] = useState({});  // { storeKey: { cargo, cups } }

  useEffect(() => {
    Promise.all([
      get(ref(db, "route-settings/stores")),
      get(ref(db, "route-settings/groups")),
      get(ref(db, "route-settings/vehicles")),
      get(ref(db, "route-settings/drivers")),
    ]).then(([sSnap, gSnap, vSnap, dSnap]) => {
      const storeList = sSnap.exists() ? Object.entries(sSnap.val()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [];
      const groupList = gSnap.exists() ? Object.entries(gSnap.val()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [];
      const vehicleList = vSnap.exists() ? Object.entries(vSnap.val()).map(([k, v]) => ({ key: k, ...v })) : [];
      const driverList = dSnap.exists() ? Object.entries(dSnap.val()).map(([k, v]) => ({ key: k, ...v })) : [];
      setStores(storeList);
      setGroups(groupList);
      setVehicles(vehicleList);
      setDrivers(driverList);
      // 初始化訂單
      const initOrders = {};
      storeList.forEach(s => { initOrders[s.key] = { cargo: "", cups: "" }; });
      setOrders(initOrders);
      setLoading(false);
    });
  }, []);

  function toggleGroup(gKey) {
    setSelectedGroups(prev => prev.includes(gKey) ? prev.filter(x => x !== gKey) : [...prev, gKey]);
  }

  function toggleVehicle(vKey) {
    setSelectedVehicles(prev => {
      const next = { ...prev };
      if (next[vKey] !== undefined) { delete next[vKey]; }
      else { next[vKey] = ""; }
      return next;
    });
  }

  function setVehicleDriver(vKey, dKey) {
    setSelectedVehicles(prev => ({ ...prev, [vKey]: dKey }));
  }

  function updateOrder(storeKey, field, value) {
    setOrders(prev => ({ ...prev, [storeKey]: { ...prev[storeKey], [field]: value } }));
  }

  // 今日店家 = 勾選群組的店家，有訂單的優先
  const todayStores = stores.filter(s => {
    if (selectedGroups.length === 0) return false;
    return selectedGroups.includes(s.group);
  });

  const storesWithOrders = todayStores.filter(s => {
    const o = orders[s.key];
    return o && (parseInt(o.cargo) > 0 || parseInt(o.cups) > 0);
  });

  // 車輛容量計算（用於顯示）
  function cargoUsed(storeKeys) {
    return storeKeys.reduce((sum, key) => {
      const o = orders[key];
      return sum + (parseInt(o?.cargo) || 0);
    }, 0);
  }
  function cupsUsed(storeKeys) {
    return storeKeys.reduce((sum, key) => {
      const o = orders[key];
      return sum + (parseInt(o?.cups) || 0);
    }, 0);
  }

  // ─ 路線優化（最近鄰居 + OSRM）
  async function optimize() {
    const activeVehicleKeys = Object.keys(selectedVehicles);
    if (activeVehicleKeys.length === 0) { alert("請至少選擇一台車"); return; }
    if (storesWithOrders.length === 0) { alert("請先輸入今日訂單數量"); return; }

    const missingCoords = storesWithOrders.filter(s => !s.lat || !s.lng);
    if (missingCoords.length > 0) {
      alert(`以下店家尚未取得座標，請到設定頁點「取得座標」：\n${missingCoords.map(s => s.name).join("、")}`);
      return;
    }

    setOptimizing(true);

    try {
      // Step 1: 分配店家到車輛（貪心演算法）
      const vehicleLoads = {};
      activeVehicleKeys.forEach(k => { vehicleLoads[k] = { stores: [], cargo: 0, cups: 0 }; });

      // 按訂單量排序（大的先分配）
      const sortedStores = [...storesWithOrders].sort((a, b) => {
        const aTotal = (parseInt(orders[a.key]?.cargo) || 0);
        const bTotal = (parseInt(orders[b.key]?.cargo) || 0);
        return bTotal - aTotal;
      });

      for (const store of sortedStores) {
        const cargo = parseInt(orders[store.key]?.cargo) || 0;
        const cups = parseInt(orders[store.key]?.cups) || 0;

        // 找最適合的車（剩餘空間最多且放得下）
        let bestVehicle = null;
        let bestRemaining = -1;
        for (const vKey of activeVehicleKeys) {
          const load = vehicleLoads[vKey];
          const newCargo = load.cargo + cargo;
          const newCups = load.cups + cups;
          if (newCargo <= MAX_CARGO && newCups <= MAX_CUPS) {
            const remaining = MAX_CARGO - newCargo;
            if (remaining > bestRemaining) {
              bestRemaining = remaining;
              bestVehicle = vKey;
            }
          }
        }
        if (bestVehicle) {
          vehicleLoads[bestVehicle].stores.push(store);
          vehicleLoads[bestVehicle].cargo += cargo;
          vehicleLoads[bestVehicle].cups += cups;
        }
      }

      // Step 2: 每台車用最近鄰居演算法排序路線
      const optimizedRoutes = {};
      for (const vKey of activeVehicleKeys) {
        const storeList = vehicleLoads[vKey].stores;
        if (storeList.length <= 1) {
          optimizedRoutes[vKey] = storeList;
          continue;
        }
        // 最近鄰居（Nearest Neighbor）
        const visited = new Set();
        const route = [];
        let current = storeList[0];  // 從第一個開始
        visited.add(current.key);
        route.push(current);

        while (route.length < storeList.length) {
          let nearest = null;
          let minDist = Infinity;
          for (const s of storeList) {
            if (visited.has(s.key)) continue;
            const dist = Math.sqrt(Math.pow(s.lat - current.lat, 2) + Math.pow(s.lng - current.lng, 2));
            if (dist < minDist) { minDist = dist; nearest = s; }
          }
          if (nearest) { visited.add(nearest.key); route.push(nearest); current = nearest; }
          else break;
        }
        optimizedRoutes[vKey] = route;
      }

      // Step 3: 用 OSRM 取得實際行車距離和時間
      const routesWithTime = {};
      for (const vKey of activeVehicleKeys) {
        const route = optimizedRoutes[vKey];
        routesWithTime[vKey] = { stores: route, totalDistance: 0, totalTime: 0 };

        if (route.length >= 2) {
          try {
            const coords = route.map(s => `${s.lng},${s.lat}`).join(";");
            const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=false`);
            const osrmData = await osrmRes.json();
            if (osrmData.code === "Ok" && osrmData.routes.length > 0) {
              routesWithTime[vKey].totalDistance = Math.round(osrmData.routes[0].distance / 1000 * 10) / 10;
              routesWithTime[vKey].totalTime = Math.round(osrmData.routes[0].duration / 60);
            }
          } catch {
            // OSRM 失敗不影響結果，只是沒有距離時間
          }
        }
      }

      setResult({ vehicleLoads, optimizedRoutes: routesWithTime, generatedAt: new Date().toLocaleString("zh-TW") });
    } catch (e) {
      alert("優化失敗：" + e.message);
    }
    setOptimizing(false);
  }

  function printDispatch() {
    if (!result) return;
    const now = result.generatedAt;
    const vehicleRows = Object.entries(result.optimizedRoutes).map(([vKey, data]) => {
      const vehicle = vehicles.find(v => v.key === vKey);
      const driver = drivers.find(d => d.key === selectedVehicles[vKey]);
      const storeRows = data.stores.map((s, i) => {
        const o = orders[s.key];
        return `<tr style="background:${i%2===0?"#fff":"#f9f9f9"}">
          <td style="padding:8px 10px;border-bottom:1px solid #eee">${i + 1}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:700">${s.name}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:11px;color:#888">${s.address}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${ROUTE_COLOR}">${o?.cargo || 0}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;color:#555">${o?.cups || 0}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eee"></td>
        </tr>`;
      }).join("");
      const totalCargo = result.vehicleLoads[vKey]?.cargo || 0;
      const totalCups = result.vehicleLoads[vKey]?.cups || 0;
      return `
      <div style="margin-bottom:32px;page-break-inside:avoid">
        <div style="background:${ROUTE_COLOR};color:#fff;padding:12px 16px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:900;font-size:17px">🚚 ${vehicle?.name || vKey}</div>
            <div style="font-size:13px;opacity:0.85">司機：${driver?.name || "未指定"}</div>
          </div>
          <div style="text-align:right;font-size:13px">
            <div>載貨 ${totalCargo} / ${MAX_CARGO} 件</div>
            <div>杯子 ${totalCups} / ${MAX_CUPS} 個</div>
            ${data.totalDistance > 0 ? `<div>約 ${data.totalDistance} km · ${data.totalTime} 分鐘</div>` : ""}
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-top:none">
          <thead><tr style="background:#f5f5f5">
            <th style="padding:8px 10px;text-align:left;font-size:12px;width:5%">#</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;width:22%">店名</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px">地址</th>
            <th style="padding:8px 10px;text-align:right;font-size:12px;width:8%">貨</th>
            <th style="padding:8px 10px;text-align:right;font-size:12px;width:8%">杯</th>
            <th style="padding:8px 10px;font-size:12px;width:15%">簽收</th>
          </tr></thead>
          <tbody>${storeRows}</tbody>
          <tfoot><tr style="background:#f0f4ff">
            <td colspan="3" style="padding:8px 10px;font-weight:700;text-align:right">合計</td>
            <td style="padding:8px 10px;font-weight:900;text-align:right;color:${ROUTE_COLOR}">${totalCargo}</td>
            <td style="padding:8px 10px;font-weight:900;text-align:right">${totalCups}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans TC', sans-serif; padding: 24px; font-size: 13px; color: #1a1a1a; }
  @media print { @page { margin: 1cm; } }
</style></head><body>
<div style="border-bottom: 2px solid ${ROUTE_COLOR}; padding-bottom: 12px; margin-bottom: 24px; display:flex; justify-content:space-between; align-items:flex-end">
  <div>
    <div style="font-size:11px;color:#aaa">${COMPANY}</div>
    <div style="font-size:22px;font-weight:900;color:${ROUTE_COLOR}">🗺️ 今日派送路線單</div>
    <div style="font-size:12px;color:#888;margin-top:4px">派送日期：${todayStr()} ｜ 產出時間：${now}</div>
  </div>
  <div style="text-align:right;font-size:13px;color:#555">
    <div>出動車輛：${Object.keys(result.optimizedRoutes).length} 台</div>
    <div>派送店家：${storesWithOrders.length} 間</div>
  </div>
</div>
${vehicleRows}
<div style="text-align:center;color:#ccc;font-size:11px;margin-top:20px;padding-top:14px;border-top:1px solid #eee">${COMPANY} · 動態路線規劃系統 · ${now}</div>
</body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.setTimeout(() => w.print(), 600);
  }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>載入中...</div>;

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#route" style={S.backBtn}>← 返回</a>
            <div style={{ ...S.brandMark, background: ROUTE_COLOR }}>🚀</div>
            <div><div style={S.brandName}>今日派送規劃</div><div style={S.brandSub}>{todayStr()}</div></div>
          </div>
          {result && <button style={{ ...S.btnPrimary, background: ROUTE_COLOR }} onClick={printDispatch}>🖨️ 列印派送單</button>}
        </div>
      </header>

      <main style={S.main}>
        {/* Step 1: 選今日區域 */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: ROUTE_COLOR }}>① 選擇今日派送區域</div>
          {groups.length === 0 ? <div style={{ color: "#ccc", fontSize: 13 }}>尚未設定區域群組，請前往設定</div> : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {groups.map(g => {
                const isOn = selectedGroups.includes(g.key);
                const count = stores.filter(s => s.group === g.key).length;
                return (
                  <button key={g.key} style={{ padding: "8px 18px", borderRadius: 10, border: `2px solid ${isOn ? ROUTE_COLOR : "#ddd"}`, background: isOn ? ROUTE_COLOR : "#fff", color: isOn ? "#fff" : "#555", fontWeight: 700, cursor: "pointer", fontSize: 14 }} onClick={() => toggleGroup(g.key)}>
                    {g.name} <span style={{ opacity: 0.7, fontSize: 12 }}>({count}間)</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: 選車輛和司機 */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: ROUTE_COLOR }}>② 今日出動車輛與司機</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {vehicles.map(v => {
              const isOn = selectedVehicles[v.key] !== undefined;
              return (
                <div key={v.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isOn ? `${ROUTE_COLOR}10` : "#f8f8f8", borderRadius: 10, border: `1.5px solid ${isOn ? ROUTE_COLOR : "#eee"}` }}>
                  <input type="checkbox" checked={isOn} onChange={() => toggleVehicle(v.key)} style={{ width: 18, height: 18, accentColor: ROUTE_COLOR, cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>🚚 {v.name}</div>
                  {isOn && (
                    <select style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, background: "#fff", color: "#1a1a1a" }} value={selectedVehicles[v.key]} onChange={e => setVehicleDriver(v.key, e.target.value)}>
                      <option value="">選擇司機</option>
                      {drivers.map(d => <option key={d.key} value={d.key}>{d.name}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: 訂單輸入 */}
        {todayStores.length > 0 && (
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: ROUTE_COLOR }}>③ 輸入各店訂單</div>
            <div style={{ fontSize: 12, color: "#bbb", marginBottom: 14 }}>只輸入有訂單的店家，空白表示今日不派</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8, padding: "0 4px" }}>
                <div style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>店家名稱</div>
                <div style={{ fontSize: 12, color: "#aaa", fontWeight: 600, textAlign: "center" }}>貨（件）</div>
                <div style={{ fontSize: 12, color: "#aaa", fontWeight: 600, textAlign: "center" }}>杯（個）</div>
              </div>
              {todayStores.map(store => {
                const o = orders[store.key] || { cargo: "", cups: "" };
                const hasOrder = parseInt(o.cargo) > 0 || parseInt(o.cups) > 0;
                return (
                  <div key={store.key} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8, padding: "8px", background: hasOrder ? `${ROUTE_COLOR}08` : "#fafafa", borderRadius: 8, border: `1px solid ${hasOrder ? ROUTE_COLOR + "40" : "#eee"}` }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{store.name}</div>
                        {!store.lat && <div style={{ fontSize: 11, color: "#E74C3C" }}>⚠️ 未取得座標</div>}
                      </div>
                    </div>
                    <input type="number" min="0" max={MAX_CARGO} inputMode="numeric"
                      style={{ padding: "8px 6px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 15, fontWeight: 700, textAlign: "center", background: "#fff", color: "#1a1a1a" }}
                      value={o.cargo} onChange={e => updateOrder(store.key, "cargo", e.target.value)}
                      placeholder="0" />
                    <input type="number" min="0" max={MAX_CUPS} inputMode="numeric"
                      style={{ padding: "8px 6px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 15, fontWeight: 700, textAlign: "center", background: "#fff", color: "#1a1a1a" }}
                      value={o.cups} onChange={e => updateOrder(store.key, "cups", e.target.value)}
                      placeholder="0" />
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: "#888" }}>
              今日有訂單：<strong style={{ color: ROUTE_COLOR }}>{storesWithOrders.length}</strong> 間店 ／
              總計 <strong>{storesWithOrders.reduce((s, store) => s + (parseInt(orders[store.key]?.cargo) || 0), 0)}</strong> 貨 ·
              <strong>{storesWithOrders.reduce((s, store) => s + (parseInt(orders[store.key]?.cups) || 0), 0)}</strong> 杯
            </div>
          </div>
        )}

        {/* 優化按鈕 */}
        {todayStores.length > 0 && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <button style={{ ...S.btnPrimary, background: optimizing ? "#aaa" : ROUTE_COLOR, fontSize: 16, padding: "14px 40px", borderRadius: 14 }} onClick={optimize} disabled={optimizing}>
              {optimizing ? "⏳ 路線優化中..." : "🗺️ 開始路線優化"}
            </button>
          </div>
        )}

        {/* 結果 */}
        {result && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16, color: ROUTE_COLOR }}>✅ 派送路線規劃結果</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(result.optimizedRoutes).map(([vKey, data]) => {
                const vehicle = vehicles.find(v => v.key === vKey);
                const driver = drivers.find(d => d.key === selectedVehicles[vKey]);
                const load = result.vehicleLoads[vKey];
                const cargoPercent = Math.round((load.cargo / MAX_CARGO) * 100);
                return (
                  <div key={vKey} style={{ ...S.card, borderTop: `4px solid ${ROUTE_COLOR}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 17 }}>🚚 {vehicle?.name}</div>
                        <div style={{ fontSize: 13, color: "#888" }}>司機：{driver?.name || "未指定"} · {data.stores.length} 間店</div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 13 }}>
                        <div style={{ color: ROUTE_COLOR, fontWeight: 700 }}>{load.cargo}/{MAX_CARGO} 貨 · {load.cups}/{MAX_CUPS} 杯</div>
                        {data.totalDistance > 0 && <div style={{ color: "#888" }}>約 {data.totalDistance} km · {data.totalTime} 分鐘</div>}
                      </div>
                    </div>
                    {/* 載量進度條 */}
                    <div style={{ height: 6, background: "#eee", borderRadius: 4, marginBottom: 14, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${cargoPercent}%`, background: cargoPercent > 90 ? "#E74C3C" : ROUTE_COLOR, borderRadius: 4, transition: "width 0.5s" }} />
                    </div>
                    {/* 店家清單 */}
                    {data.stores.map((s, i) => {
                      const o = orders[s.key];
                      return (
                        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < data.stores.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: ROUTE_COLOR, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{s.name}</div>
                            <div style={{ fontSize: 12, color: "#aaa" }}>{s.address}</div>
                          </div>
                          <div style={{ fontSize: 13, textAlign: "right" }}>
                            <span style={{ fontWeight: 700, color: ROUTE_COLOR }}>{o?.cargo || 0} 貨</span>
                            <span style={{ color: "#aaa", marginLeft: 6 }}>{o?.cups || 0} 杯</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button style={{ ...S.btnPrimary, background: ROUTE_COLOR, fontSize: 16, padding: "14px 40px", borderRadius: 14 }} onClick={printDispatch}>
                🖨️ 列印 / 下載派送單
              </button>
            </div>
          </div>
        )}
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}



function GlobalStyle() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { color-scheme: light only; }
    body {
      font-family: 'Noto Sans TC', sans-serif;
      background: #f0f2f5;
      color: #1a1a1a;
      -webkit-text-fill-color: #1a1a1a;
      padding-bottom: 72px;
    }
    input, select, textarea {
      color: #1a1a1a !important;
      background-color: #ffffff !important;
      -webkit-text-fill-color: #1a1a1a !important;
      opacity: 1 !important;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input::placeholder { color: #c0c0c0 !important; -webkit-text-fill-color: #c0c0c0 !important; }
    input:focus, select:focus {
      outline: none !important;
      border-color: #1a3a6b !important;
      box-shadow: 0 0 0 3px rgba(26,58,107,0.12) !important;
    }
    a { text-decoration: none; }
    button { font-family: 'Noto Sans TC', sans-serif; }

    /* Shimmer skeleton animation */
    @keyframes shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    .skeleton {
      background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }

    /* Toast animation */
    @keyframes toastSlideUp {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Bottom Tab Bar */
    .bottom-tab-bar {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 64px;
      background: #ffffff;
      border-top: 1px solid #e8e8e8;
      display: flex;
      z-index: 200;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
    }
    .tab-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      cursor: pointer;
      border: none;
      background: none;
      font-family: 'Noto Sans TC', sans-serif;
      padding: 6px 0 8px;
      color: #b0b0b0;
      transition: color 0.15s;
    }
    .tab-item.active { color: #1a3a6b; }
    .tab-icon { font-size: 22px; line-height: 1; }
    .tab-label { font-size: 10px; font-weight: 600; letter-spacing: 0.5px; }

    @media (prefers-color-scheme: dark) {
      html { color-scheme: light only; }
      body { background: #f0f2f5 !important; color: #1a1a1a !important; }
      input, select, textarea {
        color: #1a1a1a !important;
        background-color: #ffffff !important;
        -webkit-text-fill-color: #1a1a1a !important;
      }
    }
  `}</style>;
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────
const TABS = [
  { hash: "#warehouse", icon: "🏭", label: "倉庫" },
  { hash: "#driver",    icon: "🚚", label: "司機" },
  { hash: "#logistics", icon: "📋", label: "後勤" },
  { hash: "#route",     icon: "🗺️", label: "路線" },
];

function BottomTabBar() {
  const current = window.location.hash;
  function isActive(hash) {
    if (hash === "#warehouse") return current.startsWith("#warehouse") || current.startsWith("#inventory") || current.startsWith("#history") || current.startsWith("#sheet") || current.startsWith("#review") || current.startsWith("#settings");
    if (hash === "#driver") return current.startsWith("#driver");
    if (hash === "#logistics") return current.startsWith("#logistics");
    if (hash === "#route") return current.startsWith("#route");
    return false;
  }
  return (
    <nav className="bottom-tab-bar">
      {TABS.map(t => (
        <a key={t.hash} href={t.hash} className={`tab-item${isActive(t.hash) ? " active" : ""}`}>
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </a>
      ))}
    </nav>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: "#1a3a6b", color: "#fff", padding: "11px 22px", borderRadius: 30,
      fontSize: 14, fontWeight: 600, zIndex: 500,
      boxShadow: "0 6px 24px rgba(26,58,107,0.35)",
      animation: "toastSlideUp 0.3s ease",
      whiteSpace: "nowrap",
    }}>{msg}</div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 12 }}>
      <div className="skeleton" style={{ height: 16, width: "60%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 12, width: "40%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: "80%" }} />
    </div>
  );
}

// ─── Design Tokens（已移至檔案頂端）──────────────────────────────────────────
// PRIMARY 和 PRIMARY_LIGHT 定義在第一行附近，此處保留空白避免其他程式碼引用出錯

const S = {
  page: { minHeight: "100vh", background: "#f0f2f5", color: "#1a1a1a" },
  topRainbow: { height: 3, background: `linear-gradient(90deg,${PRIMARY},#2563a8)` },
  header: { background: "#fff", boxShadow: "0 1px 0 #ebebeb", position: "sticky", top: 0, zIndex: 100 },
  headerInner: { maxWidth: 960, margin: "0 auto", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandMark: { width: 36, height: 36, borderRadius: 10, background: PRIMARY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, flexShrink: 0 },
  brandName: { fontWeight: 800, fontSize: 15, color: "#1a1a1a" },
  brandSub: { fontSize: 11, color: "#aaa", marginTop: 1 },
  navBtn: { padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${PRIMARY}`, background: "#fff", fontSize: 13, cursor: "pointer", textDecoration: "none", color: PRIMARY, fontWeight: 700, display: "inline-block" },
  backBtn: { fontSize: 13, color: PRIMARY, textDecoration: "none", padding: "7px 12px", borderRadius: 20, background: PRIMARY_LIGHT, whiteSpace: "nowrap", fontWeight: 600 },
  main: { maxWidth: 960, margin: "0 auto", padding: "20px 16px" },
  pageTitle: { fontWeight: 900, fontSize: 20, marginBottom: 3, color: "#111" },
  pageSub: { fontSize: 13, color: "#aaa", marginBottom: 20 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 },
  card: { background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  cardHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  cardTitle: { fontWeight: 700, fontSize: 15 },
  cardMeta: { fontSize: 12, color: "#aaa", marginTop: 2 },
  statusPill: (s) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: !s ? "#f0f0f0" : s === "done" ? "#e8f5ee" : "#fff4e0", color: !s ? "#bbb" : s === "done" ? "#1a6e45" : "#b85c1a" }),
  qrRow: { display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12 },
  metaLine: { fontSize: 12, color: "#aaa", marginTop: 4 },
  urlRow: { display: "flex", alignItems: "center", gap: 8, background: "#f7f8fa", borderRadius: 8, padding: "7px 12px" },
  urlText: { fontSize: 11, color: "#999", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  copyBtn: { padding: "4px 10px", borderRadius: 6, border: "1px solid #e8e8e8", background: "#fff", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" },
  btnPrimary: { padding: "10px 18px", borderRadius: 10, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block", background: PRIMARY },
  savedTag: { background: "#e8f5ee", color: "#1a6e45", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 },
  tabs: { display: "flex", gap: 0, marginBottom: 16, background: "#fff", borderRadius: 12, padding: 5, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", flexWrap: "wrap" },
  tab: { flex: 1, padding: "9px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#aaa", borderBottom: "2.5px solid transparent", transition: "all 0.15s", whiteSpace: "nowrap", fontFamily: "inherit" },
  settingRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f3f3", gap: 12, flexWrap: "wrap" },
  settingName: { fontWeight: 600, fontSize: 15 },
  deleteBtn: { padding: "5px 12px", borderRadius: 20, border: "none", background: "#fff0f0", color: "#e74c3c", cursor: "pointer", fontSize: 12, fontWeight: 700 },
  metaRow: { display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  metaField: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: "#555", whiteSpace: "nowrap" },
  fieldInput: { padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e4e4e4", fontSize: 14, background: "#fff", width: "100%" },
  emptyState: { textAlign: "center", padding: "50px 20px", color: "#ccc", background: "#fff", borderRadius: 16, fontSize: 15, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  itemCard: { background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" },
  itemHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  itemNum: { width: 26, height: 26, borderRadius: 8, background: PRIMARY_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: PRIMARY, flexShrink: 0 },
  itemName: { fontWeight: 700, fontSize: 15, flex: 1 },
  totalBadge: { padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  slotsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  slot: { background: "#f7f8fa", borderRadius: 10, padding: "12px", display: "flex", flexDirection: "column", gap: 8 },
  slotLabel: { fontSize: 11, color: "#888", fontWeight: 700, marginBottom: 2 },
  slotInput: { padding: "10px 10px", border: "1.5px solid #e8e8e8", borderRadius: 8, fontSize: 15, background: "#fff", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  lotHistBtn: { padding: "6px 8px", border: "1px solid #e8e8e8", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14, flexShrink: 0 },
  lotDropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, overflow: "hidden" },
  lotDropdownTitle: { padding: "8px 12px", fontSize: 11, color: "#aaa", fontWeight: 700, borderBottom: "1px solid #f0f0f0", background: "#fafafa" },
  lotOption: { width: "100%", padding: "10px 12px", background: "none", border: "none", borderBottom: "1px solid #f5f5f5", textAlign: "left", cursor: "pointer", fontSize: 13, fontFamily: "monospace", fontWeight: 600 },
};

const LP = {};

const WH = {
  menuBtn: (color) => ({ display: "flex", alignItems: "center", gap: 18, padding: "22px 24px", background: color, color: "#fff", borderRadius: 14, textDecoration: "none", boxShadow: `0 4px 20px ${color}44` }),
};

const DR = {
  bigBtn: (color) => ({ display: "flex", alignItems: "center", gap: 20, padding: "24px 28px", background: color, color: "#fff", borderRadius: 16, textDecoration: "none", boxShadow: `0 4px 20px ${color}44` }),
  vehicleBtn: { padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, transition: "all 0.15s" },
};

const SL = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: "#fff", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 320, boxShadow: "0 16px 48px rgba(0,0,0,0.2)" },
  title: { fontWeight: 800, fontSize: 16, marginBottom: 16 },
  input: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 15, outline: "none", fontFamily: "inherit" },
  cancelBtn: { flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #e0e0e0", background: "#f5f5f5", cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "inherit" },
  confirmBtn: { flex: 1, padding: "10px", borderRadius: 10, border: "none", background: PRIMARY, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" },
};// ─── System Settings Page（功能開關）─────────────────────────────────────────
function SystemSettingsPage() {
  const [modules, setModules] = useState(null);
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(ref(db, "settings/modules")).then(snap => {
      if (snap.exists()) {
        setModules(snap.val());
      } else {
        const defaults = {};
        ALL_MODULES.forEach(m => { defaults[m.id] = true; });
        setModules(defaults);
      }
      setLoading(false);
    });
  }, []);

  async function toggle(id) {
    const next = { ...modules, [id]: !modules[id] };
    setModules(next);
    await set(ref(db, "settings/modules"), next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <a href="#" style={S.backBtn}>← 返回</a>
            <div style={S.brandMark}>⚙️</div>
            <div>
              <div style={S.brandName}>系統設定</div>
              <div style={S.brandSub}>功能模組開關</div>
            </div>
          </div>
          {saved && <div style={S.savedTag}>✓ 已儲存</div>}
        </div>
      </header>
      <main style={{ ...S.main, maxWidth: 600 }}>
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>🔘 主頁功能模組</div>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>勾選的模組才會顯示在主頁，未勾選的會隱藏</div>
          {loading ? (
            <div style={{ color: "#aaa", textAlign: "center", padding: 24 }}>載入中...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ALL_MODULES.map(m => {
                const isOn = modules?.[m.id] !== false;
                return (
                  <div key={m.id} onClick={() => toggle(m.id)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 18px", background: isOn ? `${m.color}08` : "#f7f8fa", borderRadius: 14, border: `1.5px solid ${isOn ? m.color + "40" : "#eee"}`, cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: isOn ? `${m.color}15` : "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{m.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: isOn ? "#111" : "#aaa" }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: "#bbb", marginTop: 2 }}>{m.sub}</div>
                    </div>
                    {/* Toggle 開關 */}
                    <div style={{ width: 48, height: 28, borderRadius: 14, background: isOn ? m.color : "#ddd", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 3, left: isOn ? 22 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 帳號資訊 */}
        <div style={S.card}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>👤 帳號</div>
          <div style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
            目前登入：<span style={{ fontWeight: 700, color: PRIMARY }}>{auth.currentUser?.email || "—"}</span>
          </div>
          <button onClick={() => { signOut(auth); window.location.hash = ""; }} style={{ padding: "10px 20px", borderRadius: 10, border: "1.5px solid #e0e0e0", background: "#fff", color: "#888", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            登出系統
          </button>
        </div>
      </main>
      <BottomTabBar />
      <GlobalStyle />
    </div>
  );
}

// ─── 拖拉排序清單（通用）────────────────────────────────────────────────────────
function DraggableList({ items, onReorder, renderItem }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  function handleDragStart(e, idx) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }
  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    onReorder(next);
    setDragIdx(null); setOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null); setOverIdx(null); }

  // 觸控拖拉
  const touchState = useRef({});
  function handleTouchStart(e, idx) {
    touchState.current = { startIdx: idx, startY: e.touches[0].clientY };
  }
  function handleTouchEnd(e, idx) {
    const { startIdx } = touchState.current;
    if (startIdx === undefined || startIdx === idx) return;
    const next = [...items];
    const [moved] = next.splice(startIdx, 1);
    next.splice(idx, 0, moved);
    onReorder(next);
    touchState.current = {};
  }

  return (
    <div>
      {items.map((item, idx) => (
        <div
          key={item.key || idx}
          draggable
          onDragStart={e => handleDragStart(e, idx)}
          onDragOver={e => handleDragOver(e, idx)}
          onDrop={e => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          onTouchStart={e => handleTouchStart(e, idx)}
          onTouchEnd={e => handleTouchEnd(e, idx)}
          style={{
            opacity: dragIdx === idx ? 0.4 : 1,
            borderTop: overIdx === idx && dragIdx !== idx ? "2px solid #1B4F8A" : "2px solid transparent",
            transition: "opacity 0.15s",
            cursor: "grab",
          }}
        >
          {renderItem(item, idx)}
        </div>
      ))}
    </div>
  );
}



