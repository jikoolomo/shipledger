import type { ReleaseEvidenceBundle } from "@shipledger/schema";

export interface DependencyDiff {
  added: Array<{ name: string; version: string; purl?: string }>;
  removed: Array<{ name: string; version: string; purl?: string }>;
  updated: Array<{ name: string; fromVersion: string; toVersion: string }>;
}

export interface SecurityDiff {
  introduced: Array<{ id: string; package_name: string; severity: string }>;
  resolved: Array<{ id: string; package_name: string; severity: string }>;
  statusChanged: Array<{ id: string; fromStatus: string; toStatus: string }>;
}

export interface TestCountDiff {
  passedDiff: number;
  failedDiff: number;
  totalDiff: number;
  prevPassed: number;
  currPassed: number;
  prevFailed: number;
  currFailed: number;
}

export interface ArtifactDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

export interface ReleaseDiffResult {
  fromRelease: {
    tag?: string;
    commit_sha: string;
  };
  toRelease: {
    tag?: string;
    commit_sha: string;
  };
  policyChange: {
    fromStatus: string;
    toStatus: string;
  };
  dependencies: DependencyDiff;
  security: SecurityDiff;
  tests: TestCountDiff;
  artifacts: ArtifactDiff;
}

export function computeReleaseDiff(
  prevBundle: ReleaseEvidenceBundle,
  currBundle: ReleaseEvidenceBundle
): ReleaseDiffResult {
  // 1. Dependency Diff
  const prevComps = new Map<string, string>();
  for (const c of prevBundle.sbom.components) {
    prevComps.set(c.name, c.version);
  }

  const currComps = new Map<string, string>();
  for (const c of currBundle.sbom.components) {
    currComps.set(c.name, c.version);
  }

  const addedDeps: DependencyDiff["added"] = [];
  const removedDeps: DependencyDiff["removed"] = [];
  const updatedDeps: DependencyDiff["updated"] = [];

  for (const [name, version] of currComps.entries()) {
    if (!prevComps.has(name)) {
      addedDeps.push({ name, version });
    } else {
      const prevVersion = prevComps.get(name)!;
      if (prevVersion !== version) {
        updatedDeps.push({ name, fromVersion: prevVersion, toVersion: version });
      }
    }
  }

  for (const [name, version] of prevComps.entries()) {
    if (!currComps.has(name)) {
      removedDeps.push({ name, version });
    }
  }

  // 2. Security Diff
  const prevVulns = new Map<string, { severity: string; status: string; package_name: string }>();
  for (const v of prevBundle.vulnerabilities) {
    prevVulns.set(v.id, { severity: v.severity, status: v.status, package_name: v.package_name });
  }

  const currVulns = new Map<string, { severity: string; status: string; package_name: string }>();
  for (const v of currBundle.vulnerabilities) {
    currVulns.set(v.id, { severity: v.severity, status: v.status, package_name: v.package_name });
  }

  const introducedVulns: SecurityDiff["introduced"] = [];
  const resolvedVulns: SecurityDiff["resolved"] = [];
  const statusChangedVulns: SecurityDiff["statusChanged"] = [];

  for (const [id, curr] of currVulns.entries()) {
    if (!prevVulns.has(id)) {
      introducedVulns.push({ id, package_name: curr.package_name, severity: curr.severity });
    } else {
      const prev = prevVulns.get(id)!;
      if (prev.status !== curr.status) {
        statusChangedVulns.push({ id, fromStatus: prev.status, toStatus: curr.status });
      }
    }
  }

  for (const [id, prev] of prevVulns.entries()) {
    if (!currVulns.has(id)) {
      resolvedVulns.push({ id, package_name: prev.package_name, severity: prev.severity });
    }
  }

  // 3. Test Diff
  const tests: TestCountDiff = {
    passedDiff: currBundle.tests.passed - prevBundle.tests.passed,
    failedDiff: currBundle.tests.failed - prevBundle.tests.failed,
    totalDiff: currBundle.tests.total - prevBundle.tests.total,
    prevPassed: prevBundle.tests.passed,
    currPassed: currBundle.tests.passed,
    prevFailed: prevBundle.tests.failed,
    currFailed: currBundle.tests.failed
  };

  // 4. Artifact Diff
  const prevArtifacts = new Map<string, string>();
  for (const a of prevBundle.artifacts) {
    prevArtifacts.set(a.name, a.sha256);
  }

  const currArtifacts = new Map<string, string>();
  for (const a of currBundle.artifacts) {
    currArtifacts.set(a.name, a.sha256);
  }

  const addedArtifacts: string[] = [];
  const removedArtifacts: string[] = [];
  const changedArtifacts: string[] = [];

  for (const [name, sha] of currArtifacts.entries()) {
    if (!prevArtifacts.has(name)) {
      addedArtifacts.push(name);
    } else if (prevArtifacts.get(name) !== sha) {
      changedArtifacts.push(name);
    }
  }

  for (const name of prevArtifacts.keys()) {
    if (!currArtifacts.has(name)) {
      removedArtifacts.push(name);
    }
  }

  return {
    fromRelease: {
      tag: prevBundle.release.tag,
      commit_sha: prevBundle.release.commit_sha
    },
    toRelease: {
      tag: currBundle.release.tag,
      commit_sha: currBundle.release.commit_sha
    },
    policyChange: {
      fromStatus: prevBundle.policy.status,
      toStatus: currBundle.policy.status
    },
    dependencies: {
      added: addedDeps.sort((a, b) => a.name.localeCompare(b.name)),
      removed: removedDeps.sort((a, b) => a.name.localeCompare(b.name)),
      updated: updatedDeps.sort((a, b) => a.name.localeCompare(b.name))
    },
    security: {
      introduced: introducedVulns,
      resolved: resolvedVulns,
      statusChanged: statusChangedVulns
    },
    tests,
    artifacts: {
      added: addedArtifacts,
      removed: removedArtifacts,
      changed: changedArtifacts
    }
  };
}

export function formatReleaseDiffMarkdown(diff: ReleaseDiffResult): string {
  const fromVer = diff.fromRelease.tag || diff.fromRelease.commit_sha.substring(0, 7);
  const toVer = diff.toRelease.tag || diff.toRelease.commit_sha.substring(0, 7);

  const lines: string[] = [];
  lines.push(`# 🔀 ShipLedger Release Diff`);
  lines.push(`**${fromVer} → ${toVer}**`);
  lines.push("");

  // Status Change
  if (diff.policyChange.fromStatus !== diff.policyChange.toStatus) {
    lines.push(`**Status Changed:** \`${diff.policyChange.fromStatus}\` ➔ \`${diff.policyChange.toStatus}\``);
    lines.push("");
  }

  // Security Changes
  lines.push(`### 🛡 Security Findings Diff`);
  if (diff.security.introduced.length === 0 && diff.security.resolved.length === 0 && diff.security.statusChanged.length === 0) {
    lines.push(`- No security finding changes`);
  } else {
    for (const v of diff.security.introduced) {
      lines.push(`- ➕ Introduced: **${v.id}** (${v.package_name}, ${v.severity})`);
    }
    for (const v of diff.security.resolved) {
      lines.push(`- ➖ Resolved: **${v.id}** (${v.package_name}, ${v.severity})`);
    }
    for (const s of diff.security.statusChanged) {
      lines.push(`- 🔄 Status: **${s.id}** (\`${s.fromStatus}\` ➔ \`${s.toStatus}\`)`);
    }
  }
  lines.push("");

  // Dependencies Changes
  lines.push(`### 📦 Dependency Changes`);
  if (diff.dependencies.added.length === 0 && diff.dependencies.removed.length === 0 && diff.dependencies.updated.length === 0) {
    lines.push(`- No dependency changes`);
  } else {
    for (const d of diff.dependencies.added) {
      lines.push(`- ➕ \`+ ${d.name} ${d.version}\``);
    }
    for (const d of diff.dependencies.removed) {
      lines.push(`- ➖ \`- ${d.name} ${d.version}\``);
    }
    for (const u of diff.dependencies.updated) {
      lines.push(`- 🆙 \`${u.name}\`: **${u.fromVersion}** ➔ **${u.toVersion}**`);
    }
  }
  lines.push("");

  // Tests Diff
  lines.push(`### 🧪 Tests Diff`);
  const passedDelta = diff.tests.passedDiff >= 0 ? `+${diff.tests.passedDiff}` : `${diff.tests.passedDiff}`;
  const failedDelta = diff.tests.failedDiff >= 0 ? `+${diff.tests.failedDiff}` : `${diff.tests.failedDiff}`;
  lines.push(`- Passed tests: **${diff.tests.currPassed}** (${passedDelta})`);
  lines.push(`- Failed tests: **${diff.tests.currFailed}** (${failedDelta})`);
  lines.push("");

  // Artifacts Diff
  if (diff.artifacts.added.length > 0 || diff.artifacts.removed.length > 0 || diff.artifacts.changed.length > 0) {
    lines.push(`### 📁 Artifact Changes`);
    for (const a of diff.artifacts.added) lines.push(`- ➕ Added: \`${a}\``);
    for (const a of diff.artifacts.removed) lines.push(`- ➖ Removed: \`${a}\``);
    for (const a of diff.artifacts.changed) lines.push(`- 🔄 Checksum changed: \`${a}\``);
    lines.push("");
  }

  return lines.join("\n");
}
