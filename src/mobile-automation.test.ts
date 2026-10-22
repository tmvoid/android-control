import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MobileAutomation } from "./mobile-automation.js";

vi.mock("webdriverio", () => {
  const mockElement = {
    elementId: "elem-123",
    getTagName: vi.fn().mockResolvedValue("android.widget.Button"),
    getText: vi.fn().mockResolvedValue("Click me"),
    getSize: vi.fn().mockResolvedValue({ width: 300, height: 100 }),
    getLocation: vi.fn().mockResolvedValue({ x: 100, y: 200 }),
    getAttribute: vi.fn().mockResolvedValue("value"),
    click: vi.fn().mockResolvedValue(undefined),
    setValue: vi.fn().mockResolvedValue(undefined),
    waitForExist: vi.fn().mockResolvedValue(undefined),
  };

  const mockDriver = {
    sessionId: "test-session",
    performActions: vi.fn().mockResolvedValue(undefined),
    takeScreenshot: vi.fn().mockResolvedValue("base64data"),
    getPageSource: vi.fn().mockResolvedValue("<xml/>"),
    $: vi.fn().mockReturnValue(mockElement),
    terminateApp: vi.fn().mockResolvedValue(undefined),
    startActivity: vi.fn().mockResolvedValue(undefined),
    activateApp: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
  };

  return {
    remote: vi.fn().mockResolvedValue(mockDriver),
  };
});

vi.mock("node:child_process", () => {
  const mockExecFile = vi.fn();
  const mockSpawn = vi.fn();

  // Set up default implementations
  mockExecFile.mockImplementation((cmd, args) => {
    if (cmd === "adb" && args[0] === "shell") {
      const shellCmd = args.slice(1).join(" ");
      if (shellCmd.includes("getprop ro.serialno")) return Promise.resolve({ stdout: "serial123" });
      if (shellCmd.includes("getprop ro.product.model")) return Promise.resolve({ stdout: "Pixel 8" });
      if (shellCmd.includes("getprop ro.product.brand")) return Promise.resolve({ stdout: "Google" });
      if (shellCmd.includes("getprop ro.build.version.release")) return Promise.resolve({ stdout: "14" });
      if (shellCmd.includes("getprop ro.build.version.sdk")) return Promise.resolve({ stdout: "34" });
      if (shellCmd.includes("wm size")) return Promise.resolve({ stdout: "Physical size: 1080x2400" });
      if (shellCmd.includes("wm density")) return Promise.resolve({ stdout: "Physical density: 420" });
      if (shellCmd.includes("pm list packages")) return Promise.resolve({ stdout: "package:com.app1\npackage:com.app2\n" });
      if (shellCmd.includes("logcat")) return Promise.resolve({ stdout: "log line 1\nlog line 2" });
      if (shellCmd.includes("input keyevent")) return Promise.resolve({ stdout: "" });
      return Promise.resolve({ stdout: "" });
    }
    if (cmd === "adb" && args[0] === "install") return Promise.resolve({ stdout: "Success" });
    if (cmd === "adb" && args[0] === "pull") return Promise.resolve({ stdout: "" });
    return Promise.resolve({ stdout: "" });
  });

  mockSpawn.mockReturnValue({
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  });

  return {
    execFile: mockExecFile,
    spawn: mockSpawn,
  };
});

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("node:path", () => ({
  join: vi.fn((...args) => args.join("/")),
  dirname: vi.fn((p) => p.split("/").slice(0, -1).join("/")),
}));

vi.mock("node:url", () => ({
  fileURLToPath: vi.fn(() => "/fake/path/src/mobile-automation.ts"),
}));

vi.mock("node:util", () => ({
  promisify: vi.fn((fn) => fn),
}));

describe("MobileAutomation", () => {
  let automation: MobileAutomation;
  let mockDriver: ReturnType<typeof vi.fn>;
  let mockElement: Record<string, unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { remote } = await import("webdriverio");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { execFile, spawn } = await import("node:child_process");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remoteAny = remote as any;
    mockElement = remoteAny.mock.results[0]?.value?.$?.mock?.results?.[0]?.value || {
      elementId: "elem-123",
      getTagName: vi.fn().mockResolvedValue("android.widget.Button"),
      getText: vi.fn().mockResolvedValue("Click me"),
      getSize: vi.fn().mockResolvedValue({ width: 300, height: 100 }),
      getLocation: vi.fn().mockResolvedValue({ x: 100, y: 200 }),
      getAttribute: vi.fn().mockResolvedValue("value"),
      click: vi.fn().mockResolvedValue(undefined),
      setValue: vi.fn().mockResolvedValue(undefined),
      waitForExist: vi.fn().mockResolvedValue(undefined),
    };

    mockDriver = {
      sessionId: "test-session",
      performActions: vi.fn().mockResolvedValue(undefined),
      takeScreenshot: vi.fn().mockResolvedValue("base64data"),
      getPageSource: vi.fn().mockResolvedValue("<xml/>"),
      $: vi.fn().mockReturnValue(mockElement),
      terminateApp: vi.fn().mockResolvedValue(undefined),
      startActivity: vi.fn().mockResolvedValue(undefined),
      activateApp: vi.fn().mockResolvedValue(undefined),
      deleteSession: vi.fn().mockResolvedValue(undefined),
    };

    (remote as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue(mockDriver);

    automation = new MobileAutomation();
    await automation.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("tap", () => {
    it("calls performActions with correct tap sequence", async () => {
      await automation.tap(100, 200);

      expect(mockDriver.performActions).toHaveBeenCalledWith([
        {
          type: "pointer",
          id: "finger1",
          parameters: { pointerType: "touch" },
          actions: [
            { type: "pointerMove", duration: 0, x: 100, y: 200 },
            { type: "pointerDown", button: 0 },
            { type: "pointerUp", button: 0 },
          ],
        },
      ]);
    });
  });

  describe("swipe", () => {
    it("calls performActions with correct swipe sequence", async () => {
      await automation.swipe(100, 200, 300, 400, 800);

      const calls = mockDriver.performActions.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const action = calls[0][0][0];
      expect(action.actions).toBeDefined();
      expect(action.actions[0]).toMatchObject({ type: "pointerMove", x: 100, y: 200 });
      expect(action.actions[1]).toMatchObject({ type: "pointerDown", button: 0 });
      expect(action.actions[2]).toMatchObject({ type: "pointerMove", duration: 800, x: 300, y: 400 });
      expect(action.actions[3]).toMatchObject({ type: "pointerUp", button: 0 });
    });

    it("uses default duration when not specified", async () => {
      await automation.swipe(0, 0, 100, 100);

      const calls = mockDriver.performActions.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const action = calls[0][0][0];
      expect(action.actions).toBeDefined();
      const pointerMoveAction = action.actions.find((a: Record<string, unknown>) => a.type === "pointerMove" && a.duration !== undefined && a.duration !== 0);
      expect(pointerMoveAction).toBeDefined();
      expect(pointerMoveAction.duration).toBe(500);
    });
  });

  describe("screenshot", () => {
    it("returns path and base64", async () => {
      const result = await automation.screenshot("/custom/path.png");

      expect(result).toEqual({
        path: "/custom/path.png",
        base64: "base64data",
      });
      expect(mockDriver.takeScreenshot).toHaveBeenCalled();
    });
  });

  describe("dumpHierarchy", () => {
    it("returns page source XML", async () => {
      const xml = await automation.dumpHierarchy();
      expect(xml).toBe("<xml/>");
      expect(mockDriver.getPageSource).toHaveBeenCalled();
    });
  });

  describe("findElement", () => {
    it("finds element by id strategy", async () => {
      const element = await automation.findElement("id", "my-button");

      expect(mockDriver.$).toHaveBeenCalledWith({ "appium:id": "my-button" });
      expect(element).toMatchObject({
        elementId: "elem-123",
        tagName: "android.widget.Button",
        text: "Click me",
        bounds: { x: 100, y: 200, width: 300, height: 100 },
      });
    });

    it("finds element by xpath strategy", async () => {
      await automation.findElement("xpath", "//button[@text='Login']");
      expect(mockDriver.$).toHaveBeenCalledWith({ xpath: "//button[@text='Login']" });
    });

    it("finds element by accessibility strategy", async () => {
      await automation.findElement("accessibility", "login-btn");
      expect(mockDriver.$).toHaveBeenCalledWith({ "appium:accessibilityId": "login-btn" });
    });
  });

  describe("inputText", () => {
    it("inputs text into specified element", async () => {
      await automation.inputText("hello", "elem-123");

      expect(mockElement.click).toHaveBeenCalled();
      expect(mockElement.setValue).toHaveBeenCalledWith("hello");
    });
  });

  describe("installApp", () => {
    it("calls adb install with replace flag", async () => {
      const { execFile } = await import("node:child_process");

      await automation.installApp("/path/app.apk", true);

      expect(execFile).toHaveBeenCalledWith("adb", ["install", "-r", "/path/app.apk"], { timeout: 60000 });
    });
  });

  describe("launchApp", () => {
    it("terminates and starts activity when provided", async () => {
      await automation.launchApp("com.app", "com.app.MainActivity");

      expect(mockDriver.terminateApp).toHaveBeenCalledWith("com.app");
      expect(mockDriver.startActivity).toHaveBeenCalledWith("com.app", "com.app.MainActivity");
    });

    it("activates app when no activity provided", async () => {
      await automation.launchApp("com.app");

      expect(mockDriver.terminateApp).toHaveBeenCalledWith("com.app");
      expect(mockDriver.activateApp).toHaveBeenCalledWith("com.app");
    });
  });

  describe("adbShell", () => {
    it("executes adb shell command", async () => {
      const { execFile } = await import("node:child_process");

      const result = await automation.adbShell("ls /sdcard");

      expect(result).toBe("");
      expect(execFile).toHaveBeenCalledWith("adb", ["shell", "ls /sdcard"], { timeout: 30000 });
    });
  });

  describe("pressKey", () => {
    it("sends keyevent via adb", async () => {
      const { execFile } = await import("node:child_process");

      await automation.pressKey(4);

      expect(execFile).toHaveBeenCalledWith("adb", ["shell", "input keyevent 4 0"], { timeout: 30000 });
    });
  });

  describe("getDeviceInfo", () => {
    it("aggregates device properties", async () => {
      const info = await automation.getDeviceInfo();

      expect(info).toEqual({
        serial: "serial123",
        model: "Pixel 8",
        brand: "Google",
        androidVersion: "14",
        sdkVersion: "34",
        screenWidth: 1080,
        screenHeight: 2400,
        density: 420,
      });
    });
  });

  describe("listPackages", () => {
    it("returns filtered package list", async () => {
      const packages = await automation.listPackages("app1");

      expect(packages).toEqual(["com.app1", "com.app2"]);
    });
  });

  describe("getLogcat", () => {
    it("returns logcat output", async () => {
      const logcat = await automation.getLogcat("*:E", 50);

      expect(logcat).toBe("log line 1\nlog line 2");
    });
  });
});