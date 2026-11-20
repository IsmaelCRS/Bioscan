from enum import Enum #trava a escolha entre "PRODUTOR" e "ADMIN"

class PerfilUsuario(Enum):
    PRODUTOR = "PRODUTOR"
    ADMIN = "ADMIN"

class StatusDiagnostico(Enum):
    CONCLUIDO = "CONCLUIDO"
    EXCLUIDO = "EXCLUIDO"