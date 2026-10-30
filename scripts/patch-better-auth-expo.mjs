import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const clientPath = require.resolve("@better-auth/expo/client");

const source = await readFile(clientPath, "utf8");
const original = `\t\t\t\t\tBrowser = await import("expo-web-browser");
\t\t\t\t\t} catch (error) {
\t\t\t\t\t\tthrow new Error("\\"expo-web-browser\\" is not installed as a dependency!", { cause: error });
\t\t\t\t\t}`;
const replacement = `\t\t\t\t\tBrowser = await import("expo-web-browser");
\t\t\t\t\t} catch {
\t\t\t\t\t\ttry {
\t\t\t\t\t\t\tBrowser = require("expo-web-browser");
\t\t\t\t\t\t} catch (error) {
\t\t\t\t\t\t\tthrow new Error("\\"expo-web-browser\\" is not installed as a dependency!", { cause: error });
\t\t\t\t\t\t}
\t\t\t\t\t}`;

if (source.includes(replacement)) {
  process.stdout.write("Better Auth Expo browser fallback already applied.\n");
} else if (source.includes(original)) {
  await writeFile(clientPath, source.replace(original, replacement));
  process.stdout.write("Applied Better Auth Expo browser fallback for Metro.\n");
} else {
  throw new Error(
    `Could not find the expected expo-web-browser import block in ${clientPath}`,
  );
}
