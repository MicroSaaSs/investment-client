import {useEffect, useState} from "react";

export function useScrollNavVisibility() {
  const [direction, setDirection] = useState("up");
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY || 0;
    let ticking = false;

    function update() {
      const currentY = window.scrollY || 0;
      const delta = currentY - lastY;
      const nextAtTop = currentY <= 8;

      setAtTop(nextAtTop);

      if (Math.abs(delta) > 8) {
        if (nextAtTop) {
          setDirection("up");
        } else {
          setDirection(delta > 0 ? "down" : "up");
        }
        lastY = currentY;
      }

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, {passive: true});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return {
    showTopBar: !atTop && direction === "down",
    showBottomNav: atTop || direction === "up",
  };
}
