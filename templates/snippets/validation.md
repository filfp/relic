```bash
# 1. Ensure spec folder and files exist (creates missing files from templates)
relic scaffold --spec <your-spec-id>

# 2. Validate shared brain integrity — no conflicts before planning
relic validate
```

Do not proceed if `relic validate` reports `"valid": false`. Resolve conflicts first.
