from typing import Optional
import Praga

class Deteccao:
    def __init__(self, id: int, nomeClasse: str, confianca: float, 
                 x1: float, y1: float, x2: float, y2: float, praga: Optional[Praga] = None):
        self._id = id
        self._nomeClasse = nomeClasse
        self._confianca = confianca
        self._x1 = x1
        self._y1 = y1
        self._x2 = x2
        self._y2 = y2
        self._praga = praga

    # Getters
    @property
    def id(self) -> int: return self._id
    @property
    def nomeClasse(self) -> str: return self._nomeClasse
    @property
    def confianca(self) -> float: return self._confianca
    @property
    def x1(self) -> float: return self._x1
    @property
    def y1(self) -> float: return self._y1
    @property
    def x2(self) -> float: return self._x2
    @property
    def y2(self) -> float: return self._y2
    @property
    def praga(self) -> Optional[Praga]: return self._praga

    # Métodos de negócio
    def ehSaudavel(self) -> bool:
        return self._nomeClasse.strip().lower() == "healthy"

    def ehConfiavel(self, limiar: float) -> bool:
        return self._confianca >= limiar

    def area(self) -> float:
        # Área do retângulo delimitador
        return (self._x2 - self._x1) * (self._y2 - self._y1)