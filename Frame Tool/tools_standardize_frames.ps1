Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class FrameStandardizer {
  public class ZoneResult {
    public int X;
    public int Y;
    public int Width;
    public int Height;
    public int Area;
  }

  public class ProcessResult {
    public int Width;
    public int Height;
    public long SlotPixels;
    public ZoneResult[] Zones;
  }

  static bool IsSlotPixel(int r, int g, int b, int a) {
    if (a <= 24) return true;
    return a > 8
      && g >= 95
      && g >= r * 1.18 + 12
      && g >= b * 1.18 + 12
      && (g - Math.Min(r, b)) >= 35;
  }

  static byte[] Dilate(byte[] mask, int w, int h, int passes) {
    byte[] current = mask;
    for (int pass = 0; pass < passes; pass++) {
      byte[] next = new byte[current.Length];
      Buffer.BlockCopy(current, 0, next, 0, current.Length);
      for (int y = 1; y < h - 1; y++) {
        int row = y * w;
        for (int x = 1; x < w - 1; x++) {
          int i = row + x;
          if (current[i] != 0) continue;
          if (current[i - 1] != 0 || current[i + 1] != 0 || current[i - w] != 0 || current[i + w] != 0) {
            next[i] = 1;
          }
        }
      }
      current = next;
    }
    return current;
  }

  static List<ZoneResult> DetectComponents(byte[] mask, int w, int h) {
    int n = w * h;
    byte[] seen = new byte[n];
    int[] queue = new int[n];
    var components = new List<ZoneResult>();

    for (int i = 0; i < n; i++) {
      if (mask[i] == 0 || seen[i] != 0) continue;
      int head = 0;
      int tail = 0;
      int minX = w;
      int minY = h;
      int maxX = 0;
      int maxY = 0;
      int area = 0;
      queue[tail++] = i;
      seen[i] = 1;

      while (head < tail) {
        int p = queue[head++];
        int x = p % w;
        int y = p / w;
        area++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        int nb;
        if (x > 0) {
          nb = p - 1;
          if (mask[nb] != 0 && seen[nb] == 0) { seen[nb] = 1; queue[tail++] = nb; }
        }
        if (x + 1 < w) {
          nb = p + 1;
          if (mask[nb] != 0 && seen[nb] == 0) { seen[nb] = 1; queue[tail++] = nb; }
        }
        if (y > 0) {
          nb = p - w;
          if (mask[nb] != 0 && seen[nb] == 0) { seen[nb] = 1; queue[tail++] = nb; }
        }
        if (y + 1 < h) {
          nb = p + w;
          if (mask[nb] != 0 && seen[nb] == 0) { seen[nb] = 1; queue[tail++] = nb; }
        }
      }

      components.Add(new ZoneResult {
        X = minX,
        Y = minY,
        Width = maxX - minX + 1,
        Height = maxY - minY + 1,
        Area = area
      });
    }

    double total = w * (double)h;
    var filtered = new List<ZoneResult>();
    foreach (var c in components) {
      if (c.Area < Math.Max(120, total * 0.0012)) continue;
      if (c.Width < w * 0.045 || c.Height < h * 0.035) continue;
      if (c.Area > total * 0.86) continue;
      if (c.Area / Math.Max(1.0, c.Width * (double)c.Height) < 0.18) continue;
      filtered.Add(c);
    }

    filtered.Sort((a, b) => b.Area.CompareTo(a.Area));
    var accepted = new List<ZoneResult>();
    foreach (var c in filtered) {
      bool duplicate = false;
      foreach (var a in accepted) {
        int x1 = Math.Max(c.X, a.X);
        int y1 = Math.Max(c.Y, a.Y);
        int x2 = Math.Min(c.X + c.Width, a.X + a.Width);
        int y2 = Math.Min(c.Y + c.Height, a.Y + a.Height);
        int intersection = Math.Max(0, x2 - x1) * Math.Max(0, y2 - y1);
        int smaller = Math.Min(c.Area, a.Area);
        if (smaller > 0 && intersection / (double)smaller > 0.78) {
          duplicate = true;
          break;
        }
      }
      if (!duplicate) accepted.Add(c);
    }

    accepted.Sort((a, b) => {
      int rowTolerance = Math.Max(24, Math.Min(a.Height, b.Height) / 3);
      if (Math.Abs(a.Y - b.Y) < rowTolerance) return a.X.CompareTo(b.X);
      return a.Y.CompareTo(b.Y);
    });
    return accepted;
  }

  public static ProcessResult Process(string sourcePath, string previewPath, string overlayPath) {
    using (var src = new Bitmap(sourcePath))
    using (var bitmap = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb))
    using (var preview = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb))
    using (var overlay = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(bitmap)) g.DrawImage(src, 0, 0, src.Width, src.Height);
      int w = bitmap.Width;
      int h = bitmap.Height;
      int n = w * h;
      var rect = new Rectangle(0, 0, w, h);
      var data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      byte[] pixels = new byte[data.Stride * h];
      Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
      bitmap.UnlockBits(data);

      byte[] rawMask = new byte[n];
      long slotPixels = 0;
      for (int y = 0; y < h; y++) {
        int row = y * data.Stride;
        for (int x = 0; x < w; x++) {
          int pi = row + x * 4;
          if (IsSlotPixel(pixels[pi + 2], pixels[pi + 1], pixels[pi], pixels[pi + 3])) {
            rawMask[y * w + x] = 1;
            slotPixels++;
          }
        }
      }

      var zones = DetectComponents(rawMask, w, h);
      byte[] renderMask = Dilate(rawMask, w, h, 1);

      var previewData = preview.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
      var overlayData = overlay.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
      byte[] previewPixels = new byte[previewData.Stride * h];
      byte[] overlayPixels = new byte[overlayData.Stride * h];

      for (int y = 0; y < h; y++) {
        int srcRow = y * data.Stride;
        int previewRow = y * previewData.Stride;
        int overlayRow = y * overlayData.Stride;
        for (int x = 0; x < w; x++) {
          int srcIndex = srcRow + x * 4;
          int previewIndex = previewRow + x * 4;
          int overlayIndex = overlayRow + x * 4;
          int maskIndex = y * w + x;

          if (rawMask[maskIndex] != 0) {
            previewPixels[previewIndex] = 255;
            previewPixels[previewIndex + 1] = 255;
            previewPixels[previewIndex + 2] = 255;
            previewPixels[previewIndex + 3] = 255;
          } else {
            previewPixels[previewIndex] = pixels[srcIndex];
            previewPixels[previewIndex + 1] = pixels[srcIndex + 1];
            previewPixels[previewIndex + 2] = pixels[srcIndex + 2];
            previewPixels[previewIndex + 3] = 255;
          }

          if (renderMask[maskIndex] != 0) {
            overlayPixels[overlayIndex] = 0;
            overlayPixels[overlayIndex + 1] = 0;
            overlayPixels[overlayIndex + 2] = 0;
            overlayPixels[overlayIndex + 3] = 0;
          } else {
            overlayPixels[overlayIndex] = pixels[srcIndex];
            overlayPixels[overlayIndex + 1] = pixels[srcIndex + 1];
            overlayPixels[overlayIndex + 2] = pixels[srcIndex + 2];
            overlayPixels[overlayIndex + 3] = pixels[srcIndex + 3];
          }
        }
      }

      Marshal.Copy(previewPixels, 0, previewData.Scan0, previewPixels.Length);
      Marshal.Copy(overlayPixels, 0, overlayData.Scan0, overlayPixels.Length);
      preview.UnlockBits(previewData);
      overlay.UnlockBits(overlayData);
      preview.Save(previewPath, ImageFormat.Png);
      overlay.Save(overlayPath, ImageFormat.Png);

      return new ProcessResult {
        Width = w,
        Height = h,
        SlotPixels = slotPixels,
        Zones = zones.ToArray()
      };
    }
  }
}

public class FrameCanvasTools {
  public class Bounds {
    public int X;
    public int Y;
    public int Width;
    public int Height;
  }

  static int Quantize(byte value) {
    return Math.Min(255, (value / 16) * 16);
  }

  static int ColorKey(byte r, byte g, byte b) {
    return (Quantize(r) << 16) | (Quantize(g) << 8) | Quantize(b);
  }

  static double ColorDistance(byte r, byte g, byte b, int bgR, int bgG, int bgB) {
    int dr = r - bgR;
    int dg = g - bgG;
    int db = b - bgB;
    return Math.Sqrt(dr * dr + dg * dg + db * db);
  }

  static double Luminance(byte r, byte g, byte b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  public static Bounds GetForegroundBounds(string imagePath) {
    using (var src = new Bitmap(imagePath))
    using (var bitmap = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(bitmap)) g.DrawImage(src, 0, 0, src.Width, src.Height);
      int w = bitmap.Width;
      int h = bitmap.Height;
      var rect = new Rectangle(0, 0, w, h);
      var data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      byte[] pixels = new byte[data.Stride * h];
      Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
      bitmap.UnlockBits(data);

      var borderColors = new Dictionary<int, int>();
      int step = Math.Max(1, Math.Min(w, h) / 220);
      Action<int, int> collect = (x, y) => {
        int pi = y * data.Stride + x * 4;
        byte a = pixels[pi + 3];
        if (a < 24) return;
        int key = ColorKey(pixels[pi + 2], pixels[pi + 1], pixels[pi]);
        borderColors[key] = borderColors.ContainsKey(key) ? borderColors[key] + 1 : 1;
      };

      for (int x = 0; x < w; x += step) {
        collect(x, 0);
        collect(x, h - 1);
      }
      for (int y = 0; y < h; y += step) {
        collect(0, y);
        collect(w - 1, y);
      }

      int bgKey = 0xffffff;
      int bgCount = -1;
      foreach (var item in borderColors) {
        if (item.Value > bgCount) {
          bgKey = item.Key;
          bgCount = item.Value;
        }
      }
      int bgR = (bgKey >> 16) & 255;
      int bgG = (bgKey >> 8) & 255;
      int bgB = bgKey & 255;
      double bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

      int minX = w;
      int minY = h;
      int maxX = -1;
      int maxY = -1;

      for (int y = 0; y < h; y++) {
        int row = y * data.Stride;
        for (int x = 0; x < w; x++) {
          int pi = row + x * 4;
          byte b = pixels[pi];
          byte g = pixels[pi + 1];
          byte r = pixels[pi + 2];
          byte a = pixels[pi + 3];
          if (a < 24) continue;

          double distance = ColorDistance(r, g, b, bgR, bgG, bgB);
          double lum = Luminance(r, g, b);
          bool nearEdgeBackground = distance <= 48;
          bool nearWhitePaper = r >= 246 && g >= 246 && b >= 246;
          bool nearLightBackground = bgLum >= 232 && lum >= 226 && distance <= 78;
          if (nearEdgeBackground || nearWhitePaper || nearLightBackground) continue;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      if (maxX < minX || maxY < minY) {
        return new Bounds { X = 0, Y = 0, Width = 0, Height = 0 };
      }

      return new Bounds {
        X = minX,
        Y = minY,
        Width = maxX - minX + 1,
        Height = maxY - minY + 1
      };
    }
  }
}
'@

$ErrorActionPreference = 'Stop'
$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Resolve-Path -LiteralPath '.').Path }
$Workspace = (Resolve-Path -LiteralPath (Join-Path $ScriptRoot '..')).Path
if (-not (Test-Path -LiteralPath (Join-Path $Workspace 'frames'))) {
  $Workspace = (Resolve-Path -LiteralPath '.').Path
}
$FramesDir = Join-Path $Workspace 'frames'
$SourceDir = Join-Path $FramesDir 'source'
$PreviewDir = Join-Path $FramesDir 'preview'
$OverlayDir = Join-Path $FramesDir 'overlay'
$RegistryPath = Join-Path $FramesDir 'registry.json'
$ProfilePath = Join-Path $FramesDir 'frame-profiles.json'
$ImageExtensions = @('.jpg', '.jpeg', '.png')
$StandardFrameWidth = 620
$StandardFrameHeight = 870
$StandardFrameFitMode = 'ContainTrim'

foreach ($PathToCheck in @($FramesDir, $SourceDir, $PreviewDir, $OverlayDir)) {
  if ($PathToCheck -and -not $PathToCheck.StartsWith($Workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside workspace: $PathToCheck"
  }
}

New-Item -ItemType Directory -Force -Path $SourceDir, $PreviewDir, $OverlayDir | Out-Null

if (-not (Test-Path -LiteralPath $ProfilePath)) {
  @{
    schema = 'photobooth-frame-profiles:v1'
    updatedAt = $null
    profiles = @{}
  } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ProfilePath -Encoding UTF8
}

Get-ChildItem -LiteralPath $FramesDir -File -Force |
  Where-Object { $ImageExtensions -contains $_.Extension.ToLowerInvariant() } |
  ForEach-Object {
    $Destination = Join-Path $SourceDir $_.Name
    if (Test-Path -LiteralPath $Destination) {
      $Stem = [IO.Path]::GetFileNameWithoutExtension($_.Name)
      $Destination = Join-Path $SourceDir ("{0}-uploaded-{1}{2}" -f $Stem, (Get-Date -Format 'yyyyMMddHHmmssfff'), $_.Extension)
    }
    Move-Item -LiteralPath $_.FullName -Destination $Destination
  }

Get-ChildItem -LiteralPath $PreviewDir -File -Force | Remove-Item -Force
Get-ChildItem -LiteralPath $OverlayDir -File -Force | Remove-Item -Force

function Get-SafeFrameId([string]$Name, [hashtable]$UsedIds) {
  $Stem = [IO.Path]::GetFileNameWithoutExtension($Name)
  $Base = ($Stem -replace '[^A-Za-z0-9._-]+', '-').Trim('-')
  if (-not $Base) { $Base = 'frame' }
  $Id = $Base
  $Index = 2
  while ($UsedIds.ContainsKey($Id)) {
    $Id = "$Base-$Index"
    $Index += 1
  }
  $UsedIds[$Id] = $true
  return $Id
}

function Get-FrameCropBounds([string]$OverlayPath, [object[]]$Zones, [int]$SourceWidth, [int]$SourceHeight) {
  $Candidates = @()

  try {
    $Foreground = [FrameCanvasTools]::GetForegroundBounds($OverlayPath)
    if ($Foreground -and $Foreground.Width -gt 0 -and $Foreground.Height -gt 0) {
      $Candidates += [ordered]@{
        X = $Foreground.X
        Y = $Foreground.Y
        Width = $Foreground.Width
        Height = $Foreground.Height
      }
    }
  } catch {
    Write-Warning "Could not detect frame foreground bounds for $OverlayPath. Using slot bounds fallback."
  }

  foreach ($Zone in @($Zones)) {
    if ($Zone -and $Zone.Width -gt 0 -and $Zone.Height -gt 0) {
      $Candidates += [ordered]@{
        X = $Zone.X
        Y = $Zone.Y
        Width = $Zone.Width
        Height = $Zone.Height
      }
    }
  }

  if ($Candidates.Count -eq 0) {
    return [ordered]@{
      X = 0
      Y = 0
      Width = $SourceWidth
      Height = $SourceHeight
    }
  }

  $MinX = $SourceWidth
  $MinY = $SourceHeight
  $MaxX = -1
  $MaxY = -1

  foreach ($Bounds in $Candidates) {
    $Left = [Math]::Max(0, [int][Math]::Floor([double]$Bounds.X))
    $Top = [Math]::Max(0, [int][Math]::Floor([double]$Bounds.Y))
    $Right = [Math]::Min($SourceWidth - 1, [int][Math]::Ceiling([double]$Bounds.X + [double]$Bounds.Width))
    $Bottom = [Math]::Min($SourceHeight - 1, [int][Math]::Ceiling([double]$Bounds.Y + [double]$Bounds.Height))

    if ($Right -lt $Left -or $Bottom -lt $Top) { continue }
    if ($Left -lt $MinX) { $MinX = $Left }
    if ($Top -lt $MinY) { $MinY = $Top }
    if ($Right -gt $MaxX) { $MaxX = $Right }
    if ($Bottom -gt $MaxY) { $MaxY = $Bottom }
  }

  if ($MaxX -lt $MinX -or $MaxY -lt $MinY) {
    return [ordered]@{
      X = 0
      Y = 0
      Width = $SourceWidth
      Height = $SourceHeight
    }
  }

  $Padding = [Math]::Max(10, [int][Math]::Round([Math]::Min($SourceWidth, $SourceHeight) * 0.015))
  $CropX = [Math]::Max(0, $MinX - $Padding)
  $CropY = [Math]::Max(0, $MinY - $Padding)
  $CropRight = [Math]::Min($SourceWidth, $MaxX + $Padding)
  $CropBottom = [Math]::Min($SourceHeight, $MaxY + $Padding)

  return [ordered]@{
    X = [int]$CropX
    Y = [int]$CropY
    Width = [Math]::Max(1, [int]($CropRight - $CropX))
    Height = [Math]::Max(1, [int]($CropBottom - $CropY))
  }
}

function Get-StandardFramePlacement([int]$SourceWidth, [int]$SourceHeight, [object]$CropBounds) {
  $CropX = 0
  $CropY = 0
  $CropWidth = $SourceWidth
  $CropHeight = $SourceHeight

  if ($CropBounds) {
    $CropX = [Math]::Max(0, [Math]::Min($SourceWidth - 1, [int]$CropBounds.X))
    $CropY = [Math]::Max(0, [Math]::Min($SourceHeight - 1, [int]$CropBounds.Y))
    $CropWidth = [Math]::Max(1, [Math]::Min($SourceWidth - $CropX, [int]$CropBounds.Width))
    $CropHeight = [Math]::Max(1, [Math]::Min($SourceHeight - $CropY, [int]$CropBounds.Height))
  }

  if ($StandardFrameFitMode -eq 'Stretch') {
    return [ordered]@{
      X = 0
      Y = 0
      Width = $StandardFrameWidth
      Height = $StandardFrameHeight
      ScaleX = $StandardFrameWidth / [double]$CropWidth
      ScaleY = $StandardFrameHeight / [double]$CropHeight
      CropX = $CropX
      CropY = $CropY
      CropWidth = $CropWidth
      CropHeight = $CropHeight
    }
  }

  $Scale = [Math]::Min($StandardFrameWidth / [double]$CropWidth, $StandardFrameHeight / [double]$CropHeight)
  $DrawWidth = [Math]::Max(1, [int][Math]::Round($CropWidth * $Scale))
  $DrawHeight = [Math]::Max(1, [int][Math]::Round($CropHeight * $Scale))

  return [ordered]@{
    X = [int][Math]::Round(($StandardFrameWidth - $DrawWidth) / 2)
    Y = [int][Math]::Round(($StandardFrameHeight - $DrawHeight) / 2)
    Width = $DrawWidth
    Height = $DrawHeight
    ScaleX = $Scale
    ScaleY = $Scale
    CropX = $CropX
    CropY = $CropY
    CropWidth = $CropWidth
    CropHeight = $CropHeight
  }
}

function Save-StandardFrameCanvas([string]$InputPath, [string]$OutputPath, [object]$Placement, [bool]$TransparentBackground) {
  $SourceBitmap = $null
  $TargetBitmap = $null
  $Graphics = $null
  $TempPath = "$OutputPath.tmp.png"

  try {
    $SourceBitmap = [System.Drawing.Bitmap]::new($InputPath)
    $TargetBitmap = [System.Drawing.Bitmap]::new($StandardFrameWidth, $StandardFrameHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $Graphics = [System.Drawing.Graphics]::FromImage($TargetBitmap)
    $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $Graphics.Clear($(if ($TransparentBackground) { [System.Drawing.Color]::Transparent } else { [System.Drawing.Color]::White }))
    $DestinationRect = [System.Drawing.Rectangle]::new($Placement.X, $Placement.Y, $Placement.Width, $Placement.Height)
    $SourceRect = [System.Drawing.Rectangle]::new($Placement.CropX, $Placement.CropY, $Placement.CropWidth, $Placement.CropHeight)
    $Graphics.DrawImage($SourceBitmap, $DestinationRect, $SourceRect, [System.Drawing.GraphicsUnit]::Pixel)
    $TargetBitmap.Save($TempPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    if ($Graphics) { $Graphics.Dispose() }
    if ($TargetBitmap) { $TargetBitmap.Dispose() }
    if ($SourceBitmap) { $SourceBitmap.Dispose() }
  }

  Move-Item -LiteralPath $TempPath -Destination $OutputPath -Force
}

$Now = (Get-Date).ToUniversalTime().ToString('o')
$UsedIds = @{}
$Frames = @()
$Report = @()

Get-ChildItem -LiteralPath $SourceDir -File -Force |
  Where-Object { $ImageExtensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object Name |
  ForEach-Object {
    $Id = Get-SafeFrameId $_.Name $UsedIds
    $PreviewFile = "$Id.preview.png"
    $OverlayFile = "$Id.overlay.png"
    $PreviewPath = Join-Path $PreviewDir $PreviewFile
    $OverlayPath = Join-Path $OverlayDir $OverlayFile
    $Result = [FrameStandardizer]::Process($_.FullName, $PreviewPath, $OverlayPath)
    $CropBounds = Get-FrameCropBounds $OverlayPath $Result.Zones $Result.Width $Result.Height
    $Placement = Get-StandardFramePlacement $Result.Width $Result.Height $CropBounds
    Save-StandardFrameCanvas $PreviewPath $PreviewPath $Placement $false
    Save-StandardFrameCanvas $OverlayPath $OverlayPath $Placement $true
    $TotalPixels = [double]($Result.Width * $Result.Height)
    $StandardTotalPixels = [double]($StandardFrameWidth * $StandardFrameHeight)
    $ScaledSlotPixels = $Result.SlotPixels * [double]$Placement.ScaleX * [double]$Placement.ScaleY
    $Inset = 1
    $Slots = @()
    $SlotIndex = 0
    foreach ($Zone in @($Result.Zones)) {
      $X1 = [Math]::Max(0, $Placement.X + (($Zone.X + $Inset - $Placement.CropX) * $Placement.ScaleX))
      $Y1 = [Math]::Max(0, $Placement.Y + (($Zone.Y + $Inset - $Placement.CropY) * $Placement.ScaleY))
      $X2 = [Math]::Min($StandardFrameWidth, $Placement.X + (($Zone.X + $Zone.Width - $Inset - $Placement.CropX) * $Placement.ScaleX))
      $Y2 = [Math]::Min($StandardFrameHeight, $Placement.Y + (($Zone.Y + $Zone.Height - $Inset - $Placement.CropY) * $Placement.ScaleY))
      $Slots += [ordered]@{
        slotIndex = $SlotIndex
        shape = 'polygon'
        detectionMode = 'manual-green-screen'
        points = @(
          [ordered]@{ x = [Math]::Round($X1, 2); y = [Math]::Round($Y1, 2) },
          [ordered]@{ x = [Math]::Round($X2, 2); y = [Math]::Round($Y1, 2) },
          [ordered]@{ x = [Math]::Round($X2, 2); y = [Math]::Round($Y2, 2) },
          [ordered]@{ x = [Math]::Round($X1, 2); y = [Math]::Round($Y2, 2) }
        )
        sourceBounds = [ordered]@{
          x = $Zone.X
          y = $Zone.Y
          width = $Zone.Width
          height = $Zone.Height
          area = $Zone.Area
        }
        standardBounds = [ordered]@{
          x = [Math]::Round($X1, 2)
          y = [Math]::Round($Y1, 2)
          width = [Math]::Round($X2 - $X1, 2)
          height = [Math]::Round($Y2 - $Y1, 2)
        }
      }
      $SlotIndex += 1
    }

    $Frames += [ordered]@{
      id = $Id
      name = $_.Name
      source = "source/$($_.Name)"
      preview = "preview/$PreviewFile"
      overlay = "overlay/$OverlayFile"
      width = $StandardFrameWidth
      height = $StandardFrameHeight
      sourceWidth = $Result.Width
      sourceHeight = $Result.Height
      standardSizeCm = [ordered]@{
        width = 6.2
        height = 8.7
      }
      standardFit = [ordered]@{
        mode = $StandardFrameFitMode
        cropX = $Placement.CropX
        cropY = $Placement.CropY
        cropWidth = $Placement.CropWidth
        cropHeight = $Placement.CropHeight
        x = $Placement.X
        y = $Placement.Y
        width = $Placement.Width
        height = $Placement.Height
        scaleX = [Math]::Round($Placement.ScaleX, 6)
        scaleY = [Math]::Round($Placement.ScaleY, 6)
      }
      slotCount = $Slots.Count
      detectionMode = 'manual-green-screen'
      chromaSettings = [ordered]@{
        color = '#00ff00'
        tolerance = 42
        softness = 70
      }
      slots = $Slots
      slotPixelRatio = [Math]::Round($ScaledSlotPixels / $StandardTotalPixels, 6)
      sourceSlotPixelRatio = [Math]::Round($Result.SlotPixels / $TotalPixels, 6)
      processedAt = $Now
    }

    $Report += [pscustomobject]@{
      Name = $_.Name
      Size = "$($Result.Width)x$($Result.Height) -> ${StandardFrameWidth}x${StandardFrameHeight}"
      Slots = $Slots.Count
      SlotPixelRatio = '{0:P2}' -f ($ScaledSlotPixels / $StandardTotalPixels)
      Preview = "frames/preview/$PreviewFile"
      Overlay = "frames/overlay/$OverlayFile"
    }
  }

$Registry = [ordered]@{
  schema = 'photobooth-frame-registry:v1'
  generatedAt = $Now
  source = 'manual-green-screen'
  standardFrame = [ordered]@{
    width = $StandardFrameWidth
    height = $StandardFrameHeight
    sizeCm = [ordered]@{
      width = 6.2
      height = 8.7
    }
    fitMode = $StandardFrameFitMode
  }
  frameCount = $Frames.Count
  frames = $Frames
}

$Registry | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $RegistryPath -Encoding UTF8

$Report | Format-Table -AutoSize
Write-Output "REGISTRY=$RegistryPath"
