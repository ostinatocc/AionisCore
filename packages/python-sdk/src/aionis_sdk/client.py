from __future__ import annotations

import json
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional
from urllib import error, request


class AionisApiError(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        details: Any = None,
        request_id: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.details = details
        self.request_id = request_id


class AionisNetworkError(Exception):
    pass


def _compact(value: Any) -> Any:
    if isinstance(value, Mapping):
        out: Dict[str, Any] = {}
        for key, item in value.items():
            if item is None:
                continue
            compacted = _compact(item)
            if compacted is None:
                continue
            out[str(key)] = compacted
        return out
    if isinstance(value, list):
        return [_compact(item) for item in value if item is not None]
    return value


class _HttpTransport:
    def __init__(
        self,
        *,
        base_url: str,
        timeout_s: float,
        api_key: Optional[str],
        auth_bearer: Optional[str],
        admin_token: Optional[str],
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_s = timeout_s
        self._api_key = api_key
        self._auth_bearer = auth_bearer
        self._admin_token = admin_token

    def post(self, path: str, payload: Mapping[str, Any]) -> MutableMapping[str, Any]:
        body = json.dumps(_compact(dict(payload))).encode("utf-8")
        req = request.Request(
            f"{self._base_url}{path}",
            data=body,
            method="POST",
            headers=self._headers(),
        )
        try:
            with request.urlopen(req, timeout=self._timeout_s) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except error.HTTPError as exc:
            details: Any = None
            message = exc.reason if isinstance(exc.reason, str) else "Request failed"
            code = "http_error"
            request_id: Optional[str] = None
            try:
                payload = json.loads(exc.read().decode("utf-8"))
                if isinstance(payload, Mapping):
                    details = payload.get("details")
                    message = str(payload.get("message") or message)
                    code = str(payload.get("code") or code)
                    raw_request_id = payload.get("request_id")
                    if isinstance(raw_request_id, str):
                        request_id = raw_request_id
            except Exception:
                pass
            raise AionisApiError(exc.code, code, message, details=details, request_id=request_id) from exc
        except error.URLError as exc:
            raise AionisNetworkError(str(exc.reason)) from exc

    def _headers(self) -> Dict[str, str]:
        headers = {
            "content-type": "application/json",
            "accept": "application/json",
        }
        if self._api_key:
            headers["x-api-key"] = self._api_key
        if self._auth_bearer:
            headers["authorization"] = f"Bearer {self._auth_bearer}"
        if self._admin_token:
            headers["x-admin-token"] = self._admin_token
        return headers


class _AgentMemoryNamespace:
    def __init__(self, transport: _HttpTransport, *, default_tenant_id: str, default_scope: str) -> None:
        self._transport = transport
        self._default_tenant_id = default_tenant_id
        self._default_scope = default_scope

    def inspect_request(
        self,
        *,
        query_text: str,
        tenant_id: Optional[str] = None,
        scope: Optional[str] = None,
        candidates: Optional[Iterable[str]] = None,
        context: Optional[Mapping[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "tenant_id": tenant_id or self._default_tenant_id,
            "scope": scope or self._default_scope,
            "query_text": query_text,
        }
        if candidates is not None:
            payload["candidates"] = list(candidates)
        if context is not None:
            payload["context"] = dict(context)
        payload.update(kwargs)
        return _compact(payload)

    def inspect(
        self,
        payload: Optional[Mapping[str, Any]] = None,
        /,
        **kwargs: Any,
    ) -> MutableMapping[str, Any]:
        resolved = dict(payload) if payload is not None else self.inspect_request(**kwargs)
        return self._transport.post("/v1/memory/agent/inspect", resolved)


class _ReviewPacksNamespace:
    def __init__(self, transport: _HttpTransport, *, default_tenant_id: str, default_scope: str) -> None:
        self._transport = transport
        self._default_tenant_id = default_tenant_id
        self._default_scope = default_scope

    def evolution_request(
        self,
        *,
        query_text: str,
        tenant_id: Optional[str] = None,
        scope: Optional[str] = None,
        candidates: Optional[Iterable[str]] = None,
        context: Optional[Mapping[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "tenant_id": tenant_id or self._default_tenant_id,
            "scope": scope or self._default_scope,
            "query_text": query_text,
        }
        if candidates is not None:
            payload["candidates"] = list(candidates)
        if context is not None:
            payload["context"] = dict(context)
        payload.update(kwargs)
        return _compact(payload)

    def evolution(
        self,
        payload: Optional[Mapping[str, Any]] = None,
        /,
        **kwargs: Any,
    ) -> MutableMapping[str, Any]:
        resolved = dict(payload) if payload is not None else self.evolution_request(**kwargs)
        return self._transport.post("/v1/memory/evolution/review-pack", resolved)


class _MemoryNamespace:
    def __init__(self, transport: _HttpTransport, *, default_tenant_id: str, default_scope: str) -> None:
        self.agent = _AgentMemoryNamespace(
            transport,
            default_tenant_id=default_tenant_id,
            default_scope=default_scope,
        )
        self.review_packs = _ReviewPacksNamespace(
            transport,
            default_tenant_id=default_tenant_id,
            default_scope=default_scope,
        )


class AionisClient:
    def __init__(
        self,
        *,
        base_url: str,
        timeout_s: float = 10.0,
        api_key: Optional[str] = None,
        auth_bearer: Optional[str] = None,
        admin_token: Optional[str] = None,
        default_tenant_id: str = "default",
        default_scope: str = "default",
    ) -> None:
        self._transport = _HttpTransport(
            base_url=base_url,
            timeout_s=timeout_s,
            api_key=api_key,
            auth_bearer=auth_bearer,
            admin_token=admin_token,
        )
        self.memory = _MemoryNamespace(
            self._transport,
            default_tenant_id=default_tenant_id,
            default_scope=default_scope,
        )
