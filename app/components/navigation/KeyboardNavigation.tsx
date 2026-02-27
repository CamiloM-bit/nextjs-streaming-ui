'use client';

import { useEffect } from "react";

export default function KeyboardNavigation() {
  useEffect(() => {
    const getFocusable = () =>
      Array.from(document.querySelectorAll<HTMLElement>("a, button, [tabindex='0']"))
        .filter(el => !el.hasAttribute("disabled"));

    const getClosest = (current: HTMLElement, direction: "up" | "down" | "left" | "right", elements: HTMLElement[]) => {
      const currentRect = current.getBoundingClientRect();
      let candidates = elements.filter(el => el !== current);

      candidates = candidates.filter(el => {
        const rect = el.getBoundingClientRect();
        switch (direction) {
          case "up": return rect.bottom <= currentRect.top;
          case "down": return rect.top >= currentRect.bottom;
          case "left": return rect.right <= currentRect.left;
          case "right": return rect.left >= currentRect.right;
        }
      });

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        
        // Priorizar misma fila para left/right
        if (direction === "left" || direction === "right") {
          const vertDiffA = Math.abs(rectA.top - currentRect.top);
          const vertDiffB = Math.abs(rectB.top - currentRect.top);
          if (vertDiffA < 50 && vertDiffB < 50) {
            return Math.abs(rectA.left - currentRect.left) - Math.abs(rectB.left - currentRect.left);
          }
        }
        
        const distA = Math.abs(rectA.top - currentRect.top) + Math.abs(rectA.left - currentRect.left);
        const distB = Math.abs(rectB.top - currentRect.top) + Math.abs(rectB.left - currentRect.left);
        return distA - distB;
      });

      return candidates[0];
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const focusable = getFocusable();
      if (focusable.length === 0) return;

      let current = document.activeElement as HTMLElement;
      if (!focusable.includes(current)) {
        focusable[0].focus();
        return;
      }

      let next: HTMLElement | null = null;

      if (e.key === "ArrowDown") { e.preventDefault(); next = getClosest(current, "down", focusable); }
      if (e.key === "ArrowUp") { e.preventDefault(); next = getClosest(current, "up", focusable); }
      
      if (e.key === "ArrowRight") {
        e.preventDefault();
        // Solo mover si está en la misma fila
        const currentRect = current.getBoundingClientRect();
        const sameRow = focusable.filter(el => {
          const rect = el.getBoundingClientRect();
          return Math.abs(rect.top - currentRect.top) < 80 && rect.left > currentRect.left;
        });
        if (sameRow.length) {
          sameRow.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          next = sameRow[0];
        }
      }
      
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const currentRect = current.getBoundingClientRect();
        const sameRow = focusable.filter(el => {
          const rect = el.getBoundingClientRect();
          return Math.abs(rect.top - currentRect.top) < 80 && rect.right < currentRect.left;
        });
        if (sameRow.length) {
          sameRow.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
          next = sameRow[0];
        }
      }
 
      if (e.key === "Enter") current.click();
      next?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}