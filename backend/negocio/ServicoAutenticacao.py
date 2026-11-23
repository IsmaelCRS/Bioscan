"""Caso de uso: autenticação por e-mail/senha e gestão de sessões (tokens)."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from backend.dominio import Conta
from backend.negocio.excecoes import ContaBloqueada, CredenciaisInvalidas, DadosInvalidos, NaoAutenticado
from backend.negocio.interfaces import IGeradorHash, IRepositorioConta, IRepositorioSessao, Sessao
from backend.negocio.validacoes import normalizarEmail

DURACAO_SESSAO: timedelta = timedelta(hours=12)
DURACAO_SESSAO_LEMBRAR: timedelta = timedelta(days=30)


class ServicoAutenticacao:
    def __init__(self, repositorioConta: IRepositorioConta, repositorioSessao: IRepositorioSessao, geradorHash: IGeradorHash) -> None:
        self._contas = repositorioConta
        self._sessoes = repositorioSessao
        self._hash = geradorHash
        # Hash usado quando o e-mail não existe, para que o tempo de resposta não revele contas cadastradas.
        self._hashFicticio: str = geradorHash.gerar(secrets.token_hex(16))

    @staticmethod
    def _hashToken(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def autenticar(self, email: str, senha: str, lembrar: bool = False) -> tuple[str, Conta]:
        emailNormalizado = normalizarEmail(email)
        if not emailNormalizado or not senha:
            raise DadosInvalidos("Informe e-mail e senha.")

        conta = self._contas.buscarPorEmail(emailNormalizado)
        if conta is None:
            self._hash.verificar(senha, self._hashFicticio)
            raise CredenciaisInvalidas("E-mail ou senha incorretos.")
        if not self._hash.verificar(senha, conta.senhaHash):
            raise CredenciaisInvalidas("E-mail ou senha incorretos.")
        if not conta.podeAutenticar():
            raise ContaBloqueada("Esta conta está bloqueada. Procure um administrador.")

        return self.criarSessao(conta, lembrar), conta

    def criarSessao(self, conta: Conta, lembrar: bool = False) -> str:
        agora = datetime.now()
        self._sessoes.removerExpiradas(agora)
        token = secrets.token_urlsafe(32)
        duracao = DURACAO_SESSAO_LEMBRAR if lembrar else DURACAO_SESSAO
        self._sessoes.criar(Sessao(self._hashToken(token), conta.id, agora, agora + duracao))
        return token

    def contaDaSessao(self, token: Optional[str]) -> Conta:
        if not token:
            raise NaoAutenticado("Faça login para continuar.")
        tokenHash = self._hashToken(token)
        sessao = self._sessoes.buscar(tokenHash)
        if sessao is None or sessao.expiraEm <= datetime.now():
            if sessao is not None:
                self._sessoes.remover(tokenHash)
            raise NaoAutenticado("Sua sessão expirou ou foi encerrada. Faça login novamente.")

        conta = self._contas.buscarPorId(sessao.contaId)
        if conta is None or not conta.podeAutenticar():
            self._sessoes.remover(tokenHash)
            raise NaoAutenticado("Sua sessão foi encerrada. Faça login novamente.")
        return conta

    def encerrarSessao(self, token: Optional[str]) -> None:
        if token:
            self._sessoes.remover(self._hashToken(token))

    def hashDoToken(self, token: str) -> str:
        return self._hashToken(token)
