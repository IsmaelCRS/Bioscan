// Página de Login (/login).
import { api } from '../api.js';
import {
  icone, campo, campoSenha, ligarOlhos,
  valoresFormulario, botaoCarregando, mostrarErroForm,
} from '../ui.js';

export async function render(el, ctx) {
  el.innerHTML = `
    <section class="autenticacao-wrap autenticacao-unica">
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
    </section>
  `;

  const form = el.querySelector('#form-login');
  ligarOlhos(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = valoresFormulario(form);
    const lembrar = form.querySelector('[name="lembrar"]').checked;
    const botao = form.querySelector('[type="submit"]');
    mostrarErroForm(form, '');
    botaoCarregando(botao, true, 'Autenticando…');
    try {
      const { token, conta } = await api.login(dados.email, dados.senha, lembrar);
      ctx.entrar(token, conta, lembrar);
    } catch (erro) {
      mostrarErroForm(form, erro.message);
    } finally {
      botaoCarregando(botao, false);
    }
  });
}
