#version 410 core

in vec4 fModelPos;
in vec3 fNormal;
in vec4 fPosEye;
in vec2 fTexCoords;
in vec4 fragPosLightSpace;
out vec4 fColor;

//lighting
uniform	vec3 lightDir;
uniform	vec3 lightColor;
uniform vec3 lightPoint;
uniform vec3 lightColorPoint;
uniform vec3 lightPoint1;
uniform vec3 lightColorPoint1;

//texture
uniform sampler2D diffuseTexture;
uniform sampler2D specularTexture;
uniform sampler2D shadowMap;

vec3 ambientl;
float ambientStrength = 0.2f;
vec3 diffusel;
vec3 specularl;
float specularStrength = 0.5f;
float shininess1;
float shininess2;
float shininess3;


float computeShadow()
{
	vec3 normalizedCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;

	// Transform to [0,1] range
	normalizedCoords = normalizedCoords * 0.5 + 0.5;

	//Get closest depth value from light's perspective
	float closestDepth = texture(shadowMap, normalizedCoords.xy).r;

	// Get depth of current fragment from light's perspective
	float currentDepth = normalizedCoords.z;

	// Check whether current frag pos is in shadow
	float bias = max(0.05f * (1.0f - dot(fNormal, lightDir)), 0.005f);
	float shadow = 0.0f;

	vec2 texelSize = 1.0 / textureSize(shadowMap, 0);
    for(int x = -1; x <= 1; ++x)
    {
        for(int y = -1; y <= 1; ++y)
        {
            float pcfDepth = texture(shadowMap, normalizedCoords.xy + vec2(x, y) * texelSize).r; 
            shadow += currentDepth - bias > pcfDepth  ? 1.0 : 0.0;
        }
    }
    shadow /= 9.0;

    // keep the shadow at 0.0 when outside the far_plane region of the light's frustum.
    if(normalizedCoords.z > 1.0)
        shadow = 0.0;

    return shadow;
}

float constant = 1.0;
float linear = 0.7;
float quadratic = 5.8; 

void computeLightComponents()
{		
	vec3 cameraPosEye = vec3(0.0f);//in eye coordinates, the viewer is situated at the origin
	shininess1 = lightColor.r*0.2126 + lightColor.g*0.7152 + lightColor.b*0.0722;
	//transform normal
	vec3 normalEye = normalize(fNormal);	
	
	//compute light direction
	vec3 lightDirN = normalize(lightDir);
	
	//compute view direction 
	vec3 viewDirN = normalize(cameraPosEye - fPosEye.xyz);
		
	//compute ambient light
	ambientl = ambientStrength * lightColor;
	
	//compute diffuse light
	diffusel = max(dot(normalEye, lightDirN), 0.0f) * lightColor;
	
	//compute specular light
	vec3 reflection = reflect(-lightDirN, normalEye);
	float specCoeff = pow(max(dot(viewDirN, reflection), 0.0f), shininess1);
	specularl = specularStrength * specCoeff * lightColor;
}

float computeFog()
{
	float fogDensity = 0.05f;
	float fragmentDistance = length(fPosEye);
	float fogFactor = exp(-pow(fragmentDistance * fogDensity, 7));

	return clamp(fogFactor, 0.7f, 1.0f);
}

void CalcPointLight(vec3 light, vec3 normal, vec3 fragPos, vec3 viewDir, vec3 lightColorPoint,float shininess)
{	
    vec3 lightDir = normalize(light - fModelPos.xyz);
    // diffuse shading
    float diff = max(dot(normal, lightDir), 0.0);
    // specular shading
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    // attenuation
    float distance    = length(light - fModelPos.xyz);
    float attenuation = 1.0 / (constant + linear * distance + quadratic * (distance * distance));    
    // combine results

	ambientl += 80*attenuation*lightColorPoint;
	diffusel += max(dot(normal, lightDir),0.0)*lightColorPoint;
	specularl += 23*attenuation*lightColorPoint;
}


void main() 
{
	shininess2 = lightColorPoint.r*0.2126 + lightColorPoint.g*0.7152 + lightColorPoint.b*0.0722;
	shininess3 = lightColorPoint1.r*0.2126 + lightColorPoint1.g*0.7152 + lightColorPoint1.b*0.0722;
	computeLightComponents();
	float fogFactor = computeFog();
	vec3 viewDir = normalize(vec3(0.0f) - fPosEye.xyz);
	CalcPointLight(lightPoint, normalize(fNormal), fPosEye.xyz, viewDir,lightColorPoint, shininess2);
	CalcPointLight(lightPoint1, normalize(fNormal), fPosEye.xyz, viewDir,lightColorPoint1, shininess3);
    float shadow = computeShadow();
	ambientl *= texture(diffuseTexture, fTexCoords).rgb;
	diffusel *= texture(diffuseTexture, fTexCoords).rgb;
	specularl *= texture(specularTexture, fTexCoords).rgb;
	vec4 colorFromTexture = texture(diffuseTexture, fTexCoords);
	if(colorFromTexture.a<0.1){
		discard;
	}

	vec3 color = min((ambientl + (1.0f - shadow)*diffusel) + (1.0f - shadow)*specularl, 1.0f);
	vec4 fogColor = vec4(0.5f, 0.5f, 0.5f, 1.0f);
    vec4 aux = vec4(color, 1.0f);
	float sh = (shininess1*1.5 + shininess2*3 + shininess3*3)/3.0f;
	fColor = mix(fogColor, aux, fogFactor);
	fColor *=  sh*sh;
	float alfa = 0.7;
	
	fColor = vec4(pow(fColor.xyz, vec3(1.0 / alfa)),1.0f);
	//fColor=vec4(mix(fColor.rgb,3.0f,diffuseTexture),1.0);
	fColor.a = 0.7f;
}
