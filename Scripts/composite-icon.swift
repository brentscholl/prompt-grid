import AppKit
import ImageIO
import UniformTypeIdentifiers

/// Composites an existing transparent icon over a full-canvas background without
/// changing the icon artwork's size or position.
guard CommandLine.arguments.count == 4 else {
    fputs("Usage: composite-icon.swift <background> <overlay> <output>\n", stderr)
    exit(1)
}

let backgroundPath = CommandLine.arguments[1]
let overlayPath = CommandLine.arguments[2]
let outputPath = CommandLine.arguments[3]

guard let background = NSImage(contentsOfFile: backgroundPath),
      let overlay = NSImage(contentsOfFile: overlayPath) else {
    fputs("Unable to load the background or overlay image.\n", stderr)
    exit(1)
}

let canvasSize = NSSize(width: 1024, height: 1024)
guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(canvasSize.width),
    pixelsHigh: Int(canvasSize.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fputs("Unable to create the output bitmap.\n", stderr)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
let canvas = NSRect(origin: .zero, size: canvasSize)
background.draw(in: canvas, from: .zero, operation: .copy, fraction: 1)
overlay.draw(in: canvas, from: .zero, operation: .sourceOver, fraction: 1)
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Unable to encode the composited icon.\n", stderr)
    exit(1)
}

do {
    try png.write(to: URL(fileURLWithPath: outputPath), options: .atomic)
} catch {
    fputs("Unable to write the composited icon: \(error)\n", stderr)
    exit(1)
}
