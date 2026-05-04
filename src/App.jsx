import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, push } from "firebase/database";

// ─── Firebase 設定（從你的截圖取得）────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAcuYthtp7QteUP0yYGNbV8QmZfQ8St25s",
  authDomain: "weiding-inventory.firebaseapp.com",
  databaseURL: "https://weiding-inventory-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "weiding-inventory",
  storageBucket: "weiding-inventory.firebasestorage.app",
  messagingSenderId: "444197108322",
  appId: "1:444197108322:web:4275c1d1251d03d2e2af3b"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ─── 常數 ──────────────────────────────────────────────────────────────────────
const SHEETS = [
  { id: "A", label: "A區倉庫", color: "#1B4F8A" },
  { id: "B", label: "B區倉庫", color: "#1A6E45" },
  { id: "C", label: "C區倉庫", color: "#8B3A0F" },
  { id: "D", label: "D區倉庫", color: "#5B2D8E" },
];
const UNITS = ["箱", "瓶", "袋", "桶", "罐", "包", "件", "個", "公斤", "公升"];
const COMPANY = "威登國際管理顧問有限公司";

// ─── 路由解析 ─────────────────────────────────────────────────────────────────
function parseHash() {
  const h = window.location.hash.replace("#", "");
  if (h.startsWith("report/")) return { view: "report", sessionId: h.replace("report/", "") };
  if (h.startsWith("sheet/")) return { view: "sheet", id: h.replace("sheet/", "") };
  return { view: "home" };
}

// ─── QR Code ──────────────────────────────────────────────────────────────────
function QRImg({ url, size = 120 }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`}
      alt="QR"
      style={{ width: size, height: size, borderRadius: 6, display: "block" }}
    />
  );
}

// ─── UID ──────────────────────────────────────────────────────────────────────
let _c = 0;
function uid() { return `${Date.now()}_${_c++}`; }

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const h = () => setRoute(parseHash());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  if (route.view === "sheet") {
    const sheet = SHEETS.find(s => s.id === route.id);
    if (!sheet) return <div style={{ padding: 40, textAlign: "center" }}>找不到此盤點表 <a href="#">返回</a></div>;
    return <SheetPage sheet={sheet} />;
  }
  if (route.view === "report") return <ReportPage sessionId={route.sessionId} />;
  return <HomePage />;
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomePage() {
  const [selected, setSelected] = useState([]);
  const [sheetMeta, setSheetMeta] = useState({});
  const [generating, setGenerating] = useState(false);
  const [reportLink, setReportLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const base = window.location.href.split("#")[0];

  useEffect(() => {
    SHEETS.forEach(s => {
      const dbRef = ref(db, `sheets/${s.id}/meta`);
      onValue(dbRef, snap => {
        if (snap.exists()) {
          setSheetMeta(prev => ({ ...prev, [s.id]: snap.val() }));
        }
      });
    });
  }, []);

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function generateReport() {
    if (selected.length === 0) return;
    setGenerating(true);
    try {
      // 讀取選中的盤點資料
      const reportData = {};
      for (const id of selected) {
        const snap = await get(ref(db, `sheets/${id}`));
        if (snap.exists()) reportData[id] = snap.val();
      }
      // 產生唯一 session ID 存到 Firebase
      const sessionId = `report_${Date.now()}`;
      await set(ref(db, `reports/${sessionId}`), {
        createdAt: new Date().toLocaleString("zh-TW"),
        sheetIds: selected,
        data: reportData,
      });
      const link = `${base}#report/${sessionId}`;
      setReportLink(link);
    } catch (e) {
      alert("產生報表失敗：" + e.message);
    }
    setGenerating(false);
  }

  function copyLink(url) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={S.page}>
      <div style={S.topBand} />
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <div style={S.brandMark}>威</div>
            <div>
              <div style={S.brandName}>{COMPANY}</div>
              <div style={S.brandSub}>庫存盤點管理系統</div>
            </div>
          </div>
          <div style={S.headerDate}>
            {new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
          </div>
        </div>
      </header>

      <main style={S.main}>
        <div style={S.pageTitle}>盤點工作區</div>
        <div style={S.pageSub}>掃描 QR Code 或點擊連結進入各區域盤點 · 完成後勾選區域產生經理報表</div>

        <div style={S.grid}>
          {SHEETS.map((sheet, i) => {
            const meta = sheetMeta[sheet.id];
            const url = `${base}#sheet/${sheet.id}`;
            const isSelected = selected.includes(sheet.id);
            return (
              <div
                key={sheet.id}
                style={{ ...S.card, animationDelay: `${i * 80}ms`, outline: isSelected ? `2px solid ${sheet.color}` : "2px solid transparent" }}
                className="card-appear"
              >
                <div style={{ ...S.cardAccent, background: sheet.color }} />
                <div style={S.cardBody}>
                  <div style={S.cardHeader}>
                    <div style={{ ...S.zoneBadge, background: sheet.color }}>{sheet.id}</div>
                    <div style={S.cardInfo}>
                      <div style={S.cardTitle}>{sheet.label}</div>
                      <div style={S.cardMeta}>
                        {meta ? `${meta.itemCount ?? 0} 品項 · ${meta.operator || "未填負責人"}` : "尚未開始盤點"}
                      </div>
                    </div>
                    <label style={S.checkWrap}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(sheet.id)}
                        style={{ accentColor: sheet.color, width: 18, height: 18 }}
                      />
                      <span style={S.checkLabel}>加入報表</span>
                    </label>
                  </div>

                  <div style={S.qrSection}>
                    <QRImg url={url} size={96} />
                    <div style={S.qrRight}>
                      <div style={S.statusPill(meta?.status)}>
                        {!meta ? "未開始" : meta.status === "done" ? "✓ 完成" : "盤點中"}
                      </div>
                      {meta?.date && <div style={S.metaLine}>更新：{meta.date}</div>}
                      {meta?.completedCount !== undefined && (
                        <div style={S.metaLine}>完成 {meta.completedCount}/{meta.itemCount} 項</div>
                      )}
                      <a href={`#sheet/${sheet.id}`} style={{ ...S.btnPrimary, background: sheet.color, marginTop: 8, display: "inline-block" }}>
                        進入盤點 →
                      </a>
                    </div>
                  </div>

                  <div style={S.urlRow}>
                    <span style={S.urlText}>{url}</span>
                    <button style={S.copyBtn} onClick={() => copyLink(url)}>複製</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 報表區 */}
        <div style={S.reportSection}>
          <div style={S.reportLeft}>
            <div style={S.reportTitle}>產生經理報表</div>
            <div style={S.reportSub}>
              {selected.length === 0
                ? "請勾選上方要彙整的區域"
                : `已選取 ${selected.map(id => SHEETS.find(s => s.id === id)?.label).join("、")}`}
            </div>
            <button
              style={{ ...S.btnPrimary, background: selected.length > 0 ? "#1a1a1a" : "#ccc", marginTop: 12, cursor: selected.length > 0 ? "pointer" : "default" }}
              onClick={generateReport}
              disabled={selected.length === 0 || generating}
            >
              {generating ? "產生中..." : "產生報表連結"}
            </button>
          </div>

          {reportLink && (
            <div style={S.reportLinkBox}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>✅ 報表連結已產生</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <QRImg url={reportLink} size={88} />
                <div style={{ flex: 1 }}>
                  <div style={S.urlRow}>
                    <span style={S.urlText}>{reportLink}</span>
                    <button style={S.copyBtn} onClick={() => copyLink(reportLink)}>
                      {copied ? "✓" : "複製"}
                    </button>
                  </div>
                  <a href={reportLink} style={{ ...S.btnPrimary, background: "#1B4F8A", marginTop: 8, display: "inline-block", fontSize: 12 }}>
                    預覽報表 →
                  </a>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 6 }}>此連結可傳給任何人，打開即可查看</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans TC', sans-serif; }
        .card-appear { animation: fadeUp 0.4s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── Sheet Page ────────────────────────────────────────────────────────────────
function SheetPage({ sheet }) {
  const [items, setItems] = useState([]);
  const [operator, setOperator] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("zh-TW"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("箱");

  // 從 Firebase 載入
  useEffect(() => {
    const dbRef = ref(db, `sheets/${sheet.id}`);
    onValue(dbRef, snap => {
      if (snap.exists()) {
        const d = snap.val();
        setOperator(d.meta?.operator || "");
        setDate(d.meta?.date || new Date().toLocaleDateString("zh-TW"));
        setItems(d.items ? Object.entries(d.items).map(([k, v]) => ({ ...v, _key: k })) : []);
      }
      setLoading(false);
    });
  }, [sheet.id]);

  async function persist(newItems, newOp, newDate) {
    setSaving(true);
    const completedCount = newItems.filter(i => i.lotNumber && i.quantity !== "").length;
    const meta = {
      operator: newOp,
      date: newDate,
      itemCount: newItems.length,
      completedCount,
      status: newItems.length > 0 && completedCount === newItems.length ? "done" : "partial",
    };
    const itemsObj = {};
    newItems.forEach(i => { itemsObj[i._key] = { name: i.name, unit: i.unit, lotNumber: i.lotNumber, quantity: i.quantity }; });
    await set(ref(db, `sheets/${sheet.id}`), { meta, items: itemsObj });
    setSaving(false);
    setSavedMsg("已儲存至雲端 ✓");
    setTimeout(() => setSavedMsg(""), 2000);
  }

  function updateItem(key, field, value) {
    const next = items.map(i => i._key === key ? { ...i, [field]: value } : i);
    setItems(next);
    persist(next, operator, date);
  }

  function addItem() {
    if (!newName.trim()) return;
    const key = uid();
    const next = [...items, { _key: key, name: newName.trim(), unit: newUnit, lotNumber: "", quantity: "" }];
    setItems(next);
    persist(next, operator, date);
    setNewName("");
  }

  function removeItem(key) {
    if (!confirm("確定刪除此品項？")) return;
    const next = items.filter(i => i._key !== key);
    setItems(next);
    persist(next, operator, date);
  }

  const done = items.filter(i => i.lotNumber && i.quantity !== "").length;
  const total = items.length;

  return (
    <div style={S.page}>
      <div style={{ ...S.topBand, background: sheet.color }} />
      <header style={{ ...S.header, borderBottom: `2px solid ${sheet.color}20` }}>
        <div style={S.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="#" style={S.backBtn}>← 返回</a>
            <div style={{ ...S.zoneBadge, background: sheet.color, width: 40, height: 40, fontSize: 20 }}>{sheet.id}</div>
            <div>
              <div style={S.brandName}>{sheet.label} 盤點表</div>
              <div style={S.brandSub}>{COMPANY}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {saving && <span style={{ fontSize: 12, color: "#aaa" }}>儲存中...</span>}
            {savedMsg && <span style={{ fontSize: 12, color: "#1A6E45", fontWeight: 600 }}>{savedMsg}</span>}
            {total > 0 && (
              <div style={S.progressWrap}>
                <div style={{ ...S.progressBar, width: `${(done / total) * 100}%`, background: sheet.color }} />
                <span style={S.progressText}>{done}/{total}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "#aaa" }}>載入中...</div>
      ) : (
        <main style={S.main}>
          {/* Meta */}
          <div style={S.metaRow}>
            <div style={S.metaField}>
              <label style={S.fieldLabel}>負責人</label>
              <input style={S.fieldInput} value={operator} onChange={e => { setOperator(e.target.value); persist(items, e.target.value, date); }} placeholder="輸入姓名" />
            </div>
            <div style={S.metaField}>
              <label style={S.fieldLabel}>盤點日期</label>
              <input style={S.fieldInput} value={date} onChange={e => { setDate(e.target.value); persist(items, operator, e.target.value); }} />
            </div>
          </div>

          {/* 新增品項 */}
          <div style={S.addRow}>
            <input
              style={{ ...S.fieldInput, flex: 2 }}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addItem()}
              placeholder="新品項名稱（Enter 新增）"
            />
            <select style={S.selectInput} value={newUnit} onChange={e => setNewUnit(e.target.value)}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
            <button style={{ ...S.btnPrimary, background: sheet.color }} onClick={addItem}>＋ 新增品項</button>
          </div>

          {/* 表格 */}
          {items.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div>尚未新增品項，請輸入品名後按 Enter 或點擊新增</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr style={{ background: sheet.color + "12" }}>
                    {["#", "品項名稱", "批號", "數量", "單位", "狀態", ""].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const ok = item.lotNumber && item.quantity !== "";
                    return (
                      <tr key={item._key} style={{ background: idx % 2 === 0 ? "#fafafa" : "#fff", transition: "background 0.15s" }}>
                        <td style={{ ...S.td, color: "#bbb", width: 36 }}>{idx + 1}</td>
                        <td style={S.td}>
                          <input style={S.cellInput} value={item.name} onChange={e => updateItem(item._key, "name", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input style={{ ...S.cellInput, fontFamily: "monospace" }} value={item.lotNumber} onChange={e => updateItem(item._key, "lotNumber", e.target.value)} placeholder="輸入批號" />
                        </td>
                        <td style={S.td}>
                          <input style={{ ...S.cellInput, width: 80, textAlign: "right" }} type="number" min="0" value={item.quantity} onChange={e => updateItem(item._key, "quantity", e.target.value)} placeholder="0" />
                        </td>
                        <td style={S.td}>
                          <select style={{ ...S.cellInput, width: 64 }} value={item.unit} onChange={e => updateItem(item._key, "unit", e.target.value)}>
                            {UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={S.td}>
                          <span style={ok ? S.tagDone : S.tagPending}>{ok ? "✓ 完成" : "未填"}</span>
                        </td>
                        <td style={S.td}>
                          <button style={S.deleteBtn} onClick={() => removeItem(item._key)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {items.length > 0 && (
            <div style={S.summaryRow}>
              <span>共 {total} 項</span>
              <span style={{ color: "#1A6E45" }}>✓ 完成 {done} 項</span>
              {total - done > 0 && <span style={{ color: "#8B3A0F" }}>⚠ 未填 {total - done} 項</span>}
            </div>
          )}
        </main>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans TC', sans-serif; }
        input:focus, select:focus { outline: 2px solid ${sheet.color}; outline-offset: 1px; }
        tr:hover td { background: ${sheet.color}08 !important; }
      `}</style>
    </div>
  );
}

// ─── Report Page ───────────────────────────────────────────────────────────────
function ReportPage({ sessionId }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(ref(db, `reports/${sessionId}`)).then(snap => {
      if (snap.exists()) setReportData(snap.val());
      setLoading(false);
    });
  }, [sessionId]);

  if (loading) return <div style={{ padding: 80, textAlign: "center", color: "#aaa" }}>載入報表中...</div>;
  if (!reportData) return <div style={{ padding: 80, textAlign: "center", color: "#aaa" }}>找不到此報表，連結可能已失效</div>;

  const sheets = (reportData.sheetIds || []).map(id => ({
    ...SHEETS.find(s => s.id === id),
    data: reportData.data?.[id],
  }));

  const grandTotal = sheets.reduce((acc, s) => {
    return acc + Object.values(s.data?.items || {}).reduce((a, i) => a + (parseFloat(i.quantity) || 0), 0);
  }, 0);

  return (
    <div style={S.page}>
      <div style={S.topBand} />
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.brand}>
            <div style={S.brandMark}>威</div>
            <div>
              <div style={S.brandName}>庫存盤點彙整報表</div>
              <div style={S.brandSub}>{COMPANY} · {reportData.createdAt}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="#" style={{ ...S.btnPrimary, background: "#555", fontSize: 13, textDecoration: "none" }}>← 返回</a>
            <button style={{ ...S.btnPrimary, background: "#1a1a1a", fontSize: 13 }} onClick={() => window.print()}>🖨 列印 / PDF</button>
          </div>
        </div>
      </header>

      <main style={{ ...S.main, maxWidth: 900 }}>
        {/* 總覽卡 */}
        <div style={S.reportCards}>
          {sheets.map(s => {
            const items = Object.values(s.data?.items || {});
            const done = items.filter(i => i.lotNumber && i.quantity !== "").length;
            const subtotal = items.reduce((a, i) => a + (parseFloat(i.quantity) || 0), 0);
            return (
              <div key={s.id} style={{ ...S.reportCard, borderTop: `4px solid ${s.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ ...S.zoneBadge, background: s.color }}>{s.id}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.label}</div>
                </div>
                <div style={S.reportCardNum}>{subtotal.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: "#888" }}>總數量</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>負責人：{s.data?.meta?.operator || "—"}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>完成 {done}/{items.length} 項</div>
              </div>
            );
          })}
          <div style={{ ...S.reportCard, borderTop: "4px solid #1a1a1a", background: "#1a1a1a", color: "#fff" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>全區合計</div>
            <div style={{ ...S.reportCardNum, color: "#fff" }}>{grandTotal.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>總盤點數量</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
              {sheets.reduce((a, s) => a + Object.values(s.data?.items || {}).length, 0)} 品項
            </div>
          </div>
        </div>

        {/* 各區明細 */}
        {sheets.map(s => {
          const items = Object.values(s.data?.items || {});
          const subtotal = items.reduce((a, i) => a + (parseFloat(i.quantity) || 0), 0);
          return (
            <div key={s.id} style={{ marginBottom: 40 }}>
              <div style={{ ...S.sheetHeading, borderLeft: `5px solid ${s.color}` }}>
                <div style={{ ...S.zoneBadge, background: s.color }}>{s.id}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{s.label}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>
                    負責人：{s.data?.meta?.operator || "—"} · 日期：{s.data?.meta?.date || "—"}
                  </div>
                </div>
              </div>

              {items.length === 0 ? (
                <div style={{ padding: 24, background: "#f8f8f8", borderRadius: 10, color: "#bbb", textAlign: "center" }}>此區域無盤點資料</div>
              ) : (
                <table style={{ ...S.table, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <thead>
                    <tr style={{ background: s.color, color: "#fff" }}>
                      {["#", "品項名稱", "批號", "數量", "單位", "狀態"].map(h => (
                        <th key={h} style={{ ...S.th, color: "#fff" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const ok = item.lotNumber && item.quantity !== "";
                      return (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? "#fafafa" : "#fff" }}>
                          <td style={{ ...S.td, color: "#bbb" }}>{idx + 1}</td>
                          <td style={{ ...S.td, fontWeight: 600 }}>{item.name}</td>
                          <td style={{ ...S.td, fontFamily: "monospace", fontSize: 13 }}>{item.lotNumber || <span style={{ color: "#ddd" }}>—</span>}</td>
                          <td style={{ ...S.td, textAlign: "right", fontWeight: 800, fontSize: 18, color: s.color }}>{item.quantity !== "" ? item.quantity : <span style={{ color: "#ddd" }}>—</span>}</td>
                          <td style={S.td}>{item.unit}</td>
                          <td style={S.td}><span style={ok ? S.tagDone : S.tagPending}>{ok ? "✓ 完成" : "⚠ 未填"}</span></td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: s.color + "15" }}>
                      <td colSpan={3} style={{ ...S.td, textAlign: "right", color: "#666", fontWeight: 600, fontSize: 13 }}>小計</td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 900, fontSize: 22, color: s.color }}>{subtotal.toLocaleString()}</td>
                      <td colSpan={2} style={S.td}></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        <div style={S.reportFooter}>
          {COMPANY} · 庫存盤點管理系統 · 報表產生時間：{reportData.createdAt}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans TC', sans-serif; }
        @media print {
          header button, header a[href="#"] { display: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: "100vh", background: "#F2F3F5", fontFamily: "'Noto Sans TC', sans-serif", color: "#1a1a1a" },
  topBand: { height: 4, background: "linear-gradient(90deg, #1B4F8A, #1A6E45, #8B3A0F, #5B2D8E)" },
  header: { background: "#fff", boxShadow: "0 1px 10px rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 100 },
  headerInner: { maxWidth: 1100, margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  brand: { display: "flex", alignItems: "center", gap: 14 },
  brandMark: { width: 44, height: 44, borderRadius: 10, background: "#1B4F8A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900 },
  brandName: { fontWeight: 800, fontSize: 17, letterSpacing: 0.5 },
  brandSub: { fontSize: 12, color: "#999", marginTop: 2 },
  headerDate: { fontSize: 13, color: "#999" },
  main: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px" },
  pageTitle: { fontWeight: 900, fontSize: 22, marginBottom: 4 },
  pageSub: { fontSize: 13, color: "#999", marginBottom: 28 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 36 },
  card: { background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 14px rgba(0,0,0,0.06)", transition: "outline 0.15s" },
  cardAccent: { height: 5 },
  cardBody: { padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  cardHeader: { display: "flex", alignItems: "flex-start", gap: 10 },
  zoneBadge: { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16, flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardTitle: { fontWeight: 700, fontSize: 16 },
  cardMeta: { fontSize: 12, color: "#aaa", marginTop: 2 },
  checkWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" },
  checkLabel: { fontSize: 11, color: "#aaa" },
  qrSection: { display: "flex", gap: 14, alignItems: "flex-start" },
  qrRight: { flex: 1 },
  statusPill: (s) => ({
    display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
    background: !s ? "#f0f0f0" : s === "done" ? "#E8F5EE" : "#FFF4E0",
    color: !s ? "#bbb" : s === "done" ? "#1A6E45" : "#8B3A0F",
  }),
  metaLine: { fontSize: 12, color: "#aaa", marginTop: 4 },
  urlRow: { display: "flex", alignItems: "center", gap: 8, background: "#F7F8FA", borderRadius: 8, padding: "8px 12px" },
  urlText: { fontSize: 11, color: "#999", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  copyBtn: { padding: "4px 10px", borderRadius: 6, border: "1px solid #e8e8e8", background: "#fff", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
  btnPrimary: { padding: "9px 18px", borderRadius: 9, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" },
  reportSection: { background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 14px rgba(0,0,0,0.06)", display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" },
  reportLeft: { flex: 1, minWidth: 200 },
  reportTitle: { fontWeight: 800, fontSize: 18 },
  reportSub: { fontSize: 13, color: "#aaa", marginTop: 4 },
  reportLinkBox: { flex: 2, minWidth: 260, background: "#F7FBFF", borderRadius: 12, padding: 16, border: "1px solid #D0E8FF" },
  // Sheet
  backBtn: { fontSize: 13, color: "#999", textDecoration: "none", padding: "6px 10px", borderRadius: 8, background: "#f5f5f5" },
  progressWrap: { width: 120, height: 8, background: "#eee", borderRadius: 10, overflow: "hidden", position: "relative", display: "flex", alignItems: "center" },
  progressBar: { height: "100%", borderRadius: 10, transition: "width 0.4s ease" },
  progressText: { position: "absolute", right: 6, fontSize: 10, color: "#fff", fontWeight: 700, mixBlendMode: "difference" },
  metaRow: { display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" },
  metaField: { display: "flex", alignItems: "center", gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: "#555", whiteSpace: "nowrap" },
  fieldInput: { padding: "8px 12px", borderRadius: 8, border: "1px solid #e4e4e4", fontSize: 14, background: "#fff" },
  selectInput: { padding: "8px 10px", borderRadius: 8, border: "1px solid #e4e4e4", fontSize: 14, background: "#fff" },
  addRow: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden" },
  th: { padding: "12px 14px", textAlign: "left", fontSize: 13, fontWeight: 700, color: "#555", whiteSpace: "nowrap" },
  td: { padding: "10px 14px", fontSize: 14, verticalAlign: "middle" },
  cellInput: { padding: "6px 10px", border: "1px solid #ebebeb", borderRadius: 7, fontSize: 13, width: "100%", background: "#fafafa" },
  tagDone: { background: "#E8F5EE", color: "#1A6E45", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  tagPending: { background: "#FFF4E0", color: "#8B3A0F", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  deleteBtn: { background: "none", border: "none", color: "#ddd", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1 },
  summaryRow: { display: "flex", gap: 20, marginTop: 14, fontSize: 13, fontWeight: 600, flexWrap: "wrap" },
  emptyState: { textAlign: "center", padding: 60, color: "#ccc", background: "#fff", borderRadius: 12, fontSize: 15 },
  // Report
  reportCards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 36 },
  reportCard: { background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" },
  reportCardNum: { fontSize: 32, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.1, margin: "6px 0 2px" },
  sheetHeading: { display: "flex", alignItems: "center", gap: 12, paddingLeft: 14, marginBottom: 12 },
  reportFooter: { textAlign: "center", color: "#ccc", fontSize: 12, marginTop: 48, paddingTop: 24, borderTop: "1px solid #eee" },
};
