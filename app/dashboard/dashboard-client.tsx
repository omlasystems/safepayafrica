"use client";

import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileImage,
  FileText,
  Globe2,
  History,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  ScanSearch,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, InputType, RiskLevel } from "@/lib/analysis";
import { getSupabase } from "@/lib/supabase";

type User = { id: string; email?: string };
type HistoryItem = {
  id: string;
  input_type: InputType;
  submitted_content: string;
  risk_score: number;
  risk_level: RiskLevel;
  created_at: string;
};
type SelectedImage = { file: File; preview: string };

const LOCAL_HISTORY_KEY = "safepai-lite-local-scans";
const LOCAL_HISTORY_LIMIT = 8;

const scanTypes: Array<{ value: InputType; label: string; icon: typeof MessageSquareText; placeholder: string }> = [
  {
    value: "message",
    label: "Message",
    icon: MessageSquareText,
    placeholder: "Paste a suspicious WhatsApp, SMS, or email message here...",
  },
  { value: "website", label: "Website", icon: Globe2, placeholder: "https://example.com" },
  {
    value: "investment",
    label: "Investment offer",
    icon: ScanSearch,
    placeholder: "Paste the investment offer, promised returns, or company details...",
  },
  {
    value: "payment",
    label: "Payment request",
    icon: WalletCards,
    placeholder: "Paste the payment instructions or describe the request...",
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

function levelLabel(level: RiskLevel) {
  if (level === "low") return "Low detected";
  return level === "very_high" ? "Very high" : level[0].toUpperCase() + level.slice(1);
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={`risk-badge risk-${level}`}>{levelLabel(level)} risk</span>;
}

function readLocalHistory(): HistoryItem[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_HISTORY_KEY) ?? "[]") as unknown;
    if (!Array.isArray(saved)) return [];
    return saved.filter((item): item is HistoryItem => {
      if (!item || typeof item !== "object") return false;
      const scan = item as Record<string, unknown>;
      return (
        typeof scan.id === "string" &&
        ["message", "website", "investment", "payment"].includes(String(scan.input_type)) &&
        typeof scan.submitted_content === "string" &&
        typeof scan.risk_score === "number" &&
        ["low", "moderate", "high", "very_high"].includes(String(scan.risk_level)) &&
        typeof scan.created_at === "string"
      );
    }).slice(0, LOCAL_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function saveLocalHistory(items: HistoryItem[]) {
  window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items.slice(0, LOCAL_HISTORY_LIMIT)));
}

function downloadReport(
  result: AnalysisResult,
  details: { description: string; date: string; payment: string; evidence: string },
) {
  const doc = new jsPDF();
  const margin = 18;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = 22;
  const addLine = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "Not provided", width);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
  };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SAFEPAI Lite — Incident Report", margin, y);
  y += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated ${new Date().toLocaleString()} • Preliminary assessment, not proof of fraud`, margin, y);
  y += 12;
  addLine("Incident date", details.date);
  addLine("Incident description", details.description);
  addLine("Suspicious payment details", details.payment);
  addLine("Supporting evidence", details.evidence);
  addLine("Preliminary risk assessment", `${levelLabel(result.risk_level)} (${result.risk_score}/100). ${result.explanation}`);
  addLine("Detected warning signs", result.detected_indicators.join("\n") || "No specific warning signs detected.");
  addLine("Recommended actions", result.recommendations.join("\n"));
  addLine("Verification status", result.verification_status.replaceAll("_", " "));
  addLine(
    "Reporting guidance",
    "Contact your bank or payment provider promptly using an official number or app if money was sent. Preserve original messages, receipts, and URLs. Use the appropriate official law-enforcement or consumer-protection reporting channel in your country. This report is not sent automatically.",
  );
  doc.save("safepai-incident-report.pdf");
}

export default function Dashboard({ initialAuthMode }: { initialAuthMode?: "signin" | "signup" }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [savedScans, setSavedScans] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [inputType, setInputType] = useState<InputType>("message");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [authOpen, setAuthOpen] = useState(initialAuthMode !== undefined);
  const [authMode, setAuthMode] = useState<"signin" | "signup">(initialAuthMode ?? "signin");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [report, setReport] = useState({
    category: "Suspicious message",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    business: "",
    payment: "",
    phone: "",
    url: "",
    evidence: "",
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedType = scanTypes.find((type) => type.value === inputType) ?? scanTypes[0];

  useEffect(() => {
    const loadSavedHistory = window.setTimeout(() => setLocalHistory(readLocalHistory()), 0);
    return () => window.clearTimeout(loadSavedHistory);
  }, []);

  const loadHistory = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data: scans, error: scanError } = await supabase
      .from("scans")
      .select("id,input_type,submitted_content,risk_score,risk_level,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);
    if (!scanError && scans) {
      setHistory(scans as HistoryItem[]);
    }
    const { count: scanCount } = await supabase
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    setSavedScans(scanCount ?? 0);
    const { count } = await supabase
      .from("scam_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    setReportCount(count ?? 0);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user) {
        setUser({ id: data.session.user.id, email: data.session.user.email });
        void loadHistory(data.session.user.id);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser ? { id: currentUser.id, email: currentUser.email } : null);
      if (currentUser) void loadHistory(currentUser.id);
      else {
        setHistory([]);
        setSavedScans(0);
        setReportCount(0);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadHistory]);

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.preview);
  }, [image]);

  const updateImage = (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setResult(null);
      setNotice("Choose a PNG, JPEG, or WebP screenshot.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setResult(null);
      setNotice("Screenshots must be 3 MB or smaller.");
      return;
    }
    setImage({ file, preview: URL.createObjectURL(file) });
    setResult(null);
    setNotice("");
  };

  const submitScan = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim() && !image) {
      setResult(null);
      setNotice("Add a message, website, or screenshot to scan.");
      return;
    }
    setLoading(true);
    setNotice("");
    setResult(null);
    try {
      const body: {
        content: string;
        inputType: InputType;
        image?: { data: string; mimeType: string; name: string };
      } = {
        content: content.trim() || `Screenshot upload: ${image?.file.name ?? "image"}.`,
        inputType: !content.trim() && image ? "message" : inputType,
      };
      if (image) {
        body.image = {
          data: await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const encoded = String(reader.result).split(",")[1];
              if (!encoded) reject(new Error("Could not read the selected image."));
              else resolve(encoded);
            };
            reader.onerror = () => reject(new Error("Could not read the selected image."));
            reader.readAsDataURL(image.file);
          }),
          mimeType: image.file.type,
          name: image.file.name,
        };
      }
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The scan could not be completed.");
      const analysis = payload as AnalysisResult;
      setResult(analysis);
      if (user && supabase) {
        const { error: saveError } = await supabase.from("scans").insert({
          user_id: user.id,
          input_type: !content.trim() && image ? "message" : inputType,
          submitted_content: body.content,
          risk_score: analysis.risk_score,
          risk_level: analysis.risk_level,
          ai_analysis: analysis,
          verification_status: analysis.verification_status,
        });
        if (saveError) {
          setNotice("Analysis complete, but this scan could not be saved to your history.");
        } else {
          setSavedScans((count) => count + 1);
          void loadHistory(user.id);
        }
      } else {
        const item: HistoryItem = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          input_type: body.inputType,
          submitted_content: body.content,
          risk_score: analysis.risk_score,
          risk_level: analysis.risk_level,
          created_at: new Date().toISOString(),
        };
        setLocalHistory((current) => {
          const next = [item, ...current].slice(0, LOCAL_HISTORY_LIMIT);
          saveLocalHistory(next);
          return next;
        });
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The scan could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      const response =
        authMode === "signup"
          ? await supabase.auth.signUp({ email, password, options: { data: { full_name: String(formData.get("name") ?? "") } } })
          : await supabase.auth.signInWithPassword({ email, password });
      if (response.error) {
        setAuthError(response.error.message);
      } else {
        setAuthOpen(false);
        setNotice(authMode === "signup" ? "Account created. Check your email if confirmation is enabled." : "You are signed in.");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication could not be completed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setNotice(`Could not sign out: ${error.message}`);
        return;
      }
      setNotice("You have been signed out.");
    } catch (error) {
      setNotice(error instanceof Error ? `Could not sign out: ${error.message}` : "Could not sign out. Please try again.");
    }
  };

  const submitReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !supabase) {
      setReportOpen(false);
      setAuthOpen(true);
      setNotice("Sign in to submit a community report.");
      return;
    }
    setReportBusy(true);
    const suspiciousUrl = report.url.trim();
    if (suspiciousUrl) {
      try {
        const parsed = new URL(suspiciousUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        setReportBusy(false);
        setNotice("Enter a complete HTTP or HTTPS website address, or leave it blank.");
        return;
      }
    }
    try {
      const { error } = await supabase.from("scam_reports").insert({
        user_id: user.id,
        category: report.category,
        description: `${report.description}\nIncident date: ${report.date}\nPayment details: ${report.payment}\nSupporting evidence: ${report.evidence}`,
        suspicious_url: suspiciousUrl || null,
        suspicious_phone: report.phone.trim() || null,
        reported_business_name: report.business.trim() || null,
        verification_status: "unverified",
      });
      if (error) {
        setNotice("Your report could not be submitted. Please try again.");
        return;
      }
    } catch {
      setNotice("Your report could not be submitted. Please try again.");
      return;
    } finally {
      setReportBusy(false);
    }
    setReportCount((count) => count + 1);
    setReportOpen(false);
    setNotice("Report submitted as unverified. Thank you for helping others stay alert.");
  };

  const displayedHistory = user ? history : localHistory;
  const scanCount = user ? savedScans : localHistory.length;
  const scansToday = displayedHistory.filter((item) => new Date(item.created_at).toDateString() === new Date().toDateString()).length;
  const suspiciousCount = displayedHistory.filter((item) => item.risk_score >= 30).length;

  const clearLocalHistory = () => {
    window.localStorage.removeItem(LOCAL_HISTORY_KEY);
    setLocalHistory([]);
    setNotice("Local scan history cleared from this browser.");
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <Link className="brand" href="/" aria-label="SAFEPAI Lite home">
          <span className="brand-mark"><ShieldCheck size={23} strokeWidth={2.2} /></span>
          <span className="brand-name">safe<span>pai</span><small>LITE</small></span>
        </Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#dashboard" onClick={() => setMobileMenu(false)}><LayoutDashboard size={18} /> Dashboard</a>
          <a className="nav-item" href="#scanner" onClick={() => setMobileMenu(false)}><ScanSearch size={18} /> Scam scanner</a>
          <a className="nav-item" href="#history" onClick={() => setMobileMenu(false)}><History size={18} /> Scan history</a>
          <button className="nav-item" onClick={() => { setReportOpen(true); setMobileMenu(false); }}><ShieldAlert size={18} /> Report a scam</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={17} /></div>
            <strong>Need a hand?</strong>
            <span>Learn how to spot common scams.</span>
            <a href="#safety">Explore safety tips <ArrowRight size={13} /></a>
          </div>
          <div className="sidebar-foot"><LockKeyhole size={13} /> Your safety comes first</div>
        </div>
      </aside>

      <main className="main-panel" id="dashboard">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" onClick={() => setMobileMenu((open) => !open)} aria-label="Toggle navigation">
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumb">Workspace <span>/</span> <b>Dashboard</b></div>
          <div className="top-actions">
            <span className="secure-label"><span className="secure-dot" /> Private &amp; secure</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            {user ? (
              <button className="profile-button" onClick={signOut} title="Sign out">
                <span className="avatar">{(user.email?.[0] ?? "U").toUpperCase()}</span>
                <span className="profile-email">{user.email}</span><LogOut size={15} /><span className="sign-out-label">Sign out</span>
              </button>
            ) : (
              <button className="sign-in-button" onClick={() => setAuthOpen(true)}>Sign in <ChevronDown size={14} /></button>
            )}
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR EVERYDAY FRAUD-SAFETY TOOL</div>
              <h1>Stay one step <span>ahead.</span></h1>
              <p>Check suspicious messages, websites, and payment requests before you act.</p>
            </div>
            <button className="button button-outline report-top-button" onClick={() => setReportOpen(true)}>
              <Plus size={17} /> Report a scam
            </button>
          </section>

          <section className="stats-grid" aria-label="Your activity">
            <div className="stat-card">
              <div className="stat-top"><span>Total scans</span><span className="stat-icon mint-icon"><ScanSearch size={17} /></span></div>
              <div className="stat-value">{scanCount}<span className="stat-caption">{user ? "Saved to your account" : "Saved on this device"}</span></div>
              <div className="stat-foot"><span className="stat-foot-dot green-dot" /> {scansToday} scanned today</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><span>Suspicious detected</span><span className="stat-icon amber-icon"><TriangleAlert size={17} /></span></div>
              <div className="stat-value">{suspiciousCount}<span className="stat-caption">Preliminary warning signs</span></div>
              <div className="stat-foot"><span className="stat-foot-dot amber-dot" /> Based on your recent scans</div>
            </div>
            <div className="stat-card">
              <div className="stat-top"><span>Community reports</span><span className="stat-icon blue-icon"><FileText size={17} /></span></div>
              <div className="stat-value">{reportCount}<span className="stat-caption">Reports you submitted</span></div>
              <div className="stat-foot"><span className="stat-foot-dot blue-dot" /> Reports start unverified</div>
            </div>
          </section>

          <div className="content-grid">
            <section className="scanner-card" id="scanner">
              <div className="card-heading">
                <div className="heading-icon"><ScanSearch size={20} /></div>
                <div><h2>Scam scanner</h2><p>Paste a message or link. We’ll check it for warning signs.</p></div>
                <span className="free-pill"><span /> QUICK CHECK</span>
              </div>
              <form onSubmit={submitScan}>
                <div className="input-tabs" role="tablist" aria-label="What would you like to check?">
                  {scanTypes.map(({ value, label, icon: Icon }) => (
                    <button
                      className={`input-tab ${inputType === value ? "selected" : ""}`}
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={inputType === value}
                      disabled={loading}
                      onClick={() => {
                        setInputType(value);
                        setResult(null);
                        setNotice("");
                      }}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
                <label className="sr-only" htmlFor="scan-content">Suspicious content to analyze</label>
                <textarea
                  id="scan-content"
                  className={inputType === "website" ? "url-input" : ""}
                  value={content}
                  disabled={loading}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setResult(null);
                    setNotice("");
                  }}
                  placeholder={selectedType.placeholder}
                  rows={5}
                  maxLength={10000}
                  spellCheck={false}
                />
                <div className="composer-footer">
                  <div className="composer-tools">
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={loading}
                      onChange={(event) => updateImage(event.target.files?.[0])}
                    />
                    <button className="attach-button" type="button" disabled={loading} onClick={() => fileInput.current?.click()}>
                      <FileImage size={16} /> Add screenshot
                    </button>
                    <span className="privacy-hint"><LockKeyhole size={12} /> Your scan is private</span>
                  </div>
                  <span className="character-count">{content.length.toLocaleString()} / 10,000</span>
                </div>
                {image && (
                  <div className="image-preview">
                    {/* The preview is a locally selected user screenshot; no remote image URL is loaded. */}
                    <Image src={image.preview} alt="Screenshot selected for analysis" width={40} height={32} unoptimized />
                    <span><Check size={14} /> {image.file.name}</span>
                    <button type="button" disabled={loading} onClick={() => { setImage(null); setResult(null); }} aria-label="Remove screenshot"><X size={16} /></button>
                  </div>
                )}
                {notice && <div className="notice" role="status">{notice}</div>}
                <div className="scan-action-row">
                  <div className="ai-note"><span className="ai-spark">✳</span> Rules first <span>·</span> AI only when needed</div>
                  <button className="button button-primary scan-button" type="submit" disabled={loading}>
                    {loading ? <span className="spinner" /> : <ScanSearch size={17} />}
                    {loading ? "Checking..." : "Check for scams"}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </div>
              </form>

              {result && (
                <div className={`result-panel result-${result.risk_level}`} aria-live="polite">
                  <div className="result-header">
                    <div className="result-status-icon">
                      {result.image_analysis_status === "not_analyzed" ? <TriangleAlert size={21} /> : result.risk_score >= 60 ? <ShieldAlert size={21} /> : result.risk_score >= 30 ? <TriangleAlert size={21} /> : <ShieldCheck size={21} />}
                    </div>
                    <div className="result-title"><strong>{result.image_analysis_status === "not_analyzed" ? "Image not visually analyzed" : result.risk_score >= 60 ? "Pause — warning signs found" : result.risk_score >= 30 ? "Take care — review this carefully" : "No known warning signs detected"}</strong><span>{result.provisional ? "Provisional rules-only assessment" : "Preliminary AI-assisted assessment"}</span></div>
                    {result.image_analysis_status === "not_analyzed" ? <span className="risk-badge risk-moderate">Image not checked</span> : <RiskBadge level={result.risk_level} />}
                  </div>
                  {result.image_analysis_status === "not_analyzed" ? (
                    <div className="image-unavailable-note">No visual content was checked. This result cannot indicate whether the screenshot is safe.</div>
                  ) : (
                    <>
                      <div className="score-row"><span>Preliminary heuristic risk score</span><strong>{result.risk_score}<small>/100</small></strong></div>
                      <div className="score-track"><span style={{ width: `${result.risk_score}%` }} /></div>
                    </>
                  )}
                  <p className="result-explanation">{result.explanation}</p>
                  {result.detected_indicators.length > 0 && (
                    <div className="indicator-list">
                      <strong>What we noticed</strong>
                      {result.detected_indicators.map((indicator) => <span key={indicator}><TriangleAlert size={13} /> {indicator}</span>)}
                    </div>
                  )}
                  <div className="recommendation-box">
                    <strong><ShieldCheck size={15} /> Safer next steps</strong>
                    <ul>{result.recommendations.slice(0, 3).map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul>
                  </div>
                  <div className="result-bottom">
                    <span><BadgeCheck size={14} /> Status: {result.verification_status.replaceAll("_", " ")}</span>
                    <button type="button" onClick={() => { setReport({ ...report, description: content }); setReportOpen(true); }}>Create incident report <ArrowRight size={13} /></button>
                  </div>
                  <p className="result-disclaimer">This score is a preliminary heuristic, not a probability or proof. No known indicators does not mean safe.</p>
                </div>
              )}
            </section>

            <aside className="right-column">
              <section className="safety-card" id="safety">
                <div className="safety-top"><span className="safety-badge"><Shield size={15} /> SAFETY CHECK</span><span className="safety-graphic"><ShieldCheck size={36} /></span></div>
                <h3>Pause. Verify.<br />Then decide.</h3>
                <p>A few seconds of checking can help protect your money and personal information.</p>
                <div className="safety-tip"><span>01</span><div><strong>Never share a code</strong><small>Keep PINs, passwords, and OTPs private.</small></div></div>
                <div className="safety-tip"><span>02</span><div><strong>Verify independently</strong><small>Use official contact details you find yourself.</small></div></div>
                <a className="safety-link" href="#reporting">More safety guidance <ArrowRight size={14} /></a>
              </section>
              <section className="signals-card">
                <div className="signals-heading"><span><span className="live-dot" /> COMMON RED FLAGS</span><CircleHelp size={15} /></div>
                <div className="signal"><span className="signal-marker red-marker" /><span>Guaranteed or unusually high returns</span></div>
                <div className="signal"><span className="signal-marker amber-marker" /><span>Pressure to act right away</span></div>
                <div className="signal"><span className="signal-marker blue-marker" /><span>Requests for upfront fees or codes</span></div>
                <div className="signals-foot">Scammers adapt. One signal alone isn&apos;t proof.</div>
              </section>
            </aside>
          </div>

          <section className="history-card" id="history">
            <div className="history-heading"><div><div className="section-title-icon"><Clock3 size={17} /></div><div><h2>Recent scan history</h2><p>{user ? "Your latest saved checks" : "Saved only in this browser"}</p></div></div><div className="history-actions">{!user && localHistory.length > 0 && <button type="button" onClick={clearLocalHistory}>Clear local history</button>}<a href="#scanner">New scan <ArrowRight size={14} /></a></div></div>
            {displayedHistory.length ? (
              <div className="history-table">
                {displayedHistory.slice(0, 5).map((item) => (
                  <div className="history-row" key={item.id}>
                    <span className="history-type-icon">{item.input_type === "website" ? <Globe2 size={16} /> : item.input_type === "payment" ? <WalletCards size={16} /> : <MessageSquareText size={16} />}</span>
                    <div className="history-summary"><strong>{item.submitted_content.slice(0, 72) || "Screenshot analysis"}{item.submitted_content.length > 72 ? "…" : ""}</strong><span>{item.input_type} · {formatDate(item.created_at)}</span></div>
                    <RiskBadge level={item.risk_level} /><span className="history-score">{item.risk_score}/100</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-history"><div><History size={20} /></div><strong>Your recent scans will appear here</strong><span>{user ? "Run your first scan and it will be saved here." : "Run a scan to save it on this device. Sign in to keep history with your account."}</span></div>
            )}
          </section>

          <section className="reporting-strip" id="reporting">
            <div className="reporting-icon"><ShieldAlert size={20} /></div>
            <div><strong>Already sent money or shared information?</strong><span>Contact your bank or payment provider promptly using its official app or phone number.</span></div>
            <button onClick={() => { setReport({ ...report, description: content }); setReportOpen(true); }}>Create a report <ArrowRight size={15} /></button>
          </section>

          <footer className="page-footer"><span>© {new Date().getFullYear()} SAFEPAI Lite <i /> Built to help you stay informed</span><span><LockKeyhole size={12} /> Risk scores are preliminary and not proof of fraud</span></footer>
        </div>
      </main>

      {authOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={18} /></button>
            <div className="modal-mark"><ShieldCheck size={22} /></div>
            <h2 id="auth-title">{authMode === "signin" ? "Welcome back" : "Create your account"}</h2>
            <p>Sign in securely to save your scan history and submit community reports.</p>
            {!supabase ? (
              <div className="notice">Supabase isn’t configured yet. Add the project URL and publishable key to your environment to enable accounts.</div>
            ) : (
              <form className="modal-form" onSubmit={handleAuth}>
                {authMode === "signup" && <label>Full name<input name="name" required maxLength={100} autoComplete="name" /></label>}
                <label>Email address<input name="email" required type="email" autoComplete="email" /></label>
                <label>Password<input name="password" required type="password" minLength={8} autoComplete={authMode === "signin" ? "current-password" : "new-password"} /></label>
                <button className="button button-primary" disabled={authBusy}>{authBusy ? "Please wait..." : authMode === "signin" ? "Sign in" : "Create account"}</button>
              </form>
            )}
            {authError && <div className="notice auth-error" role="alert">{authError}</div>}
            {supabase && <button className="modal-switch" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); }}>{authMode === "signin" ? "New to SAFEPAI? Create an account" : "Already have an account? Sign in"}</button>}
          </section>
        </div>
      )}

      {reportOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportOpen(false); }}>
          <section className="modal-card report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <button className="modal-close" onClick={() => setReportOpen(false)} aria-label="Close"><X size={18} /></button>
            <div className="modal-mark amber-modal-mark"><FileText size={21} /></div>
            <h2 id="report-title">Create an incident report</h2>
            <p>Document what happened. You can download a PDF; nothing is sent to authorities automatically.</p>
            <form className="modal-form report-form" onSubmit={(event) => { void submitReport(event); }}>
              <div className="form-grid">
                <label>Incident type<select value={report.category} onChange={(event) => setReport({ ...report, category: event.target.value })}><option>Suspicious message</option><option>Investment offer</option><option>Payment request</option><option>Impersonation</option><option>Suspicious website</option><option>Other</option></select></label>
                <label>Date of incident<input type="date" value={report.date} onChange={(event) => setReport({ ...report, date: event.target.value })} required /></label>
              </div>
              <label>What happened?<textarea value={report.description} onChange={(event) => setReport({ ...report, description: event.target.value })} maxLength={4000} minLength={10} required placeholder="Describe the incident, including how contact was made..." /></label>
              <label>Payment details (optional)<input value={report.payment} onChange={(event) => setReport({ ...report, payment: event.target.value })} maxLength={500} placeholder="Amount, date, and payment method (do not enter card numbers or PINs)" /></label>
              <div className="form-grid">
                <label>Business name (optional)<input value={report.business} onChange={(event) => setReport({ ...report, business: event.target.value })} maxLength={120} placeholder="Name as shown in the offer" /></label>
                <label>Suspicious phone (optional)<input value={report.phone} onChange={(event) => setReport({ ...report, phone: event.target.value })} maxLength={40} placeholder="+234..." /></label>
              </div>
              <label>Website URL (optional)<input value={report.url} onChange={(event) => setReport({ ...report, url: event.target.value })} maxLength={2048} placeholder="https://..." /></label>
              <label>Supporting evidence (optional)<textarea value={report.evidence} onChange={(event) => setReport({ ...report, evidence: event.target.value })} maxLength={2000} placeholder="Describe messages, receipts, or other evidence you have kept safely." /></label>
              <div className="report-caution"><TriangleAlert size={15} /><span>Reports are submitted as <strong>unverified</strong>. Do not include passwords, PINs, or one-time codes.</span></div>
              <div className="modal-actions">
                {result && <button className="button button-outline" type="button" onClick={() => downloadReport(result, report)}><ArrowDownToLine size={16} /> Download PDF</button>}
                <button
                  className="button button-primary"
                  type={user ? "submit" : "button"}
                  onClick={!user ? () => { setReportOpen(false); setAuthOpen(true); } : undefined}
                  disabled={reportBusy}
                >
                  {reportBusy ? "Submitting..." : user ? "Submit community report" : "Sign in to submit"}<ArrowRight size={15} />
                </button>
              </div>
              {!user && <span className="report-signin-note">You can download the PDF now. Sign in is required to submit a community report.</span>}
              <button className="download-only" type="button" onClick={() => {
                const fallback: AnalysisResult = result ?? {
                  risk_score: 0, risk_level: "low", is_suspicious: false, detected_indicators: [],
                  explanation: "No scan assessment was attached to this report.", recommendations: ["Contact your financial institution using its official channel."],
                  confidence: "low", verification_status: "unverified", image_analysis_status: "not_requested", ai_used: false, provisional: true,
                };
                downloadReport(fallback, report);
              }}><ArrowDownToLine size={14} /> Download report PDF without scan assessment</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
