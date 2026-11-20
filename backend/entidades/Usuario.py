from datetime import datetime #localoza a hora atual
import Conta
import enums

class Usuario(Conta):
    def __init__(self, id: int, nome: str, email: str, senhaHash: str, dadosPerfilAgricola: str, ativo: bool = True, dataCadastro: datetime = None):
        super().__init__(id, nome, email, senhaHash, ativo, dataCadastro) #repassa os dados para a classe pai
        self._dadosPerfilAgricola = dadosPerfilAgricola

    #Getters
    @property
    def dadosPerfilAgricola(self) -> str:
        return self._dadosPerfilAgricola

    #Métodos
    def atualizarDadosPerfil(self, dados: str) -> None:
        self._dadosPerfilAgricola = dados

    def obterPerfil(self) -> enums:
        return enums.PRODUTOR