<<<<<<< Updated upstream
j = "ismael é foda"
print(j)
=======
"""Ponto de entrada do Bioscan.

Monta as dependências (injeção manual) respeitando a arquitetura em camadas:
infraestrutura -> negócio -> apresentação, e sobe o servidor HTTP.

Uso:
    python main.py                       # http://localhost:8000
    python main.py --porta 9000
    python main.py --resetar-banco       # recria o banco com os funcionários de teste
    python main.py --mock                # força o modelo simulado (sem PyTorch/Ultralytics)
    python main.py --modelo outro.pt     # usa outro arquivo de pesos YOLO
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
from backend.negocio.interfaces import IModeloDeteccao

RAIZ: Path = Path(__file__).resolve().parent
CAMINHO_BANCO: Path = RAIZ / "dados" / "bioscan.db"
CAMINHO_MODELO_PADRAO: Path = RAIZ / "modelos" / "best.pt"
PASTA_FRONTEND: Path = RAIZ / "frontend"


def criarModelo(caminhoModelo: Path = CAMINHO_MODELO_PADRAO, usarMock: bool = False) -> IModeloDeteccao:
    """Usa o YOLO real quando possível; caso contrário cai para o mock com aviso claro."""
    if usarMock:
        print("  [YOLO] Modo --mock: usando ModeloYoloMock (detecções simuladas).")
        return ModeloYoloMock()
    if not caminhoModelo.is_file():
        print(f"  [YOLO] AVISO: pesos não encontrados em {caminhoModelo}. Usando ModeloYoloMock (simulado).")
        return ModeloYoloMock()
    try:
        from backend.infraestrutura.ModeloYoloReal import ModeloYoloReal

        modelo = ModeloYoloReal(caminhoModelo)
    except ImportError as erro:
        print(f"  [YOLO] AVISO: dependências ausentes ({erro.name}). Instale com 'pip install -r requirements.txt'.")
        print("  [YOLO] Usando ModeloYoloMock (detecções simuladas).")
        return ModeloYoloMock()
    except Exception as erro:  # noqa: BLE001 - nunca impedir o servidor de subir por causa do modelo
        print(f"  [YOLO] AVISO: falha ao carregar {caminhoModelo}: {erro}. Usando ModeloYoloMock (simulado).")
        return ModeloYoloMock()
    print(f"  [YOLO] Modelo real carregado: {caminhoModelo.name} (task={modelo.tarefa}, classes={modelo.nomes})")
    return modelo


def montarAplicacao(
    caminhoBanco: Path = CAMINHO_BANCO,
    caminhoModelo: Path = CAMINHO_MODELO_PADRAO,
    usarMock: bool = False,
) -> ApiBioscan:
    # Infraestrutura
    banco = BancoSQLite(caminhoBanco)
    repositorioConta = RepositorioContaSQLite(banco)
    repositorioSessao = RepositorioSessaoSQLite(banco)
    repositorioPraga = RepositorioPragaMemoria()
    repositorioDiagnostico = RepositorioDiagnosticoMemoria()
    geradorHash = GeradorHashPBKDF2()
    modelo = criarModelo(caminhoModelo, usarMock)

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
    parser.add_argument("--modelo", type=Path, default=CAMINHO_MODELO_PADRAO, help="caminho dos pesos YOLO (.pt)")
    parser.add_argument("--mock", action="store_true", help="força o ModeloYoloMock (sem PyTorch/Ultralytics)")
    args = parser.parse_args()

    if args.resetar_banco:
        for sufixo in ("", "-wal", "-shm"):
            Path(f"{CAMINHO_BANCO}{sufixo}").unlink(missing_ok=True)
        print("  Banco de dados removido.")

    api = montarAplicacao(CAMINHO_BANCO, args.modelo, args.mock)
    iniciarServidor(api, PASTA_FRONTEND, args.host, args.porta)


if __name__ == "__main__":
    main()
>>>>>>> Stashed changes
