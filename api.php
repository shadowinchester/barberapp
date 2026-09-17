<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dataFile = __DIR__ . '/barber_data.json';
if (!file_exists($dataFile)) {
    $dataFile = __DIR__ . '/data/barber_data.json';
}

function respond($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function database($file) {
    if (!file_exists($file)) {
        respond(['error' => 'Arquivo barber_data.json não encontrado'], 500);
    }
    $data = json_decode(file_get_contents($file), true);
    if (!is_array($data)) {
        respond(['error' => 'Arquivo barber_data.json inválido'], 500);
    }
    foreach (['barbers', 'services', 'appointments', 'blockedSlots', 'users'] as $key) {
        if (!isset($data[$key]) || !is_array($data[$key])) $data[$key] = [];
    }
    if (!isset($data['settings']) || !is_array($data['settings'])) $data['settings'] = [];
    $today = date('Y-m-d');
    $statusChanged = false;
    foreach ($data['appointments'] as &$appointment) {
        if (($appointment['date'] ?? '') !== '' && $appointment['date'] < $today && !in_array($appointment['status'] ?? '', ['concluido', 'cancelado'], true)) {
            $appointment['status'] = 'concluido';
            $statusChanged = true;
        }
    }
    unset($appointment);
    if ($statusChanged) saveDatabase($file, $data);
    return $data;
}

function saveDatabase($file, $data) {
    if (file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) {
        respond(['error' => 'Não foi possível gravar barber_data.json. Verifique a permissão de escrita.'], 500);
    }
}

function input() {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    return is_array($json) ? $json : $_POST;
}

function safeUser($user) {
    unset($user['password']);
    return $user;
}

function idFromRoute($parts) {
    return isset($parts[1]) ? urldecode($parts[1]) : '';
}

$db = database($dataFile);
$method = $_SERVER['REQUEST_METHOD'];
$route = trim($_GET['route'] ?? '', '/');
$parts = $route === '' ? [] : explode('/', $route);
$body = input();

if ($route === 'data' && $method === 'GET') respond($db);
if ($route === 'raw-json' && $method === 'GET') {
    header('Content-Disposition: attachment; filename="barber_data.json"');
    respond($db);
}

if ($route === 'auth/login' && $method === 'POST') {
    $role = $body['role'] ?? '';
    $credential = strtolower(trim($body['credential'] ?? ''));
    $password = trim($body['password'] ?? '');
    $digits = preg_replace('/\D/', '', $credential);
    $found = null;
    foreach ($db['users'] as $user) {
        if (($user['role'] ?? '') !== $role) continue;
        $login = strtolower(trim($user['login'] ?? ''));
        $phone = preg_replace('/\D/', '', $user['phone'] ?? '');
        if (($login && $login === $credential) || ($digits && strlen($digits) >= 8 && strpos($phone, $digits) !== false) || (strlen($credential) > 2 && stripos($user['name'] ?? '', $credential) !== false)) {
            $found = $user;
            break;
        }
    }
    if (!$found) respond(['error' => 'Usuário não encontrado.'], 401);
    if ($password && !empty($found['password']) && $found['password'] !== $password) respond(['error' => 'Senha incorreta.'], 401);
    respond(['success' => true, 'user' => safeUser($found)]);
}

if ($route === 'auth/register-client' && $method === 'POST') {
    $name = trim($body['name'] ?? '');
    $phone = trim($body['phone'] ?? '');
    if ($name === '' || $phone === '') respond(['error' => 'Nome e WhatsApp são obrigatórios'], 400);
    $digits = preg_replace('/\D/', '', $phone);
    foreach ($db['users'] as $user) {
        if (($user['role'] ?? '') === 'cliente' && preg_replace('/\D/', '', $user['phone'] ?? '') === $digits) {
            respond(['success' => true, 'user' => safeUser($user)]);
        }
    }
    $newUser = [
        'id' => 'u-c-' . uniqid(), 'name' => $name, 'phone' => $phone,
        'login' => strtolower(explode(' ', $name)[0]) . rand(10, 99),
        'password' => trim($body['password'] ?? '123') ?: '123',
        'role' => 'cliente', 'planType' => 'standard', 'monthlyCredits' => 0, 'monthlyDays' => [1, 2, 3, 4, 5, 6], 'expirationDate' => null, 'createdAt' => date('c')
    ];
    $db['users'][] = $newUser;
    saveDatabase($dataFile, $db);
    respond(['success' => true, 'user' => safeUser($newUser)], 201);
}

if ($route === 'users' && $method === 'GET') {
    respond(array_map('safeUser', $db['users']));
}

if (($parts[0] ?? '') === 'users' && count($parts) === 2) {
    $id = idFromRoute($parts);
    $index = array_search($id, array_column($db['users'], 'id'), true);
    if ($index === false) respond(['error' => 'Usuário não encontrado'], 404);
    if ($method === 'PUT' || $method === 'PATCH') {
        foreach (['name', 'phone', 'planType', 'monthlyCredits', 'monthlyDays', 'expirationDate'] as $key) {
            if (array_key_exists($key, $body)) $db['users'][$index][$key] = $body[$key];
        }
        $db['users'][$index]['planType'] = ($db['users'][$index]['planType'] ?? 'standard') === 'monthly' ? 'monthly' : 'standard';
        $db['users'][$index]['monthlyCredits'] = max(0, (int)($db['users'][$index]['monthlyCredits'] ?? 0));
        $db['users'][$index]['monthlyDays'] = array_values(array_unique(array_map('intval', $db['users'][$index]['monthlyDays'] ?? [1, 2, 3, 4, 5, 6])));
        if (!empty($db['users'][$index]['expirationDate']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $db['users'][$index]['expirationDate'])) {
            $db['users'][$index]['expirationDate'] = null;
        }
        saveDatabase($dataFile, $db);
        respond(['success' => true, 'user' => safeUser($db['users'][$index])]);
    }
}

if (($parts[0] ?? '') === 'barbers') {
    $id = idFromRoute($parts);
    if ($method === 'GET' && count($parts) === 1) respond($db['barbers']);
    if ($method === 'POST' && count($parts) === 1) {
        if (empty($body['name']) || empty($body['phone'])) respond(['error' => 'Nome e telefone são obrigatórios'], 400);
        $id = 'b-' . uniqid();
        $login = strtolower(trim($body['login'] ?? '')) ?: strtolower(explode(' ', trim($body['name']))[0]) . rand(10, 99);
        $barber = ['id' => $id, 'name' => trim($body['name']), 'specialty' => trim($body['specialty'] ?? ''), 'phone' => trim($body['phone']), 'avatar' => trim($body['avatar'] ?? ''), 'login' => $login, 'active' => true, 'availableDays' => [1, 2, 3, 4, 5, 6]];
        $user = ['id' => 'u-' . $id, 'name' => $barber['name'], 'phone' => $barber['phone'], 'login' => $login, 'password' => trim($body['password'] ?? '123') ?: '123', 'role' => 'barbeiro', 'barberId' => $id, 'createdAt' => date('c')];
        $db['barbers'][] = $barber; $db['users'][] = $user; saveDatabase($dataFile, $db);
        respond(['success' => true, 'barber' => $barber, 'user' => safeUser($user)], 201);
    }
    $index = array_search($id, array_column($db['barbers'], 'id'), true);
    if ($index === false) respond(['error' => 'Barbeiro não encontrado'], 404);
    if ($method === 'DELETE') {
        array_splice($db['barbers'], $index, 1);
        $db['users'] = array_values(array_filter($db['users'], function ($user) use ($id) { return ($user['barberId'] ?? '') !== $id; }));
        saveDatabase($dataFile, $db); respond(['success' => true]);
    }
    if ($method === 'PUT') {
        foreach (['name', 'specialty', 'phone', 'avatar', 'active', 'availableDays'] as $key) if (array_key_exists($key, $body)) $db['barbers'][$index][$key] = $body[$key];
        if (isset($body['login'])) $db['barbers'][$index]['login'] = strtolower(trim($body['login']));
        foreach ($db['users'] as &$user) if (($user['barberId'] ?? '') === $id) { foreach (['name', 'phone'] as $key) $user[$key] = $db['barbers'][$index][$key]; if (!empty($body['password'])) $user['password'] = $body['password']; if (isset($body['login'])) $user['login'] = $db['barbers'][$index]['login']; }
        saveDatabase($dataFile, $db); respond(['success' => true, 'barber' => $db['barbers'][$index]]);
    }
}

if (($parts[0] ?? '') === 'appointments') {
    $id = idFromRoute($parts);
    if ($method === 'GET' && count($parts) === 1) {
        $appointments = $db['appointments'];
        $barberId = $_GET['barberId'] ?? '';
        $month = $_GET['month'] ?? '';
        if ($barberId !== '') $appointments = array_values(array_filter($appointments, fn($item) => ($item['barberId'] ?? '') === $barberId));
        if ($month !== '') $appointments = array_values(array_filter($appointments, fn($item) => substr(($item['date'] ?? ''), 0, 7) === $month));
        usort($appointments, fn($a, $b) => (($a['date'] ?? '') . ' ' . ($a['time'] ?? '')) <=> (($b['date'] ?? '') . ' ' . ($b['time'] ?? '')));
        respond($appointments);
    }
    if ($method === 'POST' && count($parts) === 1) {
        foreach (['clientName', 'clientPhone', 'serviceId', 'barberId', 'date', 'time'] as $key) if (empty($body[$key])) respond(['error' => 'Todos os campos obrigatórios devem ser preenchidos'], 400);
        $clientDigits = preg_replace('/\D/', '', $body['clientPhone']);
        $clientUser = null;
        foreach ($db['users'] as $user) {
            if (($user['role'] ?? '') === 'cliente' && preg_replace('/\D/', '', $user['phone'] ?? '') === $clientDigits) { $clientUser = $user; break; }
        }
        $monthlyCredit = false;
        if (($clientUser['planType'] ?? 'standard') === 'monthly') {
            $expirationDate = $clientUser['expirationDate'] ?? null;
            if (!empty($expirationDate) && $body['date'] > $expirationDate) respond(['error' => 'O plano mensal deste cliente expirou.'], 422);
            $allowedDays = array_map('intval', $clientUser['monthlyDays'] ?? [1, 2, 3, 4, 5, 6]);
            $dateObject = DateTime::createFromFormat('!Y-m-d', $body['date']);
            if (!$dateObject) respond(['error' => 'Data de agendamento inválida'], 400);
            $weekday = (int)$dateObject->format('N');
            if (!in_array($weekday, $allowedDays, true)) respond(['error' => 'Este mensalista só pode agendar nos dias configurados para o plano.'], 422);
            $monthPrefix = substr($body['date'], 0, 7);
            $usedCredits = 0;
            foreach ($db['appointments'] as $appointment) {
                if (($appointment['clientUserId'] ?? '') === ($clientUser['id'] ?? '') && substr($appointment['date'] ?? '', 0, 7) === $monthPrefix && ($appointment['status'] ?? '') !== 'cancelado' && !empty($appointment['monthlyCredit'])) $usedCredits++;
            }
            if ($usedCredits >= (int)($clientUser['monthlyCredits'] ?? 0)) respond(['error' => 'Este mensalista não possui cortes disponíveis neste mês.'], 422);
            $monthlyCredit = true;
        }
        $service = null; foreach ($db['services'] as $item) if ($item['id'] === $body['serviceId']) $service = $item;
        $barber = null; foreach ($db['barbers'] as $item) if ($item['id'] === $body['barberId']) $barber = $item;
        $appointment = ['id' => 'app-' . uniqid(), 'clientUserId' => $clientUser['id'] ?? ($body['clientUserId'] ?? ''), 'monthlyCredit' => $monthlyCredit, 'clientName' => trim($body['clientName']), 'clientPhone' => trim($body['clientPhone']), 'serviceId' => $body['serviceId'], 'serviceName' => $service['name'] ?? 'Serviço', 'servicePrice' => $service['price'] ?? 0, 'serviceDuration' => $service['duration'] ?? 30, 'barberId' => $body['barberId'], 'barberName' => $barber['name'] ?? 'Profissional', 'date' => $body['date'], 'time' => $body['time'], 'status' => !empty($body['isFitIn']) ? 'pendente' : 'confirmado', 'notes' => $body['notes'] ?? '', 'isFitIn' => !empty($body['isFitIn']), 'preferredTime' => $body['preferredTime'] ?? '', 'createdAt' => date('c')];
        $db['appointments'][] = $appointment; saveDatabase($dataFile, $db); respond(['success' => true, 'appointment' => $appointment], 201);
    }
    $index = array_search($id, array_column($db['appointments'], 'id'), true);
    if ($index === false) respond(['error' => 'Agendamento não encontrado'], 404);
    if ($method === 'PUT' && count($parts) === 2) {
        if (array_key_exists('date', $body)) {
            $dateObject = DateTime::createFromFormat('!Y-m-d', $body['date']);
            if (!$dateObject || $dateObject->format('Y-m-d') !== $body['date']) respond(['error' => 'Data inválida'], 400);
            $db['appointments'][$index]['date'] = $body['date'];
        }
        if (array_key_exists('time', $body)) {
            if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $body['time'])) respond(['error' => 'Horário inválido'], 400);
            $db['appointments'][$index]['time'] = $body['time'];
        }
        saveDatabase($dataFile, $db);
        respond(['success' => true, 'appointment' => $db['appointments'][$index]]);
    }
    if (count($parts) === 3 && $parts[2] === 'status' && ($method === 'PATCH' || $method === 'POST')) { $db['appointments'][$index]['status'] = $body['status'] ?? 'pendente'; saveDatabase($dataFile, $db); respond(['success' => true, 'appointment' => $db['appointments'][$index]]); }
    if ($method === 'DELETE') { array_splice($db['appointments'], $index, 1); saveDatabase($dataFile, $db); respond(['success' => true]); }
}

if (($parts[0] ?? '') === 'services') {
    $id = idFromRoute($parts);
    if ($method === 'POST' && count($parts) === 1) {
        if (empty($body['name']) || !isset($body['price'])) respond(['error' => 'Nome e preço são obrigatórios'], 400);
        $index = -1; foreach ($db['services'] as $key => $item) if (($body['id'] ?? '') !== '' && $item['id'] === $body['id']) $index = $key;
        $service = ['id' => $body['id'] ?? 's-' . uniqid(), 'name' => $body['name'], 'description' => $body['description'] ?? '', 'duration' => (int)($body['duration'] ?? 30), 'price' => (float)$body['price'], 'category' => $body['category'] ?? 'cabelo', 'active' => $body['active'] ?? true];
        if ($index >= 0) $db['services'][$index] = array_merge($db['services'][$index], $service); else $db['services'][] = $service;
        saveDatabase($dataFile, $db); respond(['success' => true, 'service' => $service]);
    }
    if ($method === 'DELETE') { $db['services'] = array_values(array_filter($db['services'], function ($item) use ($id) { return $item['id'] !== $id; })); saveDatabase($dataFile, $db); respond(['success' => true]); }
}

if (($parts[0] ?? '') === 'blocked-slots') {
    $id = idFromRoute($parts);
    if ($method === 'POST' && count($parts) === 1) { $slot = ['id' => 'block-' . uniqid(), 'barberId' => $body['barberId'] ?? 'all', 'date' => $body['date'] ?? '', 'time' => $body['time'] ?? '', 'reason' => $body['reason'] ?? 'Bloqueio administrativo']; $db['blockedSlots'][] = $slot; saveDatabase($dataFile, $db); respond(['success' => true, 'blockedSlot' => $slot], 201); }
    if ($method === 'DELETE') { $db['blockedSlots'] = array_values(array_filter($db['blockedSlots'], function ($item) use ($id) { return $item['id'] !== $id; })); saveDatabase($dataFile, $db); respond(['success' => true]); }
}

if ($route === 'settings' && $method === 'POST') { $db['settings'] = array_merge($db['settings'], $body); saveDatabase($dataFile, $db); respond(['success' => true, 'settings' => $db['settings']]); }
respond(['error' => 'Rota não encontrada'], 404);
?>
