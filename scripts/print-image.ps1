param (
    [string]$ImagePath,
    [string]$PrinterName = ""
)

if (-not $ImagePath) {
    Write-Error "Please specify ImagePath"
    exit 1
}

# Resolve absolute path to image
$ImagePath = (Get-Item $ImagePath).FullName

# Load .NET System.Drawing assembly
Add-Type -AssemblyName System.Drawing

# Create PrintDocument object
$doc = New-Object System.Drawing.Printing.PrintDocument

# Configure Printer Name if specified
if ($PrinterName) {
    $doc.PrinterSettings.PrinterName = $PrinterName
    Write-Output "Using specified printer: $PrinterName"
} else {
    Write-Output "Using default printer: $($doc.PrinterSettings.PrinterName)"
}

# Load the image to inspect dimensions
$img = [System.Drawing.Image]::FromFile($ImagePath)
$isPortrait = $img.Height -gt $img.Width

# Set landscape/portrait
$doc.DefaultPageSettings.Landscape = -not $isPortrait
Write-Output "Print orientation: $(if ($isPortrait) { 'Portrait' } else { 'Landscape' })"

# Set color mode to true (for high quality color printing)
$doc.DefaultPageSettings.Color = $true

# Set margins to 0 for maximum printable area (borderless style)
$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)

# Set highest printer resolution (best quality)
$maxRes = $doc.PrinterSettings.PrinterResolutions | Sort-Object X, Y -Descending | Select-Object -First 1
if ($maxRes) {
    $doc.DefaultPageSettings.PrinterResolution = $maxRes
    Write-Output "Set printer resolution to highest quality: $($maxRes.X)x$($maxRes.Y) DPI"
}

# Search for standard 10x15 cm / 4x6 inch / 4R / Postcard size in printer capabilities
$sizeMatch = $doc.PrinterSettings.PaperSizes | Where-Object {
    $_.PaperName -like "*10*15*" -or
    $_.PaperName -like "*100*150*" -or
    $_.PaperName -like "*4*6*" -or
    $_.PaperName -like "*4R*" -or
    $_.PaperName -like "*Postcard*" -or
    $_.PaperName -like "*KG*" -or
    $_.PaperName -like "*Hagaki*"
} | Select-Object -First 1

if ($sizeMatch) {
    $doc.DefaultPageSettings.PaperSize = $sizeMatch
    Write-Output "Selected PaperSize from printer: $($sizeMatch.PaperName)"
} else {
    # Fallback: Try custom paper size of 10x15 cm (3.94 x 5.91 inches = 394 x 591 hundredths of an inch)
    try {
        $customSize = New-Object System.Drawing.Printing.PaperSize("Photobooth 10x15", 394, 591)
        $doc.DefaultPageSettings.PaperSize = $customSize
        Write-Output "Created custom PaperSize: 10x15 cm (394x591 hundredths of an inch)"
    } catch {
        Write-Warning "Could not set custom paper size. Using printer default."
    }
}

# Draw page handler
$doc.Add_PrintPage({
    param($sender, $e)
    
    # Configure high quality graphics settings
    $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $e.Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Use printable area (VisibleClipBounds) to fit the image
    $rect = $e.Graphics.VisibleClipBounds
    
    # Draw image onto printer context
    $e.Graphics.DrawImage($img, $rect)
    
    # End of printing page
    $e.HasMorePages = $false
})

try {
    $doc.Print()
    Write-Output "Print job sent successfully."
} catch {
    Write-Error "Failed to print: $_"
    exit 1
} finally {
    # Dispose resources to release locks
    $img.Dispose()
    $doc.Dispose()
}
