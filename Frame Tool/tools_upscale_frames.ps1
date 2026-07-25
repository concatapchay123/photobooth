param(
  [int]$Scale = 2,
  [double]$Sharpen = 0.28,
  [switch]$Overwrite,
  [int]$Limit = 0,
  [string]$Root = ''
)

$ErrorActionPreference = 'Stop'

if ($Scale -lt 1) {
  throw 'Scale must be 1 or greater.'
}

$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Resolve-Path -LiteralPath '.').Path }
if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = (Resolve-Path -LiteralPath (Join-Path $ScriptRoot '..')).Path
  if (-not (Test-Path -LiteralPath (Join-Path $Root 'frames'))) {
    $Root = (Resolve-Path -LiteralPath '.').Path
  }
} else {
  $Root = (Resolve-Path -LiteralPath $Root).Path
}

$FramesDir = Join-Path $Root 'frames'
$RegistryPath = Join-Path $FramesDir 'registry.json'
$UpscaledDir = Join-Path $FramesDir 'upscaled'
$ManifestPath = Join-Path $UpscaledDir 'manifest.json'

if (!(Test-Path -LiteralPath $RegistryPath)) {
  throw "Cannot find frame registry: $RegistryPath"
}

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class FrameHighResGenerator {
  static double Lum(byte r, byte g, byte b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  static bool IsSlotPixel(byte r, byte g, byte b, byte a) {
    if (a <= 24) return true;
    int max = Math.Max(r, Math.Max(g, b));
    int min = Math.Min(r, Math.Min(g, b));
    int sat = max - min;
    double lum = Lum(r, g, b);
    int greenDominance = g - Math.Max(r, b);
    int cyanDominance = Math.Min(g, b) - r;

    if (g >= 70 && greenDominance >= 10 && g >= ((r + b) / 2.0) + 10) return true;
    if (g >= 92 && sat >= 18 && g >= r + 12 && g >= b - 8) return true;
    if (lum >= 142 && g >= r + 8 && g >= b + 4 && sat >= 10) return true;
    if (lum >= 126 && cyanDominance >= 18 && g >= 95 && b >= 86 && r < Math.Max(g, b) + 18) return true;
    return false;
  }

  static Bitmap CreateSlotImage(Bitmap source, bool transparentSlots) {
    int w = source.Width;
    int h = source.Height;
    var rect = new Rectangle(0, 0, w, h);
    var output = new Bitmap(w, h, PixelFormat.Format32bppArgb);

    BitmapData srcData = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    BitmapData outData = output.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    try {
      byte[] srcPixels = new byte[srcData.Stride * h];
      byte[] outPixels = new byte[outData.Stride * h];
      Marshal.Copy(srcData.Scan0, srcPixels, 0, srcPixels.Length);

      for (int y = 0; y < h; y++) {
        int srcRow = y * srcData.Stride;
        int outRow = y * outData.Stride;
        for (int x = 0; x < w; x++) {
          int srcIndex = srcRow + x * 4;
          int outIndex = outRow + x * 4;
          byte b = srcPixels[srcIndex];
          byte g = srcPixels[srcIndex + 1];
          byte r = srcPixels[srcIndex + 2];
          byte a = srcPixels[srcIndex + 3];
          bool slot = IsSlotPixel(r, g, b, a);

          if (slot && transparentSlots) {
            outPixels[outIndex] = 0;
            outPixels[outIndex + 1] = 0;
            outPixels[outIndex + 2] = 0;
            outPixels[outIndex + 3] = 0;
          } else if (slot) {
            outPixels[outIndex] = 255;
            outPixels[outIndex + 1] = 255;
            outPixels[outIndex + 2] = 255;
            outPixels[outIndex + 3] = 255;
          } else {
            outPixels[outIndex] = b;
            outPixels[outIndex + 1] = g;
            outPixels[outIndex + 2] = r;
            outPixels[outIndex + 3] = transparentSlots ? a : (byte)255;
          }
        }
      }

      Marshal.Copy(outPixels, 0, outData.Scan0, outPixels.Length);
    } finally {
      source.UnlockBits(srcData);
      output.UnlockBits(outData);
    }

    return output;
  }

  static Bitmap DrawToTarget(
    Bitmap source,
    int targetWidth,
    int targetHeight,
    int cropX,
    int cropY,
    int cropWidth,
    int cropHeight,
    int destX,
    int destY,
    int destWidth,
    int destHeight,
    bool transparentBackground
  ) {
    cropX = Math.Max(0, Math.Min(cropX, source.Width - 1));
    cropY = Math.Max(0, Math.Min(cropY, source.Height - 1));
    cropWidth = cropWidth > 0 ? cropWidth : source.Width;
    cropHeight = cropHeight > 0 ? cropHeight : source.Height;
    cropWidth = Math.Max(1, Math.Min(cropWidth, source.Width - cropX));
    cropHeight = Math.Max(1, Math.Min(cropHeight, source.Height - cropY));
    destWidth = destWidth > 0 ? destWidth : targetWidth;
    destHeight = destHeight > 0 ? destHeight : targetHeight;

    var target = new Bitmap(targetWidth, targetHeight, PixelFormat.Format32bppArgb);
    using (var graphics = Graphics.FromImage(target)) {
      graphics.CompositingMode = CompositingMode.SourceCopy;
      graphics.CompositingQuality = CompositingQuality.HighQuality;
      graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
      graphics.SmoothingMode = SmoothingMode.HighQuality;
      graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
      graphics.Clear(transparentBackground ? Color.Transparent : Color.White);
      graphics.DrawImage(
        source,
        new Rectangle(destX, destY, destWidth, destHeight),
        new Rectangle(cropX, cropY, cropWidth, cropHeight),
        GraphicsUnit.Pixel
      );
    }
    return target;
  }

  static Bitmap ResizeToTarget(
    Bitmap source,
    int targetWidth,
    int targetHeight,
    bool transparentBackground
  ) {
    var target = new Bitmap(targetWidth, targetHeight, PixelFormat.Format32bppArgb);
    using (var graphics = Graphics.FromImage(target)) {
      graphics.CompositingMode = CompositingMode.SourceCopy;
      graphics.CompositingQuality = CompositingQuality.HighQuality;
      graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
      graphics.SmoothingMode = SmoothingMode.HighQuality;
      graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
      graphics.Clear(transparentBackground ? Color.Transparent : Color.White);
      graphics.DrawImage(
        source,
        new Rectangle(0, 0, targetWidth, targetHeight),
        new Rectangle(0, 0, source.Width, source.Height),
        GraphicsUnit.Pixel
      );
    }
    return target;
  }

  static byte ClampChannel(double value) {
    if (value <= 0) return 0;
    if (value >= 255) return 255;
    return (byte)Math.Round(value);
  }

  static Bitmap Sharpen(Bitmap source, double amount) {
    if (amount <= 0.001) return (Bitmap)source.Clone();
    int w = source.Width;
    int h = source.Height;
    var rect = new Rectangle(0, 0, w, h);
    var output = new Bitmap(w, h, PixelFormat.Format32bppArgb);

    BitmapData srcData = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    BitmapData outData = output.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    try {
      byte[] srcPixels = new byte[srcData.Stride * h];
      byte[] outPixels = new byte[outData.Stride * h];
      Marshal.Copy(srcData.Scan0, srcPixels, 0, srcPixels.Length);
      Buffer.BlockCopy(srcPixels, 0, outPixels, 0, srcPixels.Length);

      for (int y = 1; y < h - 1; y++) {
        int row = y * srcData.Stride;
        for (int x = 1; x < w - 1; x++) {
          int index = row + x * 4;
          byte alpha = srcPixels[index + 3];
          if (alpha < 10) continue;

          for (int channel = 0; channel < 3; channel++) {
            int sum = 0;
            for (int dy = -1; dy <= 1; dy++) {
              int sampleRow = (y + dy) * srcData.Stride;
              for (int dx = -1; dx <= 1; dx++) {
                sum += srcPixels[sampleRow + (x + dx) * 4 + channel];
              }
            }
            double blur = sum / 9.0;
            double center = srcPixels[index + channel];
            outPixels[index + channel] = ClampChannel(center + (center - blur) * amount);
          }
          outPixels[index + 3] = alpha;
        }
      }

      Marshal.Copy(outPixels, 0, outData.Scan0, outPixels.Length);
    } finally {
      source.UnlockBits(srcData);
      output.UnlockBits(outData);
    }

    return output;
  }

  static void SavePng(Bitmap bitmap, string path) {
    string directory = Path.GetDirectoryName(path);
    if (!String.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
    bitmap.Save(path, ImageFormat.Png);
  }

  public static void Render(
    string sourcePath,
    string previewPath,
    string overlayPath,
    int targetWidth,
    int targetHeight,
    int cropX,
    int cropY,
    int cropWidth,
    int cropHeight,
    int destX,
    int destY,
    int destWidth,
    int destHeight,
    double sharpenAmount
  ) {
    using (var original = new Bitmap(sourcePath))
    using (var source = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb)) {
      using (var graphics = Graphics.FromImage(source)) {
        graphics.CompositingMode = CompositingMode.SourceCopy;
        graphics.DrawImage(original, 0, 0, original.Width, original.Height);
      }

      using (var previewSource = CreateSlotImage(source, false))
      using (var overlaySource = CreateSlotImage(source, true))
      using (var previewTarget = DrawToTarget(previewSource, targetWidth, targetHeight, cropX, cropY, cropWidth, cropHeight, destX, destY, destWidth, destHeight, false))
      using (var overlayTarget = DrawToTarget(overlaySource, targetWidth, targetHeight, cropX, cropY, cropWidth, cropHeight, destX, destY, destWidth, destHeight, true))
      using (var previewFinal = Sharpen(previewTarget, sharpenAmount))
      using (var overlayFinal = Sharpen(overlayTarget, sharpenAmount)) {
        SavePng(previewFinal, previewPath);
        SavePng(overlayFinal, overlayPath);
      }
    }
  }

  public static void RenderFromStandardAssets(
    string standardPreviewPath,
    string standardOverlayPath,
    string previewPath,
    string overlayPath,
    int targetWidth,
    int targetHeight,
    double sharpenAmount
  ) {
    using (var previewOriginal = new Bitmap(standardPreviewPath))
    using (var overlayOriginal = new Bitmap(standardOverlayPath))
    using (var previewSource = new Bitmap(previewOriginal.Width, previewOriginal.Height, PixelFormat.Format32bppArgb))
    using (var overlaySource = new Bitmap(overlayOriginal.Width, overlayOriginal.Height, PixelFormat.Format32bppArgb)) {
      using (var graphics = Graphics.FromImage(previewSource)) {
        graphics.CompositingMode = CompositingMode.SourceCopy;
        graphics.DrawImage(previewOriginal, 0, 0, previewOriginal.Width, previewOriginal.Height);
      }
      using (var graphics = Graphics.FromImage(overlaySource)) {
        graphics.CompositingMode = CompositingMode.SourceCopy;
        graphics.DrawImage(overlayOriginal, 0, 0, overlayOriginal.Width, overlayOriginal.Height);
      }

      using (var previewTarget = ResizeToTarget(previewSource, targetWidth, targetHeight, false))
      using (var overlayTarget = ResizeToTarget(overlaySource, targetWidth, targetHeight, true))
      using (var previewFinal = Sharpen(previewTarget, sharpenAmount))
      using (var overlayFinal = Sharpen(overlayTarget, sharpenAmount)) {
        SavePng(previewFinal, previewPath);
        SavePng(overlayFinal, overlayPath);
      }
    }
  }
}
'@

function Join-FramePath([string]$RelativePath) {
  Join-Path $FramesDir ($RelativePath -replace '/', [IO.Path]::DirectorySeparatorChar)
}

New-Item -ItemType Directory -Force -Path $UpscaledDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $UpscaledDir 'preview') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $UpscaledDir 'overlay') | Out-Null

$Registry = Get-Content -LiteralPath $RegistryPath -Raw | ConvertFrom-Json
$Frames = @($Registry.frames)
if ($Limit -gt 0) {
  $Frames = @($Frames | Select-Object -First $Limit)
}

$Results = @()
$ManifestFrames = @()
$Index = 0

foreach ($Frame in $Frames) {
  $Index += 1
  $SourcePath = Join-FramePath $Frame.source
  $StandardPreviewPath = Join-FramePath $Frame.preview
  $StandardOverlayPath = Join-FramePath $Frame.overlay
  $PreviewRelative = "upscaled/$($Frame.preview)"
  $OverlayRelative = "upscaled/$($Frame.overlay)"
  $PreviewPath = Join-FramePath $PreviewRelative
  $OverlayPath = Join-FramePath $OverlayRelative
  $TargetWidth = [int]([Math]::Round([double]$Frame.width * $Scale))
  $TargetHeight = [int]([Math]::Round([double]$Frame.height * $Scale))

  if (!(Test-Path -LiteralPath $SourcePath) -and (!(Test-Path -LiteralPath $StandardPreviewPath) -or !(Test-Path -LiteralPath $StandardOverlayPath))) {
    Write-Warning "[$Index/$($Frames.Count)] Missing source/standard assets: $($Frame.name)"
    $Results += [pscustomobject]@{ name = $Frame.name; status = 'missing-source'; width = $TargetWidth; height = $TargetHeight }
    continue
  }

  if (!$Overwrite -and (Test-Path -LiteralPath $PreviewPath) -and (Test-Path -LiteralPath $OverlayPath)) {
    Write-Host "[$Index/$($Frames.Count)] Skip existing: $($Frame.name)"
    $Results += [pscustomobject]@{ name = $Frame.name; status = 'skipped'; width = $TargetWidth; height = $TargetHeight }
  } else {
    $Fit = $Frame.standardFit
    Write-Host "[$Index/$($Frames.Count)] Upscale: $($Frame.name) -> ${TargetWidth}x${TargetHeight}"
    if ((Test-Path -LiteralPath $StandardPreviewPath) -and (Test-Path -LiteralPath $StandardOverlayPath)) {
      [FrameHighResGenerator]::RenderFromStandardAssets(
        $StandardPreviewPath,
        $StandardOverlayPath,
        $PreviewPath,
        $OverlayPath,
        $TargetWidth,
        $TargetHeight,
        $Sharpen
      )
    } else {
      [FrameHighResGenerator]::Render(
        $SourcePath,
        $PreviewPath,
        $OverlayPath,
        $TargetWidth,
        $TargetHeight,
        [int]$Fit.cropX,
        [int]$Fit.cropY,
        [int]$Fit.cropWidth,
        [int]$Fit.cropHeight,
        [int]([Math]::Round([double]$Fit.x * $Scale)),
        [int]([Math]::Round([double]$Fit.y * $Scale)),
        [int]([Math]::Round([double]$Fit.width * $Scale)),
        [int]([Math]::Round([double]$Fit.height * $Scale)),
        $Sharpen
      )
    }
    $Results += [pscustomobject]@{ name = $Frame.name; status = 'ok'; width = $TargetWidth; height = $TargetHeight }
  }

  $ManifestFrames += [ordered]@{
    id = $Frame.id
    name = $Frame.name
    source = $Frame.source
    preview = $PreviewRelative
    overlay = $OverlayRelative
    width = $TargetWidth
    height = $TargetHeight
    scale = $Scale
  }
}

$Manifest = [ordered]@{
  schema = 'photobooth-upscaled-frames:v1'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  scale = $Scale
  sharpen = $Sharpen
  frameCount = $ManifestFrames.Count
  frames = $ManifestFrames
}

$Manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

Write-Host ''
Write-Host "Done. Upscaled frame assets are in: $UpscaledDir"
Write-Host "Manifest: $ManifestPath"
Write-Host 'Restart the Vite dev server or rebuild before using newly generated files.'
$Results | Format-Table -AutoSize
