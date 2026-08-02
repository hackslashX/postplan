import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { styleSkills } from "./style-skills.js";

export type UiSkill = { id: string; name: string; overview: string; guidance: string; source: string };

const skillsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../skills/jakubkrehel");
const source = "https://github.com/jakubkrehel/skills";

function frontMatter(markdown: string, field: string): string {
  const match = markdown.match(new RegExp(`^${field}:\\s*(?:>[-+]?\\s*)?(.+?)(?=\\n\\w[\\w-]*:|\\n---)`, "ms"));
  return match?.[1].replace(/\n\s+/g, " ").trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function loadSkills(): UiSkill[] {
  return readdirSync(skillsRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => {
    const guidance = readFileSync(path.join(skillsRoot, entry.name, "SKILL.md"), "utf8");
    return { id: entry.name, name: frontMatter(guidance, "name") || entry.name, overview: frontMatter(guidance, "description"), guidance, source };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export const uiSkills = [...loadSkills(), ...styleSkills];
export function findUiSkill(id: string) { return uiSkills.find(skill => skill.id === id); }
