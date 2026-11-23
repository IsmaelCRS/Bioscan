// Painel Administrativo (/admin) fiel às Telas 7 e 8 do mockup:
// 1. Visão geral: 4 KPIs + gráfico de barras "Volume de análises" (Mensal / Semanal)
// 2. Gestão de usuários (persistidos no SQLite): tabela paginada, criar, editar, bloquear/ativar e excluir
// 3. Catálogo de pragas: lista com sintomas, manejo e defensivos + criar, editar e remover
import { api } from '../api.js';
import {
  CULTURAS, AREAS, esc, icone, corPraga, corAvatar, iniciais,
  formatarData, formatarPct, campo, campoSenha, campoSelect, campoTexto,
  ligarOlhos, valoresFormulario, botaoCarregando, mostrarErroForm,
  abrirModal, confirmar, toast, estadoCarregando,
} from '../ui.js';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const POR_PAGINA = 5;

export async function render(el, ctx) {
  el.innerHTML = estadoCarregando('Carregando painel administrativo…');
  let [estatisticas, { usuarios }, { pragas }] = await Promise.all([
    api.estatisticas(),
    api.listarUsuarios(),
    api.listarPragas(),
  ]);

  let modoGrafico = 'mensal';
  let paginaUsuarios = 1;
  let buscaUsuario = '';

  async function recarregar() {
    [estatisticas, { usuarios }, { pragas }] = await Promise.all([
      api.estatisticas(),
      api.listarUsuarios(),
      api.listarPragas(),
    ]);
    desenhar();
  }

  function serieGrafico() {
    if (modoGrafico === 'semanal') {
      return estatisticas.serieSemanal.map((s) => ({
        rotulo: s.inicio.slice(5).split('-').reverse().join('/'),
        valor: s.total,
      }));
    }
    return estatisticas.serieMensal.map((m) => ({
      rotulo: MESES[(m.mes - 1 + 12) % 12],
      valor: m.total,
    }));
  }

  function desenhar() {
    const serie = serieGrafico();
    const maior = Math.max(1, ...serie.map((s) => s.valor));

    const usuariosFiltrados = usuarios.filter((u) => {
      if (!buscaUsuario.trim()) return true;
      const t = buscaUsuario.toLowerCase();
      const agro = u.perfilAgricola || {};
      return `${u.nome} ${u.email} ${u.perfil} ${agro.propriedade || ''} ${agro.cultura || ''}`.toLowerCase().includes(t);
    });
    const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / POR_PAGINA));
    if (paginaUsuarios > totalPaginas) paginaUsuarios = totalPaginas;
    const inicio = (paginaUsuarios - 1) * POR_PAGINA;
    const paginaLista = usuariosFiltrados.slice(inicio, inicio + POR_PAGINA);

    el.innerHTML = `
      <!-- 1. VISÃO GERAL -->
      <section class="cartao admin-secao">
        <header class="secao-topo">
          <div>
            <h1 class="cartao-titulo">${icone('grafico')} Visão geral</h1>
            <p class="suave">Resumo das análises e contas do sistema</p>
          </div>
        </header>

        <div class="kpis-grade">
          <article class="kpi-card">
            <div class="kpi-topo">
              <span class="kpi-icone">${icone('atividade')}</span>
              <span class="chip chip-ok">+12% este mês</span>
            </div>
            <small class="suave">Total de análises realizadas</small>
            <strong class="kpi-valor">${esc(estatisticas.totalAnalises)}</strong>
            <span class="kpi-sub">${esc(estatisticas.analisesComPraga)} com praga identificada</span>
          </article>

          <article class="kpi-card">
            <div class="kpi-topo">
              <span class="kpi-icone">${icone('usuarios')}</span>
              <span class="chip chip-leve">SQLite</span>
            </div>
            <small class="suave">Usuários ativos / total</small>
            <strong class="kpi-valor">${esc(estatisticas.usuarios.ativos)}/${esc(estatisticas.usuarios.total)}</strong>
            <span class="kpi-sub">${esc(estatisticas.usuarios.produtores)} produtores · ${esc(estatisticas.usuarios.administradores)} admins</span>
          </article>

          <article class="kpi-card">
            <div class="kpi-topo">
              <span class="kpi-icone">${icone('inseto')}</span>
            </div>
            <small class="suave">Praga mais recorrente</small>
            <strong class="kpi-valor kpi-texto">${esc(estatisticas.pragaMaisComum || 'Nenhuma')}</strong>
            <span class="kpi-sub">${esc(pragas.length)} pragas no catálogo</span>
          </article>

          <article class="kpi-card">
            <div class="kpi-topo">
              <span class="kpi-icone">${icone('percentual')}</span>
            </div>
            <small class="suave">Taxa de detecção de pragas</small>
            <strong class="kpi-valor">${formatarPct(estatisticas.taxaDeteccao)}</strong>
            <span class="kpi-sub">Grau médio: ${formatarPct(estatisticas.grauMedio)}</span>
          </article>
        </div>

        <div class="grafico-bloco">
          <div class="grafico-topo">
            <div>
              <h2>Volume de análises</h2>
              <small class="suave">Distribuição temporal dos diagnósticos realizados</small>
            </div>
            <div class="alternador-pilula">
              <button type="button" class="${modoGrafico === 'mensal' ? 'ativo' : ''}" data-modo="mensal">Mensal</button>
              <button type="button" class="${modoGrafico === 'semanal' ? 'ativo' : ''}" data-modo="semanal">Semanal</button>
            </div>
          </div>

          <div class="grafico-barras">
            ${serie.map((item, idx) => {
              const altura = Math.max(8, Math.round((item.valor / maior) * 100));
              const destaque = idx === serie.length - 1;
              return `
                <div class="barra-coluna ${destaque ? 'destaque' : ''}" title="${esc(item.rotulo)}: ${esc(item.valor)} análise(s)">
                  <span class="barra-num">${esc(item.valor)}</span>
                  <div class="barra-trilho">
                    <span class="barra-preenchimento" style="height:${altura}%"></span>
                  </div>
                  <small class="barra-rotulo">${esc(item.rotulo)}</small>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </section>

      <!-- 2. GESTÃO DE USUÁRIOS (SQLite) -->
      <section class="cartao admin-secao">
        <header class="secao-topo">
          <div>
            <h2 class="cartao-titulo">${icone('usuarios')} Gestão de usuários</h2>
            <p class="suave">Contas persistidas no banco de dados SQLite (dados/bioscan.db)</p>
          </div>
          <div class="secao-topo-acoes">
            <label class="busca-pilula">
              ${icone('busca')}
              <input type="search" id="busca-usuario" value="${esc(buscaUsuario)}" placeholder="Filtrar usuário…">
            </label>
            <button type="button" class="btn btn-primario" id="btn-novo-usuario">
              ${icone('mais')} Adicionar novo usuário
            </button>
          </div>
        </header>

        <div class="tabela-wrap">
          <table class="tabela">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Propriedade / Cultura</th>
                <th>Cadastro</th>
                <th>Status</th>
                <th class="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${paginaLista.map((u) => {
                const agro = u.perfilAgricola || {};
                const propTexto = u.perfil === 'ADMIN'
                  ? 'Administração do sistema'
                  : [agro.propriedade, agro.cultura, agro.regiao].filter(Boolean).join(' · ') || '—';
                const ehProprio = u.id === ctx.conta.id;
                return `
                  <tr>
                    <td>
                      <div class="celula-usuario">
                        <span class="avatar" style="background:${corAvatar(u.nome)}">${iniciais(u.nome)}</span>
                        <div>
                          <strong>${esc(u.nome)} ${ehProprio ? '<small class="suave">(você)</small>' : ''}</strong>
                          <small>${esc(u.email)}</small>
                        </div>
                      </div>
                    </td>
                    <td>${u.perfil === 'ADMIN' ? 'Administrador' : 'Produtor rural'}</td>
                    <td>${esc(propTexto)}</td>
                    <td>${esc(formatarData(u.dataCadastro))}</td>
                    <td>
                      <span class="chip ${u.ativo ? 'chip-ok' : 'chip-severo'}">
                        ${u.ativo ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td class="col-acoes">
                      <div class="acoes-linha">
                        <button type="button" class="btn-quadrado" data-editar-usuario="${u.id}" title="Editar usuário">
                          ${icone('editar')}
                        </button>
                        <button
                          type="button"
                          class="btn-quadrado ${u.ativo ? 'btn-quadrado-alerta' : 'btn-quadrado-ok'}"
                          data-status-usuario="${u.id}"
                          ${ehProprio ? 'disabled title="Você não pode bloquear sua própria conta"' : `title="${u.ativo ? 'Bloquear conta' : 'Ativar conta'}"`}>
                          ${icone(u.ativo ? 'bloquear' : 'desbloquear')}
                        </button>
                        <button
                          type="button"
                          class="btn-quadrado btn-quadrado-perigo"
                          data-excluir-usuario="${u.id}"
                          ${ehProprio ? 'disabled title="Você não pode excluir sua própria conta"' : 'title="Excluir conta"'}>
                          ${icone('lixeira')}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <footer class="tabela-rodape">
          <small class="suave">
            Mostrando ${usuariosFiltrados.length ? inicio + 1 : 0}–${Math.min(inicio + POR_PAGINA, usuariosFiltrados.length)} de ${usuariosFiltrados.length} conta(s)
          </small>
          <div class="paginacao">
            ${Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => `
              <button type="button" class="pagina-btn ${p === paginaUsuarios ? 'ativo' : ''}" data-pagina="${p}">${p}</button>
            `).join('')}
          </div>
        </footer>
      </section>

      <!-- 3. CATÁLOGO DE PRAGAS -->
      <section class="cartao admin-secao">
        <header class="secao-topo">
          <div>
            <h2 class="cartao-titulo">${icone('livro')} Catálogo de pragas</h2>
            <p class="suave">Gerencie as pragas e doenças associadas às classes do modelo YOLO</p>
          </div>
          <button type="button" class="btn btn-primario" id="btn-nova-praga">
            ${icone('mais')} Adicionar nova praga
          </button>
        </header>

        <div class="lista-pragas-admin">
          ${pragas.map((p) => `
            <article class="praga-admin-item">
              <div class="praga-admin-ident">
                <span class="praga-bolinha-g" style="background:${corPraga(p.id)}"></span>
                <div>
                  <h3>${esc(p.nomePopular)}</h3>
                  <em class="suave">${esc(p.nomeCientifico)}</em>
                  <div><span class="chip chip-leve">${esc(p.classeModelo)}</span></div>
                </div>
              </div>
              <div class="praga-admin-col">
                <strong>Sintomas</strong>
                <p>${esc(p.sintomas)}</p>
              </div>
              <div class="praga-admin-col">
                <strong>Manejo e controle</strong>
                <p>${esc(p.recomendacoesManejo)}</p>
              </div>
              <div class="praga-admin-acoes">
                <button type="button" class="btn btn-contorno btn-p" data-editar-praga="${p.id}">Editar</button>
                <button type="button" class="btn btn-perigo-contorno btn-p" data-excluir-praga="${p.id}">Remover</button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;

    // Eventos gráfico
    el.querySelectorAll('[data-modo]').forEach((b) => {
      b.addEventListener('click', () => {
        modoGrafico = b.dataset.modo;
        desenhar();
      });
    });

    // Eventos filtro e paginação de usuários
    const inputBusca = el.querySelector('#busca-usuario');
    inputBusca.addEventListener('input', (e) => {
      buscaUsuario = e.target.value;
      paginaUsuarios = 1;
      desenhar();
      const novo = el.querySelector('#busca-usuario');
      novo.focus();
      novo.setSelectionRange(buscaUsuario.length, buscaUsuario.length);
    });

    el.querySelectorAll('[data-pagina]').forEach((b) => {
      b.addEventListener('click', () => {
        paginaUsuarios = Number(b.dataset.pagina);
        desenhar();
      });
    });

    // Eventos CRUD usuários
    el.querySelector('#btn-novo-usuario').addEventListener('click', () => abrirModalUsuario(null, recarregar));
    el.querySelectorAll('[data-editar-usuario]').forEach((b) => {
      b.addEventListener('click', () => {
        const u = usuarios.find((x) => x.id === Number(b.dataset.editarUsuario));
        if (u) abrirModalUsuario(u, recarregar);
      });
    });
    el.querySelectorAll('[data-status-usuario]').forEach((b) => {
      b.addEventListener('click', async () => {
        const u = usuarios.find((x) => x.id === Number(b.dataset.statusUsuario));
        if (!u) return;
        try {
          await api.alterarStatusUsuario(u.id, !u.ativo);
          toast(u.ativo ? `Conta de ${u.nome} bloqueada.` : `Conta de ${u.nome} reativada.`);
          await recarregar();
        } catch (erro) {
          toast(erro.message, 'erro');
        }
      });
    });
    el.querySelectorAll('[data-excluir-usuario]').forEach((b) => {
      b.addEventListener('click', async () => {
        const u = usuarios.find((x) => x.id === Number(b.dataset.excluirUsuario));
        if (!u) return;
        const ok = await confirmar({
          titulo: 'Excluir usuário',
          mensagem: `Tem certeza de que deseja remover permanentemente a conta de "${u.nome}" (${u.email}) do banco SQLite?`,
          textoConfirmar: 'Excluir conta',
          perigo: true,
        });
        if (!ok) return;
        try {
          await api.excluirUsuario(u.id);
          toast('Conta excluída com sucesso.');
          await recarregar();
        } catch (erro) {
          toast(erro.message, 'erro');
        }
      });
    });

    // Eventos CRUD pragas
    el.querySelector('#btn-nova-praga').addEventListener('click', () => abrirModalPraga(null, recarregar));
    el.querySelectorAll('[data-editar-praga]').forEach((b) => {
      b.addEventListener('click', () => {
        const p = pragas.find((x) => x.id === Number(b.dataset.editarPraga));
        if (p) abrirModalPraga(p, recarregar);
      });
    });
    el.querySelectorAll('[data-excluir-praga]').forEach((b) => {
      b.addEventListener('click', async () => {
        const p = pragas.find((x) => x.id === Number(b.dataset.excluirPraga));
        if (!p) return;
        const ok = await confirmar({
          titulo: 'Remover praga',
          mensagem: `Deseja remover "${p.nomePopular}" do catálogo?`,
          textoConfirmar: 'Remover',
          perigo: true,
        });
        if (!ok) return;
        try {
          await api.excluirPraga(p.id);
          toast('Praga removida do catálogo.');
          await recarregar();
        } catch (erro) {
          toast(erro.message, 'erro');
        }
      });
    });
  }

  desenhar();
}

function abrirModalUsuario(usuario, aoSalvar) {
  const editando = Boolean(usuario);
  const agro = usuario?.perfilAgricola || {};
  const modal = abrirModal({
    titulo: editando ? `Editar conta — ${usuario.nome}` : 'Adicionar novo usuário (SQLite)',
    tamanho: 'md',
    conteudo: `
      <form id="form-usuario-admin" class="form-pilha" novalidate>
        <div class="form-erro" hidden></div>
        <div class="grade-campos-2">
          ${campo({ rotulo: 'Nome completo', nome: 'nome', valor: usuario?.nome || '' })}
          ${campo({
            rotulo: 'E-mail',
            nome: 'email',
            tipo: 'email',
            valor: usuario?.email || '',
            extra: editando ? 'readonly disabled' : '',
          })}
          ${!editando ? `
            ${campoSenha({ rotulo: 'Senha inicial', nome: 'senha', placeholder: 'Mínimo 6 caracteres', autocomplete: 'new-password' })}
            <label class="campo">
              <span class="campo-rotulo">Perfil da conta</span>
              <select class="entrada" name="perfil" id="select-perfil-modal">
                <option value="PRODUTOR">Produtor rural</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>
          ` : ''}
        </div>

        <div id="bloco-agro-modal" ${usuario?.perfil === 'ADMIN' ? 'hidden' : ''}>
          <h4 class="subtitulo">Dados do perfil agrícola</h4>
          <div class="grade-campos-2">
            ${campo({ rotulo: 'Propriedade', nome: 'propriedade', valor: agro.propriedade || '' })}
            ${campo({ rotulo: 'Telefone', nome: 'telefone', valor: agro.telefone || '' })}
            ${campo({ rotulo: 'Região / Município', nome: 'regiao', valor: agro.regiao || '' })}
            ${campoSelect({ rotulo: 'Cultura principal', nome: 'cultura', opcoes: CULTURAS, valor: agro.cultura || '' })}
            ${campoSelect({ rotulo: 'Tamanho da área', nome: 'area', opcoes: AREAS, valor: agro.area || '' })}
          </div>
        </div>

        <div class="acoes-modal">
          <button type="button" class="btn btn-contorno" data-cancelar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${editando ? 'Salvar alterações' : 'Criar usuário'}</button>
        </div>
      </form>
    `,
  });

  const form = modal.corpo.querySelector('#form-usuario-admin');
  ligarOlhos(form);
  modal.corpo.querySelector('[data-cancelar]').addEventListener('click', () => modal.fechar());

  const selectPerfil = form.querySelector('#select-perfil-modal');
  if (selectPerfil) {
    selectPerfil.addEventListener('change', () => {
      form.querySelector('#bloco-agro-modal').hidden = selectPerfil.value === 'ADMIN';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarErroForm(form, '');
    const d = valoresFormulario(form);
    const btn = form.querySelector('[type="submit"]');
    botaoCarregando(btn, true, 'Salvando…');
    try {
      const perfilAgricola = {
        propriedade: d.propriedade,
        telefone: d.telefone,
        regiao: d.regiao,
        cultura: d.cultura,
        area: d.area,
      };
      if (editando) {
        await api.editarUsuario(usuario.id, { nome: d.nome, perfilAgricola });
        toast('Usuário atualizado com sucesso!');
      } else {
        await api.criarUsuario({
          nome: d.nome,
          email: d.email,
          senha: d.senha,
          perfil: d.perfil,
          perfilAgricola,
        });
        toast('Novo usuário cadastrado no SQLite!');
      }
      modal.fechar();
      await aoSalvar();
    } catch (erro) {
      mostrarErroForm(form, erro.message);
    } finally {
      botaoCarregando(btn, false);
    }
  });
}

function abrirModalPraga(praga, aoSalvar) {
  const editando = Boolean(praga);
  const modal = abrirModal({
    titulo: editando ? `Editar praga — ${praga.nomePopular}` : 'Adicionar nova praga ao catálogo',
    tamanho: 'md',
    conteudo: `
      <form id="form-praga-admin" class="form-pilha" novalidate>
        <div class="form-erro" hidden></div>
        <div class="grade-campos-2">
          ${campo({ rotulo: 'Nome popular', nome: 'nomePopular', valor: praga?.nomePopular || '', placeholder: 'Ex.: Ferrugem' })}
          ${campo({ rotulo: 'Nome científico', nome: 'nomeCientifico', valor: praga?.nomeCientifico || '', placeholder: 'Ex.: Hemileia vastatrix' })}
        </div>
        ${campo({
          rotulo: 'Classe do modelo YOLO (label)',
          nome: 'classeModelo',
          valor: praga?.classeModelo || '',
          placeholder: 'Ex.: rust, cercospora, leaf_miner',
          extra: editando ? 'readonly disabled' : '',
          dica: editando ? 'A classe do modelo é a chave imutável na entidade Praga.' : 'Rótulo retornado pelo modelo de visão computacional.',
        })}
        ${campoTexto({ rotulo: 'Descrição geral', nome: 'descricao', valor: praga?.descricao || '', linhas: 2 })}
        ${campoTexto({ rotulo: 'Sintomas na planta', nome: 'sintomas', valor: praga?.sintomas || '', linhas: 2 })}
        ${campoTexto({ rotulo: 'Recomendações de manejo', nome: 'recomendacoesManejo', valor: praga?.recomendacoesManejo || '', linhas: 2 })}
        ${campoTexto({ rotulo: 'Defensivos indicados', nome: 'defensivosIndicados', valor: praga?.defensivosIndicados || '', linhas: 2 })}
        <div class="acoes-modal">
          <button type="button" class="btn btn-contorno" data-cancelar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${editando ? 'Salvar alterações' : 'Adicionar praga'}</button>
        </div>
      </form>
    `,
  });

  const form = modal.corpo.querySelector('#form-praga-admin');
  modal.corpo.querySelector('[data-cancelar]').addEventListener('click', () => modal.fechar());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarErroForm(form, '');
    const d = valoresFormulario(form);
    const btn = form.querySelector('[type="submit"]');
    botaoCarregando(btn, true, 'Salvando…');
    try {
      if (editando) {
        await api.atualizarPraga(praga.id, d);
        toast('Praga atualizada!');
      } else {
        await api.criarPraga(d);
        toast('Nova praga adicionada ao catálogo!');
      }
      modal.fechar();
      await aoSalvar();
    } catch (erro) {
      mostrarErroForm(form, erro.message);
    } finally {
      botaoCarregando(btn, false);
    }
  });
}
