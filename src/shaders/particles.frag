uniform float uAlpha;
varying vec3 vColor;
varying float vAlpha;

void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.0, d);
  float a = pow(core, 2.4) * vAlpha * uAlpha * 0.5;
  gl_FragColor = vec4(vColor, a);
}
