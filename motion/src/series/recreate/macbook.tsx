/**
 * MacBook mockup for the "recreate" series, built as a small 3D object (CSS preserve-3d), frame-
 * driven. Inspired by Aceternity UI's MacBook Scroll, rebuilt for proportion:
 * - lid as wide as the deck (16:10 screen), silver rim around black glass, thin bezel, notch;
 *   two faces (screen + aluminium back) so the closed lid shows its back;
 * - hinge band; deck with a recessed keyboard, speaker grilles, a large trackpad; a front lip with
 *   the thumb notch; a soft contact shadow.
 * `open` 0..1: 0 = lid shut flat on the keyboard (rotated 90° toward the viewer), 1 = open, leaning
 * back 8°. The camera looks down a little (the whole object is tilted by `tilt`).
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../lib/eases";
import { ramp } from "./moves";

const ALU = "linear-gradient(180deg, #E3E4E8 0%, #D2D3D8 55%, #C4C5CB 100%)";
const KEY_ROWS = [15, 14, 14, 13, 12, 10];

const Keyboard: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const gap = w * 0.0055;
  const fnH = (h - gap * 7) / 5.5 * 0.5;
  const rowH = (h - gap * 7 - fnH) / 5;
  return (
    <div style={{ width: w, height: h, background: "#2A2B2F", borderRadius: w * 0.012, padding: gap, display: "flex", flexDirection: "column", gap, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)" }}>
      {KEY_ROWS.map((n, r) => (
        <div key={r} style={{ display: "flex", gap, height: r === 0 ? fnH : rowH }}>
          {Array.from({ length: n }, (_, i) => {
            const flex = r === 5 ? (i === 4 ? 5.2 : i === 0 || i === n - 1 ? 1.2 : 1) : r > 0 && (i === 0 || i === n - 1) ? 1.55 : 1;
            return <div key={i} style={{ flex, background: "linear-gradient(180deg, #17181B 0%, #0E0F11 100%)", borderRadius: w * 0.0045 }} />;
          })}
        </div>
      ))}
    </div>
  );
};

const Grille: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <div style={{ width: w, height: h, backgroundImage: "radial-gradient(circle, rgba(70,72,80,0.75) 1px, transparent 1.4px)", backgroundSize: "7px 7px" }} />
);

export const MacBookModel: React.FC<{ width: number; open: number; screenOn?: number; tilt?: number; children?: React.ReactNode }> = ({ width: W, open, screenOn = 1, tilt = 10, children }) => {
  const lidH = W * 0.655;
  const deckD = W * 0.69;
  const rim = W * 0.006;
  const bezelX = W * 0.022;
  const bezelTop = W * 0.03;
  const bezelBottom = W * 0.034;
  const lidAngle = -89.5 + 97.5 * open; // rotateX about the hinge: -89.5 = shut on the deck, + leans back
  const face: React.CSSProperties = { position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", borderRadius: `${W * 0.028}px ${W * 0.028}px ${W * 0.01}px ${W * 0.01}px` };
  return (
    <div style={{ width: W, height: lidH + deckD * 0.85, position: "relative", perspective: W * 4, perspectiveOrigin: "50% 30%" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: lidH, transformStyle: "preserve-3d", transform: `rotateX(${-tilt}deg)`, transformOrigin: "50% 100%" }}>
        {/* contact shadow under the deck */}
        <div style={{ position: "absolute", left: W * 0.04, width: W * 0.92, top: lidH, height: deckD, transformOrigin: "50% 0%", transform: `translateZ(-2px) rotateX(90deg) translateY(${W * 0.01}px)`, background: "radial-gradient(60% 55% at 50% 50%, rgba(20,50,100,0.38), rgba(20,50,100,0) 70%)", filter: "blur(18px)" }} />
        {/* deck: hinged at the lid's bottom edge, lying flat toward the viewer */}
        <div style={{ position: "absolute", left: 0, top: lidH, width: W, height: deckD, transformOrigin: "50% 0%", transform: "rotateX(90deg)", transformStyle: "preserve-3d" }}>
          <div style={{ position: "absolute", inset: 0, background: ALU, borderRadius: `${W * 0.012}px ${W * 0.012}px ${W * 0.03}px ${W * 0.03}px`, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.5)" }}>
            {/* hinge recess */}
            <div style={{ position: "absolute", top: 0, left: W * 0.1, width: W * 0.8, height: deckD * 0.03, background: "#3A3B40", borderRadius: `0 0 ${W * 0.01}px ${W * 0.01}px` }} />
            <div style={{ position: "absolute", top: deckD * 0.075, left: W * 0.025 }}>
              <Grille w={W * 0.075} h={deckD * 0.43} />
            </div>
            <div style={{ position: "absolute", top: deckD * 0.075, right: W * 0.025 }}>
              <Grille w={W * 0.075} h={deckD * 0.43} />
            </div>
            <div style={{ position: "absolute", top: deckD * 0.07, left: W * 0.115 }}>
              <Keyboard w={W * 0.77} h={deckD * 0.45} />
            </div>
            <div style={{ position: "absolute", top: deckD * 0.57, left: W * 0.29, width: W * 0.42, height: deckD * 0.36, borderRadius: W * 0.016, background: "linear-gradient(180deg, #D8D9DE, #CDCED3)", boxShadow: "inset 0 0 0 1.2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)" }} />
          </div>
          {/* front lip with the thumb notch */}
          <div style={{ position: "absolute", left: W * 0.01, width: W * 0.98, top: deckD, height: W * 0.016, transformOrigin: "50% 0%", transform: "rotateX(-90deg)", background: "linear-gradient(180deg, #B9BAC0, #9FA0A7)", borderRadius: `0 0 ${W * 0.02}px ${W * 0.02}px` }}>
            <div style={{ position: "absolute", left: "50%", marginLeft: -W * 0.06, width: W * 0.12, height: W * 0.008, top: 0, background: "#8C8D94", borderRadius: `0 0 ${W * 0.02}px ${W * 0.02}px` }} />
          </div>
        </div>
        {/* hinge band */}
        <div style={{ position: "absolute", left: W * 0.09, width: W * 0.82, top: lidH - W * 0.006, height: W * 0.012, background: "linear-gradient(180deg, #2B2C30, #18191C)", borderRadius: W * 0.004, transform: "translateZ(-1px)" }} />
        {/* lid: screen face + aluminium back */}
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transformOrigin: "50% 100%", transform: `rotateX(${lidAngle}deg)` }}>
          <div style={{ ...face, background: "#B7B8BE", padding: rim }}>
            <div style={{ width: "100%", height: "100%", background: "#050506", borderRadius: `${W * 0.024}px ${W * 0.024}px ${W * 0.007}px ${W * 0.007}px`, padding: `${bezelTop}px ${bezelX}px ${bezelBottom}px`, position: "relative" }}>
              {/* notch */}
              <div style={{ position: "absolute", top: 0, left: "50%", width: W * 0.09, marginLeft: -W * 0.045, height: bezelTop + W * 0.011, background: "#050506", borderRadius: `0 0 ${W * 0.008}px ${W * 0.008}px`, zIndex: 2 }} />
              <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", borderRadius: W * 0.006, background: "#000" }}>
                <div style={{ position: "absolute", inset: 0, opacity: screenOn }}>{children}</div>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 38%)", pointerEvents: "none" }} />
              </div>
            </div>
          </div>
          <div style={{ ...face, transform: "rotateX(180deg)", background: "linear-gradient(180deg, #CDCED3, #B8B9BF)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.4)" }} />
        </div>
      </div>
    </div>
  );
};

/**
 * The MacBook as used in films: opens on `openAt` on a speed ramp (slow lift, fast swing, settle)
 * and the screen wakes as the lid passes upright. Wrap it in Float3D / a camera as needed.
 */
export const MacBook: React.FC<{ width: number; openAt: number; children?: React.ReactNode }> = ({ width, openAt, children }) => {
  const frame = useCurrentFrame();
  const open = ramp(frame, openAt, 40, 0).p;
  const on = tween(frame, openAt + 28, 14, 0, 1, "softInOut");
  return (
    <MacBookModel width={width} open={open} screenOn={on}>
      {children}
    </MacBookModel>
  );
};
