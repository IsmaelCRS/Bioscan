"""Caso de uso: catálogo de pragas (consulta para todos, CRUD para administradores)."""
from __future__ import annotations

from typing import Any

from backend.dominio import Conta, Praga
from backend.negocio.excecoes import Conflito, NaoEncontrado
from backend.negocio.interfaces import IRepositorioPraga
from backend.negocio.validacoes import exigirAdmin, textoObrigatorio


class ServicoPraga:
    def __init__(self, repositorioPraga: IRepositorioPraga) -> None:
        self._pragas = repositorioPraga

    def listar(self) -> list[Praga]:
        return self._pragas.listar()

    def obter(self, id: int) -> Praga:
        praga = self._pragas.buscarPorId(id)
        if praga is None:
            raise NaoEncontrado("Praga não encontrada.")
        return praga

    @staticmethod
    def _camposDescritivos(dados: dict[str, Any]) -> dict[str, str]:
        return {
            "nomeCientifico": textoObrigatorio(dados.get("nomeCientifico"), "Nome científico", 160),
            "nomePopular": textoObrigatorio(dados.get("nomePopular"), "Nome popular", 120),
            "descricao": textoObrigatorio(dados.get("descricao"), "Descrição"),
            "sintomas": textoObrigatorio(dados.get("sintomas"), "Sintomas"),
            "recomendacoesManejo": textoObrigatorio(dados.get("recomendacoesManejo"), "Recomendações de manejo"),
            "defensivosIndicados": textoObrigatorio(dados.get("defensivosIndicados"), "Defensivos indicados"),
        }

    def criar(self, solicitante: Conta, dados: dict[str, Any]) -> Praga:
        exigirAdmin(solicitante)
        campos = self._camposDescritivos(dados)
        classeModelo = textoObrigatorio(dados.get("classeModelo"), "Classe do modelo", 60)
        if any(p.corresponde(classeModelo) for p in self._pragas.listar()):
            raise Conflito("Já existe uma praga vinculada a esta classe do modelo.")
        if classeModelo.strip().lower() == "healthy":
            raise Conflito("A classe 'healthy' é reservada para folhas saudáveis.")
        return self._pragas.inserir(classeModelo=classeModelo, **campos)

    def atualizar(self, solicitante: Conta, id: int, dados: dict[str, Any]) -> Praga:
        exigirAdmin(solicitante)
        praga = self.obter(id)
        praga.atualizar(**self._camposDescritivos(dados))  # classeModelo e id são imutáveis na entidade
        self._pragas.salvar(praga)
        return praga

    def excluir(self, solicitante: Conta, id: int) -> None:
        exigirAdmin(solicitante)
        self.obter(id)
        self._pragas.excluir(id)
