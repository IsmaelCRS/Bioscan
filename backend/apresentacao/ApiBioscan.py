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
