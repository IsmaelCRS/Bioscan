"""Repositório de pragas EM MEMÓRIA (mock). Somente as contas usam SQLite."""
from __future__ import annotations

import threading
from typing import Optional

from backend.dominio import Praga
from backend.negocio.interfaces import IRepositorioPraga


class RepositorioPragaMemoria(IRepositorioPraga):
    def __init__(self) -> None:
        self._pragas: dict[int, Praga] = {}
        self._proximoId: int = 1
        self._trava = threading.Lock()

    def listar(self) -> list[Praga]:
        with self._trava:
            return sorted(self._pragas.values(), key=lambda p: p.id)

    def buscarPorId(self, id: int) -> Optional[Praga]:
        with self._trava:
            return self._pragas.get(id)

    def inserir(
        self,
        nomeCientifico: str,
        nomePopular: str,
        descricao: str,
        sintomas: str,
        recomendacoesManejo: str,
        defensivosIndicados: str,
        classeModelo: str,
    ) -> Praga:
        with self._trava:
            praga = Praga(
                self._proximoId, nomeCientifico, nomePopular, descricao,
                sintomas, recomendacoesManejo, defensivosIndicados, classeModelo,
            )
            self._pragas[praga.id] = praga
            self._proximoId += 1
            return praga

    def salvar(self, praga: Praga) -> None:
        with self._trava:
            self._pragas[praga.id] = praga

    def excluir(self, id: int) -> None:
        with self._trava:
            self._pragas.pop(id, None)
