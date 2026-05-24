import { useEffect, useState } from "react";

export function useFlowCount(requested: number) {
  const [limit, setLimit] = useState(() => computeLimit());

  useEffect(() => {
    const onResize = () => setLimit(computeLimit());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return Math.max(1, Math.min(requested, limit));
}

function computeLimit() {
  if (typeof window === "undefined") return 6;
  const h = window.innerHeight;
  const w = window.innerWidth;
  if (w < 420) return h < 760 ? 3 : 4;
  if (w < 640) return h < 760 ? 4 : 5;
  if (h < 760) return 5;
  return 10;
}
