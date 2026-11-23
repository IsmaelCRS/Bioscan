// Página de Cadastro (/cadastro) em 2 etapas conforme o mockup visual, persistindo no SQLite.
import { api } from '../api.js';
import {
  AREAS, campo, campoSenha, campoSelect,
  ligarOlhos, valoresFormulario, botaoCarregando, mostrarErroForm,
} from '../ui.js';

export async function render(el, ctx) {
  el.innerHTML = `
    <section class="autenticacao-wrap autenticacao-unica">
      <div class="cartao cartao-auth">
        <div class="auth-cabecalho">
          <h1>Criar conta</h1>
          <p class="suave" id="subtitulo-etapa">Etapa 1 de 2 — Dados de acesso</p>
          <div class="passos-indicador" aria-hidden="true">
            <span class="passo-ponto ativo" data-ind="1"></span>
            <span class="passo-ponto" data-ind="2"></span>
          </div>
        </div>

        <form id="form-cadastro" class="form-pilha" novalidate>
          <div class="form-erro" hidden></div>

          <div class="etapa-campos" data-etapa="1">
            ${campo({
              rotulo: 'Nome completo',
              nome: 'nome',
              placeholder: 'Digite seu nome completo',
              autocomplete: 'name',
            })}
            ${campo({
              rotulo: 'E-mail',
              nome: 'email',
              tipo: 'email',
              placeholder: 'seuemail@exemplo.com',
              autocomplete: 'email',
            })}
            ${campoSenha({
              rotulo: 'Senha',
              nome: 'senha',
              placeholder: 'Mínimo de 6 caracteres',
              autocomplete: 'new-password',
            })}
            ${campoSenha({
              rotulo: 'Confirmar senha',
              nome: 'confirmarSenha',
              placeholder: 'Repita sua senha',
              autocomplete: 'new-password',
            })}
            <button type="button" class="btn btn-primario btn-bloco" id="btn-avancar">Continuar</button>
          </div>

          <div class="etapa-campos" data-etapa="2" hidden>
            ${campo({
              rotulo: 'Nome da propriedade',
              nome: 'propriedade',
              placeholder: 'Ex.: Fazenda Boa Vista',
            })}
            ${campo({
              rotulo: 'Região / Município',
              nome: 'regiao',
              placeholder: 'Ex.: Uberlândia - MG',
            })}
            ${campoSelect({
              rotulo: 'Tamanho da área',
              nome: 'area',
              opcoes: AREAS,
              placeholder: 'Selecione a faixa de área',
            })}
            <label class="checkbox-linha">
              <input type="checkbox" name="termos" checked>
              <span>Concordo com os termos de uso e política de privacidade</span>
            </label>
            <div class="acoes-duplas">
              <button type="button" class="btn btn-contorno" id="btn-voltar">Voltar</button>
              <button type="submit" class="btn btn-primario">Criar conta</button>
            </div>
          </div>
        </form>

        <p class="auth-rodape">
          Já tem uma conta? <a href="#/login">Entrar</a>
        </p>
      </div>
    </section>
  `;

  const form = el.querySelector('#form-cadastro');
  const etapa1 = form.querySelector('[data-etapa="1"]');
  const etapa2 = form.querySelector('[data-etapa="2"]');
  const subtitulo = el.querySelector('#subtitulo-etapa');
  ligarOlhos(form);

  function irParaEtapa(numero) {
    mostrarErroForm(form, '');
    etapa1.hidden = numero !== 1;
    etapa2.hidden = numero !== 2;
    subtitulo.textContent = numero === 1
      ? 'Etapa 1 de 2 — Dados de acesso'
      : 'Etapa 2 de 2 — Perfil agrícola';
    el.querySelectorAll('[data-ind]').forEach((p) => {
      p.classList.toggle('ativo', Number(p.dataset.ind) <= numero);
    });
  }

  form.querySelector('#btn-avancar').addEventListener('click', () => {
    const d = valoresFormulario(form);
    if ((d.nome || '').length < 3) return mostrarErroForm(form, 'O nome deve ter pelo menos 3 caracteres.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || '')) return mostrarErroForm(form, 'Informe um e-mail válido.');
    if ((d.senha || '').length < 6) return mostrarErroForm(form, 'A senha deve ter pelo menos 6 caracteres.');
    if (d.senha !== d.confirmarSenha) return mostrarErroForm(form, 'A confirmação de senha não confere.');
    irParaEtapa(2);
  });

  form.querySelector('#btn-voltar').addEventListener('click', () => irParaEtapa(1));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarErroForm(form, '');
    if (!form.querySelector('[name="termos"]').checked) {
      return mostrarErroForm(form, 'Aceite os termos de uso para criar sua conta.');
    }
    const d = valoresFormulario(form);
    const btn = form.querySelector('[type="submit"]');
    botaoCarregando(btn, true, 'Criando conta…');
    try {
      const { token, conta } = await api.cadastro({
        nome: d.nome,
        email: d.email,
        senha: d.senha,
        perfilAgricola: {
          propriedade: d.propriedade,
          regiao: d.regiao,
          area: d.area,
          telefone: '',
        },
      });
      ctx.entrar(token, conta, true);
    } catch (erro) {
      mostrarErroForm(form, erro.message);
    } finally {
      botaoCarregando(btn, false);
    }
  });
}
