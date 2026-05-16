import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const DEFAULT_EVENT_INFO = {
  date: '06 de fevereiro de 2027',
  time: '08:00',
  place: 'Paroquia Nossa Senhora de Fatima Cancellia - Cascavel/PR',
};

const INVITE_TEMPLATES = {
  classico: 'Com carinho, queremos muito celebrar esse momento com voce.',
  familia: 'Sua presenca e muito importante para a nossa familia. Esperamos voce no nosso grande dia.',
  especial: 'Preparamos tudo com muito amor e ficaremos felizes em viver esse momento ao seu lado.',
};

function getStatusClasses(status) {
  if (status === 'confirmado') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'recusado') return 'bg-slate-100 text-rose-700 border-rose-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11) return `55${digits}`;
  return digits;
}

function formatDateTime(dateIso) {
  if (!dateIso) return '-';
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGuest, setNewGuest] = useState({ name: '', phone: '' });
  const [editingGuestId, setEditingGuestId] = useState(null);
  const [editingGuest, setEditingGuest] = useState({ name: '', phone: '', rsvp_status: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('recentes');
  const [selectedTemplate, setSelectedTemplate] = useState('classico');
  const [inviteBuilder, setInviteBuilder] = useState({
    guestId: '',
    customMessage: INVITE_TEMPLATES.classico,
    ...DEFAULT_EVENT_INFO,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchGuests();

    const channel = supabase
      .channel('guests-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, () => {
        fetchGuests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 2800);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    setInviteBuilder((prev) => ({
      ...prev,
      customMessage: INVITE_TEMPLATES[selectedTemplate],
    }));
  }, [selectedTemplate]);

  async function fetchGuests() {
    const { data, error: fetchError } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError('Nao foi possivel carregar convidados.');
      setLoading(false);
      return;
    }

    setGuests(data || []);
    setLoading(false);
  }

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  function showSuccess(message) {
    setError('');
    setSuccess(message);
  }

  const summary = useMemo(() => {
    const confirmed = guests.filter((guest) => guest.rsvp_status === 'confirmado').length;
    const declined = guests.filter((guest) => guest.rsvp_status === 'recusado').length;
    const pending = guests.length - confirmed - declined;

    return {
      total: guests.length,
      confirmed,
      declined,
      pending,
      attendanceRate: guests.length > 0 ? Math.round((confirmed / guests.length) * 100) : 0,
    };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    let list = [...guests];

    if (statusFilter !== 'todos') {
      list = list.filter((guest) => guest.rsvp_status === statusFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((guest) => {
        const name = (guest.name || '').toLowerCase();
        const phone = (guest.phone || '').toLowerCase();
        return name.includes(q) || phone.includes(q);
      });
    }

    if (sortBy === 'nome') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    } else if (sortBy === 'antigos') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [guests, searchTerm, statusFilter, sortBy]);

  const selectedGuest = useMemo(
    () => guests.find((guest) => guest.id === inviteBuilder.guestId) || null,
    [guests, inviteBuilder.guestId]
  );

  function getInviteLink(token) {
    // Aponta para o rsvp.html na raiz do site
    return `${window.location.origin}/rsvp.html?token=${token}`;
  }

  function getInviteQrCode(token) {
    return `https://quickchart.io/qr?size=250&text=${encodeURIComponent(getInviteLink(token))}`;
  }

  function exportGuestsXlsx() {
    clearMessages();
    try {
      const data = guests.map((guest) => ({
        Nome: guest.name || '',
        Telefone: guest.phone || '',
        Status: guest.rsvp_status || '',
        Link: getInviteLink(guest.invite_token),
        'Convidado por': guest.invited_by || '',
        'Data Cadastro': formatDateTime(guest.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Convidados');
      XLSX.writeFile(wb, 'convidados-casamento.xlsx');
      showSuccess('Excel exportado com sucesso.');
    } catch (err) {
      setError('Erro ao exportar Excel.');
    }
  }

  function exportGuestsPdfSummary() {
    clearMessages();
    try {
      const doc = new jsPDF();
      doc.setTextColor('#120a74');
      doc.setFontSize(18);
      doc.text('Lista de Convidados - Jefferson & Beatriz', 14, 15);
      doc.setFontSize(10);
      doc.setTextColor('#666666');
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

      const tableData = filteredGuests.map((g) => [
        g.name || '-',
        g.phone || '-',
        g.rsvp_status || 'aguardando',
        g.invited_by || 'admin'
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Nome', 'Telefone', 'Status', 'Convidado por']],
        body: tableData,
        headStyles: { fillColor: [18, 10, 116] },
        alternateRowStyles: { fillColor: [245, 230, 211, 0.2] },
      });

      doc.save('lista-convidados-casamento.pdf');
      showSuccess('PDF da lista exportado com sucesso.');
    } catch (err) {
      console.error(err);
      setError('Erro ao exportar PDF da lista.');
    }
  }

  async function generatePdfInvite(guest) {
    if (!guest) return;
    clearMessages();
    showSuccess('Gerando PDF... Aguarde.');

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      const primaryColor = '#120a74';
      const accentColor = '#f9fafb';
      
      // Fundo e bordas elegantes
      doc.setFillColor(accentColor);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277);
      doc.setLineWidth(0.2);
      doc.rect(12, 12, 186, 273);
      
      // Título
      doc.setTextColor(primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(32);
      doc.text('Jefferson & Beatriz', 105, 45, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(16);
      doc.text('Convite Especial', 105, 55, { align: 'center' });
      
      // Divisor
      doc.setDrawColor(primaryColor);
      doc.line(70, 65, 140, 65);
      
      // Mensagem
      doc.setTextColor('#333333');
      doc.setFontSize(14);
      const messageLines = doc.splitTextToSize(`Olá, ${guest.name}!\n\nPreparamos este dia com muito carinho e sua presença é fundamental para tornar nossa celebração completa.\n\n${inviteBuilder.date} às ${inviteBuilder.time}\n${inviteBuilder.place}\n\n${inviteBuilder.customMessage}`, 150);
      doc.text(messageLines, 105, 85, { align: 'center', lineHeightFactor: 1.5 });
      
      // Link Chamada
      const nextY = 160;
      doc.setTextColor(primaryColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PARA CONFIRMAR SUA PRESENÇA E VER O MAPA:', 105, nextY, { align: 'center' });
      
      // QR Code
      const qrUrl = getInviteQrCode(guest.invite_token);
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = qrUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      doc.addImage(img, 'PNG', 70, nextY + 10, 70, 70);
      
      // Link Texto
      doc.setTextColor('#0000EE');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(getInviteLink(guest.invite_token), 105, nextY + 85, { align: 'center' });
      
      doc.setTextColor('#666666');
      doc.setFontSize(9);
      doc.text('Aponte a câmera do celular para o código acima', 105, nextY + 92, { align: 'center' });

      doc.save(`Convite_${guest.name.replace(/\s+/g, '_')}.pdf`);
      showSuccess('PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      setError('Erro ao gerar o PDF. Verifique sua conexão.');
    }
  }

  async function generateAllPdfs() {
    const confirm = window.confirm(`Deseja gerar os PDFs de todos os ${filteredGuests.length} convidados filtrados? Isso pode levar algum tempo.`);
    if (!confirm) return;
    
    for (const guest of filteredGuests) {
      await generatePdfInvite(guest);
      // Pequeno delay para não sobrecarregar o browser
      await new Promise(r => setTimeout(r, 500));
    }
    showSuccess('Todos os PDFs foram processados.');
  }

  function buildInviteText(guest) {
    if (!guest) return '';

    return [
      `Ola, ${guest.name}!`,
      '',
      'Voce esta convidado(a) para o nosso casamento.',
      `${inviteBuilder.date} as ${inviteBuilder.time}`,
      inviteBuilder.place,
      '',
      inviteBuilder.customMessage,
      '',
      'Confirme sua presenca no seu link individual:',
      getInviteLink(guest.invite_token),
    ].join('\n');
  }

  async function addGuest(event) {
    event.preventDefault();
    clearMessages();

    if (!newGuest.name.trim()) {
      setError('Informe o nome do convidado.');
      return;
    }

    try {
      // Fallback para crypto.randomUUID()
      const token = window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const { error: insertError } = await supabase.from('guests').insert({
        name: newGuest.name.trim(),
        phone: newGuest.phone.trim(),
        rsvp_status: 'aguardando',
        invite_token: token,
        invited_by: user?.email || 'admin',
      });

      if (insertError) {
        console.error('Erro ao inserir convidado:', insertError);
        throw insertError;
      }

      setNewGuest({ name: '', phone: '' });
      showSuccess('Convidado adicionado com sucesso.');
    } catch (err) {
      console.error(err);
      setError(`Nao foi possivel adicionar convidado: ${err.message || 'Erro desconhecido'}`);
    }
  }

  async function updateGuestStatus(id, rsvpStatus) {
    clearMessages();
    try {
      const { error: updateError } = await supabase
        .from('guests')
        .update({ rsvp_status: rsvpStatus })
        .eq('id', id);

      if (updateError) throw updateError;

      showSuccess('Status de RSVP atualizado.');
    } catch {
      setError('Erro ao atualizar RSVP.');
    }
  }

  function startEditGuest(guest) {
    clearMessages();
    setEditingGuestId(guest.id);
    setEditingGuest({
      name: guest.name || '',
      phone: guest.phone || '',
      rsvp_status: guest.rsvp_status || 'aguardando',
    });
  }

  function cancelEditGuest() {
    setEditingGuestId(null);
    setEditingGuest({ name: '', phone: '', rsvp_status: '' });
  }

  async function saveGuestEdit(id) {
    clearMessages();

    if (!editingGuest.name.trim()) {
      setError('O nome do convidado e obrigatorio.');
      return;
    }

    const { error: updateError } = await supabase
      .from('guests')
      .update({
        name: editingGuest.name.trim(),
        phone: editingGuest.phone.trim(),
        rsvp_status: editingGuest.rsvp_status,
      })
      .eq('id', id);

    if (updateError) {
      setError('Nao foi possivel salvar alteracoes do convite.');
      return;
    }

    cancelEditGuest();
    showSuccess('Convidado atualizado com sucesso.');
  }

  async function deleteGuest(id) {
    clearMessages();
    const confirmed = window.confirm('Deseja realmente remover este convidado?');
    if (!confirmed) return;

    const { error: deleteError } = await supabase.from('guests').delete().eq('id', id);

    if (deleteError) {
      setError('Nao foi possivel remover convidado.');
      return;
    }

    showSuccess('Convidado removido com sucesso.');
  }

  async function regenerateToken(guestId) {
    clearMessages();
    const token = crypto.randomUUID();

    const { error: updateError } = await supabase
      .from('guests')
      .update({ invite_token: token })
      .eq('id', guestId);

    if (updateError) {
      setError('Nao foi possivel gerar novo link individual.');
      return;
    }

    showSuccess('Novo link de convite gerado.');
  }

  async function copyToClipboard(text, successMessage, errorMessage) {
    clearMessages();
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(successMessage);
    } catch {
      setError(errorMessage);
    }
  }

  function openWhatsAppInvite(guest) {
    clearMessages();
    const digits = normalizePhone(guest.phone);
    if (!digits) {
      setError('Esse convidado nao possui telefone cadastrado.');
      return;
    }

    const message = encodeURIComponent(buildInviteText(guest));
    window.open(`https://wa.me/${digits}?text=${message}`, '_blank', 'noopener,noreferrer');
  }

  function openRsvpPage(guest) {
    const link = getInviteLink(guest.invite_token);
    window.open(link, '_blank', 'noopener,noreferrer');
  }

  function exportGuestsCsv() {
    clearMessages();
    const headers = ['nome', 'telefone', 'status_rsvp', 'link_convite', 'criado_em'];
    const rows = guests.map((guest) => [
      guest.name || '',
      guest.phone || '',
      guest.rsvp_status || '',
      getInviteLink(guest.invite_token),
      formatDateTime(guest.created_at),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'convidados-casamento.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess('CSV exportado com sucesso.');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-champagne/70 via-slate-50 to-white p-4 md:p-8 font-corpo text-zinc-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white/90 p-5 md:p-7 shadow-sm">
          <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-slate-100/70 blur-xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="uppercase tracking-[0.25em] text-[0.65rem] text-[#120a74]/70">Area privada</p>
              <h1 className="mt-1 font-titulo text-3xl text-[#120a74] md:text-4xl">Central de Organizacao</h1>
              <p className="mt-2 text-sm text-zinc-600">Painel do casal para convidados, RSVP e convites digitais.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-[#120a74]/80 border border-slate-100">{user?.email}</span>
              <button
                onClick={logout}
                className="rounded-full border border-[#120a74]/25 px-4 py-2 text-sm text-[#120a74] hover:bg-[#120a74]/5"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <nav className="rounded-2xl border border-slate-100 bg-white/90 p-2 flex flex-wrap gap-2 shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`rounded-full px-4 py-2 text-sm transition ${activeTab === 'overview' ? 'bg-[#120a74] text-white' : 'bg-slate-50 text-[#120a74] hover:bg-slate-100'}`}
          >
            Visao Geral
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`rounded-full px-4 py-2 text-sm transition ${activeTab === 'guests' ? 'bg-[#120a74] text-white' : 'bg-slate-50 text-[#120a74] hover:bg-slate-100'}`}
          >
            Gestao de Convidados
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`rounded-full px-4 py-2 text-sm transition ${activeTab === 'invites' ? 'bg-[#120a74] text-white' : 'bg-slate-50 text-[#120a74] hover:bg-slate-100'}`}
          >
            Criar Convites
          </button>
        </nav>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-slate-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {activeTab === 'overview' && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-white/90 p-4">
                <p className="text-xs text-zinc-500">Total de convidados</p>
                <p className="text-2xl font-semibold text-[#120a74]">{summary.total}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-xs text-emerald-600">Confirmados</p>
                <p className="text-2xl font-semibold text-emerald-700">{summary.confirmed}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs text-rose-600">Recusados</p>
                <p className="text-2xl font-semibold text-rose-700">{summary.declined}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <p className="text-xs text-amber-600">Aguardando</p>
                <p className="text-2xl font-semibold text-amber-700">{summary.pending}</p>
              </div>
              <div className="rounded-2xl border border-[#120a74]/15 bg-white/90 p-4">
                <p className="text-xs text-zinc-500">Taxa de confirmacao</p>
                <p className="text-2xl font-semibold text-[#120a74]">{summary.attendanceRate}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <article className="rounded-2xl border border-slate-100 bg-white/90 p-5">
                <h3 className="font-titulo text-2xl text-[#120a74]">Checklist rapido</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                  <li>Enviar convites para os convidados aguardando resposta.</li>
                  <li>Conferir convidados sem telefone cadastrado.</li>
                  <li>Fazer exportacao CSV da lista final para fornecedores.</li>
                  <li>Revisar RSVP na semana do evento.</li>
                </ul>
              </article>
              <article className="rounded-2xl border border-slate-100 bg-white/90 p-5">
                <h3 className="font-titulo text-2xl text-[#120a74]">Atalhos uteis</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('guests')}
                    className="rounded-full bg-[#120a74] px-4 py-2 text-xs font-semibold text-white hover:bg-[#120a74]/90"
                  >
                    Gerenciar convidados
                  </button>
                  <button
                    onClick={() => setActiveTab('invites')}
                    className="rounded-full border border-[#120a74]/25 px-4 py-2 text-xs font-semibold text-[#120a74] hover:bg-[#120a74]/5"
                  >
                    Montar convite digital
                  </button>
                  <button
                    onClick={exportGuestsXlsx}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Exportar Excel
                  </button>
                  <button
                    onClick={exportGuestsPdfSummary}
                    className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    Exportar PDF
                  </button>
                  <button
                    onClick={exportGuestsCsv}
                    className="rounded-full border border-[#120a74]/25 px-4 py-2 text-xs font-semibold text-[#120a74] hover:bg-[#120a74]/5"
                  >
                    Exportar CSV
                  </button>
                </div>
                <p className="mt-4 text-sm text-zinc-600">
                  O painel atualiza em tempo real conforme as confirmacoes chegam pelo link individual.
                </p>
              </article>
            </div>
          </section>
        )}

        {activeTab === 'guests' && (
          <section className="rounded-3xl border border-slate-100 bg-white/90 p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="font-titulo text-2xl text-[#120a74]">Gestao de Convidados</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportGuestsXlsx}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Exportar Excel
                </button>
                <button
                  onClick={exportGuestsPdfSummary}
                  className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Exportar PDF (Lista)
                </button>
                <button
                  onClick={exportGuestsCsv}
                  className="rounded-full border border-[#120a74]/25 px-4 py-2 text-xs font-semibold text-[#120a74] hover:bg-[#120a74]/5"
                >
                  Exportar CSV
                </button>
              </div>
            </div>

            <form onSubmit={addGuest} className="mt-4 grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto] gap-2">
              <input
                type="text"
                placeholder="Nome do convidado"
                value={newGuest.name}
                onChange={(e) => setNewGuest((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl border border-rose-200 px-3 py-2"
              />
              <input
                type="text"
                placeholder="Telefone (com DDD)"
                value={newGuest.phone}
                onChange={(e) => setNewGuest((prev) => ({ ...prev, phone: e.target.value }))}
                className="rounded-xl border border-rose-200 px-3 py-2"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#120a74] px-4 py-2 text-white font-medium hover:bg-[#120a74]/90"
              >
                Adicionar
              </button>
            </form>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Buscar por nome ou telefone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl border border-rose-200 px-3 py-2 text-sm"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-rose-200 px-3 py-2 text-sm"
              >
                <option value="todos">Todos os status</option>
                <option value="aguardando">Aguardando</option>
                <option value="confirmado">Confirmado</option>
                <option value="recusado">Recusado</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-rose-200 px-3 py-2 text-sm"
              >
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
                <option value="nome">Nome (A-Z)</option>
              </select>
            </div>

            <p className="mt-3 text-xs text-zinc-500">{filteredGuests.length} convidado(s) listado(s).</p>

            <div className="mt-4 space-y-3">
              {loading && <p className="text-sm text-zinc-500">Carregando convidados...</p>}
              {!loading && filteredGuests.length === 0 && <p className="text-sm text-zinc-500">Nenhum convidado encontrado.</p>}

              {filteredGuests.map((guest) => {
                const inviteLink = getInviteLink(guest.invite_token);

                return (
                  <article key={guest.id} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 md:p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1">
                        {editingGuestId === guest.id ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={editingGuest.name}
                              onChange={(e) => setEditingGuest((prev) => ({ ...prev, name: e.target.value }))}
                              className="rounded-xl border border-rose-200 px-3 py-2 text-sm"
                              placeholder="Nome"
                            />
                            <input
                              type="text"
                              value={editingGuest.phone}
                              onChange={(e) => setEditingGuest((prev) => ({ ...prev, phone: e.target.value }))}
                              className="rounded-xl border border-rose-200 px-3 py-2 text-sm"
                              placeholder="Telefone"
                            />
                            <select
                              value={editingGuest.rsvp_status}
                              onChange={(e) => setEditingGuest((prev) => ({ ...prev, rsvp_status: e.target.value }))}
                              className="rounded-xl border border-rose-200 px-3 py-2 text-sm"
                            >
                              <option value="aguardando">Aguardando</option>
                              <option value="confirmado">Confirmado</option>
                              <option value="recusado">Recusado</option>
                            </select>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-zinc-900">{guest.name}</p>
                            <p className="text-xs text-zinc-500 mt-1">{guest.phone || 'Sem telefone cadastrado'}</p>
                            <p className="text-[11px] text-zinc-500 mt-1">Atualizado em {formatDateTime(guest.updated_at)}</p>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusClasses(guest.rsvp_status)}`}>
                          {guest.rsvp_status}
                        </span>
                        <button
                          onClick={() => updateGuestStatus(guest.id, 'confirmado')}
                          className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => updateGuestStatus(guest.id, 'recusado')}
                          className="rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] text-rose-700 hover:bg-slate-50"
                        >
                          Recusar
                        </button>
                        <button
                          onClick={() => updateGuestStatus(guest.id, 'aguardando')}
                          className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] text-amber-700 hover:bg-amber-50"
                        >
                          Pendente
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {editingGuestId === guest.id ? (
                        <>
                          <button
                            onClick={() => saveGuestEdit(guest.id)}
                            className="rounded-full bg-[#120a74] px-4 py-2 text-xs text-white"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={cancelEditGuest}
                            className="rounded-full border border-[#120a74]/25 px-4 py-2 text-xs text-[#120a74]"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditGuest(guest)}
                          className="rounded-full border border-[#120a74]/25 px-4 py-2 text-xs text-[#120a74] hover:bg-[#120a74]/5"
                        >
                          Editar dados
                        </button>
                      )}

                      <button
                        onClick={() => copyToClipboard(inviteLink, 'Link copiado.', 'Nao foi possivel copiar o link.')}
                        className="rounded-full border border-[#120a74]/25 px-4 py-2 text-xs text-[#120a74] hover:bg-[#120a74]/5"
                      >
                        Copiar link
                      </button>

                      <button
                        onClick={() => generatePdfInvite(guest)}
                        className="rounded-full border border-[#120a74]/25 px-4 py-2 text-xs text-[#120a74] hover:bg-[#120a74]/5"
                      >
                        Gerar PDF
                      </button>

                      <button
                        onClick={() => openWhatsAppInvite(guest)}
                        className="rounded-full border border-[#120a74]/25 px-4 py-2 text-xs text-[#120a74] hover:bg-[#120a74]/5"
                      >
                        WhatsApp
                      </button>

                      <button
                        onClick={() => openRsvpPage(guest)}
                        className="rounded-full border border-[#120a74]/25 px-4 py-2 text-xs text-[#120a74] hover:bg-[#120a74]/5"
                      >
                        Abrir RSVP
                      </button>

                      <button
                        onClick={() => regenerateToken(guest.id)}
                        className="rounded-full border border-amber-200 px-4 py-2 text-xs text-amber-700 hover:bg-amber-50"
                      >
                        Novo link
                      </button>

                      <button
                        onClick={() => deleteGuest(guest.id)}
                        className="rounded-full border border-rose-200 px-4 py-2 text-xs text-rose-700 hover:bg-slate-50"
                      >
                        Excluir
                      </button>
                    </div>

                    <input
                      readOnly
                      value={inviteLink}
                      className="mt-3 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs"
                    />
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'invites' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <article className="rounded-3xl border border-slate-100 bg-white/90 p-5 md:p-6 space-y-3">
              <h2 className="font-titulo text-2xl text-[#120a74]">Criador de Convites Digitais</h2>
              <p className="text-sm text-zinc-600">Monte mensagem, gere QR Code e envie por WhatsApp com link individual.</p>

              <select
                value={inviteBuilder.guestId}
                onChange={(e) => setInviteBuilder((prev) => ({ ...prev, guestId: e.target.value }))}
                className="w-full rounded-xl border border-rose-200 px-3 py-2"
              >
                <option value="">Selecione um convidado</option>
                {guests.map((guest) => (
                  <option key={guest.id} value={guest.id}>{guest.name}</option>
                ))}
              </select>

              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full rounded-xl border border-rose-200 px-3 py-2"
              >
                <option value="classico">Template Classico</option>
                <option value="familia">Template Familia</option>
                <option value="especial">Template Especial</option>
              </select>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={inviteBuilder.date}
                  onChange={(e) => setInviteBuilder((prev) => ({ ...prev, date: e.target.value }))}
                  className="rounded-xl border border-rose-200 px-3 py-2"
                  placeholder="Data"
                />
                <input
                  type="text"
                  value={inviteBuilder.time}
                  onChange={(e) => setInviteBuilder((prev) => ({ ...prev, time: e.target.value }))}
                  className="rounded-xl border border-rose-200 px-3 py-2"
                  placeholder="Horario"
                />
              </div>

              <input
                type="text"
                value={inviteBuilder.place}
                onChange={(e) => setInviteBuilder((prev) => ({ ...prev, place: e.target.value }))}
                className="w-full rounded-xl border border-rose-200 px-3 py-2"
                placeholder="Local"
              />

              <textarea
                value={inviteBuilder.customMessage}
                onChange={(e) => setInviteBuilder((prev) => ({ ...prev, customMessage: e.target.value }))}
                className="w-full rounded-xl border border-rose-200 px-3 py-2 min-h-[120px]"
                placeholder="Mensagem personalizada"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => selectedGuest && generatePdfInvite(selectedGuest)}
                  disabled={!selectedGuest}
                  className="rounded-full bg-[#120a74] px-4 py-2 text-sm text-white disabled:opacity-40"
                >
                  Gerar Convite PDF
                </button>
                <button
                  onClick={generateAllPdfs}
                  className="rounded-full border border-[#120a74]/25 px-4 py-2 text-sm text-[#120a74]"
                >
                  Gerar todos os PDFs
                </button>
                <button
                  onClick={() => selectedGuest && openWhatsAppInvite(selectedGuest)}
                  disabled={!selectedGuest}
                  className="rounded-full border border-[#120a74]/25 px-4 py-2 text-sm text-[#120a74] disabled:opacity-40"
                >
                  Enviar no WhatsApp
                </button>
                <button
                  onClick={() => selectedGuest && openRsvpPage(selectedGuest)}
                  disabled={!selectedGuest}
                  className="rounded-full border border-[#120a74]/25 px-4 py-2 text-sm text-[#120a74] disabled:opacity-40"
                >
                  Abrir pagina RSVP
                </button>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-100 bg-white/90 p-5 md:p-6">
              <h3 className="font-titulo text-2xl text-[#120a74]">Pre-visualizacao</h3>
              {!selectedGuest && <p className="mt-3 text-sm text-zinc-500">Selecione um convidado para gerar o convite.</p>}

              {selectedGuest && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#120a74]/70">Convite digital</p>
                    <p className="mt-1 font-titulo text-2xl text-[#120a74]">Jefferson & Beatriz</p>
                    <p className="mt-2 text-sm text-zinc-700">Convidado: <strong>{selectedGuest.name}</strong></p>
                    <p className="text-sm text-zinc-700">{inviteBuilder.date} as {inviteBuilder.time}</p>
                    <p className="text-sm text-zinc-700">{inviteBuilder.place}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <pre className="whitespace-pre-wrap text-sm text-zinc-700 font-sans">{buildInviteText(selectedGuest)}</pre>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4 flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={getInviteQrCode(selectedGuest.invite_token)}
                      alt={`QR code do convite para ${selectedGuest.name}`}
                      className="h-36 w-36 rounded-xl border border-slate-100"
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-800">QR Code do link individual</p>
                      <p className="mt-1 text-xs text-zinc-500">Gerado via QuickChart API para facilitar confirmacao.</p>
                      <button
                        onClick={() => copyToClipboard(getInviteLink(selectedGuest.invite_token), 'Link copiado.', 'Nao foi possivel copiar o link.')}
                        className="mt-3 rounded-full border border-[#120a74]/25 px-4 py-2 text-xs text-[#120a74] hover:bg-[#120a74]/5"
                      >
                        Copiar link do convite
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
