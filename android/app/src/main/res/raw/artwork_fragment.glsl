#version 300 es
precision mediump float;

uniform sampler2D u_Texture;
uniform float u_Opacity;
uniform float u_NightModeIntensity;

in vec2 v_TexCoord;
out vec4 FragColor;

void main() {
    vec4 texColor = texture(u_Texture, v_TexCoord);
    
    // Apply night mode (shift to red)
    vec3 color = texColor.rgb;
    if (u_NightModeIntensity > 0.0) {
        float luminance = dot(color, vec3(0.299, 0.587, 0.114));
        vec3 nightColor = vec3(luminance * 0.8, luminance * 0.2, luminance * 0.1);
        color = mix(color, nightColor, u_NightModeIntensity);
    }
    
    // Output with controlled opacity
    FragColor = vec4(color, texColor.a * u_Opacity);
}
