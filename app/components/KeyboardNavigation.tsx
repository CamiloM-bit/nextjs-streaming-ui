'use client';

import { useEffect } from "react";

export default function KeyboardNavigation() {
  useEffect(() => {
    const getFocusable = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>("a, button, [tabindex='0']")
      ).filter(el => !el.hasAttribute("disabled"));

    const getClosest = (
      current: HTMLElement,
      direction: "up" | "down" | "left" | "right",
      elements: HTMLElement[]
    ) => {
      const currentRect = current.getBoundingClientRect();

      let candidates = elements.filter(el => el !== current);

      candidates = candidates.filter(el => {
        const rect = el.getBoundingClientRect();

        switch (direction) {
          case "up":
            return rect.bottom <= currentRect.top;
          case "down":
            return rect.top >= currentRect.bottom;
          case "left":
            return rect.right <= currentRect.left;
          case "right":
            return rect.left >= currentRect.right;
        }
      });

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();

        // Priorizar elementos que estén más alineados verticalmente (misma fila)
        const verticalDiffA = Math.abs(rectA.top - currentRect.top);
        const verticalDiffB = Math.abs(rectB.top - currentRect.top);
        
        // Si están en la misma fila (diferencia vertical pequeña), ordenar por distancia horizontal
        if (verticalDiffA < 50 && verticalDiffB < 50) {
          const distanceA = Math.abs(rectA.left - currentRect.left);
          const distanceB = Math.abs(rectB.left - currentRect.left);
          return distanceA - distanceB;
        }
        
        // Si no, priorizar por cercanía vertical primero, luego horizontal
        const distanceA = verticalDiffA + Math.abs(rectA.left - currentRect.left) * 0.5;
        const distanceB = verticalDiffB + Math.abs(rectB.left - currentRect.left) * 0.5;

        return distanceA - distanceB;
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

      // Solo permitir navegación horizontal si estamos en la misma "fila" (misma altura aproximada)
      if (e.key === "ArrowDown") {
        e.preventDefault();
        next = getClosest(current, "down", focusable);
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        next = getClosest(current, "up", focusable);
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        // Solo mover a la derecha si hay un elemento en la misma fila
        const currentRect = current.getBoundingClientRect();
        const sameRowElements = focusable.filter(el => {
          const rect = el.getBoundingClientRect();
          return Math.abs(rect.top - currentRect.top) < 100 && rect.left > currentRect.left;
        });
        
        if (sameRowElements.length > 0) {
          sameRowElements.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            return rectA.left - rectB.left;
          });
          next = sameRowElements[0];
        }
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        // Solo mover a la izquierda si hay un elemento en la misma fila
        const currentRect = current.getBoundingClientRect();
        const sameRowElements = focusable.filter(el => {
          const rect = el.getBoundingClientRect();
          return Math.abs(rect.top - currentRect.top) < 100 && rect.right < currentRect.left;
        });
        
        if (sameRowElements.length > 0) {
          sameRowElements.sort((a, b) => {
            const rectB = b.getBoundingClientRect();
            const rectA = a.getBoundingClientRect();
            return rectB.left - rectA.left;
          });
          next = sameRowElements[0];
        }
      }

      if (e.key === "Enter") {
        current.click();
      }

      next?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}