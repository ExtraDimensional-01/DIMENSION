import Image from "next/image";

/** The DIMENSION emblem. */
export function BrandMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{ width: size, height: size, position: "relative", display: "block", overflow: "hidden" }}
    >
      <Image
        src="/brand/logo-mark.png"
        alt="DIMENSION"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority={size >= 60}
      />
    </span>
  );
}
