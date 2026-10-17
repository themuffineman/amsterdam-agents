/**
 * Loads the project's one type family before any frame renders.
 *
 * Inter (SIL OFL 1.1, public/fonts/Inter-OFL.txt), vendored as the variable latin woff2 so:
 * - renders work offline and never hit Google at render time;
 * - every weight 100-900 is real (450, 480, 550 included). @remotion/google-fonts registers
 *   fixed weights only, which would clamp 480 to 400.
 *
 * Remotion holds rendering (delayRender) until the face is loaded. If it fails to load the
 * render is cancelled instead of silently falling back to a system font.
 */
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

export const FONT_FAMILY = "Inter";

let started = false;

export const loadFonts = () => {
  if (started || typeof document === "undefined") {
    return;
  }
  started = true;

  const handle = delayRender(`Loading font ${FONT_FAMILY}`);
  const face = new FontFace(
    FONT_FAMILY,
    `url(${staticFile("fonts/Inter-Variable-latin.woff2")}) format("woff2")`,
    { weight: "100 900", style: "normal" },
  );

  face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
      continueRender(handle);
    })
    .catch((err) => cancelRender(err));
};

// Start loading as soon as the bundle is evaluated (Root imports this module).
loadFonts();
