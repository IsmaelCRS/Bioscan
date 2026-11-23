// Componentes visuais de diagnóstico: folha ilustrada (SVG), visualizador com bounding boxes,
// cartão de resultado e gráficos simples. Tudo é renderizado a partir do JSON da API.
import { esc, icone, formatarDataHora, formatarPct, corPraga } from './ui.js';

const CORES_LESAO = {
  rust: ['#F0A23B', '#9A4E12', '#F6E27A'],
  cercospora: ['#C9B48A', '#5A3A1E', '#EAD98A'],
  leaf_miner: ['#EADDB0', '#A88E55', '#F3EBC8'],
  phoma: ['#5A3B22', '#24150A', '#B9A25C'],
  red_spider_mite: ['#D95B43', '#7A2014', '#F4B084'],
};
const CORES_LESAO_PADRAO = ['#B5652B', '#4A2A12', '#E6D27A'];

let contadorSvg = 0;

function geradorAleatorio(semente) {
  let s = (Number(semente) * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Folha ilustrada com lesões desenhadas dentro das bounding boxes não saudáveis. */
export function folhaSVG({ semente = 1, deteccoes = [], largura = 640, altura = 640, lesoes = true } = {}) {
  const id = `fs${++contadorSvg}`;
  const rnd = geradorAleatorio(semente);
  const matiz = 88 + Math.round(rnd() * 26);
  const claro = `hsl(${matiz} 50% 55%)`;
  const medio = `hsl(${matiz + 2} 52% 42%)`;
  const escuro = `hsl(${matiz + 6} 58% 28%)`;

  // Nervuras secundárias
  const base = [120, 525], ponta = [545, 95];
  const dx = ponta[0] - base[0], dy = ponta[1] - base[1];
  const comp = Math.hypot(dx, dy), ux = dx / comp, uy = dy / comp;
  let nervuras = '';
  for (let t = 0.14; t < 0.9; t += 0.105) {
    const px = base[0] + dx * t, py = base[1] + dy * t;
    const tam = 165 * Math.sin(Math.PI * Math.min(0.95, t + 0.05)) + 10;
    for (const lado of [-1, 1]) {
      const nx = -uy * lado, ny = ux * lado;
      const ex = px + nx * tam * 0.78 + ux * tam * 0.55, ey = py + ny * tam * 0.78 + uy * tam * 0.55;
      const cx = px + nx * tam * 0.45 + ux * tam * 0.1, cy = py + ny * tam * 0.45 + uy * tam * 0.1;
      nervuras += `<path d="M${px.toFixed(1)} ${py.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`;
    }
  }

  // Lesões (somente detecções não saudáveis)
  const escalaX = 640 / largura, escalaY = 640 / altura;
  const classesUsadas = new Set();
  let manchas = '';
  if (lesoes) {
    for (const d of deteccoes) {
      if (d.saudavel) continue;
      const classe = CORES_LESAO[d.nomeClasse] ? d.nomeClasse : 'padrao';
      classesUsadas.add(classe);
      const cx = ((d.x1 + d.x2) / 2) * escalaX, cy = ((d.y1 + d.y2) / 2) * escalaY;
      const raio = (Math.min(d.x2 - d.x1, d.y2 - d.y1) * Math.min(escalaX, escalaY)) / 2;
      const r = geradorAleatorio(d.id * 97 + semente);
      const qtd = 3 + Math.floor(r() * 4);
      manchas += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(raio * 0.95).toFixed(1)}" fill="url(#${id}-halo-${classe})"/>`;
      for (let i = 0; i < qtd; i++) {
        const ang = r() * Math.PI * 2, dist = r() * raio * 0.55;
        const rr = raio * (0.18 + r() * 0.3);
        manchas += `<ellipse cx="${(cx + Math.cos(ang) * dist).toFixed(1)}" cy="${(cy + Math.sin(ang) * dist).toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(rr * (0.75 + r() * 0.4)).toFixed(1)}" fill="url(#${id}-l-${classe})"/>`;
      }
    }
  }
  const gradientesLesao = [...classesUsadas].map((classe) => {
    const [centro, borda, halo] = CORES_LESAO[classe] || CORES_LESAO_PADRAO;
    return `
      <radialGradient id="${id}-l-${classe}"><stop offset="0" stop-color="${borda}"/><stop offset=".55" stop-color="${centro}"/><stop offset="1" stop-color="${borda}" stop-opacity=".85"/></radialGradient>
      <radialGradient id="${id}-halo-${classe}"><stop offset="0" stop-color="${halo}" stop-opacity=".55"/><stop offset="1" stop-color="${halo}" stop-opacity="0"/></radialGradient>`;
  }).join('');

  const contorno = 'M120 525 C 62 372, 196 162, 545 95 C 500 420, 302 580, 120 525 Z';
  return `
    <svg class="folha-svg" viewBox="0 0 640 640" preserveAspectRatio="none" role="img" aria-label="Folha analisada">
      <defs>
        <linearGradient id="${id}-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="${escuro}"/><stop offset=".45" stop-color="${medio}"/><stop offset="1" stop-color="${claro}"/>
        </linearGradient>
        <radialGradient id="${id}-brilho" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}-c"><path d="${contorno}"/></clipPath>
        ${gradientesLesao}
      </defs>
      <path d="M120 525 Q 96 560 66 596" stroke="${escuro}" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="${contorno}" fill="url(#${id}-g)"/>
      <g clip-path="url(#${id}-c)">
        <path d="${contorno}" fill="url(#${id}-brilho)"/>
        <g stroke="hsl(${matiz} 45% 70%)" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round">${nervuras}</g>
        <path d="M120 525 C 260 400, 400 262, 545 95" stroke="hsl(${matiz} 45% 74%)" stroke-opacity=".8" stroke-width="6" fill="none" stroke-linecap="round"/>
        ${manchas}
      </g>
    </svg>`;
}

export function nomeClasse(det) {
  if (det.saudavel) return 'Saudável';
  return det.pragaNome || det.nomeClasse;
}

export function tituloDiagnostico(d) {
  try {
    const mapa = JSON.parse(localStorage.getItem('bioscan:titulos-analises') || '{}');
    if (mapa[d.id]) return mapa[d.id];
  } catch {}
  return d.tituloPersonalizado || `Análise #${d.id}`;
}

export function midiaDiagnostico(d, { lesoes = true } = {}) {
  const url = d.urlImagem || '';
  if (url.startsWith('mock://folha/')) {
    return folhaSVG({ semente: Number(url.split('/').pop()) || 1, deteccoes: d.deteccoes, largura: d.largura, altura: d.altura, lesoes });
  }
  return `<img src="${esc(url)}" alt="Imagem enviada para análise" draggable="false">`;
}

/** Imagem + bounding boxes posicionadas em porcentagem (independe do tamanho exibido). */
export function visualizador(d, { caixas = true, rotulos = true } = {}) {
  const w = d.largura || 640, h = d.altura || 640;
  const boxes = caixas
    ? d.deteccoes.map((det) => {
        const estilo = `left:${(det.x1 / w) * 100}%;top:${(det.y1 / h) * 100}%;width:${((det.x2 - det.x1) / w) * 100}%;height:${((det.y2 - det.y1) / h) * 100}%`;
        const rotulo = rotulos ? `<span class="caixa-rotulo">${esc(nomeClasse(det))} · ${Math.round(det.confianca * 100)}%</span>` : '';
        return `<div class="caixa ${det.saudavel ? 'caixa-ok' : 'caixa-praga'}" style="${estilo}">${rotulo}</div>`;
      }).join('')
    : '';
  return `
    <div class="visualizador" style="aspect-ratio:${w} / ${h}">
      <div class="visualizador-midia">${midiaDiagnostico(d)}</div>
      <div class="visualizador-caixas">${boxes}</div>
    </div>`;
}

export function chipNivel(d) {
  const classe = { 'Saudável': 'ok', Leve: 'leve', Moderado: 'moderado', Severo: 'severo' }[d.nivel] || 'ok';
  return `<span class="chip chip-${classe}">${esc(d.nivel)}</span>`;
}

export function rotuloPrincipal(d) {
  return d.pragaPrincipal ? d.pragaPrincipal.nomePopular : 'Folha saudável';
}

export function cartaoResultado(d) {
  const praga = d.pragaPrincipal;
  const grau = Math.min(100, d.grauAfetacao);
  const deteccoes = [...d.deteccoes].sort((a, b) => Number(a.saudavel) - Number(b.saudavel) || b.confianca - a.confianca);

  const blocoPraga = praga
    ? `<div class="praga-principal">
         <span class="praga-bolinha" style="background:${corPraga(praga.id)}"></span>
         <div>
           <small class="suave">Praga principal identificada</small>
           <strong class="praga-nome">${esc(praga.nomePopular)}</strong>
           <em class="suave">${esc(praga.nomeCientifico)}</em>
         </div>
       </div>
       <p class="texto-praga">${esc(praga.sintomas)}</p>`
    : `<div class="praga-principal praga-principal-ok">
         <span class="praga-bolinha">${icone('escudo')}</span>
         <div><small class="suave">Resultado</small><strong class="praga-nome">Nenhuma praga identificada</strong><em class="suave">A folha aparenta estar saudável.</em></div>
       </div>`;

  return `
    <div class="resultado">
      <div class="resultado-imagem">
        ${visualizador(d)}
      </div>
      <div class="resultado-info">
        <div class="resultado-topo">
          <div>
            <h3>${esc(tituloDiagnostico(d))}</h3>
            <small class="suave">${icone('calendario')} ${esc(formatarDataHora(d.dataAnalise))}</small>
          </div>
          ${chipNivel(d)}
        </div>
        <div class="medidor">
          <div class="medidor-cabecalho"><span>Área afetada</span><strong>${formatarPct(grau)}</strong></div>
          <div class="medidor-barra"><span style="width:${grau}%"></span></div>
          <small class="suave">Proporção da área analisada com sinais de praga ou doença.</small>
        </div>
        ${blocoPraga}
        <h4 class="subtitulo">Detecções do modelo (${deteccoes.length})</h4>
        <ul class="lista-deteccoes">
          ${deteccoes.map((det) => `
            <li>
              <i class="det-cor ${det.saudavel ? 'det-ok' : 'det-praga'}"></i>
              <span class="det-nome">${esc(nomeClasse(det))}<small>${esc(det.nomeClasse)}</small></span>
              <span class="det-barra"><span style="width:${det.confianca * 100}%"></span></span>
              <strong>${Math.round(det.confianca * 100)}%</strong>
            </li>`).join('')}
        </ul>
      </div>
    </div>
    ${praga ? `
      <div class="recomendacoes">
        <div class="recomendacao"><h4>${icone('folha')} Manejo recomendado</h4><p>${esc(praga.recomendacoesManejo)}</p></div>
        <div class="recomendacao"><h4>${icone('escudo')} Defensivos indicados</h4><p>${esc(praga.defensivosIndicados)}</p></div>
      </div>` : ''}
    ${String(d.urlImagem || '').startsWith('mock://')
      ? `<p class="aviso-mock">${icone('info')} Folha de exemplo: detecções simuladas (mock) para demonstração.</p>`
      : `<p class="aviso-mock">${icone('info')} Resultado gerado pelo modelo de visão computacional (YOLO). Confirme o diagnóstico com um agrônomo.</p>`}`;
}

/** Pares de barras saudável × afetado para uma lista de diagnósticos. */
export function graficoComparativo(diagnosticos, idAtual) {
  if (!diagnosticos.length) return '';
  return `
    <div class="grafico-comparativo">
      ${diagnosticos.map((d) => `
        <div class="gc-grupo ${d.id === idAtual ? 'gc-atual' : ''}" title="${esc(tituloDiagnostico(d))}: ${formatarPct(d.grauAfetacao)} afetado">
          <div class="gc-barras">
            <span class="gc-barra gc-saudavel" style="height:${Math.max(2, 100 - d.grauAfetacao)}%"></span>
            <span class="gc-barra gc-afetado" style="height:${Math.max(2, d.grauAfetacao)}%"></span>
          </div>
          <small>#${d.id}</small>
        </div>`).join('')}
    </div>
    <div class="legenda">
      <span><i class="legenda-cor gc-saudavel"></i> % saudável</span>
      <span><i class="legenda-cor gc-afetado"></i> % afetado</span>
    </div>`;
}

/** Detecções sintéticas para ilustrar uma praga no catálogo. */
export function deteccoesIlustrativas(classeModelo, semente = 3) {
  const r = geradorAleatorio(semente);
  return Array.from({ length: 5 }, (_, i) => {
    const t = 0.2 + i * 0.15;
    const cx = 640 * (0.19 + 0.65 * t) + (r() - 0.5) * 90, cy = 640 * (0.81 - 0.65 * t) + (r() - 0.5) * 90;
    const lado = 50 + r() * 50;
    return { id: i + 1, nomeClasse: classeModelo, saudavel: false, x1: cx - lado / 2, y1: cy - lado / 2, x2: cx + lado / 2, y2: cy + lado / 2 };
  });
}
