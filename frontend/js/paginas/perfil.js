// Página de Perfil (/perfil) fiel ao mockup (Tela 5):
// - Coluna esquerda: avatar verde, nome, e-mail, botão "Trocar cor", caixas "análises realizadas" e "membro desde"
// - Coluna direita: formulário "Meus dados" + seção "Alterar senha" + botões "Salvar alterações" e "Sair da conta"
import { api } from '../api.js';
import {
  AREAS, esc, icone, campo, campoSenha, campoSelect,
  formatarMesAno, ligarOlhos, valoresFormulario, botaoCarregando, toast,
} from '../ui.js';

export async function render(el, ctx) {
  const c = ctx.conta;
  const ehProdutor = c.perfil === 'PRODUTOR';
  const agro = c.perfilAgricola || {};

  el.innerHTML = `
    <section class="cartao perfil-cartao">
      <aside class="perfil-lateral">
        <div class="perfil-avatar">${icone('usuario')}</div>
        <h1 class="perfil-nome">${esc(c.nome)}</h1>
        <p class="suave">${esc(c.email)}</p>
        <span class="chip ${ehProdutor ? 'chip-ok' : 'chip-admin'}">
          ${ehProdutor ? 'Produtor Rural' : 'Administrador'}
        </span>

        <div class="perfil-metricas">
          <div class="perfil-metrica">
            <strong>${ehProdutor ? esc(c.totalAnalises ?? 0) : 'ADMIN'}</strong>
            <span>${ehProdutor ? 'análises realizadas' : 'acesso completo'}</span>
          </div>
          <div class="perfil-metrica">
            <strong>${esc(formatarMesAno(c.dataCadastro))}</strong>
            <span>membro desde</span>
          </div>
        </div>
      </aside>

      <div class="perfil-conteudo">
        <form id="form-perfil" class="form-pilha" novalidate>
          <header class="secao-cabecalho">
            <h2>Meus dados</h2>
            <p class="suave">Atualize suas informações cadastradas no banco SQLite</p>
          </header>

          <div class="grade-campos-2">
            ${campo({ rotulo: 'Nome completo', nome: 'nome', valor: c.nome })}
            ${campo({ rotulo: 'E-mail (login)', nome: 'email', valor: c.email, extra: 'readonly disabled' })}
            ${ehProdutor ? `
              ${campo({ rotulo: 'Telefone', nome: 'telefone', valor: agro.telefone || '', placeholder: '(00) 00000-0000' })}
              ${campo({ rotulo: 'Propriedade', nome: 'propriedade', valor: agro.propriedade || '', placeholder: 'Nome da fazenda ou sítio' })}
              ${campo({ rotulo: 'Região / Município', nome: 'regiao', valor: agro.regiao || '', placeholder: 'Cidade - UF' })}
              ${campoSelect({ rotulo: 'Tamanho da área', nome: 'area', opcoes: AREAS, valor: agro.area || '' })}
            ` : ''}
          </div>

          <hr class="divisor">

          <header class="secao-cabecalho">
            <h3>Alterar senha</h3>
            <p class="suave">Preencha apenas se desejar definir uma nova senha de acesso</p>
          </header>

          <div class="grade-campos-3">
            ${campoSenha({ rotulo: 'Senha atual', nome: 'senhaAtual', placeholder: 'Senha atual', autocomplete: 'current-password' })}
            ${campoSenha({ rotulo: 'Nova senha', nome: 'novaSenha', placeholder: 'Nova senha (mín. 6)', autocomplete: 'new-password' })}
            ${campoSenha({ rotulo: 'Confirmar nova senha', nome: 'confirmarSenha', placeholder: 'Repita a nova senha', autocomplete: 'new-password' })}
          </div>

          <div class="perfil-acoes">
            <div class="perfil-acoes-esq">
              <button type="submit" class="btn btn-primario">Salvar alterações</button>
              <button type="button" class="btn btn-contorno" id="btn-sair-perfil">Sair da conta</button>
            </div>
            <button type="button" class="link-perigo" id="btn-restaurar">Desfazer alterações</button>
          </div>
        </form>
      </div>
    </section>
  `;

  const form = el.querySelector('#form-perfil');
  ligarOlhos(form);

  el.querySelector('#btn-sair-perfil').addEventListener('click', () => ctx.sair());
  el.querySelector('#btn-restaurar').addEventListener('click', () => render(el, ctx));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = valoresFormulario(form);
    const btn = form.querySelector('[type="submit"]');
    botaoCarregando(btn, true, 'Salvando…');
    try {
      const payload = {
        nome: d.nome,
        perfilAgricola: ehProdutor
          ? {
              telefone: d.telefone,
              propriedade: d.propriedade,
              regiao: d.regiao,
              area: d.area,
            }
          : undefined,
      };
      const { conta } = await api.atualizarPerfil(payload);
      ctx.atualizarConta(conta);

      if (d.novaSenha || d.confirmarSenha || d.senhaAtual) {
        if (!d.senhaAtual) throw new Error('Informe sua senha atual para alterar a senha.');
        if (d.novaSenha !== d.confirmarSenha) throw new Error('A confirmação da nova senha não confere.');
        await api.alterarSenha(d.senhaAtual, d.novaSenha);
        toast('Dados e senha atualizados com sucesso!');
      } else {
        toast('Dados atualizados com sucesso!');
      }
      await render(el, ctx);
    } catch (erro) {
      toast(erro.message, 'erro');
    } finally {
      botaoCarregando(btn, false);
    }
  });
}
