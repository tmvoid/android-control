#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MobileAutomation } from "./mobile-automation.js";

const server = new Server(
  {
    name: "mobile-automation",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

const automation = new MobileAutomation();

// Tool schemas
const TapSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const SwipeSchema = z.object({
  fromX: z.number(),
  fromY: z.number(),
  toX: z.number(),
  toY: z.number(),
  duration: z.number().optional().default(500),
});

const InputTextSchema = z.object({
  text: z.string(),
  elementId: z.string().optional(),
});

const ScreenshotSchema = z.object({
  path: z.string().optional(),
  fullPage: z.boolean().optional().default(false),
});

const FindElementSchema = z.object({
  strategy: z.enum(["id", "xpath", "accessibility", "class", "css"]),
  value: z.string(),
  timeout: z.number().optional().default(5000),
});

const InstallAppSchema = z.object({
  apkPath: z.string(),
  replace: z.boolean().optional().default(false),
});

const LaunchAppSchema = z.object({
  packageName: z.string(),
  activity: z.string().optional(),
  stopIfRunning: z.boolean().optional().default(true),
});

const AdbShellSchema = z.object({
  command: z.string(),
  timeout: z.number().optional().default(30000),
});

const StartRecordingSchema = z.object({
  path: z.string().optional(),
  timeLimit: z.number().optional().default(180000),
});

const PressKeySchema = z.object({
  keycode: z.number(),
  metastate: z.number().optional().default(0),
});

// Initialize automation on startup
await automation.initialize();

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "mobile_tap",
      description: "Tap at coordinates on the device screen",
      inputSchema: {
        type: "object",
        properties: {
          x: { type: "number", description: "X coordinate" },
          y: { type: "number", description: "Y coordinate" },
        },
        required: ["x", "y"],
      },
    },
    {
      name: "mobile_swipe",
      description: "Swipe from one point to another",
      inputSchema: {
        type: "object",
        properties: {
          fromX: { type: "number" },
          fromY: { type: "number" },
          toX: { type: "number" },
          toY: { type: "number" },
          duration: { type: "number", default: 500 },
        },
        required: ["fromX", "fromY", "toX", "toY"],
      },
    },
    {
      name: "mobile_input_text",
      description: "Input text into focused element or specified element",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
          elementId: { type: "string", description: "Optional element ID to input into" },
        },
        required: ["text"],
      },
    },
    {
      name: "mobile_screenshot",
      description: "Capture device screenshot",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Optional save path" },
          fullPage: { type: "boolean", default: false },
        },
      },
    },
    {
      name: "mobile_dump_hierarchy",
      description: "Get current UI hierarchy (XML)",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "mobile_find_element",
      description: "Find element by various strategies",
      inputSchema: {
        type: "object",
        properties: {
          strategy: { type: "string", enum: ["id", "xpath", "accessibility", "class", "css"] },
          value: { type: "string" },
          timeout: { type: "number", default: 5000 },
        },
        required: ["strategy", "value"],
      },
    },
    {
      name: "mobile_install_app",
      description: "Install APK on device",
      inputSchema: {
        type: "object",
        properties: {
          apkPath: { type: "string" },
          replace: { type: "boolean", default: false },
        },
        required: ["apkPath"],
      },
    },
    {
      name: "mobile_launch_app",
      description: "Launch app by package name",
      inputSchema: {
        type: "object",
        properties: {
          packageName: { type: "string" },
          activity: { type: "string" },
          stopIfRunning: { type: "boolean", default: true },
        },
        required: ["packageName"],
      },
    },
    {
      name: "mobile_adb_shell",
      description: "Execute arbitrary ADB shell command",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string" },
          timeout: { type: "number", default: 30000 },
        },
        required: ["command"],
      },
    },
    {
      name: "mobile_start_recording",
      description: "Start screen recording",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          timeLimit: { type: "number", default: 180000 },
        },
      },
    },
    {
      name: "mobile_stop_recording",
      description: "Stop screen recording and return file path",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "mobile_press_key",
      description: "Press hardware key (back, home, menu, etc.)",
      inputSchema: {
        type: "object",
        properties: {
          keycode: { type: "number" },
          metastate: { type: "number", default: 0 },
        },
        required: ["keycode"],
      },
    },
    {
      name: "mobile_get_device_info",
      description: "Get device information",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "mobile_list_packages",
      description: "List installed packages",
      inputSchema: {
        type: "object",
        properties: {
          filter: z.string().optional(),
        },
      },
    },
    {
      name: "mobile_get_logcat",
      description: "Get logcat output",
      inputSchema: {
        type: "object",
        properties: {
          filter: z.string().optional(),
          lines: z.number().optional().default(100),
        },
      },
    },
  ],
}));

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "mobile_tap": {
        const { x, y } = TapSchema.parse(args);
        await automation.tap(x, y);
        return { content: [{ type: "text", text: `Tapped at (${x}, ${y})` }] };
      }
      case "mobile_swipe": {
        const { fromX, fromY, toX, toY, duration } = SwipeSchema.parse(args);
        await automation.swipe(fromX, fromY, toX, toY, duration);
        return { content: [{ type: "text", text: `Swiped from (${fromX}, ${fromY}) to (${toX}, ${toY})` }] };
      }
      case "mobile_input_text": {
        const { text, elementId } = InputTextSchema.parse(args);
        await automation.inputText(text, elementId);
        return { content: [{ type: "text", text: `Input text: ${text}` }] };
      }
      case "mobile_screenshot": {
        const { path, fullPage } = ScreenshotSchema.parse(args);
        const result = await automation.screenshot(path, fullPage);
        return { content: [{ type: "text", text: `Screenshot saved to: ${result.path}`, ...(result.base64 ? [{ type: "image", data: result.base64, mimeType: "image/png" }] : []) }] };
      }
      case "mobile_dump_hierarchy": {
        const xml = await automation.dumpHierarchy();
        return { content: [{ type: "text", text: xml }] };
      }
      case "mobile_find_element": {
        const { strategy, value, timeout } = FindElementSchema.parse(args);
        const element = await automation.findElement(strategy, value, timeout);
        return { content: [{ type: "text", text: JSON.stringify(element, null, 2) }] };
      }
      case "mobile_install_app": {
        const { apkPath, replace } = InstallAppSchema.parse(args);
        await automation.installApp(apkPath, replace);
        return { content: [{ type: "text", text: `Installed ${apkPath}` }] };
      }
      case "mobile_launch_app": {
        const { packageName, activity, stopIfRunning } = LaunchAppSchema.parse(args);
        await automation.launchApp(packageName, activity, stopIfRunning);
        return { content: [{ type: "text", text: `Launched ${packageName}` }] };
      }
      case "mobile_adb_shell": {
        const { command, timeout } = AdbShellSchema.parse(args);
        const output = await automation.adbShell(command, timeout);
        return { content: [{ type: "text", text: output }] };
      }
      case "mobile_start_recording": {
        const { path, timeLimit } = StartRecordingSchema.parse(args);
        await automation.startRecording(path, timeLimit);
        return { content: [{ type: "text", text: "Screen recording started" }] };
      }
      case "mobile_stop_recording": {
        const path = await automation.stopRecording();
        return { content: [{ type: "text", text: `Recording saved to: ${path}` }] };
      }
      case "mobile_press_key": {
        const { keycode, metastate } = PressKeySchema.parse(args);
        await automation.pressKey(keycode, metastate);
        return { content: [{ type: "text", text: `Pressed keycode ${keycode}` }] };
      }
      case "mobile_get_device_info": {
        const info = await automation.getDeviceInfo();
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
      }
      case "mobile_list_packages": {
        const { filter } = args as { filter?: string };
        const packages = await automation.listPackages(filter);
        return { content: [{ type: "text", text: packages.join("\n") }] };
      }
      case "mobile_get_logcat": {
        const { filter, lines } = args as { filter?: string; lines?: number };
        const logcat = await automation.getLogcat(filter, lines);
        return { content: [{ type: "text", text: logcat }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: "mobile://device/info", name: "Device Info", mimeType: "application/json", description: "Current device information" },
    { uri: "mobile://screen/current", name: "Current Screen", mimeType: "image/png", description: "Current screen screenshot" },
    { uri: "mobile://hierarchy/current", name: "UI Hierarchy", mimeType: "application/xml", description: "Current UI hierarchy dump" },
    { uri: "mobile://logcat", name: "Logcat", mimeType: "text/plain", description: "Recent logcat output" },
    { uri: "mobile://packages", name: "Installed Packages", mimeType: "text/plain", description: "List of installed packages" },
  ],
}));

// Read resource handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case "mobile://device/info": {
      const info = await automation.getDeviceInfo();
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(info, null, 2) }] };
    }
    case "mobile://screen/current": {
      const result = await automation.screenshot();
      return { contents: [{ uri, mimeType: "image/png", blob: result.base64! }] };
    }
    case "mobile://hierarchy/current": {
      const xml = await automation.dumpHierarchy();
      return { contents: [{ uri, mimeType: "application/xml", text: xml }] };
    }
    case "mobile://logcat": {
      const logcat = await automation.getLogcat();
      return { contents: [{ uri, mimeType: "text/plain", text: logcat }] };
    }
    case "mobile://packages": {
      const packages = await automation.listPackages();
      return { contents: [{ uri, mimeType: "text/plain", text: packages.join("\n") }] };
    }
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Mobile Automation MCP Server running on stdio");