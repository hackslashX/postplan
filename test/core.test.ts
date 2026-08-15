import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LocalFileStorage, ProjectRepository, ProjectService, safePath } from "../src/core.js";

async function service() {
  const root = await mkdtemp(path.join(os.tmpdir(), "postplan-"));
  return new ProjectService(new ProjectRepository(path.join(root, "db.sqlite")), new LocalFileStorage(path.join(root, "assets")));
}

test("projects separate read and write access", async () => {
  const projects = await service();
  const project = projects.createProject();
  assert.equal(projects.listFiles(project.id, project.readKey).length, 0);
  assert.equal(projects.listFiles(project.id, project.writeKey).length, 0);
  await projects.putFile(project.id, project.writeKey, "index.html", Buffer.from("<h1>Plan</h1>"), "text/html");
  const file = await projects.getFile(project.id, project.readKey, "index.html");
  assert.equal(file?.content?.toString(), "<h1>Plan</h1>");
  await assert.rejects(projects.putFile(project.id, project.readKey, "bad.txt", Buffer.from("x"), "text/plain"), /invalid/);
});

test("paths cannot escape a project", () => {
  for (const value of ["../secret", "/etc/passwd", "a/../../secret", "", "a\\b"]) assert.throws(() => safePath(value));
  assert.equal(safePath("assets/../index.html"), "index.html");
});

test("text edits are atomic and reject ambiguous replacements", async () => {
  const projects = await service(); const project = projects.createProject();
  await projects.putFile(project.id, project.writeKey, "index.html", Buffer.from("<h1>Draft</h1>\n<p>old</p>"), "text/html");
  await projects.applyTextEdits(project.id, project.writeKey, "index.html", [{ oldText: "Draft", newText: "Plan" }, { oldText: "old", newText: "new" }]);
  assert.equal((await projects.getFile(project.id, project.readKey, "index.html"))?.content?.toString(), "<h1>Plan</h1>\n<p>new</p>");
  await assert.rejects(projects.applyTextEdits(project.id, project.writeKey, "index.html", [{ oldText: "missing", newText: "x" }]), /not found/);
});

test("files can be deleted", async () => {
  const projects = await service(); const project = projects.createProject();
  await projects.putFile(project.id, project.writeKey, "style.css", Buffer.from("body{}"), "text/css");
  assert.equal(await projects.deleteFile(project.id, project.writeKey, "style.css"), true);
  assert.equal(await projects.deleteFile(project.id, project.writeKey, "style.css"), false);
});

test("project files remain sandboxed when opened directly", async (t) => {
  process.env.NODE_ENV = "test";
  const { createApp } = await import("../src/index.js");
  const projects = await service(); const project = projects.createProject();
  await projects.putFile(project.id, project.writeKey, "index.html", Buffer.from("<script>document.body.textContent = 'Plan'</script>"), "text/html");
  const server = createApp(projects, "http://example.test").listen(0);
  t.after(() => server.close());
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/project/${project.id}/${project.readKey}/index.html`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-security-policy"), "sandbox allow-scripts allow-forms allow-modals allow-popups");
});
