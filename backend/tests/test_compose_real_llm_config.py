from pathlib import Path


def test_docker_compose_does_not_force_mock_llm_mode():
    compose_text = (Path(__file__).resolve().parents[2] / "docker-compose.yml").read_text()

    assert "USE_MOCK_LLM=true" not in compose_text
    assert "USE_MOCK_LLM=${USE_MOCK_LLM:-false}" in compose_text
