# Contexto Técnico do Projeto Bioscan

> Auditoria técnica somente leitura gerada para planejamento da integração do modelo YOLO treinado (`.pt`) ao fluxo real da aplicação **Bioscan**.

## 1. Árvore de Diretórios

Estrutura limpa do repositório (pastas ignoradas como `.git/` não têm seu conteúdo interno listado; arquivos binários não foram lidos):

```text
Bioscan/
├── .gitattributes
├── .gitignore
├── main.py                                  # Ponto de entrada e injeção manual de dependências
├── dados/
│   └── bioscan.db                           # [BINÁRIO] Banco de dados SQLite (contas e sessões)
├── backend/
│   ├── __init__.py
│   ├── dominio.py                           # Ponte de importação das entidades imutáveis
│   ├── apresentacao/
│   │   ├── __init__.py
│   │   ├── ApiBioscan.py                    # Controladores e registro das rotas REST (/api/*)
│   │   ├── Roteador.py                      # Roteador HTTP via regex
│   │   ├── serializadores.py                # Serialização de entidades para JSON
│   │   └── servidor.py                      # ThreadingHTTPServer, limites, CSP e estáticos
│   ├── entidades/                           # Entidades de domínio (IMUTÁVEIS por regra do projeto)
│   │   ├── Administrador.py
│   │   ├── Conta.py
│   │   ├── Deteccao.py
│   │   ├── Diagnostico.py
│   │   ├── Praga.py
│   │   ├── Usuario.py
│   │   └── enums.py
│   ├── infraestrutura/
│   │   ├── __init__.py
│   │   ├── BancoSQLite.py                   # Schema SQLite e gerenciador de conexões
│   │   ├── GeradorHashPBKDF2.py             # Hashing de senhas PBKDF2-HMAC-SHA256
│   │   ├── ModeloYoloMock.py                # Mock determinístico do modelo YOLO (IModeloDeteccao)
│   │   ├── RepositorioContaSQLite.py        # Persistência SQLite de contas
│   │   ├── RepositorioDiagnosticoMemoria.py # Persistência EM MEMÓRIA de diagnósticos (mock)
│   │   ├── RepositorioPragaMemoria.py       # Persistência EM MEMÓRIA de pragas (mock)
│   │   ├── RepositorioSessaoSQLite.py       # Persistência SQLite de sessões de login
│   │   └── semente.py                       # Dados de teste (contas, pragas e diagnósticos)
│   └── negocio/
│       ├── __init__.py
│       ├── ServicoAutenticacao.py           # Login, tokens Bearer e validação de sessão
│       ├── ServicoDiagnostico.py            # Caso de uso principal de diagnóstico e estatísticas
│       ├── ServicoPraga.py                  # CRUD e consulta do catálogo de pragas
│       ├── ServicoUsuario.py                # Gestão de contas (produtores e admins)
│       ├── excecoes.py                      # Hierarquia de exceções de negócio
│       ├── interfaces.py                    # Contratos (ABCs) e DTO ResultadoDeteccaoBruto
│       └── validacoes.py                    # Validações e helpers de perfil
└── frontend/
    ├── index.html                           # SPA shell (carrega js/app.js como ES module)
    ├── css/
    │   └── estilo.css                       # Folha de estilos da interface
    ├── img/
    │   └── logo.svg                         # Ícone/logo vetorial
    └── js/
        ├── api.js                           # Cliente fetch para /api/*
        ├── app.js                           # Roteador hash (#/) e guarda de autenticação
        ├── componentes.js                   # Visualizador com bounding boxes, cartaoResultado e SVG
        ├── sessao.js                        # Armazenamento de token (localStorage/sessionStorage)
        ├── ui.js                            # Modais, toasts, ícones, campos e formatação
        └── paginas/
            ├── admin.js                     # Painel admin (KPIs, usuários SQLite, CRUD pragas)
            ├── cadastro.js                  # Cadastro de produtor em 2 etapas
            ├── catalogo.js                  # Catálogo visual de pragas e classes YOLO
            ├── historico.js                 # Banco de análises, carrossel e exclusão lógica
            ├── inicio.js                    # Upload drag-and-drop/input e modal de resultado
            ├── login.js                     # Login e atalhos para contas de teste
            └── perfil.js                    # Edição de perfil e alteração de senha
```

- **Banco SQLite:** localizado em `dados/bioscan.db` (criado automaticamente se ausente ao executar `main.py`).
- **Pesos de modelo IA (`.pt` / `.onnx`):** **nenhum arquivo de peso foi encontrado** no repositório atual.

## 2. Stack Tecnológica e Dependências

- **Arquivos de manifesto de dependências (`package.json`, `requirements.txt`, `pyproject.toml`, `composer.json`):** **não existem** no workspace atual.
- **Arquivos de variáveis de ambiente (`.env`, `.env.example`):** **não existem** no workspace atual (`.env` consta apenas listado no `.gitignore`). O servidor aceita configuração via argumentos CLI em `main.py` (`--host`, `--porta`, `--resetar-banco`).
- **Backend:** **Python 3** (requer Python 3.9+ devido ao uso de `Path.is_relative_to`, operador de união de dicionários `|` e tipagem nativa). Utiliza **exclusivamente a biblioteca padrão do Python** (`http.server.ThreadingHTTPServer`, `sqlite3`, `hashlib`, `hmac`, `secrets`, `base64`, `json`, `re`, `importlib.util`, `argparse`, `pathlib`, `dataclasses`, `abc`, `enum`, `mimetypes`, `urllib.parse`, `threading`, `itertools`, `collections`, `datetime`, `random`), sem dependências externas instaladas ou declaradas até o momento.
- **Banco de Dados:** **SQLite 3** via módulo nativo `sqlite3` (modo `WAL`, `PRAGMA foreign_keys = ON`). Atualmente utilizado **somente** para `contas` e `sessoes`; diagnósticos e pragas residem em memória.
- **Frontend:** **HTML5 + CSS3 + JavaScript ES Modules nativo (Vanilla JS)**, sem frameworks (React/Vue/etc.) e sem etapa de build/bundler. Servido diretamente pelo backend Python. Utiliza Google Fonts (`Poppins`).
- **Arquitetura:** Arquitetura em camadas com injeção manual de dependências em `main.py` (`infraestrutura -> negocio -> apresentacao`). As entidades em `backend/entidades/` são marcadas como imutáveis e carregadas pela ponte `backend/dominio.py`.

## 3. Camada de Banco de Dados (SQLite)

- **Localização do arquivo SQLite:** `dados/bioscan.db` (configurado em `main.py`: `CAMINHO_BANCO = RAIZ / "dados" / "bioscan.db"`).
- **Escopo atual da persistência SQLite:** apenas as tabelas `contas` e `sessoes` existem no SQLite. Os repositórios de **diagnósticos** (`RepositorioDiagnosticoMemoria`) e **pragas** (`RepositorioPragaMemoria`) são implementações em memória (`dict`) e seus dados são perdidos ao reiniciar o servidor (sendo repovoados por `backend/infraestrutura/semente.py`).
- **Modelos de domínio:** as entidades em `backend/entidades/` são reconstruídas pelos repositórios e importadas via `backend/dominio.py`.

### backend/infraestrutura/BancoSQLite.py

```python
"""Conexão e esquema do banco SQLite (usado SOMENTE para contas e sessões de login)."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

ESQUEMA: str = """
CREATE TABLE IF NOT EXISTS contas (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    nome                  TEXT    NOT NULL,
    email                 TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    senha_hash            TEXT    NOT NULL,
    perfil                TEXT    NOT NULL CHECK (perfil IN ('PRODUTOR', 'ADMIN')),
    ativo                 INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    dados_perfil_agricola TEXT,
    data_cadastro         TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessoes (
    token_hash TEXT    PRIMARY KEY,
    conta_id   INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    criada_em  TEXT    NOT NULL,
    expira_em  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessoes_conta ON sessoes(conta_id);
"""


class BancoSQLite:
    def __init__(self, caminho: Path) -> None:
        self._caminho = caminho
        caminho.parent.mkdir(parents=True, exist_ok=True)
        with self.conexao() as con:
            con.execute("PRAGMA journal_mode = WAL")
            con.executescript(ESQUEMA)

    @property
    def caminho(self) -> Path:
        return self._caminho

    @contextmanager
    def conexao(self) -> Iterator[sqlite3.Connection]:
        """Abre uma conexão por operação (seguro para o servidor multi-thread)."""
        con = sqlite3.connect(self._caminho, timeout=10)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA foreign_keys = ON")
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()
```

### backend/infraestrutura/RepositorioContaSQLite.py

```python
"""Repositório de contas em SQLite. Converte linhas do banco em Usuario/Administrador."""
from __future__ import annotations

import sqlite3
from datetime import datetime
from typing import Optional

from backend.dominio import Administrador, Conta, PerfilUsuario, Usuario
from backend.infraestrutura.BancoSQLite import BancoSQLite
from backend.negocio.excecoes import Conflito
from backend.negocio.interfaces import IRepositorioConta

_COLUNAS = "id, nome, email, senha_hash, perfil, ativo, dados_perfil_agricola, data_cadastro"


class RepositorioContaSQLite(IRepositorioConta):
    def __init__(self, banco: BancoSQLite) -> None:
        self._banco = banco

    @staticmethod
    def _paraEntidade(linha: sqlite3.Row) -> Conta:
        dataCadastro = datetime.fromisoformat(linha["data_cadastro"])
        ativo = bool(linha["ativo"])
        if linha["perfil"] == PerfilUsuario.ADMIN.value:
            return Administrador(linha["id"], linha["nome"], linha["email"], linha["senha_hash"], ativo, dataCadastro)
        return Usuario(
            linha["id"], linha["nome"], linha["email"], linha["senha_hash"],
            linha["dados_perfil_agricola"] or "{}", ativo, dataCadastro,
        )

    def inserir(
        self,
        nome: str,
        email: str,
        senhaHash: str,
        perfil: PerfilUsuario,
        dadosPerfilAgricola: Optional[str] = None,
        ativo: bool = True,
        dataCadastro: Optional[datetime] = None,
    ) -> Conta:
        data = (dataCadastro or datetime.now()).isoformat(timespec="seconds")
        try:
            with self._banco.conexao() as con:
                cursor = con.execute(
                    "INSERT INTO contas (nome, email, senha_hash, perfil, ativo, dados_perfil_agricola, data_cadastro) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (nome, email, senhaHash, perfil.value, int(ativo), dadosPerfilAgricola, data),
                )
                novoId = cursor.lastrowid
        except sqlite3.IntegrityError as erro:
            raise Conflito("Já existe uma conta com este e-mail.") from erro
        conta = self.buscarPorId(int(novoId))
        assert conta is not None
        return conta

    def buscarPorId(self, id: int) -> Optional[Conta]:
        with self._banco.conexao() as con:
            linha = con.execute(f"SELECT {_COLUNAS} FROM contas WHERE id = ?", (id,)).fetchone()
        return self._paraEntidade(linha) if linha else None

    def buscarPorEmail(self, email: str) -> Optional[Conta]:
        with self._banco.conexao() as con:
            linha = con.execute(f"SELECT {_COLUNAS} FROM contas WHERE email = ?", (email.strip(),)).fetchone()
        return self._paraEntidade(linha) if linha else None

    def listar(self) -> list[Conta]:
        with self._banco.conexao() as con:
            linhas = con.execute(f"SELECT {_COLUNAS} FROM contas ORDER BY data_cadastro DESC, id DESC").fetchall()
        return [self._paraEntidade(linha) for linha in linhas]

    def salvar(self, conta: Conta) -> None:
        dados = getattr(conta, "dadosPerfilAgricola", None)
        with self._banco.conexao() as con:
            con.execute(
                "UPDATE contas SET nome = ?, ativo = ?, dados_perfil_agricola = ? WHERE id = ?",
                (conta.nome, int(conta.ativo), dados, conta.id),
            )

    def atualizarSenha(self, id: int, senhaHash: str) -> None:
        with self._banco.conexao() as con:
            con.execute("UPDATE contas SET senha_hash = ? WHERE id = ?", (senhaHash, id))

    def excluir(self, id: int) -> None:
        with self._banco.conexao() as con:
            con.execute("DELETE FROM contas WHERE id = ?", (id,))

    def contar(self) -> int:
        with self._banco.conexao() as con:
            return int(con.execute("SELECT COUNT(*) FROM contas").fetchone()[0])
```

### backend/infraestrutura/RepositorioSessaoSQLite.py

```python
"""Repositório de sessões de login em SQLite (o token é guardado apenas como hash SHA-256)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from backend.infraestrutura.BancoSQLite import BancoSQLite
from backend.negocio.interfaces import IRepositorioSessao, Sessao


class RepositorioSessaoSQLite(IRepositorioSessao):
    def __init__(self, banco: BancoSQLite) -> None:
        self._banco = banco

    def criar(self, sessao: Sessao) -> None:
        with self._banco.conexao() as con:
            con.execute(
                "INSERT INTO sessoes (token_hash, conta_id, criada_em, expira_em) VALUES (?, ?, ?, ?)",
                (sessao.tokenHash, sessao.contaId, sessao.criadaEm.isoformat(), sessao.expiraEm.isoformat()),
            )

    def buscar(self, tokenHash: str) -> Optional[Sessao]:
        with self._banco.conexao() as con:
            linha = con.execute(
                "SELECT token_hash, conta_id, criada_em, expira_em FROM sessoes WHERE token_hash = ?", (tokenHash,)
            ).fetchone()
        if linha is None:
            return None
        return Sessao(
            linha["token_hash"], linha["conta_id"],
            datetime.fromisoformat(linha["criada_em"]), datetime.fromisoformat(linha["expira_em"]),
        )

    def remover(self, tokenHash: str) -> None:
        with self._banco.conexao() as con:
            con.execute("DELETE FROM sessoes WHERE token_hash = ?", (tokenHash,))

    def removerDaConta(self, contaId: int, exceto: Optional[str] = None) -> None:
        with self._banco.conexao() as con:
            con.execute("DELETE FROM sessoes WHERE conta_id = ? AND token_hash IS NOT ?", (contaId, exceto))

    def removerExpiradas(self, agora: datetime) -> None:
        with self._banco.conexao() as con:
            con.execute("DELETE FROM sessoes WHERE expira_em <= ?", (agora.isoformat(),))
```

### backend/infraestrutura/RepositorioDiagnosticoMemoria.py

```python
"""Repositório de diagnósticos EM MEMÓRIA (mock). Os dados somem ao reiniciar o servidor."""
from __future__ import annotations

import itertools
import threading
from typing import Optional

from backend.dominio import Diagnostico
from backend.negocio.interfaces import IRepositorioDiagnostico


class RepositorioDiagnosticoMemoria(IRepositorioDiagnostico):
    def __init__(self) -> None:
        self._diagnosticos: dict[int, Diagnostico] = {}
        self._dimensoes: dict[int, tuple[int, int]] = {}
        self._idsDiagnostico = itertools.count(1)
        self._idsDeteccao = itertools.count(1)
        self._trava = threading.Lock()

    def gerarIdDiagnostico(self) -> int:
        with self._trava:
            return next(self._idsDiagnostico)

    def gerarIdDeteccao(self) -> int:
        with self._trava:
            return next(self._idsDeteccao)

    def salvar(self, diagnostico: Diagnostico, largura: int, altura: int) -> None:
        with self._trava:
            self._diagnosticos[diagnostico.id] = diagnostico
            self._dimensoes[diagnostico.id] = (largura, altura)

    def buscarPorId(self, id: int) -> Optional[Diagnostico]:
        with self._trava:
            return self._diagnosticos.get(id)

    def listarPorUsuario(self, usuarioId: int) -> list[Diagnostico]:
        with self._trava:
            return [d for d in self._diagnosticos.values() if d.usuario is not None and d.usuario.id == usuarioId]

    def listarTodos(self) -> list[Diagnostico]:
        with self._trava:
            return list(self._diagnosticos.values())

    def dimensoes(self, id: int) -> tuple[int, int]:
        with self._trava:
            return self._dimensoes.get(id, (640, 640))
```

### backend/infraestrutura/RepositorioPragaMemoria.py

```python
"""Repositório de pragas EM MEMÓRIA (mock). Somente as contas usam SQLite."""
from __future__ import annotations

import threading
from typing import Optional

from backend.dominio import Praga
from backend.negocio.interfaces import IRepositorioPraga


class RepositorioPragaMemoria(IRepositorioPraga):
    def __init__(self) -> None:
        self._pragas: dict[int, Praga] = {}
        self._proximoId: int = 1
        self._trava = threading.Lock()

    def listar(self) -> list[Praga]:
        with self._trava:
            return sorted(self._pragas.values(), key=lambda p: p.id)

    def buscarPorId(self, id: int) -> Optional[Praga]:
        with self._trava:
            return self._pragas.get(id)

    def inserir(
        self,
        nomeCientifico: str,
        nomePopular: str,
        descricao: str,
        sintomas: str,
        recomendacoesManejo: str,
        defensivosIndicados: str,
        classeModelo: str,
    ) -> Praga:
        with self._trava:
            praga = Praga(
                self._proximoId, nomeCientifico, nomePopular, descricao,
                sintomas, recomendacoesManejo, defensivosIndicados, classeModelo,
            )
            self._pragas[praga.id] = praga
            self._proximoId += 1
            return praga

    def salvar(self, praga: Praga) -> None:
        with self._trava:
            self._pragas[praga.id] = praga

    def excluir(self, id: int) -> None:
        with self._trava:
            self._pragas.pop(id, None)
```

### backend/infraestrutura/semente.py

```python
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
```

### backend/dominio.py

```python
"""Ponte de importação para as entidades de domínio do Bioscan.

Os arquivos em ``backend/entidades/`` são IMUTÁVEIS (regra inviolável do projeto)
e usam imports "simplificados" como::

    import Conta
    class Usuario(Conta): ...          # espera que ``Conta`` seja a CLASSE

    import enums
    return enums.PRODUTOR              # espera acesso direto ao membro do Enum

Para que essas entidades funcionem sem alterar uma única linha delas, este módulo
carrega cada arquivo diretamente pelo caminho e, *somente durante o carregamento*,
registra em ``sys.modules`` objetos com os nomes curtos esperados:

* ``enums``  -> um namespace com os Enums e atalhos (PRODUTOR, ADMIN, CONCLUIDO, EXCLUIDO);
* ``Conta``, ``Usuario``, ``Praga``, ``Deteccao`` -> as próprias classes.

Após o carregamento, os nomes curtos são removidos de ``sys.modules`` (cada entidade
mantém a referência que recebeu no seu escopo global). Nenhum arquivo é criado na
pasta ``entidades`` (a geração de ``__pycache__`` é desativada durante a carga).

Todas as camadas devem importar as entidades daqui::

    from backend.dominio import Usuario, Administrador, PerfilUsuario
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any

_PASTA_ENTIDADES: Path = Path(__file__).resolve().parent / "entidades"
_PREFIXO: str = "bioscan_entidades"
_NOMES_CURTOS: tuple[str, ...] = ("enums", "Conta", "Usuario", "Administrador", "Praga", "Deteccao", "Diagnostico")


def _carregarArquivo(nome: str) -> ModuleType:
    caminho = _PASTA_ENTIDADES / f"{nome}.py"
    spec = importlib.util.spec_from_file_location(f"{_PREFIXO}.{nome}", caminho)
    if spec is None or spec.loader is None:
        raise ImportError(f"Não foi possível carregar a entidade {caminho}")
    modulo = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = modulo
    spec.loader.exec_module(modulo)
    return modulo


def _carregarEntidades() -> dict[str, Any]:
    anteriores = {nome: sys.modules.get(nome) for nome in _NOMES_CURTOS}
    escreviaBytecode = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        modEnums = _carregarArquivo("enums")
        perfil, status = modEnums.PerfilUsuario, modEnums.StatusDiagnostico
        sys.modules["enums"] = SimpleNamespace(  # type: ignore[assignment]
            PerfilUsuario=perfil,
            StatusDiagnostico=status,
            PRODUTOR=perfil.PRODUTOR,
            ADMIN=perfil.ADMIN,
            CONCLUIDO=status.CONCLUIDO,
            EXCLUIDO=status.EXCLUIDO,
        )

        classes: dict[str, Any] = {"PerfilUsuario": perfil, "StatusDiagnostico": status}
        for nome in ("Conta", "Usuario", "Administrador", "Praga", "Deteccao", "Diagnostico"):
            classe = getattr(_carregarArquivo(nome), nome)
            sys.modules[nome] = classe  # type: ignore[assignment]
            classes[nome] = classe
        return classes
    finally:
        sys.dont_write_bytecode = escreviaBytecode
        for nome, anterior in anteriores.items():
            if anterior is None:
                sys.modules.pop(nome, None)
            else:
                sys.modules[nome] = anterior


_entidades = _carregarEntidades()

PerfilUsuario = _entidades["PerfilUsuario"]
StatusDiagnostico = _entidades["StatusDiagnostico"]
Conta = _entidades["Conta"]
Usuario = _entidades["Usuario"]
Administrador = _entidades["Administrador"]
Praga = _entidades["Praga"]
Deteccao = _entidades["Deteccao"]
Diagnostico = _entidades["Diagnostico"]

__all__ = [
    "PerfilUsuario",
    "StatusDiagnostico",
    "Conta",
    "Usuario",
    "Administrador",
    "Praga",
    "Deteccao",
    "Diagnostico",
]
```

### backend/entidades/enums.py

```python
from enum import Enum #trava a escolha entre "PRODUTOR" e "ADMIN"

class PerfilUsuario(Enum):
    PRODUTOR = "PRODUTOR"
    ADMIN = "ADMIN"

class StatusDiagnostico(Enum):
    CONCLUIDO = "CONCLUIDO"
    EXCLUIDO = "EXCLUIDO"
```

### backend/entidades/Conta.py

```python
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
```

### backend/entidades/Usuario.py

```python
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
```

### backend/entidades/Administrador.py

```python
import Conta
import enums

class Administrador(Conta):
    #usa o construtor da classe pai

    #Metodos
    def obterPerfil(self) -> enums:
        return enums.ADMIN
```

### backend/entidades/Praga.py

```python
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
```

### backend/entidades/Deteccao.py

```python
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
```

### backend/entidades/Diagnostico.py

```python
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
```

## 4. Backend (Servidor, Middlewares e Rotas)

- **Servidor HTTP:** `http.server.ThreadingHTTPServer` (`backend/apresentacao/servidor.py`), multi-thread com `daemon_threads = True`, inicializado por `main.py` (padrão `127.0.0.1:8000`).
- **CORS:** não há cabeçalhos CORS configurados, pois a API (`/api/*`) e o frontend estático (`frontend/`) são servidos pela mesma origem no mesmo processo HTTP.
- **Limites de payload:** `TAMANHO_MAXIMO_CORPO = 12 * 1024 * 1024` (12 MB) em `backend/apresentacao/servidor.py` (retorna HTTP `413` quando excedido).
- **Arquivos estáticos e CSP:** pasta `frontend/` servida na raiz `/` via `_servirEstatico` (fallback para `index.html`), com cabeçalhos `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY` e `Content-Security-Policy` permitindo `img-src 'self' data: blob:`.
- **Upload de imagens:** não utiliza `multipart/form-data` nem middlewares como `multer`/`UploadFile`. O endpoint `POST /api/diagnosticos` recebe um objeto JSON contendo `imagem` (Data URL base64 `data:image/jpeg;base64,...`, `image/png`, `image/webp` ou `mock://folha/...`), `largura` e `altura`.
- **Autenticação:** middleware implícito em `_tratarApi` lê `Authorization: Bearer <token>` e resolve a conta via `ServicoAutenticacao.contaDaSessao` para todas as rotas com `autenticada=True`.

### main.py

```python
"""Ponto de entrada do Bioscan.

Monta as dependências (injeção manual) respeitando a arquitetura em camadas:
infraestrutura -> negócio -> apresentação, e sobe o servidor HTTP.

Uso:
    python main.py                       # http://localhost:8000
    python main.py --porta 9000
    python main.py --resetar-banco       # recria o banco com os funcionários de teste
"""
from __future__ import annotations

import argparse
from pathlib import Path

from backend.apresentacao.ApiBioscan import ApiBioscan
from backend.apresentacao.servidor import iniciarServidor
from backend.infraestrutura import semente
from backend.infraestrutura.BancoSQLite import BancoSQLite
from backend.infraestrutura.GeradorHashPBKDF2 import GeradorHashPBKDF2
from backend.infraestrutura.ModeloYoloMock import ModeloYoloMock
from backend.infraestrutura.RepositorioContaSQLite import RepositorioContaSQLite
from backend.infraestrutura.RepositorioDiagnosticoMemoria import RepositorioDiagnosticoMemoria
from backend.infraestrutura.RepositorioPragaMemoria import RepositorioPragaMemoria
from backend.infraestrutura.RepositorioSessaoSQLite import RepositorioSessaoSQLite
from backend.negocio.ServicoAutenticacao import ServicoAutenticacao
from backend.negocio.ServicoDiagnostico import ServicoDiagnostico
from backend.negocio.ServicoPraga import ServicoPraga
from backend.negocio.ServicoUsuario import ServicoUsuario

RAIZ: Path = Path(__file__).resolve().parent
CAMINHO_BANCO: Path = RAIZ / "dados" / "bioscan.db"
PASTA_FRONTEND: Path = RAIZ / "frontend"


def montarAplicacao(caminhoBanco: Path = CAMINHO_BANCO) -> ApiBioscan:
    # Infraestrutura
    banco = BancoSQLite(caminhoBanco)
    repositorioConta = RepositorioContaSQLite(banco)
    repositorioSessao = RepositorioSessaoSQLite(banco)
    repositorioPraga = RepositorioPragaMemoria()
    repositorioDiagnostico = RepositorioDiagnosticoMemoria()
    geradorHash = GeradorHashPBKDF2()
    modelo = ModeloYoloMock()

    # Negócio
    servicoAutenticacao = ServicoAutenticacao(repositorioConta, repositorioSessao, geradorHash)
    servicoUsuario = ServicoUsuario(repositorioConta, repositorioSessao, geradorHash)
    servicoPraga = ServicoPraga(repositorioPraga)
    servicoDiagnostico = ServicoDiagnostico(modelo, repositorioDiagnostico, repositorioPraga)

    # Dados de teste
    if semente.popularContas(repositorioConta, geradorHash):
        print("  Funcionários de teste criados no banco SQLite.")
    semente.popularPragas(repositorioPraga)
    semente.popularDiagnosticos(servicoDiagnostico, repositorioConta)

    # Apresentação
    return ApiBioscan(servicoAutenticacao, servicoUsuario, servicoDiagnostico, servicoPraga)


def main() -> None:
    parser = argparse.ArgumentParser(description="Servidor do Bioscan")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--porta", type=int, default=8000)
    parser.add_argument("--resetar-banco", action="store_true", help="apaga o banco SQLite e recria os funcionários de teste")
    args = parser.parse_args()

    if args.resetar_banco:
        for sufixo in ("", "-wal", "-shm"):
            Path(f"{CAMINHO_BANCO}{sufixo}").unlink(missing_ok=True)
        print("  Banco de dados removido.")

    api = montarAplicacao()
    iniciarServidor(api, PASTA_FRONTEND, args.host, args.porta)


if __name__ == "__main__":
    main()
```

### backend/apresentacao/servidor.py

```python
"""Servidor HTTP (biblioteca padrão) que expõe a API em /api e entrega o frontend estático."""
from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Optional
from urllib.parse import parse_qsl, urlsplit

from backend.apresentacao.ApiBioscan import ApiBioscan
from backend.apresentacao.Roteador import Requisicao, Resposta
from backend.negocio.excecoes import (
    AcessoNegado,
    Conflito,
    ContaBloqueada,
    CredenciaisInvalidas,
    DadosInvalidos,
    ErroNegocio,
    NaoAutenticado,
    NaoEncontrado,
)

TAMANHO_MAXIMO_CORPO: int = 12 * 1024 * 1024  # 12 MB (imagens em base64)

STATUS_POR_ERRO: dict[type[ErroNegocio], int] = {
    DadosInvalidos: 400,
    CredenciaisInvalidas: 401,
    NaoAutenticado: 401,
    ContaBloqueada: 403,
    AcessoNegado: 403,
    NaoEncontrado: 404,
    Conflito: 409,
}

POLITICA_SEGURANCA: str = (
    "default-src 'self'; img-src 'self' data: blob:; script-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("image/svg+xml", ".svg")


def criarManipulador(api: ApiBioscan, pastaFrontend: Path) -> type[BaseHTTPRequestHandler]:
    raizFrontend = pastaFrontend.resolve()

    class ManipuladorBioscan(BaseHTTPRequestHandler):
        server_version = "Bioscan/1.0"
        sys_version = ""

        # -------------------------------------------------------------- utilidades
        def _cabecalhosSeguranca(self) -> None:
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "same-origin")
            self.send_header("X-Frame-Options", "DENY")

        def _enviarJson(self, status: int, corpo: Any = None) -> None:
            dados = b"" if corpo is None or status == 204 else json.dumps(corpo, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self._cabecalhosSeguranca()
            self.send_header("Cache-Control", "no-store")
            if dados:
                self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            if dados:
                self.wfile.write(dados)

        def _token(self) -> Optional[str]:
            cabecalho = self.headers.get("Authorization", "")
            if cabecalho.lower().startswith("bearer "):
                return cabecalho[7:].strip() or None
            return None

        def _lerCorpo(self) -> dict[str, Any]:
            tamanho = int(self.headers.get("Content-Length") or 0)
            if tamanho <= 0:
                return {}
            if tamanho > TAMANHO_MAXIMO_CORPO:
                raise _CorpoGrande()
            bruto = self.rfile.read(tamanho)
            try:
                dados = json.loads(bruto.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as erro:
                raise DadosInvalidos("Corpo da requisição não é um JSON válido.") from erro
            if not isinstance(dados, dict):
                raise DadosInvalidos("O corpo da requisição deve ser um objeto JSON.")
            return dados

        # -------------------------------------------------------------- API
        def _tratarApi(self, metodo: str) -> None:
            url = urlsplit(self.path)
            rota, parametros, caminhoExiste = api.roteador.resolver(metodo, url.path.rstrip("/") or "/")
            if rota is None:
                if caminhoExiste:
                    self._enviarJson(405, {"erro": "Método não permitido."})
                else:
                    self._enviarJson(404, {"erro": "Endpoint não encontrado."})
                return
            try:
                req = Requisicao(
                    metodo=metodo,
                    caminho=url.path,
                    parametros=parametros,
                    query=dict(parse_qsl(url.query)),
                    corpo=self._lerCorpo() if metodo in ("POST", "PUT", "PATCH") else {},
                    token=self._token(),
                )
                if rota.autenticada:
                    req.conta = api.autenticacao.contaDaSessao(req.token)
                resposta: Resposta = rota.manipulador(req)
                self._enviarJson(resposta.status, resposta.corpo)
            except _CorpoGrande:
                self._enviarJson(413, {"erro": "Arquivo muito grande. Envie uma imagem menor."})
            except ErroNegocio as erro:
                status = next((st for tipo, st in STATUS_POR_ERRO.items() if isinstance(erro, tipo)), 400)
                self._enviarJson(status, {"erro": erro.mensagem})
            except Exception:  # noqa: BLE001 - nunca vazar detalhes internos ao cliente
                self.log_error("Erro inesperado em %s %s", metodo, url.path)
                import traceback

                traceback.print_exc()
                self._enviarJson(500, {"erro": "Erro interno no servidor."})

        # -------------------------------------------------------------- arquivos estáticos
        def _servirEstatico(self, somenteCabecalho: bool = False) -> None:
            caminho = urlsplit(self.path).path
            relativo = caminho.lstrip("/") or "index.html"
            alvo = (raizFrontend / relativo).resolve()
            if not alvo.is_relative_to(raizFrontend) or not alvo.is_file():
                self.send_error(HTTPStatus.NOT_FOUND, "Arquivo não encontrado")
                return
            conteudo = alvo.read_bytes()
            tipo = mimetypes.guess_type(alvo.name)[0] or "application/octet-stream"
            if tipo.startswith("text/") or tipo in ("application/json", "image/svg+xml"):
                tipo += "; charset=utf-8"
            self.send_response(200)
            self._cabecalhosSeguranca()
            self.send_header("Content-Security-Policy", POLITICA_SEGURANCA)
            self.send_header("Content-Type", tipo)
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Content-Length", str(len(conteudo)))
            self.end_headers()
            if not somenteCabecalho:
                self.wfile.write(conteudo)

        # -------------------------------------------------------------- verbos
        def _despachar(self, metodo: str) -> None:
            if urlsplit(self.path).path.startswith("/api/"):
                self._tratarApi(metodo)
            elif metodo in ("GET", "HEAD"):
                self._servirEstatico(somenteCabecalho=metodo == "HEAD")
            else:
                self.send_error(HTTPStatus.METHOD_NOT_ALLOWED)

        def do_GET(self) -> None:  # noqa: N802
            self._despachar("GET")

        def do_HEAD(self) -> None:  # noqa: N802
            self._despachar("HEAD")

        def do_POST(self) -> None:  # noqa: N802
            self._despachar("POST")

        def do_PUT(self) -> None:  # noqa: N802
            self._despachar("PUT")

        def do_PATCH(self) -> None:  # noqa: N802
            self._despachar("PATCH")

        def do_DELETE(self) -> None:  # noqa: N802
            self._despachar("DELETE")

        def log_message(self, formato: str, *args: Any) -> None:
            print(f"[{self.log_date_time_string()}] {self.command} {self.path.split('?')[0]} -> {formato % args}")

    return ManipuladorBioscan


class _CorpoGrande(Exception):
    pass


def iniciarServidor(api: ApiBioscan, pastaFrontend: Path, host: str, porta: int) -> None:
    servidor = ThreadingHTTPServer((host, porta), criarManipulador(api, pastaFrontend))
    servidor.daemon_threads = True
    print(f"\n  Bioscan rodando em http://{'localhost' if host in ('0.0.0.0', '127.0.0.1') else host}:{porta}\n  (Ctrl+C para encerrar)\n")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando o servidor...")
    finally:
        servidor.server_close()
```

### backend/apresentacao/Roteador.py

```python
"""Roteador HTTP mínimo baseado em expressões regulares."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from backend.dominio import Conta


@dataclass
class Requisicao:
    metodo: str
    caminho: str
    parametros: dict[str, str] = field(default_factory=dict)
    query: dict[str, str] = field(default_factory=dict)
    corpo: dict[str, Any] = field(default_factory=dict)
    token: Optional[str] = None
    conta: Optional[Conta] = None

    def inteiro(self, nome: str) -> int:
        return int(self.parametros[nome])


@dataclass
class Resposta:
    status: int = 200
    corpo: Any = None


Manipulador = Callable[[Requisicao], Resposta]


@dataclass(frozen=True)
class Rota:
    metodo: str
    padrao: re.Pattern[str]
    manipulador: Manipulador
    autenticada: bool


class Roteador:
    def __init__(self) -> None:
        self._rotas: list[Rota] = []

    def adicionar(self, metodo: str, caminho: str, manipulador: Manipulador, autenticada: bool = True) -> None:
        """``caminho`` aceita parâmetros inteiros no formato ``{nome}``."""
        regex = "^" + re.sub(r"\{(\w+)\}", r"(?P<\1>\\d+)", caminho) + "$"
        self._rotas.append(Rota(metodo.upper(), re.compile(regex), manipulador, autenticada))

    def resolver(self, metodo: str, caminho: str) -> tuple[Optional[Rota], dict[str, str], bool]:
        """Retorna (rota, parâmetros, caminhoExiste)."""
        caminhoExiste = False
        for rota in self._rotas:
            achado = rota.padrao.match(caminho)
            if achado is None:
                continue
            caminhoExiste = True
            if rota.metodo == metodo.upper():
                return rota, achado.groupdict(), True
        return None, {}, caminhoExiste
```

### backend/apresentacao/ApiBioscan.py

```python
"""Endpoints REST do Bioscan. Cada método traduz HTTP <-> casos de uso da camada de negócio."""
from __future__ import annotations

from backend.apresentacao import serializadores as s
from backend.apresentacao.Roteador import Requisicao, Resposta, Roteador
from backend.dominio import Conta
from backend.negocio.ServicoAutenticacao import ServicoAutenticacao
from backend.negocio.ServicoDiagnostico import ServicoDiagnostico
from backend.negocio.ServicoPraga import ServicoPraga
from backend.negocio.ServicoUsuario import ServicoUsuario
from backend.negocio.validacoes import ehProdutor


class ApiBioscan:
    def __init__(
        self,
        autenticacao: ServicoAutenticacao,
        usuarios: ServicoUsuario,
        diagnosticos: ServicoDiagnostico,
        pragas: ServicoPraga,
    ) -> None:
        self.autenticacao = autenticacao
        self._usuarios = usuarios
        self._diagnosticos = diagnosticos
        self._pragas = pragas
        self.roteador = Roteador()
        self._registrarRotas()

    def _registrarRotas(self) -> None:
        r = self.roteador
        # Autenticação
        r.adicionar("POST", "/api/auth/login", self.login, autenticada=False)
        r.adicionar("POST", "/api/auth/cadastro", self.cadastro, autenticada=False)
        r.adicionar("POST", "/api/auth/logout", self.logout, autenticada=False)
        r.adicionar("GET", "/api/auth/eu", self.eu)
        # Perfil próprio
        r.adicionar("PUT", "/api/perfil", self.atualizarPerfil)
        r.adicionar("PUT", "/api/perfil/senha", self.alterarSenha)
        # Pragas
        r.adicionar("GET", "/api/pragas", self.listarPragas)
        r.adicionar("POST", "/api/pragas", self.criarPraga)
        r.adicionar("GET", "/api/pragas/{id}", self.obterPraga)
        r.adicionar("PUT", "/api/pragas/{id}", self.atualizarPraga)
        r.adicionar("DELETE", "/api/pragas/{id}", self.excluirPraga)
        # Diagnósticos
        r.adicionar("GET", "/api/diagnosticos", self.listarDiagnosticos)
        r.adicionar("POST", "/api/diagnosticos", self.criarDiagnostico)
        r.adicionar("GET", "/api/diagnosticos/{id}", self.obterDiagnostico)
        r.adicionar("DELETE", "/api/diagnosticos/{id}", self.excluirDiagnostico)
        # Administração
        r.adicionar("GET", "/api/admin/estatisticas", self.estatisticas)
        r.adicionar("GET", "/api/admin/usuarios", self.listarUsuarios)
        r.adicionar("POST", "/api/admin/usuarios", self.criarUsuario)
        r.adicionar("PUT", "/api/admin/usuarios/{id}", self.editarUsuario)
        r.adicionar("PATCH", "/api/admin/usuarios/{id}/status", self.alterarStatusUsuario)
        r.adicionar("DELETE", "/api/admin/usuarios/{id}", self.excluirUsuario)

    # ------------------------------------------------------------------ auxiliares
    def _conta(self, req: Requisicao) -> Conta:
        assert req.conta is not None
        return req.conta

    def _contaDetalhada(self, conta: Conta) -> dict:
        dados = s.conta(conta)
        dados["totalAnalises"] = self._diagnosticos.contarAnalises(conta) if ehProdutor(conta) else None
        return dados

    def _diag(self, d) -> dict:  # type: ignore[no-untyped-def]
        largura, altura = self._diagnosticos.dimensoes(d)
        return s.diagnostico(d, largura, altura)

    # ------------------------------------------------------------------ autenticação
    def login(self, req: Requisicao) -> Resposta:
        c = req.corpo
        token, conta = self.autenticacao.autenticar(c.get("email", ""), c.get("senha", ""), bool(c.get("lembrar")))
        return Resposta(200, {"token": token, "conta": self._contaDetalhada(conta)})

    def cadastro(self, req: Requisicao) -> Resposta:
        c = req.corpo
        conta = self._usuarios.cadastrarProdutor(c.get("nome"), c.get("email"), c.get("senha"), c.get("perfilAgricola"))
        token = self.autenticacao.criarSessao(conta, lembrar=False)
        return Resposta(201, {"token": token, "conta": self._contaDetalhada(conta)})

    def logout(self, req: Requisicao) -> Resposta:
        self.autenticacao.encerrarSessao(req.token)
        return Resposta(204)

    def eu(self, req: Requisicao) -> Resposta:
        return Resposta(200, {"conta": self._contaDetalhada(self._conta(req))})

    # ------------------------------------------------------------------ perfil
    def atualizarPerfil(self, req: Requisicao) -> Resposta:
        conta = self._usuarios.atualizarMeusDados(self._conta(req), req.corpo.get("nome"), req.corpo.get("perfilAgricola"))
        return Resposta(200, {"conta": self._contaDetalhada(conta)})

    def alterarSenha(self, req: Requisicao) -> Resposta:
        tokenHash = self.autenticacao.hashDoToken(req.token) if req.token else None
        self._usuarios.alterarSenha(self._conta(req), req.corpo.get("senhaAtual"), req.corpo.get("novaSenha"), tokenHash)
        return Resposta(204)

    # ------------------------------------------------------------------ pragas
    def listarPragas(self, req: Requisicao) -> Resposta:
        return Resposta(200, {"pragas": [s.praga(p) for p in self._pragas.listar()]})

    def obterPraga(self, req: Requisicao) -> Resposta:
        return Resposta(200, {"praga": s.praga(self._pragas.obter(req.inteiro("id")))})

    def criarPraga(self, req: Requisicao) -> Resposta:
        return Resposta(201, {"praga": s.praga(self._pragas.criar(self._conta(req), req.corpo))})

    def atualizarPraga(self, req: Requisicao) -> Resposta:
        return Resposta(200, {"praga": s.praga(self._pragas.atualizar(self._conta(req), req.inteiro("id"), req.corpo))})

    def excluirPraga(self, req: Requisicao) -> Resposta:
        self._pragas.excluir(self._conta(req), req.inteiro("id"))
        return Resposta(204)

    # ------------------------------------------------------------------ diagnósticos
    def listarDiagnosticos(self, req: Requisicao) -> Resposta:
        return Resposta(200, {"diagnosticos": [self._diag(d) for d in self._diagnosticos.listarHistorico(self._conta(req))]})

    def criarDiagnostico(self, req: Requisicao) -> Resposta:
        c = req.corpo
        d = self._diagnosticos.realizarDiagnostico(self._conta(req), c.get("imagem"), c.get("largura"), c.get("altura"))
        return Resposta(201, {"diagnostico": self._diag(d)})

    def obterDiagnostico(self, req: Requisicao) -> Resposta:
        return Resposta(200, {"diagnostico": self._diag(self._diagnosticos.obterDiagnostico(self._conta(req), req.inteiro("id")))})

    def excluirDiagnostico(self, req: Requisicao) -> Resposta:
        self._diagnosticos.excluirDiagnostico(self._conta(req), req.inteiro("id"))
        return Resposta(204)

    # ------------------------------------------------------------------ administração
    def estatisticas(self, req: Requisicao) -> Resposta:
        conta = self._conta(req)
        dados = self._diagnosticos.estatisticas(conta)
        contas = self._usuarios.listarContas(conta)
        dados["usuarios"] = {
            "total": len(contas),
            "ativos": sum(1 for c in contas if c.ativo),
            "bloqueados": sum(1 for c in contas if not c.ativo),
            "produtores": sum(1 for c in contas if ehProdutor(c)),
            "administradores": sum(1 for c in contas if not ehProdutor(c)),
        }
        return Resposta(200, dados)

    def listarUsuarios(self, req: Requisicao) -> Resposta:
        contas = self._usuarios.listarContas(self._conta(req))
        return Resposta(200, {"usuarios": [self._contaDetalhada(c) for c in contas]})

    def criarUsuario(self, req: Requisicao) -> Resposta:
        c = req.corpo
        conta = self._usuarios.criarConta(self._conta(req), c.get("nome"), c.get("email"), c.get("senha"), c.get("perfil"), c.get("perfilAgricola"))
        return Resposta(201, {"usuario": self._contaDetalhada(conta)})

    def editarUsuario(self, req: Requisicao) -> Resposta:
        conta = self._usuarios.editarConta(self._conta(req), req.inteiro("id"), req.corpo.get("nome"), req.corpo.get("perfilAgricola"))
        return Resposta(200, {"usuario": self._contaDetalhada(conta)})

    def alterarStatusUsuario(self, req: Requisicao) -> Resposta:
        conta = self._usuarios.alterarStatus(self._conta(req), req.inteiro("id"), bool(req.corpo.get("ativo")))
        return Resposta(200, {"usuario": self._contaDetalhada(conta)})

    def excluirUsuario(self, req: Requisicao) -> Resposta:
        self._usuarios.excluirConta(self._conta(req), req.inteiro("id"))
        return Resposta(204)
```

### backend/apresentacao/serializadores.py

```python
"""Conversão das entidades de domínio para dicionários JSON."""
from __future__ import annotations

from typing import Any, Optional

from backend.dominio import Conta, Deteccao, Diagnostico, Praga
from backend.negocio.validacoes import lerPerfilAgricola


def conta(c: Conta) -> dict[str, Any]:
    return {
        "id": c.id,
        "nome": c.nome,
        "email": c.email,
        "perfil": c.obterPerfil().value,
        "ativo": c.ativo,
        "dataCadastro": c.dataCadastro.isoformat(timespec="seconds"),
        "perfilAgricola": lerPerfilAgricola(c),
    }


def praga(p: Optional[Praga]) -> Optional[dict[str, Any]]:
    if p is None:
        return None
    return {
        "id": p.id,
        "nomeCientifico": p.nomeCientifico,
        "nomePopular": p.nomePopular,
        "descricao": p.descricao,
        "sintomas": p.sintomas,
        "recomendacoesManejo": p.recomendacoesManejo,
        "defensivosIndicados": p.defensivosIndicados,
        "classeModelo": p.classeModelo,
    }


def deteccao(d: Deteccao) -> dict[str, Any]:
    return {
        "id": d.id,
        "nomeClasse": d.nomeClasse,
        "confianca": d.confianca,
        "x1": d.x1, "y1": d.y1, "x2": d.x2, "y2": d.y2,
        "area": d.area(),
        "saudavel": d.ehSaudavel(),
        "pragaId": d.praga.id if d.praga is not None else None,
        "pragaNome": d.praga.nomePopular if d.praga is not None else None,
    }


def nivelAfetacao(grau: float) -> str:
    if grau <= 0:
        return "Saudável"
    if grau < 15:
        return "Leve"
    if grau < 35:
        return "Moderado"
    return "Severo"


def diagnostico(d: Diagnostico, largura: int, altura: int) -> dict[str, Any]:
    return {
        "id": d.id,
        "usuarioId": d.usuario.id,
        "urlImagem": d.urlImagem,
        "largura": largura,
        "altura": altura,
        "dataAnalise": d.dataAnalise.isoformat(timespec="seconds"),
        "status": d.status.value,
        "grauAfetacao": round(d.grauAfetacao, 2),
        "nivel": nivelAfetacao(d.grauAfetacao),
        "pragaPrincipal": praga(d.pragaPrincipal()),
        "deteccoes": [deteccao(x) for x in d.deteccoes],
    }
```

### backend/negocio/interfaces.py

```python
"""Contratos (portas) que a camada de infraestrutura deve implementar.

A camada de negócio depende apenas destas abstrações, nunca de SQLite,
de memória ou do modelo YOLO diretamente.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from backend.dominio import Conta, Diagnostico, PerfilUsuario, Praga


# --------------------------------------------------------------------------- senhas
class IGeradorHash(ABC):
    @abstractmethod
    def gerar(self, senha: str) -> str: ...

    @abstractmethod
    def verificar(self, senha: str, senhaHash: str) -> bool: ...


# --------------------------------------------------------------------------- contas
class IRepositorioConta(ABC):
    @abstractmethod
    def inserir(
        self,
        nome: str,
        email: str,
        senhaHash: str,
        perfil: PerfilUsuario,
        dadosPerfilAgricola: Optional[str] = None,
        ativo: bool = True,
        dataCadastro: Optional[datetime] = None,
    ) -> Conta: ...

    @abstractmethod
    def buscarPorId(self, id: int) -> Optional[Conta]: ...

    @abstractmethod
    def buscarPorEmail(self, email: str) -> Optional[Conta]: ...

    @abstractmethod
    def listar(self) -> list[Conta]: ...

    @abstractmethod
    def salvar(self, conta: Conta) -> None:
        """Persiste nome, status (ativo) e dados do perfil agrícola."""

    @abstractmethod
    def atualizarSenha(self, id: int, senhaHash: str) -> None: ...

    @abstractmethod
    def excluir(self, id: int) -> None: ...


# --------------------------------------------------------------------------- sessões
@dataclass(frozen=True)
class Sessao:
    tokenHash: str
    contaId: int
    criadaEm: datetime
    expiraEm: datetime


class IRepositorioSessao(ABC):
    @abstractmethod
    def criar(self, sessao: Sessao) -> None: ...

    @abstractmethod
    def buscar(self, tokenHash: str) -> Optional[Sessao]: ...

    @abstractmethod
    def remover(self, tokenHash: str) -> None: ...

    @abstractmethod
    def removerDaConta(self, contaId: int, exceto: Optional[str] = None) -> None: ...

    @abstractmethod
    def removerExpiradas(self, agora: datetime) -> None: ...


# --------------------------------------------------------------------------- modelo de visão
@dataclass(frozen=True)
class ResultadoDeteccaoBruto:
    """Saída crua do modelo (YOLO ou mock) para uma bounding box."""

    classe: str
    confianca: float
    x1: float
    y1: float
    x2: float
    y2: float


class IModeloDeteccao(ABC):
    @abstractmethod
    def detectar(self, imagem: str, largura: int, altura: int) -> list[ResultadoDeteccaoBruto]: ...


# --------------------------------------------------------------------------- pragas
class IRepositorioPraga(ABC):
    @abstractmethod
    def listar(self) -> list[Praga]: ...

    @abstractmethod
    def buscarPorId(self, id: int) -> Optional[Praga]: ...

    @abstractmethod
    def inserir(
        self,
        nomeCientifico: str,
        nomePopular: str,
        descricao: str,
        sintomas: str,
        recomendacoesManejo: str,
        defensivosIndicados: str,
        classeModelo: str,
    ) -> Praga: ...

    @abstractmethod
    def salvar(self, praga: Praga) -> None: ...

    @abstractmethod
    def excluir(self, id: int) -> None: ...


# --------------------------------------------------------------------------- diagnósticos
class IRepositorioDiagnostico(ABC):
    @abstractmethod
    def gerarIdDiagnostico(self) -> int: ...

    @abstractmethod
    def gerarIdDeteccao(self) -> int: ...

    @abstractmethod
    def salvar(self, diagnostico: Diagnostico, largura: int, altura: int) -> None: ...

    @abstractmethod
    def buscarPorId(self, id: int) -> Optional[Diagnostico]: ...

    @abstractmethod
    def listarPorUsuario(self, usuarioId: int) -> list[Diagnostico]: ...

    @abstractmethod
    def listarTodos(self) -> list[Diagnostico]: ...

    @abstractmethod
    def dimensoes(self, id: int) -> tuple[int, int]: ...
```

### backend/negocio/excecoes.py

```python
"""Exceções de negócio. A camada de apresentação traduz cada uma para um status HTTP."""
from __future__ import annotations


class ErroNegocio(Exception):
    """Base para todos os erros de regra de negócio."""

    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem)
        self.mensagem: str = mensagem


class DadosInvalidos(ErroNegocio):
    """Dados de entrada ausentes ou em formato inválido."""


class CredenciaisInvalidas(ErroNegocio):
    """E-mail ou senha incorretos."""


class ContaBloqueada(ErroNegocio):
    """A conta existe, mas ``podeAutenticar()`` retornou False."""


class NaoAutenticado(ErroNegocio):
    """Sessão ausente, expirada ou inválida."""


class AcessoNegado(ErroNegocio):
    """O perfil da conta não permite a operação."""


class NaoEncontrado(ErroNegocio):
    """Recurso inexistente (ou que não pertence ao solicitante)."""


class Conflito(ErroNegocio):
    """Violação de unicidade (ex.: e-mail já cadastrado)."""
```

### backend/negocio/validacoes.py

```python
"""Validações e normalizações de entrada reutilizadas pelos serviços."""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from backend.dominio import Conta, PerfilUsuario
from backend.negocio.excecoes import AcessoNegado, DadosInvalidos

_REGEX_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

TAMANHO_MINIMO_SENHA: int = 6
CAMPOS_PERFIL_AGRICOLA: tuple[str, ...] = ("telefone", "propriedade", "regiao", "cultura", "area")


def normalizarEmail(email: Any) -> str:
    return str(email or "").strip().lower()


def validarEmail(email: Any) -> str:
    valor = normalizarEmail(email)
    if not valor or len(valor) > 160 or not _REGEX_EMAIL.match(valor):
        raise DadosInvalidos("Informe um e-mail válido.")
    return valor


def validarNome(nome: Any) -> str:
    valor = " ".join(str(nome or "").split())
    if len(valor) < 3:
        raise DadosInvalidos("O nome deve ter pelo menos 3 caracteres.")
    if len(valor) > 120:
        raise DadosInvalidos("O nome deve ter no máximo 120 caracteres.")
    return valor


def validarSenha(senha: Any) -> str:
    valor = str(senha or "")
    if len(valor) < TAMANHO_MINIMO_SENHA:
        raise DadosInvalidos(f"A senha deve ter pelo menos {TAMANHO_MINIMO_SENHA} caracteres.")
    if len(valor) > 128:
        raise DadosInvalidos("A senha deve ter no máximo 128 caracteres.")
    return valor


def textoObrigatorio(valor: Any, campo: str, maximo: int = 2000) -> str:
    texto = str(valor or "").strip()
    if not texto:
        raise DadosInvalidos(f"O campo '{campo}' é obrigatório.")
    if len(texto) > maximo:
        raise DadosInvalidos(f"O campo '{campo}' deve ter no máximo {maximo} caracteres.")
    return texto


def limparPerfilAgricola(dados: Any) -> dict[str, str]:
    """Mantém apenas os campos conhecidos do perfil agrícola, como texto."""
    if not isinstance(dados, dict):
        return {}
    return {campo: str(dados.get(campo) or "").strip()[:120] for campo in CAMPOS_PERFIL_AGRICOLA}


def serializarPerfilAgricola(dados: dict[str, str]) -> str:
    return json.dumps(dados, ensure_ascii=False)


def lerPerfilAgricola(conta: Conta) -> Optional[dict[str, str]]:
    """Interpreta ``Usuario.dadosPerfilAgricola`` (texto JSON). Administradores retornam None."""
    if not ehProdutor(conta):
        return None
    bruto = getattr(conta, "dadosPerfilAgricola", "") or ""
    try:
        dados = json.loads(bruto)
    except (TypeError, ValueError):
        return {campo: "" for campo in CAMPOS_PERFIL_AGRICOLA} | {"propriedade": str(bruto)[:120]}
    return limparPerfilAgricola(dados)


def ehAdmin(conta: Conta) -> bool:
    return conta.obterPerfil() == PerfilUsuario.ADMIN


def ehProdutor(conta: Conta) -> bool:
    return conta.obterPerfil() == PerfilUsuario.PRODUTOR


def exigirAdmin(conta: Conta) -> None:
    if not ehAdmin(conta):
        raise AcessoNegado("Apenas administradores podem realizar esta operação.")


def exigirProdutor(conta: Conta) -> None:
    if not ehProdutor(conta):
        raise AcessoNegado("Apenas produtores podem realizar diagnósticos.")
```

### backend/negocio/ServicoDiagnostico.py

```python
"""Caso de uso: realizar diagnóstico, consultar histórico e exclusão lógica.

Segue o fluxo da seção 5 do documento de arquitetura:
modelo -> Deteccao -> cruzamento com Praga.corresponde -> Diagnostico ->
calcularGrauAfetacao -> pragaPrincipal -> persistência.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Optional

from backend.dominio import Conta, Deteccao, Diagnostico, Praga
from backend.negocio.excecoes import DadosInvalidos, NaoEncontrado
from backend.negocio.interfaces import IModeloDeteccao, IRepositorioDiagnostico, IRepositorioPraga
from backend.negocio.validacoes import exigirAdmin, exigirProdutor

LIMIAR_CONFIANCA: float = 0.5
PREFIXOS_IMAGEM_ACEITOS: tuple[str, ...] = ("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,", "mock://folha/")


class ServicoDiagnostico:
    def __init__(self, modelo: IModeloDeteccao, repositorioDiagnostico: IRepositorioDiagnostico, repositorioPraga: IRepositorioPraga) -> None:
        self._modelo = modelo
        self._diagnosticos = repositorioDiagnostico
        self._pragas = repositorioPraga

    # ------------------------------------------------------------------ fluxo principal
    def realizarDiagnostico(
        self, conta: Conta, urlImagem: Any, largura: Any, altura: Any, dataAnalise: Optional[datetime] = None
    ) -> Diagnostico:
        exigirProdutor(conta)
        url = str(urlImagem or "")
        if not url.startswith(PREFIXOS_IMAGEM_ACEITOS):
            raise DadosInvalidos("Envie uma imagem JPG, PNG ou WEBP.")
        try:
            larguraPx, alturaPx = int(largura), int(altura)
        except (TypeError, ValueError) as erro:
            raise DadosInvalidos("Dimensões da imagem inválidas.") from erro
        if not (16 <= larguraPx <= 8000 and 16 <= alturaPx <= 8000):
            raise DadosInvalidos("Dimensões da imagem fora do intervalo permitido.")

        catalogo: list[Praga] = self._pragas.listar()
        diagnostico = Diagnostico(self._diagnosticos.gerarIdDiagnostico(), conta, url, dataAnalise)

        for bruto in self._modelo.detectar(url, larguraPx, alturaPx):
            provisoria = Deteccao(0, bruto.classe, bruto.confianca, bruto.x1, bruto.y1, bruto.x2, bruto.y2)
            if not provisoria.ehConfiavel(LIMIAR_CONFIANCA):
                continue
            praga: Optional[Praga] = None
            if not provisoria.ehSaudavel():
                praga = next((p for p in catalogo if p.corresponde(bruto.classe)), None)
            diagnostico.adicionarDeteccao(
                Deteccao(
                    self._diagnosticos.gerarIdDeteccao(),
                    bruto.classe, bruto.confianca, bruto.x1, bruto.y1, bruto.x2, bruto.y2, praga,
                )
            )

        diagnostico.calcularGrauAfetacao()
        self._diagnosticos.salvar(diagnostico, larguraPx, alturaPx)
        return diagnostico

    # ------------------------------------------------------------------ consultas
    def listarHistorico(self, conta: Conta) -> list[Diagnostico]:
        diagnosticos = [d for d in self._diagnosticos.listarPorUsuario(conta.id) if d.estaAtivo() and d.pertenceA(conta)]
        return sorted(diagnosticos, key=lambda d: d.dataAnalise, reverse=True)

    def obterDiagnostico(self, conta: Conta, id: int) -> Diagnostico:
        diagnostico = self._diagnosticos.buscarPorId(id)
        if diagnostico is None or not diagnostico.pertenceA(conta) or not diagnostico.estaAtivo():
            raise NaoEncontrado("Diagnóstico não encontrado.")
        return diagnostico

    def excluirDiagnostico(self, conta: Conta, id: int) -> None:
        diagnostico = self.obterDiagnostico(conta, id)
        diagnostico.marcarComoExcluido()  # exclusão lógica
        largura, altura = self._diagnosticos.dimensoes(id)
        self._diagnosticos.salvar(diagnostico, largura, altura)

    def dimensoes(self, diagnostico: Diagnostico) -> tuple[int, int]:
        return self._diagnosticos.dimensoes(diagnostico.id)

    # ------------------------------------------------------------------ painel administrativo
    def estatisticas(self, solicitante: Conta) -> dict[str, Any]:
        exigirAdmin(solicitante)
        ativos = [d for d in self._diagnosticos.listarTodos() if d.estaAtivo()]
        principais = Counter(p.nomePopular for p in (d.pragaPrincipal() for d in ativos) if p is not None)
        comPraga = sum(1 for d in ativos if d.pragaPrincipal() is not None)
        grauMedio = sum(d.grauAfetacao for d in ativos) / len(ativos) if ativos else 0.0

        hoje = datetime.now()
        mensal: list[dict[str, Any]] = []
        for atras in range(11, -1, -1):
            ano, mes = hoje.year, hoje.month - atras
            while mes <= 0:
                mes += 12
                ano -= 1
            mensal.append({"ano": ano, "mes": mes, "total": sum(1 for d in ativos if d.dataAnalise.year == ano and d.dataAnalise.month == mes)})

        inicioSemana = (hoje - timedelta(days=hoje.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        semanal: list[dict[str, Any]] = []
        for atras in range(7, -1, -1):
            inicio = inicioSemana - timedelta(weeks=atras)
            fim = inicio + timedelta(weeks=1)
            semanal.append({"inicio": inicio.date().isoformat(), "total": sum(1 for d in ativos if inicio <= d.dataAnalise < fim)})

        return {
            "totalAnalises": len(ativos),
            "analisesComPraga": comPraga,
            "taxaDeteccao": (comPraga / len(ativos) * 100.0) if ativos else 0.0,
            "grauMedio": grauMedio,
            "pragaMaisComum": principais.most_common(1)[0][0] if principais else None,
            "ocorrenciasPorPraga": dict(principais.most_common()),
            "serieMensal": mensal,
            "serieSemanal": semanal,
        }

    def contarAnalises(self, conta: Conta) -> int:
        return len(self.listarHistorico(conta))
```

### backend/negocio/ServicoPraga.py

```python
"""Caso de uso: catálogo de pragas (consulta para todos, CRUD para administradores)."""
from __future__ import annotations

from typing import Any

from backend.dominio import Conta, Praga
from backend.negocio.excecoes import Conflito, NaoEncontrado
from backend.negocio.interfaces import IRepositorioPraga
from backend.negocio.validacoes import exigirAdmin, textoObrigatorio


class ServicoPraga:
    def __init__(self, repositorioPraga: IRepositorioPraga) -> None:
        self._pragas = repositorioPraga

    def listar(self) -> list[Praga]:
        return self._pragas.listar()

    def obter(self, id: int) -> Praga:
        praga = self._pragas.buscarPorId(id)
        if praga is None:
            raise NaoEncontrado("Praga não encontrada.")
        return praga

    @staticmethod
    def _camposDescritivos(dados: dict[str, Any]) -> dict[str, str]:
        return {
            "nomeCientifico": textoObrigatorio(dados.get("nomeCientifico"), "Nome científico", 160),
            "nomePopular": textoObrigatorio(dados.get("nomePopular"), "Nome popular", 120),
            "descricao": textoObrigatorio(dados.get("descricao"), "Descrição"),
            "sintomas": textoObrigatorio(dados.get("sintomas"), "Sintomas"),
            "recomendacoesManejo": textoObrigatorio(dados.get("recomendacoesManejo"), "Recomendações de manejo"),
            "defensivosIndicados": textoObrigatorio(dados.get("defensivosIndicados"), "Defensivos indicados"),
        }

    def criar(self, solicitante: Conta, dados: dict[str, Any]) -> Praga:
        exigirAdmin(solicitante)
        campos = self._camposDescritivos(dados)
        classeModelo = textoObrigatorio(dados.get("classeModelo"), "Classe do modelo", 60)
        if any(p.corresponde(classeModelo) for p in self._pragas.listar()):
            raise Conflito("Já existe uma praga vinculada a esta classe do modelo.")
        if classeModelo.strip().lower() == "healthy":
            raise Conflito("A classe 'healthy' é reservada para folhas saudáveis.")
        return self._pragas.inserir(classeModelo=classeModelo, **campos)

    def atualizar(self, solicitante: Conta, id: int, dados: dict[str, Any]) -> Praga:
        exigirAdmin(solicitante)
        praga = self.obter(id)
        praga.atualizar(**self._camposDescritivos(dados))  # classeModelo e id são imutáveis na entidade
        self._pragas.salvar(praga)
        return praga

    def excluir(self, solicitante: Conta, id: int) -> None:
        exigirAdmin(solicitante)
        self.obter(id)
        self._pragas.excluir(id)
```

### backend/negocio/ServicoAutenticacao.py

```python
"""Caso de uso: autenticação por e-mail/senha e gestão de sessões (tokens)."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from backend.dominio import Conta
from backend.negocio.excecoes import ContaBloqueada, CredenciaisInvalidas, DadosInvalidos, NaoAutenticado
from backend.negocio.interfaces import IGeradorHash, IRepositorioConta, IRepositorioSessao, Sessao
from backend.negocio.validacoes import normalizarEmail

DURACAO_SESSAO: timedelta = timedelta(hours=12)
DURACAO_SESSAO_LEMBRAR: timedelta = timedelta(days=30)


class ServicoAutenticacao:
    def __init__(self, repositorioConta: IRepositorioConta, repositorioSessao: IRepositorioSessao, geradorHash: IGeradorHash) -> None:
        self._contas = repositorioConta
        self._sessoes = repositorioSessao
        self._hash = geradorHash
        # Hash usado quando o e-mail não existe, para que o tempo de resposta não revele contas cadastradas.
        self._hashFicticio: str = geradorHash.gerar(secrets.token_hex(16))

    @staticmethod
    def _hashToken(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def autenticar(self, email: str, senha: str, lembrar: bool = False) -> tuple[str, Conta]:
        emailNormalizado = normalizarEmail(email)
        if not emailNormalizado or not senha:
            raise DadosInvalidos("Informe e-mail e senha.")

        conta = self._contas.buscarPorEmail(emailNormalizado)
        if conta is None:
            self._hash.verificar(senha, self._hashFicticio)
            raise CredenciaisInvalidas("E-mail ou senha incorretos.")
        if not self._hash.verificar(senha, conta.senhaHash):
            raise CredenciaisInvalidas("E-mail ou senha incorretos.")
        if not conta.podeAutenticar():
            raise ContaBloqueada("Esta conta está bloqueada. Procure um administrador.")

        return self.criarSessao(conta, lembrar), conta

    def criarSessao(self, conta: Conta, lembrar: bool = False) -> str:
        agora = datetime.now()
        self._sessoes.removerExpiradas(agora)
        token = secrets.token_urlsafe(32)
        duracao = DURACAO_SESSAO_LEMBRAR if lembrar else DURACAO_SESSAO
        self._sessoes.criar(Sessao(self._hashToken(token), conta.id, agora, agora + duracao))
        return token

    def contaDaSessao(self, token: Optional[str]) -> Conta:
        if not token:
            raise NaoAutenticado("Faça login para continuar.")
        tokenHash = self._hashToken(token)
        sessao = self._sessoes.buscar(tokenHash)
        if sessao is None or sessao.expiraEm <= datetime.now():
            if sessao is not None:
                self._sessoes.remover(tokenHash)
            raise NaoAutenticado("Sua sessão expirou ou foi encerrada. Faça login novamente.")

        conta = self._contas.buscarPorId(sessao.contaId)
        if conta is None or not conta.podeAutenticar():
            self._sessoes.remover(tokenHash)
            raise NaoAutenticado("Sua sessão foi encerrada. Faça login novamente.")
        return conta

    def encerrarSessao(self, token: Optional[str]) -> None:
        if token:
            self._sessoes.remover(self._hashToken(token))

    def hashDoToken(self, token: str) -> str:
        return self._hashToken(token)
```

### backend/negocio/ServicoUsuario.py

```python
"""Caso de uso: cadastro, atualização, bloqueio e exclusão de contas."""
from __future__ import annotations

from typing import Any, Optional

from backend.dominio import Conta, PerfilUsuario
from backend.negocio.excecoes import AcessoNegado, Conflito, DadosInvalidos, NaoEncontrado
from backend.negocio.interfaces import IGeradorHash, IRepositorioConta, IRepositorioSessao
from backend.negocio.validacoes import (
    ehProdutor,
    exigirAdmin,
    lerPerfilAgricola,
    limparPerfilAgricola,
    serializarPerfilAgricola,
    validarEmail,
    validarNome,
    validarSenha,
)


class ServicoUsuario:
    def __init__(self, repositorioConta: IRepositorioConta, repositorioSessao: IRepositorioSessao, geradorHash: IGeradorHash) -> None:
        self._contas = repositorioConta
        self._sessoes = repositorioSessao
        self._hash = geradorHash

    # ------------------------------------------------------------------ cadastro
    def cadastrarProdutor(self, nome: Any, email: Any, senha: Any, perfilAgricola: Any) -> Conta:
        """Auto-cadastro público: sempre cria um Usuario (PRODUTOR)."""
        return self._criar(nome, email, senha, PerfilUsuario.PRODUTOR, perfilAgricola)

    def criarConta(self, solicitante: Conta, nome: Any, email: Any, senha: Any, perfil: Any, perfilAgricola: Any) -> Conta:
        exigirAdmin(solicitante)
        try:
            perfilEnum = PerfilUsuario(str(perfil or "PRODUTOR").upper())
        except ValueError as erro:
            raise DadosInvalidos("Perfil inválido. Use PRODUTOR ou ADMIN.") from erro
        return self._criar(nome, email, senha, perfilEnum, perfilAgricola)

    def _criar(self, nome: Any, email: Any, senha: Any, perfil: PerfilUsuario, perfilAgricola: Any) -> Conta:
        nomeValido = validarNome(nome)
        emailValido = validarEmail(email)
        senhaValida = validarSenha(senha)
        if self._contas.buscarPorEmail(emailValido) is not None:
            raise Conflito("Já existe uma conta com este e-mail.")

        dados: Optional[str] = None
        if perfil == PerfilUsuario.PRODUTOR:
            perfilLimpo = limparPerfilAgricola(perfilAgricola)
            dados = serializarPerfilAgricola(perfilLimpo)
        return self._contas.inserir(nomeValido, emailValido, self._hash.gerar(senhaValida), perfil, dados)

    # ------------------------------------------------------------------ dados próprios
    def atualizarMeusDados(self, conta: Conta, nome: Any, perfilAgricola: Any) -> Conta:
        conta.atualizarNome(validarNome(nome))
        if ehProdutor(conta) and isinstance(perfilAgricola, dict):
            # Mescla: campos não enviados mantêm o valor atual.
            atuais = lerPerfilAgricola(conta) or {}
            enviados = {k: v for k, v in limparPerfilAgricola(perfilAgricola).items() if k in perfilAgricola}
            conta.atualizarDadosPerfil(serializarPerfilAgricola(atuais | enviados))
        self._contas.salvar(conta)
        return conta

    def alterarSenha(self, conta: Conta, senhaAtual: Any, novaSenha: Any, tokenHashAtual: Optional[str] = None) -> None:
        if not self._hash.verificar(str(senhaAtual or ""), conta.senhaHash):
            raise DadosInvalidos("A senha atual está incorreta.")
        nova = validarSenha(novaSenha)
        self._contas.atualizarSenha(conta.id, self._hash.gerar(nova))
        # Encerra as outras sessões abertas desta conta, mantendo a atual.
        self._sessoes.removerDaConta(conta.id, exceto=tokenHashAtual)

    # ------------------------------------------------------------------ administração
    def listarContas(self, solicitante: Conta) -> list[Conta]:
        exigirAdmin(solicitante)
        return self._contas.listar()

    def _contaExistente(self, id: int) -> Conta:
        conta = self._contas.buscarPorId(id)
        if conta is None:
            raise NaoEncontrado("Conta não encontrada.")
        return conta

    def editarConta(self, solicitante: Conta, id: int, nome: Any, perfilAgricola: Any) -> Conta:
        exigirAdmin(solicitante)
        return self.atualizarMeusDados(self._contaExistente(id), nome, perfilAgricola)

    def alterarStatus(self, solicitante: Conta, id: int, ativo: bool) -> Conta:
        exigirAdmin(solicitante)
        if id == solicitante.id:
            raise AcessoNegado("Você não pode bloquear a sua própria conta.")
        conta = self._contaExistente(id)
        if ativo:
            conta.ativar()
        else:
            conta.bloquear()
            self._sessoes.removerDaConta(conta.id)
        self._contas.salvar(conta)
        return conta

    def excluirConta(self, solicitante: Conta, id: int) -> None:
        exigirAdmin(solicitante)
        if id == solicitante.id:
            raise AcessoNegado("Você não pode excluir a sua própria conta.")
        self._contaExistente(id)
        self._sessoes.removerDaConta(id)
        self._contas.excluir(id)

    def totalContas(self) -> int:
        return len(self._contas.listar())
```

### backend/infraestrutura/GeradorHashPBKDF2.py

```python
"""Hash de senhas com PBKDF2-HMAC-SHA256 (biblioteca padrão, sem dependências)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

from backend.negocio.interfaces import IGeradorHash


class GeradorHashPBKDF2(IGeradorHash):
    ALGORITMO: str = "pbkdf2_sha256"
    ITERACOES: int = 240_000

    def gerar(self, senha: str) -> str:
        sal = secrets.token_bytes(16)
        derivada = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), sal, self.ITERACOES)
        return "$".join(
            (self.ALGORITMO, str(self.ITERACOES), base64.b64encode(sal).decode(), base64.b64encode(derivada).decode())
        )

    def verificar(self, senha: str, senhaHash: str) -> bool:
        try:
            algoritmo, iteracoes, salB64, derivadaB64 = senhaHash.split("$")
            if algoritmo != self.ALGORITMO:
                return False
            sal = base64.b64decode(salB64)
            esperada = base64.b64decode(derivadaB64)
            calculada = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), sal, int(iteracoes))
        except (ValueError, TypeError):
            return False
        return hmac.compare_digest(calculada, esperada)
```

## 5. Frontend (Interface de Upload e Exibição de Resultados)

O frontend é uma SPA baseada em hash routing (`#/...`) escrita em JavaScript ES Modules puro, carregada por `frontend/index.html`. Abaixo estão os arquivos integrais responsáveis pela estrutura da SPA, cliente HTTP (`fetch`), captura/redimensionamento da imagem de upload, renderização dos resultados com bounding boxes, histórico, catálogo de pragas e gestão administrativa das classes YOLO (`classeModelo`).

> Nota: os arquivos auxiliares de estilização (`frontend/css/estilo.css`), ícone (`frontend/img/logo.svg`) e páginas puramente de conta/autenticação (`frontend/js/paginas/login.js`, `cadastro.js`, `perfil.js`) não participam do fluxo de upload ou inferência.

### frontend/index.html

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BioScan</title>
  <meta name="description" content="BioScan — diagnóstico fitossanitário por visão computacional">
  <link rel="icon" href="img/logo.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
  <link rel="stylesheet" href="css/estilo.css">
  <script type="module" src="js/app.js"></script>
</head>
<body>
  <header id="topo" class="topo"></header>
  <main id="conteudo" class="conteudo">
    <div class="tela-carregando"><span class="spinner"></span></div>
  </main>
  <div id="toasts" class="toasts" aria-live="polite"></div>
  <noscript>O BioScan precisa de JavaScript habilitado.</noscript>
</body>
</html>
```

### frontend/js/app.js

```javascript
// Roteador (hash) e casca da aplicação: cabeçalho, guarda de rotas e sessão.
import { api } from './api.js';
import { sessao } from './sessao.js';
import { esc, icone, iniciais, corAvatar, toast, fecharTodosModais, estadoErro, confirmar } from './ui.js';
import * as paginaLogin from './paginas/login.js';
import * as paginaCadastro from './paginas/cadastro.js';
import * as paginaInicio from './paginas/inicio.js';
import * as paginaHistorico from './paginas/historico.js';
import * as paginaCatalogo from './paginas/catalogo.js';
import * as paginaPerfil from './paginas/perfil.js';
import * as paginaAdmin from './paginas/admin.js';

const ROTAS = {
  '/login': { modulo: paginaLogin, publica: true, titulo: 'Entrar' },
  '/cadastro': { modulo: paginaCadastro, publica: true, titulo: 'Criar conta' },
  '/inicio': { modulo: paginaInicio, perfis: ['PRODUTOR'], titulo: 'Início' },
  '/historico': { modulo: paginaHistorico, perfis: ['PRODUTOR'], titulo: 'Histórico' },
  '/catalogo': { modulo: paginaCatalogo, perfis: ['PRODUTOR', 'ADMIN'], titulo: 'Catálogo de pragas' },
  '/perfil': { modulo: paginaPerfil, perfis: ['PRODUTOR', 'ADMIN'], titulo: 'Perfil' },
  '/admin': { modulo: paginaAdmin, perfis: ['ADMIN'], titulo: 'Painel administrativo' },
};

const MENU = {
  PRODUTOR: [['/inicio', 'Início'], ['/historico', 'Histórico'], ['/perfil', 'Perfil']],
  ADMIN: [['/admin', 'Painel'], ['/catalogo', 'Catálogo'], ['/perfil', 'Perfil']],
};

let contaAtual = null;
let geracao = 0;

const rotaInicial = (conta) => (conta?.perfil === 'ADMIN' ? '/admin' : '/inicio');

function lerRota() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [caminho, query = ''] = hash.split('?');
  return { caminho, params: Object.fromEntries(new URLSearchParams(query)) };
}

export function navegar(rota) {
  if (location.hash === `#${rota}`) renderizar();
  else location.hash = rota;
}

function montarTopo(caminho) {
  const topo = document.getElementById('topo');
  const marca = `<a class="marca" href="#/">${icone('logo')}<span>BioScan</span></a>`;
  if (!contaAtual) {
    topo.innerHTML = `<div class="topo-interno">${marca}</div>`;
    return;
  }
  const itens = MENU[contaAtual.perfil] || [];
  topo.innerHTML = `
    <div class="topo-interno">
      ${marca}
      <nav class="nav" aria-label="Navegação principal">
        ${itens.map(([rota, rotulo]) => `<a href="#${rota}" class="${caminho === rota ? 'ativo' : ''}">${esc(rotulo)}</a>`).join('')}
      </nav>
      <div class="topo-usuario">
        <span class="avatar avatar-p" style="background:${corAvatar(contaAtual.nome)}" title="${esc(contaAtual.nome)}">${iniciais(contaAtual.nome)}</span>
        <button type="button" class="btn-icone" id="btn-sair" title="Sair" aria-label="Sair">${icone('sair')}</button>
      </div>
    </div>`;
  topo.querySelector('#btn-sair').addEventListener('click', sair);
}

async function sair() {
  const ok = await confirmar({
    titulo: 'Sair da conta',
    mensagem: 'Tem certeza de que deseja sair da sua conta?',
    textoConfirmar: 'Confirmar Saída',
    perigo: true,
  });
  if (!ok) return;

  try { await api.logout(); } catch { /* a sessão local é descartada de qualquer forma */ }
  sessao.limpar();
  contaAtual = null;
  toast('Você saiu da sua conta.', 'info');
  navegar('/login');
}

function contexto(params) {
  return {
    params,
    get conta() { return contaAtual; },
    navegar,
    sair,
    entrar(token, conta, lembrar) {
      sessao.salvar(token, lembrar);
      contaAtual = conta;
      toast(`Bem-vindo(a), ${conta.nome.split(' ')[0]}!`);
      navegar(rotaInicial(conta));
    },
    atualizarConta(conta) {
      contaAtual = conta;
      montarTopo(lerRota().caminho);
    },
  };
}

async function renderizar() {
  const minhaGeracao = ++geracao;
  const { caminho, params } = lerRota();
  const rota = ROTAS[caminho];

  if (!rota) return navegar(contaAtual ? rotaInicial(contaAtual) : '/login');
  if (rota.publica && contaAtual) return navegar(rotaInicial(contaAtual));
  if (!rota.publica && !contaAtual) return navegar('/login');
  if (rota.perfis && !rota.perfis.includes(contaAtual.perfil)) return navegar(rotaInicial(contaAtual));

  fecharTodosModais();
  document.title = `${rota.titulo} · BioScan`;
  montarTopo(caminho);
  const el = document.getElementById('conteudo');
  el.className = `conteudo pagina-${caminho.slice(1)}`;
  el.innerHTML = '';
  void el.offsetWidth;
  el.classList.add('entrando');
  window.scrollTo({ top: 0 });

  try {
    await rota.modulo.render(el, contexto(params));
  } catch (erro) {
    console.error(erro);
    if (minhaGeracao === geracao) el.innerHTML = estadoErro(erro.message || 'Falha ao carregar a página.');
  }
}

window.addEventListener('bioscan:sessao-expirada', (e) => {
  if (!contaAtual) return;
  contaAtual = null;
  toast(e.detail || 'Sua sessão expirou. Faça login novamente.', 'erro');
  navegar('/login');
});

async function iniciar() {
  if (sessao.token()) {
    try {
      contaAtual = (await api.eu()).conta;
    } catch {
      sessao.limpar();
      contaAtual = null;
    }
  }
  window.addEventListener('hashchange', renderizar);
  renderizar();
}

iniciar();
```

### frontend/js/api.js

```javascript
// Cliente da API REST do Bioscan (backend/apresentacao).
import { sessao } from './sessao.js';

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

async function requisitar(metodo, caminho, corpo) {
  const cabecalhos = { Accept: 'application/json' };
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  const token = sessao.token();
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi('Não foi possível conectar ao servidor. Verifique se o backend está rodando.', 0);
  }

  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    if (resposta.status === 401 && token) {
      sessao.limpar();
      window.dispatchEvent(new CustomEvent('bioscan:sessao-expirada', { detail: dados?.erro }));
    }
    throw new ErroApi(dados?.erro || `Erro inesperado (${resposta.status}).`, resposta.status);
  }
  return dados;
}

export const api = {
  // autenticação
  login: (email, senha, lembrar) => requisitar('POST', '/auth/login', { email, senha, lembrar }),
  cadastro: (dados) => requisitar('POST', '/auth/cadastro', dados),
  logout: () => requisitar('POST', '/auth/logout'),
  eu: () => requisitar('GET', '/auth/eu'),
  // perfil
  atualizarPerfil: (dados) => requisitar('PUT', '/perfil', dados),
  alterarSenha: (senhaAtual, novaSenha) => requisitar('PUT', '/perfil/senha', { senhaAtual, novaSenha }),
  // pragas
  listarPragas: () => requisitar('GET', '/pragas'),
  criarPraga: (dados) => requisitar('POST', '/pragas', dados),
  atualizarPraga: (id, dados) => requisitar('PUT', `/pragas/${id}`, dados),
  excluirPraga: (id) => requisitar('DELETE', `/pragas/${id}`),
  // diagnósticos
  listarDiagnosticos: () => requisitar('GET', '/diagnosticos'),
  criarDiagnostico: (imagem, largura, altura) => requisitar('POST', '/diagnosticos', { imagem, largura, altura }),
  obterDiagnostico: (id) => requisitar('GET', `/diagnosticos/${id}`),
  excluirDiagnostico: (id) => requisitar('DELETE', `/diagnosticos/${id}`),
  // administração
  estatisticas: () => requisitar('GET', '/admin/estatisticas'),
  listarUsuarios: () => requisitar('GET', '/admin/usuarios'),
  criarUsuario: (dados) => requisitar('POST', '/admin/usuarios', dados),
  editarUsuario: (id, dados) => requisitar('PUT', `/admin/usuarios/${id}`, dados),
  alterarStatusUsuario: (id, ativo) => requisitar('PATCH', `/admin/usuarios/${id}/status`, { ativo }),
  excluirUsuario: (id) => requisitar('DELETE', `/admin/usuarios/${id}`),
};
```

### frontend/js/sessao.js

```javascript
// Armazena o token de sessão. "Manter conectado" usa localStorage; caso contrário, sessionStorage.
const CHAVE = 'bioscan.token';

export const sessao = {
  token() {
    return localStorage.getItem(CHAVE) || sessionStorage.getItem(CHAVE);
  },
  salvar(token, lembrar) {
    this.limpar();
    (lembrar ? localStorage : sessionStorage).setItem(CHAVE, token);
  },
  limpar() {
    localStorage.removeItem(CHAVE);
    sessionStorage.removeItem(CHAVE);
  },
};
```

### frontend/js/paginas/inicio.js

```javascript
// Página Inicial do Produtor (/inicio):
// - Área drag-and-drop para envio de imagem + amostras rápidas (mock YOLO)
// - Laudo com botões "Salvar no Histórico" ou "Descartar / Nova Análise"
// - Card "Últimos diagnósticos" (2 últimos lado a lado)
// - Card "Catálogo de pragas" (3 círculos clicáveis)
import { api } from '../api.js';
import {
  esc, icone, corPraga, formatarData, formatarPct,
  abrirModal, toast, estadoCarregando, estadoVazio,
} from '../ui.js';
import { midiaDiagnostico, cartaoResultado, rotuloPrincipal } from '../componentes.js';

function lerArquivoComoDataUrl(arquivo) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Redimensiona no máximo para 900px para manter payload leve
        const max = 900;
        let w = img.naturalWidth || 640;
        let h = img.naturalHeight || 640;
        if (w > max || h > max) {
          const r = Math.min(max / w, max / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolver({ dataUrl: canvas.toDataURL('image/jpeg', 0.88), largura: w, altura: h });
      };
      img.onerror = () => rejeitar(new Error('Não foi possível ler a imagem selecionada.'));
      img.src = leitor.result;
    };
    leitor.onerror = () => rejeitar(new Error('Falha na leitura do arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}

export async function render(el, ctx) {
  el.innerHTML = estadoCarregando('Carregando painel do produtor…');
  const [{ diagnosticos }, { pragas }] = await Promise.all([
    api.listarDiagnosticos(),
    api.listarPragas(),
  ]);

  const ultimos = diagnosticos.slice(0, 2);
  const pragasDestaque = pragas.slice(0, 3);

  el.innerHTML = `
    <section class="cartao dropzone" id="dropzone">
      <input type="file" id="input-imagem" accept="image/png,image/jpeg,image/webp" hidden>
      <div class="dropzone-icone">${icone('nuvem')}</div>
      <h1 class="dropzone-titulo">Arraste e solte uma imagem da folha que deve ser analisada aqui</h1>
      <div class="dropzone-acoes">
        <button type="button" class="btn btn-primario" id="btn-selecionar-arquivo">
          Selecione um arquivo do dispositivo
        </button>
        <button type="button" class="btn btn-contorno" id="btn-amostra-mock">
          ${icone('folha')} Testar com folha de exemplo (Mock)
        </button>
      </div>
      <small class="suave">Formatos aceitos: JPG, PNG ou WEBP · Diagnóstico simulado (mock YOLO)</small>
    </section>

    <section class="grade-inicio">
      <div class="cartao">
        <div class="cartao-topo">
          <h2 class="cartao-titulo">${icone('historico')} Últimos diagnósticos</h2>
          <a class="link-acao" href="#/historico">Ver todos ${icone('setaDir')}</a>
        </div>
        ${ultimos.length ? `
          <div class="ultimos-grade">
            ${ultimos.map((d) => `
              <article class="ultimo-item" data-abrir-diag="${d.id}" role="button" tabindex="0">
                <div class="ultimo-topo">
                  <div class="ultimo-thumb">${midiaDiagnostico(d)}</div>
                  <div>
                    <strong class="ultimo-data">Data: ${esc(formatarData(d.dataAnalise))}</strong>
                    <small class="suave">Diagnóstico concluído</small>
                  </div>
                </div>
                <ul class="ultimo-meta">
                  <li>
                    <span class="meta-bolinha" style="background:${d.pragaPrincipal ? corPraga(d.pragaPrincipal.id) : '#527A33'}"></span>
                    <span>${esc(rotuloPrincipal(d))}</span>
                  </li>
                  <li>
                    <span class="meta-icone">${icone('percentual')}</span>
                    <span>${esc(formatarPct(d.grauAfetacao))} da folha (${esc(d.nivel)})</span>
                  </li>
                </ul>
              </article>
            `).join('')}
          </div>
        ` : estadoVazio('Você ainda não realizou nenhuma análise. Envie uma imagem acima!')}
      </div>

      <div class="cartao">
        <div class="cartao-topo">
          <h2 class="cartao-titulo">${icone('livro')} Catálogo de pragas</h2>
          <a class="link-acao" href="#/catalogo">Abrir catálogo ${icone('setaDir')}</a>
        </div>
        <div class="catalogo-bolinhas">
          ${pragasDestaque.map((p) => `
            <a class="bolinha-item" href="#/catalogo?id=${p.id}">
              <span class="bolinha-cor" style="background:${corPraga(p.id)}"></span>
              <strong class="bolinha-nome">${esc(p.nomePopular)}</strong>
              <small class="suave">${esc(p.nomeCientifico)}</small>
            </a>
          `).join('')}
        </div>
      </div>
    </section>
  `;

  const dropzone = el.querySelector('#dropzone');
  const input = el.querySelector('#input-imagem');

  async function executarAnalise(imagem, largura, altura) {
    dropzone.classList.add('analisando');
    try {
      const { diagnostico } = await api.criarDiagnostico(imagem, largura, altura);
      abrirModalDecisaoAnalise(
        diagnostico,
        () => {
          input.value = '';
          render(el, ctx);
        },
        () => {
          input.value = '';
          render(el, ctx);
        }
      );
    } catch (erro) {
      toast(erro.message, 'erro');
    } finally {
      dropzone.classList.remove('analisando');
    }
  }

  async function processarArquivo(arquivo) {
    if (!arquivo) return;
    try {
      const { dataUrl, largura, altura } = await lerArquivoComoDataUrl(arquivo);
      await executarAnalise(dataUrl, largura, altura);
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  }

  el.querySelector('#btn-selecionar-arquivo').addEventListener('click', () => input.click());
  input.addEventListener('change', () => processarArquivo(input.files[0]));

  el.querySelector('#btn-amostra-mock').addEventListener('click', async () => {
    const semente = Math.floor(Date.now() % 900) + 100;
    await executarAnalise(`mock://folha/${semente}`, 640, 640);
  });

  ['dragenter', 'dragover'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('arrastando');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.remove('arrastando');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const arquivo = e.dataTransfer?.files?.[0];
    if (arquivo) processarArquivo(arquivo);
  });

  el.querySelectorAll('[data-abrir-diag]').forEach((card) => {
    const abrir = () => {
      const d = diagnosticos.find((x) => x.id === Number(card.dataset.abrirDiag));
      if (d) abrirModalResultado(d);
    };
    card.addEventListener('click', abrir);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') abrir(); });
  });
}

function abrirModalDecisaoAnalise(diagnostico, aoSalvar, aoDescartar) {
  let salvo = false;

  const conteudo = `
    <div class="laudo-decisao-wrap">
      ${cartaoResultado(diagnostico)}
      <div class="laudo-acoes-decisao">
        <button type="button" class="btn btn-contorno btn-perigo" id="btn-descartar-analise">
          ${icone('lixeira')} Descartar / Nova Análise
        </button>
        <button type="button" class="btn btn-primario" id="btn-salvar-analise">
          ${icone('check')} Salvar no Histórico
        </button>
      </div>
    </div>
  `;

  const modal = abrirModal({
    titulo: `Resultado da Análise #${diagnostico.id}`,
    tamanho: 'lg',
    conteudo,
    aoFechar: async () => {
      if (salvo) {
        aoSalvar?.();
      } else {
        try {
          await api.excluirDiagnostico(diagnostico.id);
        } catch {}
        aoDescartar?.();
      }
    },
  });

  modal.corpo.querySelector('#btn-salvar-analise')?.addEventListener('click', () => {
    salvo = true;
    modal.fechar();
    toast('Análise salva no histórico com sucesso!');
  });

  modal.corpo.querySelector('#btn-descartar-analise')?.addEventListener('click', () => {
    salvo = false;
    modal.fechar();
    toast('Análise descartada.', 'info');
  });
}

function abrirModalResultado(diagnostico) {
  abrirModal({
    titulo: `Resultado da Análise #${diagnostico.id}`,
    tamanho: 'lg',
    conteudo: cartaoResultado(diagnostico),
  });
}
```

### frontend/js/componentes.js

```javascript
// Componentes visuais de diagnóstico: folha ilustrada (SVG), visualizador com bounding boxes,
// cartão de resultado e gráficos simples. Tudo é renderizado a partir do JSON da API.
import { esc, icone, formatarDataHora, formatarPct, corPraga } from './ui.js';

const CORES_LESAO = {
  rust: ['#F0A23B', '#9A4E12', '#F6E27A'],
  cercospora: ['#C9B48A', '#5A3A1E', '#EAD98A'],
  leaf_miner: ['#EADDB0', '#A88E55', '#F3EBC8'],
  phoma: ['#5A3B22', '#24150A', '#B9A25C'],
};
const CORES_LESAO_PADRAO = ['#B5652B', '#4A2A12', '#E6D27A'];

let contadorSvg = 0;

function geradorAleatorio(semente) {
  let s = (Number(semente) * 2654435761) >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Folha ilustrada com lesões desenhadas dentro das bounding boxes não saudáveis. */
export function folhaSVG({ semente = 1, deteccoes = [], largura = 640, altura = 640, lesoes = true } = {}) {
  const id = `fs${++contadorSvg}`;
  const rnd = geradorAleatorio(semente);
  const matiz = 88 + Math.round(rnd() * 26);
  const claro = `hsl(${matiz} 50% 55%)`;
  const medio = `hsl(${matiz + 2} 52% 42%)`;
  const escuro = `hsl(${matiz + 6} 58% 28%)`;

  // Nervuras secundárias
  const base = [120, 525], ponta = [545, 95];
  const dx = ponta[0] - base[0], dy = ponta[1] - base[1];
  const comp = Math.hypot(dx, dy), ux = dx / comp, uy = dy / comp;
  let nervuras = '';
  for (let t = 0.14; t < 0.9; t += 0.105) {
    const px = base[0] + dx * t, py = base[1] + dy * t;
    const tam = 165 * Math.sin(Math.PI * Math.min(0.95, t + 0.05)) + 10;
    for (const lado of [-1, 1]) {
      const nx = -uy * lado, ny = ux * lado;
      const ex = px + nx * tam * 0.78 + ux * tam * 0.55, ey = py + ny * tam * 0.78 + uy * tam * 0.55;
      const cx = px + nx * tam * 0.45 + ux * tam * 0.1, cy = py + ny * tam * 0.45 + uy * tam * 0.1;
      nervuras += `<path d="M${px.toFixed(1)} ${py.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`;
    }
  }

  // Lesões (somente detecções não saudáveis)
  const escalaX = 640 / largura, escalaY = 640 / altura;
  const classesUsadas = new Set();
  let manchas = '';
  if (lesoes) {
    for (const d of deteccoes) {
      if (d.saudavel) continue;
      const classe = CORES_LESAO[d.nomeClasse] ? d.nomeClasse : 'padrao';
      classesUsadas.add(classe);
      const cx = ((d.x1 + d.x2) / 2) * escalaX, cy = ((d.y1 + d.y2) / 2) * escalaY;
      const raio = (Math.min(d.x2 - d.x1, d.y2 - d.y1) * Math.min(escalaX, escalaY)) / 2;
      const r = geradorAleatorio(d.id * 97 + semente);
      const qtd = 3 + Math.floor(r() * 4);
      manchas += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(raio * 0.95).toFixed(1)}" fill="url(#${id}-halo-${classe})"/>`;
      for (let i = 0; i < qtd; i++) {
        const ang = r() * Math.PI * 2, dist = r() * raio * 0.55;
        const rr = raio * (0.18 + r() * 0.3);
        manchas += `<ellipse cx="${(cx + Math.cos(ang) * dist).toFixed(1)}" cy="${(cy + Math.sin(ang) * dist).toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(rr * (0.75 + r() * 0.4)).toFixed(1)}" fill="url(#${id}-l-${classe})"/>`;
      }
    }
  }
  const gradientesLesao = [...classesUsadas].map((classe) => {
    const [centro, borda, halo] = CORES_LESAO[classe] || CORES_LESAO_PADRAO;
    return `
      <radialGradient id="${id}-l-${classe}"><stop offset="0" stop-color="${borda}"/><stop offset=".55" stop-color="${centro}"/><stop offset="1" stop-color="${borda}" stop-opacity=".85"/></radialGradient>
      <radialGradient id="${id}-halo-${classe}"><stop offset="0" stop-color="${halo}" stop-opacity=".55"/><stop offset="1" stop-color="${halo}" stop-opacity="0"/></radialGradient>`;
  }).join('');

  const contorno = 'M120 525 C 62 372, 196 162, 545 95 C 500 420, 302 580, 120 525 Z';
  return `
    <svg class="folha-svg" viewBox="0 0 640 640" preserveAspectRatio="none" role="img" aria-label="Folha analisada">
      <defs>
        <linearGradient id="${id}-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="${escuro}"/><stop offset=".45" stop-color="${medio}"/><stop offset="1" stop-color="${claro}"/>
        </linearGradient>
        <radialGradient id="${id}-brilho" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}-c"><path d="${contorno}"/></clipPath>
        ${gradientesLesao}
      </defs>
      <path d="M120 525 Q 96 560 66 596" stroke="${escuro}" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="${contorno}" fill="url(#${id}-g)"/>
      <g clip-path="url(#${id}-c)">
        <path d="${contorno}" fill="url(#${id}-brilho)"/>
        <g stroke="hsl(${matiz} 45% 70%)" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round">${nervuras}</g>
        <path d="M120 525 C 260 400, 400 262, 545 95" stroke="hsl(${matiz} 45% 74%)" stroke-opacity=".8" stroke-width="6" fill="none" stroke-linecap="round"/>
        ${manchas}
      </g>
    </svg>`;
}

export function nomeClasse(det) {
  if (det.saudavel) return 'Saudável';
  return det.pragaNome || det.nomeClasse;
}

export function tituloDiagnostico(d) {
  try {
    const mapa = JSON.parse(localStorage.getItem('bioscan:titulos-analises') || '{}');
    if (mapa[d.id]) return mapa[d.id];
  } catch {}
  return d.tituloPersonalizado || `Análise #${d.id}`;
}

export function midiaDiagnostico(d, { lesoes = true } = {}) {
  const url = d.urlImagem || '';
  if (url.startsWith('mock://folha/')) {
    return folhaSVG({ semente: Number(url.split('/').pop()) || 1, deteccoes: d.deteccoes, largura: d.largura, altura: d.altura, lesoes });
  }
  return `<img src="${esc(url)}" alt="Imagem enviada para análise" draggable="false">`;
}

/** Imagem + bounding boxes posicionadas em porcentagem (independe do tamanho exibido). */
export function visualizador(d, { caixas = true, rotulos = true } = {}) {
  const w = d.largura || 640, h = d.altura || 640;
  const boxes = caixas
    ? d.deteccoes.map((det) => {
        const estilo = `left:${(det.x1 / w) * 100}%;top:${(det.y1 / h) * 100}%;width:${((det.x2 - det.x1) / w) * 100}%;height:${((det.y2 - det.y1) / h) * 100}%`;
        const rotulo = rotulos ? `<span class="caixa-rotulo">${esc(nomeClasse(det))} · ${Math.round(det.confianca * 100)}%</span>` : '';
        return `<div class="caixa ${det.saudavel ? 'caixa-ok' : 'caixa-praga'}" style="${estilo}">${rotulo}</div>`;
      }).join('')
    : '';
  return `
    <div class="visualizador" style="aspect-ratio:${w} / ${h}">
      <div class="visualizador-midia">${midiaDiagnostico(d)}</div>
      <div class="visualizador-caixas">${boxes}</div>
    </div>`;
}

export function chipNivel(d) {
  const classe = { 'Saudável': 'ok', Leve: 'leve', Moderado: 'moderado', Severo: 'severo' }[d.nivel] || 'ok';
  return `<span class="chip chip-${classe}">${esc(d.nivel)}</span>`;
}

export function rotuloPrincipal(d) {
  return d.pragaPrincipal ? d.pragaPrincipal.nomePopular : 'Folha saudável';
}

export function cartaoResultado(d) {
  const praga = d.pragaPrincipal;
  const grau = Math.min(100, d.grauAfetacao);
  const deteccoes = [...d.deteccoes].sort((a, b) => Number(a.saudavel) - Number(b.saudavel) || b.confianca - a.confianca);

  const blocoPraga = praga
    ? `<div class="praga-principal">
         <span class="praga-bolinha" style="background:${corPraga(praga.id)}"></span>
         <div>
           <small class="suave">Praga principal identificada</small>
           <strong class="praga-nome">${esc(praga.nomePopular)}</strong>
           <em class="suave">${esc(praga.nomeCientifico)}</em>
         </div>
       </div>
       <p class="texto-praga">${esc(praga.sintomas)}</p>`
    : `<div class="praga-principal praga-principal-ok">
         <span class="praga-bolinha">${icone('escudo')}</span>
         <div><small class="suave">Resultado</small><strong class="praga-nome">Nenhuma praga identificada</strong><em class="suave">A folha aparenta estar saudável.</em></div>
       </div>`;

  return `
    <div class="resultado">
      <div class="resultado-imagem">
        ${visualizador(d)}
        <div class="legenda">
          <span><i class="legenda-cor legenda-ok"></i> Região saudável</span>
          <span><i class="legenda-cor legenda-praga"></i> Praga / doença</span>
        </div>
      </div>
      <div class="resultado-info">
        <div class="resultado-topo">
          <div>
            <h3>${esc(tituloDiagnostico(d))}</h3>
            <small class="suave">${icone('calendario')} ${esc(formatarDataHora(d.dataAnalise))}</small>
          </div>
          ${chipNivel(d)}
        </div>
        <div class="medidor">
          <div class="medidor-cabecalho"><span>Grau de afetação</span><strong>${formatarPct(grau)}</strong></div>
          <div class="medidor-barra"><span style="width:${grau}%"></span></div>
          <small class="suave">Proporção da área analisada com sinais de praga ou doença.</small>
        </div>
        ${blocoPraga}
        <h4 class="subtitulo">Detecções do modelo (${deteccoes.length})</h4>
        <ul class="lista-deteccoes">
          ${deteccoes.map((det) => `
            <li>
              <i class="det-cor ${det.saudavel ? 'det-ok' : 'det-praga'}"></i>
              <span class="det-nome">${esc(nomeClasse(det))}<small>${esc(det.nomeClasse)}</small></span>
              <span class="det-barra"><span style="width:${det.confianca * 100}%"></span></span>
              <strong>${Math.round(det.confianca * 100)}%</strong>
            </li>`).join('')}
        </ul>
      </div>
    </div>
    ${praga ? `
      <div class="recomendacoes">
        <div class="recomendacao"><h4>${icone('folha')} Manejo recomendado</h4><p>${esc(praga.recomendacoesManejo)}</p></div>
        <div class="recomendacao"><h4>${icone('escudo')} Defensivos indicados</h4><p>${esc(praga.defensivosIndicados)}</p></div>
      </div>` : ''}
    <p class="aviso-mock">${icone('info')} Resultado simulado (mock): o modelo YOLO ainda não está integrado.</p>`;
}

/** Pares de barras saudável × afetado para uma lista de diagnósticos. */
export function graficoComparativo(diagnosticos, idAtual) {
  if (!diagnosticos.length) return '';
  return `
    <div class="grafico-comparativo">
      ${diagnosticos.map((d) => `
        <div class="gc-grupo ${d.id === idAtual ? 'gc-atual' : ''}" title="${esc(tituloDiagnostico(d))}: ${formatarPct(d.grauAfetacao)} afetado">
          <div class="gc-barras">
            <span class="gc-barra gc-saudavel" style="height:${Math.max(2, 100 - d.grauAfetacao)}%"></span>
            <span class="gc-barra gc-afetado" style="height:${Math.max(2, d.grauAfetacao)}%"></span>
          </div>
          <small>#${d.id}</small>
        </div>`).join('')}
    </div>
    <div class="legenda">
      <span><i class="legenda-cor gc-saudavel"></i> % saudável</span>
      <span><i class="legenda-cor gc-afetado"></i> % afetado</span>
    </div>`;
}

/** Detecções sintéticas para ilustrar uma praga no catálogo. */
export function deteccoesIlustrativas(classeModelo, semente = 3) {
  const r = geradorAleatorio(semente);
  return Array.from({ length: 5 }, (_, i) => {
    const t = 0.2 + i * 0.15;
    const cx = 640 * (0.19 + 0.65 * t) + (r() - 0.5) * 90, cy = 640 * (0.81 - 0.65 * t) + (r() - 0.5) * 90;
    const lado = 50 + r() * 50;
    return { id: i + 1, nomeClasse: classeModelo, saudavel: false, x1: cx - lado / 2, y1: cy - lado / 2, x2: cx + lado / 2, y2: cy + lado / 2 };
  });
}
```

### frontend/js/paginas/historico.js

```javascript
// Página "Seu banco de análises" (/historico) fiel às telas 3 e 4 do mockup:
// - Barra de cabeçalho com busca, filtro por praga/nível e ordenação
// - Painel expandido "Nome da análise" com carrossel de folhas, resumo (% saudável vs % com praga),
//   gráfico comparativo de barras e botão de lixeira
// - Grade centralizada com 4 colunas e scroll vertical
// - Edição visual de título inline com ícone de lápis
import { api } from '../api.js';
import {
  esc, icone, formatarData, formatarDataHora, formatarPct,
  abrirModal, confirmar, toast, estadoCarregando, estadoVazio,
} from '../ui.js';
import {
  midiaDiagnostico, tituloDiagnostico, rotuloPrincipal,
  graficoComparativo, cartaoResultado, chipNivel,
} from '../componentes.js';

const CHAVE_TITULOS = 'bioscan:titulos-analises';

function carregarTitulos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_TITULOS) || '{}');
  } catch {
    return {};
  }
}

function salvarTitulo(id, novoTitulo) {
  const mapa = carregarTitulos();
  const valor = (novoTitulo || '').trim();
  if (valor) {
    mapa[id] = valor;
  } else {
    delete mapa[id];
  }
  try {
    localStorage.setItem(CHAVE_TITULOS, JSON.stringify(mapa));
  } catch {}
}

function obterTitulo(d) {
  const mapa = carregarTitulos();
  return mapa[d.id] || d.tituloPersonalizado || `Análise #${d.id}`;
}

export async function render(el) {
  el.innerHTML = estadoCarregando('Carregando seu banco de análises…');
  let { diagnosticos } = await api.listarDiagnosticos();

  let busca = '';
  let filtro = 'TODOS';
  let ordem = 'RECENTES';
  let expandidoId = diagnosticos[0]?.id ?? null;

  const pragasUnicas = [...new Set(diagnosticos.map((d) => rotuloPrincipal(d)))];

  function filtrarEOrdenar() {
    const termo = busca.trim().toLowerCase();
    const lista = diagnosticos.filter((d) => {
      const praga = rotuloPrincipal(d);
      const titulo = obterTitulo(d);
      const texto = `${titulo} ${tituloDiagnostico(d)} ${praga} ${d.nivel} ${formatarData(d.dataAnalise)}`.toLowerCase();
      if (termo && !texto.includes(termo)) return false;
      if (filtro === 'SAUDAVEL') return !d.pragaPrincipal;
      if (filtro === 'COM_PRAGA') return Boolean(d.pragaPrincipal);
      if (filtro !== 'TODOS') return praga === filtro;
      return true;
    });

    lista.sort((a, b) => {
      if (ordem === 'ANTIGOS') return new Date(a.dataAnalise) - new Date(b.dataAnalise);
      if (ordem === 'MAIOR_GRAU') return b.grauAfetacao - a.grauAfetacao;
      if (ordem === 'MENOR_GRAU') return a.grauAfetacao - b.grauAfetacao;
      return new Date(b.dataAnalise) - new Date(a.dataAnalise);
    });
    return lista;
  }

  async function excluir(id) {
    const ok = await confirmar({
      titulo: 'Excluir análise',
      mensagem: `Deseja mover a Análise #${id} para excluídos? (Exclusão lógica conforme StatusDiagnostico.EXCLUIDO)`,
      textoConfirmar: 'Excluir análise',
      perigo: true,
    });
    if (!ok) return;
    try {
      await api.excluirDiagnostico(id);
      diagnosticos = diagnosticos.filter((d) => d.id !== id);
      if (expandidoId === id) expandidoId = diagnosticos[0]?.id ?? null;
      toast('Análise excluída com sucesso.');
      desenharGrade();
    } catch (erro) {
      toast(erro.message, 'erro');
    }
  }

  el.innerHTML = `
    <section class="barra-banco">
      <h1 class="barra-banco-titulo">${icone('historico')} Seu banco de análises</h1>
      <div class="barra-banco-controles">
        <label class="busca-pilula">
          ${icone('busca')}
          <input type="search" id="campo-busca" placeholder="Buscar análise ou praga…">
        </label>
        <label class="controle-inline">
          <span>Filtrar</span>
          ${icone('filtro')}
          <select id="select-filtro">
            <option value="TODOS">Todas</option>
            <option value="COM_PRAGA">Com praga</option>
            <option value="SAUDAVEL">Saudáveis</option>
            ${pragasUnicas.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
          </select>
        </label>
        <label class="controle-inline">
          <span>Ordenação</span>
          ${icone('ordenar')}
          <select id="select-ordem">
            <option value="RECENTES">Mais recentes</option>
            <option value="ANTIGOS">Mais antigas</option>
            <option value="MAIOR_GRAU">Maior afetação</option>
            <option value="MENOR_GRAU">Menor afetação</option>
          </select>
        </label>
      </div>
    </section>

    <section id="painel-expandido"></section>

    <section class="secao-historico-grade">
      <div class="grade-analises-scroller">
        <div id="grade-analises" class="grade-analises"></div>
      </div>
    </section>
  `;

  el.querySelector('#campo-busca').addEventListener('input', (e) => {
    busca = e.target.value;
    desenharGrade();
  });
  el.querySelector('#select-filtro').addEventListener('change', (e) => {
    filtro = e.target.value;
    desenharGrade();
  });
  el.querySelector('#select-ordem').addEventListener('change', (e) => {
    ordem = e.target.value;
    desenharGrade();
  });

  function desenharPainelExpandido(lista) {
    const container = el.querySelector('#painel-expandido');
    const atual = lista.find((d) => d.id === expandidoId) || diagnosticos.find((d) => d.id === expandidoId);
    if (!atual) {
      container.innerHTML = '';
      return;
    }
    const saudavelPct = Math.max(0, 100 - atual.grauAfetacao);
    const amostraCarrossel = lista.slice(0, 5);
    const idxAtual = lista.findIndex((d) => d.id === atual.id);
    const anterior = lista[(idxAtual - 1 + lista.length) % lista.length];
    const proximo = lista[(idxAtual + 1) % lista.length];

    container.innerHTML = `
      <article class="cartao analise-expandida">
        <div class="analise-expandida-topo">
          <div class="analise-titulo-topo" data-titulo-container="${atual.id}">
            <h2 class="analise-titulo-sub">
              <span class="analise-titulo-texto">${esc(obterTitulo(atual))}</span>
              <button type="button" class="btn-icone btn-icone-p btn-editar-inline" data-editar-titulo="${atual.id}" title="Editar nome da análise" aria-label="Editar nome da análise">
                ${icone('editar')}
              </button>
              <span class="suave">— ${esc(rotuloPrincipal(atual))}</span>
            </h2>
            <small class="suave">${esc(formatarDataHora(atual.dataAnalise))}</small>
          </div>
          <div class="analise-expandida-acoes">
            ${chipNivel(atual)}
            <button type="button" class="btn btn-contorno btn-p" data-detalhe="${atual.id}">
              Ver bounding boxes (${atual.deteccoes.length})
            </button>
            <button type="button" class="btn-icone" data-fechar-exp title="Recolher painel">${icone('x')}</button>
          </div>
        </div>

        <div class="carrossel-folhas">
          ${amostraCarrossel.map((item) => `
            <button
              type="button"
              class="carrossel-item ${item.id === atual.id ? 'ativo' : ''}"
              data-selecionar="${item.id}"
              title="${esc(tituloDiagnostico(item))}">
              <div class="carrossel-midia">${midiaDiagnostico(item)}</div>
            </button>
          `).join('')}
          ${lista.length > 1 ? `
            <button type="button" class="carrossel-seta" data-selecionar="${proximo.id}" title="Próxima análise">
              ${icone('setaDir')}
            </button>
          ` : ''}
        </div>

        <div class="analise-expandida-rodape">
          <div class="analise-resumo">
            <strong>${esc(obterTitulo(atual))}</strong>
            <ul>
              <li><i class="ponto ponto-ok"></i> ${formatarPct(saudavelPct)} área saudável</li>
              <li><i class="ponto ponto-praga"></i> ${formatarPct(atual.grauAfetacao)} área com praga (${esc(rotuloPrincipal(atual))})</li>
            </ul>
            ${atual.pragaPrincipal ? `<p class="suave">${esc(atual.pragaPrincipal.recomendacoesManejo)}</p>` : ''}
          </div>
          <div class="analise-grafico">
            ${graficoComparativo(lista.slice(0, 4), atual.id)}
          </div>
          <div class="analise-lixeira">
            ${lista.length > 1 ? `
              <button type="button" class="btn-icone" data-selecionar="${anterior.id}" title="Análise anterior">${icone('setaEsq')}</button>
            ` : ''}
            <button type="button" class="btn-icone btn-icone-perigo" data-excluir="${atual.id}" title="Excluir análise">
              ${icone('lixeira')}
            </button>
          </div>
        </div>
      </article>
    `;

    container.querySelectorAll('[data-selecionar]').forEach((b) => {
      b.addEventListener('click', () => {
        expandidoId = Number(b.dataset.selecionar);
        desenharPainelExpandido(lista);
      });
    });
    container.querySelectorAll('[data-detalhe]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = diagnosticos.find((x) => x.id === Number(b.dataset.detalhe));
        if (d) abrirModal({ titulo: `${tituloDiagnostico(d)} — Detecções`, tamanho: 'lg', conteudo: cartaoResultado(d) });
      });
    });
    container.querySelector('[data-fechar-exp]')?.addEventListener('click', () => {
      expandidoId = null;
      desenharPainelExpandido(lista);
    });
    container.querySelector('[data-excluir]')?.addEventListener('click', () => excluir(atual.id));
  }

  function desenharGrade() {
    const lista = filtrarEOrdenar();
    desenharPainelExpandido(lista);
    const grade = el.querySelector('#grade-analises');

    if (!lista.length) {
      grade.innerHTML = `<div class="cartao grade-vazia">${estadoVazio('Nenhuma análise encontrada para os filtros selecionados.')}</div>`;
      return;
    }

    grade.innerHTML = lista.map((d) => `
      <article class="cartao card-analise ${d.id === expandidoId ? 'selecionado' : ''}">
        <div class="card-analise-imagem" data-visualizar="${d.id}" role="button" tabindex="0">
          ${midiaDiagnostico(d)}
        </div>
        <div class="card-analise-rodape">
          <div class="card-analise-texto" data-titulo-container="${d.id}">
            <div class="card-analise-titulo-linha">
              <strong class="card-analise-titulo" title="${esc(obterTitulo(d))}">${esc(obterTitulo(d))}</strong>
              <button type="button" class="btn-icone btn-icone-p btn-editar-inline" data-editar-titulo="${d.id}" title="Editar nome da análise" aria-label="Editar nome da análise">
                ${icone('editar')}
              </button>
            </div>
            <small>${esc(rotuloPrincipal(d))} · ${formatarPct(d.grauAfetacao)} afetado · ${esc(formatarData(d.dataAnalise))}</small>
          </div>
          <div class="card-analise-acoes">
            <button type="button" class="btn btn-primario btn-p" data-visualizar="${d.id}">Visualizar</button>
            <button type="button" class="btn-icone btn-icone-perigo" data-excluir="${d.id}" title="Excluir análise" aria-label="Excluir análise">
              ${icone('lixeira')}
            </button>
          </div>
        </div>
      </article>
    `).join('');

    grade.querySelectorAll('[data-visualizar]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = Number(b.dataset.visualizar);
        if (expandidoId === id) {
          const d = diagnosticos.find((x) => x.id === id);
          if (d) abrirModal({ titulo: `${tituloDiagnostico(d)} — Detecções`, tamanho: 'lg', conteudo: cartaoResultado(d) });
        } else {
          expandidoId = id;
          desenharGrade();
          el.querySelector('#painel-expandido')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    });

    grade.querySelectorAll('[data-excluir]').forEach((b) => {
      b.addEventListener('click', () => excluir(Number(b.dataset.excluir)));
    });

    // Ligar botões de edição inline (tanto no painel expandido quanto nos cards)
    el.querySelectorAll('[data-editar-titulo]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.editarTitulo);
        const item = diagnosticos.find((x) => x.id === id);
        if (!item) return;

        const container = btn.closest('[data-titulo-container]');
        if (!container) return;

        const tituloAtual = obterTitulo(item);
        container.innerHTML = `
          <form class="form-edicao-inline" data-form-edicao="${id}">
            <input type="text" class="input-edicao-inline" value="${esc(tituloAtual)}" maxlength="50" required>
            <button type="submit" class="btn-icone btn-icone-salvar" title="Salvar">${icone('check')}</button>
            <button type="button" class="btn-icone btn-icone-cancelar" data-cancelar-edicao title="Cancelar">${icone('x')}</button>
          </form>
        `;

        const form = container.querySelector('form');
        const input = form.querySelector('input');
        input.focus();
        input.select();

        input.addEventListener('keydown', (ke) => {
          if (ke.key === 'Escape') {
            ke.stopPropagation();
            desenharGrade();
          }
        });

        form.addEventListener('submit', (se) => {
          se.preventDefault();
          se.stopPropagation();
          const novo = input.value.trim();
          if (novo) {
            salvarTitulo(id, novo);
            item.tituloPersonalizado = novo;
            toast('Nome da análise atualizado com sucesso.');
          }
          desenharGrade();
        });

        form.querySelector('[data-cancelar-edicao]').addEventListener('click', (ce) => {
          ce.stopPropagation();
          desenharGrade();
        });
      });
    });
  }

  desenharGrade();
}
```

### frontend/js/paginas/catalogo.js

```javascript
// Página Catálogo de Pragas (/catalogo) fiel ao mockup:
// - Círculos seletores no topo
// - Descrição detalhada, sintomas, recomendações de manejo e defensivos indicados da praga selecionada
import { api } from '../api.js';
import { esc, icone, corPraga, estadoCarregando, estadoVazio } from '../ui.js';
import { folhaSVG, deteccoesIlustrativas } from '../componentes.js';

export async function render(el, ctx) {
  el.innerHTML = estadoCarregando('Carregando catálogo de pragas…');
  const { pragas } = await api.listarPragas();

  if (!pragas.length) {
    el.innerHTML = `<section class="cartao">${estadoVazio('Nenhuma praga cadastrada no catálogo.')}</section>`;
    return;
  }

  let selecionadaId = Number(ctx.params.id) || pragas[0].id;
  if (!pragas.some((p) => p.id === selecionadaId)) selecionadaId = pragas[0].id;

  function desenhar() {
    const atual = pragas.find((p) => p.id === selecionadaId) || pragas[0];
    const deteccoes = deteccoesIlustrativas(atual.classeModelo, atual.id * 7);

    el.innerHTML = `
      <section class="cartao catalogo-cartao">
        <div class="cartao-topo">
          <h1 class="cartao-titulo">${icone('livro')} Catálogo de pragas</h1>
          ${ctx.conta?.perfil === 'ADMIN'
            ? `<a href="#/admin" class="btn btn-contorno btn-p">${icone('editar')} Gerenciar no painel</a>`
            : `<a href="#/inicio" class="link-acao">${icone('setaEsq')} Voltar ao início</a>`}
        </div>

        <div class="catalogo-seletores" role="tablist" aria-label="Pragas catalogadas">
          ${pragas.map((p) => {
            const ativo = p.id === atual.id;
            return `
              <button
                type="button"
                role="tab"
                aria-selected="${ativo}"
                class="seletor-praga ${ativo ? 'ativo' : ''}"
                data-praga="${p.id}">
                <span class="seletor-circulo" style="background:${corPraga(p.id)}"></span>
                <span class="seletor-nome">${esc(p.nomePopular)}</span>
              </button>
            `;
          }).join('')}
        </div>

        <article class="catalogo-detalhe">
          <header class="catalogo-detalhe-topo">
            <div>
              <h2>${esc(atual.nomePopular)}</h2>
              <p class="cientifico">${esc(atual.nomeCientifico)} · <span class="chip chip-leve">classe YOLO: ${esc(atual.classeModelo)}</span></p>
            </div>
          </header>

          <p class="catalogo-resumo">${esc(atual.descricao)}</p>

          <div class="catalogo-grade">
            <div class="catalogo-ilustracao">
              ${folhaSVG({ semente: atual.id * 11, deteccoes, largura: 640, altura: 640 })}
              <small class="suave">Representação ilustrativa dos sintomas na folha</small>
            </div>

            <div class="catalogo-blocos">
              <div class="catalogo-bloco">
                <h3>${icone('alerta')} Sintomas característicos</h3>
                <p>${esc(atual.sintomas)}</p>
              </div>
              <div class="catalogo-bloco">
                <h3>${icone('folha')} Recomendações de manejo</h3>
                <p>${esc(atual.recomendacoesManejo)}</p>
              </div>
              <div class="catalogo-bloco">
                <h3>${icone('escudo')} Defensivos indicados</h3>
                <p>${esc(atual.defensivosIndicados)}</p>
              </div>
            </div>
          </div>
        </article>
      </section>
    `;

    el.querySelectorAll('[data-praga]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selecionadaId = Number(btn.dataset.praga);
        history.replaceState(null, '', `#/catalogo?id=${selecionadaId}`);
        desenhar();
      });
    });
  }

  desenhar();
}
```

### frontend/js/paginas/admin.js

```javascript
// Painel Administrativo (/admin) fiel às Telas 7 e 8 do mockup:
// 1. Visão geral: 4 KPIs + gráfico de barras "Volume de análises" (Mensal / Semanal)
// 2. Gestão de usuários (persistidos no SQLite): tabela paginada, criar, editar, bloquear/ativar e excluir
// 3. Catálogo de pragas: lista com sintomas, manejo e defensivos + criar, editar e remover
import { api } from '../api.js';
import {
  AREAS, esc, icone, corPraga, corAvatar, iniciais,
  formatarData, formatarPct, campo, campoSenha, campoSelect, campoTexto,
  ligarOlhos, valoresFormulario, botaoCarregando, mostrarErroForm,
  abrirModal, confirmar, toast, estadoCarregando,
} from '../ui.js';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const POR_PAGINA = 5;

export async function render(el, ctx) {
  el.innerHTML = estadoCarregando('Carregando painel administrativo…');
  let [estatisticas, { usuarios }, { pragas }] = await Promise.all([
    api.estatisticas(),
    api.listarUsuarios(),
    api.listarPragas(),
  ]);

  let modoGrafico = 'mensal';
  let paginaUsuarios = 1;
  let buscaUsuario = '';

  async function recarregar() {
    [estatisticas, { usuarios }, { pragas }] = await Promise.all([
      api.estatisticas(),
      api.listarUsuarios(),
      api.listarPragas(),
    ]);
    desenhar();
  }

  function serieGrafico() {
    if (modoGrafico === 'semanal') {
      return estatisticas.serieSemanal.map((s) => ({
        rotulo: s.inicio.slice(5).split('-').reverse().join('/'),
        valor: s.total,
      }));
    }
    return estatisticas.serieMensal.map((m) => ({
      rotulo: MESES[(m.mes - 1 + 12) % 12],
      valor: m.total,
    }));
  }

  function desenhar() {
    const serie = serieGrafico();
    const maior = Math.max(1, ...serie.map((s) => s.valor));

    const usuariosFiltrados = usuarios.filter((u) => {
      if (!buscaUsuario.trim()) return true;
      const t = buscaUsuario.toLowerCase();
      const agro = u.perfilAgricola || {};
      return `${u.nome} ${u.email} ${u.perfil} ${agro.propriedade || ''} ${agro.regiao || ''}`.toLowerCase().includes(t);
    });
    const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / POR_PAGINA));
    if (paginaUsuarios > totalPaginas) paginaUsuarios = totalPaginas;
    const inicio = (paginaUsuarios - 1) * POR_PAGINA;
    const paginaLista = usuariosFiltrados.slice(inicio, inicio + POR_PAGINA);

    el.innerHTML = `
      <!-- 1. VISÃO GERAL -->
      <section class="cartao admin-secao">
        <header class="secao-topo">
          <div>
            <h1 class="cartao-titulo">${icone('grafico')} Visão geral</h1>
            <p class="suave">Resumo das análises e contas do sistema</p>
          </div>
        </header>

        <div class="kpis-grade">
          <article class="kpi-card">
            <div class="kpi-topo">
              <span class="kpi-icone">${icone('atividade')}</span>
              <span class="chip chip-ok">+12% este mês</span>
            </div>
            <small class="suave">Total de análises realizadas</small>
            <strong class="kpi-valor">${esc(estatisticas.totalAnalises)}</strong>
            <span class="kpi-sub">${esc(estatisticas.analisesComPraga)} com praga identificada</span>
          </article>

          <article class="kpi-card">
            <div class="kpi-topo">
              <span class="kpi-icone">${icone('usuarios')}</span>
              <span class="chip chip-leve">SQLite</span>
            </div>
            <small class="suave">Usuários ativos / total</small>
            <strong class="kpi-valor">${esc(estatisticas.usuarios.ativos)}/${esc(estatisticas.usuarios.total)}</strong>
            <span class="kpi-sub">${esc(estatisticas.usuarios.produtores)} produtores · ${esc(estatisticas.usuarios.administradores)} admins</span>
          </article>

          <article class="kpi-card">
            <div class="kpi-topo">
              <span class="kpi-icone">${icone('inseto')}</span>
            </div>
            <small class="suave">Praga mais recorrente</small>
            <strong class="kpi-valor kpi-texto">${esc(estatisticas.pragaMaisComum || 'Nenhuma')}</strong>
            <span class="kpi-sub">${esc(pragas.length)} pragas no catálogo</span>
          </article>

          <article class="kpi-card">
            <div class="kpi-topo">
              <span class="kpi-icone">${icone('percentual')}</span>
            </div>
            <small class="suave">Taxa de detecção de pragas</small>
            <strong class="kpi-valor">${formatarPct(estatisticas.taxaDeteccao)}</strong>
            <span class="kpi-sub">Grau médio: ${formatarPct(estatisticas.grauMedio)}</span>
          </article>
        </div>

        <div class="grafico-bloco">
          <div class="grafico-topo">
            <div>
              <h2>Volume de análises</h2>
              <small class="suave">Distribuição temporal dos diagnósticos realizados</small>
            </div>
            <div class="alternador-pilula">
              <button type="button" class="${modoGrafico === 'mensal' ? 'ativo' : ''}" data-modo="mensal">Mensal</button>
              <button type="button" class="${modoGrafico === 'semanal' ? 'ativo' : ''}" data-modo="semanal">Semanal</button>
            </div>
          </div>

          <div class="grafico-barras">
            ${serie.map((item, idx) => {
              const altura = Math.max(8, Math.round((item.valor / maior) * 100));
              const destaque = idx === serie.length - 1;
              return `
                <div class="barra-coluna ${destaque ? 'destaque' : ''}" title="${esc(item.rotulo)}: ${esc(item.valor)} análise(s)">
                  <span class="barra-num">${esc(item.valor)}</span>
                  <div class="barra-trilho">
                    <span class="barra-preenchimento" style="height:${altura}%"></span>
                  </div>
                  <small class="barra-rotulo">${esc(item.rotulo)}</small>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </section>

      <!-- 2. GESTÃO DE USUÁRIOS (SQLite) -->
      <section class="cartao admin-secao">
        <header class="secao-topo">
          <div>
            <h2 class="cartao-titulo">${icone('usuarios')} Gestão de usuários</h2>
            <p class="suave">Contas persistidas no banco de dados SQLite (dados/bioscan.db)</p>
          </div>
          <div class="secao-topo-acoes">
            <label class="busca-pilula">
              ${icone('busca')}
              <input type="search" id="busca-usuario" value="${esc(buscaUsuario)}" placeholder="Filtrar usuário…">
            </label>
            <button type="button" class="btn btn-primario" id="btn-novo-usuario">
              ${icone('mais')} Adicionar novo usuário
            </button>
          </div>
        </header>

        <div class="tabela-wrap">
          <table class="tabela">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Propriedade / Região</th>
                <th>Cadastro</th>
                <th>Status</th>
                <th class="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${paginaLista.map((u) => {
                const agro = u.perfilAgricola || {};
                const propTexto = u.perfil === 'ADMIN'
                  ? 'Administração do sistema'
                  : [agro.propriedade, agro.regiao].filter(Boolean).join(' · ') || '—';
                const ehProprio = u.id === ctx.conta.id;
                return `
                  <tr>
                    <td>
                      <div class="celula-usuario">
                        <span class="avatar" style="background:${corAvatar(u.nome)}">${iniciais(u.nome)}</span>
                        <div>
                          <strong>${esc(u.nome)} ${ehProprio ? '<small class="suave">(você)</small>' : ''}</strong>
                          <small>${esc(u.email)}</small>
                        </div>
                      </div>
                    </td>
                    <td>${u.perfil === 'ADMIN' ? 'Administrador' : 'Produtor rural'}</td>
                    <td>${esc(propTexto)}</td>
                    <td>${esc(formatarData(u.dataCadastro))}</td>
                    <td>
                      <span class="chip ${u.ativo ? 'chip-ok' : 'chip-severo'}">
                        ${u.ativo ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td class="col-acoes">
                      <div class="acoes-linha">
                        <button type="button" class="btn-quadrado" data-editar-usuario="${u.id}" title="Editar usuário">
                          ${icone('editar')}
                        </button>
                        <button
                          type="button"
                          class="btn-quadrado ${u.ativo ? 'btn-quadrado-alerta' : 'btn-quadrado-ok'}"
                          data-status-usuario="${u.id}"
                          ${ehProprio ? 'disabled title="Você não pode bloquear sua própria conta"' : `title="${u.ativo ? 'Bloquear conta' : 'Ativar conta'}"`}>
                          ${icone(u.ativo ? 'bloquear' : 'desbloquear')}
                        </button>
                        <button
                          type="button"
                          class="btn-quadrado btn-quadrado-perigo"
                          data-excluir-usuario="${u.id}"
                          ${ehProprio ? 'disabled title="Você não pode excluir sua própria conta"' : 'title="Excluir conta"'}>
                          ${icone('lixeira')}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <footer class="tabela-rodape">
          <small class="suave">
            Mostrando ${usuariosFiltrados.length ? inicio + 1 : 0}–${Math.min(inicio + POR_PAGINA, usuariosFiltrados.length)} de ${usuariosFiltrados.length} conta(s)
          </small>
          <div class="paginacao">
            ${Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => `
              <button type="button" class="pagina-btn ${p === paginaUsuarios ? 'ativo' : ''}" data-pagina="${p}">${p}</button>
            `).join('')}
          </div>
        </footer>
      </section>

      <!-- 3. CATÁLOGO DE PRAGAS -->
      <section class="cartao admin-secao">
        <header class="secao-topo">
          <div>
            <h2 class="cartao-titulo">${icone('livro')} Catálogo de pragas</h2>
            <p class="suave">Gerencie as pragas e doenças associadas às classes do modelo YOLO</p>
          </div>
          <button type="button" class="btn btn-primario" id="btn-nova-praga">
            ${icone('mais')} Adicionar nova praga
          </button>
        </header>

        <div class="lista-pragas-admin">
          ${pragas.map((p) => `
            <article class="praga-admin-item">
              <div class="praga-admin-ident">
                <span class="praga-bolinha-g" style="background:${corPraga(p.id)}"></span>
                <div>
                  <h3>${esc(p.nomePopular)}</h3>
                  <em class="suave">${esc(p.nomeCientifico)}</em>
                  <div><span class="chip chip-leve">${esc(p.classeModelo)}</span></div>
                </div>
              </div>
              <div class="praga-admin-col">
                <strong>Sintomas</strong>
                <p>${esc(p.sintomas)}</p>
              </div>
              <div class="praga-admin-col">
                <strong>Manejo e controle</strong>
                <p>${esc(p.recomendacoesManejo)}</p>
              </div>
              <div class="praga-admin-acoes">
                <button type="button" class="btn btn-contorno btn-p" data-editar-praga="${p.id}">Editar</button>
                <button type="button" class="btn btn-perigo-contorno btn-p" data-excluir-praga="${p.id}">Remover</button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;

    // Eventos gráfico
    el.querySelectorAll('[data-modo]').forEach((b) => {
      b.addEventListener('click', () => {
        modoGrafico = b.dataset.modo;
        desenhar();
      });
    });

    // Eventos filtro e paginação de usuários
    const inputBusca = el.querySelector('#busca-usuario');
    inputBusca.addEventListener('input', (e) => {
      buscaUsuario = e.target.value;
      paginaUsuarios = 1;
      desenhar();
      const novo = el.querySelector('#busca-usuario');
      novo.focus();
      novo.setSelectionRange(buscaUsuario.length, buscaUsuario.length);
    });

    el.querySelectorAll('[data-pagina]').forEach((b) => {
      b.addEventListener('click', () => {
        paginaUsuarios = Number(b.dataset.pagina);
        desenhar();
      });
    });

    // Eventos CRUD usuários
    el.querySelector('#btn-novo-usuario').addEventListener('click', () => abrirModalUsuario(null, recarregar));
    el.querySelectorAll('[data-editar-usuario]').forEach((b) => {
      b.addEventListener('click', () => {
        const u = usuarios.find((x) => x.id === Number(b.dataset.editarUsuario));
        if (u) abrirModalUsuario(u, recarregar);
      });
    });
    el.querySelectorAll('[data-status-usuario]').forEach((b) => {
      b.addEventListener('click', async () => {
        const u = usuarios.find((x) => x.id === Number(b.dataset.statusUsuario));
        if (!u) return;
        try {
          await api.alterarStatusUsuario(u.id, !u.ativo);
          toast(u.ativo ? `Conta de ${u.nome} bloqueada.` : `Conta de ${u.nome} reativada.`);
          await recarregar();
        } catch (erro) {
          toast(erro.message, 'erro');
        }
      });
    });
    el.querySelectorAll('[data-excluir-usuario]').forEach((b) => {
      b.addEventListener('click', async () => {
        const u = usuarios.find((x) => x.id === Number(b.dataset.excluirUsuario));
        if (!u) return;
        const ok = await confirmar({
          titulo: 'Excluir usuário',
          mensagem: `Tem certeza de que deseja remover permanentemente a conta de "${u.nome}" (${u.email}) do banco SQLite?`,
          textoConfirmar: 'Excluir conta',
          perigo: true,
        });
        if (!ok) return;
        try {
          await api.excluirUsuario(u.id);
          toast('Conta excluída com sucesso.');
          await recarregar();
        } catch (erro) {
          toast(erro.message, 'erro');
        }
      });
    });

    // Eventos CRUD pragas
    el.querySelector('#btn-nova-praga').addEventListener('click', () => abrirModalPraga(null, recarregar));
    el.querySelectorAll('[data-editar-praga]').forEach((b) => {
      b.addEventListener('click', () => {
        const p = pragas.find((x) => x.id === Number(b.dataset.editarPraga));
        if (p) abrirModalPraga(p, recarregar);
      });
    });
    el.querySelectorAll('[data-excluir-praga]').forEach((b) => {
      b.addEventListener('click', async () => {
        const p = pragas.find((x) => x.id === Number(b.dataset.excluirPraga));
        if (!p) return;
        const ok = await confirmar({
          titulo: 'Remover praga',
          mensagem: `Deseja remover "${p.nomePopular}" do catálogo?`,
          textoConfirmar: 'Remover',
          perigo: true,
        });
        if (!ok) return;
        try {
          await api.excluirPraga(p.id);
          toast('Praga removida do catálogo.');
          await recarregar();
        } catch (erro) {
          toast(erro.message, 'erro');
        }
      });
    });
  }

  desenhar();
}

function abrirModalUsuario(usuario, aoSalvar) {
  const editando = Boolean(usuario);
  const agro = usuario?.perfilAgricola || {};
  const modal = abrirModal({
    titulo: editando ? `Editar conta — ${usuario.nome}` : 'Adicionar novo usuário (SQLite)',
    tamanho: 'md',
    conteudo: `
      <form id="form-usuario-admin" class="form-pilha" novalidate>
        <div class="form-erro" hidden></div>
        <div class="grade-campos-2">
          ${campo({ rotulo: 'Nome completo', nome: 'nome', valor: usuario?.nome || '' })}
          ${campo({
            rotulo: 'E-mail',
            nome: 'email',
            tipo: 'email',
            valor: usuario?.email || '',
            extra: editando ? 'readonly disabled' : '',
          })}
          ${!editando ? `
            ${campoSenha({ rotulo: 'Senha inicial', nome: 'senha', placeholder: 'Mínimo 6 caracteres', autocomplete: 'new-password' })}
            <label class="campo">
              <span class="campo-rotulo">Perfil da conta</span>
              <select class="entrada" name="perfil" id="select-perfil-modal">
                <option value="PRODUTOR">Produtor rural</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>
          ` : ''}
        </div>

        <div id="bloco-agro-modal" ${usuario?.perfil === 'ADMIN' ? 'hidden' : ''}>
          <h4 class="subtitulo">Dados do perfil agrícola</h4>
          <div class="grade-campos-2">
            ${campo({ rotulo: 'Propriedade', nome: 'propriedade', valor: agro.propriedade || '' })}
            ${campo({ rotulo: 'Telefone', nome: 'telefone', valor: agro.telefone || '' })}
            ${campo({ rotulo: 'Região / Município', nome: 'regiao', valor: agro.regiao || '' })}
            ${campoSelect({ rotulo: 'Tamanho da área', nome: 'area', opcoes: AREAS, valor: agro.area || '' })}
          </div>
        </div>

        <div class="acoes-modal">
          <button type="button" class="btn btn-contorno" data-cancelar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${editando ? 'Salvar alterações' : 'Criar usuário'}</button>
        </div>
      </form>
    `,
  });

  const form = modal.corpo.querySelector('#form-usuario-admin');
  ligarOlhos(form);
  modal.corpo.querySelector('[data-cancelar]').addEventListener('click', () => modal.fechar());

  const selectPerfil = form.querySelector('#select-perfil-modal');
  if (selectPerfil) {
    selectPerfil.addEventListener('change', () => {
      form.querySelector('#bloco-agro-modal').hidden = selectPerfil.value === 'ADMIN';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarErroForm(form, '');
    const d = valoresFormulario(form);
    const btn = form.querySelector('[type="submit"]');
    botaoCarregando(btn, true, 'Salvando…');
    try {
      const perfilAgricola = {
        propriedade: d.propriedade,
        telefone: d.telefone,
        regiao: d.regiao,
        area: d.area,
      };
      if (editando) {
        await api.editarUsuario(usuario.id, { nome: d.nome, perfilAgricola });
        toast('Usuário atualizado com sucesso!');
      } else {
        await api.criarUsuario({
          nome: d.nome,
          email: d.email,
          senha: d.senha,
          perfil: d.perfil,
          perfilAgricola,
        });
        toast('Novo usuário cadastrado no SQLite!');
      }
      modal.fechar();
      await aoSalvar();
    } catch (erro) {
      mostrarErroForm(form, erro.message);
    } finally {
      botaoCarregando(btn, false);
    }
  });
}

function abrirModalPraga(praga, aoSalvar) {
  const editando = Boolean(praga);
  const modal = abrirModal({
    titulo: editando ? `Editar praga — ${praga.nomePopular}` : 'Adicionar nova praga ao catálogo',
    tamanho: 'md',
    conteudo: `
      <form id="form-praga-admin" class="form-pilha" novalidate>
        <div class="form-erro" hidden></div>
        <div class="grade-campos-2">
          ${campo({ rotulo: 'Nome popular', nome: 'nomePopular', valor: praga?.nomePopular || '', placeholder: 'Ex.: Ferrugem' })}
          ${campo({ rotulo: 'Nome científico', nome: 'nomeCientifico', valor: praga?.nomeCientifico || '', placeholder: 'Ex.: Hemileia vastatrix' })}
        </div>
        ${campo({
          rotulo: 'Classe do modelo YOLO (label)',
          nome: 'classeModelo',
          valor: praga?.classeModelo || '',
          placeholder: 'Ex.: rust, cercospora, leaf_miner',
          extra: editando ? 'readonly disabled' : '',
          dica: editando ? 'A classe do modelo é a chave imutável na entidade Praga.' : 'Rótulo retornado pelo modelo de visão computacional.',
        })}
        ${campoTexto({ rotulo: 'Descrição geral', nome: 'descricao', valor: praga?.descricao || '', linhas: 2 })}
        ${campoTexto({ rotulo: 'Sintomas na planta', nome: 'sintomas', valor: praga?.sintomas || '', linhas: 2 })}
        ${campoTexto({ rotulo: 'Recomendações de manejo', nome: 'recomendacoesManejo', valor: praga?.recomendacoesManejo || '', linhas: 2 })}
        ${campoTexto({ rotulo: 'Defensivos indicados', nome: 'defensivosIndicados', valor: praga?.defensivosIndicados || '', linhas: 2 })}
        <div class="acoes-modal">
          <button type="button" class="btn btn-contorno" data-cancelar>Cancelar</button>
          <button type="submit" class="btn btn-primario">${editando ? 'Salvar alterações' : 'Adicionar praga'}</button>
        </div>
      </form>
    `,
  });

  const form = modal.corpo.querySelector('#form-praga-admin');
  modal.corpo.querySelector('[data-cancelar]').addEventListener('click', () => modal.fechar());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarErroForm(form, '');
    const d = valoresFormulario(form);
    const btn = form.querySelector('[type="submit"]');
    botaoCarregando(btn, true, 'Salvando…');
    try {
      if (editando) {
        await api.atualizarPraga(praga.id, d);
        toast('Praga atualizada!');
      } else {
        await api.criarPraga(d);
        toast('Nova praga adicionada ao catálogo!');
      }
      modal.fechar();
      await aoSalvar();
    } catch (erro) {
      mostrarErroForm(form, erro.message);
    } finally {
      botaoCarregando(btn, false);
    }
  });
}
```

### frontend/js/ui.js

```javascript
// Utilitários de interface: escape de HTML, ícones, campos, modais e toasts.
 
export const AREAS = ['Até 10 ha', '10 a 50 ha', '50 a 200 ha', '200 a 1000 ha', 'Acima de 1000 ha'];
export const CORES_PRAGA = ['#1F3D12', '#8A9A78', '#5B8A3C', '#7A4A23', '#B08A2E', '#3E6B5A', '#A35D3D'];

export function corPraga(id) {
  return CORES_PRAGA[(Number(id) - 1 + CORES_PRAGA.length) % CORES_PRAGA.length];
}

export function esc(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const ICONES = {
  logo: '<circle cx="12" cy="12" r="10"/><path d="M7.5 16.5c0-5.5 3.5-9 9.5-9 0 6-3.4 9.5-8.5 9.5"/><path d="M7.5 16.5 12 12"/>',
  folha: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  nuvem: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>',
  historico: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
  livro: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 7h6"/>',
  inseto: '<path d="m8 2 1.9 1.9M14.1 3.9 16 2M9 7.1v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9M6.5 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M21 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  filtro: '<path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/>',
  ordenar: '<path d="M3 6h18M6 12h12M10 18h4"/>',
  lixeira: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M9.9 4.2A9 9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M17.9 17.9A10 10 0 0 1 12 20c-6.5 0-10-8-10-8a18 18 0 0 1 5.1-5.9"/><path d="m2 2 20 20"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  setaDir: '<path d="m9 18 6-6-6-6"/>',
  setaEsq: '<path d="m15 18-6-6 6-6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  grafico: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-8"/>',
  cadeado: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  bloquear: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  desbloquear: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  atividade: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  imagem: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  percentual: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
};

export function icone(nome, classe = '') {
  return `<svg class="icone ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
}

// ------------------------------------------------------------------ formatação
const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtMesAno = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

export const formatarData = (iso) => fmtData.format(new Date(iso));
export const formatarDataHora = (iso) => fmtDataHora.format(new Date(iso));
export const formatarMesAno = (iso) => fmtMesAno.format(new Date(iso));
export const formatarPct = (valor, casas = 1) => `${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

export function iniciais(nome) {
  const partes = String(nome || '?').trim().split(/\s+/);
  return esc(((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase());
}

export function corAvatar(texto) {
  const cores = ['#527A33', '#2F4A1C', '#8A9A78', '#7A4A23', '#B08A2E', '#3E6B5A'];
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
}

// ------------------------------------------------------------------ campos de formulário
export function campo({ rotulo, nome, tipo = 'text', valor = '', placeholder = '', autocomplete = 'off', extra = '', dica = '' }) {
  return `
    <label class="campo">
      <span class="campo-rotulo">${esc(rotulo)}</span>
      <input class="entrada" type="${tipo}" name="${nome}" value="${esc(valor)}" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}" ${extra}>
      ${dica ? `<small class="campo-dica">${esc(dica)}</small>` : ''}
    </label>`;
}

export function campoSenha({ rotulo, nome, placeholder = '', autocomplete = 'current-password' }) {
  return `
    <label class="campo">
      <span class="campo-rotulo">${esc(rotulo)}</span>
      <span class="entrada-senha">
        <input class="entrada" type="password" name="${nome}" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}">
        <button type="button" class="btn-olho" data-olho aria-label="Mostrar senha">${icone('olho')}</button>
      </span>
    </label>`;
}

export function campoSelect({ rotulo, nome, opcoes, valor = '', placeholder = 'Selecione' }) {
  const lista = valor && !opcoes.includes(valor) ? [...opcoes, valor] : opcoes;
  return `
    <label class="campo">
      <span class="campo-rotulo">${esc(rotulo)}</span>
      <select class="entrada" name="${nome}">
        <option value="">${esc(placeholder)}</option>
        ${lista.map((o) => `<option value="${esc(o)}" ${o === valor ? 'selected' : ''}>${esc(o)}</option>`).join('')}
      </select>
    </label>`;
}

export function campoTexto({ rotulo, nome, valor = '', placeholder = '', linhas = 3 }) {
  return `
    <label class="campo">
      <span class="campo-rotulo">${esc(rotulo)}</span>
      <textarea class="entrada" name="${nome}" rows="${linhas}" placeholder="${esc(placeholder)}">${esc(valor)}</textarea>
    </label>`;
}

export function ligarOlhos(raiz) {
  raiz.querySelectorAll('[data-olho]').forEach((botao) => {
    botao.addEventListener('click', () => {
      const entrada = botao.previousElementSibling;
      const mostrar = entrada.type === 'password';
      entrada.type = mostrar ? 'text' : 'password';
      botao.innerHTML = icone(mostrar ? 'olhoFechado' : 'olho');
      botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    });
  });
}

export function valoresFormulario(form) {
  return Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
}

export function botaoCarregando(botao, carregando, texto = 'Aguarde…') {
  if (!botao) return;
  if (carregando) {
    botao.dataset.textoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = `<span class="spinner spinner-p"></span> ${esc(texto)}`;
  } else if (botao.dataset.textoOriginal !== undefined) {
    botao.disabled = false;
    botao.innerHTML = botao.dataset.textoOriginal;
    delete botao.dataset.textoOriginal;
  }
}

export function mostrarErroForm(form, mensagem) {
  const alvo = form.querySelector('.form-erro');
  if (!alvo) return;
  alvo.hidden = !mensagem;
  alvo.innerHTML = mensagem ? `${icone('alerta')} <span>${esc(mensagem)}</span>` : '';
}

// ------------------------------------------------------------------ estados
export const estadoCarregando = (texto = 'Carregando…') => `<div class="estado"><span class="spinner"></span><p>${esc(texto)}</p></div>`;
export const estadoVazio = (texto, iconeNome = 'folha') => `<div class="estado estado-vazio">${icone(iconeNome)}<p>${esc(texto)}</p></div>`;
export const estadoErro = (texto) => `<div class="estado estado-erro">${icone('alerta')}<p>${esc(texto)}</p></div>`;

// ------------------------------------------------------------------ toasts
export function toast(mensagem, tipo = 'sucesso') {
  const area = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `${icone(tipo === 'erro' ? 'alerta' : tipo === 'info' ? 'info' : 'check')}<span>${esc(mensagem)}</span>`;
  area.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visivel'));
  setTimeout(() => {
    el.classList.remove('visivel');
    setTimeout(() => el.remove(), 300);
  }, 3800);
}

// ------------------------------------------------------------------ modais
export function abrirModal({ titulo, conteudo, tamanho = 'md', aoFechar }) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal modal-${tamanho}" role="dialog" aria-modal="true">
      <header class="modal-topo">
        <h2 class="modal-titulo">${esc(titulo)}</h2>
        <button type="button" class="btn-icone" data-fechar aria-label="Fechar">${icone('x')}</button>
      </header>
      <div class="modal-corpo">${conteudo}</div>
    </div>`;
  document.body.appendChild(fundo);
  document.body.classList.add('sem-rolagem');

  const tecla = (e) => {
    if (e.key === 'Escape' && [...document.querySelectorAll('.modal-fundo')].pop() === fundo) fechar();
  };
  function fechar() {
    if (!fundo.isConnected) return;
    fundo.remove();
    document.removeEventListener('keydown', tecla);
    if (!document.querySelector('.modal-fundo')) document.body.classList.remove('sem-rolagem');
    aoFechar?.();
  }
  document.addEventListener('keydown', tecla);
  fundo.addEventListener('mousedown', (e) => { if (e.target === fundo) fechar(); });
  fundo.querySelector('[data-fechar]').addEventListener('click', fechar);
  requestAnimationFrame(() => fundo.classList.add('aberto'));

  return {
    elemento: fundo.querySelector('.modal'),
    corpo: fundo.querySelector('.modal-corpo'),
    definirTitulo: (t) => { fundo.querySelector('.modal-titulo').textContent = t; },
    fechar,
  };
}

export function fecharTodosModais() {
  document.querySelectorAll('.modal-fundo').forEach((m) => m.remove());
  document.body.classList.remove('sem-rolagem');
}

export function confirmar({ titulo = 'Confirmar', mensagem, textoConfirmar = 'Confirmar', perigo = false }) {
  return new Promise((resolver) => {
    let resposta = false;
    const modal = abrirModal({
      titulo,
      tamanho: 'sm',
      aoFechar: () => resolver(resposta),
      conteudo: `
        <p class="confirmar-texto">${esc(mensagem)}</p>
        <div class="acoes-modal">
          <button type="button" class="btn btn-contorno" data-cancelar>Cancelar</button>
          <button type="button" class="btn ${perigo ? 'btn-perigo' : 'btn-primario'}" data-ok>${esc(textoConfirmar)}</button>
        </div>`,
    });
    modal.corpo.querySelector('[data-cancelar]').onclick = () => modal.fechar();
    modal.corpo.querySelector('[data-ok]').onclick = () => { resposta = true; modal.fechar(); };
    modal.corpo.querySelector('[data-ok]').focus();
  });
}
```

## 6. Scripts de IA / Visão Computacional

- **Arquivos de pesos encontrados (`.pt`, `.onnx`, etc.):** **nenhum** arquivo de peso treinado, notebook (`.ipynb`) ou script de inferência/pré-processamento real existe no repositório até o momento.
- **Implementação atual (Mock):** a camada de visão computacional está isolada atrás da porta `IModeloDeteccao` (`backend/negocio/interfaces.py`), atualmente implementada por `backend/infraestrutura/ModeloYoloMock.py`, que gera bounding boxes sintéticas determinísticas a partir do hash SHA-256 da string `imagem`, usando as classes `"healthy"`, `"rust"`, `"cercospora"`, `"leaf_miner"` e `"phoma"`.

### backend/infraestrutura/ModeloYoloMock.py

```python
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
```

## 7. Diagnóstico do Fluxo Atual

1. No frontend (`frontend/js/paginas/inicio.js`), ao anexar/arrastar uma imagem no `<input id="input-imagem">` (ou clicar no botão de amostra mock), `lerArquivoComoDataUrl` redimensiona a imagem via `<canvas>` para até 900px, gera um Data URL JPEG base64 (`quality: 0.88`) e chama `api.criarDiagnostico(imagem, largura, altura)`.
2. O cliente (`frontend/js/api.js`) envia `POST /api/diagnosticos` com corpo JSON (`{ imagem, largura, altura }`) e header `Authorization: Bearer <token>` ao `ThreadingHTTPServer` (`backend/apresentacao/servidor.py`, limite de 12 MB), que despacha para `ApiBioscan.criarDiagnostico`.
3. O servidor autentica o token nas tabelas `sessoes`/`contas` do SQLite (`dados/bioscan.db`) via `ServicoAutenticacao.contaDaSessao` e executa `ServicoDiagnostico.realizarDiagnostico`, que exige perfil `PRODUTOR` e valida prefixo Data URL e dimensões (16–8000 px).
4. **Onde está o Mock de IA / onde plugar a YOLO:** `ServicoDiagnostico` invoca `self._modelo.detectar(url, larguraPx, alturaPx)`, hoje ligado a `ModeloYoloMock` (injetado em `main.py`), que não decodifica a imagem e gera detecções determinísticas por hash SHA-256.
5. Para integrar o modelo `.pt`, basta implementar uma nova classe `IModeloDeteccao` (decodificando o base64, executando inferência YOLO e retornando `list[ResultadoDeteccaoBruto]` em coordenadas de pixel `x1, y1, x2, y2`) e trocá-la em `main.py`, alinhando os rótulos das classes com `Praga.classeModelo` e `"healthy"`.
6. Em seguida, `ServicoDiagnostico` descarta detecções com `confianca < 0.5`, associa classes não saudáveis ao catálogo via `Praga.corresponde()`, calcula `grauAfetacao` (`area_afetada / area_total * 100`) e salva via `IRepositorioDiagnostico.salvar`.
7. **Lacuna crítica no SQLite:** hoje **diagnósticos e pragas não são gravados no SQLite** (`dados/bioscan.db` persiste apenas `contas` e `sessoes`); `RepositorioDiagnosticoMemoria` e `RepositorioPragaMemoria` armazenam tudo em RAM e perdem os dados ao reiniciar o servidor.
8. Por fim, o backend devolve HTTP `201` com o JSON serializado (`serializadores.diagnostico`) e o frontend renderiza o laudo com bounding boxes percentuais (`componentes.js`), executando `DELETE /api/diagnosticos/{id}` (exclusão lógica) caso o usuário descarte/feche sem salvar no histórico.