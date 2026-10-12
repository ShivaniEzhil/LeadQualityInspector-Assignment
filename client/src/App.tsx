

import { useMemo, useState } from "react";

import {

  Activity,

  AlertCircle,

  ArrowDownToLine,

  CheckCircle2,

  ChevronDown,

  FileSpreadsheet,

  LayoutDashboard,

  Search,

  ShieldCheck,

  Upload,

  Users,

  X

} from "lucide-react";

import "./App.css";

type AuditIssue = {

  code: string;

  message: string;

  severity: "error" | "warning";

  deduction: number;

};

function getFixSuggestion(issue: AuditIssue): string {

  switch (issue.code) {

    case "MISSING_COMPANY":

      return "Add the official company name so the record can be identified.";

    case "MISSING_INDUSTRY":

      return "Add the company's industry using a reliable source.";

    case "MISSING_WEBSITE":

      return "Add the company's official website after verifying the domain.";

    case "INVALID_WEBSITE":

      return "Check the domain spelling and URL format. Confirm the website separately.";

    case "INVALID_EMAIL":

      return "Correct the email address format and verify the address before outreach.";

    case "DUPLICATE_COMPANY":

      return "Compare this record with the earlier row and confirm whether they represent the same company.";

    default:

      return "Review this record and correct the issue using a reliable source.";

  }

}

type AuditedLead = {

  original: Record<string, string>;

  normalized: Record<string, string>;

  score: number;

  issues: AuditIssue[];

  duplicate: boolean;

  duplicateOf: number | null;

};

type AuditResponse = {

  status: string;

  message?: string;

  summary: {

    totalLeads: number;

    averageScore: number;

    duplicateCount: number;

    leadsWithIssues: number;

    issueCount: number;

  };

  results: AuditedLead[];

};

function field(lead: AuditedLead, ...names: string[]) {

  const key = Object.keys(lead.normalized).find((candidate) =>

    names.includes(candidate.trim().toLowerCase().replace(/[\s\_-]+/g, ""))

  );

  return key ? lead.normalized[key] : "";

}

function downloadCsv(rows: Record<string, unknown>[]) {

  if (!rows.length) return;

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  const escapeCell = (value: unknown) => {

    const text = String(value ?? "");

    return /[",\r\n]/.test(text)

      ? `"${text.replace(/"/g, '""')}"`

      : text;

  };

  const csv = [

    headers.map(escapeCell).join(","),

    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))

  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {

    type: "text/csv;charset=utf-8;"

  });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;

  anchor.download = "lead-quality-results.csv";

  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

}

function downloadIssueReport(results: AuditedLead[]) {

  const rows = results.flatMap((lead, index) => {

    if (lead.issues.length === 0) return [];

    const company = field(lead, "company", "companyname", "name");

    return lead.issues.map((issue) => ({

      RowNumber: index + 1,

      Company: company || "Unnamed company",

      QualityScore: lead.score,

      IssueCode: issue.code,

      Issue: issue.message,

      Severity: issue.severity,

      PointsDeducted: issue.deduction,

      SuggestedFix: getFixSuggestion(issue),

      DuplicateOf: issue.code === "DUPLICATE_COMPANY"

        ? lead.duplicateOf ?? ""

        : ""

    }));

  });

  if (rows.length === 0) {

    alert("No issues found. There is nothing to export.");

    return;

  }

  const headers = Object.keys(rows[0]);

  const escapeCell = (value: unknown) => {

    const text = String(value ?? "");

    return /[",\r\n]/.test(text)

      ? `"${text.replace(/"/g, '""')}"`

      : text;

  };

  const csv = [

    headers.map(escapeCell).join(","),

    ...rows.map((row) =>

      headers.map((header) => escapeCell(row[header as keyof typeof row])).join(",")

    )

  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {

    type: "text/csv;charset=utf-8;"

  });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;

  anchor.download = "lead-quality-issue-report.csv";

  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

}

export default function App() {

  const [audit, setAudit] = useState<AuditResponse | null>(null);

  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  const [dragging, setDragging] = useState(false);

  async function runAudit(selectedFile: File | null = file) {

    if (!selectedFile) {

      setError("Choose a CSV file to begin.");

      return;

    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {

      setError("Please choose a CSV file.");

      return;

    }

    setFile(selectedFile);

    setLoading(true);

    setError("");

    try {

      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await fetch("https://leadqualityinspector-api.onrender.com/api/audit", {

        method: "POST",

        body: formData

      });

      const data = await response.json();

      if (!response.ok) {

        throw new Error(data.message || "Unable to audit this file.");

      }

      setAudit(data as AuditResponse);
      setSelectedRow(null);
      setSearch("");
      setFilter("all");

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Could not connect to the backend. Check that it is running."

      );

    } finally {

      setLoading(false);

    }

  }

  const visibleResults = useMemo(() => {

    if (!audit) return [];

    return audit.results

      .map((lead, index) => ({ ...lead, rowNumber: index + 1 }))

      .filter((lead) => {

        const company = field(lead, "company", "companyname", "name");

        const industry = field(lead, "industry");

        const matchesSearch = `${company} ${industry}`

          .toLowerCase()

          .includes(search.toLowerCase());

        const matchesFilter =

          filter === "all" ||

          (filter === "issues" && lead.issues.length > 0) ||

          (filter === "duplicates" && lead.duplicate) ||

          (filter === "clean" && lead.issues.length === 0);

        return matchesSearch && matchesFilter;

      });

  }, [audit, search, filter]);


  const chooseFile = (selected: File | undefined) => {
    if (!selected) return;

    setFile(selected);
    setAudit(null);
    setSelectedRow(null);
    setSearch("");
    setFilter("all");
    setError("");
  };


  return (

    <div className="app-shell">

      <aside className="sidebar">

        <a className="brand" href="#">

          <span className="brand-mark"><ShieldCheck size={23} /></span>

          <span>Lead<span className="brand-light">Inspect</span></span>

        </a>

        <div className="workspace-label">WORKSPACE</div>

        <button className="nav-item active">

          <LayoutDashboard size={18} /> Dashboard

        </button>

        <button className="nav-item" onClick={() => setFilter("all")}>

          <Users size={18} /> All leads

        </button>

        <button className="nav-item" onClick={() => setFilter("issues")}>

          <AlertCircle size={18} /> Data issues

        </button>

        <div className="sidebar-bottom">

          <div className="sidebar-status">

            <span className="status-dot" />

            <span>Audit engine ready</span>

          </div>

          <div className="sidebar-footer">LEAD QUALITY INSPECTOR<br />Version 1.0.0</div>

        </div>

      </aside>

      <main className="main-content">

        <header className="topbar">

          <div className="breadcrumb">Workspace <span>/</span> Dashboard</div>

          <div className="topbar-right">

            <span className="live-indicator"><span /> Local environment</span>

            <div className="avatar">LI</div>

          </div>

        </header>

        <section className="page-content">

          <div className="page-heading">

            <div>

              <div className="eyebrow">DATA OPERATIONS</div>

              <h1>Lead quality dashboard</h1>

              <p>Find incomplete records, fix formatting issues, and spot duplicates before outreach.</p>

            </div>

            <button

              className="button button-primary"

              onClick={() => document.getElementById("csv-file")?.click()}

            >

              <Upload size={17} /> Import CSV

            </button>

          </div>

          <div className="stats-grid">

            <StatCard

              icon={<FileSpreadsheet size={19} />}

              label="Total leads reviewed"

              value={audit ? audit.summary.totalLeads.toLocaleString() : "—"}

              note={audit ? "Records in latest audit" : "Upload a file to begin"}

              tone="blue"

            />

            <StatCard

              icon={<ShieldCheck size={19} />}

              label="Average quality score"

              value={audit ? `${audit.summary.averageScore}%` : "—"}

              note="Completeness and consistency"

              tone="green"

            />

            <StatCard

              icon={<Activity size={19} />}

              label="Records with issues"

              value={audit ? audit.summary.leadsWithIssues.toLocaleString() : "—"}

              note={audit ? `${audit.summary.issueCount} issues found` : "Validation findings"}

              tone="amber"

            />

            <StatCard

              icon={<Users size={19} />}

              label="Possible duplicates"

              value={audit ? audit.summary.duplicateCount.toLocaleString() : "—"}

              note="Matching name or website"

              tone="purple"

            />

          </div>

          <section className="panel upload-panel">

            <div className="panel-heading">

              <div>

                <h2>Inspect your lead data</h2>

                <p>Upload a CSV file to run automated quality checks.</p>

              </div>

              <span className="file-type">CSV · MAX 5 MB</span>

            </div>

            <div

              className={`dropzone ${dragging ? "dropzone-active" : ""}`}

              onDragOver={(event) => {

                event.preventDefault();

                setDragging(true);

              }}

              onDragLeave={() => setDragging(false)}

              onDrop={(event) => {

                event.preventDefault();

                setDragging(false);

                chooseFile(event.dataTransfer.files[0]);

              }}

            >

              <div className="upload-icon"><Upload size={23} /></div>

              <h3>Drop your CSV file here</h3>

              <p>or choose a file from your computer</p>

              <button

                className="button button-secondary"

                onClick={() => document.getElementById("csv-file")?.click()}

              >

                Browse files

              </button>

              <input

                id="csv-file"

                type="file"

                accept=".csv,text/csv"

                hidden

                onChange={(event) => chooseFile(event.target.files?.[0])}

              />

            </div>

            {file && (

              <div className="selected-file">

                <FileSpreadsheet size={19} />

                <div className="selected-file-info">

                  <strong>{file.name}</strong>

                  <span>{(file.size / 1024).toFixed(1)} KB</span>

                </div>

                <button

                  className="icon-button"

                  aria-label="Remove selected file"

                  onClick={() => setFile(null)}

                >

                  <X size={17} />

                </button>

              </div>

            )}

            {error && <div className="error-message"><AlertCircle size={17} />{error}</div>}

            <div className="upload-actions">

              <span className="privacy-note"><ShieldCheck size={15} /> Processed by your local backend</span>

              <button

                className="button button-primary"

                disabled={!file || loading}

                onClick={() => runAudit()}

              >

                {loading ? "Inspecting leads..." : "Run quality audit"}

                {!loading && <Activity size={17} />}

              </button>

            </div>

          </section>

          <section className="panel results-panel">

            <div className="panel-heading results-heading">

              <div>

                <h2>Audit results</h2>

                <p>{audit ? `${visibleResults.length} of ${audit.results.length} records shown` : "Your inspected records will appear here."}</p>

              </div>

              <div className="export-actions">
<button

                className="button button-secondary"

                disabled={!audit}

                onClick={() => {

                  if (!audit) return;

                  const rows = audit.results.map((lead) => ({

                    ...lead.normalized,

                    QualityScore: lead.score,

                    Duplicate: lead.duplicate ? "Yes" : "No",

                    DuplicateOf: lead.duplicateOf ?? "",

                    Issues: lead.issues.map((issue) => issue.message).join("; ")

                  }));

                  downloadCsv(rows);

                }}

              >

                <ArrowDownToLine size={17} /> Export results

              </button>

              <button

                className="button button-secondary"

                disabled={!audit}

                onClick={() => {

                  if (audit) downloadIssueReport(audit.results);

                }}

              >

                <AlertCircle size={17} />

                Export issue report

              </button>
</div>

            </div>

            <div className="table-toolbar">

              <label className="search-box">

                <Search size={17} />

                <input

                  value={search}

                  onChange={(event) => setSearch(event.target.value)}

                  placeholder="Search company or industry..."

                />

              </label>

              <label className="filter-select">

                <span>Filter</span>

                <select value={filter} onChange={(event) => setFilter(event.target.value)}>

                  <option value="all">All records</option>

                  <option value="issues">With issues</option>

                  <option value="duplicates">Duplicates</option>

                  <option value="clean">Clean records</option>

                </select>

                <ChevronDown size={14} />

              </label>

            </div>

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>COMPANY</th>

                    <th>INDUSTRY</th>

                    <th>WEBSITE</th>

                    <th>QUALITY SCORE</th>

                    <th>STATUS</th>

                    <th>ISSUES</th>

                  </tr>

                </thead>

                <tbody>

                  {!audit && (

                    <tr>

                      <td colSpan={6} className="empty-state">

                        <div className="empty-icon"><FileSpreadsheet size={24} /></div>

                        <strong>No audit results yet</strong>

                        <span>Upload a CSV file above to inspect your leads.</span>

                      </td>

                    </tr>

                  )}

                  {audit && visibleResults.map((lead) => {

                    const company = field(lead, "company", "companyname", "name") || "Unnamed company";

                    const industry = field(lead, "industry") || "Not provided";

                    const website = field(lead, "website", "domain", "companydomain") || "—";

                    return (

                      <tr

                        key={lead.rowNumber}

                        className="clickable-row"

                        onClick={() => setSelectedRow(lead.rowNumber)}

                      >

                        <td><strong className="company-name">{company}</strong><span className="row-caption">Row {lead.rowNumber}</span></td>

                        <td>{industry}</td>

                        <td className="website-cell">{website}</td>

                        <td>

                          <div className="score-cell">

                            <div className="score-track"><div className={`score-fill ${lead.score >= 80 ? "score-good" : lead.score >= 60 ? "score-medium" : "score-low"}`} style={{ width: `${lead.score}%` }} /></div>

                            <strong>{lead.score}</strong>

                          </div>

                        </td>

                        <td>

                          {lead.duplicate

                            ? <span className="status-pill status-duplicate">Duplicate</span>

                            : lead.issues.length

                              ? <span className="status-pill status-review">Needs review</span>

                              : <span className="status-pill status-clean"><CheckCircle2 size={13} /> Clean</span>}

                        </td>

                        <td>

                          {lead.issues.length

                            ? <span className="issue-count">{lead.issues.length} {lead.issues.length === 1 ? "issue" : "issues"}</span>

                            : <span className="no-issues">—</span>}

                        </td>

                      </tr>

                    );

                  })}

                  {audit && visibleResults.length === 0 && (

                    <tr><td colSpan={6} className="no-matches">No records match your search or filter.</td></tr>

                  )}

                </tbody>

              </table>

            </div>

            <div className="table-footer">

              <span>{audit ? `Showing ${visibleResults.length} records` : "Waiting for your first audit"}</span>

              {audit && <span><span className="status-dot" /> Audit completed</span>}

            </div>

          </section>

            {selectedRow !== null && audit && (() => {

              const lead = audit.results[selectedRow - 1];

              if (!lead) return null;

              const company = field(lead, "company", "companyname", "name");

              const industry = field(lead, "industry");

              const website = field(lead, "website", "domain", "companydomain");

              const email = field(lead, "email", "emailaddress", "businessemail");

              return (

                <section className="panel detail-panel">

                  <div className="detail-heading">

                    <div>

                      <div className="eyebrow">RECORD DETAILS · ROW {selectedRow}</div>

                      <h2>{company || "Unnamed company"}</h2>

                      <p>Review findings and recommended next steps for this lead.</p>

                    </div>

                    <button

                      className="icon-button detail-close"

                      aria-label="Close record details"

                      onClick={() => setSelectedRow(null)}

                    >

                      <X size={19} />

                    </button>

                  </div>

                  <div className="detail-fields">

                    <div>

                      <span>Industry</span>

                      <strong>{industry || "Not provided"}</strong>

                    </div>

                    <div>

                      <span>Website</span>

                      <strong>{website || "Not provided"}</strong>

                    </div>

                    <div>

                      <span>Email</span>

                      <strong>{email || "Not provided"}</strong>

                    </div>

                    <div>

                      <span>Quality score</span>

                      <strong>{lead.score}/100</strong>

                    </div>

                  </div>

                  <div className="issue-list-heading">

                    <h3>Quality findings</h3>

                    <span>

                      {lead.issues.length}{" "}

                      {lead.issues.length === 1 ? "issue" : "issues"}

                    </span>

                  </div>

                  {lead.issues.length === 0 ? (

                    <div className="detail-clean">

                      <CheckCircle2 size={19} />

                      No issues were detected by the current checks.

                    </div>

                  ) : (

                    <div className="issue-list">

                      {lead.issues.map((issue, index) => (

                        <div

                          className="issue-card"

                          key={`${issue.code}-${index}`}

                        >

                          <div className="issue-card-top">

                            <span

                              className={`severity-badge severity-${issue.severity}`}

                            >

                              {issue.severity}

                            </span>

                            <span className="deduction">

                              −{issue.deduction} points

                            </span>

                          </div>

                          <h4>{issue.message}</h4>

                          <p>{getFixSuggestion(issue)}</p>

                        </div>

                      ))}

                    </div>

                  )}

                  {lead.duplicate && (

                    <div className="duplicate-note">

                      <AlertCircle size={17} />

                      Possible duplicate of row {lead.duplicateOf}. Compare the

                      records before deleting either one.

                    </div>

                  )}

                  <p className="detail-disclaimer">

                    Suggestions are based on the uploaded data. Verify corrections

                    using reliable sources. A clean result does not guarantee that

                    a website or email address is active.

                  </p>

                </section>

              );

            })()}

          <footer className="page-footer">

            <span>Lead Quality Inspector</span>

            <span>Quality checks are format-based, not live verification.</span>

          </footer>

        </section>

      </main>

    </div>

  );

}

function StatCard({

  icon,

  label,

  value,

  note,

  tone

}: {

  icon: React.ReactNode;

  label: string;

  value: string;

  note: string;

  tone: string;

}) {

  return (

    <div className="stat-card">

      <div className={`stat-icon stat-${tone}`}>{icon}</div>

      <div className="stat-label">{label}</div>

      <div className="stat-value">{value}</div>

      <div className="stat-note">{note}</div>

    </div>

  );

}
