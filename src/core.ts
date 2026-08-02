import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

export type Access = "read" | "write";
export type Project = { id: string; readKey: string; writeKey: string; createdAt: string };
export type StoredFile = { path: string; mimeType: string; size: number; updatedAt: string };
export type FileStorage = {
  put(projectId: string, filePath: string, content: Buffer): Promise<void>;
  get(projectId: string, filePath: string): Promise<Buffer | undefined>;
  delete(projectId: string, filePath: string): Promise<boolean>;
};

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const newKey = () => randomBytes(32).toString("base64url");
export const newId = () => randomBytes(12).toString("base64url");

export function safePath(value: string): string {
  if (!value || value.length > 512 || value.includes("\\") || value.startsWith("/") || value.includes("\0")) throw new Error("Invalid file path");
  const normalized = path.posix.normalize(value);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) throw new Error("File path must stay within the project");
  return normalized;
}

export class LocalFileStorage implements FileStorage {
  constructor(private readonly root: string) {}
  private file(projectId: string, filePath: string) { return path.join(this.root, projectId, safePath(filePath)); }
  async put(projectId: string, filePath: string, content: Buffer) {
    const target = this.file(projectId, filePath);
    await mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomBytes(6).toString("hex")}.tmp`;
    await writeFile(temporary, content, { mode: 0o600 });
    await rename(temporary, target);
  }
  async get(projectId: string, filePath: string) { try { return await readFile(this.file(projectId, filePath)); } catch (e: unknown) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw e; } }
  async delete(projectId: string, filePath: string) { try { await rm(this.file(projectId, filePath)); return true; } catch (e: unknown) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return false; throw e; } }
}

export class ProjectRepository {
  private db: Database.Database;
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, read_key_hash TEXT NOT NULL, write_key_hash TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS files (project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, path TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(project_id, path));`);
  }
  create(): Project {
    const project = { id: newId(), readKey: newKey(), writeKey: newKey(), createdAt: new Date().toISOString() };
    this.db.prepare("INSERT INTO projects VALUES (?, ?, ?, ?)").run(project.id, hash(project.readKey), hash(project.writeKey), project.createdAt);
    return project;
  }
  authorized(id: string, key: string, access: Access): boolean {
    const row = this.db.prepare("SELECT read_key_hash, write_key_hash FROM projects WHERE id = ?").get(id) as { read_key_hash: string; write_key_hash: string } | undefined;
    if (!row) return false;
    const supplied = Buffer.from(hash(key));
    const matchesWrite = timingSafeEqual(supplied, Buffer.from(row.write_key_hash));
    return matchesWrite || (access === "read" && timingSafeEqual(supplied, Buffer.from(row.read_key_hash)));
  }
  upsertFile(projectId: string, file: StoredFile) { this.db.prepare("INSERT INTO files VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_id,path) DO UPDATE SET mime_type=excluded.mime_type,size=excluded.size,updated_at=excluded.updated_at").run(projectId, file.path, file.mimeType, file.size, file.updatedAt); }
  deleteFile(projectId: string, filePath: string) { return this.db.prepare("DELETE FROM files WHERE project_id = ? AND path = ?").run(projectId, filePath).changes > 0; }
  listFiles(projectId: string): StoredFile[] { return this.db.prepare("SELECT path, mime_type AS mimeType, size, updated_at AS updatedAt FROM files WHERE project_id = ? ORDER BY path").all(projectId) as StoredFile[]; }
  getFile(projectId: string, filePath: string): StoredFile | undefined { return this.db.prepare("SELECT path, mime_type AS mimeType, size, updated_at AS updatedAt FROM files WHERE project_id = ? AND path = ?").get(projectId, filePath) as StoredFile | undefined; }
}

export const isTextMimeType = (mimeType: string) => mimeType.startsWith("text/") || ["application/json", "application/javascript", "application/xml", "image/svg+xml"].includes(mimeType.split(";")[0]);

export class ProjectService {
  constructor(readonly projects: ProjectRepository, readonly storage: FileStorage) {}
  createProject() { return this.projects.create(); }
  authorize(id: string, key: string, access: Access) { if (!this.projects.authorized(id, key, access)) throw new Error("Project not found or key is invalid"); }
  async putFile(id: string, key: string, filePath: string, content: Buffer, mimeType: string) {
    this.authorize(id, key, "write"); const normalized = safePath(filePath); const now = new Date().toISOString();
    await this.storage.put(id, normalized, content); this.projects.upsertFile(id, { path: normalized, mimeType, size: content.length, updatedAt: now });
  }
  async getFile(id: string, key: string, filePath: string) { this.authorize(id, key, "read"); const metadata = this.projects.getFile(id, safePath(filePath)); return metadata ? { metadata, content: await this.storage.get(id, metadata.path) } : undefined; }
  listFiles(id: string, key: string) { this.authorize(id, key, "read"); return this.projects.listFiles(id); }
  async deleteFile(id: string, key: string, filePath: string) { this.authorize(id, key, "write"); const normalized = safePath(filePath); await this.storage.delete(id, normalized); return this.projects.deleteFile(id, normalized); }
  async applyTextEdits(id: string, key: string, filePath: string, edits: Array<{ oldText: string; newText: string }>) {
    this.authorize(id, key, "write");
    const normalized = safePath(filePath); const metadata = this.projects.getFile(id, normalized);
    if (!metadata) throw new Error("File not found");
    if (!isTextMimeType(metadata.mimeType)) throw new Error("Text edits are not allowed for binary files");
    const content = await this.storage.get(id, normalized); if (!content) throw new Error("File content is missing");
    const original = content.toString("utf8"); const ranges: Array<{ start: number; end: number; replacement: string }> = [];
    for (const edit of edits) {
      if (!edit.oldText) throw new Error("old_text must not be empty");
      const first = original.indexOf(edit.oldText); const last = original.lastIndexOf(edit.oldText);
      if (first === -1) throw new Error("old_text was not found");
      if (first !== last) throw new Error("old_text must occur exactly once");
      ranges.push({ start: first, end: first + edit.oldText.length, replacement: edit.newText });
    }
    ranges.sort((a, b) => a.start - b.start);
    if (ranges.some((range, index) => index > 0 && range.start < ranges[index - 1].end)) throw new Error("Text edits must not overlap");
    let updated = original; for (const range of ranges.sort((a, b) => b.start - a.start)) updated = updated.slice(0, range.start) + range.replacement + updated.slice(range.end);
    await this.putFile(id, key, normalized, Buffer.from(updated), metadata.mimeType);
    return { bytes: Buffer.byteLength(updated), updatedAt: new Date().toISOString() };
  }
}
