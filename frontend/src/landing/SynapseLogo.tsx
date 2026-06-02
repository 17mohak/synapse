// The Synapse mark: "The Aperture". An instrument ring (a lens / observatory)
// enclosing a single trajectory that climbs and resolves to a gold node piercing
// the ring. It is the chart itself in miniature, so it reads as scientific and
// ownably Synapse, not a generic AI swirl, brain, or badge. Ring and climb take
// currentColor (so the ribbon and footer can recolor them); the node stays gold.
export default function SynapseLogo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`logo${className ? ` ${className}` : ""}`}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="Synapse"
    >
      <circle className="logo__ring" cx="16" cy="16" r="12.5" fill="none" />
      <path
        className="logo__climb"
        d="M7.8 22.6 C 11.4 21.9 13 17.6 15.8 15 C 18.4 12.6 21.6 9.8 25 7.8"
        fill="none"
      />
      <circle className="logo__seed" cx="7.8" cy="22.6" r="1" />
      <circle className="logo__node" cx="25" cy="7.8" r="2.6" />
    </svg>
  );
}
