<?php
/**
 * BarberApp - Sistema de Barbearia 100% PHP Puro com Dados em JSON
 * Compatível com qualquer servidor Apache/Nginx e hospedagens gratuitas (InfinityFree, cPanel, etc.)
 */

// Evita tela branca exibindo qualquer erro ou aviso do PHP caso ocorra
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

// Caminho absoluto para a base de dados em JSON (no mesmo diretorio, sem pastas)
define('DATA_FILE', __DIR__ . '/barber_data.json');

/**
 * Le o banco de dados JSON com fallback
 */
function getDB() {
    if (!file_exists(DATA_FILE)) {
        $default = [
            "settings" => [
                "shopName" => "Barbearia Dom Navalha",
                "address" => "Rua das Palmeiras, 342 - Centro",
                "phone" => "(11) 98765-4321",
                "openTime" => "08:00",
                "closeTime" => "19:30",
                "slotInterval" => 30,
                "lunchStart" => "12:00",
                "lunchEnd" => "13:00",
                "workingDays" => [1, 2, 3, 4, 5, 6]
            ],
            "barbers" => [
                [
                    "id" => "b1",
                    "name" => "Rodrigo 'Navalha' Silva",
                    "specialty" => "Degradê, Barboterapia e Desenhos",
                    "phone" => "(11) 99111-2233",
                    "avatar" => "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
                    "login" => "rodrigo",
                    "active" => true
                ],
                [
                    "id" => "b2",
                    "name" => "Marcos Andrade",
                    "specialty" => "Cortes Clássicos, Tesoura e Barba Italiana",
                    "phone" => "(11) 99222-3344",
                    "avatar" => "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
                    "login" => "marcos",
                    "active" => true
                ],
                [
                    "id" => "b3",
                    "name" => "Gabriel Santos",
                    "specialty" => "Coloração, Platinado e Barba Alinhada",
                    "phone" => "(11) 99333-4455",
                    "avatar" => "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
                    "login" => "gabriel",
                    "active" => true
                ]
            ],
            "services" => [
                [
                    "id" => "s1",
                    "name" => "Corte Degradê / Fade",
                    "description" => "Corte navalhado com acabamento perfeito na lâmina e higienização capilar.",
                    "duration" => 35,
                    "price" => 45,
                    "category" => "cabelo",
                    "active" => true
                ],
                [
                    "id" => "s2",
                    "name" => "Barba Terapia Completa",
                    "description" => "Toalha quente, óleos essenciais, hidratação profunda e alinhamento com navalha.",
                    "duration" => 30,
                    "price" => 38,
                    "category" => "barba",
                    "active" => true
                ],
                [
                    "id" => "s3",
                    "name" => "Combo Corte + Barba",
                    "description" => "O combo mais pedido! Corte completo à sua escolha e barboterapia relaxante.",
                    "duration" => 60,
                    "price" => 75,
                    "category" => "combo",
                    "active" => true
                ],
                [
                    "id" => "s4",
                    "name" => "Corte Tradicional / Tesoura",
                    "description" => "Corte social tradicional trabalhado na tesoura e acabamento impecável.",
                    "duration" => 30,
                    "price" => 40,
                    "category" => "cabelo",
                    "active" => true
                ],
                [
                    "id" => "s5",
                    "name" => "Sobrancelha na Navalha",
                    "description" => "Desenho e limpeza harmônica dos pelos com navalha descartável.",
                    "duration" => 15,
                    "price" => 18,
                    "category" => "extra",
                    "active" => true
                ]
            ],
            "appointments" => [],
            "blockedSlots" => [],
            "users" => [
                [
                    "id" => "u_admin",
                    "name" => "Administrador do Sistema",
                    "login" => "admin",
                    "password" => "admin",
                    "role" => "admin",
                    "phone" => "(11) 98765-4321",
                    "email" => "admin@barbearia.com"
                ],
                [
                    "id" => "u_b1",
                    "name" => "Rodrigo 'Navalha' Silva",
                    "login" => "rodrigo",
                    "password" => "123456",
                    "role" => "barber",
                    "barberId" => "b1",
                    "phone" => "(11) 99111-2233",
                    "email" => "rodrigo@barbearia.com"
                ],
                [
                    "id" => "u_b2",
                    "name" => "Marcos Andrade",
                    "login" => "marcos",
                    "password" => "123456",
                    "role" => "barber",
                    "barberId" => "b2",
                    "phone" => "(11) 99222-3344",
                    "email" => "marcos@barbearia.com"
                ],
                [
                    "id" => "u_b3",
                    "name" => "Gabriel Santos",
                    "login" => "gabriel",
                    "password" => "123456",
                    "role" => "barber",
                    "barberId" => "b3",
                    "phone" => "(11) 99333-4455",
                    "email" => "gabriel@barbearia.com"
                ],
                ["id" => "c1", "name" => "Lucas Oliveira", "login" => "lucas.oliveira", "password" => "lucas123", "role" => "client", "phone" => "(11) 98111-0001", "email" => "lucas.oliveira@gmail.com"],
                ["id" => "c2", "name" => "Matheus Souza", "login" => "matheus.souza", "password" => "matheus123", "role" => "client", "phone" => "(11) 98222-0002", "email" => "matheus.souza@outlook.com"],
                ["id" => "c3", "name" => "Felipe Ferreira", "login" => "felipe.ferreira", "password" => "felipe123", "role" => "client", "phone" => "(11) 98333-0003", "email" => "felipe.ferreira@hotmail.com"],
                ["id" => "c4", "name" => "Bruno Costa", "login" => "bruno.costa", "password" => "bruno123", "role" => "client", "phone" => "(11) 98444-0004", "email" => "bruno.costa@yahoo.com.br"],
                ["id" => "c5", "name" => "Guilherme Santos", "login" => "guilherme.santos", "password" => "guilherme123", "role" => "client", "phone" => "(11) 98555-0005", "email" => "guilherme.santos@gmail.com"],
                ["id" => "c6", "name" => "Thiago Lima", "login" => "thiago.lima", "password" => "thiago123", "role" => "client", "phone" => "(11) 98666-0006", "email" => "thiago.lima@gmail.com"],
                ["id" => "c7", "name" => "Rafael Alves", "login" => "rafael.alves", "password" => "rafael123", "role" => "client", "phone" => "(11) 98777-0007", "email" => "rafael.alves@bol.com.br"],
                ["id" => "c8", "name" => "Gustavo Ribeiro", "login" => "gustavo.ribeiro", "password" => "gustavo123", "role" => "client", "phone" => "(11) 98888-0008", "email" => "gustavo.ribeiro@gmail.com"],
                ["id" => "c9", "name" => "Diego Martins", "login" => "diego.martins", "password" => "diego123", "role" => "client", "phone" => "(11) 98999-0009", "email" => "diego.martins@uol.com.br"],
                ["id" => "c10", "name" => "Leonardo Rocha", "login" => "leonardo.rocha", "password" => "leonardo123", "role" => "client", "phone" => "(11) 98000-0010", "email" => "leonardo.rocha@gmail.com"]
            ]
        ];
        saveDB($default);
        return $default;
    }

    $json = file_get_contents(DATA_FILE);
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

/**
 * Salva os dados no arquivo JSON com trava segura de concorrencia (flock)
 */
function saveDB($data) {
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
