"""MOCK do modelo YOLO.

Não analisa a imagem de verdade: gera detecções pseudoaleatórias, porém
DETERMINÍSTICAS (a mesma imagem sempre produz o mesmo resultado), a partir do
hash do conteúdo. Mantém o mesmo contrato (``IModeloDeteccao``) que a integração
real deverá implementar, então basta trocar esta classe quando o modelo existir.
"""
from __future__ import annotations

import hashlib
import random

from backend.negocio.interfaces import IModeloDeteccao, ResultadoDeteccaoBruto

CLASSES_DOENCA: tuple[str, ...] = ("rust", "cercospora", "leaf_miner", "phoma")


class ModeloYoloMock(IModeloDeteccao):
    def detectar(self, imagem: str, largura: int, altura: int) -> list[ResultadoDeteccaoBruto]:
        semente = int.from_bytes(hashlib.sha256(imagem.encode("utf-8")).digest()[:8], "big")
        rng = random.Random(semente)
        w, h = float(largura), float(altura)

        def caixa(classe: str, confianca: float, cx: float, cy: float, bw: float, bh: float) -> ResultadoDeteccaoBruto:
            x1, y1 = max(0.0, cx - bw / 2), max(0.0, cy - bh / 2)
            x2, y2 = min(w, cx + bw / 2), min(h, cy + bh / 2)
            return ResultadoDeteccaoBruto(classe, round(confianca, 3), round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1))

        # Folha inteira (região saudável predominante)
        resultados = [caixa("healthy", rng.uniform(0.84, 0.97), w * 0.5, h * 0.49, w * 0.72, h * 0.72)]

        if rng.random() < 0.2:  # cenário: folha saudável
            return resultados

        principal = rng.choice(CLASSES_DOENCA)
        severidade = rng.choice((1, 1, 2, 2, 3))
        for _ in range(rng.randint(2, 3) + severidade):
            # Lesões distribuídas ao longo da nervura central (diagonal da imagem)
            t = rng.uniform(0.12, 0.88)
            cx = w * (0.19 + 0.65 * t) + rng.uniform(-0.09, 0.09) * w
            cy = h * (0.81 - 0.65 * t) + rng.uniform(-0.09, 0.09) * h
            lado = rng.uniform(0.06 + 0.03 * severidade, 0.10 + 0.06 * severidade)
            classe = principal if rng.random() < 0.82 else rng.choice(CLASSES_DOENCA)
            confianca = rng.uniform(0.62, 0.97) if classe == principal else rng.uniform(0.45, 0.78)
            resultados.append(caixa(classe, confianca, cx, cy, w * lado, h * lado * rng.uniform(0.8, 1.2)))

        if rng.random() < 0.5:  # ruído de baixa confiança (descartado pelo limiar do serviço)
            resultados.append(caixa(rng.choice(CLASSES_DOENCA), rng.uniform(0.15, 0.45), w * rng.uniform(0.2, 0.8), h * rng.uniform(0.2, 0.8), w * 0.06, h * 0.06))
        return resultados
