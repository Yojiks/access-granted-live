import type { BannerConfig } from "@hacker-game/shared";

interface BannerSlotProps {
  banner: BannerConfig;
  position: "top" | "bottom";
}

const BannerSlot = ({ banner, position }: BannerSlotProps) => (
  <aside
    className={`banner-slot banner-slot--${position} banner-slot--${banner.mode}`}
    aria-label={`${position} ad banner`}
  >
    {banner.mode === "image" ? (
      <img src={banner.content} alt={banner.alt ?? "Sponsor banner"} />
    ) : (
      <span className="banner-slot__content">
        <span className="banner-slot__label">SPONSOR NODE</span>
        <span className="banner-slot__text">{banner.content}</span>
      </span>
    )}
  </aside>
);

export default BannerSlot;
