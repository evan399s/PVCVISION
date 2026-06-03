# server.ps1 - Mini servidor web estatico para PVCVision.
# No necesita Python ni Node: usa solo PowerShell (incluido en Windows).
# Sirve la carpeta del script por HTTP y abre el navegador cuando ya escucha.

param(
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$rootFull = [System.IO.Path]::GetFullPath($root)

# Tipos MIME (importante: .js debe ir como JavaScript para los modulos ES).
$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.mjs'  = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.ico'  = 'image/x-icon'
    '.map'  = 'application/json; charset=utf-8'
}

# Arrancar el listener TCP en 127.0.0.1 (IPv4) para evitar lios con ::1.
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
} catch {
    Write-Host ""
    Write-Host "  [ERROR] No se pudo abrir el puerto $Port." -ForegroundColor Red
    Write-Host "  Puede que ya este en uso. Cierra otros servidores o cambia el puerto."
    Write-Host ""
    Read-Host "Pulsa Enter para salir"
    exit 1
}

$url = "http://127.0.0.1:$Port/"
Write-Host ""
Write-Host "  ===============================================" -ForegroundColor Cyan
Write-Host "    PVCVision - servidor activo" -ForegroundColor Cyan
Write-Host "  ===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "    Abriendo: $url"
Write-Host "    Carpeta : $rootFull"
Write-Host ""
Write-Host "    Cierra esta ventana para detener el servidor." -ForegroundColor Yellow
Write-Host ""

# Abrir el navegador ahora que el listener ya esta escuchando.
Start-Process $url | Out-Null

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)

        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($requestLine)) { $client.Close(); continue }

        # Descartar el resto de cabeceras hasta la linea en blanco.
        while ($true) {
            $h = $reader.ReadLine()
            if ($null -eq $h -or $h -eq '') { break }
        }

        $parts = $requestLine -split ' '
        $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
        $path = ($rawPath -split '\?')[0]
        $path = [System.Uri]::UnescapeDataString($path)
        if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }
        $rel = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)

        $full = [System.IO.Path]::GetFullPath((Join-Path $rootFull $rel))

        $status = '200 OK'
        $bytes = $null
        $ct = 'application/octet-stream'

        if (-not $full.StartsWith($rootFull)) {
            # Intento de salir de la carpeta: prohibido.
            $status = '403 Forbidden'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')
            $ct = 'text/plain; charset=utf-8'
        } elseif (Test-Path -LiteralPath $full -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
            if ($mime.ContainsKey($ext)) { $ct = $mime[$ext] }
        } else {
            $status = '404 Not Found'
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $ct = 'text/plain; charset=utf-8'
        }

        $header = "HTTP/1.1 $status`r`n" +
                  "Content-Type: $ct`r`n" +
                  "Content-Length: $($bytes.Length)`r`n" +
                  "Cache-Control: no-cache`r`n" +
                  "Connection: close`r`n`r`n"
        $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($hb, 0, $hb.Length)
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Flush()
    } catch {
        # Ignorar errores de conexiones cortadas por el navegador.
    } finally {
        $client.Close()
    }
}
