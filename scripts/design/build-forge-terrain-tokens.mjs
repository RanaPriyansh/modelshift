import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = process.cwd();
const outputDirectory = resolve(repositoryRoot, "docs/design/tokens");
const cssPath = resolve(repositoryRoot, "app/forge-system.css");
const shouldCheck = process.argv.includes("--check");
const shouldWrite = process.argv.includes("--write");

if (shouldCheck === shouldWrite) {
  throw new Error("Use exactly one mode: --write or --check.");
}

const semanticColors = [
  {
    path: ["color", "bg", "default"],
    css: "--forge-bg",
    swift: "background",
    meaning: "Main canvas",
    light: "#F4F7F1",
    dark: "#071722",
  },
  {
    path: ["color", "bg", "deep"],
    css: "--forge-bg-deep",
    swift: "backgroundDeep",
    meaning: "Deep canvas",
    light: "#EEF3ED",
    dark: "#06131D",
  },
  {
    path: ["color", "surface", "default"],
    css: "--forge-surface",
    swift: "surface",
    meaning: "Work surface",
    light: "#FBFDF8",
    dark: "#0D202B",
  },
  {
    path: ["color", "surface", "strong"],
    css: "--forge-surface-strong",
    swift: "surfaceStrong",
    meaning: "Emphasis surface",
    light: "#E4EBE4",
    dark: "#142A35",
  },
  {
    path: ["color", "border", "default"],
    css: "--forge-line",
    swift: "border",
    meaning: "Boundary",
    light: "#CDD9D0",
    dark: "#29414B",
  },
  {
    path: ["color", "border", "strong"],
    css: "--forge-line-strong",
    swift: "borderStrong",
    meaning: "Strong boundary",
    light: "#98AA9E",
    dark: "#44606A",
  },
  {
    path: ["color", "text", "default"],
    css: "--forge-ink",
    swift: "text",
    meaning: "Main text",
    light: "#102019",
    dark: "#F3F7F0",
  },
  {
    path: ["color", "text", "muted"],
    css: "--forge-muted",
    swift: "textMuted",
    meaning: "Supporting text",
    light: "#56645D",
    dark: "#A8B9B1",
  },
  {
    path: ["color", "text", "dim"],
    css: "--forge-dim",
    swift: "textDim",
    meaning: "Secondary metadata",
    light: "#68766E",
    dark: "#82958B",
  },
  {
    path: ["color", "action", "learner"],
    css: "--forge-amber",
    swift: "learnerAction",
    meaning: "Learner commitment",
    light: "#F0643B",
    dark: "#FF8059",
  },
  {
    path: ["color", "action", "learner-strong"],
    css: "--forge-amber-deep",
    swift: "learnerActionStrong",
    meaning: "Strong learner state",
    light: "#A93C20",
    dark: "#FF9B7B",
  },
  {
    path: ["color", "contribution", "ai"],
    css: "--forge-violet",
    swift: "aiContribution",
    meaning: "Disclosed AI contribution",
    light: "#2F66D8",
    dark: "#85AAFF",
  },
  {
    path: ["color", "contribution", "ai-strong"],
    css: "--forge-violet-deep",
    swift: "aiContributionStrong",
    meaning: "Strong AI state",
    light: "#174EAE",
    dark: "#6F96EE",
  },
  {
    path: ["color", "evidence", "tested"],
    css: "--forge-cyan",
    swift: "testedEvidence",
    meaning: "Tested consequence",
    light: "#2C8A61",
    dark: "#79C995",
  },
  {
    path: ["color", "evidence", "tested-strong"],
    css: "--forge-cyan-deep",
    swift: "testedEvidenceStrong",
    meaning: "Strong tested state",
    light: "#185F43",
    dark: "#67BD84",
  },
  {
    path: ["color", "focus"],
    css: "--forge-focus",
    swift: "focus",
    meaning: "Keyboard and assistive focus",
    light: "#145BD7",
    dark: "#8FB0FF",
  },
];

const coreTokens = {
  "$description": "FORGE Terrain core values. Import this file as one Figma variable mode.",
  "$extensions": {
    "org.forge.version": "1.0.0",
    "org.forge.collection": "FORGE / Primitive",
  },
  space: {
    "$type": "dimension",
    "1": dimension(4),
    "2": dimension(8),
    "3": dimension(12),
    "4": dimension(16),
    "5": dimension(24),
    "6": dimension(32),
    "7": dimension(48),
    "8": dimension(64),
  },
  radius: {
    "$type": "dimension",
    sm: dimension(6),
    md: dimension(12),
  },
  target: {
    "$type": "dimension",
    minimum: dimension(44),
  },
  layout: {
    "$type": "dimension",
    mobileMinimum: dimension(320),
    contentMaximum: dimension(1280),
    iosMargin: dimension(16),
    iosSection: dimension(24),
  },
  motion: {
    "$type": "duration",
    control: duration(180),
    surface: duration(240),
    scene: duration(450),
  },
  typeface: {
    "$type": "fontFamily",
    interface: token("Geist"),
    mono: token("Geist Mono"),
    reflection: token("Libre Baskerville"),
    ios: token("SF Pro"),
  },
};

function token(value, description) {
  return {
    "$value": value,
    ...(description ? { "$description": description } : {}),
  };
}

function dimension(value) {
  return token({ value, unit: "px" });
}

function duration(value) {
  return token({ value: value / 1000, unit: "s" });
}

function colorValue(hex) {
  const normalized = hex.replace("#", "").toUpperCase();
  const components = [0, 2, 4].map((offset) =>
    Number((Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255).toFixed(8)),
  );
  return {
    colorSpace: "srgb",
    components,
    alpha: 1,
    hex: `#${normalized}`,
  };
}

function setNestedToken(document, path, value) {
  let cursor = document;
  for (const segment of path.slice(0, -1)) {
    cursor[segment] ??= {};
    cursor = cursor[segment];
  }
  cursor[path.at(-1)] = value;
}

function buildSemanticMode(mode) {
  const document = {
    "$description": `FORGE Terrain semantic colors for ${mode} appearance.`,
    "$extensions": {
      "org.forge.version": "1.0.0",
      "org.forge.collection": "FORGE / Semantic",
      "org.forge.mode": mode,
    },
  };
  const modeKey = mode.toLowerCase();
  for (const item of semanticColors) {
    setNestedToken(
      document,
      item.path,
      {
        "$type": "color",
        "$value": colorValue(item[modeKey]),
        "$description": item.meaning,
      },
    );
  }
  return document;
}

function buildPlatformMap() {
  return {
    schemaVersion: "1.0",
    designTokenFormat: "DTCG 2025.10",
    figma: {
      primitiveCollection: "FORGE / Primitive",
      semanticCollection: "FORGE / Semantic",
      modes: ["Light", "Dark"],
    },
    tokens: Object.fromEntries(
      semanticColors.map((item) => [
        item.path.join("/"),
        {
          css: item.css,
          figma: item.path.join("/"),
          swift: `ForgeTerrainColor.${item.swift}`,
          meaning: item.meaning,
        },
      ]),
    ),
  };
}

function buildIOSHandoff() {
  return {
    schemaVersion: "1.0",
    status: "design-handoff",
    implementationStatus: "native-reference-source-ready",
    direction: "Vivid at thresholds. Quiet during work. Precise when evidence appears.",
    source: "forge-terrain.semantic.light.tokens.json and forge-terrain.semantic.dark.tokens.json",
    typography: {
      interface: "SF Pro through native text styles",
      technicalIdentifiers: "SF Mono",
      dynamicTypeRequired: true,
      dynamicTypeLimitAllowed: false,
    },
    layout: {
      compactMarginPoints: 16,
      sectionSpacingRangePoints: [20, 24],
      sectionSpacingPoints: 24,
      minimumTargetPoints: 44,
      nativeSafeAreasRequired: true,
    },
    behavior: {
      navigation: "NavigationStack",
      tabBar: {
        component: "native TabView",
        tabs: ["Today", "Paths", "Projects", "Evidence"],
        retainsIndependentNavigationPath: true,
      },
      focusRoutesHideTabBar: true,
      reduceMotionRequired: true,
      reduceTransparencyRequired: true,
      differentiateWithoutColorRequired: true,
      voiceOverOrderRequired: true,
      localDraftRecoveryRequired: true,
      hiddenLearnerTextTelemetryAllowed: false,
      canonicalEvidenceRequiresServerReceipt: true,
      learnerCommitmentHaptic: {
        pattern: "system success",
        firesAfterDurableSave: true,
        actions: ["commit-attempt", "submit-proof", "submit-protected-return"],
        canBeDisabled: true,
      },
    },
    screenIDs: [
      "IOS-01",
      "IOS-02",
      "IOS-03",
      "IOS-04",
      "IOS-05",
      "IOS-06",
      "IOS-07",
      "IOS-08",
      "IOS-09",
      "IOS-10",
      "IOS-11",
      "IOS-12",
      "IOS-13",
      "IOS-14",
      "IOS-15",
      "IOS-16",
      "IOS-17",
      "IOS-18",
    ],
    appearances: Object.fromEntries(
      ["light", "dark"].map((mode) => [
        mode,
        Object.fromEntries(
          semanticColors.map((item) => [
            item.swift,
            {
              hex: item[mode],
              role: item.meaning,
            },
          ]),
        ),
      ]),
    ),
  };
}

const outputDocuments = new Map([
  ["forge-terrain.core.tokens.json", coreTokens],
  ["forge-terrain.semantic.light.tokens.json", buildSemanticMode("Light")],
  ["forge-terrain.semantic.dark.tokens.json", buildSemanticMode("Dark")],
  ["forge-terrain.platform-map.json", buildPlatformMap()],
  ["forge-terrain.ios.json", buildIOSHandoff()],
]);

const serializedDocuments = new Map(
  [...outputDocuments].map(([filename, document]) => [
    filename,
    `${JSON.stringify(document, null, 2)}\n`,
  ]),
);

if (shouldWrite) {
  await mkdir(outputDirectory, { recursive: true });
  for (const [filename, contents] of serializedDocuments) {
    await writeFile(resolve(outputDirectory, filename), contents, "utf8");
  }
}

if (shouldCheck) {
  for (const [filename, expected] of serializedDocuments) {
    const actual = await readFile(resolve(outputDirectory, filename), "utf8");
    if (actual !== expected) {
      throw new Error(`${filename} does not match the canonical generator.`);
    }
  }
}

const css = (await readFile(cssPath, "utf8")).toLowerCase();
for (const item of semanticColors) {
  for (const mode of ["light", "dark"]) {
    const declaration = `${item.css}: ${item[mode].toLowerCase()}`;
    if (!css.includes(declaration)) {
      throw new Error(`Missing CSS match for ${item.path.join("/")} in ${mode} mode.`);
    }
  }
}

const lightNames = flattenTokenNames(buildSemanticMode("Light"));
const darkNames = flattenTokenNames(buildSemanticMode("Dark"));
if (JSON.stringify(lightNames) !== JSON.stringify(darkNames)) {
  throw new Error("Light and Dark semantic modes do not have identical token names.");
}

validateFigmaCoreTokens(coreTokens);

console.log(
  `FORGE Terrain token handoff verified: ${semanticColors.length} semantic colors, ${lightNames.length} matched mode tokens, and ${outputDocuments.size} output files.`,
);

function flattenTokenNames(document, prefix = []) {
  const names = [];
  for (const [key, value] of Object.entries(document)) {
    if (key.startsWith("$")) continue;
    const path = [...prefix, key];
    if (value && typeof value === "object" && "$value" in value) {
      names.push(path.join("/"));
    } else if (value && typeof value === "object") {
      names.push(...flattenTokenNames(value, path));
    }
  }
  return names.sort();
}

function validateFigmaCoreTokens(document, inheritedType) {
  const groupType = document.$type ?? inheritedType;
  for (const [key, value] of Object.entries(document)) {
    if (key.startsWith("$") || !value || typeof value !== "object") continue;
    if ("$value" in value) {
      const type = value.$type ?? groupType;
      if (type === "dimension" && value.$value.unit !== "px") {
        throw new Error(`${key} must use px for Figma dimension import.`);
      }
      if (type === "duration" && value.$value.unit !== "s") {
        throw new Error(`${key} must use seconds for Figma duration import.`);
      }
      if (type === "fontFamily" && typeof value.$value !== "string") {
        throw new Error(`${key} must use one font name for Figma import.`);
      }
    } else {
      validateFigmaCoreTokens(value, groupType);
    }
  }
}
