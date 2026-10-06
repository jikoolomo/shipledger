import { readFile } from "node:fs/promises";
import path from "node:path";
import { calculateFileSha256 } from "@shipledger/crypto";
import type { SbomComponent, SbomEvidence } from "@shipledger/schema";

export async function parseSbom(filePath?: string, cwd: string = process.cwd()): Promise<SbomEvidence> {
  if (!filePath) {
    return {
      status: "MISSING",
      component_count: 0,
      components: []
    };
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);

  let rawContent: string;
  let fileSha256: string;
  try {
    rawContent = await readFile(absPath, "utf-8");
    fileSha256 = await calculateFileSha256(absPath);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return {
        status: "MISSING",
        file_path: filePath,
        component_count: 0,
        components: []
      };
    }
    return {
      status: "INVALID",
      file_path: filePath,
      component_count: 0,
      components: []
    };
  }

  let json: any;
  try {
    json = JSON.parse(rawContent);
  } catch {
    return {
      status: "INVALID",
      file_path: filePath,
      sha256: fileSha256,
      component_count: 0,
      components: []
    };
  }

  // 1. Check CycloneDX
  if (json.bomFormat === "CycloneDX" || (typeof json.specVersion === "string" && Array.isArray(json.components))) {
    const components: SbomComponent[] = (json.components || []).map((c: any) => ({
      name: c.name || "unknown",
      version: c.version || "unknown",
      purl: c.purl,
      type: c.type,
      license: c.licenses?.[0]?.license?.id || c.licenses?.[0]?.license?.name
    }));

    return {
      status: "VERIFIED",
      format: "CycloneDX",
      spec_version: json.specVersion,
      file_path: filePath,
      sha256: fileSha256,
      component_count: components.length,
      components
    };
  }

  // 2. Check SPDX
  if (typeof json.spdxVersion === "string" && (Array.isArray(json.packages) || json.SPDXID)) {
    const rawPackages = Array.isArray(json.packages) ? json.packages : [];
    const components: SbomComponent[] = rawPackages.map((p: any) => {
      // SPDX purl is usually inside externalRefs
      const purlRef = p.externalRefs?.find(
        (ref: any) => ref.referenceType === "purl" || ref.referenceType?.toLowerCase()?.includes("purl")
      );
      return {
        name: p.name || "unknown",
        version: p.versionInfo || "unknown",
        purl: purlRef?.referenceLocator,
        type: "library",
        license: typeof p.licenseConcluded === "string" && p.licenseConcluded !== "NOASSERTION" ? p.licenseConcluded : undefined
      };
    });

    return {
      status: "VERIFIED",
      format: "SPDX",
      spec_version: json.spdxVersion,
      file_path: filePath,
      sha256: fileSha256,
      component_count: components.length,
      components
    };
  }

  return {
    status: "INVALID",
    format: "UNKNOWN",
    file_path: filePath,
    sha256: fileSha256,
    component_count: 0,
    components: []
  };
}
