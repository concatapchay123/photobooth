param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [int]$Upscale = 2
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$FramesDir = Join-Path $Root "frames"
$RegistryPath = Join-Path $FramesDir "registry.json"
$ManifestPath = Join-Path $FramesDir "upscaled\manifest.json"
$PreviewDir = Join-Path $FramesDir "preview"
$OverlayDir = Join-Path $FramesDir "overlay"
$UpscaledPreviewDir = Join-Path $FramesDir "upscaled\preview"
$UpscaledOverlayDir = Join-Path $FramesDir "upscaled\overlay"
$ReportPath = Join-Path $FramesDir "slot-analysis-report.json"

foreach ($Dir in @($PreviewDir, $OverlayDir, $UpscaledPreviewDir, $UpscaledOverlayDir)) {
  New-Item -ItemType Directory -Path $Dir -Force | Out-Null
}

$Code = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class ManualGreenSlotAnalyzer
{
    public class PointD
    {
        public double X { get; set; }
        public double Y { get; set; }
    }

    public class BoundsI
    {
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public int Area { get; set; }
    }

    public class ZoneResult
    {
        public int SlotIndex { get; set; }
        public BoundsI SourceBounds { get; set; }
        public List<PointD> SourcePoints { get; set; }
        public int Area { get; set; }
    }

    public class ProcessResult
    {
        public int Width { get; set; }
        public int Height { get; set; }
        public long SlotPixels { get; set; }
        public ZoneResult[] Zones { get; set; }
    }

    private class Component
    {
        public int Label;
        public int X;
        public int Y;
        public int Width;
        public int Height;
        public int Area;
    }

    public static ProcessResult AnalyzeAndRender(
        string sourcePath,
        string previewPath,
        string overlayPath,
        string upscaledPreviewPath,
        string upscaledOverlayPath,
        double cropX,
        double cropY,
        double cropWidth,
        double cropHeight,
        double destX,
        double destY,
        double destWidth,
        double destHeight,
        int targetWidth,
        int targetHeight,
        int upscale)
    {
        using (Bitmap source = LoadArgbBitmap(sourcePath))
        {
            int width = source.Width;
            int height = source.Height;
            byte[] pixels = ReadPixels(source);
            bool[] coreMask = new bool[width * height];
            bool[] candidateMask = new bool[width * height];

            for (int y = 0; y < height; y++)
            {
                int row = y * width;
                for (int x = 0; x < width; x++)
                {
                    int index = row + x;
                    int offset = index * 4;
                    byte b = pixels[offset + 0];
                    byte g = pixels[offset + 1];
                    byte r = pixels[offset + 2];
                    byte a = pixels[offset + 3];
                    coreMask[index] = IsManualGreenCore(r, g, b, a);
                    candidateMask[index] = coreMask[index] || IsManualGreenEdge(r, g, b, a);
                }
            }

            bool[] renderMask = ExpandIntoGreenEdges(coreMask, candidateMask, width, height, 2);
            int[] labels = new int[width * height];
            List<Component> components = DetectComponents(renderMask, labels, width, height);
            ZoneResult[] zones = BuildZones(components, labels, width, height);

            using (Bitmap previewSource = BuildSlotImage(source, pixels, renderMask, false))
            using (Bitmap overlaySource = BuildSlotImage(source, pixels, renderMask, true))
            {
                RenderStandardImage(previewSource, previewPath, cropX, cropY, cropWidth, cropHeight, destX, destY, destWidth, destHeight, targetWidth, targetHeight, false);
                RenderStandardImage(overlaySource, overlayPath, cropX, cropY, cropWidth, cropHeight, destX, destY, destWidth, destHeight, targetWidth, targetHeight, true);

                int upWidth = targetWidth * upscale;
                int upHeight = targetHeight * upscale;
                RenderStandardImage(previewSource, upscaledPreviewPath, cropX, cropY, cropWidth, cropHeight, destX * upscale, destY * upscale, destWidth * upscale, destHeight * upscale, upWidth, upHeight, false);
                RenderStandardImage(overlaySource, upscaledOverlayPath, cropX, cropY, cropWidth, cropHeight, destX * upscale, destY * upscale, destWidth * upscale, destHeight * upscale, upWidth, upHeight, true);
            }

            long slotPixels = 0;
            for (int i = 0; i < renderMask.Length; i++)
            {
                if (renderMask[i]) slotPixels++;
            }

            return new ProcessResult
            {
                Width = width,
                Height = height,
                SlotPixels = slotPixels,
                Zones = zones
            };
        }
    }

    private static Bitmap LoadArgbBitmap(string path)
    {
        using (Bitmap loaded = new Bitmap(path))
        {
            Bitmap argb = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb);
            using (Graphics graphics = Graphics.FromImage(argb))
            {
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.DrawImage(loaded, 0, 0, loaded.Width, loaded.Height);
            }
            return argb;
        }
    }

    private static byte[] ReadPixels(Bitmap bitmap)
    {
        Rectangle rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        BitmapData data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        try
        {
            int bytes = bitmap.Width * bitmap.Height * 4;
            byte[] pixels = new byte[bytes];
            Marshal.Copy(data.Scan0, pixels, 0, bytes);
            return pixels;
        }
        finally
        {
            bitmap.UnlockBits(data);
        }
    }

    private static bool IsManualGreenCore(int r, int g, int b, int a)
    {
        if (a <= 24) return false;
        int max = Math.Max(r, Math.Max(g, b));
        int min = Math.Min(r, Math.Min(g, b));
        int saturation = max - min;
        int lift = g - Math.Max(r, b);

        return g >= 140
            && lift >= 48
            && saturation >= 86
            && r <= 180
            && b <= 160
            && g >= r * 1.28 + 20
            && g >= b + 54;
    }

    private static bool IsManualGreenEdge(int r, int g, int b, int a)
    {
        if (a <= 24) return false;
        int max = Math.Max(r, Math.Max(g, b));
        int min = Math.Min(r, Math.Min(g, b));
        int saturation = max - min;
        int lift = g - Math.Max(r, b);

        return g >= 122
            && lift >= 26
            && saturation >= 56
            && r <= 205
            && b <= 170
            && g >= r + 22
            && g >= b + 30;
    }

    private static bool[] ExpandIntoGreenEdges(bool[] coreMask, bool[] candidateMask, int width, int height, int passes)
    {
        bool[] current = new bool[coreMask.Length];
        Array.Copy(coreMask, current, coreMask.Length);

        for (int pass = 0; pass < passes; pass++)
        {
            bool changed = false;
            bool[] next = new bool[current.Length];
            Array.Copy(current, next, current.Length);

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    int index = y * width + x;
                    if (current[index] || !candidateMask[index]) continue;

                    bool touchesMask = false;
                    for (int dy = -1; dy <= 1 && !touchesMask; dy++)
                    {
                        int ny = y + dy;
                        if (ny < 0 || ny >= height) continue;
                        for (int dx = -1; dx <= 1; dx++)
                        {
                            if (dx == 0 && dy == 0) continue;
                            int nx = x + dx;
                            if (nx < 0 || nx >= width) continue;
                            if (current[ny * width + nx])
                            {
                                touchesMask = true;
                                break;
                            }
                        }
                    }

                    if (touchesMask)
                    {
                        next[index] = true;
                        changed = true;
                    }
                }
            }

            current = next;
            if (!changed) break;
        }

        return current;
    }

    private static List<Component> DetectComponents(bool[] mask, int[] labels, int width, int height)
    {
        bool[] seen = new bool[mask.Length];
        int[] queue = new int[mask.Length];
        int minArea = Math.Max(500, (int)(mask.Length * 0.0025));
        int minWidth = Math.Max(20, width / 20);
        int minHeight = Math.Max(20, height / 40);
        int label = 0;
        List<Component> components = new List<Component>();

        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                int start = y * width + x;
                if (!mask[start] || seen[start]) continue;

                label++;
                int head = 0;
                int tail = 0;
                int area = 0;
                int minX = x;
                int maxX = x;
                int minY = y;
                int maxY = y;

                seen[start] = true;
                labels[start] = label;
                queue[tail++] = start;

                while (head < tail)
                {
                    int current = queue[head++];
                    int cx = current % width;
                    int cy = current / width;
                    area++;
                    if (cx < minX) minX = cx;
                    if (cx > maxX) maxX = cx;
                    if (cy < minY) minY = cy;
                    if (cy > maxY) maxY = cy;

                    for (int dy = -1; dy <= 1; dy++)
                    {
                        int ny = cy + dy;
                        if (ny < 0 || ny >= height) continue;
                        for (int dx = -1; dx <= 1; dx++)
                        {
                            if (dx == 0 && dy == 0) continue;
                            int nx = cx + dx;
                            if (nx < 0 || nx >= width) continue;
                            int neighbor = ny * width + nx;
                            if (mask[neighbor] && !seen[neighbor])
                            {
                                seen[neighbor] = true;
                                labels[neighbor] = label;
                                queue[tail++] = neighbor;
                            }
                        }
                    }
                }

                int componentWidth = maxX - minX + 1;
                int componentHeight = maxY - minY + 1;
                if (area >= minArea && componentWidth >= minWidth && componentHeight >= minHeight)
                {
                    components.Add(new Component
                    {
                        Label = label,
                        X = minX,
                        Y = minY,
                        Width = componentWidth,
                        Height = componentHeight,
                        Area = area
                    });
                }
            }
        }

        components.Sort(delegate(Component a, Component b)
        {
            int rowTolerance = Math.Max(24, Math.Min(a.Height, b.Height) / 3);
            if (Math.Abs(a.Y - b.Y) < rowTolerance) return a.X.CompareTo(b.X);
            return a.Y.CompareTo(b.Y);
        });

        return components;
    }

    private static ZoneResult[] BuildZones(List<Component> components, int[] labels, int width, int height)
    {
        List<ZoneResult> zones = new List<ZoneResult>();
        for (int i = 0; i < components.Count; i++)
        {
            Component component = components[i];
            List<PointD> points = BuildRowSpanPolygon(component, labels, width, height);
            zones.Add(new ZoneResult
            {
                SlotIndex = i,
                Area = component.Area,
                SourceBounds = new BoundsI
                {
                    X = component.X,
                    Y = component.Y,
                    Width = component.Width,
                    Height = component.Height,
                    Area = component.Area
                },
                SourcePoints = points
            });
        }

        return zones.ToArray();
    }

    private static List<PointD> BuildRowSpanPolygon(Component component, int[] labels, int width, int height)
    {
        int step = Math.Max(2, component.Height / 54);
        int pad = Math.Max(5, Math.Min(component.Width, component.Height) / 72);
        List<PointD> left = new List<PointD>();
        List<PointD> right = new List<PointD>();

        for (int y = component.Y; y <= component.Y + component.Height - 1; y += step)
        {
            AddRowSpan(component, labels, width, height, y, pad, left, right);
        }

        int bottomY = component.Y + component.Height - 1;
        if (left.Count == 0 || Math.Abs(left[left.Count - 1].Y - bottomY) > 0.001)
        {
            AddRowSpan(component, labels, width, height, bottomY, pad, left, right);
        }

        if (left.Count < 2 || right.Count < 2)
        {
            return BuildFallbackRectangle(component, pad, width, height);
        }

        List<PointD> polygon = new List<PointD>();
        polygon.Add(left[0]);
        polygon.Add(right[0]);
        for (int i = 1; i < right.Count; i++) polygon.Add(right[i]);
        for (int i = left.Count - 1; i >= 1; i--) polygon.Add(left[i]);
        return SimplifyNearDuplicates(polygon);
    }

    private static void AddRowSpan(Component component, int[] labels, int width, int height, int y, int pad, List<PointD> left, List<PointD> right)
    {
        int minX = Int32.MaxValue;
        int maxX = Int32.MinValue;
        int startX = component.X;
        int endX = component.X + component.Width - 1;

        for (int x = startX; x <= endX; x++)
        {
            if (labels[y * width + x] == component.Label)
            {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }

        if (minX == Int32.MaxValue) return;

        double leftX = Math.Max(0, minX - pad);
        double rightX = Math.Min(width - 1, maxX + 1 + pad);
        double yy = Math.Max(0, Math.Min(height - 1, y));

        if (left.Count > 0)
        {
            PointD previousLeft = left[left.Count - 1];
            PointD previousRight = right[right.Count - 1];
            if (Math.Abs(previousLeft.Y - yy) < 0.001)
            {
                previousLeft.X = Math.Min(previousLeft.X, leftX);
                previousRight.X = Math.Max(previousRight.X, rightX);
                return;
            }
        }

        left.Add(new PointD { X = leftX, Y = yy });
        right.Add(new PointD { X = rightX, Y = yy });
    }

    private static List<PointD> BuildFallbackRectangle(Component component, int pad, int width, int height)
    {
        double x1 = Math.Max(0, component.X - pad);
        double y1 = Math.Max(0, component.Y - pad);
        double x2 = Math.Min(width - 1, component.X + component.Width + pad);
        double y2 = Math.Min(height - 1, component.Y + component.Height + pad);
        List<PointD> points = new List<PointD>();
        points.Add(new PointD { X = x1, Y = y1 });
        points.Add(new PointD { X = x2, Y = y1 });
        points.Add(new PointD { X = x2, Y = y2 });
        points.Add(new PointD { X = x1, Y = y2 });
        return points;
    }

    private static List<PointD> SimplifyNearDuplicates(List<PointD> points)
    {
        List<PointD> result = new List<PointD>();
        for (int i = 0; i < points.Count; i++)
        {
            PointD point = points[i];
            if (result.Count == 0)
            {
                result.Add(point);
                continue;
            }

            PointD previous = result[result.Count - 1];
            if (Math.Abs(previous.X - point.X) >= 0.5 || Math.Abs(previous.Y - point.Y) >= 0.5)
            {
                result.Add(point);
            }
        }

        if (result.Count > 1)
        {
            PointD first = result[0];
            PointD last = result[result.Count - 1];
            if (Math.Abs(first.X - last.X) < 0.5 && Math.Abs(first.Y - last.Y) < 0.5)
            {
                result.RemoveAt(result.Count - 1);
            }
        }

        return result;
    }

    private static Bitmap BuildSlotImage(Bitmap source, byte[] sourcePixels, bool[] mask, bool transparentSlots)
    {
        Bitmap result = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
        byte[] pixels = new byte[sourcePixels.Length];
        Array.Copy(sourcePixels, pixels, sourcePixels.Length);

        for (int i = 0; i < mask.Length; i++)
        {
            if (!mask[i]) continue;
            int offset = i * 4;
            if (transparentSlots)
            {
                pixels[offset + 0] = 0;
                pixels[offset + 1] = 0;
                pixels[offset + 2] = 0;
                pixels[offset + 3] = 0;
            }
            else
            {
                pixels[offset + 0] = 255;
                pixels[offset + 1] = 255;
                pixels[offset + 2] = 255;
                pixels[offset + 3] = 255;
            }
        }

        Rectangle rect = new Rectangle(0, 0, result.Width, result.Height);
        BitmapData data = result.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        try
        {
            Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
        }
        finally
        {
            result.UnlockBits(data);
        }

        return result;
    }

    private static void RenderStandardImage(
        Bitmap source,
        string outputPath,
        double cropX,
        double cropY,
        double cropWidth,
        double cropHeight,
        double destX,
        double destY,
        double destWidth,
        double destHeight,
        int targetWidth,
        int targetHeight,
        bool transparentBackground)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
        using (Bitmap target = new Bitmap(targetWidth, targetHeight, PixelFormat.Format32bppArgb))
        using (Graphics graphics = Graphics.FromImage(target))
        {
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.SmoothingMode = SmoothingMode.HighQuality;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.Clear(transparentBackground ? Color.Transparent : Color.White);

            RectangleF sourceRect = new RectangleF((float)cropX, (float)cropY, (float)cropWidth, (float)cropHeight);
            RectangleF destRect = new RectangleF((float)destX, (float)destY, (float)destWidth, (float)destHeight);
            graphics.DrawImage(source, destRect, sourceRect, GraphicsUnit.Pixel);
            SavePngAtomically(target, outputPath);
        }
    }

    private static void SavePngAtomically(Bitmap bitmap, string outputPath)
    {
        string tempPath = outputPath + ".tmp-" + Guid.NewGuid().ToString("N") + ".png";
        bitmap.Save(tempPath, ImageFormat.Png);
        if (File.Exists(outputPath)) File.Delete(outputPath);
        File.Move(tempPath, outputPath);
    }
}
'@

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $Code

function ConvertTo-RelativePath([string]$BasePath, [string]$Path) {
  $BaseUri = [Uri]((Resolve-Path -LiteralPath $BasePath).Path.TrimEnd("\") + "\")
  $PathUri = [Uri](Resolve-Path -LiteralPath $Path)
  return [Uri]::UnescapeDataString($BaseUri.MakeRelativeUri($PathUri).ToString()).Replace("/", "\")
}

function Convert-PathForJoin([string]$RelativePath) {
  return $RelativePath.Replace("/", [IO.Path]::DirectorySeparatorChar)
}

function Get-PointBounds([array]$Points) {
  $MinX = [double]::PositiveInfinity
  $MinY = [double]::PositiveInfinity
  $MaxX = [double]::NegativeInfinity
  $MaxY = [double]::NegativeInfinity

  foreach ($Point in $Points) {
    if ($Point.x -lt $MinX) { $MinX = $Point.x }
    if ($Point.y -lt $MinY) { $MinY = $Point.y }
    if ($Point.x -gt $MaxX) { $MaxX = $Point.x }
    if ($Point.y -gt $MaxY) { $MaxY = $Point.y }
  }

  return [ordered]@{
    x = [Math]::Round($MinX, 2)
    y = [Math]::Round($MinY, 2)
    width = [Math]::Round([Math]::Max(1, $MaxX - $MinX), 2)
    height = [Math]::Round([Math]::Max(1, $MaxY - $MinY), 2)
  }
}

function Convert-SourcePointToStandard([object]$Point, [object]$Fit, [int]$TargetWidth, [int]$TargetHeight) {
  $X = [double]$Fit.x + (([double]$Point.X - [double]$Fit.cropX) * [double]$Fit.scaleX)
  $Y = [double]$Fit.y + (([double]$Point.Y - [double]$Fit.cropY) * [double]$Fit.scaleY)
  $X = [Math]::Max(0, [Math]::Min($TargetWidth, $X))
  $Y = [Math]::Max(0, [Math]::Min($TargetHeight, $Y))
  return [ordered]@{
    x = [Math]::Round($X, 2)
    y = [Math]::Round($Y, 2)
  }
}

if (!(Test-Path -LiteralPath $RegistryPath)) {
  throw "Cannot find frame registry: $RegistryPath"
}

$Registry = Get-Content -LiteralPath $RegistryPath -Raw | ConvertFrom-Json
$StandardWidth = [int]$Registry.standardFrame.width
$StandardHeight = [int]$Registry.standardFrame.height
$Now = (Get-Date).ToUniversalTime().ToString("o")
$UpdatedFrames = @()
$ReportFrames = @()

foreach ($Frame in @($Registry.frames)) {
  $SourcePath = Join-Path $FramesDir (Convert-PathForJoin $Frame.source)
  if (!(Test-Path -LiteralPath $SourcePath)) {
    throw "Cannot find source frame: $SourcePath"
  }

  $PreviewPath = Join-Path $FramesDir (Convert-PathForJoin $Frame.preview)
  $OverlayPath = Join-Path $FramesDir (Convert-PathForJoin $Frame.overlay)
  $UpscaledPreviewPath = Join-Path $FramesDir ("upscaled\" + (Convert-PathForJoin $Frame.preview))
  $UpscaledOverlayPath = Join-Path $FramesDir ("upscaled\" + (Convert-PathForJoin $Frame.overlay))
  $Fit = $Frame.standardFit

  $Result = [ManualGreenSlotAnalyzer]::AnalyzeAndRender(
    $SourcePath,
    $PreviewPath,
    $OverlayPath,
    $UpscaledPreviewPath,
    $UpscaledOverlayPath,
    [double]$Fit.cropX,
    [double]$Fit.cropY,
    [double]$Fit.cropWidth,
    [double]$Fit.cropHeight,
    [double]$Fit.x,
    [double]$Fit.y,
    [double]$Fit.width,
    [double]$Fit.height,
    $StandardWidth,
    $StandardHeight,
    $Upscale
  )

  if (@($Result.Zones).Count -eq 0) {
    throw "No manual green slots detected in $($Frame.name)"
  }

  $Slots = @()
  foreach ($Zone in @($Result.Zones)) {
    $StandardPoints = @()
    foreach ($Point in @($Zone.SourcePoints)) {
      $StandardPoints += Convert-SourcePointToStandard $Point $Fit $StandardWidth $StandardHeight
    }

    $StandardBounds = Get-PointBounds $StandardPoints
    $SourceBounds = [ordered]@{
      x = [int]$Zone.SourceBounds.X
      y = [int]$Zone.SourceBounds.Y
      width = [int]$Zone.SourceBounds.Width
      height = [int]$Zone.SourceBounds.Height
      area = [int]$Zone.SourceBounds.Area
    }

    $Slots += [ordered]@{
      slotIndex = [int]$Zone.SlotIndex
      id = "$($Frame.id)-slot-$($Zone.SlotIndex)"
      shape = "polygon"
      detectionMode = "manual-green-screen-static"
      x = $StandardBounds.x
      y = $StandardBounds.y
      width = $StandardBounds.width
      height = $StandardBounds.height
      points = $StandardPoints
      sourceBounds = $SourceBounds
      standardBounds = $StandardBounds
      pointCount = @($StandardPoints).Count
    }
  }

  $Frame.sourceWidth = [int]$Result.Width
  $Frame.sourceHeight = [int]$Result.Height
  $Frame.width = $StandardWidth
  $Frame.height = $StandardHeight
  $Frame.slotCount = @($Slots).Count
  $Frame.detectionMode = "manual-green-screen-static"
  $Frame.chromaSettings = [ordered]@{
    color = "#00ff00"
    tolerance = 0
    softness = 0
  }
  $Frame.slots = $Slots
  $UpdatedFrames += $Frame

  $ReportFrames += [ordered]@{
    id = $Frame.id
    name = $Frame.name
    source = $Frame.source
    sourceWidth = [int]$Result.Width
    sourceHeight = [int]$Result.Height
    slotCount = @($Slots).Count
    slotPixels = [int64]$Result.SlotPixels
    slots = $Slots | ForEach-Object {
      [ordered]@{
        slotIndex = $_.slotIndex
        sourceBounds = $_.sourceBounds
        standardBounds = $_.standardBounds
        pointCount = $_.pointCount
      }
    }
  }

  Write-Host ("{0}: {1} slot" -f $Frame.name, @($Slots).Count)
}

$Registry.generatedAt = $Now
$Registry.source = "manual-green-screen-static"
$Registry.frameCount = @($UpdatedFrames).Count
$Registry.frames = $UpdatedFrames
$Registry | ConvertTo-Json -Depth 32 | Set-Content -LiteralPath $RegistryPath -Encoding UTF8

$ManifestFrames = @()
foreach ($Frame in @($UpdatedFrames)) {
  $ManifestFrames += [ordered]@{
    id = $Frame.id
    name = $Frame.name
    source = $Frame.source
    preview = "upscaled/$($Frame.preview)"
    overlay = "upscaled/$($Frame.overlay)"
    width = $StandardWidth * $Upscale
    height = $StandardHeight * $Upscale
    scale = $Upscale
    slotCount = $Frame.slotCount
  }
}

$Manifest = [ordered]@{
  schema = "photobooth-upscaled-frames:v1"
  generatedAt = $Now
  source = "manual-green-screen-static"
  scale = $Upscale
  frameCount = @($UpdatedFrames).Count
  frames = $ManifestFrames
}
$Manifest | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

$Report = [ordered]@{
  schema = "photobooth-slot-analysis-report:v1"
  generatedAt = $Now
  source = "manual-green-screen-static"
  algorithm = [ordered]@{
    core = "g>=135, green lift>=42, saturation>=80, r<=180, b<=175"
    edge = "candidate green edge, expanded from core for 4 passes"
    polygon = "row-span source mask polygon transformed through registry standardFit"
  }
  frameCount = @($UpdatedFrames).Count
  frames = $ReportFrames
}
$Report | ConvertTo-Json -Depth 24 | Set-Content -LiteralPath $ReportPath -Encoding UTF8

Write-Host ("Updated {0} frames, registry, preview/overlay, upscaled assets." -f @($UpdatedFrames).Count)
