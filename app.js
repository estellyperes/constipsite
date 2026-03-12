import { supabase } from './supabase.js';

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

function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tempo de resposta excedido. Verifique Supabase, internet e configuração do projeto.')), ms)
    )
  ]);
}

window.showAuthMode = function (mode) {
  document.getElementById('authLoginBox')?.classList.toggle('hidden', mode !== 'login');
  document.getElementById('authSignupBox')?.classList.toggle('hidden', mode !== 'signup');
  document.getElementById('authTabLogin')?.classList.toggle('active', mode === 'login');
  document.getElementById('authTabSignup')?.classList.toggle('active', mode === 'signup');
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

    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nome }
        }
      })
    );

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

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password
      })
    );

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

async function carregarPesquisadorAtual() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (currentResearcher) currentResearcher.textContent = '';
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email')
    .eq('id', user.id)
    .single();

  const nome = profile?.nome || user.email || 'Pesquisador';
  const email = profile?.email || user.email || '';

  if (currentResearcher) {
    currentResearcher.textContent = `Logado como: ${nome}${email ? ` (${email})` : ''}`;
  }
}

async function atualizarUIAutenticacao() {
  const { data: { session } } = await withTimeout(supabase.auth.getSession());

  if (session) {
    authSection?.classList.add('hidden');
    appSection?.classList.remove('hidden');
    await carregarPesquisadorAtual();
  } else {
    authSection?.classList.remove('hidden');
    appSection?.classList.add('hidden');
    showAuthMode('login');
  }
}

async function testarConexaoSupabase() {
  try {
    const { error } = await withTimeout(
      supabase.from('profiles').select('id').limit(1)
    );

    if (error) {
      console.error('SUPABASE TEST ERROR:', error);
    } else {
      console.log('Supabase conectado com sucesso.');
    }
  } catch (error) {
    console.error('SUPABASE TIMEOUT/CONNECTION ERROR:', error);
    alert('Não foi possível conectar ao Supabase. Verifique o arquivo supabase.js, a URL do projeto, a anon key e sua conexão com a internet.');
  }
}

supabase.auth.onAuthStateChange(async () => {
  try {
    await atualizarUIAutenticacao();
  } catch (error) {
    console.error('AUTH STATE ERROR:', error);
  }
});

(async function init() {
  try {
    await testarConexaoSupabase();
    await atualizarUIAutenticacao();
  } catch (error) {
    console.error('INIT ERROR:', error);
  } finally {
    authBusy = false;
    setButtonLoading('loginBtn', false);
    setButtonLoading('signupBtn', false);
  }
})();
