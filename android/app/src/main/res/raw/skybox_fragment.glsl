#version 300 es
precision mediump float;

uniform sampler2D u_Texture;
uniform float u_Brightness;
uniform float u_NightModeIntensity;

in vec2 v_TexCoord;
out vec4 FragColor;

void main() {
    vec4 texColor = texture(u_Texture, v_TexCoord);
    
    // Convert to grayscale intensity
    float intensity = (texColor.r + texColor.g + texColor.b) / 3.0;
    
    // Apply Stellarium-style blue/purple tint
    // This gives the characteristic "cool night sky" look
    vec3 tintedColor = vec3(
        intensity * 0.25,   // Red - very low
        intensity * 0.35,   // Green - low  
        intensity * 0.65    // Blue - high
    );
    
    // Apply brightness
    tintedColor *= u_Brightness;
    
    // Night mode - shift to red
    if (u_NightModeIntensity > 0.0) {
        float avg = (tintedColor.r + tintedColor.g + tintedColor.b) / 3.0;
        tintedColor = mix(tintedColor, vec3(avg * 0.8, 0.0, 0.0), u_NightModeIntensity);
    }
    
    FragColor = vec4(tintedColor, 1.0);
}
