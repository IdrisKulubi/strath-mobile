# Matching contract artifacts

These files are generated from the executable `questionnaire-v1` Python service:

- `openapi.json`: HTTP request, response, validation, and bearer-security contract.
- `examples.json`: perfect, asymmetric, zero-agreement, sparse, zero-weight, and question-version-mismatch cases.
- `fixture.json`: compact perfect-match request used for live smoke testing.
- `validate-fixtures.ts`: an independent TypeScript calculation and shape check for all shared examples.

Regenerate from the repository root with:

```powershell
services/questionnaire-matching/.venv/Scripts/python.exe services/questionnaire-matching/scripts/generate_contract_artifacts.py
```

Review generated changes. A breaking change requires a new algorithm/API version rather than silently editing `questionnaire-v1`.
