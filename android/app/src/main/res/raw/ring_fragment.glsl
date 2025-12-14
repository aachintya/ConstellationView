#version 300 es
precision highp float;

in vec2 v_TexCoord;
in vec3 v_Position;

uniform vec3 u_LightDir;
uniform float u_NightModeIntensity;

out vec4 fragColor;

// Noise for ring texture
float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
}

void main() {
    // Ring distance from center (v_TexCoord.y: 0=inner, 1=outer)
    float r = v_TexCoord.y;
    
    // Create ring bands with gaps (Cassini division, etc.)
    float bands = 0.0;
    
    // Main A ring (outer)
    float aRing = smoothstep(0.75, 0.78, r) * smoothstep(1.0, 0.97, r);
    
    // Cassini Division (gap)
    float cassini = 1.0 - smoothstep(0.68, 0.72, r) * smoothstep(0.75, 0.73, r);
    
    // B ring (brightest, middle)
    float bRing = smoothstep(0.45, 0.5, r) * smoothstep(0.72, 0.68, r);
    
    // C ring (inner, faint)
    float cRing = smoothstep(0.0, 0.1, r) * smoothstep(0.45, 0.35, r) * 0.4;
    
    bands = aRing + bRing * cassini + cRing;
    
    // Add fine structure/texture
    float fineDetail = noise(r * 200.0 + v_TexCoord.x * 50.0) * 0.15;
    float mediumDetail = noise(r * 50.0) * 0.1;
    bands += (fineDetail + mediumDetail) * bands;
    
    // Ring colors - tan/cream with slight variation
    vec3 ringColor = vec3(0.85, 0.78, 0.65);
    vec3 darkRing = vec3(0.6, 0.55, 0.45);
    vec3 brightRing = vec3(0.95, 0.9, 0.8);
    
    // Color variation based on radius
    float colorVar = noise(r * 30.0);
    vec3 color = mix(darkRing, brightRing, colorVar * 0.5 + 0.5);
    color = mix(color, ringColor, 0.5);
    
    // Simple lighting based on angle to light
    float lightAngle = max(dot(normalize(vec3(0.0, 1.0, 0.0)), normalize(u_LightDir)), 0.3);
    color *= 0.6 + lightAngle * 0.4;
    
    // Transparency - rings are semi-transparent
    float alpha = bands * 0.85;
    
    // Fade at edges
    alpha *= smoothstep(0.0, 0.05, r) * smoothstep(1.0, 0.95, r);
    
    // Night mode
    if (u_NightModeIntensity > 0.0) {
        float red = color.r * 0.7 + (color.g + color.b) * 0.15;
        color = mix(color, vec3(red, 0.0, 0.0), u_NightModeIntensity);
    }
    
    fragColor = vec4(color, alpha);
}
