import { findLayoutArchetype } from "./layout-archetypes.js";
import { findStyleSkill } from "./style-skills.js";

export type DesignBriefInput = {
  styleId: string;
  archetypeId: string;
  purpose: string;
  audience: string;
  primaryTask: string;
  contentShape: string;
  projectMode: "new" | "existing";
  constraints?: string;
};

const specialistReferences = [
  "better-accessibility/focus-and-keyboard",
  "better-accessibility/motion-and-zoom",
  "better-layout/grouping-and-alignment",
  "better-layout/spacing-and-adaptivity",
  "better-typography/spacing-and-sizing",
  "better-typography/wrapping-and-punctuation",
  "better-colors/color-usage"
];

function bullets(items: string[]) { return items.map(item => `- ${item}`).join("\n"); }

export function composeUiBrief(input: DesignBriefInput) {
  const style = findStyleSkill(input.styleId);
  if (!style) throw new Error(`Unknown style: ${input.styleId}. Call list_ui_skills and select a style-* id.`);
  const archetype = findLayoutArchetype(input.archetypeId);
  if (!archetype) throw new Error(`Unknown layout archetype: ${input.archetypeId}. Call list_layout_archetypes first.`);

  const compatibilityNote = style.layoutArchetypes.includes(archetype.id)
    ? "The style explicitly supports this archetype."
    : `This is an uncommon pairing. Preserve the ${archetype.name} information structure and use ${style.name.replace(/^Style:\s*/, "")} only as its visual language.`;

  const plan = [
    `Primary outcome: ${input.primaryTask}`,
    `Page regions: ${archetype.regions.join(" → ")}`,
    `Shared alignment edges: establish one content edge and one optional media/data edge; repeat them across regions`,
    `Repeated component: choose one anatomy for each repeated content type and do not vary it decoratively`,
    `Mobile transformation: ${archetype.mobileTransformation.join("; ")}`,
    `Intentionally omit: components, decoration, and secondary actions that do not support “${input.primaryTask}”`
  ];

  const cohesionChecks = [
    "The purpose, primary takeaway, or primary action is identifiable in the first viewport.",
    "Equivalent components use the same anatomy, spacing, radius, border, elevation, and state behavior.",
    "Every section introduces necessary information rather than repeating the same claim in a new treatment.",
    "The page uses no more than three major visual motifs, including the style's signature moves.",
    "The narrow layout preserves information priority instead of merely stacking desktop regions.",
    "The visual style remains recognizable after nonessential decoration is removed.",
    "Relevant empty, loading, error, long-content, hover, focus, and reduced-motion states are handled.",
    archetype.completionSignal
  ];

  const markdown = `# Postplan UI implementation brief

## Intent

- **Purpose:** ${input.purpose}
- **Audience:** ${input.audience}
- **Primary task or takeaway:** ${input.primaryTask}
- **Content shape:** ${input.contentShape}
- **Project mode:** ${input.projectMode}
- **Constraints:** ${input.constraints?.trim() || "No additional constraints supplied; verify content volume, supported widths, and available assets."}

## Direction

- **Layout archetype:** ${archetype.name} — ${archetype.purpose}
- **Visual style:** ${style.name.replace(/^Style:\s*/, "")} — ${style.intent}
- **Compatibility:** ${compatibilityNote}

## Decision precedence

1. User requirements and factual content
2. Accessibility and successful task completion
3. ${input.projectMode === "existing" ? "The existing project's design system and conventions" : "The coherent tokens established for this new project"}
4. The ${archetype.name} layout archetype
5. The ${style.name.replace(/^Style:\s*/, "")} visual style
6. Generic craft defaults

## Layout plan — establish before writing HTML

${bullets(plan)}

## Hierarchy

- **Primary:** ${style.hierarchy.primary}
- **Secondary:** ${style.hierarchy.secondary}
- **Tertiary:** ${style.hierarchy.tertiary}

## Token contract

${Object.entries(style.tokens).map(([role, value]) => `- **${role}:** ${value}`).join("\n")}

## Component grammar

${bullets(style.componentGrammar)}

## Responsive and interaction behavior

${bullets([...style.responsiveBehavior, ...style.interactionLanguage])}

## Preserve the style

**Signature moves**

${bullets(style.signatureMoves)}

**Do not introduce**

${bullets(style.antiPatterns)}

## Build-mode craft floor

- Use semantic HTML and native controls; provide visible keyboard focus and accessible names.
- Establish a small semantic token system for canvas, text roles, signal, spacing, radii, borders, elevation, and motion.
- Derive breakpoints from content fit and verify reflow at 320px and 200% zoom.
- Keep body copy readable, allow long strings to wrap, and expose non-color state cues.
- Use clear, consistent, action-oriented copy. Preserve established terminology when editing.
- Inspect the rendered result at narrow and wide sizes and walk all relevant interaction states.

## Final cohesion pass

${cohesionChecks.map(item => `- [ ] ${item}`).join("\n")}

## Style-specific acceptance

${style.acceptanceChecks.map(item => `- [ ] ${item}`).join("\n")}

## Specialist depth, only when needed

Call \`get_ui_reference\` with one of these ids when the implementation needs more detail: ${specialistReferences.map(id => `\`${id}\``).join(", ")}. Use \`better-interface\` only for a holistic review after implementation.`;

  return { input, style_id: style.id, archetype_id: archetype.id, compatible: style.layoutArchetypes.includes(archetype.id), markdown };
}
