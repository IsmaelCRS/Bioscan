// Página de Login (/login) com persistência em SQLite e atalhos para funcionários de teste.
import { api } from '../api.js';
import {
  esc, icone, campo, campoSenha, ligarOlhos,
  valoresFormulario, botaoCarregando, mostrarErroForm,
} from '../ui.js';

const FUNCIONARIOS_TESTE = [
  {
    nome: 'João Pereira da Silva',
    email: 'joao@bioscan.com',
    senha: 'produtor123',
    cargo: 'Produtor · Fazenda Boa Vista (Café)',
    badge: 'Produtor',
    classe: 'chip-ok',
  },
  {
    nome: 'Maria Oliveira Santos',
    email: 'maria@bioscan.com',
    senha: 'produtor123',
    cargo: 'Produtora · Sítio Esperança (Soja)',
    badge: 'Produtor',
    classe: 'chip-ok',
  },
  {
    nome: 'Lucas Ferreira',
    email: 'lucas@bioscan.com',
    senha: 'produtor123',
    cargo: 'Produtor · Chácara Três Irmãos (Milho)',
    badge: 'Produtor',
    classe: 'chip-ok',
  },
  {
    nome: 'Ana Beatriz Souza',
    email: 'admin@bioscan.com',
    senha: 'admin123',
    cargo: 'Administradora do Sistema',
    badge: 'Admin',
    classe: 'chip-admin',
  },
  {
    nome: 'Carlos Eduardo Lima',
    email: 'carlos@bioscan.com',
    senha: 'produtor123',
    cargo: 'Produtor · Conta bloqueada para teste',
    badge: 'Bloqueado',
    classe: 'chip-severo',
  },
];

export async function render(el, ctx) {
  el.innerHTML = `
    <section class="autenticacao-wrap">
      <div class="cartao cartao-auth">
        <div class="auth-cabecalho">
          <span class="auth-icone">${icone('logo')}</span>
          <h1>Entrar na conta</h1>
          <p class="suave">Acesse o sistema de diagnóstico fitossanitário BioScan</p>
        </div>

        <form id="form-login" class="form-pilha" novalidate>
          <div class="form-erro" hidden></div>
          ${campo({
            rotulo: 'E-mail',
            nome: 'email',
            tipo: 'email',
            placeholder: 'seuemail@bioscan.com',
            autocomplete: 'username',
          })}
          ${campoSenha({
            rotulo: 'Senha',
            nome: 'senha',
            placeholder: 'Digite sua senha',
            autocomplete: 'current-password',
          })}
          <label class="checkbox-linha">
            <input type="checkbox" name="lembrar" checked>
            <span>Manter conectado neste dispositivo</span>
          </label>
          <button type="submit" class="btn btn-primario btn-bloco">Entrar</button>
        </form>

        <p class="auth-rodape">
          Ainda não possui conta? <a href="#/cadastro">Criar conta</a>
        </p>
      </div>

      <aside class="cartao cartao-funcionarios">
        <div class="secao-titulo">
          ${icone('usuarios')}
          <div>
            <h2>Funcionários e contas de teste (SQLite)</h2>
            <p class="suave">Clique em uma conta para preencher ou entrar automaticamente</p>
          </div>
        </div>
        <ul class="lista-funcionarios">
          ${FUNCIONARIOS_TESTE.map((f, idx) => `
            <li class="funcionario-item">
              <div class="funcionario-info">
                <div class="funcionario-topo">
                  <strong>${esc(f.nome)}</strong>
                  <span class="chip ${f.classe}">${esc(f.badge)}</span>
                </div>
                <small>${esc(f.cargo)}</small>
                <code>${esc(f.email)} · senha: ${esc(f.senha)}</code>
              </div>
              <div class="funcionario-acoes">
                <button type="button" class="btn btn-contorno btn-p" data-preencher="${idx}">Preencher</button>
                <button type="button" class="btn btn-primario btn-p" data-entrar="${idx}">Entrar</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </aside>
    </section>
  `;

  const form = el.querySelector('#form-login');
  ligarOlhos(form);

  async function autenticar(email, senha, lembrar, botao) {
    mostrarErroForm(form, '');
    botaoCarregando(botao, true, 'Autenticando…');
    try {
      const { token, conta } = await api.login(email, senha, lembrar);
      ctx.entrar(token, conta, lembrar);
    } catch (erro) {
      mostrarErroForm(form, erro.message);
    } finally {
      botaoCarregando(botao, false);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = valoresFormulario(form);
    const lembrar = form.querySelector('[name="lembrar"]').checked;
    await autenticar(dados.email, dados.senha, lembrar, form.querySelector('[type="submit"]'));
  });

  el.querySelectorAll('[data-preencher]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = FUNCIONARIOS_TESTE[Number(btn.dataset.preencher)];
      form.querySelector('[name="email"]').value = f.email;
      form.querySelector('[name="senha"]').value = f.senha;
      mostrarErroForm(form, '');
    });
  });

  el.querySelectorAll('[data-entrar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const f = FUNCIONARIOS_TESTE[Number(btn.dataset.entrar)];
      form.querySelector('[name="email"]').value = f.email;
      form.querySelector('[name="senha"]').value = f.senha;
      const lembrar = form.querySelector('[name="lembrar"]').checked;
      await autenticar(f.email, f.senha, lembrar, btn);
    });
  });
}
