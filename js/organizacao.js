    // Usa shared.js para Supabase client
    const ADMIN_EMAILS = (WEDDING_CONFIG.adminEmails || []).map(e => String(e).trim().toLowerCase());

function getGuestPersonCount(g) {
  if (!g) return 0;
  const partnerCount = String(g.partner_name || '').trim() ? 1 : 0;
  const plusOnes = Number(g.plus_ones || 0);
  return 1 + partnerCount + plusOnes;
}

    const ORG_NOTES_TABLE_NAME = 'planner_notes';

    const dashboardState = { 
      tasks: [], 
      guests: [], 
      expenses: [], 
      budgetCategories: [],
      budget: 0,
      savings: 0,
      cachedTimeline: [],
      cachedGuestbookCount: 0,
      taskFilter: 'all', 
      guestFilter: 'all', 
      guestOwnerFilter: 'all',
      vipOnly: false,
      guestSearch: ''
    };

    function togglePlannerModal(s) { 
      const modal = document.getElementById('plannerModal');
      if (!s) {
        document.getElementById('plannerId').value = '';
        document.getElementById('plannerCategory').value = '';
        document.getElementById('plannerAmount').value = '';
        document.getElementById('plannerModalTitle').textContent = 'Orçar Novo Item';
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'items-center', 'justify-center');
      } else {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'items-center', 'justify-center');
        const firstInput = modal.querySelector('input:not([type="hidden"])');
        if (firstInput) firstInput.focus();
      }
    }

    function editPlannerItem(id, cat, amount, spent) {
      document.getElementById('plannerId').value = id;
      document.getElementById('plannerCategory').value = cat;
      document.getElementById('plannerAmount').value = amount;
      document.getElementById('plannerSpent').value = spent || 0;
      document.getElementById('plannerSpent').dataset.originalSpent = spent || 0;
      document.getElementById('plannerModalTitle').textContent = 'Editar Orçamento';
      const modal = document.getElementById('plannerModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex', 'items-center', 'justify-center');
    }

    async function addPlannerItem() {
      const id = document.getElementById('plannerId').value;
      const cat = document.getElementById('plannerCategory').value.trim();
      const amount = document.getElementById('plannerAmount').value;
      const spentInput = document.getElementById('plannerSpent').value;
      const originalSpent = document.getElementById('plannerSpent').dataset.originalSpent || 0;
      
      if (cat && amount) {
        const payload = { category: cat, planned_amount: parseFloat(amount) };
        
        if (id) {
          const { error } = await supabaseClient.from('budget_categories').update(payload).eq('id', id);
          if (error) { console.error('Erro update budget:', error); showToast('Erro ao atualizar orçamento', 'error'); return; }
          showToast('Orçamento atualizado!', 'success');
        } else {
          const { error } = await supabaseClient.from('budget_categories').insert([payload]);
          if (error) { console.error('Erro insert budget:', error); showToast('Erro ao criar item orçado', 'error'); return; }
          showToast('Item orçado!', 'success');
        }

        const newSpent = parseFloat(spentInput);
        const oldSpent = parseFloat(originalSpent);
        if (!isNaN(newSpent) && newSpent !== oldSpent) {
          const diff = newSpent - oldSpent;
          await supabaseClient.from('expenses').insert([{ item: `Ajuste manual (${cat})`, category: cat, amount: diff }]);
          await fetchExpenses();
        }
        
        togglePlannerModal(false);
        fetchBudget();
      }
    }

    async function deletePlannerItem(id) {
      showUndoToast('Item removido', async () => {
        const { error } = await supabaseClient.from('budget_categories').delete().eq('id', id);
        if (error) { console.error('Erro delete budget:', error); showToast('Erro ao remover item', 'error'); return; }
        fetchBudget();
      });
    }

    function renderBudgetPlanner() {
      const list = document.getElementById('plannerList');
      if (!list) return;
      
      const expensesByCategory = {};
      dashboardState.expenses.forEach(e => {
        const c = (e.category || 'Outros').toLowerCase().trim();
        expensesByCategory[c] = (expensesByCategory[c] || 0) + parseFloat(e.amount);
      });

      const suppliersByCategory = {};
      allSuppliers.forEach(s => {
        const c = (s.category || 'Outros').toLowerCase().trim();
        suppliersByCategory[c] = (suppliersByCategory[c] || 0) + (parseFloat(s.value) || 0);
      });

      const allCategories = new Set([
        ...dashboardState.budgetCategories.map(b => b.category.toLowerCase().trim()),
        ...Object.keys(expensesByCategory),
        ...Object.keys(suppliersByCategory)
      ]);

      _budgetStore.clear();
      const items = dashboardState.budgetCategories.map(b => {
        _budgetStore.set(String(b.id), b);
        return b;
      });

      list.innerHTML = Array.from(allCategories).map(cat => {
        const budgetItem = items.find(b => b.category.toLowerCase().trim() === cat);
        const planned = budgetItem ? parseFloat(budgetItem.planned_amount) : 0;
        const spent = expensesByCategory[cat] || 0;
        const supplierVal = suppliersByCategory[cat] || 0;
        // O valor comprometido é o máximo entre o gasto já efetuado (gastos soltos) e o valor total do contrato do fornecedor.
        // Assim, se você lançar o pagamento do fornecedor, ele não duplica o valor do orçamento.
        const committed = Math.max(spent, supplierVal);
        const remaining = planned - committed;
        const percent = planned > 0 ? Math.min(Math.round((committed / planned) * 100), 150) : 0;
        const isOver = remaining < 0;
        const barColor = isOver ? 'bg-rose-500' : committed > 0 ? 'bg-emerald-500' : 'bg-slate-300';

        return `
          <div class="bg-white p-4 rounded-xl border ${isOver ? 'border-rose-200' : 'border-slate-100'} shadow-sm">
            <div class="flex justify-between items-center mb-2">
              <span class="font-bold text-vinho text-sm">${sanitizeHTML(cat.charAt(0).toUpperCase() + cat.slice(1))}</span>
              ${budgetItem ? `<div class="flex gap-2">
                <button data-action="budget-edit" data-id="${sanitizeAttr(budgetItem.id)}" data-spent="${spent}" class="text-slate-400 hover:text-vinho text-xs" title="Editar Orçamento">✏️</button>
                <button data-action="budget-delete" data-id="${sanitizeAttr(budgetItem.id)}" class="text-slate-400 hover:text-red-500 text-xs" title="Excluir Orçamento">✕</button>
              </div>` : `<div class="flex gap-2 items-center">
                <span class="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">sem orçamento</span>
                <button data-action="budget-create-missing" data-cat="${sanitizeAttr(cat)}" data-spent="${spent}" class="text-slate-400 hover:text-vinho text-xs" title="Criar Orçamento">✏️</button>
              </div>`}
            </div>
            <div class="grid grid-cols-3 gap-2 text-center mb-2">
              <div class="bg-dourado/10 rounded-lg p-1.5">
                <p class="text-[9px] uppercase font-bold text-dourado">Orcado</p>
                <p class="text-xs font-bold text-vinho">R$ ${planned.toLocaleString('pt-BR')}</p>
              </div>
              <div class="bg-rose-50 rounded-lg p-1.5">
                <p class="text-[9px] uppercase font-bold text-rose-500">Gasto</p>
                <p class="text-xs font-bold text-rose-600">R$ ${spent.toLocaleString('pt-BR')}</p>
              </div>
              <div class="bg-purple-50 rounded-lg p-1.5">
                <p class="text-[9px] uppercase font-bold text-purple-500">Fornecedores</p>
                <p class="text-xs font-bold text-purple-600">R$ ${supplierVal.toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-[10px] font-bold ${isOver ? 'text-rose-600' : 'text-emerald-600'}">
                ${isOver ? `Negativo: R$ ${Math.abs(remaining).toLocaleString('pt-BR')}` : `Saldo: R$ ${remaining.toLocaleString('pt-BR')}`}
              </span>
              <span class="text-[10px] font-bold text-slate-500">${percent}%</span>
            </div>
            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div class="h-full ${barColor} transition-all" style="width: ${Math.min(percent, 100)}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    function updateCategoryDatalist() {
      const datalist = document.getElementById('categories');
      if (!datalist) return;
      const cats = new Set(dashboardState.budgetCategories.map(b => b.category.trim()));
      ['Fotografia', 'Filmagem', 'Decoração', 'Assessoria', 'Buffet', 'Vestido da Noiva', 'Traje do Noivo', 'Alianças', 'Papelaria e Convites', 'Lembrancinhas', 'Música/Banda', 'Outros'].forEach(c => cats.add(c));
      datalist.innerHTML = Array.from(cats).map(c => `<option value="${sanitizeAttr(c)}"></option>`).join('');
    }

    async function fetchBudget() {
      const { data, error } = await supabaseClient.from('budget_categories').select('*').order('category', { ascending: true });
      if (error) { console.error('Erro fetch budget:', error); return; }
      dashboardState.budgetCategories = data || [];
      renderBudgetPlanner();
      updateCategoryDatalist();
    }

    function renderDocs(docs) {
      const list = document.getElementById('docsList');
      list.innerHTML = docs.length === 0 
        ? '<p class="col-span-full text-center text-slate-500 text-sm py-6">Nenhum documento adicionado.</p>'
        : docs.map(d => `
          <div class="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3">
            <input type="checkbox" data-doc-id="${d.id}" ${d.checked ? 'checked' : ''} class="w-5 h-5 accent-vinho" onchange="toggleDocCheck('${d.id}', this.checked)" />
            <label class="flex-1 cursor-pointer" onclick="toggleDocCheck('${d.id}', !this.previousElementSibling.checked)">
              <p class="font-bold text-sm">${sanitizeHTML(d.name)}</p>
              <p class="text-xs font-medium text-slate-700">${sanitizeHTML(d.description)}</p>
            </label>
            <button data-action="doc-delete" data-id="${d.id}" class="text-red-400 hover:text-red-600 transition-colors p-1" aria-label="Remover documento">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>`).join('');
      if (window.lucide) lucide.createIcons();
    }

    async function loadDocs() {
      const { data, error } = await supabaseClient.from('documents').select('*').order('created_at', { ascending: true });
      if (error) { console.warn('Falha ao carregar documentos:', error.message); return []; }
      renderDocs(data || []);
      return data || [];
    }

    async function toggleDocCheck(id, checked) {
      await supabaseClient.from('documents').update({ checked }).eq('id', id);
      const el = document.querySelector(`[data-doc-id="${id}"]`);
      if (el) el.checked = checked;
    }

    async function addDoc() {
      const nameEl = document.getElementById('newDocName');
      const descEl = document.getElementById('newDocDesc');
      const name = nameEl.value.trim();
      const desc = descEl.value.trim();
      if (!name) { showToastGlobal('Digite o nome do documento', 'error'); return; }
      const { error } = await supabaseClient.from('documents').insert({ name, description: desc, checked: false });
      if (error) { showToastGlobal('Erro ao adicionar: ' + error.message, 'error'); return; }
      nameEl.value = '';
      descEl.value = '';
      await loadDocs();
      showToastGlobal('Documento adicionado!');
    }

    async function deleteDoc(id) {
      showUndoToast('Remover documento?', async () => {
        await supabaseClient.from('documents').delete().eq('id', id);
        await loadDocs();
        showToastGlobal('Documento removido');
      });
    }

    function initEventDelegation() {
      document.addEventListener('click', (e) => {
        if (!e.target || !e.target.closest) return;
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        console.log('[DEBUG] Clique capturado:', action, 'id:', id, '_guestStore size:', _guestStore.size);

        if (action === 'guest-edit') {
          const g = _guestStore.get(id) || Array.from(_guestStore.values()).find(x => String(x.id) === String(id));
          if (g) editGuest(g.id, g.name, g.phone || '', g.invited_by, g.rsvp_status, g.is_vip, g.partner_name || '', g.plus_ones || 0);
        } else if (action === 'guest-delete') {
          deleteGuest(id);
        } else if (action === 'guest-preview') {
          const g = _guestStore.get(id) || Array.from(_guestStore.values()).find(x => String(x.id) === String(id));
          if (g) previewInvite(g.invite_token);
        } else if (action === 'guest-copy') {
          const g = _guestStore.get(id) || Array.from(_guestStore.values()).find(x => String(x.id) === String(id));
          if (g) copyInviteLink(g.invite_token);
        } else if (action === 'guest-whatsapp') {
          const g = _guestStore.get(id) || Array.from(_guestStore.values()).find(x => String(x.id) === String(id));
          if (g) shareInviteWhatsApp(g.name, g.invite_token);
        } else if (action === 'guest-thank') {
          const g = _guestStore.get(id) || Array.from(_guestStore.values()).find(x => String(x.id) === String(id));
          if (g) shareThankYou(g.name);
        } else if (action === 'task-delete') {
          deleteTask(id);
        } else if (action === 'task-calendar') {
          const t = _taskStore.get(id) || Array.from(_taskStore.values()).find(x => String(x.id) === String(id));
          if (t) addToPersonalCalendar(t.title, t.due_date);
        } else if (action === 'task-toggle') {
          const t = _taskStore.get(id) || Array.from(_taskStore.values()).find(x => String(x.id) === String(id));
          if (t) toggleTask(t.id, t.status);
        } else if (action === 'task-edit') {
          const t = _taskStore.get(id) || Array.from(_taskStore.values()).find(x => String(x.id) === String(id));
          if (t) openTaskEditModal(t);
        } else if (action === 'tl-edit') {
          const ev = _timelineStore.get(id) || Array.from(_timelineStore.values()).find(x => String(x.id) === String(id));
          if (ev) editTimelineEvent(ev.id, ev.event_time, ev.description);
        } else if (action === 'tl-delete') {
          deleteTimelineEvent(id);
        } else if (action === 'expense-delete') {
          deleteExpense(id);
        } else if (action === 'expense-edit') {
          const e = _expenseStore.get(id) || Array.from(_expenseStore.values()).find(x => String(x.id) === String(id));
          if (e) openExpenseEditModal(e);
        } else if (action === 'budget-edit') {
          const b = _budgetStore.get(id) || Array.from(_budgetStore.values()).find(x => String(x.id) === String(id));
          const spent = btn.dataset.spent ? parseFloat(btn.dataset.spent) : 0;
          if (b) editPlannerItem(b.id, b.category, b.planned_amount, spent);
        } else if (action === 'budget-create-missing') {
          const cat = btn.dataset.cat;
          const spent = btn.dataset.spent ? parseFloat(btn.dataset.spent) : 0;
          if (cat) editPlannerItem('', cat, 0, spent);
        } else if (action === 'budget-delete') {
          deletePlannerItem(id);
        } else if (action === 'supplier-edit') {
          const s = _supplierStore.get(id) || Array.from(_supplierStore.values()).find(x => String(x.id) === String(id));
          if (s) editSupplier(s.id, s.name, s.contact || '', s.map_link || '', s.category || '', s.value || 0, s.status || 'Pendente');
        } else if (action === 'supplier-delete') {
          deleteSupplier(id);
        } else if (action === 'supplier-pay') {
          paySupplier(id);
        } else if (action === 'mood-delete') {
          deleteMood(id);
        } else if (action === 'doc-delete') {
          deleteDoc(id);
        } else if (action === 'hi-edit') {
          editHomeItem(id);
        } else if (action === 'hi-delete') {
          deleteHomeItem(id);
        } else if (action === 'hi-toggle-status') {
          toggleHomeItemStatus(id);
        }
      });
    }

    let _currentTab = 'dashboard';
    let _guestSearchTimer;

    // Safe data stores for event delegation (XSS prevention)
    const _guestStore = new Map();
    const _taskStore = new Map();
    const _timelineStore = new Map();
    const _expenseStore = new Map();
    const _budgetStore = new Map();
    const _supplierStore = new Map();
    const _moodStore = new Map();
    const _homeItemStore = new Map();
    function handleGuestSearch(q) {
      clearTimeout(_guestSearchTimer);
      _guestSearchTimer = setTimeout(() => {
        dashboardState.guestSearch = q.toLowerCase();
        renderGuestList();
      }, 300);
    }

    function setGuestFilter(f) {
      dashboardState.guestFilter = f;
      ['all', 'confirmado', 'aguardando', 'recusado', 'with-partner', 'with-plus'].forEach(id => {
        const btn = document.getElementById(`guest-filter-${id}`);
        if (btn) {
          btn.classList.toggle('bg-vinho', id === f);
          btn.classList.toggle('text-white', id === f);
          if (id !== f) { btn.classList.add('bg-white', 'text-slate-600'); btn.classList.remove('bg-vinho', 'text-white'); }
        }
      });
      renderGuestList();
    }

    function setGuestOwnerFilter(o) {
      dashboardState.guestOwnerFilter = o;
      ['all', 'Jefferson', 'Bia'].forEach(id => {
        const btn = document.getElementById(`owner-filter-${id}`);
        if (btn) {
          btn.classList.toggle('bg-vinho', id === o);
          btn.classList.toggle('text-white', id === o);
          if (id !== o) { btn.classList.add('bg-slate-100', 'text-slate-800'); btn.classList.remove('bg-vinho', 'text-white'); }
        }
      });
      renderGuestList();
    }
    let allGuests = [], allSuppliers = [];
    let expenseChart, categoryChart, accessChart, inviterChart, rsvpChart, dashDonutChart;

    async function initApp() {
      try {
        const results = await Promise.allSettled([fetchSettings(), fetchTasks(), fetchGuests(), fetchExpenses(), fetchLogs(), loadNotesFromSupabase(), fetchTimeline(), fetchBudget(), fetchSuppliers(), loadDocs(), fetchHomeItems()]);
        results.forEach((r, i) => { if (r.status === 'rejected') console.error('Fetch error:', r.reason); });
        updateExpenseStats();
        initEventDelegation();
        updateOverviewStats(); updateDashboardSummary();
        initRealtime();
        const hashTab = location.hash.slice(1);
        const validTabs = ['dashboard', 'tasks', 'guests', 'expenses', 'notes', 'audit', 'analytics', 'suppliers', 'docs', 'home-items'];
        switchTab(validTabs.includes(hashTab) ? hashTab : 'dashboard');
        if (window.lucide) lucide.createIcons();
      } catch (err) { console.error("Erro setup:", err); }
    }

    function openOrgApp(user) {
      document.getElementById('accessGate').classList.add('gate-hidden');
      document.getElementById('orgApp').classList.remove('gate-hidden');
      if (user?.email) {
        const email = user.email.toLowerCase();
        const adminUser = (WEDDING_CONFIG.adminUsers || []).find(
          u => String(u.email).toLowerCase() === email
        );
        const username = adminUser?.username || user.email.split('@')[0];
        const displayName = username.charAt(0).toUpperCase() + username.slice(1);
        const loggedEl = document.getElementById('loggedUser');
        if (loggedEl) loggedEl.textContent = displayName;
      }
      initApp();
    }

    async function logout() {
      try {
        await supabaseClient.auth.signOut();
      } catch (err) {
        console.error('Erro logout:', err);
      }
      window.location.reload();
    }

    function isAdminUser(user) {
      if (!user?.email) return false;
      const email = String(user.email).trim().toLowerCase();
      if (ADMIN_EMAILS.length === 0) return true;
      return ADMIN_EMAILS.includes(email);
    }

    function resolveAdminEmail(input) {
      const value = String(input || '').trim();
      if (!value) return '';
      const lower = value.toLowerCase();
      if (lower.includes('@')) return value;
      const match = (WEDDING_CONFIG.adminUsers || []).find((u) => String(u.username).toLowerCase() === lower);
      return match ? match.email : '';
    }

    // Helper para registrar auditoria
    async function logAudit(tableName, recordId, action, oldData = null, newData = null) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const userName = user?.user_metadata?.username || user?.email || 'Sistema';
        await supabaseClient.from('audit_logs').insert([{
          table_name: tableName,
          record_id: recordId,
          action: action,
          user_name: userName,
          old_data: oldData,
          new_data: newData
        }]);
      } catch (err) {
        console.warn('Falha ao registrar auditoria:', err);
      }
    }

    document.getElementById('accessForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('accessError');
      const submitBtn = document.getElementById('accessSubmit');
      const identifier = document.getElementById('accessEmail').value.trim();
      const password = document.getElementById('accessPassword').value.trim();

      if (!SUPABASE_URL || !SUPABASE_KEY || !supabaseClient) {
        errorEl.textContent = 'Não foi possível iniciar o acesso. Atualize a página e tente novamente.';
        return;
      }

      if (!identifier || !password) {
        errorEl.textContent = 'Informe usuário ou e-mail e senha.';
        return;
      }

      const email = resolveAdminEmail(identifier);
      if (!email) {
        errorEl.textContent = 'Usuário não encontrado. Use seu e-mail completo.';
        return;
      }

      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Entrando...';

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';

        if (error || !data.user) {
          errorEl.textContent = 'Usuário ou senha inválidos.';
          return;
        }

        if (!isAdminUser(data.user)) {
          errorEl.textContent = 'Acesso restrito aos noivos.';
          await supabaseClient.auth.signOut();
          return;
        }

        openOrgApp(data.user);
      } catch (err) {
        console.error('Erro no login:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
        errorEl.textContent = 'Erro ao conectar. Tente novamente.';
      }
    });

    // Mostrar/ocultar senha
    const togglePassBtn = document.getElementById('togglePass');
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        const passInput = document.getElementById('accessPassword');
        const isHidden = passInput.type === 'password';
        passInput.type = isHidden ? 'text' : 'password';
        togglePassBtn.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
        togglePassBtn.querySelector('i').setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
        if (window.lucide) lucide.createIcons();
      });
    }

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const editModal = document.getElementById('editGuestModal');
        const plannerModal = document.getElementById('plannerModal');
        if (editModal && !editModal.classList.contains('hidden')) toggleEditModal(false);
        if (plannerModal && !plannerModal.classList.contains('hidden')) togglePlannerModal(false);
      }
    });

    // Redefinição de senha — mostra campo de e-mail dedicado
    const forgotPassBtn = document.getElementById('forgotPass');
    if (forgotPassBtn) {
      forgotPassBtn.addEventListener('click', () => {
        document.getElementById('accessForm').classList.add('gate-hidden');
        document.getElementById('forgotForm').classList.remove('gate-hidden');
        document.getElementById('accessError').textContent = '';
        document.getElementById('accessInfo').textContent = '';
      });
    }

    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('accessError');
        const infoEl = document.getElementById('accessInfo');
        const input = document.getElementById('forgotEmail').value.trim();

        if (!input) {
          errorEl.textContent = 'Informe seu e-mail para redefinir a senha.';
          return;
        }

        const email = input.includes('@') ? input : resolveAdminEmail(input);
        if (!email) {
          errorEl.textContent = 'E-mail inválido. Use seu e-mail completo.';
          return;
        }

        errorEl.textContent = '';
        infoEl.textContent = 'Enviando link de redefinição...';

        try {
          const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/organizacao.html',
          });

          if (error) {
            infoEl.textContent = '';
            errorEl.textContent = 'Não foi possível enviar. Tente novamente.';
          } else {
            infoEl.textContent = 'Link enviado! Verifique seu e-mail.';
            document.getElementById('forgotEmail').value = '';
          }
        } catch (err) {
          console.error('Erro ao enviar reset:', err);
          infoEl.textContent = '';
          errorEl.textContent = 'Erro ao conectar. Tente novamente.';
        }
      });
    }

    const forgotBackBtn = document.getElementById('forgotBack');
    if (forgotBackBtn) {
      forgotBackBtn.addEventListener('click', () => {
        document.getElementById('forgotForm').classList.add('gate-hidden');
        document.getElementById('accessForm').classList.remove('gate-hidden');
        document.getElementById('accessError').textContent = '';
        document.getElementById('accessInfo').textContent = '';
      });
    }

    // Fluxo de redefinição de senha: detecta retorno do link do e-mail (PKCE)
    function handleRecoveryRedirect() {
      const q = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const code = q.get('code') || hashParams.get('access_token') || hashParams.get('code');
      const type = q.get('type') || hashParams.get('type');

      if ((type === 'recovery' || type === 'reset_password') && code) {
        document.getElementById('accessForm').classList.add('gate-hidden');
        document.getElementById('forgotForm').classList.add('gate-hidden');
        document.getElementById('resetForm').classList.remove('gate-hidden');
        document.getElementById('accessInfo').textContent = '';
      }
    }

    const submitNewPassBtn = document.getElementById('submitNewPass');
    if (submitNewPassBtn) {
      submitNewPassBtn.addEventListener('click', async () => {
        const p1 = document.getElementById('newPassword').value;
        const p2 = document.getElementById('newPassword2').value;
        const errEl = document.getElementById('resetError');

        if (!p1 || p1.length < 6) {
          errEl.textContent = 'A senha deve ter pelo menos 6 caracteres.';
          return;
        }
        if (p1 !== p2) {
          errEl.textContent = 'As senhas não coincidem.';
          return;
        }

        errEl.textContent = '';
        submitNewPassBtn.disabled = true;
        submitNewPassBtn.textContent = 'Salvando...';

        try {
          const { error } = await supabaseClient.auth.updateUser({ password: p1 });

          submitNewPassBtn.disabled = false;
          submitNewPassBtn.textContent = 'Salvar nova senha';

          if (error) {
            errEl.textContent = 'Não foi possível atualizar a senha.';
            return;
          }

          window.history.replaceState({}, '', window.location.pathname);
          document.getElementById('resetForm').classList.add('gate-hidden');
          document.getElementById('accessForm').classList.remove('gate-hidden');
          const infoEl = document.getElementById('accessInfo');
          infoEl.textContent = 'Senha alterada! Entre com a nova senha.';
          document.getElementById('accessPassword').value = '';
        } catch (err) {
          console.error('Erro ao atualizar senha:', err);
          submitNewPassBtn.disabled = false;
          submitNewPassBtn.textContent = 'Salvar nova senha';
          errEl.textContent = 'Erro ao conectar. Tente novamente.';
        }
      });
    }

    window.addEventListener('load', async () => {
      if (window.lucide) lucide.createIcons();
      handleRecoveryRedirect();

      if (!supabaseClient) {
        document.getElementById('accessError').textContent = 'Não foi possível iniciar o acesso. Atualize a página e tente novamente.';
        return;
      }

      // Restaura sessão existente do Supabase Auth
      try {
        const { data } = await supabaseClient.auth.getSession();
        const sessionUser = data?.session?.user;
        if (sessionUser && isAdminUser(sessionUser)) {
          openOrgApp(sessionUser);
        }
      } catch { /* ignora sessão inválida */ }

      // Register PWA Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      }
    });

    function switchTab(tabId) {
      if (tabId === _currentTab) return;
      const tabs = ['dashboard', 'tasks', 'guests', 'expenses', 'notes', 'audit', 'analytics', 'suppliers', 'docs', 'home-items'];
      tabs.forEach(t => {
        const content = document.getElementById(t);
        const btn = document.getElementById(`btn-${t}`);
        if (content) content.classList.remove('active');
        if (btn) {
          btn.classList.remove('bg-vinho', 'text-white');
          btn.classList.add('bg-white', 'text-slate-600');
          btn.setAttribute('aria-selected', 'false');
        }
      });
      const active = document.getElementById(tabId);
      const activeBtn = document.getElementById(`btn-${tabId}`);
      if (active) active.classList.add('active');
      if (activeBtn) {
        activeBtn.classList.remove('bg-white', 'text-slate-600');
        activeBtn.classList.add('bg-vinho', 'text-white');
        activeBtn.setAttribute('aria-selected', 'true');
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      _currentTab = tabId;
      history.replaceState(null, '', '#' + tabId);
      if (tabId === 'dashboard') updateDashboardSummary();
      if (tabId === 'analytics') updateAnalytics();
      if (tabId === 'suppliers') fetchSuppliers();
      if (tabId === 'notes') fetchMoodLinks();
      if (tabId === 'home-items') fetchHomeItems();
      if (tabId === 'audit') fetchLogs();
      if (window.lucide) lucide.createIcons();
    }

    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1);
      const validTabs = ['dashboard', 'tasks', 'guests', 'expenses', 'notes', 'audit', 'analytics', 'suppliers', 'docs', 'home-items'];
      if (validTabs.includes(hash) && hash !== _currentTab) {
        switchTab(hash);
      }
    });

    function checkNavScroll(el) {
      const wrapper = el.closest('.nav-scroll-wrapper');
      if (!wrapper) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        wrapper.classList.add('no-fade');
      } else {
        wrapper.classList.remove('no-fade');
      }
    }

    // CALENDAR INTEGRATION FOR TASKS
    function addToPersonalCalendar(title, date) {
      if (!date) return;
      const d = new Date(date + 'T08:00:00');
      const end = new Date(d.getTime() + 60 * 60 * 1000);
      const fmt = (dt) => dt.toISOString().replace(/-|:|\.\d\d\d/g, "");
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('CASAMENTO: ' + title)}&dates=${fmt(d)}/${fmt(end)}&details=Lembrete de tarefa do painel de organização.`;
      window.open(url, '_blank');
    }

    // MOODBOARD LOGIC
    async function addMoodLink() {
      const link = document.getElementById('moodLink').value.trim();
      if (!link) return;
      const { data, error } = await supabaseClient.from('moodboard').insert([{ url: link }]).select('id').single();
      if (!error && data?.id) await logAudit('moodboard', data.id, 'INSERT');
      if (error) console.error('Erro mood:', error);
      if (!error) { document.getElementById('moodLink').value = ''; fetchMoodLinks(); }
    }
    async function fetchMoodLinks() {
      const { data } = await supabaseClient.from('moodboard').select('*').order('created_at', { ascending: false });
      const grid = document.getElementById('moodGrid');
      if (!grid) return;
      _moodStore.clear();
      grid.innerHTML = (data || []).map(m => {
        _moodStore.set(String(m.id), m);
        return `
        <div class="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border">
          <img src="${sanitizeAttr(m.url)}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='https://placehold.co/100x100?text=Link'"/>
          <button data-action="mood-delete" data-id="${sanitizeAttr(m.id)}" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">✕</button>
        </div>
      `}).join('');
      if (window.lucide) lucide.createIcons();
    }
    async function deleteMood(id) { 
      showUndoToast('Referência removida', async () => {
        const { error } = await supabaseClient.from('moodboard').delete().eq('id', id); 
        if (error) { console.error('Erro delete mood:', error); showToast('Erro ao remover', 'error'); return; }
        await logAudit('moodboard', id, 'DELETE');
        fetchMoodLinks(); 
      });
    }

    async function fetchTasks() {
      const { data, error } = await supabaseClient.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false });
      if (error) { console.error('Erro fetch tasks:', error); return; }
      dashboardState.tasks = data || [];
      renderTasks();
    }

    function renderTasks() {
      const list = document.getElementById('taskList');
      if (!list) return;
      let filtered = dashboardState.tasks;
      if (dashboardState.taskFilter !== 'all') filtered = filtered.filter(t => {
        if (dashboardState.taskFilter === 'Bia') return t.owner === 'Bia' || t.owner === 'Beatriz';
        return t.owner === dashboardState.taskFilter;
      });
      const now = new Date(); now.setHours(0,0,0,0);
      _taskStore.clear();
      list.innerHTML = filtered.map(t => {
        _taskStore.set(String(t.id), t);
        const isDone = t.status === 'concluido';
        const dueDate = t.due_date ? new Date(t.due_date + 'T12:00:00') : null;
        const isOverdue = !isDone && dueDate && dueDate < now;

        let borderClass = 'border-slate-200';
        if (t.owner === 'Jefferson') borderClass = 'border-blue-400 border-l-4';
        else if (t.owner === 'Bia' || t.owner === 'Beatriz') borderClass = 'border-purple-400 border-l-4';

        let ownerTag = t.owner ? `<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 uppercase ml-2 text-slate-700">${sanitizeHTML(t.owner)}</span>` : '';
        const prioBadge = t.priority === 'alta' ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 ml-1">ALTA</span>' : t.priority === 'baixa' ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 ml-1">BAIXA</span>' : '';
        const dateStr = t.due_date ? `<span class="text-xs font-medium text-slate-700 ml-auto">${new Date(t.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>` : '';
        return `<div class="item-card ${isDone ? 'done opacity-60' : ''} ${isOverdue ? 'bg-red-50 border-red-200' : ''} ${borderClass}"><div class="flex items-center gap-3 flex-1"><input type="checkbox" ${isDone ? 'checked' : ''} data-action="task-toggle" data-id="${sanitizeAttr(t.id)}" /><div class="flex flex-col"><span class="${isDone ? 'line-through' : ''}">${sanitizeHTML(t.title)} ${ownerTag}${prioBadge}</span></div>${dateStr}</div><div class="flex gap-2">${t.due_date ? `<button data-action="task-calendar" data-id="${sanitizeAttr(t.id)}" class="p-1 hover:bg-blue-50 rounded text-xs" title="Agendar">📅</button>` : ''}<button data-action="task-edit" data-id="${sanitizeAttr(t.id)}" class="p-1 px-2 hover:bg-amber-50 rounded text-xs font-bold text-amber-600" title="Editar">✏️</button><button data-action="task-delete" data-id="${sanitizeAttr(t.id)}" class="p-1 hover:bg-red-50 rounded text-xs">🗑️</button></div></div>`;
      }).join('');
    }
    function filterTasks(f) {
      dashboardState.taskFilter = f;
      ['all', 'Jefferson', 'Bia', 'Ambos'].forEach(id => {
        const btn = document.getElementById(`task-filter-${id}`);        if (btn) {
          btn.classList.toggle('bg-vinho', id === f);
          btn.classList.toggle('text-white', id === f);
        }
      });
      renderTasks(); 
    }
    // LAZY LOAD UTILITIES
    const _lazyCache = {};
    function lazyLoad(src) {
      if (_lazyCache[src]) return _lazyCache[src];
      _lazyCache[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
      return _lazyCache[src];
    }
    const LAZY = {
      confetti: 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
      xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
      jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      jspdfAuto: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
    };

    async function toggleTask(id, status) { 
      const next = status === 'concluido' ? 'pendente' : 'concluido'; 
      const { error } = await supabaseClient.from('tasks').update({ status: next }).eq('id', id); 
      if (error) { console.error('Erro toggle task:', error); showToast('Erro ao atualizar tarefa', 'error'); return; }
      if (next === 'concluido') { await lazyLoad(LAZY.confetti); confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#1a1a2e', '#c9a96e', '#f5e6d3'] }); }
      fetchTasks(); 
    }

    function openTaskEditModal(t) {
      document.getElementById('editTaskId').value = t.id;
      document.getElementById('editTaskTitleInput').value = t.title || '';
      document.getElementById('editTaskDate').value = t.due_date || '';
      document.getElementById('editTaskPriority').value = t.priority || 'media';
      document.getElementById('editTaskOwner').value = t.owner || '';
      document.getElementById('editTaskStatus').value = t.status || 'pendente';
      toggleTaskEditModal(true);
    }
    function toggleTaskEditModal(show) {
      const modal = document.getElementById('editTaskModal');
      if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'items-center', 'justify-center');
      } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'items-center', 'justify-center');
      }
    }
    async function saveTaskEdit() {
      const id = document.getElementById('editTaskId').value;
      const payload = {
        title: document.getElementById('editTaskTitleInput').value.trim(),
        due_date: document.getElementById('editTaskDate').value || null,
        priority: document.getElementById('editTaskPriority').value,
        owner: document.getElementById('editTaskOwner').value,
        status: document.getElementById('editTaskStatus').value
      };
      if (!payload.title) { showToast('Digite o título da tarefa', 'error'); return; }
      const { error } = await supabaseClient.from('tasks').update(payload).eq('id', id);
      if (error) { console.error('Erro save task:', error); showToast('Erro ao salvar tarefa', 'error'); return; }
      toggleTaskEditModal(false);
      fetchTasks();
      showToast('Tarefa atualizada!');
    }

    // DASHBOARD SUMMARY LOGIC
    async function updateDashboardSummary() {
      // Tarefas Próximas
      const nextTasks = dashboardState.tasks.filter(t => t.status !== 'concluido').slice(0, 3);
      document.getElementById('dash-next-tasks').innerHTML = nextTasks.length > 0 ? nextTasks.map(t => {
        const ownerColor = t.owner === 'Jefferson' ? 'text-blue-500' : 'text-purple-500';
        return `<div class="p-3 bg-white border border-slate-100 rounded-xl text-xs flex justify-between items-center"><span>${sanitizeHTML(t.title)}</span><span class="font-bold ${ownerColor}">${t.due_date ? new Date(t.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</span></div>`
      }).join('') : '<p class="text-xs font-medium text-slate-700 italic text-center py-4">Tudo em dia!</p>';
      
      // RSVP
      const yes = allGuests.filter(g => g.rsvp_status === 'confirmado').length;
      const no = allGuests.filter(g => g.rsvp_status === 'recusado').length;
      const maybe = allGuests.filter(g => g.rsvp_status === 'aguardando').length;
      document.getElementById('dash-rsvp-yes').textContent = yes;
      document.getElementById('dash-rsvp-maybe').textContent = maybe;
      document.getElementById('dash-rsvp-no').textContent = no;

      // Financeiro
      const budget = dashboardState.budget || getBudgetDefault();
      const spent = dashboardState.expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
      const percent = Math.min(Math.round((spent / budget) * 100), 100);
      document.getElementById('dash-spent').textContent = `R$ ${spent.toLocaleString('pt-BR')}`;
      document.getElementById('dash-budget-progress').style.width = `${percent}%`;
      document.getElementById('dash-budget-percent').textContent = `${percent}%`;

      // Donut Chart Financeiro
      const ctxDonut = document.getElementById('dashDonutChart').getContext('2d');
      if (dashDonutChart) dashDonutChart.destroy();
      
      const cats = {}; dashboardState.expenses.forEach(e => { const c = e.category || 'Outros'; cats[c] = (cats[c] || 0) + parseFloat(e.amount); });
      
      dashDonutChart = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
          labels: Object.keys(cats),
          datasets: [{
            data: Object.values(cats),
            backgroundColor: ['#1a1a2e', '#c9a96e', '#C5A059', '#10b981', '#f59e0b'],
            borderWidth: 0
          }]
        },
        options: { 
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '70%'
        }
      });

      // Evento (usa cache)
      const timeline = dashboardState.cachedTimeline;
      const nextEvent = timeline && timeline[0] ? `<p class="text-sm font-bold text-vinho">${timeline[0].event_time.substring(0,5)}</p><p class="text-xs text-slate-700">${timeline[0].description}</p>` : '<p class="text-xs font-medium text-slate-700 text-center">Nenhum evento no cronograma.</p>';
      document.getElementById('dash-next-event').innerHTML = nextEvent;

      // Mural de Mensagens (Count - usa cache, atualiza a cada 30s)
      if (!dashboardState._guestbookTs || Date.now() - dashboardState._guestbookTs > 30000) {
        const { count } = await supabaseClient.from('guestbook').select('*', { count: 'exact', head: true });
        dashboardState.cachedGuestbookCount = count || 0;
        dashboardState._guestbookTs = Date.now();
      }
      document.getElementById('dash-msg-count').textContent = dashboardState.cachedGuestbookCount;
    }

    // AUTO-SAVE NOTES
    let notesTimeout;
    document.getElementById('meetingNotes').addEventListener('input', () => {
      clearTimeout(notesTimeout);
      document.getElementById('notesStatus').textContent = 'Digitando...';
      notesTimeout = setTimeout(async () => {
        const notes = document.getElementById('meetingNotes').value;
        const { error } = await supabaseClient.from(ORG_NOTES_TABLE_NAME).upsert([{ id: 'global', notes }]);
        if (error) { console.error('Erro save notes:', error); document.getElementById('notesStatus').textContent = 'Erro ao salvar'; return; }
        document.getElementById('notesStatus').textContent = '✓ Salvo automaticamente';
        setTimeout(() => { document.getElementById('notesStatus').textContent = ''; }, 2000);
      }, 1500);
    });
    async function deleteTask(id) { 
      showUndoToast('Tarefa removida', async () => {
        const { error } = await supabaseClient.from('tasks').delete().eq('id', id); 
        if (error) { console.error('Erro delete task:', error); showToast('Erro ao deletar tarefa', 'error'); return; }
        await logAudit('tasks', id, 'DELETE');
        fetchTasks(); 
      });
    }
    async function addTask() {
      const title    = document.getElementById('newTask').value.trim();
      const due_date = document.getElementById('taskDue').value || null;
      const owner    = document.getElementById('taskOwner').value || null;
      const priority = document.getElementById('taskPriority').value || 'media';
      if (!title) { showToast('Informe o título da tarefa!', 'error'); return; }
      const { data, error } = await supabaseClient
        .from('tasks')
        .insert([{ title, status: 'pendente', due_date, owner, priority }])
        .select('id').single();
      if (error) { console.error('Erro add task:', error); showToast('Erro ao adicionar tarefa: ' + (error.message || ''), 'error'); return; }
      if (data?.id) await logAudit('tasks', data.id, 'INSERT', null, { title, status: 'pendente', due_date, owner, priority });
      showToast('Tarefa adicionada! ✅', 'success');
      document.getElementById('newTask').value    = '';
      document.getElementById('taskDue').value    = '';
      document.getElementById('taskOwner').value  = '';
      document.getElementById('taskPriority').value = 'media';
      fetchTasks();
    }

    async function fetchGuests() { 
      const { data, error } = await supabaseClient.from('guests').select('*').order('name', { ascending: true }); 
      if (error) { console.error('Erro fetch guests:', error); return; }
      allGuests = data || []; 
      try { renderGuestList(); } catch(e) { console.error('renderGuestList error:', e); }
      if (_guestValidationVisible) runGuestValidation();
    }

    // ============================================================
    // VALIDADOR DE CONVIDADOS
    // ============================================================
    let _guestValidationVisible = false;

    function toggleGuestValidation() {
      const panel = document.getElementById('guestValidation');
      if (!panel) return;
      _guestValidationVisible = !_guestValidationVisible;
      panel.classList.toggle('hidden', !_guestValidationVisible);
      if (_guestValidationVisible) runGuestValidation();
      if (window.lucide) lucide.createIcons();
    }

    function runGuestValidation() {
      // Normaliza string: minúsculo, sem acentos, espaços normalizados
      const norm = s =>
        String(s || '')
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ').trim();

      const issues = [];

      // 1. Nomes idênticos
      const nameMap = {};
      allGuests.forEach(g => {
        const key = norm(g.name);
        if (!nameMap[key]) nameMap[key] = [];
        nameMap[key].push(g);
      });
      Object.values(nameMap).forEach(group => {
        if (group.length > 1) issues.push({ type: 'name', guests: group });
      });

      // 2. Telefones repetidos (compara últimos 9 dígitos)
      const phoneMap = {};
      allGuests.forEach(g => {
        if (!g.phone) return;
        const digits = g.phone.replace(/\D/g, '');
        if (digits.length < 8) return;
        const key = digits.slice(-9);
        if (!phoneMap[key]) phoneMap[key] = [];
        phoneMap[key].push(g);
      });
      Object.values(phoneMap).forEach(group => {
        if (group.length > 1) issues.push({ type: 'phone', guests: group });
      });

      // 3. Pessoa cadastrada individualmente E como parceiro(a) de outra
      const seen = new Set();
      allGuests.forEach(g => {
        if (!g.partner_name) return;
        const normPartner = norm(g.partner_name);
        const match = allGuests.find(o => o.id !== g.id && norm(o.name) === normPartner);
        if (!match) return;
        const key = [g.id, match.id].sort().join('-');
        if (seen.has(key)) return;
        seen.add(key);
        issues.push({ type: 'partner-dup', host: g, linked: match });
      });

      // 4. Mesmo primeiro nome (possível duplicata)
      const exactIds = new Set(issues.filter(i => i.type === 'name').flatMap(i => i.guests.map(g => g.id)));
      const firstNameMap = {};
      allGuests.forEach(g => {
        if (exactIds.has(g.id)) return; // já pego como exato
        const firstName = norm(g.name).split(' ')[0];
        if (firstName.length < 3) return; // ignora apelidos muito curtos
        if (!firstNameMap[firstName]) firstNameMap[firstName] = [];
        firstNameMap[firstName].push(g);
      });
      Object.values(firstNameMap).forEach(group => {
        if (group.length > 1) issues.push({ type: 'similar', guests: group });
      });

      renderGuestValidation(issues);
    }

    function renderGuestValidation(issues) {
      const panel = document.getElementById('guestValidationContent');
      const badge = document.getElementById('validationBadge');
      if (badge) {
        if (issues.length > 0) {
          badge.textContent = issues.length;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
      if (!panel) return;

      if (issues.length === 0) {
        panel.innerHTML = `
          <div class="flex items-center gap-3 py-3 text-emerald-600">
            <i data-lucide="check-circle-2" class="w-6 h-6 flex-shrink-0"></i>
            <div>
              <p class="font-bold text-sm">✅ Tudo certo!</p>
              <p class="text-xs text-emerald-700 mt-0.5">Nenhuma duplicidade ou conflito encontrado. Lista validada com ${allGuests.length} convidado${allGuests.length !== 1 ? 's' : ''}.</p>
            </div>
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }

      const nameIssues    = issues.filter(i => i.type === 'name');
      const phoneIssues   = issues.filter(i => i.type === 'phone');
      const partnerIssues = issues.filter(i => i.type === 'partner-dup');
      const similarIssues = issues.filter(i => i.type === 'similar');

      let html = `
        <div class="flex items-center gap-2 mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl">
          <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-500 flex-shrink-0"></i>
          <p class="text-sm font-bold text-rose-700">${issues.length} problema${issues.length > 1 ? 's' : ''} encontrado${issues.length > 1 ? 's' : ''} em ${allGuests.length} convidados</p>
        </div>`;

      if (nameIssues.length) {
        html += `<p class="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">📛 Nomes idênticos (${nameIssues.length})</p>`;
        nameIssues.forEach(issue => {
          html += `
            <div class="bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
              <p class="text-xs font-bold text-red-700 mb-2">&ldquo;${sanitizeHTML(issue.guests[0].name)}&rdquo; cadastrado ${issue.guests.length}×</p>
              <div class="space-y-1.5">
                ${issue.guests.map(g => `
                  <div class="flex items-center justify-between gap-2 bg-white rounded-lg p-2">
                    <div class="min-w-0">
                      <p class="text-xs font-semibold text-slate-800 truncate">${sanitizeHTML(g.name)}</p>
                      <p class="text-[10px] text-slate-500">${g.phone ? sanitizeHTML(g.phone) : 'Sem telefone'} &bull; ${g.invited_by || '?'}</p>
                    </div>
                    <button data-action="guest-edit" data-id="${sanitizeAttr(g.id)}" class="text-[10px] font-bold text-red-500 hover:text-red-700 whitespace-nowrap flex-shrink-0">✏️ Editar</button>
                  </div>`).join('')}
              </div>
            </div>`;
        });
      }

      if (phoneIssues.length) {
        html += `<p class="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2 mt-3">📞 Telefones repetidos (${phoneIssues.length})</p>`;
        phoneIssues.forEach(issue => {
          html += `
            <div class="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
              <p class="text-xs font-bold text-amber-700 mb-2">Mesmo número em ${issue.guests.length} cadastros</p>
              <div class="space-y-1.5">
                ${issue.guests.map(g => `
                  <div class="flex items-center justify-between gap-2 bg-white rounded-lg p-2">
                    <div class="min-w-0">
                      <p class="text-xs font-semibold text-slate-800 truncate">${sanitizeHTML(g.name)}</p>
                      <p class="text-[10px] text-slate-500">${sanitizeHTML(g.phone || '')}</p>
                    </div>
                    <button data-action="guest-edit" data-id="${sanitizeAttr(g.id)}" class="text-[10px] font-bold text-amber-600 hover:text-amber-800 whitespace-nowrap flex-shrink-0">✏️ Editar</button>
                  </div>`).join('')}
              </div>
            </div>`;
        });
      }

      if (partnerIssues.length) {
        html += `<p class="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2 mt-3">👥 Cadastrado duplo com parceiro(a) (${partnerIssues.length})</p>`;
        partnerIssues.forEach(issue => {
          html += `
            <div class="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-3">
              <p class="text-xs font-bold text-purple-700 mb-1">&ldquo;${sanitizeHTML(issue.linked.name)}&rdquo; está cadastrado(a) como convidado individual <em>e</em> como parceiro(a) de &ldquo;${sanitizeHTML(issue.host.name)}&rdquo;</p>
              <p class="text-[11px] text-purple-600 mb-3">Se mantiver os dois, ele/ela será contado(a) duas vezes. Remova o campo &ldquo;parceiro(a)&rdquo; do convite de ${sanitizeHTML(issue.host.name)}, ou exclua o cadastro individual de ${sanitizeHTML(issue.linked.name)}.</p>
              <div class="flex gap-3 flex-wrap">
                <button data-action="guest-edit" data-id="${sanitizeAttr(issue.host.id)}" class="text-[11px] font-bold text-purple-600 hover:underline">✏️ Editar ${sanitizeHTML(issue.host.name)}</button>
                <button data-action="guest-edit" data-id="${sanitizeAttr(issue.linked.id)}" class="text-[11px] font-bold text-purple-600 hover:underline">✏️ Editar ${sanitizeHTML(issue.linked.name)}</button>
                <button data-action="guest-delete" data-id="${sanitizeAttr(issue.linked.id)}" class="text-[11px] font-bold text-red-400 hover:text-red-600 hover:underline">🗑️ Excluir ${sanitizeHTML(issue.linked.name)}</button>
              </div>
            </div>`;
        });
      }

      if (similarIssues.length) {
        html += `<p class="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2 mt-3">🔍 Possíveis duplicatas — mesmo primeiro nome (${similarIssues.length})</p>`;
        similarIssues.forEach(issue => {
          const firstName = issue.guests[0].name.split(' ')[0];
          html += `
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
              <p class="text-xs font-bold text-blue-700 mb-1">Primeiro nome <span class="font-bold">“${sanitizeHTML(firstName)}”</span> em ${issue.guests.length} cadastros &mdash; são a mesma pessoa?</p>
              <div class="space-y-1.5">
                ${issue.guests.map(g => `
                  <div class="flex items-center justify-between gap-2 bg-white rounded-lg p-2">
                    <div class="min-w-0">
                      <p class="text-xs font-semibold text-slate-800 truncate">${sanitizeHTML(g.name)}</p>
                      <p class="text-[10px] text-slate-500">${g.phone ? sanitizeHTML(g.phone) : 'Sem telefone'} &bull; ${sanitizeHTML(g.invited_by || '?')}</p>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                      <button data-action="guest-edit" data-id="${sanitizeAttr(g.id)}" class="text-[10px] font-bold text-blue-600 hover:text-blue-800">✏️ Editar</button>
                      <button data-action="guest-delete" data-id="${sanitizeAttr(g.id)}" class="text-[10px] font-bold text-red-400 hover:text-red-600">🗑️</button>
                    </div>
                  </div>`).join('')}
              </div>
              <p class="text-[10px] text-blue-500 mt-2 italic">Se forem pessoas diferentes, não precisa fazer nada.</p>
            </div>`;
        });
      }

      panel.innerHTML = html;
      if (window.lucide) lucide.createIcons();
    }
    // ============================================================

    function shareThankYou(name) {
      const msg = `❤️ *AGRADECIMENTO* ❤️\n\nOlá, *${name}*!\n\nPassando para dizer que ficamos muito felizes com a sua confirmação. Mal podemos esperar para celebrar esse momento com você!\n\nCom carinho,\nJefferson & Bia`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    }

    function toggleVipFilter() {
      dashboardState.vipOnly = !dashboardState.vipOnly;
      const btn = document.getElementById('guest-filter-vip');
      if (btn) {
        btn.classList.toggle('bg-amber-400', dashboardState.vipOnly);
        btn.classList.toggle('text-white', dashboardState.vipOnly);
      }
      renderGuestList();
    }

    function renderGuestList() {
      const list = document.getElementById('guestList');
      if (!list) return;

      let filtered = allGuests;

      if (dashboardState.guestSearch) {
        filtered = filtered.filter(g => g.name.toLowerCase().includes(dashboardState.guestSearch));
      }
      if (dashboardState.guestFilter !== 'all') {
        if (dashboardState.guestFilter === 'with-partner') {
          filtered = filtered.filter(g => g.partner_name && g.partner_name.trim());
        } else if (dashboardState.guestFilter === 'with-plus') {
          filtered = filtered.filter(g => Number(g.plus_ones || 0) > 0);
        } else {
          filtered = filtered.filter(g => g.rsvp_status === dashboardState.guestFilter);
        }
      }
      if (dashboardState.guestOwnerFilter !== 'all') {
        filtered = filtered.filter(g => {
          if (dashboardState.guestOwnerFilter === 'Bia') return g.invited_by === 'Bia' || g.invited_by === 'Beatriz';
          return g.invited_by === dashboardState.guestOwnerFilter;
        });
      }
      if (dashboardState.vipOnly) {
        filtered = filtered.filter(g => g.is_vip);
      }

      if (filtered.length === 0) {
        list.innerHTML = '<p class="text-center py-10 text-slate-700 italic text-sm">Nenhum convidado encontrado com esses filtros.</p>';
        return;
      }

      _guestStore.clear();
      list.innerHTML = filtered.map(g => {
        _guestStore.set(String(g.id), g);
        let borderClass = 'border-slate-200';
        if (g.invited_by === 'Jefferson') borderClass = 'border-blue-400 border-l-4';
        else if (g.invited_by === 'Bia' || g.invited_by === 'Beatriz') borderClass = 'border-purple-400 border-l-4';

        const thankBtn = g.rsvp_status === 'confirmado' ? `<button data-action="guest-thank" data-id="${sanitizeAttr(g.id)}" class="bg-rose-50 text-rose-600 text-[10px] px-3 py-1 rounded-full flex items-center gap-1">❤️ Agradecer</button>` : '';

        return `<div class="item-card ${g.rsvp_status === 'confirmado' ? 'confirmed' : ''} ${borderClass}"><div class="flex-1"><p class="font-bold flex items-center gap-2">${sanitizeHTML(g.name)} ${g.is_vip ? '⭐' : ''}</p><p class="text-xs font-medium text-slate-700 uppercase">${sanitizeHTML(g.invited_by)} • ${sanitizeHTML(g.rsvp_status)}${g.partner_name ? ' • 💑 ' + sanitizeHTML(g.partner_name) : ''}${g.dietary ? ' • 🍽️ ' + sanitizeHTML(g.dietary) : ''}${g.plus_ones > 0 ? ' • 👥 +' + g.plus_ones : ''}</p></div><div class="flex flex-wrap gap-1">${thankBtn}<button data-action="guest-preview" data-id="${sanitizeAttr(g.id)}" class="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">👁 Ver</button><button data-action="guest-copy" data-id="${sanitizeAttr(g.id)}" class="bg-slate-100 text-slate-700 text-[10px] px-3 py-1 rounded-full">Copiar</button><button data-action="guest-whatsapp" data-id="${sanitizeAttr(g.id)}" class="bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full">Whats</button><button data-action="guest-edit" data-id="${sanitizeAttr(g.id)}" class="bg-amber-100 text-[10px] px-3 py-1 rounded-full">✏️ Editar</button><button data-action="guest-delete" data-id="${sanitizeAttr(g.id)}" class="text-red-500 text-[10px] px-3 py-1 rounded-full">🗑️</button></div></div>`;
      }).join('');
      updateOverviewStats();
      if (window.lucide) lucide.createIcons();
    }
    function updateEditPersonCount() {
      const partner = document.getElementById('editGuestPartner').value;
      const plusOnes = parseInt(document.getElementById('editGuestPlusOnes').value) || 0;
      const count = getGuestPersonCount({ partner_name: partner, plus_ones: plusOnes });
      document.getElementById('editGuestPersonCount').textContent = count;
    }

    function toggleEditModal(s) {
      const modal = document.getElementById('editGuestModal');
      if (s) {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'items-center', 'justify-center');
        document.getElementById('editGuestName').focus();
        updateEditPersonCount();
      } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'items-center', 'justify-center');
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      const ep = document.getElementById('editGuestPartner');
      const eo = document.getElementById('editGuestPlusOnes');
      if (ep) ep.addEventListener('input', updateEditPersonCount);
      if (eo) eo.addEventListener('input', updateEditPersonCount);
    });
    function editGuest(id, name, phone, owner, status, isVip, partnerName, plusOnes) { 
      document.getElementById('editGuestId').value = id; 
      document.getElementById('editGuestName').value = name; 
      document.getElementById('editGuestPhone').value = phone; 
      document.getElementById('editGuestOwner').value = owner; 
      document.getElementById('editGuestStatus').value = status || 'aguardando';
      document.getElementById('editGuestVip').checked = !!isVip;
      document.getElementById('editGuestPartner').value = partnerName || '';
      document.getElementById('editGuestPlusOnes').value = plusOnes || 0;
      toggleEditModal(true); 
    }
    async function saveGuestEdit() {
      const id = document.getElementById('editGuestId').value;
      const payload = { 
        name: document.getElementById('editGuestName').value, 
        phone: document.getElementById('editGuestPhone').value, 
        invited_by: document.getElementById('editGuestOwner').value,
        rsvp_status: document.getElementById('editGuestStatus').value,
        is_vip: document.getElementById('editGuestVip').checked,
        partner_name: document.getElementById('editGuestPartner').value.trim() || null,
        plus_ones: parseInt(document.getElementById('editGuestPlusOnes').value) || 0
      };
      const { error } = await supabaseClient.from('guests').update(payload).eq('id', id); 
      if (error) { console.error('Erro update guest:', error); showToast('Erro ao salvar convidado', 'error'); return; }
      await logAudit('guests', id, 'UPDATE', null, payload);
      toggleEditModal(false); fetchGuests();
    }
    async function deleteGuest(id) { 
      showUndoToast('Convidado removido', async () => {
        const { error } = await supabaseClient.from('guests').delete().eq('id', id); 
        if (error) { console.error('Erro delete guest:', error); showToast('Erro ao remover convidado', 'error'); return; }
        await logAudit('guests', id, 'DELETE');
        fetchGuests(); 
      });
    }
    async function addGuest() {
      const nameEl     = document.getElementById('guestName');
      const phoneEl    = document.getElementById('guestPhone');
      const ownerEl    = document.getElementById('guestOwner');
      const partnerEl  = document.getElementById('guestPartner');
      const plusOnesEl = document.getElementById('guestPlusOnes');

      const name         = nameEl.value.trim();
      const phone        = phoneEl.value.trim();
      const invited_by   = ownerEl.value;
      const partner_name = partnerEl.value.trim() || null;
      const plus_ones    = parseInt(plusOnesEl.value) || 0;

      if (!name) { showToastGlobal('Informe o nome do convidado!', 'error'); return; }

      // --- Detecção de duplicados ---
      const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
      const normName = norm(name);

      // 1. Nome idêntico já cadastrado
      const exactDup = allGuests.find(g => norm(g.name) === normName);
      if (exactDup) {
        const ok = window.confirm(
          `⚠️ "${name}" já está cadastrado(a).\n\nDeseja cadastrar mesmo assim como um convidado diferente?`
        );
        if (!ok) return;
      }

      // 2. Nome já existe como parceiro(a) de alguém
      const asPartner = allGuests.find(
        g => g.partner_name && norm(g.partner_name) === normName
      );
      if (asPartner && !exactDup) {
        const ok = window.confirm(
          `⚠️ "${name}" já está vinculado(a) como parceiro(a) de "${asPartner.name}".\n\nSe cadastrar separado, será contado(a) como convidado extra.\n\nDeseja continuar mesmo assim?`
        );
        if (!ok) return;
      }
      // ---------------------------------

      try {
        const token = window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
        const { data, error } = await supabaseClient
          .from('guests')
          .insert([{ name, phone, invited_by, invite_token: token, rsvp_status: 'aguardando', partner_name, plus_ones }])
          .select('id').single();
        if (error) throw error;
        if (data?.id) await logAudit('guests', data.id, 'INSERT', null, { name, phone, invited_by, rsvp_status: 'aguardando', partner_name, plus_ones });
        nameEl.value = ''; phoneEl.value = ''; partnerEl.value = ''; plusOnesEl.value = '';
        document.getElementById('guestOwner').value = '';
        fetchGuests();
      } catch (err) {
        console.error(err);
        showToastGlobal('Erro ao cadastrar: ' + (err.message || 'Verifique o console'), 'error');
      }
    }

    function generateBroadcastList() {
      const pending = allGuests.filter(g => g.rsvp_status === 'aguardando');
      if (pending.length === 0) { showToast('Ninguém pendente! 🎉', 'success'); return; }
      
      let text = `📢 *LISTA DE COBRANÇA - RSVP* 📢\n\nOlá! Aqui está a lista de convidados que ainda não confirmaram:\n\n`;
      pending.forEach((g, i) => {
        text += `${i+1}. *${g.name}*\n🔗 ${window.location.origin}/convite.html?token=${g.invite_token}\n\n`;
      });
      
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cobranca_RSVP_${new Date().toLocaleDateString('pt-BR')}.txt`;
      a.click();
      showToast('Lista gerada com sucesso!', 'success');
    }

    async function exportToExcel() {
      await lazyLoad(LAZY.xlsx);
      if (!window.XLSX) { showToast('Erro ao carregar biblioteca Excel', 'error'); return; }
      const data = allGuests.map(g => {
        const total = getGuestPersonCount(g);
        return {
          Nome: g.name,
          Telefone: g.phone || '-',
          Status: g.rsvp_status,
          'Total pessoas': total,
          'Parceiro(a)': g.partner_name || '-',
          'Acompanhantes': g.plus_ones || 0,
          'Convidado por': g.invited_by,
          'VIP': g.is_vip ? 'Sim' : 'Não',
          'Restrição alimentar': g.dietary || '-',
          'Link convite': `${window.location.origin}/convite.html?token=${g.invite_token}`
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
        { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 6 },
        { wch: 20 }, { wch: 50 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Convidados");
      XLSX.writeFile(wb, "convidados_casamento.xlsx");
    }

    async function exportToPDF() {
      await lazyLoad(LAZY.jspdf);
      await lazyLoad(LAZY.jspdfAuto);
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Lista de Convidados - Jefferson & Beatriz", 14, 15);
      doc.setFontSize(10);
      const totalPessoas = allGuests.reduce((sum, g) => sum + getGuestPersonCount(g), 0);
      doc.text(`Total: ${allGuests.length} convites | ${totalPessoas} pessoas`, 14, 22);
      const rows = allGuests.map(g => [g.name, g.phone || '-', g.rsvp_status, g.invited_by, g.partner_name || '-', String(g.plus_ones || 0), String(getGuestPersonCount(g))]);
      doc.autoTable({
        startY: 28,
        head: [['Nome', 'Telefone', 'Status', 'Dono', 'Parceiro', 'Acomp.', 'Total']],
        body: rows,
        headStyles: { fillColor: [26, 26, 46] },
        styles: { fontSize: 8 }
      });
      doc.save("lista_convidados.pdf");
    }

    async function shareInviteWhatsApp(name, token) {
      const link = `${window.location.origin}/convite.html?token=${token}`;
      const msg = `💍 *CONVITE DE CASAMENTO* 💍\n\nOlá, *${name}*!\n\nAcesse seu convite individual e confirme sua presença:\n👉 ${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    }

    function updateOverviewStats() {
      const totalPeople = allGuests.reduce((sum, g) => sum + getGuestPersonCount(g), 0);
      const totalRecords = allGuests.length;
      const confirmedPeople = allGuests.filter(g => g.rsvp_status === 'confirmado').reduce((sum, g) => sum + getGuestPersonCount(g), 0);
      const pendingPeople = allGuests.filter(g => g.rsvp_status === 'aguardando').reduce((sum, g) => sum + getGuestPersonCount(g), 0);
      const declinedPeople = allGuests.filter(g => g.rsvp_status === 'recusado').reduce((sum, g) => sum + getGuestPersonCount(g), 0);
      const confirmedRecords = allGuests.filter(g => g.rsvp_status === 'confirmado').length;
      const pendingRecords = allGuests.filter(g => g.rsvp_status === 'aguardando').length;
      const declinedRecords = allGuests.filter(g => g.rsvp_status === 'recusado').length;
      const now = new Date(), nextWeek = new Date(); nextWeek.setDate(now.getDate() + 7);
      const dueSoonCount = dashboardState.tasks.filter(t => t.due_date && t.status !== 'concluido' && new Date(t.due_date + 'T12:00:00') <= nextWeek).length;

      document.getElementById('stat-total').textContent = totalRecords;
      document.getElementById('stat-records-text').textContent = `${totalPeople} pessoa${totalPeople !== 1 ? 's' : ''}`;
      document.getElementById('stat-total-people').textContent = totalPeople;
      document.getElementById('stat-confirmed').textContent = confirmedRecords;
      document.getElementById('stat-confirmed-people').textContent = confirmedPeople + ' pessoa' + (confirmedPeople !== 1 ? 's' : '');
      document.getElementById('stat-pending').textContent = pendingRecords;
      document.getElementById('stat-pending-people').textContent = pendingPeople + ' pessoa' + (pendingPeople !== 1 ? 's' : '');
      document.getElementById('stat-declined').textContent = declinedRecords;
      document.getElementById('stat-declined-people').textContent = declinedPeople + ' pessoa' + (declinedPeople !== 1 ? 's' : '');
      document.getElementById('dueSoonStat').textContent = dueSoonCount;
      document.getElementById('pendingTasksStat').textContent = dashboardState.tasks.filter(t => t.status !== 'concluido').length;

      const confirmedAside = document.getElementById('stat-confirmed-aside');
      if (confirmedAside) confirmedAside.textContent = confirmedRecords;
      const confirmedAsidePeople = document.getElementById('confirmed-aside-people');
      if (confirmedAsidePeople) confirmedAsidePeople.textContent = confirmedPeople + ' pessoa' + (confirmedPeople !== 1 ? 's' : '');

      const yes = allGuests.filter(g => g.rsvp_status === 'confirmado').length;
      const no = allGuests.filter(g => g.rsvp_status === 'recusado').length;
      const maybe = allGuests.filter(g => g.rsvp_status === 'aguardando').length;
      document.getElementById('dash-rsvp-yes').textContent = yes;
      document.getElementById('dash-rsvp-maybe').textContent = maybe;
      document.getElementById('dash-rsvp-no').textContent = no;

      const yesPeople = allGuests.filter(g => g.rsvp_status === 'confirmado').reduce((sum, g) => sum + getGuestPersonCount(g), 0);
      const noPeople = allGuests.filter(g => g.rsvp_status === 'recusado').reduce((sum, g) => sum + getGuestPersonCount(g), 0);
      const maybePeople = allGuests.filter(g => g.rsvp_status === 'aguardando').reduce((sum, g) => sum + getGuestPersonCount(g), 0);
      const rsvpPeopleYes = document.getElementById('dash-rsvp-yes-people');
      if (rsvpPeopleYes) rsvpPeopleYes.textContent = yesPeople + ' pessoa' + (yesPeople !== 1 ? 's' : '');
      const rsvpPeopleNo = document.getElementById('dash-rsvp-no-people');
      if (rsvpPeopleNo) rsvpPeopleNo.textContent = noPeople + ' pessoa' + (noPeople !== 1 ? 's' : '');
      const rsvpPeopleMaybe = document.getElementById('dash-rsvp-maybe-people');
      if (rsvpPeopleMaybe) rsvpPeopleMaybe.textContent = maybePeople + ' pessoa' + (maybePeople !== 1 ? 's' : '');

      const pendingCount = document.getElementById('dash-rsvp-pending-count');
      if (pendingCount) pendingCount.textContent = maybe;
      const totalPeopleEl = document.getElementById('dash-rsvp-total-people');
      if (totalPeopleEl) totalPeopleEl.textContent = totalPeople;
    }

    async function fetchExpenses() { const { data, error } = await supabaseClient.from('expenses').select('*').order('created_at', { ascending: false }); if (error) { console.error('Erro fetch expenses:', error); return; } dashboardState.expenses = data || []; renderExpenses(); updateExpenseStats(); renderBudgetPlanner(); }
    function renderExpenses() {
      _expenseStore.clear();
      document.getElementById('expenseList').innerHTML = dashboardState.expenses.map(e => {
        _expenseStore.set(String(e.id), e);
        return `<div class="flex justify-between p-3 bg-white rounded-xl items-center"><div><p class="font-bold">${sanitizeHTML(e.item)}</p><p class="text-xs font-medium text-slate-700 uppercase">${sanitizeHTML(e.category || 'Sem categoria')}</p></div><div class="flex items-center gap-3"><span class="font-bold">R$ ${Number(e.amount).toLocaleString('pt-BR')}</span><button data-action="expense-edit" data-id="${sanitizeAttr(e.id)}" class="text-slate-400 hover:text-vinho text-sm p-1">✏️</button><button data-action="expense-delete" data-id="${sanitizeAttr(e.id)}" class="text-red-500 text-sm">🗑️</button></div></div>`;
      }).join('');
    }
    async function deleteExpense(id) { 
      showUndoToast('Gasto removido', async () => {
        const { error } = await supabaseClient.from('expenses').delete().eq('id', id); 
        if (error) { console.error('Erro delete expense:', error); showToast('Erro ao remover gasto', 'error'); return; }
        await logAudit('expenses', id, 'DELETE');
        fetchExpenses(); 
      });
    }
    async function addExpense() {
      const btn = document.querySelector('button[onclick="addExpense()"]');
      const itemEl = document.getElementById('expItem'), catEl = document.getElementById('expCategory'), amountEl = document.getElementById('expAmount');
      const item = itemEl.value.trim(), cat = catEl.value.trim(), amount = parseMoney(amountEl.value);
      
      if (item && amount > 0) {
        setButtonLoading(btn, true);
        const { data, error } = await supabaseClient.from('expenses').insert([{ item, category: cat, amount }]).select('id').single();
        if (data?.id) await logAudit('expenses', data.id, 'INSERT', null, { item, category: cat, amount });
        if (!error) {
          itemEl.value = '';
          catEl.value = '';
          amountEl.value = '';
          showToastGlobal('Lançamento adicionado!', 'success');
        } else {
          showToastGlobal('Erro ao adicionar', 'error');
        }
        await fetchExpenses();
        setButtonLoading(btn, false);
      } else {
        showToastGlobal('Preencha a descrição e um valor válido.', 'error');
      }
    }
    // SETTINGS (budget/savings via Supabase)
    async function fetchSettings() {
      const { data, error } = await supabaseClient.from('settings').select('*');
      if (error) { console.error('Erro fetch settings:', error); return; }
      if (data) {
        data.forEach(s => {
          if (s.key === 'weddingBudget') dashboardState.budget = parseFloat(s.value) || getBudgetDefault();
          if (s.key === 'weddingSavings') dashboardState.savings = parseFloat(s.value) || 0;
        });
      }
      if (!dashboardState.budget) dashboardState.budget = getBudgetDefault();
    }
    async function saveSetting(key, value) {
      const { error } = await supabaseClient.from('settings').upsert([{ key, value: String(value) }]);
      if (error) { console.error('Erro save setting:', error); showToast('Erro ao salvar configuração', 'error'); }
    }

    function toggleBudgetEdit(s) { document.getElementById('budget-edit-container').classList.toggle('hidden', !s); }
    function saveBudgetFromInput() { const v = document.getElementById('budget-input').value; if (v) { dashboardState.budget = parseFloat(v); saveSetting('weddingBudget', v); toggleBudgetEdit(false); updateExpenseStats(); } }
    function toggleSavingsEdit(s) { document.getElementById('savings-edit-container').classList.toggle('hidden', !s); }
    function saveSavingsFromInput() { const v = document.getElementById('savings-input').value; if (v) { dashboardState.savings = parseFloat(v); saveSetting('weddingSavings', v); toggleSavingsEdit(false); updateExpenseStats(); } }

    function updateExpenseStats() {
      // Orçamento real planejado. Apenas usa o 'planned_amount' das categorias para não duplicar com os contratos.
      const plannedTotal = dashboardState.budgetCategories.reduce((s, b) => s + (parseFloat(b.planned_amount) || 0), 0);
      const budget = plannedTotal > 0 ? plannedTotal : (dashboardState.budget || 0);
      const savings = dashboardState.savings || 0;
      const spent = dashboardState.expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

      const expensesByCategory = {};
      dashboardState.expenses.forEach(e => {
        const c = (e.category || 'Outros').toLowerCase().trim();
        expensesByCategory[c] = (expensesByCategory[c] || 0) + parseFloat(e.amount);
      });
      const suppliersByCategory = {};
      allSuppliers.forEach(s => {
        const c = (s.category || 'Outros').toLowerCase().trim();
        suppliersByCategory[c] = (suppliersByCategory[c] || 0) + (parseFloat(s.value) || 0);
      });
      const allCats = new Set([...Object.keys(expensesByCategory), ...Object.keys(suppliersByCategory)]);
      
      let totalCommitted = 0;
      allCats.forEach(cat => {
        const sp = expensesByCategory[cat] || 0;
        const sup = suppliersByCategory[cat] || 0;
        totalCommitted += Math.max(sp, sup);
      });

      const remaining = Math.max(0, budget - totalCommitted);
      const percent = budget > 0 ? Math.min(Math.round((totalCommitted / budget) * 100), 100) : 0;
      
      // Dívida ativa é o total comprometido menos o que já foi efetivamente gasto
      const activeDebts = Math.max(0, totalCommitted - spent);
      const suppliersTotal = allSuppliers.reduce((s, sp) => s + (parseFloat(sp.value) || 0), 0);
      
      document.getElementById('stat-budget').textContent = `R$ ${budget.toLocaleString('pt-BR')}`;
      document.getElementById('stat-savings').textContent = `R$ ${savings.toLocaleString('pt-BR')}`;
      document.getElementById('stat-total-spent').textContent = `R$ ${spent.toLocaleString('pt-BR')}`;
      document.getElementById('stat-active-debts').textContent = `R$ ${activeDebts.toLocaleString('pt-BR')}`;
      document.getElementById('stat-remaining').textContent = `R$ ${remaining.toLocaleString('pt-BR')}`;
      const elSuppliersTotal = document.getElementById('stat-suppliers-total');
      if (elSuppliersTotal) elSuppliersTotal.textContent = `R$ ${suppliersTotal.toLocaleString('pt-BR')}`;
      
      // Atualizar dashboard resumo financeiro
      const dashSpent = document.getElementById('dash-spent');
      if (dashSpent) dashSpent.textContent = `R$ ${spent.toLocaleString('pt-BR')}`;
      
      const progressEl = document.getElementById('dash-budget-progress');
      if (progressEl) progressEl.style.width = `${percent}%`;
      const progressText = document.getElementById('budget-progress-text');
      if (progressText) progressText.textContent = `${percent}% usado`;
      
      // Salvar orçamento calculado no dashboardState para uso em outros lugares
      dashboardState.budget = budget;
      
      updateExpenseChart(); updateCategoryChart();
      renderBudgetPlanner();
    }

    function updateCategoryChart() {
      const ctx = document.getElementById('categoryChart').getContext('2d');
      if (categoryChart) categoryChart.destroy();
      const cats = {}; dashboardState.expenses.forEach(e => { const c = e.category || 'Outros'; cats[c] = (cats[c] || 0) + parseFloat(e.amount); });
      categoryChart = new Chart(ctx, { type: 'doughnut', data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: ['#c9a96e', '#c9a96e', '#f5e6d3', '#475569'] }] }, options: { maintainAspectRatio: false } });
    }
    function updateExpenseChart() {
      const ctx = document.getElementById('expenseChart').getContext('2d');
      if (expenseChart) expenseChart.destroy();
      const monthly = {}; dashboardState.expenses.forEach(e => { const m = new Date(e.created_at).toLocaleDateString('pt-BR', { month: 'short' }); monthly[m] = (monthly[m] || 0) + parseFloat(e.amount); });
      expenseChart = new Chart(ctx, { type: 'bar', data: { labels: Object.keys(monthly), datasets: [{ data: Object.values(monthly), backgroundColor: '#c9a96e' }] }, options: { maintainAspectRatio: false } });
    }

    async function updateAnalytics() {
      try {
        const { data: logs } = await supabaseClient.from('rsvp_access_logs').select('*');
        if (!logs) return;
        
        // KPIs
        const totalAccess = logs.length;
        const uniqueGuests = new Set(logs.map(l => l.guest_id)).size;
        
        const totalConvidados = allGuests.length;
        const confirmados = allGuests.filter(g => g.rsvp_status === 'confirmado').length;
        const conversionRate = totalConvidados > 0 ? Math.round((confirmados / totalConvidados) * 100) : 0;
        
        const today = new Date().toISOString().split('T')[0];
        const todayAccess = logs.filter(l => l.access_time && l.access_time.startsWith(today)).length;
        
        document.getElementById('analytics-total-access').textContent = totalAccess;
        document.getElementById('analytics-unique-guests').textContent = uniqueGuests;
        document.getElementById('analytics-conversion-rate').textContent = `${conversionRate}%`;
        document.getElementById('analytics-today-access').textContent = todayAccess;

        // Gráfico de Acessos (Últimos 7 dias)
        const ctxAccess = document.getElementById('accessChart').getContext('2d');
        if (accessChart) accessChart.destroy();
        
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();
        
        const accessByDay = last7Days.map(day => logs.filter(l => l.access_time && l.access_time.startsWith(day)).length);
        const dayLabels = last7Days.map(day => {
          const [y, m, d] = day.split('-');
          return `${d}/${m}`;
        });

        accessChart = new Chart(ctxAccess, {
          type: 'line',
          data: {
            labels: dayLabels,
            datasets: [{
              label: 'Acessos',
              data: accessByDay,
              borderColor: '#1a1a2e',
              backgroundColor: 'rgba(26, 26, 46, 0.1)',
              tension: 0.3,
              fill: true
            }]
          },
          options: { maintainAspectRatio: false }
        });

        // Gráfico de Convidados por Dono
        const ctxInviter = document.getElementById('inviterChart').getContext('2d');
        if (inviterChart) inviterChart.destroy();
        
        const inviterCounts = { 'Jefferson': 0, 'Bia': 0, 'Ambos': 0 };
        allGuests.forEach(g => {
          let owner = g.invited_by;
          if (owner === 'Beatriz') owner = 'Bia';
          if (inviterCounts[owner] !== undefined) inviterCounts[owner]++;
        });

        inviterChart = new Chart(ctxInviter, {
          type: 'doughnut',
          data: {
            labels: Object.keys(inviterCounts),
            datasets: [{
              data: Object.values(inviterCounts),
              backgroundColor: ['#1a1a2e', '#c9a96e', '#94a3b8']
            }]
          },
          options: { maintainAspectRatio: false }
        });

        // Gráfico de Status RSVP
        const ctxRsvp = document.getElementById('rsvpChart').getContext('2d');
        if (rsvpChart) rsvpChart.destroy();
        
        const rsvpCounts = { 'Confirmado': 0, 'Aguardando': 0, 'Recusado': 0 };
        allGuests.forEach(g => {
          if (g.rsvp_status === 'confirmado') rsvpCounts['Confirmado']++;
          else if (g.rsvp_status === 'recusado') rsvpCounts['Recusado']++;
          else rsvpCounts['Aguardando']++;
        });

        rsvpChart = new Chart(ctxRsvp, {
          type: 'bar',
          data: {
            labels: Object.keys(rsvpCounts),
            datasets: [{
              label: 'Convidados',
              data: Object.values(rsvpCounts),
              backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
            }]
          },
          options: { maintainAspectRatio: false }
        });

      } catch(err) {
        console.error('Erro no Analytics:', err);
      }
    }
    async function loadNotesFromSupabase() { 
      const meetingNotes = document.getElementById('meetingNotes');
      if (!meetingNotes) return;
      const { data } = await supabaseClient.from(ORG_NOTES_TABLE_NAME).select('notes').eq('id', 'global').maybeSingle(); 
      if (data) meetingNotes.value = data.notes; 
    }

    // TELA DE CRONOGRAMA
    async function fetchTimeline() {
      const { data, error } = await supabaseClient.from('timeline').select('*').order('event_time', { ascending: true });
      if (error) { console.error('Erro fetch timeline:', error); return; }
      dashboardState.cachedTimeline = data || [];
      renderTimeline(dashboardState.cachedTimeline);
    }

    function renderTimeline(events) {
      const list = document.getElementById('timelineList');
      if (!list) return;
      if (events.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-600 italic">Nenhum evento no cronograma ainda.</p>';
        return;
      }
      _timelineStore.clear();
      list.innerHTML = events.map(ev => {
        _timelineStore.set(String(ev.id), ev);
        return `
        <div class="relative group">
          <div class="absolute -left-[1.35rem] top-1 w-3 h-3 bg-vinho rounded-full"></div>
          <div class="flex justify-between items-start">
            <div>
              <p class="font-bold text-vinho text-sm">${ev.event_time.substring(0, 5)}</p>
              <p class="text-slate-700">${sanitizeHTML(ev.description)}</p>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button data-action="tl-edit" data-id="${sanitizeAttr(ev.id)}" class="text-slate-600 hover:text-vinho text-xs">✏️</button>
              <button data-action="tl-delete" data-id="${sanitizeAttr(ev.id)}" class="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>
          </div>
        </div>
      `}).join('');
    }

    let _editingTimelineId = null;
    function editTimelineEvent(id, time, desc) {
      _editingTimelineId = id;
      document.getElementById('tlTime').value = time;
      document.getElementById('tlEvent').value = desc;
      document.getElementById('tlEvent').focus();
      showToast(`Evento editado: ${desc}`, 'success');
    }

    async function addTimelineEvent() {
      const time = document.getElementById('tlTime').value;
      const desc = document.getElementById('tlEvent').value;
      if (!time || !desc) { showToast('Preencha hora e descrição!', 'error'); return; }

      if (_editingTimelineId) {
        const { error } = await supabaseClient.from('timeline').update({ event_time: time, description: desc }).eq('id', _editingTimelineId);
        if (!error) {
          await logAudit('timeline', _editingTimelineId, 'UPDATE', null, { event_time: time, description: desc });
          showToast('Evento atualizado!', 'success');
        }
        _editingTimelineId = null;
      } else {
        const { data: existing } = await supabaseClient.from('timeline').select('event_time, description').order('event_time');
        if (existing) {
          const conflict = existing.find(e => e.event_time === time);
          if (conflict) { showToast(`Conflito! Já existe evento às ${time}: ${conflict.description}`, 'error'); return; }
        }
        const { data, error } = await supabaseClient.from('timeline').insert([{ event_time: time, description: desc }]).select('id').single();
        if (!error && data?.id) await logAudit('timeline', data.id, 'INSERT', null, { event_time: time, description: desc });
        if (!error) showToast('Evento adicionado!', 'success');
      }
      document.getElementById('tlEvent').value = '';
      document.getElementById('tlTime').value = '';
      fetchTimeline();
    }

    async function deleteTimelineEvent(id) {
      showUndoToast('Evento removido', async () => {
        const { error } = await supabaseClient.from('timeline').delete().eq('id', id);
        if (error) { console.error('Erro delete timeline:', error); showToast('Erro ao excluir evento', 'error'); return; }
        await logAudit('timeline', id, 'DELETE');
        fetchTimeline();
      });
    }

    function printTimeline() {
      const events = document.getElementById('timelineList');
      if (!events || events.children.length === 0) {
        showToast('Nenhum evento no cronograma para imprimir.', 'error');
        return;
      }
      const printWindow = window.open('', '_blank');
      const now = new Date().toLocaleDateString('pt-BR');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Roteiro do Casamento - ${now}</title>
          <style>
            body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1a1a2e; padding-bottom: 20px; }
            .header h1 { font-family: 'Cormorant Garamond', serif; color: #1a1a2e; margin: 0 0 8px; font-size: 2.5rem; }
            .header p { color: #c9a96e; margin: 0; font-size: 1.1rem; }
            .meta { text-align: center; margin-bottom: 30px; color: #666; font-size: 0.9rem; }
            .timeline { position: relative; padding-left: 30px; }
            .timeline::before { content: ''; position: absolute; left: 14px; top: 0; bottom: 0; width: 2px; background: #1a1a2e; }
            .event { position: relative; padding-left: 40px; margin-bottom: 24px; page-break-inside: avoid; }
            .event::before { content: ''; position: absolute; left: 4px; top: 4px; width: 20px; height: 20px; background: #1a1a2e; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #1a1a2e; }
            .event-time { font-weight: bold; color: #1a1a2e; font-size: 1.1rem; margin-bottom: 4px; }
            .event-desc { color: #333; font-size: 1rem; line-height: 1.5; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Jefferson &amp; Beatriz</h1>
            <p>Roteiro do Dia do Casamento</p>
          </div>
          <div class="meta">Gerado em ${new Date().toLocaleString('pt-BR')} | Capela São Maximiliano Maria Kolbe — Cascavel/PR</div>
          <div class="timeline">
            ${Array.from(events.children).map(el => `
              <div class="event">
                <div class="event-time">${el.querySelector('p.font-bold')?.textContent || ''}</div>
                <div class="event-desc">${el.querySelector('p.text-slate-700')?.textContent || ''}</div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
          <\/script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }

    async function fetchLogs() {
      const { data, error } = await supabaseClient
        .from('audit_logs').select('*')
        .order('created_at', { ascending: false }).limit(50);
      if (error) { console.error('Erro fetch logs:', error); return; }
      const list = document.getElementById('auditLogs');
      if (!list) return;
      if (!data || data.length === 0) {
        list.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-8">Nenhuma atividade registrada ainda.</p>';
        return;
      }

      const tableLabels = {
        tasks: 'Tarefas', guests: 'Convidados', expenses: 'Financeiro',
        suppliers: 'Fornecedores', home_items: 'Casa & Móveis',
        budget_categories: 'Planejamento', moodboard: 'Moodboard',
        planner_notes: 'Notas', docs: 'Documentos', timeline: 'Cronograma',
        settings: 'Configurações', audit_logs: 'Log'
      };
      const actionStyles = {
        INSERT: { icon: '➕', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        UPDATE: { icon: '✏️', color: 'bg-blue-50 text-blue-700 border-blue-100' },
        DELETE: { icon: '🗑️', color: 'bg-red-50 text-red-700 border-red-100' }
      };
      const actionVerb = { INSERT: 'adicionou', UPDATE: 'editou', DELETE: 'removeu' };

      const resolveUser = (raw) => {
        if (!raw) return 'Sistema';
        if (!raw.includes('@')) return raw;
        const match = (WEDDING_CONFIG.adminUsers || []).find(
          u => String(u.email).toLowerCase() === raw.toLowerCase()
        );
        if (match) {
          const n = match.username;
          return n.charAt(0).toUpperCase() + n.slice(1);
        }
        return raw.split('@')[0];
      };

      const getItemLabel = (log) => {
        let d = log.new_data || log.old_data;
        if (!d) return '';
        if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return ''; } }
        const raw = d.name || d.title || d.item || d.category || d.key || '';
        return String(raw).slice(0, 60);
      };

      list.innerHTML = data.map(log => {
        const style  = actionStyles[log.action] || actionStyles.UPDATE;
        const table  = tableLabels[log.table_name] || log.table_name;
        const verb   = actionVerb[log.action] || log.action;
        const who    = resolveUser(log.user_name);
        const item   = getItemLabel(log);
        const date   = new Date(log.created_at);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const actionBadge = {
          INSERT: 'bg-emerald-100 text-emerald-700',
          UPDATE: 'bg-blue-100 text-blue-700',
          DELETE: 'bg-red-100 text-red-600'
        }[log.action] || 'bg-slate-100 text-slate-600';
        const actionLabel = { INSERT: 'Adicionou', UPDATE: 'Editou', DELETE: 'Removeu' }[log.action] || log.action;

        return `<div class="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
  <div class="flex flex-wrap items-center gap-1.5 mb-1">
    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${actionBadge}">${actionLabel}</span>
    <span class="text-[12px] font-bold text-vinho">${sanitizeHTML(who)}</span>
    <span class="text-[11px] text-slate-400">em</span>
    <span class="text-[11px] font-semibold text-slate-700">${sanitizeHTML(table)}</span>
  </div>
  ${item ? `<p class="text-[11px] text-slate-500 truncate max-w-full">“${sanitizeHTML(item)}”</p>` : ''}
  <p class="text-[10px] text-slate-400 mt-1">${dateStr} às ${timeStr}</p>
</div>`;
      }).join('');
    }
    function initRealtime() {
      const tables = { tasks: fetchTasks, guests: fetchGuests, expenses: fetchExpenses, timeline: fetchTimeline, home_items: fetchHomeItems, suppliers: fetchSuppliers };
      const channel = supabaseClient.channel('db-changes');
      Object.keys(tables).forEach(table => {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, tables[table]);
      });
      channel.subscribe();
    }
    function previewInvite(token) {
      window.open(`${window.location.origin}/convite.html?token=${token}`, '_blank');
    }
    async function copyInviteLink(token) {
      const link = `${window.location.origin}/convite.html?token=${token}`;
      const ok = await copyToClipboard(link);
      if (ok) showToastGlobal('Link copiado!', 'success');
      else showToastGlobal('Falha ao copiar link', 'error');
    }

    async function fetchSuppliers() { 
      try {
        const { data, error } = await supabaseClient.from('suppliers').select('*').order('name', { ascending: true }); 
        if (error) { console.error('Erro fetch suppliers:', error); return; }
        allSuppliers = data || [];
      } catch(e) { console.error('fetchSuppliers exception:', e); return; }
      const list = document.getElementById('supplierList');
      if (!list) return;
      
      _supplierStore.clear();
      list.innerHTML = allSuppliers.map(s => {
        _supplierStore.set(String(s.id), s);
        const statusColors = {
          'Quitado': 'bg-emerald-100 text-emerald-700',
          'Pago Parcial': 'bg-blue-100 text-blue-700',
          'Pendente': 'bg-amber-100 text-amber-700'
        };
        const color = statusColors[s.status] || 'bg-slate-100 text-slate-700';
        
        return `
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
            <div>
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-vinho">${sanitizeHTML(s.name)}</h4>
                <span class="text-[10px] font-bold px-2 py-1 rounded-full uppercase ${color}">${sanitizeHTML(s.status || 'Pendente')}</span>
              </div>
              <p class="text-xs font-medium text-slate-700 uppercase tracking-widest font-semibold">${sanitizeHTML(s.category || 'Fornecedor')}</p>
              <div class="flex flex-wrap gap-3 mt-3">
                ${s.contact ? `<p class="text-xs text-slate-700 flex items-center gap-1"><i data-lucide="phone" class="w-3 h-3"></i> ${sanitizeHTML(s.contact)}</p>` : ''}
                ${s.map_link ? `<a href="${sanitizeAttr(s.map_link)}" target="_blank" class="text-xs text-blue-500 font-bold flex items-center gap-1 hover:underline"><i data-lucide="map-pin" class="w-3 h-3"></i> Mapa</a>` : ''}
              </div>
            </div>
              <div class="flex justify-between items-center border-t pt-3 mt-auto">
              <span class="text-lg font-bold text-vinho">R$ ${Number(s.value).toLocaleString('pt-BR')}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs">${s.rating ? '⭐'.repeat(s.rating) : ''}</span>
                <button data-action="supplier-pay" data-id="${sanitizeAttr(s.id)}" class="text-blue-500 hover:text-blue-700 text-xs font-bold" title="Lançar Pagamento">💸 Pagar</button>
                <button data-action="supplier-edit" data-id="${sanitizeAttr(s.id)}" class="text-slate-600 hover:text-vinho text-xs ml-2">✏️</button>
                <button data-action="supplier-delete" data-id="${sanitizeAttr(s.id)}" class="text-red-400 hover:text-red-600 text-xs ml-1">✕</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      if (window.lucide) lucide.createIcons();
      updateExpenseStats();
      renderBudgetPlanner();
    }

    async function deleteSupplier(id) {  
      showUndoToast('Fornecedor removido', async () => {
        const { error } = await supabaseClient.from('suppliers').delete().eq('id', id); 
        if (error) { console.error('Erro delete supplier:', error); showToast('Erro ao remover fornecedor', 'error'); return; }
        await logAudit('suppliers', id, 'DELETE');
        fetchSuppliers(); 
      });
    }

    async function paySupplier(id) {
      const s = _supplierStore.get(id);
      if (!s) return;
      const val = prompt(`Lançar pagamento para ${s.name}\nValor total do contrato: R$ ${Number(s.value).toLocaleString('pt-BR')}\nDigite o valor a ser pago agora (ex: 500):`);
      if (!val) return;
      const amount = parseFloat(val.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) { showToastGlobal('Valor inválido', 'error'); return; }
      
      const nextStatus = amount >= s.value ? 'Pago' : 'Pago Parcial';

      const { error: err1 } = await supabaseClient.from('suppliers').update({ status: nextStatus }).eq('id', id);
      if (err1) { showToastGlobal('Erro ao atualizar fornecedor', 'error'); return; }

      const { error: err2 } = await supabaseClient.from('expenses').insert([{ item: `Pagamento: ${s.name}`, category: s.category || 'Fornecedor', amount }]);
      if (err2) { showToastGlobal('Erro ao lançar gasto', 'error'); return; }

      await logAudit('suppliers', id, 'PAYMENT', null, { amount, nextStatus });
      fetchSuppliers();
      fetchExpenses();
      showToastGlobal('Pagamento lançado com sucesso!', 'success');
    }

    let _editingSupplierId = null;
    function editSupplier(id, name, contact, map_link, category, value, status) {
      _editingSupplierId = id;
      document.getElementById('supplierName').value = name;
      document.getElementById('supplierContact').value = contact;
      document.getElementById('supplierMap').value = map_link;
      document.getElementById('supplierCategory').value = category;
      document.getElementById('supplierValue').value = value;
      document.getElementById('supplierStatus').value = status;
      document.getElementById('supplierName').focus();
      showToast(`Editando fornecedor: ${name}`, 'success');
    }

    async function addSupplier() { 
      const name = document.getElementById('supplierName').value;
      const contact = document.getElementById('supplierContact').value;
      const map_link = document.getElementById('supplierMap').value;
      const cat = document.getElementById('supplierCategory').value;
      const val = document.getElementById('supplierValue').value;
      const status = document.getElementById('supplierStatus').value;

      if (!name) { showToast('Informe o nome do fornecedor!', 'error'); return; }

      const payload = { name, contact, map_link, category: cat, value: parseFloat(val) || 0, status };

      if (_editingSupplierId) {
        const { error } = await supabaseClient.from('suppliers').update(payload).eq('id', _editingSupplierId);
        if (!error) {
          await logAudit('suppliers', _editingSupplierId, 'UPDATE', null, payload);
          showToast('Fornecedor atualizado!', 'success');
        }
        _editingSupplierId = null;
      } else {
        const { data, error } = await supabaseClient.from('suppliers').insert([payload]).select('id').single();
        if (!error && data?.id) await logAudit('suppliers', data.id, 'INSERT', null, payload);
        if (!error) showToast('Fornecedor salvo!', 'success');
        else showToast('Erro ao salvar fornecedor', 'error');
      }

      document.getElementById('supplierName').value = '';
      document.getElementById('supplierContact').value = '';
      document.getElementById('supplierMap').value = '';
      document.getElementById('supplierValue').value = '';
      document.getElementById('supplierCategory').value = '';
      document.getElementById('supplierStatus').value = 'Pendente';
      fetchSuppliers();
    }
    
    // ============================================================
    // CASA & MÓVEIS
    // ============================================================
    let _homeItemFilter = 'all';
    let _editingHomeItemId = null;
    let _linkPreviewTimer = null;
    let _currentPreviewData = null;

    async function fetchHomeItems() {
      const { data, error } = await supabaseClient
        .from('home_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.error('Erro fetch home_items:', error); return; }
      renderHomeItems(data || []);
    }

    function renderHomeItems(items) {
      _homeItemStore.clear();
      items.forEach(i => _homeItemStore.set(i.id, i));

      const temos     = items.filter(i => i.status === 'temos').length;
      const precisamos = items.filter(i => i.status === 'precisamos').length;
      const possivel   = items.filter(i => i.status === 'possivel').length;
      const el = id => document.getElementById(id);
      if (el('hiTotalCount'))     el('hiTotalCount').textContent     = items.length;
      if (el('hiTemosCount'))     el('hiTemosCount').textContent     = temos;
      if (el('hiPrecisamosCount')) el('hiPrecisamosCount').textContent = precisamos;
      if (el('hiPossivelCount'))  el('hiPossivelCount').textContent  = possivel;

      const filtered = _homeItemFilter === 'all'
        ? items
        : items.filter(i => i.status === _homeItemFilter);

      const list = document.getElementById('homeItemList');
      if (!list) return;

      if (!filtered.length) {
        list.innerHTML = `
          <div class="col-span-2 text-center py-12 text-slate-400">
            <i data-lucide="package-open" class="w-10 h-10 mx-auto mb-3 opacity-40"></i>
            <p class="text-sm">Nenhum item encontrado.</p>
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }

      const priorityColors = {
        Alta: 'bg-red-100 text-red-700',
        Média: 'bg-amber-100 text-amber-700',
        Baixa: 'bg-emerald-100 text-emerald-700'
      };
      const statusColors  = {
        temos:     'bg-emerald-100 text-emerald-700',
        precisamos: 'bg-amber-100 text-amber-700',
        possivel:  'bg-purple-100 text-purple-700'
      };
      const statusLabels  = {
        temos:     '✅ Já temos',
        precisamos: '🛒 Precisamos',
        possivel:  '🤞 Possível'
      };

      list.innerHTML = filtered.map(item => {
        const prioColor   = priorityColors[item.priority]  || priorityColors['Média'];
        const statusColor = statusColors[item.status]      || statusColors['precisamos'];
        const statusLabel = statusLabels[item.status]      || statusLabels['precisamos'];
        const hasPreview  = item.buy_link && (item.link_title || item.link_image);

        return `
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
            ${hasPreview && item.link_image ? `<img src="${sanitizeAttr(item.link_image)}" alt="" class="w-full h-40 object-cover" onerror="this.style.display='none'" />` : ''}
            <div class="p-4 flex flex-col flex-1">
              <div class="flex justify-between items-start mb-2 gap-2">
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-slate-800 leading-tight">${sanitizeHTML(item.name)}</h4>
                  <p class="text-xs text-slate-400 mt-0.5">${sanitizeHTML(item.category || 'Sem categoria')}</p>
                </div>
                <span class="text-[10px] font-bold px-2 py-1 rounded-full uppercase flex-shrink-0 ${statusColor}">${statusLabel}</span>
              </div>
              ${item.promised_by ? `
                <div class="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2 w-fit">
                  🎁 <span class="truncate max-w-[160px]">${sanitizeHTML(item.promised_by)}</span>
                </div>` : ''}

              ${hasPreview ? `
                <div class="bg-slate-50 rounded-xl p-2.5 mb-3 border border-slate-100">
                  <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">${sanitizeHTML(item.link_domain || '')}</p>
                  ${item.link_title ? `<p class="text-xs font-semibold text-slate-700 line-clamp-2 mt-0.5">${sanitizeHTML(item.link_title)}</p>` : ''}
                  ${item.link_description ? `<p class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${sanitizeHTML(item.link_description)}</p>` : ''}
                  ${item.buy_link ? `<a href="${sanitizeAttr(item.buy_link)}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-blue-500 hover:underline font-bold mt-1 inline-block">Abrir link →</a>` : ''}
                </div>
              ` : item.buy_link ? `
                <a href="${sanitizeAttr(item.buy_link)}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline font-bold mb-3 flex items-center gap-1 min-w-0">
                  <i data-lucide="link" class="w-3 h-3 shrink-0"></i>
                  <span class="truncate">${sanitizeHTML(item.link_domain || item.buy_link)}</span>
                </a>
              ` : ''}

              ${item.notes ? `<p class="text-xs text-slate-500 italic mb-3 line-clamp-2">${sanitizeHTML(item.notes)}</p>` : ''}

              <div class="flex justify-between items-center mt-auto pt-3 border-t border-slate-100">
                <div class="flex items-center gap-2">
                  ${item.price
                    ? `<span class="text-sm font-bold text-vinho">R$\u00a0${Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`
                    : item.status === 'possivel'
                      ? `<span class="text-xs font-semibold text-purple-400">💰 Valor a confirmar</span>`
                      : `<span class="text-xs text-slate-300">Sem preço</span>`
                  }
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${prioColor}">${sanitizeHTML(item.priority || 'Média')}</span>
                </div>
                <div class="flex items-center">
                  <button data-action="hi-toggle-status" data-id="${sanitizeAttr(item.id)}"
                    aria-label="Alternar status do item"
                    title="Alternar status"
                    class="btn-icon text-slate-400 hover:text-vinho rounded-lg">🔄</button>
                  <button data-action="hi-edit" data-id="${sanitizeAttr(item.id)}"
                    aria-label="Editar item"
                    title="Editar"
                    class="btn-icon text-slate-400 hover:text-vinho rounded-lg">✏️</button>
                  <button data-action="hi-delete" data-id="${sanitizeAttr(item.id)}"
                    aria-label="Remover item"
                    title="Remover"
                    class="btn-icon text-red-300 hover:text-red-500 rounded-lg">✕</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
      if (window.lucide) lucide.createIcons();
      renderHomeItemsBudget();
    }

    function renderHomeItemsBudget() {
      const items = [..._homeItemStore.values()];

      const buyItems       = items.filter(i => i.status === 'precisamos');
      const buyTotal       = buyItems.reduce((s, i) => s + (Number(i.price) || 0), 0);
      const buyNoPrice     = buyItems.filter(i => !i.price || Number(i.price) === 0).length;

      const promisedItems  = items.filter(i => i.status === 'possivel');
      const promisedTotal  = promisedItems.reduce((s, i) => s + (Number(i.price) || 0), 0);
      const promisedNoPrice = promisedItems.filter(i => !i.price || Number(i.price) === 0).length;

      const haveItems      = items.filter(i => i.status === 'temos');
      const netInvestment  = Math.max(0, buyTotal - promisedTotal);

      const fmt = n => n > 0
        ? `R$\u00a0${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'R$ \u2014';

      const el = id => document.getElementById(id);
      const plural = (n, s) => `${n} ite${n === 1 ? 'm' : 'ns'}${s ? ` \u00b7 ${s}` : ''}`;

      if (el('hi-budget-buy'))          el('hi-budget-buy').textContent = fmt(buyTotal);
      if (el('hi-budget-buy-sub'))      el('hi-budget-buy-sub').textContent =
        plural(buyItems.length, buyNoPrice ? `${buyNoPrice} s/ valor` : '');

      if (el('hi-budget-promised'))     el('hi-budget-promised').textContent = fmt(promisedTotal);
      if (el('hi-budget-promised-sub')) el('hi-budget-promised-sub').textContent =
        plural(promisedItems.length, promisedNoPrice ? `${promisedNoPrice} s/ valor` : '');

      if (el('hi-budget-have'))         el('hi-budget-have').textContent =
        plural(haveItems.length, '');

      if (el('hi-budget-net'))          el('hi-budget-net').textContent = fmt(netInvestment);

      // Atualiza card do Dashboard
      if (el('dash-home-buy-total'))    el('dash-home-buy-total').textContent = fmt(buyTotal);
      if (el('dash-home-promised'))     el('dash-home-promised').textContent =
        `${promisedItems.length} prometido${promisedItems.length !== 1 ? 's' : ''}` +
        (promisedNoPrice ? ` (${promisedNoPrice} s/ valor)` : '');
      if (el('dash-home-net'))          el('dash-home-net').textContent = fmt(netInvestment);
    }

    function setHomeItemFilter(filter) {
      _homeItemFilter = filter;
      ['all', 'precisamos', 'possivel', 'temos'].forEach(f => {
        const btn = document.getElementById(`hi-filter-${f}`);
        if (!btn) return;
        const active = f === filter;
        btn.setAttribute('aria-pressed', String(active));
        if (active) {
          btn.classList.add('bg-vinho', 'text-white');
          btn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        } else {
          btn.classList.remove('bg-vinho', 'text-white');
          btn.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        }
      });
      renderHomeItems([..._homeItemStore.values()]);
    }

    async function addHomeItem() {
      const name     = document.getElementById('hiName').value.trim();
      const category = document.getElementById('hiCategory').value;
      const status   = document.getElementById('hiStatus').value;
      const priority = document.getElementById('hiPriority').value;
      const price    = parseFloat(document.getElementById('hiPrice').value) || 0;
      const notes    = document.getElementById('hiNotes').value.trim();
      const buy_link    = document.getElementById('hiBuyLink').value.trim();
      const promised_by  = document.getElementById('hiPromisedBy').value.trim();

      if (!name) { showToast('Informe o nome do item!', 'error'); return; }

      const preview = (_currentPreviewData && !_currentPreviewData.error) ? _currentPreviewData : {};

      let link_domain = preview.domain || '';
      if (!link_domain && buy_link) {
        try { link_domain = new URL(buy_link).hostname.replace(/^www\./, ''); } catch { link_domain = ''; }
      }

      const payload = {
        name, category, status, priority, price, notes, buy_link, promised_by,
        link_title:       preview.title       || '',
        link_image:       preview.image       || '',
        link_description: preview.description || '',
        link_domain,
      };

      if (_editingHomeItemId) {
        const { error } = await supabaseClient
          .from('home_items')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', _editingHomeItemId);
        if (error) { showToast('Erro ao atualizar item', 'error'); console.error(error); return; }
        await logAudit('home_items', _editingHomeItemId, 'UPDATE', null, payload);
        showToast('Item atualizado!', 'success');
        _editingHomeItemId = null;
        document.getElementById('hiCancelBtn').classList.add('hidden');
      } else {
        const { data, error } = await supabaseClient
          .from('home_items')
          .insert([payload])
          .select('id')
          .single();
        if (error) { showToast('Erro ao salvar item', 'error'); console.error(error); return; }
        if (data?.id) await logAudit('home_items', data.id, 'INSERT', null, payload);
        showToast('Item salvo!', 'success');
      }

      _clearHomeItemForm();
      fetchHomeItems();
    }

    function _clearHomeItemForm() {
      ['hiName', 'hiNotes', 'hiBuyLink', 'hiPrice', 'hiPromisedBy'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      document.getElementById('hiCategory').value = '';
      document.getElementById('hiStatus').value   = 'precisamos';
      document.getElementById('hiPriority').value = 'Alta';
      const preview = document.getElementById('hiLinkPreview');
      if (preview) preview.classList.add('hidden');
      _currentPreviewData = null;
    }

    function editHomeItem(id) {
      const item = _homeItemStore.get(id);
      if (!item) return;
      _editingHomeItemId = id;
      document.getElementById('hiName').value       = item.name       || '';
      document.getElementById('hiCategory').value   = item.category   || '';
      document.getElementById('hiStatus').value     = item.status     || 'precisamos';
      document.getElementById('hiPriority').value   = item.priority   || 'Média';
      document.getElementById('hiPrice').value      = item.price      || '';
      document.getElementById('hiNotes').value      = item.notes      || '';
      document.getElementById('hiBuyLink').value    = item.buy_link   || '';
      document.getElementById('hiPromisedBy').value = item.promised_by || '';
      document.getElementById('hiCancelBtn').classList.remove('hidden');

      if (item.buy_link && (item.link_title || item.link_image)) {
        _currentPreviewData = {
          title: item.link_title, image: item.link_image,
          description: item.link_description, domain: item.link_domain
        };
        renderLinkPreviewCard(_currentPreviewData);
      } else {
        document.getElementById('hiLinkPreview').classList.add('hidden');
        _currentPreviewData = null;
      }

      document.getElementById('hiName').focus();
      document.getElementById('hiName').scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast(`Editando: ${item.name || 'item'}`, 'success');
    }

    function cancelHomeItemEdit() {
      _editingHomeItemId = null;
      document.getElementById('hiCancelBtn').classList.add('hidden');
      _clearHomeItemForm();
    }

    async function deleteHomeItem(id) {
      showUndoToast('Item removido', async () => {
        const { error } = await supabaseClient.from('home_items').delete().eq('id', id);
        if (error) { showToast('Erro ao remover item', 'error'); console.error(error); return; }
        await logAudit('home_items', id, 'DELETE');
        fetchHomeItems();
      });
    }

    async function toggleHomeItemStatus(id) {
      const item = _homeItemStore.get(id);
      if (!item) return;
      const cycle = { precisamos: 'possivel', possivel: 'temos', temos: 'precisamos' };
      const newStatus = cycle[item.status] || 'precisamos';
      const { error } = await supabaseClient
        .from('home_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) { showToast('Erro ao atualizar status', 'error'); return; }
      const toastMsg = {
        temos:     '✅ Marcado como "Já temos"!',
        possivel:  '🤞 Marcado como "Possível / Prometido"',
        precisamos: '🛒 Movido para "Precisamos"'
      };
      showToast(toastMsg[newStatus] || 'Status atualizado', 'success');
      fetchHomeItems();
    }

    // Link preview (estilo WhatsApp)
    function debounceLinkPreview(url) {
      clearTimeout(_linkPreviewTimer);
      const previewEl = document.getElementById('hiLinkPreview');
      if (!url || !url.startsWith('http')) {
        if (previewEl) previewEl.classList.add('hidden');
        _currentPreviewData = null;
        return;
      }
      _linkPreviewTimer = setTimeout(() => fetchAndShowLinkPreview(url), 1200);
    }

    function triggerLinkPreview() {
      const url = (document.getElementById('hiBuyLink').value || '').trim();
      if (url) fetchAndShowLinkPreview(url);
    }

    async function fetchAndShowLinkPreview(url) {
      const previewEl = document.getElementById('hiLinkPreview');
      if (!previewEl) return;
      previewEl.innerHTML = `
        <div class="flex items-center gap-2 p-3 bg-slate-100 rounded-xl text-sm text-slate-500">
          <i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Carregando prévia...
        </div>`;
      previewEl.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        _currentPreviewData = (data && !data.error) ? data : null;
        renderLinkPreviewCard(data, previewEl);
      } catch {
        previewEl.innerHTML = `<div class="p-3 bg-red-50 rounded-xl text-xs text-red-400">Não foi possível carregar a prévia do link.</div>`;
        _currentPreviewData = null;
      }
    }

    function renderLinkPreviewCard(data, el) {
      if (!el) el = document.getElementById('hiLinkPreview');
      if (!el) return;
      if (!data || (!data.title && !data.image && !data.domain)) {
        el.innerHTML = `
          <div class="p-3 bg-amber-50 rounded-xl text-xs text-amber-600 flex items-center gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4"></i>
            O site não disponibilizou prévia para este link. O link será salvo mesmo assim.
          </div>`;
        el.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
        return;
      }
      el.innerHTML = `
        <a href="${sanitizeAttr(data.url || '')}" target="_blank" rel="noopener noreferrer"
           class="block rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
          ${data.image ? `<img src="${sanitizeAttr(data.image)}" alt="" class="w-full h-44 object-cover" onerror="this.style.display='none'" />` : ''}
          <div class="p-3 border-t border-slate-100">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">${sanitizeHTML(data.domain || '')}</p>
            ${data.title ? `<p class="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">${sanitizeHTML(data.title)}</p>` : ''}
            ${data.description ? `<p class="text-xs text-slate-500 mt-1 line-clamp-2">${sanitizeHTML(data.description)}</p>` : ''}
          </div>
        </a>
      `;
      el.classList.remove('hidden');
    }
    // ============================================================

    function showToast(message, type = 'success') {
      showToastGlobal(message, type);
    }

    function showUndoToast(message, onConfirm, duration = 5000) {
      let t = document.getElementById('undo-toast');
      if (t) { t.remove(); }
      t = document.createElement('div');
      t.id = 'undo-toast';
      t.style.cssText = 'position:fixed;bottom:6rem;left:50%;transform:translateX(-50%) translateY(20px);padding:0.75rem 1rem;border-radius:1rem;color:white;font-size:0.8rem;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.2);z-index:9999;opacity:0;transition:all 0.3s;display:flex;align-items:center;gap:0.75rem;background:#1a1a2e;white-space:nowrap;';
      t.innerHTML = `<span>${message}. Clique em Confirmar para apagar.</span><button id="undo-btn-confirm" style="background:rgba(239,68,68,0.8);border:none;color:white;padding:0.3rem 0.75rem;border-radius:0.5rem;font-size:0.75rem;font-weight:700;cursor:pointer;white-space:nowrap">Confirmar</button><button id="undo-btn-cancel" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:0.3rem 0.75rem;border-radius:0.5rem;font-size:0.75rem;font-weight:700;cursor:pointer;white-space:nowrap">Cancelar</button>`;
      document.body.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
      const dismiss = () => {
        t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => { if (t.parentNode) t.remove(); }, 300);
      };
      // Auto-dismiss (cancel) after duration
      const timer = setTimeout(() => { dismiss(); showToastGlobal('Ação cancelada', 'info'); }, duration);
      document.getElementById('undo-btn-confirm').addEventListener('click', () => {
        clearTimeout(timer);
        dismiss();
        onConfirm();
      });
      document.getElementById('undo-btn-cancel').addEventListener('click', () => {
        clearTimeout(timer);
        dismiss();
        showToastGlobal('Ação cancelada', 'info');
      });
    }
      function toggleFab() {
        const menu = document.getElementById('fab-menu');
        const main = document.getElementById('fab-main');
        menu.classList.toggle('active');
        main.classList.toggle('active');
      }
      
      function quickAction(type) {
        toggleFab();
        switch(type) {
          case 'guest': switchTab('guests'); break;
          case 'expense': switchTab('expenses'); break;
          case 'task': switchTab('tasks'); break;
          case 'gallery': window.open('gallery.html', '_blank'); return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

    function toggleExpenseEditModal(show) {
      const modal = document.getElementById('expenseEditModal');
      if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'items-center', 'justify-center');
      } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'items-center', 'justify-center');
      }
    }

    window.toggleExpenseEditModal = toggleExpenseEditModal;

    function openExpenseEditModal(e) {
      document.getElementById('editExpenseId').value = e.id;
      document.getElementById('editExpenseItem').value = e.item || '';
      document.getElementById('editExpenseCategory').value = e.category || '';
      document.getElementById('editExpenseAmount').value = e.amount || '';
      toggleExpenseEditModal(true);
    }

    window.saveExpenseEdit = async function saveExpenseEdit() {
      const btn = document.querySelector('button[onclick="saveExpenseEdit()"]');
      setButtonLoading(btn, true);
      const id = document.getElementById('editExpenseId').value;
      const item = document.getElementById('editExpenseItem').value.trim();
      const category = document.getElementById('editExpenseCategory').value.trim();
      const amountRaw = document.getElementById('editExpenseAmount').value;
      const amount = parseMoney(amountRaw);

      if (!item || amount < 0) {
        showToastGlobal('Preencha a descrição e um valor válido.', 'error');
        setButtonLoading(btn, false);
        return;
      }

      toggleExpenseEditModal(false);
      const { error } = await supabaseClient.from('expenses').update({ item, category, amount }).eq('id', id);
      if (error) {
        showToastGlobal('Erro ao atualizar lançamento.', 'error');
        console.error('Update expense error:', error);
      } else {
        showToastGlobal('Lançamento atualizado!');
        await fetchExpenses();
      }
      setButtonLoading(btn, false);
    };
