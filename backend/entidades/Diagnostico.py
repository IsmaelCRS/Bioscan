from typing import List, Optional
from datetime import datetime
import Usuario
import Deteccao
import Praga
import enums

class Diagnostico:
    def __init__(self, id: int, usuario: Usuario, urlImagem: str, 
                 dataAnalise: datetime = None, status: enums = enums.CONCLUIDO):
        self._id = id
        self._usuario = usuario
        self._urlImagem = urlImagem
        self._dataAnalise = dataAnalise or datetime.now()
        self._status = status
        
        # Inicia com lista vazia e grau 0 (composição)
        self._deteccoes: List[Deteccao] = []
        self._grauAfetacao: float = 0.0

    # Getters
    @property
    def id(self) -> int: return self._id
    @property
    def usuario(self) -> Usuario: return self._usuario
    @property
    def urlImagem(self) -> str: return self._urlImagem
    @property
    def dataAnalise(self) -> datetime: return self._dataAnalise
    @property
    def grauAfetacao(self) -> float: return self._grauAfetacao
    @property
    def status(self) -> enums: return self._status
    @property
    def deteccoes(self) -> List[Deteccao]: return self._deteccoes

    # Métodos de negócio
    def adicionarDeteccao(self, deteccao: Deteccao) -> None:
        self._deteccoes.append(deteccao)

    def calcularGrauAfetacao(self) -> None:
        #E zero se nao identificar nada
        if not self._deteccoes:
            self._grauAfetacao = 0.0
            return
            
        #Se a area nao for consideravel, tambem e zero
        area_total = sum(d.area() for d in self._deteccoes)
        if area_total == 0:
            self._grauAfetacao = 0.0
            return

        #Se ouver deteccoes, faz areaDeteccao/areaTotal
        area_afetada = sum(d.area() for d in self._deteccoes if not d.ehSaudavel())
        
        #Cálculo do grau (0 a 100)
        self._grauAfetacao = (area_afetada / area_total) * 100.0

    def pragaPrincipal(self) -> Optional[Praga]:
        #Filtra detecções que não são saudáveis e que possuem uma praga cadastrada
        deteccoes_pragas = [d for d in self._deteccoes if not d.ehSaudavel() and d.praga is not None]
        
        if not deteccoes_pragas:
            return None
            
        #Pega a detecção com a maior confiança
        deteccao_principal = max(deteccoes_pragas, key=lambda d: d.confianca)
        return deteccao_principal.praga

    #retorna o usuario dono da deteccao
    def pertenceA(self, usuario: Usuario) -> bool:
        if not usuario or not self._usuario:
            return False
        return self._usuario.id == usuario.id

    def marcarComoExcluido(self) -> None:
        self._status = enums.EXCLUIDO

    def estaAtivo(self) -> bool:
        return self._status == enums.CONCLUIDO