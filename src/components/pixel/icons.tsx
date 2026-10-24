import { Sprite } from "@/components/pixel/Sprite";

const INK = { X: "currentColor" };

const SPEAKER_ON = [
  "...X......",
  "..XX..X...",
  "XXXX...X..",
  "XXXX.X.X..",
  "XXXX.X.X..",
  "XXXX...X..",
  "..XX..X...",
  "...X......",
];
const SPEAKER_OFF = [
  "...X......",
  "..XX......",
  "XXXX.X..X.",
  "XXXX..XX..",
  "XXXX..XX..",
  "XXXX.X..X.",
  "..XX......",
  "...X......",
];
const ARROW = ["X....", "XX...", "XXX..", "XXXX.", "XXX..", "XX...", "X...."];
const BARS = [
  "XXXXXXXXX",
  "XXXXXXXXX",
  ".........",
  "XXXXXXXXX",
  "XXXXXXXXX",
  ".........",
  "XXXXXXXXX",
  "XXXXXXXXX",
];
const CLOSE = [
  "XX...XX",
  "XXX.XXX",
  ".XXXXX.",
  "..XXX..",
  ".XXXXX.",
  "XXX.XXX",
  "XX...XX",
];
const CHECK = ["......X", ".....XX", "X...XX.", "XX.XX..", ".XXX...", "..X...."];
const LOCK = [
  "..XXX..",
  ".X...X.",
  ".X...X.",
  "XXXXXXX",
  "XXXXXXX",
  "XXX.XXX",
  "XXX.XXX",
  "XXXXXXX",
  "XXXXXXX",
];

type IconProps = { unit?: string; className?: string };

export const SpeakerIcon = ({ on, unit = "2px", className }: IconProps & { on: boolean }) => (
  <Sprite rows={on ? SPEAKER_ON : SPEAKER_OFF} colors={INK} unit={unit} className={className} />
);
export const ArrowIcon = ({ unit = "3px", className }: IconProps) => (
  <Sprite rows={ARROW} colors={INK} unit={unit} className={className} />
);
export const MenuIcon = ({ unit = "2px", className }: IconProps) => (
  <Sprite rows={BARS} colors={INK} unit={unit} className={className} />
);
export const CloseIcon = ({ unit = "2px", className }: IconProps) => (
  <Sprite rows={CLOSE} colors={INK} unit={unit} className={className} />
);
export const CheckIcon = ({ unit = "2px", className }: IconProps) => (
  <Sprite rows={CHECK} colors={INK} unit={unit} className={className} />
);
export const LockIcon = ({ unit = "2px", className }: IconProps) => (
  <Sprite rows={LOCK} colors={INK} unit={unit} className={className} />
);
