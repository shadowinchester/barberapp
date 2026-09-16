<?php
require_once __DIR__ . '/db.php';

$db = getDB();
$settings = $db['settings'] ?? [];
$shopName = $settings['shopName'] ?? 'Barbearia Dom navalha';
$shopPhone = $settings['phone'] ?? '(11) 98765-4321';
$shopAddress = $settings['address'] ?? 'Rua das Palmeiras, 342 - Centro';
$services = array_filter($db['services'] ?? [], function($s) { return ($s['active'] ?? true); });
$barbers = array_filter($db['barbers'] ?? [], function($b) { return ($b['active'] ?? true); });

$currentUser = getCurrentUser();
$bookingSuccess = null;
$error = '';

// Processar formulário de Agendamento
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_appointment') {
    $clientName = trim($_POST['clientName'] ?? '');
    $clientPhone = trim($_POST['clientPhone'] ?? '');
    $serviceId = $_POST['serviceId'] ?? '';
    $barberId = $_POST['barberId'] ?? '';
    $date = $_POST['date'] ?? '';
    $time = $_POST['time'] ?? '';
    $notes = trim($_POST['notes'] ?? '');

    if (empty($clientName) || empty($clientPhone) || empty($serviceId) || empty($date) || empty($time)) {
        $error = 'Por favor, preencha todos os campos obrigatórios (Serviço, Data, Horário, Nome e WhatsApp).';
    } else {
        // Encontra o serviço
        $selectedService = null;
        foreach ($services as $s) {
            if ($s['id'] === $serviceId) {
                $selectedService = $s;
                break;
            }
        }

        // Encontra o barbeiro
        $selectedBarber = null;
        foreach ($barbers as $b) {
            if ($b['id'] === $barberId) {
                $selectedBarber = $b;
                break;
            }
        }

        $barberName = $selectedBarber ? $selectedBarber['name'] : 'Qualquer Profissional';
        $serviceName = $selectedService ? $selectedService['name'] : 'Corte Tradicional';
        $servicePrice = $selectedService ? floatval($selectedService['price']) : 45.0;
        $serviceDuration = $selectedService ? intval($selectedService['duration']) : 30;

        $newAppointment = [
            'id' => 'app-' . time() . '-' . rand(100, 999),
            'clientName' => $clientName,
            'clientPhone' => $clientPhone,
            'serviceId' => $serviceId,
            'serviceName' => $serviceName,
            'servicePrice' => $servicePrice,
            'serviceDuration' => $serviceDuration,
            'barberId' => $barberId ?: ($barbers[0]['id'] ?? 'b1'),
            'barberName' => $barberName,
            'date' => $date,
            'time' => $time,
            'status' => 'confirmado',
            'notes' => $notes,
            'createdAt' => date('c')
        ];

        // Também cadastra ou atualiza o cliente na lista de usuários se não existir
        $clientDigits = preg_replace('/\D/', '', $clientPhone);
        $userExists = false;
        foreach ($db['users'] as $u) {
            if (preg_replace('/\D/', '', $u['phone'] ?? '') === $clientDigits) {
                $userExists = true;
                break;
            }
        }
        if (!$userExists && strlen($clientDigits) >= 8) {
            $db['users'][] = [
                'id' => 'u-c-' . time(),
                'name' => $clientName,
                'phone' => $clientPhone,
                'login' => strtolower(explode(' ', $clientName)[0]) . rand(10, 99),
                'password' => '123',
                'role' => 'cliente',
                'createdAt' => date('c')
            ];
        }

        $db['appointments'][] = $newAppointment;
        saveDB($db);

        $bookingSuccess = $newAppointment;
    }
}

// Data inicial padrão: hoje
$selectedDate = $_GET['date'] ?? date('Y-m-d');
$selectedBarberId = $_GET['barberId'] ?? '';
$availableSlots = getAvailableSlots($selectedDate, $selectedBarberId);
?>
<!DOCTYPE html>
<html lang="pt-BR" class="h-full bg-stone-950">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($shopName) ?> - Agendamento Online</title>
    <!-- Tailwind via CDN oficial (funciona em qualquer PHP sem compilar) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        amber: {
                            400: '#fbbf24',
                            500: '#f59e0b',
                            600: '#d97706'
                        }
                    }
                }
            }
        }
    </script>
</head>
<body class="min-h-full bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">

    <!-- CABEÇALHO -->
    <header class="sticky top-0 z-40 bg-stone-900/95 backdrop-blur border-b border-stone-800 text-stone-100 shadow-md">
        <!-- Top bar de informações -->
        <div class="bg-stone-950/90 text-stone-400 text-xs py-1.5 px-4 border-b border-stone-800/80">
            <div class="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
                <div class="flex items-center gap-4">
                    <span class="flex items-center gap-1.5 text-stone-400">
                        <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Seg - Sáb: <?= $settings['openTime'] ?? '08:00' ?> às <?= $settings['closeTime'] ?? '19:30' ?>
                    </span>
                    <span class="hidden md:flex items-center gap-1.5 text-stone-400">
                        <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                        <?= htmlspecialchars($shopAddress) ?>
                    </span>
                </div>
                <div class="flex items-center gap-3">
                    <a href="tel:<?= preg_replace('/\D/', '', $shopPhone) ?>" class="flex items-center gap-1.5 text-stone-300 hover:text-amber-400 transition-colors">
                        <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                        <span><?= htmlspecialchars($shopPhone) ?></span>
                    </a>
                </div>
            </div>
        </div>

        <!-- Menu principal -->
        <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="index.php" class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <svg class="w-5 h-5 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.242 4.242 3 3 0 004.242-4.242zm0-5.758a3 3 0 10-4.242-4.242 3 3 0 004.242 4.242z"></path></svg>
                </div>
                <div>
                    <h1 class="font-bold text-lg tracking-tight text-stone-100"><?= htmlspecialchars($shopName) ?></h1>
                    <p class="text-xs text-stone-400">Sistema de Agendamento e Gestão</p>
                </div>
            </a>

            <!-- Ações do usuário -->
            <div class="flex items-center gap-3">
                <?php if ($currentUser): ?>
                    <div class="flex items-center gap-2">
                        <?php if ($currentUser['role'] === 'admin'): ?>
                            <a href="admin.php" class="text-xs font-semibold px-3 py-2 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors flex items-center gap-1.5">
                                <span>👑 Painel Admin</span>
                            </a>
                        <?php elseif ($currentUser['role'] === 'barbeiro'): ?>
                            <a href="barbeiro.php" class="text-xs font-semibold px-3 py-2 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors flex items-center gap-1.5">
                                <span>✂️ Minha Agenda</span>
                            </a>
                        <?php else: ?>
                            <a href="meus-agendamentos.php" class="text-xs font-medium px-3 py-2 rounded-xl bg-stone-800 text-stone-300 hover:text-stone-100 hover:bg-stone-700 transition-colors">
                                Meus Cortes
                            </a>
                        <?php endif; ?>

                        <div class="hidden sm:flex flex-col text-right text-xs">
                            <span class="font-semibold text-stone-200"><?= htmlspecialchars($currentUser['name']) ?></span>
                            <span class="text-[10px] text-amber-500 capitalize"><?= htmlspecialchars($currentUser['role']) ?></span>
                        </div>

                        <a href="logout.php" title="Sair do sistema" class="p-2 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-xl transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        </a>
                    </div>
                <?php else: ?>
                    <a href="login.php" class="text-xs font-semibold px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        <span>Entrar / Cadastrar</span>
                    </a>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <!-- CONTEÚDO PRINCIPAL -->
    <main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        <?php if (!empty($error)): ?>
            <div class="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
                <svg class="w-5 h-5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span><?= htmlspecialchars($error) ?></span>
            </div>
        <?php endif; ?>

        <?php if ($bookingSuccess): ?>
            <!-- CARD DE SUCESSO DO AGENDAMENTO -->
            <div class="mb-8 p-6 sm:p-8 rounded-3xl bg-stone-900 border border-emerald-500/40 shadow-2xl relative overflow-hidden">
                <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    <div class="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <div class="flex-1 text-center sm:text-left">
                        <span class="text-xs uppercase font-bold tracking-widest text-emerald-400">Agendamento Confirmado!</span>
                        <h2 class="text-2xl font-bold text-stone-100 mt-1">Tudo pronto, <?= htmlspecialchars($bookingSuccess['clientName']) ?>!</h2>
                        <p class="text-sm text-stone-400 mt-1">Seu horário foi reservado na agenda da barbearia com sucesso.</p>

                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 p-4 rounded-2xl bg-stone-950/80 border border-stone-800 text-left">
                            <div>
                                <span class="text-[11px] text-stone-500 block">Serviço</span>
                                <span class="text-sm font-semibold text-stone-200"><?= htmlspecialchars($bookingSuccess['serviceName']) ?></span>
                            </div>
                            <div>
                                <span class="text-[11px] text-stone-500 block">Barbeiro</span>
                                <span class="text-sm font-semibold text-stone-200"><?= htmlspecialchars($bookingSuccess['barberName']) ?></span>
                            </div>
                            <div>
                                <span class="text-[11px] text-stone-500 block">Data e Horário</span>
                                <span class="text-sm font-semibold text-amber-400">
                                    <?= date('d/m/Y', strtotime($bookingSuccess['date'])) ?> às <?= htmlspecialchars($bookingSuccess['time']) ?>
                                </span>
                            </div>
                            <div>
                                <span class="text-[11px] text-stone-500 block">Valor</span>
                                <span class="text-sm font-bold text-emerald-400">R$ <?= number_format($bookingSuccess['servicePrice'], 2, ',', '.') ?></span>
                            </div>
                        </div>

                        <?php
                            $whatsText = urlencode("Olá! Confirmo meu agendamento na " . $shopName . ":\n- Serviço: " . $bookingSuccess['serviceName'] . "\n- Profissional: " . $bookingSuccess['barberName'] . "\n- Data: " . date('d/m/Y', strtotime($bookingSuccess['date'])) . " às " . $bookingSuccess['time'] . "\n- Cliente: " . $bookingSuccess['clientName']);
                            $cleanShopPhone = preg_replace('/\D/', '', $shopPhone);
                        ?>
                        <div class="flex flex-wrap gap-3">
                            <a href="https://wa.me/55<?= $cleanShopPhone ?>?text=<?= $whatsText ?>" target="_blank" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-100 font-semibold text-xs transition-colors flex items-center gap-2">
                                <span>📱 Notificar Barbearia via WhatsApp</span>
                            </a>
                            <a href="index.php" class="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors">
                                Agendar Novo Horário
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        <?php endif; ?>

        <!-- BANNER DE BOAS-VINDAS -->
        <div class="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/30 border border-stone-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
                <span class="text-xs uppercase font-bold tracking-widest text-amber-500">Agende em Menos de 1 Minuto</span>
                <h2 class="text-2xl sm:text-3xl font-extrabold text-stone-100 mt-1">Cortes Clássicos, Degradê & Barboterapia</h2>
                <p class="text-sm text-stone-400 mt-2 max-w-xl">
                    Selecione o serviço desejado, seu barbeiro favorito e garanta seu horário sem filas ou espera.
                </p>
            </div>
            <div class="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 px-4 py-2.5 rounded-2xl border border-amber-500/30">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span>Agendamento Imediato 100% PHP</span>
            </div>
        </div>

        <!-- FORMULÁRIO DE AGENDAMENTO -->
        <form method="POST" action="index.php" id="booking-form" class="space-y-8">
            <input type="hidden" name="action" value="create_appointment">
            <input type="hidden" name="serviceId" id="input-service-id" value="<?= $services[0]['id'] ?? '' ?>">
            <input type="hidden" name="barberId" id="input-barber-id" value="">
            <input type="hidden" name="time" id="input-time" value="">

            <!-- ETAPA 1: ESCOLHA DO SERVIÇO -->
            <section class="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div class="flex items-center gap-3 mb-5">
                    <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                        1
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-stone-100">Escolha o Serviço</h3>
                        <p class="text-xs text-stone-400">Clique para selecionar o procedimento que você deseja fazer</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <?php 
                    $first = true;
                    foreach ($services as $serv): 
                        $isSel = $first;
                        $first = false;
                    ?>
                        <div onclick="selectService('<?= $serv['id'] ?>', this)" class="service-card cursor-pointer p-4 rounded-2xl border transition-all <?= $isSel ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5' : 'border-stone-800 bg-stone-950/70 hover:border-stone-700' ?>">
                            <div class="flex items-start justify-between gap-2">
                                <h4 class="font-bold text-sm text-stone-100"><?= htmlspecialchars($serv['name']) ?></h4>
                                <span class="text-sm font-extrabold text-amber-400">R$ <?= number_format($serv['price'], 2, ',', '.') ?></span>
                            </div>
                            <p class="text-xs text-stone-400 mt-1 line-clamp-2"><?= htmlspecialchars($serv['description']) ?></p>
                            <div class="flex items-center gap-2 mt-3 text-[11px] text-stone-500">
                                <svg class="w-3.5 h-3.5 text-amber-500/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Aproximadamente <?= intval($serv['duration']) ?> minutos</span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </section>

            <!-- ETAPA 2: ESCOLHA DO BARBEIRO -->
            <section class="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div class="flex items-center gap-3 mb-5">
                    <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                        2
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-stone-100">Escolha o Barbeiro</h3>
                        <p class="text-xs text-stone-400">Selecione seu profissional de confiança ou qualquer disponível</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <!-- Opção Qualquer Barbeiro -->
                    <div onclick="selectBarber('', this)" class="barber-card cursor-pointer p-4 rounded-2xl border transition-all border-amber-500 bg-amber-500/10 text-center">
                        <div class="w-14 h-14 mx-auto rounded-full bg-stone-800 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
                            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        </div>
                        <h4 class="font-bold text-xs text-stone-200">Primeiro Disponível</h4>
                        <p class="text-[10px] text-amber-400/90 mt-0.5">Maior flexibilidade</p>
                    </div>

                    <?php foreach ($barbers as $barb): ?>
                        <div onclick="selectBarber('<?= $barb['id'] ?>', this)" class="barber-card cursor-pointer p-4 rounded-2xl border transition-all border-stone-800 bg-stone-950/70 hover:border-stone-700 text-center">
                            <img src="<?= htmlspecialchars($barb['avatar']) ?>" alt="<?= htmlspecialchars($barb['name']) ?>" class="w-14 h-14 mx-auto rounded-full object-cover border-2 border-stone-800 mb-2">
                            <h4 class="font-bold text-xs text-stone-200"><?= htmlspecialchars($barb['name']) ?></h4>
                            <p class="text-[10px] text-stone-400 mt-0.5 line-clamp-1"><?= htmlspecialchars($barb['specialty']) ?></p>
                        </div>
                    <?php endforeach; ?>
                </div>
            </section>

            <!-- ETAPA 3: DATA E HORÁRIOS DISPONÍVEIS -->
            <section class="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div class="flex items-center gap-3 mb-5">
                    <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                        3
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-stone-100">Data e Horário</h3>
                        <p class="text-xs text-stone-400">Escolha o dia e o horário vago na grade</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Escolha da data -->
                    <div>
                        <label class="block text-xs font-semibold text-stone-300 mb-2">Selecione o Dia:</label>
                        <input type="date" name="date" id="input-date" min="<?= date('Y-m-d') ?>" value="<?= htmlspecialchars($selectedDate) ?>" onchange="reloadSlots()" class="w-full bg-stone-950 border border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                        
                        <div class="mt-3 flex gap-2">
                            <button type="button" onclick="setDate('<?= date('Y-m-d') ?>')" class="flex-1 py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs transition-colors">
                                Hoje
                            </button>
                            <button type="button" onclick="setDate('<?= date('Y-m-d', strtotime('+1 day')) ?>')" class="flex-1 py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs transition-colors">
                                Amanhã
                            </button>
                        </div>
                    </div>

                    <!-- Grid de horários -->
                    <div class="md:col-span-2">
                        <label class="block text-xs font-semibold text-stone-300 mb-2">
                            Horários Livres para <span id="label-date-display" class="text-amber-400"><?= date('d/m/Y', strtotime($selectedDate)) ?></span>:
                        </label>
                        
                        <div id="slots-container" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                            <?php foreach ($availableSlots as $slot): ?>
                                <?php if ($slot['available']): ?>
                                    <button type="button" onclick="selectTime('<?= $slot['time'] ?>', this)" class="slot-btn py-2 px-1 rounded-xl border border-stone-800 bg-stone-950 hover:border-amber-500/80 hover:bg-amber-500/10 text-stone-200 text-xs font-semibold transition-all">
                                        <?= $slot['time'] ?>
                                    </button>
                                <?php else: ?>
                                    <button type="button" disabled class="py-2 px-1 rounded-xl border border-stone-900 bg-stone-900/40 text-stone-600 text-xs font-medium cursor-not-allowed line-through">
                                        <?= $slot['time'] ?>
                                    </button>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </div>
                        <p class="text-[11px] text-stone-500 mt-2">
                            Horários tachados já estão reservados por outros clientes.
                        </p>
                    </div>
                </div>
            </section>

            <!-- ETAPA 4: DADOS DE CONTATO DO CLIENTE -->
            <section class="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div class="flex items-center gap-3 mb-5">
                    <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                        4
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-stone-100">Seus Dados de Contato</h3>
                        <p class="text-xs text-stone-400">Informações para confirmar sua reserva</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-medium text-stone-300 mb-1">Seu Nome Completo *</label>
                        <input type="text" name="clientName" required value="<?= htmlspecialchars($currentUser['name'] ?? '') ?>" placeholder="Ex: Rodrigo Mendonça" class="w-full bg-stone-950 border border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-stone-300 mb-1">WhatsApp / Celular *</label>
                        <input type="tel" name="clientPhone" required value="<?= htmlspecialchars($currentUser['phone'] ?? '') ?>" placeholder="(11) 98765-4321" class="w-full bg-stone-950 border border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-xs font-medium text-stone-300 mb-1">Observações ou Preferências (Opcional)</label>
                        <input type="text" name="notes" placeholder="Ex: Gosto do degradê na zero alta com risco na sobrancelha" class="w-full bg-stone-950 border border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                    </div>
                </div>

                <!-- Botão Final de Confirmação -->
                <div class="mt-6 pt-5 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div class="text-xs text-stone-400">
                        Horário selecionado: <span id="display-selected-time" class="font-bold text-amber-400">Nenhum horário escolhido</span>
                    </div>
                    <button type="submit" id="submit-booking-btn" class="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer">
                        <span>Confirmar Meu Agendamento</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                </div>
            </section>
        </form>

    </main>

    <!-- RODAPÉ -->
    <footer class="mt-12 py-6 border-t border-stone-800 bg-stone-900 text-stone-400 text-xs">
        <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
                <span class="font-semibold text-stone-200"><?= htmlspecialchars($shopName) ?></span> &bull; <?= htmlspecialchars($shopAddress) ?>
            </div>
            <div class="flex items-center gap-4 text-[11px]">
                <a href="login.php" class="hover:text-amber-400 transition-colors">Acesso Administrativo</a>
                <span>&bull;</span>
                <a href="login.php?role=barbeiro" class="hover:text-amber-400 transition-colors">Área do Barbeiro</a>
                <span>&bull;</span>
                <span class="text-stone-500">PHP 7.4+ &bull; 100% JSON</span>
            </div>
        </div>
    </footer>

    <script>
        function selectService(id, element) {
            document.getElementById('input-service-id').value = id;
            document.querySelectorAll('.service-card').forEach(c => {
                c.className = 'service-card cursor-pointer p-4 rounded-2xl border transition-all border-stone-800 bg-stone-950/70 hover:border-stone-700';
            });
            element.className = 'service-card cursor-pointer p-4 rounded-2xl border transition-all border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5';
        }

        function selectBarber(id, element) {
            document.getElementById('input-barber-id').value = id;
            document.querySelectorAll('.barber-card').forEach(c => {
                c.className = 'barber-card cursor-pointer p-4 rounded-2xl border transition-all border-stone-800 bg-stone-950/70 hover:border-stone-700 text-center';
            });
            element.className = 'barber-card cursor-pointer p-4 rounded-2xl border transition-all border-amber-500 bg-amber-500/10 text-center';
            reloadSlots();
        }

        function selectTime(time, element) {
            document.getElementById('input-time').value = time;
            document.querySelectorAll('.slot-btn').forEach(b => {
                b.className = 'slot-btn py-2 px-1 rounded-xl border border-stone-800 bg-stone-950 hover:border-amber-500/80 hover:bg-amber-500/10 text-stone-200 text-xs font-semibold transition-all';
            });
            element.className = 'slot-btn py-2 px-1 rounded-xl border border-amber-500 bg-amber-500 text-stone-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20';
            document.getElementById('display-selected-time').textContent = time;
        }

        function setDate(dateStr) {
            document.getElementById('input-date').value = dateStr;
            reloadSlots();
        }

        function reloadSlots() {
            const date = document.getElementById('input-date').value;
            const barberId = document.getElementById('input-barber-id').value;
            const container = document.getElementById('slots-container');
            const displayDate = document.getElementById('label-date-display');

            if (date) {
                const parts = date.split('-');
                displayDate.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            container.innerHTML = '<div class="col-span-4 text-xs text-stone-400 py-3">Carregando horários...</div>';

            fetch(`api.php?action=get_slots&date=${date}&barberId=${barberId}`)
                .then(r => r.json())
                .then(data => {
                    container.innerHTML = '';
                    if (!data.slots || data.slots.length === 0) {
                        container.innerHTML = '<div class="col-span-4 text-xs text-stone-500 py-3">Nenhum horário disponível para esta data.</div>';
                        return;
                    }
                    data.slots.forEach(slot => {
                        if (slot.available) {
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'slot-btn py-2 px-1 rounded-xl border border-stone-800 bg-stone-950 hover:border-amber-500/80 hover:bg-amber-500/10 text-stone-200 text-xs font-semibold transition-all';
                            btn.textContent = slot.time;
                            btn.onclick = () => selectTime(slot.time, btn);
                            container.appendChild(btn);
                        } else {
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.disabled = true;
                            btn.className = 'py-2 px-1 rounded-xl border border-stone-900 bg-stone-900/40 text-stone-600 text-xs font-medium cursor-not-allowed line-through';
                            btn.textContent = slot.time;
                            container.appendChild(btn);
                        }
                    });
                })
                .catch(() => {
                    // Fallback recarregando a página caso o host bloqueie AJAX
                    window.location.href = `index.php?date=${date}&barberId=${barberId}`;
                });
        }

        // Validação antes do envio
        document.getElementById('booking-form').onsubmit = function(e) {
            const time = document.getElementById('input-time').value;
            if (!time) {
                alert('Por favor, clique em um dos horários livres disponíveis para o seu agendamento.');
                e.preventDefault();
                return false;
            }
            return true;
        };
    </script>
</body>
</html>
