uniform float u_time;
uniform vec2 u_pos;
uniform vec2 u_size;
uniform vec3 u_color;

vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    vec4 c = def_frag();
    vec4 col = vec4(u_color/255.0, 1);
    return (c + vec4(mix(vec3(0), vec3(1), u_time), 0)) * col;
}
