import type { Directive, DirectiveBinding } from "vue";

export interface TiltOptions {
  max?: number; // Max tilt rotation (degrees)
  perspective?: number; // Transform perspective (px)
  scale?: number; // Scale on hover
  speed?: number; // Transition speed (ms)
  reverse?: boolean; // Reverse the tilt direction
}

interface TiltElement extends HTMLElement {
  _tiltEnterHandler?: (event: MouseEvent) => void;
  _tiltMoveHandler?: (event: MouseEvent) => void;
  _tiltLeaveHandler?: (event: MouseEvent) => void;
}

const tiltDirective: Directive<TiltElement, TiltOptions | undefined> = {
  mounted(el: TiltElement, binding: DirectiveBinding<TiltOptions | undefined>) {
    const options = Object.assign({
      max: 10,
      perspective: 1000,
      scale: 1,
      speed: 600,
      reverse: false,
    }, binding.value || {});

    el.style.transition = `transform ${options.speed}ms cubic-bezier(.03,.98,.52,.99)`;
    el.style.transformStyle = "preserve-3d";
    el.style.willChange = "transform";

    const handleEnter = () => {
      el.style.transition = "none";
    };

    const handleMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left; // x position within the element
      const y = event.clientY - rect.top; // y position within the element

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const percentX = (x - centerX) / centerX;
      const percentY = (y - centerY) / centerY;

      let rotX = 0;
      let rotY = 0;

      if (options.reverse) {
        // "Look at mouse" (Corner comes up)
        rotX = percentY * options.max;
        rotY = -1 * percentX * options.max;
      }
      else {
        // "Sink" (Corner goes down)
        rotX = -1 * percentY * options.max;
        rotY = percentX * options.max;
      }

      el.style.transform = `
        perspective(${options.perspective}px)
        rotateX(${rotX}deg)
        rotateY(${rotY}deg)
        scale3d(${options.scale}, ${options.scale}, ${options.scale})
      `;
    };

    const handleLeave = () => {
      el.style.transition = `transform ${options.speed}ms cubic-bezier(.03,.98,.52,.99)`;
      el.style.transform = `
        perspective(${options.perspective}px)
        rotateX(0deg)
        rotateY(0deg)
        scale3d(1, 1, 1)
      `;
    };

    el._tiltEnterHandler = handleEnter;
    el._tiltMoveHandler = handleMove;
    el._tiltLeaveHandler = handleLeave;

    el.addEventListener("mouseenter", handleEnter);
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
  },

  unmounted(el: TiltElement) {
    if (el._tiltEnterHandler)
      el.removeEventListener("mouseenter", el._tiltEnterHandler);
    if (el._tiltMoveHandler)
      el.removeEventListener("mousemove", el._tiltMoveHandler);
    if (el._tiltLeaveHandler)
      el.removeEventListener("mouseleave", el._tiltLeaveHandler);
  },
};

export default tiltDirective;
