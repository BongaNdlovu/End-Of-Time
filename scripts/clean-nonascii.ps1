$ErrorActionPreference = 'Stop'

# Extensions to process (common text/code files)
$extensions = @(
  '*.js','*.jsx','*.ts','*.tsx','*.mjs',
  '*.css','*.scss','*.sass','*.less',
  '*.html','*.htm','*.php','*.json',
  '*.md','*.txt','*.svg','*.xml',
  '*.py','*.rb','*.java','*.cs','*.go','*.sh',
  '*.yml','*.yaml','*.ini','*.env','*.vue'
)

# Paths to exclude (regex OR pattern)
$excludePattern = '(\\node_modules\\|\\dist\\|\\build\\|\\\.git\\|\\vendor\\|\\bin\\|\\obj\\|\\coverage\\|\\.next\\|\\out\\|\\.vite\\|\\.cache\\|__pycache__|\\.parcel-cache)'

# Regex pattern for any non-ASCII character
$nonAsciiPattern = '[^\u0000-\u007F]'

Get-ChildItem -Recurse -File -Include $extensions |
  Where-Object { $_.FullName -notmatch $excludePattern } |
  ForEach-Object {
    $path = $_.FullName
    try {
      $content = Get-Content -Raw -LiteralPath $path
      $cleaned = [regex]::Replace($content, $nonAsciiPattern, '')
      if ($cleaned -ne $content) {
        Set-Content -LiteralPath $path -Value $cleaned -NoNewline -Encoding utf8
        Write-Host ("Cleaned {0}" -f $path)
      }
    } catch {
      Write-Warning ("Failed to process {0}: {1}" -f $path, $_.Exception.Message)
    }
  }


