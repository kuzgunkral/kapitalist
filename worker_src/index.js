var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
async function hashSifre(sifre, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(sifre + salt);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashSifre, "hashSifre");
function saltUret() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(saltUret, "saltUret");
function tokenUret() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(tokenUret, "tokenUret");
async function tokenDogrula(env, token) {
  if (!token) return null;
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT kullanici_id FROM oturumlar WHERE token=? AND son_kullanim>?"
  ).bind(token, now).first();
  if (!row) return null;
  await env.DB.prepare(
    "UPDATE oturumlar SET son_kullanim=? WHERE token=?"
  ).bind(now + 7 * 24 * 60 * 60 * 1e3, token).run();
  return row.kullanici_id;
}
__name(tokenDogrula, "tokenDogrula");
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  };
}
__name(corsHeaders, "corsHeaders");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}
__name(jsonResponse, "jsonResponse");
function tokenFromRequest(request) {
  const auth = request.headers.get("Authorization") || "";
  return auth.replace("Bearer ", "").trim();
}
__name(tokenFromRequest, "tokenFromRequest");
var ADMINLAR = ["kuzgun"];
var DEV_SIFRE = "kapitalist2026";
async function modTabloOlustur(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS moderasyon (kullanici_adi TEXT PRIMARY KEY, mute_until INTEGER DEFAULT 0, ban INTEGER DEFAULT 0, admin INTEGER DEFAULT 0, guncellendi INTEGER)"
  ).run();
}
__name(modTabloOlustur, "modTabloOlustur");
async function modGet(env, kadi) {
  const row = await env.DB.prepare("SELECT * FROM moderasyon WHERE kullanici_adi=?").bind(kadi).first();
  return row || { kullanici_adi: kadi, mute_until: 0, ban: 0, admin: 0 };
}
__name(modGet, "modGet");
async function klanModTabloOlustur(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS klan_mod (klan_id TEXT, kullanici_id TEXT, ban INTEGER DEFAULT 0, mute_until INTEGER DEFAULT 0, PRIMARY KEY (klan_id, kullanici_id))"
  ).run();
}
__name(klanModTabloOlustur, "klanModTabloOlustur");
async function klanModGet(env, klanId, kullaniciId) {
  const row = await env.DB.prepare("SELECT ban,mute_until FROM klan_mod WHERE klan_id=? AND kullanici_id=?").bind(klanId, kullaniciId).first();
  return row || { ban: 0, mute_until: 0 };
}
__name(klanModGet, "klanModGet");
async function adminKontrol(env, uid) {
  if (!uid) return false;
  const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
  if (!k) return false;
  if (ADMINLAR.indexOf(k.kullanici_adi) >= 0) return true;
  const m = await modGet(env, k.kullanici_adi);
  return m.admin === 1;
}
__name(adminKontrol, "adminKontrol");
async function kadiBul(env, uid) {
  const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
  return k ? k.kullanici_adi : null;
}
__name(kadiBul, "kadiBul");
async function ekTablolar(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS sohbet_durum (k TEXT PRIMARY KEY, kapali INTEGER DEFAULT 0)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS raporlar (id TEXT PRIMARY KEY, mesaj_id TEXT, kullanici_adi TEXT, mesaj TEXT, rapor_eden TEXT, zaman INTEGER)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS dm (id TEXT PRIMARY KEY, gonderen TEXT, alici TEXT, mesaj TEXT, zaman INTEGER)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS klan_davetler (id TEXT PRIMARY KEY, klan_id TEXT, alici_kadi TEXT, gonderen TEXT, zaman INTEGER)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS online_durum (kullanici_adi TEXT PRIMARY KEY, son_aktif INTEGER)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS klan_banka_log (id TEXT PRIMARY KEY, klan_id TEXT, kullanici_adi TEXT, miktar REAL, tur TEXT, zaman INTEGER)").run();
  try { await env.DB.prepare("ALTER TABLE kullanicilar ADD COLUMN klan_ceza_until INTEGER DEFAULT 0").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE klanlar ADD COLUMN elmas_banka INTEGER DEFAULT 0").run(); } catch (e) {}
}
__name(ekTablolar, "ekTablolar");
async function adminMi(env, kadi) {
  if (ADMINLAR.indexOf(kadi) >= 0) return true;
  const m = await modGet(env, kadi);
  return m.admin === 1;
}
__name(adminMi, "adminMi");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (path === "/kayit" && request.method === "POST") {
      try {
        const { email, kullanici_adi, sifre } = await request.json();
        if (!email || !kullanici_adi || !sifre)
          return jsonResponse({ hata: "Email, kullanici_adi ve sifre gerekli" }, 400);
        const mevcutEmail = await env.DB.prepare("SELECT id FROM kullanicilar WHERE email=?").bind(email.toLowerCase()).first();
        if (mevcutEmail) return jsonResponse({ hata: "Bu email zaten kayitli" }, 400);
        const mevcutKadi = await env.DB.prepare("SELECT id FROM kullanicilar WHERE kullanici_adi=?").bind(kullanici_adi).first();
        if (mevcutKadi) return jsonResponse({ hata: "Bu kullanici adi alinmis" }, 400);
        const id = crypto.randomUUID();
        const salt = saltUret();
        const hash = await hashSifre(sifre, salt);
        await env.DB.prepare(
          "INSERT INTO kullanicilar (id,email,kullanici_adi,sifre_hash,sifre_salt,olusturuldu) VALUES (?,?,?,?,?,?)"
        ).bind(id, email.toLowerCase(), kullanici_adi, hash, salt, Date.now()).run();
        const token = tokenUret();
        await env.DB.prepare(
          "INSERT INTO oturumlar (token,kullanici_id,son_kullanim) VALUES (?,?,?)"
        ).bind(token, id, Date.now() + 7 * 24 * 60 * 60 * 1e3).run();
        try {
          if (env.RESEND_API_KEY) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": "Bearer " + env.RESEND_API_KEY,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                from: "Kapitalist <onboarding@resend.dev>",
                to: [email],
                subject: "Kapitalist - Ho\u015F Geldin!",
                html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0d1117;color:#e6edf3;border-radius:12px">
                  <h1 style="color:#58a6ff;text-align:center">\u{1F4B0} Kapitalist</h1>
                  <p>Merhaba <b>${kullanici_adi}</b>,</p>
                  <p>Kapitalist'e ho\u015F geldin! Hesab\u0131n ba\u015Far\u0131yla olu\u015Fturuldu.</p>
                  <div style="background:#161b22;border-radius:8px;padding:16px;margin:16px 0">
                    <p style="margin:4px 0"><b>Kullan\u0131c\u0131 Ad\u0131:</b> ${kullanici_adi}</p>
                    <p style="margin:4px 0"><b>E-posta:</b> ${email}</p>
                  </div>
                  <p>Hemen oyna: <a href="https://kuzgunkral.github.io/kapitalist/" style="color:#58a6ff">Kapitalist</a></p>
                  <p style="color:#8b949e;font-size:12px;margin-top:20px">Kapitalist Ekibi</p>
                </div>`
              })
            });
          }
        } catch (mailErr) {
        }
        return jsonResponse({ basarili: true, token, kullanici_adi, uid: id });
      } catch (e) {
        return jsonResponse({ hata: "Kayit hatasi: " + e.message }, 500);
      }
    }
    if (path === "/giris" && request.method === "POST") {
      try {
        const { email, kullanici_adi, sifre } = await request.json();
        const girisAdi = (kullanici_adi || email || "").trim().toLowerCase();
        if (!girisAdi || !sifre) return jsonResponse({ hata: "Kullanici adi ve sifre gerekli" }, 400);
        const k = await env.DB.prepare("SELECT * FROM kullanicilar WHERE kullanici_adi=? OR email=?").bind(girisAdi, girisAdi).first();
        if (!k) return jsonResponse({ hata: "Email veya sifre hatali" }, 401);
        const hash = await hashSifre(sifre, k.sifre_salt);
        if (hash !== k.sifre_hash) return jsonResponse({ hata: "Email veya sifre hatali" }, 401);
        await env.DB.prepare("DELETE FROM oturumlar WHERE kullanici_id=? AND son_kullanim<?").bind(k.id, Date.now()).run();
        const token = tokenUret();
        await env.DB.prepare(
          "INSERT INTO oturumlar (token,kullanici_id,son_kullanim) VALUES (?,?,?)"
        ).bind(token, k.id, Date.now() + 7 * 24 * 60 * 60 * 1e3).run();
        return jsonResponse({ basarili: true, token, kullanici_adi: k.kullanici_adi, uid: k.id });
      } catch (e) {
        return jsonResponse({ hata: "Giris hatasi: " + e.message }, 500);
      }
    }
    if (path === "/dev-giris" && request.method === "POST") {
      try {
        const { sifre } = await request.json();
        if (!sifre || sifre !== DEV_SIFRE) return jsonResponse({ ok: false });
        return jsonResponse({ ok: true });
      } catch (e) {
        return jsonResponse({ ok: false, hata: e.message }, 500);
      }
    }
    if (path === "/cikis" && request.method === "POST") {
      const token = tokenFromRequest(request);
      if (token) await env.DB.prepare("DELETE FROM oturumlar WHERE token=?").bind(token).run();
      return jsonResponse({ basarili: true });
    }
    if (path === "/dogrula" && request.method === "GET") {
      const token = tokenFromRequest(request);
      const uid = await tokenDogrula(env, token);
      if (!uid) return jsonResponse({ hata: "Gecersiz token" }, 401);
      const k = await env.DB.prepare("SELECT kullanici_adi,email FROM kullanicilar WHERE id=?").bind(uid).first();
      if (!k) return jsonResponse({ hata: "Kullanici bulunamadi" }, 404);
      return jsonResponse({ basarili: true, kullanici_adi: k.kullanici_adi, email: k.email, uid });
    }
    if (path === "/save" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const { surum, veri } = await request.json();
        if (!veri) return jsonResponse({ hata: "Veri eksik" }, 400);
        const veriJson = JSON.stringify(veri);
        const existing = await env.DB.prepare("SELECT id FROM oyun_kayitlari WHERE kullanici_id=? AND surum=?").bind(uid, surum || "v1").first();
        if (existing) {
          await env.DB.prepare("UPDATE oyun_kayitlari SET veri=?,guncellendi=? WHERE kullanici_id=? AND surum=?").bind(veriJson, Date.now(), uid, surum || "v1").run();
        } else {
          await env.DB.prepare("INSERT INTO oyun_kayitlari (kullanici_id,surum,veri,olusturuldu,guncellendi) VALUES (?,?,?,?,?)").bind(uid, surum || "v1", veriJson, Date.now(), Date.now()).run();
        }
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: "Kayit hatasi: " + e.message }, 500);
      }
    }
    if (path === "/load" && request.method === "GET") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const surum = url.searchParams.get("surum") || "v1";
        const row = await env.DB.prepare("SELECT veri FROM oyun_kayitlari WHERE kullanici_id=? AND surum=?").bind(uid, surum).first();
        if (!row) return jsonResponse({ veri: null });
        return jsonResponse({ veri: JSON.parse(row.veri) });
      } catch (e) {
        return jsonResponse({ hata: "Yukleme hatasi: " + e.message }, 500);
      }
    }
    if (path === "/sohbet" && request.method === "POST") {
      try {
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const kadi = await kadiBul(env, uid);
        if (!kadi) return jsonResponse({ hata: "Kullanici bulunamadi" }, 401);
        const _mod = await modGet(env, kadi);
        if (_mod.ban === 1) return jsonResponse({ hata: "Hesabiniz sohbetten banlandi" }, 403);
        await ekTablolar(env);
        const stKapali = await env.DB.prepare("SELECT kapali FROM sohbet_durum WHERE k='1'").first();
        if (stKapali && stKapali.kapali === 1 && !(await adminMi(env, kadi)))
          return jsonResponse({ hata: "Sohbet yonetici tarafindan kapatildi" }, 403);
        await env.DB.prepare("INSERT INTO online_durum (kullanici_adi,son_aktif) VALUES (?,?) ON CONFLICT(kullanici_adi) DO UPDATE SET son_aktif=excluded.son_aktif").bind(kadi, Date.now()).run();
        if (_mod.mute_until > Date.now()) {
          const dk = Math.ceil((_mod.mute_until - Date.now()) / 60000);
          return jsonResponse({ hata: "Susturuldunuz, " + dk + " dakika sonra tekrar deneyin" }, 403);
        }
        await klanModTabloOlustur(env);
        const _kmMute = await env.DB.prepare("SELECT MAX(mute_until) AS mu FROM klan_mod WHERE kullanici_id=(SELECT id FROM kullanicilar WHERE kullanici_adi=?)").bind(kadi).first();
        if (_kmMute && _kmMute.mu > Date.now()) {
          const dk2 = Math.ceil((_kmMute.mu - Date.now()) / 60000);
          return jsonResponse({ hata: "Susturuldunuz, " + dk2 + " dakika sonra tekrar deneyin" }, 403);
        }
        const { mesaj } = await request.json();
        if (!mesaj || mesaj.trim().length === 0) return jsonResponse({ hata: "Mesaj bos olamaz" }, 400);
        if (mesaj.length > 200) return jsonResponse({ hata: "Mesaj cok uzun" }, 400);
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO global_sohbet (id,kullanici_adi,mesaj,zaman) VALUES (?,?,?,?)").bind(id, kadi, mesaj.trim(), Date.now()).run();
        await env.DB.prepare("DELETE FROM global_sohbet WHERE id NOT IN (SELECT id FROM global_sohbet ORDER BY zaman DESC LIMIT 50)").run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: "Sohbet hatasi: " + e.message }, 500);
      }
    }
    if (path === "/sohbet" && request.method === "GET") {
      try {
        await ekTablolar(env);
        const { results } = await env.DB.prepare("SELECT id,kullanici_adi,mesaj,zaman FROM global_sohbet ORDER BY zaman ASC LIMIT 50").all();
        let online = [];
        let kapali = 0;
        let davetler = [];
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (uid) {
          const benim = await kadiBul(env, uid);
          if (benim) {
            await env.DB.prepare("DELETE FROM online_durum WHERE son_aktif<?").bind(Date.now() - 600000).run();
            await env.DB.prepare("INSERT INTO online_durum (kullanici_adi,son_aktif) VALUES (?,?) ON CONFLICT(kullanici_adi) DO UPDATE SET son_aktif=excluded.son_aktif").bind(benim, Date.now()).run();
            const o = await env.DB.prepare("SELECT kullanici_adi FROM online_durum WHERE son_aktif>? ORDER BY son_aktif DESC LIMIT 50").bind(Date.now() - 120000).all();
            online = (o.results || []).map(function(x){ return x.kullanici_adi; });
            const dv = await env.DB.prepare("SELECT d.id, d.gonderen, kl.ad FROM klan_davetler d JOIN klanlar kl ON kl.id=d.klan_id WHERE d.alici_kadi=? ORDER BY d.zaman DESC LIMIT 10").bind(benim).all();
            davetler = dv.results || [];
            const st = await env.DB.prepare("SELECT kapali FROM sohbet_durum WHERE k='1'").first();
            kapali = st && st.kapali ? 1 : 0;
          }
        }
        return jsonResponse({ mesajlar: results || [], online, kapali, davetler });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet/sil" && (request.method === "POST" || request.method === "DELETE")) {
      try {
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const body = await request.json();
        const adminMi = ADMINLAR.indexOf(k.kullanici_adi) >= 0 || (await modGet(env, k.kullanici_adi)).admin === 1;
        let silinen = 0;
        if (body.id) {
          if (adminMi) {
            const r1 = await env.DB.prepare("DELETE FROM global_sohbet WHERE id=?").bind(body.id).run();
            silinen = r1.meta ? r1.meta.changes : 1;
          } else {
            const r1 = await env.DB.prepare("DELETE FROM global_sohbet WHERE id=? AND kullanici_adi=?").bind(body.id, k.kullanici_adi).run();
            silinen = r1.meta ? r1.meta.changes : 0;
          }
        } else if (body.zaman) {
          const r1 = await env.DB.prepare("DELETE FROM global_sohbet WHERE kullanici_adi=? AND zaman=?").bind(k.kullanici_adi, body.zaman).run();
          silinen = r1.meta ? r1.meta.changes : 0;
        }
        if (!silinen) return jsonResponse({ hata: "Mesaj silinemedi (baskasinin mesajini silme yetkiniz yok)" }, 403);
        return jsonResponse({ basarili: true, silinen });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet/temizle" && (request.method === "POST" || request.method === "DELETE")) {
      try {
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        if (ADMINLAR.indexOf(k.kullanici_adi) < 0 && (await modGet(env, k.kullanici_adi)).admin !== 1) return jsonResponse({ hata: "Yetkiniz yok" }, 403);
        await env.DB.prepare("DELETE FROM global_sohbet").run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet/durum" && request.method === "POST") {
      try {
        await ekTablolar(env);
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        if (!(await adminMi(env, benim))) return jsonResponse({ hata: "Yetkiniz yok" }, 403);
        const { kapali } = await request.json();
        await env.DB.prepare("INSERT INTO sohbet_durum (k,kapali) VALUES ('1',?) ON CONFLICT(k) DO UPDATE SET kapali=excluded.kapali").bind(kapali ? 1 : 0).run();
        return jsonResponse({ basarili: true, kapali: kapali ? 1 : 0 });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet/rapor" && request.method === "POST") {
      try {
        await ekTablolar(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        const { id } = await request.json();
        if (!id) return jsonResponse({ hata: "id gerekli" }, 400);
        const mesaj = await env.DB.prepare("SELECT id,kullanici_adi,mesaj FROM global_sohbet WHERE id=?").bind(id).first();
        if (!mesaj) return jsonResponse({ hata: "Mesaj bulunamadi (silinmis olabilir)" }, 404);
        const zaten = await env.DB.prepare("SELECT id FROM raporlar WHERE mesaj_id=? AND rapor_eden=?").bind(id, benim).first();
        if (zaten) return jsonResponse({ hata: "Bu mesaji zaten rapor ettiniz" }, 400);
        await env.DB.prepare("INSERT INTO raporlar (id,mesaj_id,kullanici_adi,mesaj,rapor_eden,zaman) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(), id, mesaj.kullanici_adi, mesaj.mesaj, benim, Date.now()).run();
        return jsonResponse({ basarili: true, mesaj: "Mesaj rapor edildi, yonetici inceleyecek" });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/banka" && request.method === "GET") {
      try {
        await ekTablolar(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 400);
        const klanRow = await env.DB.prepare("SELECT banka, elmas_banka FROM klanlar WHERE id=?").bind(uyelik.klan_id).first();
        const { results: yatiranlar } = await env.DB.prepare("SELECT kullanici_adi, SUM(CASE WHEN tur='yatir' THEN miktar ELSE 0 END) AS yatirdigi, SUM(CASE WHEN tur='cek' THEN miktar ELSE 0 END) AS cektigi, SUM(CASE WHEN tur='yatir_elmas' THEN miktar ELSE 0 END) AS yatirdigi_elmas, SUM(CASE WHEN tur='cek_elmas' THEN miktar ELSE 0 END) AS cektigi_elmas FROM klan_banka_log WHERE klan_id=? GROUP BY kullanici_adi ORDER BY yatirdigi DESC LIMIT 30").bind(uyelik.klan_id).all();
        return jsonResponse({ basarili: true, banka: klanRow ? klanRow.banka : 0, elmas_banka: klanRow ? Math.round(klanRow.elmas_banka || 0) : 0, yatiranlar: yatiranlar || [] });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/banka-cek" && request.method === "POST") {
      try {
        await ekTablolar(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const uyelik = await env.DB.prepare("SELECT klan_id, rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 400);
        if (uyelik.rol !== "lider" && uyelik.rol !== "yardimci") return jsonResponse({ hata: "Sadece klan lideri veya yardimcisi para cekebilir" }, 403);
        const { miktar, tur } = await request.json();
        const _elmas = tur === "elmas";
        const m = Math.round(Number(miktar));
        if (!m || m <= 0) return jsonResponse({ hata: "Gecersiz miktar" }, 400);
        const klanRow = await env.DB.prepare("SELECT banka, elmas_banka FROM klanlar WHERE id=?").bind(uyelik.klan_id).first();
        const _bakiye = _elmas ? (klanRow ? Math.round(klanRow.elmas_banka || 0) : 0) : (klanRow ? klanRow.banka : 0);
        if (!klanRow || _bakiye < m) return jsonResponse({ hata: _elmas ? "Bankada yeterli elmas yok" : "Bankada yeterli para yok" }, 400);
        if (_elmas) {
          await env.DB.prepare("UPDATE klanlar SET elmas_banka=elmas_banka-? WHERE id=?").bind(m, uyelik.klan_id).run();
        } else {
          await env.DB.prepare("UPDATE klanlar SET banka=banka-? WHERE id=?").bind(m, uyelik.klan_id).run();
        }
        await env.DB.prepare("INSERT INTO klan_banka_log (id,klan_id,kullanici_adi,miktar,tur,zaman) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(), uyelik.klan_id, k.kullanici_adi, m, _elmas ? "cek_elmas" : "cek", Date.now()).run();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(crypto.randomUUID(), uyelik.klan_id, (_elmas ? "💎 " : "💰 ") + k.kullanici_adi + (_elmas ? " bankadan " + m + " elmas çekti" : " bankadan " + m + " TL çekti"), Date.now()).run();
        const yeni = await env.DB.prepare("SELECT banka, elmas_banka FROM klanlar WHERE id=?").bind(uyelik.klan_id).first();
        return jsonResponse({ basarili: true, banka: yeni ? yeni.banka : 0, elmas_banka: yeni ? Math.round(yeni.elmas_banka || 0) : 0, cekilen: m });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    /*__EK_ENDPOINTLER__*/
    if (path === "/online-ping" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ online: [] });
        await ekTablolar(env);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        if (!k) return jsonResponse({ online: [] });
        await env.DB.prepare("DELETE FROM online_durum WHERE son_aktif<?").bind(Date.now() - 600000).run();
        await env.DB.prepare("INSERT INTO online_durum (kullanici_adi,son_aktif) VALUES (?,?) ON CONFLICT(kullanici_adi) DO UPDATE SET son_aktif=excluded.son_aktif").bind(k.kullanici_adi, Date.now()).run();
        const o = await env.DB.prepare("SELECT kullanici_adi FROM online_durum WHERE son_aktif>? ORDER BY son_aktif DESC LIMIT 50").bind(Date.now() - 120000).all();
        return jsonResponse({ online: (o.results || []).map(function(x){ return x.kullanici_adi; }) });
      } catch (e) {
        return jsonResponse({ online: [], hata: e.message }, 500);
      }
    }
    if (path === "/panel/raporlar" && request.method === "GET") {
      try {
        await ekTablolar(env);
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        if (!(await adminMi(env, benim))) return jsonResponse({ hata: "Yetkiniz yok" }, 403);
        const { results } = await env.DB.prepare("SELECT id,mesaj_id,kullanici_adi,mesaj,rapor_eden,zaman FROM raporlar ORDER BY zaman DESC LIMIT 100").all();
        const { results: muteliler } = await env.DB.prepare("SELECT kullanici_adi, mute_until FROM moderasyon WHERE mute_until > ?").bind(Date.now()).all();
        return jsonResponse({ raporlar: results || [], muteliler: muteliler || [] });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/panel/rapor-sil" && request.method === "POST") {
      try {
        await ekTablolar(env);
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        if (!(await adminMi(env, benim))) return jsonResponse({ hata: "Yetkiniz yok" }, 403);
        const { id } = await request.json();
        if (!id) return jsonResponse({ hata: "id gerekli" }, 400);
        await env.DB.prepare("DELETE FROM raporlar WHERE id=?").bind(id).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    /*__EK_ENDPOINTLER2__*/
    if (path === "/dm" && request.method === "POST") {
      try {
        await ekTablolar(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        const { hedef, mesaj } = await request.json();
        if (!hedef || !mesaj || !mesaj.trim()) return jsonResponse({ hata: "hedef ve mesaj gerekli" }, 400);
        if (mesaj.length > 300) return jsonResponse({ hata: "Mesaj cok uzun (max 300)" }, 400);
        if (hedef === benim) return jsonResponse({ hata: "Kendinize mesaj atamazsiniz" }, 400);
        const hedefK = await env.DB.prepare("SELECT id FROM kullanicilar WHERE kullanici_adi=?").bind(hedef).first();
        if (!hedefK) return jsonResponse({ hata: "Kullanici bulunamadi" }, 404);
        await env.DB.prepare("INSERT INTO dm (id,gonderen,alici,mesaj,zaman) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(), benim, hedef, mesaj.trim(), Date.now()).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    /*__EK_ENDPOINTLER3__*/
    if (path === "/dm" && request.method === "GET") {
      try {
        await ekTablolar(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        const hedef = url.searchParams.get("hedef");
        if (!hedef) return jsonResponse({ hata: "hedef gerekli" }, 400);
        const { results } = await env.DB.prepare(
          "SELECT gonderen,alici,mesaj,zaman FROM dm WHERE (gonderen=? AND alici=?) OR (gonderen=? AND alici=?) ORDER BY zaman DESC LIMIT 30"
        ).bind(benim, hedef, hedef, benim).all();
        return jsonResponse({ mesajlar: (results || []).reverse() });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    /*__EK_ENDPOINTLER4__*/
    if (path === "/dm/bildirim" && request.method === "GET") {
      try {
        await ekTablolar(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        const since = parseInt(url.searchParams.get("since") || "0", 10) || 0;
        const { results } = await env.DB.prepare(
          "SELECT gonderen, mesaj, zaman FROM dm WHERE alici=? AND zaman>? ORDER BY zaman DESC LIMIT 20"
        ).bind(benim, since).all();
        return jsonResponse({ bildirimler: results || [] });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/davet" && request.method === "POST") {
      try {
        await ekTablolar(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        const uyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik || (uyelik.rol !== "lider" && uyelik.rol !== "yardimci"))
          return jsonResponse({ hata: "Sadece klan lideri veya yardimcisi davet edebilir" }, 403);
        const { hedef } = await request.json();
        if (!hedef) return jsonResponse({ hata: "hedef gerekli" }, 400);
        const hedefK = await env.DB.prepare("SELECT id,kullanici_adi FROM kullanicilar WHERE kullanici_adi=?").bind(hedef).first();
        if (!hedefK) return jsonResponse({ hata: "Kullanici bulunamadi" }, 404);
        if (hedef === benim) return jsonResponse({ hata: "Kendinizi davet edemezsiniz" }, 400);
        const hedefUye = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(hedefK.id).first();
        if (hedefUye) return jsonResponse({ hata: hedef + " zaten bir klana uye" }, 400);
        const mevcut = await env.DB.prepare("SELECT id FROM klan_davetler WHERE klan_id=? AND alici_kadi=?").bind(uyelik.klan_id, hedef).first();
        if (mevcut) return jsonResponse({ hata: hedef + " zaten davetli" }, 400);
        const uyeSayisi = await env.DB.prepare("SELECT COUNT(*) AS c FROM klan_uyeler WHERE klan_id=?").bind(uyelik.klan_id).first();
        if (uyeSayisi && uyeSayisi.c >= 30) return jsonResponse({ hata: "Klan dolu (30/30)" }, 400);
        await env.DB.prepare("INSERT INTO klan_davetler (id,klan_id,alici_kadi,gonderen,zaman) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(), uyelik.klan_id, hedef, benim, Date.now()).run();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(crypto.randomUUID(), uyelik.klan_id, benim + ", " + hedef + " kullanicisini davet etti", Date.now()).run();
        return jsonResponse({ basarili: true, mesaj: hedef + " klana davet edildi" });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    /*__EK_ENDPOINTLER5__*/
    if (path === "/klan/davetler" && request.method === "GET") {
      try {
        await ekTablolar(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        const { results } = await env.DB.prepare("SELECT d.id, d.gonderen, kl.ad FROM klan_davetler d JOIN klanlar kl ON kl.id=d.klan_id WHERE d.alici_kadi=? ORDER BY d.zaman DESC LIMIT 10").bind(benim).all();
        return jsonResponse({ davetler: results || [] });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/davet-kabul" && request.method === "POST") {
      try {
        await ekTablolar(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        const { id, aksiyon } = await request.json();
        if (!id) return jsonResponse({ hata: "id gerekli" }, 400);
        const davet = await env.DB.prepare("SELECT * FROM klan_davetler WHERE id=? AND alici_kadi=?").bind(id, benim).first();
        if (!davet) return jsonResponse({ hata: "Davet bulunamadi" }, 404);
        await env.DB.prepare("DELETE FROM klan_davetler WHERE id=?").bind(id).run();
        if (aksiyon !== "kabul") return jsonResponse({ basarili: true, kabul: false });
        const zatenUye = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (zatenUye) return jsonResponse({ hata: "Zaten bir klana uyesiniz" }, 400);
        const uyeSayisi = await env.DB.prepare("SELECT COUNT(*) AS c FROM klan_uyeler WHERE klan_id=?").bind(davet.klan_id).first();
        if (uyeSayisi && uyeSayisi.c >= 30) return jsonResponse({ hata: "Klan dolu (30/30)" }, 400);
        await klanModTabloOlustur(env);
        const banKayit = await env.DB.prepare("SELECT ban FROM klan_mod WHERE klan_id=? AND kullanici_id=?").bind(davet.klan_id, uid).first();
        if (banKayit && banKayit.ban === 1) return jsonResponse({ hata: "Bu klandan banlanmissiniz" }, 403);
        await env.DB.prepare("INSERT INTO klan_uyeler (kullanici_id,klan_id,rol,katildi) VALUES (?,?,?,?)").bind(uid, davet.klan_id, "uye", Date.now()).run();
        const kl = await env.DB.prepare("SELECT ad FROM klanlar WHERE id=?").bind(davet.klan_id).first();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(crypto.randomUUID(), davet.klan_id, benim + " daveti kabul etti ve klana katildi", Date.now()).run();
        return jsonResponse({ basarili: true, kabul: true, klan: { ad: kl ? kl.ad : null } });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/panel" && request.method === "GET") {
      try {
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        const benAdmin = ADMINLAR.indexOf(benim) >= 0 ? 2 : (await modGet(env, benim)).admin === 1 ? 1 : 0;
        if (!benAdmin) return jsonResponse({ hata: "Yetkiniz yok" }, 403);
        const { results } = await env.DB.prepare(
          "SELECT k.kullanici_adi, k.email, k.olusturuldu, COALESCE(m.mute_until,0) AS mute_until, COALESCE(m.ban,0) AS ban, CASE WHEN m.admin=1 OR ?2>=1 THEN 1 ELSE 0 END AS admin, (SELECT COUNT(*) FROM oyun_kayitlari y WHERE y.kullanici_id=k.id) AS kayit_var FROM kullanicilar k LEFT JOIN moderasyon m ON m.kullanici_adi=k.kullanici_adi ORDER BY k.olusturuldu DESC"
        ).bind(benim, benAdmin).all();
        return jsonResponse({ kullanicilar: results || [], benim, seviye: benAdmin });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/panel/aksiyon" && request.method === "POST") {
      try {
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        const benAdmin = ADMINLAR.indexOf(benim) >= 0 || (await modGet(env, benim)).admin === 1;
        if (!benAdmin) return jsonResponse({ hata: "Yetkiniz yok" }, 403);
        const { hedef, islem, sure_dk } = await request.json();
        if (!hedef || !islem) return jsonResponse({ hata: "hedef ve islem gerekli" }, 400);
        const hedefK = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE kullanici_adi=?").bind(hedef).first();
        if (!hedefK) return jsonResponse({ hata: "Hedef kullanici bulunamadi" }, 404);
        const hedefMod = await modGet(env, hedef);
        if (ADMINLAR.indexOf(hedef) >= 0 || hedefMod.admin === 1) return jsonResponse({ hata: "Adminlere islem yapamazsiniz" }, 403);
        if (benim === hedef) return jsonResponse({ hata: "Kendinize islem yapamazsiniz" }, 400);
        await env.DB.prepare(
          "INSERT INTO moderasyon (kullanici_adi,mute_until,ban,admin,guncellendi) VALUES (?,?,?,?,?) ON CONFLICT(kullanici_adi) DO UPDATE SET guncellendi=excluded.guncellendi"
        ).bind(hedef, hedefMod.mute_until || 0, hedefMod.ban || 0, hedefMod.admin || 0, Date.now()).run();
        let mesaj = "";
        if (islem === "mute") {
          if (hedefMod.mute_until && hedefMod.mute_until > Date.now()) {
            await env.DB.prepare("UPDATE moderasyon SET mute_until=0 WHERE kullanici_adi=?").bind(hedef).run();
            mesaj = hedef + " kısıtlaması açıldı (unmute)";
          } else {
            const until = Date.now() + (Number(sure_dk) || 60) * 60 * 1000;
            await env.DB.prepare("UPDATE moderasyon SET mute_until=? WHERE kullanici_adi=?").bind(until, hedef).run();
            mesaj = hedef + " " + (Number(sure_dk) || 60) + " dakika kısıtlandı (mute)";
          }
        } else if (islem === "unmute") {
          await env.DB.prepare("UPDATE moderasyon SET mute_until=0 WHERE kullanici_adi=?").bind(hedef).run();
          mesaj = hedef + " susturulmasi kaldirildi";
        } else if (islem === "ban") {
          await env.DB.prepare("UPDATE moderasyon SET ban=1 WHERE kullanici_adi=?").bind(hedef).run();
          await env.DB.prepare("DELETE FROM global_sohbet WHERE kullanici_adi=?").bind(hedef).run();
          mesaj = hedef + " sohbetten banlandi";
        } else if (islem === "unban") {
          await env.DB.prepare("UPDATE moderasyon SET ban=0 WHERE kullanici_adi=?").bind(hedef).run();
          mesaj = hedef + " banindan cikarildi";
        } else if (islem === "admin_ver") {
          await env.DB.prepare("UPDATE moderasyon SET admin=1 WHERE kullanici_adi=?").bind(hedef).run();
          mesaj = hedef + " admin yetkisi verildi";
        } else if (islem === "admin_al") {
          await env.DB.prepare("UPDATE moderasyon SET admin=0 WHERE kullanici_adi=?").bind(hedef).run();
          mesaj = hedef + " admin yetkisi alindi";
        } else if (islem === "mesaj_sil") {
          await env.DB.prepare("DELETE FROM global_sohbet WHERE kullanici_adi=?").bind(hedef).run();
          mesaj = hedef + " mesajlari silindi";
        } else if (islem === "kayit_sil") {
          const hedefUid = await env.DB.prepare("SELECT id FROM kullanicilar WHERE kullanici_adi=?").bind(hedef).first();
          if (hedefUid) {
            await env.DB.prepare("DELETE FROM oyun_kayitlari WHERE kullanici_id=?").bind(hedefUid.id).run();
            mesaj = hedef + " bulut kaydi silindi";
          } else mesaj = "Hedef bulunamadi";
        } else {
          return jsonResponse({ hata: "Bilinmeyen islem: " + islem }, 400);
        }
        const yeniMod = await modGet(env, hedef);
        return jsonResponse({ basarili: true, mesaj, mute_until: yeniMod.mute_until || 0 });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/panel/admin-ol" && request.method === "POST") {
      try {
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const benim = await kadiBul(env, uid);
        if (!benim) return jsonResponse({ hata: "Kullanici bulunamadi" }, 401);
        const mevcut = await modGet(env, benim);
        if (mevcut.admin !== 1) {
          await env.DB.prepare(
            "INSERT INTO moderasyon (kullanici_adi,mute_until,ban,admin,guncellendi) VALUES (?,0,0,1,?) ON CONFLICT(kullanici_adi) DO UPDATE SET admin=1, guncellendi=excluded.guncellendi"
          ).bind(benim, Date.now()).run();
        }
        return jsonResponse({ basarili: true, admin: true, mesaj: benim + " admin yetkisi aldi" });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/yetki" && request.method === "GET") {
      try {
        await modTabloOlustur(env);
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ admin: false, seviye: 0 });
        const benim = await kadiBul(env, uid);
        const seviye = ADMINLAR.indexOf(benim) >= 0 ? 2 : (await modGet(env, benim)).admin === 1 ? 1 : 0;
        const benimMod = await modGet(env, benim);
        await klanModTabloOlustur(env);
        const benimKm = await env.DB.prepare("SELECT MAX(mute_until) AS mu FROM klan_mod WHERE kullanici_id=(SELECT id FROM kullanicilar WHERE kullanici_adi=?)").bind(benim).first();
        const globalMute = Math.max(benimMod.mute_until || 0, (benimKm && benimKm.mu) || 0);
        return jsonResponse({ admin: seviye > 0, seviye, benim, mute_until: globalMute, mute: globalMute > Date.now() });
      } catch (e) {
        return jsonResponse({ admin: false, seviye: 0 });
      }
    }
    if (path === "/sil" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        await env.DB.prepare("DELETE FROM oyun_kayitlari WHERE kullanici_id=?").bind(uid).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sifre-degistir" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const { eski_sifre, yeni_sifre } = await request.json();
        const k = await env.DB.prepare("SELECT * FROM kullanicilar WHERE id=?").bind(uid).first();
        const hash = await hashSifre(eski_sifre, k.sifre_salt);
        if (hash !== k.sifre_hash) return jsonResponse({ hata: "Eski sifre yanlis" }, 401);
        const yeniSalt = saltUret();
        const yeniHash = await hashSifre(yeni_sifre, yeniSalt);
        await env.DB.prepare("UPDATE kullanicilar SET sifre_hash=?,sifre_salt=? WHERE id=?").bind(yeniHash, yeniSalt, uid).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/olustur" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const mevcutUyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (mevcutUyelik) return jsonResponse({ hata: "Zaten bir klana uyesiniz" }, 400);
        await ekTablolar(env);
        const cezaliK = await env.DB.prepare("SELECT klan_ceza_until, kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        if (cezaliK && cezaliK.klan_ceza_until > Date.now()) {
          const saat = Math.ceil((cezaliK.klan_ceza_until - Date.now()) / 3600000);
          return jsonResponse({ hata: "Klan cezasi aktif! " + saat + " saat boyunca klan kuramazsiniz" }, 403);
        }
        const { ad } = await request.json();
        if (!ad || ad.length < 2 || ad.length > 20) return jsonResponse({ hata: "Klan adi 2-20 karakter olmali" }, 400);
        const mevcutKlan = await env.DB.prepare("SELECT id FROM klanlar WHERE ad=?").bind(ad).first();
        if (mevcutKlan) return jsonResponse({ hata: "Bu klan adi alinmis" }, 400);
        const klanId = crypto.randomUUID();
        const now = Date.now();
        await env.DB.prepare("INSERT INTO klanlar (id,ad,lider_id,seviye,xp,kasa_tl,banka,olusturuldu) VALUES (?,?,?,1,0,0,0,?)").bind(klanId, ad, uid, now).run();
        await env.DB.prepare("INSERT INTO klan_uyeler (kullanici_id,klan_id,rol,katildi) VALUES (?,?,?,?)").bind(uid, klanId, "lider", now).run();
        const logId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(logId, klanId, k.kullanici_adi + " klani kurdu", now).run();
        return jsonResponse({ basarili: true, klan_id: klanId });
      } catch (e) {
        return jsonResponse({ hata: "Klan olusturma hatasi: " + e.message }, 500);
      }
    }
    if (path === "/klan/bilgi" && request.method === "GET") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) {
          await ekTablolar(env);
          const ck = await env.DB.prepare("SELECT klan_ceza_until FROM kullanicilar WHERE id=?").bind(uid).first();
          return jsonResponse({ klan: null, ceza_until: ck && ck.klan_ceza_until > Date.now() ? ck.klan_ceza_until : 0 });
        }
        const klan = await env.DB.prepare("SELECT * FROM klanlar WHERE id=?").bind(uyelik.klan_id).first();
        if (!klan) return jsonResponse({ klan: null });
        await klanModTabloOlustur(env);
        const lider = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(klan.lider_id).first();
        const { results: uyeler } = await env.DB.prepare("SELECT k.kullanici_adi, ku.rol, COALESCE(km.ban,0) AS ban, COALESCE(km.mute_until,0) AS mute_until FROM klan_uyeler ku JOIN kullanicilar k ON k.id=ku.kullanici_id LEFT JOIN klan_mod km ON km.klan_id=ku.klan_id AND km.kullanici_id=ku.kullanici_id WHERE ku.klan_id=? ORDER BY CASE ku.rol WHEN 'lider' THEN 0 WHEN 'yardimci' THEN 1 ELSE 2 END, ku.katildi ASC").bind(uyelik.klan_id).all();
        const { results: log } = await env.DB.prepare("SELECT mesaj,zaman FROM klan_log WHERE klan_id=? ORDER BY zaman DESC LIMIT 20").bind(uyelik.klan_id).all();
        const { results: banlilar } = await env.DB.prepare("SELECT k.kullanici_adi FROM klan_mod km JOIN kullanicilar k ON k.id=km.kullanici_id WHERE km.klan_id=? AND km.ban=1").bind(uyelik.klan_id).all();
        const benimMod = await klanModGet(env, uyelik.klan_id, uid);
        return jsonResponse({ klan: { ...klan, lider: lider ? lider.kullanici_adi : "?", uyeler: uyeler || [], log: log || [], banlilar: banlilar || [], benim_rolum: uyelik.rol, benim_mute: benimMod.mute_until || 0 } });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/ara" && request.method === "GET") {
      try {
        const q = url.searchParams.get("q") || "";
        const { results } = await env.DB.prepare(
          "SELECT kl.id, kl.ad, kl.seviye, COALESCE(l.kullanici_adi,'?') AS lider, (SELECT COUNT(*) FROM klan_uyeler ku WHERE ku.klan_id=kl.id) AS uye_sayisi FROM klanlar kl LEFT JOIN kullanicilar l ON l.id=kl.lider_id WHERE (?1='' OR kl.ad LIKE '%'||?1||'%') ORDER BY uye_sayisi DESC, kl.ad ASC LIMIT 100"
        ).bind(q).all();
        return jsonResponse({ klanlar: results || [] });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/katil" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const mevcutUyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (mevcutUyelik) return jsonResponse({ hata: "Zaten bir klana uyesiniz" }, 400);
        await ekTablolar(env);
        const cezaliK = await env.DB.prepare("SELECT klan_ceza_until FROM kullanicilar WHERE id=?").bind(uid).first();
        if (cezaliK && cezaliK.klan_ceza_until > Date.now()) {
          const saat = Math.ceil((cezaliK.klan_ceza_until - Date.now()) / 3600000);
          return jsonResponse({ hata: "Klan cezasi aktif! " + saat + " saat boyunca klana giremezsiniz" }, 403);
        }
        const { klan_id } = await request.json();
        const klan = await env.DB.prepare("SELECT id FROM klanlar WHERE id=?").bind(klan_id).first();
        if (!klan) return jsonResponse({ hata: "Klan bulunamadi" }, 404);
        await klanModTabloOlustur(env);
        const banKayit = await env.DB.prepare("SELECT ban FROM klan_mod WHERE klan_id=? AND kullanici_id=?").bind(klan_id, uid).first();
        if (banKayit && banKayit.ban === 1) return jsonResponse({ hata: "Bu klandan banlandiniz, istek gonderemezsiniz" }, 403);
        await env.DB.prepare(
          "CREATE TABLE IF NOT EXISTS klan_istekler (id TEXT PRIMARY KEY, kullanici_id TEXT, klan_id TEXT, zaman INTEGER)"
        ).run();
        const bekleyen = await env.DB.prepare("SELECT id FROM klan_istekler WHERE kullanici_id=? AND klan_id=?").bind(uid, klan_id).first();
        if (bekleyen) return jsonResponse({ hata: "Bu klana zaten bekleyen bir isteginiz var" }, 400);
        const baskaIstek = await env.DB.prepare("SELECT id FROM klan_istekler WHERE kullanici_id=?").bind(uid).first();
        if (baskaIstek) return jsonResponse({ hata: "Baska bir klana zaten katilim isteginiz var" }, 400);
        const uyeSayisi = await env.DB.prepare("SELECT COUNT(*) AS c FROM klan_uyeler WHERE klan_id=?").bind(klan_id).first();
        if (uyeSayisi && uyeSayisi.c >= 30) return jsonResponse({ hata: "Klan dolu (30/30)" }, 400);
        const istekId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_istekler (id,kullanici_id,klan_id,zaman) VALUES (?,?,?,?)").bind(istekId, uid, klan_id, Date.now()).run();
        const logId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(logId, klan_id, k.kullanici_adi + " klana katilim istegi gonderdi", Date.now()).run();
        return jsonResponse({ basarili: true, istek: true, mesaj: "Katilim istegi gonderildi, lider onaylamasi bekleniyor" });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/istekler" && request.method === "GET") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik || (uyelik.rol !== "lider" && uyelik.rol !== "yardimci")) return jsonResponse({ istekler: [] });
        await env.DB.prepare(
          "CREATE TABLE IF NOT EXISTS klan_istekler (id TEXT PRIMARY KEY, kullanici_id TEXT, klan_id TEXT, zaman INTEGER)"
        ).run();
        const { results } = await env.DB.prepare(
          "SELECT ki.id, ki.kullanici_id, ki.zaman, k.kullanici_adi AS oyuncu FROM klan_istekler ki JOIN kullanicilar k ON k.id=ki.kullanici_id WHERE ki.klan_id=? ORDER BY ki.zaman ASC"
        ).bind(uyelik.klan_id).all();
        return jsonResponse({ istekler: results || [], rol: uyelik.rol });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/istek" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const { id, aksiyon } = await request.json();
        if (!id || (aksiyon !== "kabul" && aksiyon !== "red")) return jsonResponse({ hata: "Gecersiz istek" }, 400);
        await env.DB.prepare(
          "CREATE TABLE IF NOT EXISTS klan_istekler (id TEXT PRIMARY KEY, kullanici_id TEXT, klan_id TEXT, zaman INTEGER)"
        ).run();
        const istek = await env.DB.prepare("SELECT * FROM klan_istekler WHERE id=?").bind(id).first();
        if (!istek) return jsonResponse({ hata: "Istek bulunamadi (zaten islem yapilmis olabilir)" }, 404);
        const benimUyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!benimUyelik || benimUyelik.klan_id !== istek.klan_id || (benimUyelik.rol !== "lider" && benimUyelik.rol !== "yardimci"))
          return jsonResponse({ hata: "Yetkiniz yok" }, 403);
        const isteyen = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(istek.kullanici_id).first();
        await env.DB.prepare("DELETE FROM klan_istekler WHERE id=?").bind(id).run();
        if (aksiyon === "kabul") {
          const zatenUye = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(istek.kullanici_id).first();
          if (zatenUye) return jsonResponse({ hata: isteyen ? isteyen.kullanici_adi + " zaten bir klana uye" : "Oyuncu baska klana uye oldu" }, 400);
          await ekTablolar(env);
          const isteyenK = await env.DB.prepare("SELECT klan_ceza_until FROM kullanicilar WHERE id=?").bind(istek.kullanici_id).first();
          if (isteyenK && isteyenK.klan_ceza_until > Date.now()) {
            const saat = Math.ceil((isteyenK.klan_ceza_until - Date.now()) / 3600000);
            return jsonResponse({ hata: (isteyen ? isteyen.kullanici_adi : "Oyuncu") + " klan cezasi altinda (" + saat + " saat kaldı)" }, 403);
          }
          const uyeSayisi = await env.DB.prepare("SELECT COUNT(*) AS c FROM klan_uyeler WHERE klan_id=?").bind(istek.klan_id).first();
          if (uyeSayisi && uyeSayisi.c >= 30) return jsonResponse({ hata: "Klan dolu (30/30)" }, 400);
          await klanModTabloOlustur(env);
          const banKayit = await env.DB.prepare("SELECT ban FROM klan_mod WHERE klan_id=? AND kullanici_id=?").bind(istek.klan_id, istek.kullanici_id).first();
          if (banKayit && banKayit.ban === 1) return jsonResponse({ hata: (isteyen ? isteyen.kullanici_adi : "Oyuncu") + " bu klandan banlanmis" }, 403);
          await env.DB.prepare("INSERT INTO klan_uyeler (kullanici_id,klan_id,rol,katildi) VALUES (?,?,?,?)").bind(istek.kullanici_id, istek.klan_id, "uye", Date.now()).run();
          const logId = crypto.randomUUID();
          await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(logId, istek.klan_id, (isteyen ? isteyen.kullanici_adi : "Oyuncu") + " klana kabul edildi", Date.now()).run();
          return jsonResponse({ basarili: true, kabul: true, oyuncu: isteyen ? isteyen.kullanici_adi : null });
        }
        const logId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(logId, istek.klan_id, (isteyen ? isteyen.kullanici_adi : "Oyuncu") + " klana katilim istegi reddedildi", Date.now()).run();
        return jsonResponse({ basarili: true, kabul: false });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/uyelik-aksiyon" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 403);
        const { hedef, aksiyon } = await request.json();
        const izinli = ["cikart", "ban", "unban", "sustur", "konustur", "yardimci", "lider"];
        if (!hedef || !aksiyon || izinli.indexOf(aksiyon) < 0) return jsonResponse({ hata: "Gecersiz aksiyon" }, 400);
        const hedefK = await env.DB.prepare("SELECT id,kullanici_adi FROM kullanicilar WHERE kullanici_adi=?").bind(hedef).first();
        if (!hedefK) return jsonResponse({ hata: "Oyuncu bulunamadi" }, 404);
        if (hedefK.id === uid) return jsonResponse({ hata: "Kendinize islem yapamazsiniz" }, 400);
        const hedefUyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(hedefK.id).first();
        const benLider = uyelik.rol === "lider";
        const benYardimci = uyelik.rol === "yardimci";
        const ayniKlan = hedefUyelik && hedefUyelik.klan_id === uyelik.klan_id;
        if ((aksiyon === "yardimci" || aksiyon === "lider") && !benLider) return jsonResponse({ hata: "Bu islem icin lider olmalisiniz" }, 403);
        if (hedefUyelik && hedefUyelik.rol === "lider" && aksiyon !== "unban") return jsonResponse({ hata: "Lidere islem yapamazsiniz" }, 403);
        if (aksiyon === "cikart" || aksiyon === "ban" || aksiyon === "sustur" || aksiyon === "konustur") {
          if (!benLider && !benYardimci) return jsonResponse({ hata: "Bu islem icin lider veya yardimci olmalisiniz" }, 403);
          if (!ayniKlan) return jsonResponse({ hata: "Hedef bu klanin uyesi degil" }, 400);
        }
        await klanModTabloOlustur(env);
        let mesaj = "";
        if (aksiyon === "cikart") {
          await ekTablolar(env);
          await env.DB.prepare("UPDATE kullanicilar SET klan_ceza_until=? WHERE id=?").bind(Date.now() + 72 * 60 * 60 * 1000, hedefK.id).run();
          await env.DB.prepare("DELETE FROM klan_uyeler WHERE kullanici_id=?").bind(hedefK.id).run();
          mesaj = hedef + " klandan cikarildi (72 saat baska klana giremez)";
        } else if (aksiyon === "ban") {
          await env.DB.prepare(
            "INSERT INTO klan_mod (klan_id,kullanici_id,ban,mute_until) VALUES (?,?,1,0) ON CONFLICT(klan_id,kullanici_id) DO UPDATE SET ban=1"
          ).bind(uyelik.klan_id, hedefK.id).run();
          if (ayniKlan) await env.DB.prepare("DELETE FROM klan_uyeler WHERE kullanici_id=?").bind(hedefK.id).run();
          await env.DB.prepare("DELETE FROM klan_istekler WHERE kullanici_id=? AND klan_id=?").bind(hedefK.id, uyelik.klan_id).run();
          mesaj = hedef + " klandan banlandi";
        } else if (aksiyon === "unban") {
          await env.DB.prepare(
            "INSERT INTO klan_mod (klan_id,kullanici_id,ban,mute_until) VALUES (?,?,0,0) ON CONFLICT(klan_id,kullanici_id) DO UPDATE SET ban=0"
          ).bind(uyelik.klan_id, hedefK.id).run();
          mesaj = hedef + " baninin kaldirildi";
        } else if (aksiyon === "sustur") {
          const mevcut = await klanModGet(env, uyelik.klan_id, hedefK.id);
          await modTabloOlustur(env);
          if (mevcut.mute_until > Date.now()) {
            await env.DB.prepare(
              "INSERT INTO klan_mod (klan_id,kullanici_id,ban,mute_until) VALUES (?,?,?,0) ON CONFLICT(klan_id,kullanici_id) DO UPDATE SET mute_until=0"
            ).bind(uyelik.klan_id, hedefK.id, mevcut.ban || 0).run();
            await env.DB.prepare(
              "INSERT INTO moderasyon (kullanici_adi,mute_until,ban,admin,guncellendi) VALUES (?,?,?,?,?) ON CONFLICT(kullanici_adi) DO UPDATE SET mute_until=excluded.mute_until, guncellendi=excluded.guncellendi"
            ).bind(hedef, 0, 0, 0, Date.now()).run();
            mesaj = hedef + " konusturuldu";
          } else {
            const muteBitis = Date.now() + 60 * 60 * 1000;
            await env.DB.prepare(
              "INSERT INTO klan_mod (klan_id,kullanici_id,ban,mute_until) VALUES (?,?,?,?) ON CONFLICT(klan_id,kullanici_id) DO UPDATE SET mute_until=excluded.mute_until"
            ).bind(uyelik.klan_id, hedefK.id, mevcut.ban || 0, muteBitis).run();
            await env.DB.prepare(
              "INSERT INTO moderasyon (kullanici_adi,mute_until,ban,admin,guncellendi) VALUES (?,?,?,?,?) ON CONFLICT(kullanici_adi) DO UPDATE SET mute_until=excluded.mute_until, guncellendi=excluded.guncellendi"
            ).bind(hedef, muteBitis, 0, 0, Date.now()).run();
            mesaj = hedef + " 1 saat susturuldu";
          }
        } else if (aksiyon === "konustur") {
          await env.DB.prepare(
            "INSERT INTO klan_mod (klan_id,kullanici_id,ban,mute_until) VALUES (?,?,?,0) ON CONFLICT(klan_id,kullanici_id) DO UPDATE SET mute_until=0"
          ).bind(uyelik.klan_id, hedefK.id, 0).run();
          await modTabloOlustur(env);
          await env.DB.prepare(
            "INSERT INTO moderasyon (kullanici_adi,mute_until,ban,admin,guncellendi) VALUES (?,?,?,?,?) ON CONFLICT(kullanici_adi) DO UPDATE SET mute_until=excluded.mute_until, guncellendi=excluded.guncellendi"
          ).bind(hedef, 0, 0, 0, Date.now()).run();
          mesaj = hedef + " konusturuldu";
        } else if (aksiyon === "yardimci") {
          if (!ayniKlan) return jsonResponse({ hata: "Hedef bu klanin uyesi degil" }, 400);
          if (hedefUyelik.rol === "yardimci") {
            await env.DB.prepare("UPDATE klan_uyeler SET rol='uye' WHERE kullanici_id=?").bind(hedefK.id).run();
            mesaj = hedef + " yardimcilik gorevi alindi";
          } else {
            await env.DB.prepare("UPDATE klan_uyeler SET rol='uye' WHERE klan_id=? AND rol='yardimci'").bind(uyelik.klan_id).run();
            await env.DB.prepare("UPDATE klan_uyeler SET rol='yardimci' WHERE kullanici_id=?").bind(hedefK.id).run();
            mesaj = hedef + " yardimci yapildi";
          }
        } else if (aksiyon === "lider") {
          if (!ayniKlan) return jsonResponse({ hata: "Hedef bu klanin uyesi degil" }, 400);
          await env.DB.prepare("UPDATE klanlar SET lider_id=? WHERE id=?").bind(hedefK.id, uyelik.klan_id).run();
          await env.DB.prepare("UPDATE klan_uyeler SET rol='uye' WHERE kullanici_id=?").bind(uid).run();
          await env.DB.prepare("UPDATE klan_uyeler SET rol='lider' WHERE kullanici_id=?").bind(hedefK.id).run();
          mesaj = hedef + " yeni lider oldu";
        }
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(crypto.randomUUID(), uyelik.klan_id, mesaj, Date.now()).run();
        return jsonResponse({ basarili: true, mesaj });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/ayril" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const uyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 400);
        await ekTablolar(env);
        await env.DB.prepare("UPDATE kullanicilar SET klan_ceza_until=? WHERE id=?").bind(Date.now() + 72 * 60 * 60 * 1000, uid).run();
        if (uyelik.rol === "lider") {
          // Lider ayrilirsa klan tamamen silinir (uyeler + log + sohbet)
          await env.DB.prepare("DELETE FROM klan_uyeler WHERE klan_id=?").bind(uyelik.klan_id).run();
          await env.DB.prepare("DELETE FROM klan_log WHERE klan_id=?").bind(uyelik.klan_id).run();
          await env.DB.prepare("DELETE FROM klan_sohbet WHERE klan_id=?").bind(uyelik.klan_id).run();
          await env.DB.prepare("DELETE FROM klanlar WHERE id=?").bind(uyelik.klan_id).run();
          return jsonResponse({ basarili: true, klan_silindi: true });
        }
        await env.DB.prepare("DELETE FROM klan_uyeler WHERE kullanici_id=?").bind(uid).run();
        const logId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(logId, uyelik.klan_id, k.kullanici_adi + " klandan ayrildi", Date.now()).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/sohbet" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const uyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 400);
        await klanModTabloOlustur(env);
        const klanMod = await klanModGet(env, uyelik.klan_id, uid);
        if (klanMod.ban === 1) return jsonResponse({ hata: "Klan sohbetinden banlandiniz" }, 403);
        if (klanMod.mute_until > Date.now()) {
          const dk = Math.ceil((klanMod.mute_until - Date.now()) / 60000);
          return jsonResponse({ hata: "Klan sohbetinde susturuldunuz, " + dk + " dakika sonra tekrar deneyin" }, 403);
        }
        const { mesaj } = await request.json();
        if (!mesaj || mesaj.trim().length === 0) return jsonResponse({ hata: "Mesaj bos olamaz" }, 400);
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_sohbet (id,klan_id,kullanici_adi,mesaj,zaman) VALUES (?,?,?,?,?)").bind(id, uyelik.klan_id, k.kullanici_adi, mesaj.trim(), Date.now()).run();
        await env.DB.prepare("DELETE FROM klan_sohbet WHERE klan_id=? AND id NOT IN (SELECT id FROM klan_sohbet WHERE klan_id=? ORDER BY zaman DESC LIMIT 50)").bind(uyelik.klan_id, uyelik.klan_id).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/sohbet" && request.method === "GET") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ mesajlar: [] });
        const { results } = await env.DB.prepare("SELECT id,kullanici_adi,mesaj,zaman FROM klan_sohbet WHERE klan_id=? ORDER BY zaman ASC LIMIT 50").bind(uyelik.klan_id).all();
        return jsonResponse({ mesajlar: results || [] });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/kasa" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const uyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 400);
        const { miktar } = await request.json();
        if (!miktar || miktar <= 0) return jsonResponse({ hata: "Gecersiz miktar" }, 400);
        await env.DB.prepare("UPDATE klanlar SET kasa_tl=kasa_tl+? WHERE id=?").bind(miktar, uyelik.klan_id).run();
        const logId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(logId, uyelik.klan_id, k.kullanici_adi + " kasaya " + miktar + " TL ekledi", Date.now()).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/xp" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 400);
        const { xp } = await request.json();
        if (!xp || xp <= 0) return jsonResponse({ hata: "Gecersiz xp" }, 400);
        const klan = await env.DB.prepare("SELECT xp,seviye FROM klanlar WHERE id=?").bind(uyelik.klan_id).first();
        const yeniXp = klan.xp + xp;
        const yeniSeviye = Math.floor(yeniXp / 1e4) + 1;
        await env.DB.prepare("UPDATE klanlar SET xp=?,seviye=? WHERE id=?").bind(yeniXp, yeniSeviye, uyelik.klan_id).run();
        return jsonResponse({ basarili: true, yeni_xp: yeniXp, yeni_seviye: yeniSeviye });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const { mesaj } = await request.json();
        if (!mesaj || mesaj.trim().length === 0) return jsonResponse({ hata: "Mesaj bos olamaz" }, 400);
        if (mesaj.length > 200) return jsonResponse({ hata: "Mesaj cok uzun" }, 400);
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO global_sohbet (id,kullanici_adi,mesaj,zaman) VALUES (?,?,?,?)").bind(id, k.kullanici_adi, mesaj.trim(), Date.now()).run();
        await env.DB.prepare("DELETE FROM global_sohbet WHERE id NOT IN (SELECT id FROM global_sohbet ORDER BY zaman DESC LIMIT 50)").run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare("SELECT id,kullanici_adi,mesaj,zaman FROM global_sohbet ORDER BY zaman ASC LIMIT 50").all();
        return jsonResponse({ mesajlar: results || [] });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/banka-yatir" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const uyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 400);
        const { miktar, tur } = await request.json();
        const _elmas = tur === "elmas";
        const m = Math.round(Number(miktar));
        if (!m || m <= 0) return jsonResponse({ hata: "Gecersiz miktar" }, 400);
        if (_elmas) {
          await env.DB.prepare("UPDATE klanlar SET elmas_banka=elmas_banka+? WHERE id=?").bind(m, uyelik.klan_id).run();
        } else {
          await env.DB.prepare("UPDATE klanlar SET banka=banka+? WHERE id=?").bind(m, uyelik.klan_id).run();
        }
        await env.DB.prepare("INSERT INTO klan_banka_log (id,klan_id,kullanici_adi,miktar,tur,zaman) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(), uyelik.klan_id, k.kullanici_adi, m, _elmas ? "yatir_elmas" : "yatir", Date.now()).run();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(crypto.randomUUID(), uyelik.klan_id, (_elmas ? "💎 " : "💰 ") + k.kullanici_adi + (_elmas ? " bankaya " + m + " elmas yatırdı" : " bankaya " + m + " TL yatırdı"), Date.now()).run();
        const klanRow = await env.DB.prepare("SELECT banka, elmas_banka FROM klanlar WHERE id=?").bind(uyelik.klan_id).first();
        return jsonResponse({ basarili: true, banka: klanRow ? klanRow.banka : null, elmas_banka: klanRow ? Math.round(klanRow.elmas_banka || 0) : 0 });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/ayril" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const uyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uyesiniz degil" }, 400);
        if (uyelik.rol === "lider") {
          const { results: diger } = await env.DB.prepare("SELECT kullanici_id FROM klan_uyeler WHERE klan_id=? AND kullanici_id!=?").bind(uyelik.klan_id, uid).all();
          if (diger && diger.length > 0) return jsonResponse({ hata: "Lider olmak icin once liderlik devredin" }, 400);
          await env.DB.prepare("DELETE FROM klanlar WHERE id=?").bind(uyelik.klan_id).run();
          await env.DB.prepare("DELETE FROM klan_log WHERE klan_id=?").bind(uyelik.klan_id).run();
          await env.DB.prepare("DELETE FROM klan_sohbet WHERE klan_id=?").bind(uyelik.klan_id).run();
        } else {
          const logId = crypto.randomUUID();
          await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(logId, uyelik.klan_id, k.kullanici_adi + " klandan ayrildi", Date.now()).run();
        }
        await env.DB.prepare("DELETE FROM klan_uyeler WHERE kullanici_id=?").bind(uid).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/sohbet/sil" && request.method === "DELETE") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 400);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const yonetici = uyelik.rol === "lider" || uyelik.rol === "yardimci";
        const body = await request.json();
        let silinen = 0;
        if (body.id) {
          const mesaj = await env.DB.prepare("SELECT id,kullanici_adi FROM klan_sohbet WHERE id=? AND klan_id=?").bind(body.id, uyelik.klan_id).first();
          if (!mesaj) return jsonResponse({ hata: "Mesaj bulunamadi" }, 404);
          if (!yonetici && mesaj.kullanici_adi !== k.kullanici_adi) return jsonResponse({ hata: "Baskasinin mesajini silme yetkiniz yok" }, 403);
          const r1 = await env.DB.prepare("DELETE FROM klan_sohbet WHERE id=?").bind(body.id).run();
          silinen = r1.meta ? r1.meta.changes : 0;
        } else if (Array.isArray(body.ids)) {
          for (const mid of body.ids) {
            const mesaj = await env.DB.prepare("SELECT kullanici_adi FROM klan_sohbet WHERE id=? AND klan_id=?").bind(mid, uyelik.klan_id).first();
            if (mesaj && (yonetici || mesaj.kullanici_adi === k.kullanici_adi)) {
              const r1 = await env.DB.prepare("DELETE FROM klan_sohbet WHERE id=?").bind(mid).run();
              silinen += r1.meta ? r1.meta.changes : 0;
            }
          }
        }
        if (!silinen) return jsonResponse({ hata: "Mesaj silinemedi (yetkiniz yok)" }, 403);
        return jsonResponse({ basarili: true, silinen });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/sohbet/temizle" && request.method === "DELETE") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uye degilsiniz" }, 400);
        if (uyelik.rol !== "lider" && uyelik.rol !== "yardimci") return jsonResponse({ hata: "Bu islem icin lider veya yardimci olmalisiniz" }, 403);
        await env.DB.prepare("DELETE FROM klan_sohbet WHERE klan_id=?").bind(uyelik.klan_id).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/sohbet/gonder" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const uyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ hata: "Klana uyesiniz degil" }, 400);
        const { mesaj } = await request.json();
        if (!mesaj || mesaj.trim().length === 0) return jsonResponse({ hata: "Mesaj bos olamaz" }, 400);
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_sohbet (id,klan_id,kullanici_adi,mesaj,zaman) VALUES (?,?,?,?,?)").bind(id, uyelik.klan_id, k.kullanici_adi, mesaj.trim(), Date.now()).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/sohbet" && request.method === "GET") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik) return jsonResponse({ mesajlar: [] });
        const { results } = await env.DB.prepare("SELECT id,kullanici_adi,mesaj,zaman FROM klan_sohbet WHERE klan_id=? ORDER BY zaman DESC LIMIT 50").bind(uyelik.klan_id).all();
        return jsonResponse({ mesajlar: (results || []).reverse() });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/klan/uyeat" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const uyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(uid).first();
        if (!uyelik || uyelik.rol !== "lider" && uyelik.rol !== "yardimci") return jsonResponse({ hata: "Yetkiniz yok" }, 403);
        const { hedef_kullanici_adi } = await request.json();
        const hedef = await env.DB.prepare("SELECT id FROM kullanicilar WHERE kullanici_adi=?").bind(hedef_kullanici_adi).first();
        if (!hedef) return jsonResponse({ hata: "Kullanici bulunamadi" }, 404);
        const hedefUyelik = await env.DB.prepare("SELECT klan_id,rol FROM klan_uyeler WHERE kullanici_id=?").bind(hedef.id).first();
        if (!hedefUyelik || hedefUyelik.klan_id !== uyelik.klan_id) return jsonResponse({ hata: "Bu kullanici klaninizda degil" }, 400);
        if (hedefUyelik.rol === "lider") return jsonResponse({ hata: "Lideri atamazsiniz" }, 400);
        await env.DB.prepare("DELETE FROM klan_uyeler WHERE kullanici_id=?").bind(hedef.id).run();
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const logId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(logId, uyelik.klan_id, k.kullanici_adi + " " + hedef_kullanici_adi + " kullanicisini atti", Date.now()).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet" && request.method === "GET") {
      try {
        const { results } = await env.DB.prepare("SELECT id,kullanici_adi,mesaj,zaman FROM global_sohbet ORDER BY zaman ASC LIMIT 50").all();
        return jsonResponse({ mesajlar: results || [] });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet/gonder" && request.method === "POST") {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const { mesaj } = await request.json();
        if (!mesaj || mesaj.trim().length === 0) return jsonResponse({ hata: "Mesaj bos olamaz" }, 400);
        const count = await env.DB.prepare("SELECT COUNT(*) as c FROM global_sohbet").first();
        if (count && count.c >= 50) {
          const en_eski = await env.DB.prepare("SELECT id FROM global_sohbet ORDER BY zaman ASC LIMIT 1").first();
          if (en_eski) await env.DB.prepare("DELETE FROM global_sohbet WHERE id=?").bind(en_eski.id).run();
        }
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO global_sohbet (id,kullanici_adi,mesaj,zaman) VALUES (?,?,?,?)").bind(id, k.kullanici_adi, mesaj.trim(), Date.now()).run();
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    return jsonResponse({ hata: "Endpoint bulunamadi: " + path }, 404);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map