<?php
/**
 * BarberApp - API AJAX em PHP
 */

require_once __DIR__ . '/db.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_slots':
        $date = $_GET['date'] ?? date('Y-m-d');
        $barberId = $_GET['barberId'] ?? null;
        $slots = getAvailableSlots($date, $barberId);
        echo json_encode(['success' => true, 'slots' => $slots]);
        break;

    case 'update_status':
        $user = getCurrentUser();
        if (!$user || !in_array($user['role'], ['admin', 'barbeiro'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Acesso não autorizado.']);
            exit;
        }

        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: $_POST;
        $appId = $data['id'] ?? '';
        $newStatus = $data['status'] ?? '';

        if (!$appId || !$newStatus) {
            http_response_code(400);
            echo json_encode(['error' => 'Parâmetros inválidos.']);
            exit;
        }

        $db = getDB();
        $updated = false;
        foreach ($db['appointments'] as &$app) {
            if ($app['id'] === $appId) {
                // Barbeiro só pode alterar seus próprios agendamentos (a menos que seja admin)
                if ($user['role'] === 'barbeiro' && !empty($user['barberId']) && $app['barberId'] !== $user['barberId']) {
                    http_response_code(403);
                    echo json_encode(['error' => 'Você não pode alterar agendamento de outro profissional.']);
                    exit;
                }
                $app['status'] = $newStatus;
                $updated = true;
                break;
            }
        }

        if ($updated) {
            saveDB($db);
            echo json_encode(['success' => true]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Agendamento não encontrado.']);
        }
        break;

    default:
        echo json_encode(['status' => 'online', 'time' => date('c')]);
        break;
}
