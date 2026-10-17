// Composition size presets. Both 30 fps: every timing number in the motion-craft
// skill is measured in frames at 30 fps.
export const FPS = 30;

export const LANDSCAPE = { width: 1920, height: 1080, fps: FPS } as const;
export const PORTRAIT = { width: 1080, height: 1920, fps: FPS } as const;

/** Seconds to frames at the project fps. */
export const sec = (s: number) => Math.round(s * FPS);
