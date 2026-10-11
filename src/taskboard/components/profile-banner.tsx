import { Sparkles } from "lucide-react";
import { bannerBackground } from "@/lib/appearance";
export function ProfileBanner({ color, image }: { color?: string; image?: string }) {
  const background = bannerBackground(color, image);
  return <div className={`product-profile-cover${background ? " product-profile-cover-custom" : ""}`} style={{ backgroundImage: background, backgroundSize: "cover", backgroundPosition: "center" }}>
    <span /><span /><span />
    <div className="product-profile-cover-caption"><Sparkles size={15} />Great work starts with people.</div>
  </div>;
}
