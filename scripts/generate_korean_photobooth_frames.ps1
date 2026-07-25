param(
  [string]$Root = ''
)

$ErrorActionPreference = 'Stop'

$ScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Resolve-Path -LiteralPath '.').Path }
if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = (Resolve-Path -LiteralPath (Join-Path $ScriptRoot '..')).Path
} else {
  $Root = (Resolve-Path -LiteralPath $Root).Path
}

$FramesSourceDir = Join-Path $Root 'frames/source'
if (-not $FramesSourceDir.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to write outside workspace: $FramesSourceDir"
}

New-Item -ItemType Directory -Force -Path $FramesSourceDir | Out-Null

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;

public static class KoreanPhotoboothFrameGenerator {
  const int W = 620;
  const int H = 870;
  const int S = 2;
  const int StripX = 160;
  const int StripW = 300;
  const int SlotX = 176;
  const int SlotW = 268;
  const int SlotH = 160;

  static readonly int[] SlotYs = new int[] { 34, 222, 410, 598 };
  static readonly Color SlotGreen = Color.FromArgb(0, 255, 0);
  static PrivateFontCollection fontCollection = new PrivateFontCollection();
  static FontFamily roundedFamily = FontFamily.GenericSansSerif;
  static bool fontsReady = false;

  public static void GenerateAll(string root) {
    InitFonts(root);
    string outDir = Path.Combine(root, "frames", "source");
    Directory.CreateDirectory(outDir);

    Render(Path.Combine(outDir, "kr_frame_01_seoul_pink.png"), DrawSeoulPink);
    Render(Path.Combine(outDir, "kr_frame_02_cherry_blossom.png"), DrawCherryBlossom);
    Render(Path.Combine(outDir, "kr_frame_03_milk_cafe.png"), DrawMilkCafe);
    Render(Path.Combine(outDir, "kr_frame_04_idol_flash.png"), DrawIdolFlash);
    Render(Path.Combine(outDir, "kr_frame_05_han_river_night.png"), DrawHanRiverNight);
    Render(Path.Combine(outDir, "kr_frame_06_school_day.png"), DrawSchoolDay);
    Render(Path.Combine(outDir, "kr_frame_07_sticker_pic.png"), DrawStickerPic);
    Render(Path.Combine(outDir, "kr_frame_08_lavender_picnic.png"), DrawLavenderPicnic);
    Render(Path.Combine(outDir, "kr_frame_09_mono_chic.png"), DrawMonoChic);
    Render(Path.Combine(outDir, "kr_frame_10_winter_snow.png"), DrawWinterSnow);
  }

  static void InitFonts(string root) {
    if (fontsReady) return;
    string fredoka = Path.Combine(root, "fredoka.ttf");
    if (File.Exists(fredoka)) {
      try {
        fontCollection.AddFontFile(fredoka);
        if (fontCollection.Families.Length > 0) roundedFamily = fontCollection.Families[0];
      } catch {
        roundedFamily = FontFamily.GenericSansSerif;
      }
    }
    fontsReady = true;
  }

  static void Render(string path, Action<Graphics> draw) {
    using (Bitmap hi = new Bitmap(W * S, H * S, PixelFormat.Format32bppArgb))
    using (Graphics g = Graphics.FromImage(hi)) {
      Prepare(g);
      g.ScaleTransform(S, S);
      g.Clear(Color.White);
      draw(g);

      using (Bitmap final = new Bitmap(W, H, PixelFormat.Format32bppArgb))
      using (Graphics gf = Graphics.FromImage(final)) {
        Prepare(gf);
        gf.Clear(Color.White);
        gf.DrawImage(hi, new Rectangle(0, 0, W, H), new Rectangle(0, 0, W * S, H * S), GraphicsUnit.Pixel);
        final.Save(path, ImageFormat.Png);
      }
    }
  }

  static void Prepare(Graphics g) {
    g.SmoothingMode = SmoothingMode.AntiAlias;
    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
    g.CompositingQuality = CompositingQuality.HighQuality;
    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
    g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
  }

  static Font Rounded(float size, FontStyle style) {
    return new Font(roundedFamily, size, style, GraphicsUnit.Pixel);
  }

  static Font Korean(float size, FontStyle style) {
    try {
      return new Font("Malgun Gothic", size, style, GraphicsUnit.Pixel);
    } catch {
      return new Font(FontFamily.GenericSansSerif, size, style, GraphicsUnit.Pixel);
    }
  }

  static Color C(string hex) {
    string h = hex.TrimStart('#');
    return Color.FromArgb(
      Convert.ToInt32(h.Substring(0, 2), 16),
      Convert.ToInt32(h.Substring(2, 2), 16),
      Convert.ToInt32(h.Substring(4, 2), 16)
    );
  }

  static Color A(Color color, int alpha) {
    return Color.FromArgb(alpha, color.R, color.G, color.B);
  }

  static GraphicsPath RoundRect(RectangleF rect, float radius) {
    float d = radius * 2;
    GraphicsPath path = new GraphicsPath();
    path.AddArc(rect.X, rect.Y, d, d, 180, 90);
    path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
    path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
    path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
    path.CloseFigure();
    return path;
  }

  static void FillRound(Graphics g, RectangleF rect, float radius, Color color) {
    using (GraphicsPath path = RoundRect(rect, radius))
    using (SolidBrush brush = new SolidBrush(color)) {
      g.FillPath(brush, path);
    }
  }

  static void StrokeRound(Graphics g, RectangleF rect, float radius, Color color, float width) {
    using (GraphicsPath path = RoundRect(rect, radius))
    using (Pen pen = new Pen(color, width)) {
      g.DrawPath(pen, path);
    }
  }

  static void DrawGradient(Graphics g, RectangleF rect, Color top, Color bottom) {
    using (LinearGradientBrush brush = new LinearGradientBrush(rect, top, bottom, LinearGradientMode.Vertical)) {
      g.FillRectangle(brush, rect);
    }
  }

  static void DrawSoftPaper(Graphics g, Color top, Color bottom) {
    RectangleF strip = new RectangleF(StripX, 0, StripW, H);
    using (SolidBrush side = new SolidBrush(Color.White)) {
      g.FillRectangle(side, 0, 0, W, H);
    }
    DrawGradient(g, strip, top, bottom);
    using (Pen edge = new Pen(Color.FromArgb(36, 40, 30, 35), 1)) {
      g.DrawLine(edge, StripX, 0, StripX, H);
      g.DrawLine(edge, StripX + StripW, 0, StripX + StripW, H);
    }
    using (SolidBrush glow = new SolidBrush(Color.FromArgb(18, 255, 255, 255))) {
      g.FillRectangle(glow, StripX + 18, 0, 22, H);
    }
  }

  static void DrawSlots(Graphics g, Color border, Color tape, Color tapeInk) {
    for (int i = 0; i < SlotYs.Length; i++) {
      int y = SlotYs[i];
      FillRound(g, new RectangleF(SlotX - 12 + 4, y - 11 + 5, SlotW + 24, SlotH + 22), 18, Color.FromArgb(42, 40, 20, 35));
      FillRound(g, new RectangleF(SlotX - 12, y - 11, SlotW + 24, SlotH + 22), 18, Color.White);
      StrokeRound(g, new RectangleF(SlotX - 12, y - 11, SlotW + 24, SlotH + 22), 18, border, 2);

      using (SolidBrush green = new SolidBrush(SlotGreen)) {
        g.FillRectangle(green, SlotX, y, SlotW, SlotH);
      }

      using (Pen inner = new Pen(Color.FromArgb(90, border.R, border.G, border.B), 1.5f)) {
        g.DrawRectangle(inner, SlotX - 1, y - 1, SlotW + 2, SlotH + 2);
      }

      if (i % 2 == 0) {
        DrawTape(g, SlotX + 16, y - 18, 48, 16, -8, tape, tapeInk);
      } else {
        DrawTape(g, SlotX + SlotW - 66, y - 17, 50, 16, 8, tape, tapeInk);
      }
    }
  }

  static void DrawBadge(Graphics g, string title, string sub, Color accent, Color bg) {
    RectangleF shadow = new RectangleF(184, 789, 252, 62);
    FillRound(g, new RectangleF(shadow.X + 4, shadow.Y + 4, shadow.Width, shadow.Height), 18, Color.FromArgb(40, 40, 20, 30));
    FillRound(g, shadow, 18, bg);
    StrokeRound(g, shadow, 18, accent, 2);

    RectangleF titleBox = new RectangleF(194, 797, 232, 29);
    RectangleF subBox = new RectangleF(194, 824, 232, 18);
    using (Font f = Rounded(22, FontStyle.Bold))
    using (SolidBrush brush = new SolidBrush(accent)) {
      DrawTextFit(g, title, titleBox, f, brush, true);
    }
    using (Font f = Korean(12, FontStyle.Bold))
    using (SolidBrush brush = new SolidBrush(Color.FromArgb(150, 70, 65, 76))) {
      DrawTextFit(g, sub, subBox, f, brush, true);
    }
  }

  static void DrawTextFit(Graphics g, string text, RectangleF rect, Font baseFont, Brush brush, bool center) {
    StringFormat fmt = new StringFormat();
    fmt.Alignment = center ? StringAlignment.Center : StringAlignment.Near;
    fmt.LineAlignment = StringAlignment.Center;
    fmt.Trimming = StringTrimming.EllipsisCharacter;
    fmt.FormatFlags = StringFormatFlags.NoWrap;

    float size = baseFont.Size;
    FontStyle style = baseFont.Style;
    FontFamily fam = baseFont.FontFamily;
    Font font = null;
    try {
      for (int i = 0; i < 12; i++) {
        if (font != null) font.Dispose();
        font = new Font(fam, size, style, GraphicsUnit.Pixel);
        SizeF measured = g.MeasureString(text, font, new SizeF(1000, 1000), fmt);
        if (measured.Width <= rect.Width + 2 || size <= 8) break;
        size -= 1;
      }
      g.DrawString(text, font, brush, rect, fmt);
    } finally {
      if (font != null) font.Dispose();
      fmt.Dispose();
    }
  }

  static void WithRotate(Graphics g, float cx, float cy, float degrees, Action action) {
    GraphicsState state = g.Save();
    g.TranslateTransform(cx, cy);
    g.RotateTransform(degrees);
    g.TranslateTransform(-cx, -cy);
    action();
    g.Restore(state);
  }

  static void DrawTape(Graphics g, float x, float y, float w, float h, float rotate, Color fill, Color ink) {
    WithRotate(g, x + w / 2, y + h / 2, rotate, delegate {
      FillRound(g, new RectangleF(x, y, w, h), 5, Color.FromArgb(210, fill.R, fill.G, fill.B));
      using (Pen p = new Pen(Color.FromArgb(110, ink.R, ink.G, ink.B), 1)) {
        for (float dx = x + 6; dx < x + w; dx += 10) {
          g.DrawLine(p, dx, y + 3, dx - 5, y + h - 3);
        }
      }
    });
  }

  static void DrawPill(Graphics g, float x, float y, float w, float h, string text, Color bg, Color ink) {
    FillRound(g, new RectangleF(x + 2, y + 2, w, h), h / 2, Color.FromArgb(35, 30, 20, 30));
    FillRound(g, new RectangleF(x, y, w, h), h / 2, bg);
    using (Font f = Rounded(12, FontStyle.Bold))
    using (SolidBrush b = new SolidBrush(ink)) {
      DrawTextFit(g, text, new RectangleF(x + 8, y + 1, w - 16, h - 2), f, b, true);
    }
  }

  static void DrawSparkle(Graphics g, float cx, float cy, float r, Color color) {
    PointF[] pts = new PointF[] {
      new PointF(cx, cy - r),
      new PointF(cx + r * 0.22f, cy - r * 0.22f),
      new PointF(cx + r, cy),
      new PointF(cx + r * 0.22f, cy + r * 0.22f),
      new PointF(cx, cy + r),
      new PointF(cx - r * 0.22f, cy + r * 0.22f),
      new PointF(cx - r, cy),
      new PointF(cx - r * 0.22f, cy - r * 0.22f)
    };
    using (SolidBrush b = new SolidBrush(color)) {
      g.FillPolygon(b, pts);
    }
  }

  static void DrawStar(Graphics g, float cx, float cy, float outer, float inner, Color fill, Color stroke) {
    PointF[] pts = new PointF[10];
    for (int i = 0; i < 10; i++) {
      double a = -Math.PI / 2 + i * Math.PI / 5;
      float r = (i % 2 == 0) ? outer : inner;
      pts[i] = new PointF(cx + (float)Math.Cos(a) * r, cy + (float)Math.Sin(a) * r);
    }
    using (SolidBrush b = new SolidBrush(fill))
    using (Pen p = new Pen(stroke, 2)) {
      g.FillPolygon(b, pts);
      g.DrawPolygon(p, pts);
    }
  }

  static void DrawHeart(Graphics g, float cx, float cy, float r, Color fill, Color stroke) {
    using (GraphicsPath path = new GraphicsPath()) {
      path.AddBezier(cx, cy + r * 0.85f, cx - r * 1.45f, cy - r * 0.05f, cx - r * 0.95f, cy - r * 0.95f, cx, cy - r * 0.35f);
      path.AddBezier(cx, cy - r * 0.35f, cx + r * 0.95f, cy - r * 0.95f, cx + r * 1.45f, cy - r * 0.05f, cx, cy + r * 0.85f);
      path.CloseFigure();
      using (SolidBrush b = new SolidBrush(fill))
      using (Pen p = new Pen(stroke, 2)) {
        g.FillPath(b, path);
        g.DrawPath(p, path);
      }
    }
  }

  static void DrawFlower(Graphics g, float cx, float cy, float r, Color petal, Color center, Color stroke) {
    for (int i = 0; i < 8; i++) {
      float angle = i * 45;
      WithRotate(g, cx, cy, angle, delegate {
        FillRound(g, new RectangleF(cx - r * 0.24f, cy - r * 1.07f, r * 0.48f, r * 0.74f), r * 0.22f, petal);
        StrokeRound(g, new RectangleF(cx - r * 0.24f, cy - r * 1.07f, r * 0.48f, r * 0.74f), r * 0.22f, stroke, 1);
      });
    }
    using (SolidBrush b = new SolidBrush(center))
    using (Pen p = new Pen(stroke, 1.5f)) {
      g.FillEllipse(b, cx - r * 0.36f, cy - r * 0.36f, r * 0.72f, r * 0.72f);
      g.DrawEllipse(p, cx - r * 0.36f, cy - r * 0.36f, r * 0.72f, r * 0.72f);
    }
  }

  static void DrawPetal(Graphics g, float cx, float cy, float w, float h, float rotate, Color fill) {
    WithRotate(g, cx, cy, rotate, delegate {
      using (SolidBrush b = new SolidBrush(fill)) {
        g.FillEllipse(b, cx - w / 2, cy - h / 2, w, h);
      }
    });
  }

  static void DrawCloud(Graphics g, float cx, float cy, float r, Color fill, Color stroke) {
    using (SolidBrush b = new SolidBrush(Color.FromArgb(42, 35, 20, 35))) {
      g.FillEllipse(b, cx - r * 1.25f + 3, cy - r * 0.05f + 4, r * 0.9f, r * 0.72f);
      g.FillEllipse(b, cx - r * 0.62f + 3, cy - r * 0.52f + 4, r, r);
      g.FillEllipse(b, cx + r * 0.06f + 3, cy - r * 0.42f + 4, r, r * 0.9f);
      g.FillEllipse(b, cx + r * 0.58f + 3, cy - r * 0.03f + 4, r * 0.78f, r * 0.66f);
    }
    using (SolidBrush b = new SolidBrush(fill))
    using (Pen p = new Pen(stroke, 1.5f)) {
      g.FillEllipse(b, cx - r * 1.25f, cy - r * 0.05f, r * 0.9f, r * 0.72f);
      g.FillEllipse(b, cx - r * 0.62f, cy - r * 0.52f, r, r);
      g.FillEllipse(b, cx + r * 0.06f, cy - r * 0.42f, r, r * 0.9f);
      g.FillEllipse(b, cx + r * 0.58f, cy - r * 0.03f, r * 0.78f, r * 0.66f);
      g.DrawArc(p, cx - r * 1.25f, cy - r * 0.05f, r * 0.9f, r * 0.72f, 170, 170);
      g.DrawArc(p, cx - r * 0.62f, cy - r * 0.52f, r, r, 190, 190);
      g.DrawArc(p, cx + r * 0.06f, cy - r * 0.42f, r, r * 0.9f, 190, 180);
      g.DrawArc(p, cx + r * 0.58f, cy - r * 0.03f, r * 0.78f, r * 0.66f, 220, 140);
    }
  }

  static void DrawFace(Graphics g, float cx, float cy, float r, Color ink, Color blush) {
    using (SolidBrush b = new SolidBrush(ink)) {
      g.FillEllipse(b, cx - r * 0.42f, cy - r * 0.22f, r * 0.12f, r * 0.12f);
      g.FillEllipse(b, cx + r * 0.30f, cy - r * 0.22f, r * 0.12f, r * 0.12f);
    }
    using (Pen p = new Pen(ink, 1.7f)) {
      g.DrawArc(p, cx - r * 0.22f, cy - r * 0.05f, r * 0.44f, r * 0.32f, 15, 150);
    }
    using (SolidBrush b = new SolidBrush(blush)) {
      g.FillEllipse(b, cx - r * 0.62f, cy, r * 0.22f, r * 0.11f);
      g.FillEllipse(b, cx + r * 0.42f, cy, r * 0.22f, r * 0.11f);
    }
  }

  static void DrawSmiley(Graphics g, float cx, float cy, float r, Color fill, Color ink) {
    using (SolidBrush b = new SolidBrush(fill))
    using (Pen p = new Pen(ink, 2)) {
      g.FillEllipse(b, cx - r, cy - r, r * 2, r * 2);
      g.DrawEllipse(p, cx - r, cy - r, r * 2, r * 2);
      g.FillEllipse(new SolidBrush(ink), cx - r * 0.38f, cy - r * 0.28f, r * 0.12f, r * 0.12f);
      g.FillEllipse(new SolidBrush(ink), cx + r * 0.27f, cy - r * 0.28f, r * 0.12f, r * 0.12f);
      g.DrawArc(p, cx - r * 0.42f, cy - r * 0.08f, r * 0.84f, r * 0.58f, 15, 150);
    }
  }

  static void DrawBow(Graphics g, float cx, float cy, float r, Color fill, Color stroke) {
    PointF[] left = new PointF[] {
      new PointF(cx, cy),
      new PointF(cx - r * 1.15f, cy - r * 0.65f),
      new PointF(cx - r * 1.15f, cy + r * 0.65f)
    };
    PointF[] right = new PointF[] {
      new PointF(cx, cy),
      new PointF(cx + r * 1.15f, cy - r * 0.65f),
      new PointF(cx + r * 1.15f, cy + r * 0.65f)
    };
    using (SolidBrush b = new SolidBrush(fill))
    using (Pen p = new Pen(stroke, 1.7f)) {
      g.FillPolygon(b, left);
      g.FillPolygon(b, right);
      g.DrawPolygon(p, left);
      g.DrawPolygon(p, right);
      g.FillEllipse(b, cx - r * 0.28f, cy - r * 0.28f, r * 0.56f, r * 0.56f);
      g.DrawEllipse(p, cx - r * 0.28f, cy - r * 0.28f, r * 0.56f, r * 0.56f);
    }
  }

  static void DrawSnowflake(Graphics g, float cx, float cy, float r, Color color) {
    using (Pen p = new Pen(color, 1.8f)) {
      for (int i = 0; i < 6; i++) {
        double a = i * Math.PI / 3;
        float x = (float)Math.Cos(a) * r;
        float y = (float)Math.Sin(a) * r;
        g.DrawLine(p, cx - x, cy - y, cx + x, cy + y);
        float bx = (float)Math.Cos(a + 0.55) * r * 0.28f;
        float by = (float)Math.Sin(a + 0.55) * r * 0.28f;
        g.DrawLine(p, cx + x * 0.62f, cy + y * 0.62f, cx + x * 0.42f + bx, cy + y * 0.42f + by);
      }
    }
  }

  static void DrawMusicNote(Graphics g, float cx, float cy, Color fill, Color stroke) {
    using (Pen p = new Pen(stroke, 3))
    using (SolidBrush b = new SolidBrush(fill)) {
      g.DrawLine(p, cx + 8, cy - 34, cx + 8, cy + 16);
      g.DrawLine(p, cx + 8, cy - 34, cx + 36, cy - 26);
      g.FillEllipse(b, cx - 14, cy + 7, 26, 20);
      g.DrawEllipse(p, cx - 14, cy + 7, 26, 20);
    }
  }

  static void DrawMiniCamera(Graphics g, float x, float y, Color body, Color ink) {
    FillRound(g, new RectangleF(x, y + 8, 44, 30), 7, body);
    StrokeRound(g, new RectangleF(x, y + 8, 44, 30), 7, ink, 1.8f);
    FillRound(g, new RectangleF(x + 7, y, 18, 10), 4, body);
    using (SolidBrush b = new SolidBrush(Color.White))
    using (Pen p = new Pen(ink, 1.8f)) {
      g.FillEllipse(b, x + 15, y + 15, 15, 15);
      g.DrawEllipse(p, x + 15, y + 15, 15, 15);
      g.FillEllipse(new SolidBrush(ink), x + 34, y + 13, 5, 5);
    }
  }

  static void DrawChecker(Graphics g, RectangleF area, float size, Color a, Color b) {
    using (SolidBrush ba = new SolidBrush(a))
    using (SolidBrush bb = new SolidBrush(b)) {
      for (float y = area.Y; y < area.Bottom; y += size) {
        for (float x = area.X; x < area.Right; x += size) {
          bool alt = (((int)((x - area.X) / size) + (int)((y - area.Y) / size)) % 2) == 0;
          g.FillRectangle(alt ? ba : bb, x, y, size, size);
        }
      }
    }
  }

  static void DrawDots(Graphics g, Color color, float step, float radius, int alpha) {
    using (SolidBrush b = new SolidBrush(A(color, alpha))) {
      for (float y = 18; y < H; y += step) {
        for (float x = StripX + 18; x < StripX + StripW - 18; x += step) {
          g.FillEllipse(b, x - radius, y - radius, radius * 2, radius * 2);
        }
      }
    }
  }

  static void DrawSeoulPink(Graphics g) {
    Color pink = C("FF8CCF");
    Color ink = C("6F3766");
    DrawSoftPaper(g, C("FFE5F4"), C("EADFFF"));
    DrawDots(g, C("FFFFFF"), 31, 2.2f, 120);
    DrawHeart(g, 198, 26, 13, C("FF6EB5"), ink);
    DrawHeart(g, 436, 208, 11, C("FFD3EC"), ink);
    DrawBow(g, 427, 394, 14, C("F7A8DC"), ink);
    DrawSmiley(g, 197, 587, 14, C("FFF37E"), ink);
    DrawSparkle(g, 438, 33, 12, C("FFFFFF"));
    DrawSparkle(g, 196, 391, 9, C("FFFFFF"));
    DrawPill(g, 198, 767, 86, 24, "\uC624\uB298", Color.White, pink);
    DrawMiniCamera(g, 386, 760, C("FFE7F4"), ink);
    DrawSlots(g, C("FF9BD5"), C("FFFFFF"), pink);
    DrawBadge(g, "SEOUL SNAP", "\uC624\uB298\uC758 \uAE30\uC5B5", pink, C("FFFFFF"));
  }

  static void DrawCherryBlossom(Graphics g) {
    Color blush = C("F58CA8");
    Color ink = C("7A4656");
    DrawSoftPaper(g, C("FFF1F4"), C("FFE1EC"));
    using (Pen branch = new Pen(C("9B6456"), 3)) {
      g.DrawBezier(branch, 454, 42, 412, 88, 436, 150, 395, 205);
      g.DrawBezier(branch, 166, 600, 220, 640, 184, 716, 236, 758);
    }
    for (int i = 0; i < 10; i++) {
      float x = (i % 2 == 0) ? 190 + i * 24 : 430 - i * 19;
      float y = 48 + i * 74;
      DrawPetal(g, x, y, 15, 22, i * 24, A(blush, 210));
    }
    DrawFlower(g, 423, 87, 16, C("FFD3DE"), C("FFB6CA"), ink);
    DrawFlower(g, 404, 188, 13, C("FFE1E9"), C("FFB6CA"), ink);
    DrawFlower(g, 216, 641, 15, C("FFD3DE"), C("FFB6CA"), ink);
    DrawPill(g, 350, 766, 74, 24, "\uBD04", Color.White, blush);
    DrawSparkle(g, 188, 24, 8, C("FFFFFF"));
    DrawSlots(g, C("F5A2B4"), C("FFF9C9"), blush);
    DrawBadge(g, "BLOSSOM", "\uBD04 \uD558\uB8E8", blush, C("FFFFFF"));
  }

  static void DrawMilkCafe(Graphics g) {
    Color latte = C("B98A63");
    Color ink = C("5C4638");
    DrawSoftPaper(g, C("FFF8EB"), C("F8E8D5"));
    DrawChecker(g, new RectangleF(StripX, 0, StripW, H), 30, A(C("FFFFFF"), 70), A(C("E9C8A7"), 55));
    DrawCloud(g, 418, 33, 18, C("FFFFFF"), C("CFAE8D"));
    DrawSmiley(g, 200, 206, 15, C("FFE08F"), ink);
    DrawCoffee(g, 416, 392, C("FFD9B5"), ink);
    DrawToast(g, 202, 580, C("F6C58D"), ink);
    DrawPill(g, 190, 765, 84, 24, "CAFE", Color.White, latte);
    DrawSlots(g, C("D7AD85"), C("FCE9CF"), latte);
    DrawBadge(g, "MILK CAFE", "\uB2EC\uCF64\uD55C \uC21C\uAC04", latte, C("FFFFFF"));
  }

  static void DrawCoffee(Graphics g, float cx, float cy, Color fill, Color ink) {
    FillRound(g, new RectangleF(cx - 18, cy - 9, 34, 31), 6, fill);
    StrokeRound(g, new RectangleF(cx - 18, cy - 9, 34, 31), 6, ink, 1.8f);
    using (Pen p = new Pen(ink, 2)) {
      g.DrawArc(p, cx + 8, cy - 3, 22, 19, 270, 170);
      g.DrawLine(p, cx - 14, cy - 14, cx - 10, cy - 22);
      g.DrawLine(p, cx, cy - 14, cx + 4, cy - 24);
      g.DrawLine(p, cx + 12, cy - 14, cx + 15, cy - 22);
    }
    DrawFace(g, cx, cy + 4, 20, ink, C("F7A0A4"));
  }

  static void DrawToast(Graphics g, float cx, float cy, Color fill, Color ink) {
    using (GraphicsPath path = new GraphicsPath()) {
      path.AddArc(cx - 24, cy - 26, 48, 42, 180, 180);
      path.AddLine(cx + 24, cy - 5, cx + 20, cy + 24);
      path.AddLine(cx + 20, cy + 24, cx - 20, cy + 24);
      path.AddLine(cx - 20, cy + 24, cx - 24, cy - 5);
      path.CloseFigure();
      using (SolidBrush b = new SolidBrush(fill))
      using (Pen p = new Pen(ink, 2)) {
        g.FillPath(b, path);
        g.DrawPath(p, path);
      }
    }
    DrawFace(g, cx, cy + 4, 22, ink, C("F29EA2"));
  }

  static void DrawIdolFlash(Graphics g) {
    Color hot = C("FF4FA3");
    Color cyan = C("7BE6FF");
    Color ink = C("272334");
    DrawSoftPaper(g, C("21202F"), C("4A345B"));
    using (Pen p = new Pen(A(Color.White, 56), 1)) {
      for (int x = StripX - 50; x < StripX + StripW + 40; x += 22) {
        g.DrawLine(p, x, 0, x + 120, H);
      }
    }
    DrawStar(g, 202, 28, 18, 8, C("FFF46E"), ink);
    DrawStar(g, 433, 204, 16, 7, hot, Color.White);
    DrawSparkle(g, 200, 390, 14, cyan);
    DrawMusicNote(g, 415, 580, hot, Color.White);
    DrawPill(g, 366, 765, 70, 24, "LIVE", hot, Color.White);
    DrawSlots(g, C("A4EFFF"), C("FF76B8"), Color.White);
    DrawBadge(g, "IDOL MODE", "shine all day", hot, C("FFFFFF"));
  }

  static void DrawHanRiverNight(Graphics g) {
    Color night = C("24395F");
    Color gold = C("FFD36B");
    DrawSoftPaper(g, C("1F3157"), C("556D98"));
    using (SolidBrush moon = new SolidBrush(gold)) {
      g.FillEllipse(moon, 404, 26, 37, 37);
    }
    using (SolidBrush cut = new SolidBrush(C("1F3157"))) {
      g.FillEllipse(cut, 417, 20, 37, 37);
    }
    using (Pen star = new Pen(A(Color.White, 190), 1.4f)) {
      for (int i = 0; i < 26; i++) {
        float x = StripX + 18 + (i * 37) % 260;
        float y = 14 + (i * 67) % 740;
        g.DrawLine(star, x - 2, y, x + 2, y);
        g.DrawLine(star, x, y - 2, x, y + 2);
      }
    }
    DrawBridge(g, 177, 764, 266, C("A7C6E8"), gold);
    DrawCloud(g, 204, 205, 16, A(Color.White, 215), C("8198C0"));
    DrawPill(g, 190, 16, 80, 24, "\uC11C\uC6B8", A(Color.White, 235), night);
    DrawSlots(g, C("A9C7EA"), C("FFF4B8"), night);
    DrawBadge(g, "HAN RIVER", "\uBC24\uC758 \uC11C\uC6B8", night, C("FFFFFF"));
  }

  static void DrawBridge(Graphics g, float x, float y, float w, Color line, Color light) {
    using (Pen p = new Pen(line, 2.2f))
    using (Pen thin = new Pen(A(line, 150), 1)) {
      g.DrawLine(p, x, y + 34, x + w, y + 34);
      g.DrawArc(p, x + 28, y - 18, w - 56, 72, 190, 160);
      for (int i = 0; i < 8; i++) {
        float px = x + 34 + i * 28;
        g.DrawLine(thin, px, y + 8, px, y + 34);
      }
    }
    using (SolidBrush b = new SolidBrush(light)) {
      for (int i = 0; i < 9; i++) {
        g.FillEllipse(b, x + 16 + i * 29, y + 29, 4, 4);
      }
    }
  }

  static void DrawSchoolDay(Graphics g) {
    Color blue = C("6FA8FF");
    Color red = C("F06072");
    Color ink = C("35527B");
    DrawSoftPaper(g, C("EAF5FF"), C("D8E8FF"));
    using (Pen p = new Pen(A(blue, 80), 1)) {
      for (int x = StripX + 18; x < StripX + StripW; x += 24) g.DrawLine(p, x, 0, x, H);
      for (int y = 20; y < H; y += 24) g.DrawLine(p, StripX, y, StripX + StripW, y);
    }
    DrawPencil(g, 418, 24, -12, C("FFD56B"), ink);
    DrawBow(g, 202, 206, 13, red, ink);
    DrawStar(g, 422, 393, 15, 7, C("FFF27A"), ink);
    DrawMiniCamera(g, 190, 575, C("FFFFFF"), ink);
    DrawPill(g, 350, 766, 88, 24, "CLASS", Color.White, blue);
    DrawSlots(g, C("88B8FF"), C("FFFFFF"), red);
    DrawBadge(g, "SCHOOL DAY", "\uCE5C\uAD6C\uC640 \uD568\uAED8", blue, C("FFFFFF"));
  }

  static void DrawPencil(Graphics g, float cx, float cy, float rotate, Color body, Color ink) {
    WithRotate(g, cx, cy, rotate, delegate {
      FillRound(g, new RectangleF(cx - 9, cy - 36, 18, 58), 5, body);
      StrokeRound(g, new RectangleF(cx - 9, cy - 36, 18, 58), 5, ink, 1.5f);
      PointF[] tip = new PointF[] { new PointF(cx - 9, cy - 36), new PointF(cx + 9, cy - 36), new PointF(cx, cy - 51) };
      using (SolidBrush b = new SolidBrush(C("E8C19B")))
      using (Pen p = new Pen(ink, 1.5f)) {
        g.FillPolygon(b, tip);
        g.DrawPolygon(p, tip);
      }
      using (Pen p = new Pen(ink, 1)) {
        g.DrawLine(p, cx - 3, cy - 28, cx - 3, cy + 18);
        g.DrawLine(p, cx + 3, cy - 28, cx + 3, cy + 18);
      }
    });
  }

  static void DrawStickerPic(Graphics g) {
    Color coral = C("FF6B6B");
    Color blue = C("4CA3FF");
    Color ink = C("30323A");
    DrawSoftPaper(g, C("FFFFFF"), C("F5F5F8"));
    using (Pen p = new Pen(C("D9DDE8"), 1)) {
      for (int y = 22; y < H; y += 22) g.DrawLine(p, StripX, y, StripX + StripW, y);
    }
    DrawTape(g, 185, 22, 70, 18, -10, C("FFF082"), ink);
    DrawPill(g, 374, 21, 58, 23, "MEMO", coral, Color.White);
    DrawHeart(g, 428, 205, 12, C("FFCCD4"), ink);
    DrawStar(g, 198, 394, 14, 7, C("FFF27A"), ink);
    DrawMiniCamera(g, 389, 574, C("D8F0FF"), ink);
    DrawSmiley(g, 202, 765, 16, C("FFE56B"), ink);
    DrawSlots(g, C("DDE1EC"), C("D8F0FF"), blue);
    DrawBadge(g, "STICKER PIC", "cute memo booth", ink, C("FFFFFF"));
  }

  static void DrawLavenderPicnic(Graphics g) {
    Color lavender = C("9C7BEA");
    Color lemon = C("FFE66D");
    Color ink = C("62527D");
    DrawSoftPaper(g, C("F1E9FF"), C("FFF7D9"));
    DrawChecker(g, new RectangleF(StripX, 0, StripW, H), 34, A(C("FFFFFF"), 88), A(C("DCCBFF"), 95));
    DrawFlower(g, 202, 28, 16, C("FFFFFF"), lemon, ink);
    DrawFlower(g, 420, 208, 14, C("FFFFFF"), lemon, ink);
    DrawFlower(g, 201, 581, 15, C("FFFFFF"), lemon, ink);
    DrawHeart(g, 424, 393, 11, C("FFD5E6"), ink);
    DrawPill(g, 350, 766, 86, 24, "PICNIC", Color.White, lavender);
    DrawSparkle(g, 426, 26, 9, C("FFFFFF"));
    DrawSlots(g, C("B99AF4"), C("FFF5A8"), lavender);
    DrawBadge(g, "LAVENDER", "\uC18C\uD48D \uAC00\uB294 \uB0A0", lavender, C("FFFFFF"));
  }

  static void DrawMonoChic(Graphics g) {
    Color ink = C("171717");
    Color red = C("E84855");
    DrawSoftPaper(g, C("F7F7F7"), C("E9E9E9"));
    using (Pen p = new Pen(A(ink, 45), 1.1f)) {
      for (int i = -160; i < 480; i += 22) {
        g.DrawLine(p, StripX + i, 0, StripX + i + 260, H);
      }
    }
    DrawPill(g, 190, 18, 74, 24, "NO.09", ink, Color.White);
    DrawHeart(g, 426, 206, 10, red, ink);
    DrawStar(g, 198, 394, 15, 7, Color.White, ink);
    DrawMiniCamera(g, 389, 574, Color.White, ink);
    DrawTape(g, 357, 764, 70, 18, 8, C("FFFFFF"), ink);
    DrawSlots(g, C("1F1F1F"), C("FFFFFF"), red);
    DrawBadge(g, "MONO CHIC", "\uAE54\uB054\uD55C \uC21C\uAC04", ink, C("FFFFFF"));
  }

  static void DrawWinterSnow(Graphics g) {
    Color ice = C("69B7E8");
    Color ink = C("37627F");
    DrawSoftPaper(g, C("E8F8FF"), C("D7ECFF"));
    using (Pen p = new Pen(A(Color.White, 90), 1.3f)) {
      for (int y = 0; y < H; y += 32) g.DrawLine(p, StripX, y, StripX + StripW, y + 52);
    }
    DrawSnowflake(g, 202, 27, 15, Color.White);
    DrawSnowflake(g, 424, 207, 14, C("FFFFFF"));
    DrawSnowflake(g, 200, 394, 13, C("FFFFFF"));
    DrawCloud(g, 418, 580, 17, A(Color.White, 235), C("A6CFEF"));
    DrawBow(g, 203, 766, 13, C("BFE7FF"), ink);
    DrawPill(g, 350, 766, 84, 24, "WINTER", Color.White, ice);
    DrawSlots(g, C("9CD7F7"), C("FFFFFF"), ice);
    DrawBadge(g, "SNOW DAY", "\uACA8\uC6B8 \uAE30\uC5B5", ice, C("FFFFFF"));
  }
}
'@

[KoreanPhotoboothFrameGenerator]::GenerateAll($Root)
Get-ChildItem -LiteralPath $FramesSourceDir -Filter 'kr_frame_*.png' |
  Sort-Object Name |
  Select-Object Name, Length
