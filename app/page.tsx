import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  Globe2,
  LockKeyhole,
  MessageSquareText,
  ScanSearch,
  Shield,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const checks = [
  { icon: MessageSquareText, title: "Messages", detail: "SMS, WhatsApp, and email" },
  { icon: Globe2, title: "Websites", detail: "Links and suspicious domains" },
  { icon: ScanSearch, title: "Investments", detail: "Offers and return promises" },
  { icon: WalletCards, title: "Payments", detail: "Requests and payment instructions" },
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="SAFEPAI home">
          <span className="landing-brand-mark"><ShieldCheck size={21} strokeWidth={2.2} /></span>
          <span>safe<span>pai</span><small>LITE</small></span>
        </Link>
        <nav className="landing-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#what-we-check">What we check</a>
          <a href="#your-privacy">Your privacy</a>
        </nav>
        <div className="landing-nav-actions">
          <Link className="landing-signin" href="/dashboard?auth=signin">Sign in</Link>
          <Link className="landing-nav-cta" href="/dashboard?auth=signup">Create free account <ArrowRight size={15} /></Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="hero-kicker"><span /> A little more confidence, before you click</div>
          <h1>Pause the pressure.<br /><span>Check before</span> you pay.</h1>
          <p className="hero-description">
            Get a clearer view of suspicious messages, websites, investment offers, and payment requests—with practical next steps to help you stay in control.
          </p>
          <div className="hero-actions">
            <Link className="landing-primary-button" href="/dashboard#scanner">Check something suspicious <ArrowRight size={17} /></Link>
            <a className="landing-secondary-button" href="#how-it-works"><span><ArrowDown size={15} /></span> See how it works</a>
          </div>
          <div className="hero-assurance">
            <span><Check size={14} /> Free to use</span>
            <span><Check size={14} /> No account needed to scan</span>
            <span><LockKeyhole size={13} /> Private by design</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Example SAFEPAI scam check">
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="floating-note note-top"><span><ShieldCheck size={16} /></span><div><strong>Take a moment</strong><small>Check before you act</small></div></div>
          <div className="preview-card">
            <div className="preview-topline"><span className="preview-brand-icon"><Shield size={15} /></span><span>SAFEPAI CHECK</span><span className="preview-dots">•••</span></div>
            <div className="preview-label">INVESTMENT OFFER <span>JUST NOW</span></div>
            <div className="preview-message">“Guaranteed 30% returns every day. Double your investment in one week!”</div>
            <div className="preview-divider" />
            <div className="preview-result">
              <span className="preview-warning"><Shield size={18} /></span>
              <div><strong>Pause — warning signs found</strong><small>Preliminary check · Not proof of fraud</small></div>
              <span className="preview-score">82<small>/100</small></span>
            </div>
            <div className="preview-progress"><span /></div>
            <div className="preview-reason"><span>!</span> Guaranteed and unusually high returns</div>
            <div className="preview-tip"><span><BadgeCheck size={15} /></span><p><strong>Safer next step</strong> Verify independently before sending money.</p><ChevronRight size={16} /></div>
          </div>
          <div className="floating-note note-bottom"><span><LockKeyhole size={15} /></span><div><strong>Your check stays yours</strong><small>Scan without signing in</small></div></div>
          <div className="hero-visual-caption"><span className="caption-dot" /> A quick check. A calmer next step.</div>
        </div>
      </section>

      <section className="landing-trust-strip" aria-label="SAFEPAI principles">
        <div><span className="trust-icon"><ScanSearch size={18} /></span><p><strong>Rules first</strong><small>Clear warning signs, explained</small></p></div>
        <div><span className="trust-icon"><ShieldCheck size={18} /></span><p><strong>Honest by design</strong><small>Preliminary checks, never guarantees</small></p></div>
        <div><span className="trust-icon"><LockKeyhole size={17} /></span><p><strong>Your choice, always</strong><small>No payments or actions on your behalf</small></p></div>
      </section>

      <section className="landing-checks section-wrap" id="what-we-check">
        <div className="section-intro">
          <span className="landing-eyebrow">ONE PLACE TO CHECK</span>
          <h2>When something feels off,<br />start with a second look.</h2>
          <p>Paste a message or link, or describe the offer. SAFEPAI looks for common warning signs and suggests safer next steps.</p>
        </div>
        <div className="check-grid">
          {checks.map(({ icon: Icon, title, detail }, index) => (
            <article className="check-card" key={title}>
              <span className={`check-card-icon check-icon-${index}`}><Icon size={20} /></span>
              <h3>{title}</h3><p>{detail}</p><span className="check-arrow"><ArrowRight size={16} /></span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-process" id="how-it-works">
        <div className="process-inner">
          <div className="section-intro">
            <span className="landing-eyebrow">A SIMPLE CHECK</span>
            <h2>Three steps.<br />No pressure.</h2>
            <p>Use a quick check to help you think through what to do next—not to make a decision for you.</p>
            <Link className="landing-text-link" href="/dashboard#scanner">Try a check now <ArrowRight size={15} /></Link>
          </div>
          <div className="steps-list">
            <article className="step-card"><span>01</span><div><h3>Bring what made you pause</h3><p>Paste a message, website, investment pitch, or payment request. You can scan without creating an account.</p></div><MessageSquareText size={20} /></article>
            <article className="step-card"><span>02</span><div><h3>Review the warning signs</h3><p>See a preliminary risk assessment with the signals that stood out and why they matter.</p></div><ScanSearch size={20} /></article>
            <article className="step-card"><span>03</span><div><h3>Choose a safer next step</h3><p>Take time to verify through an independent, official channel before sharing money or information.</p></div><ShieldCheck size={20} /></article>
          </div>
        </div>
      </section>

      <section className="landing-privacy section-wrap" id="your-privacy">
        <div className="privacy-art"><div className="privacy-ring"><ShieldCheck size={48} /></div><span className="privacy-check"><Check size={14} /></span><span className="privacy-spark spark-a">✳</span><span className="privacy-spark spark-b">✳</span></div>
        <div className="privacy-copy"><span className="landing-eyebrow">YOUR INFORMATION MATTERS</span><h2>Useful checks.<br /><span>No false promises.</span></h2><p>SAFEPAI does not block payments, verify account ownership, or decide whether someone committed fraud. Risk scores are preliminary signals—not probabilities or proof.</p><div className="privacy-points"><span><Check size={15} /> Scan without an account</span><span><Check size={15} /> Your recent checks stay in your browser</span><span><Check size={15} /> Reports are private and marked unverified</span></div></div>
      </section>

      <section className="landing-cta">
        <div className="cta-pattern" />
        <span className="cta-icon"><CircleHelp size={22} /></span>
        <h2>Not sure about that message?</h2>
        <p>Take a breath, run a quick check, and decide with a little more context.</p>
        <Link className="cta-button" href="/dashboard#scanner">Check it with SAFEPAI <ArrowRight size={16} /></Link>
        <small>No sign-up needed to get started</small>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand footer-brand" href="/" aria-label="SAFEPAI home"><span className="landing-brand-mark"><ShieldCheck size={19} /></span><span>safe<span>pai</span><small>LITE</small></span></Link>
        <span>© {new Date().getFullYear()} SAFEPAI Lite · A second look, before you act.</span>
        <Link href="/dashboard#reporting"><FileText size={14} /> Report a scam</Link>
      </footer>
    </main>
  );
}
