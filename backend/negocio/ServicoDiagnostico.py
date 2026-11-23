"""Caso de uso: realizar diagnóstico, consultar histórico e exclusão lógica.

Segue o fluxo da seção 5 do documento de arquitetura:
modelo -> Deteccao -> cruzamento com Praga.corresponde -> Diagnostico ->
calcularGrauAfetacao -> pragaPrincipal -> persistência.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Optional

from backend.dominio import Conta, Deteccao, Diagnostico, Praga
from backend.negocio.excecoes import DadosInvalidos, NaoEncontrado
from backend.negocio.interfaces import IModeloDeteccao, IRepositorioDiagnostico, IRepositorioPraga
from backend.negocio.validacoes import exigirAdmin, exigirProdutor

LIMIAR_CONFIANCA: float = 0.5
PREFIXOS_IMAGEM_ACEITOS: tuple[str, ...] = ("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,", "mock://folha/")


class ServicoDiagnostico:
    def __init__(self, modelo: IModeloDeteccao, repositorioDiagnostico: IRepositorioDiagnostico, repositorioPraga: IRepositorioPraga) -> None:
        self._modelo = modelo
        self._diagnosticos = repositorioDiagnostico
        self._pragas = repositorioPraga

    # ------------------------------------------------------------------ fluxo principal
    def realizarDiagnostico(
        self, conta: Conta, urlImagem: Any, largura: Any, altura: Any, dataAnalise: Optional[datetime] = None
    ) -> Diagnostico:
        exigirProdutor(conta)
        url = str(urlImagem or "")
        if not url.startswith(PREFIXOS_IMAGEM_ACEITOS):
            raise DadosInvalidos("Envie uma imagem JPG, PNG ou WEBP.")
        try:
            larguraPx, alturaPx = int(largura), int(altura)
        except (TypeError, ValueError) as erro:
            raise DadosInvalidos("Dimensões da imagem inválidas.") from erro
        if not (16 <= larguraPx <= 8000 and 16 <= alturaPx <= 8000):
            raise DadosInvalidos("Dimensões da imagem fora do intervalo permitido.")

        catalogo: list[Praga] = self._pragas.listar()
        diagnostico = Diagnostico(self._diagnosticos.gerarIdDiagnostico(), conta, url, dataAnalise)

        for bruto in self._modelo.detectar(url, larguraPx, alturaPx):
            provisoria = Deteccao(0, bruto.classe, bruto.confianca, bruto.x1, bruto.y1, bruto.x2, bruto.y2)
            if not provisoria.ehConfiavel(LIMIAR_CONFIANCA):
                continue
            praga: Optional[Praga] = None
            if not provisoria.ehSaudavel():
                praga = next((p for p in catalogo if p.corresponde(bruto.classe)), None)
            diagnostico.adicionarDeteccao(
                Deteccao(
                    self._diagnosticos.gerarIdDeteccao(),
                    bruto.classe, bruto.confianca, bruto.x1, bruto.y1, bruto.x2, bruto.y2, praga,
                )
            )

        diagnostico.calcularGrauAfetacao()
        self._diagnosticos.salvar(diagnostico, larguraPx, alturaPx)
        return diagnostico

    # ------------------------------------------------------------------ consultas
    def listarHistorico(self, conta: Conta) -> list[Diagnostico]:
        diagnosticos = [d for d in self._diagnosticos.listarPorUsuario(conta.id) if d.estaAtivo() and d.pertenceA(conta)]
        return sorted(diagnosticos, key=lambda d: d.dataAnalise, reverse=True)

    def obterDiagnostico(self, conta: Conta, id: int) -> Diagnostico:
        diagnostico = self._diagnosticos.buscarPorId(id)
        if diagnostico is None or not diagnostico.pertenceA(conta) or not diagnostico.estaAtivo():
            raise NaoEncontrado("Diagnóstico não encontrado.")
        return diagnostico

    def excluirDiagnostico(self, conta: Conta, id: int) -> None:
        diagnostico = self.obterDiagnostico(conta, id)
        diagnostico.marcarComoExcluido()  # exclusão lógica
        largura, altura = self._diagnosticos.dimensoes(id)
        self._diagnosticos.salvar(diagnostico, largura, altura)

    def dimensoes(self, diagnostico: Diagnostico) -> tuple[int, int]:
        return self._diagnosticos.dimensoes(diagnostico.id)

    # ------------------------------------------------------------------ painel administrativo
    def estatisticas(self, solicitante: Conta) -> dict[str, Any]:
        exigirAdmin(solicitante)
        ativos = [d for d in self._diagnosticos.listarTodos() if d.estaAtivo()]
        principais = Counter(p.nomePopular for p in (d.pragaPrincipal() for d in ativos) if p is not None)
        comPraga = sum(1 for d in ativos if d.pragaPrincipal() is not None)
        grauMedio = sum(d.grauAfetacao for d in ativos) / len(ativos) if ativos else 0.0

        hoje = datetime.now()
        mensal: list[dict[str, Any]] = []
        for atras in range(11, -1, -1):
            ano, mes = hoje.year, hoje.month - atras
            while mes <= 0:
                mes += 12
                ano -= 1
            mensal.append({"ano": ano, "mes": mes, "total": sum(1 for d in ativos if d.dataAnalise.year == ano and d.dataAnalise.month == mes)})

        inicioSemana = (hoje - timedelta(days=hoje.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        semanal: list[dict[str, Any]] = []
        for atras in range(7, -1, -1):
            inicio = inicioSemana - timedelta(weeks=atras)
            fim = inicio + timedelta(weeks=1)
            semanal.append({"inicio": inicio.date().isoformat(), "total": sum(1 for d in ativos if inicio <= d.dataAnalise < fim)})

        return {
            "totalAnalises": len(ativos),
            "analisesComPraga": comPraga,
            "taxaDeteccao": (comPraga / len(ativos) * 100.0) if ativos else 0.0,
            "grauMedio": grauMedio,
            "pragaMaisComum": principais.most_common(1)[0][0] if principais else None,
            "ocorrenciasPorPraga": dict(principais.most_common()),
            "serieMensal": mensal,
            "serieSemanal": semanal,
        }

    def contarAnalises(self, conta: Conta) -> int:
        return len(self.listarHistorico(conta))
