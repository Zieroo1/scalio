uniform sampler2D uPos;
uniform float uSide;
uniform float uMorph;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform vec2 uMouse;
uniform float uMouseForce;
uniform float uIntro;
uniform float uVelocity;
uniform vec3 uColorA;
uniform vec3 uColorB;

attribute vec2 aIndex;
attribute float aRand;

varying vec3 vColor;
varying float vAlpha;

// Ashima simplex noise 3D
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 shapePos(float s){
  vec3 p = texelFetch(uPos, ivec2(int(aIndex.x), int(aIndex.y + s * uSide)), 0).xyz;
  int si = int(s + 0.5);
  if (si == 0) {
    // living sphere
    float n = snoise(p * 0.75 + vec3(uTime * 0.18));
    p *= 1.0 + n * 0.16;
  } else if (si == 1) {
    // lattice pulses along its rails
    p += normalize(p + 0.0001) * sin(length(p) * 3.0 - uTime * 2.0) * 0.04;
  } else if (si == 4) {
    // galaxy rotates faster at the core
    float r = length(p.xz);
    float a = uTime * 0.25 / (r * 0.6 + 0.4);
    p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
  } else if (si == 5) {
    // data terrain
    p.y += sin(p.x * 1.1 + uTime * 0.9) * 0.28 + cos(p.z * 1.4 + uTime * 0.7) * 0.22
         + snoise(vec3(p.xz * 0.35, uTime * 0.15)) * 0.45;
  } else if (si == 6) {
    // portal swirl
    float a = uTime * 0.15 + aRand * 0.05;
    p.xy = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xy;
    p.z += sin(atan(p.y, p.x) * 6.0 + uTime) * 0.08;
  }
  return p;
}

void main(){
  float from = floor(uMorph);
  float to = min(from + 1.0, 6.0);
  float t = uMorph - from;
  // staggered per-particle transition
  float st = smoothstep(0.0, 1.0, clamp((t - aRand * 0.35) / 0.65, 0.0, 1.0));

  vec3 a = shapePos(from);
  vec3 b = shapePos(to);
  vec3 p = mix(a, b, st);

  // turbulence while morphing
  float turb = sin(st * 3.14159) * (0.55 + aRand * 0.6);
  vec3 n = vec3(
    snoise(p * 0.6 + vec3(uTime * 0.2, 0.0, 0.0)),
    snoise(p * 0.6 + vec3(0.0, uTime * 0.2, 17.0)),
    snoise(p * 0.6 + vec3(31.0, 0.0, uTime * 0.2))
  );
  p += n * (turb + uVelocity * 0.25);

  // intro: assemble from an exploded cloud
  float intro = smoothstep(0.0, 1.0, clamp((uIntro - aRand * 0.4) / 0.6, 0.0, 1.0));
  p = mix(p * (3.5 + aRand * 4.0) + n * 3.0, p, intro);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);

  // mouse repulsion in screen space
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 d = ndc - uMouse;
  // wide, soft falloff (squared smoothstep → no hard edge) and a gentle push with a slight swirl
  float fall = smoothstep(0.5, 0.0, length(d));
  float f = fall * fall * uMouseForce;
  vec2 dir = normalize(d + 0.0001);
  mv.xy += (dir + vec2(-dir.y, dir.x) * 0.35) * f * (0.18 + aRand * 0.1);

  gl_Position = projectionMatrix * mv;
  float size = uSize * (0.35 + aRand * 0.9) * (1.0 + f * 0.45);
  gl_PointSize = size * uPixelRatio * (1.0 / -mv.z);

  float h = clamp(p.y * 0.25 + 0.5, 0.0, 1.0);
  vColor = mix(uColorA, uColorB, clamp(h * 0.8 + aRand * 0.4 - 0.1, 0.0, 1.0));
  vColor = mix(vColor, vec3(1.0), f * 0.25 + step(0.985, aRand) * 0.5);
  vAlpha = (0.55 + aRand * 0.45) * intro;
}
