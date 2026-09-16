<?php
require_once __DIR__ . '/db.php';
$user = requireAuth('cliente');

$db = getDB();
$message = '';
$settings = $db['settings'] ?? [];
$shopName = $settings['shopName'] ?? 'Barbearia Dom navalha';

// Ação de cancelar
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['action']) && $_POST['action'] === 'cancel_my_app') {
    $appId = $_POST['appId'] ?? '';
    foreach ($db['appointments'] as &$app) {
        if ($app['id'] === $appId) {
            $app['status'] = 'cancelado';
            break;
        }
    }
    saveDB($db);
    $message = 'Agendamento cancelado com sucesso.';
}

$appointments = $db['appointments'] ?? [];
$userDigits = preg_replace('/\D/', '', $user['phone'] ?? '');

// Filtra agendamentos deste cliente
$myApps = array_filter($appointments, function($a) use ($user, $userDigits) {
    $appDigits = preg_replace('/\D/', '', $a['clientPhone'] ?? '');
    return ($appDigits && $appDigits === $userDigits) || (stripos($a['clientName'] ?? '', $user['name'] ?? '') !== false);
});

usort($myApps, function($a, $b) {
    return strcmp($b['date'] . ' ' . $b['time'], $a['date'] . ' ' . $a['time']);
});
?>
<!DOCTYPE html>
<html lang="pt-BR" class="h-full bg-stone-950">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meus Cortes - <?= htmlspecialchars($shopName) ?></title>
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

    <header class="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 px-4 py-3 sm:px-6">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
            <a href="index.php" class="flex items-center gap-2 text-amber-500 font-bold text-lg">
                <svg class="w-6 h-6 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.242 4.242 3 3 0 004.242-4.242zm0-5.758a3 3 0 10-4.242-4.242 3 3 0 004.242 4.242z"></path></svg>
                <span><?= htmlspecialchars($shopName) ?></span>
            </a>
            <div class="flex items-center gap-3">
                <a href="index.php" class="px-3.5 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors">
                    + Novo Agendamento
                </a>
                <a href="logout.php" class="text-xs text-stone-400 hover:text-red-400">
                    Sair
                </a>
            </div>
        </div>
    </header>

    <main class="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        
        <?php if (!empty($message)): ?>
            <div class="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <?= htmlspecialchars($message) ?>
            </div>
        <?php endif; ?>

        <div class="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 class="text-xl font-bold text-stone-100">Meus Cortes Agendados</h2>
            <p class="text-xs text-stone-400 mt-1 mb-6">Histórico de reservas de <?= htmlspecialchars($user['name']) ?></p>

            <?php if (empty($myApps)): ?>
                <div class="text-center py-12">
                    <p class="text-stone-400 text-sm mb-4">Você ainda não possui nenhum agendamento registrado.</p>
                    <a href="index.php" class="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors">
                        Agendar Meu Primeiro Corte
                    </a>
                </div>
            <?php else: ?>
                <div class="space-y-4">
                    <?php foreach ($myApps as $app): 
                        $st = $app['status'] ?? 'confirmado';
                    ?>
                        <div class="p-5 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <h3 class="font-bold text-sm text-stone-100"><?= htmlspecialchars($app['serviceName']) ?></h3>
                                    <?php if ($st === 'concluido'): ?>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">Concluído</span>
                                    <?php elseif ($st === 'cancelado'): ?>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">Cancelado</span>
                                    <?php else: ?>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">Confirmado</span>
                                    <?php endif; ?>
                                </div>
                                <p class="text-xs text-stone-400">Barbeiro: <strong class="text-stone-300"><?= htmlspecialchars($app['barberName']) ?></strong></p>
                                <div class="flex items-center gap-4 text-xs mt-2">
                                    <span class="text-amber-400 font-semibold">📅 <?= date('d/m/Y', strtotime($app['date'])) ?> às <?= htmlspecialchars($app['time']) ?></span>
                                    <span class="text-emerald-400 font-bold">R$ <?= number_format(floatval($app['servicePrice'] ?? 0), 2, ',', '.') ?></span>
                                </div>
                            </div>

                            <?php if ($st === 'confirmado'): ?>
                                <form method="POST" action="meus-agendamentos.php" onsubmit="return confirm('Deseja realmente cancelar este horário?');">
                                    <input type="hidden" name="action" value="cancel_my_app">
                                    <input type="hidden" name="appId" value="<?= $app['id'] ?>">
                                    <button type="submit" class="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors">
                                        Cancelar Horário
                                    </button>
                                </form>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </main>

    <footer class="py-4 text-center text-xs text-stone-500 border-t border-stone-900">
        <?= htmlspecialchars($shopName) ?> &bull; Sistema em PHP Puro
    </footer>
</body>
</html>
