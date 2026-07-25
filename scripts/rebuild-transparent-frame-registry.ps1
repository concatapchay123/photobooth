param(
  [string]$Root = '',
  [int]$AlphaLimit = 24
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Resolve-Path -LiteralPath '.').Path }
if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = (Resolve-Path -LiteralPath (Join-Path $ScriptRoot '..')).Path
} else {
  $Root = (Resolve-Path -LiteralPath $Root).Path
}

$FramesDir = Join-Path $Root 'frames'
$SourceDir = Join-Path $FramesDir 'source'
$RegistryPath = Join-Path $FramesDir 'registry.json'
$ReportPath = Join-Path $FramesDir 'slot-analysis-report.json'

if (!(Test-Path -LiteralPath $SourceDir)) {
  throw "Cannot find frame source directory: $SourceDir"
}

$ExistingFrameNames = @{}
if (Test-Path -LiteralPath $RegistryPath) {
  try {
    $ExistingRegistry = Get-Content -LiteralPath $RegistryPath -Raw | ConvertFrom-Json
    foreach ($Frame in @($ExistingRegistry.frames)) {
      if ($Frame.id -and $Frame.name) {
        $ExistingFrameNames[[string]$Frame.id] = [string]$Frame.name
      }
    }
  } catch {
    Write-Warning "Could not read existing frame names from registry. Rebuilding with file names."
  }
}

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class TransparentAlphaFrameRegistryAnalyzer
{
    public class ComponentResult
    {
        public int MinX { get; set; }
        public int MinY { get; set; }
        public int MaxX { get; set; }
        public int MaxY { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public int Area { get; set; }
        public int ComponentCount { get; set; }
    }

    public class AnalysisResult
    {
        public int Width { get; set; }
        public int Height { get; set; }
        public long TransparentPixels { get; set; }
        public ComponentResult[] Slots { get; set; }
    }

    private class Component
    {
        public int MinX;
        public int MinY;
        public int MaxX;
        public int MaxY;
        public int Width;
        public int Height;
        public int Area;
        public int ComponentCount = 1;

        public Component Clone()
        {
            return new Component
            {
                MinX = MinX,
                MinY = MinY,
                MaxX = MaxX,
                MaxY = MaxY,
                Width = Width,
                Height = Height,
                Area = Area,
                ComponentCount = ComponentCount
            };
        }
    }

    public static AnalysisResult Analyze(string sourcePath, int alphaLimit)
    {
        using (Bitmap source = LoadArgbBitmap(sourcePath))
        {
            int width = source.Width;
            int height = source.Height;
            int totalPixels = width * height;
            byte[] transparent = new byte[totalPixels];
            long transparentPixels = FillTransparentMask(source, transparent, alphaLimit);

            byte[] visited = new byte[totalPixels];
            int[] queue = new int[totalPixels];
            int componentMinArea = Math.Max(1200, (int)Math.Floor(totalPixels * 0.001));
            int componentMinWidth = Math.Max(24, (int)Math.Floor(width * 0.04));
            int componentMinHeight = Math.Max(24, (int)Math.Floor(height * 0.018));
            List<Component> components = new List<Component>();

            for (int start = 0; start < totalPixels; start++)
            {
                if (transparent[start] == 0 || visited[start] != 0) continue;

                int head = 0;
                int tail = 0;
                int area = 0;
                int minX = width;
                int minY = height;
                int maxX = 0;
                int maxY = 0;

                queue[tail++] = start;
                visited[start] = 1;

                while (head < tail)
                {
                    int index = queue[head++];
                    area++;

                    int x = index % width;
                    int y = index / width;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;

                    int left = index - 1;
                    int right = index + 1;
                    int up = index - width;
                    int down = index + width;

                    if (x > 0 && transparent[left] != 0 && visited[left] == 0)
                    {
                        visited[left] = 1;
                        queue[tail++] = left;
                    }
                    if (x < width - 1 && transparent[right] != 0 && visited[right] == 0)
                    {
                        visited[right] = 1;
                        queue[tail++] = right;
                    }
                    if (y > 0 && transparent[up] != 0 && visited[up] == 0)
                    {
                        visited[up] = 1;
                        queue[tail++] = up;
                    }
                    if (y < height - 1 && transparent[down] != 0 && visited[down] == 0)
                    {
                        visited[down] = 1;
                        queue[tail++] = down;
                    }
                }

                int slotWidth = maxX - minX + 1;
                int slotHeight = maxY - minY + 1;
                if (area >= componentMinArea && slotWidth >= componentMinWidth && slotHeight >= componentMinHeight)
                {
                    components.Add(new Component
                    {
                        MinX = minX,
                        MinY = minY,
                        MaxX = maxX,
                        MaxY = maxY,
                        Width = slotWidth,
                        Height = slotHeight,
                        Area = area
                    });
                }
            }

            int minArea = Math.Max(12000, (int)Math.Floor(totalPixels * 0.012));
            int minWidth = (int)Math.Floor(width * 0.28);
            int minHeight = (int)Math.Floor(height * 0.06);
            List<Component> slots = MergeNearbyTransparentSlotParts(components, width, height).FindAll(component =>
                component.Area >= minArea && component.Width >= minWidth && component.Height >= minHeight
            );

            slots.Sort((a, b) =>
            {
                double rowTolerance = Math.Max(24.0, Math.Min(a.Height, b.Height) * 0.35);
                if (Math.Abs(a.MinY - b.MinY) < rowTolerance) return a.MinX.CompareTo(b.MinX);
                return a.MinY.CompareTo(b.MinY);
            });

            ComponentResult[] resultSlots = new ComponentResult[Math.Min(slots.Count, 8)];
            for (int i = 0; i < resultSlots.Length; i++)
            {
                Component slot = slots[i];
                resultSlots[i] = new ComponentResult
                {
                    MinX = slot.MinX,
                    MinY = slot.MinY,
                    MaxX = slot.MaxX,
                    MaxY = slot.MaxY,
                    Width = slot.Width,
                    Height = slot.Height,
                    Area = slot.Area,
                    ComponentCount = slot.ComponentCount
                };
            }

            return new AnalysisResult
            {
                Width = width,
                Height = height,
                TransparentPixels = transparentPixels,
                Slots = resultSlots
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
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.DrawImage(loaded, 0, 0, loaded.Width, loaded.Height);
            }
            return argb;
        }
    }

    private static long FillTransparentMask(Bitmap bitmap, byte[] transparent, int alphaLimit)
    {
        Rectangle rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        BitmapData data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        try
        {
            int stride = Math.Abs(data.Stride);
            byte[] pixels = new byte[stride * bitmap.Height];
            Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);

            long transparentPixels = 0;
            for (int y = 0; y < bitmap.Height; y++)
            {
                int rowOffset = y * stride;
                int maskRow = y * bitmap.Width;
                for (int x = 0; x < bitmap.Width; x++)
                {
                    int pixelOffset = rowOffset + (x * 4);
                    int alpha = pixels[pixelOffset + 3];
                    if (alpha <= alphaLimit)
                    {
                        transparent[maskRow + x] = 1;
                        transparentPixels++;
                    }
                }
            }

            return transparentPixels;
        }
        finally
        {
            bitmap.UnlockBits(data);
        }
    }

    private static int AxisOverlap(int aMin, int aMax, int bMin, int bMax)
    {
        return Math.Max(0, Math.Min(aMax, bMax) - Math.Max(aMin, bMin) + 1);
    }

    private static int AxisGap(int aMin, int aMax, int bMin, int bMax)
    {
        if (aMax < bMin) return bMin - aMax - 1;
        if (bMax < aMin) return aMin - bMax - 1;
        return 0;
    }

    private static List<Component> MergeNearbyTransparentSlotParts(List<Component> components, int frameWidth, int frameHeight)
    {
        if (components.Count <= 1) return components;

        int bridgeGap = Math.Max(6, (int)Math.Round(Math.Min(frameWidth, frameHeight) * 0.018));
        int[] parents = new int[components.Count];
        for (int i = 0; i < parents.Length; i++) parents[i] = i;

        Func<int, int> findParent = null;
        findParent = delegate(int index)
        {
            int root = index;
            while (parents[root] != root) root = parents[root];
            while (parents[index] != index)
            {
                int next = parents[index];
                parents[index] = root;
                index = next;
            }
            return root;
        };

        Action<int, int> join = delegate(int aIndex, int bIndex)
        {
            int aRoot = findParent(aIndex);
            int bRoot = findParent(bIndex);
            if (aRoot != bRoot) parents[bRoot] = aRoot;
        };

        Func<Component, Component, bool> shouldMerge = delegate(Component a, Component b)
        {
            int yOverlap = AxisOverlap(a.MinY, a.MaxY, b.MinY, b.MaxY);
            int xGap = AxisGap(a.MinX, a.MaxX, b.MinX, b.MaxX);
            int minHeight = Math.Min(a.Height, b.Height);
            int combinedMinX = Math.Min(a.MinX, b.MinX);
            int combinedMaxX = Math.Max(a.MaxX, b.MaxX);
            int combinedWidth = combinedMaxX - combinedMinX + 1;
            bool keepsFrameMargins = combinedMinX > frameWidth * 0.025 && combinedMaxX < frameWidth * 0.975;
            bool sharedVerticalBand = yOverlap >= Math.Max(6, minHeight * 0.14);

            return keepsFrameMargins && combinedWidth <= frameWidth * 0.92 && sharedVerticalBand && xGap <= bridgeGap;
        };

        for (int i = 0; i < components.Count; i++)
        {
            for (int j = i + 1; j < components.Count; j++)
            {
                if (shouldMerge(components[i], components[j])) join(i, j);
            }
        }

        Dictionary<int, Component> groups = new Dictionary<int, Component>();
        for (int i = 0; i < components.Count; i++)
        {
            int root = findParent(i);
            Component component = components[i];
            Component current;
            if (!groups.TryGetValue(root, out current))
            {
                groups[root] = component.Clone();
                continue;
            }

            current.MinX = Math.Min(current.MinX, component.MinX);
            current.MinY = Math.Min(current.MinY, component.MinY);
            current.MaxX = Math.Max(current.MaxX, component.MaxX);
            current.MaxY = Math.Max(current.MaxY, component.MaxY);
            current.Area += component.Area;
            current.ComponentCount += 1;
            current.Width = current.MaxX - current.MinX + 1;
            current.Height = current.MaxY - current.MinY + 1;
        }

        return new List<Component>(groups.Values);
    }
}
'@

function New-Point([double]$X, [double]$Y) {
  return [ordered]@{
    x = [Math]::Round($X, 2)
    y = [Math]::Round($Y, 2)
  }
}

function New-Bounds([int]$X, [int]$Y, [int]$Width, [int]$Height, [int]$Area) {
  return [ordered]@{
    x = $X
    y = $Y
    width = $Width
    height = $Height
    area = $Area
  }
}

$SourceFiles = @(Get-ChildItem -LiteralPath $SourceDir -File | Where-Object {
  $_.Extension -match '^\.(png|jpg|jpeg)$'
} | Sort-Object Name)

if ($SourceFiles.Count -eq 0) {
  throw "No frame images found in $SourceDir"
}

$Now = (Get-Date).ToUniversalTime().ToString('o')
$FrameEntries = @()
$ReportFrames = @()
$DimensionGroups = @{}
$Warnings = @()

foreach ($File in $SourceFiles) {
  $Analysis = [TransparentAlphaFrameRegistryAnalyzer]::Analyze($File.FullName, $AlphaLimit)
  $DimensionKey = "$($Analysis.Width)x$($Analysis.Height)"
  if (!$DimensionGroups.ContainsKey($DimensionKey)) {
    $DimensionGroups[$DimensionKey] = [ordered]@{
      width = [int]$Analysis.Width
      height = [int]$Analysis.Height
      count = 0
    }
  }
  $DimensionGroups[$DimensionKey].count += 1

  $FrameId = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
  $DisplayName = if ($ExistingFrameNames.ContainsKey($FrameId)) { $ExistingFrameNames[$FrameId] } else { $FrameId }
  $Slots = @()
  $SlotIndex = 0
  foreach ($Slot in @($Analysis.Slots)) {
    $Bounds = New-Bounds ([int]$Slot.MinX) ([int]$Slot.MinY) ([int]$Slot.Width) ([int]$Slot.Height) ([int]$Slot.Area)
    $Points = @(
      (New-Point $Slot.MinX $Slot.MinY),
      (New-Point ($Slot.MinX + $Slot.Width) $Slot.MinY),
      (New-Point ($Slot.MinX + $Slot.Width) ($Slot.MinY + $Slot.Height)),
      (New-Point $Slot.MinX ($Slot.MinY + $Slot.Height))
    )

    $Slots += [ordered]@{
      slotIndex = $SlotIndex
      id = "$FrameId-slot-$SlotIndex"
      shape = 'rect'
      detectionMode = if ([int]$Slot.ComponentCount -gt 1) { 'alpha-merged' } else { 'alpha' }
      x = [int]$Slot.MinX
      y = [int]$Slot.MinY
      width = [int]$Slot.Width
      height = [int]$Slot.Height
      points = $Points
      sourceBounds = $Bounds
      standardBounds = $Bounds
      pointCount = $Points.Count
      area = [int]$Slot.Area
    }
    $SlotIndex += 1
  }

  if ($Slots.Count -eq 0) {
    $Warnings += $File.Name
  }

  $SourcePath = "source/$($File.Name)"
  $Type = if ($File.Extension.ToLowerInvariant() -eq '.png') { 'png' } else { 'jpg' }
  $StandardFit = [ordered]@{
    mode = 'Source'
    cropX = 0
    cropY = 0
    cropWidth = [int]$Analysis.Width
    cropHeight = [int]$Analysis.Height
    x = 0
    y = 0
    width = [int]$Analysis.Width
    height = [int]$Analysis.Height
    scaleX = 1
    scaleY = 1
  }

  $FrameEntries += [ordered]@{
    id = $FrameId
    name = $DisplayName
    source = $SourcePath
    preview = $SourcePath
    overlay = $SourcePath
    type = $Type
    width = [int]$Analysis.Width
    height = [int]$Analysis.Height
    sourceWidth = [int]$Analysis.Width
    sourceHeight = [int]$Analysis.Height
    standardFit = $StandardFit
    slotCount = $Slots.Count
    detectionMode = if ($Slots.Count -gt 0) { 'alpha' } else { 'none' }
    chromaSettings = $null
    slots = $Slots
  }

  $ReportFrames += [ordered]@{
    id = $FrameId
    name = $DisplayName
    source = $SourcePath
    width = [int]$Analysis.Width
    height = [int]$Analysis.Height
    transparentPixels = [int64]$Analysis.TransparentPixels
    transparentPercent = [Math]::Round((100.0 * [double]$Analysis.TransparentPixels) / ([double]$Analysis.Width * [double]$Analysis.Height), 4)
    slotCount = $Slots.Count
    slots = $Slots | ForEach-Object {
      [ordered]@{
        slotIndex = $_.slotIndex
        sourceBounds = $_.sourceBounds
        pointCount = $_.pointCount
        area = $_.area
      }
    }
  }

  Write-Host ("{0}: {1}x{2}, {3} slot" -f $File.Name, $Analysis.Width, $Analysis.Height, $Slots.Count)
}

$SortedDimensions = @($DimensionGroups.Values | Sort-Object -Property @{Expression = { $_['count'] }; Descending = $true}, @{Expression = { $_['width'] }; Descending = $true})
$DominantDimension = $SortedDimensions | Select-Object -First 1

$Registry = [ordered]@{
  schema = 'photobooth-frame-registry:v1'
  generatedAt = $Now
  source = 'transparent-alpha-source'
  standardFrame = [ordered]@{
    width = [int]$DominantDimension['width']
    height = [int]$DominantDimension['height']
    fitMode = 'SourceTransparentAlphaSlots'
    note = 'Frames are kept at native source dimensions.'
  }
  frameCount = $FrameEntries.Count
  frames = $FrameEntries
}
$Registry | ConvertTo-Json -Depth 32 | Set-Content -LiteralPath $RegistryPath -Encoding UTF8

$Report = [ordered]@{
  schema = 'photobooth-slot-analysis-report:v1'
  generatedAt = $Now
  source = 'transparent-alpha-source'
  algorithm = [ordered]@{
    transparent = "alpha <= $AlphaLimit"
    component = 'connected transparent components'
    merge = 'same vertical band and nearby horizontal gap'
    ordering = 'top-to-bottom, left-to-right within row tolerance'
  }
  frameCount = $FrameEntries.Count
  dimensions = $SortedDimensions
  frames = $ReportFrames
  warnings = [ordered]@{
    framesWithoutSlots = $Warnings
  }
}
$Report | ConvertTo-Json -Depth 24 | Set-Content -LiteralPath $ReportPath -Encoding UTF8

Write-Host ("Updated registry for {0} frame(s)." -f $FrameEntries.Count)
if ($Warnings.Count -gt 0) {
  Write-Warning ("No transparent slots detected in: {0}" -f ($Warnings -join ', '))
}
