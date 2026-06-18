import voyageai
from ..config import settings

_client: voyageai.Client | None = None

def _get_client() -> voyageai.Client:
    global _client
    if _client is None:
        _client = voyageai.Client(api_key=settings.voyage_api_key)
    return _client


def embed_document(text: str) -> list[float]:
    result = _get_client().embed([text], model="voyage-3", input_type="document")
    return result.embeddings[0]


def embed_query(text: str) -> list[float]:
    result = _get_client().embed([text], model="voyage-3", input_type="query")
    return result.embeddings[0]
