import AppKit
import CoreGraphics
import Foundation

guard CommandLine.arguments.count == 2 else {
  fputs("Usage: render-opaque-png.swift <png path>\\n", stderr)
  exit(64)
}

let imageURL = URL(fileURLWithPath: CommandLine.arguments[1])

guard let sourceImage = NSImage(contentsOf: imageURL),
  let sourceRepresentation = sourceImage.representations.first as? NSBitmapImageRep,
  let sourceCGImage = sourceRepresentation.cgImage
else {
  fputs("Cannot read PNG: \(imageURL.path)\\n", stderr)
  exit(1)
}

let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let bitmapInfo = CGImageAlphaInfo.noneSkipLast.rawValue

guard
  let context = CGContext(
    data: nil,
    width: sourceCGImage.width,
    height: sourceCGImage.height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: bitmapInfo
  )
else {
  fputs("Cannot create opaque PNG graphics context.\\n", stderr)
  exit(1)
}

context.setFillColor(red: 244 / 255, green: 247 / 255, blue: 241 / 255, alpha: 1)
context.fill(CGRect(x: 0, y: 0, width: sourceCGImage.width, height: sourceCGImage.height))
context.draw(
  sourceCGImage, in: CGRect(x: 0, y: 0, width: sourceCGImage.width, height: sourceCGImage.height))

guard let opaqueCGImage = context.makeImage() else {
  fputs("Cannot create opaque PNG image.\\n", stderr)
  exit(1)
}

let destination = NSBitmapImageRep(cgImage: opaqueCGImage)

guard let data = destination.representation(using: NSBitmapImageRep.FileType.png, properties: [:])
else {
  fputs("Cannot encode opaque PNG.\\n", stderr)
  exit(1)
}

do {
  try data.write(to: imageURL, options: Data.WritingOptions.atomic)
} catch {
  fputs("Cannot write opaque PNG: \(error.localizedDescription)\\n", stderr)
  exit(1)
}
