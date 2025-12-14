#version 300 es
precision highp float;

// Star fragment shader - Beautiful glowing stars with magnitude-dependent brightness and twinkle
in vec3 v_Color;
in float v_Glow;  // Higher for brighter stars (based on magnitude)
in float v_TwinkleSeed;  // Unique seed for each star's twinkle animation

uniform float u_NightModeIntensity;
uniform float u_Time;  // Time in seconds

out vec4 fragColor;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord) * 2.0;
    
    if (dist > 1.0) {
        discard;
    }
    
    // ============= Twinkle Effect =============
    // Each star twinkles at its own frequency and phase
    float twinklePhase = v_TwinkleSeed * 6.28318;  // Unique phase per star
    float twinkleFreq = 1.5 + v_TwinkleSeed * 2.0;  // Frequency: 1.5-3.5 Hz
    
    // Multiple sine waves for more organic twinkle
    float twinkle1 = sin(u_Time * twinkleFreq + twinklePhase);
    float twinkle2 = sin(u_Time * twinkleFreq * 1.7 + twinklePhase * 2.3) * 0.5;
    float twinkle3 = sin(u_Time * twinkleFreq * 0.5 + twinklePhase * 0.7) * 0.3;
    float twinkle = (twinkle1 + twinkle2 + twinkle3) / 1.8;  // Normalize to roughly -1 to 1
    
    // Brighter stars twinkle less (they're more stable)
    // Dimmer stars (lower v_Glow) twinkle more dramatically
    float twinkleAmount = mix(0.25, 0.08, v_Glow);  // 25% for dim, 8% for bright
    float twinkleFactor = 1.0 + twinkle * twinkleAmount;
    
    // Brightness multiplier based on magnitude (v_Glow: 0 = dim, 1 = bright)
    float brightnessFactor = (0.4 + v_Glow * 1.6) * twinkleFactor;  // Range: 0.4 to 2.0, modulated by twinkle
    
    // Core - bright center
    float coreSize = 0.2;
    float core = 1.0 - smoothstep(0.0, coreSize, dist);
    core = pow(core, 0.4) * brightnessFactor;
    
    // Inner glow
    float innerGlowSize = 0.5;
    float innerGlow = 1.0 - smoothstep(coreSize, innerGlowSize, dist);
    innerGlow *= 0.5 * brightnessFactor;
    
    // Outer soft halo - more for brighter stars, also affected by twinkle
    float outerGlow = 1.0 - smoothstep(innerGlowSize, 1.0, dist);
    outerGlow *= v_Glow * 0.4 * twinkleFactor;
    
    // Combine
    float totalIntensity = core + innerGlow + outerGlow;
    
    // Core is white-hot for bright stars, dimmer stars show more color
    float whiteness = v_Glow * 0.6;
    vec3 coreColor = mix(v_Color, vec3(1.0), whiteness);
    vec3 glowColor = v_Color * 1.3;
    
    float colorMix = smoothstep(0.0, 0.4, dist);
    vec3 finalColor = mix(coreColor, glowColor, colorMix);
    finalColor *= totalIntensity;
    
    // Night mode
    if (u_NightModeIntensity > 0.0) {
        float red = finalColor.r * 0.7 + (finalColor.g + finalColor.b) * 0.15;
        finalColor = mix(finalColor, vec3(red, 0.0, 0.0), u_NightModeIntensity);
    }
    
    float alpha = min(totalIntensity, 1.0);
    fragColor = vec4(finalColor, alpha);
}

