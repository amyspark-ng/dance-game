uniform vec3 u_targetcolor;
uniform float u_alpha;

vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    vec4 o_color = texture2D(tex, uv);
    if (o_color.r > 0.01 && o_color.g < 0.01 && o_color.b < 0.01) return vec4(u_targetcolor / 255., u_alpha);
    return o_color;
}
