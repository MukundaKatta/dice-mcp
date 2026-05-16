# dice-mcp

[![npm](https://img.shields.io/npm/v/@mukundakatta/dice-mcp.svg)](https://www.npmjs.com/package/@mukundakatta/dice-mcp)
[![mcp](https://img.shields.io/badge/protocol-MCP-blue.svg)](https://modelcontextprotocol.io)

MCP server: parse and roll RPG-style dice expressions. `1d20`, `4d6+3`,
`2d10*5`, `1d20+1d4-2`. Backed by `crypto.randomInt` for unbiased rolls.

## Tools

- `roll` — `{ expression: "4d6+3" }` → `{ rolls: [[5,2,6,4]], modifier: 3, multiplier: 1, total: 20 }`
- `parse` — same input, returns only the structure (no rolling).

## Configure

```json
{ "mcpServers": { "dice": { "command": "npx", "args": ["-y", "@mukundakatta/dice-mcp"] } } }
```

## License

MIT.
