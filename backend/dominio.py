"""Ponte de importação para as entidades de domínio do Bioscan.

Os arquivos em ``backend/entidades/`` são IMUTÁVEIS (regra inviolável do projeto)
e usam imports "simplificados" como::

    import Conta
    class Usuario(Conta): ...          # espera que ``Conta`` seja a CLASSE

    import enums
    return enums.PRODUTOR              # espera acesso direto ao membro do Enum

Para que essas entidades funcionem sem alterar uma única linha delas, este módulo
carrega cada arquivo diretamente pelo caminho e, *somente durante o carregamento*,
registra em ``sys.modules`` objetos com os nomes curtos esperados:

* ``enums``  -> um namespace com os Enums e atalhos (PRODUTOR, ADMIN, CONCLUIDO, EXCLUIDO);
* ``Conta``, ``Usuario``, ``Praga``, ``Deteccao`` -> as próprias classes.

Após o carregamento, os nomes curtos são removidos de ``sys.modules`` (cada entidade
mantém a referência que recebeu no seu escopo global). Nenhum arquivo é criado na
pasta ``entidades`` (a geração de ``__pycache__`` é desativada durante a carga).

Todas as camadas devem importar as entidades daqui::

    from backend.dominio import Usuario, Administrador, PerfilUsuario
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any

_PASTA_ENTIDADES: Path = Path(__file__).resolve().parent / "entidades"
_PREFIXO: str = "bioscan_entidades"
_NOMES_CURTOS: tuple[str, ...] = ("enums", "Conta", "Usuario", "Administrador", "Praga", "Deteccao", "Diagnostico")


def _carregarArquivo(nome: str) -> ModuleType:
    caminho = _PASTA_ENTIDADES / f"{nome}.py"
    spec = importlib.util.spec_from_file_location(f"{_PREFIXO}.{nome}", caminho)
    if spec is None or spec.loader is None:
        raise ImportError(f"Não foi possível carregar a entidade {caminho}")
    modulo = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = modulo
    spec.loader.exec_module(modulo)
    return modulo


def _carregarEntidades() -> dict[str, Any]:
    anteriores = {nome: sys.modules.get(nome) for nome in _NOMES_CURTOS}
    escreviaBytecode = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        modEnums = _carregarArquivo("enums")
        perfil, status = modEnums.PerfilUsuario, modEnums.StatusDiagnostico
        sys.modules["enums"] = SimpleNamespace(  # type: ignore[assignment]
            PerfilUsuario=perfil,
            StatusDiagnostico=status,
            PRODUTOR=perfil.PRODUTOR,
            ADMIN=perfil.ADMIN,
            CONCLUIDO=status.CONCLUIDO,
            EXCLUIDO=status.EXCLUIDO,
        )

        classes: dict[str, Any] = {"PerfilUsuario": perfil, "StatusDiagnostico": status}
        for nome in ("Conta", "Usuario", "Administrador", "Praga", "Deteccao", "Diagnostico"):
            classe = getattr(_carregarArquivo(nome), nome)
            sys.modules[nome] = classe  # type: ignore[assignment]
            classes[nome] = classe
        return classes
    finally:
        sys.dont_write_bytecode = escreviaBytecode
        for nome, anterior in anteriores.items():
            if anterior is None:
                sys.modules.pop(nome, None)
            else:
                sys.modules[nome] = anterior


_entidades = _carregarEntidades()

PerfilUsuario = _entidades["PerfilUsuario"]
StatusDiagnostico = _entidades["StatusDiagnostico"]
Conta = _entidades["Conta"]
Usuario = _entidades["Usuario"]
Administrador = _entidades["Administrador"]
Praga = _entidades["Praga"]
Deteccao = _entidades["Deteccao"]
Diagnostico = _entidades["Diagnostico"]

__all__ = [
    "PerfilUsuario",
    "StatusDiagnostico",
    "Conta",
    "Usuario",
    "Administrador",
    "Praga",
    "Deteccao",
    "Diagnostico",
]
