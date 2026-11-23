"""Validações e normalizações de entrada reutilizadas pelos serviços."""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from backend.dominio import Conta, PerfilUsuario
from backend.negocio.excecoes import AcessoNegado, DadosInvalidos

_REGEX_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

TAMANHO_MINIMO_SENHA: int = 6
CAMPOS_PERFIL_AGRICOLA: tuple[str, ...] = ("telefone", "propriedade", "regiao", "cultura", "area")


def normalizarEmail(email: Any) -> str:
    return str(email or "").strip().lower()


def validarEmail(email: Any) -> str:
    valor = normalizarEmail(email)
    if not valor or len(valor) > 160 or not _REGEX_EMAIL.match(valor):
        raise DadosInvalidos("Informe um e-mail válido.")
    return valor


def validarNome(nome: Any) -> str:
    valor = " ".join(str(nome or "").split())
    if len(valor) < 3:
        raise DadosInvalidos("O nome deve ter pelo menos 3 caracteres.")
    if len(valor) > 120:
        raise DadosInvalidos("O nome deve ter no máximo 120 caracteres.")
    return valor


def validarSenha(senha: Any) -> str:
    valor = str(senha or "")
    if len(valor) < TAMANHO_MINIMO_SENHA:
        raise DadosInvalidos(f"A senha deve ter pelo menos {TAMANHO_MINIMO_SENHA} caracteres.")
    if len(valor) > 128:
        raise DadosInvalidos("A senha deve ter no máximo 128 caracteres.")
    return valor


def textoObrigatorio(valor: Any, campo: str, maximo: int = 2000) -> str:
    texto = str(valor or "").strip()
    if not texto:
        raise DadosInvalidos(f"O campo '{campo}' é obrigatório.")
    if len(texto) > maximo:
        raise DadosInvalidos(f"O campo '{campo}' deve ter no máximo {maximo} caracteres.")
    return texto


def limparPerfilAgricola(dados: Any) -> dict[str, str]:
    """Mantém apenas os campos conhecidos do perfil agrícola, como texto."""
    if not isinstance(dados, dict):
        return {}
    return {campo: str(dados.get(campo) or "").strip()[:120] for campo in CAMPOS_PERFIL_AGRICOLA}


def serializarPerfilAgricola(dados: dict[str, str]) -> str:
    return json.dumps(dados, ensure_ascii=False)


def lerPerfilAgricola(conta: Conta) -> Optional[dict[str, str]]:
    """Interpreta ``Usuario.dadosPerfilAgricola`` (texto JSON). Administradores retornam None."""
    if not ehProdutor(conta):
        return None
    bruto = getattr(conta, "dadosPerfilAgricola", "") or ""
    try:
        dados = json.loads(bruto)
    except (TypeError, ValueError):
        return {campo: "" for campo in CAMPOS_PERFIL_AGRICOLA} | {"propriedade": str(bruto)[:120]}
    return limparPerfilAgricola(dados)


def ehAdmin(conta: Conta) -> bool:
    return conta.obterPerfil() == PerfilUsuario.ADMIN


def ehProdutor(conta: Conta) -> bool:
    return conta.obterPerfil() == PerfilUsuario.PRODUTOR


def exigirAdmin(conta: Conta) -> None:
    if not ehAdmin(conta):
        raise AcessoNegado("Apenas administradores podem realizar esta operação.")


def exigirProdutor(conta: Conta) -> None:
    if not ehProdutor(conta):
        raise AcessoNegado("Apenas produtores podem realizar diagnósticos.")
