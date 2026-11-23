"""Exceções de negócio. A camada de apresentação traduz cada uma para um status HTTP."""
from __future__ import annotations


class ErroNegocio(Exception):
    """Base para todos os erros de regra de negócio."""

    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem)
        self.mensagem: str = mensagem


class DadosInvalidos(ErroNegocio):
    """Dados de entrada ausentes ou em formato inválido."""


class CredenciaisInvalidas(ErroNegocio):
    """E-mail ou senha incorretos."""


class ContaBloqueada(ErroNegocio):
    """A conta existe, mas ``podeAutenticar()`` retornou False."""


class NaoAutenticado(ErroNegocio):
    """Sessão ausente, expirada ou inválida."""


class AcessoNegado(ErroNegocio):
    """O perfil da conta não permite a operação."""


class NaoEncontrado(ErroNegocio):
    """Recurso inexistente (ou que não pertence ao solicitante)."""


class Conflito(ErroNegocio):
    """Violação de unicidade (ex.: e-mail já cadastrado)."""
