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
uniform bool u_IsSun;

out vec4 fragColor;

void main() {
    vec4 texColor = texture(u_Texture, v_TexCoord);
    
    if (u_IsSun) {
        vec3 color = texColor.rgb;
        if (u_NightModeIntensity > 0.0) {
            float red = color.r * 0.7 + (color.g + color.b) * 0.15;
            color = mix(color, vec3(red, 0.0, 0.0), u_NightModeIntensity);
        }
        fragColor = vec4(color, texColor.a);
        return;
    }
    
    vec3 norm = normalize(v_Normal);
    vec3 lightDir = normalize(u_LightDir);
    
    vec3 ambient = u_AmbientStrength * texColor.rgb;
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * texColor.rgb;
    
    vec3 viewDir = normalize(u_ViewPos - v_FragPos);
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(norm, halfwayDir), 0.0), 32.0);
    vec3 specular = spec * vec3(0.3);
    
    vec3 result = ambient + diffuse + specular;
    
    float terminator = smoothstep(-0.1, 0.2, dot(norm, lightDir));
    result = mix(ambient * 0.3, result, terminator);
    
    if (u_NightModeIntensity > 0.0) {
        float red = result.r * 0.7 + (result.g + result.b) * 0.15;
        result = mix(result, vec3(red, 0.0, 0.0), u_NightModeIntensity);
    }
    
    fragColor = vec4(result, texColor.a);
}
