<?php
// RENACE Tech - Contact Form Handler
// Handles form submissions from the landing page and sends notifications/confirmations.

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Rate limiting básico por sesión
$secureCookie = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $secureCookie,
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();
$rateKey = 'contact_requests';
$maxRequests = 5;
$timeWindow = 300; // 5 minutos

if (!isset($_SESSION[$rateKey])) {
    $_SESSION[$rateKey] = [];
}

// Limpiar requests antiguos
$_SESSION[$rateKey] = array_filter($_SESSION[$rateKey], function($time) use ($timeWindow) {
    return $time > time() - $timeWindow;
});

if (count($_SESSION[$rateKey]) >= $maxRequests) {
    http_response_code(429);
    echo json_encode(["status" => "error", "message" => "Demasiadas solicitudes. Intenta en unos minutos."]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Registrar request para rate limiting
    $_SESSION[$rateKey][] = time();

    $allowedHosts = ['renace.tech', 'www.renace.tech'];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';

    if ($origin) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        if (!$originHost || !in_array($originHost, $allowedHosts, true)) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Origen no permitido."]);
            exit;
        }
    } elseif ($referer) {
        $refererHost = parse_url($referer, PHP_URL_HOST);
        if (!$refererHost || !in_array($refererHost, $allowedHosts, true)) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Origen no permitido."]);
            exit;
        }
    }
    
    // Collect and sanitize input data
    $name = strip_tags(trim($_POST["name"] ?? ''));
    $email = filter_var(trim($_POST["email"] ?? ''), FILTER_SANITIZE_EMAIL);
    $message = strip_tags(trim($_POST["message"] ?? ''));

    $website = isset($_POST["website"]) ? trim($_POST["website"]) : '';

    if ($website !== '') {
        http_response_code(200);
        echo json_encode(["status" => "success", "message" => "¡Mensaje enviado con éxito!"]);
        exit;
    }

    // Evitar inyección de cabeceras en From/Reply-To
    $pattern = "/[\r\n]+/";
    $name = preg_replace($pattern, ' ', $name);
    $email = preg_replace($pattern, '', $email);
    
    // Validación más estricta del email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || 
        !preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $email)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Email no válido."]);
        exit;
    }
    
    // Validación de longitud
    if (strlen($name) < 2 || strlen($name) > 100) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "El nombre debe tener entre 2 y 100 caracteres."]);
        exit;
    }
    
    if (strlen($message) < 10 || strlen($message) > 2000) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "El mensaje debe tener entre 10 y 2000 caracteres."]);
        exit;
    }

    // Validate input
    if (empty($name) || empty($message) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Por favor completa todos los campos correctamente."]);
        exit;
    }

    // Email Configuration
    $to = "info@renace.tech"; // Destination email
    $subject = "Nuevo mensaje de contacto - RENACE Tech: $name";
    
    // Email Content for Admin
    $email_content = "Nombre: $name\n";
    $email_content .= "Email: $email\n\n";
    $email_content .= "Mensaje:\n$message\n";

    // Headers for Admin Email
    $headers = "From: $name <$email>\r\n";
    $headers .= "Reply-To: $email\r\n";

    // Send Email to Admin
    // Note: This uses the server's default mail settings. For authenticated SMTP, use PHPMailer or server config.
    $admin_sent = mail($to, $subject, $email_content, $headers);

    // Confirmation Email to User
    $user_subject = "Hemos recibido tu mensaje - RENACE Tech";
    $user_message = "Hola $name,\n\n";
    $user_message .= "Gracias por contactar a RENACE AI Tech. Hemos recibido tu mensaje y nuestro equipo lo revisará a la brevedad.\n\n";
    $user_message .= "--------------------------------------------------\n";
    $user_message .= "Tu mensaje:\n$message\n";
    $user_message .= "--------------------------------------------------\n\n";
    $user_message .= "Saludos,\nEl equipo de RENACE AI Tech\nhttps://renace.tech";

    $user_headers = "From: RENACE AI Tech <info@renace.tech>\r\n";
    $user_headers .= "Reply-To: info@renace.tech\r\n";

    $user_sent = mail($email, $user_subject, $user_message, $user_headers);

    if ($admin_sent) {
        http_response_code(200);
        echo json_encode(["status" => "success", "message" => "¡Mensaje enviado con éxito!"]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Hubo un problema al enviar el mensaje. Intenta nuevamente."]);
    }

} else {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Método no permitido."]);
}
?>
