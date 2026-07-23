/** The stable post-build receipt consumed by the provider integration. */
export function publicBuildBoundaryReceiptLine(staticAssetCount: number, digest: string): string {
  return `Public build boundary verified across ${staticAssetCount} static assets; public asset digest ${digest}.\n`;
}
