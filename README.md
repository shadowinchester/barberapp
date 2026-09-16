# Barbearia Dom Navalha - Sistema Web de Agendamento e Gestão

Sistema completo de agendamento online, controle de atendimentos e gestão de barbearia com persistência em arquivo JSON.

---

## 🔑 Credenciais de Acesso ao Sistema

Todas as contas abaixo já estão cadastradas e prontas para uso no arquivo `data/barber_data.json`.

### 👑 Administrador Geral
*Acesso irrestrito a todos os módulos: Gestão da Equipe de Barbeiros, Serviços e Preços, Horários de Funcionamento e Agenda Geral.*

| Perfil | Usuário / Login | Senha | WhatsApp / Telefone |
| :--- | :--- | :--- | :--- |
| **Admin** | **`admin`** | **`admin`** | (11) 99999-9999 |

---

### ✂️ Barbeiros da Equipe
*Acesso à sua própria agenda de cortes diários, bloqueio de horários e acompanhamento de faturamento.*

| Barbeiro | Especialidade | Usuário / Login | Senha | WhatsApp |
| :--- | :--- | :--- | :--- | :--- |
| **Rodrigo 'Navalha' Silva** | Degradê, Barboterapia e Desenhos | **`rodrigo`** | **`123`** | (11) 99111-2233 |
| **Marcos Andrade** | Cortes Clássicos e Barba Italiana | **`marcos`** | **`123`** | (11) 99222-3344 |
| **Gabriel Santos** | Coloração, Platinado e Barba | **`gabriel`** | **`123`** | (11) 99333-4455 |

---

### 👤 10 Clientes Cadastrados
*Podem acessar informando o número do WhatsApp ou o usuário, consultar seus agendamentos e marcar novos cortes.*

| # | Nome do Cliente | Usuário / Login | Senha | WhatsApp / Celular |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **Lucas Oliveira** | `lucas` | `123` | (11) 99888-7766 |
| 2 | **Mateus Henrique Costa** | `mateus` | `123` | (11) 98123-4567 |
| 3 | **Bruno Fernando Lima** | `bruno` | `123` | (11) 97234-5678 |
| 4 | **Thiago Martins Alves** | `thiago` | `123` | (11) 96345-6789 |
| 5 | **Felipe Augusto Rocha** | `felipe` | `123` | (11) 95456-7890 |
| 6 | **Rafael Nogueira Souza** | `rafael` | `123` | (11) 94567-8901 |
| 7 | **Diego Moreira Duarte** | `diego` | `123` | (11) 93678-9012 |
| 8 | **Guilherme Ramos Castro** | `guilherme` | `123` | (11) 92789-0123 |
| 9 | **Leonardo Barros Pires** | `leonardo` | `123` | (11) 91890-1234 |
| 10 | **Vinícius Ribeiro Mendes** | `vinicius` | `123` | (11) 98901-2345 |

> **Observação:** Qualquer cliente também pode clicar em **"Novo por aqui?"** na tela de login para se cadastrar em 10 segundos apenas informando Nome e WhatsApp.

---

## 🚀 Como Hospedar

Você pode hospedar o projeto de duas formas:

### Opção 1: Servidor Node.js / VPS / Docker / Cloud Run (Recomendado)
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Gere a compilação de produção:
   ```bash
   npm run build
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
O servidor rodará na porta `3000` (ou na variável `PORT` do seu ambiente).

---

### Opção 2: Hospedagem Compartilhada (cPanel / Hostinger / Apache com PHP)
1. Execute `npm run build` para gerar a pasta `dist/`.
2. Envie os arquivos da pasta `dist/` para a raiz `public_html` da sua hospedagem.
3. Envie o diretório `data/` com o arquivo `barber_data.json` garantindo permissão de escrita (`chmod 775` ou `chmod 777`).
4. Envie o script `php/api.php` para a hospedagem.

---

## 📁 Estrutura dos Dados (`data/barber_data.json`)
Todos os dados do sistema são mantidos no arquivo `data/barber_data.json`:
- `settings`: Horários de funcionamento, intervalo dos slots, endereço e WhatsApp da barbearia.
- `barbers`: Lista de barbeiros da equipe, fotos e especialidades.
- `services`: Serviços cadastrados, duração e valores.
- `appointments`: Agendamentos efetuados com data, horário, cliente e barbeiro.
- `blockedSlots`: Bloqueios pontuais de horários ou folgas.
- `users`: Usuários do sistema (admin, barbeiros e clientes com senhas).
