
import express from "express";
import cors from "cors";
import multer from "multer";
import Papa from "papaparse";
import { auditLeads, Lead } from "./audit";

const app = express();
const PORT = 5000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      callback(new Error("Please upload a CSV file."));
      return;
    }

    callback(null, true);
  }
});

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://lead-quality-inspector.vercel.app"
  ]
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "success",
    message: "Lead Quality Inspector API is running"
  });
});

app.post("/api/audit", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        status: "error",
        message: "Please select a CSV file."
      });
      return;
    }

    const csvText = req.file.buffer.toString("utf8");

    if (!csvText.trim()) {
      return res.status(400).json({
        status: "error",
        message: "The CSV file contains no data rows.",
      });
    }

    const parsed = Papa.parse<Lead>(csvText, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    });

    const headers = parsed.meta.fields ?? [];
    const requiredHeaders = ["Company", "Industry"];
    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.some(
        (actual) => actual.toLowerCase() === header.toLowerCase()
      )
    );

    if (missingHeaders.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Missing required CSV columns: ${missingHeaders.join(", ")}.`,
      });
    }

    if (parsed.errors.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Unable to parse the CSV file.",
        errors: parsed.errors,
      });
    }

    if (parsed.data.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "The CSV file contains no data rows.",
      });
    }


    const leads = parsed.data as Lead[];

    const results = auditLeads(leads);

    const issueCount = results.reduce(
      (total, lead) => total + lead.issues.length,
      0
    );

    const averageScore = Math.round(
      results.reduce((total, lead) => total + lead.score, 0) /
        results.length
    );

    res.json({
      status: "success",
      summary: {
        totalLeads: results.length,
        averageScore,
        duplicateCount: results.filter((lead) => lead.duplicate).length,
        leadsWithIssues: results.filter(
          (lead) => lead.issues.length > 0
        ).length,
        issueCount
      },
      results
    });
  } catch {
    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred while auditing the CSV."
    });
  }
});

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        status: "error",
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "The CSV file must be 5 MB or smaller."
            : error.message
      });
      return;
    }

    res.status(400).json({
      status: "error",
      message: error.message || "Unable to process the request."
    });
  }
);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
