const FORGE_VERSION = "1.0.0";
const GENERATED_KEY = "forge.terrain.generated";
const GENERATED_VALUE = "true";

const PAGE_NAMES = [
  "00 Cover",
  "01 Foundations",
  "02 Web Components",
  "03 Public Site",
  "04 Web Application",
  "05 Focus Mode",
  "06 iOS Components",
  "07 iOS Application",
  "08 States and Accessibility",
  "09 Archive",
];

const C = {
  light: {
    bg: "#F4F7F1",
    deep: "#EEF3ED",
    surface: "#FBFDF8",
    strong: "#E4EBE4",
    line: "#CDD9D0",
    lineStrong: "#98AA9E",
    ink: "#102019",
    muted: "#56645D",
    dim: "#68766E",
    learner: "#F0643B",
    learnerStrong: "#A93C20",
    ai: "#2F66D8",
    aiStrong: "#174EAE",
    tested: "#2C8A61",
    testedStrong: "#185F43",
    focus: "#145BD7",
  },
  dark: {
    bg: "#071722",
    deep: "#06131D",
    surface: "#0D202B",
    strong: "#142A35",
    line: "#29414B",
    lineStrong: "#44606A",
    ink: "#F3F7F0",
    muted: "#A8B9B1",
    dim: "#82958B",
    learner: "#FF8059",
    learnerStrong: "#FF9B7B",
    ai: "#85AAFF",
    aiStrong: "#6F96EE",
    tested: "#79C995",
    testedStrong: "#67BD84",
    focus: "#8FB0FF",
  },
  scene: {
    cobalt: "#114FCF",
    cobaltDeep: "#082E83",
    alpine: "#17643C",
    grass: "#55A447",
    ember: "#F0643B",
    peach: "#F2AD80",
    ivory: "#F4F7F1",
    midnight: "#071722",
  },
};

const SEMANTIC_TOKENS = [
  ["color/bg/default", "bg", "--forge-bg", "ForgeTerrainColor.background", "Main canvas"],
  ["color/bg/deep", "deep", "--forge-bg-deep", "ForgeTerrainColor.backgroundDeep", "Deep canvas"],
  ["color/surface/default", "surface", "--forge-surface", "ForgeTerrainColor.surface", "Work surface"],
  ["color/surface/strong", "strong", "--forge-surface-strong", "ForgeTerrainColor.surfaceStrong", "Emphasis surface"],
  ["color/border/default", "line", "--forge-line", "ForgeTerrainColor.border", "Boundary"],
  ["color/border/strong", "lineStrong", "--forge-line-strong", "ForgeTerrainColor.borderStrong", "Strong boundary"],
  ["color/text/default", "ink", "--forge-ink", "ForgeTerrainColor.text", "Main text"],
  ["color/text/muted", "muted", "--forge-muted", "ForgeTerrainColor.textMuted", "Supporting text"],
  ["color/text/dim", "dim", "--forge-dim", "ForgeTerrainColor.textDim", "Secondary metadata"],
  ["color/action/learner", "learner", "--forge-amber", "ForgeTerrainColor.learnerAction", "Learner commitment"],
  ["color/action/learner-strong", "learnerStrong", "--forge-amber-deep", "ForgeTerrainColor.learnerActionStrong", "Strong learner state"],
  ["color/contribution/ai", "ai", "--forge-violet", "ForgeTerrainColor.aiContribution", "Disclosed AI contribution"],
  ["color/contribution/ai-strong", "aiStrong", "--forge-violet-deep", "ForgeTerrainColor.aiContributionStrong", "Strong AI state"],
  ["color/evidence/tested", "tested", "--forge-cyan", "ForgeTerrainColor.testedEvidence", "Tested consequence"],
  ["color/evidence/tested-strong", "testedStrong", "--forge-cyan-deep", "ForgeTerrainColor.testedEvidenceStrong", "Strong tested state"],
  ["color/focus", "focus", "--forge-focus", "ForgeTerrainColor.focus", "Keyboard and assistive focus"],
];

const FLOAT_TOKENS = [
  ["space/1", 4, ["GAP"]],
  ["space/2", 8, ["GAP"]],
  ["space/3", 12, ["GAP"]],
  ["space/4", 16, ["GAP"]],
  ["space/5", 24, ["GAP"]],
  ["space/6", 32, ["GAP"]],
  ["space/7", 48, ["GAP"]],
  ["space/8", 64, ["GAP"]],
  ["radius/sm", 6, ["CORNER_RADIUS"]],
  ["radius/md", 12, ["CORNER_RADIUS"]],
  ["target/minimum", 44, ["WIDTH_HEIGHT"]],
  ["layout/mobileMinimum", 320, ["WIDTH_HEIGHT"]],
  ["layout/contentMaximum", 1280, ["WIDTH_HEIGHT"]],
  ["layout/iosMargin", 16, ["WIDTH_HEIGHT"]],
  ["layout/iosSection", 24, ["WIDTH_HEIGHT"]],
  ["motion/control", 180, []],
  ["motion/surface", 240, []],
  ["motion/scene", 450, []],
];

const STRING_TOKENS = [
  ["typeface/interface", "Geist", ["FONT_FAMILY"]],
  ["typeface/mono", "Geist Mono", ["FONT_FAMILY"]],
  ["typeface/reflection", "Libre Baskerville", ["FONT_FAMILY"]],
  ["typeface/ios", "SF Pro", ["FONT_FAMILY"]],
];

const TEXT_STYLE_SPECS = [
  ["Web/Display/Hero", "display", 96, 92, -4],
  ["Web/Display/Page", "display", 60, 60, -3],
  ["Web/Heading/Section", "display", 36, 42, -2],
  ["Web/Heading/Item", "medium", 24, 30, -1],
  ["Web/Body/Large", "regular", 18, 28, 0],
  ["Web/Body/Default", "regular", 16, 25, 0],
  ["Web/Body/Small", "regular", 14, 21, 0],
  ["Web/Label/Default", "medium", 14, 18, 1],
  ["Web/Label/Mono", "mono", 12, 16, 4],
  ["Web/Reflection/Prompt", "reflection", 24, 36, 0],
  ["iOS/Large Title", "iosDisplay", 34, 41, -1],
  ["iOS/Title", "iosDisplay", 28, 34, -1],
  ["iOS/Title 3", "iosMedium", 20, 25, 0],
  ["iOS/Body", "ios", 17, 22, 0],
  ["iOS/Subheadline", "ios", 15, 20, 0],
  ["iOS/Callout", "iosMedium", 16, 21, 0],
  ["iOS/Caption", "ios", 12, 16, 0],
  ["iOS/Technical", "mono", 12, 16, 2],
];

const PUBLIC_SCREENS = [
  ["PUB-01", "/", "Scenic goal entry", "Start one goal", "hero", "dark"],
  ["PUB-02", "/start", "Goal clarification", "Review goal interpretation", "start", "light"],
  ["PUB-03", "/paths", "Reviewed paths", "Inspect one path", "directory", "light"],
  ["PUB-04", "/paths/[slug]", "Path detail", "Start the next valid action", "path", "dark"],
  ["PUB-05", "/how-forge-works", "Method narrative", "Shape one goal", "method", "light"],
  ["PUB-07", "/trust", "Evidence and trust", "Inspect one contract", "trust", "dark"],
];

const APP_SCREENS = [
  ["APP-01", "/app", "Today", "Start or resume one action", "today", "dark"],
  ["APP-04", "/app/paths/[recordId]", "Path detail", "Start the next valid activity", "appPath", "light"],
  ["APP-05", "/app/study", "Action brief", "Start one attempt", "brief", "light"],
  ["APP-09", "/app/evidence", "Evidence ledger", "Inspect one record", "evidence", "dark"],
  ["APP-11", "/app/returns", "Return queue", "Open one due return", "returns", "light"],
  ["APP-08", "/app/projects/[projectId]", "Project workspace", "Perform the current stage", "project", "dark"],
];

const FOCUS_SCREENS = [
  ["FOCUS-01", "/focus/activity/[sessionId]", "Concentrated activity", "Perform the current operation", "activity", "light"],
  ["FOCUS-02", "/focus/modelshift/[sessionId]", "ModelShift protocol", "Commit, investigate, reconstruct, or prove", "modelshift", "dark"],
  ["FOCUS-03", "/learn/[world]", "Bounded guest World", "Perform the current operation", "world", "dark"],
];

const IOS_SCREENS = [
  ["IOS-01", "Welcome", "Goal entry", "Enter one goal", "welcome", "dark"],
  ["IOS-04", "Today tab", "Today", "Start or resume one action", "iosToday", "light"],
  ["IOS-08", "Focus", "Attempt", "Commit learner work", "attempt", "light"],
  ["IOS-09", "Focus", "Repair", "Use one bounded scaffold", "repair", "dark"],
  ["IOS-10", "Focus", "Protected proof", "Submit independent work", "proof", "light"],
  ["IOS-14", "Today", "Delayed return", "Submit delayed work", "return", "dark"],
];

const CANONICAL_COVERAGE = {
  public: [
    ["PUB-01", "/", "Scenic goal entry"],
    ["PUB-02", "/start", "Goal clarification"],
    ["PUB-03", "/paths", "Reviewed paths"],
    ["PUB-04", "/paths/[slug]", "Path detail"],
    ["PUB-05", "/how-forge-works", "Method narrative"],
    ["PUB-06", "/modelshift", "ModelShift method"],
    ["PUB-07", "/trust", "Evidence and trust"],
    ["PUB-08", "/trust/evidence", "Evidence contract"],
    ["PUB-09", "/coverage", "Coverage map"],
    ["PUB-10", "/pricing", "Honest availability"],
    ["PUB-11", "/sign-in", "Optional continuity"],
  ],
  app: [
    ["APP-01", "/app", "Today"],
    ["APP-02", "/app/goals", "Goal collection"],
    ["APP-03", "/app/paths", "Path collection"],
    ["APP-04", "/app/paths/[recordId]", "Path detail"],
    ["APP-05", "/app/study", "Action brief"],
    ["APP-06", "/app/study/[sessionId]", "Focus session"],
    ["APP-07", "/app/projects", "Project collection"],
    ["APP-08", "/app/projects/[projectId]", "Project workspace"],
    ["APP-09", "/app/evidence", "Evidence ledger"],
    ["APP-10", "/app/evidence/[evidenceId]", "Evidence detail"],
    ["APP-11", "/app/returns", "Return queue"],
    ["APP-12", "/app/returns/[returnId]", "Protected return"],
    ["APP-13", "/app/library", "Resource library"],
    ["APP-14", "/app/settings", "Account and data"],
  ],
  focus: [
    ["FOCUS-01", "/focus/activity/[sessionId]", "Concentrated activity"],
    ["FOCUS-02", "/focus/modelshift/[sessionId]", "ModelShift protocol"],
    ["FOCUS-03", "/learn/[world]", "Bounded guest World"],
  ],
  ios: [
    ["IOS-01", "Welcome", "Goal entry"],
    ["IOS-02", "Entry", "Clarify goal"],
    ["IOS-03", "Entry", "Path preview"],
    ["IOS-04", "Today tab", "Today"],
    ["IOS-05", "Paths tab", "Path collection"],
    ["IOS-06", "Paths tab", "Path detail"],
    ["IOS-07", "Today or path", "Action brief"],
    ["IOS-08", "Focus", "Attempt"],
    ["IOS-09", "Focus", "Repair"],
    ["IOS-10", "Focus", "Protected proof"],
    ["IOS-11", "Evidence tab", "Evidence collection"],
    ["IOS-12", "Evidence tab", "Evidence detail"],
    ["IOS-13", "Today", "Return queue"],
    ["IOS-14", "Today", "Delayed return"],
    ["IOS-15", "Projects tab", "Project collection"],
    ["IOS-16", "Projects tab", "Project workspace"],
    ["IOS-17", "Account route", "Resource library"],
    ["IOS-18", "Account route", "Settings and data"],
  ],
};

const REPRESENTATIVE_IDS = new Set(
  [...PUBLIC_SCREENS, ...APP_SCREENS, ...FOCUS_SCREENS, ...IOS_SCREENS]
    .map(([id]) => id),
);

const SHARED_STATES = [
  ["Loading", "Preparing the current work.", "Wait or exit safely."],
  ["Empty", "No next action is ready.", "Shape a goal or stop."],
  ["Offline", "The network is unavailable.", "Continue with the local draft."],
  ["Stale", "A newer version exists.", "Review the change before continuing."],
  ["Partial", "Some source details are missing.", "Inspect the visible limit."],
  ["Permission denied", "This record is not available.", "Return to a safe surface."],
  ["Expired", "The attempt window has closed.", "Create a new attempt."],
  ["Error", "The work did not save.", "Retry or export the local draft."],
];

let FONT = {};
const RECEIPT = {
  version: FORGE_VERSION,
  pages: [],
  collections: [],
  variables: [],
  textStyles: [],
  paintStyles: [],
  effectStyles: [],
  components: [],
  frames: [],
};

function rgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

function solid(hex, opacity = 1) {
  return { type: "SOLID", color: rgb(hex), opacity };
}

function mark(node) {
  node.setPluginData(GENERATED_KEY, GENERATED_VALUE);
  return node;
}

function remember(kind, node) {
  RECEIPT[kind].push({ id: node.id, name: node.name });
  return node;
}

function setScope(variable, scopes) {
  try {
    variable.scopes = scopes;
  } catch {
    variable.scopes = [];
  }
}

function semanticScopes(name) {
  if (name.includes("/border/") || name === "color/focus") return ["STROKE_COLOR"];
  if (name.includes("/text/")) return ["TEXT_FILL"];
  if (name.includes("/action/") || name.includes("/contribution/") || name.includes("/evidence/")) {
    return ["FILL_COLOR", "STROKE_COLOR", "TEXT_FILL"];
  }
  return ["FILL_COLOR"];
}

async function resolveFont(fonts, families, styles) {
  for (const family of families) {
    for (const style of styles) {
      const match = fonts.find(
        (item) => item.fontName.family.toLowerCase() === family.toLowerCase()
          && item.fontName.style.toLowerCase() === style.toLowerCase(),
      );
      if (match) {
        await figma.loadFontAsync(match.fontName);
        return match.fontName;
      }
    }
  }
  const fallback = { family: "Inter", style: "Regular" };
  await figma.loadFontAsync(fallback);
  return fallback;
}

async function loadFonts() {
  const available = await figma.listAvailableFontsAsync();
  FONT = {
    regular: await resolveFont(available, ["Geist", "Inter"], ["Regular"]),
    medium: await resolveFont(available, ["Geist", "Inter"], ["Semi Bold", "Semibold", "Medium", "Regular"]),
    display: await resolveFont(available, ["Geist", "Inter"], ["Medium", "Semi Bold", "Semibold", "Regular"]),
    mono: await resolveFont(available, ["Geist Mono", "SF Mono", "Roboto Mono"], ["Regular"]),
    reflection: await resolveFont(available, ["Libre Baskerville", "Georgia", "Inter"], ["Regular"]),
    ios: await resolveFont(available, ["SF Pro", "SF Pro Text", "Inter"], ["Regular"]),
    iosMedium: await resolveFont(available, ["SF Pro", "SF Pro Text", "Inter"], ["Semibold", "Semi Bold", "Medium", "Regular"]),
    iosDisplay: await resolveFont(available, ["SF Pro Display", "SF Pro", "Inter"], ["Semibold", "Semi Bold", "Medium", "Regular"]),
  };
}

function addText(parent, value, x, y, width, size, color, options = {}) {
  const node = figma.createText();
  node.name = options.name || value.slice(0, 48);
  node.fontName = options.font || FONT.regular;
  node.characters = value;
  node.fontSize = size;
  node.lineHeight = { unit: "PIXELS", value: options.lineHeight || Math.round(size * 1.25) };
  node.letterSpacing = { unit: "PERCENT", value: options.letterSpacing || 0 };
  node.fills = [solid(color)];
  node.textAutoResize = "HEIGHT";
  node.resize(width, Math.max(size * 1.3, 24));
  node.x = x;
  node.y = y;
  if (options.align) node.textAlignHorizontal = options.align;
  if (options.case === "UPPER") node.textCase = "UPPER";
  if (options.opacity !== undefined) node.opacity = options.opacity;
  parent.appendChild(node);
  return node;
}

function addRect(parent, name, x, y, width, height, color, radius = 0, opacity = 1) {
  const node = figma.createRectangle();
  node.name = name;
  node.resize(width, height);
  node.x = x;
  node.y = y;
  node.fills = [solid(color, opacity)];
  node.cornerRadius = radius;
  parent.appendChild(node);
  return node;
}

function addLine(parent, x, y, width, color, opacity = 1) {
  return addRect(parent, "Divider", x, y, width, 1, color, 0, opacity);
}

function addFrame(parent, name, x, y, width, height, color, radius = 0) {
  const node = figma.createFrame();
  node.name = name;
  node.resize(width, height);
  node.x = x;
  node.y = y;
  node.fills = [solid(color)];
  node.cornerRadius = radius;
  node.clipsContent = true;
  parent.appendChild(node);
  return node;
}

function addPill(parent, label, x, y, colors, tone = "quiet") {
  const toneColor = tone === "learner" ? colors.learner : tone === "ai" ? colors.ai : tone === "tested" ? colors.tested : colors.muted;
  const width = Math.max(92, label.length * 7.2 + 28);
  const frame = addFrame(parent, `Status / ${label}`, x, y, width, 30, colors.surface, 6);
  frame.strokes = [solid(toneColor)];
  frame.strokeWeight = 1;
  addText(frame, label, 14, 7, width - 28, 11, toneColor, {
    font: FONT.mono,
    lineHeight: 14,
    letterSpacing: 3,
    case: "UPPER",
  });
  return frame;
}

function addButton(parent, label, x, y, colors, secondary = false, width = 184) {
  const frame = addFrame(parent, `Button / ${secondary ? "Secondary" : "Primary"}`, x, y, width, 48, secondary ? colors.surface : colors.learner, 6);
  if (secondary) {
    frame.strokes = [solid(colors.lineStrong)];
    frame.strokeWeight = 1;
  }
  addText(frame, `${label}  →`, 16, 14, width - 32, 14, secondary ? colors.ink : C.scene.ivory, {
    font: FONT.medium,
    lineHeight: 18,
  });
  return frame;
}

function addInput(parent, placeholder, x, y, width, colors) {
  const frame = addFrame(parent, "Text input", x, y, width, 56, colors.surface, 6);
  frame.strokes = [solid(colors.lineStrong)];
  frame.strokeWeight = 1;
  addText(frame, placeholder, 16, 17, width - 32, 15, colors.muted, { lineHeight: 20 });
  return frame;
}

function addNav(frame, colors, app = false) {
  addText(frame, "FORGE", 48, 30, 120, 18, colors.ink, {
    font: FONT.medium,
    lineHeight: 22,
    letterSpacing: 4,
  });
  const items = app
    ? ["Today", "Paths", "Projects", "Evidence", "Account"]
    : ["Paths", "How FORGE works", "Evidence and trust", "Sign in"];
  let x = app ? 430 : 620;
  for (const item of items) {
    addText(frame, item, x, 33, 150, 13, colors.muted, { lineHeight: 18 });
    x += item.length * 7.2 + 38;
  }
  addLine(frame, 48, 76, frame.width - 96, colors.line, 0.8);
}

function addTerrain(frame, top = 0, height = frame.height, dark = true) {
  const sky = addRect(frame, "Cobalt sky", 0, top, frame.width, height, dark ? C.scene.cobaltDeep : C.scene.cobalt);
  sky.fills = [{
    type: "GRADIENT_LINEAR",
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { ...rgb(dark ? C.scene.cobaltDeep : "#477CE3"), a: 1 } },
      { position: 1, color: { ...rgb(C.scene.cobalt), a: 1 } },
    ],
  }];

  const hillBack = figma.createEllipse();
  hillBack.name = "Alpine ridge";
  hillBack.resize(frame.width * 0.92, height * 0.66);
  hillBack.x = frame.width * 0.28;
  hillBack.y = top + height * 0.55;
  hillBack.fills = [solid(dark ? "#0B3625" : C.scene.alpine)];
  frame.appendChild(hillBack);

  const hillFront = figma.createEllipse();
  hillFront.name = "Field ridge";
  hillFront.resize(frame.width * 1.18, height * 0.7);
  hillFront.x = -frame.width * 0.28;
  hillFront.y = top + height * 0.64;
  hillFront.fills = [solid(dark ? "#061D17" : "#237343")];
  frame.appendChild(hillFront);

  const path = figma.createEllipse();
  path.name = "Ember path";
  path.resize(frame.width * 0.22, height * 0.48);
  path.x = frame.width * 0.43;
  path.y = top + height * 0.82;
  path.rotation = -18;
  path.fills = [solid(C.scene.ember, 0.9)];
  frame.appendChild(path);

  for (let index = 0; index < 28; index += 1) {
    const grain = figma.createEllipse();
    grain.name = "Static grain";
    const size = 1 + (index % 3);
    grain.resize(size, size);
    grain.x = (index * 79) % frame.width;
    grain.y = top + ((index * 47) % Math.max(1, height));
    grain.fills = [solid(C.scene.ivory, 0.18)];
    frame.appendChild(grain);
  }
}

function addMeta(parent, screen, x, y, width, colors) {
  addText(parent, screen[0], x, y, 110, 12, colors.tested, {
    font: FONT.mono,
    lineHeight: 16,
    letterSpacing: 4,
  });
  addText(parent, screen[2], x + 124, y - 2, width - 410, 20, colors.ink, {
    font: FONT.medium,
    lineHeight: 26,
  });
  addText(parent, screen[1], x + width - 260, y, 260, 12, colors.muted, {
    font: FONT.mono,
    lineHeight: 16,
    align: "RIGHT",
  });
  addText(parent, `Dominant action: ${screen[3]}`, x, y + 32, width, 13, colors.muted, {
    lineHeight: 18,
  });
}

function makeBoard(page, screen, index, width, height, mode = "light") {
  const colors = C[mode];
  const column = index % 2;
  const row = Math.floor(index / 2);
  const boardX = column * (width + 120);
  const boardY = row * (height + 210);
  const board = mark(addFrame(page, `${screen[0]} / ${screen[2]}`, boardX, boardY, width, height + 96, colors.bg, 0));
  board.clipsContent = false;
  addMeta(board, screen, 0, 0, width, colors);
  const viewport = addFrame(board, `${screen[0]} Viewport`, 0, 96, width, height, colors.bg, 12);
  viewport.strokes = [solid(colors.lineStrong)];
  viewport.strokeWeight = 1;
  remember("frames", viewport);
  return { board, viewport, colors };
}

function createPage(name) {
  let page = figma.root.children.find((item) => item.type === "PAGE" && item.name === name);
  if (!page) {
    page = figma.createPage();
    page.name = name;
  }
  return page;
}

function clearGenerated(page) {
  for (const node of [...page.children]) {
    if (node.getPluginData(GENERATED_KEY) === GENERATED_VALUE) node.remove();
  }
}

async function ensureVariable(existing, collection, name, type) {
  let variable = existing.find((item) => item.variableCollectionId === collection.id && item.name === name);
  if (variable && variable.resolvedType !== type) {
    variable.remove();
    variable = undefined;
  }
  if (!variable) {
    variable = figma.variables.createVariable(name, collection, type);
    existing.push(variable);
  }
  return variable;
}

async function buildVariables() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();

  const ensureCollection = (name) => {
    let collection = collections.find((item) => item.name === name);
    if (!collection) {
      collection = figma.variables.createVariableCollection(name);
      collections.push(collection);
    }
    collection.renameMode(collection.defaultModeId, "Value");
    remember("collections", collection);
    return collection;
  };

  const primitive = ensureCollection("FORGE / Primitive");
  const semanticLight = ensureCollection("FORGE / Semantic / Light");
  const semanticDark = ensureCollection("FORGE / Semantic / Dark");

  const primitiveByKey = {};

  for (const [name, value, scopes] of FLOAT_TOKENS) {
    const variable = await ensureVariable(variables, primitive, name, "FLOAT");
    variable.description = name.startsWith("motion/") ? "Duration in milliseconds" : "FORGE Terrain primitive";
    setScope(variable, scopes);
    variable.setValueForMode(primitive.defaultModeId, value);
    primitiveByKey[name] = variable;
    remember("variables", variable);
  }

  for (const [name, value, scopes] of STRING_TOKENS) {
    const variable = await ensureVariable(variables, primitive, name, "STRING");
    variable.description = "FORGE Terrain typeface";
    setScope(variable, scopes);
    variable.setValueForMode(primitive.defaultModeId, value);
    primitiveByKey[name] = variable;
    remember("variables", variable);
  }

  for (const mode of ["light", "dark"]) {
    for (const [semanticName, key, cssName, swiftName, meaning] of SEMANTIC_TOKENS) {
      const primitiveName = `color/primitive/${mode}/${semanticName.replace("color/", "")}`;
      const primitiveVariable = await ensureVariable(variables, primitive, primitiveName, "COLOR");
      primitiveVariable.description = `${mode[0].toUpperCase()}${mode.slice(1)} ${meaning.toLowerCase()}`;
      setScope(primitiveVariable, semanticScopes(semanticName));
      primitiveVariable.setValueForMode(primitive.defaultModeId, rgb(C[mode][key]));
      primitiveByKey[`${mode}:${semanticName}`] = primitiveVariable;
      remember("variables", primitiveVariable);

      const semanticCollection = mode === "light" ? semanticLight : semanticDark;
      const semanticVariable = await ensureVariable(variables, semanticCollection, semanticName, "COLOR");
      semanticVariable.description = `${meaning}. ${mode[0].toUpperCase()}${mode.slice(1)} appearance.`;
      setScope(semanticVariable, semanticScopes(semanticName));
      semanticVariable.setValueForMode(
        semanticCollection.defaultModeId,
        figma.variables.createVariableAlias(primitiveVariable),
      );
      if (typeof semanticVariable.setVariableCodeSyntax === "function") {
        try {
          semanticVariable.setVariableCodeSyntax("WEB", cssName);
          semanticVariable.setVariableCodeSyntax("iOS", swiftName);
        } catch {
          // Code syntax support differs by plan. The source map remains canonical.
        }
      }
      remember("variables", semanticVariable);
    }
  }

  return { primitive, semanticLight, semanticDark, primitiveByKey };
}

async function buildTextStyles() {
  const existing = await figma.getLocalTextStylesAsync();
  for (const [name, fontKey, size, lineHeight, letterSpacing] of TEXT_STYLE_SPECS) {
    let style = existing.find((item) => item.name === name);
    if (!style) style = figma.createTextStyle();
    style.name = name;
    style.description = `FORGE Terrain ${name}.`;
    style.fontName = FONT[fontKey];
    style.fontSize = size;
    style.lineHeight = { unit: "PIXELS", value: lineHeight };
    style.letterSpacing = { unit: "PERCENT", value: letterSpacing };
    remember("textStyles", style);
  }
}

async function buildPaintStyles() {
  const existing = await figma.getLocalPaintStylesAsync();
  const specs = [
    ["Scene/Horizon Cobalt", C.scene.cobalt],
    ["Scene/Field Alpine", C.scene.alpine],
    ["Scene/Threshold Ember", C.scene.ember],
    ["Authority/Learner", C.light.learner],
    ["Authority/AI Contribution", C.light.ai],
    ["Authority/Tested Evidence", C.light.tested],
    ["Authority/Quiet", C.light.muted],
  ];
  for (const [name, color] of specs) {
    let style = existing.find((item) => item.name === name);
    if (!style) style = figma.createPaintStyle();
    style.name = name;
    style.description = `FORGE Terrain ${name}.`;
    style.paints = [solid(color)];
    remember("paintStyles", style);
  }
}

async function buildEffectStyles() {
  const existing = await figma.getLocalEffectStylesAsync();
  const specs = [
    ["Elevation/Quiet", { x: 0, y: 12 }, 32, 0.12],
    ["Elevation/Floating", { x: 0, y: 28 }, 80, 0.18],
  ];
  for (const [name, offset, radius, opacity] of specs) {
    let style = existing.find((item) => item.name === name);
    if (!style) style = figma.createEffectStyle();
    style.name = name;
    style.description = "Use this effect only for real hierarchy.";
    style.effects = [{
      type: "DROP_SHADOW",
      color: { ...rgb(C.scene.midnight), a: opacity },
      offset,
      radius,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    }];
    remember("effectStyles", style);
  }
}

function createCover(page) {
  const frame = mark(addFrame(page, "FORGE Terrain / Cover", 0, 0, 1600, 1000, C.scene.cobaltDeep));
  addTerrain(frame, 0, 1000, true);
  addText(frame, "FORGE TERRAIN", 72, 62, 420, 16, C.scene.ivory, {
    font: FONT.mono,
    lineHeight: 20,
    letterSpacing: 10,
  });
  addText(frame, "Vivid at thresholds.\nQuiet during work.", 72, 230, 900, 92, C.scene.ivory, {
    font: FONT.display,
    lineHeight: 88,
    letterSpacing: -4,
  });
  addText(frame, "A complete product system for the public site, web application, focus mode, and iOS.", 76, 448, 680, 20, C.scene.ivory, {
    lineHeight: 30,
    opacity: 0.86,
  });
  addPill(frame, "Learner acts", 76, 548, C.dark, "learner");
  addPill(frame, "AI assists", 210, 548, C.dark, "ai");
  addPill(frame, "Evidence decides", 326, 548, C.dark, "tested");
  addText(frame, "Recall  →  Attempt  →  Repair  →  Prove  →  Return", 76, 630, 760, 14, C.scene.ivory, {
    font: FONT.mono,
    lineHeight: 20,
    letterSpacing: 3,
  });
  addText(frame, `Version ${FORGE_VERSION}  •  2026-08-01  •  Implementation-linked source`, 76, 914, 720, 12, C.scene.ivory, {
    font: FONT.mono,
    lineHeight: 16,
    opacity: 0.72,
  });
  remember("frames", frame);
}

function createFoundations(page) {
  const board = mark(addFrame(page, "FORGE Terrain / Foundations", 0, 0, 1600, 2200, C.light.bg));
  addText(board, "01 / FOUNDATIONS", 64, 56, 360, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  addText(board, "One system.\nFour surface modes.", 64, 104, 880, 72, C.light.ink, {
    font: FONT.display,
    lineHeight: 70,
    letterSpacing: -3,
  });
  addText(board, "Horizon introduces. Field supports work. Ledger proves. Threshold asks for deliberate commitment.", 64, 280, 760, 18, C.light.muted, {
    lineHeight: 28,
  });

  const swatches = [
    ["Vivid cobalt", C.scene.cobalt],
    ["Alpine green", C.scene.alpine],
    ["Signal orange", C.scene.ember],
    ["Warm ivory", C.scene.ivory],
    ["Midnight", C.scene.midnight],
  ];
  swatches.forEach(([label, value], index) => {
    const x = 64 + index * 286;
    addRect(board, label, x, 390, 254, 180, value, 12);
    addText(board, label, x, 590, 254, 15, C.light.ink, { font: FONT.medium, lineHeight: 20 });
    addText(board, value, x, 618, 254, 12, C.light.muted, { font: FONT.mono, lineHeight: 16 });
  });

  addText(board, "Typography", 64, 720, 300, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  addText(board, "Make the hard idea feel clear.", 64, 764, 930, 68, C.light.ink, {
    font: FONT.display,
    lineHeight: 70,
    letterSpacing: -3,
  });
  addText(board, "The learner should attempt one useful operation before instructional help becomes available.", 68, 864, 680, 20, C.light.muted, {
    lineHeight: 32,
  });
  addText(board, "SOURCE  •  PATH-V3  •  REVIEWED  •  LIMITED CLAIM", 68, 960, 760, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 4,
  });
  addText(board, "“What changed in your model after the result?”", 68, 1042, 800, 30, C.light.ink, {
    font: FONT.reflection,
    lineHeight: 42,
  });

  addText(board, "Authority is visible", 64, 1200, 500, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  const authority = [
    ["LEARNER COMMITMENT", C.light.learner, "The learner submits or commits work."],
    ["AI CONTRIBUTION", C.light.ai, "The system discloses generated or transformed content."],
    ["TESTED EVIDENCE", C.light.tested, "A reviewed consequence supports a bounded claim."],
    ["QUIET SUPPORT", C.light.muted, "A neutral surface explains or recovers."],
  ];
  authority.forEach(([label, color, body], index) => {
    const x = 64 + (index % 2) * 748;
    const y = 1248 + Math.floor(index / 2) * 180;
    const card = addFrame(board, label, x, y, 716, 150, C.light.surface, 12);
    card.strokes = [solid(color)];
    card.strokeWeight = 1;
    addText(card, label, 24, 24, 650, 12, color, { font: FONT.mono, lineHeight: 16, letterSpacing: 4 });
    addText(card, body, 24, 62, 650, 17, C.light.ink, { lineHeight: 26 });
  });

  addText(board, "Shape, space, and motion", 64, 1650, 600, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  [4, 8, 12, 16, 24, 32, 48, 64].forEach((space, index) => {
    const x = 64 + index * 170;
    addRect(board, `Space ${space}`, x, 1700, space, 80, C.light.ai, 2);
    addText(board, `${space}`, x, 1794, 120, 12, C.light.muted, { font: FONT.mono, lineHeight: 16 });
  });
  addRect(board, "Radius 6", 64, 1900, 220, 120, C.light.strong, 6);
  addRect(board, "Radius 12", 316, 1900, 220, 120, C.light.strong, 12);
  addText(board, "6 px controls", 64, 2040, 220, 14, C.light.muted, { lineHeight: 20 });
  addText(board, "12 px panels", 316, 2040, 220, 14, C.light.muted, { lineHeight: 20 });
  addText(board, "180 ms control  •  240 ms surface  •  450 ms scene", 650, 1932, 800, 16, C.light.ink, {
    font: FONT.mono,
    lineHeight: 24,
  });
  addText(board, "Motion explains causality. Reduced Motion removes decorative movement.", 650, 1980, 740, 17, C.light.muted, {
    lineHeight: 28,
  });
  remember("frames", board);
}

function createComponentFrame(page, name, x, y, width, height, colors, radius = 6) {
  const node = figma.createComponent();
  node.name = name;
  node.resize(width, height);
  node.x = x;
  node.y = y;
  node.fills = [solid(colors.surface)];
  node.cornerRadius = radius;
  node.clipsContent = true;
  page.appendChild(node);
  mark(node);
  remember("components", node);
  return node;
}

function createWebComponents(page) {
  const intro = mark(addFrame(page, "Web components / Introduction", 0, 0, 1600, 360, C.light.bg));
  addText(intro, "02 / WEB COMPONENTS", 64, 56, 400, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  addText(intro, "One action.\nVisible authority.", 64, 104, 740, 64, C.light.ink, {
    font: FONT.display,
    lineHeight: 62,
    letterSpacing: -3,
  });
  addText(intro, "Every pattern has a dominant action, a safe recovery, and a visible evidence boundary.", 860, 150, 620, 18, C.light.muted, {
    lineHeight: 28,
  });
  remember("frames", intro);

  const buttonComponents = [];
  const buttonSpecs = [
    ["Intent=Primary, State=Default", "Start attempt  →", C.light.learner, C.scene.ivory],
    ["Intent=Primary, State=Disabled", "Start attempt", C.light.strong, C.light.dim],
    ["Intent=Secondary, State=Default", "Save and exit", C.light.surface, C.light.ink],
    ["Intent=Quiet, State=Default", "Inspect source", C.light.bg, C.light.muted],
  ];
  buttonSpecs.forEach(([name, label, fill, textColor], index) => {
    const component = createComponentFrame(page, name, 64 + index * 300, 460, 252, 52, C.light, 6);
    component.fills = [solid(fill)];
    component.strokes = [solid(index === 2 ? C.light.lineStrong : fill)];
    component.strokeWeight = 1;
    addText(component, label, 18, 16, 216, 14, textColor, { font: FONT.medium, lineHeight: 19 });
    buttonComponents.push(component);
  });
  try {
    const set = figma.combineAsVariants(buttonComponents, page);
    set.name = "Button";
    set.x = 64;
    set.y = 430;
    mark(set);
    remember("components", set);
  } catch {
    // Individual components remain valid if variants are unavailable.
  }

  const input = createComponentFrame(page, "Text input / State=Default", 64, 650, 560, 92, C.light, 6);
  input.strokes = [solid(C.light.lineStrong)];
  input.strokeWeight = 1;
  addText(input, "LEARNING GOAL", 16, 12, 520, 11, C.light.muted, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 4,
  });
  addText(input, "I want to understand why this method works.", 16, 44, 520, 16, C.light.ink, {
    lineHeight: 22,
  });

  const choice = createComponentFrame(page, "Choice row / State=Selected", 690, 650, 620, 92, C.light, 6);
  choice.fills = [solid(C.light.strong)];
  choice.strokes = [solid(C.light.ai)];
  choice.strokeWeight = 2;
  addRect(choice, "Selection marker", 18, 28, 20, 20, C.light.ai, 10);
  addText(choice, "Explain the method and use it in a new case.", 56, 22, 530, 16, C.light.ink, {
    font: FONT.medium,
    lineHeight: 24,
  });

  const status = createComponentFrame(page, "Status label / Tone=Tested", 64, 850, 240, 38, C.light, 6);
  status.strokes = [solid(C.light.tested)];
  status.strokeWeight = 1;
  addText(status, "REVIEWED  •  V3", 14, 11, 210, 11, C.light.tested, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 3,
  });

  const receipt = createComponentFrame(page, "Source receipt", 350, 830, 600, 170, C.light, 12);
  receipt.strokes = [solid(C.light.line)];
  receipt.strokeWeight = 1;
  addText(receipt, "SOURCE RECEIPT", 22, 20, 540, 11, C.light.tested, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 4,
  });
  addText(receipt, "Primary study and reviewed replication", 22, 56, 540, 18, C.light.ink, {
    font: FONT.medium,
    lineHeight: 24,
  });
  addText(receipt, "Supports the stated mechanism. Does not establish universal transfer.", 22, 94, 540, 14, C.light.muted, {
    lineHeight: 22,
  });
  addText(receipt, "INSPECT PROVENANCE  →", 22, 138, 540, 11, C.light.ai, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 3,
  });

  const boundary = createComponentFrame(page, "Evidence boundary", 1000, 830, 536, 170, C.dark, 12);
  boundary.fills = [solid(C.dark.surface)];
  boundary.strokes = [solid(C.dark.tested)];
  boundary.strokeWeight = 1;
  addText(boundary, "WHAT THIS SUPPORTS", 22, 20, 490, 11, C.dark.tested, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 4,
  });
  addText(boundary, "Independent use under the recorded conditions.", 22, 56, 490, 18, C.dark.ink, {
    font: FONT.medium,
    lineHeight: 25,
  });
  addText(boundary, "Not yet tested after a delayed return.", 22, 112, 490, 14, C.dark.muted, {
    lineHeight: 22,
  });

  const next = createComponentFrame(page, "Next action", 64, 1100, 880, 270, C.dark, 12);
  next.fills = [solid(C.dark.surface)];
  next.strokes = [solid(C.dark.line)];
  next.strokeWeight = 1;
  addPill(next, "12 min", 24, 24, C.dark, "quiet");
  addPill(next, "Learner attempt", 130, 24, C.dark, "learner");
  addText(next, "Explain why the model fails in the second case.", 24, 82, 810, 30, C.dark.ink, {
    font: FONT.display,
    lineHeight: 36,
    letterSpacing: -1,
  });
  addText(next, "This is next because the first explanation used the result but did not explain the mechanism.", 24, 132, 810, 15, C.dark.muted, {
    lineHeight: 24,
  });
  addButton(next, "Start attempt", 24, 198, C.dark, false, 190);
  addButton(next, "Stop for now", 230, 198, C.dark, true, 170);

  const state = createComponentFrame(page, "State panel / State=Offline", 1000, 1100, 536, 270, C.light, 12);
  state.strokes = [solid(C.light.lineStrong)];
  state.strokeWeight = 1;
  addText(state, "OFFLINE", 24, 24, 480, 11, C.light.learner, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 4,
  });
  addText(state, "Your local draft is safe.", 24, 66, 480, 28, C.light.ink, {
    font: FONT.display,
    lineHeight: 34,
  });
  addText(state, "Continue locally. Sync will resume after the connection returns.", 24, 116, 470, 15, C.light.muted, {
    lineHeight: 24,
  });
  addButton(state, "Continue locally", 24, 198, C.light, false, 190);
  addButton(state, "Save and exit", 230, 198, C.light, true, 160);
}

function createIOSComponents(page) {
  const intro = mark(addFrame(page, "iOS components / Introduction", 0, 0, 1200, 320, C.light.bg));
  addText(intro, "06 / iOS COMPOUNDS", 56, 52, 420, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  addText(intro, "Native structure.\nShared meaning.", 56, 98, 700, 58, C.light.ink, {
    font: FONT.iosDisplay,
    lineHeight: 60,
    letterSpacing: -2,
  });
  addText(intro, "Use native controls for navigation, alerts, sheets, search, fields, and toggles.", 700, 136, 430, 17, C.light.muted, {
    font: FONT.ios,
    lineHeight: 25,
  });
  remember("frames", intro);

  const terrain = createComponentFrame(page, "iOS / Terrain header", 56, 410, 390, 210, C.dark, 18);
  terrain.fills = [solid(C.scene.cobaltDeep)];
  addTerrain(terrain, 0, 210, true);
  addText(terrain, "Today", 20, 26, 330, 34, C.dark.ink, {
    font: FONT.iosDisplay,
    lineHeight: 41,
    letterSpacing: -1,
  });
  addText(terrain, "One action is ready.", 20, 76, 330, 16, C.dark.ink, {
    font: FONT.ios,
    lineHeight: 22,
  });

  const iosNext = createComponentFrame(page, "iOS / Next action", 500, 410, 390, 250, C.light, 18);
  iosNext.strokes = [solid(C.light.line)];
  iosNext.strokeWeight = 1;
  addText(iosNext, "NEXT ACTION  •  12 MIN", 20, 20, 340, 11, C.light.tested, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 3,
  });
  addText(iosNext, "Explain why the model fails.", 20, 58, 340, 24, C.light.ink, {
    font: FONT.iosDisplay,
    lineHeight: 30,
  });
  addText(iosNext, "You will attempt first. One scaffold becomes available after a useful attempt.", 20, 104, 340, 15, C.light.muted, {
    font: FONT.ios,
    lineHeight: 21,
  });
  addButton(iosNext, "Start attempt", 20, 184, C.light, false, 350);

  const iosEvidence = createComponentFrame(page, "iOS / Evidence boundary", 56, 740, 390, 210, C.dark, 18);
  iosEvidence.fills = [solid(C.dark.surface)];
  iosEvidence.strokes = [solid(C.dark.tested)];
  iosEvidence.strokeWeight = 1;
  addText(iosEvidence, "TESTED EVIDENCE", 20, 20, 340, 11, C.dark.tested, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 3,
  });
  addText(iosEvidence, "Supports independent use in one new case.", 20, 58, 340, 20, C.dark.ink, {
    font: FONT.iosMedium,
    lineHeight: 26,
  });
  addText(iosEvidence, "Delayed return is not complete.", 20, 126, 340, 15, C.dark.muted, {
    font: FONT.ios,
    lineHeight: 21,
  });

  const iosReturn = createComponentFrame(page, "iOS / Return row", 500, 740, 390, 156, C.light, 18);
  iosReturn.strokes = [solid(C.light.line)];
  iosReturn.strokeWeight = 1;
  addPill(iosReturn, "Due today", 20, 18, C.light, "learner");
  addText(iosReturn, "Use the method without prior instruction.", 20, 64, 330, 17, C.light.ink, {
    font: FONT.iosMedium,
    lineHeight: 23,
  });
  addText(iosReturn, "8 min  •  Protected", 20, 112, 330, 13, C.light.muted, {
    font: FONT.ios,
    lineHeight: 18,
  });

  const iosMilestone = createComponentFrame(page, "iOS / Path milestone", 56, 1030, 834, 168, C.light, 18);
  iosMilestone.strokes = [solid(C.light.line)];
  iosMilestone.strokeWeight = 1;
  addRect(iosMilestone, "Milestone number", 20, 24, 44, 44, C.light.ai, 22);
  addText(iosMilestone, "03", 20, 38, 44, 12, C.scene.ivory, {
    font: FONT.mono,
    lineHeight: 16,
    align: "CENTER",
  });
  addText(iosMilestone, "Reconstruct the method", 84, 22, 690, 20, C.light.ink, {
    font: FONT.iosMedium,
    lineHeight: 26,
  });
  addText(iosMilestone, "Repair one failed model. Then explain the change.", 84, 62, 690, 15, C.light.muted, {
    font: FONT.ios,
    lineHeight: 21,
  });
  addText(iosMilestone, "PROJECT LINKED  •  REVIEWED", 84, 116, 690, 11, C.light.tested, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 3,
  });
}

function addChoiceRow(parent, text, x, y, width, colors, selected = false) {
  const row = addFrame(parent, `Choice / ${selected ? "Selected" : "Default"}`, x, y, width, 72, selected ? colors.strong : colors.surface, 6);
  row.strokes = [solid(selected ? colors.ai : colors.line)];
  row.strokeWeight = selected ? 2 : 1;
  addRect(row, "Choice marker", 18, 25, 20, 20, selected ? colors.ai : colors.surface, 10);
  row.children[0].strokes = [solid(selected ? colors.ai : colors.lineStrong)];
  row.children[0].strokeWeight = 1;
  addText(row, text, 56, 22, width - 76, 15, colors.ink, {
    font: selected ? FONT.medium : FONT.regular,
    lineHeight: 22,
  });
  return row;
}

function addLedgerRow(parent, number, title, meta, x, y, width, colors, tone = "tested") {
  const row = addFrame(parent, `${number} / ${title}`, x, y, width, 108, colors.surface, 6);
  row.strokes = [solid(colors.line)];
  row.strokeWeight = 1;
  const toneColor = tone === "learner" ? colors.learner : tone === "ai" ? colors.ai : colors.tested;
  addText(row, number, 18, 18, 50, 12, toneColor, {
    font: FONT.mono,
    lineHeight: 16,
    letterSpacing: 3,
  });
  addText(row, title, 88, 16, width - 310, 18, colors.ink, {
    font: FONT.medium,
    lineHeight: 24,
  });
  addText(row, meta, 88, 52, width - 310, 13, colors.muted, {
    lineHeight: 19,
  });
  addText(row, "OPEN  →", width - 126, 42, 96, 11, toneColor, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 3,
    align: "RIGHT",
  });
  return row;
}

function buildPublicScreen(viewport, screen, colors) {
  const kind = screen[4];

  if (kind === "hero") {
    addTerrain(viewport, 0, 900, true);
    addNav(viewport, C.dark, false);
    addPill(viewport, "One goal. Work you can prove.", 84, 166, C.dark, "tested");
    addText(viewport, "Learn what\nmatters next.", 84, 228, 760, 86, C.dark.ink, {
      font: FONT.display,
      lineHeight: 82,
      letterSpacing: -4,
    });
    addText(viewport, "Turn one real goal into hard practice, clear feedback, independent proof, and a planned return.", 88, 424, 610, 19, C.dark.ink, {
      lineHeight: 30,
      opacity: 0.88,
    });
    const entry = addFrame(viewport, "Goal entry", 84, 528, 720, 66, C.dark.surface, 6);
    addText(entry, "I want to understand why this method works.", 20, 22, 470, 15, C.dark.ink, { lineHeight: 22 });
    const action = addFrame(entry, "Primary action", 514, 7, 198, 52, C.dark.learner, 6);
    addText(action, "Start learning  →", 18, 16, 162, 14, C.scene.ivory, { font: FONT.medium, lineHeight: 20 });
    addText(viewport, "Recall  →  Attempt  →  Repair  →  Prove  →  Return", 88, 644, 700, 12, C.dark.ink, {
      font: FONT.mono,
      lineHeight: 16,
      letterSpacing: 3,
      opacity: 0.78,
    });
    return;
  }

  addNav(viewport, colors, false);

  if (kind === "start") {
    const rail = addFrame(viewport, "Progress rail", 48, 116, 284, 724, colors.deep, 12);
    addText(rail, "01 / 03", 24, 26, 220, 12, colors.tested, { font: FONT.mono, lineHeight: 16, letterSpacing: 4 });
    ["Goal", "Starting point", "Path preview"].forEach((item, index) => {
      addText(rail, `${index + 1}  ${item}`, 24, 90 + index * 54, 220, 15, index === 0 ? colors.ink : colors.muted, {
        font: index === 0 ? FONT.medium : FONT.regular,
        lineHeight: 22,
      });
    });
    addText(rail, "Your words stay unchanged until you approve an interpretation.", 24, 586, 220, 14, colors.muted, {
      lineHeight: 22,
    });
    addPill(viewport, "Clarify one outcome", 410, 134, colors, "tested");
    addText(viewport, "What should you become\nable to do?", 410, 190, 850, 56, colors.ink, {
      font: FONT.display,
      lineHeight: 56,
      letterSpacing: -3,
    });
    addText(viewport, "Choose the result that best matches your goal. You can revise it before a path becomes active.", 414, 324, 740, 17, colors.muted, {
      lineHeight: 27,
    });
    addChoiceRow(viewport, "Explain the method and use it in a new case.", 410, 402, 820, colors, true);
    addChoiceRow(viewport, "Complete a project with this method.", 410, 488, 820, colors, false);
    addChoiceRow(viewport, "Evaluate whether the method is suitable.", 410, 574, 820, colors, false);
    addButton(viewport, "Review this goal", 410, 688, colors, false, 220);
    addButton(viewport, "Save as draft", 650, 688, colors, true, 180);
    return;
  }

  if (kind === "directory") {
    addPill(viewport, "Reviewed paths", 64, 130, colors, "tested");
    addText(viewport, "Choose an outcome,\nnot a shelf of courses.", 64, 186, 880, 54, colors.ink, {
      font: FONT.display,
      lineHeight: 54,
      letterSpacing: -3,
    });
    addText(viewport, "Each path names its evidence conditions, gaps, project, and return.", 68, 310, 660, 17, colors.muted, {
      lineHeight: 27,
    });
    addInput(viewport, "Search outcomes", 64, 378, 520, colors);
    addPill(viewport, "All review states", 606, 390, colors, "quiet");
    addText(viewport, "3 REVIEWED PATHS", 1120, 402, 240, 11, colors.tested, {
      font: FONT.mono,
      lineHeight: 15,
      letterSpacing: 3,
      align: "RIGHT",
    });
    addLedgerRow(viewport, "01", "Verify an AI claim", "Reviewed  •  4 milestones  •  2 returns", 64, 478, 1312, colors, "tested");
    addLedgerRow(viewport, "02", "Reason from primary sources", "Reviewed  •  5 milestones  •  1 project", 64, 600, 1312, colors, "tested");
    addLedgerRow(viewport, "03", "Understand force and motion", "Reviewed World  •  3 experiments  •  protected proof", 64, 722, 1312, colors, "tested");
    return;
  }

  if (kind === "path") {
    addPill(viewport, "Reviewed • Version 3", 64, 132, colors, "tested");
    addText(viewport, "Verify an AI claim\nbefore you repeat it.", 64, 194, 720, 58, colors.ink, {
      font: FONT.display,
      lineHeight: 58,
      letterSpacing: -3,
    });
    addText(viewport, "Target outcome", 64, 356, 240, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(viewport, "Trace evidence, compare support, and defend one bounded conclusion.", 64, 392, 560, 18, colors.ink, {
      lineHeight: 28,
    });
    addButton(viewport, "Start this path", 64, 500, colors, false, 210);
    addButton(viewport, "Personalize first", 294, 500, colors, true, 200);
    const panel = addFrame(viewport, "Path map", 760, 134, 616, 670, colors.surface, 12);
    panel.strokes = [solid(colors.line)];
    panel.strokeWeight = 1;
    addText(panel, "PATH MAP", 28, 28, 540, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    [
      ["01", "Recall the claim", "8 min"],
      ["02", "Attempt a source trace", "14 min"],
      ["03", "Repair the evidence model", "18 min"],
      ["04", "Prove in a new case", "12 min"],
      ["05", "Return without instruction", "Due later"],
    ].forEach(([number, label, time], index) => {
      addText(panel, number, 28, 86 + index * 94, 40, 12, colors.ai, { font: FONT.mono, lineHeight: 16 });
      addText(panel, label, 88, 82 + index * 94, 340, 17, colors.ink, { font: FONT.medium, lineHeight: 23 });
      addText(panel, time, 458, 84 + index * 94, 110, 12, colors.muted, { font: FONT.mono, lineHeight: 16, align: "RIGHT" });
      addLine(panel, 88, 124 + index * 94, 480, colors.line);
    });
    addText(panel, "LIMIT", 28, 574, 100, 11, colors.learner, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(panel, "No reviewed assessment of legal or medical claims.", 28, 610, 530, 14, colors.muted, { lineHeight: 22 });
    return;
  }

  if (kind === "method") {
    addPill(viewport, "How FORGE works", 64, 130, colors, "tested");
    addText(viewport, "Practice becomes useful\nwhen the loop closes.", 64, 188, 900, 54, colors.ink, {
      font: FONT.display,
      lineHeight: 54,
      letterSpacing: -3,
    });
    addText(viewport, "FORGE separates the learner attempt, bounded assistance, independent proof, and delayed return.", 68, 314, 740, 17, colors.muted, {
      lineHeight: 27,
    });
    const steps = [
      ["01", "Recall", "Bring the current model into view."],
      ["02", "Attempt", "Do one useful operation before help."],
      ["03", "Repair", "Use the smallest scaffold that changes the model."],
      ["04", "Prove", "Work independently under stated conditions."],
      ["05", "Return", "Try again after instruction is withdrawn."],
    ];
    steps.forEach(([number, title, body], index) => {
      const x = 64 + index * 258;
      const card = addFrame(viewport, `${number} ${title}`, x, 438, 232, 290, index === 2 ? colors.strong : colors.surface, 12);
      card.strokes = [solid(index === 2 ? colors.ai : colors.line)];
      card.strokeWeight = 1;
      addText(card, number, 20, 20, 70, 12, index === 2 ? colors.ai : colors.tested, { font: FONT.mono, lineHeight: 16 });
      addText(card, title, 20, 66, 190, 24, colors.ink, { font: FONT.display, lineHeight: 30 });
      addText(card, body, 20, 120, 190, 14, colors.muted, { lineHeight: 22 });
      addText(card, index === 1 ? "LEARNER" : index === 2 ? "AI DISCLOSED" : index >= 3 ? "EVIDENCE" : "QUIET", 20, 242, 190, 10, index === 1 ? colors.learner : index === 2 ? colors.ai : colors.tested, {
        font: FONT.mono,
        lineHeight: 14,
        letterSpacing: 3,
      });
    });
    return;
  }

  addPill(viewport, "Evidence and trust", 64, 132, colors, "tested");
  addText(viewport, "Inspect the contract\nbehind each claim.", 64, 192, 820, 56, colors.ink, {
    font: FONT.display,
    lineHeight: 56,
    letterSpacing: -3,
  });
  addText(viewport, "No badge replaces a source record. No output becomes evidence without stated conditions.", 68, 324, 720, 17, colors.muted, {
    lineHeight: 27,
  });
  const trustItems = [
    ["01", "Evidence", "Claims, conditions, support, and limits"],
    ["02", "Sources", "Review state, versions, and withdrawals"],
    ["03", "AI", "Contribution labels and assistance withdrawal"],
    ["04", "Privacy", "Local continuity and revocable data controls"],
    ["05", "Accessibility", "Keyboard, motion, contrast, and native order"],
  ];
  trustItems.forEach(([number, title, meta], index) => {
    addLedgerRow(viewport, number, title, meta, 64, 426 + index * 82, 1312, colors, index === 2 ? "ai" : "tested");
    const row = viewport.children[viewport.children.length - 1];
    row.resize(1312, 70);
  });
}

function createPublicScreens(page) {
  PUBLIC_SCREENS.forEach((screen, index) => {
    const { viewport, colors } = makeBoard(page, screen, index, 1440, 900, screen[5]);
    buildPublicScreen(viewport, screen, colors);
  });
}

function addAppShell(viewport, colors, active, title, eyebrow) {
  const rail = addFrame(viewport, "Application rail", 0, 0, 238, viewport.height, colors.deep, 0);
  addText(rail, "FORGE", 28, 30, 160, 17, colors.ink, { font: FONT.medium, lineHeight: 22, letterSpacing: 4 });
  ["Today", "Paths", "Projects", "Evidence"].forEach((item, index) => {
    const selected = item === active;
    if (selected) addRect(rail, "Active navigation", 18, 98 + index * 54, 202, 42, colors.strong, 6);
    addText(rail, item, 32, 110 + index * 54, 160, 14, selected ? colors.ink : colors.muted, {
      font: selected ? FONT.medium : FONT.regular,
      lineHeight: 18,
    });
  });
  addText(rail, "Account", 32, 824, 160, 14, colors.muted, { lineHeight: 18 });
  addText(viewport, eyebrow, 286, 44, 620, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
  addText(viewport, title, 286, 76, 940, 44, colors.ink, { font: FONT.display, lineHeight: 48, letterSpacing: -2 });
  addText(viewport, "◐", 1352, 48, 36, 18, colors.muted, { lineHeight: 22, align: "RIGHT" });
  addLine(viewport, 286, 144, 1102, colors.line);
}

function buildAppScreen(viewport, screen, colors) {
  const kind = screen[4];
  const active = kind === "today" ? "Today" : kind === "appPath" || kind === "brief" ? "Paths" : kind === "project" ? "Projects" : "Evidence";
  addAppShell(viewport, colors, active, screen[2], `${screen[0]}  •  ${screen[1]}`);

  if (kind === "today") {
    const threshold = addFrame(viewport, "Terrain threshold", 286, 180, 1102, 196, C.scene.cobaltDeep, 12);
    addTerrain(threshold, 0, 196, true);
    addText(threshold, "One action is ready.", 32, 28, 620, 30, C.dark.ink, { font: FONT.display, lineHeight: 36, letterSpacing: -1 });
    addText(threshold, "You can stop after this attempt.", 32, 80, 560, 15, C.dark.ink, { lineHeight: 22, opacity: 0.82 });
    addPill(threshold, "12 min", 32, 132, C.dark, "quiet");
    addPill(threshold, "Learner attempt", 140, 132, C.dark, "learner");
    const next = addFrame(viewport, "Next action panel", 286, 410, 738, 396, colors.surface, 12);
    next.strokes = [solid(colors.line)];
    next.strokeWeight = 1;
    addText(next, "WHY THIS IS NEXT", 28, 28, 650, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(next, "Explain why the model fails in the second case.", 28, 78, 650, 30, colors.ink, {
      font: FONT.display,
      lineHeight: 38,
      letterSpacing: -1,
    });
    addText(next, "Your first answer used the result. This attempt asks for the mechanism.", 28, 160, 650, 16, colors.muted, { lineHeight: 25 });
    addText(next, "Support: one scaffold after a useful attempt.\nSource state: reviewed, version 3.\nStopping point: after submission or local save.", 28, 224, 640, 14, colors.muted, {
      lineHeight: 24,
    });
    addButton(next, "Start attempt", 28, 326, colors, false, 190);
    addButton(next, "Stop for now", 234, 326, colors, true, 168);
    const side = addFrame(viewport, "Due return", 1054, 410, 334, 396, colors.strong, 12);
    addText(side, "DUE RETURN", 22, 24, 286, 11, colors.learner, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(side, "Use the method without prior instruction.", 22, 70, 286, 22, colors.ink, { font: FONT.display, lineHeight: 28 });
    addText(side, "Protected  •  8 min\nWindow closes today at 18:00.", 22, 156, 286, 14, colors.muted, { lineHeight: 23 });
    addButton(side, "Open return", 22, 316, colors, false, 290);
    return;
  }

  if (kind === "appPath") {
    const progress = addFrame(viewport, "Path progress", 286, 184, 1102, 124, colors.strong, 12);
    addText(progress, "PATH-V3  •  REVIEWED", 24, 22, 420, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(progress, "3 of 5 milestones complete", 24, 58, 420, 20, colors.ink, { font: FONT.medium, lineHeight: 26 });
    addText(progress, "Project linked  •  Proof ready  •  Return scheduled", 620, 58, 440, 13, colors.muted, { font: FONT.mono, lineHeight: 18, align: "RIGHT" });
    [
      ["01", "Recall the claim", "Complete"],
      ["02", "Trace the source", "Complete"],
      ["03", "Repair the model", "Complete"],
      ["04", "Prove in a new case", "Ready"],
      ["05", "Return later", "Scheduled"],
    ].forEach(([number, title, status], index) => {
      addLedgerRow(viewport, number, title, status, 286, 346 + index * 96, 1102, colors, status === "Ready" ? "learner" : "tested");
      const row = viewport.children[viewport.children.length - 1];
      row.resize(1102, 84);
    });
    return;
  }

  if (kind === "brief") {
    addPill(viewport, "Learner attempt", 286, 184, colors, "learner");
    addText(viewport, "Explain why this method fails\nin the second case.", 286, 236, 860, 48, colors.ink, {
      font: FONT.display,
      lineHeight: 50,
      letterSpacing: -2,
    });
    addText(viewport, "Operation", 286, 362, 160, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(viewport, "Use the observed result to identify the missing mechanism.", 286, 398, 720, 17, colors.ink, { lineHeight: 27 });
    const support = addFrame(viewport, "Assistance contract", 286, 470, 720, 220, colors.surface, 12);
    support.strokes = [solid(colors.line)];
    support.strokeWeight = 1;
    addText(support, "ASSISTANCE CONTRACT", 24, 22, 650, 11, colors.ai, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(support, "Available after a useful attempt", 24, 62, 650, 18, colors.ink, { font: FONT.medium, lineHeight: 24 });
    addText(support, "One comparison scaffold. Source definitions remain available.", 24, 104, 650, 14, colors.muted, { lineHeight: 22 });
    addText(support, "Not available", 24, 148, 650, 13, colors.learner, { font: FONT.medium, lineHeight: 18 });
    addText(support, "A generated answer or a completed explanation.", 154, 148, 510, 13, colors.muted, { lineHeight: 18 });
    addButton(viewport, "Start attempt", 1040, 470, colors, false, 290);
    addButton(viewport, "Save and exit", 1040, 536, colors, true, 290);
    addText(viewport, "Local draft remains available during recoverable network failure.", 1040, 622, 290, 13, colors.muted, { lineHeight: 20 });
    return;
  }

  if (kind === "evidence") {
    addText(viewport, "Claims remain bounded by their conditions.", 286, 184, 780, 18, colors.muted, { lineHeight: 28 });
    addInput(viewport, "Search claims, tasks, or sources", 286, 244, 650, colors);
    addPill(viewport, "All evidence states", 958, 256, colors, "quiet");
    const rows = [
      ["E-104", "Can trace one reviewed claim to two sources", "Tested  •  Independent  •  Version 3", "tested"],
      ["E-101", "Can identify one unsupported inference", "Partial  •  Assisted repair", "ai"],
      ["E-096", "Can apply the method after seven days", "Pending return", "learner"],
      ["E-083", "Can compare two conflicting records", "Superseded by E-104", "tested"],
    ];
    rows.forEach(([number, title, meta, tone], index) => {
      addLedgerRow(viewport, number, title, meta, 286, 346 + index * 122, 1102, colors, tone);
    });
    return;
  }

  if (kind === "returns") {
    addPill(viewport, "1 due now", 286, 184, colors, "learner");
    addText(viewport, "Try again after instruction is withdrawn.", 286, 238, 880, 22, colors.muted, { lineHeight: 30 });
    const returnRows = [
      ["DUE", "Verify an AI claim", "Today  •  8 min  •  Protected", "learner"],
      ["UPCOMING", "Reason from primary sources", "In 3 days  •  12 min", "tested"],
      ["COMPLETE", "Force and motion transfer", "Returned 8 days later", "tested"],
    ];
    returnRows.forEach(([number, title, meta, tone], index) => {
      addLedgerRow(viewport, number, title, meta, 286, 336 + index * 136, 1102, colors, tone);
    });
    const note = addFrame(viewport, "Attempt rule", 286, 760, 1102, 78, colors.strong, 6);
    addText(note, "ATTEMPT RULE", 18, 18, 160, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(note, "Prior instruction stays hidden. Accessibility support remains available.", 202, 17, 850, 15, colors.ink, { lineHeight: 22 });
    return;
  }

  const stageRail = addFrame(viewport, "Project stages", 286, 184, 268, 654, colors.deep, 12);
  addText(stageRail, "PROJECT STAGES", 22, 22, 220, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
  ["Brief", "Build", "Critique", "Revision", "Defence"].forEach((item, index) => {
    const selected = item === "Critique";
    if (selected) addRect(stageRail, "Current stage", 14, 74 + index * 62, 240, 48, colors.strong, 6);
    addText(stageRail, `${index + 1}  ${item}`, 24, 88 + index * 62, 210, 14, selected ? colors.ink : colors.muted, {
      font: selected ? FONT.medium : FONT.regular,
      lineHeight: 19,
    });
  });
  addText(stageRail, "Sources: 4\nAI transformations: 1\nArtifacts: 3", 24, 474, 210, 13, colors.muted, { font: FONT.mono, lineHeight: 24 });
  const workspace = addFrame(viewport, "Project workspace", 586, 184, 802, 654, colors.surface, 12);
  workspace.strokes = [solid(colors.line)];
  workspace.strokeWeight = 1;
  addText(workspace, "CRITIQUE", 28, 26, 720, 11, colors.learner, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
  addText(workspace, "Defend the source choice that changed your conclusion.", 28, 72, 720, 28, colors.ink, {
    font: FONT.display,
    lineHeight: 35,
    letterSpacing: -1,
  });
  addText(workspace, "Artifact 03  •  claim-map-v2", 28, 158, 720, 13, colors.tested, { font: FONT.mono, lineHeight: 18 });
  const artifact = addFrame(workspace, "Artifact preview", 28, 198, 746, 260, colors.strong, 8);
  addText(artifact, "Claim", 24, 24, 120, 11, colors.muted, { font: FONT.mono, lineHeight: 15, letterSpacing: 3 });
  addText(artifact, "The method is reliable in this bounded case.", 24, 60, 650, 20, colors.ink, { font: FONT.medium, lineHeight: 28 });
  addText(artifact, "Support", 24, 132, 120, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 3 });
  addText(artifact, "Two reviewed records. One source limitation remains visible.", 24, 168, 650, 15, colors.muted, { lineHeight: 23 });
  addButton(workspace, "Submit defence", 28, 554, colors, false, 210);
  addButton(workspace, "Save revision", 256, 554, colors, true, 190);
}

function createAppScreens(page) {
  APP_SCREENS.forEach((screen, index) => {
    const { viewport, colors } = makeBoard(page, screen, index, 1440, 900, screen[5]);
    buildAppScreen(viewport, screen, colors);
  });
}

function addFocusHeader(viewport, colors, stage) {
  addText(viewport, "Exit", 32, 30, 90, 14, colors.muted, { lineHeight: 19 });
  addText(viewport, stage, 520, 30, 400, 12, colors.tested, {
    font: FONT.mono,
    lineHeight: 16,
    letterSpacing: 4,
    align: "CENTER",
  });
  addText(viewport, "Save state", 1290, 30, 112, 14, colors.muted, { lineHeight: 19, align: "RIGHT" });
  addLine(viewport, 32, 74, 1370, colors.line);
}

function buildFocusScreen(viewport, screen, colors) {
  const kind = screen[4];
  addFocusHeader(viewport, colors, kind === "modelshift" ? "MODEL SHIFT  •  STAGE 02 / 04" : kind === "world" ? "GUEST WORLD  •  EXPERIMENT" : "FOCUS  •  ATTEMPT");

  if (kind === "activity") {
    addPill(viewport, "Learner attempt", 64, 126, colors, "learner");
    addText(viewport, "Explain the missing mechanism.", 64, 182, 820, 48, colors.ink, {
      font: FONT.display,
      lineHeight: 52,
      letterSpacing: -2,
    });
    addText(viewport, "Use the observed result. Do not restate the result as the explanation.", 68, 254, 720, 17, colors.muted, {
      lineHeight: 27,
    });
    const editor = addFrame(viewport, "Learner work", 64, 342, 900, 404, colors.surface, 12);
    editor.strokes = [solid(colors.lineStrong)];
    editor.strokeWeight = 1;
    addText(editor, "YOUR EXPLANATION", 24, 22, 840, 11, colors.muted, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(editor, "The second case fails because…", 24, 74, 840, 20, colors.dim, {
      font: FONT.reflection,
      lineHeight: 32,
    });
    addText(editor, "Draft saved locally", 24, 350, 840, 12, colors.tested, { font: FONT.mono, lineHeight: 16 });
    const contract = addFrame(viewport, "Assistance", 1000, 342, 376, 404, colors.strong, 12);
    addText(contract, "ASSISTANCE", 22, 22, 330, 11, colors.ai, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(contract, "Available after a useful attempt", 22, 64, 330, 19, colors.ink, { font: FONT.medium, lineHeight: 26 });
    addText(contract, "One comparison scaffold.\nNo completed explanation.", 22, 126, 320, 15, colors.muted, { lineHeight: 24 });
    addText(contract, "Sources and accessibility controls remain available.", 22, 256, 320, 14, colors.muted, { lineHeight: 22 });
    addButton(viewport, "Submit attempt", 64, 784, colors, false, 200);
    addButton(viewport, "Save and exit", 282, 784, colors, true, 180);
    return;
  }

  if (kind === "modelshift") {
    const stage = addFrame(viewport, "ModelShift stages", 44, 112, 230, 732, colors.deep, 12);
    ["Commit", "Investigate", "Reconstruct", "Prove"].forEach((item, index) => {
      const selected = item === "Investigate";
      if (selected) addRect(stage, "Current stage", 14, 30 + index * 84, 202, 62, colors.strong, 6);
      addText(stage, `0${index + 1}`, 26, 50 + index * 84, 38, 11, selected ? colors.ai : colors.dim, {
        font: FONT.mono,
        lineHeight: 15,
      });
      addText(stage, item, 76, 46 + index * 84, 122, 15, selected ? colors.ink : colors.muted, {
        font: selected ? FONT.medium : FONT.regular,
        lineHeight: 21,
      });
    });
    addText(stage, "Sources", 26, 566, 170, 13, colors.muted, { lineHeight: 18 });
    addText(stage, "Idealizations", 26, 606, 170, 13, colors.muted, { lineHeight: 18 });
    addText(stage, "Safety", 26, 646, 170, 13, colors.muted, { lineHeight: 18 });

    addPill(viewport, "Investigate", 324, 126, colors, "ai");
    addText(viewport, "Which observation breaks\nyour first model?", 324, 184, 850, 50, colors.ink, {
      font: FONT.display,
      lineHeight: 52,
      letterSpacing: -2,
    });
    const evidence = addFrame(viewport, "Observation comparison", 324, 330, 1016, 300, colors.surface, 12);
    evidence.strokes = [solid(colors.line)];
    evidence.strokeWeight = 1;
    addText(evidence, "OBSERVATION A", 24, 22, 430, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(evidence, "The first case follows the predicted relation.", 24, 62, 430, 18, colors.ink, { font: FONT.medium, lineHeight: 25 });
    addLine(evidence, 508, 22, 1, colors.line);
    const divider = evidence.children[evidence.children.length - 1];
    divider.resize(1, 252);
    addText(evidence, "OBSERVATION B", 548, 22, 430, 11, colors.learner, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
    addText(evidence, "The second case changes while the stated factor remains fixed.", 548, 62, 430, 18, colors.ink, { font: FONT.medium, lineHeight: 25 });
    addText(evidence, "Choose the observation that your model cannot explain.", 24, 220, 940, 15, colors.muted, { lineHeight: 22 });
    addButton(viewport, "Commit observation B", 324, 680, colors, false, 240);
    addButton(viewport, "Inspect idealization", 584, 680, colors, true, 220);
    return;
  }

  const landscape = addFrame(viewport, "World terrain", 0, 76, 1440, 280, C.scene.cobaltDeep, 0);
  addTerrain(landscape, 0, 280, true);
  addText(landscape, "WORLD 03  •  FORCE AND MOTION", 54, 34, 540, 11, C.dark.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
  addText(landscape, "Test the model before you trust it.", 54, 76, 720, 42, C.dark.ink, { font: FONT.display, lineHeight: 46, letterSpacing: -2 });
  addText(landscape, "The controls change an idealized system. Inspect the limits before using the result.", 56, 146, 620, 16, C.dark.ink, {
    lineHeight: 25,
    opacity: 0.86,
  });
  const lab = addFrame(viewport, "Experiment surface", 54, 398, 860, 394, colors.surface, 12);
  lab.strokes = [solid(colors.line)];
  lab.strokeWeight = 1;
  addText(lab, "EXPERIMENT", 24, 22, 780, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
  addText(lab, "Change force while mass stays fixed.", 24, 62, 780, 24, colors.ink, { font: FONT.display, lineHeight: 30 });
  addRect(lab, "Experiment track", 48, 174, 740, 8, colors.lineStrong, 4);
  addRect(lab, "Object", 236, 130, 74, 52, colors.ai, 6);
  addRect(lab, "Force vector", 310, 152, 220, 8, colors.learner, 4);
  addText(lab, "FORCE  42 N", 48, 232, 180, 12, colors.learner, { font: FONT.mono, lineHeight: 16 });
  addText(lab, "MASS  8 KG", 250, 232, 180, 12, colors.ai, { font: FONT.mono, lineHeight: 16 });
  addButton(lab, "Run trial", 24, 318, colors, false, 170);
  const limits = addFrame(viewport, "World limits", 950, 398, 436, 394, colors.strong, 12);
  addText(limits, "IDEALIZATION", 22, 22, 390, 11, colors.learner, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
  addText(limits, "The track removes friction.", 22, 62, 390, 21, colors.ink, { font: FONT.medium, lineHeight: 28 });
  addText(limits, "The result does not directly describe a real road, body, or machine.", 22, 114, 382, 15, colors.muted, { lineHeight: 24 });
  addText(limits, "Safety", 22, 224, 390, 12, colors.tested, { font: FONT.mono, lineHeight: 16 });
  addText(limits, "Do not copy this setup with moving equipment.", 22, 258, 382, 14, colors.muted, { lineHeight: 22 });
}

function createFocusScreens(page) {
  FOCUS_SCREENS.forEach((screen, index) => {
    const { viewport, colors } = makeBoard(page, screen, index, 1440, 900, screen[5]);
    buildFocusScreen(viewport, screen, colors);
  });
}

function makePhoneBoard(page, screen, index) {
  const colors = C[screen[5]];
  const column = index % 3;
  const row = Math.floor(index / 3);
  const x = column * 500;
  const y = row * 1080;
  const board = mark(addFrame(page, `${screen[0]} / ${screen[2]}`, x, y, 390, 992, colors.bg, 0));
  board.clipsContent = false;
  addText(board, screen[0], 0, 0, 82, 11, colors.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 3 });
  addText(board, screen[2], 94, -2, 296, 18, colors.ink, { font: FONT.iosMedium, lineHeight: 23, align: "RIGHT" });
  addText(board, screen[1], 0, 30, 390, 11, colors.muted, { font: FONT.mono, lineHeight: 15 });
  addText(board, `Action: ${screen[3]}`, 0, 54, 390, 12, colors.muted, { lineHeight: 17 });
  const viewport = addFrame(board, `${screen[0]} Viewport`, 0, 96, 390, 844, colors.bg, 36);
  viewport.strokes = [solid(colors.lineStrong)];
  viewport.strokeWeight = 1;
  remember("frames", viewport);
  return { viewport, colors };
}

function addPhoneChrome(viewport, colors, title, options = {}) {
  addText(viewport, "9:41", 20, 14, 70, 12, colors.ink, { font: FONT.iosMedium, lineHeight: 16 });
  addText(viewport, "●  ◒  ▰", 292, 14, 78, 10, colors.ink, { lineHeight: 14, align: "RIGHT" });
  if (!options.fullBleed) {
    if (options.back) addText(viewport, "‹", 18, 52, 28, 30, colors.ai, { font: FONT.ios, lineHeight: 34 });
    addText(viewport, title, options.back ? 52 : 20, 58, options.back ? 300 : 350, 28, colors.ink, {
      font: FONT.iosDisplay,
      lineHeight: 34,
      letterSpacing: -1,
    });
  }
  if (options.tabs) {
    const tab = addFrame(viewport, "Native tab bar", 0, 764, 390, 80, colors.surface, 0);
    tab.strokes = [solid(colors.line)];
    tab.strokeTopWeight = 1;
    ["Today", "Paths", "Projects", "Evidence"].forEach((item, index) => {
      const active = item === options.tabs;
      addText(tab, item, index * 97, 38, 97, 10, active ? colors.ai : colors.muted, {
        font: active ? FONT.iosMedium : FONT.ios,
        lineHeight: 14,
        align: "CENTER",
      });
      addText(tab, active ? "●" : "○", index * 97, 12, 97, 14, active ? colors.ai : colors.muted, {
        lineHeight: 18,
        align: "CENTER",
      });
    });
  }
}

function buildPhoneScreen(viewport, screen, colors) {
  const kind = screen[4];

  if (kind === "welcome") {
    addTerrain(viewport, 0, 844, true);
    addPhoneChrome(viewport, C.dark, "", { fullBleed: true });
    addText(viewport, "FORGE", 20, 56, 160, 14, C.dark.ink, { font: FONT.mono, lineHeight: 18, letterSpacing: 5 });
    addText(viewport, "Learn what\nmatters next.", 20, 156, 340, 48, C.dark.ink, {
      font: FONT.iosDisplay,
      lineHeight: 49,
      letterSpacing: -2,
    });
    addText(viewport, "Start with one real goal.", 22, 272, 330, 17, C.dark.ink, { font: FONT.ios, lineHeight: 23 });
    const input = addFrame(viewport, "Goal field", 20, 572, 350, 112, C.dark.surface, 12);
    addText(input, "YOUR GOAL", 16, 14, 318, 10, C.dark.muted, { font: FONT.mono, lineHeight: 14, letterSpacing: 3 });
    addText(input, "I want to understand…", 16, 48, 318, 17, C.dark.ink, { font: FONT.ios, lineHeight: 22 });
    addButton(viewport, "Start learning", 20, 702, C.dark, false, 350);
    return;
  }

  addPhoneChrome(viewport, colors, screen[2], {
    back: kind === "attempt" || kind === "repair" || kind === "proof",
    tabs: kind === "iosToday" || kind === "return" ? "Today" : undefined,
  });

  if (kind === "iosToday") {
    const horizon = addFrame(viewport, "Today terrain", 16, 112, 358, 150, C.scene.cobaltDeep, 18);
    addTerrain(horizon, 0, 150, true);
    addText(horizon, "One action is ready.", 18, 20, 320, 22, C.dark.ink, { font: FONT.iosDisplay, lineHeight: 28 });
    addPill(horizon, "12 min", 18, 96, C.dark, "quiet");
    const next = addFrame(viewport, "Next action", 16, 282, 358, 312, colors.surface, 18);
    next.strokes = [solid(colors.line)];
    next.strokeWeight = 1;
    addText(next, "NEXT ACTION", 18, 18, 318, 10, colors.tested, { font: FONT.mono, lineHeight: 14, letterSpacing: 3 });
    addText(next, "Explain why the model fails.", 18, 54, 318, 22, colors.ink, { font: FONT.iosMedium, lineHeight: 28 });
    addText(next, "You will attempt first. One scaffold becomes available later.", 18, 114, 318, 15, colors.muted, { font: FONT.ios, lineHeight: 21 });
    addText(next, "Reviewed source  •  Safe stop after submission", 18, 190, 318, 12, colors.muted, { font: FONT.ios, lineHeight: 17 });
    addButton(next, "Start attempt", 18, 244, colors, false, 322);
    addText(viewport, "Due return  •  8 min  →", 22, 632, 340, 15, colors.learner, { font: FONT.iosMedium, lineHeight: 21 });
    return;
  }

  if (kind === "attempt") {
    addPill(viewport, "Learner attempt", 20, 116, colors, "learner");
    addText(viewport, "Explain the missing mechanism.", 20, 164, 350, 28, colors.ink, { font: FONT.iosDisplay, lineHeight: 34 });
    addText(viewport, "Do not restate the observed result.", 20, 234, 350, 15, colors.muted, { font: FONT.ios, lineHeight: 21 });
    const editor = addFrame(viewport, "Learner draft", 16, 294, 358, 330, colors.surface, 18);
    editor.strokes = [solid(colors.lineStrong)];
    editor.strokeWeight = 1;
    addText(editor, "YOUR EXPLANATION", 18, 18, 320, 10, colors.muted, { font: FONT.mono, lineHeight: 14, letterSpacing: 3 });
    addText(editor, "The second case fails because…", 18, 60, 320, 18, colors.dim, { font: FONT.reflection, lineHeight: 28 });
    addText(editor, "Draft saved on this iPhone", 18, 286, 320, 12, colors.tested, { font: FONT.ios, lineHeight: 17 });
    addButton(viewport, "Submit attempt", 16, 652, colors, false, 358);
    addText(viewport, "Save and exit", 20, 724, 350, 15, colors.muted, { font: FONT.iosMedium, lineHeight: 21, align: "CENTER" });
    return;
  }

  if (kind === "repair") {
    addPill(viewport, "AI contribution", 20, 116, colors, "ai");
    addText(viewport, "Compare what changed.", 20, 164, 350, 28, colors.ink, { font: FONT.iosDisplay, lineHeight: 34 });
    addText(viewport, "This scaffold does not provide a completed explanation.", 20, 212, 350, 15, colors.muted, { font: FONT.ios, lineHeight: 21 });
    const scaffold = addFrame(viewport, "Comparison scaffold", 16, 280, 358, 280, colors.surface, 18);
    scaffold.strokes = [solid(colors.ai)];
    scaffold.strokeWeight = 1;
    addText(scaffold, "CASE A", 18, 18, 142, 10, colors.tested, { font: FONT.mono, lineHeight: 14, letterSpacing: 3 });
    addText(scaffold, "The stated factor changes.", 18, 56, 142, 15, colors.ink, { font: FONT.iosMedium, lineHeight: 21 });
    addText(scaffold, "CASE B", 196, 18, 142, 10, colors.learner, { font: FONT.mono, lineHeight: 14, letterSpacing: 3 });
    addText(scaffold, "The result changes while that factor stays fixed.", 196, 56, 142, 15, colors.ink, { font: FONT.iosMedium, lineHeight: 21 });
    addText(scaffold, "What hidden factor could explain both results?", 18, 194, 320, 16, colors.ai, { font: FONT.iosMedium, lineHeight: 22 });
    addButton(viewport, "Revise explanation", 16, 596, colors, false, 358);
    addText(viewport, "Inspect source definitions", 20, 672, 350, 15, colors.muted, { font: FONT.iosMedium, lineHeight: 21, align: "CENTER" });
    return;
  }

  if (kind === "proof") {
    addPill(viewport, "Protected proof", 20, 116, colors, "tested");
    addText(viewport, "Use the method in a new case.", 20, 164, 350, 28, colors.ink, { font: FONT.iosDisplay, lineHeight: 34 });
    addText(viewport, "Instructional help is unavailable. Accessibility support remains available.", 20, 234, 350, 15, colors.muted, { font: FONT.ios, lineHeight: 21 });
    const prompt = addFrame(viewport, "Proof prompt", 16, 310, 358, 276, colors.surface, 18);
    prompt.strokes = [solid(colors.tested)];
    prompt.strokeWeight = 1;
    addText(prompt, "NEW CASE", 18, 18, 320, 10, colors.tested, { font: FONT.mono, lineHeight: 14, letterSpacing: 3 });
    addText(prompt, "A source repeats a result but omits the conditions. What can the result support?", 18, 58, 320, 18, colors.ink, { font: FONT.iosMedium, lineHeight: 26 });
    addText(prompt, "Your response must name one limit.", 18, 204, 320, 14, colors.muted, { font: FONT.ios, lineHeight: 20 });
    addButton(viewport, "Begin proof", 16, 622, colors, false, 358);
    addText(viewport, "Save and exit", 20, 698, 350, 15, colors.muted, { font: FONT.iosMedium, lineHeight: 21, align: "CENTER" });
    return;
  }

  addPill(viewport, "Due today", 20, 116, colors, "learner");
  addText(viewport, "Return without prior instruction.", 20, 164, 350, 28, colors.ink, { font: FONT.iosDisplay, lineHeight: 34 });
  addText(viewport, "The task takes about 8 minutes. The attempt closes at 18:00.", 20, 234, 350, 15, colors.muted, { font: FONT.ios, lineHeight: 21 });
  const contract = addFrame(viewport, "Return contract", 16, 308, 358, 280, colors.surface, 18);
  contract.strokes = [solid(colors.line)];
  contract.strokeWeight = 1;
  addText(contract, "ATTEMPT RULE", 18, 18, 320, 10, colors.tested, { font: FONT.mono, lineHeight: 14, letterSpacing: 3 });
  addText(contract, "Prior explanations and scaffolds stay hidden.", 18, 58, 320, 18, colors.ink, { font: FONT.iosMedium, lineHeight: 25 });
  addText(contract, "Available", 18, 138, 100, 13, colors.tested, { font: FONT.iosMedium, lineHeight: 18 });
  addText(contract, "Source terms and accessibility support.", 104, 138, 234, 13, colors.muted, { font: FONT.ios, lineHeight: 19 });
  addText(contract, "Expired work does not count as retention evidence.", 18, 214, 320, 13, colors.learner, { font: FONT.ios, lineHeight: 19 });
  addButton(viewport, "Open return", 16, 622, colors, false, 358);
}

function createIOSScreens(page) {
  IOS_SCREENS.forEach((screen, index) => {
    const { viewport, colors } = makePhoneBoard(page, screen, index);
    buildPhoneScreen(viewport, screen, colors);
  });
}

function createStatesAndAccessibility(page) {
  const board = mark(addFrame(page, "Shared states and accessibility", 0, 0, 1600, 2100, C.light.bg));
  addText(board, "08 / STATES AND ACCESSIBILITY", 64, 56, 560, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  addText(board, "Every failure has a safe action.", 64, 106, 980, 64, C.light.ink, {
    font: FONT.display,
    lineHeight: 66,
    letterSpacing: -3,
  });
  addText(board, "Use text, shape, and action. Color is never the only state signal.", 68, 198, 760, 18, C.light.muted, {
    lineHeight: 28,
  });

  SHARED_STATES.forEach(([state, body, action], index) => {
    const mode = index % 3 === 1 ? "dark" : "light";
    const colors = C[mode];
    const column = index % 3;
    const row = Math.floor(index / 3);
    const card = addFrame(board, `State / ${state}`, 64 + column * 500, 300 + row * 300, 460, 252, colors.surface, 12);
    card.strokes = [solid(state === "Error" || state === "Expired" ? colors.learner : colors.lineStrong)];
    card.strokeWeight = 1;
    addText(card, state.toUpperCase(), 24, 24, 410, 11, state === "Error" || state === "Expired" ? colors.learner : colors.tested, {
      font: FONT.mono,
      lineHeight: 15,
      letterSpacing: 4,
    });
    addText(card, body, 24, 68, 410, 22, colors.ink, { font: FONT.medium, lineHeight: 28 });
    addText(card, action, 24, 132, 410, 14, colors.muted, { lineHeight: 22 });
    addButton(card, state === "Loading" ? "Exit safely" : state === "Empty" ? "Shape a goal" : state === "Offline" ? "Continue locally" : "Review and continue", 24, 184, colors, false, 210);
  });

  addText(board, "Accessibility contract", 64, 1270, 700, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  const rules = [
    ["Keyboard", "Visible 3 px focus. Logical order. Skip link reaches the main region."],
    ["Reduced Motion", "Remove decorative movement. Preserve state and cause."],
    ["Forced Colors", "Keep system boundaries. Do not remove native focus."],
    ["Dynamic Type", "Let native iOS text expand. Do not clip essential controls."],
    ["VoiceOver", "Read task, condition, action, limit, and recovery in that order."],
    ["Targets", "Use a 44 point or CSS pixel minimum interactive target."],
    ["Contrast", "Check each theme and state. Do not infer conformance from one screenshot."],
    ["Offline", "Keep the local draft and a manual recovery route."],
  ];
  rules.forEach(([title, body], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const item = addFrame(board, title, 64 + column * 748, 1320 + row * 168, 716, 140, index % 2 === 0 ? C.light.surface : C.light.strong, 12);
    item.strokes = [solid(C.light.line)];
    item.strokeWeight = 1;
    addText(item, title, 22, 20, 190, 16, C.light.ink, { font: FONT.medium, lineHeight: 22 });
    addText(item, body, 220, 20, 460, 14, C.light.muted, { lineHeight: 22 });
  });
  remember("frames", board);
}

function addCoverageColumn(board, title, items, x, y, width) {
  addText(board, title.toUpperCase(), x, y, width, 11, C.light.tested, {
    font: FONT.mono,
    lineHeight: 15,
    letterSpacing: 4,
  });

  items.forEach(([id, route, name], index) => {
    const rowY = y + 42 + index * 84;
    const row = addFrame(board, `Coverage / ${id}`, x, rowY, width, 72, C.light.surface, 10);
    row.strokes = [solid(REPRESENTATIVE_IDS.has(id) ? C.light.tested : C.light.line)];
    row.strokeWeight = 1;
    addText(row, id, 16, 12, 74, 11, REPRESENTATIVE_IDS.has(id) ? C.light.tested : C.light.muted, {
      font: FONT.mono,
      lineHeight: 15,
      letterSpacing: 2,
    });
    addText(row, name, 96, 10, width - 112, 15, C.light.ink, {
      font: FONT.medium,
      lineHeight: 20,
    });
    addText(row, route, 96, 38, width - 204, 11, C.light.muted, {
      font: FONT.mono,
      lineHeight: 15,
    });
    addText(
      row,
      REPRESENTATIVE_IDS.has(id) ? "EDITABLE" : "ATLAS",
      width - 96,
      40,
      78,
      9,
      REPRESENTATIVE_IDS.has(id) ? C.light.tested : C.light.dim,
      { font: FONT.mono, lineHeight: 12, letterSpacing: 2 },
    );
  });

  return y + 42 + items.length * 84;
}

function createCoverageIndex(page) {
  const board = mark(addFrame(page, "FORGE Terrain / Canonical coverage index", 1480, 0, 1600, 2100, C.light.bg));
  addText(board, "09 / CANONICAL COVERAGE", 64, 56, 620, 13, C.light.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  addText(board, "One system. Every surface.", 64, 106, 1040, 64, C.light.ink, {
    font: FONT.display,
    lineHeight: 66,
    letterSpacing: -3,
  });
  addText(
    board,
    "The coded atlas contains every canonical family. Green rows also have representative editable Figma boards.",
    68,
    198,
    1120,
    18,
    C.light.muted,
    { lineHeight: 28 },
  );

  const legend = addFrame(board, "Coverage legend", 64, 264, 1468, 74, C.light.strong, 10);
  legend.strokes = [solid(C.light.line)];
  legend.strokeWeight = 1;
  addText(legend, "EDITABLE", 18, 16, 90, 10, C.light.tested, {
    font: FONT.mono,
    lineHeight: 14,
    letterSpacing: 3,
  });
  addText(legend, "Representative Figma board", 118, 14, 260, 14, C.light.ink, { lineHeight: 20 });
  addText(legend, "ATLAS", 420, 16, 76, 10, C.light.dim, {
    font: FONT.mono,
    lineHeight: 14,
    letterSpacing: 3,
  });
  addText(legend, "Canonical coded surface", 506, 14, 260, 14, C.light.ink, { lineHeight: 20 });
  addText(legend, "/internal/design-lab", 1050, 14, 390, 12, C.light.muted, {
    font: FONT.mono,
    lineHeight: 18,
  });

  const firstColumnEnd = addCoverageColumn(board, "Public site", CANONICAL_COVERAGE.public, 64, 386, 456);
  addCoverageColumn(board, "Focus mode", CANONICAL_COVERAGE.focus, 64, firstColumnEnd + 18, 456);
  addCoverageColumn(board, "Web application", CANONICAL_COVERAGE.app, 572, 386, 456);
  addCoverageColumn(board, "iOS application", CANONICAL_COVERAGE.ios, 1080, 386, 456);

  addText(
    board,
    "Coverage is explicit. Representative depth does not replace canonical inventory.",
    64,
    2018,
    1100,
    15,
    C.light.ink,
    { font: FONT.medium, lineHeight: 22 },
  );
  remember("frames", board);
}

function createArchive(page) {
  const board = remember(
    "frames",
    mark(addFrame(page, "FORGE Terrain / Build receipt", 0, 0, 1400, 1180, C.dark.bg)),
  );
  addText(board, "09 / BUILD RECEIPT", 56, 54, 420, 13, C.dark.tested, {
    font: FONT.mono,
    lineHeight: 18,
    letterSpacing: 6,
  });
  addText(board, "Editable source created.", 56, 104, 980, 58, C.dark.ink, {
    font: FONT.display,
    lineHeight: 62,
    letterSpacing: -3,
  });
  addText(board, "This receipt records the generated local identifiers. The repository remains the value source.", 60, 186, 840, 17, C.dark.muted, {
    lineHeight: 27,
  });

  const counts = [
    ["Pages", RECEIPT.pages.length],
    ["Collections", RECEIPT.collections.length],
    ["Variables", RECEIPT.variables.length],
    ["Text styles", RECEIPT.textStyles.length],
    ["Paint styles", RECEIPT.paintStyles.length],
    ["Effect styles", RECEIPT.effectStyles.length],
    ["Components", RECEIPT.components.length],
    ["Generated frames", RECEIPT.frames.length],
  ];
  counts.forEach(([label, value], index) => {
    const card = addFrame(board, label, 56 + (index % 4) * 320, 278 + Math.floor(index / 4) * 150, 286, 120, C.dark.surface, 12);
    card.strokes = [solid(C.dark.line)];
    card.strokeWeight = 1;
    addText(card, String(value), 20, 18, 240, 36, C.dark.ink, { font: FONT.display, lineHeight: 42 });
    addText(card, label.toUpperCase(), 20, 74, 240, 10, C.dark.tested, { font: FONT.mono, lineHeight: 14, letterSpacing: 3 });
  });

  addText(board, "SOURCE", 56, 618, 220, 11, C.dark.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
  addText(board, "FORGE Terrain Builder 1.0.0\nStarter fallback: separate Light and Dark semantic collections\nGenerated: 2026-08-01", 56, 660, 600, 15, C.dark.ink, {
    font: FONT.mono,
    lineHeight: 26,
  });
  addText(board, "PERMANENT RULES", 744, 618, 320, 11, C.dark.tested, { font: FONT.mono, lineHeight: 15, letterSpacing: 4 });
  addText(board, "Vivid at thresholds. Quiet during work.\nLearner acts. AI assists. Evidence decides.\nRecall → Attempt → Repair → Prove → Return", 744, 660, 590, 16, C.dark.ink, {
    lineHeight: 28,
  });

  addText(board, "Representative source identifiers", 56, 820, 620, 22, C.dark.ink, { font: FONT.medium, lineHeight: 28 });
  const idLines = [
    ...RECEIPT.collections.slice(0, 3).map((item) => `${item.id}  ${item.name}`),
    ...RECEIPT.frames.slice(0, 9).map((item) => `${item.id}  ${item.name}`),
  ];
  addText(board, idLines.join("\n"), 56, 866, 1260, 12, C.dark.muted, {
    font: FONT.mono,
    lineHeight: 20,
  });
}

async function build() {
  figma.skipInvisibleInstanceChildren = true;
  await loadFonts();

  const pages = {};
  for (const name of PAGE_NAMES) {
    const page = createPage(name);
    pages[name] = page;
    remember("pages", page);
  }

  for (const name of PAGE_NAMES) {
    if (typeof pages[name].loadAsync === "function") await pages[name].loadAsync();
    await figma.setCurrentPageAsync(pages[name]);
    clearGenerated(pages[name]);
  }

  await buildVariables();
  await buildTextStyles();
  await buildPaintStyles();
  await buildEffectStyles();

  await figma.setCurrentPageAsync(pages["00 Cover"]);
  createCover(pages["00 Cover"]);
  await figma.setCurrentPageAsync(pages["01 Foundations"]);
  createFoundations(pages["01 Foundations"]);
  await figma.setCurrentPageAsync(pages["02 Web Components"]);
  createWebComponents(pages["02 Web Components"]);
  await figma.setCurrentPageAsync(pages["03 Public Site"]);
  createPublicScreens(pages["03 Public Site"]);
  await figma.setCurrentPageAsync(pages["04 Web Application"]);
  createAppScreens(pages["04 Web Application"]);
  await figma.setCurrentPageAsync(pages["05 Focus Mode"]);
  createFocusScreens(pages["05 Focus Mode"]);
  await figma.setCurrentPageAsync(pages["06 iOS Components"]);
  createIOSComponents(pages["06 iOS Components"]);
  await figma.setCurrentPageAsync(pages["07 iOS Application"]);
  createIOSScreens(pages["07 iOS Application"]);
  await figma.setCurrentPageAsync(pages["08 States and Accessibility"]);
  createStatesAndAccessibility(pages["08 States and Accessibility"]);
  await figma.setCurrentPageAsync(pages["09 Archive"]);
  createCoverageIndex(pages["09 Archive"]);
  createArchive(pages["09 Archive"]);

  figma.root.setPluginData("forge.terrain.version", FORGE_VERSION);
  figma.root.setPluginData("forge.terrain.receipt", JSON.stringify(RECEIPT));
  await figma.setCurrentPageAsync(pages["00 Cover"]);
  const cover = pages["00 Cover"].children.find((node) => node.name === "FORGE Terrain / Cover");
  if (cover) figma.viewport.scrollAndZoomIntoView([cover]);
  figma.notify("FORGE Terrain source created. Open 09 Archive for the build receipt.", { timeout: 5000 });
  figma.closePlugin("FORGE Terrain source created.");
}

build().catch((error) => {
  const message = error && error.message ? error.message : String(error);
  figma.notify(`FORGE Terrain Builder stopped: ${message}`, { error: true, timeout: 8000 });
  figma.closePlugin(`FORGE Terrain Builder stopped: ${message}`);
});
