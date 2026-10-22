import { remote, type Browser, type Selector } from "webdriverio";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const SCREENSHOTS_DIR = join(PROJECT_ROOT, "screenshots");
const RECORDINGS_DIR = join(PROJECT_ROOT, "recordings");

mkdirSync(SCREENSHOTS_DIR, { recursive: true });
mkdirSync(RECORDINGS_DIR, { recursive: true });

interface DeviceInfo {
  serial: string;
  model: string;
  brand: string;
  androidVersion: string;
  sdkVersion: string;
  screenWidth: number;
  screenHeight: number;
  density: number;
}

interface ElementInfo {
  elementId: string;
  tagName: string;
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
  attributes: Record<string, string>;
}

export class MobileAutomation {
  private driver: Browser | null = null;
  private recordingProcess: ReturnType<typeof spawn> | null = null;
  private recordingPath: string | null = null;

  async initialize(): Promise<void> {
    const caps: Record<string, unknown> = {
      platformName: "Android",
      "appium:automationName": "UiAutomator2",
      "appium:deviceName": process.env["ANDROID_DEVICE"] || "emulator-5554",
      "appium:noReset": true,
      "appium:fullReset": false,
      "appium:newCommandTimeout": 300,
      "appium:uiautomator2ServerInstallTimeout": 60000,
    };

    const udid = process.env["ANDROID_UDID"];
    if (udid) caps["appium:udid"] = udid;

    try {
      this.driver = await remote({
        hostname: process.env["APPIUM_HOST"] || "localhost",
        port: parseInt(process.env["APPIUM_PORT"] || "4723", 10),
        path: "/wd/hub",
        capabilities: caps,
        logLevel: "warn",
      });
      console.error("Appium session started:", this.driver.sessionId);
    } catch (error) {
      console.error("Failed to start Appium session:", error);
      throw error;
    }
  }

  private ensureDriver(): Browser {
    if (!this.driver) throw new Error("Driver not initialized. Call initialize() first.");
    return this.driver;
  }

  async tap(x: number, y: number): Promise<void> {
    const driver = this.ensureDriver();
    await driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x, y },
          { type: "pointerDown", button: 0 },
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
  }

  async swipe(fromX: number, fromY: number, toX: number, toY: number, duration = 500): Promise<void> {
    const driver = this.ensureDriver();
    await driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x: fromX, y: fromY },
          { type: "pointerDown", button: 0 },
          { type: "pointerMove", duration, x: toX, y: toY },
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
  }

  async inputText(text: string, elementId?: string): Promise<void> {
    const driver = this.ensureDriver();
    if (elementId) {
      const element = await driver.$({ "appium:elementId": elementId });
      await element.click();
      await element.setValue(text);
    } else {
      await driver.performActions([
        {
          type: "key",
          id: "keyboard",
          actions: text.split("").map((char) => ({
            type: "keyDown",
            value: char,
          })),
        },
      ]);
    }
  }

  async screenshot(path?: string, _fullPage = false): Promise<{ path: string; base64?: string }> {
    const driver = this.ensureDriver();
    const timestamp = Date.now();
    const filename = path || join(SCREENSHOTS_DIR, `screenshot-${timestamp}.png`);

    mkdirSync(dirname(filename), { recursive: true });

    const base64 = await driver.takeScreenshot();
    writeFileSync(filename, Buffer.from(base64, "base64"));

    return { path: filename, base64 };
  }

  async dumpHierarchy(): Promise<string> {
    const driver = this.ensureDriver();
    return await driver.getPageSource();
  }

  async findElement(
    strategy: "id" | "xpath" | "accessibility" | "class" | "css",
    value: string,
    timeout = 5000
  ): Promise<ElementInfo> {
    const driver = this.ensureDriver();
    let selector: Selector;

    switch (strategy) {
      case "id":
        selector = { "appium:id": value };
        break;
      case "xpath":
        selector = { xpath: value };
        break;
      case "accessibility":
        selector = { "appium:accessibilityId": value };
        break;
      case "class":
        selector = { "appium:className": value };
        break;
      case "css":
        selector = { css: value };
        break;
    }

    const element = await driver.$(selector);
    await element.waitForExist({ timeout });

    const elementId = await element.elementId;
    const tagName = await element.getTagName();
    const text = await element.getText();
    const size = await element.getSize();
    const location = await element.getLocation();
    const attributes: Record<string, string> = {};

    for (const attr of ["resource-id", "content-desc", "class", "text", "clickable", "enabled", "focusable", "selected", "checkable", "checked"]) {
      try {
        const val = await element.getAttribute(attr);
        if (val !== null) attributes[attr] = val;
      } catch {
        // ignore
      }
    }

    return {
      elementId,
      tagName,
      text,
      bounds: { x: location.x, y: location.y, width: size.width, height: size.height },
      attributes,
    };
  }

  async installApp(apkPath: string, replace = false): Promise<void> {
    const args = ["install"];
    if (replace) args.push("-r");
    args.push(apkPath);
    await this.adb(args);
  }

  async launchApp(packageName: string, activity?: string, stopIfRunning = true): Promise<void> {
    const driver = this.ensureDriver();
    if (stopIfRunning) {
      await driver.terminateApp(packageName);
    }
    if (activity) {
      await driver.startActivity(packageName, activity);
    } else {
      await driver.activateApp(packageName);
    }
  }

  async adbShell(command: string, timeout = 30000): Promise<string> {
    const { stdout } = await execFileAsync("adb", ["shell", command], { timeout });
    return stdout.trim();
  }

  private async adb(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("adb", args, { timeout: 60000 });
    return stdout.trim();
  }

  async startRecording(path?: string, timeLimit = 180000): Promise<void> {
    const timestamp = Date.now();
    this.recordingPath = path || join(RECORDINGS_DIR, `recording-${timestamp}.mp4`);

    this.recordingProcess = spawn("adb", ["shell", "screenrecord", "--time-limit", String(Math.ceil(timeLimit / 1000)), this.recordingPath]);

    this.recordingProcess.stderr?.on("data", (data) => {
      console.error(`Recording stderr: ${data}`);
    });
  }

  async stopRecording(): Promise<string> {
    if (!this.recordingProcess || !this.recordingPath) {
      throw new Error("No recording in progress");
    }

    this.recordingProcess.kill("SIGINT");

    await new Promise<void>((resolve) => {
      this.recordingProcess!.on("exit", () => {
        setTimeout(resolve, 1000);
      });
    });

    const path = this.recordingPath;
    this.recordingProcess = null;
    this.recordingPath = null;

    const localPath = join(RECORDINGS_DIR, `recording-${Date.now()}.mp4`);
    await this.adb(["pull", path, localPath]);

    return localPath;
  }

  async pressKey(keycode: number, metastate = 0): Promise<void> {
    await this.adbShell(`input keyevent ${keycode} ${metastate}`);
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    const [serial, model, brand, androidVersion, sdkVersion, display] = await Promise.all([
      this.adbShell("getprop ro.serialno"),
      this.adbShell("getprop ro.product.model"),
      this.adbShell("getprop ro.product.brand"),
      this.adbShell("getprop ro.build.version.release"),
      this.adbShell("getprop ro.build.version.sdk"),
      this.adbShell("wm size"),
    ]);

    const density = await this.adbShell("wm density");
    const sizeMatch = display.match(/(\d+)x(\d+)/);
    const width = sizeMatch ? parseInt(sizeMatch[1]!, 10) : 0;
    const height = sizeMatch ? parseInt(sizeMatch[2]!, 10) : 0;

    return {
      serial,
      model,
      brand,
      androidVersion,
      sdkVersion,
      screenWidth: width,
      screenHeight: height,
      density: parseInt(density.split(": ")[1] || "0", 10),
    };
  }

  async listPackages(filter?: string): Promise<string[]> {
    let cmd = "pm list packages";
    if (filter) cmd += ` | grep ${filter}`;
    const output = await this.adbShell(cmd);
    return output.split("\n").map((l) => l.replace("package:", "").trim()).filter(Boolean);
  }

  async getLogcat(filter?: string, lines = 100): Promise<string> {
    let cmd = `logcat -d -t ${lines}`;
    if (filter) cmd += ` ${filter}`;
    return await this.adbShell(cmd);
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.deleteSession();
      this.driver = null;
    }
    if (this.recordingProcess) {
      this.recordingProcess.kill("SIGKILL");
    }
  }
}