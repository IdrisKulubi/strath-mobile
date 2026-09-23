from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]


def test_runtime_image_contains_every_service_module_and_runs_as_non_root():
    dockerfile = (SERVICE_ROOT / "Dockerfile").read_text(encoding="utf-8")
    for module in ["api.py", "engine.py", "main.py", "middleware.py", "models.py", "settings.py"]:
        assert module in dockerfile
    assert "USER app" in dockerfile
    assert "${PORT:-8080}" in dockerfile


def test_railway_healthcheck_and_runtime_dependencies_are_minimal():
    railway = (SERVICE_ROOT / "railway.toml").read_text(encoding="utf-8")
    runtime = (SERVICE_ROOT / "requirements.txt").read_text(encoding="utf-8")
    development = (SERVICE_ROOT / "requirements-dev.txt").read_text(encoding="utf-8")
    assert 'healthcheckPath = "/health"' in railway
    assert "pytest" not in runtime
    assert "httpx" not in runtime
    assert "-r requirements.txt" in development
