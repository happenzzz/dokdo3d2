"use strict";
/* ===== 02 shaders ===== */
const GLSL_COMMON = `
precision highp float; precision highp int; precision highp sampler2D;
uniform mat4 uVP; uniform vec3 uCam; uniform float uTime;
uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uHaze; uniform vec3 uZenith;
uniform float uUnder; uniform float uClarity; uniform vec4 uFocus; uniform float uFocusAmt; uniform float uExposure; uniform float uNight;
uniform vec4 uHInfo; uniform sampler2D uHeight;
`;
const GLSL_VCOMMON = GLSL_COMMON + `
vec4 wobble(vec4 c){
  if(uUnder>0.5){ vec2 n=c.xy/c.w; c.xy += vec2(sin(n.y*7.0+uTime*1.9), cos(n.x*6.0+uTime*1.5))*0.0035*c.w; }
  return c;
}
float groundH(vec2 xz){ return textureLod(uHeight,(xz-uHInfo.xy)/uHInfo.zw,0.).r*90.0-45.0; }
`;
const GLSL_FCOMMON = GLSL_COMMON + `
uniform sampler2D uCaustic; uniform sampler2D uNoise; uniform sampler2D uRockN;
out vec4 fragColor;
vec3 underCol(float y){ float d=clamp(-y/42.0,0.0,1.0); return mix(vec3(0.020,0.150,0.180), vec3(0.003,0.022,0.042), d)*mix(1.0,0.30,uNight); }
vec3 underFog(vec3 dir){
  float up=dir.y*0.5+0.5;
  vec3 c=mix(underCol(-40.0), underCol(-1.0)*1.2, smoothstep(0.15,1.0,up));
  return mix(c, underCol(uCam.y-dir.y*12.0), 0.55);
}
float caust(vec3 p){
  vec2 uv=p.xz*0.075;
  float a=texture(uCaustic,uv+uTime*vec2(0.021,0.013)).r;
  float b=texture(uCaustic,uv*1.37+vec2(0.43,0.17)-uTime*vec2(0.017,-0.012)).r;
  return min(a,b)*1.25;
}
vec3 hemi(vec3 n){ vec3 g=mix(vec3(0.12,0.11,0.095),vec3(0.018,0.022,0.036),uNight); vec3 s=mix(uZenith*0.75+vec3(0.03,0.035,0.04),vec3(0.045,0.065,0.13),uNight); return mix(g, s, n.y*0.5+0.5); }
vec3 lightAtt(float y){ return y<0.0 ? exp(y*vec3(0.20,0.050,0.034)*mix(1.4,0.7,uClarity)) : vec3(1.0); }
vec3 fogAir(vec3 col, vec3 p){
  vec3 v=p-uCam; float dist=length(v); vec3 dir=v/max(dist,1e-4);
  float f=1.0-exp(-dist*0.00016-max(0.0,dist-2500.0)*0.00025);
  float s=pow(max(dot(dir,uSun),0.0),6.0);
  return mix(col, uHaze+uSunCol*s*0.05, clamp(f,0.0,1.0));
}
vec3 fogIt(vec3 col, vec3 p){
  vec3 v=p-uCam; float dist=length(v); vec3 dir=v/max(dist,1e-4);
  if(uUnder>0.5){
    float dens=mix(0.060,0.024,uClarity);
    col*=exp(-dist*vec3(0.070,0.022,0.016)*mix(1.4,0.6,uClarity));
    return mix(col, underFog(dir), 1.0-exp(-dist*dens));
  }
  if(p.y<-0.02){
    float L=-p.y/max(-dir.y,0.06);
    vec3 wc=mix(vec3(0.018,0.200,0.200), vec3(0.003,0.024,0.110), smoothstep(1.5,20.0,-p.y))*mix(0.8,1.1,uClarity);
    col = col*exp(-L*vec3(0.40,0.120,0.036)*mix(1.35,0.6,uClarity));
    col = mix(col, wc*(0.5+0.5*uSun.y), 1.0-exp(-L*mix(0.17,0.075,uClarity)));
  }
  return fogAir(col,p);
}
vec3 focusIt(vec3 col, vec3 p){
  if(uFocusAmt<0.001) return col;
  float d=length(p-uFocus.xyz)/uFocus.w; float k=smoothstep(1.0,2.6,d)*uFocusAmt;
  float g=dot(col,vec3(0.3,0.59,0.11));
  return mix(col, vec3(g)*0.22+col*0.05, k*0.82);
}
vec3 tone(vec3 c){ c*=uExposure; vec3 x=max(vec3(0.0),c-0.004); return (x*(6.2*x+0.5))/(x*(6.2*x+1.7)+0.06); }
vec2 eqUV(vec3 d){ return vec2(atan(d.x,-d.z)/6.2831853+0.5, 0.5-asin(clamp(d.y,-1.0,1.0))/3.14159265); }
vec4 triS(sampler2D t, vec3 p, vec3 w, float s){
#ifdef LOW
  if(w.y>max(w.x,w.z)) return texture(t,p.xz*s);
  return w.x>w.z ? texture(t,p.zy*s) : texture(t,p.xy*s);
#else
  return texture(t,p.zy*s)*w.x + texture(t,p.xz*s)*w.y + texture(t,p.xy*s)*w.z;
#endif
}
/* rock + vegetation material. veg/rtone are baked per vertex on the CPU (cheap). */
vec4 rockN(vec3 p, vec3 w, float s){
#ifdef LOW
  if(w.y>max(w.x,w.z)) return texture(uRockN,p.xz*s);
  return w.x>w.z ? texture(uRockN,vec2(p.z*s,p.y*s*0.45)) : texture(uRockN,vec2(p.x*s,p.y*s*0.45));
#else
  return texture(uRockN,vec2(p.z*s,p.y*s*0.45))*w.x + texture(uRockN,p.xz*s)*w.y + texture(uRockN,vec2(p.x*s,p.y*s*0.45))*w.z;
#endif
}
void rockMat(vec3 p, vec3 ng, float veg, float rtone, out vec3 alb, out vec3 nrm, out float wet, out float vg){
  vec3 w=pow(abs(ng),vec3(4.0)); w/=(w.x+w.y+w.z);
  float cd=length(p-uCam);
  vec4 nm=texture(uNoise,p.xz*0.0105+vec2(p.y*0.004,0.0));
  vec4 rn=rockN(p,w,0.06);
  vec2 d=rn.xy*2.0-1.0;
#ifndef LOW
  if(cd<70.0){ vec4 r2=rockN(p+17.3,w,0.31); float k=smoothstep(70.0,14.0,cd); d=mix(d, d*0.55+(r2.xy*2.0-1.0)*0.95, k); rn.z=mix(rn.z, rn.z*0.55+r2.z*0.45, k); rn.w=max(rn.w, r2.w*0.7*k); }
#endif
  vec3 pert=vec3(0.0,d.y,d.x)*w.x+vec3(d.x,0.0,d.y)*w.y+vec3(d.x,d.y,0.0)*w.z;
  float h=p.y, steep=1.0-abs(ng.y);
  /* volcanic rock: dark basalt -> brown tuff -> pale weathered tuff, plus iron-oxide stains */
  float t=clamp(rtone+(nm.r-0.5)*0.35,0.0,1.0);
  vec3 c=mix(vec3(0.040,0.037,0.034), vec3(0.128,0.108,0.088), smoothstep(0.0,0.55,t));
  c=mix(c, vec3(0.235,0.215,0.185), smoothstep(0.55,1.0,t));
  c=mix(c, vec3(0.180,0.090,0.050), smoothstep(0.60,0.86,nm.g)*0.40);
  c*=0.93+0.10*sin(h*0.9+nm.b*6.0)*steep;
  c*=0.5+1.0*rn.z*rn.z+0.1*rn.z; c*=mix(1.0,0.4,rn.w);
  float guano=smoothstep(0.72,0.9,nm.a)*steep*smoothstep(6.0,20.0,h)*smoothstep(0.55,0.8,rn.z);
  c=mix(c, vec3(0.46,0.45,0.41), guano*0.4);
  float lich=smoothstep(0.64,0.82,nm.a*0.55+rn.z*0.6)*smoothstep(1.8,4.5,h)*smoothstep(32.0,10.0,h);
  c=mix(c, mix(vec3(0.27,0.17,0.045), vec3(0.30,0.29,0.25), nm.g), lich*0.32);
  nrm=normalize(ng+pert*1.2);
  /* vegetation: baked coverage + two cheap planar breakups */
  vg=0.0;
  if(veg>0.01){
    float vb=texture(uNoise,p.xz*0.047).g, vf=texture(uNoise,p.xz*0.27+0.31).b;
    vg=smoothstep(0.16,0.46,veg+(vb-0.5)*0.45+(vf-0.5)*0.3*smoothstep(160.0,40.0,cd));
    vec3 gDark=vec3(0.016,0.040,0.010), gLight=vec3(0.052,0.110,0.020), gDry=vec3(0.105,0.100,0.045);
    vec3 gc=mix(gDark, gLight, smoothstep(0.25,0.8,vf*0.6+vb*0.5+ng.y*0.3-0.2));
    gc=mix(gc, vec3(0.060,0.075,0.025), smoothstep(0.45,0.75,nm.g)*0.5);
    gc=mix(gc, gDry, smoothstep(0.66,0.88,nm.b)*0.5);
    gc*=0.7+0.55*vf*vf+0.1*rn.z;
    vec3 gn=vec3(vf-0.5,0.0,vb-0.5)*0.6;
#ifndef LOW
    if(cd<42.0){ vec4 gd=texture(uNoise,p.xz*1.15+vec2(p.y*0.35,0.0)); float k=smoothstep(42.0,6.0,cd); gc*=mix(1.0,0.55+0.9*gd.r*gd.g+0.25*gd.b,k); gn+=vec3(gd.g-0.5,0.0,gd.b-0.5)*0.9*k; }
#endif
    c=mix(c, gc, vg);
    nrm=normalize(mix(nrm, normalize(ng+gn), vg));
  }
  /* waterline: wet dark band, barnacles, then seabed */
  float wl=1.2+nm.r*1.1+sin(uTime*0.6+p.x*0.05)*0.25;
  wet=smoothstep(wl,-0.2,h)*(1.0-vg);
  c=mix(c, c*0.40+vec3(0.0,0.010,0.007), wet);
  float barn=smoothstep(1.4,0.7,h)*smoothstep(-0.3,0.3,h)*smoothstep(0.5,0.72,rn.z)*0.5;
  c=mix(c, vec3(0.40,0.39,0.35), barn);
  if(h<-0.3){
    float u=smoothstep(-0.3,-2.2,h);
    vec3 uc=mix(c*0.8, vec3(0.50,0.27,0.30), smoothstep(0.42,0.68,nm.g)*0.6);
    uc=mix(uc, vec3(0.11,0.095,0.025), smoothstep(0.5,0.78,nm.b)*0.55*smoothstep(-28.0,-3.0,h));
    float sand=smoothstep(0.72,0.93,ng.y)*smoothstep(0.28,0.55,nm.r)*smoothstep(-26.0,-2.0,h);
    uc=mix(uc, vec3(0.52,0.47,0.35)*(0.8+0.3*rn.z), sand);
    c=mix(c,uc,u);
  }
  alb=c;
}
`;

const SHADERS = {};
SHADERS.terrainV = GLSL_VCOMMON + `
layout(location=0) in vec3 aPos; layout(location=1) in vec4 aNrm; layout(location=2) in vec4 aShade;
out vec3 vP; out vec3 vN; out vec4 vS;
void main(){ vP=aPos; vN=aNrm.xyz; vS=aShade; gl_Position=wobble(uVP*vec4(aPos,1.0)); }`;
SHADERS.terrainF = GLSL_FCOMMON + `
in vec3 vP; in vec3 vN; in vec4 vS; uniform vec4 uBrush;
void main(){
  vec3 ng=normalize(vN); vec3 alb, n; float wet, vg;
  rockMat(vP, ng, vS.z, vS.w, alb, n, wet, vg);
  float ndl=mix(max(dot(n,uSun),0.0), clamp((dot(n,uSun)+0.35)/1.35,0.0,1.0), vg); float sh=vS.x; vec3 att=lightAtt(vP.y);
  vec3 V=normalize(uCam-vP); vec3 H=normalize(uSun+V);
  float spec=pow(max(dot(n,H),0.0),mix(10.0,70.0,wet))*(0.04+wet*0.5)*sh*(1.0-vg*0.8);
  vec3 col=alb*(uSunCol*ndl*sh*att + hemi(n)*vS.y*mix(vec3(1.0),vec3(0.35,0.8,0.95),step(vP.y,0.0))*att) + uSunCol*spec*att;
  if(vP.y<0.4){ col += alb*uSunCol*caust(vP)*smoothstep(0.4,-1.2,vP.y)*att*ndl*sh*1.3; }
  if(uBrush.w>0.0){ float d=length(vP.xz-uBrush.xz); float r=smoothstep(uBrush.w-1.2,uBrush.w,d)*smoothstep(uBrush.w+1.2,uBrush.w,d); col=mix(col,vec3(0.7,0.55,1.0),r*0.85); col+=vec3(0.05,0.03,0.09)*step(d,uBrush.w); }
  col=fogIt(col,vP); col=focusIt(col,vP);
  fragColor=vec4(tone(col),1.0);
}`;

SHADERS.objV = GLSL_VCOMMON + `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol; layout(location=3) in vec4 aExt;
layout(location=4) in vec4 iPS; layout(location=5) in vec4 iRot; layout(location=6) in vec4 iMisc;
uniform int uAnim; uniform vec4 uAnimP; uniform float uSkirt;
out vec3 vW; out vec3 vN; out vec4 vCol; out vec4 vExt; out float vSel;
vec3 rotAll(vec3 p, vec3 r){
  float c=cos(r.z), s=sin(r.z); p=vec3(p.x, c*p.y-s*p.z, s*p.y+c*p.z);
  c=cos(r.y); s=sin(r.y); p=vec3(c*p.x-s*p.y, s*p.x+c*p.y, p.z);
  c=cos(r.x); s=sin(r.x); p=vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z);
  return p;
}
void main(){
  vec3 p=aPos; vec3 n=aNrm; float w=aExt.x;
  float t=mix(uTime, iMisc.z, iMisc.y)+iRot.w;
  if(uAnim==1){ float ph=t*uAnimP.x-p.x*uAnimP.y; p.z+=sin(ph)*uAnimP.z*w; n.x+=cos(ph)*uAnimP.z*uAnimP.y*w*0.6; }
  else if(uAnim==2){ float f=sin(t*uAnimP.x)*iMisc.w; p.y+=f*abs(w)*uAnimP.y*(1.0+abs(w)*0.4); if(abs(w)>0.0) n=normalize(n+vec3(0.0,0.0,-sign(w))*f*0.8); }
  else if(uAnim==3){ float hw=w*w; p.x+=sin(t*uAnimP.x+p.y*0.9+iPS.x*0.1)*hw*uAnimP.y; p.z+=cos(t*uAnimP.x*0.8+p.y*0.7+iPS.z*0.1)*hw*uAnimP.y*0.7; }
  else if(uAnim==4){ float ph=p.x*uAnimP.y-t*uAnimP.x; p.z+=sin(ph)*w*uAnimP.z; p.y+=sin(ph*0.7+1.0)*w*uAnimP.z*0.25; n=normalize(vec3(-cos(ph)*uAnimP.y*w*uAnimP.z,0.0,1.0)); }
  else if(uAnim==5){ p.y+=sin(t*uAnimP.x-p.x*4.0)*w*uAnimP.y; p.z+=cos(t*uAnimP.x*0.7-p.x*3.0)*w*uAnimP.y; }
  else if(uAnim==6){ float ph=t*uAnimP.x-p.x*uAnimP.y; p.y+=sin(ph)*uAnimP.z*w; }
  vec3 wp=rotAll(p*iPS.w, iRot.xyz)+iPS.xyz;
  vec3 wn=rotAll(n, iRot.xyz);
  if(uSkirt>0.5 && aPos.y<-11.0){ wp.y=min(wp.y, groundH(wp.xz)-3.0); }
  vW=wp; vN=wn; vCol=aCol; vExt=aExt; vSel=iMisc.x;
  gl_Position=wobble(uVP*vec4(wp,1.0));
}`;
SHADERS.objF = GLSL_FCOMMON + `
in vec3 vW; in vec3 vN; in vec4 vCol; in vec4 vExt; in float vSel;
uniform int uMat; uniform float uTwoSided; uniform sampler2D uTex; uniform float uEmis; uniform float uAlpha; uniform float uGloss;
void main(){
  vec3 N=normalize(vN); if(uTwoSided>0.5 && !gl_FrontFacing) N=-N;
  vec3 alb=vCol.rgb; vec3 n=N; float wet=0.0; float ao=vCol.a;
  if(uMat==1){ float vg; rockMat(vW,N,vCol.g,vCol.r,alb,n,wet,vg); }
  else if(vExt.y>0.5){ alb=texture(uTex,vExt.zw).rgb; }
  vec2 huv=(vW.xz-uHInfo.xy)/uHInfo.zw; vec4 hs=texture(uHeight,huv); float gh=hs.r*90.0-45.0;
  float sh=mix(1.0, hs.g, 1.0-smoothstep(gh+2.5,gh+7.0,vW.y));
  vec3 att=lightAtt(vW.y);
  float ndl=max(dot(n,uSun),0.0);
  vec3 V=normalize(uCam-vW); vec3 H=normalize(uSun+V);
  float gl=max(uGloss,wet*0.6);
  float spec=pow(max(dot(n,H),0.0),mix(12.0,90.0,gl))*gl*0.9*sh;
  float wrap=uMat==2?0.45:0.0;
  vec3 col=alb*(uSunCol*clamp((dot(n,uSun)+wrap)/(1.0+wrap),0.0,1.0)*sh*att + hemi(n)*ao*mix(vec3(1.0),vec3(0.35,0.8,0.95),step(vW.y,0.0))*att) + uSunCol*spec*att;
  if(vW.y<0.3) col+=alb*uSunCol*caust(vW)*smoothstep(0.3,-1.0,vW.y)*att*ndl*1.1;
  float a=1.0;
  if(uMat==2){ float fr=pow(1.0-max(dot(N,V),0.0),2.0); a=clamp(uAlpha+fr*0.4,0.0,1.0); col+=alb*0.25; }
  if(uMat==3){ col+=alb*uEmis*(0.75+0.25*sin(uTime*2.0+vW.x)); }
  if(vSel>0.5){ float rim=pow(1.0-max(dot(N,V),0.0),2.2); col+=vec3(0.80,0.62,1.4)*rim*1.3+vec3(0.05,0.03,0.10); }
  col=fogIt(col,vW); col=focusIt(col,vW);
  fragColor=vec4(tone(col),a);
}`;

SHADERS.waterV = GLSL_VCOMMON + `
layout(location=0) in vec3 aPos;
uniform vec4 uWA[4]; uniform vec4 uWB[4]; uniform float uWaveAmp; uniform float uWaveSpeed; uniform float uWScale; uniform vec4 uRip[4];
out vec3 vW; out vec3 vN; out float vCrest;
void main(){
  vec2 xz=uCam.xz+aPos.xz*uWScale;
  float depth=-groundH(xz);
  float dist=length(xz-uCam.xz);
  float amp=uWaveAmp*smoothstep(-0.8,5.0,depth)/(1.0+pow(dist/170.0,2.0));
  vec3 disp=vec3(0.0); vec3 nrm=vec3(0.0,1.0,0.0); float crest=0.0; float t=uTime*uWaveSpeed;
  for(int i=0;i<4;i++){
    vec4 a=uWA[i]; vec4 b=uWB[i];
    float f=a.z*(dot(a.xy,xz)-b.y*t)+b.z; float A=a.w*amp; float Q=b.x;
    float cf=cos(f), sf=sin(f);
    disp.x+=Q*A*a.x*cf; disp.z+=Q*A*a.y*cf; disp.y+=A*sf;
    nrm.x-=a.x*a.z*A*cf; nrm.z-=a.y*a.z*A*cf; nrm.y-=Q*a.z*A*sf; crest+=Q*a.z*A*sf;
  }
  for(int i=0;i<4;i++){
    vec4 r=uRip[i]; if(r.w<=0.0) continue;
    float age=uTime-r.z; if(age<0.0||age>9.0) continue;
    vec2 dv=xz-r.xy; float rr=length(dv); float front=age*3.4; float x=rr-front;
    float env=exp(-x*x*0.28)*exp(-age*0.55)*r.w*smoothstep(0.0,0.25,age)*(1.0/(1.0+front*0.15));
    float ph=x*2.4;
    disp.y+=sin(ph)*env*0.45;
    vec2 g=(rr>0.001?dv/rr:vec2(0.0))*cos(ph)*env*1.3; nrm.x-=g.x; nrm.z-=g.y; crest+=env*max(0.0,sin(ph))*0.9;
    float core=exp(-rr*rr*0.9)*exp(-age*2.0)*r.w; crest+=core*1.2;
  }
  vec3 wp=vec3(xz.x,0.0,xz.y)+disp;
  vW=wp; vN=normalize(nrm); vCrest=crest;
  gl_Position=wobble(uVP*vec4(wp,1.0));
}`;
SHADERS.waterF = GLSL_FCOMMON + `
in vec3 vW; in vec3 vN; in float vCrest;
uniform sampler2D uWaterTex; uniform sampler2D uSky; uniform vec3 uWaterTint;
void main(){
  vec3 tc=uCam-vW; float dist=length(tc); vec3 V=tc/dist;
  vec2 uv=vW.xz;
  vec2 n1=texture(uWaterTex,uv*0.055+uTime*vec2(0.013,0.009)).xy*2.0-1.0;
  vec2 n2=texture(uWaterTex,uv*0.14+vec2(0.37,0.11)-uTime*vec2(0.022,-0.013)).xy*2.0-1.0;
  vec2 n3=texture(uWaterTex,uv*0.019+uTime*vec2(-0.004,0.007)).xy*2.0-1.0;
  float ds=1.0/(1.0+dist*0.010);
  vec2 dn=n1*0.5+n2*0.38*ds+n3*0.55;
  vec3 N=normalize(vN+vec3(dn.x,0.0,dn.y)*mix(0.22,0.5,ds));
  float gh=texture(uHeight,(vW.xz-uHInfo.xy)/uHInfo.zw).r*90.0-45.0; float depth=max(0.0,vW.y-gh);
  float fn=texture(uWaterTex,uv*0.085+uTime*vec2(0.011,0.004)).b;
  float fn2=texture(uWaterTex,uv*0.21-uTime*vec2(0.006,0.012)).b;
  float shore=smoothstep(2.6,0.0,depth+(fn-0.5)*1.8);
  float band=0.5+0.5*sin(depth*4.2-uTime*1.7+fn*6.0);
  float foam=clamp(shore*band*1.3+smoothstep(0.42,0.95,vCrest)*0.9,0.0,1.0)*smoothstep(0.30,0.62,fn*0.65+fn2*0.55);
  foam=max(foam, smoothstep(0.7,0.0,depth)*0.8*smoothstep(0.2,0.6,fn2));
  if(uUnder<0.5){
    float NdV=max(dot(N,V),0.0);
    float fres=0.02+0.98*pow(1.0-NdV,5.0);
    vec3 R=reflect(-V,N); R.y=abs(R.y);
    vec3 sky=textureLod(uSky,eqUV(R),1.2).rgb;
    float sd=max(dot(R,uSun),0.0);
    float sp=pow(sd,900.0)*70.0+pow(sd,110.0)*1.1;
    vec3 flatS=normalize(vec3(uSun.x,0.0,uSun.z));
    float back=pow(clamp(dot(-V,flatS)*0.5+0.5,0.0,1.0),3.0);
    vec3 sss=vec3(0.02,0.30,0.26)*uWaterTint*(max(vCrest,0.0)*0.9+0.15)*back*uSunCol*0.35;
    vec3 scatter=mix(vec3(0.008,0.09,0.11), vec3(0.02,0.22,0.21), smoothstep(12.0,1.0,depth))*uWaterTint;
    float a=clamp(fres+0.06+length(sss)*0.4,0.0,1.0);
    vec3 col=(sky*fres+scatter*0.06+sss)/max(a,0.001) + uSunCol*sp;
    vec3 fc=vec3(0.86,0.92,0.92)*(0.55+0.55*max(uSun.y,0.0))*mix(1.0,0.28,uNight);
    col=mix(col,fc,foam); a=clamp(a+foam*0.95+sp,0.0,1.0);
    col=fogAir(col,vW); col=focusIt(col,vW);
    fragColor=vec4(tone(col),a);
  } else {
    vec3 D=-V; vec3 Nd=-N; if(dot(D,Nd)>0.0) Nd=-Nd;
    vec3 T=refract(D,Nd,1.333);
    vec3 col;
    if(dot(T,T)<0.001){ col=underCol(-3.0)*1.1+vec3(0.0,0.02,0.02)*fn; }
    else {
      vec3 sky=textureLod(uSky,eqUV(T),1.5).rgb;
      float sp=pow(max(dot(T,uSun),0.0),160.0)*9.0;
      float edge=pow(1.0-abs(dot(D,Nd)),4.0);
      col=sky*1.15*(1.0-edge*0.6)+uSunCol*sp+vec3(0.02,0.1,0.1)*edge;
    }
    col=mix(col, vec3(0.75,0.85,0.85)*0.8, foam*0.5);
    col=fogIt(col,vW);
    fragColor=vec4(tone(col),1.0);
  }
}`;

SHADERS.skyV = `layout(location=0) in vec2 aPos; out vec2 vNdc; void main(){ vNdc=aPos; gl_Position=vec4(aPos,0.99999,1.0); }`;
SHADERS.skyF = GLSL_FCOMMON + `
in vec2 vNdc; uniform vec3 uFwd; uniform vec3 uRight; uniform vec3 uUp; uniform vec2 uTan; uniform sampler2D uSky;
void main(){
  vec3 d=normalize(uFwd+uRight*vNdc.x*uTan.x+uUp*vNdc.y*uTan.y);
  vec3 col;
  if(uUnder>0.5){
    col=underFog(d);
    float s=pow(max(dot(d,normalize(vec3(uSun.x*0.5,1.0,uSun.z*0.5))),0.0),10.0);
    col+=vec3(0.03,0.12,0.13)*s*0.45;
  } else {
    col=textureLod(uSky,eqUV(d),0.0).rgb;
    float s=max(dot(d,uSun),0.0);
    col+=uSunCol*smoothstep(mix(0.99955,0.99925,uNight),mix(0.99975,0.99945,uNight),s)*mix(14.0,2.2,uNight);
    col=mix(col,uHaze,(1.0-smoothstep(0.0,0.16,abs(d.y)))*0.5);
  }
  fragColor=vec4(tone(col),1.0);
}`;

SHADERS.ptV = GLSL_VCOMMON + `
layout(location=0) in vec4 aP; layout(location=1) in vec4 aD;
uniform float uPx; uniform int uWrap; uniform float uWrapSize;
out float vA; out float vT; out vec3 vW;
void main(){
  vec3 p=aP.xyz; vA=aD.x; vT=aD.y;
  if(uWrap==1){
    p=uCam+mod(p-uCam+uWrapSize*0.5,uWrapSize)-uWrapSize*0.5;
    p+=vec3(sin(uTime*0.21+aP.y),sin(uTime*0.33+aP.x)*0.6,cos(uTime*0.17+aP.z))*0.35;
    float gh=groundH(p.xz); if(p.y>-0.25||p.y<gh) vA=0.0;
  }
  vW=p; float dist=max(length(p-uCam),0.05);
  gl_PointSize=clamp(aP.w*uPx/dist,1.0,72.0);
  gl_Position=wobble(uVP*vec4(p,1.0));
}`;
SHADERS.ptF = GLSL_FCOMMON + `
in float vA; in float vT; in vec3 vW;
void main(){
  vec2 c=gl_PointCoord*2.0-1.0; float r=dot(c,c); if(r>1.0||vA<=0.001) discard;
  vec3 col; float a;
  if(vT<0.5){ a=(1.0-r)*vA; col=vec3(0.25,0.42,0.42); }
  else if(vT<1.5){ float ring=smoothstep(0.45,0.92,r)*(1.0-smoothstep(0.92,1.0,r)); float hl=smoothstep(0.35,0.0,length(c-vec2(-0.35,0.35))); a=(ring*0.85+hl*0.9+0.06)*vA; col=vec3(0.75,0.95,1.0); }
  else if(vT<2.5){ a=(1.0-r*r)*vA; col=vec3(0.92,0.97,1.0)*(0.7+0.5*max(uSun.y,0.0)); }
  else { a=(1.0-r)*vA; col=vec3(0.8,0.95,1.0)*1.4; }
  if(uUnder>0.5) col=fogIt(col,vW); else col=fogAir(col,vW);
  fragColor=vec4(tone(col),a);
}`;

SHADERS.rayV = GLSL_VCOMMON + `
layout(location=0) in vec2 aQ; layout(location=1) in vec4 iR;
uniform vec3 uRight2; uniform vec3 uSlant;
out vec2 vQ; out vec3 vW; out float vPh;
void main(){
  vec3 base=vec3(uCam.x+iR.x,-0.3,uCam.z+iR.y);
  vec3 p=base+uRight2*aQ.x*iR.z+uSlant*aQ.y*34.0;
  vQ=aQ; vW=p; vPh=iR.w;
  gl_Position=wobble(uVP*vec4(p,1.0));
}`;
SHADERS.rayF = GLSL_FCOMMON + `
in vec2 vQ; in vec3 vW; in float vPh;
void main(){
  float x=abs(vQ.x)*2.0; float side=pow(max(1.0-x,0.0),1.6);
  float fall=pow(1.0-vQ.y,1.8)*smoothstep(0.0,0.06,vQ.y);
  float fl=0.55+0.45*sin(uTime*0.8+vPh*6.0+vQ.y*3.0);
  float dist=length(vW-uCam);
  float a=side*fall*fl*0.13*smoothstep(1.5,6.0,dist)*exp(-dist*0.022)*mix(0.6,1.0,uClarity);
  fragColor=vec4(vec3(0.55,0.85,0.8)*a,a);
}`;
