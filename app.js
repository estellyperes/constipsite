import { supabase } from './supabase.js';

let bristolSelecionado = null;
let romaScoreAtual = 0;
let romaDiagnosticoAtual = 'Não calculado';
let chartGrupos = null;
let chartEvolucao = null;
let pacienteAtualId = null;
let authBusy = false;

const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const currentResearcher = document.getElementById('currentResearcher');

function setButtonLoading(buttonId, loading, loadingText = 'Processando...') {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

window.showAuthMode = function (mode) {
  document.getElementById('authLoginBox')?.classList.toggle('hidden', mode !== 'login');
  document.getElementById('authSignupBox')?.classList.toggle('hidden', mode !== 'signup');
  document.getElementById('authTabLogin')?.classList.toggle('active', mode === 'login');
  document.getElementById('authTabSignup')?.classList.toggle('active', mode === 'signup');
};

window.showMainSection = function (sectionName) {
  document.querySelectorAll('.main-section').forEach((section) => {
    section.classList.add('hidden');
  });

  document.getElementById(`main-${sectionName}`)?.classList.remove('hidden');

  document.querySelectorAll('.side-btn').forEach((btn) => btn.classList.remove('active'));
  document.getElementById(`side-${sectionName}`)?.classList.add('active');

  document.getElementById('patientWorkspace')?.classList.add('hidden');
};

window.showPatientTab = function (tabName) {
  document.querySelectorAll('.patient-section').forEach((section) => {
    section.classList.add('hidden');
  });

  document.querySelectorAll('.patient-tab').forEach((btn) => btn.classList.remove('active'));
  document.querySelectorAll('.patient-menu-btn').forEach((btn) => btn.classList.remove('active'));

  document.getElementById(`patientSection-${tabName}`)?.classList.remove('hidden');
  document.getElementById(`patientTab-${tabName}`)?.classList.add('active');
  document.getElementById(`patientMenu-${tabName}`)?.classList.add('active');
};

window.fecharFichaPaciente = function () {
  pacienteAtualId = null;
  document.getElementById('patientWorkspace')?.classList.add('hidden');
  showMainSection('pacientes');
};

window.signupResearcher = async function () {
  if (authBusy) return;

  try {
    authBusy = true;
    setButtonLoading('signupBtn', true, 'Criando acesso...');

    const nome = document.getElementById('signupNome')?.value.trim() || '';
    const email = document.getElementById('signupEmail')?.value.trim() || '';
    const password = document.getElementById('signupPassword')?.value || '';

    if (!nome || !email || !password) {
      alert('Preencha nome, e-mail e senha para criar o acesso.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: nome }
      }
    });

    if (error) {
      alert(`Erro no cadastro: ${error.message}`);
      console.error('SIGNUP ERROR:', error);
      return;
    }

    console.log('SIGNUP OK:', data);
    alert('Acesso criado com sucesso.');

    document.getElementById('signupNome').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';

    showAuthMode('login');
  } catch (error) {
    alert(`Erro ao criar acesso: ${error.message}`);
    console.error(error);
  } finally {
    authBusy = false;
    setButtonLoading('signupBtn', false);
  }
};

window.loginResearcher = async function () {
  if (authBusy) return;

  try {
    authBusy = true;
    setButtonLoading('loginBtn', true, 'Entrando...');

    const email = document.getElementById('loginEmail')?.value.trim() || '';
    const password = document.getElementById('loginPassword')?.value || '';

    if (!email || !password) {
      alert('Preencha e-mail e senha.');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(`Erro no login: ${error.message}`);
      console.error('LOGIN ERROR:', error);
      return;
    }

    console.log('LOGIN OK:', data);
    await atualizarUIAutenticacao();
  } catch (error) {
    alert(`Erro no login: ${error.message}`);
    console.error(error);
  } finally {
    authBusy = false;
    setButtonLoading('loginBtn', false);
  }
};

window.logoutResearcher = async function () {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await atualizarUIAutenticacao();
  } catch (error) {
    alert(`Erro ao sair: ${error.message}`);
    console.error(error);
  }
};

window.setBristol = function (tipo) {
  bristolSelecionado = Number(tipo);
  setText('bristolSelecionado', `Tipo ${tipo}`);

  document.querySelectorAll('.bristol-btn').forEach((btn, index) => {
    btn.classList.toggle('active', index + 1 === Number(tipo));
  });
};

window.calcularRoma = function () {
  let score = 0;

  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`roma${i}`);
    if (el && el.checked) score++;
  }

  romaScoreAtual = score;
  romaDiagnosticoAtual =
    score >= 2
      ? 'Compatível com constipação pelos critérios de Roma IV'
      : 'Não compatível com constipação pelos critérios de Roma IV';

  setText('romaResultado', `Pontuação: ${score} | ${romaDiagnosticoAtual}`);
};

function obterDadosFormulario() {
  return {
    nome: document.getElementById('nome')?.value.trim() || '',
    idade: toNullableInt(document.getElementById('idade')?.value),
    sexo: emptyToNull(document.getElementById('sexo')?.value),
    peso: toNullableFloat(document.getElementById('peso')?.value),
    grupo: emptyToNull(document.getElementById('grupo')?.value),
    anamnese: document.getElementById('anamnese')?.value.trim() || '',
    alimentacao: document.getElementById('alimentacao')?.value.trim() || '',
    hidratacao: document.getElementById('hidratacao')?.value.trim() || '',
    atividade_fisica: document.getElementById('atividade')?.value.trim() || '',
    medicamentos: document.getElementById('medicamentos')?.value.trim() || '',
    pre_procedimento: document.getElementById('pre')?.value.trim() || '',
    pre_data: emptyToNull(document.getElementById('preData')?.value),
    pos_procedimento: document.getElementById('pos')?.value.trim() || '',
    pos_data: emptyToNull(document.getElementById('posData')?.value),
    bristol: bristolSelecionado,
    roma_score: romaScoreAtual,
    roma_diagnostico: romaDiagnosticoAtual
  };
}

window.salvarOuAtualizarPaciente = async function () {
  try {
    const pacienteId = document.getElementById('pacienteId')?.value || '';
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
    console.error(error);
  }
};

window.limparFormulario = function () {
  const ids = [
    'pacienteId', 'nome', 'idade', 'sexo', 'peso', 'grupo', 'anamnese',
    'alimentacao', 'hidratacao', 'atividade', 'medicamentos',
    'pre', 'preData', 'pos', 'posData',
    'dataEvolucao', 'bristolEvolucao', 'romaScoreEvolucao', 'observacoesEvolucao'
  ];

  ids.forEach((id) => setValue(id, ''));

  bristolSelecionado = null;
  romaScoreAtual = 0;
  romaDiagnosticoAtual = 'Não calculado';

  setText('bristolSelecionado', 'Nenhum');
  setText('romaResultado', 'Aguardando cálculo');

  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`roma${i}`);
    if (el) el.checked = false;
  }

  document.querySelectorAll('.bristol-btn').forEach((btn) => btn.classList.remove('active'));
};

window.carregarPacientes = async function () {
  try {
    const busca = document.getElementById('busca')?.value.trim() || '';
    const filtroSexo = document.getElementById('filtroSexo')?.value || '';

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
    console.error(error);
  }
};

function renderizarTabelaPacientes(pacientes) {
  const tbody = document.getElementById('tabelaPacientes');
  if (!tbody) return;

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

    document.getElementById('patientWorkspace')?.classList.remove('hidden');
    document.querySelectorAll('.main-section').forEach((section) => section.classList.add('hidden'));

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
    console.error(error);
  }
};

function preencherFormularioPaciente(data) {
  const map = {
    pacienteId: data.id,
    nome: data.nome || '',
    idade: data.idade ?? '',
    sexo: data.sexo || '',
    peso: data.peso ?? '',
    grupo: data.grupo || '',
    anamnese: data.anamnese || '',
    alimentacao: data.alimentacao || '',
    hidratacao: data.hidratacao || '',
    atividade: data.atividade_fisica || '',
    medicamentos: data.medicamentos || '',
    pre: data.pre_procedimento || '',
    preData: data.pre_data || '',
    pos: data.pos_procedimento || '',
    posData: data.pos_data || ''
  };

  Object.entries(map).forEach(([id, value]) => setValue(id, value));

  bristolSelecionado = data.bristol ?? null;
  romaScoreAtual = data.roma_score ?? 0;
  romaDiagnosticoAtual = data.roma_diagnostico || 'Não calculado';

  setText('bristolSelecionado', bristolSelecionado ? `Tipo ${bristolSelecionado}` : 'Nenhum');
  setText('romaResultado', `Pontuação: ${romaScoreAtual} | ${romaDiagnosticoAtual}`);

  document.querySelectorAll('.bristol-btn').forEach((btn, index) => {
    btn.classList.toggle('active', index + 1 === bristolSelecionado);
  });

  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`roma${i}`);
    if (el) el.checked = false;
  }
}

function preencherSidebarPaciente(data) {
  const inicial = (data.nome || 'P').trim().charAt(0).toUpperCase() || 'P';

  setText('sidebarNomePaciente', data.nome || 'Paciente');
  setText('sidebarCodigoPaciente', data.patient_code || '');
  setText('sidebarGrupoPaciente', data.grupo || '');
  setText('sidebarSexoPaciente', data.sexo || '-');
  setText('sidebarIdadePaciente', data.idade ?? '-');
  setText('sidebarPesoPaciente', data.peso ?? '-');
  setText('workspaceTituloPaciente', data.nome || 'Ficha do paciente');
  setText('patientAvatar', inicial);
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
    console.error(error);
  }
};

window.salvarEvolucao = async function () {
  try {
    const paciente_id = pacienteAtualId;
    const data_avaliacao = document.getElementById('dataEvolucao')?.value || '';
    const bristol = toNullableInt(document.getElementById('bristolEvolucao')?.value);
    const roma_score = toNullableInt(document.getElementById('romaScoreEvolucao')?.value);
    const observacoes = document.getElementById('observacoesEvolucao')?.value.trim() || '';

    if (!paciente_id || !data_avaliacao) {
      alert('Selecione um paciente e a data da evolução.');
      return;
    }

    const roma_diagnostico =
      (roma_score ?? 0) >= 2
        ? 'Compatível com constipação pelos critérios de Roma IV'
        : 'Não compatível com constipação pelos critérios de Roma IV';

    const { error } = await supabase.from('evolucoes').insert([
      { paciente_id, data_avaliacao, bristol, roma_score, roma_diagnostico, observacoes }
    ]);

    if (error) throw error;

    setValue('dataEvolucao', '');
    setValue('bristolEvolucao', '');
    setValue('romaScoreEvolucao', '');
    setValue('observacoesEvolucao', '');

    alert('Evolução registrada com sucesso.');
    await carregarAuditoria();
    await carregarAuditoriaPaciente(paciente_id);
    await verGraficoPaciente(paciente_id);
    showPatientTab('graficos');
  } catch (error) {
    alert(`Erro ao salvar evolução: ${error.message}`);
    console.error(error);
  }
};

window.agendarConsulta = async function () {
  try {
    const paciente_id = document.getElementById('pacienteConsulta')?.value || '';
    const data_consulta = document.getElementById('dataConsulta')?.value || '';
    const observacoes = document.getElementById('obsConsulta')?.value.trim() || '';
    const status = document.getElementById('statusConsulta')?.value || 'Agendada';

    if (!paciente_id || !data_consulta) {
      alert('Selecione o paciente e a data da consulta.');
      return;
    }

    const { error } = await supabase.from('consultas').insert([
      { paciente_id, data_consulta, observacoes, status }
    ]);

    if (error) throw error;

    setValue('dataConsulta', '');
    setValue('obsConsulta', '');
    setValue('statusConsulta', 'Agendada');

    alert('Consulta salva com sucesso.');
    await carregarConsultas();
    await carregarAuditoria();
    showMainSection('agenda');
  } catch (error) {
    alert(`Erro ao salvar consulta: ${error.message}`);
    console.error(error);
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
    console.error(error);
  }
};

window.limparFiltrosAgenda = function () {
  setValue('filtroPesquisadorAgenda', '');
  setValue('filtroStatusAgenda', '');
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

    if (filtroPesquisador) query = query.eq('updated_by_name', filtroPesquisador);
    if (filtroStatus) query = query.eq('status', filtroStatus);

    const { data, error } = await query;
    if (error) throw error;

    preencherAgendaCompleta(data || []);
    preencherConsultasHoje(data || []);
    preencherKPIsAgenda(data || []);
    preencherFiltroPesquisadores(data || []);
  } catch (error) {
    alert(`Erro ao carregar consultas: ${error.message}`);
    console.error(error);
  }
}

function preencherAgendaCompleta(consultas) {
  const tbody = document.getElementById('tabelaAgenda');
  if (!tbody) return;

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
          <button class="secondary" onclick="atualizarStatusConsulta('${consulta.id}', 'Realizada')">Realizada</button>
          <button class="secondary" onclick="atualizarStatusConsulta('${consulta.id}', 'Cancelada')">Cancelar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function preencherConsultasHoje(consultas) {
  const tbody = document.getElementById('tabelaHoje');
  if (!tbody) return;

  tbody.innerHTML = '';

  const hojeIso = new Date().toISOString().slice(0, 10);
  const consultasHoje = consultas.filter((c) => new Date(c.data_consulta).toISOString().slice(0, 10) === hojeIso);

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
  const hojeIso = new Date().toISOString().slice(0, 10);
  const consultasHoje = consultas.filter((c) => new Date(c.data_consulta).toISOString().slice(0, 10) === hojeIso);
  const pesquisadores = [...new Set(consultas.map((c) => c.updated_by_name).filter(Boolean))];

  setText('kpiHoje', String(consultasHoje.length));
  setText('kpiTotal', String(consultas.length));
  setText('kpiPesquisadores', String(pesquisadores.length));
}

function preencherFiltroPesquisadores(consultas) {
  const select = document.getElementById('filtroPesquisadorAgenda');
  if (!select) return;

  const atual = select.value;
  const nomes = [...new Set(consultas.map((c) => c.updated_by_name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  select.innerHTML = `<option value="">Todos</option>`;
  nomes.forEach((nome) => {
    const option = document.createElement('option');
    option.value = nome;
    option.textContent = nome;
    select.appendChild(option);
  });

  if (nomes.includes(atual)) select.value = atual;
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
  } catch (error) {
    console.error(error);
  }
}

function preencherSelectPaciente(selectId, pacientes) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = `<option value="">Selecione</option>`;
  pacientes.forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.patient_code} - ${p.nome}`;
    select.appendChild(option);
  });
}

function renderizarGraficoGrupos(pacientes) {
  const ctx = document.getElementById('graficoGrupos');
  if (!ctx) return;

  const grupos = {
    'Grupo 1 - Teste de Fibras': 0,
    'Grupo 2 - Hidrocolonterapia Isolada': 0,
    'Grupo 3 - Intervenção combinada': 0
  };

  pacientes.forEach((p) => {
    if (grupos[p.grupo] !== undefined) grupos[p.grupo]++;
  });

  if (chartGrupos) chartGrupos.destroy();

  chartGrupos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(grupos),
      datasets: [{ label: 'Número de pacientes', data: Object.values(grupos) }]
    },
    options: { responsive: true, maintainAspectRatio: true }
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
      const { data: paciente, error: pacienteError } = await supabase
        .from('pacientes')
        .select('patient_code')
        .eq('id', pacienteId)
        .single();

      if (pacienteError) throw pacienteError;
      codigo = paciente?.patient_code || 'Paciente';
    }

    const ctx = document.getElementById('graficoEvolucao');
    if (!ctx) return;

    if (chartEvolucao) chartEvolucao.destroy();

    chartEvolucao = new Chart(ctx, {
      type: 'line',
      data: {
        labels: (data || []).map((item) => item.data_avaliacao),
        datasets: [{ label: `Evolução Bristol - ${codigo}`, data: (data || []).map((item) => item.bristol) }]
      },
      options: { responsive: true, maintainAspectRatio: true }
    });

    showPatientTab('graficos');
  } catch (error) {
    alert(`Erro ao carregar gráfico de evolução: ${error.message}`);
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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
      'patient_code', 'nome', 'idade', 'sexo', 'peso', 'grupo',
      'anamnese', 'alimentacao', 'hidratacao', 'atividade_fisica',
      'medicamentos', 'pre_procedimento', 'pre_data', 'pos_procedimento',
      'pos_data', 'bristol', 'roma_score', 'roma_diagnostico',
      'created_by_name', 'updated_by_name', 'created_at', 'updated_at'
    ];

    const linhas = [headers.join(',')];
    (data || []).forEach((item) => {
      linhas.push(headers.map((header) => csvSafe(item[header])).join(','));
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
    console.error(error);
  }
};

async function carregarPesquisadorAtual() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    setText('currentResearcher', '');
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email')
    .eq('id', user.id)
    .single();

  const nome = profile?.nome || user.email || 'Pesquisador';
  const email = profile?.email || user.email || '';
  setText('currentResearcher', `Logado como: ${nome}${email ? ` (${email})` : ''}`);
}

function emptyToNull(value) {
  return value === '' || value == null ? null : value;
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
  return value ? new Date(value).toLocaleString('pt-BR') : '';
}

function formatarHora(value) {
  return value
    ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';
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

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

async function atualizarUIAutenticacao() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    authSection?.classList.add('hidden');
    appSection?.classList.remove('hidden');

    await carregarPesquisadorAtual();
    await carregarPacientes();
    await carregarSelectsPacientes();
    await carregarConsultas();
    await carregarAuditoria();
    showMainSection('agenda');
  } else {
    authSection?.classList.remove('hidden');
    appSection?.classList.add('hidden');
    showAuthMode('login');
  }
}

supabase.auth.onAuthStateChange(async () => {
  await atualizarUIAutenticacao();
});

atualizarUIAutenticacao();
