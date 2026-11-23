"""Conversão das entidades de domínio para dicionários JSON."""
from __future__ import annotations

from typing import Any, Optional

from backend.dominio import Conta, Deteccao, Diagnostico, Praga
from backend.negocio.validacoes import lerPerfilAgricola


def conta(c: Conta) -> dict[str, Any]:
    return {
        "id": c.id,
        "nome": c.nome,
        "email": c.email,
        "perfil": c.obterPerfil().value,
        "ativo": c.ativo,
        "dataCadastro": c.dataCadastro.isoformat(timespec="seconds"),
        "perfilAgricola": lerPerfilAgricola(c),
    }


def praga(p: Optional[Praga]) -> Optional[dict[str, Any]]:
    if p is None:
        return None
    return {
        "id": p.id,
        "nomeCientifico": p.nomeCientifico,
        "nomePopular": p.nomePopular,
        "descricao": p.descricao,
        "sintomas": p.sintomas,
        "recomendacoesManejo": p.recomendacoesManejo,
        "defensivosIndicados": p.defensivosIndicados,
        "classeModelo": p.classeModelo,
    }


def deteccao(d: Deteccao) -> dict[str, Any]:
    return {
        "id": d.id,
        "nomeClasse": d.nomeClasse,
        "confianca": d.confianca,
        "x1": d.x1, "y1": d.y1, "x2": d.x2, "y2": d.y2,
        "area": d.area(),
        "saudavel": d.ehSaudavel(),
        "pragaId": d.praga.id if d.praga is not None else None,
        "pragaNome": d.praga.nomePopular if d.praga is not None else None,
    }


def nivelAfetacao(grau: float) -> str:
    if grau <= 0:
        return "Saudável"
    if grau < 15:
        return "Leve"
    if grau < 35:
        return "Moderado"
    return "Severo"


def diagnostico(d: Diagnostico, largura: int, altura: int) -> dict[str, Any]:
    return {
        "id": d.id,
        "usuarioId": d.usuario.id,
        "urlImagem": d.urlImagem,
        "largura": largura,
        "altura": altura,
        "dataAnalise": d.dataAnalise.isoformat(timespec="seconds"),
        "status": d.status.value,
        "grauAfetacao": round(d.grauAfetacao, 2),
        "nivel": nivelAfetacao(d.grauAfetacao),
        "pragaPrincipal": praga(d.pragaPrincipal()),
        "deteccoes": [deteccao(x) for x in d.deteccoes],
    }
