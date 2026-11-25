"""Model aliases for the eval runner. The one place that maps a short name to a model id."""

MODELS: dict[str, str] = {
    "opus": "claude-opus-5-5",
    "haiku": "claude-haiku-5-5",
}


def resolve_model(name: str) -> str:
    """Alias -> model id; anything else is taken as a full model id."""
    return MODELS.get(name, name)
