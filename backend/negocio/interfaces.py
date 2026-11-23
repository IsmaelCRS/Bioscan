"""Contratos (portas) que a camada de infraestrutura deve implementar.

A camada de negócio depende apenas destas abstrações, nunca de SQLite,
de memória ou do modelo YOLO diretamente.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from backend.dominio import Conta, Diagnostico, PerfilUsuario, Praga


# --------------------------------------------------------------------------- senhas
class IGeradorHash(ABC):
    @abstractmethod
    def gerar(self, senha: str) -> str: ...

    @abstractmethod
    def verificar(self, senha: str, senhaHash: str) -> bool: ...


# --------------------------------------------------------------------------- contas
class IRepositorioConta(ABC):
    @abstractmethod
    def inserir(
        self,
        nome: str,
        email: str,
        senhaHash: str,
        perfil: PerfilUsuario,
        dadosPerfilAgricola: Optional[str] = None,
        ativo: bool = True,
        dataCadastro: Optional[datetime] = None,
    ) -> Conta: ...

    @abstractmethod
    def buscarPorId(self, id: int) -> Optional[Conta]: ...

    @abstractmethod
    def buscarPorEmail(self, email: str) -> Optional[Conta]: ...

    @abstractmethod
    def listar(self) -> list[Conta]: ...

    @abstractmethod
    def salvar(self, conta: Conta) -> None:
        """Persiste nome, status (ativo) e dados do perfil agrícola."""

    @abstractmethod
    def atualizarSenha(self, id: int, senhaHash: str) -> None: ...

    @abstractmethod
    def excluir(self, id: int) -> None: ...


# --------------------------------------------------------------------------- sessões
@dataclass(frozen=True)
class Sessao:
    tokenHash: str
    contaId: int
    criadaEm: datetime
    expiraEm: datetime


class IRepositorioSessao(ABC):
    @abstractmethod
    def criar(self, sessao: Sessao) -> None: ...

    @abstractmethod
    def buscar(self, tokenHash: str) -> Optional[Sessao]: ...

    @abstractmethod
    def remover(self, tokenHash: str) -> None: ...

    @abstractmethod
    def removerDaConta(self, contaId: int, exceto: Optional[str] = None) -> None: ...

    @abstractmethod
    def removerExpiradas(self, agora: datetime) -> None: ...


# --------------------------------------------------------------------------- modelo de visão
@dataclass(frozen=True)
class ResultadoDeteccaoBruto:
    """Saída crua do modelo (YOLO ou mock) para uma bounding box."""

    classe: str
    confianca: float
    x1: float
    y1: float
    x2: float
    y2: float


class IModeloDeteccao(ABC):
    @abstractmethod
    def detectar(self, imagem: str, largura: int, altura: int) -> list[ResultadoDeteccaoBruto]: ...


# --------------------------------------------------------------------------- pragas
class IRepositorioPraga(ABC):
    @abstractmethod
    def listar(self) -> list[Praga]: ...

    @abstractmethod
    def buscarPorId(self, id: int) -> Optional[Praga]: ...

    @abstractmethod
    def inserir(
        self,
        nomeCientifico: str,
        nomePopular: str,
        descricao: str,
        sintomas: str,
        recomendacoesManejo: str,
        defensivosIndicados: str,
        classeModelo: str,
    ) -> Praga: ...

    @abstractmethod
    def salvar(self, praga: Praga) -> None: ...

    @abstractmethod
    def excluir(self, id: int) -> None: ...


# --------------------------------------------------------------------------- diagnósticos
class IRepositorioDiagnostico(ABC):
    @abstractmethod
    def gerarIdDiagnostico(self) -> int: ...

    @abstractmethod
    def gerarIdDeteccao(self) -> int: ...

    @abstractmethod
    def salvar(self, diagnostico: Diagnostico, largura: int, altura: int) -> None: ...

    @abstractmethod
    def buscarPorId(self, id: int) -> Optional[Diagnostico]: ...

    @abstractmethod
    def listarPorUsuario(self, usuarioId: int) -> list[Diagnostico]: ...

    @abstractmethod
    def listarTodos(self) -> list[Diagnostico]: ...

    @abstractmethod
    def dimensoes(self, id: int) -> tuple[int, int]: ...
