import re,sys
src=open(sys.argv[1]).read()
out=[];i=0;stack=[]  # stack of block kinds
buf=''
def pref(sel):
    parts=[]
    for s in sel.split(','):
        t=s.strip()
        if not t: continue
        if t.startswith(':root') or t.startswith('html') or t.startswith('@') or re.match(r'^(from|to|\d+%)',t):
            parts.append(t)
        elif t.startswith('body'):
            parts.append('html '+t)
        else:
            parts.append('html '+t)
    return ', '.join(parts)
res='';j=0;depth_kf=[]
tokens=re.split(r'([{}])',src)
blocks=[]
for tok in tokens:
    if tok=='{':
        head=buf; buf=''
        stripped=head.strip()
        # keep comments
        m=re.match(r'(\s*(?:/\*.*?\*/\s*)*)(.*)$',head,re.S)
        lead,sel=m.group(1),m.group(2)
        if sel.strip().startswith('@'):
            kind='kf' if 'keyframes' in sel else 'at'
            res+=head+'{'
        elif blocks and blocks[-1]=='kf':
            kind='rule'; res+=head+'{'
        else:
            kind='rule'; res+=lead+pref(sel)+' {'
        blocks.append(kind)
    elif tok=='}':
        res+=buf+'}'; buf=''; blocks.pop()
    else:
        buf+=tok
res+=buf
open(sys.argv[2],'w').write(res)
