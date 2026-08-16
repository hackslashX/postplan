import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { LocalFileStorage, ProjectRepository, ProjectService } from "../src/core.js";
import { layoutArchetypes } from "../src/layout-archetypes.js";
import { styleSkills } from "../src/style-skills.js";
import { composeUiBrief } from "../src/ui-guidance.js";
import { findUiReference, uiReferences, uiSkills } from "../src/ui-skills.js";

test("style contracts are complete and reference valid layout archetypes", () => {
  const archetypeIds = new Set(layoutArchetypes.map(item => item.id));
  assert.equal(styleSkills.length, 7);
  for (const style of styleSkills) {
    assert.match(style.id, /^style-/);
    assert.ok(style.bestFor.length >= 2, `${style.id} needs selection guidance`);
    assert.ok(style.avoidFor.length >= 2, `${style.id} needs rejection guidance`);
    assert.ok(style.componentGrammar.length >= 3, `${style.id} needs a component grammar`);
    assert.ok(style.responsiveBehavior.length >= 2, `${style.id} needs responsive rules`);
    assert.ok(style.signatureMoves.length >= 2, `${style.id} needs signature moves`);
    assert.ok(style.antiPatterns.length >= 2, `${style.id} needs anti-patterns`);
    assert.ok(style.acceptanceChecks.length >= 3, `${style.id} needs acceptance checks`);
    for (const id of style.layoutArchetypes) assert.ok(archetypeIds.has(id), `${style.id} references unknown archetype ${id}`);
    for (const token of ["canvas", "ink", "signal", "typography", "spacing", "measure", "radius", "border", "elevation"] as const) assert.ok(style.tokens[token], `${style.id} is missing ${token}`);
    assert.match(style.guidance, /Build-mode companion pass/);
  }
});

test("UI skill and reference ids are unique and nested references are retrievable", () => {
  assert.equal(new Set(uiSkills.map(item => item.id)).size, uiSkills.length);
  assert.equal(new Set(uiReferences.map(item => item.id)).size, uiReferences.length);
  const spacing = findUiReference("better-layout/spacing-and-adaptivity");
  assert.equal(spacing?.skillId, "better-layout");
  assert.match(spacing?.guidance ?? "", /responsive|adaptiv/i);
});

test("composed briefs bind intent, structure, style, and verification", () => {
  const result = composeUiBrief({
    styleId: "style-modern-product",
    archetypeId: "onboarding",
    purpose: "Help a new team configure its workspace",
    audience: "First-time workspace administrators",
    primaryTask: "Complete workspace setup",
    contentShape: "A three-step configuration flow",
    projectMode: "new",
    constraints: "Must work at 320px and without custom imagery"
  });
  assert.equal(result.compatible, true);
  assert.match(result.markdown, /Complete workspace setup/);
  assert.match(result.markdown, /Purpose and progress.*One primary decision/);
  assert.match(result.markdown, /Decision precedence/);
  assert.match(result.markdown, /Layout plan — establish before writing HTML/);
  assert.match(result.markdown, /Final cohesion pass/);
  assert.match(result.markdown, /get_ui_reference/);
});

test("composed briefs flag uncommon style and archetype pairings", () => {
  const result = composeUiBrief({ styleId: "style-gallery", archetypeId: "settings", purpose: "Configure access", audience: "Administrators", primaryTask: "Update permissions", contentShape: "Grouped settings", projectMode: "existing" });
  assert.equal(result.compatible, false);
  assert.match(result.markdown, /uncommon pairing/i);
  assert.match(result.markdown, /preserve the Settings information structure/i);
});

test("composed briefs reject unknown selections", () => {
  const base = { archetypeId: "plan", purpose: "Share a plan", audience: "Team", primaryTask: "Understand next steps", contentShape: "Plan", projectMode: "new" as const };
  assert.throws(() => composeUiBrief({ ...base, styleId: "style-missing" }), /Unknown style/);
  assert.throws(() => composeUiBrief({ ...base, styleId: "style-quiet-minimal", archetypeId: "missing" }), /Unknown layout archetype/);
});

test("MCP exposes and executes the purpose-first guidance workflow", async (t) => {
  process.env.NODE_ENV = "test";
  const { createMcpServer } = await import("../src/index.js");
  const root = await mkdtemp(path.join(os.tmpdir(), "postplan-ui-"));
  const service = new ProjectService(new ProjectRepository(path.join(root, "db.sqlite")), new LocalFileStorage(path.join(root, "assets")));
  const server = createMcpServer(service, "http://example.test");
  const client = new Client({ name: "postplan-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => { await client.close(); await server.close(); });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const tools = await client.listTools();
  for (const name of ["list_layout_archetypes", "compose_ui_brief", "list_ui_references", "get_ui_reference"]) assert.ok(tools.tools.some(tool => tool.name === name), `missing MCP tool ${name}`);

  const result = await client.callTool({ name: "compose_ui_brief", arguments: { style_id: "style-quiet-minimal", archetype_id: "plan", purpose: "Share a delivery plan", audience: "Project stakeholders", primary_task: "Understand the next decision", content_shape: "Phased plan", project_mode: "new" } });
  const block = result.content[0];
  assert.equal(block?.type, "text");
  assert.match(block && block.type === "text" ? block.text : "", /Postplan UI implementation brief/);
});
