// Página Catálogo de Pragas (/catalogo) fiel ao mockup:
// - Círculos seletores no topo
// - Descrição detalhada, sintomas, recomendações de manejo e defensivos indicados da praga selecionada
import { api } from '../api.js';
import { esc, icone, corPraga, estadoCarregando, estadoVazio } from '../ui.js';
import { folhaSVG, deteccoesIlustrativas } from '../componentes.js';

export async function render(el, ctx) {
  el.innerHTML = estadoCarregando('Carregando catálogo de pragas…');
  const { pragas } = await api.listarPragas();

  if (!pragas.length) {
    el.innerHTML = `<section class="cartao">${estadoVazio('Nenhuma praga cadastrada no catálogo.')}</section>`;
    return;
  }

  let selecionadaId = Number(ctx.params.id) || pragas[0].id;
  if (!pragas.some((p) => p.id === selecionadaId)) selecionadaId = pragas[0].id;

  function desenhar() {
    const atual = pragas.find((p) => p.id === selecionadaId) || pragas[0];
    const deteccoes = deteccoesIlustrativas(atual.classeModelo, atual.id * 7);

    el.innerHTML = `
      <section class="cartao catalogo-cartao">
        <div class="cartao-topo">
          <h1 class="cartao-titulo">${icone('livro')} Catálogo de pragas</h1>
          ${ctx.conta?.perfil === 'ADMIN'
            ? `<a href="#/admin" class="btn btn-contorno btn-p">${icone('editar')} Gerenciar no painel</a>`
            : `<a href="#/inicio" class="link-acao">${icone('setaEsq')} Voltar ao início</a>`}
        </div>

        <div class="catalogo-seletores" role="tablist" aria-label="Pragas catalogadas">
          ${pragas.map((p) => {
            const ativo = p.id === atual.id;
            return `
              <button
                type="button"
                role="tab"
                aria-selected="${ativo}"
                class="seletor-praga ${ativo ? 'ativo' : ''}"
                data-praga="${p.id}">
                <span class="seletor-circulo" style="background:${corPraga(p.id)}"></span>
                <span class="seletor-nome">${esc(p.nomePopular)}</span>
              </button>
            `;
          }).join('')}
        </div>

        <article class="catalogo-detalhe">
          <header class="catalogo-detalhe-topo">
            <div>
              <h2>${esc(atual.nomePopular)}</h2>
              <p class="cientifico">${esc(atual.nomeCientifico)} · <span class="chip chip-leve">classe YOLO: ${esc(atual.classeModelo)}</span></p>
            </div>
          </header>

          <p class="catalogo-resumo">${esc(atual.descricao)}</p>

          <div class="catalogo-grade">
            <div class="catalogo-ilustracao">
              ${folhaSVG({ semente: atual.id * 11, deteccoes, largura: 640, altura: 640 })}
              <small class="suave">Representação ilustrativa dos sintomas na folha</small>
            </div>

            <div class="catalogo-blocos">
              <div class="catalogo-bloco">
                <h3>${icone('alerta')} Sintomas característicos</h3>
                <p>${esc(atual.sintomas)}</p>
              </div>
              <div class="catalogo-bloco">
                <h3>${icone('folha')} Recomendações de manejo</h3>
                <p>${esc(atual.recomendacoesManejo)}</p>
              </div>
              <div class="catalogo-bloco">
                <h3>${icone('escudo')} Defensivos indicados</h3>
                <p>${esc(atual.defensivosIndicados)}</p>
              </div>
            </div>
          </div>
        </article>
      </section>
    `;

    el.querySelectorAll('[data-praga]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selecionadaId = Number(btn.dataset.praga);
        history.replaceState(null, '', `#/catalogo?id=${selecionadaId}`);
        desenhar();
      });
    });
  }

  desenhar();
}
