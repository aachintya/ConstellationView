#version 300 es
precision mediump float;

uniform sampler2D u_Texture;
uniform float u_Opacity;
uniform float u_NightModeIntensity;

in vec2 v_TexCoord;
out vec4 FragColor;

void main() {
    vec4 texColor = texture(u_Texture, v_TexCoord);
    
    // Gentle edge feathering - only fade the very outer edges
    // Reduced to preserve constellation details (heads, limbs, etc.)
    float featherWidth = 0.08;  // Smaller = less aggressive fade
    vec2 center = v_TexCoord - 0.5;  // -0.5 to 0.5
    vec2 absCenter = abs(center);
    
    // Calculate edge fade (1.0 in center, 0.0 at very edge)
    float edgeFadeX = 1.0 - smoothstep(0.5 - featherWidth, 0.5, absCenter.x);
    float edgeFadeY = 1.0 - smoothstep(0.5 - featherWidth, 0.5, absCenter.y);
    float edgeFade = edgeFadeX * edgeFadeY;
    
    // Apply night mode (shift to red)
    vec3 color = texColor.rgb;
    if (u_NightModeIntensity > 0.0) {
        float luminance = dot(color, vec3(0.299, 0.587, 0.114));
        vec3 nightColor = vec3(luminance * 0.8, luminance * 0.2, luminance * 0.1);
        color = mix(color, nightColor, u_NightModeIntensity);
    }
    
    // Output with subtle edge feathering
    float finalAlpha = texColor.a * u_Opacity * edgeFade;
    FragColor = vec4(color, finalAlpha);
}
