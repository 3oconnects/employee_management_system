# Lists frontend api.* calls that have no matching Express route.
# Run from repo root: python docs/audit/tools/route_contract_check.py
import re,os,glob,sys
# Always emit LF so output is byte-identical on Windows, Linux and CI.
sys.stdout.reconfigure(newline=chr(10))
# Resolve paths from the repo root regardless of the caller's working directory.
os.chdir(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
root='.'
mounts={}
# Routes are mounted in app.ts since Release 0 (B0-03); index.ts before that.
entry='server/src/app.ts' if os.path.exists('server/src/app.ts') else 'server/src/index.ts'
idx=open(entry,encoding='utf8').read()
imp=dict(re.findall(r"import (\w+) from '\./modules/([^']+)'",idx))
for prefix,var in re.findall(r"app\.use\('/api/v1(/[\w-]+)',\s*\w+,\s*(\w+)\)",idx):
    mounts[prefix]=imp[var]
def routes_of(modpath):
    p='server/src/modules/'+modpath
    files=[p+'.ts'] if os.path.exists(p+'.ts') else [p+'/index.ts']
    out=[]
    def walk(f,base):
        if not os.path.exists(f): return
        s=open(f,encoding='utf8').read()
        subs=dict(re.findall(r"import (\w+) from '(\.[^']+)'",s))
        for m,path in re.findall(r"router\.(get|post|put|patch|delete)\('([^']*)'",s):
            out.append((m.upper(),(base+path).replace('//','/').rstrip('/') or '/'))
        for path,var in re.findall(r"router\.use\('([^']*)',\s*(\w+)\)",s):
            if var in subs:
                walk(os.path.normpath(os.path.join(os.path.dirname(f),subs[var]))+'.ts',base+path)
    for f in files: walk(f,'')
    return out
backend=[]
for pre,mod in mounts.items():
    for m,p in routes_of(mod): backend.append((m,(pre+p).rstrip('/')))
def rx(p): return re.compile('^'+re.sub(r':\w+',r'[^/]+',p)+'$')
brx=[(m,rx(p),p) for m,p in backend]
miss=set()
for f in glob.glob('client/src/**/*.ts*',recursive=True):
    s=open(f,encoding='utf8').read()
    for m,q,path in re.findall(r"api\.(get|post|put|delete|patch)\(\s*([`'])([^`']+)\2",s):
        p='/'+path.lstrip('/').split('?')[0]
        p=re.sub(r'\$\{[^}]+\}','X',p).rstrip('/')
        if not any(bm==m.upper() and r.match(p) for bm,r,_ in brx):
            miss.add((m.upper(),p,f.replace(os.sep,'/').replace('client/src/','')))
for x in sorted(miss): print(*x)
print(len(backend),'backend routes;',len(miss),'unmatched client calls')