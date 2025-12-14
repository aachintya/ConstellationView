#version 300 es
precision highp float;

uniform vec4 u_LineColor;
uniform float u_NightModeIntensity;

out vec4 fragColor;

void main() {
    vec4 color = u_LineColor;
    
    if (u_NightModeIntensity > 0.0) {
        float red = color.r * 0.7 + (color.g + color.b) * 0.15;
        color.rgb = mix(color.rgb, vec3(red, 0.0, 0.0), u_NightModeIntensity);
    }
    
    fragColor = color;
}
