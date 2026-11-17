export interface PublicSourceNotice {
  name: string;
  aliases: string[];
  authority: string;
  title: string;
  publishedAt: string;
  summary: string;
  sourceUrl: string;
}

export const PUBLIC_SOURCE_NOTICES: PublicSourceNotice[] = [
  {
    name: "WAYVEPAY",
    aliases: ["wayvepay"],
    authority: "Nigeria Securities and Exchange Commission",
    title: "Suspected Fraudulent Activities of WayvePay",
    publishedAt: "2026-10-10",
    summary:
      "The SEC says WayvePay is not registered to solicit investments in Nigeria's capital market and advises the public not to invest with it in that market.",
    sourceUrl:
      "https://sec.gov.ng/for-investors/keep-track-of-circulars/suspected-fraudulent-activities-of-wayvepay/",
  },
  {
    name: "Ovaioza Farm Produce Storage Business",
    aliases: ["ovaioza", "ovaioza farm produce storage"],
    authority: "Nigeria Securities and Exchange Commission",
    title: "Known Investment Scams — Schedule of Illegal Operators Sealed Up",
    publishedAt: "2023-08-14",
    summary:
      "The SEC schedule lists Ovaioza Farm Produce Storage Business among operators it says were sealed up in Abuja in 2022. This dated notice does not establish that a current offer or contact is connected to that entity.",
    sourceUrl: "https://sec.gov.ng/for-investors/known-investment-scams/",
  },
  {
    name: "Chinmark Group CEO (Ijiomah Marksman Chinedu)",
    aliases: ["chinmark group", "ijiomah marksman chinedu", "marksman ijiomah"],
    authority: "Nigeria Police Force (reported by Daily Post Nigeria)",
    title: "Police declare Chinmark CEO wanted over alleged N480m fraud",
    publishedAt: "2023-04-12",
    summary:
      "Daily Post Nigeria reported that the Nigeria Police Force had declared Chinmark Group CEO Ijiomah Marksman Chinedu wanted over allegations involving N480 million, citing a special police gazette and a Lagos Magistrate Court arrest warrant. This reports allegations and a wanted notice, not a finding of guilt; the current case status is unknown.",
    sourceUrl:
      "https://dailypost.ng/2023/04/12/police-declare-chinmark-ceo-wanted-over-alleged-n480m-fraud/",
  },
];

export function findPublicSourceNotices(content: string): PublicSourceNotice[] {
  const normalizedContent = normalize(content);
  return PUBLIC_SOURCE_NOTICES.filter((notice) =>
    notice.aliases.some((alias) => {
      const normalizedAlias = normalize(alias);
      return ` ${normalizedContent} `.includes(` ${normalizedAlias} `);
    }),
  );
}

function normalize(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
