"""Repositório de diagnósticos EM MEMÓRIA (mock). Os dados somem ao reiniciar o servidor."""
from __future__ import annotations

import itertools
import threading
from typing import Optional

from backend.dominio import Diagnostico
from backend.negocio.interfaces import IRepositorioDiagnostico


class RepositorioDiagnosticoMemoria(IRepositorioDiagnostico):
    def __init__(self) -> None:
        self._diagnosticos: dict[int, Diagnostico] = {}
        self._dimensoes: dict[int, tuple[int, int]] = {}
        self._idsDiagnostico = itertools.count(1)
        self._idsDeteccao = itertools.count(1)
        self._trava = threading.Lock()

    def gerarIdDiagnostico(self) -> int:
        with self._trava:
            return next(self._idsDiagnostico)

    def gerarIdDeteccao(self) -> int:
        with self._trava:
            return next(self._idsDeteccao)

    def salvar(self, diagnostico: Diagnostico, largura: int, altura: int) -> None:
        with self._trava:
            self._diagnosticos[diagnostico.id] = diagnostico
            self._dimensoes[diagnostico.id] = (largura, altura)

    def buscarPorId(self, id: int) -> Optional[Diagnostico]:
        with self._trava:
            return self._diagnosticos.get(id)

    def listarPorUsuario(self, usuarioId: int) -> list[Diagnostico]:
        with self._trava:
            return [d for d in self._diagnosticos.values() if d.usuario is not None and d.usuario.id == usuarioId]

    def listarTodos(self) -> list[Diagnostico]:
        with self._trava:
            return list(self._diagnosticos.values())

    def dimensoes(self, id: int) -> tuple[int, int]:
        with self._trava:
            return self._dimensoes.get(id, (640, 640))
