import numpy as np, wave
SR=48000; DUR=15.0; N=int(SR*DUR)
L=np.zeros(N); R=np.zeros(N); REV=np.zeros(N)
rs=np.random.default_rng(7)
def add(sig,t,gain=1.0,pan=0.0,rev=0.0):
    i=int(t*SR); 
    if i>=N: return
    s=sig[:N-i]*gain; l=np.sqrt(0.5*(1-pan)); r=np.sqrt(0.5*(1+pan))
    L[i:i+len(s)]+=s*l*1.414; R[i:i+len(s)]+=s*r*1.414; REV[i:i+len(s)]+=s*rev
def tt(d): return np.arange(int(d*SR))/SR
def band(x,lo,hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X[(f<lo)|(f>hi)]=0; return np.fft.irfft(X,len(x))
def noise(d): return rs.standard_normal(int(d*SR))
def kick():
    t=tt(.45); f=45+90*np.exp(-t*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-t*7)+band(noise(.45),1000,6000)*np.exp(-t*120)*.3
def doum():
    t=tt(.4); f=78+40*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)*.8
def tek():
    t=tt(.08); return band(noise(.08),2500,9000)*np.exp(-t*70)*.9+np.sin(2*np.pi*1400*t)*np.exp(-t*90)*.3
def hat(): t=tt(.05); return band(noise(.05),7000,16000)*np.exp(-t*110)
def bass(freq,d):
    t=tt(d); s=np.sin(2*np.pi*freq*t)+.3*np.sin(4*np.pi*freq*t)+.12*np.sin(6*np.pi*freq*t)
    env=np.minimum(1,t/.005)*np.exp(-t*3.5); return np.tanh(1.6*s*env)*.6
def pluck(freq,d=.7):
    n=int(d*SR); P=max(2,int(SR/freq)); y=np.zeros(n+P+1)
    y[:P]=rs.uniform(-1,1,P)
    y[:P]=np.convolve(y[:P],np.ones(3)/3,'same')
    pos=P
    while pos<n:
        m=min(P,n-pos); prev=y[pos-P:pos-P+m+1]
        y[pos:pos+m]=.5*(prev[:m]+prev[1:m+1])*.996; pos+=m
    out=y[P:P+n]; t=tt(d)[:len(out)]; return out*np.exp(-t*2.2)*.5
def whoosh(d=.6, up=True):
    x=noise(d); t=tt(d); out=np.zeros_like(x); seg=8
    for k in range(seg):
        a,b=k*len(x)//seg,(k+1)*len(x)//seg; c=(k+.5)/seg
        fc=(400+5000*c) if up else (5400-5000*c)
        out[a:b]=band(x,fc*.5,fc*1.6)[a:b]
    env=np.sin(np.pi*t/d)**2; return out*env*.9
def boom(d=1.4):
    t=tt(d); f=32+60*np.exp(-t*12); s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*3)
    return np.tanh(2*s)*.9+band(noise(d),60,900)*np.exp(-t*9)*.5
def crunch(d=.45,dens=260,lo=1800,hi=9000):
    out=np.zeros(int(d*SR)); k=int(dens*d)
    for _ in range(k):
        st=rs.uniform(0,d*.9); ln=rs.uniform(.002,.012); g=rs.uniform(.2,1)*np.exp(-st*5)
        c=noise(ln)*np.exp(-tt(ln)*rs.uniform(200,700))*g; i=int(st*SR); out[i:i+len(c)]+=c[:len(out)-i]
    return band(out,lo,hi)*1.3
def blip(f0=500,f1=1200,d=.12):
    t=tt(d); f=f0*(f1/f0)**(t/d); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*30)*.6
def tick(): t=tt(.012); return band(noise(.012),3000,12000)*np.exp(-t*500)*.5

beats=[0.2+0.5*k for k in range(30)]
grooveS, grooveE = 1.7, 14.2
D2,Eb2,C2=73.42,77.78,65.41
roots=[D2,D2,Eb2,C2]
hijaz=[293.66,311.13,369.99,392.0,440.0,466.16,523.25,587.33]  # D Eb F# G A Bb C D
riffA=[0,1,2,3,4,3,2,1]; riffB=[4,5,4,3,2,None,1,0]
for bar in range(7):
    b0=1.7+2*bar
    for e in range(8):
        t=b0+e*.25
        if t>=grooveE-1e-6: continue
        if e%2==0: add(kick(),t,.95,0,.05)
        if e in (0,4): add(doum(),t,.6,-.2,.1)
        if e in (1,3,6): add(tek(),t,.35,.3,.15)
        root=roots[bar%4]; pat=[1,0,1,1,0,1,1,0][e]
        if pat: add(bass(root*(2 if e==3 else 1),.24),t,.55)
        if t>=4.2:
            for s in range(2):
                add(hat(),t+s*.125,.18 if s else .1,.4*(1 if s else -1))
        if t>=5.7:
            riff=riffA if bar%2==0 else riffB
            n=riff[e]
            if n is not None: add(pluck(hijaz[n]*(1 if bar<5 else 2)),t,.32,-.35+.1*e,.35)
            if bar>=3 and e%2==1: add(pluck(hijaz[(n or 0)]/2,.5),t+.125,.15,.4,.3)
# intro: riser + boot sounds
t=tt(1.7); f=200*(8**(t/1.7)); riser=(band(noise(1.7),300,9000)*.25+np.sin(2*np.pi*np.cumsum(f)/SR)*.12)*(t/1.7)**2.2
add(riser,0,.8,0,.2)
add(blip(300,900),0.1,.8,0,.3)
for tw in (.42,.62,.82): add(tick()*3,tw,.9,0,.2); add(blip(900,700,.08),tw,.35,0,.2)
# transitions
for tw,up in ((1.12,True),(3.62,True),(6.25,False),(8.68,True),(11.22,True),(13.9,False)): add(whoosh(.6,up),tw,.55,0,.25)
# impacts
for ti,a in ((1.70,1),(1.95,.4),(5.20,1.2),(6.32,.4),(10.70,.8),(11.70,1),(14.20,1.1)):
    add(boom(),ti,.7*a,0,.35)
add(crunch(.55,320),5.2,1.1,0,.2); add(crunch(.3,200,1500,7000),5.25,.6,.5,.2)
add(crunch(.25,120),2.05,.35,.5,.2)  # chip appears S1
for i in range(6): add(blip(400+80*i,1100+150*i,.1),4.2+i*.125,.45,-.5+.2*i,.15); add(crunch(.06,400),4.2+i*.125,.25)
for tp in (9.2,9.45,9.7,9.95,10.2,10.325,10.45): add(blip(350,1300,.12),tp,.5,0,.2)
for k in range(25): add(tick(),8.92+k*.019,.6,.2)
for k in range(16): add(tick(),7.4+k*.05,.35,-.2)
add(blip(500,1500,.14),12.95,.4,.5,.3)
for k in range(10): add(crunch(.05,300),11.9+k*.17,.12,rs.uniform(-.8,.8))
# end shimmer chord
t=tt(1.2); pad=sum(np.sin(2*np.pi*f*t)*.12 for f in (146.83,185.0,220.0,293.66,440.0))*np.exp(-t*2.5)
add(pad,14.2,.8,0,.6)
# reverb
ir_t=tt(1.8); ir=rs.standard_normal(len(ir_t))*np.exp(-ir_t*3.2); ir=band(ir,200,7000); ir/=np.sqrt((ir**2).sum())
M=1<<int(np.ceil(np.log2(N+len(ir))))
wet=np.fft.irfft(np.fft.rfft(REV,M)*np.fft.rfft(ir,M),M)[:N]*.9
L+=wet; R+=np.roll(wet,int(.011*SR))
fade=np.ones(N); fi=int(14.75*SR); fade[fi:]=np.linspace(1,0,N-fi)**1.5
out=np.stack([L,R],1)*fade[:,None]
out=np.tanh(out/np.abs(out).max()*1.6); out=out/np.abs(out).max()*.89
w=wave.open('audio.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out*32767).astype('<i2').tobytes()); w.close(); print('ok')
