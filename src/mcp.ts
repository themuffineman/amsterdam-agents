/**
 * Our agent tools as an MCP server, for the claude-code engine. Claude Code starts this
 * (`node src/mcp.ts`, over stdio) for one topic and calls the same tools Pi uses in-process
 * (built by buildTools in agent.ts), so web_search, read_page, screenshot, submit_page... act
 * the same on both engines.
 *
 * The topic comes in through the environment (set by claude.ts in the MCP config):
 *   AGENT_NAME        agents/<name>.json
 *   AGENT_TOPIC_ID    the claimed topic
 *   AGENT_CWD         the topic's folder (submit_page reads page.json / post.md there)
 *   AGENT_MODEL       what the saved page records as its author
 *   AGENT_STATE_FILE  where to write how submitting went, what searches cost and the problems
 *                     the tools ran into (problems.ts), after every call: this process belongs
 *                     to Claude Code, so the runner reads it back from the file
 * Logs go to stderr only: stdout is the MCP channel.
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

import type { ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { buildTools, loadConfig, newTopicState } from "./agent.ts";
import { problems } from "./problems.ts";
import { searchCost } from "./tools/search.ts";

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is not set`);
  return v;
};

const config = loadConfig(env("AGENT_NAME"));
const state = newTopicState();
const tools = buildTools(config, env("AGENT_TOPIC_ID"), env("AGENT_CWD"), env("AGENT_MODEL"), state);
const stateFile = env("AGENT_STATE_FILE");

const saveState = () =>
  writeFileSync(stateFile, JSON.stringify({ submit: state.submit, searchCost: searchCost.total, searches: searchCost.count, freeSearches: searchCost.free, problems }));
saveState();

const server = new Server({ name: "agent", version: "1.0.0" }, { capabilities: { tools: {} } });

// Tool schemas are TypeBox objects, which are plain JSON Schema already.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: JSON.parse(JSON.stringify(t.parameters)) as { type: "object"; [k: string]: unknown },
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.find((t) => t.name === req.params.name);
  if (!tool) return { content: [{ type: "text", text: `Unknown tool ${req.params.name}` }], isError: true };
  try {
    const raw = req.params.arguments ?? {};
    const args = tool.prepareArguments ? tool.prepareArguments(raw) : raw;
    // Our tools don't use Pi's session context; they only need their arguments.
    const result = await tool.execute(randomUUID(), args, undefined, undefined, {} as ExtensionToolContext);
    return {
      content: result.content.map((c) =>
        c.type === "image" ? { type: "image" as const, data: c.data, mimeType: c.mimeType } : { type: "text" as const, text: c.text },
      ),
    };
  } catch (e) {
    console.error(`${tool.name} failed: ${(e as Error).stack ?? e}`);
    return { content: [{ type: "text", text: `${tool.name} failed: ${(e as Error).message}` }], isError: true };
  } finally {
    saveState();
  }
});

await server.connect(new StdioServerTransport());
