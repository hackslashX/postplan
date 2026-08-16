import type { UiSkill } from "./ui-skills.js";

export type StyleTokens = {
  canvas: string;
  ink: string;
  signal: string;
  typography: string;
  spacing: string;
  measure: string;
  radius: string;
  border: string;
  elevation: string;
};

export type StyleGuide = UiSkill & {
  category: "style";
  intent: string;
  bestFor: string[];
  avoidFor: string[];
  contentShapes: string[];
  layoutArchetypes: string[];
  hierarchy: { primary: string; secondary: string; tertiary: string };
  tokens: StyleTokens;
  componentGrammar: string[];
  responsiveBehavior: string[];
  interactionLanguage: string[];
  signatureMoves: string[];
  antiPatterns: string[];
  acceptanceChecks: string[];
};

type StyleDefinition = Omit<StyleGuide, "name" | "guidance" | "source" | "category"> & { name: string };

const companionGuidance = `## Build-mode companion pass

Use this style after resolving the page purpose, audience, primary task, content shape, and layout archetype. Apply this precedence when guidance competes:

1. User requirements and factual content
2. Accessibility and successful task completion
3. The existing design system when editing a project
4. The selected layout archetype
5. This visual style
6. Generic craft defaults

Use \`compose_ui_brief\` for a concise implementation contract. Load a \`better-*\` skill or one of its references only when the task needs specialist depth; their review-output sections do not apply while building.`;

function bullets(items: string[]) { return items.map(item => `- ${item}`).join("\n"); }

function renderGuidance(style: StyleDefinition): string {
  return `# ${style.name.replace(/^Style:\s*/, "")}\n\n${style.intent}\n\n## Use when\n\n${bullets(style.bestFor)}\n\n## Avoid when\n\n${bullets(style.avoidFor)}\n\n## Content and layout\n\n- Content shapes: ${style.contentShapes.join(", ")}\n- Compatible archetypes: ${style.layoutArchetypes.join(", ")}\n- Primary hierarchy: ${style.hierarchy.primary}\n- Secondary hierarchy: ${style.hierarchy.secondary}\n- Tertiary hierarchy: ${style.hierarchy.tertiary}\n\n## Token direction\n\n${Object.entries(style.tokens).map(([role, value]) => `- **${role}:** ${value}`).join("\n")}\n\n## Component grammar\n\n${bullets(style.componentGrammar)}\n\n## Responsive behavior\n\n${bullets(style.responsiveBehavior)}\n\n## Interaction language\n\n${bullets(style.interactionLanguage)}\n\n## Signature moves\n\n${bullets(style.signatureMoves)}\n\n## Anti-patterns\n\n${bullets(style.antiPatterns)}\n\n## Acceptance checks\n\n${bullets(style.acceptanceChecks)}\n\n${companionGuidance}`;
}

const style = (definition: StyleDefinition): StyleGuide => ({
  ...definition,
  category: "style",
  guidance: renderGuidance(definition),
  source: "Postplan built-in style guide"
});

export const styleSkills: StyleGuide[] = [
  style({
    id: "style-editorial-newspaper",
    name: "Style: editorial newspaper",
    overview: "Information-dense, typographic storytelling with strong hierarchy and disciplined rules.",
    intent: "Turn a body of evidence into a paced narrative whose hierarchy is legible before it is read.",
    bestFor: ["Research explainers and long-form case studies", "Release notes or reports with a strong editorial narrative", "Content with quotations, captions, sources, and distinct levels of evidence"],
    avoidFor: ["Dense operational tools with frequent controls", "Short promotional pages whose content cannot support editorial pacing"],
    contentShapes: ["narrative", "evidence-led report", "annotated release"],
    layoutArchetypes: ["editorial", "plan"],
    hierarchy: { primary: "The headline and central thesis", secondary: "Sections, evidence, and pull quotes", tertiary: "Bylines, captions, dates, and source notes" },
    tokens: { canvas: "Warm, low-chroma paper; reference preset #f5f1e8", ink: "Very dark warm neutral; reference preset #1b1a18", signal: "One muted oxblood or cobalt role, never both decoratively", typography: "High-contrast display serif with a practical serif or sans body", spacing: "A restrained 4/8px base with conspicuous pauses between editorial regions", measure: "60–70 characters for prose; narrower for side notes", radius: "Square or barely rounded", border: "Hairline rules only between major editorial regions", elevation: "Flat; hierarchy comes from type, space, and rules" },
    componentGrammar: ["A masthead or compact utility header establishes publication context", "Headline, deck, and byline form one aligned opening unit", "Body sections share a reading edge; pull quotes and figures deliberately break it", "Captions stay attached to their media; sources and methods close the evidence chain"],
    responsiveBehavior: ["Collapse multi-column editorial regions when either column loses a readable measure", "Preserve headline–deck–byline order and keep captions adjacent to media", "Let media bleed where useful while prose remains inset"],
    interactionLanguage: ["Links remain visibly underlined or otherwise unmistakable", "Motion is rare and only supports navigation or evidence reveal"],
    signatureMoves: ["One dramatic headline paired with disciplined small metadata", "Occasional two-column evidence sections", "Rules used as editorial punctuation, not row decoration"],
    antiPatterns: ["Card grids, pill-heavy navigation, gradients, or oversized rounded corners", "A rule between every item", "Magazine styling applied to thin or repetitive content"],
    acceptanceChecks: ["The thesis and evidence order are clear without reading every paragraph", "Every rule separates a meaningful editorial region", "Long-form text stays within a readable measure at all supported widths"]
  }),
  style({
    id: "style-modern-product",
    name: "Style: modern product",
    overview: "Clean, confident product presentation focused on clarity, actions, and generous spacing.",
    intent: "Make a product proposition or workflow immediately understandable and keep the primary action unmistakable.",
    bestFor: ["SaaS marketing pages", "Application shells and focused workflows", "Onboarding and settings when paired with the matching archetype"],
    avoidFor: ["Expressive portfolios where imagery should dominate", "Dense research reports that need editorial hierarchy"],
    contentShapes: ["proposition", "workflow", "feature comparison", "configuration"],
    layoutArchetypes: ["marketing", "application", "onboarding", "settings", "plan"],
    hierarchy: { primary: "The value proposition or current task and its primary action", secondary: "Evidence, workflow steps, or grouped controls", tertiary: "Supporting metadata, helper text, and secondary actions" },
    tokens: { canvas: "Neutral canvas with restrained alternate surfaces", ink: "Near-black primary and clearly quieter secondary text", signal: "One vivid brand accent reserved for the primary action and meaningful state", typography: "Modern sans; 600–700 headings; 16–18px body; compact but readable labels", spacing: "8px base scale with larger multiples between page regions", measure: "About 60–72 characters for explanatory copy", radius: "One small and one container radius with concentric nesting", border: "Subtle structural separators and explicit state borders", elevation: "One restrained shadow recipe for genuinely raised surfaces" },
    componentGrammar: ["One primary action per decision region; secondary actions remain visually quieter", "Cards exist only for grouping, status, or comparison and share one anatomy", "Each section has a clear claim followed by evidence or an action", "Navigation, content, and action areas align to a stable grid derived from content fit"],
    responsiveBehavior: ["Collapse regions when their content no longer fits, not at an arbitrary device preset", "Retain the primary action and task context before optional navigation or supporting content", "Stack comparison content without losing labels or relationships"],
    interactionLanguage: ["Fast, restrained state transitions with static feedback", "Loading, empty, error, success, hover, and focus states use the same component grammar"],
    signatureMoves: ["A crisp proposition-to-evidence sequence", "Generous negative space around one strong action", "Consistent surface geometry across the page"],
    antiPatterns: ["A card around every paragraph", "Multiple saturated calls to action", "Generic gradient hero art with no explanatory role", "Mixing landing-page, dashboard, and settings structures on one screen"],
    acceptanceChecks: ["The primary action or takeaway is obvious in the first viewport", "Equivalent components use identical anatomy and tokens", "The selected archetype—not a generic landing-page template—determines the page structure"]
  }),
  style({
    id: "style-gallery",
    name: "Style: gallery / portfolio",
    overview: "Image-led, spacious composition that gives artifacts room to be examined.",
    intent: "Make the work—not the interface—the dominant visual voice while preserving context and discoverability.",
    bestFor: ["Photography, architecture, and visual research", "Case-study or artifact collections", "Portfolios with strong, available media"],
    avoidFor: ["Text-only plans", "Operational interfaces", "Collections whose imagery is inconsistent or unavailable"],
    contentShapes: ["collection", "case-study archive", "visual narrative"],
    layoutArchetypes: ["collection", "editorial"],
    hierarchy: { primary: "The selected or featured artifact", secondary: "The collection sequence and project titles", tertiary: "Medium, date, captions, and concise context" },
    tokens: { canvas: "Gallery white, charcoal, or near-black chosen to support the work", ink: "Quiet high-contrast text", signal: "One subtle accent for focus and selection", typography: "Understated metadata sans; optional characterful display face that never competes with media", spacing: "Generous, with one consistent gutter rhythm", measure: "Short captions; 55–70 characters for case-study prose", radius: "Minimal and consistent with the artwork presentation", border: "Subtle image outline or structural divider only", elevation: "Usually flat; depth must not compete with artifacts" },
    componentGrammar: ["Every artifact uses a stable media–title–metadata–caption relationship", "Use an even grid by default; masonry only when varied proportions improve scanning", "Project detail pages alternate focused media with attached explanation", "Filters and navigation remain visually subordinate but continuously available"],
    responsiveBehavior: ["Reduce columns based on usable artifact width", "Preserve intentional crops and expose full captions on touch", "Never make hover the only route to metadata or actions"],
    interactionLanguage: ["Quiet opacity or transform feedback that does not move the layout", "Keyboard focus and selection remain visible against every artwork"],
    signatureMoves: ["Large uninterrupted media fields", "Quiet, precisely aligned captions", "Purposeful alternation between overview and close examination"],
    antiPatterns: ["Decorative UI that competes with the work", "Masonry used merely for trendiness", "Missing or hover-only artifact context"],
    acceptanceChecks: ["The artifacts dominate before navigation or decoration", "Every item has reachable identifying context", "Cropping remains intentional from narrow to wide viewports"]
  }),
  style({
    id: "style-old-internet",
    name: "Style: old internet",
    overview: "Deliberately handmade web energy: dense, personal, quirky, and legible rather than nostalgically unusable.",
    intent: "Create a personal, authored sense of place without reproducing the accessibility failures of early websites.",
    bestFor: ["Personal homepages and fan archives", "Playful learning tools", "Small collections whose personality is part of their value"],
    avoidFor: ["High-stakes transactions", "Enterprise workflows requiring quiet density", "Brands that need institutional restraint"],
    contentShapes: ["directory", "personal archive", "annotated collection"],
    layoutArchetypes: ["collection", "editorial", "plan"],
    hierarchy: { primary: "The site identity and explicit text navigation", secondary: "Compact authored modules and featured links", tertiary: "Status badges, notes, counters, and decorative motifs" },
    tokens: { canvas: "Light or dark web-safe-inspired field with optional restrained tile", ink: "Strong default text contrast", signal: "A small set of saturated link and status colors with one meaning each", typography: "System UI, Verdana, Georgia, and a monospace utility face", spacing: "Compact 4/8px rhythm with larger gaps between modules", measure: "Readable text columns even inside a fixed-width desktop well", radius: "Square or minimally rounded", border: "Visible 1–2px module and control borders", elevation: "Flat or intentionally crude single-offset shadow" },
    componentGrammar: ["Text-first navigation always exposes destinations", "Compact modules use repeated title-bar, body, and link-list anatomy", "Decorative badges and motifs remain subordinate to useful content", "A desktop content well becomes fluid and inset on narrow screens"],
    responsiveBehavior: ["Replace fixed desktop width with a fluid mobile layout", "Allow dense modules to stack and text to wrap", "Keep critical text and controls comfortably readable and tappable"],
    interactionLanguage: ["Underlined links and visibly pressed controls", "Playful effects may decorate, but never obscure state, focus, or motion preferences"],
    signatureMoves: ["Explicit directory-like navigation", "One or two handmade decorative motifs", "Compact, visibly bounded modules"],
    antiPatterns: ["Unreadably tiny pixel text", "Blinking critical content", "Desktop-only fixed widths", "Quirk applied uniformly until nothing has hierarchy"],
    acceptanceChecks: ["The page feels authored rather than broken", "Navigation and controls remain semantic and keyboard reachable", "Decorative nostalgia never reduces legibility or reflow"]
  }),
  style({
    id: "style-retro-futurist",
    name: "Style: retro futurist",
    overview: "Optimistic science-fiction mood: bold geometry, luminous contrast, and controlled spectacle.",
    intent: "Frame technology or speculative content with a controlled sense of discovery and forward motion.",
    bestFor: ["Technology explainers and concept pages", "Focused data stories", "Future-facing launches with enough substantive content"],
    avoidFor: ["Long administrative forms", "Content where spectacle would undermine trust or urgency", "Pages with no technical or speculative connection"],
    contentShapes: ["concept narrative", "system explainer", "focused data story"],
    layoutArchetypes: ["marketing", "editorial", "dashboard"],
    hierarchy: { primary: "The central concept, system state, or headline", secondary: "Diagrams, evidence, and key actions", tertiary: "Coordinates, labels, technical metadata, and decorative instrumentation" },
    tokens: { canvas: "Deep navy or black field", ink: "Cool near-white with legible muted text", signal: "One primary luminous accent and at most one secondary data accent", typography: "Geometric or wide display face with a highly legible sans/mono for body and data", spacing: "8px technical rhythm with large geometric voids", measure: "55–68 characters for body copy", radius: "Small radii or circular geometry used deliberately", border: "Thin low-contrast grid and chrome-like structural lines", elevation: "Glow only at focal states; otherwise flat layered planes" },
    componentGrammar: ["A large geometric field anchors each major region", "Technical labels attach to real content or system relationships", "Diagrams and data modules share line weight, spacing, and annotation style", "Primary actions use luminous emphasis while secondary controls remain neutral"],
    responsiveBehavior: ["Simplify diagrams without removing their meaning", "Collapse ornamental geometry before content or controls", "Keep all critical labels in normal flow at narrow widths"],
    interactionLanguage: ["Motion clarifies data flow, response, or spatial relationship", "Reduced motion removes travel and autoplay while preserving state cues"],
    signatureMoves: ["One luminous focal element", "Thin technical grids or circular diagrams", "Large-scale geometry balanced by precise labels"],
    antiPatterns: ["Glow on every component", "Meaningless HUD decoration", "Multiple competing neon colors", "Stock sci-fi imagery replacing explanation"],
    acceptanceChecks: ["Removing decoration leaves a coherent information hierarchy", "Every luminous effect marks priority or state", "The page remains readable and useful with reduced motion enabled"]
  }),
  style({
    id: "style-quiet-minimal",
    name: "Style: quiet minimal",
    overview: "Calm, reductionist design that foregrounds words and decisions through restraint.",
    intent: "Reduce visual negotiation so a reader can understand, decide, or proceed without distraction.",
    bestFor: ["Focused plans and manifestos", "Documentation and reading experiences", "Simple decision or status pages"],
    avoidFor: ["Dense comparative dashboards", "Image collections needing visual variety", "Thin content padded into an oversized marketing page"],
    contentShapes: ["plan", "documentation", "short narrative", "decision"],
    layoutArchetypes: ["plan", "editorial", "settings"],
    hierarchy: { primary: "The central statement, decision, or next step", secondary: "A short sequence of supporting sections", tertiary: "Dates, status, references, and quiet utility actions" },
    tokens: { canvas: "Off-white or near-black", ink: "One primary text color with a clearly quieter secondary role", signal: "One low-saturation accent reserved for action, link, or state", typography: "Refined serif or neutral sans with limited weights", spacing: "Simple 8px-derived vertical rhythm with generous section intervals", measure: "A narrow 58–68 character reading column", radius: "Minimal and used only where a surface needs definition", border: "Dividers only where space cannot resolve ambiguity", elevation: "None or nearly imperceptible" },
    componentGrammar: ["One narrow content spine carries the primary narrative", "Headings, prose, and actions repeat a predictable vertical rhythm", "Metadata sits adjacent to the content it qualifies", "Optional detail is disclosed without fragmenting the page into cards"],
    responsiveBehavior: ["Preserve the content spine and hierarchy rather than merely shrinking type", "Keep actions inside mobile layout margins", "Allow headings and long strings to wrap naturally"],
    interactionLanguage: ["Mostly immediate state changes with restrained opacity or color transitions", "Controls remain visually explicit despite the reduced surface language"],
    signatureMoves: ["A disciplined narrow column", "One meaningful accent", "Large pauses around consequential content"],
    antiPatterns: ["Empty hero graphics", "Generic gradients", "Stacked cards", "Tiny all-caps labels", "Whitespace used to disguise a weak hierarchy"],
    acceptanceChecks: ["Every visible element earns its place", "The primary decision or message is immediately clear", "Reduction does not make controls or grouping ambiguous"]
  }),
  style({
    id: "style-data-lab",
    name: "Style: data lab",
    overview: "Analytical and structured: visual evidence, clear metrics, and technical credibility.",
    intent: "Help a reader move from summary to evidence to method without losing units, provenance, or uncertainty.",
    bestFor: ["Experiment reports and model explainers", "Operations and analytical dashboards", "Research memos with quantitative evidence"],
    avoidFor: ["Purely emotional storytelling", "Simple pages with too little data to justify an analytical shell"],
    contentShapes: ["dashboard", "experiment report", "technical memo", "comparison"],
    layoutArchetypes: ["dashboard", "editorial", "application"],
    hierarchy: { primary: "The takeaway and decision-relevant metrics", secondary: "Primary visualization and supporting comparisons", tertiary: "Units, time ranges, uncertainty, methods, and sources" },
    tokens: { canvas: "Dark or pale neutral workspace", ink: "High-contrast interface text with subdued annotation text", signal: "Categorical colors reserved for stable data meanings", typography: "Compact sans for interface; monospace and tabular figures for values and code", spacing: "4/8px analytical density with consistent module padding", measure: "Compact annotations; 60–75 characters for methods prose", radius: "Small, consistent module radius", border: "Subtle structural borders around bounded analytical modules", elevation: "Flat or one restrained raised state" },
    componentGrammar: ["Begin with a takeaway and compact summary metrics", "Give the primary chart the largest analytical area", "Supporting views repeat title, takeaway, plot, legend, and source anatomy", "Methods and sources close the page and remain traceable from claims"],
    responsiveBehavior: ["Stack analytical regions in decision order", "Transform wide tables or charts rather than silently clipping them", "Keep units, series labels, and time ranges attached to their values"],
    interactionLanguage: ["Hover supplements visible labels but never owns essential values", "Selections, filters, loading, empty, and error states preserve chart context"],
    signatureMoves: ["A title that states the chart takeaway", "Precisely aligned tabular values", "Visible source and uncertainty annotations"],
    antiPatterns: ["Chart junk and decorative metrics", "Color without a stable semantic meaning", "Unlabeled axes or context-free large numbers", "Dashboard cards with unrelated anatomy"],
    acceptanceChecks: ["A reader can state the main finding before exploring details", "Every metric exposes unit and time context", "Every visualization has labels and a useful text equivalent"]
  })
];

export function findStyleSkill(id: string) { return styleSkills.find(item => item.id === id); }
