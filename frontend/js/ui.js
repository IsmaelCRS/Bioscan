// Utilitários de interface: escape de HTML, ícones, campos, modais e toasts.
 
export const AREAS = ['Até 10 ha', '10 a 50 ha', '50 a 200 ha', '200 a 1000 ha', 'Acima de 1000 ha'];
export const CORES_PRAGA = ['#1F3D12', '#8A9A78', '#5B8A3C', '#7A4A23', '#B08A2E', '#3E6B5A', '#A35D3D'];

export function corPraga(id) {
  return CORES_PRAGA[(Number(id) - 1 + CORES_PRAGA.length) % CORES_PRAGA.length];
}

export function esc(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const ICONES = {
  logo: '<circle cx="12" cy="12" r="10"/><path d="M7.5 16.5c0-5.5 3.5-9 9.5-9 0 6-3.4 9.5-8.5 9.5"/><path d="M7.5 16.5 12 12"/>',
  folha: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  nuvem: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>',
  historico: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
  livro: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 7h6"/>',
  inseto: '<path d="m8 2 1.9 1.9M14.1 3.9 16 2M9 7.1v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9M6.5 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M21 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  filtro: '<path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/>',
  ordenar: '<path d="M3 6h18M6 12h12M10 18h4"/>',
  lixeira: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M9.9 4.2A9 9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M17.9 17.9A10 10 0 0 1 12 20c-6.5 0-10-8-10-8a18 18 0 0 1 5.1-5.9"/><path d="m2 2 20 20"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  setaDir: '<path d="m9 18 6-6-6-6"/>',
  setaEsq: '<path d="m15 18-6-6 6-6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  grafico: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-8"/>',
  cadeado: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  bloquear: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  desbloquear: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  atividade: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  imagem: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  percentual: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
};

export function icone(nome, classe = '') {
  return `<svg class="icone ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
}

// ------------------------------------------------------------------ formatação
const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtMesAno = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

export const formatarData = (iso) => fmtData.format(new Date(iso));
export const formatarDataHora = (iso) => fmtDataHora.format(new Date(iso));
export const formatarMesAno = (iso) => fmtMesAno.format(new Date(iso));
export const formatarPct = (valor, casas = 1) => `${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

export function iniciais(nome) {
  const partes = String(nome || '?').trim().split(/\s+/);
  return esc(((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase());
}

export function corAvatar(texto) {
  const cores = ['#527A33', '#2F4A1C', '#8A9A78', '#7A4A23', '#B08A2E', '#3E6B5A'];
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
}

// ------------------------------------------------------------------ campos de formulário
export function campo({ rotulo, nome, tipo = 'text', valor = '', placeholder = '', autocomplete = 'off', extra = '', dica = '' }) {
  return `
    <label class="campo">
      <span class="campo-rotulo">${esc(rotulo)}</span>
      <input class="entrada" type="${tipo}" name="${nome}" value="${esc(valor)}" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}" ${extra}>
      ${dica ? `<small class="campo-dica">${esc(dica)}</small>` : ''}
    </label>`;
}

export function campoSenha({ rotulo, nome, placeholder = '', autocomplete = 'current-password' }) {
  return `
    <label class="campo">
      <span class="campo-rotulo">${esc(rotulo)}</span>
      <span class="entrada-senha">
        <input class="entrada" type="password" name="${nome}" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}">
        <button type="button" class="btn-olho" data-olho aria-label="Mostrar senha">${icone('olho')}</button>
      </span>
    </label>`;
}

export function campoSelect({ rotulo, nome, opcoes, valor = '', placeholder = 'Selecione' }) {
  const lista = valor && !opcoes.includes(valor) ? [...opcoes, valor] : opcoes;
  return `
    <label class="campo">
      <span class="campo-rotulo">${esc(rotulo)}</span>
      <select class="entrada" name="${nome}">
        <option value="">${esc(placeholder)}</option>
        ${lista.map((o) => `<option value="${esc(o)}" ${o === valor ? 'selected' : ''}>${esc(o)}</option>`).join('')}
      </select>
    </label>`;
}

export function campoTexto({ rotulo, nome, valor = '', placeholder = '', linhas = 3 }) {
  return `
    <label class="campo">
      <span class="campo-rotulo">${esc(rotulo)}</span>
      <textarea class="entrada" name="${nome}" rows="${linhas}" placeholder="${esc(placeholder)}">${esc(valor)}</textarea>
    </label>`;
}

export function ligarOlhos(raiz) {
  raiz.querySelectorAll('[data-olho]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const entrada = botao.previousElementSibling;
      const mostrar = entrada.type === 'password';
      entrada.type = mostrar ? 'text' : 'password';
      botao.innerHTML = icone(mostrar ? 'olhoFechado' : 'olho');
      botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    });
  });
}

export function valoresFormulario(form) {
  return Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
}

export function botaoCarregando(botao, carregando, texto = 'Aguarde…') {
  if (!botao) return;
  if (carregando) {
    botao.dataset.textoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = `<span class="spinner spinner-p"></span> ${esc(texto)}`;
  } else if (botao.dataset.textoOriginal !== undefined) {
    botao.disabled = false;
    botao.innerHTML = botao.dataset.textoOriginal;
    delete botao.dataset.textoOriginal;
  }
}

export function mostrarErroForm(form, mensagem) {
  const alvo = form.querySelector('.form-erro');
  if (!alvo) return;
  alvo.hidden = !mensagem;
  alvo.innerHTML = mensagem ? `${icone('alerta')} <span>${esc(mensagem)}</span>` : '';
}

// ------------------------------------------------------------------ estados
export const estadoCarregando = (texto = 'Carregando…') => `<div class="estado"><span class="spinner"></span><p>${esc(texto)}</p></div>`;
export const estadoVazio = (texto, iconeNome = 'folha') => `<div class="estado estado-vazio">${icone(iconeNome)}<p>${esc(texto)}</p></div>`;
export const estadoErro = (texto) => `<div class="estado estado-erro">${icone('alerta')}<p>${esc(texto)}</p></div>`;

// ------------------------------------------------------------------ toasts
export function toast(mensagem, tipo = 'sucesso') {
  const area = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `${icone(tipo === 'erro' ? 'alerta' : tipo === 'info' ? 'info' : 'check')}<span>${esc(mensagem)}</span>`;
  area.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visivel'));
  setTimeout(() => {
    el.classList.remove('visivel');
    setTimeout(() => el.remove(), 300);
  }, 3800);
}

// ------------------------------------------------------------------ modais
export function abrirModal({ titulo, conteudo, tamanho = 'md', aoFechar }) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal modal-${tamanho}" role="dialog" aria-modal="true">
      <header class="modal-topo">
        <h2 class="modal-titulo">${esc(titulo)}</h2>
        <button type="button" class="btn-icone" data-fechar aria-label="Fechar">${icone('x')}</button>
      </header>
      <div class="modal-corpo">${conteudo}</div>
    </div>`;
  document.body.appendChild(fundo);
  document.body.classList.add('sem-rolagem');

  const tecla = (e) => {
    if (e.key === 'Escape' && [...document.querySelectorAll('.modal-fundo')].pop() === fundo) fechar();
  };
  function fechar() {
    if (!fundo.isConnected) return;
    fundo.remove();
    document.removeEventListener('keydown', tecla);
    if (!document.querySelector('.modal-fundo')) document.body.classList.remove('sem-rolagem');
    aoFechar?.();
  }
  document.addEventListener('keydown', tecla);
  fundo.addEventListener('mousedown', (e) => { if (e.target === fundo) fechar(); });
  fundo.querySelector('[data-fechar]').addEventListener('click', fechar);
  requestAnimationFrame(() => fundo.classList.add('aberto'));

  return {
    elemento: fundo.querySelector('.modal'),
    corpo: fundo.querySelector('.modal-corpo'),
    definirTitulo: (t) => { fundo.querySelector('.modal-titulo').textContent = t; },
    fechar,
  };
}

export function fecharTodosModais() {
  document.querySelectorAll('.modal-fundo').forEach((m) => m.remove());
  document.body.classList.remove('sem-rolagem');
}

export function confirmar({ titulo = 'Confirmar', mensagem, textoConfirmar = 'Confirmar', perigo = false }) {
  return new Promise((resolver) => {
    let resposta = false;
    const modal = abrirModal({
      titulo,
      tamanho: 'sm',
      aoFechar: () => resolver(resposta),
      conteudo: `
        <p class="confirmar-texto">${esc(mensagem)}</p>
        <div class="acoes-modal">
          <button type="button" class="btn btn-contorno" data-cancelar>Cancelar</button>
          <button type="button" class="btn ${perigo ? 'btn-perigo' : 'btn-primario'}" data-ok>${esc(textoConfirmar)}</button>
        </div>`,
    });
    modal.corpo.querySelector('[data-cancelar]').onclick = () => modal.fechar();
    modal.corpo.querySelector('[data-ok]').onclick = () => { resposta = true; modal.fechar(); };
    modal.corpo.querySelector('[data-ok]').focus();
  });
}
