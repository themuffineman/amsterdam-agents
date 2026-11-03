// Studio entry for lab work: only the lab's compositions, so it loads and hot-reloads fast.
// Start it with `npm run lab`. The films stay in src/index.ts.
import { registerRoot } from "remotion";
import { LabRoot } from "./LabRoot";

registerRoot(LabRoot);
