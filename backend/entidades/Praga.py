class Praga:
    def __init__(self, id: int, nomeCientifico: str, nomePopular: str, descricao: str, 
                 sintomas: str, recomendacoesManejo: str, defensivosIndicados: str, classeModelo: str):
        self._id = id
        self._nomeCientifico = nomeCientifico
        self._nomePopular = nomePopular
        self._descricao = descricao
        self._sintomas = sintomas
        self._recomendacoesManejo = recomendacoesManejo
        self._defensivosIndicados = defensivosIndicados
        self._classeModelo = classeModelo

    # Getters
    @property
    def id(self) -> int:
        return self._id

    @property
    def nomeCientifico(self) -> str:
        return self._nomeCientifico

    @property
    def nomePopular(self) -> str:
        return self._nomePopular

    @property
    def descricao(self) -> str:
        return self._descricao

    @property
    def sintomas(self) -> str:
        return self._sintomas

    @property
    def recomendacoesManejo(self) -> str:
        return self._recomendacoesManejo

    @property
    def defensivosIndicados(self) -> str:
        return self._defensivosIndicados

    @property
    def classeModelo(self) -> str:
        return self._classeModelo

    # Métodos de negócio do diagrama
    def atualizar(self, nomeCientifico: str, nomePopular: str, descricao: str, 
                  sintomas: str, recomendacoesManejo: str, defensivosIndicados: str) -> None:
        self._nomeCientifico = nomeCientifico
        self._nomePopular = nomePopular
        self._descricao = descricao
        self._sintomas = sintomas
        self._recomendacoesManejo = recomendacoesManejo
        self._defensivosIndicados = defensivosIndicados

    def corresponde(self, classeModelo: str) -> bool:
        #Compara o rótulo da praga com o rótulo recebido do modelo YOLO
        #Ignora diferenças de maiúsculas/minúsculas e espaços sobrando
        if not classeModelo:
            return False
        return self._classeModelo.strip().lower() == classeModelo.strip().lower()