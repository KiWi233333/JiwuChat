<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";

interface ShaderParams {
  patternScale: number;
  refraction: number;
  edge: number;
  patternBlur: number;
  liquid: number;
  speed: number;
}

interface Props {
  imageUrl?: string;
  imageData?: ImageData;
  params?: ShaderParams;
}

const props = withDefaults(defineProps<Props>(), {
  params: () => ({
    patternScale: 2,
    refraction: 0.015,
    edge: 1,
    patternBlur: 0.005,
    liquid: 0.07,
    speed: 0.3,
  }),
});
const imageData = shallowRef<ImageData | null>(null);
const canvasRef = useTemplateRef<HTMLCanvasElement>("canvasRef");
const gl = ref<WebGL2RenderingContext | null>(null);
const uniforms = ref<Record<string, WebGLUniformLocation>>({});
const totalAnimationTime = ref(0);
const lastRenderTime = ref(0);
const animationId = ref<number>();

const vertexShaderSource = `#version 300 es
precision mediump float;

in vec2 a_position;
out vec2 vUv;

void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const liquidFragSource = `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D u_image_texture;
uniform float u_time;
uniform float u_ratio;
uniform float u_img_ratio;
uniform float u_patternScale;
uniform float u_refraction;
uniform float u_edge;
uniform float u_patternBlur;
uniform float u_liquid;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
    m = m*m;
    m = m*m;
    vec3 x = 2. * fract(p * C.www) - 1.;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130. * dot(m, g);
}

vec2 get_img_uv() {
    vec2 img_uv = vUv;
    img_uv -= .5;
    if (u_ratio > u_img_ratio) {
        img_uv.x = img_uv.x * u_ratio / u_img_ratio;
    } else {
        img_uv.y = img_uv.y * u_img_ratio / u_ratio;
    }
    float scale_factor = 1.;
    img_uv *= scale_factor;
    img_uv += .5;
    img_uv.y = 1. - img_uv.y;
    return img_uv;
}
vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
float get_color_channel(float c1, float c2, float stripe_p, vec3 w, float extra_blur, float b) {
    float ch = c2;
    float border = 0.;
    float blur = u_patternBlur + extra_blur;
    ch = mix(ch, c1, smoothstep(.0, blur, stripe_p));
    border = w[0];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
    b = smoothstep(.2, .8, b);
    border = w[0] + .4 * (1. - b) * w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    border = w[0] + .5 * (1. - b) * w[1];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
    border = w[0] + w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
    float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
    ch = mix(ch, gradient, smoothstep(border - blur, border + blur, stripe_p));
    return ch;
}
float get_img_frame_alpha(vec2 uv, float img_frame_width) {
    float img_frame_alpha = smoothstep(0., img_frame_width, uv.x) * smoothstep(1., 1. - img_frame_width, uv.x);
    img_frame_alpha *= smoothstep(0., img_frame_width, uv.y) * smoothstep(1., 1. - img_frame_width, uv.y);
    return img_frame_alpha;
}
void main() {
    vec2 uv = vUv;
    uv.y = 1. - uv.y;
    uv.x *= u_ratio;
    float diagonal = uv.x - uv.y;
    float t = .001 * u_time;
    vec2 img_uv = get_img_uv();
    vec4 img = texture(u_image_texture, img_uv);
    vec3 color = vec3(0.);
    float opacity = 1.;
    vec3 color1 = vec3(.98, 0.98, 1.);
    vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, uv.x + uv.y));
    float edge = img.r;
    vec2 grad_uv = uv;
    grad_uv -= .5;
    float dist = length(grad_uv + vec2(0., .2 * diagonal));
    grad_uv = rotate(grad_uv, (.25 - .2 * diagonal) * PI);
    float bulge = pow(1.8 * dist, 1.2);
    bulge = 1. - bulge;
    bulge *= pow(uv.y, .3);
    float cycle_width = u_patternScale;
    float thin_strip_1_ratio = .12 / cycle_width * (1. - .4 * bulge);
    float thin_strip_2_ratio = .07 / cycle_width * (1. + .4 * bulge);
    float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);
    float thin_strip_1_width = cycle_width * thin_strip_1_ratio;
    float thin_strip_2_width = cycle_width * thin_strip_2_ratio;
    opacity = 1. - smoothstep(.9 - .5 * u_edge, 1. - .5 * u_edge, edge);
    opacity *= get_img_frame_alpha(img_uv, 0.01);
    float noise = snoise(uv - t);
    edge += (1. - edge) * u_liquid * noise;
    float refr = 0.;
    refr += (1. - bulge);
    refr = clamp(refr, 0., 1.);
    float dir = grad_uv.x;
    dir += diagonal;
    dir -= 2. * noise * diagonal * (smoothstep(0., 1., edge) * smoothstep(1., 0., edge));
    bulge *= clamp(pow(uv.y, .1), .3, 1.);
    dir *= (.1 + (1.1 - edge) * bulge);
    dir *= smoothstep(1., .7, edge);
    dir += .18 * (smoothstep(.1, .2, uv.y) * smoothstep(.4, .2, uv.y));
    dir += .03 * (smoothstep(.1, .2, 1. - uv.y) * smoothstep(.4, .2, 1. - uv.y));
    dir *= (.5 + .5 * pow(uv.y, 2.));
    dir *= cycle_width;
    dir -= t;
    float refr_r = refr;
    refr_r += .03 * bulge * noise;
    float refr_b = 1.3 * refr;
    refr_r += 5. * (smoothstep(-.1, .2, uv.y) * smoothstep(.5, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(1., .4, bulge));
    refr_r -= diagonal;
    refr_b += (smoothstep(0., .4, uv.y) * smoothstep(.8, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(.8, .4, bulge));
    refr_b -= .2 * edge;
    refr_r *= u_refraction;
    refr_b *= u_refraction;
    vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
    w[1] -= .02 * smoothstep(.0, 1., edge + bulge);
    float stripe_r = mod(dir + refr_r, 1.);
    float r = get_color_channel(color1.r, color2.r, stripe_r, w, 0.02 + .03 * u_refraction * bulge, bulge);
    float stripe_g = mod(dir, 1.);
    float g = get_color_channel(color1.g, color2.g, stripe_g, w, 0.01 / (1. - diagonal), bulge);
    float stripe_b = mod(dir - refr_b, 1.);
    float b = get_color_channel(color1.b, color2.b, stripe_b, w, .01, bulge);
    color = vec3(r, g, b);
    color *= opacity;
    fragColor = vec4(color, opacity);
}
`;

// parseImage函数：将图片文件解析为ImageData
async function parseImage(file: File): Promise<{ imageData: ImageData }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("无法获取Canvas上下文"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve({ imageData });
      };
      img.onerror = function (err) {
        reject(err);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = function (err) {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 加载图片
 */
async function loadImageData() {
  try {
    // 示例：获取SVG图片并解析
    // 建议SVG为透明背景、黑色填充
    const response = await fetch("/logo.png");
    const blob = await response.blob();
    const file = new File([blob], "logo.svg", { type: blob.type });
    const { imageData: processedImageData } = await parseImage(file);
    imageData.value = processedImageData;
  }
  catch (err) {
    console.error("加载图片出错:", err);
  }
}


onMounted(() => {
  loadImageData();
});

function updateUniforms() {
  if (!gl.value || !uniforms.value)
    return;
  gl.value.uniform1f(uniforms.value.u_edge!, props.params.edge);
  gl.value.uniform1f(uniforms.value.u_patternBlur!, props.params.patternBlur);
  gl.value.uniform1f(uniforms.value.u_time!, 0);
  gl.value.uniform1f(uniforms.value.u_patternScale!, props.params.patternScale);
  gl.value.uniform1f(uniforms.value.u_refraction!, props.params.refraction);
  gl.value.uniform1f(uniforms.value.u_liquid!, props.params.liquid);
}

function createShader(gl: WebGL2RenderingContext, sourceCode: string, type: number) {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, sourceCode);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function getUniforms(program: WebGLProgram, gl: WebGL2RenderingContext) {
  const uniformsObj: Record<string, WebGLUniformLocation> = {};
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    const uniformName = gl.getActiveUniform(program, i)?.name;
    if (!uniformName)
      continue;
    uniformsObj[uniformName] = gl.getUniformLocation(program, uniformName) as WebGLUniformLocation;
  }
  return uniformsObj;
}

function initShader() {
  const canvas = canvasRef.value;
  const glContext = canvas?.getContext("webgl2", {
    antialias: true,
    alpha: true,
  });
  if (!canvas || !glContext) {
    return;
  }

  const vertexShader = createShader(glContext, vertexShaderSource, glContext.VERTEX_SHADER);
  const fragmentShader = createShader(glContext, liquidFragSource, glContext.FRAGMENT_SHADER);
  const program = glContext.createProgram();
  if (!program || !vertexShader || !fragmentShader) {
    return;
  }

  glContext.attachShader(program, vertexShader);
  glContext.attachShader(program, fragmentShader);
  glContext.linkProgram(program);

  if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
    console.error(`Unable to initialize the shader program: ${glContext.getProgramInfoLog(program)}`);
    return null;
  }

  const uniformsObj = getUniforms(program, glContext);
  uniforms.value = uniformsObj;

  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const vertexBuffer = glContext.createBuffer();
  glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
  glContext.bufferData(glContext.ARRAY_BUFFER, vertices, glContext.STATIC_DRAW);

  glContext.useProgram(program);

  const positionLocation = glContext.getAttribLocation(program, "a_position");
  glContext.enableVertexAttribArray(positionLocation);

  glContext.bindBuffer(glContext.ARRAY_BUFFER, vertexBuffer);
  glContext.vertexAttribPointer(positionLocation, 2, glContext.FLOAT, false, 0, 0);

  gl.value = glContext;
}

function resizeCanvas() {
  if (!canvasRef.value || !gl.value || !uniforms.value || !imageData.value)
    return;
  const imgRatio = imageData.value.width / imageData.value.height;
  gl.value.uniform1f(uniforms.value.u_img_ratio!, imgRatio);

  const side = 1000;
  canvasRef.value.width = side * devicePixelRatio;
  canvasRef.value.height = side * devicePixelRatio;
  gl.value.viewport(0, 0, canvasRef.value.height, canvasRef.value.height);
  gl.value.uniform1f(uniforms.value.u_ratio!, 1);
  gl.value.uniform1f(uniforms.value.u_img_ratio!, imgRatio);
}

function setupTexture() {
  if (!gl.value || !uniforms.value)
    return;

  const existingTexture = gl.value.getParameter(gl.value.TEXTURE_BINDING_2D);
  if (existingTexture) {
    gl.value.deleteTexture(existingTexture);
  }

  const imageTexture = gl.value.createTexture();
  gl.value.activeTexture(gl.value.TEXTURE0);
  gl.value.bindTexture(gl.value.TEXTURE_2D, imageTexture);

  gl.value.texParameteri(gl.value.TEXTURE_2D, gl.value.TEXTURE_MIN_FILTER, gl.value.LINEAR);
  gl.value.texParameteri(gl.value.TEXTURE_2D, gl.value.TEXTURE_MAG_FILTER, gl.value.LINEAR);
  gl.value.texParameteri(gl.value.TEXTURE_2D, gl.value.TEXTURE_WRAP_S, gl.value.CLAMP_TO_EDGE);
  gl.value.texParameteri(gl.value.TEXTURE_2D, gl.value.TEXTURE_WRAP_T, gl.value.CLAMP_TO_EDGE);

  gl.value.pixelStorei(gl.value.UNPACK_ALIGNMENT, 1);

  try {
    gl.value.texImage2D(
      gl.value.TEXTURE_2D,
      0,
      gl.value.RGBA,
      imageData.value?.width ?? 0,
      imageData.value?.height ?? 0,
      0,
      gl.value.RGBA,
      gl.value.UNSIGNED_BYTE,
      imageData.value?.data ?? null,
    );

    gl.value.uniform1i(uniforms.value.u_image_texture!, 0);
  }
  catch (e) {
    console.error("Error uploading texture:", e);
  }
}

function render(currentTime: number) {
  if (!gl.value || !uniforms.value)
    return;

  const deltaTime = currentTime - lastRenderTime.value;
  lastRenderTime.value = currentTime;

  totalAnimationTime.value += deltaTime * props.params.speed;
  gl.value.uniform1f(uniforms.value.u_time!, totalAnimationTime.value);
  gl.value.drawArrays(gl.value.TRIANGLE_STRIP, 0, 4);
  animationId.value = requestAnimationFrame(render);
}

function startAnimation() {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }
  lastRenderTime.value = performance.now();
  animationId.value = requestAnimationFrame(render);
}

onMounted(async () => {
  await nextTick();
  initShader();
  updateUniforms();
  resizeCanvas();
  setupTexture();
  startAnimation();

  window.addEventListener("resize", resizeCanvas);
});

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }
  window.removeEventListener("resize", resizeCanvas);
});

watch(
  () => props.params,
  () => {
    updateUniforms();
  },
  { deep: true },
);

watch(
  () => imageData.value,
  () => {
    setupTexture();
    resizeCanvas();
  },
  { deep: true },
);
</script>

<template>
  <canvas ref="canvasRef" class="block h-full w-full object-contain" />
</template>
