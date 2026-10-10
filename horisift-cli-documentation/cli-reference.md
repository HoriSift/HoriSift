# CLI reference

```sh
npm run cli -- scan <directory> --format text
npm run cli -- scan <directory> --format json
npm run cli -- scan <directory> --fail-on high
npm run cli -- scan <directory> --allow-incomplete
npm run cli -- rules --format json
npm run cli -- --help
npm run cli -- --version
```

| Exit code | Meaning                                                                  |
| --------- | ------------------------------------------------------------------------ |
| 0         | Successful operation / allowed incomplete scan without threshold failure |
| 1         | One or more findings satisfy explicitly configured `--fail-on` threshold |
| 2         | Invalid user arguments/configuration                                     |
| 3         | Unexpected fatal runtime failure                                         |
| 4         | Incomplete scan requiring manual follow-up (unless `--allow-incomplete`) |

`--severity` filters **text display only**. JSON preserves all findings. `--fail-on` evaluates all findings, even text-hidden ones. `--allow-incomplete` changes the process exit handling but never changes the JSON `status` to complete. Do not use empty results as a migration certificate.

Full syntax and guardrails: [CLI\_USAGE.md](https://github.com/HoriSift/HoriSift/blob/main/docs/CLI_USAGE.md).
