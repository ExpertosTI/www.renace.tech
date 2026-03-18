<?php
// Backend para recibir leads del chat conversacional y enviar correo
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'status' => 'error',
            'message' => 'Método no permitido'
        ]);
        exit;
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Payload inválido'
        ]);
        exit;
    }

    $nombre      = trim($data['nombre'] ?? '');
    $empresa     = trim($data['empresa'] ?? '');
    $rol         = trim($data['rol'] ?? '');
    $sector      = trim($data['sector'] ?? '');
    $tamano      = trim($data['tamano'] ?? '');
    $presupuesto = trim($data['presupuesto'] ?? '');
    $objetivo    = trim($data['objetivo'] ?? '');
    $urgencia    = trim($data['urgencia'] ?? '');
    $herramientas = trim($data['herramientas'] ?? '');
    $contacto    = trim($data['contacto'] ?? '');
    $page        = trim($data['page'] ?? '');
    $timestamp   = trim($data['timestamp'] ?? date('c'));

    // Evitar inyección de cabeceras en campos que van a Subject/Reply-To
    $lineBreakSearch  = ["\r", "\n"];
    $empresa   = str_replace($lineBreakSearch, ' ', $empresa);
    $contacto  = str_replace($lineBreakSearch, ' ', $contacto);

    if ($nombre === '' || $empresa === '' || $contacto === '') {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Faltan datos clave: nombre, empresa o contacto.'
        ]);
        exit;
    }

    $score = 0;

    if (stripos($tamano, '21-50') !== false || stripos($tamano, '51-200') !== false || stripos($tamano, '+200') !== false) {
        $score++;
    }

    if (stripos($presupuesto, '800') !== false || stripos($presupuesto, '+1500') !== false || stripos($presupuesto, '1500') !== false) {
        $score++;
    }

    if (stripos($urgencia, 'inmediato') !== false || stripos($urgencia, '30') !== false || stripos($urgencia, '60') !== false || stripos($urgencia, '90') !== false) {
        $score++;
    }

    if (stripos($objetivo, 'automat') !== false || stripos($objetivo, 'ia') !== false || stripos($objetivo, 'agente') !== false) {
        $score++;
    }

    $qualified = $score >= 2;

    if ($qualified) {
        $to      = 'info@renace.tech';
        $subject = '[RENACE Lead Chat] ' . ($empresa !== '' ? $empresa : 'Nuevo lead');

        $bodyLines = [
            'Nuevo lead captado desde el chat conversacional de RENACE:',
            '',
            'Nombre: ' . $nombre,
            'Empresa/Proyecto: ' . $empresa,
            'Rol: ' . $rol,
            'Sector: ' . $sector,
            'Tamaño: ' . $tamano,
            'Presupuesto: ' . $presupuesto,
            'Objetivo principal: ' . $objetivo,
            'Urgencia: ' . $urgencia,
            'Herramientas actuales: ' . $herramientas,
            'Datos de contacto (email / WhatsApp): ' . $contacto,
            '',
            'Página origen: ' . $page,
            'Timestamp: ' . $timestamp,
            'Score de calificación: ' . $score,
        ];

        $body = implode("\n", $bodyLines);

        $headers   = [];
        $fromEmail = 'no-reply@renace.tech';
        $headers[] = 'From: RENACE.TECH <' . $fromEmail . '>';

        $replyTo = filter_var($contacto, FILTER_VALIDATE_EMAIL);
        if ($replyTo) {
            $headers[] = 'Reply-To: ' . $replyTo;
        }

        $headers[] = 'Content-Type: text/plain; charset=utf-8';

        @mail($to, $subject, $body, implode("\r\n", $headers));
    }

    echo json_encode([
        'status'    => 'success',
        'qualified' => $qualified,
        'score'     => $score
    ]);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Error interno en el servidor',
        'code'    => $e->getCode()
    ]);
    exit;
}
