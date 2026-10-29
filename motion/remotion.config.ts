// Remotion CLI config. Applies to `remotion studio`, `render` and `still`.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Low-RAM machine: don't render with every core at once.
Config.setConcurrency(2);
// A machine without Remotion's own headless shell (or one it can't use, like a cloud container
// behind a TLS-intercepting proxy) can point it at another Chrome, the same one news-page uses.
if (process.env.CHROME_PATH) Config.setBrowserExecutable(process.env.CHROME_PATH);
