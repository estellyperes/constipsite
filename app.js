import { supabase } from './supabase.js';

let bristolSelecionado = null;
let romaScoreAtual = 0;
let romaDiagnosticoAtual = 'Não calculado';
let chartGrupos = null;
let chartEvolucao = null;

const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const currentResearcher = document.getElementById('currentResearcher');

window.showSection = function (sectionName) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.add('hidden');
  });

  const target = document.getElementById(`section-${sectionName}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.side-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  const side = document.getElementById(`side-${sectionName}`);
  const tab = document.getElementById(`tab-${sectionName}`);

  if (side) side.classList.add('active');
  if (tab) tab.classList.add('active');
};

window.signupResearcher = async function () {
  try {
    const nome = document.getElementById('signupNome').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (!nome || !email || !password) {
      alert('Preencha nome, e-mail e senha para criar o acesso.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nome
        }
      }
    });

    if (error) throw error;

    alert('Acesso criado com sucesso.');
    document.getElementById('signupNome').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
  } catch (error) {
    alert(`Erro ao criar acesso: ${error.message}`);
  }
};

window.loginResearcher = async function () {
  try {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      alert('Preencha e-mail e senha.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    alert(`Erro no login: ${error.message}`);
  }
};

window.logoutResearcher = async function () {
  const { error } = await supabase.auth.signOut();
  if (error) alert(`Erro ao sair: ${error.message}`);
};

window.setBristol = function (tipo) {
  bristolSelecionado = Number(tipo);
  document.getElementById('bristolSelecionado').textContent = `Tipo ${tipo}`;

  document.querySelectorAll('.bristol-btn').forEach((btn, index) => {
    btn.classList.toggle('active', index + 1 === Number(tipo));
  });
};

window.calcularRoma = function () {
  let score = 0;
  for (let i = 1; i <= 6; i++) {
    if (document.getElementById(`roma${i}`).checked) score++;
  }

  romaScoreAtual = score;
  romaDiagnosticoAtual =
    score >= 2
      ? 'Compatível com constipação pelos critérios de Roma IV'
      : 'Não compatível com constipação pelos critérios de Roma IV';

  document.getElementById('romaResultado').textContent =
    `Pontuação: ${score} | ${romaDiagnosticoAtual}`;
};

function obterDadosFormulario() {
  return {
    nome: document.getElementById('nome').value.trim(),
    idade: toNullableInt(document.getElementById('idade').value),
    sexo: emptyToNull(document.getElementById('sexo').value),
    peso: toNullableFloat(document.getElementById('peso').value),
    grupo: emptyToNull(document.getElementById('grupo').value),
    anamnese: document.getElementById('anamnese').value.trim(),
    alimentacao: document.getElementById('alimentacao').value.trim(),
    hidratacao: document.getElementById('hidratacao').value.trim(),
    atividade_fisica: document.getElementById('atividade').value.trim(),
    medicamentos: document.getElementById('medicamentos').value.trim(),
    pre_procedimento: document.getElementById('pre').value.trim(),
    pre_data: emptyToNull(document.getElementById('preData').value),
    pos_procedimento: document.getElementById('pos').value.trim(),
    pos_data: emptyToNull(document.getElementById('posData').value),
    bristol: bristolSelecionado,
    roma_score: romaScoreAtual,
    roma_diagnostico: romaDiagnosticoAtual
  };
}

window.salvarOuAtualizarPaciente = async function () {
  try {
    const pacienteId = document.getElementById('pacienteId').value;
    const payload = obterDadosFormulario();

    if (!payload.nome) {
      alert('Preencha o nome do paciente.');
      return;
    }

    let result;
    if (pacienteId) {
      result = await supabase
        .from('pacientes')
        .update(payload)
        .eq('id', pacienteId)
        .select()
        .single();
    } else {
      result = await supabase
        .from('pacientes')
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    alert(pacienteId ? 'Paciente atualizado com sucesso.' : 'Paciente cadastrado com sucesso.');

    limparFormulario();
    await carregarPacientes();
    await carregarSelectsPacientes();
    await carregarConsultas();
    await carregarAuditoria();
    showSection('pacientes');
  } catch (error) {
    alert(`Erro ao salvar paciente: ${error.message}`);
  }
};

window.limparFormulario = function () {
  document.getElementById('pacienteId').value = '';
  document.getElementById('nome').value = '';
  document.getElementById('idade').value = '';
  document.getElementById('sexo').value = '';
  document.getElementById('peso').value = '';
  document.getElementById('grupo').value = '';
  document.getElementById('anamnese').value = '';
  document.getElementById('alimentacao').value = '';
  document.getElementById('hidratacao').value = '';
  document.getElementById('atividade').value = '';
  document.getElementById('medicamentos').value = '';
  document.getElementById('pre').value = '';
  document.getElementById('preData').value = '';
  document.getElementById('pos').value = '';
  document.getElementById('posData').value = '';
  document.getElementById('bristolSelecionado').textContent = 'Nenhum';
  document.getElementById('romaResultado').textContent = 'Aguardando cálculo';

  bristolSelecionado = null;
  romaScoreAtual = 0;
  romaDiagnosticoAtual = 'Não calculado';

  for (let i = 1; i <= 6; i++) {
    document.getElementById(`roma${i}`).checked = false;
  }

  document.querySelectorAll('.bristol-btn').forEach(btn => btn.classList.remove('active'));
};

window.carregarPacientes = async function () {
  try {
    const busca = document.getElementById('busca').value.trim();
    const filtroSexo = document.getElementById('filtroSexo').value;

    let query = supabase
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (busca) {
      query = query.or(`nome.ilike.%${busca}%,patient_code.ilike.%${busca}%`);
    }

    if (filtroSexo) {
      query = query.eq('sexo', filtroSexo);
    }

    const { data, error } = await query;
    if (error) throw error;

    renderizarTabelaPacientes(data || []);
    renderizarGraficoGrupos(data || []);
    renderizarTabelaAnamnese(data || []);
  } catch (error) {
    alert(`Erro ao carregar pacientes: ${error.message}`);
  }
};

function renderizarTabelaPacientes(pacientes) {
  const tbody = document.getElementById('tabelaPacientes');
  tbody.innerHTML = '';

  if (!pacientes.length) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhum paciente encontrado.</td></tr>`;
    return;
  }

  pacientes.forEach((paciente) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(paciente.patient_code || '')}</td>
      <td>${escapeHtml(paciente.nome || '')}</td>
      <td>${escapeHtml(paciente.sexo || '')}</td>
      <td>${escapeHtml(paciente.grupo || '')}</td>
      <td>${paciente.bristol ?? ''}</td>
      <td>${escapeHtml(paciente.updated_by_name || '')}</td>
      <td>
        <div class="row-actions">
          <button onclick="editarPaciente('${paciente.id}')">Editar</button>
          <button class="secondary" onclick="verGraficoPaciente('${paciente.id}', '${jsSafe(paciente.patient_code || '')}')">Evolução</button>
          <button class="secondary" onclick="excluirPaciente('${paciente.id}')">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderizarTabelaAnamnese(pacientes) {
  const tbody = document.getElementById('tabelaAnamnese');
  tbody.innerHTML = '';

  if (!pacientes.length) {
    tbody.innerHTML = `<tr><td colspan="4">Nenhuma anamnese encontrada.</td></tr>`;
    return;
  }

  pacientes.forEach((paciente) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(paciente.patient_code || '')}</td>
      <td>${escapeHtml(paciente.nome || '')}</td>
      <td>${escapeHtml(paciente.grupo || '')}</td>
      <td>${escapeHtml(paciente.anamnese || '')}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.editarPaciente = async function (id) {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    document.getElementById('pacienteId').value = data.id;
    document.getElementById('nome').value = data.nome || '';
    document.getElementById('idade').value = data.idade ?? '';
    document.getElementById('sexo').value = data.sexo || '';
    document.getElementById('peso').value = data.peso ?? '';
    document.getElementById('grupo').value = data.grupo || '';
    document.getElementById('anamnese').value = data.anamnese || '';
    document.getElementById('alimentacao').value = data.alimentacao || '';
    document.getElementById('hidratacao').value = data.hidratacao || '';
    document.getElementById('atividade').value = data.atividade_fisica || '';
    document.getElementById('medicamentos').value = data.medicamentos || '';
    document.getElementById('pre').value = data.pre_procedimento || '';
    document.getElementById('preData').value = data.pre_data || '';
    document.getElementById('pos').value = data.pos_procedimento || '';
    document.getElementById('posData').value = data.pos_data || '';

    bristolSelecionado = data.bristol ?? null;
    romaScoreAtual = data.roma_score ?? 0;
    romaDiagnosticoAtual = data.roma_diagnostico || 'Não calculado';

    document.getElementById('bristolSelecionado').textContent =
      bristolSelecionado ? `Tipo ${bristolSelecionado}` : 'Nenhum';

    document.getElementById('romaResultado').textContent =
      `Pontuação: ${romaScoreAtual} | ${romaDiagnosticoAtual}`;

    document.querySelectorAll('.bristol-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index + 1 === bristolSelecionado);
    });

    for (let i = 1; i <= 6; i++) {
      document.getElementById(`roma${i}`).checked = false;
    }

    showSection('cadastro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    alert(`Erro ao carregar paciente para edição: ${error.message}`);
  }
};

window.excluirPaciente = async function (id) {
  const confirmar = confirm('Tem certeza que deseja excluir este paciente?');
  if (!confirmar) return;

  try {
    const { error } = await supabase.from('pacientes').delete().eq('id', id);
    if (error) throw error;

    await carregarPacientes();
    await carregarSelectsPacientes();
    await carregarConsultas();
    await carregarAuditoria();
    alert('Paciente excluído com sucesso.');
  } catch (error) {
    alert(`Erro ao excluir paciente: ${error.message}`);
  }
};

window.salvarEvolucao = async function () {
  try {
    const paciente_id = document.getElementById('pacienteEvolucao').value;
    const data_avaliacao = document.getElementById('dataEvolucao').value;
    const bristol = toNullableInt(document.getElementById('bristolEvolucao').value);
    const roma_score = toNullableInt(document.getElementById('romaScoreEvolucao').value);
    const observacoes = document.getElementById('observacoesEvolucao').value.trim();

    if (!paciente_id || !data_avaliacao) {
      alert('Selecione o paciente e a data da evolução.');
      return;
    }

    const roma_diagnostico =
      (roma_score ?? 0) >= 2
        ? 'Compatível com constipação pelos critérios de Roma IV'
        : 'Não compatível com constipação pelos critérios de Roma IV';

    const { error } = await supabase.from('evolucoes').insert([{
      paciente_id,
      data_avaliacao,
      bristol,
      roma_score,
      roma_diagnostico,
      observacoes
    }]);

    if (error) throw error;

    document.getElementById('dataEvolucao').value = '';
    document.getElementById('bristolEvolucao').value = '';
    document.getElementById('romaScoreEvolucao').value = '';
    document.getElementById('observacoesEvolucao').value = '';

    alert('Evolução registrada com sucesso.');
    await carregarAuditoria();
    await verGraficoPaciente(paciente_id);
    showSection('graficos');
  } catch (error) {
    alert(`Erro ao salvar evolução: ${error.message}`);
  }
};

window.agendarConsulta = async function () {
  try {
    const paciente_id = document.getElementById('pacienteConsulta').value;
    const data_consulta = document.getElementById('dataConsulta').value;
    const observacoes = document.getElementById('obsConsulta').value.trim();
    const status = document.getElementById('statusConsulta').value;

    if (!paciente_id || !data_consulta) {
      alert('Selecione o paciente e a data da consulta.');
      return;
    }

    const { error } = await supabase.from('consultas').insert([{
      paciente_id,
      data_consulta,
      observacoes,
      status
    }]);

    if (error) throw error;

    document.getElementById('dataConsulta').value = '';
    document.getElementById('obsConsulta').value = '';
    document.getElementById('statusConsulta').value = 'Agendada';

    alert('Consulta salva com sucesso.');
    await carregarConsultas();
    await carregarAuditoria();
    showSection('agenda');
  } catch (error) {
    alert(`Erro ao salvar consulta: ${error.message}`);
  }
};

window.atualizarStatusConsulta = async function (consultaId, novoStatus) {
  try {
    const { error } = await supabase
      .from('consultas')
      .update({ status: novoStatus })
      .eq('id', consultaId);

    if (error) throw error;

    await carregarConsultas();
    await carregarAuditoria();
  } catch (error) {
    alert(`Erro ao atualizar status: ${error.message}`);
  }
};

window.limparFiltrosAgenda = function () {
  document.getElementById('filtroPesquisadorAgenda').value = '';
  document.getElementById('filtroStatusAgenda').value = '';
  carregarConsultas();
};

async function carregarConsultas() {
  try {
    const filtroPesquisador = document.getElementById('filtroPesquisadorAgenda')?.value || '';
    const filtroStatus = document.getElementById('filtroStatusAgenda')?.value || '';

    let query = supabase
      .from('consultas')
      .select(`
        id,
        data_consulta,
        status,
        observacoes,
        updated_by_name,
        pacientes (
          id,
          patient_code,
          nome
        )
      `)
      .order('data_consulta', { ascending: true });

    if (filtroPesquisador) {
      query = query.eq('updated_by_name', filtroPesquisador);
    }

    if (filtroStatus) {
      query = query.eq('status', filtroStatus);
    }

    const { data, error } = await query;
    if (error) throw error;

    preencherAgendaCompleta(data || []);
    preencherConsultasHoje(data || []);
    preencherKPIsAgenda(data || []);
    preencherFiltroPesquisadores(data || []);
  } catch (error) {
    alert(`Erro ao carregar consultas: ${error.message}`);
  }
}

function preencherAgendaCompleta(consultas) {
  const tbody = document.getElementById('tabelaAgenda');
  tbody.innerHTML = '';

  if (!consultas.length) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhuma consulta encontrada.</td></tr>`;
    return;
  }

  consultas.forEach((consulta) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarDataHora(consulta.data_consulta)}</td>
      <td>${escapeHtml(consulta.pacientes?.patient_code || '')}</td>
      <td>${escapeHtml(consulta.pacientes?.nome || '')}</td>
      <td>${renderStatusBadge(consulta.status)}</td>
      <td>${escapeHtml(consulta.updated_by_name || '')}</td>
      <td>${escapeHtml(consulta.observacoes || '')}</td>
      <td>
        <div class="row-actions">
          <button onclick="editarPaciente('${consulta.pacientes?.id || ''}')">Editar paciente</button>
          <button class="secondary" onclick="atualizarStatusConsulta('${consulta.id}', 'Realizada')">Marcar realizada</button>
          <button class="secondary" onclick="atualizarStatusConsulta('${consulta.id}', 'Cancelada')">Cancelar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function preencherConsultasHoje(consultas) {
  const tbody = document.getElementById('tabelaHoje');
  tbody.innerHTML = '';

  const hoje = new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);

  const consultasHoje = consultas.filter(c => {
    const data = new Date(c.data_consulta).toISOString().slice(0, 10);
    return data === hojeIso;
  });

  if (!consultasHoje.length) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhuma consulta marcada para hoje.</td></tr>`;
    return;
  }

  consultasHoje.forEach((consulta) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarHora(consulta.data_consulta)}</td>
      <td>${escapeHtml(consulta.pacientes?.patient_code || '')}</td>
      <td>${escapeHtml(consulta.pacientes?.nome || '')}</td>
      <td>${renderStatusBadge(consulta.status)}</td>
      <td>${escapeHtml(consulta.updated_by_name || '')}</td>
      <td>${escapeHtml(consulta.observacoes || '')}</td>
    `;
    tbody.appendChild(tr);
  });
}

function preencherKPIsAgenda(consultas) {
  const hoje = new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);

  const consultasHoje = consultas.filter(c => {
    const data = new Date(c.data_consulta).toISOString().slice(0, 10);
    return data === hojeIso;
  });

  const pesquisadores = [...new Set(
    consultas
      .map(c => c.updated_by_name)
      .filter(Boolean)
  )];

  document.getElementById('kpiHoje').textContent = consultasHoje.length;
  document.getElementById('kpiTotal').textContent = consultas.length;
  document.getElementById('kpiPesquisadores').textContent = pesquisadores.length;
}

function preencherFiltroPesquisadores(consultas) {
  const select = document.getElementById('filtroPesquisadorAgenda');
  if (!select) return;

  const atual = select.value;
  const nomes = [...new Set(
    consultas
      .map(c => c.updated_by_name)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  select.innerHTML = `<option value="">Todos</option>`;
  nomes.forEach(nome => {
    const option = document.createElement('option');
    option.value = nome;
    option.textContent = nome;
    select.appendChild(option);
  });

  if (nomes.includes(atual)) {
    select.value = atual;
  }
}

function renderStatusBadge(status) {
  const mapa = {
    Agendada: 'status-agendada',
    Realizada: 'status-realizada',
    Cancelada: 'status-cancelada'
  };

  const classe = mapa[status] || 'status-agendada';
  return `<span class="status-badge ${classe}">${escapeHtml(status || 'Agendada')}</span>`;
}

async function carregarSelectsPacientes() {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .select('id, patient_code, nome')
      .order('nome', { ascending: true });

    if (error) throw error;

    preencherSelectPaciente('pacienteEvolucao', data || []);
    preencherSelectPaciente('pacienteConsulta', data || []);
  } catch (error) {}
}

function preencherSelectPaciente(selectId, pacientes) {
  const select = document.getElementById(selectId);
  select.innerHTML = `<option value="">Selecione</option>`;

  pacientes.forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.patient_code} - ${p.nome}`;
    select.appendChild(option);
  });
}

function renderizarGraficoGrupos(pacientes) {
  const grupos = {
    'Grupo 1 - Teste de Fibras': 0,
    'Grupo 2 - Hidrocolonterapia Isolada': 0,
    'Grupo 3 - Intervenção combinada': 0
  };

  pacientes.forEach((p) => {
    if (grupos[p.grupo] !== undefined) grupos[p.grupo]++;
  });

  const ctx = document.getElementById('graficoGrupos');
  if (chartGrupos) chartGrupos.destroy();

  chartGrupos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(grupos),
      datasets: [{
        label: 'Número de pacientes',
        data: Object.values(grupos)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true
    }
  });
}

window.verGraficoPaciente = async function (pacienteId, patientCode = '') {
  try {
    const { data, error } = await supabase
      .from('evolucoes')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('data_avaliacao', { ascending: true });

    if (error) throw error;

    let codigo = patientCode;
    if (!codigo) {
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('patient_code')
        .eq('id', pacienteId)
        .single();

      codigo = paciente?.patient_code || 'Paciente';
    }

    const ctx = document.getElementById('graficoEvolucao');
    if (chartEvolucao) chartEvolucao.destroy();

    chartEvolucao = new Chart(ctx, {
      type: 'line',
      data: {
        labels: (data || []).map(item => item.data_avaliacao),
        datasets: [{
          label: `Evolução Bristol - ${codigo}`,
          data: (data || []).map(item => item.bristol)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true
      }
    });

    showSection('graficos');
  } catch (error) {
    alert(`Erro ao carregar gráfico de evolução: ${error.message}`);
  }
};

async function carregarAuditoria() {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    const tbody = document.getElementById('tabelaAuditoria');
    tbody.innerHTML = '';

    if (!data || !data.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nenhuma alteração registrada.</td></tr>`;
      return;
    }

    data.forEach((log) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatarDataHora(log.changed_at)}</td>
        <td>${escapeHtml(log.table_name || '')}</td>
        <td>${escapeHtml(log.action || '')}</td>
        <td>${escapeHtml(log.patient_code || '')}</td>
        <td>${escapeHtml(log.patient_name || '')}</td>
        <td>${escapeHtml(log.researcher_name || '')}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    alert(`Erro ao carregar auditoria: ${error.message}`);
  }
}

window.exportarCSV = async function () {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    const headers = [
      'patient_code',
      'nome',
      'idade',
      'sexo',
      'peso',
      'grupo',
      'anamnese',
      'alimentacao',
      'hidratacao',
      'atividade_fisica',
      'medicamentos',
      'pre_procedimento',
      'pre_data',
      'pos_procedimento',
      'pos_data',
      'bristol',
      'roma_score',
      'roma_diagnostico',
      'created_by_name',
      'updated_by_name',
      'created_at',
      'updated_at'
    ];

    const linhas = [headers.join(',')];

    (data || []).forEach((item) => {
      const row = headers.map((header) => csvSafe(item[header]));
      linhas.push(row.join(','));
    });

    const csv = '\uFEFF' + linhas.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'pacientes.csv';
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    alert(`Erro ao exportar CSV: ${error.message}`);
  }
};

async function carregarPesquisadorAtual() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    currentResearcher.textContent = '';
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email')
    .eq('id', user.id)
    .single();

  const nome = profile?.nome || user.email || 'Pesquisador';
  const email = profile?.email || user.email || '';

  currentResearcher.textContent = `Logado como: ${nome}${email ? ` (${email})` : ''}`;
}

function emptyToNull(value) {
  return value === '' ? null : value;
}

function toNullableInt(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : parseInt(n, 10);
}

function toNullableFloat(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function formatarDataHora(value) {
  if (!value) return '';
  const data = new Date(value);
  return data.toLocaleString('pt-BR');
}

function formatarHora(value) {
  if (!value) return '';
  const data = new Date(value);
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function csvSafe(value) {
  const text = value == null ? '' : String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function jsSafe(text) {
  return String(text ?? '').replaceAll("'", "\\'");
}

async function atualizarUIAutenticacao() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');

    await carregarPesquisadorAtual();
    await carregarPacientes();
    await carregarSelectsPacientes();
    await carregarConsultas();
    await carregarAuditoria();
    showSection('agenda');
  } else {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
  }
}

supabase.auth.onAuthStateChange(async () => {
  await atualizarUIAutenticacao();
});

atualizarUIAutenticacao();
