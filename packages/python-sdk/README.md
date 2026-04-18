# ostinato-aionis-sdk

Experimental Python client for a narrow subset of `Aionis Runtime`.

Current scope:

- `memory.agent.inspect`
- `memory.review_packs.evolution`

This package is intentionally narrow. It is not a parity port of the desktop `AionisPro` Python SDK.

## Install locally

```bash
pip install -e packages/python-sdk
```

## Usage

```python
from aionis_sdk import AionisClient

client = AionisClient(base_url="http://127.0.0.1:3001")

inspect_request = client.memory.agent.inspect_request(
    query_text="repair export mismatch",
    candidates=["edit", "test"],
    context={"goal": "repair export mismatch"},
)

evolution_request = client.memory.review_packs.evolution_request(
    query_text="repair export mismatch",
    candidates=["edit", "test"],
    context={"goal": "repair export mismatch"},
)
```

To execute the requests against a running Lite runtime:

```python
inspect = client.memory.agent.inspect(inspect_request)
evolution = client.memory.review_packs.evolution(evolution_request)
```

## Test

```bash
python3 -m pytest packages/python-sdk/tests/test_agent_memory.py -q
```
