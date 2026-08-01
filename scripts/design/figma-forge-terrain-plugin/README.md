# FORGE Terrain Builder

This local Figma plugin creates the editable FORGE Terrain design source.

It creates:

- Ten named pages.
- One 54-variable Primitive collection.
- Two 16-variable Semantic collections for Light and Dark.
- Eighteen text styles.
- Seven paint styles.
- Two effect styles.
- Reusable web and iOS components.
- Six public-site boards.
- Six web-application boards.
- Three focus boards.
- Six iOS boards.
- Shared state and accessibility boards.
- One canonical coverage index for all 46 public, web, focus, and iOS families.

The plugin only removes nodes that it created in an earlier run.

## Run

1. Open `FORGE Terrain Product Design System` in the Figma desktop application.
2. Select **Plugins > Development > Import plugin from manifest**.
3. Select this `manifest.json` file.
4. Run **FORGE Terrain Builder**.

The plugin writes a coverage index and a build receipt to the `09 Archive` page.

The plugin uses separate Light and Dark semantic collections.

This structure is compatible with the current Starter plan.
