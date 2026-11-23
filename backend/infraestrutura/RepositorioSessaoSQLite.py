"""Repositório de sessões de login em SQLite (o token é guardado apenas como hash SHA-256)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from backend.infraestrutura.BancoSQLite import BancoSQLite
from backend.negocio.interfaces import IRepositorioSessao, Sessao


class RepositorioSessaoSQLite(IRepositorioSessao):
    def __init__(self, banco: BancoSQLite) -> None:
        self._banco = banco

    def criar(self, sessao: Sessao) -> None:
        with self._banco.conexao() as con:
            con.execute(
                "INSERT INTO sessoes (token_hash, conta_id, criada_em, expira_em) VALUES (?, ?, ?, ?)",
                (sessao.tokenHash, sessao.contaId, sessao.criadaEm.isoformat(), sessao.expiraEm.isoformat()),
            )

    def buscar(self, tokenHash: str) -> Optional[Sessao]:
        with self._banco.conexao() as con:
            linha = con.execute(
                "SELECT token_hash, conta_id, criada_em, expira_em FROM sessoes WHERE token_hash = ?", (tokenHash,)
            ).fetchone()
        if linha is None:
            return None
        return Sessao(
            linha["token_hash"], linha["conta_id"],
            datetime.fromisoformat(linha["criada_em"]), datetime.fromisoformat(linha["expira_em"]),
        )

    def remover(self, tokenHash: str) -> None:
        with self._banco.conexao() as con:
            con.execute("DELETE FROM sessoes WHERE token_hash = ?", (tokenHash,))

    def removerDaConta(self, contaId: int, exceto: Optional[str] = None) -> None:
        with self._banco.conexao() as con:
            con.execute("DELETE FROM sessoes WHERE conta_id = ? AND token_hash IS NOT ?", (contaId, exceto))

    def removerExpiradas(self, agora: datetime) -> None:
        with self._banco.conexao() as con:
            con.execute("DELETE FROM sessoes WHERE expira_em <= ?", (agora.isoformat(),))
