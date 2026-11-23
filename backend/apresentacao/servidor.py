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
