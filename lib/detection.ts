import type { AnalysisResult, InputType } from "@/lib/analysis";
import { riskLevelFor } from "@/lib/analysis";
import { findPublicSourceNotices } from "@/lib/public-source-notices";

const rules: Array<{ pattern: RegExp; indicator: string; points: number }> = [
  { pattern: /\b(guaranteed|risk[- ]free|no risk|100%\s*(?:profit|return))\b/i, indicator: "Guaranteed or risk-free return claims", points: 24 },
  { pattern: /\b(double|triple)\s+(?:your\s+)?(?:money|investment)\b/i, indicator: "Promises to rapidly multiply money", points: 24 },
  { pattern: /\b(?:\d{2,})\s*%\s*(?:daily|weekly|monthly|every\s+(?:day|week|month)|returns?|profits?)\b/i, indicator: "Unusually high or frequent investment returns", points: 28 },
  { pattern: /\b(act now|urgent|immediately|last chance|limited time|within \d+ hours)\b/i, indicator: "Urgency or pressure tactics", points: 15 },
  { pattern: /\b(secret|keep this private|don't tell|do not tell|exclusive access)\b/i, indicator: "Secrecy or exclusivity pressure", points: 13 },
  { pattern: /\b(otp|one[- ]time password|pin|password|seed phrase|recovery phrase)\b/i, indicator: "Request for sensitive authentication information", points: 30 },
  { pattern: /\b(pay|send|transfer)\b.{0,50}\b(crypto|bitcoin|gift card|mobile money|wallet)\b/i, indicator: "Payment requested through a difficult-to-reverse method", points: 22 },
  { pattern: /\b(fee|tax|unlock|release)\b.{0,40}\b(withdraw|prize|funds|account)\b/i, indicator: "Advance fee requested to release money or a prize", points: 24 },
  { pattern: /\b(guaranteed job|visa guaranteed|grant approved|you have won|claim your prize)\b/i, indicator: "Unexpected prize, grant, job, or visa claim", points: 18 },
  { pattern: /\b(bank|police|government|support team|customer care)\b.{0,45}\b(account|verify|suspend|blocked|urgent)\b/i, indicator: "Possible institutional impersonation", points: 14 },
];

export interface Detection {
  score: number;
  indicators: string[];
  ambiguous: boolean;
}

function urlIndicators(content: string): string[] {
  const found: string[] = [];
  const candidates = content.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate.replace(/[),.;!?]+$/, ""));
      const host = url.hostname.toLowerCase();
      const labels = host.split(".");
      if (url.protocol !== "https:") found.push("Website link does not use HTTPS");
      if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) found.push("Website uses a raw IP address");
      if (labels.length >= 4) found.push("Website has an unusually deep subdomain");
      if (host.includes("xn--")) found.push("Website contains an internationalized hostname");
      if (["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "is.gd"].includes(host)) {
        found.push("Website uses a shortened link that hides its destination");
      }
      if (url.username || url.password) found.push("Website URL contains misleading embedded credentials");
    } catch {
      found.push("A provided website address could not be parsed");
    }
  }
  return found;
}

export function detectIndicators(content: string, inputType: InputType): Detection {
  const indicators = new Set<string>();
  let score = 0;
  const publicNotices = findPublicSourceNotices(content);
  for (const rule of rules) {
    if (rule.pattern.test(content)) {
      indicators.add(rule.indicator);
      score += rule.points;
    }
  }
  for (const indicator of urlIndicators(content)) {
    indicators.add(indicator);
    score +=
      indicator === "Website uses a shortened link that hides its destination"
        ? 30
        : indicator === "Website link does not use HTTPS"
          ? 14
          : 16;
  }
  for (const notice of publicNotices) {
    indicators.add(`${notice.authority} notice: ${notice.name} — ${notice.summary}`);
    score += 35;
  }
  if (inputType === "investment" && !/\b(regulat|license|prospectus|risk disclosure)\b/i.test(content)) {
    indicators.add("Investment offer does not mention independent regulation or risk disclosure");
    score += 12;
  }
  if (inputType === "payment" && /\b(?:account|wallet|number)\s*[:#-]?\s*[\w-]{6,}\b/i.test(content)) {
    indicators.add("Payment destination details are present but not independently verified");
    score += 8;
  }
  if (!indicators.size && content.trim().length < 40) {
    indicators.add("Not enough context was provided for a reliable assessment");
  }
  const finalScore = Math.min(100, score);
  return {
    score: finalScore,
    indicators: [...indicators].slice(0, 10),
    ambiguous:
      content.trim().length < 30 ||
      (!indicators.size && ["website", "investment", "payment"].includes(inputType)),
  };
}

export function provisionalResult(score: number, indicators: string[], inputType: InputType): AnalysisResult {
  const level = riskLevelFor(score);
  const recommendations = [
    "Pause before sending money or sharing personal information.",
    "Verify the person or organisation using contact details from an independent official source.",
    "Never share a PIN, password, one-time code, or recovery phrase.",
  ];
  if (inputType === "payment") recommendations.unshift("Confirm payment details directly with the intended recipient using a trusted channel.");
  if (inputType === "website") recommendations.unshift("Do not enter passwords or payment details until the website and domain are independently verified.");
  return {
    risk_score: score,
    risk_level: level,
    is_suspicious: score >= 30,
    detected_indicators: indicators,
    explanation:
      indicators.length > 0
        ? "This preliminary assessment is based on automated warning-sign checks. It is not proof of fraud and does not establish that a person or business acted unlawfully."
        : "No known warning signs were detected in the limited information provided. This does not mean the message, offer, payment request, or website is safe.",
    recommendations: [...new Set(recommendations)],
    confidence: score >= 60 ? "medium" : "low",
    verification_status: "unverified",
    image_analysis_status: "not_requested",
    public_sources: [],
    ai_used: false,
    provisional: true,
  };
}
