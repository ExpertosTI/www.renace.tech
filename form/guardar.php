<?php
// Configuración básica
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Nombre del archivo donde se guarda
$file = 'data.json';

// Verificar si hay datos
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Obtener el JSON del body
    $input = file_get_contents('php://input');
    $new_data = json_decode($input, true);

    if (!$new_data) {
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

    // Crear el nuevo registro con datos completos
    $new_entry = [
        'id' => uniqid(),
        'timestamp' => date('Y-m-d H:i:s'),
        'evaluator' => $new_data['evaluator'] ?? ['name' => 'Anónimo', 'role' => 'Usuario'],
        'winner' => $new_data['winner'] ?? 'N/A',
        'comments' => $new_data['comments'] ?? '',
        'scores' => $new_data['scores'] ?? [],
        'ip' => $_SERVER['REMOTE_ADDR'],
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
    ];

    // Añadir al array
    $current_data[] = $new_entry;

    // Guardar de nuevo en el archivo
    // Usamos @ para que PHP no escupa HTML si falla, y manejamos el error manualmente
    if (@file_put_contents($file, json_encode($current_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Datos guardados correctamente',
            'entry_id' => $new_entry['id']
        ]);
    } else {
        // Fallo de escritura. Intentamos diagnosticar.
        http_response_code(500);
        $error = "Desconocido";

        if (!is_writable($file)) {
            // Intento desesperado de arreglar permisos desde PHP (rara vez funciona si no es owner)
            @chmod($file, 0666);
            if (is_writable($file)) {
                $error = "Fixed permissions, try again";
            } else {
                $error = "Permission Denied (chmod 666 failed)";
            }
        }

        echo json_encode(['status' => 'error', 'message' => 'No se pudo escribir el archivo: ' . $error]);
    }

} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Permitir ver los resultados
    if (file_exists($file)) {
        $data = file_get_contents($file);
        echo $data;
    } else {
        echo json_encode([]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Método inválido']);
}
?>