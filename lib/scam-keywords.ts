export interface ScamKeywordRule {
  keyword: string;
  indicator: string;
  risk_points: number;
}

export const DEFAULT_SCAM_KEYWORDS: ScamKeywordRule[] = [
  { keyword: "guaranteed returns", indicator: "Guaranteed or risk-free return claims", risk_points: 24 },
  { keyword: "no risk", indicator: "Guaranteed or risk-free return claims", risk_points: 24 },
  { keyword: "act fast", indicator: "Urgency or pressure tactics", risk_points: 15 },
  { keyword: "limited slots", indicator: "Urgency or pressure tactics", risk_points: 15 },
  {
    keyword: "share your otp",
    indicator: "Request for sensitive authentication information",
    risk_points: 30,
  },
  {
    keyword: "send your pin",
    indicator: "Request for sensitive authentication information",
    risk_points: 30,
  },
  {
    keyword: "pay an activation fee",
    indicator: "Upfront activation fee requested before a promised benefit",
    risk_points: 18,
  },
  {
    keyword: "pay a withdrawal fee",
    indicator: "Fee requested to access funds",
    risk_points: 20,
  },
  {
    keyword: "account will be suspended",
    indicator: "Threat of account suspension used to prompt action",
    risk_points: 18,
  },
];

export function detectScamKeywords(
  content: string,
  rules: ScamKeywordRule[],
  existingIndicators: string[] = [],
): { score: number; indicators: string[] } {
  const normalizedContent = normalize(content);
  const detectedCategories = new Set(existingIndicators);
  const matchedKeywords = new Set<string>();
  const indicators: string[] = [];
  let score = 0;

  for (const rule of rules) {
    const keyword = normalize(rule.keyword);
    if (!keyword || matchedKeywords.has(keyword) || !` ${normalizedContent} `.includes(` ${keyword} `)) {
      continue;
    }

    matchedKeywords.add(keyword);
    indicators.push(`Keyword match: "${rule.keyword}" — ${rule.indicator}`);
    if (!detectedCategories.has(rule.indicator)) {
      detectedCategories.add(rule.indicator);
      score += rule.risk_points;
    }
  }

  return { score, indicators };
}

function normalize(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
