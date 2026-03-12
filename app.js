import { supabase } from './supabase.js';

let bristolSelecionado = null;
let romaScoreAtual = 0;
let romaDiagnosticoAtual = 'Não calculado';
let chartGrupos = null;
let chartEvolucao = null;
let pacienteAtualId = null;

const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const currentResearcher = document.getElementById('currentResearcher');

window.showAuthMode = function (mode) {
  document.getElementById('authLoginBox').classList.toggle('hidden', mode !== 'login');
  document.getElementById('authSignupBox').classList.toggle('hidden', mode !== 'signup');
  document.getElementById('authTabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('authTabSignup').classList.toggle('active', mode === 'signup');
};

window.showMainSection = function (sectionName) {
  document.querySelectorAll('.main-section').forEach(section => {
    section.classList.add('hidden');
  });

  const target = document.getElementById(`main-${sectionName}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.side-btn').forEach(btn => btn.classList.remove('active'));
  const side = document.getElementById(`side-${sectionName}`);
  if (side) side.classList.add('active');

  document.getElementById('patientWorkspace').classList.add('hidden');
};

window.showPatientTab = function (tabName) {
  document.querySelectorAll('.patient-section').forEach(section => {
    section.classList.add('hidden');
  });

  document.querySelectorAll('.patient-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.patient-menu-btn').forEach(btn => btn.classList.remove('active'));

  const section = document.getElementById(`patientSection-${tabName}`);
  const tab = document.getElementById(`patientTab-${tabName}`);
  const menu = document.getElementById(`patientMenu-${tabName}`);

  if (section) section.classList.remove('hidden');
  if (tab) tab.classList.add('active');
  if (menu) menu.classList.add('active');
};

window.fecharFichaPaciente = function () {
  pacienteAtualId = null;
  document.getElementById('patientWorkspace').classList.add('hidden');
  showMainSection('pacientes');
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
    showAuthMode('login');
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

    const idFinal = result.data.id;
    await carregarPacientes();
    await carregarSelectsPacientes();
    await carregarConsultas();
    await carregarAuditoria();
    await abrirFichaPaciente(idFinal, 'cadastro');
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
          <button onclick="abrirFichaPaciente('${paciente.id}', 'cadastro')">Abrir ficha</button>
          <button class="secondary" onclick="abrirFichaPaciente('${paciente.id}', 'graficos')">Gráficos</button>
          <button class="secondary" onclick="excluirPaciente('${paciente.id}')">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.abrirFichaPaciente = async function (id, aba = 'cadastro') {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    pacienteAtualId = data.id;

    document.getElementById('patientWorkspace').classList.remove('hidden');
    document.querySelectorAll('.main-section').forEach(section => section.classList.add('hidden'));

    preencherFormularioPaciente(data);
    preencherSidebarPaciente(data);
    await carregarAuditoriaPaciente(data.id);

    if (aba === 'graficos') {
      await verGraficoPaciente(data.id, data.patient_code || '');
    }

    showPatientTab(aba);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    alert(`Erro ao abrir ficha do paciente: ${error.message}`);
  }
};

function preencherFormularioPaciente(data) {
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
}

function preencherSidebarPaciente(data) {
  document.getElementById('sidebarNomePaciente').textContent = data.nome || 'Paciente';
  document.getElementById('sidebarCodigoPaciente').textContent = data.patient_code || '';
  document.getElementById('sidebarGrupoPaciente').textContent = data.grupo || '';
  document.getElementById('sidebarSexoPaciente').textContent = data.sexo || '-';
  document.getElementById('sidebarIdadePaciente').textContent = data.idade ?? '-';
  document.getElementById('sidebarPesoPaciente').textContent = data.peso ?? '-';
  document.getElementById('workspaceTituloPaciente').textContent = data.nome || 'Ficha do paciente';

  const inicial = (data.nome || 'P').trim().charAt(0).toUpperCase();
  document.getElementById('patientAvatar').textContent = inicial || 'P';
}

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
    fecharFichaPaciente();
    alert('Paciente excluído com sucesso.');
  } catch (error) {
    alert(`Erro ao excluir paciente: ${error.message}`);
  }
};

window.salvarEvolucao = async function () {
  try {
    const paciente_id = pacienteAtualId;
    const data_avaliacao = document.getElementById('dataEvolucao').value;
    const bristol = toNullableInt(document.getElementById('bristolEvolucao').value);
    const roma_score = toNullableInt(document.getElementById('romaScoreEvolucao').value);
    const observacoes = document.getElementById('observacoesEvolucao').value.trim();

    if (!paciente_id || !data_avaliacao) {
      alert('Selecione um paciente e a data da evolução.');
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
    await carregarAuditoriaPaciente(paciente_id);
    await verGraficoPaciente(paciente_id);
    showPatientTab('graficos');
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
    showMainSection('agenda');
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
          <button onclick="abrirFichaPaciente('${consulta.pacientes?.id || ''}', 'cadastro')">Abrir ficha</button>
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
    tbody.innerHTML = `<tr><td colspan="7">Nenhuma consulta marcada para hoje.</td></tr>`;
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
      <td>
        <div class="row-actions">
          <button onclick="abrirFichaPaciente('${consulta.pacientes?.id || ''}', 'cadastro')">Abrir ficha</button>
        </div>
      </td>
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
  if (!ctx) return;

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
    if (!ctx) return;

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

    showPatientTab('graficos');
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

    preencherTabelaAuditoria('tabelaAuditoria', data || []);
  } catch (error) {
    alert(`Erro ao carregar auditoria: ${error.message}`);
  }
}

async function carregarAuditoriaPaciente(pacienteId) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('patient_id', pacienteId)
      .order('changed_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    preencherTabelaAuditoria('tabelaAuditoriaPaciente', data || []);
  } catch (error) {
    alert(`Erro ao carregar auditoria do paciente: ${error.message}`);
  }
}

function preencherTabelaAuditoria(tbodyId, logs) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhuma alteração registrada.</td></tr>`;
    return;
  }

  logs.forEach((log) => {
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
     