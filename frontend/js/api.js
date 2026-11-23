// Cliente da API REST do Bioscan (backend/apresentacao).
import { sessao } from './sessao.js';

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

async function requisitar(metodo, caminho, corpo) {
  const cabecalhos = { Accept: 'application/json' };
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  const token = sessao.token();
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi('Não foi possível conectar ao servidor. Verifique se o backend está rodando.', 0);
  }

  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    if (resposta.status === 401 && token) {
      sessao.limpar();
      window.dispatchEvent(new CustomEvent('bioscan:sessao-expirada', { detail: dados?.erro }));
    }
    throw new ErroApi(dados?.erro || `Erro inesperado (${resposta.status}).`, resposta.status);
  }
  return dados;
}

export const api = {
  // autenticação
  login: (email, senha, lembrar) => requisitar('POST', '/auth/login', { email, senha, lembrar }),
  cadastro: (dados) => requisitar('POST', '/auth/cadastro', dados),
  logout: () => requisitar('POST', '/auth/logout'),
  eu: () => requisitar('GET', '/auth/eu'),
  // perfil
  atualizarPerfil: (dados) => requisitar('PUT', '/perfil', dados),
  alterarSenha: (senhaAtual, novaSenha) => requisitar('PUT', '/perfil/senha', { senhaAtual, novaSenha }),
  // pragas
  listarPragas: () => requisitar('GET', '/pragas'),
  criarPraga: (dados) => requisitar('POST', '/pragas', dados),
  atualizarPraga: (id, dados) => requisitar('PUT', `/pragas/${id}`, dados),
  excluirPraga: (id) => requisitar('DELETE', `/pragas/${id}`),
  // diagnósticos
  listarDiagnosticos: () => requisitar('GET', '/diagnosticos'),
  criarDiagnostico: (imagem, largura, altura) => requisitar('POST', '/diagnosticos', { imagem, largura, altura }),
  obterDiagnostico: (id) => requisitar('GET', `/diagnosticos/${id}`),
  excluirDiagnostico: (id) => requisitar('DELETE', `/diagnosticos/${id}`),
  // administração
  estatisticas: () => requisitar('GET', '/admin/estatisticas'),
  listarUsuarios: () => requisitar('GET', '/admin/usuarios'),
  criarUsuario: (dados) => requisitar('POST', '/admin/usuarios', dados),
  editarUsuario: (id, dados) => requisitar('PUT', `/admin/usuarios/${id}`, dados),
  alterarStatusUsuario: (id, ativo) => requisitar('PATCH', `/admin/usuarios/${id}/status`, { ativo }),
  excluirUsuario: (id) => requisitar('DELETE', `/admin/usuarios/${id}`),
};
