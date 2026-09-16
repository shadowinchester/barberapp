<?php
require_once __DIR__ . '/db.php';
$user = requireAuth('barbeiro');

$db = getDB();
$message = '';
$error = '';
$selectedDate = $_GET['date'] ?? date('Y-m-d');

// Barbeiro ID vinculado
$barberId = $user['barberId'] ?? '';
if (!$barberId) {
    // Se não tiver barberId gravado, tenta achar pelo login ou nome
    foreach ($db['barbers'] as $b) {
        if (($b['login'] ?? '') === $user['login'] || stripos($b['name'], $user['name']) !== false) {
            $barberId = $b['id'];
            break;
        }
    }
}

// Ações do Barbeiro
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = $_POST['action'] ?? '';

    // Alterar status
    if ($action === 'change_status') {
        $appId = $_POST['appId'] ?? '';
        $newStatus = $_POST['status'] ?? '';
        foreach ($db['appointments'] as &$app) {
            if ($app['id'] === $appId) {
                $app['status'] = $newStatus;
                break;
            }
        }
        saveDB($db);
        $message = 'Status do corte atualizado com sucesso!';
    }

    // Bloquear horário
    if ($action === 'block_slot') {
        $blockTime = $_POST['time'] ?? '';
        $blockDate = $_POST['date'] ?? $selectedDate;
        $reason = trim($_POST['reason'] ?? 'Horário bloqueado');

        if ($blockTime && $blockDate) {
            $db['blockedSlots'][] = [
                'id' => 'block-' . time(),
                'barberId' => $barberId,
                'date' => $blockDate,
                'time' => $blockTime,
                'reason' => $reason
            ];
            saveDB($db);
            $message = "Horário $blockTime bloqueado para $blockDate.";
        }
    }
}

$db = getDB();
$settings = $db['settings'] ?? [];
$shopName = $settings['shopName'] ?? 'Barbearia Dom navalha';
$appointments = $db['appointments'] ?? [];

// Filtrar apenas agendamentos deste barbeiro na data
$myAppointments = array_filter($appointments, function($a) use ($barberId, $selectedDate) {
    $matchBarber = empty($barberId) || ($a['barberId'] ?? '') === $barberId;
    return $matchBarber && ($a['date'] ?? '') === $selectedDate;
});

// Ordenar por horário
usort($myAppointments, function($a, $b) {
    return strcmp($a['time'], $b['time']);
});

// Métricas do dia
$totalToday = 0;
$concludedToday = 0;
$moneyToday = 0;
foreach ($myAppointments as $a) {
    $totalToday++;
    if (($a['status'] ?? '') === 'concluido') {
        $concludedToday++;
        $moneyToday += floatval($a['servicePrice'] ?? 0);
    } elseif (($a['status'] ?? '') === 'confirmado') {
        $moneyToday += floatval($a['servicePrice'] ?? 0);
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR" class="h-full bg-stone-950">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agenda do Barbeiro - <?= htmlspecialchars($user['name']) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' }
                    }
                }
            }
        }
    </script>
</head>
<body class="min-h-full bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">

    <!-- Topo Barbeiro -->
    <header class="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 px-4 py-3 sm:px-6">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-3">
                <a href="index.php" class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <svg class="w-5 h-5 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.242 4.242 3 3 0 004.242-4.242zm0-5.758a3 3 0 10-4.242-4.242 3 3 0 004.242 4.242z"></path></svg>
                </a>
                <div>
                    <h1 class="font-bold text-base text-stone-100"><?= htmlspecialchars($user['name']) ?></h1>
                    <p class="text-xs text-amber-400">Barbeiro &bull; <?= htmlspecialchars($shopName) ?></p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <a href="index.php" class="text-xs text-stone-300 hover:text-amber-400 px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-950 transition-colors">
                    Ver Site
                </a>
                <a href="logout.php" class="text-xs text-red-400 hover:bg-stone-800 px-3 py-1.5 rounded-lg transition-colors">
                    Sair
                </a>
            </div>
        </div>
    </header>

    <!-- Conteúdo Barbeiro -->
    <main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        <?php if (!empty($message)): ?>
            <div class="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
                <svg class="w-5 h-5 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span><?= htmlspecialchars($message) ?></span>
            </div>
        <?php endif; ?>

        <!-- Métricas Rápidas -->
        <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="p-4 rounded-2xl bg-stone-900 border border-stone-800 text-center">
                <span class="text-xs text-stone-400 block">Agendados no Dia</span>
                <span class="text-2xl font-bold text-amber-400 mt-1 block"><?= $totalToday ?></span>
            </div>
            <div class="p-4 rounded-2xl bg-stone-900 border border-stone-800 text-center">
                <span class="text-xs text-stone-400 block">Concluídos</span>
                <span class="text-2xl font-bold text-emerald-400 mt-1 block"><?= $concludedToday ?></span>
            </div>
            <div class="p-4 rounded-2xl bg-stone-900 border border-stone-800 text-center">
                <span class="text-xs text-stone-400 block">Faturamento Previsto</span>
                <span class="text-2xl font-bold text-stone-100 mt-1 block">R$ <?= number_format($moneyToday, 2, ',', '.') ?></span>
            </div>
        </div>

        <!-- Seletor de Data -->
        <div class="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl mb-6">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 class="text-lg font-bold text-stone-100">Atendimentos do Dia</h2>
                    <p class="text-xs text-stone-400">Gerencie a fila de cortes e clientes</p>
                </div>
                <form method="GET" action="barbeiro.php" class="flex items-center gap-2">
                    <input type="date" name="date" value="<?= htmlspecialchars($selectedDate) ?>" onchange="this.form.submit()" class="bg-stone-950 border border-stone-800 text-xs text-stone-200 rounded-xl px-3 py-2">
                    <a href="barbeiro.php?date=<?= date('Y-m-d') ?>" class="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-xs font-semibold rounded-xl text-stone-200">
                        Hoje
                    </a>
                </form>
            </div>
        </div>

        <!-- Lista de Cortes -->
        <div class="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl">
            <?php if (empty($myAppointments)): ?>
                <div class="text-center py-12 text-stone-500 text-xs">
                    Nenhum agendamento marcado para <?= date('d/m/Y', strtotime($selectedDate)) ?>.
                </div>
            <?php else: ?>
                <div class="space-y-4">
                    <?php foreach ($myAppointments as $app): 
                        $st = $app['status'] ?? 'confirmado';
                    ?>
                        <div class="p-4 sm:p-5 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                                    <?= htmlspecialchars($app['time']) ?>
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-bold text-sm text-stone-100"><?= htmlspecialchars($app['clientName']) ?></h3>
                                        <?php if ($st === 'concluido'): ?>
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">Concluído</span>
                                        <?php elseif ($st === 'cancelado'): ?>
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">Cancelado</span>
                                        <?php else: ?>
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">Confirmado</span>
                                        <?php endif; ?>
                                    </div>
                                    <p class="text-xs text-stone-400 mt-0.5">
                                        <?= htmlspecialchars($app['serviceName']) ?> &bull; R$ <?= number_format(floatval($app['servicePrice'] ?? 0), 2, ',', '.') ?>
                                    </p>
                                    <div class="flex items-center gap-3 text-[11px] text-stone-500 mt-1">
                                        <span>📱 <?= htmlspecialchars($app['clientPhone']) ?></span>
                                        <?php if (!empty($app['notes'])): ?>
                                            <span>📝 <?= htmlspecialchars($app['notes']) ?></span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>

                            <!-- Ações -->
                            <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <?php if ($st !== 'concluido'): ?>
                                    <form method="POST" action="barbeiro.php?date=<?= $selectedDate ?>">
                                        <input type="hidden" name="action" value="change_status">
                                        <input type="hidden" name="appId" value="<?= $app['id'] ?>">
                                        <input type="hidden" name="status" value="concluido">
                                        <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-100 font-bold text-xs transition-colors flex items-center gap-1.5">
                                            <span>✓ Concluir</span>
                                        </button>
                                    </form>
                                <?php endif; ?>

                                <?php if ($st !== 'cancelado'): ?>
                                    <form method="POST" action="barbeiro.php?date=<?= $selectedDate ?>">
                                        <input type="hidden" name="action" value="change_status">
                                        <input type="hidden" name="appId" value="<?= $app['id'] ?>">
                                        <input type="hidden" name="status" value="cancelado">
                                        <button type="submit" class="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-red-400 text-xs transition-colors">
                                            Cancelar
                                        </button>
                                    </form>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

    </main>

    <footer class="py-4 text-center text-xs text-stone-500 border-t border-stone-900">
        <?= htmlspecialchars($shopName) ?> &bull; Área do Barbeiro em PHP Puro
    </footer>
</body>
</html>
