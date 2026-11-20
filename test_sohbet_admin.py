# -*- coding: utf-8 -*-
# Canli E2E: online liste, DM, klan davet, sohbet kapat/ac, mute toggle, rapor
import json, time, uuid
import urllib.request

API = 'https://kapitalist-api.gitbaskabul.workers.dev'
HDR = {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}

def call(method, path, body=None, token=None):
    h = dict(HDR)
    if token: h['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {}

def kayit_ol():
    k = 'ta_' + uuid.uuid4().hex[:8]
    st, d = call('POST', '/kayit', {'email': k+'@t.com', 'kullanici_adi': k, 'sifre': 'Test1234!'})
    assert st == 200, 'kayit basarisiz: %s %s' % (st, d)
    st, d = call('POST', '/giris', {'kullanici_adi': k, 'sifre': 'Test1234!'})
    assert st == 200 and 'token' in d, 'giris basarisiz: %s %s' % (st, d)
    return k, d['token']

sonuc = []
def adim(no, aciklama, ok, detay=''):
    sonuc.append(ok)
    print('%2d. %-55s %s %s' % (no, aciklama, 'OK' if ok else 'FAIL', detay))

# --- Admin sim (panel admin: launcher'dan giren herkes admin-ol ile admin olur) ---
ka, ta = kayit_ol()
st, d = call('POST', '/panel/admin-ol', token=ta)
admin_tok = ta
admin_st = st == 200
adim(0, 'admin sim: panel admin-ol', admin_st, str(d))

# --- 2 kullanici ---
k1, t1 = kayit_ol()
k2, t2 = kayit_ol()
adim(1, '2 kullanici kayit/giris', True, '%s / %s' % (k1, k2))

# online: her ikisi GET /sohbet ceksin
call('GET', '/sohbet', token=t1)
st, d = call('GET', '/sohbet', token=t2)
on = d.get('online', [])
adim(2, 'online listesi her ikisini icermeli', k1 in on and k2 in on, str(on))
adim(3, 'sohbet GET kapali/davetler alanlari var', 'kapali' in d and 'davetler' in d, '')

# --- DM ---
st, d = call('POST', '/dm', {'hedef': k2, 'mesaj': 'selam ozel mesaj testi'}, token=t1)
adim(4, 'DM gonder (k1->k2)', st == 200, str(d))
st, d = call('GET', '/dm?hedef=' + k1, token=t2)
adim(5, 'DM gecmisi k2 tarafindan okunuyor', st == 200 and any(m['mesaj'].startswith('selam ozel') for m in d.get('mesajlar', [])), str(len(d.get('mesajlar', []))))
st, d = call('POST', '/dm', {'hedef': k1, 'mesaj': 'x'}, token=t1)
adim(6, 'kendine DM reddi', st == 400, str(d))
# --- klan kur + davet ---
klan = 'Kln' + uuid.uuid4().hex[:6]
st, d = call('POST', '/klan/olustur', {'ad': klan}, token=t1)
adim(7, 'k1 klan kurdu', st == 200, str(d))
st, d = call('POST', '/klan/davet', {'hedef': k2}, token=t1)
adim(8, 'lider davet etti', st == 200, str(d))
st, d = call('GET', '/sohbet', token=t2)
dvt = d.get('davetler', [])
adim(9, 'k2 davet goruyor (sohbet GET icinde)', any(x['ad'] == klan for x in dvt), str(dvt))
st, d = call('POST', '/klan/davet-kabul', {'id': dvt[0]['id'], 'aksiyon': 'kabul'}, token=t2)
adim(10, 'k2 daveti kabul', st == 200 and d.get('klan', {}).get('ad') == klan, str(d))
st, d = call('POST', '/klan/davet', {'hedef': k2}, token=t2)
adim(11, 'uye davet edemez (403)', st == 403, str(d))

# --- sohbet kapat/ac (admin) ---
if admin_st:
    st, d = call('POST', '/sohbet/durum', {'kapali': 1}, token=admin_tok)
    adim(12, 'admin sohbeti kapatti', st == 200, str(d))
    st, d = call('POST', '/sohbet', {'mesaj': 'bu yazilmamali'}, token=t1)
    adim(13, 'kapatilmis sohbete normal user yazamaz (403)', st == 403 and 'kapat' in d.get('hata', ''), str(d))
    st, d = call('POST', '/sohbet', {'mesaj': 'admin yazar'}, token=admin_tok)
    adim(14, 'admin kapatilmis sohbete yazar', st == 200, str(d))
    st, d = call('POST', '/sohbet/durum', {'kapali': 0}, token=admin_tok)
    adim(15, 'admin sohbeti acti', st == 200, str(d))
else:
    print('12-15 admin token yok, atlandi')

# --- mute toggle (kisitla/ac) ---
if admin_st:
    st, d = call('POST', '/panel/aksiyon', {'hedef': k1, 'islem': 'mute', 'sure_dk': 60}, token=admin_tok)
    adim(16, 'admin k1 kısıtladı (mute)', st == 200, str(d))
    st, d = call('POST', '/sohbet', {'mesaj': 'yazamam'}, token=t1)
    adim(17, 'kisitli user yazamaz (403)', st == 403, str(d))
    st, d = call('POST', '/panel/aksiyon', {'hedef': k1, 'islem': 'mute', 'sure_dk': 60}, token=admin_tok)
    adim(18, 'tekrar mute => toggle ac', st == 200 and 'açıldı' in d.get('mesaj', ''), str(d))
    st, d = call('POST', '/sohbet', {'mesaj': 'tekrar yazabilirim'}, token=t1)
    adim(19, 'acilan user tekrar yazabilir', st == 200, str(d))
else:
    print('16-19 admin token yok, atlandi')

# --- rapor ---
st, d = call('POST', '/sohbet', {'mesaj': 'rapor edilecek mesaj'}, token=t1)
st, d = call('GET', '/sohbet', token=t2)
mid = [m['id'] for m in d.get('mesajlar', []) if 'rapor edilecek' in m['mesaj']]
st, d = call('POST', '/sohbet/rapor', {'id': mid[0]}, token=t2) if mid else (404, {})
adim(20, 'k2 mesaji rapor etti', st == 200, str(d))
st, d = call('POST', '/sohbet/rapor', {'id': mid[0]}, token=t2) if mid else (404, {})
adim(21, 'ayni mesaji ikinci rapor reddi', st == 400, str(d))
if admin_st:
    st, d = call('GET', '/panel/raporlar', token=admin_tok)
    ok = st == 200 and any(rp['mesaj'] == 'rapor edilecek mesaj' for rp in d.get('raporlar', []))
    rid = next((rp['id'] for rp in d.get('raporlar', []) if rp['mesaj'] == 'rapor edilecek mesaj'), None)
    adim(22, 'admin raporlari goruyor', ok, str(len(d.get('raporlar', []))))
    st, d = call('POST', '/panel/rapor-sil', {'id': rid}, token=admin_tok) if rid else (404, {})
    adim(23, 'admin raporu sildi', st == 200, str(d))
    st, d = call('GET', '/panel/raporlar', token=t1)
    adim(24, 'normal user raporlari goremez (403)', st == 403, str(d))

# --- klan silme senkronu ---
st, d = call('POST', '/klan/sohbet', {'mesaj': 'klan silme test'}, token=t2)
st, d = call('GET', '/klan/sohbet', token=t2)
mid2 = next((m['id'] for m in d.get('mesajlar', []) if 'klan silme test' in m['mesaj']), None)
st, d = call('DELETE', '/klan/sohbet/sil', {'id': mid2}, token=t1) if mid2 else (404, {})
adim(25, 'lider klan mesajini sildi', st == 200, str(d))
st, d = call('GET', '/klan/sohbet', token=t2)
gone = not any(m['mesaj'] == 'klan silme test' for m in d.get('mesajlar', []))
adim(26, 'bulutta silinen mesaj k2 GET icinde yok', gone, '')

print('')
print('SONUC: %d/%d adim OK' % (sum(1 for x in sonuc if x), len(sonuc)))
if all(sonuc): print('ALL GREEN')
