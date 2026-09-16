<?php
/**
 * BarberApp - API Backend em PHP com persistência em JSON
 * Permite hospedar facilmente em qualquer hospedagem compartilhada (cPanel, Hostinger, Locaweb, etc.)
 * ou VPS com Apache/Nginx e PHP 7.4+.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Caminho do arquivo JSON
$dataFile = __DIR__ . '/../data/barber_data.json';
if (!file_exists(dirname($dataFile))) {
    mkdir(dirname($dataFile), 0777, true);
}

function getDatabase($file) {
    if (!file_exists($file)) {
        return [
            "settings" => [
                "shopName" => "Barbearia Dom navalha",
                "address" => "Rua das Palmeiras, 342 - Centro",
                "phone" => "(11) 98765-4321",
                "openTime" => "08:00",
                "closeTime" => "19:30",
                "slotInterval" => 30,
                "lunchStart" => "12:00",
                "lunchEnd" => "13:00",
                "workingDays" => [1, 2, 3, 4, 5, 6]
            ],
            "barbers" => [],
            "services" => [],
            "appointments" => [],
            "blockedSlots" => [],
            "users" => []
        ];
    }
    $content = file_get_contents($file);
    return json_decode($content, true) ?: [];
}

function saveDatabase($file, $data) {
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$db = getDatabase($dataFile);
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?: $_POST;

switch ($action) {
    // Retorna todo o banco de dados
    case 'get_data':
        echo json_encode($db);
        break;

    // Autenticação / Login
    case 'login':
        if ($method === 'POST') {
            $role = $input['role'] ?? '';
            $credential = trim(strtolower($input['credential'] ?? ''));
            $password = trim($input['password'] ?? '');
            $cleanDigits = preg_replace('/\D/', '', $credential);

            $users = $db['users'] ?? [];
            $matchedUser = null;

            foreach ($users as $u) {
                if ($u['role'] !== $role && !($role === 'admin' && $u['role'] === 'admin')) {
                    continue;
                }

                $userLogin = strtolower(trim($u['login'] ?? ''));
                $userPhoneDigits = preg_replace('/\D/', '', $u['phone'] ?? '');

                if ($userLogin && $userLogin === $credential) {
                    $matchedUser = $u;
                    break;
                }
                if (strlen($cleanDigits) >= 8 && strpos($userPhoneDigits, $cleanDigits) !== false) {
                    $matchedUser = $u;
                    break;
                }
                if (strlen($credential) > 2 && stripos($u['name'], $credential) !== false) {
                    $matchedUser = $u;
                    break;
                }
            }

            if (!$matchedUser) {
                http_response_code(401);
                echo json_encode(['error' => 'Usuário não encontrado.']);
                exit;
            }

            if ($password && !empty($matchedUser['password']) && $matchedUser['password'] !== $password) {
                http_response_code(401);
                echo json_encode(['error' => 'Senha incorreta.']);
                exit;
            }

            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $matchedUser['id'],
                    'name' => $matchedUser['name'],
                    'phone' => $matchedUser['phone'],
                    'login' => $matchedUser['login'] ?? '',
                    'role' => $matchedUser['role'],
                    'barberId' => $matchedUser['barberId'] ?? null
                ]
            ]);
        }
        break;

    // Cadastro rápido de cliente ("Novo por aqui?")
    case 'register_client':
        if ($method === 'POST') {
            $name = trim($input['name'] ?? '');
            $phone = trim($input['phone'] ?? '');
            $password = trim($input['password'] ?? '123');

            if (empty($name) || empty($phone)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nome e WhatsApp são obrigatórios']);
                exit;
            }

            $newUser = [
                'id' => 'u-c-' . time(),
                'name' => $name,
                'phone' => $phone,
                'login' => strtolower(explode(' ', $name)[0]) . rand(10, 99),
                'password' => $password ?: '123',
                'role' => 'cliente',
                'createdAt' => date('c')
            ];

            $db['users'][] = $newUser;
            saveDatabase($dataFile, $db);

            echo json_encode(['success' => true, 'user' => $newUser]);
        }
        break;

    // Agendamentos
    case 'appointments':
        if ($method === 'GET') {
            $appointments = $db['appointments'] ?? [];
            if (!empty($_GET['date'])) {
                $appointments = array_filter($appointments, function($a) {
                    return $a['date'] === $_GET['date'];
                });
            }
            echo json_encode(array_values($appointments));
        } elseif ($method === 'POST') {
            if (empty($input['clientName']) || empty($input['clientPhone']) || empty($input['date']) || empty($input['time'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Dados incompletos para agendamento']);
                exit;
            }

            $newAppointment = [
                'id' => 'app-' . uniqid(),
                'clientName' => trim($input['clientName']),
                'clientPhone' => trim($input['clientPhone']),
                'serviceId' => $input['serviceId'] ?? '',
                'serviceName' => $input['serviceName'] ?? 'Serviço',
                'servicePrice' => floatval($input['servicePrice'] ?? 0),
                'serviceDuration' => intval($input['serviceDuration'] ?? 30),
                'barberId' => $input['barberId'] ?? '',
                'barberName' => $input['barberName'] ?? 'Barbeiro',
                'date' => $input['date'],
                'time' => $input['time'],
                'status' => 'confirmado',
                'notes' => $input['notes'] ?? '',
                'createdAt' => date('c')
            ];

            $db['appointments'][] = $newAppointment;
            saveDatabase($dataFile, $db);
            http_response_code(201);
            echo json_encode(['success' => true, 'appointment' => $newAppointment]);
        }
        break;

    // Atualizar status do agendamento
    case 'update_status':
        if ($method === 'POST' || $method === 'PATCH') {
            $id = $input['id'] ?? '';
            $status = $input['status'] ?? '';
            $updated = false;
            foreach ($db['appointments'] as &$app) {
                if ($app['id'] === $id) {
                    $app['status'] = $status;
                    $updated = true;
                    break;
                }
            }
            if ($updated) {
                saveDatabase($dataFile, $db);
                echo json_encode(['success' => true]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Agendamento não encontrado']);
            }
        }
        break;

    default:
        echo json_encode([
            'status' => 'online',
            'app' => 'BarberApp PHP API',
            'dataFile' => $dataFile
        ]);
        break;
}
?>
