# -*- coding: utf-8 -*-
# Canli test: klan sustur -> global sohbet 403, konustur -> 200
import requests, random, string, time
API = 'https://kapitalist-api.gitbaskabul.workers.dev'
H = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'}

def api(method, path, token=None, body=None):
    headers = dict(H)
    if token: headers['Authorization'] = 'Bearer ' + token
    if body is not None: headers['Content-Type'] = 'application/json'
    r = requests.request(method, API + path, headers=headers, json=body, timeout=15)
    try: return r.status_code, r.json()
    except: return r.status_code, {}

suf = ''.join(random.choices(string.ascii_lowercase, k=6))
A, B = 'ta_' + suf + 'a', 'ta_' + suf + 'b'
toks = {}
for u in (A, B):
    s, d = api('POST', '/kayit', body={'email': u + '@test.local', 'kullanici_adi': u, 'sifre': 'Test1234!'})
    if not d.get('token'):
        s, d = api('POST', '/giris', body={'kullanici_adi': u, 'sifre': 'Test1234!'})
    toks[u] = d['token']
    print('giris', u, s)
tokA, tokB = toks[A], toks[B]

s, d = api('POST', '/klan/olustur', token=tokA, body={'ad': 'TestKlan' + suf})
kid = d.get('klan_id'); print('klan kur:', s, kid)
s, d = api('POST', '/klan/katil', token=tokB, body={'klan_id': kid})
s, d = api('GET', '/klan/istekler', token=tokA)
iid = (d.get('istekler') or [{}])[0].get('id')
s, d = api('POST', '/klan/istek', token=tokA, body={'id': iid, 'aksiyon': 'kabul'})
print('kabul:', s, str(d)[:60])

s, d = api('POST', '/sohbet', token=tokB, body={'kullanici_adi': B, 'mesaj': 'selam'})
print('1. B global mesaj (mute oncesi):', s, str(d)[:60])
assert s == 200, 'mute oncesi mesaj gidebilmeli'

s, d = api('POST', '/klan/uyelik-aksiyon', token=tokA, body={'hedef': B, 'aksiyon': 'sustur'})
print('2. A klan panelinden sustur:', s, str(d)[:60])

s, d = api('POST', '/sohbet', token=tokB, body={'kullanici_adi': B, 'mesaj': 'mute deneme'})
print('3. B global mesaj (mute sonrasi):', s, str(d)[:80])
assert s == 403, 'mute sonrasi global sohbet 403 olmali!'

s, d = api('POST', '/klan/uyelik-aksiyon', token=tokA, body={'hedef': B, 'aksiyon': 'konustur'})
print('4. A konustur:', s, d)
s, d = api('POST', '/sohbet', token=tokB, body={'kullanici_adi': B, 'mesaj': 'tekrar selam'})
print('5. B global mesaj (konustur sonrasi):', s, str(d)[:60])
assert s == 200, 'konustur sonrasi mesaj gidebilmeli'

print('\n=== TUM TESTLER GECTI ===')

# --- /sohbet/sil dogrulamalari ---
s, d = api('POST', '/sohbet', token=tokA, body={'kullanici_adi': A, 'mesaj': 'silme testi A'})
print('6. A mesaj gonder:', s)
s, d = api('GET', '/sohbet')
am = [m for m in (d.get('mesajlar') or []) if m.get('kullanici_adi') == A]
sid = am[-1]['id'] if am else None
print('6b. A mesaj id bulundu:', sid)
assert sid, 'mesaj id bulunamadi'
# B kendi mesajini silsin (mute kalkti, gorebilir)
s, d = api('POST', '/sohbet', token=tokB, body={'kullanici_adi': B, 'mesaj': 'benim silinecek mesajim'})
s, d = api('GET', '/sohbet')
bm = [m for m in (d.get('mesajlar') or []) if m.get('kullanici_adi') == B]
bid = bm[-1]['id'] if bm else None
s, d = api('DELETE', '/sohbet/sil', token=tokB, body={'id': bid})
print('7. B kendi mesajini sil:', s, d)
assert s == 200 and d.get('basarili'), 'kendi mesaji silinebilmeli'
s, d = api('DELETE', '/sohbet/sil', token=tokB, body={'id': sid})
print('8. B baskasinin mesajini silmeye calisir:', s, d)
assert s == 403, 'baskasinin mesaji 403 olmali'
# admin silme
s, d = api('POST', '/panel/admin-ol', token=tokA)
s, d = api('DELETE', '/sohbet/sil', token=tokA, body={'id': sid})
print('9. Admin baskasinin mesajini siler:', s, d)
assert s == 200, 'admin her mesaji silebilmeli'
print('\n=== SOHBET SIL TESTLERI DE GECTI ===')

