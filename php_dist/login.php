<?php
require_once __DIR__ . '/db.php';

$error = '';
$success = '';
$activeTab = $_GET['tab'] ?? 'login'; // 'login' ou 'cadastro'
$selectedRole = $_GET['role'] ?? 'cliente'; // 'cliente', 'barbeiro', 'admin'

if (isset($_GET['msg']) && $_GET['msg'] === 'desconectado') {
    $success = 'Você saiu do sistema com sucesso.';
}

// Processar formulário de Login
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['action']) && $_POST['action'] === 'do_login') {
    $role = $_POST['role'] ?? 'cliente';
    $selectedRole = $role;
    $credential = trim(strtolower($_POST['credential'] ?? ''));
    $password = trim($_POST['password'] ?? '');
    $cleanDigits = preg_replace('/\D/', '', $credential);

    $db = getDB();
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
        $error = 'Usuário não encontrado para o perfil selecionado. Verifique os dados digitados.';
    } else {
        $userPass = $matchedUser['password'] ?? '';
        if ($userPass !== '' && $userPass !== $password) {
            $error = 'Senha incorreta. Tente novamente.';
        } else {
            // Login com sucesso!
            $_SESSION['user'] = [
                'id' => $matchedUser['id'],
                'name' => $matchedUser['name'],
                'phone' => $matchedUser['phone'] ?? '',
                'login' => $matchedUser['login'] ?? '',
                'role' => $matchedUser['role'],
                'barberId' => $matchedUser['barberId'] ?? null
            ];

            if ($matchedUser['role'] === 'admin') {
                header("Location: admin.php");
            } elseif ($matchedUser['role'] === 'barbeiro') {
                header("Location: barbeiro.php");
            } else {
                header("Location: index.php?msg=bem-vindo");
            }
            exit;
        }
    }
}

// Processar formulário de Cadastro rápido de cliente
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['action']) && $_POST['action'] === 'do_register') {
    $activeTab = 'cadastro';
    $name = trim($_POST['name'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $password = trim($_POST['password'] ?? '123');

    if (empty($name) || empty($phone)) {
        $error = 'Por favor, informe seu Nome completo e WhatsApp.';
    } else {
        $db = getDB();
        $cleanDigits = preg_replace('/\D/', '', $phone);
        
        // Verifica se já existe
        $existing = null;
        foreach ($db['users'] as $u) {
            $userDigits = preg_replace('/\D/', '', $u['phone'] ?? '');
            if ($userDigits && $userDigits === $cleanDigits) {
                $existing = $u;
                break;
            }
        }

        if ($existing) {
            $_SESSION['user'] = [
                'id' => $existing['id'],
                'name' => $existing['name'],
                'phone' => $existing['phone'],
                'login' => $existing['login'] ?? '',
                'role' => 'cliente'
            ];
            header("Location: index.php?msg=bem-vindo");
            exit;
        }

        $loginGen = strtolower(explode(' ', $name)[0]) . rand(10, 99);
        $newUser = [
            'id' => 'u-c-' . time(),
            'name' => $name,
            'phone' => $phone,
            'login' => $loginGen,
            'password' => $password ?: '123',
            'role' => 'cliente',
            'createdAt' => date('c')
        ];

        $db['users'][] = $newUser;
        saveDB($db);

        $_SESSION['user'] = [
            'id' => $newUser['id'],
            'name' => $newUser['name'],
            'phone' => $newUser['phone'],
            'login' => $newUser['login'],
            'role' => 'cliente'
        ];

        header("Location: index.php?msg=cadastrado");
        exit;
    }
}

$db = getDB();
$settings = $db['settings'] ?? [];
$shopName = $settings['shopName'] ?? 'Barbearia Dom navalha';
?>
<!DOCTYPE html>
<html lang="pt-BR" class="h-full bg-stone-950">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Entrar - <?= htmlspecialchars($shopName) ?></title>
    <!-- Tailwind CSS via CDN oficial (funciona em qualquer hospedagem gratuita sem compilar) -->
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

    <!-- Topo / Header minimalista -->
    <header class="border-b border-stone-800 bg-stone-900/80 px-4 py-3 sm:px-6">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
            <a href="index.php" class="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors font-bold text-lg">
                <svg class="w-6 h-6 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.242 4.242 3 3 0 004.242-4.242zm0-5.758a3 3 0 10-4.242-4.242 3 3 0 004.242 4.242z"></path>
                </svg>
                <span><?= htmlspecialchars($shopName) ?></span>
            </a>
            <a href="index.php" class="text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Voltar aos Cortes
            </a>
        </div>
    </header>

    <!-- Conteúdo Central -->
    <main class="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div class="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            
            <div class="text-center mb-6">
                <div class="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                </div>
                <h2 class="text-xl font-bold text-stone-100">Área de Acesso</h2>
                <p class="text-xs text-stone-400 mt-1">Selecione seu perfil para entrar ou agendar</p>
            </div>

            <?php if (!empty($error)): ?>
                <div class="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <svg class="w-4 h-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span><?= htmlspecialchars($error) ?></span>
                </div>
            <?php endif; ?>

            <?php if (!empty($success)): ?>
                <div class="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <svg class="w-4 h-4 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <span><?= htmlspecialchars($success) ?></span>
                </div>
            <?php endif; ?>

            <!-- Abas: Entrar / Novo Cadastro -->
            <div class="grid grid-cols-2 gap-1 p-1 bg-stone-950 border border-stone-800 rounded-xl mb-6">
                <button type="button" onclick="switchTab('login')" id="tab-btn-login" class="py-2 text-xs font-semibold rounded-lg transition-all <?= $activeTab === 'login' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200' ?>">
                    Já sou cadastrado
                </button>
                <button type="button" onclick="switchTab('cadastro')" id="tab-btn-cadastro" class="py-2 text-xs font-semibold rounded-lg transition-all <?= $activeTab === 'cadastro' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200' ?>">
                    Novo por aqui?
                </button>
            </div>

            <!-- FORMULÁRIO 1: LOGIN -->
            <div id="section-login" class="<?= $activeTab === 'login' ? '' : 'hidden' ?>">
                <form method="POST" action="login.php" class="space-y-4">
                    <input type="hidden" name="action" value="do_login">
                    <input type="hidden" name="role" id="input-role" value="<?= htmlspecialchars($selectedRole) ?>">

                    <!-- Seletor de Perfil -->
                    <div>
                        <label class="block text-xs font-medium text-stone-400 mb-2">Quem está acessando?</label>
                        <div class="grid grid-cols-3 gap-2">
                            <button type="button" onclick="selectRole('cliente')" id="role-btn-cliente" class="p-2.5 rounded-xl border text-center transition-all <?= $selectedRole === 'cliente' ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold' : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700' ?>">
                                <span class="block text-base mb-0.5">👤</span>
                                <span class="text-[11px] block">Cliente</span>
                            </button>
                            <button type="button" onclick="selectRole('barbeiro')" id="role-btn-barbeiro" class="p-2.5 rounded-xl border text-center transition-all <?= $selectedRole === 'barbeiro' ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold' : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700' ?>">
                                <span class="block text-base mb-0.5">✂️</span>
                                <span class="text-[11px] block">Barbeiro</span>
                            </button>
                            <button type="button" onclick="selectRole('admin')" id="role-btn-admin" class="p-2.5 rounded-xl border text-center transition-all <?= $selectedRole === 'admin' ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-semibold' : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700' ?>">
                                <span class="block text-base mb-0.5">👑</span>
                                <span class="text-[11px] block">Admin</span>
                            </button>
                        </div>
                    </div>

                    <!-- Credencial / Telefone / Login -->
                    <div>
                        <label class="block text-xs font-medium text-stone-300 mb-1" id="label-credential">
                            <?= $selectedRole === 'admin' ? 'Usuário do Administrador' : ($selectedRole === 'barbeiro' ? 'Login ou Telefone do Barbeiro' : 'Seu WhatsApp ou Usuário') ?>
                        </label>
                        <input type="text" name="credential" id="input-credential" required placeholder="<?= $selectedRole === 'admin' ? 'admin' : ($selectedRole === 'barbeiro' ? 'rodrigo' : 'Ex: (11) 99888-7766 ou lucas') ?>" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                    </div>

                    <!-- Senha -->
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-xs font-medium text-stone-300">Senha de Acesso</label>
                            <span class="text-[11px] text-stone-500" id="hint-password"><?= $selectedRole === 'admin' ? 'Senha: admin' : 'Padrão: 123' ?></span>
                        </div>
                        <input type="password" name="password" id="input-password" required placeholder="Digite sua senha" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                    </div>

                    <!-- Botão Entrar -->
                    <button type="submit" class="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-500/10 text-sm">
                        Entrar no Sistema
                    </button>
                </form>

                <!-- Botões de Acesso Rápido (DEMO) -->
                <div class="mt-6 pt-5 border-t border-stone-800">
                    <p class="text-[11px] font-semibold text-stone-400 uppercase tracking-wider text-center mb-2.5">
                        Acesso de Teste com 1 Clique:
                    </p>
                    <div class="grid grid-cols-3 gap-2">
                        <button type="button" onclick="quickFill('admin', 'admin', 'admin')" class="py-1.5 px-2 rounded-lg bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-[11px] text-stone-300 hover:text-amber-400 transition-colors">
                            👑 Admin (admin)
                        </button>
                        <button type="button" onclick="quickFill('barbeiro', 'rodrigo', '123')" class="py-1.5 px-2 rounded-lg bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-[11px] text-stone-300 hover:text-amber-400 transition-colors">
                            ✂️ Rodrigo (123)
                        </button>
                        <button type="button" onclick="quickFill('cliente', 'lucas', '123')" class="py-1.5 px-2 rounded-lg bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-[11px] text-stone-300 hover:text-amber-400 transition-colors">
                            👤 Lucas (123)
                        </button>
                    </div>
                </div>
            </div>

            <!-- FORMULÁRIO 2: CADASTRO RÁPIDO DE CLIENTE -->
            <div id="section-cadastro" class="<?= $activeTab === 'cadastro' ? '' : 'hidden' ?>">
                <form method="POST" action="login.php" class="space-y-4">
                    <input type="hidden" name="action" value="do_register">
                    
                    <div>
                        <label class="block text-xs font-medium text-stone-300 mb-1">Seu Nome Completo</label>
                        <input type="text" name="name" required placeholder="Ex: Carlos Eduardo" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-stone-300 mb-1">Seu WhatsApp / Celular</label>
                        <input type="tel" name="phone" required placeholder="(11) 98765-4321" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                        <p class="text-[11px] text-stone-500 mt-1">Usado para identificar e confirmar seus agendamentos.</p>
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-stone-300 mb-1">Crie uma Senha (ou deixe 123)</label>
                        <input type="password" name="password" value="123" placeholder="Sua senha" class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                    </div>

                    <button type="submit" class="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-500/10 text-sm">
                        Cadastrar e Entrar
                    </button>
                </form>
            </div>

        </div>
    </main>

    <!-- Rodapé -->
    <footer class="py-4 text-center text-xs text-stone-500 border-t border-stone-900">
        <?= htmlspecialchars($shopName) ?> &copy; <?= date('Y') ?> &bull; Sistema 100% PHP com Banco em JSON
    </footer>

    <script>
        function switchTab(tab) {
            const secLogin = document.getElementById('section-login');
            const secCad = document.getElementById('section-cadastro');
            const btnLogin = document.getElementById('tab-btn-login');
            const btnCad = document.getElementById('tab-btn-cadastro');

            if (tab === 'login') {
                secLogin.classList.remove('hidden');
                secCad.classList.add('hidden');
                btnLogin.className = 'py-2 text-xs font-semibold rounded-lg transition-all bg-amber-500 text-stone-950 shadow';
                btnCad.className = 'py-2 text-xs font-semibold rounded-lg transition-all text-stone-400 hover:text-stone-200';
            } else {
                secLogin.classList.add('hidden');
                secCad.classList.remove('hidden');
                btnLogin.className = 'py-2 text-xs font-semibold rounded-lg transition-all text-stone-400 hover:text-stone-200';
                btnCad.className = 'py-2 text-xs font-semibold rounded-lg transition-all bg-amber-500 text-stone-950 shadow';
            }
        }

        function selectRole(role) {
            document.getElementById('input-role').value = role;
            const roles = ['cliente', 'barbeiro', 'admin'];
            roles.forEach(r => {
                const btn = document.getElementById('role-btn-' + r);
                if (r === role) {
                    btn.className = 'p-2.5 rounded-xl border text-center transition-all border-amber-500 bg-amber-500/10 text-amber-400 font-semibold';
                } else {
                    btn.className = 'p-2.5 rounded-xl border text-center transition-all border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700';
                }
            });

            const labelCred = document.getElementById('label-credential');
            const inputCred = document.getElementById('input-credential');
            const hintPass = document.getElementById('hint-password');

            if (role === 'admin') {
                labelCred.textContent = 'Usuário do Administrador';
                inputCred.placeholder = 'admin';
                hintPass.textContent = 'Senha: admin';
            } else if (role === 'barbeiro') {
                labelCred.textContent = 'Login ou Telefone do Barbeiro';
                inputCred.placeholder = 'rodrigo ou marcos';
                hintPass.textContent = 'Padrão: 123';
            } else {
                labelCred.textContent = 'Seu WhatsApp ou Usuário';
                inputCred.placeholder = '(11) 99888-7766 ou lucas';
                hintPass.textContent = 'Padrão: 123';
            }
        }

        function quickFill(role, user, pass) {
            switchTab('login');
            selectRole(role);
            document.getElementById('input-credential').value = user;
            document.getElementById('input-password').value = pass;
        }
    </script>
</body>
</html>
