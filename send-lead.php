<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

function respond(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

// Простая защита от отправки формы с чужого сайта.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && $host !== '') {
    $originHost = parse_url($origin, PHP_URL_HOST);
    if (is_string($originHost) && strcasecmp($originHost, preg_replace('/:\d+$/', '', $host)) !== 0) {
        respond(403, ['ok' => false, 'error' => 'origin_not_allowed']);
    }
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 20000) {
    respond(400, ['ok' => false, 'error' => 'invalid_body']);
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    respond(400, ['ok' => false, 'error' => 'invalid_json']);
}

// Honeypot: обычный посетитель это поле не видит.
if (trim((string)($data['company'] ?? '')) !== '') {
    respond(200, ['ok' => true]);
}

$clean = static function (mixed $value, int $max = 500): string {
    $text = trim(strip_tags((string)$value));
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
    return mb_substr($text, 0, $max);
};

$name = $clean($data['name'] ?? '', 100);
$phone = $clean($data['phone'] ?? '', 40);
$interest = $clean($data['interest'] ?? '', 120);
$budget = $clean($data['budget'] ?? '', 120);
$source = $clean($data['source'] ?? 'Сайт Ростовское море', 120);
$page = $clean($data['page'] ?? '', 500);
$referrer = $clean($data['referrer'] ?? '', 500);
$utmSource = $clean($data['utm_source'] ?? '', 120);
$utmCampaign = $clean($data['utm_campaign'] ?? '', 160);
$utmContent = $clean($data['utm_content'] ?? '', 160);
$utmTerm = $clean($data['utm_term'] ?? '', 160);

if ($name === '' || $phone === '' || $interest === '') {
    respond(422, ['ok' => false, 'error' => 'required_fields']);
}

if (!preg_match('/^[0-9+()\-\s]{7,40}$/', $phone)) {
    respond(422, ['ok' => false, 'error' => 'invalid_phone']);
}

// Не чаще одной заявки с IP за 12 секунд.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/rostovskoe_more_' . hash('sha256', $ip) . '.rate';
$now = time();
$last = is_file($rateFile) ? (int)file_get_contents($rateFile) : 0;
if ($last > 0 && ($now - $last) < 12) {
    respond(429, ['ok' => false, 'error' => 'rate_limited']);
}
@file_put_contents($rateFile, (string)$now, LOCK_EX);

$configFile = __DIR__ . '/max-config.php';
if (!is_file($configFile)) {
    respond(503, ['ok' => false, 'error' => 'max_not_configured']);
}
$config = require $configFile;
$token = trim((string)($config['token'] ?? ''));
$chatId = trim((string)($config['chat_id'] ?? ''));
if ($token === '' || $chatId === '') {
    respond(503, ['ok' => false, 'error' => 'max_not_configured']);
}

$lines = [
    '🏠 Новая заявка с сайта',
    '',
    'Имя: ' . $name,
    'Телефон: ' . $phone,
    'Интересует: ' . $interest,
    'Бюджет: ' . ($budget !== '' ? $budget : 'не указан'),
    'Источник: ' . $source,
];
if ($utmSource !== '') $lines[] = 'UTM source: ' . $utmSource;
if ($utmCampaign !== '') $lines[] = 'UTM campaign: ' . $utmCampaign;
if ($utmContent !== '') $lines[] = 'UTM content: ' . $utmContent;
if ($utmTerm !== '') $lines[] = 'UTM term: ' . $utmTerm;
if ($page !== '') $lines[] = 'Страница: ' . $page;
if ($referrer !== '') $lines[] = 'Переход: ' . $referrer;
$lines[] = 'Время: ' . date('d.m.Y H:i:s');

$payload = json_encode([
    'text' => implode("\n", $lines),
    'notify' => true,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$endpoint = 'https://platform-api2.max.ru/messages?chat_id=' . rawurlencode($chatId);
$ch = curl_init($endpoint);
if ($ch === false) {
    respond(500, ['ok' => false, 'error' => 'curl_init_failed']);
}
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        'Authorization: ' . $token,
        'Content-Type: application/json',
        'Accept: application/json',
    ],
    CURLOPT_POSTFIELDS => $payload,
]);
$responseBody = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($responseBody === false || $status < 200 || $status >= 300) {
    error_log('MAX lead error: HTTP ' . $status . '; ' . $error . '; ' . (string)$responseBody);
    respond(502, ['ok' => false, 'error' => 'max_delivery_failed']);
}

respond(200, ['ok' => true]);
