import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Enums ---
export const releaseStatusEnum = pgEnum("release_status", [
  "COLLECTING",
  "EVALUATING",
  "INCOMPLETE",
  "REVIEW_REQUIRED",
  "READY",
  "APPROVED",
  "RELEASED"
]);

export const findingStatusEnum = pgEnum("finding_status", [
  "OPEN",
  "REVIEW_REQUIRED",
  "FIXED",
  "NOT_AFFECTED",
  "RISK_ACCEPTED"
]);

export const severityEnum = pgEnum("vulnerability_severity", [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNKNOWN"
]);

export const craApplicabilityEnum = pgEnum("cra_applicability", [
  "UNKNOWN",
  "IN_SCOPE",
  "OUT_OF_SCOPE"
]);

export const orgRoleEnum = pgEnum("org_role", [
  "owner",
  "admin",
  "member"
]);

export const incidentTypeEnum = pgEnum("cra_incident_type", [
  "ACTIVELY_EXPLOITED_VULNERABILITY",
  "SEVERE_SECURITY_INCIDENT",
  "OTHER"
]);

// --- 1. Users & Organizations ---
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: varchar("github_id", { length: 64 }).notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  tier: varchar("tier", { length: 32 }).default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: orgRoleEnum("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const githubInstallations = pgTable("github_installations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  installationId: varchar("installation_id", { length: 64 }).notNull().unique(),
  accountLogin: varchar("account_login", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// --- 2. Repositories & Products ---
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  craApplicability: craApplicabilityEnum("cra_applicability").default("UNKNOWN").notNull(),
  securityContact: text("security_contact"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const repositories = pgTable("repositories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  githubRepoId: varchar("github_repo_id", { length: 64 }).notNull().unique(),
  owner: varchar("owner", { length: 128 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  defaultBranch: varchar("default_branch", { length: 64 }).default("main").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// --- 3. Releases & Integrity (Section 10, 39) ---
export const releases = pgTable(
  "releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repositoryId: uuid("repository_id").references(() => repositories.id, { onDelete: "cascade" }).notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    version: varchar("version", { length: 64 }).notNull(),
    commitSha: varchar("commit_sha", { length: 40 }).notNull(),
    tag: varchar("tag", { length: 64 }),
    workflowRunId: varchar("workflow_run_id", { length: 64 }),
    status: releaseStatusEnum("status").default("EVALUATING").notNull(),
    evidenceDigest: varchar("evidence_digest", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    releasedAt: timestamp("released_at")
  },
  (table) => [
    uniqueIndex("repo_commit_tag_idx").on(table.repositoryId, table.commitSha, table.tag)
  ]
);

// --- 4. Evidence Bundles & Artifacts ---
export const evidenceBundles = pgTable("evidence_bundles", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").references(() => releases.id, { onDelete: "cascade" }).notNull().unique(),
  schemaVersion: varchar("schema_version", { length: 64 }).notNull(),
  digest: varchar("digest", { length: 64 }).notNull(),
  rawBundleJson: jsonb("raw_bundle_json").notNull(),
  s3Uri: text("s3_uri"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const artifacts = pgTable("artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").references(() => releases.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// --- 5. SBOMs & Components ---
export const sboms = pgTable("sboms", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").references(() => releases.id, { onDelete: "cascade" }).notNull().unique(),
  format: varchar("format", { length: 32 }).notNull(), // CycloneDX, SPDX
  specVersion: varchar("spec_version", { length: 16 }),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  componentCount: integer("component_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const components = pgTable("components", {
  id: uuid("id").primaryKey().defaultRandom(),
  sbomId: uuid("sbom_id").references(() => sboms.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  version: varchar("version", { length: 64 }).notNull(),
  purl: text("purl"),
  type: varchar("type", { length: 32 }),
  license: text("license")
});

// --- 6. Vulnerabilities, Findings, Decisions ---
export const vulnerabilities = pgTable("vulnerabilities", {
  id: varchar("id", { length: 64 }).primaryKey(), // CVE-XXXX or GHSA-XXXX
  summary: text("summary"),
  details: text("details"),
  severity: severityEnum("severity").default("UNKNOWN").notNull(),
  knownExploited: boolean("known_exploited").default(false).notNull(),
  discoveredAt: timestamp("discovered_at").defaultNow().notNull()
});

export const findings = pgTable("findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").references(() => releases.id, { onDelete: "cascade" }).notNull(),
  vulnerabilityId: varchar("vulnerability_id", { length: 64 }).references(() => vulnerabilities.id).notNull(),
  componentId: uuid("component_id").references(() => components.id, { onDelete: "cascade" }),
  status: findingStatusEnum("status").default("OPEN").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const riskDecisions = pgTable("risk_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  findingId: uuid("finding_id").references(() => findings.id, { onDelete: "cascade" }).notNull(),
  reason: text("reason").notNull(),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").references(() => releases.id, { onDelete: "cascade" }).notNull(),
  approvedByUserId: uuid("approved_by_user_id").references(() => users.id).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// --- 7. Audit Events (Section 40) ---
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  action: varchar("action", { length: 64 }).notNull(), // e.g. risk_accepted, release_approved
  resourceType: varchar("resource_type", { length: 32 }).notNull(), // release, finding
  resourceId: varchar("resource_id", { length: 64 }).notNull(),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

// --- Relations ---
export const releaseRelations = relations(releases, ({ one, many }) => ({
  repository: one(repositories, { fields: [releases.repositoryId], references: [repositories.id] }),
  product: one(products, { fields: [releases.productId], references: [products.id] }),
  bundle: one(evidenceBundles, { fields: [releases.id], references: [evidenceBundles.releaseId] }),
  artifacts: many(artifacts),
  sbom: one(sboms, { fields: [releases.id], references: [sboms.releaseId] }),
  findings: many(findings),
  approvals: many(approvals)
}));

export const findingRelations = relations(findings, ({ one, many }) => ({
  release: one(releases, { fields: [findings.releaseId], references: [releases.id] }),
  vulnerability: one(vulnerabilities, { fields: [findings.vulnerabilityId], references: [vulnerabilities.id] }),
  component: one(components, { fields: [findings.componentId], references: [components.id] }),
  riskDecisions: many(riskDecisions)
}));

// --- 8. Phase 3 CRA Incident Workspace (Section 38, 43~46) ---
export const incidents = pgTable("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id").references(() => releases.id, { onDelete: "cascade" }).notNull(),
  type: incidentTypeEnum("type").notNull(),
  title: text("title").notNull(),
  impactSummary: text("impact_summary"),
  mitigationStatus: text("mitigation_status"),
  confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id),
  confirmedAwarenessTime: timestamp("confirmed_awareness_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const incidentDeadlines = pgTable("incident_deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }).notNull().unique(),
  earlyWarningDeadline24h: timestamp("early_warning_deadline_24h").notNull(),
  fullNotificationDeadline72h: timestamp("full_notification_deadline_72h").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const incidentEvents = pgTable("incident_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }).notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const notificationDrafts = pgTable("notification_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }).notNull(),
  schemaVersion: varchar("schema_version", { length: 64 }).notNull(),
  dossierJson: jsonb("dossier_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const incidentRelations = relations(incidents, ({ one, many }) => ({
  release: one(releases, { fields: [incidents.releaseId], references: [releases.id] }),
  confirmedByUser: one(users, { fields: [incidents.confirmedByUserId], references: [users.id] }),
  deadlines: one(incidentDeadlines, { fields: [incidents.id], references: [incidentDeadlines.incidentId] }),
  events: many(incidentEvents),
  drafts: many(notificationDrafts)
}));

