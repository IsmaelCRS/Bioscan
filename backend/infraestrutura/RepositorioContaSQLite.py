"""Repositório de contas em SQLite. Converte linhas do banco em Usuario/Administrador."""
from __future__ import annotations

import sqlite3
from datetime import datetime
from typing import Optional

from backend.dominio import Administrador, Conta, PerfilUsuario, Usuario
from backend.infraestrutura.BancoSQLite import BancoSQLite
from backend.negocio.excecoes import Conflito
from backend.negocio.interfaces import IRepositorioConta

_COLUNAS = "id, nome, email, senha_hash, perfil, ativo, dados_perfil_agricola, data_cadastro"


class RepositorioContaSQLite(IRepositorioConta):
    def __init__(self, banco: BancoSQLite) -> None:
        self._banco = banco

    @staticmethod
    def _paraEntidade(linha: sqlite3.Row) -> Conta:
        dataCadastro = datetime.fromisoformat(linha["data_cadastro"])
        ativo = bool(linha["ativo"])
        if linha["perfil"] == PerfilUsuario.ADMIN.value:
            return Administrador(linha["id"], linha["nome"], linha["email"], linha["senha_hash"], ativo, dataCadastro)
        return Usuario(
            linha["id"], linha["nome"], linha["email"], linha["senha_hash"],
            linha["dados_perfil_agricola"] or "{}", ativo, dataCadastro,
        )

    def inserir(
        self,
        nome: str,
        email: str,
        senhaHash: str,
        perfil: PerfilUsuario,
        dadosPerfilAgricola: Optional[str] = None,
        ativo: bool = True,
        dataCadastro: Optional[datetime] = None,
    ) -> Conta:
        data = (dataCadastro or datetime.now()).isoformat(timespec="seconds")
        try:
            with self._banco.conexao() as con:
                cursor = con.execute(
                    "INSERT INTO contas (nome, email, senha_hash, perfil, ativo, dados_perfil_agricola, data_cadastro) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (nome, email, senhaHash, perfil.value, int(ativo), dadosPerfilAgricola, data),
                )
                novoId = cursor.lastrowid
        except sqlite3.IntegrityError as erro:
            raise Conflito("Já existe uma conta com este e-mail.") from erro
        conta = self.buscarPorId(int(novoId))
        assert conta is not None
        return conta

    def buscarPorId(self, id: int) -> Optional[Conta]:
        with self._banco.conexao() as con:
            linha = con.execute(f"SELECT {_COLUNAS} FROM contas WHERE id = ?", (id,)).fetchone()
        return self._paraEntidade(linha) if linha else None

    def buscarPorEmail(self, email: str) -> Optional[Conta]:
        with self._banco.conexao() as con:
            linha = con.execute(f"SELECT {_COLUNAS} FROM contas WHERE email = ?", (email.strip(),)).fetchone()
        return self._paraEntidade(linha) if linha else None

    def listar(self) -> list[Conta]:
        with self._banco.conexao() as con:
            linhas = con.execute(f"SELECT {_COLUNAS} FROM contas ORDER BY data_cadastro DESC, id DESC").fetchall()
        return [self._paraEntidade(linha) for linha in linhas]

    def salvar(self, conta: Conta) -> None:
        dados = getattr(conta, "dadosPerfilAgricola", None)
        with self._banco.conexao() as con:
            con.execute(
                "UPDATE contas SET nome = ?, ativo = ?, dados_perfil_agricola = ? WHERE id = ?",
                (conta.nome, int(conta.ativo), dados, conta.id),
            )

    def atualizarSenha(self, id: int, senhaHash: str) -> None:
        with self._banco.conexao() as con:
            con.execute("UPDATE contas SET senha_hash = ? WHERE id = ?", (senhaHash, id))

    def excluir(self, id: int) -> None:
        with self._banco.conexao() as con:
            con.execute("DELETE FROM contas WHERE id = ?", (id,))

    def contar(self) -> int:
        with self._banco.conexao() as con:
            return int(con.execute("SELECT COUNT(*) FROM contas").fetchone()[0])
