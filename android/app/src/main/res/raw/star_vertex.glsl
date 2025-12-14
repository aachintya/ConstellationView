#version 300 es
precision highp float;

layout(location = 0) in vec3 a_Position;
layout(location = 1) in float a_Magnitude;
layout(location = 2) in vec3 a_Color;

uniform mat4 u_MVP;
uniform float u_PointSizeBase;
uniform float u_BrightnessMultiplier;
uniform vec2 u_ScreenSize;

out vec3 v_Color;
out float v_Glow;

void main() {
    gl_Position = u_MVP * vec4(a_Position, 1.0);
    
    float normalizedMag = clamp((6.0 - a_Magnitude) / 7.5, 0.0, 1.0);
    float pointSize = u_PointSizeBase * (1.0 + normalizedMag * 4.0) * u_BrightnessMultiplier;
    
    gl_PointSize = clamp(pointSize, 2.0, 40.0);
    
    v_Color = a_Color;
    v_Glow = normalizedMag;
}
