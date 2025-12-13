#version 300 es
precision highp float;

in vec3 v_Normal;
in vec3 v_FragPos;
in vec2 v_TexCoord;

uniform sampler2D u_Texture;
uniform vec3 u_LightDir;
uniform vec3 u_ViewPos;
uniform float u_AmbientStrength;
uniform float u_NightModeIntensity;
uniform int u_IsSun;

out vec4 fragColor;

void main() {
    vec4 texColor = texture(u_Texture, v_TexCoord);
    
    // Sun rendering - enhanced glow with animated-like appearance
    if (u_IsSun == 1) {
        vec3 color = texColor.rgb;
        
        // Calculate view direction
        vec3 norm = normalize(v_Normal);
        vec3 viewDir = normalize(u_ViewPos - v_FragPos);
        float ndotv = max(dot(norm, viewDir), 0.0);
        
        // Fresnel effect for corona
        float fresnel = 1.0 - ndotv;
        fresnel = pow(fresnel, 1.5);
        
        // Multi-layered corona effect
        vec3 innerCorona = vec3(1.0, 0.95, 0.8) * pow(fresnel, 1.0) * 0.4;
        vec3 midCorona = vec3(1.0, 0.7, 0.2) * pow(fresnel, 2.0) * 0.6;
        vec3 outerCorona = vec3(1.0, 0.4, 0.1) * pow(fresnel, 3.0) * 0.3;
        
        // Surface detail enhancement
        float surfaceIntensity = length(texColor.rgb);
        color = color * (1.0 + surfaceIntensity * 0.3);
        
        // Combine corona layers
        color = color + innerCorona + midCorona + outerCorona;
        
        // Overall brightness boost with HDR-like effect
        color = color * 1.5;
        color = color / (color + vec3(1.0)) * 1.8; // Tone mapping
        
        if (u_NightModeIntensity > 0.0) {
            float red = color.r * 0.7 + (color.g + color.b) * 0.15;
            color = mix(color, vec3(red, 0.0, 0.0), u_NightModeIntensity);
        }
        fragColor = vec4(color, texColor.a);
        return;
    }
    
    vec3 norm = normalize(v_Normal);
    vec3 lightDir = normalize(u_LightDir);
    vec3 viewDir = normalize(u_ViewPos - v_FragPos);
    
    // Enhanced ambient with slight blue tint for space
    vec3 ambient = u_AmbientStrength * texColor.rgb * vec3(0.85, 0.9, 1.0);
    
    // Diffuse lighting with softer falloff
    float diff = max(dot(norm, lightDir), 0.0);
    diff = pow(diff, 0.8); // Softer falloff
    vec3 diffuse = diff * texColor.rgb;
    
    // Specular highlights (Blinn-Phong) - more subtle
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(norm, halfwayDir), 0.0), 32.0);
    vec3 specular = spec * vec3(0.25);
    
    // Combine lighting
    vec3 result = ambient + diffuse + specular;
    
    // Enhanced terminator with softer shadow transition
    float terminator = smoothstep(-0.1, 0.35, dot(norm, lightDir));
    result = mix(ambient * 0.15, result, terminator);
    
    // Atmospheric rim lighting (colored by planet)
    float rim = 1.0 - max(dot(norm, viewDir), 0.0);
    rim = pow(rim, 2.5);
    
    // Calculate atmospheric color based on planet's base color
    vec3 avgColor = texColor.rgb;
    vec3 atmosphereColor = mix(vec3(0.4, 0.6, 1.0), avgColor, 0.3);
    vec3 rimGlow = atmosphereColor * rim * 0.5 * (0.5 + terminator * 0.5);
    result += rimGlow;
    
    // Subtle subsurface scattering effect on terminator
    float sss = pow(max(0.0, -dot(norm, lightDir) + 0.3), 2.0) * 0.1;
    result += texColor.rgb * sss * vec3(1.0, 0.8, 0.6);
    
    // Night mode
    if (u_NightModeIntensity > 0.0) {
        float red = result.r * 0.7 + (result.g + result.b) * 0.15;
        result = mix(result, vec3(red, 0.0, 0.0), u_NightModeIntensity);
    }
    
    fragColor = vec4(result, texColor.a);
}
