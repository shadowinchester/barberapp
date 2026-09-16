import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data', 'barber_data.json');

// Ensure data directory and file exist with initial schema
function getDatabase() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dataDir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const initialData = {
        settings: {
          shopName: "Barbearia Dom navalha",
          address: "Rua das Palmeiras, 342 - Centro",
          phone: "(11) 98765-4321",
          openTime: "08:00",
          closeTime: "19:30",
          slotInterval: 30,
          lunchStart: "12:00",
          lunchEnd: "13:00",
          workingDays: [1, 2, 3, 4, 5, 6]
        },
        barbers: [
          {
            id: "b1",
            name: "Rodrigo 'Navalha' Silva",
            specialty: "Degradê, Barboterapia e Desenhos",
            phone: "(11) 99111-2233",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
          },
          {
            id: "b2",
            name: "Marcos Andrade",
            specialty: "Cortes Clássicos, Tesoura e Barba Italiana",
            phone: "(11) 99222-3344",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80"
          },
          {
            id: "b3",
            name: "Gabriel Santos",
            specialty: "Coloração, Platinado e Barba Alinhada",
            phone: "(11) 99333-4455",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80"
          }
        ],
        services: [
          {
            id: "s1",
            name: "Corte Degradê / Fade",
            description: "Corte navalhado com acabamento perfeito na lâmina e higienização capilar.",
            duration: 35,
            price: 45.0,
            category: "cabelo",
            active: true
          },
          {
            id: "s2",
            name: "Barba Terapia Completa",
            description: "Toalha quente, óleos essenciais, hidratação profunda e alinhamento com navalha.",
            duration: 30,
            price: 38.0,
            category: "barba",
            active: true
          },
          {
            id: "s3",
            name: "Combo Corte + Barba",
            description: "O combo mais pedido! Corte completo à sua escolha e barboterapia relaxante.",
            duration: 60,
            price: 75.0,
            category: "combo",
            active: true
          },
          {
            id: "s4",
            name: "Corte Tradicional / Tesoura",
            description: "Corte social tradicional trabalhado na tesoura e acabamento impecável.",
            duration: 30,
            price: 40.0,
            category: "cabelo",
            active: true
          },
          {
            id: "s5",
            name: "Sobrancelha na Navalha",
            description: "Desenho e limpeza harmônica dos pelos com navalha descartável.",
            duration: 15,
            price: 18.0,
            category: "extra",
            active: true
          }
        ],
        appointments: [],
        blockedSlots: []
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const db = JSON.parse(raw);
    if (!db.users || !Array.isArray(db.users) || db.users.length === 0) {
      db.users = [
        {
          id: "u-admin",
          name: "Administrador Geral",
          phone: "(11) 99999-9999",
          login: "admin",
          password: "admin",
          role: "admin",
          createdAt: new Date().toISOString()
        },
        {
          id: "u-b1",
          name: "Rodrigo 'Navalha' Silva",
          phone: "(11) 99111-2233",
          login: "rodrigo",
          password: "123",
          role: "barbeiro",
          barberId: "b1",
          createdAt: new Date().toISOString()
        },
        {
          id: "u-b2",
          name: "Marcos Andrade",
          phone: "(11) 99222-3344",
          login: "marcos",
          password: "123",
          role: "barbeiro",
          barberId: "b2",
          createdAt: new Date().toISOString()
        },
        {
          id: "u-b3",
          name: "Gabriel Santos",
          phone: "(11) 99333-4455",
          login: "gabriel",
          password: "123",
          role: "barbeiro",
          barberId: "b3",
          createdAt: new Date().toISOString()
        },
        {
          id: "u-c1",
          name: "Lucas Oliveira",
          phone: "(11) 99888-7766",
          login: "lucas",
          password: "123",
          role: "cliente",
          createdAt: new Date().toISOString()
        }
      ];
      saveDatabase(db);
    }
    return db;
  } catch (err) {
    console.error('Error reading JSON database:', err);
    return { settings: {}, barbers: [], services: [], appointments: [], blockedSlots: [], users: [] };
  }
}

function saveDatabase(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing JSON database:', err);
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Authentication: Login (Admin / Barbeiro / Cliente)
  app.post('/api/auth/login', (req, res) => {
    const db = getDatabase();
    const { role, credential, password } = req.body;

    if (!role || !credential) {
      return res.status(400).json({ error: 'Perfil e credencial (usuário ou telefone) são obrigatórios.' });
    }

    const cleanCred = String(credential).trim().toLowerCase();
    const cleanPhoneDigits = cleanCred.replace(/\D/g, '');

    const users = db.users || [];
    const matchedUser = users.find((u: any) => {
      // Must match role or if admin wants to access
      if (u.role !== role && !(role === 'admin' && u.role === 'admin')) {
        return false;
      }

      const userLogin = (u.login || '').toLowerCase().trim();
      const userPhoneDigits = (u.phone || '').replace(/\D/g, '');

      // Check login name match
      if (userLogin && userLogin === cleanCred) return true;

      // Check phone match
      if (cleanPhoneDigits.length >= 8 && userPhoneDigits.includes(cleanPhoneDigits)) return true;

      // Also match if credential matches name partially for convenience
      if (cleanCred.length > 2 && u.name.toLowerCase().includes(cleanCred)) return true;

      return false;
    });

    if (!matchedUser) {
      if (role === 'cliente') {
        return res.status(404).json({
          error: 'Cliente não encontrado com este telefone ou usuário. Clique em "Novo por aqui?" para se cadastrar!'
        });
      }
      return res.status(401).json({
        error: `Nenhum usuário encontrado para o perfil ${role}. Verifique os dados ou use a demonstração rápida.`
      });
    }

    // Check password if configured
    if (password && matchedUser.password && matchedUser.password !== String(password).trim()) {
      return res.status(401).json({ error: 'Senha incorreta. Tente novamente.' });
    }

    // Return safe user object
    const safeUser = {
      id: matchedUser.id,
      name: matchedUser.name,
      phone: matchedUser.phone,
      login: matchedUser.login || '',
      role: matchedUser.role,
      barberId: matchedUser.barberId,
      createdAt: matchedUser.createdAt
    };

    res.json({ success: true, user: safeUser });
  });

  // Authentication: Register Client ("Novo por aqui?")
  app.post('/api/auth/register-client', (req, res) => {
    const db = getDatabase();
    const { name, phone, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome completo é obrigatório.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Número de telefone / WhatsApp é obrigatório.' });
    }

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 8) {
      return res.status(400).json({ error: 'Por favor, informe um telefone válido com DDD.' });
    }

    db.users = db.users || [];

    // Check if phone already exists
    const existing = db.users.find(
      (u: any) => u.phone && u.phone.replace(/\D/g, '') === cleanPhoneDigits
    );

    if (existing) {
      // Update name if changed
      existing.name = name.trim();
      if (password) existing.password = String(password).trim();
      saveDatabase(db);
      return res.json({
        success: true,
        message: 'Cadastro localizado e atualizado com sucesso!',
        user: {
          id: existing.id,
          name: existing.name,
          phone: existing.phone,
          login: existing.login,
          role: 'cliente',
          createdAt: existing.createdAt
        }
      });
    }

    // Create new client user
    const newClient = {
      id: `u-c-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      login: name.trim().toLowerCase().split(' ')[0] + Math.floor(Math.random() * 100),
      password: password ? String(password).trim() : '123',
      role: 'cliente',
      createdAt: new Date().toISOString()
    };

    db.users.push(newClient);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado com sucesso!',
      user: {
        id: newClient.id,
        name: newClient.name,
        phone: newClient.phone,
        login: newClient.login,
        role: 'cliente',
        createdAt: newClient.createdAt
      }
    });
  });

  // Get users list (for admin dashboard)
  app.get('/api/users', (req, res) => {
    const db = getDatabase();
    const users = (db.users || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      login: u.login,
      role: u.role,
      barberId: u.barberId,
      createdAt: u.createdAt
    }));
    res.json(users);
  });

  // Get full database state
  app.get('/api/data', (req, res) => {
    const db = getDatabase();
    res.json(db);
  });

  // Get services
  app.get('/api/services', (req, res) => {
    const db = getDatabase();
    res.json(db.services || []);
  });

  // Add or update service
  app.post('/api/services', (req, res) => {
    const db = getDatabase();
    const { id, name, description, duration, price, category, active } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
    }

    if (id) {
      // Update
      const index = db.services.findIndex((s: any) => s.id === id);
      if (index !== -1) {
        db.services[index] = {
          ...db.services[index],
          name,
          description: description || '',
          duration: Number(duration) || 30,
          price: Number(price),
          category: category || 'cabelo',
          active: active !== undefined ? active : true
        };
        saveDatabase(db);
        return res.json({ success: true, service: db.services[index] });
      }
    }

    // Create new
    const newService = {
      id: `s-${Date.now()}`,
      name,
      description: description || '',
      duration: Number(duration) || 30,
      price: Number(price),
      category: category || 'cabelo',
      active: true
    };
    db.services.push(newService);
    saveDatabase(db);
    res.status(201).json({ success: true, service: newService });
  });

  // Delete/toggle service
  app.delete('/api/services/:id', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const initialLen = db.services.length;
    db.services = db.services.filter((s: any) => s.id !== id);
    if (db.services.length !== initialLen) {
      saveDatabase(db);
      return res.json({ success: true, message: 'Serviço excluído' });
    }
    res.status(404).json({ error: 'Serviço não encontrado' });
  });

  // Get barbers
  app.get('/api/barbers', (req, res) => {
    const db = getDatabase();
    res.json(db.barbers || []);
  });

  // Create barber (cadastrado pelo Admin)
  app.post('/api/barbers', (req, res) => {
    const db = getDatabase();
    const { name, specialty, phone, avatar, password, login } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e telefone do barbeiro são obrigatórios.' });
    }

    const barberId = `b-${Date.now()}`;
    const cleanLogin = login?.trim().toLowerCase() || name.trim().toLowerCase().split(' ')[0] + Math.floor(Math.random() * 100);

    const newBarber = {
      id: barberId,
      name: name.trim(),
      specialty: specialty?.trim() || 'Cortes Modernos, Navalha e Barba',
      phone: phone.trim(),
      avatar: avatar?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      login: cleanLogin,
      active: true
    };

    db.barbers = db.barbers || [];
    db.barbers.push(newBarber);

    // Synchronize into users for barber login access
    db.users = db.users || [];
    const newBarberUser = {
      id: `u-${barberId}`,
      name: newBarber.name,
      phone: newBarber.phone,
      login: cleanLogin,
      password: password ? String(password).trim() : '123',
      role: 'barbeiro',
      barberId: barberId,
      createdAt: new Date().toISOString()
    };
    db.users.push(newBarberUser);

    saveDatabase(db);
    res.status(201).json({ success: true, barber: newBarber, user: newBarberUser });
  });

  // Update barber (cadastrado pelo Admin)
  app.put('/api/barbers/:id', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { name, specialty, phone, avatar, password, login, active } = req.body;

    const bIndex = (db.barbers || []).findIndex((b: any) => b.id === id);
    if (bIndex === -1) {
      return res.status(404).json({ error: 'Barbeiro não encontrado.' });
    }

    db.barbers[bIndex] = {
      ...db.barbers[bIndex],
      name: name !== undefined ? name.trim() : db.barbers[bIndex].name,
      specialty: specialty !== undefined ? specialty.trim() : db.barbers[bIndex].specialty,
      phone: phone !== undefined ? phone.trim() : db.barbers[bIndex].phone,
      avatar: avatar !== undefined ? avatar.trim() : db.barbers[bIndex].avatar,
      login: login !== undefined ? login.trim().toLowerCase() : db.barbers[bIndex].login,
      active: active !== undefined ? active : db.barbers[bIndex].active
    };

    // Update matching user if found
    db.users = db.users || [];
    const uIndex = db.users.findIndex((u: any) => u.barberId === id);
    if (uIndex !== -1) {
      db.users[uIndex].name = db.barbers[bIndex].name;
      db.users[uIndex].phone = db.barbers[bIndex].phone;
      if (login) db.users[uIndex].login = login.trim().toLowerCase();
      if (password) db.users[uIndex].password = String(password).trim();
    }

    saveDatabase(db);
    res.json({ success: true, barber: db.barbers[bIndex] });
  });

  // Delete barber (Admin)
  app.delete('/api/barbers/:id', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;

    const initialLen = (db.barbers || []).length;
    db.barbers = (db.barbers || []).filter((b: any) => b.id !== id);

    if (db.barbers.length !== initialLen) {
      // Also remove from users
      db.users = (db.users || []).filter((u: any) => u.barberId !== id);
      saveDatabase(db);
      return res.json({ success: true, message: 'Barbeiro removido com sucesso.' });
    }

    res.status(404).json({ error: 'Barbeiro não encontrado.' });
  });

  // Get appointments (supports ?date=YYYY-MM-DD and ?phone=...)
  app.get('/api/appointments', (req, res) => {
    const db = getDatabase();
    let appointments = db.appointments || [];

    const { date, phone, barberId, status } = req.query;
    if (date) {
      appointments = appointments.filter((a: any) => a.date === date);
    }
    if (phone) {
      const cleanSearchPhone = String(phone).replace(/\D/g, '');
      appointments = appointments.filter((a: any) =>
        a.clientPhone.replace(/\D/g, '').includes(cleanSearchPhone)
      );
    }
    if (barberId) {
      appointments = appointments.filter((a: any) => a.barberId === barberId);
    }
    if (status) {
      appointments = appointments.filter((a: any) => a.status === status);
    }

    res.json(appointments);
  });

  // Create appointment
  app.post('/api/appointments', (req, res) => {
    const db = getDatabase();
    const {
      clientName,
      clientPhone,
      serviceId,
      barberId,
      date,
      time,
      notes
    } = req.body;

    if (!clientName || !clientPhone || !serviceId || !barberId || !date || !time) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // Check if slot is already booked for this barber at this date and time
    const conflict = db.appointments.find(
      (a: any) =>
        a.barberId === barberId &&
        a.date === date &&
        a.time === time &&
        a.status !== 'cancelado'
    );

    if (conflict) {
      return res.status(409).json({
        error: 'Este horário já está reservado para este profissional. Por favor, escolha outro horário.'
      });
    }

    // Find service and barber
    const service = db.services.find((s: any) => s.id === serviceId);
    const barber = db.barbers.find((b: any) => b.id === barberId);

    const newAppointment = {
      id: `app-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      serviceId,
      serviceName: service ? service.name : 'Serviço',
      servicePrice: service ? service.price : 0,
      serviceDuration: service ? service.duration : 30,
      barberId,
      barberName: barber ? barber.name : 'Profissional',
      date,
      time,
      status: 'confirmado', // auto confirmed or pendente
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    db.appointments.push(newAppointment);
    saveDatabase(db);

    res.status(201).json({ success: true, appointment: newAppointment });
  });

  // Update appointment status
  app.patch('/api/appointments/:id/status', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pendente', 'confirmado', 'concluido', 'cancelado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const appIndex = db.appointments.findIndex((a: any) => a.id === id);
    if (appIndex === -1) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    db.appointments[appIndex].status = status;
    saveDatabase(db);

    res.json({ success: true, appointment: db.appointments[appIndex] });
  });

  // Delete appointment
  app.delete('/api/appointments/:id', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    const initialLen = db.appointments.length;
    db.appointments = db.appointments.filter((a: any) => a.id !== id);

    if (db.appointments.length !== initialLen) {
      saveDatabase(db);
      return res.json({ success: true, message: 'Agendamento removido' });
    }
    res.status(404).json({ error: 'Agendamento não encontrado' });
  });

  // Blocked slots
  app.get('/api/blocked-slots', (req, res) => {
    const db = getDatabase();
    res.json(db.blockedSlots || []);
  });

  app.post('/api/blocked-slots', (req, res) => {
    const db = getDatabase();
    const { barberId, date, time, reason } = req.body;
    if (!date || !time) {
      return res.status(400).json({ error: 'Data e horário são obrigatórios' });
    }

    const newBlock = {
      id: `block-${Date.now()}`,
      barberId: barberId || 'all',
      date,
      time,
      reason: reason || 'Bloqueio administrativo'
    };

    db.blockedSlots = db.blockedSlots || [];
    db.blockedSlots.push(newBlock);
    saveDatabase(db);

    res.status(201).json({ success: true, blockedSlot: newBlock });
  });

  app.delete('/api/blocked-slots/:id', (req, res) => {
    const db = getDatabase();
    const { id } = req.params;
    db.blockedSlots = (db.blockedSlots || []).filter((b: any) => b.id !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    const db = getDatabase();
    res.json(db.settings || {});
  });

  app.post('/api/settings', (req, res) => {
    const db = getDatabase();
    db.settings = { ...db.settings, ...req.body };
    saveDatabase(db);
    res.json({ success: true, settings: db.settings });
  });

  // Raw JSON export/view endpoint
  app.get('/api/raw-json', (req, res) => {
    const db = getDatabase();
    res.header('Content-Type', 'application/json');
    res.attachment('barber_data.json');
    res.send(JSON.stringify(db, null, 2));
  });

  // Full project ZIP download endpoint
  app.get('/api/download-zip', (req, res) => {
    const zipPath = path.join(process.cwd(), 'barbearia-projeto-completo.zip');
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, 'barbearia-projeto-completo.zip');
    } else {
      res.status(404).json({ error: 'Arquivo ZIP ainda não gerado.' });
    }
  });

  // Spawn PHP built-in server for live preview of pure PHP
  try {
    const phpProc = spawn('php', ['-S', '127.0.0.1:8088', '-t', path.join(process.cwd(), 'php_dist')]);
    phpProc.stdout?.on('data', (d) => console.log(`[PHP-Server] ${d}`));
    phpProc.stderr?.on('data', (d) => console.error(`[PHP-Server] ${d}`));
  } catch (err) {
    console.error('Failed to start PHP server:', err);
  }

  // PHP Proxy middleware: allows testing pure PHP directly in the browser
  app.use(['/php_dist', '/php'], (req, res) => {
    let phpPath = req.url;
    if (!phpPath || phpPath === '/') phpPath = '/index.php';
    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: 8088,
        path: phpPath,
        method: req.method,
        headers: { ...req.headers, host: '127.0.0.1:8088' }
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', (err) => {
      res.status(502).send('PHP server starting up: ' + err.message);
    });
    req.pipe(proxyReq);
  });

  // PHP Puro (InfinityFree) ZIP download endpoint
  app.get(['/api/download-php-zip', '/barbearia-php-sem-pastas.zip', '/barbearia-php-infinityfree.zip', '/download-php.zip', '/download-php-sem-pastas.zip'], (req, res) => {
    const semPastasPath = path.join(process.cwd(), 'barbearia-php-sem-pastas.zip');
    const infinityPath = path.join(process.cwd(), 'barbearia-php-infinityfree.zip');
    const zipPath = fs.existsSync(semPastasPath) ? semPastasPath : infinityPath;
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, 'barbearia-php-sem-pastas.zip');
    } else {
      res.status(404).json({ error: 'Arquivo PHP ZIP ainda não gerado.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BarberApp Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
