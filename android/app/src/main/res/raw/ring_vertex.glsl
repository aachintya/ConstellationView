#version 300 es
precision highp float;

layout(location = 0) in vec3 a_Position;
layout(location = 1) in vec2 a_TexCoord;

uniform mat4 u_MVP;

out vec2 v_TexCoord;
out vec3 v_Position;

void main() {
    v_TexCoord = a_TexCoord;
    v_Position = a_Position;
    gl_Position = u_MVP * vec4(a_Position, 1.0);
}
