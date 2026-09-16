<?php
require_once __DIR__ . '/db.php';
$user = requireAuth('admin');

$db = getDB();
$message = '';
$error = '';
$activeTab = $_GET['tab'] ?? 'agenda';

// --- AÇÕES DO FORMULÁRIO DO ADMIN ---
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = $_POST['action'] ?? '';

    // 1. Alterar status de agendamento
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
        $message = 'Status do agendamento atualizado com sucesso.';
    }

    // 2. Excluir agendamento
    if ($action === 'delete_appointment') {
        $appId = $_POST['appId'] ?? '';
        $db['appointments'] = array_values(array_filter($db['appointments'], function($a) use ($appId) {
            return $a['id'] !== $appId;
        }));
        saveDB($db);
        $message = 'Agendamento removido com sucesso.';
    }

    // 3. Adicionar Barbeiro
    if ($action === 'add_barber') {
        $activeTab = 'barbeiros';
        $name = trim($_POST['name'] ?? '');
        $specialty = trim($_POST['specialty'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $login = strtolower(trim($_POST['login'] ?? ''));
        $password = trim($_POST['password'] ?? '123');
        $avatar = trim($_POST['avatar'] ?? '') ?: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';

        if (empty($name) || empty($login)) {
            $error = 'Nome e Login do barbeiro são obrigatórios.';
        } else {
            $newBarberId = 'b-' . time();
            $db['barbers'][] = [
                'id' => $newBarberId,
                'name' => $name,
                'specialty' => $specialty ?: 'Cortes Clássicos e Barba',
                'phone' => $phone,
                'avatar' => $avatar,
                'login' => $login,
                'active' => true
            ];

            // Cria o usuário de login
            $db['users'][] = [
                'id' => 'u-' . $newBarberId,
                'name' => $name,
                'phone' => $phone,
                'login' => $login,
                'password' => $password ?: '123',
                'role' => 'barbeiro',
                'barberId' => $newBarberId,
                'createdAt' => date('c')
            ];

            saveDB($db);
            $message = "Barbeiro '$name' cadastrado com sucesso!";
        }
    }

    // 4. Excluir Barbeiro
    if ($action === 'delete_barber') {
        $activeTab = 'barbeiros';
        $barberId = $_POST['barberId'] ?? '';
        $db['barbers'] = array_values(array_filter($db['barbers'], function($b) use ($barberId) {
            return $b['id'] !== $barberId;
        }));
        $db['users'] = array_values(array_filter($db['users'], function($u) use ($barberId) {
            return ($u['barberId'] ?? '') !== $barberId;
        }));
        saveDB($db);
        $message = 'Barbeiro removido com sucesso.';
    }

    // 5. Adicionar Serviço
    if ($action === 'add_service') {
        $activeTab = 'servicos';
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $price = floatval($_POST['price'] ?? 0);
        $duration = intval($_POST['duration'] ?? 30);

        if (empty($name) || $price <= 0) {
            $error = 'Nome e Preço válido são obrigatórios.';
        } else {
            $db['services'][] = [
                'id' => 's-' . time(),
                'name' => $name,
                'description' => $description,
                'price' => $price,
                'duration' => $duration ?: 30,
                'active' => true
            ];
            saveDB($db);
            $message = "Serviço '$name' adicionado com sucesso!";
        }
    }

    // 6. Excluir Serviço
    if ($action === 'delete_service') {
        $activeTab = 'servicos';
        $serviceId = $_POST['serviceId'] ?? '';
        $db['services'] = array_values(array_filter($db['services'], function($s) use ($serviceId) {
            return $s['id'] !== $serviceId;
        }));
        saveDB($db);
        $message = 'Serviço removido com sucesso.';
    }

    // 7. Salvar Configurações
    if ($action === 'save_settings') {
        $activeTab = 'configuracoes';
        $db['settings']['shopName'] = trim($_POST['shopName'] ?? 'Barbearia Dom navalha');
        $db['settings']['address'] = trim($_POST['address'] ?? '');
        $db['settings']['phone'] = trim($_POST['phone'] ?? '');
        $db['settings']['openTime'] = trim($_POST['openTime'] ?? '08:00');
        $db['settings']['closeTime'] = trim($_POST['closeTime'] ?? '19:30');
        $db['settings']['slotInterval'] = intval($_POST['slotInterval'] ?? 30);
        saveDB($db);
        $message = 'Configurações da barbearia atualizadas!';
    }
}

// Recarrega dados após operações
$db = getDB();
$settings = $db['settings'] ?? [];
$shopName = $settings['shopName'] ?? 'Barbearia Dom navalha';
$appointments = $db['appointments'] ?? [];
$barbers = $db['barbers'] ?? [];
$services = $db['services'] ?? [];
$users = $db['users'] ?? [];

// Métricas de faturamento
$totalRevenue = 0;
$confirmedCount = 0;
$todayCount = 0;
$todayDate = date('Y-m-d');

foreach ($appointments as $a) {
    if (($a['status'] ?? '') !== 'cancelado') {
        $totalRevenue += floatval($a['servicePrice'] ?? 0);
        $confirmedCount++;
    }
    if (($a['date'] ?? '') === $todayDate) {
        $todayCount++;
    }
}

// Filtro de data da agenda
$filterDate = $_GET['filter_date'] ?? '';
$filteredAppointments = $appointments;
if ($filterDate) {
    $filteredAppointments = array_filter($filteredAppointments, function($a) use ($filterDate) {
        return $a['date'] === $filterDate;
    });
}
// Ordena por data e hora (mais recentes primeiro)
usort($filteredAppointments, function($a, $b) {
    return strcmp($b['date'] . ' ' . $b['time'], $a['date'] . ' ' . $a['time']);
});
?>
<!DOCTYPE html>
<html lang="pt-BR" class="h-full bg-stone-950">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel do Administrador - <?= htmlspecialchars($shopName) ?></title>
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

    <!-- Topo Admin -->
    <header class="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 px-4 py-3 sm:px-6">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-3">
                <a href="index.php" class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <svg class="w-5 h-5 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.242 4.242 3 3 0 004.242-4.242zm0-5.758a3 3 0 10-4.242-4.242 3 3 0 004.242 4.242z"></path></svg>
                </a>
                <div>
                    <div class="flex items-center gap-2">
                        <h1 class="font-bold text-base text-stone-100"><?= htmlspecialchars($shopName) ?></h1>
                        <span class="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30">
                            Painel do Administrador
                        </span>
                    </div>
                    <p class="text-xs text-stone-400">Logado como: <?= htmlspecialchars($user['name']) ?></p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <a href="index.php" class="text-xs text-stone-300 hover:text-amber-400 px-3 py-1.5 rounded-lg border border-stone-800 bg-stone-950 transition-colors flex items-center gap-1.5">
                    <span>Ver Tela de Agendamento</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
                <a href="logout.php" class="text-xs text-red-400 hover:bg-stone-800 px-3 py-1.5 rounded-lg transition-colors">
                    Sair
                </a>
            </div>
        </div>
    </header>

    <!-- Conteúdo Admin -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        <?php if (!empty($message)): ?>
            <div class="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
                <svg class="w-5 h-5 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <span><?= htmlspecialchars($message) ?></span>
            </div>
        <?php endif; ?>

        <?php if (!empty($error)): ?>
            <div class="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3">
                <svg class="w-5 h-5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span><?= htmlspecialchars($error) ?></span>
            </div>
        <?php endif; ?>

        <!-- Cards de Métricas -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div class="p-5 rounded-2xl bg-stone-900 border border-stone-800">
                <span class="text-xs text-stone-400 block mb-1">Cortes Hoje</span>
                <span class="text-2xl font-bold text-stone-100"><?= $todayCount ?></span>
                <span class="text-[11px] text-stone-500 block mt-1"><?= date('d/m/Y') ?></span>
            </div>
            <div class="p-5 rounded-2xl bg-stone-900 border border-stone-800">
                <span class="text-xs text-stone-400 block mb-1">Total de Agendamentos</span>
                <span class="text-2xl font-bold text-amber-400"><?= count($appointments) ?></span>
                <span class="text-[11px] text-stone-500 block mt-1"><?= $confirmedCount ?> confirmados/ativos</span>
            </div>
            <div class="p-5 rounded-2xl bg-stone-900 border border-stone-800">
                <span class="text-xs text-stone-400 block mb-1">Faturamento Estimado</span>
                <span class="text-2xl font-bold text-emerald-400">R$ <?= number_format($totalRevenue, 2, ',', '.') ?></span>
                <span class="text-[11px] text-stone-500 block mt-1">Serviços confirmados</span>
            </div>
            <div class="p-5 rounded-2xl bg-stone-900 border border-stone-800">
                <span class="text-xs text-stone-400 block mb-1">Equipe de Barbeiros</span>
                <span class="text-2xl font-bold text-stone-100"><?= count($barbers) ?></span>
                <span class="text-[11px] text-stone-500 block mt-1">Profissionais ativos</span>
            </div>
        </div>

        <!-- Abas de Navegação -->
        <div class="flex flex-wrap gap-2 border-b border-stone-800 pb-4 mb-6">
            <a href="admin.php?tab=agenda" class="px-4 py-2 rounded-xl text-xs font-semibold transition-all <?= $activeTab === 'agenda' ? 'bg-amber-500 text-stone-950 shadow' : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800' ?>">
                📅 Agenda Geral (<?= count($appointments) ?>)
            </a>
            <a href="admin.php?tab=barbeiros" class="px-4 py-2 rounded-xl text-xs font-semibold transition-all <?= $activeTab === 'barbeiros' ? 'bg-amber-500 text-stone-950 shadow' : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800' ?>">
                ✂️ Gerenciar Barbeiros (<?= count($barbers) ?>)
            </a>
            <a href="admin.php?tab=servicos" class="px-4 py-2 rounded-xl text-xs font-semibold transition-all <?= $activeTab === 'servicos' ? 'bg-amber-500 text-stone-950 shadow' : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800' ?>">
                💈 Serviços & Preços (<?= count($services) ?>)
            </a>
            <a href="admin.php?tab=configuracoes" class="px-4 py-2 rounded-xl text-xs font-semibold transition-all <?= $activeTab === 'configuracoes' ? 'bg-amber-500 text-stone-950 shadow' : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800' ?>">
                ⚙️ Configurações da Barbearia
            </a>
        </div>

        <!-- ABA 1: AGENDA GERAL -->
        <?php if ($activeTab === 'agenda'): ?>
            <div class="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 class="text-lg font-bold text-stone-100">Todos os Agendamentos</h2>
                        <p class="text-xs text-stone-400">Controle completo de horários marcados</p>
                    </div>
                    <!-- Filtro por data -->
                    <form method="GET" action="admin.php" class="flex items-center gap-2">
                        <input type="hidden" name="tab" value="agenda">
                        <input type="date" name="filter_date" value="<?= htmlspecialchars($filterDate) ?>" class="bg-stone-950 border border-stone-800 text-xs text-stone-200 rounded-xl px-3 py-2">
                        <button type="submit" class="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-xs font-semibold rounded-xl text-stone-200">
                            Filtrar
                        </button>
                        <?php if ($filterDate): ?>
                            <a href="admin.php?tab=agenda" class="text-xs text-stone-500 hover:text-stone-300">Limpar</a>
                        <?php endif; ?>
                    </form>
                </div>

                <?php if (empty($filteredAppointments)): ?>
                    <div class="text-center py-12 text-stone-500 text-xs">
                        Nenhum agendamento encontrado para o filtro selecionado.
                    </div>
                <?php else: ?>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs text-stone-300">
                            <thead class="bg-stone-950/80 text-stone-400 uppercase text-[10px] border-b border-stone-800">
                                <tr>
                                    <th class="p-3.5">Cliente & Contato</th>
                                    <th class="p-3.5">Serviço</th>
                                    <th class="p-3.5">Barbeiro</th>
                                    <th class="p-3.5">Data / Hora</th>
                                    <th class="p-3.5">Valor</th>
                                    <th class="p-3.5">Status</th>
                                    <th class="p-3.5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-stone-800/60">
                                <?php foreach ($filteredAppointments as $app): 
                                    $st = $app['status'] ?? 'confirmado';
                                ?>
                                    <tr class="hover:bg-stone-800/40 transition-colors">
                                        <td class="p-3.5 font-medium text-stone-100">
                                            <div class="font-bold"><?= htmlspecialchars($app['clientName']) ?></div>
                                            <div class="text-[11px] text-stone-400"><?= htmlspecialchars($app['clientPhone']) ?></div>
                                        </td>
                                        <td class="p-3.5"><?= htmlspecialchars($app['serviceName']) ?></td>
                                        <td class="p-3.5"><?= htmlspecialchars($app['barberName']) ?></td>
                                        <td class="p-3.5">
                                            <span class="font-semibold text-amber-400"><?= date('d/m/Y', strtotime($app['date'])) ?></span>
                                            <span class="text-stone-400 block"><?= htmlspecialchars($app['time']) ?></span>
                                        </td>
                                        <td class="p-3.5 font-bold text-emerald-400">
                                            R$ <?= number_format(floatval($app['servicePrice'] ?? 0), 2, ',', '.') ?>
                                        </td>
                                        <td class="p-3.5">
                                            <?php if ($st === 'concluido'): ?>
                                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Concluído</span>
                                            <?php elseif ($st === 'cancelado'): ?>
                                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">Cancelado</span>
                                            <?php else: ?>
                                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Confirmado</span>
                                            <?php endif; ?>
                                        </td>
                                        <td class="p-3.5 text-right">
                                            <div class="flex items-center justify-end gap-1.5">
                                                <!-- Concluir -->
                                                <form method="POST" action="admin.php?tab=agenda">
                                                    <input type="hidden" name="action" value="change_status">
                                                    <input type="hidden" name="appId" value="<?= $app['id'] ?>">
                                                    <input type="hidden" name="status" value="concluido">
                                                    <button type="submit" title="Marcar como Concluído" class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30">
                                                        ✓
                                                    </button>
                                                </form>
                                                <!-- Cancelar -->
                                                <form method="POST" action="admin.php?tab=agenda">
                                                    <input type="hidden" name="action" value="change_status">
                                                    <input type="hidden" name="appId" value="<?= $app['id'] ?>">
                                                    <input type="hidden" name="status" value="cancelado">
                                                    <button type="submit" title="Cancelar Agendamento" class="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30">
                                                        ✕
                                                    </button>
                                                </form>
                                                <!-- Excluir -->
                                                <form method="POST" action="admin.php?tab=agenda" onsubmit="return confirm('Deseja realmente apagar este agendamento do histórico?');">
                                                    <input type="hidden" name="action" value="delete_appointment">
                                                    <input type="hidden" name="appId" value="<?= $app['id'] ?>">
                                                    <button type="submit" title="Excluir Definitivamente" class="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30">
                                                        🗑
                                                    </button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <!-- ABA 2: GERENCIAR BARBEIROS -->
        <?php if ($activeTab === 'barbeiros'): ?>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Lista de Barbeiros -->
                <div class="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl">
                    <h2 class="text-lg font-bold text-stone-100 mb-1">Barbeiros Cadastrados</h2>
                    <p class="text-xs text-stone-400 mb-6">Profissionais que realizam atendimentos</p>

                    <div class="space-y-4">
                        <?php foreach ($barbers as $b): ?>
                            <div class="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-4">
                                <div class="flex items-center gap-4">
                                    <img src="<?= htmlspecialchars($b['avatar']) ?>" alt="<?= htmlspecialchars($b['name']) ?>" class="w-12 h-12 rounded-full object-cover border border-stone-800">
                                    <div>
                                        <h3 class="font-bold text-sm text-stone-100"><?= htmlspecialchars($b['name']) ?></h3>
                                        <p class="text-xs text-amber-500"><?= htmlspecialchars($b['specialty']) ?></p>
                                        <div class="flex items-center gap-3 text-[11px] text-stone-400 mt-1">
                                            <span>📱 <?= htmlspecialchars($b['phone']) ?></span>
                                            <span>🔑 Login: <strong class="text-stone-200"><?= htmlspecialchars($b['login']) ?></strong></span>
                                        </div>
                                    </div>
                                </div>
                                <form method="POST" action="admin.php?tab=barbeiros" onsubmit="return confirm('Deseja excluir este barbeiro?');">
                                    <input type="hidden" name="action" value="delete_barber">
                                    <input type="hidden" name="barberId" value="<?= $b['id'] ?>">
                                    <button type="submit" class="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 text-xs transition-colors">
                                        Remover
                                    </button>
                                </form>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- Formulário: Adicionar Barbeiro -->
                <div class="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl h-fit">
                    <h2 class="text-lg font-bold text-stone-100 mb-1">Novo Barbeiro</h2>
                    <p class="text-xs text-stone-400 mb-5">Adicione um profissional à equipe</p>

                    <form method="POST" action="admin.php?tab=barbeiros" class="space-y-3.5">
                        <input type="hidden" name="action" value="add_barber">

                        <div>
                            <label class="block text-xs font-medium text-stone-300 mb-1">Nome Completo *</label>
                            <input type="text" name="name" required placeholder="Ex: Felipe Ramos" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                        </div>

                        <div>
                            <label class="block text-xs font-medium text-stone-300 mb-1">Especialidades</label>
                            <input type="text" name="specialty" placeholder="Ex: Fade Navalhado e Barba Terapia" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                        </div>

                        <div>
                            <label class="block text-xs font-medium text-stone-300 mb-1">Telefone / WhatsApp</label>
                            <input type="tel" name="phone" placeholder="(11) 99888-1122" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-xs font-medium text-stone-300 mb-1">Login de Acesso *</label>
                                <input type="text" name="login" required placeholder="Ex: felipe" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-stone-300 mb-1">Senha (padrão: 123)</label>
                                <input type="text" name="password" value="123" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-medium text-stone-300 mb-1">Foto (URL)</label>
                            <input type="url" name="avatar" placeholder="https://..." class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                        </div>

                        <button type="submit" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow">
                            Cadastrar Barbeiro
                        </button>
                    </form>
                </div>
            </div>
        <?php endif; ?>

        <!-- ABA 3: SERVIÇOS & PREÇOS -->
        <?php if ($activeTab === 'servicos'): ?>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Lista de Serviços -->
                <div class="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl">
                    <h2 class="text-lg font-bold text-stone-100 mb-1">Serviços Oferecidos</h2>
                    <p class="text-xs text-stone-400 mb-6">Tabela de procedimentos disponíveis para os clientes</p>

                    <div class="space-y-3.5">
                        <?php foreach ($services as $s): ?>
                            <div class="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-4">
                                <div>
                                    <div class="flex items-center gap-3">
                                        <h3 class="font-bold text-sm text-stone-100"><?= htmlspecialchars($s['name']) ?></h3>
                                        <span class="text-xs font-bold text-emerald-400">R$ <?= number_format($s['price'], 2, ',', '.') ?></span>
                                    </div>
                                    <p class="text-xs text-stone-400 mt-1"><?= htmlspecialchars($s['description']) ?></p>
                                    <span class="text-[11px] text-stone-500 mt-1 block">⏱ Duração: <?= intval($s['duration']) ?> min</span>
                                </div>
                                <form method="POST" action="admin.php?tab=servicos" onsubmit="return confirm('Deseja excluir este serviço?');">
                                    <input type="hidden" name="action" value="delete_service">
                                    <input type="hidden" name="serviceId" value="<?= $s['id'] ?>">
                                    <button type="submit" class="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 text-xs transition-colors">
                                        Remover
                                    </button>
                                </form>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- Formulário: Adicionar Serviço -->
                <div class="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl h-fit">
                    <h2 class="text-lg font-bold text-stone-100 mb-1">Novo Serviço</h2>
                    <p class="text-xs text-stone-400 mb-5">Cadastre um novo corte ou procedimento</p>

                    <form method="POST" action="admin.php?tab=servicos" class="space-y-3.5">
                        <input type="hidden" name="action" value="add_service">

                        <div>
                            <label class="block text-xs font-medium text-stone-300 mb-1">Nome do Serviço *</label>
                            <input type="text" name="name" required placeholder="Ex: Barboterapia Especial" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                        </div>

                        <div>
                            <label class="block text-xs font-medium text-stone-300 mb-1">Descrição</label>
                            <input type="text" name="description" placeholder="Ex: Toalha quente e massagem facial" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-xs font-medium text-stone-300 mb-1">Preço (R$) *</label>
                                <input type="number" step="0.5" name="price" required placeholder="50.00" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-stone-300 mb-1">Duração (minutos)</label>
                                <input type="number" name="duration" value="30" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100">
                            </div>
                        </div>

                        <button type="submit" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow">
                            Adicionar Serviço
                        </button>
                    </form>
                </div>
            </div>
        <?php endif; ?>

        <!-- ABA 4: CONFIGURAÇÕES -->
        <?php if ($activeTab === 'configuracoes'): ?>
            <div class="max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <h2 class="text-lg font-bold text-stone-100 mb-1">Configurações da Barbearia</h2>
                <p class="text-xs text-stone-400 mb-6">Informações gerais salvas no arquivo JSON</p>

                <form method="POST" action="admin.php?tab=configuracoes" class="space-y-4">
                    <input type="hidden" name="action" value="save_settings">

                    <div>
                        <label class="block text-xs font-medium text-stone-300 mb-1">Nome da Barbearia</label>
                        <input type="text" name="shopName" value="<?= htmlspecialchars($settings['shopName'] ?? '') ?>" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-100">
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-stone-300 mb-1">Endereço Completo</label>
                        <input type="text" name="address" value="<?= htmlspecialchars($settings['address'] ?? '') ?>" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-100">
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-stone-300 mb-1">Telefone / WhatsApp de Contato</label>
                        <input type="text" name="phone" value="<?= htmlspecialchars($settings['phone'] ?? '') ?>" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-100">
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-stone-300 mb-1">Abertura</label>
                            <input type="time" name="openTime" value="<?= htmlspecialchars($settings['openTime'] ?? '08:00') ?>" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-stone-300 mb-1">Fechamento</label>
                            <input type="time" name="closeTime" value="<?= htmlspecialchars($settings['closeTime'] ?? '19:30') ?>" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-stone-300 mb-1">Intervalo (min)</label>
                            <input type="number" name="slotInterval" value="<?= intval($settings['slotInterval'] ?? 30) ?>" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100">
                        </div>
                    </div>

                    <div class="pt-4">
                        <button type="submit" class="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow">
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        <?php endif; ?>

    </main>

    <footer class="py-4 text-center text-xs text-stone-500 border-t border-stone-900">
        <?= htmlspecialchars($shopName) ?> &bull; Painel de Administração em PHP Puro
    </footer>
</body>
</html>
