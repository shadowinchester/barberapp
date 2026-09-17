(function () {
  const api = (route, options = {}) => fetch(`./api.php?route=${encodeURIComponent(route)}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  }).then(async response => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Não foi possível salvar");
    return body;
  });

  const weekdays = [
    [1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [7, "Dom"]
  ];
  let users = [];
  let panelOpen = false;
  let agendaDismissed = false;

  function currentUser() {
    try { return JSON.parse(localStorage.getItem("barber_current_user") || "null"); } catch (_) { return null; }
  }

  function style(element, values) {
    Object.assign(element.style, values);
    return element;
  }

  function makeButton(text, onClick, extraStyle = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    style(button, { background: "#f59e0b", color: "#1c1917", border: "0", borderRadius: "10px", padding: "9px 13px", fontWeight: "700", cursor: "pointer", fontSize: "12px", ...extraStyle });
    button.addEventListener("click", onClick);
    return button;
  }

  function closePanel() {
    panelOpen = false;
    document.getElementById("monthly-panel")?.remove();
  }

  async function loadUsers() {
    users = await api("users");
    renderPanel();
  }

  function renderPanel() {
    const panel = document.getElementById("monthly-panel");
    if (!panel) return;
    const clients = users.filter(user => user.role === "cliente");
    panel.innerHTML = "";
    const dialog = style(document.createElement("div"), { background: "#1c1917", border: "1px solid #44403c", borderRadius: "16px", width: "min(900px, 100%)", maxHeight: "90vh", overflow: "auto", padding: "22px", color: "#f5f5f4", boxShadow: "0 20px 60px #0009" });

    const header = style(document.createElement("div"), { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "18px" });
    const headInfo = document.createElement("div");
    headInfo.innerHTML = '<h2 style="margin:0 0 5px;font-size:20px">Planos mensais</h2><p style="margin:0;color:#a8a29e;font-size:12px">Configure mensalistas, cortes por mês, dias permitidos e expiração.</p>';
    const close = document.createElement("button"); close.textContent = "×"; close.title = "Fechar"; style(close, { background: "transparent", color: "#a8a29e", border: 0, fontSize: "26px", cursor: "pointer" }); close.onclick = closePanel; header.append(headInfo, close); dialog.append(header);

    const summaryBar = style(document.createElement("div"), { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "10px", marginBottom: "16px" });
    const monthlyCount = clients.filter(c => c.planType === "monthly").length;
    const expiringSoon = clients.filter(c => c.planType === "monthly" && c.expirationDate && c.expirationDate < new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10)).length;
    const cards = [
      ["Mensalistas", monthlyCount],
      ["Expira em 30 dias", expiringSoon],
      ["Clientes totais", clients.length]
    ];
    cards.forEach(([label, value]) => {
      const card = style(document.createElement("div"), { border: "1px solid #3f3f46", borderRadius: "12px", background: "#0f172a", padding: "12px 14px" });
      card.innerHTML = `<div style="font-size:11px;color:#a8a29e;letter-spacing:0.08em;text-transform:uppercase">${label}</div><div style="font-size:24px;font-weight:800;margin-top:6px;color:#f8fafc">${value}</div>`;
      summaryBar.append(card);
    });
    dialog.append(summaryBar);

    const searchWrap = style(document.createElement("div"), { marginBottom: "14px" });
    const searchLabel = style(document.createElement("label"), { display: "block", fontSize: "11px", color: "#a8a29e", marginBottom: "6px" });
    searchLabel.textContent = "Buscar cliente";
    const searchInput = document.createElement("input");
    searchInput.placeholder = "Digite nome ou telefone";
    style(searchInput, { width: "100%", boxSizing: "border-box", background: "#111827", border: "1px solid #374151", borderRadius: "10px", color: "#f8fafc", padding: "10px 12px" });
    searchWrap.append(searchLabel, searchInput);
    dialog.append(searchWrap);

    const list = style(document.createElement("div"), { display: "grid", gap: "10px" });
    const visibleClients = clients.filter(client => {
      const text = `${client.name || ""} ${client.phone || ""}`.toLowerCase();
      return text.includes((searchInput.value || "").toLowerCase());
    });

    visibleClients.forEach(user => {
      const card = style(document.createElement("div"), { border: "1px solid #44403c", borderRadius: "12px", padding: "13px", background: "#0c0a09" });
      const active = user.planType === "monthly";
      const statusText = active ? "MENSALISTA" : "AVULSO";
      const days = user.monthlyDays || [1, 2, 3, 4, 5, 6];
      const expiration = user.expirationDate || "sem expiração";
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><strong>${user.name}</strong><div style="font-size:11px;color:#a8a29e">${user.phone || "Sem telefone"}</div></div><span style="color:${active ? "#fbbf24" : "#78716c"};font-size:11px">${statusText}</span></div>`;

      const controls = style(document.createElement("div"), { display: "grid", gridTemplateColumns: "140px 1fr 1fr auto", gap: "10px", alignItems: "end", marginTop: "12px" });
      const plan = document.createElement("select"); plan.innerHTML = '<option value="standard">Cliente avulso</option><option value="monthly">Mensalista</option>'; plan.value = active ? "monthly" : "standard"; style(plan, { background: "#292524", color: "#f5f5f4", border: "1px solid #57534e", borderRadius: "8px", padding: "8px", fontSize: "12px" });
      const creditLabel = document.createElement("label"); creditLabel.textContent = "Cortes / mês"; style(creditLabel, { color: "#a8a29e", fontSize: "11px" });
      const credits = document.createElement("input"); credits.type = "number"; credits.min = "0"; credits.max = "99"; credits.value = user.monthlyCredits || 0; style(credits, { display: "block", width: "100%", boxSizing: "border-box", marginTop: "4px", background: "#292524", color: "#f5f5f4", border: "1px solid #57534e", borderRadius: "8px", padding: "8px" }); creditLabel.append(credits);
      const expirationInput = document.createElement("input"); expirationInput.type = "date"; expirationInput.value = user.expirationDate || ""; style(expirationInput, { display: "block", width: "100%", boxSizing: "border-box", marginTop: "4px", background: "#292524", color: "#f5f5f4", border: "1px solid #57534e", borderRadius: "8px", padding: "8px" });
      const expirationLabel = document.createElement("label"); expirationLabel.textContent = "Expiração"; style(expirationLabel, { color: "#a8a29e", fontSize: "11px" }); expirationLabel.append(expirationInput);
      const save = makeButton("Salvar", async () => {
        save.disabled = true;
        try {
          const updated = await api(`users/${encodeURIComponent(user.id)}`, {
            method: "PUT",
            body: JSON.stringify({
              planType: plan.value,
              monthlyCredits: Number(credits.value),
              monthlyDays: [...daysWrap.querySelectorAll("input:checked")].map(input => Number(input.value)),
              expirationDate: expirationInput.value || null
            })
          });
          users = users.map(item => item.id === updated.user.id ? { ...item, ...updated.user } : item);
          renderPanel();
        } catch (error) {
          alert(error.message);
          save.disabled = false;
        }
      });
      controls.append(plan, creditLabel, expirationLabel, save);
      card.append(controls);

      const daysWrap = style(document.createElement("div"), { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "11px" });
      weekdays.forEach(([value, label]) => {
        const item = document.createElement("label");
        style(item, { fontSize: "11px", color: "#d6d3d1", border: "1px solid #57534e", borderRadius: "7px", padding: "5px 7px", cursor: "pointer" });
        const input = document.createElement("input"); input.type = "checkbox"; input.value = value; input.checked = days.includes(value); input.style.marginRight = "4px"; item.append(input, label); daysWrap.append(item);
      });
      const summary = style(document.createElement("div"), { color: "#a8a29e", fontSize: "11px", marginTop: "10px" });
      summary.textContent = `Dias permitidos: ${days.map(day => weekdays.find(item => item[0] === day)?.[1]).filter(Boolean).join(", ") || "nenhum"} • Expiração: ${expiration}`;
      card.append(daysWrap, summary); list.append(card);
    });

    if (!visibleClients.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nenhum cliente encontrado com esse filtro.";
      empty.style.color = "#a8a29e";
      list.append(empty);
    }

    searchInput.addEventListener("input", () => renderPanel());
    dialog.append(list); panel.append(dialog);
  }

  function openPanel() {
    if (panelOpen) return;
    panelOpen = true;
    const panel = style(document.createElement("div"), { position: "fixed", inset: "0", zIndex: "9999", background: "#000b", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" });
    panel.id = "monthly-panel"; panel.addEventListener("click", event => { if (event.target === panel) closePanel(); }); document.body.append(panel); loadUsers().catch(error => { alert(error.message); closePanel(); });
  }

  function renderClientCredit(user) {
    const old = document.getElementById("monthly-credit-summary");
    if (old) old.remove();
    if (!user || user.role !== "cliente" || user.planType !== "monthly") return;
    api("data").then(data => {
      const month = new Date().toISOString().slice(0, 7);
      const used = (data.appointments || []).filter(item => item.clientUserId === user.id && item.monthlyCredit && item.status !== "cancelado" && item.date.startsWith(month)).length;
      const remaining = Math.max(0, Number(user.monthlyCredits || 0) - used);
      const summary = style(document.createElement("div"), { margin: "12px auto", maxWidth: "720px", padding: "13px 16px", border: "1px solid #f59e0b66", borderRadius: "12px", background: "#451a03", color: "#fef3c7", fontSize: "13px" });
      summary.id = "monthly-credit-summary"; summary.innerHTML = `<strong>Plano mensal</strong><br>${remaining} corte(s) restante(s) neste mês. Agendamentos permitidos: ${(user.monthlyDays || []).map(day => weekdays.find(item => item[0] === day)?.[1]).join(", ") || "nenhum dia configurado"}.`;
      document.getElementById("root")?.prepend(summary);
    }).catch(() => {});
  }

  function makeAgendaPanel(autoOpen = false) {
    const user = currentUser();
    if (!user || !["admin", "barbeiro"].includes(user.role)) return;
    if (document.getElementById("agenda-mensal-panel")) return;

    const scheduleTab = document.getElementById("barber-tab-schedule");
    let scheduleHeader = scheduleTab?.parentElement;
    while (scheduleHeader && !scheduleHeader.querySelector("#btn-open-manual-appointment-modal")) {
      scheduleHeader = scheduleHeader.parentElement;
    }
    const scheduleContent = scheduleHeader?.nextElementSibling;
    if (!scheduleContent) return;

    const openPanel = () => {
      const existing = document.getElementById("agenda-mensal-panel");
      if (existing) return;

      const root = document.createElement("div");
      root.id = "agenda-mensal-panel";
      style(root, { width: "100%", maxWidth: "1180px", margin: "24px auto 0", padding: "0 16px", boxSizing: "border-box" });

      const box = style(document.createElement("section"), { width: "100%", padding: "20px 0 0", boxSizing: "border-box", color: "#f5f5f4" });

      const title = style(document.createElement("div"), { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid #292524" });
      title.innerHTML = '<div><h3 style="margin:0;font-size:16px;color:#f5f5f4">Visão mensal</h3><p style="margin:4px 0 0;color:#78716c;font-size:12px">Todos os horários da agenda atual, organizados por barbeiro.</p></div>';
      const collapse = document.createElement("button"); collapse.textContent = "−"; collapse.title = "Recolher visão mensal"; style(collapse, { background: "transparent", border: "1px solid #44403b", borderRadius: "8px", cursor: "pointer", color: "#a8a29e", width: "32px", height: "30px", fontSize: "20px", lineHeight: "1" }); title.append(collapse); box.append(title);

      const controls = style(document.createElement("div"), { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", alignItems: "end", marginBottom: "18px", padding: "12px", background: "#0c0a09", border: "1px solid #44403b", borderRadius: "12px" });
      const dateFilter = document.getElementById("filter-date-input");
      const statusFilter = document.getElementById("filter-status-select");
      const monthInput = document.createElement("input"); monthInput.type = "month"; monthInput.value = new Date().toISOString().slice(0, 7); monthInput.style.display = "none";
      const barberSelect = document.createElement("select"); style(barberSelect, { background: "#292524", color: "#f5f5f4", border: "1px solid #57534e", borderRadius: "8px", padding: "8px 10px", minWidth: "180px" });
      if (user.role === "barbeiro") {
        barberSelect.style.display = "none";
      }

      const refresh = makeButton("Atualizar lista", async () => {
        const data = await api("data");
        renderList(data.appointments || [], data.barbers || []);
      }, { width: "100%" });
      const completedButton = makeButton("Concluídos", () => {
        if (!statusFilter) return;
        statusFilter.value = "concluido";
        statusFilter.dispatchEvent(new Event("change", { bubbles: true }));
      }, { width: "100%", background: "#064e3b", color: "#a7f3d0", border: "1px solid #047857" });

      const summaryWrap = style(document.createElement("div"), { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px", marginBottom: "16px" });
      const listWrap = style(document.createElement("div"), { display: "grid", gap: "10px" });
      let showSelectedDay = false;

      const renderList = (appointments, barbersList) => {
        const chosenMonth = dateFilter?.value?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const chosenDate = dateFilter?.value || new Date().toISOString().slice(0, 10);
        const chosenStatus = statusFilter?.value || "all";
        const filterBarber = user.role === "barbeiro" ? (user.barberId || "") : barberSelect.value;
        const filtered = (appointments || []).filter(item => {
          if (!item.date) return false;
          if (showSelectedDay ? item.date !== chosenDate : chosenMonth && !item.date.startsWith(chosenMonth)) return false;
          if (user.role === "barbeiro" && item.barberId !== (user.barberId || "")) return false;
          if (filterBarber && item.barberId !== filterBarber) return false;
          if (chosenStatus !== "all" && item.status !== chosenStatus) return false;
          return true;
        }).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

        summaryWrap.innerHTML = "";
        if (user.role === "admin") {
          const monthAppointments = (appointments || []).filter(item => item.date && item.date.startsWith(chosenMonth));
          const totalCard = style(document.createElement("div"), { background: "#1c1917", border: "1px solid #292524", borderRadius: "12px", padding: "10px 12px" });
          totalCard.innerHTML = `<div style="font-size:10px;color:#78716c;text-transform:uppercase;letter-spacing:.06em">Total do mês</div><strong style="display:block;margin-top:5px;font-size:20px;color:#f5f5f4">${monthAppointments.length}</strong>`;
          summaryWrap.append(totalCard);
          barbersList.forEach(barber => {
            const barberTotal = monthAppointments.filter(item => item.barberId === barber.id).length;
            const card = style(document.createElement("div"), { background: "#1c1917", border: "1px solid #292524", borderRadius: "12px", padding: "10px 12px" });
            card.innerHTML = `<div style="font-size:10px;color:#78716c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${barber.name}">${barber.name}</div><strong style="display:block;margin-top:5px;font-size:20px;color:#fbbf24">${barberTotal}</strong><span style="font-size:10px;color:#78716c">agendamento(s)</span>`;
            summaryWrap.append(card);
          });
        }

        listWrap.innerHTML = "";
        if (!filtered.length) {
          listWrap.innerHTML = '<div style="background:#1c191766;border:1px solid #44403b;border-radius:16px;padding:48px 24px;text-align:center"><div style="width:44px;height:44px;margin:0 auto 12px;border:1px solid #57534e;border-radius:12px;display:grid;place-items:center;color:#78716c;font-size:20px">[ ]</div><h3 style="margin:0;color:#d6d3d1;font-size:16px;font-weight:700">Nenhum agendamento encontrado</h3><p style="margin:6px auto 0;max-width:320px;color:#78716c;font-size:12px;line-height:1.5">Não há horários marcados para este mês com os filtros selecionados.</p><button type="button" data-clear-agenda-filters style="margin-top:16px;background:#f99c00;color:#1c1917;border:0;border-radius:10px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer">Limpar filtros</button></div>';
          listWrap.querySelector("[data-clear-agenda-filters]").addEventListener("click", () => {
            if (dateFilter) dateFilter.value = new Date().toISOString().slice(0, 10);
            if (user.role === "admin") barberSelect.value = "";
            api("data").then(data => renderList(data.appointments || [], data.barbers || []));
          });
          return;
        }

        const grouped = {};
        filtered.forEach(item => {
          const barberKey = item.barberId || "sem-barbeiro";
          if (!grouped[barberKey]) grouped[barberKey] = [];
          grouped[barberKey].push(item);
        });

        const barberKeys = Object.keys(grouped);
        barberKeys.forEach(barberKey => {
          const barberName = barbersList.find(b => b.id === barberKey)?.name || "Barbeiro";
          const section = style(document.createElement("div"), { display: "grid", gap: "12px" });
          const titleBar = style(document.createElement("div"), { display: "flex", justifyContent: user.role === "admin" ? "space-between" : "flex-end", fontSize: "12px", fontWeight: "700", color: "#a8a29e", borderBottom: "1px solid #292524", paddingBottom: "7px", marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.04em" });
          titleBar.innerHTML = user.role === "admin" ? `<span>${barberName}</span><span style="color:#78716c;font-weight:500;text-transform:none;letter-spacing:0">${grouped[barberKey].length} agendamento(s)</span>` : `<span style="color:#78716c;font-weight:500;text-transform:none;letter-spacing:0">${grouped[barberKey].length} agendamento(s)</span>`;
          section.append(titleBar);

          grouped[barberKey].forEach(item => {
            const row = style(document.createElement("div"), { border: "1px solid #292524", borderRadius: "16px", padding: "16px", background: "#1c1917", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" });
            const statusColors = { confirmado: "#22c55e", pendente: "#f59e0b", concluido: "#60a5fa", cancelado: "#f87171" };
            const isToday = item.date === new Date().toISOString().slice(0, 10);
            const phone = (item.clientPhone || "").replace(/\D/g, "");
            const reminderDate = new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR");
            const message = encodeURIComponent(`Olá ${item.clientName}! Aqui é da barbearia. Este é um lembrete do seu horário de ${item.serviceName} hoje, ${reminderDate}, às ${item.time}. Esperamos você!`);
            const whatsapp = phone && isToday ? `<a href="https://api.whatsapp.com/send?phone=55${phone}&text=${message}" target="_blank" rel="noreferrer" style="background:#065f46;color:#6ee7b7;border:1px solid #047857;border-radius:10px;padding:7px 10px;font-size:11px;font-weight:600;text-decoration:none;white-space:nowrap">WhatsApp</a>` : "";
            row.innerHTML = `
              <div style="width:64px;height:64px;flex:0 0 64px;border-radius:12px;background:#0c0a09;border:1px solid #292524;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <strong style="font-size:15px;color:#f5f5f4">${item.time}</strong><span style="font-size:10px;color:#78716c">${item.date.slice(8,10)}/${item.date.slice(5,7)}</span>
              </div>
              <div style="flex:1;min-width:180px;">
                <div>
                  <div style="font-weight:700;font-size:15px">${item.clientName}</div>
                  <div style="font-size:12px;color:#a8a29e;margin-top:4px">${item.serviceName} • ${item.clientPhone}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                  <span style="background:${statusColors[item.status] || '#94a3b8'};color:#111827;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:700;text-transform:uppercase">${item.status}</span>
                  ${item.monthlyCredit ? '<span style="background:#f59e0b;color:#1f2937;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:700">Mensalista</span>' : ''}
                    ${whatsapp}
              </div>
            `;
              const actions = style(document.createElement("div"), { width: "100%", display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "12px", borderTop: "1px solid #292524" });
              const reload = () => api("data").then(data => renderList(data.appointments || [], data.barbers || []));
              const actionButton = (label, action, buttonStyle) => {
                const button = document.createElement("button");
                button.type = "button";
                button.textContent = label;
                style(button, { border: "1px solid #44403b", borderRadius: "9px", padding: "7px 10px", cursor: "pointer", fontSize: "11px", fontWeight: "600", ...buttonStyle });
                button.addEventListener("click", async () => {
                  button.disabled = true;
                  try { await action(); await reload(); } catch (error) { alert(error.message); button.disabled = false; }
                });
                return button;
              };
              if (item.status !== "concluido" && item.status !== "cancelado") {
                actions.append(actionButton("Concluir", () => api(`appointments/${encodeURIComponent(item.id)}/status`, { method: "PATCH", body: JSON.stringify({ status: "concluido" }) }), { background: "#064e3b", color: "#a7f3d0", borderColor: "#047857" }));
              }
              if (item.status !== "cancelado" && item.status !== "concluido") {
                actions.append(actionButton("Cancelar", () => api(`appointments/${encodeURIComponent(item.id)}/status`, { method: "PATCH", body: JSON.stringify({ status: "cancelado" }) }), { background: "#450a0a", color: "#fca5a5", borderColor: "#991b1b" }));
              }
              if (item.status !== "cancelado") {
                actions.append(actionButton("Alterar horário", async () => {
                  const date = prompt("Nova data (AAAA-MM-DD):", item.date);
                  if (date === null) return;
                  const time = prompt("Novo horário (HH:MM):", item.time);
                  if (time === null) return;
                  await api(`appointments/${encodeURIComponent(item.id)}`, { method: "PUT", body: JSON.stringify({ date: date.trim(), time: time.trim() }) });
                }, { background: "#292524", color: "#f5f5f4", borderColor: "#57534e" }));
              }
              row.append(actions);
            section.append(row);
          });

          listWrap.append(section);
        });
      };

      api("data").then(data => {
        const barbers = data.barbers || [];
        barberSelect.innerHTML = '<option value="">Todos os barbeiros</option>' + barbers.map(barber => `<option value="${barber.id}">${barber.name}</option>`).join("");
        if (user.role === "barbeiro") barberSelect.value = user.barberId || "";
        renderList(data.appointments || [], barbers);
      }).catch(() => {
        listWrap.innerHTML = '<div style="background:#1c191766;border:1px solid #44403b;border-radius:16px;padding:32px 24px;text-align:center;color:#a8a29e;font-size:13px">Não foi possível carregar a agenda. Tente atualizar a lista.</div>';
      });

      dateFilter?.addEventListener("change", () => {
        showSelectedDay = true;
        api("data").then(data => renderList(data.appointments || [], data.barbers || []));
      });
      const todayButton = document.getElementById("filter-date-today-btn");
      todayButton?.addEventListener("click", () => {
        showSelectedDay = true;
        setTimeout(() => api("data").then(data => renderList(data.appointments || [], data.barbers || [])), 0);
      });
      statusFilter?.addEventListener("change", () => api("data").then(data => renderList(data.appointments || [], data.barbers || [])));
      barberSelect.addEventListener("change", () => api("data").then(data => renderList(data.appointments || [], data.barbers || [])));
      controls.append(monthInput, barberSelect, completedButton, refresh);
      box.append(controls, summaryWrap, listWrap);
      root.append(box);
      const monthlyHost = document.getElementById("admin-monthly-tab-content");
      (monthlyHost || scheduleContent).append(root);
      scheduleContent.querySelectorAll("h3").forEach(heading => {
        if (heading.textContent.trim() === "Nenhum agendamento encontrado") {
          let emptyState = heading.parentElement;
          while (emptyState && !emptyState.className.includes("bg-stone-900/40")) emptyState = emptyState.parentElement;
          emptyState?.remove();
        }
      });
      let collapsed = false;
      collapse.addEventListener("click", () => {
        collapsed = !collapsed;
        controls.style.display = collapsed ? "none" : "grid";
        listWrap.style.display = collapsed ? "none" : "grid";
        collapse.textContent = collapsed ? "+" : "−";
        collapse.title = collapsed ? "Expandir visão mensal" : "Recolher visão mensal";
      });
    };
    if (autoOpen) {
      openPanel();
    }
  }

  function makeAdminReport() {
    const user = currentUser();
    if (!user || user.role !== "admin" || document.getElementById("admin-business-report")) return;
    const agenda = document.getElementById("agenda-mensal-panel");
    if (!agenda?.parentElement) return;

    const report = style(document.createElement("section"), { width: "100%", marginTop: "28px", padding: "20px 0 8px", borderTop: "1px solid #292524", color: "#f5f5f4" });
    report.id = "admin-business-report";
    const heading = style(document.createElement("div"), { display: "flex", justifyContent: "space-between", alignItems: "end", gap: "12px", marginBottom: "16px", flexWrap: "wrap" });
    heading.innerHTML = '<div><h3 style="margin:0;font-size:18px;color:#f5f5f4">Saúde do negócio</h3><p style="margin:5px 0 0;color:#78716c;font-size:12px">Indicadores operacionais para acompanhar o desempenho da barbearia.</p></div><span style="font-size:11px;color:#a8a29e">Relatório mensal</span>';
    report.append(heading);

    const filters = style(document.createElement("div"), { display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" });
    const monthLabel = style(document.createElement("span"), { color: "#78716c", fontSize: "11px" });
    filters.append(monthLabel);
    const metrics = style(document.createElement("div"), { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px" });
    const body = style(document.createElement("div"), { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" });
    report.append(filters, metrics, body);
    const monthlyHost = document.getElementById("admin-monthly-tab-content");
    (monthlyHost || agenda.parentElement).append(report);

    const dateFilter = document.getElementById("filter-date-input");
    const render = data => {
      const month = dateFilter?.value?.slice(0, 7) || new Date().toISOString().slice(0, 7);
      const monthItems = (data.appointments || []).filter(item => item.date?.startsWith(month));
      const status = key => monthItems.filter(item => item.status === key).length;
      const completed = status("concluido");
      const canceled = status("cancelado");
      const active = monthItems.filter(item => item.status !== "cancelado");
      const revenue = monthItems.filter(item => item.status === "concluido").reduce((sum, item) => sum + Number(item.servicePrice || 0), 0);
      const completionRate = active.length ? Math.round((completed / active.length) * 100) : 0;
      const monthName = new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      monthLabel.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      metrics.innerHTML = "";
      const metric = (label, value, detail, color) => {
        const card = style(document.createElement("div"), { background: "#1c1917", border: "1px solid #292524", borderRadius: "14px", padding: "13px 14px" });
        card.innerHTML = `<div style="font-size:10px;color:#78716c;text-transform:uppercase;letter-spacing:.06em">${label}</div><strong style="display:block;margin-top:6px;font-size:24px;color:${color}">${value}</strong><span style="display:block;margin-top:3px;font-size:11px;color:#a8a29e">${detail}</span>`;
        metrics.append(card);
      };
      metric("Agendamentos", monthItems.length, "volume total no mês", "#f5f5f4");
      metric("Concluídos", completed, `${completionRate}% dos não cancelados`, "#60a5fa");
      metric("Cancelados", canceled, monthItems.length ? `${Math.round((canceled / monthItems.length) * 100)}% do volume` : "sem registros", "#f87171");
      metric("Receita realizada", `R$ ${revenue.toFixed(2).replace(".", ",")}`, "serviços concluídos", "#fbbf24");

      const countsBy = (items, getter) => {
        const counts = {};
        items.forEach(item => { const key = getter(item); counts[key] = (counts[key] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
      };
      const panel = (title, subtitle, rows, formatLabel) => {
        const card = style(document.createElement("div"), { background: "#0c0a09", border: "1px solid #292524", borderRadius: "14px", padding: "15px" });
        card.innerHTML = `<h4 style="margin:0;color:#d6d3d1;font-size:13px">${title}</h4><p style="margin:4px 0 14px;color:#78716c;font-size:11px">${subtitle}</p>`;
        if (!rows.length) { card.innerHTML += '<div style="color:#78716c;font-size:12px;padding:12px 0">Sem dados para este período.</div>'; body.append(card); return; }
        const max = rows[0][1];
        rows.slice(0, 6).forEach(([label, value]) => {
          const line = style(document.createElement("div"), { marginTop: "10px" });
          line.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#a8a29e"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${formatLabel(label)}</span><strong style="color:#f5f5f4">${value}</strong></div>`;
          const track = style(document.createElement("div"), { height: "6px", marginTop: "5px", background: "#292524", borderRadius: "999px", overflow: "hidden" });
          const bar = style(document.createElement("div"), { width: `${Math.max(8, (value / max) * 100)}%`, height: "100%", background: "#f99c00", borderRadius: "999px" });
          track.append(bar); line.append(track); card.append(line);
        });
        body.append(card);
      };

      body.innerHTML = "";
      panel("Desempenho por barbeiro", "Volume total e produtividade no período", countsBy(monthItems, item => item.barberName || item.barberId || "Sem barbeiro"), value => value);
      panel("Horários de pico", "Faixas com maior concentração de agendamentos", countsBy(monthItems, item => item.time || "Sem horário"), value => value);
      panel("Dias de maior fluxo", "Datas que exigem mais capacidade operacional", countsBy(monthItems, item => item.date || "Sem data"), value => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }));
      panel("Status da operação", "Leitura rápida da saúde da agenda", [["Concluídos", completed], ["Confirmados", status("confirmado")], ["Pendentes", status("pendente")], ["Cancelados", canceled]], value => value);
    };

    api("data").then(render).catch(() => { body.innerHTML = '<div style="color:#fca5a5;font-size:12px">Não foi possível carregar o relatório.</div>'; });
    dateFilter?.addEventListener("change", () => api("data").then(render));
  }

  function makeAdminMonthlyTab() {
    const user = currentUser();
    const oldTab = document.getElementById("barber-tab-monthly-report");
    if (!user || user.role !== "admin") {
      oldTab?.remove();
      return;
    }
    const scheduleTab = document.getElementById("barber-tab-schedule");
    let header = scheduleTab?.parentElement;
    while (header && !header.querySelector("#btn-open-manual-appointment-modal")) header = header.parentElement;
    const manualButton = document.getElementById("btn-open-manual-appointment-modal");
    const scheduleContent = header?.nextElementSibling;
    const tabStrip = scheduleTab?.parentElement;
    if (!header || !manualButton || !scheduleContent) return;

    let content = document.getElementById("admin-monthly-tab-content");
    if (!content) {
      content = style(document.createElement("div"), { display: "none", width: "100%" });
      content.id = "admin-monthly-tab-content";
      scheduleContent.insertAdjacentElement("afterend", content);
    }
    if (!oldTab) {
      const tab = makeButton("Relatório mensal", () => {
        content.style.display = content.style.display === "none" ? "block" : "none";
        if (content.style.display === "block") {
          scheduleContent.style.display = "none";
          tabStrip?.querySelectorAll("button").forEach(button => button.classList.remove("bg-amber-500", "text-stone-950", "shadow-sm"));
          tab.classList.add("bg-amber-500", "text-stone-950", "shadow-sm");
          tab.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          scheduleContent.style.display = "";
          tab.classList.remove("bg-amber-500", "text-stone-950", "shadow-sm");
        }
      }, { background: "#1c1917", color: "#d6d3d1", border: "1px solid #44403b", borderRadius: "12px", padding: "8px 13px", fontSize: "12px", fontWeight: "600" });
      tab.id = "barber-tab-monthly-report";
      tab.setAttribute("aria-label", "Mostrar relatório e visão mensal");
      manualButton.insertAdjacentElement("afterend", tab);
    }
    header.querySelectorAll("button:not(#barber-tab-monthly-report)").forEach(button => {
      if (button.dataset.monthlyNavigationBound) return;
      button.dataset.monthlyNavigationBound = "true";
      button.addEventListener("click", () => {
        content.style.display = "none";
        scheduleContent.style.display = "";
        document.getElementById("barber-tab-monthly-report")?.classList.remove("bg-amber-500", "text-stone-950", "shadow-sm");
      });
    });
  }

  function sync() {
    const user = currentUser();
    const canManage = user && (user.role === "admin" || user.role === "barbeiro");
    const teamTab = document.getElementById("barber-tab-team");
    if (teamTab) {
      const canEditBarbers = user?.role === "admin";
      teamTab.style.display = canEditBarbers ? "" : "none";
      if (!canEditBarbers && teamTab.classList.contains("bg-amber-500")) {
        document.getElementById("barber-tab-schedule")?.click();
      }
    }
    const rawJsonTab = document.getElementById("barber-tab-raw-json");
    if (rawJsonTab) {
      rawJsonTab.style.display = "none";
      if (rawJsonTab.classList.contains("bg-amber-500")) document.getElementById("barber-tab-schedule")?.click();
    }
    makeAdminMonthlyTab();
    const originalBarberFilter = document.getElementById("filter-barber-select");
    if (originalBarberFilter) {
      const isBarber = user?.role === "barbeiro";
      originalBarberFilter.style.display = isBarber ? "none" : "";
      if (isBarber && user.barberId && originalBarberFilter.value !== user.barberId) {
        originalBarberFilter.value = user.barberId;
        originalBarberFilter.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    const originalDateFilter = document.getElementById("filter-date-input");
    if (originalDateFilter) originalDateFilter.style.display = "none";
    document.querySelectorAll("h3").forEach(heading => {
      if (heading.textContent.trim() !== "Nenhum agendamento encontrado") return;
      let emptyState = heading.parentElement;
      while (emptyState && typeof emptyState.className === "string" && !emptyState.className.includes("bg-stone-900/40")) emptyState = emptyState.parentElement;
      emptyState?.remove();
    });
    if (canManage) {
      const trigger = document.getElementById("monthly-trigger");
      if (!trigger) {
        const button = makeButton("Planos mensais", openPanel, { position: "fixed", right: "18px", bottom: "72px", zIndex: "2001", boxShadow: "0 8px 25px #0008" });
        button.id = "monthly-trigger";
        document.body.append(button);
      }
      if (!document.getElementById("agenda-mensal-panel") && !agendaDismissed) makeAgendaPanel(true);
      if (user.role === "admin") makeAdminReport();
    } else {
      document.getElementById("monthly-trigger")?.remove();
      document.getElementById("agenda-mensal-panel")?.remove();
    }
    renderClientCredit(user);
  }

  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
  setInterval(sync, 1500);
  sync();
})();
