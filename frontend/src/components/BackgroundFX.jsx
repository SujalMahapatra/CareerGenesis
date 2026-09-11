import React from "react";

// Ambient dark background with animated orbs + grid + grain.
// Sits behind app content. Non-interactive.
export const BackgroundFX = ({ variant = "landing" }) => {
  return (
    <div
      aria-hidden
      data-testid="background-fx"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#08080b]" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      {variant === "landing" ? (
        <>
          <div className="orb orb-violet orb-a" style={{ width: 520, height: 520, top: -120, left: -120 }} />
          <div className="orb orb-cyan orb-b" style={{ width: 460, height: 460, top: 40, right: -140 }} />
          <div className="orb orb-green orb-c" style={{ width: 380, height: 380, bottom: -120, left: "35%" }} />
        </>
      ) : (
        <>
          <div className="orb orb-violet orb-a" style={{ width: 380, height: 380, top: -140, right: -80, opacity: 0.4 }} />
          <div className="orb orb-cyan orb-b" style={{ width: 320, height: 320, bottom: -120, left: -80, opacity: 0.35 }} />
        </>
      )}
      <div className="grain absolute inset-0" />
      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)",
      }} />
    </div>
  );
};

export default BackgroundFX;
