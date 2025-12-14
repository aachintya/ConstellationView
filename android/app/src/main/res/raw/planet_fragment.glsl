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
uniform int u_PlanetId;  // 0=sun, 1=moon, 2=mercury, 3=venus, 4=mars, 5=jupiter, 6=saturn, 7=uranus, 8=neptune

out vec4 fragColor;

// Noise functions for procedural textures
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Moon texture - realistic gray with craters and maria
vec3 getMoonColor(vec2 uv) {
    vec3 baseColor = vec3(0.78, 0.78, 0.76);
    
    // Large dark maria
    float maria = fbm(uv * 2.5, 4);
    maria = smoothstep(0.35, 0.55, maria);
    vec3 mariaColor = vec3(0.42, 0.42, 0.45);
    
    // Craters
    float largeCraters = fbm(uv * 10.0 + 1.5, 3);
    largeCraters = pow(largeCraters, 2.2);
    float smallCraters = fbm(uv * 30.0 + 3.7, 4);
    smallCraters = pow(smallCraters, 3.0);
    
    // Highland variations
    float highlands = fbm(uv * 4.0 + 7.3, 3);
    vec3 highlandColor = vec3(0.88, 0.86, 0.84);
    
    vec3 color = mix(baseColor, mariaColor, maria * 0.55);
    color = mix(color, highlandColor, highlands * 0.25);
    color -= vec3(largeCraters * 0.12 + smallCraters * 0.08);
    
    float brightness = fbm(uv * 15.0, 2) * 0.08 + 0.96;
    color *= brightness;
    
    return clamp(color, 0.0, 1.0);
}

// Mercury texture - brownish-gray with heavy cratering
vec3 getMercuryColor(vec2 uv) {
    vec3 baseColor = vec3(0.52, 0.42, 0.38);
    
    float variation = fbm(uv * 3.5, 4);
    vec3 darkRegions = vec3(0.32, 0.28, 0.26);
    vec3 brightRegions = vec3(0.68, 0.58, 0.52);
    
    float craters = fbm(uv * 18.0, 5);
    craters = pow(craters, 2.3);
    
    vec3 color = mix(darkRegions, brightRegions, variation);
    color = mix(color, baseColor, 0.45);
    color -= vec3(craters * 0.18);
    
    // Warm brownish-red tint
    color.r *= 1.12;
    color.g *= 0.92;
    color.b *= 0.85;
    
    return clamp(color, 0.0, 1.0);
}

// Venus texture - yellowish-orange dense clouds
vec3 getVenusColor(vec2 uv) {
    vec3 baseColor = vec3(0.88, 0.75, 0.55);
    
    // Dense cloud bands
    float bands = sin(uv.y * 12.0 + fbm(uv * 2.5, 3) * 1.8) * 0.5 + 0.5;
    
    // Swirling thick clouds
    float swirls = fbm(uv * 5.0 + vec2(fbm(uv * 1.8, 2), 0.0), 4);
    
    vec3 brightClouds = vec3(0.92, 0.82, 0.62);
    vec3 darkClouds = vec3(0.72, 0.58, 0.42);
    
    vec3 color = mix(darkClouds, brightClouds, bands * 0.45 + swirls * 0.45);
    color = mix(color, baseColor, 0.25);
    
    // Orange-yellow tint
    color.r *= 1.08;
    color.b *= 0.78;
    
    return clamp(color, 0.0, 1.0);
}

// Jupiter texture - prominent bands with Great Red Spot
vec3 getJupiterColor(vec2 uv) {
    vec3 zone = vec3(0.94, 0.88, 0.78);
    vec3 belt = vec3(0.68, 0.48, 0.32);
    vec3 redBelt = vec3(0.78, 0.42, 0.32);
    
    float turbulence = fbm(uv * vec2(10.0, 2.5), 4) * 0.25;
    float bandPattern = sin((uv.y + turbulence) * 22.0);
    
    float bandWidth = sin(uv.y * 7.0) * 0.25 + 0.5;
    bandPattern = smoothstep(-bandWidth, bandWidth, bandPattern);
    
    vec3 color = mix(belt, zone, bandPattern);
    
    float redBands = sin(uv.y * 10.0 + 1.2) * 0.5 + 0.5;
    redBands = smoothstep(0.55, 0.85, redBands);
    color = mix(color, redBelt, redBands * (1.0 - bandPattern) * 0.65);
    
    // Great Red Spot
    vec2 spotCenter = vec2(0.58, 0.38);
    vec2 spotSize = vec2(0.11, 0.055);
    vec2 spotDist = (uv - spotCenter) / spotSize;
    float spot = 1.0 - smoothstep(0.75, 1.0, length(spotDist));
    
    float spotSwirl = fbm(uv * 35.0 + vec2(length(spotDist) * 4.0, atan(spotDist.y, spotDist.x)), 3);
    vec3 spotColor = vec3(0.82, 0.32, 0.22);
    vec3 spotInner = vec3(0.92, 0.48, 0.38);
    spotColor = mix(spotColor, spotInner, spotSwirl * 0.45);
    
    color = mix(color, spotColor, spot * 0.88);
    
    float detail = fbm(uv * 45.0, 3) * 0.08;
    color += vec3(detail) * 0.25;
    
    return clamp(color, 0.0, 1.0);
}

// Saturn texture - golden/tan bands
vec3 getSaturnColor(vec2 uv) {
    vec3 baseColor = vec3(0.88, 0.78, 0.58);
    
    float turbulence = fbm(uv * vec2(5.0, 1.2), 3) * 0.18;
    float bands = sin((uv.y + turbulence) * 18.0) * 0.5 + 0.5;
    
    vec3 lightBand = vec3(0.92, 0.85, 0.68);
    vec3 darkBand = vec3(0.78, 0.68, 0.48);
    
    vec3 color = mix(darkBand, lightBand, bands);
    color = mix(color, baseColor, 0.35);
    
    // Polar darkening
    float polar = smoothstep(0.35, 0.0, abs(uv.y - 0.5));
    color *= 1.0 - polar * 0.12;
    
    float clouds = fbm(uv * 28.0, 4) * 0.06;
    color += vec3(clouds);
    
    return clamp(color, 0.0, 1.0);
}

// Uranus texture - pale blue-green
vec3 getUranusColor(vec2 uv) {
    vec3 baseColor = vec3(0.58, 0.82, 0.88);
    
    float bands = sin(uv.y * 10.0 + fbm(uv * 3.0, 2) * 0.4) * 0.04;
    float clouds = fbm(uv * 7.0, 3) * 0.08;
    
    vec3 color = baseColor + vec3(bands) + vec3(clouds * 0.4, clouds * 0.25, clouds * 0.15);
    
    float polar = smoothstep(0.38, 0.0, abs(uv.y - 0.5));
    color += vec3(0.04, 0.06, 0.08) * polar;
    
    return clamp(color, 0.0, 1.0);
}

// Neptune texture - deep vivid blue with storms
vec3 getNeptuneColor(vec2 uv) {
    vec3 baseColor = vec3(0.22, 0.38, 0.82);
    
    float turbulence = fbm(uv * vec2(4.0, 1.8), 4) * 0.35;
    float bands = sin((uv.y + turbulence) * 12.0) * 0.5 + 0.5;
    
    vec3 lightBlue = vec3(0.38, 0.52, 0.92);
    vec3 darkBlue = vec3(0.12, 0.28, 0.68);
    
    vec3 color = mix(darkBlue, lightBlue, bands * 0.55);
    
    // Storm spot
    vec2 stormCenter = vec2(0.42, 0.42);
    float storm = 1.0 - smoothstep(0.04, 0.09, length((uv - stormCenter) * vec2(1.0, 1.8)));
    vec3 stormColor = vec3(0.08, 0.22, 0.48);
    color = mix(color, stormColor, storm * 0.55);
    
    // White cloud streaks
    float streaks = fbm(uv * vec2(28.0, 4.0), 3);
    streaks = smoothstep(0.58, 0.78, streaks);
    color = mix(color, vec3(0.68, 0.78, 0.92), streaks * 0.28);
    
    return clamp(color, 0.0, 1.0);
}

void main() {
    vec4 texColor = texture(u_Texture, v_TexCoord);
    
    // Generate procedural texture based on planet
    vec3 procColor = texColor.rgb;
    
    if (u_PlanetId == 1) {
        procColor = getMoonColor(v_TexCoord);
    } else if (u_PlanetId == 2) {
        procColor = getMercuryColor(v_TexCoord);
    } else if (u_PlanetId == 3) {
        procColor = getVenusColor(v_TexCoord);
    } else if (u_PlanetId == 5) {
        procColor = getJupiterColor(v_TexCoord);
    } else if (u_PlanetId == 6) {
        procColor = getSaturnColor(v_TexCoord);
    } else if (u_PlanetId == 7) {
        procColor = getUranusColor(v_TexCoord);
    } else if (u_PlanetId == 8) {
        procColor = getNeptuneColor(v_TexCoord);
    }
    
    texColor.rgb = procColor;
    
    // Sun rendering - warm orange/yellow with granulation
    if (u_IsSun == 1) {
        // Generate sun surface texture
        float granulation = fbm(v_TexCoord * 15.0, 4);
        float largeFeatures = fbm(v_TexCoord * 4.0, 3);
        float sunspots = fbm(v_TexCoord * 8.0 + 5.0, 3);
        sunspots = pow(sunspots, 4.0) * 0.3;
        
        // Base sun color - warm orange-yellow
        vec3 sunBase = vec3(1.0, 0.75, 0.3);
        vec3 sunBright = vec3(1.0, 0.9, 0.6);
        vec3 sunDark = vec3(0.95, 0.5, 0.15);
        
        // Create surface variation
        vec3 color = mix(sunBase, sunBright, granulation * 0.4);
        color = mix(color, sunDark, largeFeatures * 0.2);
        color -= vec3(sunspots * 0.5, sunspots * 0.3, sunspots * 0.1);
        
        vec3 norm = normalize(v_Normal);
        vec3 viewDir = normalize(u_ViewPos - v_FragPos);
        float ndotv = max(dot(norm, viewDir), 0.0);
        
        // Limb darkening (edges appear darker/redder)
        float limb = pow(ndotv, 0.4);
        color = mix(vec3(0.9, 0.4, 0.1), color, limb);
        
        // Corona/glow effect
        float fresnel = 1.0 - ndotv;
        fresnel = pow(fresnel, 1.5);
        
        vec3 innerCorona = vec3(1.0, 0.85, 0.5) * pow(fresnel, 1.0) * 0.5;
        vec3 midCorona = vec3(1.0, 0.6, 0.2) * pow(fresnel, 2.0) * 0.6;
        vec3 outerCorona = vec3(1.0, 0.35, 0.1) * pow(fresnel, 3.0) * 0.4;
        
        color = color + innerCorona + midCorona + outerCorona;
        
        // Boost brightness
        color = color * 1.4;
        color = color / (color + vec3(0.8)) * 1.6;
        
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
    
    vec3 ambient = u_AmbientStrength * texColor.rgb * vec3(0.85, 0.9, 1.0);
    
    float diff = max(dot(norm, lightDir), 0.0);
    diff = pow(diff, 0.8);
    vec3 diffuse = diff * texColor.rgb;
    
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(norm, halfwayDir), 0.0), 32.0);
    vec3 specular = spec * vec3(0.25);
    
    // Brighter specular for Moon
    if (u_PlanetId == 1) {
        specular = spec * vec3(0.4);
    }
    
    vec3 result = ambient + diffuse + specular;
    
    float terminator = smoothstep(-0.1, 0.35, dot(norm, lightDir));
    result = mix(ambient * 0.15, result, terminator);
    
    float rim = 1.0 - max(dot(norm, viewDir), 0.0);
    rim = pow(rim, 2.5);
    
    vec3 avgColor = texColor.rgb;
    vec3 atmosphereColor = mix(vec3(0.4, 0.6, 1.0), avgColor, 0.3);
    
    // Planet-specific atmosphere
    if (u_PlanetId == 1) {
        atmosphereColor = vec3(0.88, 0.88, 0.92);
        rim *= 0.25;
    } else if (u_PlanetId == 3) {
        atmosphereColor = vec3(0.98, 0.88, 0.58);
    } else if (u_PlanetId == 5) {
        atmosphereColor = vec3(0.98, 0.82, 0.68);
    } else if (u_PlanetId == 6) {
        atmosphereColor = vec3(0.98, 0.88, 0.68);
    } else if (u_PlanetId == 8) {
        atmosphereColor = vec3(0.38, 0.58, 0.98);
    }
    
    vec3 rimGlow = atmosphereColor * rim * 0.5 * (0.5 + terminator * 0.5);
    result += rimGlow;
    
    float sss = pow(max(0.0, -dot(norm, lightDir) + 0.3), 2.0) * 0.1;
    result += texColor.rgb * sss * vec3(1.0, 0.8, 0.6);
    
    if (u_NightModeIntensity > 0.0) {
        float red = result.r * 0.7 + (result.g + result.b) * 0.15;
        result = mix(result, vec3(red, 0.0, 0.0), u_NightModeIntensity);
    }
    
    fragColor = vec4(result, texColor.a);
}
