import Conta
import enums

class Administrador(Conta):
    #usa o construtor da classe pai

    #Metodos
    def obterPerfil(self) -> enums:
        return enums.ADMIN