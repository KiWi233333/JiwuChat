<script setup lang="ts">
import { Mesh, Program, Renderer, Triangle } from "ogl";
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";

interface RippleGridProps {
  enableRainbow?: boolean;
  gridColor?: string;
  rippleIntensity?: number;
  gridSize?: number;
  gridThickness?: number;
  fadeDistance?: number;
  vignetteStrength?: number;
  glowIntensity?: number;
  opacity?: number;
  gridRotation?: number;
  mouseInteraction?: boolean;
  mouseInteractionRadius?: number;
}

const props = withDefaults(defineProps<RippleGridProps>(), {
  enableRainbow: false,
  gridColor: "#27FF64",
  rippleIntensity: 0.05,
  gridSize: 10.0,
  gridThickness: 15.0,
  fadeDistance: 1.5,
  vignetteStrength: 2.0,
  glowIntensity: 0.1,
  opacity: 1.0,
  gridRotation: 0,
  mouseInteraction: true,
  mouseInteractionRadius: 1,
});

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result && result[1] && result[2] && result[3]
    ? [Number.parseInt(result[1], 16) / 255, Number.parseInt(result[2], 16) / 255, Number.parseInt(result[3], 16) / 255]
    : [1, 1, 1];
}

const uniforms = {
  iTime: { value: 0 },
  iResolution: { value: [1, 1] },
  enableRainbow: { value: props.enableRainbow },
  gridColor: { value: hexToRgb(props.gridColor) },
  rippleIntensity: { value: props.rippleIntensity },
  gridSize: { value: props.gridSize },
  gridThickness: { value: props.gridThickness },
  fadeDistance: { value: props.fadeDistance },
  vignetteStrength: { value: props.vignetteStrength },
  glowIntensity: { value: props.glowIntensity },
  opacity: { value: props.opacity },
  gridRotation: { value: props.gridRotation },
  mouseInteraction: { value: props.mouseInteraction },
  mousePosition: { value: [0.5, 0.5] },
  mouseInfluence: { value: 0 },
  mouseInteractionRadius: { value: props.mouseInteractionRadius },
};

const containerRef = useTemplateRef("containerRef");
const mousePositionRef = ref({ x: 0.5, y: 0.5 });
const targetMouseRef = ref({ x: 0.5, y: 0.5 });
const mouseInfluenceRef = ref(0);
const uniformsRef = ref<typeof uniforms | null>(null);

onMounted(() => {
  if (!containerRef.value)
    return;

  const renderer = new Renderer({
    dpr: Math.min(window.devicePixelRatio, 2),
    alpha: true,
  });
  const gl = renderer.gl;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.canvas.style.width = "100%";
  gl.canvas.style.height = "100%";
  containerRef.value.appendChild(gl.canvas);

  const vert = `
attribute vec2 position;
varying vec2 vUv;
void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

  const frag = `precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform bool enableRainbow;
uniform vec3 gridColor;
uniform float rippleIntensity;
uniform float gridSize;
uniform float gridThickness;
uniform float fadeDistance;
uniform float vignetteStrength;
uniform float glowIntensity;
uniform float opacity;
uniform float gridRotation;
uniform bool mouseInteraction;
uniform vec2 mousePosition;
uniform float mouseInfluence;
uniform float mouseInteractionRadius;
varying vec2 vUv;

float pi = 3.141592;

mat2 rotate(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    if (gridRotation != 0.0) {
        uv = rotate(gridRotation * pi / 180.0) * uv;
    }

    float dist = length(uv);
    float func = sin(pi * (iTime - dist));
    vec2 rippleUv = uv + uv * func * rippleIntensity;

    if (mouseInteraction && mouseInfluence > 0.0) {
        vec2 mouseUv = (mousePosition * 2.0 - 1.0);
        mouseUv.x *= iResolution.x / iResolution.y;
        float mouseDist = length(uv - mouseUv);

        float influence = mouseInfluence * exp(-mouseDist * mouseDist / (mouseInteractionRadius * mouseInteractionRadius));

        float mouseWave = sin(pi * (iTime * 2.0 - mouseDist * 3.0)) * influence;
        rippleUv += normalize(uv - mouseUv) * mouseWave * rippleIntensity * 0.3;
    }

    vec2 a = sin(gridSize * 0.5 * pi * rippleUv - pi / 2.0);
    vec2 b = abs(a);

    float aaWidth = 0.5;
    vec2 smoothB = vec2(
        smoothstep(0.0, aaWidth, b.x),
        smoothstep(0.0, aaWidth, b.y)
    );

    vec3 color = vec3(0.0);
    color += exp(-gridThickness * smoothB.x * (0.8 + 0.5 * sin(pi * iTime)));
    color += exp(-gridThickness * smoothB.y);
    color += 0.5 * exp(-(gridThickness / 4.0) * sin(smoothB.x));
    color += 0.5 * exp(-(gridThickness / 3.0) * smoothB.y);

    if (glowIntensity > 0.0) {
        color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.x);
        color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.y);
    }

    float ddd = exp(-2.0 * clamp(pow(dist, fadeDistance), 0.0, 1.0));

    vec2 vignetteCoords = vUv - 0.5;
    float vignetteDistance = length(vignetteCoords);
    float vignette = 1.0 - pow(vignetteDistance * 2.0, vignetteStrength);
    vignette = clamp(vignette, 0.0, 1.0);

    vec3 t;
    if (enableRainbow) {
        t = vec3(
            uv.x * 0.5 + 0.5 * sin(iTime),
            uv.y * 0.5 + 0.5 * cos(iTime),
            pow(cos(iTime), 4.0)
        ) + 0.5;
    } else {
        t = gridColor;
    }

    float finalFade = ddd * vignette;
    float alpha = length(color) * finalFade * opacity;
    gl_FragColor = vec4(color * t * finalFade * opacity, alpha);
}`;

  uniformsRef.value = uniforms;

  const geometry = new Triangle(gl);
  const program = new Program(gl, { vertex: vert, fragment: frag, uniforms });
  const mesh = new Mesh(gl, { geometry, program });

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = containerRef.value!;
    renderer.setSize(w, h);
    uniforms.iResolution.value = [w, h];
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!props.mouseInteraction || !containerRef.value)
      return;
    const rect = containerRef.value.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;
    targetMouseRef.value = { x, y };
  };

  const handleMouseEnter = () => {
    if (!props.mouseInteraction)
      return;
    mouseInfluenceRef.value = 1.0;
  };

  const handleMouseLeave = () => {
    if (!props.mouseInteraction)
      return;
    mouseInfluenceRef.value = 0.0;
  };

  window.addEventListener("resize", resize);
  if (props.mouseInteraction) {
    containerRef.value.addEventListener("mousemove", handleMouseMove);
    containerRef.value.addEventListener("mouseenter", handleMouseEnter);
    containerRef.value.addEventListener("mouseleave", handleMouseLeave);
  }
  resize();

  const render = (t: number) => {
    uniforms.iTime.value = t * 0.001;

    const lerpFactor = 0.1;
    mousePositionRef.value.x += (targetMouseRef.value.x - mousePositionRef.value.x) * lerpFactor;
    mousePositionRef.value.y += (targetMouseRef.value.y - mousePositionRef.value.y) * lerpFactor;

    const currentInfluence = uniforms.mouseInfluence.value;
    const targetInfluence = mouseInfluenceRef.value;
    uniforms.mouseInfluence.value += (targetInfluence - currentInfluence) * 0.05;

    uniforms.mousePosition.value = [mousePositionRef.value.x, mousePositionRef.value.y];

    renderer.render({ scene: mesh });
    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);

  onUnmounted(() => {
    window.removeEventListener("resize", resize);
    if (props.mouseInteraction && containerRef.value) {
      containerRef.value.removeEventListener("mousemove", handleMouseMove);
      containerRef.value.removeEventListener("mouseenter", handleMouseEnter);
      containerRef.value.removeEventListener("mouseleave", handleMouseLeave);
    }
    renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
    containerRef.value?.removeChild(gl.canvas);
  });
});

watch(
  () => props,
  () => {
    if (!uniformsRef.value)
      return;

    uniformsRef.value.enableRainbow.value = props.enableRainbow;
    uniformsRef.value.gridColor.value = hexToRgb(props.gridColor);
    uniformsRef.value.rippleIntensity.value = props.rippleIntensity;
    uniformsRef.value.gridSize.value = props.gridSize;
    uniformsRef.value.gridThickness.value = props.gridThickness;
    uniformsRef.value.fadeDistance.value = props.fadeDistance;
    uniformsRef.value.vignetteStrength.value = props.vignetteStrength;
    uniformsRef.value.glowIntensity.value = props.glowIntensity;
    uniformsRef.value.opacity.value = props.opacity;
    uniformsRef.value.gridRotation.value = props.gridRotation;
    uniformsRef.value.mouseInteraction.value = props.mouseInteraction;
    uniformsRef.value.mouseInteractionRadius.value = props.mouseInteractionRadius;
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div ref="containerRef" class="relative h-full w-full overflow-hidden [&_canvas]:block" />
</template>
