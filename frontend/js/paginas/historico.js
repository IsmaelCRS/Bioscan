// Página "Seu banco de análises" (/historico) fiel às telas 3 e 4 do mockup:
// - Barra de cabeçalho com busca, filtro por praga/nível e ordenação
// - Painel expandido "Nome da análise" com carrossel de folhas, resumo (% saudável vs % com praga),
//   gráfico comparativo de barras e botão de lixeira
// - Grade centralizada com 4 colunas e scroll vertical
// - Edição visual de título inline com ícone de lápis
import { api } from '../api.js';
import {
  esc, icone, formatarData, formatarDataHora, formatarPct,
  abrirModal, confirmar, toast, estadoCarregando, estadoVazio,
} from '../ui.js';
import {
  midiaDiagnostico, tituloDiagnostico, rotuloPrincipal,
  graficoComparativo, cartaoResultado, chipNivel,
} from '../componentes.js';

const CHAVE_TITULOS = 'bioscan:titulos-analises';

function carregarTitulos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_TITULOS) || '{}');
  } catch {
    return {};
  }
}

function salvarTitulo(id, novoTitulo) {
  const mapa = carregarTitulos();
  const valor = (novoTitulo || '').trim();
  if (valor) {
    mapa[id] = valor;
  } else {
    delete mapa[id];
  }
  try {
    localStorage.setItem(CHAVE_TITULOS, JSON.stringify(mapa));
  } catch {}
}

function obterTitulo(d) {
  const mapa = carregarTitulos();
  return mapa[d.id] || d.tituloPersonalizado || `Análise #${d.id}`;
}

export async function render(el) {
  el.innerHTML = estadoCarregando('Carregando seu banco de análises…');
  let { diagnosticos } = await api.listarDiagnosticos();

  let busca = '';
  let filtro = 'TODOS';
  let ordem = 'RECENTES';
  let expandidoId = diagnosticos[0]?.id ?? null;

  const pragasUnicas = [...new Set(diagnosticos.map((d) => rotuloPrincipal(d)))];

  function filtrarEOrdenar() {
    const termo = busca.trim().toLowerCase();
    const lista = diagnosticos.filter((d) => {
      const praga = rotuloPrincipal(d);
      const titulo = obterTitulo(d);
      const texto = `${titulo} ${tituloDiagnostico(d)} ${praga} ${d.nivel} ${formatarData(d.dataAnalise)}`.toLowerCase();
      if (termo && !texto.includes(termo)) return false;
      if (filtro === 'SAUDAVEL') return !d.pragaPrincipal;
      if (filtro === 'COM_PRAGA') return Boolean(d.pragaPrincipal);
      if (filtro !== 'TODOS') return praga === filtro;
      return true;
    });

    lista.sort((a, b) => {
      if (ordem === 'ANTIGOS') return new Date(a.dataAnalise) - new Date(b.dataAnalise);
      if (ordem === 'MAIOR_GRAU') return b.grauAfetacao - a.grauAfetacao;
      if (ordem === 'MENOR_GRAU') return a.grauAfetacao - b.grauAfetacao;
      return new Date(b.dataAnalise) - new Date(a.dataAnalise);
    });
    return lista;
  }

  async function excluir(id) {
    const ok = await confirmar({
      titulo: 'Excluir análise',
      mensagem: `Deseja mover a Análise #${id} para excluídos? (Exclusão lógica conforme StatusDiagnostico.EXCLUIDO)`,
      textoConfirmar: 'Excluir análise',
      perigo: true,
    });
    if (!ok) return;
    try {
      await api.excluirDiagnostico(id);
      diagnosticos = diagnosticos.filter((d) => d.id !== id);
      if (expandidoId === id) expandidoId = diagnosticos[0]?.id ?? null;
      toast('Análise excluída com sucesso.');
      desenharGrade();
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  }

  el.innerHTML = `
    <section class="barra-banco">
      <h1 class="barra-banco-titulo">${icone('historico')} Seu banco de análises</h1>
      <div class="barra-banco-controles">
        <label class="busca-pilula">
          ${icone('busca')}
          <input type="search" id="campo-busca" placeholder="Buscar análise ou praga…">
        </label>
        <label class="controle-inline">
          <span>Filtrar</span>
          ${icone('filtro')}
          <select id="select-filtro">
            <option value="TODOS">Todas</option>
            <option value="COM_PRAGA">Com praga</option>
            <option value="SAUDAVEL">Saudáveis</option>
            ${pragasUnicas.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
          </select>
        </label>
        <label class="controle-inline">
          <span>Ordenação</span>
          ${icone('ordenar')}
          <select id="select-ordem">
            <option value="RECENTES">Mais recentes</option>
            <option value="ANTIGOS">Mais antigas</option>
            <option value="MAIOR_GRAU">Maior afetação</option>
            <option value="MENOR_GRAU">Menor afetação</option>
          </select>
        </label>
      </div>
    </section>

    <section id="painel-expandido"></section>

    <section class="secao-historico-grade">
      <div class="grade-analises-scroller">
        <div id="grade-analises" class="grade-analises"></div>
      </div>
    </section>
  `;

  el.querySelector('#campo-busca').addEventListener('input', (e) => {
    busca = e.target.value;
    desenharGrade();
  });
  el.querySelector('#select-filtro').addEventListener('change', (e) => {
    filtro = e.target.value;
    desenharGrade();
  });
  el.querySelector('#select-ordem').addEventListener('change', (e) => {
    ordem = e.target.value;
    desenharGrade();
  });

  function desenharPainelExpandido(lista) {
    const container = el.querySelector('#painel-expandido');
    const atual = lista.find((d) => d.id === expandidoId) || diagnosticos.find((d) => d.id === expandidoId);
    if (!atual) {
      container.innerHTML = '';
      return;
    }
    const saudavelPct = Math.max(0, 100 - atual.grauAfetacao);
    const amostraCarrossel = lista.slice(0, 5);
    const idxAtual = lista.findIndex((d) => d.id === atual.id);
    const anterior = lista[(idxAtual - 1 + lista.length) % lista.length];
    const proximo = lista[(idxAtual + 1) % lista.length];

    container.innerHTML = `
      <article class="cartao analise-expandida">
        <div class="analise-expandida-topo">
          <div class="analise-titulo-topo" data-titulo-container="${atual.id}">
            <h2 class="analise-titulo-sub">
              <span class="analise-titulo-texto">${esc(obterTitulo(atual))}</span>
              <button type="button" class="btn-icone btn-icone-p btn-editar-inline" data-editar-titulo="${atual.id}" title="Editar nome da análise" aria-label="Editar nome da análise">
                ${icone('editar')}
              </button>
              <span class="suave">— ${esc(rotuloPrincipal(atual))}</span>
            </h2>
            <small class="suave">${esc(formatarDataHora(atual.dataAnalise))}</small>
          </div>
          <div class="analise-expandida-acoes">
            ${chipNivel(atual)}
            <button type="button" class="btn btn-contorno btn-p" data-detalhe="${atual.id}">
              Ver bounding boxes (${atual.deteccoes.length})
            </button>
            <button type="button" class="btn-icone" data-fechar-exp title="Recolher painel">${icone('x')}</button>
          </div>
        </div>

        <div class="carrossel-folhas">
          ${amostraCarrossel.map((item) => `
            <button
              type="button"
              class="carrossel-item ${item.id === atual.id ? 'ativo' : ''}"
              data-selecionar="${item.id}"
              title="${esc(tituloDiagnostico(item))}">
              <div class="carrossel-midia">${midiaDiagnostico(item)}</div>
            </button>
          `).join('')}
          ${lista.length > 1 ? `
            <button type="button" class="carrossel-seta" data-selecionar="${proximo.id}" title="Próxima análise">
              ${icone('setaDir')}
            </button>
          ` : ''}
        </div>

        <div class="analise-expandida-rodape">
          <div class="analise-resumo">
            <strong>${esc(obterTitulo(atual))}</strong>
            <ul>
              <li><i class="ponto ponto-ok"></i> ${formatarPct(saudavelPct)} área saudável</li>
              <li><i class="ponto ponto-praga"></i> ${formatarPct(atual.grauAfetacao)} área com praga (${esc(rotuloPrincipal(atual))})</li>
            </ul>
            ${atual.pragaPrincipal ? `<p class="suave">${esc(atual.pragaPrincipal.recomendacoesManejo)}</p>` : ''}
          </div>
          <div class="analise-grafico">
            ${graficoComparativo(lista.slice(0, 4), atual.id)}
          </div>
          <div class="analise-lixeira">
            ${lista.length > 1 ? `
              <button type="button" class="btn-icone" data-selecionar="${anterior.id}" title="Análise anterior">${icone('setaEsq')}</button>
            ` : ''}
            <button type="button" class="btn-icone btn-icone-perigo" data-excluir="${atual.id}" title="Excluir análise">
              ${icone('lixeira')}
            </button>
          </div>
        </div>
      </article>
    `;

    container.querySelectorAll('[data-selecionar]').forEach((b) => {
      b.addEventListener('click', () => {
        expandidoId = Number(b.dataset.selecionar);
        desenharPainelExpandido(lista);
      });
    });
    container.querySelectorAll('[data-detalhe]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = diagnosticos.find((x) => x.id === Number(b.dataset.detalhe));
        if (d) abrirModal({ titulo: `${tituloDiagnostico(d)} — Detecções`, tamanho: 'lg', conteudo: cartaoResultado(d) });
      });
    });
    container.querySelector('[data-fechar-exp]')?.addEventListener('click', () => {
      expandidoId = null;
      desenharPainelExpandido(lista);
    });
    container.querySelector('[data-excluir]')?.addEventListener('click', () => excluir(atual.id));
  }

  function desenharGrade() {
    const lista = filtrarEOrdenar();
    desenharPainelExpandido(lista);
    const grade = el.querySelector('#grade-analises');

    if (!lista.length) {
      grade.innerHTML = `<div class="cartao grade-vazia">${estadoVazio('Nenhuma análise encontrada para os filtros selecionados.')}</div>`;
      return;
    }

    grade.innerHTML = lista.map((d) => `
      <article class="cartao card-analise ${d.id === expandidoId ? 'selecionado' : ''}">
        <div class="card-analise-imagem" data-visualizar="${d.id}" role="button" tabindex="0">
          ${midiaDiagnostico(d)}
        </div>
        <div class="card-analise-rodape">
          <div class="card-analise-texto" data-titulo-container="${d.id}">
            <div class="card-analise-titulo-linha">
              <strong class="card-analise-titulo" title="${esc(obterTitulo(d))}">${esc(obterTitulo(d))}</strong>
              <button type="button" class="btn-icone btn-icone-p btn-editar-inline" data-editar-titulo="${d.id}" title="Editar nome da análise" aria-label="Editar nome da análise">
                ${icone('editar')}
              </button>
            </div>
            <small>${esc(rotuloPrincipal(d))} · ${formatarPct(d.grauAfetacao)} afetado · ${esc(formatarData(d.dataAnalise))}</small>
          </div>
          <div class="card-analise-acoes">
            <button type="button" class="btn btn-primario btn-p" data-visualizar="${d.id}">Visualizar</button>
            <button type="button" class="btn-icone btn-icone-perigo" data-excluir="${d.id}" title="Excluir análise" aria-label="Excluir análise">
              ${icone('lixeira')}
            </button>
          </div>
        </div>
      </article>
    `).join('');

    grade.querySelectorAll('[data-visualizar]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = Number(b.dataset.visualizar);
        if (expandidoId === id) {
          const d = diagnosticos.find((x) => x.id === id);
          if (d) abrirModal({ titulo: `${tituloDiagnostico(d)} — Detecções`, tamanho: 'lg', conteudo: cartaoResultado(d) });
        } else {
          expandidoId = id;
          desenharGrade();
          el.querySelector('#painel-expandido')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });

    grade.querySelectorAll('[data-excluir]').forEach((b) => {
      b.addEventListener('click', () => excluir(Number(b.dataset.excluir)));
    });

    // Ligar botões de edição inline (tanto no painel expandido quanto nos cards)
    el.querySelectorAll('[data-editar-titulo]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.editarTitulo);
        const item = diagnosticos.find((x) => x.id === id);
        if (!item) return;

        const container = btn.closest('[data-titulo-container]');
        if (!container) return;

        const tituloAtual = obterTitulo(item);
        container.innerHTML = `
          <form class="form-edicao-inline" data-form-edicao="${id}">
            <input type="text" class="input-edicao-inline" value="${esc(tituloAtual)}" maxlength="50" required>
            <button type="submit" class="btn-icone btn-icone-salvar" title="Salvar">${icone('check')}</button>
            <button type="button" class="btn-icone btn-icone-cancelar" data-cancelar-edicao title="Cancelar">${icone('x')}</button>
          </form>
        `;

        const form = container.querySelector('form');
        const input = form.querySelector('input');
        input.focus();
        input.select();

        input.addEventListener('keydown', (ke) => {
          if (ke.key === 'Escape') {
            ke.stopPropagation();
            desenharGrade();
          }
        });

        form.addEventListener('submit', (se) => {
          se.preventDefault();
          se.stopPropagation();
          const novo = input.value.trim();
          if (novo) {
            salvarTitulo(id, novo);
            item.tituloPersonalizado = novo;
            toast('Nome da análise atualizado com sucesso.');
          }
          desenharGrade();
        });

        form.querySelector('[data-cancelar-edicao]').addEventListener('click', (ce) => {
          ce.stopPropagation();
          desenharGrade();
        });
      });
    });
  }

  desenharGrade();
}
