"""Dados de teste: funcionários/contas (SQLite), catálogo de pragas e diagnósticos (memória)."""
from __future__ import annotations

import random
from datetime import datetime, timedelta

from backend.dominio import PerfilUsuario
from backend.negocio.interfaces import IGeradorHash, IRepositorioConta, IRepositorioPraga
from backend.negocio.ServicoDiagnostico import ServicoDiagnostico
from backend.negocio.validacoes import ehProdutor, serializarPerfilAgricola

SENHA_ADMIN: str = "admin123"
SENHA_PRODUTOR: str = "produtor123"

CONTAS_TESTE: list[dict] = [
    {"nome": "Ana Beatriz Souza", "email": "admin@bioscan.com", "perfil": PerfilUsuario.ADMIN, "dias": 420},
    {"nome": "Ricardo Menezes", "email": "ricardo.admin@bioscan.com", "perfil": PerfilUsuario.ADMIN, "dias": 300},
    {"nome": "João Pereira da Silva", "email": "joao@bioscan.com", "perfil": PerfilUsuario.PRODUTOR, "dias": 210,
     "agro": {"telefone": "(34) 99812-4410", "propriedade": "Fazenda Boa Vista", "regiao": "Uberlândia - MG", "cultura": "Café", "area": "50 a 200 ha"}},
    {"nome": "Maria Oliveira Santos", "email": "maria@bioscan.com", "perfil": PerfilUsuario.PRODUTOR, "dias": 150,
     "agro": {"telefone": "(66) 98420-1133", "propriedade": "Sítio Esperança", "regiao": "Sorriso - MT", "cultura": "Soja", "area": "200 a 1000 ha"}},
    {"nome": "Lucas Ferreira", "email": "lucas@bioscan.com", "perfil": PerfilUsuario.PRODUTOR, "dias": 95,
     "agro": {"telefone": "(45) 99701-2288", "propriedade": "Chácara Três Irmãos", "regiao": "Cascavel - PR", "cultura": "Milho", "area": "10 a 50 ha"}},
    {"nome": "Fernanda Costa", "email": "fernanda@bioscan.com", "perfil": PerfilUsuario.PRODUTOR, "dias": 40,
     "agro": {"telefone": "(35) 99155-7720", "propriedade": "Fazenda Santa Clara", "regiao": "Varginha - MG", "cultura": "Café", "area": "Até 10 ha"}},
    {"nome": "Carlos Eduardo Lima", "email": "carlos@bioscan.com", "perfil": PerfilUsuario.PRODUTOR, "dias": 12, "bloqueado": True,
     "agro": {"telefone": "(62) 98877-0012", "propriedade": "Fazenda Rio Verde", "regiao": "Rio Verde - GO", "cultura": "Soja", "area": "Acima de 1000 ha"}},
]

PRAGAS_TESTE: list[dict[str, str]] = [
    {
        "nomeCientifico": "Hemileia vastatrix",
        "nomePopular": "Ferrugem",
        "descricao": "Doença fúngica mais importante do cafeeiro e presente em diversas culturas. Os esporos são disseminados pelo vento e pela chuva, com maior incidência em períodos quentes e úmidos.",
        "sintomas": "Manchas amarelo-alaranjadas e pulverulentas na face inferior das folhas, que evoluem para lesões necróticas e provocam desfolha precoce.",
        "recomendacoesManejo": "Utilizar cultivares resistentes, manter espaçamento adequado para ventilação, nutrição equilibrada e monitoramento mensal no período chuvoso.",
        "defensivosIndicados": "Fungicidas cúpricos (preventivo) e triazóis ou estrobilurinas (curativo), conforme receituário agronômico.",
        "classeModelo": "rust",
    },
    {
        "nomeCientifico": "Cercospora coffeicola",
        "nomePopular": "Cercosporiose",
        "descricao": "Também chamada de mancha-de-olho-pardo, é favorecida por estresse hídrico, insolação excessiva e deficiência de nitrogênio.",
        "sintomas": "Lesões circulares castanhas com centro acinzentado e halo amarelado, lembrando um olho; pode atingir também os frutos.",
        "recomendacoesManejo": "Corrigir a adubação nitrogenada e potássica, evitar estresse hídrico, usar quebra-ventos e retirar folhas muito afetadas.",
        "defensivosIndicados": "Fungicidas à base de cobre, tebuconazol ou piraclostrobina, alternando princípios ativos.",
        "classeModelo": "cercospora",
    },
    {
        "nomeCientifico": "Leucoptera coffeella",
        "nomePopular": "Bicho-mineiro",
        "descricao": "Pequena mariposa cujas larvas se alimentam do tecido interno da folha, formando minas. É uma das principais pragas do café no Brasil.",
        "sintomas": "Manchas irregulares de cor marrom-clara, com a epiderme solta (minas); folhas secam e caem, reduzindo a fotossíntese.",
        "recomendacoesManejo": "Monitorar a porcentagem de folhas minadas, preservar inimigos naturais (vespas predadoras) e evitar podas drásticas em épocas secas.",
        "defensivosIndicados": "Inseticidas sistêmicos (via solo) ou foliares registrados para a cultura, aplicados ao atingir o nível de controle.",
        "classeModelo": "leaf_miner",
    },
    {
        "nomeCientifico": "Phoma tarda",
        "nomePopular": "Mancha-de-phoma",
        "descricao": "Doença favorecida por temperaturas amenas, ventos frios e alta umidade, comum em lavouras de altitude.",
        "sintomas": "Manchas escuras e irregulares nas folhas novas e ponteiros, com necrose dos tecidos e seca de ramos.",
        "recomendacoesManejo": "Implantar quebra-ventos, evitar áreas de baixada muito frias e realizar aplicações preventivas antes da florada.",
        "defensivosIndicados": "Fungicidas com boscalida, iprodiona ou combinações triazol + estrobilurina.",
        "classeModelo": "phoma",
    },
]


def popularContas(repositorio: IRepositorioConta, geradorHash: IGeradorHash) -> bool:
    """Insere os funcionários de teste se o banco estiver vazio. Retorna True se inseriu."""
    if repositorio.listar():
        return False
    agora = datetime.now()
    hashAdmin = geradorHash.gerar(SENHA_ADMIN)
    hashProdutor = geradorHash.gerar(SENHA_PRODUTOR)
    for dados in CONTAS_TESTE:
        admin = dados["perfil"] == PerfilUsuario.ADMIN
        conta = repositorio.inserir(
            dados["nome"], dados["email"], hashAdmin if admin else hashProdutor, dados["perfil"],
            None if admin else serializarPerfilAgricola(dados["agro"]),
            dataCadastro=agora - timedelta(days=dados["dias"]),
        )
        if dados.get("bloqueado"):
            conta.bloquear()
            repositorio.salvar(conta)
    return True


def popularPragas(repositorio: IRepositorioPraga) -> None:
    if repositorio.listar():
        return
    for dados in PRAGAS_TESTE:
        repositorio.inserir(**dados)


def popularDiagnosticos(servico: ServicoDiagnostico, repositorioConta: IRepositorioConta) -> None:
    """Gera um histórico fictício (imagens 'mock://folha/N') para cada produtor."""
    rng = random.Random(2026)
    agora = datetime.now()
    semente = 1
    for conta in repositorioConta.listar():
        if not ehProdutor(conta):
            continue
        for _ in range(rng.randint(5, 9)):
            data = agora - timedelta(days=rng.randint(1, 330), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
            servico.realizarDiagnostico(conta, f"mock://folha/{semente}", 640, 640, data)
            semente += 1
