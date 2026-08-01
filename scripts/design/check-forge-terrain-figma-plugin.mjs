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

  return { figma, root };
}

let resolveClose;
const closed = new Promise((resolve) => {
  resolveClose = resolve;
});
const { figma, root } = createMockFigma(resolveClose);
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
const expectedCounts = {
  pages: 10,
  collections: 3,
  variables: 86,
  textStyles: 18,
  paintStyles: 7,
  effectStyles: 2,
  components: 17,
  frames: 28,
};

for (const [key, count] of Object.entries(expectedCounts)) {
  assert.equal(receipt[key].length, count, `${key} count`);
}

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
