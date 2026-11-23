// Página Inicial do Produtor (/inicio):
// - Área drag-and-drop para envio de imagem + amostras rápidas (mock YOLO)
// - Laudo com botões "Salvar no Histórico" ou "Descartar / Nova Análise"
// - Card "Últimos diagnósticos" (2 últimos lado a lado)
// - Card "Catálogo de pragas" (3 círculos clicáveis)
import { api } from '../api.js';
import {
  esc, icone, corPraga, formatarData, formatarPct,
  abrirModal, toast, estadoCarregando, estadoVazio,
} from '../ui.js';
import { midiaDiagnostico, cartaoResultado, rotuloPrincipal } from '../componentes.js';

function lerArquivoComoDataUrl(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Redimensiona no máximo para 900px para manter payload leve
        const max = 900;
        let w = img.naturalWidth || 640;
        let h = img.naturalHeight || 640;
        if (w > max || h > max) {
          const r = Math.min(max / w, max / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolver({ dataUrl: canvas.toDataURL('image/jpeg', 0.88), largura: w, altura: h });
      };
      img.onerror = () => rejeitar(new Error('Não foi possível ler a imagem selecionada.'));
      img.src = leitor.result;
    };
    leitor.onerror = () => rejeitar(new Error('Falha na leitura do arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}

export async function render(el, ctx) {
  el.innerHTML = estadoCarregando('Carregando painel do produtor…');
  const [{ diagnosticos }, { pragas }] = await Promise.all([
    api.listarDiagnosticos(),
    api.listarPragas(),
  ]);

  const ultimos = diagnosticos.slice(0, 2);
  const pragasDestaque = pragas.slice(0, 3);

  el.innerHTML = `
    <section class="cartao dropzone" id="dropzone">
      <input type="file" id="input-imagem" accept="image/png,image/jpeg,image/webp" hidden>
      <div class="dropzone-icone">${icone('nuvem')}</div>
      <h1 class="dropzone-titulo">Arraste e solte uma imagem da folha que deve ser analisada aqui</h1>
      <div class="dropzone-acoes">
        <button type="button" class="btn btn-primario" id="btn-selecionar-arquivo">
          Selecione um arquivo do dispositivo
        </button>
        <button type="button" class="btn btn-contorno" id="btn-amostra-mock">
          ${icone('folha')} Testar com folha de exemplo (Mock)
        </button>
      </div>
      <small class="suave">Formatos aceitos: JPG, PNG ou WEBP · Diagnóstico simulado (mock YOLO)</small>
    </section>

    <section class="grade-inicio">
      <div class="cartao">
        <div class="cartao-topo">
          <h2 class="cartao-titulo">${icone('historico')} Últimos diagnósticos</h2>
          <a class="link-acao" href="#/historico">Ver todos ${icone('setaDir')}</a>
        </div>
        ${ultimos.length ? `
          <div class="ultimos-grade">
            ${ultimos.map((d) => `
              <article class="ultimo-item" data-abrir-diag="${d.id}" role="button" tabindex="0">
                <div class="ultimo-topo">
                  <div class="ultimo-thumb">${midiaDiagnostico(d)}</div>
                  <div>
                    <strong class="ultimo-data">Data: ${esc(formatarData(d.dataAnalise))}</strong>
                    <small class="suave">Diagnóstico concluído</small>
                  </div>
                </div>
                <ul class="ultimo-meta">
                  <li>
                    <span class="meta-bolinha" style="background:${d.pragaPrincipal ? corPraga(d.pragaPrincipal.id) : '#527A33'}"></span>
                    <span>${esc(rotuloPrincipal(d))}</span>
                  </li>
                  <li>
                    <span class="meta-icone">${icone('percentual')}</span>
                    <span>${esc(formatarPct(d.grauAfetacao))} da folha (${esc(d.nivel)})</span>
                  </li>
                </ul>
              </article>
            `).join('')}
          </div>
        ` : estadoVazio('Você ainda não realizou nenhuma análise. Envie uma imagem acima!')}
      </div>

      <div class="cartao">
        <div class="cartao-topo">
          <h2 class="cartao-titulo">${icone('livro')} Catálogo de pragas</h2>
          <a class="link-acao" href="#/catalogo">Abrir catálogo ${icone('setaDir')}</a>
        </div>
        <div class="catalogo-bolinhas">
          ${pragasDestaque.map((p) => `
            <a class="bolinha-item" href="#/catalogo?id=${p.id}">
              <span class="bolinha-cor" style="background:${corPraga(p.id)}"></span>
              <strong class="bolinha-nome">${esc(p.nomePopular)}</strong>
              <small class="suave">${esc(p.nomeCientifico)}</small>
            </a>
          `).join('')}
        </div>
      </div>
    </section>
  `;

  const dropzone = el.querySelector('#dropzone');
  const input = el.querySelector('#input-imagem');

  async function executarAnalise(imagem, largura, altura) {
    dropzone.classList.add('analisando');
    try {
      const { diagnostico } = await api.criarDiagnostico(imagem, largura, altura);
      abrirModalDecisaoAnalise(
        diagnostico,
        () => {
          input.value = '';
          render(el, ctx);
        },
        () => {
          input.value = '';
          render(el, ctx);
        }
      );
    } catch (erro) {
      toast(erro.message, 'erro');
    } finally {
      dropzone.classList.remove('analisando');
    }
  }

  async function processarArquivo(arquivo) {
    if (!arquivo) return;
    try {
      const { dataUrl, largura, altura } = await lerArquivoComoDataUrl(arquivo);
      await executarAnalise(dataUrl, largura, altura);
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  }

  el.querySelector('#btn-selecionar-arquivo').addEventListener('click', () => input.click());
  input.addEventListener('change', () => processarArquivo(input.files[0]));

  el.querySelector('#btn-amostra-mock').addEventListener('click', async () => {
    const semente = Math.floor(Date.now() % 900) + 100;
    await executarAnalise(`mock://folha/${semente}`, 640, 640);
  });

  ['dragenter', 'dragover'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('arrastando');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('arrastando');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const arquivo = e.dataTransfer?.files?.[0];
    if (arquivo) processarArquivo(arquivo);
  });

  el.querySelectorAll('[data-abrir-diag]').forEach((card) => {
    const abrir = () => {
      const d = diagnosticos.find((x) => x.id === Number(card.dataset.abrirDiag));
      if (d) abrirModalResultado(d);
    };
    card.addEventListener('click', abrir);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrir(); });
  });
}

function abrirModalDecisaoAnalise(diagnostico, aoSalvar, aoDescartar) {
  let salvo = false;

  const conteudo = `
    <div class="laudo-decisao-wrap">
      ${cartaoResultado(diagnostico)}
      <div class="laudo-acoes-decisao">
        <button type="button" class="btn btn-contorno btn-perigo" id="btn-descartar-analise">
          ${icone('lixeira')} Descartar / Nova Análise
        </button>
        <button type="button" class="btn btn-primario" id="btn-salvar-analise">
          ${icone('check')} Salvar no Histórico
        </button>
      </div>
    </div>
  `;

  const modal = abrirModal({
    titulo: `Resultado da Análise #${diagnostico.id}`,
    tamanho: 'lg',
    conteudo,
    aoFechar: async () => {
      if (salvo) {
        aoSalvar?.();
      } else {
        try {
          await api.excluirDiagnostico(diagnostico.id);
        } catch {}
        aoDescartar?.();
      }
    },
  });

  modal.corpo.querySelector('#btn-salvar-analise')?.addEventListener('click', () => {
    salvo = true;
    modal.fechar();
    toast('Análise salva no histórico com sucesso!');
  });

  modal.corpo.querySelector('#btn-descartar-analise')?.addEventListener('click', () => {
    salvo = false;
    modal.fechar();
    toast('Análise descartada.', 'info');
  });
}

function abrirModalResultado(diagnostico) {
  abrirModal({
    titulo: `Resultado da Análise #${diagnostico.id}`,
    tamanho: 'lg',
    conteudo: cartaoResultado(diagnostico),
  });
}
