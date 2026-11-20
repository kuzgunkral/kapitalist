# -*- coding: utf-8 -*-
# E2E test: klan moderasyon (ban/mute/kick/lider), klan banka, /yetki
import requests, time, random, string

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
tokA = tokB = None
for u, p in [(A, 'Test1234!'), (B, 'Test1234!')]:
    s, d = api('POST', '/kayit', body={'email': u + '@test.local', 'kullanici_adi': u, 'sifre': p})
    if not d.get('token'):
        s, d = api('POST', '/giris', body={'kullanici_adi': u, 'sifre': p})
    assert d.get('token'), (u, s, d)
    if u == A: tokA = d['token']
    else: tokB = d['token']
print('1. iki kullanici giris OK:', A, B)

# Kullanici A oyun kaydi olustursun (klan icin gerekebilir)
s, d = api('POST', '/kaydet', token=tokA, body={'surum': 'v2', 'veri': {'money': 50000}})
print('2. A kayit:', s, d.get('basarili', d.get('hata', d)))

# A klan kur
s, d = api('POST', '/klan/olustur', token=tokA, body={'ad': 'TestKlan' + suf})
print('3. A klan kur:', s, str(d)[:100])
kid = d.get('klan_id')

# A admin olsun (panel)
s, d = api('POST', '/panel/admin-ol', token=tokA)
print('4. A /panel/admin-ol:', s, d)

# /yetki kontrolu
s, d = api('GET', '/yetki', token=tokA)
print('5. A /yetki:', s, d)
assert d.get('admin') == True, 'A admin olmali'
s, d = api('GET', '/yetki', token=tokB)
print('6. B /yetki:', s, d)
assert not d.get('admin'), 'B admin olmamali'

# B klana katilmak istesin
s, d = api('POST', '/klan/katil', token=tokB, body={'klan_id': kid})
print('7. B klan istek:', s, str(d)[:80])
s, d = api('GET', '/klan/istekler', token=tokA)
istekId = (d.get('istekler') or [{}])[0].get('id')
print('7b. A istekleri gorme:', s, 'istekId=', istekId)
s, d = api('POST', '/klan/istek', token=tokA, body={'id': istekId, 'aksiyon': 'kabul'})
print('8. A B\'yi kabul:', s, str(d)[:80])

# B banlansin
s, d = api('POST', '/klan/uyelik-aksiyon', token=tokA, body={'hedef': B, 'aksiyon': 'ban'})
print('9. A B ban:', s, str(d)[:80])
# Banli B klan sohbet atamaz
s, d = api('POST', '/klan/sohbet', token=tokB, body={'mesaj': 'banli mesaj'})
print('10. Banli B klan sohbet:', s, d.get('hata', 'OK?'))
# Banli B yeniden katilamaz
s, d = api('POST', '/klan/katil', token=tokB, body={'klan_id': kid})
print('11. Banli B katil isteği:', s, d.get('hata', 'OK?'))

# Ban kaldir, B yeniden katilir
s, d = api('POST', '/klan/uyelik-aksiyon', token=tokA, body={'hedef': B, 'aksiyon': 'unban'})
print('12. A B unban:', s, str(d)[:80])
s, d = api('POST', '/klan/katil', token=tokB, body={'klan_id': kid})
print('12b. Unban sonrasi B katil isteği:', s, str(d)[:60])
s, d = api('GET', '/klan/istekler', token=tokA)
istekId = (d.get('istekler') or [{}])[0].get('id')
s, d = api('POST', '/klan/istek', token=tokA, body={'id': istekId, 'aksiyon': 'kabul'})
print('12c. A B\'yi yeniden kabul:', s, str(d)[:60])

s, d = api('POST', '/klan/uyelik-aksiyon', token=tokA, body={'hedef': B, 'aksiyon': 'sustur'})
print('13. A B sustur:', s, str(d)[:80])
s, d = api('POST', '/klan/sohbet', token=tokB, body={'mesaj': 'susturulmus mesaj'})
print('14. Susturulmus B klan sohbet:', s, d.get('hata', 'OK?'))
s, d = api('POST', '/klan/uyelik-aksiyon', token=tokA, body={'hedef': B, 'aksiyon': 'konustur'})
print('15. A B konustur:', s, str(d)[:80])

# Global sohbet: B susturulunca global'e de yazamamali (klan mute global mute ayni moderasyon tablosu)
s, d = api('POST', '/panel/aksiyon', token=tokA, body={'hedef': B, 'islem': 'mute', 'sure_dk': 5})
print('16. A, B\'yi panel ile susturur:', s, str(d)[:80])
s, d = api('POST', '/sohbet', token=tokB, body={'mesaj': 'global susturulmus'})
print('17. Susturulmus B global sohbet:', s, d.get('hata', 'OK?'))
s, d = api('POST', '/panel/aksiyon', token=tokA, body={'hedef': B, 'islem': 'unmute'})
print('18. A B unmute:', s, str(d)[:80])
s, d = api('POST', '/sohbet', token=tokB, body={'mesaj': 'global serbest ' + suf})
print('19. Serbest B global sohbet:', s, str(d)[:60])

# Global chat admin yetkileri
s, d = api('DELETE', '/sohbet/temizle', token=tokB)
print('20. B (non-admin) temizle:', s, d.get('hata', 'OK?'))
s, d = api('DELETE', '/sohbet/temizle', token=tokA)
print('21. A (admin) temizle:', s, str(d)[:60])

# Klan banka
s, d = api('POST', '/klan/banka-yatir', token=tokA, body={'miktar': 5000})
print('22. A bankaya 5000:', s, str(d)[:80])
assert d.get('banka', 0) >= 5000, 'banka artmali'

# Klan bilgi: banlilar + uyeler + banka
s, d = api('GET', '/klan/bilgi', token=tokA)
_k = d.get('klan') or {}
bl = _k.get('banlilar', [])
uy = _k.get('uyeler', [])
print('23. klan/bilgi: uye=', len(uy), [u['kullanici_adi'] + ':' + u['rol'] for u in uy], 'banli=', len(bl), 'banka=', _k.get('banka'))

# Lider devri
s, d = api('POST', '/klan/uyelik-aksiyon', token=tokA, body={'hedef': B, 'aksiyon': 'yardimci'})
print('24. A B yardimci:', s, str(d)[:60])
s, d = api('POST', '/klan/uyelik-aksiyon', token=tokA, body={'hedef': B, 'aksiyon': 'lider'})
print('25. A B lider:', s, str(d)[:60])

# Yetki iptali calismali mi? (A admin kaldi, /yetki hala admin)
s, d = api('GET', '/yetki', token=tokA)
print('26. A /yetki (sonra):', s, d)

print('\n=== E2E TAMAM ===')
