from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from aionis_sdk.client import AionisClient


def test_agent_memory_inspect_builds_request():
    client = AionisClient(base_url="http://127.0.0.1:3001")
    req = client.memory.agent.inspect_request(query_text="repair export mismatch")

    assert req["query_text"] == "repair export mismatch"
    assert req["tenant_id"] == "default"
    assert req["scope"] == "default"


def test_evolution_review_builds_request_with_optional_fields():
    client = AionisClient(base_url="http://127.0.0.1:3001", default_tenant_id="tenant_alpha")
    req = client.memory.review_packs.evolution_request(
        query_text="repair export mismatch",
        candidates=["edit", "test"],
        context={"goal": "repair export mismatch"},
        repo_root="/repo",
    )

    assert req["tenant_id"] == "tenant_alpha"
    assert req["scope"] == "default"
    assert req["candidates"] == ["edit", "test"]
    assert req["context"]["goal"] == "repair export mismatch"
    assert req["repo_root"] == "/repo"
