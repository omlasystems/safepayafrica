export type InputType = "message" | "website" | "investment" | "payment";
export type RiskLevel = "low" | "moderate" | "high" | "very_high";
export type Confidence = "low" | "medium" | "high";
export type VerificationStatus = "unverified" | "evidence_supported" | "independently_verified";
export type ImageAnalysisStatus = "not_requested" | "analyzed" | "not_analyzed";

export interface PublicSourceReference {
  entity_name: string;
  authority: string;
  title: string;
  published_at: string;
  summary: string;
  source_url: string;
}

export interface AnalysisResult {
  risk_score: number;
  risk_level: RiskLevel;
  is_suspicious: boolean;
  detected_indicators: string[];
  explanation: string;
  recommendations: string[];
  confidence: Confidence;
  verification_status: VerificationStatus;
  image_analysis_status: ImageAnalysisStatus;
  public_sources: PublicSourceReference[];
  ai_used: boolean;
  provisional: boolean;
}

export function riskLevelFor(score: number): RiskLevel {
  if (score >= 80) return "very_high";
  if (score >= 60) return "high";
  if (score >= 30) return "moderate";
  return "low";
}

export function isAnalysisResult(value: unknown): value is Omit<AnalysisResult, "ai_used" | "provisional"> {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result.risk_score === "number" &&
    Number.isFinite(result.risk_score) &&
    typeof result.is_suspicious === "boolean" &&
    Array.isArray(result.detected_indicators) &&
    result.detected_indicators.every((item) => typeof item === "string") &&
    typeof result.explanation === "string" &&
    Array.isArray(result.recommendations) &&
    result.recommendations.every((item) => typeof item === "string") &&
    ["low", "moderate", "high", "very_high"].includes(String(result.risk_level)) &&
    ["low", "medium", "high"].includes(String(result.confidence)) &&
    ["unverified", "evidence_supported", "independently_verified"].includes(
      String(result.verification_status),
    )
  );
}
