#version 300 es
precision mediump float;

uniform sampler2D u_Texture;
uniform float u_Brightness;

in vec2 v_TexCoord;
out vec4 FragColor;

void main() {
    vec4 texColor = texture(u_Texture, v_TexCoord);
    vec3 color = texColor.rgb * u_Brightness;
    FragColor = vec4(color, 1.0);
}
