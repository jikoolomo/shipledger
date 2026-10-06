import { stat } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { calculateFileSha256 } from "@shipledger/crypto";
import type { ArtifactEvidence } from "@shipledger/schema";

export async function collectArtifacts(patterns: string[], cwd: string = process.cwd()): Promise<ArtifactEvidence[]> {
  if (!patterns || patterns.length === 0) {
    return [];
  }

  const matchedPaths = await fg(patterns, {
    cwd,
    absolute: true,
    onlyFiles: true,
    unique: true
  });

  const results: ArtifactEvidence[] = [];

  for (const absPath of matchedPaths) {
    try {
      const fileStat = await stat(absPath);
      const sha256 = await calculateFileSha256(absPath);
      const relativePath = path.relative(cwd, absPath);

      results.push({
        name: path.basename(absPath),
        path: relativePath,
        sha256,
        size: fileStat.size,
        created_at: fileStat.birthtime.toISOString() || fileStat.mtime.toISOString()
      });
    } catch (err) {
      // 파일 읽기 실패 시 무시하거나 에러 로깅
      console.warn(`Failed to process artifact ${absPath}:`, err);
    }
  }

  // 일관된 순서를 위해 이름 기준 정렬
  return results.sort((a, b) => a.name.localeCompare(b.name));
}
