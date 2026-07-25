Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class SlotCutter {
  public class Zone { public int X1,Y1,X2,Y2,Count; public string Mode; }
  static double Lum(byte r, byte g, byte b) { return 0.299*r + 0.587*g + 0.114*b; }
  static bool Light(byte r, byte g, byte b, byte a) { int mx=Math.Max(r,Math.Max(g,b)); int mn=Math.Min(r,Math.Min(g,b)); return a>20 && Lum(r,g,b)>=222 && mx-mn<=42 && r>=215 && g>=215 && b>=215; }
  static bool Dark(byte r, byte g, byte b, byte a) { int mx=Math.Max(r,Math.Max(g,b)); int mn=Math.Min(r,Math.Min(g,b)); return a>20 && Lum(r,g,b)<=58 && mx-mn<=85; }
  static bool Alpha(byte a) { return a<40; }
  public static Tuple<Bitmap,List<Zone>> Process(string path) {
    using (var src0 = new Bitmap(path)) {
      var bmp = new Bitmap(src0.Width, src0.Height, PixelFormat.Format32bppArgb);
      using (var g = Graphics.FromImage(bmp)) g.DrawImage(src0,0,0,src0.Width,src0.Height);
      int w=bmp.Width,h=bmp.Height,n=w*h;
      var rect=new Rectangle(0,0,w,h);
      var data=bmp.LockBits(rect,ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
      byte[] px=new byte[data.Stride*h]; Marshal.Copy(data.Scan0,px,0,px.Length);
      byte[][] masks = new byte[3][] { new byte[n], new byte[n], new byte[n] };
      for(int y=0;y<h;y++) for(int x=0;x<w;x++) {
        int pi=y*data.Stride+x*4; byte b=px[pi], g=px[pi+1], r=px[pi+2], a=px[pi+3]; int idx=y*w+x;
        if(Alpha(a)) masks[0][idx]=1;
        if(Light(r,g,b,a)) masks[1][idx]=1;
        if(Dark(r,g,b,a)) masks[2][idx]=1;
      }
      string[] modes = new string[]{"alpha","light","dark"};
      List<Zone>[] all = new List<Zone>[3];
      for(int mi=0;mi<3;mi++) all[mi]=Components(masks[mi],w,h,modes[mi]);
      int best=0; double bestScore=-1;
      for(int mi=0;mi<3;mi++) {
        double score=0;
        foreach(var z in all[mi]) score += z.Count;
        if(all[mi].Count>=1 && all[mi].Count<=8 && score>bestScore) { bestScore=score; best=mi; }
      }
      var zones=all[best]; var mask=masks[best];
      // Preserve a soft rim for light slots; full cut alpha/dark slots.
      foreach(var z in zones) {
        for(int y=z.Y1;y<=z.Y2;y++) for(int x=z.X1;x<=z.X2;x++) {
          int idx=y*w+x; if(mask[idx]==0) continue;
          int pi=y*data.Stride+x*4;
          if(z.Mode=="light") {
            int border=0;
            for(int dy=-4;dy<=4 && border==0;dy++) for(int dx=-4;dx<=4;dx++) {
              int nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=w||ny>=h||mask[ny*w+nx]==0) { border=1; break; }
            }
            if(border==1) { px[pi+3]=(byte)Math.Min((int)px[pi+3],120); } else px[pi+3]=0;
          } else px[pi+3]=0;
        }
      }
      bmp.UnlockBits(data);
      return Tuple.Create(bmp,zones);
    }
  }
  static List<Zone> Components(byte[] mask,int w,int h,string mode) {
    int n=w*h; byte[] seen=new byte[n]; var list=new List<Zone>(); int minArea=Math.Max(1200,(int)(n*0.018));
    int[] q=new int[n];
    for(int i=0;i<n;i++) {
      if(mask[i]==0||seen[i]!=0) continue;
      int head=0,tail=0; q[tail++]=i; seen[i]=1; int c=0,x1=w,y1=h,x2=0,y2=0;
      while(head<tail) {
        int p=q[head++], x=p%w, y=p/w; c++; if(x<x1)x1=x; if(x>x2)x2=x; if(y<y1)y1=y; if(y>y2)y2=y;
        int nb;
        if(x>0){nb=p-1;if(mask[nb]!=0&&seen[nb]==0){seen[nb]=1;q[tail++]=nb;}}
        if(x<w-1){nb=p+1;if(mask[nb]!=0&&seen[nb]==0){seen[nb]=1;q[tail++]=nb;}}
        if(y>0){nb=p-w;if(mask[nb]!=0&&seen[nb]==0){seen[nb]=1;q[tail++]=nb;}}
        if(y<h-1){nb=p+w;if(mask[nb]!=0&&seen[nb]==0){seen[nb]=1;q[tail++]=nb;}}
      }
      int bw=x2-x1+1,bh=y2-y1+1;
      if(c>=minArea && bw>w*0.12 && bh>h*0.08 && bw<w*0.98 && bh<h*0.98) list.Add(new Zone(){X1=x1,Y1=y1,X2=x2,Y2=y2,Count=c,Mode=mode});
    }
    list.Sort((a,b)=> a.Y1==b.Y1 ? a.X1.CompareTo(b.X1) : a.Y1.CompareTo(b.Y1));
    if(list.Count>8) list=list.GetRange(0,8);
    return list;
  }
}
'@

$Root = 'D:\my-photobooth'
$Frames = Join-Path $Root 'frames'
$Store = Join-Path $Root 'data\frame-packages'
New-Item -ItemType Directory -Force -Path $Store | Out-Null
$files = Get-ChildItem $Frames -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' -and $_.Name -notlike 'slotcut-*' }
$report = @()
foreach ($f in $files) {
  try {
    $result = [SlotCutter]::Process($f.FullName)
    $bmp = $result.Item1
    $zones = @($result.Item2)
    if ($zones.Count -eq 0) { $bmp.Dispose(); $report += [pscustomobject]@{file=$f.Name; status='no-slot'; slots=0}; continue }
    $outName = 'slotcut-' + [IO.Path]::GetFileNameWithoutExtension($f.Name) + '.png'
    $outPath = Join-Path $Frames $outName
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = [IO.File]::ReadAllBytes($outPath)
    $dataUrl = 'data:image/png;base64,' + [Convert]::ToBase64String($bytes)
    $zonePayload = @()
    for ($i=0; $i -lt $zones.Count; $i++) {
      $z = $zones[$i]
      $inset = 3
      $x1=[math]::Max(0,$z.X1+$inset); $y1=[math]::Max(0,$z.Y1+$inset); $x2=[math]::Min($bmp.Width,$z.X2-$inset); $y2=[math]::Min($bmp.Height,$z.Y2-$inset)
      $zonePayload += [ordered]@{ id="slot-$($i+1)"; slotIndex=$i; shape='polygon'; detectionMode=$z.Mode; points=@(@{x=$x1;y=$y1},@{x=$x2;y=$y1},@{x=$x2;y=$y2},@{x=$x1;y=$y2}) }
    }
    $payload = [ordered]@{
      schema='photobooth-frame-package:v1'; app='my-photobooth'; packageVersion=1;
      frame=[ordered]@{ name=$outName; type='png'; mimeType='image/png'; width=$bmp.Width; height=$bmp.Height; dataUrl=$dataUrl };
      slotMap=[ordered]@{ schema='photobooth-slot-map:v1'; frameName=$outName; frameWidth=$bmp.Width; frameHeight=$bmp.Height; frameType='png'; slotCount=$zones.Count; detectionMode='auto-batch'; chromaSettings=@{color='#ffffff';tolerance=42;softness=70}; zones=$zonePayload; exportedAt=(Get-Date).ToUniversalTime().ToString('o') };
      exportedAt=(Get-Date).ToUniversalTime().ToString('o'); savedAt=(Get-Date).ToUniversalTime().ToString('o')
    }
    $key = "$outName`:$($bmp.Width)x$($bmp.Height)"
    $sha = [System.Security.Cryptography.SHA1]::Create()
    $hash = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($key)) | ForEach-Object { $_.ToString('x2') })
    $jsonPath = Join-Path $Store ($hash.Substring(0,16)+'.json')
    $payload | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
    $bmp.Dispose()
    $report += [pscustomobject]@{file=$f.Name; output=$outName; json=[IO.Path]::GetFileName($jsonPath); status='ok'; slots=$zones.Count}
  } catch {
    $report += [pscustomobject]@{file=$f.Name; status='error'; slots=0; error=$_.Exception.Message}
  }
}
$reportPath = Join-Path $Root 'FRAME_SLOT_PROCESS_REPORT.json'
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $reportPath -Encoding UTF8
$ok=($report|Where-Object status -eq 'ok').Count; $no=($report|Where-Object status -eq 'no-slot').Count; $err=($report|Where-Object status -eq 'error').Count
Write-Output "REPORT=$reportPath"
Write-Output "OK=$ok NO_SLOT=$no ERROR=$err TOTAL=$($report.Count)"
