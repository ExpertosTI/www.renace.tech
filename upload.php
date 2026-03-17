<?php
// upload.php - Maneja carga de archivos al directorio docs (privado con auth básica)
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$docsDir = __DIR__ . DIRECTORY_SEPARATOR . 'docs';
$maxFileSize = 400 * 1024 * 1024; // 400MB

function require_basic_auth(): void
{
    $user = getenv('RENACE_BASIC_USER');
    $pass = getenv('RENACE_BASIC_PASS');

    if (!$user || !$pass) {
        http_response_code(500);
        echo json_encode(['error' => 'Auth no configurada']);
        exit;
    }

    if (!isset($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'])) {
        header('WWW-Authenticate: Basic realm="Renace Upload"');
        http_response_code(401);
        echo json_encode(['error' => 'No autorizado']);
        exit;
    }

    if (!hash_equals($user, $_SERVER['PHP_AUTH_USER']) || !hash_equals($pass, $_SERVER['PHP_AUTH_PW'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales inválidas']);
        exit;
    }
}

require_basic_auth();

if (!is_dir($docsDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Directorio de destino no existe.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

if (!isset($_FILES['files'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibieron archivos.']);
    exit;
}

$files = $_FILES['files'];
$uploaded = [];
$errors = [];

for ($i = 0; $i < count($files['name']); $i++) {
    $name = basename($files['name'][$i]);
    $tmp = $files['tmp_name'][$i];
    $size = $files['size'][$i];
    $error = $files['error'][$i];

    if ($error !== UPLOAD_ERR_OK) {
        $errors[] = "$name: error al subir ($error)";
        continue;
    }

    if ($size > $maxFileSize) {
        $errors[] = "$name: supera el tamaño máximo de 400MB";
        continue;
    }

    $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', $name);
    $targetPath = $docsDir . DIRECTORY_SEPARATOR . $safeName;

    // Evitar sobrescribir: agregar sufijo si existe
    $counter = 1;
    $baseName = pathinfo($safeName, PATHINFO_FILENAME);
    $extPart = pathinfo($safeName, PATHINFO_EXTENSION);
    $extPart = $extPart ? '.' . $extPart : '';
    while (file_exists($targetPath)) {
        $targetPath = $docsDir . DIRECTORY_SEPARATOR . $baseName . '_' . $counter . $extPart;
        $counter++;
    }

    if (!move_uploaded_file($tmp, $targetPath)) {
        $errors[] = "$name: no se pudo guardar";
        continue;
    }

    $uploaded[] = basename($targetPath);
}

if (!empty($errors) && empty($uploaded)) {
    http_response_code(400);
    echo json_encode(['error' => implode('; ', $errors)]);
    exit;
}

echo json_encode([
    'message' => 'Proceso completado',
    'subidos' => $uploaded,
    'errores' => $errors,
]);
