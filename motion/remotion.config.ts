// Remotion CLI config. Applies to `remotion studio`, `render` and `still`.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Low-RAM machine: don't render with every core at once.
Config.setConcurrency(2);
