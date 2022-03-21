#version 410 core

out vec4 fColor;

uniform vec3 lightCubeColor;

void main() 
{    
    fColor = vec4(lightCubeColor, 1.0f);
}
