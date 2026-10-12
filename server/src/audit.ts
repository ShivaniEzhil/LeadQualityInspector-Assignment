
export type Lead = Record<string, string>;

export type AuditIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
  deduction: number;
};

export type AuditedLead = {
  original: Lead;
  normalized: Lead;
  score: number;
  issues: AuditIssue[];
  duplicate: boolean;
  duplicateOf: number | null;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getField(lead: Lead, ...names: string[]): string {
  const key = Object.keys(lead).find((candidate) =>
    names.includes(
      candidate.trim().toLowerCase().replace(/[\s_-]+/g, "")
    )
  );

  return key ? String(lead[key] ?? "").trim() : "";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validWebsite(value: string): boolean {
  if (!value) return true;

  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );

    return (
      url.hostname.includes(".") &&
      !url.hostname.startsWith(".") &&
      !url.hostname.endsWith(".")
    );
  } catch {
    return false;
  }
}

function domainKey(value: string): string {
  if (!value) return "";

  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );

    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function auditLeads(rows: Lead[]): AuditedLead[] {
  const seenNames = new Map<string, number>();
  const seenDomains = new Map<string, number>();

  return rows.map((original, index) => {
    const normalized: Lead = Object.fromEntries(
      Object.entries(original).map(([key, value]) => [
        key.trim(),
        String(value ?? "").trim()
      ])
    );

    const company = getField(
      normalized,
      "company",
      "companyname",
      "name"
    );

    const industry = getField(normalized, "industry");

    const website = getField(
      normalized,
      "website",
      "domain",
      "companydomain"
    );

    const email = getField(
      normalized,
      "email",
      "emailaddress",
      "businessemail"
    );

    const issues: AuditIssue[] = [];

    if (!company) {
      issues.push({
        code: "MISSING_COMPANY",
        message: "Company name is missing",
        severity: "error",
        deduction: 30
      });
    }

    if (!industry) {
      issues.push({
        code: "MISSING_INDUSTRY",
        message: "Industry is missing",
        severity: "warning",
        deduction: 15
      });
    }

    if (!website) {
      issues.push({
        code: "MISSING_WEBSITE",
        message: "Website is missing",
        severity: "warning",
        deduction: 10
      });
    } else if (!validWebsite(website)) {
      issues.push({
        code: "INVALID_WEBSITE",
        message: "Website URL is malformed",
        severity: "error",
        deduction: 10
      });
    }

    if (email && !validEmail(email)) {
      issues.push({
        code: "INVALID_EMAIL",
        message: "Email address format is invalid",
        severity: "error",
        deduction: 10
      });
    }

    const nameKey = normalizeKey(company);
    const websiteKey = domainKey(website);

    const nameDuplicate = nameKey
      ? seenNames.get(nameKey)
      : undefined;

    const domainDuplicate = websiteKey
      ? seenDomains.get(websiteKey)
      : undefined;

    const previousIndex =
      nameDuplicate !== undefined
        ? nameDuplicate
        : domainDuplicate;

    const duplicate = previousIndex !== undefined;

    if (duplicate) {
      issues.push({
        code: "DUPLICATE_COMPANY",
        message: `Possible duplicate of row ${previousIndex + 1}`,
        severity: "warning",
        deduction: 20
      });
    } else {
      if (nameKey) seenNames.set(nameKey, index);
      if (websiteKey) seenDomains.set(websiteKey, index);
    }

    const score = Math.max(
      0,
      100 - issues.reduce((total, issue) => total + issue.deduction, 0)
    );

    return {
      original,
      normalized,
      score,
      issues,
      duplicate,
      duplicateOf: duplicate ? previousIndex! + 1 : null
    };
  });
}
