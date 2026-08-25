@echo off
cd /d "%~dp0"

:: ====================================================================
:: 【設定エリア】除外したいフォルダ・ファイル名を半角スペース区切りで指定
:: ====================================================================
set "EXCLUDES=.git node_modules .vscode old *.tmp desktop.ini *.dll"
:: ====================================================================

echo フォルダ構造を解析中（ファイル優先・インデントなしJSONモード）...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$root = '%~dp0'.TrimEnd('\'); " ^
    "$outFile = '%~dp0output_result.json'; " ^
    "$userExList = '%EXCLUDES%'.Split(' '); " ^
    "$excludePatterns = @('output_result.json', '%~nx0') + $userExList; " ^
    "function Get-DirectoryTree ($folderPath) { " ^
        "$items = @(Get-ChildItem -LiteralPath $folderPath -ErrorAction SilentlyContinue | Where-Object { " ^
            "$item = $_; " ^
            "$skip = $false; " ^
            "foreach ($pat in $script:excludePatterns) { " ^
                "if ($pat -ne '' -and $item.Name -like $pat) { $skip = $true; break } " ^
            "} " ^
            "-not $skip " ^
        "}); " ^
        "$dict = [ordered]@{}; " ^
        "foreach ($item in ($items | Where-Object { -not $_.PSIsContainer })) { " ^
            "$dict[$item.Name] = $null; " ^
        "} " ^
        "foreach ($item in ($items | Where-Object { $_.PSIsContainer })) { " ^
            "$dict[$item.Name] = (Get-DirectoryTree -folderPath $item.FullName); " ^
        "} " ^
        "return $dict " ^
    "}; " ^
    "$rootName = (Split-Path $root -Leaf); " ^
    "$tree = [ordered]@{ $rootName = (Get-DirectoryTree -folderPath $root) }; " ^
    "$json = $tree | ConvertTo-Json -Depth 100 -Compress; " ^
    "[System.IO.File]::WriteAllText($outFile, $json, [System.Text.Encoding]::UTF8)"

echo 完了しました！ "%~dp0output_result.json" に保存されました。
pause
