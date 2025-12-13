#version 300 es
precision highp float;

layout(location = 0) in vec3 a_Position;
layout(location = 1) in vec3 a_Normal;
layout(location = 2) in vec2 a_TexCoord;

uniform mat4 u_MVP;
uniform mat4 u_ModelMatrix;
uniform mat3 u_NormalMatrix;

out vec3 v_Normal;
out vec3 v_FragPos;
out vec2 v_TexCoord;

void main() {
    gl_Position = u_MVP * vec4(a_Position, 1.0);
    v_FragPos = vec3(u_ModelMatrix * vec4(a_Position, 1.0));
    v_Normal = normalize(u_NormalMatrix * a_Normal);
    v_TexCoord = a_TexCoord;
}
