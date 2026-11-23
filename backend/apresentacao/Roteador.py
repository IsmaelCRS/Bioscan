"""Roteador HTTP mínimo baseado em expressões regulares."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from backend.dominio import Conta


@dataclass
class Requisicao:
    metodo: str
    caminho: str
    parametros: dict[str, str] = field(default_factory=dict)
    query: dict[str, str] = field(default_factory=dict)
    corpo: dict[str, Any] = field(default_factory=dict)
    token: Optional[str] = None
    conta: Optional[Conta] = None

    def inteiro(self, nome: str) -> int:
        return int(self.parametros[nome])


@dataclass
class Resposta:
    status: int = 200
    corpo: Any = None


Manipulador = Callable[[Requisicao], Resposta]


@dataclass(frozen=True)
class Rota:
    metodo: str
    padrao: re.Pattern[str]
    manipulador: Manipulador
    autenticada: bool


class Roteador:
    def __init__(self) -> None:
        self._rotas: list[Rota] = []

    def adicionar(self, metodo: str, caminho: str, manipulador: Manipulador, autenticada: bool = True) -> None:
        """``caminho`` aceita parâmetros inteiros no formato ``{nome}``."""
        regex = "^" + re.sub(r"\{(\w+)\}", r"(?P<\1>\\d+)", caminho) + "$"
        self._rotas.append(Rota(metodo.upper(), re.compile(regex), manipulador, autenticada))

    def resolver(self, metodo: str, caminho: str) -> tuple[Optional[Rota], dict[str, str], bool]:
        """Retorna (rota, parâmetros, caminhoExiste)."""
        caminhoExiste = False
        for rota in self._rotas:
            achado = rota.padrao.match(caminho)
            if achado is None:
                continue
            caminhoExiste = True
            if rota.metodo == metodo.upper():
                return rota, achado.groupdict(), True
        return None, {}, caminhoExiste
