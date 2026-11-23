"""Caso de uso: cadastro, atualização, bloqueio e exclusão de contas."""
from __future__ import annotations

from typing import Any, Optional

from backend.dominio import Conta, PerfilUsuario
from backend.negocio.excecoes import AcessoNegado, Conflito, DadosInvalidos, NaoEncontrado
from backend.negocio.interfaces import IGeradorHash, IRepositorioConta, IRepositorioSessao
from backend.negocio.validacoes import (
    ehProdutor,
    exigirAdmin,
    lerPerfilAgricola,
    limparPerfilAgricola,
    serializarPerfilAgricola,
    validarEmail,
    validarNome,
    validarSenha,
)


class ServicoUsuario:
    def __init__(self, repositorioConta: IRepositorioConta, repositorioSessao: IRepositorioSessao, geradorHash: IGeradorHash) -> None:
        self._contas = repositorioConta
        self._sessoes = repositorioSessao
        self._hash = geradorHash

    # ------------------------------------------------------------------ cadastro
    def cadastrarProdutor(self, nome: Any, email: Any, senha: Any, perfilAgricola: Any) -> Conta:
        """Auto-cadastro público: sempre cria um Usuario (PRODUTOR)."""
        return self._criar(nome, email, senha, PerfilUsuario.PRODUTOR, perfilAgricola)

    def criarConta(self, solicitante: Conta, nome: Any, email: Any, senha: Any, perfil: Any, perfilAgricola: Any) -> Conta:
        exigirAdmin(solicitante)
        try:
            perfilEnum = PerfilUsuario(str(perfil or "PRODUTOR").upper())
        except ValueError as erro:
            raise DadosInvalidos("Perfil inválido. Use PRODUTOR ou ADMIN.") from erro
        return self._criar(nome, email, senha, perfilEnum, perfilAgricola)

    def _criar(self, nome: Any, email: Any, senha: Any, perfil: PerfilUsuario, perfilAgricola: Any) -> Conta:
        nomeValido = validarNome(nome)
        emailValido = validarEmail(email)
        senhaValida = validarSenha(senha)
        if self._contas.buscarPorEmail(emailValido) is not None:
            raise Conflito("Já existe uma conta com este e-mail.")

        dados: Optional[str] = None
        if perfil == PerfilUsuario.PRODUTOR:
            perfilLimpo = limparPerfilAgricola(perfilAgricola)
            dados = serializarPerfilAgricola(perfilLimpo)
        return self._contas.inserir(nomeValido, emailValido, self._hash.gerar(senhaValida), perfil, dados)

    # ------------------------------------------------------------------ dados próprios
    def atualizarMeusDados(self, conta: Conta, nome: Any, perfilAgricola: Any) -> Conta:
        conta.atualizarNome(validarNome(nome))
        if ehProdutor(conta) and isinstance(perfilAgricola, dict):
            # Mescla: campos não enviados mantêm o valor atual.
            atuais = lerPerfilAgricola(conta) or {}
            enviados = {k: v for k, v in limparPerfilAgricola(perfilAgricola).items() if k in perfilAgricola}
            conta.atualizarDadosPerfil(serializarPerfilAgricola(atuais | enviados))
        self._contas.salvar(conta)
        return conta

    def alterarSenha(self, conta: Conta, senhaAtual: Any, novaSenha: Any, tokenHashAtual: Optional[str] = None) -> None:
        if not self._hash.verificar(str(senhaAtual or ""), conta.senhaHash):
            raise DadosInvalidos("A senha atual está incorreta.")
        nova = validarSenha(novaSenha)
        self._contas.atualizarSenha(conta.id, self._hash.gerar(nova))
        # Encerra as outras sessões abertas desta conta, mantendo a atual.
        self._sessoes.removerDaConta(conta.id, exceto=tokenHashAtual)

    # ------------------------------------------------------------------ administração
    def listarContas(self, solicitante: Conta) -> list[Conta]:
        exigirAdmin(solicitante)
        return self._contas.listar()

    def _contaExistente(self, id: int) -> Conta:
        conta = self._contas.buscarPorId(id)
        if conta is None:
            raise NaoEncontrado("Conta não encontrada.")
        return conta

    def editarConta(self, solicitante: Conta, id: int, nome: Any, perfilAgricola: Any) -> Conta:
        exigirAdmin(solicitante)
        return self.atualizarMeusDados(self._contaExistente(id), nome, perfilAgricola)

    def alterarStatus(self, solicitante: Conta, id: int, ativo: bool) -> Conta:
        exigirAdmin(solicitante)
        if id == solicitante.id:
            raise AcessoNegado("Você não pode bloquear a sua própria conta.")
        conta = self._contaExistente(id)
        if ativo:
            conta.ativar()
        else:
            conta.bloquear()
            self._sessoes.removerDaConta(conta.id)
        self._contas.salvar(conta)
        return conta

    def excluirConta(self, solicitante: Conta, id: int) -> None:
        exigirAdmin(solicitante)
        if id == solicitante.id:
            raise AcessoNegado("Você não pode excluir a sua própria conta.")
        self._contaExistente(id)
        self._sessoes.removerDaConta(id)
        self._contas.excluir(id)

    def totalContas(self) -> int:
        return len(self._contas.listar())
