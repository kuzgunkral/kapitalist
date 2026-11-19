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
        if (_mod.mute_until > Date.now()) {
          const dk = Math.ceil((_mod.mute_until - Date.now()) / 60000);
          return jsonResponse({ hata: "Susturuldunuz, " + dk + " dakika sonra tekrar deneyin" }, 403);
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
        const { results } = await env.DB.prepare("SELECT id,kullanici_adi,mesaj,zaman FROM global_sohbet ORDER BY zaman ASC LIMIT 50").all();
        return jsonResponse({ mesajlar: results || [] });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet/sil" && (request.method === "POST" || request.method === "DELETE")) {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        const body = await request.json();
        const adminMi = ADMINLAR.indexOf(k.kullanici_adi) >= 0;
        if (body.id) {
          if (adminMi) {
            await env.DB.prepare("DELETE FROM global_sohbet WHERE id=?").bind(body.id).run();
          } else {
            await env.DB.prepare("DELETE FROM global_sohbet WHERE id=? AND kullanici_adi=?").bind(body.id, k.kullanici_adi).run();
          }
        } else if (body.zaman) {
          await env.DB.prepare("DELETE FROM global_sohbet WHERE kullanici_adi=? AND zaman=?").bind(k.kullanici_adi, body.zaman).run();
        }
        return jsonResponse({ basarili: true });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
      }
    }
    if (path === "/sohbet/temizle" && (request.method === "POST" || request.method === "DELETE")) {
      try {
        const token = tokenFromRequest(request);
        const uid = await tokenDogrula(env, token);
        if (!uid) return jsonResponse({ hata: "Giris yapmaniz gerekiyor" }, 401);
        const k = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(uid).first();
        if (ADMINLAR.indexOf(k.kullanici_adi) < 0) return jsonResponse({ hata: "Yetkiniz yok" }, 403);
        await env.DB.prepare("DELETE FROM global_sohbet").run();
        return jsonResponse({ basarili: true });
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
          const until = Date.now() + (Number(sure_dk) || 60) * 60 * 1000;
          await env.DB.prepare("UPDATE moderasyon SET mute_until=? WHERE kullanici_adi=?").bind(until, hedef).run();
          mesaj = hedef + " " + (Number(sure_dk) || 60) + " dakika susturuldu";
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
        return jsonResponse({ basarili: true, mesaj });
      } catch (e) {
        return jsonResponse({ hata: e.message }, 500);
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
        if (!uyelik) return jsonResponse({ klan: null });
        const klan = await env.DB.prepare("SELECT * FROM klanlar WHERE id=?").bind(uyelik.klan_id).first();
        if (!klan) return jsonResponse({ klan: null });
        const lider = await env.DB.prepare("SELECT kullanici_adi FROM kullanicilar WHERE id=?").bind(klan.lider_id).first();
        const { results: uyeler } = await env.DB.prepare("SELECT k.kullanici_adi, ku.rol FROM klan_uyeler ku JOIN kullanicilar k ON k.id=ku.kullanici_id WHERE ku.klan_id=?").bind(uyelik.klan_id).all();
        const { results: log } = await env.DB.prepare("SELECT mesaj,zaman FROM klan_log WHERE klan_id=? ORDER BY zaman DESC LIMIT 20").bind(uyelik.klan_id).all();
        return jsonResponse({ klan: { ...klan, lider: lider ? lider.kullanici_adi : "?", uyeler: uyeler || [], log: log || [], benim_rolum: uyelik.rol } });
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
        const { klan_id } = await request.json();
        const klan = await env.DB.prepare("SELECT id FROM klanlar WHERE id=?").bind(klan_id).first();
        if (!klan) return jsonResponse({ hata: "Klan bulunamadi" }, 404);
        const now = Date.now();
        await env.DB.prepare("INSERT INTO klan_uyeler (kullanici_id,klan_id,rol,katildi) VALUES (?,?,?,?)").bind(uid, klan_id, "uye", now).run();
        const logId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO klan_log (id,klan_id,mesaj,zaman) VALUES (?,?,?,?)").bind(logId, klan_id, k.kullanici_adi + " klana katildi", now).run();
        return jsonResponse({ basarili: true });
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
        const { results } = await env.DB.prepare("SELECT kullanici_adi,mesaj,zaman FROM klan_sohbet WHERE klan_id=? ORDER BY zaman ASC LIMIT 50").bind(uyelik.klan_id).all();
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
        const { results } = await env.DB.prepare("SELECT kullanici_adi,mesaj,zaman FROM klan_sohbet WHERE klan_id=? ORDER BY zaman DESC LIMIT 50").bind(uyelik.klan_id).all();
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