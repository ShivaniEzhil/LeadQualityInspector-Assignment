# LeadInspect — Lead Quality Inspector

## Overview

LeadInspect is a full-stack lead data quality auditing tool designed to help teams identify incomplete, inconsistent, and duplicate company records before using them for sales outreach or lead research.

Users can upload a CSV file, review quality scores and detected issues, inspect individual records, and export audit results or a detailed issue report.

The application evaluates data completeness and formatting. It does not determine whether a lead will convert or independently verify whether an email address or website is active.

## Features

- **CSV upload:** Upload CSV files through the dashboard using file selection or drag and drop.
- **Data quality scoring:** Assign each record a score out of 100 based on configured validation rules.
- **Missing-field detection:** Identify missing company names, industries, and websites.
- **Format validation:** Detect incorrectly formatted website URLs and email addresses.
- **Duplicate detection:** Flag potential duplicates based on normalized company names or website domains.
- **Record inspection:** View individual lead details, detected issues, score deductions, and suggested corrections.
- **Search and filtering:** Search records and filter by issues, duplicates, or clean records.
- **CSV exports:** Export audited results and a separate report containing detected issues and suggested fixes.
- **Input validation:** Reject empty files, missing required headers, malformed CSV files, and files larger than 5 MB.
- **Responsive dashboard:** Review audit results through a dashboard designed for different screen sizes.

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- CSS
- Lucide React icons

### Backend
- Node.js
- Express
- TypeScript
- Multer for multipart file uploads
- Papa Parse for CSV parsing

## Architecture

The application uses a frontend/backend architecture.

1. The React frontend accepts a CSV file and sends it to the backend through an HTTP POST request.
2. The Express backend validates the uploaded file and parses its CSV content.
3. The audit engine normalizes selected fields, evaluates validation rules, identifies duplicates, and calculates quality scores.
4. The backend returns a JSON response containing summary statistics and the individual audit results.
5. The frontend displays the results and provides search, filtering, record inspection, and CSV export functionality.

### Data Storage

The current implementation processes uploaded CSV data in memory and returns audit results to the frontend. It does not use a database for persistent lead storage or audit history.

This approach keeps the initial implementation simple and avoids maintaining a database for a lightweight auditing workflow. Uploaded data and results are not designed to persist between application sessions.

### Performance and Caching

The backend currently uses in-memory file handling and synchronous audit processing for uploaded files, with an upload limit of 5 MB.

No dedicated caching layer is implemented. For a larger production workload, performance could be improved through streaming CSV parsing, background processing, persistent storage, and caching where repeated operations justify it. These are future improvements, not current features.

### Deployment

The application is currently configured for local development, with the frontend and backend running separately.

A potential production setup would host the frontend on a static web hosting platform and deploy the backend as a Node.js service. A database or object-storage service could be introduced if persistent audit history or larger file processing becomes necessary.

No production deployment is assumed by this README.

## Getting Started

### Prerequisites

- Node.js and npm
- Git, if cloning the repository

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd LeadQualityInspector
```

Replace the repository URL with your actual GitHub repository URL.

### 2. Start the backend

Open a terminal:

```bash
cd server
npm install
npm run dev
```

The backend should be available at:

`http://localhost:5000`

Health endpoint:

`http://localhost:5000/api/health`

### 3. Start the frontend

Open a second terminal from the project root:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite, normally:

`http://localhost:5173`

Keep both development servers running while using the application.

## Using LeadInspect

1. Open the dashboard.
2. Select or drag and drop a CSV file.
3. Click **Run quality audit**.
4. Review summary statistics and individual record scores.
5. Select a row to inspect its findings and suggested fixes.
6. Export the complete audit results or the issue report.

### Expected CSV Format

The required headers are:

- `Company`
- `Industry`

Optional fields used by the current audit rules include `Website` and `Email`.

Example:

```csv
Company,Industry,Website,Email
Acme Technologies,Software,https://acme.com,contact@acme.com
Bright Solutions,Consulting,https://bright.com,hello@bright.com
```

CSV files must be no larger than 5 MB.

## Quality Scoring

The audit starts each record at 100 points and subtracts configured deductions for detected issues.

| Validation rule | Deduction |
|---|---:|
| Missing company name | 30 |
| Missing industry | 15 |
| Missing website | 10 |
| Invalid website format | 10 |
| Invalid email format | 10 |
| Duplicate company or website domain | 20 |

The score cannot fall below zero. Multiple issues can contribute to a record's deductions.

The score represents data completeness and consistency according to these rules. It is not a prediction of sales conversion, investment suitability, or contact deliverability.

## Validation and Testing

The following scenarios have been tested manually:

- Empty CSV files
- Missing required headers
- Malformed CSV data
- Duplicate company records
- Files exceeding the 5 MB upload limit
- Clearing previous results when selecting a new file

TypeScript checks and the frontend production build have also completed successfully in the development environment.

## Limitations and Future Improvements

Potential future improvements include:

- Persistent audit history
- Additional duplicate matching rules
- Detection of personal email providers
- Website and email verification through suitable external services
- Larger-file processing using streaming or background jobs
- Additional table sorting and filtering
- Production deployment and automated tests

## Privacy and Verification

The application evaluates the contents of uploaded files locally through the configured backend service. Users should avoid uploading sensitive data unless they have authorization to process it.

A passing format check does not guarantee that a website exists, an email inbox is deliverable, or a company record is accurate.

## License

Add the appropriate license if you intend to distribute the project under an open-source license.
