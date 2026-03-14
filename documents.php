<?php
// documents.php - Devuelve un JSON con todos los archivos disponibles en la carpeta docs

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$docsDir = __DIR__ . DIRECTORY_SEPARATOR . 'docs';
$publicPrefix = 'docs/';

// Extensiones permitidas (whitelist de seguridad)
$allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'zip', 'exe', 'msi', 'rar', '7z'];

// Validar que el directorio existe y es accesible
$realDocsDir = realpath($docsDir);
if (!$realDocsDir || !is_dir($realDocsDir)) {
    http_response_code(404);
    echo json_encode([
        'error' => 'Directorio docs no encontrado en el servidor.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$entries = scandir($realDocsDir);
if ($entries === false) {
    http_response_code(500);
    echo json_encode([
        'error' => 'No se pudo leer el contenido de la carpeta docs.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function human_size($bytes)
{
    if (!is_numeric($bytes) || $bytes < 0) {
        return 'N/A';
    }

    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $i = 0;

    while ($bytes >= 1024 && $i < count($units) - 1) {
        $bytes /= 1024;
        $i++;
    }

    return sprintf('%.1f %s', $bytes, $units[$i]);
}

$result = [];

foreach ($entries as $entry) {
    // Ignorar directorios especiales y archivos de sistema comunes
    if ($entry === '.' || $entry === '..' || $entry === 'desktop.ini') {
        continue;
    }

    $fullPath = $realDocsDir . DIRECTORY_SEPARATOR . $entry;

    // Validar con realpath para prevenir directory traversal
    $realFilePath = realpath($fullPath);
    if (!$realFilePath || strpos($realFilePath, $realDocsDir) !== 0) {
        continue;
    }

    if (!is_file($realFilePath)) {
        continue;
    }

    $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));

    // Filtrar solo extensiones permitidas
    if (!in_array($ext, $allowedExtensions)) {
        continue;
    }

    // Determinar tipo legible en base a la extensión
    $type = strtoupper($ext);
    if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'])) {
        $type = 'IMG';
    } elseif (in_array($ext, ['doc', 'docx', 'odt', 'rtf'])) {
        $type = 'DOC';
    } elseif (in_array($ext, ['xls', 'xlsx', 'ods'])) {
        $type = 'XLS';
    } elseif (in_array($ext, ['ppt', 'pptx', 'odp'])) {
        $type = 'PPT';
    } elseif ($ext === 'pdf') {
        $type = 'PDF';
    } elseif ($ext === 'zip' || $ext === 'rar' || $ext === '7z') {
        $type = 'ZIP';
    } elseif ($ext === 'exe' || $ext === 'msi') {
        $type = 'EXE';
    }

    $sizeBytes = @filesize($fullPath);
    $sizeLabel = human_size($sizeBytes);

    $result[] = [
        'name' => $entry,
        'file' => $publicPrefix . $entry,
        'type' => $type,
        'size' => $sizeLabel,
    ];
}

// Ordenar alfabéticamente por nombre para consistencia
usort($result, function ($a, $b) {
    return strcmp($a['name'], $b['name']);
});

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
