import bamuLogo from "../../BAMU.jpg";
import coepLogo from "../../COEP.jpg";
import kbcnmuLogo from "../../KBCNMU.png";
import muLogo from "../../MU.jpg";
import rtmnuLogo from "../../RTMNU.jpg";
import sgbauLogo from "../../SGBAU.jpg";
import sppuLogo from "../../SPPU.jpg";

const LOGOS: Record<string, string> = {
  BAMU: bamuLogo,
  COEP: coepLogo,
  KBCNMU: kbcnmuLogo,
  MU: muLogo,
  RTMNU: rtmnuLogo,
  SGBAU: sgbauLogo,
  SPPU: sppuLogo,
};

interface UniversityLogoProps {
  shortName: string;
  size?: "small" | "medium";
}

export function UniversityLogo({
  shortName,
  size = "medium",
}: UniversityLogoProps) {
  const logo = LOGOS[shortName];
  if (!logo) return null;

  return (
    <img
      className={`university-logo university-logo-${size}`}
      src={logo}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
    />
  );
}
