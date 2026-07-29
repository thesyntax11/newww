import { clsx } from "clsx";
import { ReactNode } from "react";

export default function GlassPanel({
  children,
  className,
  soft = false
}: {
  children: ReactNode;
  className?: string;
  soft?: boolean;
}) {
  return <div className={clsx(soft ? "glass-soft" : "glass", className)}>{children}</div>;
}
