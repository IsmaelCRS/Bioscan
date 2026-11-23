"""Integração REAL com o modelo YOLO treinado (Ultralytics, arquivo ``.pt``).

Implementa o mesmo contrato (``IModeloDeteccao``) do ``ModeloYoloMock``:

* o modelo é carregado UMA única vez no ``__init__`` (singleton por instância);
* a imagem chega como Data URL base64 (``data:image/...;base64,...``) e é
  decodificada para ``PIL.Image`` RGB;
* a inferência é serializada com ``threading.Lock`` (o servidor é multi-thread);
* as caixas são devolvidas em pixels na escala ``(largura, altura)`` recebida;
* URLs ``mock://`` (usadas por ``semente.py`` no startup) são delegadas ao mock.

Classes do ``modelos/best.pt`` (YOLOv8n-seg, dataset RoCoLe unificado):
``{0: 'healthy', 1: 'red_spider_mite', 2: 'rust'}``.
"""
from __future__ import annotations

import base64
import binascii
import io
import re
import threading
from pathlib import Path
from typing import Optional

from PIL import Image, UnidentifiedImageError

from backend.infraestrutura.ModeloYoloMock import ModeloYoloMock
from backend.negocio.excecoes import DadosInvalidos
from backend.negocio.interfaces import IModeloDeteccao, ResultadoDeteccaoBruto
from backend.negocio.ServicoDiagnostico import LIMIAR_CONFIANCA

# Nome da classe no modelo -> rótulo usado pelo domínio (Praga.classeModelo / "healthy").
MAPA_CLASSES: dict[str, str] = {
    "healthy": "healthy",                  # reservado: Deteccao.ehSaudavel()
    "red_spider_mite": "red_spider_mite",  # Ácaro-vermelho (Oligonychus ilicis)
    "rust": "rust",                        # Ferrugem (Hemileia vastatrix)
}
CLASSE_SAUDAVEL: str = "healthy"

_REGEX_DATA_URL = re.compile(r"^data:image/(?:jpeg|png|webp);base64,(?P<dados>.+)$", re.DOTALL)


class ModeloYoloReal(IModeloDeteccao):
    def __init__(self, caminhoPesos: Path, limiarConfianca: float = LIMIAR_CONFIANCA, dispositivo: Optional[str] = None) -> None:
        # numpy antes do torch: no Anaconda/Windows isso evita o erro "OMP: Error #15"
        # (duas cópias de libiomp5md.dll: a do MKL do conda e a embutida no torch).
        import numpy  # noqa: F401
        from ultralytics import YOLO  # import tardio: só exige ultralytics quando o modelo real é usado

        caminho = Path(caminhoPesos)
        if not caminho.is_file():
            raise FileNotFoundError(f"Pesos do modelo não encontrados: {caminho}")

        self._modelo = YOLO(str(caminho))
        self._limiar = float(limiarConfianca)
        self._dispositivo = dispositivo
        self._trava = threading.Lock()
        self._mock = ModeloYoloMock()
        self.caminho = caminho
        self.tarefa: str = str(self._modelo.task)
        self.nomes: dict[int, str] = {int(k): str(v) for k, v in self._modelo.names.items()}

        desconhecidas = sorted(set(self.nomes.values()) - set(MAPA_CLASSES))
        if desconhecidas:
            print(f"  [YOLO] Aviso: classes do modelo sem mapeamento (usadas sem tradução): {desconhecidas}")

        # Aquecimento: a primeira inferência é lenta (fusão de camadas, alocação).
        with self._trava:
            self._modelo.predict(Image.new("RGB", (64, 64)), conf=self._limiar, device=self._dispositivo, verbose=False)

    # ------------------------------------------------------------------ utilidades
    @staticmethod
    def _decodificar(imagem: str) -> Image.Image:
        achado = _REGEX_DATA_URL.match(imagem or "")
        if achado is None:
            raise DadosInvalidos("Envie uma imagem JPG, PNG ou WEBP em formato Data URL base64.")
        try:
            bruto = base64.b64decode(achado.group("dados"), validate=False)
            with Image.open(io.BytesIO(bruto)) as img:
                return img.convert("RGB")
        except (binascii.Error, ValueError, UnidentifiedImageError, OSError, Image.DecompressionBombError) as erro:
            raise DadosInvalidos("Não foi possível decodificar a imagem enviada.") from erro

    def _rotulo(self, idClasse: int) -> str:
        nome = self.nomes.get(idClasse, str(idClasse))
        return MAPA_CLASSES.get(nome, nome)

    # ------------------------------------------------------------------ contrato
    def detectar(self, imagem: str, largura: int, altura: int) -> list[ResultadoDeteccaoBruto]:
        if str(imagem).startswith("mock://"):
            return self._mock.detectar(imagem, largura, altura)

        foto = self._decodificar(imagem)
        larguraOrig, alturaOrig = foto.size
        escalaX, escalaY = float(largura) / larguraOrig, float(altura) / alturaOrig

        with self._trava:
            resultados = self._modelo.predict(foto, conf=self._limiar, device=self._dispositivo, verbose=False)

        deteccoes: list[ResultadoDeteccaoBruto] = []
        for resultado in resultados:
            caixas = resultado.boxes
            if caixas is None or len(caixas) == 0:
                continue
            xyxy = caixas.xyxy.cpu().tolist()
            confs = caixas.conf.cpu().tolist()
            classes = caixas.cls.cpu().tolist()
            for (x1, y1, x2, y2), conf, cls in zip(xyxy, confs, classes):
                deteccoes.append(
                    ResultadoDeteccaoBruto(
                        self._rotulo(int(cls)),
                        round(float(conf), 3),
                        round(max(0.0, min(float(largura), x1 * escalaX)), 1),
                        round(max(0.0, min(float(altura), y1 * escalaY)), 1),
                        round(max(0.0, min(float(largura), x2 * escalaX)), 1),
                        round(max(0.0, min(float(altura), y2 * escalaY)), 1),
                    )
                )

        return self._garantirBaseSaudavel(deteccoes, float(largura), float(altura))

    def _garantirBaseSaudavel(self, deteccoes: list[ResultadoDeteccaoBruto], w: float, h: float) -> list[ResultadoDeteccaoBruto]:
        """Evita grauAfetacao = 100% quando o modelo só devolve caixas de doença.

        ``Diagnostico.calcularGrauAfetacao`` (imutável) divide a área afetada pela soma
        das áreas de TODAS as caixas. Se não houver nenhuma caixa ``healthy`` confiável,
        injeta uma caixa base ``healthy`` cobrindo a imagem inteira (referência da folha),
        com a confiança da detecção mais confiável. Sem detecções, nada é injetado.
        """
        confiaveis = [d for d in deteccoes if d.confianca >= self._limiar]
        if not confiaveis or any(d.classe == CLASSE_SAUDAVEL for d in confiaveis):
            return deteccoes
        confianca = max(d.confianca for d in confiaveis)
        return [ResultadoDeteccaoBruto(CLASSE_SAUDAVEL, confianca, 0.0, 0.0, round(w, 1), round(h, 1))] + deteccoes
