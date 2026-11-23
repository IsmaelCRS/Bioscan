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
