import express from "express";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { isTextMimeType, LocalFileStorage, ProjectRepository, ProjectService } from "./core.js";
import { layoutArchetypes } from "./layout-archetypes.js";
import { composeUiBrief } from "./ui-guidance.js";
import { findUiReference, findUiSkill, uiReferences, uiSkills } from "./ui-skills.js";

const mimeFor = (file: string) => ({ html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", json: "application/json", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", ico: "image/x-icon", pdf: "application/pdf", txt: "text/plain; charset=utf-8" }[file.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream");
const text = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });
const fail = (error: unknown) => ({ content: [{ type: "text" as const, text: error instanceof Error ? error.message : "Unknown error" }], isError: true });
const html = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function createMcpServer(service: ProjectService, publicBaseUrl: string) {
  const server = new McpServer({ name: "postplan", version: "0.1.0" });
  server.registerResource("usage", "postplan://usage", { mimeType: "text/markdown", description: "How to design, create, edit, and share Postplan projects." }, async () => ({ contents: [{ uri: "postplan://usage", mimeType: "text/markdown", text: `# Postplan workflow\n\n1. Before implementation, resolve the page purpose, audience, primary task or takeaway, and content shape. Call \`list_layout_archetypes\` and \`list_ui_skills\`, choose one archetype and one \`style-*\` direction, then call \`compose_ui_brief\`.\n2. Use the composed brief as the page contract. Call \`get_ui_reference\` only when a specialist topic needs more depth; use \`better-interface\` for a holistic review after implementation.\n3. Call \`create_project\`. Keep \`write_key\` private; share only the returned \`view_url\` (it contains \`read_key\`).\n4. Call \`put_file\` for \`index.html\`, CSS, JavaScript, and text. Call \`put_binary_file\` for images or other base64 assets. Use relative links from \`index.html\`.\n5. Inspect before changing existing content with \`read_file\`. Make focused non-binary changes with \`apply_text_edits\`; use \`put_file\` when replacing a whole file.\n6. Call \`list_files\` to inspect the project and verify the rendered page at narrow and wide widths plus relevant interaction states.\n\nProjects are anonymous and have no recovery path: retain both keys.` }] }));
  server.registerTool("list_ui_skills", { description: "List Postplan visual styles, craft guides, and the holistic review guide. Before building, select one style-* id and pair it with a layout archetype; do not load every craft guide by default.", inputSchema: {} }, async () => text(uiSkills.map(skill => {
    const item = skill as typeof skill & { bestFor?: string[]; avoidFor?: string[]; contentShapes?: string[]; layoutArchetypes?: string[] };
    return { id: item.id, name: item.name, category: item.category, overview: item.overview, ...(item.category === "style" ? { best_for: item.bestFor, avoid_for: item.avoidFor, content_shapes: item.contentShapes, layout_archetypes: item.layoutArchetypes } : {}) };
  })));
  server.registerTool("get_ui_skill", { description: "Get a complete top-level UI style or specialist guide. For page creation, prefer compose_ui_brief; use this tool when you need the complete style contract or specialist principles.", inputSchema: { skill_id: z.string().describe("A skill id from list_ui_skills") } }, async ({ skill_id }) => { const skill = findUiSkill(skill_id); return skill ? text(skill) : fail(`Unknown UI skill: ${skill_id}. Call list_ui_skills first.`); });
  server.registerTool("list_layout_archetypes", { description: "List purpose-driven page structures. Choose the archetype that matches the user's primary task before choosing visual styling.", inputSchema: {} }, async () => text(layoutArchetypes));
  server.registerTool("list_ui_references", { description: "List retrievable specialist UI reference documents. Use these only when the composed brief needs deeper implementation detail.", inputSchema: { skill_id: z.string().optional().describe("Optionally filter references to one better-* skill id") } }, async ({ skill_id }) => text(uiReferences.filter(item => !skill_id || item.skillId === skill_id).map(({ id, skillId, name }) => ({ id, skill_id: skillId, name }))));
  server.registerTool("get_ui_reference", { description: "Get one specialist reference returned by list_ui_references, such as better-layout/spacing-and-adaptivity.", inputSchema: { reference_id: z.string().describe("A reference id from list_ui_references") } }, async ({ reference_id }) => { const reference = findUiReference(reference_id); return reference ? text(reference) : fail(`Unknown UI reference: ${reference_id}. Call list_ui_references first.`); });
  server.registerTool("compose_ui_brief", {
    description: "Compose concise, purpose-first build guidance from one visual style and one layout archetype. Call this before creating a new hosted page or materially redesigning one.",
    inputSchema: {
      style_id: z.string().describe("A style-* id from list_ui_skills"),
      archetype_id: z.string().describe("An id from list_layout_archetypes"),
      purpose: z.string().min(1).describe("What the page must accomplish"),
      audience: z.string().min(1).describe("Who will read or operate it"),
      primary_task: z.string().min(1).describe("The single most important action or takeaway"),
      content_shape: z.string().min(1).describe("The actual content form, such as narrative, comparison, workflow, dashboard, collection, or reference"),
      project_mode: z.enum(["new", "existing"]).default("new"),
      constraints: z.string().optional().describe("Brand, viewport, asset, density, interaction, or content constraints")
    }
  }, async ({ style_id, archetype_id, purpose, audience, primary_task, content_shape, project_mode, constraints }) => {
    try { return text(composeUiBrief({ styleId: style_id, archetypeId: archetype_id, purpose, audience, primaryTask: primary_task, contentShape: content_shape, projectMode: project_mode, constraints })); }
    catch (e) { return fail(e); }
  });
  server.registerTool("create_project",  { description: "Create an anonymous hosted project after resolving the design brief. Keep write_key private; retain both keys because projects cannot be recovered. write_key reads and changes files; read_key only reads and is embedded in the returned shareable view_url.", inputSchema: {} }, async () => {
    const project = service.createProject();
    return text({ public_base_url: publicBaseUrl, project_id: project.id, write_key: project.writeKey, read_key: project.readKey, view_url: `${publicBaseUrl}/view?project_id=${encodeURIComponent(project.id)}&key=${encodeURIComponent(project.readKey)}` });
  });
  server.registerTool("put_file", { description: "Create or replace one complete UTF-8 text file, such as index.html, style.css, or app.js. Use relative asset paths in HTML. Use read_file plus apply_text_edits for focused changes; use put_binary_file for images and other binary assets.", inputSchema: { project_id: z.string(), write_key: z.string(), path: z.string(), content: z.string(), mime_type: z.string().optional() } }, async ({ project_id, write_key, path: filePath, content, mime_type }) => {
    try { await service.putFile(project_id, write_key, filePath, Buffer.from(content), mime_type ?? mimeFor(filePath)); return text({ ok: true, path: filePath, bytes: Buffer.byteLength(content) }); } catch (e) { return fail(e); }
  });
  server.registerTool("put_binary_file", { description: "Create or replace a binary project file. content_base64 must be standard base64.", inputSchema: { project_id: z.string(), write_key: z.string(), path: z.string(), content_base64: z.string(), mime_type: z.string() } }, async ({ project_id, write_key, path: filePath, content_base64, mime_type }) => {
    try { if (!/^[A-Za-z0-9+/]*={0,2}$/.test(content_base64) || content_base64.length % 4 !== 0) throw new Error("content_base64 is not valid base64"); const content = Buffer.from(content_base64, "base64"); await service.putFile(project_id, write_key, filePath, content, mime_type); return text({ ok: true, path: filePath, bytes: content.length }); } catch (e) { return fail(e); }
  });
  server.registerTool("read_file", { description: "Read a file. For text files, optionally select lines or search for literal text matching lines. Binary files return base64 content and cannot be line-selected.", inputSchema: { project_id: z.string(), key: z.string(), path: z.string(), start_line: z.number().int().positive().optional(), line_count: z.number().int().positive().max(10000).optional(), query: z.string().optional(), context_lines: z.number().int().min(0).max(100).optional() } }, async ({ project_id, key, path: filePath, start_line, line_count, query, context_lines }) => {
    try {
      const file = await service.getFile(project_id, key, filePath); if (!file?.content) throw new Error("File not found");
      if (!isTextMimeType(file.metadata.mimeType)) { if (start_line || line_count || query) throw new Error("Line selection and search require a text file"); return text({ ...file.metadata, content_base64: file.content.toString("base64") }); }
      const lines = file.content.toString("utf8").split(/\r?\n/); let selected = lines.map((content, index) => ({ line: index + 1, content }));
      if (query !== undefined) { const queryLower = query.toLowerCase(); const hits = selected.filter(item => item.content.toLowerCase().includes(queryLower)).map(item => item.line); const padding = context_lines ?? 0; const wanted = new Set(hits.flatMap(hit => Array.from({ length: padding * 2 + 1 }, (_, i) => hit - padding + i)).filter(line => line >= 1 && line <= lines.length)); selected = selected.filter(item => wanted.has(item.line)); }
      if (start_line !== undefined || line_count !== undefined) { const start = start_line ?? 1; const count = line_count ?? lines.length; selected = selected.filter(item => item.line >= start && item.line < start + count); }
      return text({ ...file.metadata, total_lines: lines.length, lines: selected });
    } catch (e) { return fail(e); }
  });
  server.registerTool("apply_text_edits", { description: "Atomically replace exact, unique text fragments in a non-binary file. Each old_text must occur exactly once; all replacements are calculated from the original file.", inputSchema: { project_id: z.string(), write_key: z.string(), path: z.string(), edits: z.array(z.object({ old_text: z.string().min(1), new_text: z.string() })).min(1).max(100) } }, async ({ project_id, write_key, path: filePath, edits }) => {
    try { return text({ ok: true, ...(await service.applyTextEdits(project_id, write_key, filePath, edits.map(edit => ({ oldText: edit.old_text, newText: edit.new_text })))) }); } catch (e) { return fail(e); }
  });
  server.registerTool("list_files", { description: "List project files and metadata.", inputSchema: { project_id: z.string(), key: z.string() } }, async ({ project_id, key }) => { try { return text(service.listFiles(project_id, key)); } catch (e) { return fail(e); } });
  server.registerTool("delete_file", { description: "Permanently delete one project file. Requires write_key.", inputSchema: { project_id: z.string(), write_key: z.string(), path: z.string() } }, async ({ project_id, write_key, path: filePath }) => { try { return text({ deleted: await service.deleteFile(project_id, write_key, filePath) }); } catch (e) { return fail(e); } });
  return server;
}

export function createMcpApp(service: ProjectService, publicBaseUrl: string) {
  const app = express();
  app.use(express.json({ limit: "25mb" }));
  app.post("/mcp", async (req, res) => {
    const server = createMcpServer(service, publicBaseUrl);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try { await server.connect(transport); await transport.handleRequest(req, res, req.body); res.on("close", () => { void transport.close(); void server.close(); }); }
    catch (e) { console.error(e); if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null }); }
  });
  app.all("/mcp", (_req, res) => res.status(405).json({ error: "Use POST for MCP requests" }));
  return app;
}

export function createApp(service: ProjectService, publicBaseUrl: string) {
  const favicon = readFileSync(new URL("./favicon.svg", import.meta.url));
  const app = express();
  // Browsers may request the conventional .ico path even when pages declare the SVG icon.
  app.get(["/favicon.svg", "/favicon.ico"], (_req, res) => res.type("image/svg+xml").set("Cache-Control", "public, max-age=86400").send(favicon));
  app.get("/", (_req, res) => {
    res.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
    res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>Postplan — plans, in a browser</title><style>
:root{color-scheme:dark;--ink:#f7f6f1;--muted:#aaa9a2;--lime:#c9f35a;--paper:#171815;--line:#34362e}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:1040px;margin:auto;padding:28px}.nav{display:flex;justify-content:space-between;align-items:center;font-weight:700;letter-spacing:-.03em}.mark{color:var(--lime);margin-right:8px}.tag{color:var(--muted);font-size:14px;font-weight:500}.hero{padding:110px 0 88px;max-width:780px}h1{font-size:clamp(48px,9vw,98px);line-height:.94;letter-spacing:-.075em;margin:0 0 28px}.hero p{font-size:clamp(18px,2.4vw,24px);max-width:620px;color:var(--muted);margin:0}.accent{color:var(--lime)}.flow{border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,1fr);padding:24px 0 72px;gap:32px}.step{font-size:14px;color:var(--muted)}.step b{display:block;color:var(--ink);font-size:20px;letter-spacing:-.03em;margin:14px 0 7px}.num{color:var(--lime);font:700 13px ui-monospace,SFMono-Regular,Menlo,monospace}.code{background:#10110f;border:1px solid var(--line);border-radius:10px;padding:20px;overflow:auto;font:14px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;color:#d8d9cf;margin-bottom:72px}.code span{color:var(--lime)}footer{border-top:1px solid var(--line);padding:22px 0;color:var(--muted);font-size:14px}@media(max-width:650px){.hero{padding:76px 0 64px}.flow{grid-template-columns:1fr;gap:24px}}</style></head>
<body><main class="wrap"><nav><div><span class="mark">✦</span>postplan</div><div class="tag">Private MCP · public viewer</div></nav><section class="hero"><h1>Plans belong<br>in a <span class="accent">browser.</span></h1><p>Postplan lets AI agents turn HTML plans, prototypes, and visual notes into a private link you can open on any device.</p></section><section class="flow"><div class="step"><span class="num">01</span><b>An agent creates</b>It connects through a private MCP endpoint and gets an anonymous project, a write key, and a separate share key.</div><div class="step"><span class="num">02</span><b>It builds</b>HTML, CSS, JavaScript, images, and other assets are uploaded through MCP. Keep that listener behind your own network policy.</div><div class="step"><span class="num">03</span><b>You open</b>The public viewer serves only the browser link. No MCP route, file download, or local setup.</div></section><pre class="code"><span>PRIVATE MCP</span> → create_project → put_file(index.html) → share view_url
<span>PUBLIC VIEWER</span> → open the link, anywhere</pre><footer>Anonymous projects · Read-only sharing links · Separate MCP and viewer listeners · SQLite + persistent disk</footer></main></body></html>`);
  });
  app.get("/view", (req, res) => {
    const id = typeof req.query.project_id === "string" ? req.query.project_id : ""; const key = typeof req.query.key === "string" ? req.query.key : "";
    try { service.authorize(id, key, "read"); } catch { res.status(404).send("Project not found"); return; }
    const source = `/project/${encodeURIComponent(id)}/${encodeURIComponent(key)}/index.html`;
    res.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-src 'self'");
    res.type("html").send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><title>Postplan</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}body{min-height:100vh}</style><iframe sandbox="allow-scripts allow-forms allow-modals allow-popups" src="${html(source)}" title="Hosted project"></iframe>`);
  });
  app.get(/^\/project\/([^/]+)\/([^/]+)\/(.+)$/, async (req, res) => {
    const [, id, key, filePath] = req.path.match(/^\/project\/([^/]+)\/([^/]+)\/(.+)$/) ?? [];
    if (!id || !key || !filePath) { res.sendStatus(404); return; }
    try { const file = await service.getFile(id, key, decodeURIComponent(filePath)); if (!file?.content) { res.sendStatus(404); return; } res.set({ "Content-Type": file.metadata.mimeType, "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-modals allow-popups", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300" }).send(file.content); } catch { res.sendStatus(404); }
  });
  return app;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ?? path.resolve(moduleDir, "../data");
mkdirSync(dataDir, { recursive: true });
const httpPort = Number(process.env.PORT ?? 3000);
const mcpPort = Number(process.env.MCP_PORT ?? 3001);
const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? `http://localhost:${httpPort}`).replace(/\/$/, "");
const mcpBaseUrl = (process.env.MCP_BASE_URL ?? `http://localhost:${mcpPort}`).replace(/\/$/, "");
const service = new ProjectService(new ProjectRepository(path.join(dataDir, "postplan.db")), new LocalFileStorage(path.join(dataDir, "assets")));
if (process.env.NODE_ENV !== "test") {
  createApp(service, publicBaseUrl).listen(httpPort, () => console.log(`Postplan viewer listening at ${publicBaseUrl}`));
  createMcpApp(service, publicBaseUrl).listen(mcpPort, () => console.log(`Postplan MCP listening at ${mcpBaseUrl}/mcp`));
}
