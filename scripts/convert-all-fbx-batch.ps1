# PowerShell script to convert all FBX files to GLB
# Processes files in batches to avoid memory issues

$sourceDir = "X:\Prototype\temp\sci-fi-modular-extracted\Ultimate Modular Sci-Fi - Feb 2021\FBX"
$outputDir = "X:\Prototype\temp\converted-glb"
$blenderPath = "X:\Blender\Blender-5.1.0\blender.exe"
$pythonScript = "X:\Prototype\scripts\blender-fbx-to-glb.py"

# Get all FBX files
$fbxFiles = Get-ChildItem -Path $sourceDir -Recurse -Filter "*.fbx"
$totalFiles = $fbxFiles.Count
$batchSize = 5
$current = 0

Write-Host "Found $totalFiles FBX files to convert"
Write-Host "Processing in batches of $batchSize`n"

foreach ($file in $fbxFiles) {
    $current++
    $relativePath = $file.FullName.Substring($sourceDir.Length + 1)
    $outputPath = Join-Path $outputDir ($relativePath -replace '\.fbx$', '.glb')
    $outputFileDir = Split-Path $outputPath -Parent
    
    # Create output directory if needed
    if (-not (Test-Path $outputFileDir)) {
        New-Item -ItemType Directory -Path $outputFileDir -Force | Out-Null
    }
    
    Write-Host "[$current/$totalFiles] Converting: $($file.Name)"
    
    # Convert
    & $blenderPath --background --python $pythonScript -- $file.FullName $outputPath 2>&1 | Out-Null
    
    if (Test-Path $outputPath) {
        $size = (Get-Item $outputPath).Length / 1KB
        Write-Host "  Success ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  Failed" -ForegroundColor Red
    }
    
    # Small delay every 5 files
    if ($current % $batchSize -eq 0) {
        Start-Sleep -Milliseconds 500
    }
}

Write-Host "`nConversion complete! Converted $current files."

