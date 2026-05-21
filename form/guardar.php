<?php
// Configuración básica y utilidades
header('Content-Type: application/json');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin && parse_url($origin, PHP_URL_HOST) === $host) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Nombre del archivo donde se guarda
$file = 'data.json';

function require_basic_auth(): void
{
    $user = getenv('RENACE_BASIC_USER');
    $pass = getenv('RENACE_BASIC_PASS');

    if (!$user || !$pass) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Auth no configurada']);
        exit;
    }

    if (!isset($_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW'])) {
        header('WWW-Authenticate: Basic realm="Renace Form"');
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'No autorizado']);
        exit;
    }

    if (!hash_equals($user, $_SERVER['PHP_AUTH_USER']) || !hash_equals($pass, $_SERVER['PHP_AUTH_PW'])) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Credenciales inválidas']);
        exit;
    }
}

function sanitize_text($value): string
{
    if (!is_string($value)) return '';
    return htmlspecialchars(trim($value), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8', false);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Solo permitimos POST autenticado
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Método no permitido']);
    exit;
}

require_basic_auth();

// Obtener el JSON del body
$input = file_get_contents('php://input');
$new_data = json_decode($input, true);

if (!$new_data || !is_array($new_data)) {
    echo json_encode(['status' => 'error', 'message' => 'JSON inválido']);
    exit;
}

// Obtener los datos actuales del archivo
$current_data = [];
if (file_exists($file)) {
    $current_content = file_get_contents($file);
    $current_data = json_decode($current_content, true);
    if (!$current_data) {
        $current_data = [];
    }
}

$rawEvaluator = $new_data['evaluator'] ?? [];
$new_entry = [
    'id' => uniqid(),
    'timestamp' => date('Y-m-d H:i:s'),
    'evaluator' => [
        'name' => sanitize_text($rawEvaluator['name'] ?? 'Anónimo'),
        'role' => sanitize_text($rawEvaluator['role'] ?? 'Usuario'),
    ],
    'winner' => sanitize_text($new_data['winner'] ?? 'N/A'),
    'comments' => sanitize_text($new_data['comments'] ?? ''),
    'scores' => is_array($new_data['scores'] ?? null) ? $new_data['scores'] : [],
    'ip' => $_SERVER['REMOTE_ADDR'],
    'user_agent' => sanitize_text($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'),
];

// Añadir al array
$current_data[] = $new_entry;

// Guardar de nuevo en el archivo
if (@file_put_contents($file, json_encode($current_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Datos guardados correctamente',
        'entry_id' => $new_entry['id']
    ]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'No se pudo escribir el archivo']);
}
?>