import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Server, Database, ExternalLink } from 'lucide-react';

interface PhpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhpModal: React.FC<PhpModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const phpApiCode = `<?php
/**
 * BarberApp - API Backend em PHP com persistência em JSON
 * Salve este arquivo como "api.php" no seu servidor Apache/Nginx (com PHP 7.4 ou 8.x)
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/data/barber_data.json';

// Cria o diretório /data se não existir
if (!file_exists(dirname($dataFile))) {
    mkdir(dirname($dataFile), 0777, true);
}

function getDatabase($file) {
    if (!file_exists($file)) {
        return ["settings" => [], "barbers" => [], "services" => [], "appointments" => [], "blockedSlots" => []];
    }
    $content = file_get_contents($file);
    return json_decode($content, true) ?: [];
}

function saveDatabase($file, $data) {
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$db = getDatabase($dataFile);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

switch ($action) {
    case 'get_data':
        echo json_encode($db);
        break;

    case 'appointments':
        if ($method === 'GET') {
            echo json_encode($db['appointments'] ?? []);
        } elseif ($method === 'POST') {
            // Valida conflito de horário
            foreach ($db['appointments'] as $app) {
                if ($app['barberId'] === $input['barberId'] && $app['date'] === $input['date'] && $app['time'] === $input['time'] && $app['status'] !== 'cancelado') {
                    http_response_code(409);
                    echo json_encode(['error' => 'Horário já reservado para este barbeiro']);
                    exit;
                }
            }
            $newApp = [
                'id' => 'app-' . uniqid(),
                'clientName' => trim($input['clientName']),
                'clientPhone' => trim($input['clientPhone']),
                'serviceId' => $input['serviceId'],
                'serviceName' => $input['serviceName'],
                'servicePrice' => floatval($input['servicePrice']),
                'serviceDuration' => intval($input['serviceDuration']),
                'barberId' => $input['barberId'],
                'barberName' => $input['barberName'],
                'date' => $input['date'],
                'time' => $input['time'],
                'status' => 'confirmado',
                'notes' => $input['notes'] ?? '',
                'createdAt' => date('c')
            ];
            $db['appointments'][] = $newApp;
            saveDatabase($dataFile, $db);
            http_response_code(201);
            echo json_encode(['success' => true, 'appointment' => $newApp]);
        }
        break;

    case 'update_status':
        $id = $input['id'] ?? '';
        $status = $input['status'] ?? '';
        foreach ($db['appointments'] as &$app) {
            if ($app['id'] === $id) {
                $app['status'] = $status;
                saveDatabase($dataFile, $db);
                echo json_encode(['success' => true]);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['error' => 'Não encontrado']);
        break;
}
?>`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-base">Backend PHP + Dados em JSON</h3>
              <p className="text-xs text-stone-400">
                Arquitetura e código PHP pronto para hospedar em qualquer servidor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-stone-300">
          <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Server className="w-4 h-4" />
              Versão 100% PHP Puro SEM PASTAS (InfinityFree / cPanel)
            </div>
            <p className="leading-relaxed">
              Desenvolvemos a versão definitiva em <strong>PHP Puro com dados em JSON sem nenhuma subpasta</strong>!
              Basta enviar os arquivos diretamente para a pasta <strong><code>htdocs/</code></strong> do InfinityFree.
              Não precisa criar pasta <code>data/</code>, não precisa de Node.js e nunca mais terá tela branca!
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <a
                href="/barbearia-php-sem-pastas.zip"
                download="barbearia-php-sem-pastas.zip"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                Baixar ZIP PHP Sem Pastas
              </a>
              <a
                href="/php_dist/index.php"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-400 font-semibold rounded-lg text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir PHP Direto
              </a>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-stone-200">
                Estrutura de Arquivos Plana (Sem Pastas no htdocs):
              </span>
            </div>
            <pre className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-300">
{`htdocs/
├── index.php                 (Página pública de agendamento online)
├── login.php                 (Tela de login para Admin, Barbeiros e Clientes)
├── admin.php                 (Painel de administração e relatórios)
├── barbeiro.php              (Painel de atendimento do barbeiro)
├── meus-agendamentos.php     (Painel histórico de cortes do cliente)
├── db.php                    (Funções nativas de leitura e escrita do JSON)
├── api.php                   (Endpoints de horários livres em JSON)
├── logout.php                (Encerramento seguro de sessão)
├── barber_data.json          (Banco de dados JSON no mesmo diretório!)
└── .htaccess                 (Protege o JSON contra download público)`}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-stone-200">Código do `api.php`:</span>
              <button
                onClick={() => copyToClipboard(phpApiCode, 'php')}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 cursor-pointer text-xs"
              >
                {copied === 'php' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'php' ? 'Copiado!' : 'Copiar Código PHP'}
              </button>
            </div>
            <pre className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-400 max-h-48 overflow-y-auto overflow-x-auto">
              {phpApiCode}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
