// Armazena o token de sessão. "Manter conectado" usa localStorage; caso contrário, sessionStorage.
const CHAVE = 'bioscan.token';

export const sessao = {
  token() {
    return localStorage.getItem(CHAVE) || sessionStorage.getItem(CHAVE);
  },
  salvar(token, lembrar) {
    this.limpar();
    (lembrar ? localStorage : sessionStorage).setItem(CHAVE, token);
  },
  limpar() {
    localStorage.removeItem(CHAVE);
    sessionStorage.removeItem(CHAVE);
  },
};
