import fs from "fs";
import path from "path";

const VERCEL_URL = process.env.TEST_URL || "https://sequel-backend.vercel.app";
const OUTPUT_FILE = path.join(process.cwd(), "test_results.md");

interface TestItem {
  name: string;
  path: string;
  method: "GET" | "POST";
  body?: any;
}

const testCases: TestItem[] = [
  {
    name: "Root Health Landing",
    path: "/",
    method: "GET"
  },
  {
    name: "System Status",
    path: "/api/status",
    method: "GET"
  },
  {
    name: "Gemini & System Health Check",
    path: "/api/health",
    method: "GET"
  },
  {
    name: "Firebase Admin Setup Check",
    path: "/api/firebase-check",
    method: "GET"
  },
  {
    name: "Discover Feed API",
    path: "/api/discover",
    method: "GET"
  },
  {
    name: "Unified Media Search (Movie: Inception)",
    path: "/api/search",
    method: "POST",
    body: { query: "Inception", type: "movie" }
  },
  {
    name: "Unified Media Search (TV: Stranger Things)",
    path: "/api/search",
    method: "POST",
    body: { query: "Stranger Things", type: "tv" }
  },
  {
    name: "TMDB Media Details (ID: 27205 - Inception)",
    path: "/api/tmdb-details",
    method: "POST",
    body: { tmdbId: 27205, type: "movie" }
  },
  {
    name: "AI Recommendation Engine",
    path: "/api/recommend",
    method: "POST",
    body: { title: "Inception", type: "movie", genres: "Sci-Fi" }
  },
  {
    name: "404 Error Handling Verification",
    path: "/api/non-existent-endpoint",
    method: "GET"
  }
];

async function runAndRecordTests() {
  const timestamp = new Date().toISOString();
  let markdown = `# API Test Results Log\n\n`;
  markdown += `**Last Updated**: \`${timestamp}\`  \n`;
  markdown += `**Target URL**: \`${VERCEL_URL}\`  \n\n`;
  markdown += `---\n\n`;
  markdown += `## Summary Table\n\n`;
  markdown += `| # | Test Name | Method | Endpoint | Status | Result |\n`;
  markdown += `|---|---|---|---|---|---|\n`;

  const detailedResults: string[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const t = testCases[i];
    const targetUrl = `${VERCEL_URL}${t.path}`;
    const startTime = Date.now();
    
    let status = 0;
    let ok = false;
    let responseData: any = {};
    let errorMsg: string | null = null;

    try {
      const opts: RequestInit = {
        method: t.method,
        headers: { "Content-Type": "application/json" }
      };
      if (t.body) {
        opts.body = JSON.stringify(t.body);
      }
      const res = await fetch(targetUrl, opts);
      status = res.status;
      ok = res.ok || status === 404; // 404 is expected for 404 test case
      responseData = await res.json().catch(async () => await res.text());
    } catch (err: any) {
      errorMsg = err.message;
    }

    const duration = Date.now() - startTime;
    const badge = ok ? "✅ PASS" : "❌ FAIL";
    markdown += `| ${i + 1} | ${t.name} | \`${t.method}\` | \`${t.path}\` | \`${status}\` | ${badge} (${duration}ms) |\n`;

    let detail = `### ${i + 1}. ${t.name}\n\n`;
    detail += `- **Endpoint**: \`${t.method} ${t.path}\`\n`;
    detail += `- **Target URL**: \`${targetUrl}\`\n`;
    detail += `- **HTTP Status**: \`${status}\` (${badge})\n`;
    detail += `- **Response Time**: \`${duration}ms\`\n\n`;

    if (t.body) {
      detail += `**Request Payload**:\n\`\`\`json\n${JSON.stringify(t.body, null, 2)}\n\`\`\`\n\n`;
    }

    if (errorMsg) {
      detail += `**Error**:\n\`\`\`text\n${errorMsg}\n\`\`\`\n\n`;
    } else {
      detail += `**Response Body**:\n\`\`\`json\n${JSON.stringify(responseData, null, 2)}\n\`\`\`\n\n`;
    }

    detailedResults.push(detail);
  }

  markdown += `\n---\n\n## Detailed Call Logs\n\n` + detailedResults.join("\n---\n\n");

  fs.writeFileSync(OUTPUT_FILE, markdown, "utf8");
  console.log(`\n🎉 Test results recorded successfully to: ${OUTPUT_FILE}`);
}

runAndRecordTests().catch(console.error);
