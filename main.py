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
