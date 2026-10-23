/**
 * Device mockups for the "recreate" series, frame-driven. (The MacBook lives in macbook.tsx.)
 *
 * - SafariWindow: the toolbar of Magic UI's Safari mockup (magicui.design/docs/components/safari,
 *   MIT, icon paths kept), drawn with our tokens: rounded window, dots, address pill, URL that can
 *   type in on a cue.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { tween } from "../../lib/eases";
import { F } from "./tokens";

// ---------------------------------------------------------------- Safari

/** Toolbar icon paths from Magic UI's Safari mockup (MIT), in its 1203-wide coordinate space. */
const ICONS = {
  sidebar:
    "M99.5703 33.6016H112.938C114.633 33.6016 115.516 32.7266 115.516 31.0547V21.5469C115.516 19.875 114.633 19 112.938 19H99.5703C97.8828 19 97 19.8672 97 21.5469V31.0547C97 32.7266 97.8828 33.6016 99.5703 33.6016ZM99.6719 32.0469C98.9531 32.0469 98.5547 31.6719 98.5547 30.9141V21.6875C98.5547 20.9297 98.9531 20.5547 99.6719 20.5547H103.234V32.0469H99.6719ZM112.836 20.5547C113.555 20.5547 113.953 20.9297 113.953 21.6875V30.9141C113.953 31.6719 113.555 32.0469 112.836 32.0469H104.711V20.5547H112.836Z",
  back: "M143.914 32.5938C144.094 32.7656 144.312 32.8594 144.562 32.8594C145.086 32.8594 145.492 32.4531 145.492 31.9375C145.492 31.6797 145.391 31.4453 145.211 31.2656L139.742 25.9219L145.211 20.5938C145.391 20.4141 145.492 20.1719 145.492 19.9219C145.492 19.4062 145.086 19 144.562 19C144.312 19 144.094 19.0938 143.922 19.2656L137.844 25.2031C137.625 25.4062 137.516 25.6562 137.516 25.9297C137.516 26.2031 137.625 26.4375 137.836 26.6484L143.914 32.5938Z",
  forward:
    "M168.422 32.8594C168.68 32.8594 168.891 32.7656 169.07 32.5938L175.148 26.6562C175.359 26.4375 175.469 26.2109 175.469 25.9297C175.469 25.6562 175.367 25.4141 175.148 25.2109L169.07 19.2656C168.891 19.0938 168.68 19 168.422 19C167.898 19 167.492 19.4062 167.492 19.9219C167.492 20.1719 167.602 20.4141 167.773 20.5938L173.25 25.9375L167.773 31.2656C167.594 31.4531 167.492 31.6797 167.492 31.9375C167.492 32.4531 167.898 32.8594 168.422 32.8594Z",
  plus: "M1134 33.0156C1134.49 33.0156 1134.89 32.6094 1134.89 32.1484V27.2578H1139.66C1140.13 27.2578 1140.54 26.8594 1140.54 26.3672C1140.54 25.8828 1140.13 25.4766 1139.66 25.4766H1134.89V20.5859C1134.89 20.1172 1134.49 19.7188 1134 19.7188C1133.52 19.7188 1133.11 20.1172 1133.11 20.5859V25.4766H1128.34C1127.88 25.4766 1127.46 25.8828 1127.46 26.3672C1127.46 26.8594 1127.88 27.2578 1128.34 27.2578H1133.11V32.1484C1133.11 32.6094 1133.52 33.0156 1134 33.0156Z",
  lock: "M566.269 32.0852H572.426C573.277 32.0852 573.696 31.6663 573.696 30.7395V25.9851C573.696 25.1472 573.353 24.7219 572.642 24.6521V23.0842C572.642 20.6721 571.036 19.5105 569.348 19.5105C567.659 19.5105 566.053 20.6721 566.053 23.0842V24.6711C565.393 24.7727 565 25.1917 565 25.9851V30.7395C565 31.6663 565.418 32.0852 566.269 32.0852ZM567.272 22.97C567.272 21.491 568.211 20.6785 569.348 20.6785C570.478 20.6785 571.423 21.491 571.423 22.97V24.6394L567.272 24.6458V22.97Z",
};

/**
 * A Safari window (light toolbar, white page frame) around `children`. The URL types in from
 * `urlAt`. Height is the whole window including the 52/1203-scaled toolbar.
 */
export const SafariWindow: React.FC<{ width: number; height: number; url: string; urlAt?: number; children: React.ReactNode }> = ({ width, height, url, urlAt = 0, children }) => {
  const frame = useCurrentFrame();
  const k = width / 1203;
  const barH = 52 * k;
  const shown = Math.round(tween(frame, urlAt, 14, 0, url.length, "cruise"));
  return (
    <div style={{ width, height, borderRadius: 14 * k, overflow: "hidden", background: "#E5E5E5", padding: 1, boxShadow: "0 50px 100px rgba(20,60,120,0.32), 0 10px 24px rgba(20,60,120,0.16)" }}>
      <svg width={width - 2} height={barH} viewBox="1 1 1201 51" style={{ display: "block" }}>
        <rect x={1} y={1} width={1201} height={51} fill="#FFFFFF" />
        {[27, 47, 67].map((cx, i) => (
          <circle key={cx} cx={cx} cy={25} r={6} fill={["#FF5F57", "#FEBC2E", "#28C840"][i]} />
        ))}
        <path d={ICONS.sidebar} fill="#A3A3A3" />
        <path d={ICONS.back} fill="#A3A3A3" />
        <path d={ICONS.forward} fill="#D4D4D4" />
        <rect x={286} y={11} width={666} height={30} rx={6} fill="#EFEFEF" />
        <path d={ICONS.lock} fill="#A3A3A3" transform={`translate(${-565 + 470 - url.length * 1.6} 0)`} />
        <text x={619 - url.length * 3.2 + 10} y={30.5} fill="#5A5A5A" fontSize={13} style={{ fontFamily: F.body.fontFamily }}>
          {url.slice(0, shown)}
        </text>
        <path d={ICONS.plus} fill="#A3A3A3" />
      </svg>
      <div style={{ position: "relative", height: height - barH - 2, borderRadius: `0 0 ${12 * k}px ${12 * k}px`, overflow: "hidden" }}>{children}</div>
    </div>
  );
};
