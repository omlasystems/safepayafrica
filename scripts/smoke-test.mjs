import assert from "node:assert/strict";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";

async function analyze(body) {
  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  return { response, result: await response.json() };
}

function assertRiskBand(result) {
  assert.ok(Number.isInteger(result.risk_score) && result.risk_score >= 0 && result.risk_score <= 100);
  const expected =
    result.risk_score < 30 ? "low" :
      result.risk_score < 60 ? "moderate" :
        result.risk_score < 80 ? "high" : "very_high";
  assert.equal(result.risk_level, expected);
}

const investment = await analyze({
  inputType: "investment",
  content: "Guaranteed 30% returns every day and double your investment in one week.",
});
assert.equal(investment.response.status, 200);
assertRiskBand(investment.result);
assert.ok(investment.result.detected_indicators.some((item) => /guaranteed|return/i.test(item)));
assert.ok(investment.result.detected_indicators.some((item) => /multiply money/i.test(item)));
console.log("PASS guaranteed rapid investment returns");

const urgency = await analyze({
  inputType: "message",
  content: "URGENT! Your account will be blocked. Send your OTP immediately to verify your bank account.",
});
assert.equal(urgency.response.status, 200);
assertRiskBand(urgency.result);
assert.ok(urgency.result.detected_indicators.some((item) => /urgency|pressure/i.test(item)));
assert.ok(urgency.result.detected_indicators.some((item) => /authentication/i.test(item)));
console.log("PASS urgency and OTP request");

const keywordMatch = await analyze({
  inputType: "message",
  content: "Only limited slots remain. Act fast to claim your investment place.",
});
assert.equal(keywordMatch.response.status, 200);
assertRiskBand(keywordMatch.result);
assert.ok(keywordMatch.result.detected_indicators.some((item) => /Keyword match: "limited slots"/i.test(item)));
assert.ok(keywordMatch.result.detected_indicators.some((item) => /Keyword match: "act fast"/i.test(item)));
console.log("PASS stored scam keyword phrases are detected in text");

const harmless = await analyze({
  inputType: "message",
  content: "Your package will arrive on Tuesday. Please let me know if you are home after 3 pm.",
});
assert.equal(harmless.response.status, 200);
assertRiskBand(harmless.result);
assert.equal(harmless.result.ai_used, false);
assert.equal(harmless.result.provisional, true);
assert.equal(harmless.result.detected_indicators.length, 0);
console.log("PASS harmless message uses provisional rules-only result");

const shortenedUrl = await analyze({ inputType: "website", content: "https://bit.ly/claim-your-prize" });
assert.equal(shortenedUrl.response.status, 200);
assertRiskBand(shortenedUrl.result);
assert.ok(shortenedUrl.result.detected_indicators.some((item) => /shortened link/i.test(item)));
console.log("PASS shortened URL warning");

const officialNotice = await analyze({
  inputType: "investment",
  content: "I am considering an Ovaioza Farm Produce Storage investment.",
});
assert.equal(officialNotice.response.status, 200);
assertRiskBand(officialNotice.result);
assert.ok(officialNotice.result.public_sources.some((source) => /sec/i.test(source.authority)));
assert.ok(officialNotice.result.public_sources[0].source_url.startsWith("https://sec.gov.ng/"));
assert.equal(officialNotice.result.verification_status, "unverified");
console.log("PASS matched official SEC notice is source-linked and remains unverified");

const chinmarkOffer = await analyze({
  inputType: "investment",
  content: "Chinmark Group investment opportunity: contact this agent for returns.",
});
assert.equal(chinmarkOffer.response.status, 200);
assertRiskBand(chinmarkOffer.result);
assert.ok(chinmarkOffer.result.public_sources.some((source) => /Nigeria Police Force/.test(source.authority)));
assert.ok(chinmarkOffer.result.public_sources.some((source) => source.source_url.includes("dailypost.ng/2023/04/12/")));
assert.ok(chinmarkOffer.result.detected_indicators.some((item) => /wanted notice|allegation/i.test(item)));
assert.equal(chinmarkOffer.result.verification_status, "unverified");
console.log("PASS Chinmark police notice is attributed, qualified, and remains unverified");

const sidonOffer = await analyze({
  inputType: "investment",
  content: "Sidon Farms Limited offers guaranteed 30% returns every month.",
});
assert.equal(sidonOffer.response.status, 200);
assertRiskBand(sidonOffer.result);
assert.equal(sidonOffer.result.public_sources.length, 0);
assert.ok(sidonOffer.result.detected_indicators.some((item) => /guaranteed|return/i.test(item)));
assert.ok(sidonOffer.result.detected_indicators.some((item) => /high or frequent investment returns/i.test(item)));
assert.equal(sidonOffer.result.verification_status, "unverified");
console.log("PASS Sidon offer gets content-based warnings, not an unsupported company allegation");

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/r9sAAAAASUVORK5CYII=";
const image = await analyze({
  inputType: "message",
  content: "Screenshot upload",
  image: { data: png, mimeType: "image/png", name: "test.png" },
});
assert.equal(image.response.status, 200);
assert.equal(image.result.ai_used, false, "Run this test against a server without AI credentials.");
assert.equal(image.result.provisional, true);
assert.equal(image.result.image_analysis_status, "not_analyzed");
assert.deepEqual(image.result.public_sources, []);
assert.match(image.result.explanation, /Image not visually analyzed/i);
assert.match(image.result.explanation, /cannot indicate whether the screenshot is safe/i);
console.log("PASS screenshot explicitly not visually analyzed without AI");

const invalidInput = await analyze({ inputType: "unknown", content: "some content" });
assert.equal(invalidInput.response.status, 400);
assert.match(invalidInput.result.error, /valid scan type/i);
console.log("PASS invalid input returns a clear 400 error");
