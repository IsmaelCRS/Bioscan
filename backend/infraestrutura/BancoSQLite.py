"""Conexão e esquema do banco SQLite (usado SOMENTE para contas e sessões de login)."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

ESQUEMA: str = """
CREATE TABLE IF NOT EXISTS contas (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    nome                  TEXT    NOT NULL,
    email                 TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    senha_hash            TEXT    NOT NULL,
    perfil                TEXT    NOT NULL CHECK (perfil IN ('PRODUTOR', 'ADMIN')),
    ativo                 INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    dados_perfil_agricola TEXT,
    data_cadastro         TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessoes (
    token_hash TEXT    PRIMARY KEY,
    conta_id   INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    criada_em  TEXT    NOT NULL,
    expira_em  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessoes_conta ON sessoes(conta_id);
"""


class BancoSQLite:
    def __init__(self, caminho: Path) -> None:
        self._caminho = caminho
        caminho.parent.mkdir(parents=True, exist_ok=True)
        with self.conexao() as con:
            con.execute("PRAGMA journal_mode = WAL")
            con.executescript(ESQUEMA)

    @property
    def caminho(self) -> Path:
        return self._caminho

    @contextmanager
    def conexao(self) -> Iterator[sqlite3.Connection]:
        """Abre uma conexão por operação (seguro para o servidor multi-thread)."""
        con = sqlite3.connect(self._caminho, timeout=10)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA foreign_keys = ON")
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()
