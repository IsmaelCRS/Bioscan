// Roteador (hash) e casca da aplicação: cabeçalho, guarda de rotas e sessão.
import { api } from './api.js';
import { sessao } from './sessao.js';
import { esc, icone, iniciais, corAvatar, toast, fecharTodosModais, estadoErro } from './ui.js';
import * as paginaLogin from './paginas/login.js';
import * as paginaCadastro from './paginas/cadastro.js';
import * as paginaInicio from './paginas/inicio.js';
import * as paginaHistorico from './paginas/historico.js';
import * as paginaCatalogo from './paginas/catalogo.js';
import * as paginaPerfil from './paginas/perfil.js';
import * as paginaAdmin from './paginas/admin.js';

const ROTAS = {
  '/login': { modulo: paginaLogin, publica: true, titulo: 'Entrar' },
  '/cadastro': { modulo: paginaCadastro, publica: true, titulo: 'Criar conta' },
  '/inicio': { modulo: paginaInicio, perfis: ['PRODUTOR'], titulo: 'Início' },
  '/historico': { modulo: paginaHistorico, perfis: ['PRODUTOR'], titulo: 'Histórico' },
  '/catalogo': { modulo: paginaCatalogo, perfis: ['PRODUTOR', 'ADMIN'], titulo: 'Catálogo de pragas' },
  '/perfil': { modulo: paginaPerfil, perfis: ['PRODUTOR', 'ADMIN'], titulo: 'Perfil' },
  '/admin': { modulo: paginaAdmin, perfis: ['ADMIN'], titulo: 'Painel administrativo' },
};

const MENU = {
  PRODUTOR: [['/inicio', 'Início'], ['/historico', 'Histórico'], ['/perfil', 'Perfil']],
  ADMIN: [['/admin', 'Painel'], ['/catalogo', 'Catálogo'], ['/perfil', 'Perfil']],
};

let contaAtual = null;
let geracao = 0;

const rotaInicial = (conta) => (conta?.perfil === 'ADMIN' ? '/admin' : '/inicio');

function lerRota() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [caminho, query = ''] = hash.split('?');
  return { caminho, params: Object.fromEntries(new URLSearchParams(query)) };
}

export function navegar(rota) {
  if (location.hash === `#${rota}`) renderizar();
  else location.hash = rota;
}

function montarTopo(caminho) {
  const topo = document.getElementById('topo');
  const marca = `<a class="marca" href="#/">${icone('logo')}<span>BioScan</span></a>`;
  if (!contaAtual) {
    topo.innerHTML = `<div class="topo-interno">${marca}</div>`;
    return;
  }
  const itens = MENU[contaAtual.perfil] || [];
  topo.innerHTML = `
    <div class="topo-interno">
      ${marca}
      <nav class="nav" aria-label="Navegação principal">
        ${itens.map(([rota, rotulo]) => `<a href="#${rota}" class="${caminho === rota ? 'ativo' : ''}">${esc(rotulo)}</a>`).join('')}
      </nav>
      <div class="topo-usuario">
        <span class="avatar avatar-p" style="background:${corAvatar(contaAtual.nome)}" title="${esc(contaAtual.nome)}">${iniciais(contaAtual.nome)}</span>
        <button type="button" class="btn-icone" id="btn-sair" title="Sair" aria-label="Sair">${icone('sair')}</button>
      </div>
    </div>`;
  topo.querySelector('#btn-sair').addEventListener('click', sair);
}

async function sair() {
  try { await api.logout(); } catch { /* a sessão local é descartada de qualquer forma */ }
  sessao.limpar();
  contaAtual = null;
  toast('Você saiu da sua conta.', 'info');
  navegar('/login');
}

function contexto(params) {
  return {
    params,
    get conta() { return contaAtual; },
    navegar,
    sair,
    entrar(token, conta, lembrar) {
      sessao.salvar(token, lembrar);
      contaAtual = conta;
      toast(`Bem-vindo(a), ${conta.nome.split(' ')[0]}!`);
      navegar(rotaInicial(conta));
    },
    atualizarConta(conta) {
      contaAtual = conta;
      montarTopo(lerRota().caminho);
    },
  };
}

async function renderizar() {
  const minhaGeracao = ++geracao;
  const { caminho, params } = lerRota();
  const rota = ROTAS[caminho];

  if (!rota) return navegar(contaAtual ? rotaInicial(contaAtual) : '/login');
  if (rota.publica && contaAtual) return navegar(rotaInicial(contaAtual));
  if (!rota.publica && !contaAtual) return navegar('/login');
  if (rota.perfis && !rota.perfis.includes(contaAtual.perfil)) return navegar(rotaInicial(contaAtual));

  fecharTodosModais();
  document.title = `${rota.titulo} · BioScan`;
  montarTopo(caminho);
  const el = document.getElementById('conteudo');
  el.className = `conteudo pagina-${caminho.slice(1)}`;
  el.innerHTML = '';
  void el.offsetWidth;
  el.classList.add('entrando');
  window.scrollTo({ top: 0 });

  try {
    await rota.modulo.render(el, contexto(params));
  } catch (erro) {
    console.error(erro);
    if (minhaGeracao === geracao) el.innerHTML = estadoErro(erro.message || 'Falha ao carregar a página.');
  }
}

window.addEventListener('bioscan:sessao-expirada', (e) => {
  if (!contaAtual) return;
  contaAtual = null;
  toast(e.detail || 'Sua sessão expirou. Faça login novamente.', 'erro');
  navegar('/login');
});

async function iniciar() {
  if (sessao.token()) {
    try {
      contaAtual = (await api.eu()).conta;
    } catch {
      sessao.limpar();
      contaAtual = null;
    }
  }
  window.addEventListener('hashchange', renderizar);
  renderizar();
}

iniciar();
