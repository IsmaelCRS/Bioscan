from abc import ABC, abstractmethod #transforma a classe em abstrata
from datetime import datetime #acessa a data e hora exata
import enums

class Conta(ABC):
    def __init__(self, id: int, nome: str, email: str, senhaHash: str, ativo: bool = True, dataCadastro: datetime = None):
        self._id = id
        self._nome = nome
        self._email = email
        self._senhaHash = senhaHash
        self._ativo = ativo
        self._dataCadastro = dataCadastro or datetime.now() #coloca a data atual

    # Getters
    @property
    def id(self) -> int:
        return self._id

    @property
    def nome(self) -> str:
        return self._nome

    @property
    def email(self) -> str:
        return self._email

    @property
    def senhaHash(self) -> str:
        return self._senhaHash

    @property
    def ativo(self) -> bool:
        return self._ativo
        
    @property
    def dataCadastro(self) -> datetime:
        return self._dataCadastro

    #Metodos
    def bloquear(self) -> None:
        self._ativo = False

    def ativar(self) -> None:
        self._ativo = True

    def atualizarNome(self, novoNome: str) -> None:
        self._nome = novoNome

    def podeAutenticar(self) -> bool:
        return self._ativo

    #Obter perfil
    @abstractmethod
    def obterPerfil(self) -> enums:
        pass