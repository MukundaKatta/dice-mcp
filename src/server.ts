#!/usr/bin/env node
/**
 * dice MCP server. Two tools: `roll`, `parse`.
 *
 * Dice notation parser for RPG-style expressions: `1d20`, `4d6`, `2d10+3`,
 * `3d6-1`, `2d8*2`. Whitespace ignored, case-insensitive. Randomness comes
 * from `crypto.randomInt`.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { randomInt } from 'node:crypto';

const VERSION = '0.1.0';

export interface ParsedExpr {
  expression: string;
  terms: { count: number; sides: number }[];
  modifier: number;
  multiplier: number;
}

const TERM = /(\d+)d(\d+)/gi;
const MOD = /([+-])\s*(\d+)(?![d*])/gi;
const MULT = /\*\s*(\d+)/i;

export function parse(expr: string): ParsedExpr {
  const stripped = expr.replace(/\s+/g, '');
  if (!stripped) throw new Error('empty expression');
  const terms: { count: number; sides: number }[] = [];
  let modifier = 0;
  let multiplier = 1;
  let m: RegExpExecArray | null;
  TERM.lastIndex = 0;
  while ((m = TERM.exec(stripped)) !== null) {
    const count = parseInt(m[1], 10);
    const sides = parseInt(m[2], 10);
    if (count <= 0 || count > 1000) throw new Error('dice count must be in [1, 1000]');
    if (sides < 2 || sides > 10_000) throw new Error('dice sides must be in [2, 10000]');
    terms.push({ count, sides });
  }
  if (terms.length === 0) throw new Error('no XdY term found in: ' + expr);

  // Modifiers are isolated +N / -N tokens not next to `d` or `*`.
  MOD.lastIndex = 0;
  let mm: RegExpExecArray | null;
  while ((mm = MOD.exec(stripped)) !== null) {
    const v = parseInt(mm[2], 10);
    modifier += mm[1] === '-' ? -v : v;
  }
  const mu = stripped.match(MULT);
  if (mu) multiplier = parseInt(mu[1], 10);
  return { expression: expr, terms, modifier, multiplier };
}

export interface RollResult {
  expression: string;
  rolls: number[][];
  modifier: number;
  multiplier: number;
  total: number;
}

export function roll(expr: string): RollResult {
  const p = parse(expr);
  const rolls: number[][] = [];
  let subtotal = 0;
  for (const t of p.terms) {
    const group: number[] = [];
    for (let i = 0; i < t.count; i++) {
      const v = randomInt(1, t.sides + 1);
      group.push(v);
      subtotal += v;
    }
    rolls.push(group);
  }
  const total = (subtotal + p.modifier) * p.multiplier;
  return { expression: expr, rolls, modifier: p.modifier, multiplier: p.multiplier, total };
}

const server = new Server({ name: 'dice', version: VERSION }, { capabilities: { tools: {} } });

const TOOLS = [
  {
    name: 'roll',
    description: 'Roll a dice expression (1d20, 4d6+2, 3d8*2). Returns each die plus total.',
    inputSchema: {
      type: 'object',
      properties: { expression: { type: 'string' } },
      required: ['expression'],
    },
  },
  {
    name: 'parse',
    description: 'Parse a dice expression without rolling. Returns the components.',
    inputSchema: {
      type: 'object',
      properties: { expression: { type: 'string' } },
      required: ['expression'],
    },
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    const a = args as unknown as { expression: string };
    if (name === 'roll') return jsonResult(roll(a.expression));
    if (name === 'parse') return jsonResult(parse(a.expression));
    return errorResult('unknown tool: ' + name);
  } catch (err) {
    return errorResult('dice failed: ' + (err as Error).message);
  }
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
function errorResult(message: string) {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`dice MCP server v${VERSION} ready on stdio\n`);
}
