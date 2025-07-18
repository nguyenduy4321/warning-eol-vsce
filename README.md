# ⚠️ Warning EOL

Displays end-of-line (EOL) characters in your code and warns you if inconsistent EOL styles (LF, CRLF, CR) are detected.

## Features

- Show EOL characters at the end of each line:  
  `↓` for `LF`, `↵` for `CRLF`, `←` for `CR`.
- Warns when multiple EOL styles are found in the same file.

## Configuration

```json
"warning-eol.colorDefaultEOL": "#BFBFBF80",
"warning-eol.colorInconsitentEOL": "#FF000080"
```