import type { SbomComponent, VulnerabilityFinding } from "@shipledger/schema";

interface OsvBatchQueryItem {
  package?: {
    name?: string;
    ecosystem?: string;
    purl?: string;
  };
  version?: string;
}

interface OsvBatchResponse {
  results: Array<{
    vulns?: Array<{
      id: string;
      summary?: string;
      details?: string;
      aliases?: string[];
      severity?: Array<{
        type: string;
        score: string;
      }>;
      database_specific?: {
        severity?: string;
      };
    }>;
  }>;
}

/**
 * Maps OSV severity string/score to standard Severity enum
 */
function normalizeSeverity(vuln: any): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" {
  const dbSeverity = vuln.database_specific?.severity?.toUpperCase();
  if (dbSeverity === "CRITICAL" || dbSeverity === "HIGH" || dbSeverity === "MEDIUM" || dbSeverity === "LOW") {
    return dbSeverity;
  }

  // Check CVSS score if available
  const cvss = vuln.severity?.find((s: any) => s.type === "CVSS_V3")?.score;
  if (cvss) {
    // If score is a number in string format
    const scoreNum = parseFloat(cvss);
    if (!isNaN(scoreNum)) {
      if (scoreNum >= 9.0) return "CRITICAL";
      if (scoreNum >= 7.0) return "HIGH";
      if (scoreNum >= 4.0) return "MEDIUM";
      return "LOW";
    }
  }

  return "UNKNOWN";
}

/**
 * Queries OSV using batch API
 */
export async function queryOsvForComponents(
  components: SbomComponent[],
  timeoutMs: number = 8000
): Promise<VulnerabilityFinding[]> {
  if (components.length === 0) {
    return [];
  }

  // Purl이 있거나 이름이 있는 컴포넌트 선별
  const queries: OsvBatchQueryItem[] = [];
  const queryComponentMap: SbomComponent[] = [];

  for (const comp of components) {
    if (comp.purl) {
      queries.push({ package: { purl: comp.purl } });
      queryComponentMap.push(comp);
    } else if (comp.name && comp.version) {
      queries.push({
        package: { name: comp.name },
        version: comp.version
      });
      queryComponentMap.push(comp);
    }
  }

  if (queries.length === 0) {
    return [];
  }

  // OSV Batch query limits to ~1000 items per request
  const BATCH_SIZE = 500;
  const findings: VulnerabilityFinding[] = [];

  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    const chunkQueries = queries.slice(i, i + BATCH_SIZE);
    const chunkComps = queryComponentMap.slice(i, i + BATCH_SIZE);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch("https://api.osv.dev/v1/querybatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: chunkQueries }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`OSV batch query failed with status: ${res.status}`);
        continue;
      }

      const data = (await res.json()) as OsvBatchResponse;

      data.results?.forEach((result, idx) => {
        if (!result.vulns || result.vulns.length === 0) return;

        const comp = chunkComps[idx];
        for (const vuln of result.vulns) {
          const severity = normalizeSeverity(vuln);
          findings.push({
            id: vuln.id,
            package_name: comp.name,
            package_version: comp.version,
            purl: comp.purl,
            severity,
            summary: vuln.summary,
            details: vuln.details,
            aliases: vuln.aliases || [],
            known_exploited: false, // v0.1: KEV enrichment can be hooked here
            status: severity === "CRITICAL" || severity === "HIGH" ? "REVIEW_REQUIRED" : "OPEN"
          });
        }
      });
    } catch (err: any) {
      console.warn("Error communicating with OSV API (fail-safe fallback):", err.message);
    }
  }

  // 중복 ID 제거 (동일 패키지 및 취약점)
  const uniqueMap = new Map<string, VulnerabilityFinding>();
  for (const f of findings) {
    const key = `${f.id}:${f.package_name}:${f.package_version}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, f);
    }
  }

  return Array.from(uniqueMap.values());
}
