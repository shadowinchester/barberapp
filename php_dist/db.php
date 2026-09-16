<?php
/**
 * BarberApp - Sistema de Barbearia 100% PHP Puro com Dados em JSON
 * Compatível com qualquer servidor Apache/Nginx e hospedagens gratuitas (InfinityFree, cPanel, etc.)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Caminho absoluto para a base de dados em JSON
define('DATA_FILE', __DIR__ . '/data/barber_data.json');

/**
 * Lê o banco de dados JSON com fallback
 */
function getDB() {
    if (!file_exists(DATA_FILE)) {
        if (!file_exists(dirname(DATA_FILE))) {
            mkdir(dirname(DATA_FILE), 0777, true);
        }
        $default = [
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
        saveDB($default);
        return $default;
    }

    $json = file_get_contents(DATA_FILE);
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

/**
 * Salva os dados no arquivo JSON com trava segura de concorrência (flock)
 */
function saveDB($data) {
    if (!file_exists(dirname(DATA_FILE))) {
        mkdir(dirname(DATA_FILE), 0777, true);
    }
    $fp = fopen(DATA_FILE, 'c+');
    if ($fp) {
        if (flock($fp, LOCK_EX)) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
        return true;
    }
    return file_put_contents(DATA_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false;
}

/**
 * Retorna o usuário logado atualmente ou null
 */
function getCurrentUser() {
    return isset($_SESSION['user']) ? $_SESSION['user'] : null;
}

/**
 * Verifica permissão por role
 */
function requireAuth($role = null) {
    $user = getCurrentUser();
    if (!$user) {
        header("Location: login.php");
        exit;
    }
    if ($role && $user['role'] !== $role && $user['role'] !== 'admin') {
        header("Location: index.php");
        exit;
    }
    return $user;
}

/**
 * Gera os horários livres para uma data e barbeiro específicos
 */
function getAvailableSlots($date, $barberId = null) {
    $db = getDB();
    $settings = $db['settings'] ?? [];
    $openTime = $settings['openTime'] ?? '08:00';
    $closeTime = $settings['closeTime'] ?? '19:30';
    $interval = intval($settings['slotInterval'] ?? 30);
    $lunchStart = $settings['lunchStart'] ?? '12:00';
    $lunchEnd = $settings['lunchEnd'] ?? '13:00';

    // Gera lista de todos os horários do dia
    $slots = [];
    $current = strtotime($openTime);
    $end = strtotime($closeTime);
    $lunchS = strtotime($lunchStart);
    $lunchE = strtotime($lunchEnd);

    while ($current < $end) {
        // Pula intervalo de almoço
        if (!($current >= $lunchS && $current < $lunchE)) {
            $slots[] = date('H:i', $current);
        }
        $current = strtotime("+$interval minutes", $current);
    }

    // Busca agendamentos ocupados no dia
    $appointments = $db['appointments'] ?? [];
    $occupied = [];
    foreach ($appointments as $app) {
        if ($app['date'] === $date && ($app['status'] ?? 'confirmado') !== 'cancelado') {
            if (!$barberId || empty($app['barberId']) || $app['barberId'] === $barberId) {
                $occupied[$app['time']] = true;
            }
        }
    }

    // Busca horários bloqueados
    $blocked = $db['blockedSlots'] ?? [];
    foreach ($blocked as $b) {
        if ($b['date'] === $date) {
            if (!$barberId || empty($b['barberId']) || $b['barberId'] === $barberId) {
                $occupied[$b['time']] = true;
            }
        }
    }

    $result = [];
    foreach ($slots as $s) {
        $result[] = [
            'time' => $s,
            'available' => !isset($occupied[$s])
        ];
    }
    return $result;
}
