import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let nextId = 1;

class NodeMock {
  constructor(type) {
    this.type = type;
    this.id = String(nextId++);
    this.name = type;
    this.children = [];
    this.pluginData = {};
    this.width = 100;
    this.height = 100;
    this.x = 0;
    this.y = 0;
    this.fills = [];
    this.strokes = [];
    this.boundVariables = {};
  }

  appendChild(node) {
    if (node.parent) {
      const index = node.parent.children.indexOf(node);
      if (index >= 0) node.parent.children.splice(index, 1);
    }
    node.parent = this;
    this.children.push(node);
    return node;
  }

  resize(width, height) {
    assert.ok(width >= 0, `Invalid width for ${this.name}`);
    assert.ok(height >= 0, `Invalid height for ${this.name}`);
    this.width = width;
    this.height = height;
  }

  remove() {
    if (!this.parent) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
  }

  setPluginData(key, value) {
    this.pluginData[key] = value;
  }

  getPluginData(key) {
    return this.pluginData[key] || "";
  }

  setBoundVariable(field, variable) {
    assert.ok(variable && variable.id, `Invalid variable binding for ${this.name}`);
    this.boundVariables[field] = variable.id;
  }

  async loadAsync() {}
}

class StyleMock {
  constructor(type) {
    this.type = type;
    this.id = String(nextId++);
    this.name = "";
  }
}

function createMockFigma(resolveClose) {
  const root = new NodeMock("DOCUMENT");
  const firstPage = new NodeMock("PAGE");
  firstPage.name = "Page 1";
  root.appendChild(firstPage);

  const collections = [];
  const variables = [];
  const textStyles = [];
  const paintStyles = [];
  const effectStyles = [];

  const figma = {
    root,
    currentPage: firstPage,
    skipInvisibleInstanceChildren: false,
    createPage() {
      const node = new NodeMock("PAGE");
      root.appendChild(node);
      return node;
    },
    createFrame: () => new NodeMock("FRAME"),
    createRectangle: () => new NodeMock("RECTANGLE"),
    createEllipse: () => new NodeMock("ELLIPSE"),
    createText() {
      const node = new NodeMock("TEXT");
      node.characters = "";
      return node;
    },
    createComponent: () => new NodeMock("COMPONENT"),
    combineAsVariants(items, parent) {
      const set = new NodeMock("COMPONENT_SET");
      parent.appendChild(set);
      items.forEach((item) => set.appendChild(item));
      return set;
    },
    createTextStyle() {
      const style = new StyleMock("TEXT");
      textStyles.push(style);
      return style;
    },
    createPaintStyle() {
      const style = new StyleMock("PAINT");
      paintStyles.push(style);
      return style;
    },
    createEffectStyle() {
      const style = new StyleMock("EFFECT");
      effectStyles.push(style);
      return style;
    },
    getLocalTextStylesAsync: async () => textStyles,
    getLocalPaintStylesAsync: async () => paintStyles,
    getLocalEffectStylesAsync: async () => effectStyles,
    listAvailableFontsAsync: async () => (
      ["Geist", "Geist Mono", "Libre Baskerville", "SF Pro", "SF Pro Display", "Inter"]
        .flatMap((family) => ["Regular", "Medium", "Semi Bold", "Semibold"]
          .map((style) => ({ fontName: { family, style } })))
    ),
    loadFontAsync: async () => {},
    async setCurrentPageAsync(page) {
      figma.currentPage = page;
      await page.loadAsync();
    },
    viewport: {
      scrollAndZoomIntoView() {},
    },
    notify() {},
    closePlugin(message) {
      resolveClose(message);
    },
    variables: {
      getLocalVariableCollectionsAsync: async () => collections,
      getLocalVariablesAsync: async () => variables,
      createVariableCollection(name) {
        const collection = {
          id: String(nextId++),
          name,
          defaultModeId: String(nextId++),
          renameMode(id, value) {
            void id;
            this.modeName = value;
          },
        };
        collections.push(collection);
        return collection;
      },
      createVariable(name, collection, resolvedType) {
        const variable = {
          id: String(nextId++),
          name,
          variableCollectionId: collection.id,
          resolvedType,
          scopes: [],
          values: {},
          setValueForMode(id, value) {
            this.values[id] = value;
          },
          setVariableCodeSyntax(platform, value) {
            this.codeSyntax ??= {};
            this.codeSyntax[platform] = value;
          },
          remove() {
            const index = variables.indexOf(this);
            if (index >= 0) variables.splice(index, 1);
          },
        };
        variables.push(variable);
        return variable;
      },
      createVariableAlias(variable) {
        return { type: "VARIABLE_ALIAS", id: variable.id };
      },
    },
  };

  return { figma, root, collections, variables };
}

let resolveClose;
const closed = new Promise((resolve) => {
  resolveClose = resolve;
});
const { figma, root, collections, variables } = createMockFigma(resolveClose);
const source = fs.readFileSync(
  new URL("./figma-forge-terrain-plugin/code.js", import.meta.url),
  "utf8",
);

vm.runInNewContext(source, {
  figma,
  console,
  setTimeout,
  clearTimeout,
}, {
  filename: "figma-forge-terrain-plugin/code.js",
});

const message = await closed;
assert.doesNotMatch(message, /stopped/i);

const receipt = JSON.parse(root.getPluginData("forge.terrain.receipt"));
const coverage = JSON.parse(root.getPluginData("forge.terrain.coverage"));
const expectedCounts = {
  pages: 10,
  collections: 3,
  variables: 86,
  textStyles: 18,
  paintStyles: 7,
  effectStyles: 2,
  components: 33,
  frames: 28,
};

for (const [key, count] of Object.entries(expectedCounts)) {
  assert.equal(receipt[key].length, count, `${key} count`);
}

assert.equal(receipt.aliases.length, 32, "semantic alias count");
const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
const variableById = new Map(variables.map((variable) => [variable.id, variable]));
const primitiveCollection = collections.find((collection) => collection.name === "FORGE / Primitive");
assert.ok(primitiveCollection, "Missing primitive collection");
for (const alias of receipt.aliases) {
  const semantic = variableById.get(alias.semanticVariableId);
  const target = variableById.get(alias.targetVariableId);
  assert.ok(semantic, `Missing semantic variable ${alias.semanticVariableName}`);
  assert.ok(target, `Missing alias target ${alias.targetVariableName}`);
  assert.equal(semantic.name, alias.semanticVariableName, "Semantic alias name");
  assert.equal(semantic.variableCollectionId, alias.semanticCollectionId, "Semantic alias collection");
  assert.equal(target.variableCollectionId, primitiveCollection.id, "Alias target collection");
  assert.equal(target.name, alias.targetVariableName, "Alias target name");
  assert.match(target.name, new RegExp(`^color/primitive/${alias.mode}/`), "Alias target mode");
  const semanticCollection = collectionById.get(alias.semanticCollectionId);
  assert.ok(semanticCollection, `Missing semantic collection ${alias.semanticCollectionId}`);
  assert.deepEqual(
    semantic.values[semanticCollection.defaultModeId],
    { type: "VARIABLE_ALIAS", id: target.id },
    `Alias target value for ${alias.semanticVariableName}`,
  );
}

const nodesById = new Map();
const collectNodes = (node) => {
  nodesById.set(node.id, node);
  for (const child of node.children || []) collectNodes(child);
};
collectNodes(root);
const relativeLuminance = (color) => {
  const channels = [color.r, color.g, color.b].map((channel) =>
    channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrastRatio = (first, second) => {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
};
for (const nodeName of ["Intent=Primary, State=Default", "Primary action"]) {
  const action = [...nodesById.values()].find((node) => node.name === nodeName);
  assert.ok(action, `Missing contrast target: ${nodeName}`);
  const label = (action.children || []).find((node) => node.type === "TEXT");
  const background = action.fills.find((paint) => paint.type === "SOLID");
  const foreground = label?.fills.find((paint) => paint.type === "SOLID");
  assert.ok(background && foreground, `Missing button paints: ${nodeName}`);
  assert.ok(
    contrastRatio(background.color, foreground.color) >= 4.5,
    `Primary action contrast is below 4.5:1: ${nodeName}`,
  );
}
assert.ok(receipt.bindings.length > 0, "No component variable bindings recorded");
for (const binding of receipt.bindings) {
  const node = nodesById.get(binding.nodeId);
  const variable = variableById.get(binding.variableId);
  assert.ok(node, `Missing bound node ${binding.nodeId}`);
  assert.ok(variable, `Missing bound variable ${binding.variableId}`);
  assert.equal(node.boundVariables[binding.field], binding.variableId, `Binding field for ${binding.nodeName}`);
  assert.equal(variable.resolvedType, "COLOR", `Binding type for ${binding.variableName}`);
  const collection = collectionById.get(variable.variableCollectionId);
  assert.ok(collection, `Missing binding collection for ${binding.variableName}`);
  assert.match(collection.name, /^FORGE \/ Semantic \/ (Light|Dark)$/);
}
const componentRecords = receipt.components.filter((item) => item.type === "COMPONENT");
assert.equal(receipt.componentBindings.length, componentRecords.length, "Component binding record count");
for (const componentBinding of receipt.componentBindings) {
  assert.ok(componentBinding.semanticPaints > 0, `No semantic paints in ${componentBinding.componentName}`);
  assert.equal(
    componentBinding.boundPaints,
    componentBinding.semanticPaints,
    `Unbound semantic paint in ${componentBinding.componentName}`,
  );
}

const expectedFamilyCounts = {
  public: 11,
  app: 14,
  focus: 3,
  ios: 18,
};

for (const [family, count] of Object.entries(expectedFamilyCounts)) {
  assert.equal(coverage[family].length, count, `${family} coverage count`);
}

const coverageIds = Object.values(coverage)
  .flat()
  .map((item) => item.id);
assert.equal(new Set(coverageIds).size, 46, "canonical coverage identifier count");
assert.equal(
  Object.values(coverage).flat().filter((item) => item.editable).length,
  21,
  "representative editable identifier count",
);

const atlasSource = fs.readFileSync(
  new URL("../../src/components/forge/design-lab/ProductDesignAtlas.tsx", import.meta.url),
  "utf8",
);
const atlasIds = [...atlasSource.matchAll(/\bid:\s*"(PUB|APP|FOCUS|IOS)-\d+"/g)]
  .map((match) => match[0].match(/"(.*?)"/)[1]);
assert.deepEqual(
  [...coverageIds].sort(),
  [...atlasIds].sort(),
  "Figma coverage identifiers must match the coded atlas",
);

for (const pageName of [
  "03 Public Site",
  "04 Web Application",
  "05 Focus Mode",
  "07 iOS Application",
]) {
  const page = root.children.find((item) => item.name === pageName);
  assert.ok(page, `Missing page: ${pageName}`);
  assert.ok(page.children.length > 0, `Empty page: ${pageName}`);
}

const archive = root.children.find((item) => item.name === "09 Archive");
assert.ok(archive, "Missing page: 09 Archive");
assert.ok(
  archive.children.some((item) => item.name === "FORGE Terrain / Canonical coverage index"),
  "Missing canonical coverage index",
);

console.log(
  `FORGE Figma generator verified: ${receipt.pages.length} pages, `
  + `${receipt.variables.length} variables, ${receipt.components.length} components, `
  + `${receipt.frames.length} frames.`,
);
