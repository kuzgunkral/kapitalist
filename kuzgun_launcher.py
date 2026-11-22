import sys, os, json, base64, shutil, subprocess, urllib.request
from datetime import datetime
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, QVBoxLayout, QPushButton, QLabel, QFrame, QTabWidget, QLineEdit, QCheckBox, QMessageBox, QStackedWidget, QSplitter, QTextEdit, QDialog, QTableWidget, QTableWidgetItem, QComboBox, QHeaderView, QAbstractItemView)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineSettings
from PyQt6.QtCore import QUrl, Qt, pyqtSignal, QDateTime
from PyQt6.QtGui import QFont, QColor

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CF_API = 'https://kapitalist-api.gitbaskabul.workers.dev'
OTURUM_FILE = os.path.join(SCRIPT_DIR, '.oturum.json')
URLS = {'oyun':'https://kuzgunkral.github.io/kapitalist/','gmail':'https://mail.google.com/mail/u/0/#inbox','cloudflare':'https://dash.cloudflare.com','github':'https://github.com/kuzgunkral/kapitalist','worker':'https://kapitalist-api.gitbaskabul.workers.dev'}

def panel_admin_ol(token):
    """Panel girisi yapan kullaniciyi admin yapar (moderasyon tablosunda admin=1)."""
    if not token: return
    try:
        req = urllib.request.Request(CF_API+'/panel/admin-ol', data=b'{}',
            headers={'Content-Type':'application/json','Authorization':'Bearer '+token}, method='POST')
        with urllib.request.urlopen(req, timeout=10) as r:
            json.loads(r.read())
    except Exception:
        pass

BASLIKLAR = {'oyun':'Oyun','gmail':'Gmail','cloudflare':'Cloudflare','github':'GitHub','worker':'Worker API'}

TAB_CSS = """
QTabWidget::pane{border:none;background:#07111f;}
QTabBar{background:#0a1628;border-bottom:2px solid #1a3050;}
QTabBar::tab{background:#0a1628;color:#4a6a8a;padding:10px 22px;border:none;border-right:1px solid #1a3050;font-size:13px;font-weight:600;min-width:90px;}
QTabBar::tab:selected{background:#07111f;color:#10b981;border-bottom:3px solid #10b981;font-weight:800;font-size:13px;}
QTabBar::tab:hover{background:#0d1f35;color:#c8e0f0;}
QTabBar::close-button{subcontrol-position:right;width:20px;height:20px;border-radius:4px;background:rgba(255,255,255,0.15);margin:3px 4px;border:1px solid rgba(255,255,255,0.2);image:none;}
QTabBar::close-button:hover{background:#ef4444;border:1px solid #ef4444;}
QTabBar::close-button:pressed{background:#b91c1c;}
"""

SB_CSS = """
QWidget#sb{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #0d1f38,stop:1 #060f1a);border-right:2px solid #1a3050;}
QPushButton#nb{background:transparent;color:#4a6a8a;border:none;border-left:3px solid transparent;text-align:left;padding:13px 20px;font-size:13px;font-weight:600;}
QPushButton#nb:hover{background:rgba(16,185,129,0.1);color:#c8e0f0;border-left:3px solid rgba(16,185,129,0.5);}
QPushButton#nb:checked{background:rgba(16,185,129,0.15);color:#10b981;border-left:3px solid #10b981;font-weight:800;}
QPushButton#yb{background:qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 #7c3aed,stop:1 #5b21b6);color:white;border:none;border-radius:10px;padding:12px;font-size:12px;font-weight:700;margin:10px 14px 4px;text-align:center;}
QPushButton#yb:hover{background:qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 #8b5cf6,stop:1 #7c3aed);}
QPushButton#cb{background:rgba(220,38,38,0.08);color:#dc2626;border:1px solid #3a1a1a;border-radius:6px;text-align:left;padding:11px 20px;font-size:13px;font-weight:700;margin:2px 10px 10px;}
QPushButton#cb:hover{background:rgba(220,38,38,0.18);color:#ef4444;border:1px solid #ef4444;}
QPushButton#kb{background:rgba(16,185,129,0.06);color:#4a9a7a;border:1px solid #1a3a50;border-radius:10px;text-align:center;padding:12px 20px;font-size:12px;font-weight:700;margin:4px 14px 0px;}
QPushButton#kb:hover{background:rgba(16,185,129,0.14);color:#10b981;border:1px solid #10b981;}
QLabel#lg{color:#10b981;font-size:18px;font-weight:800;padding:22px 20px 2px;letter-spacing:2px;}
QLabel#ls{color:#2d4a6a;font-size:10px;padding:0 20px 18px;letter-spacing:0.5px;}
QLabel#st{color:#1e3a5a;font-size:10px;padding:6px 14px;}
QFrame#div{background:#1a3050;max-height:1px;margin:6px 14px;}
"""

LOGIN_CSS = 'QWidget{background:#07111f;} QWidget#card{background:#0a1628;border:1px solid #1e3a5f;border-radius:16px;} QLabel#t{color:#10b981;font-size:22px;font-weight:800;} QLabel#s{color:#6080a0;font-size:12px;} QLabel#l{color:#6080a0;font-size:11px;font-weight:700;} QLineEdit{background:#07111f;border:1px solid #1e3a5f;border-radius:8px;color:#d8e8f8;padding:10px 12px;font-size:14px;} QLineEdit:focus{border:1px solid #10b981;} QPushButton#gb{background:#10b981;color:white;border:none;border-radius:8px;padding:12px;font-size:15px;font-weight:700;} QPushButton#gb:hover{background:#059669;} QLabel#err{color:#ef4444;font-size:12px;} QCheckBox{color:#6080a0;font-size:12px;}'

class LoginWidget(QWidget):
    login_ok = pyqtSignal()
    def __init__(self):
        super().__init__()
        self.setStyleSheet(LOGIN_CSS)
        lay = QVBoxLayout(self)
        lay.setAlignment(Qt.AlignmentFlag.AlignCenter)
        card = QWidget(objectName='card')
        card.setFixedWidth(400)
        cl = QVBoxLayout(card)
        cl.setContentsMargins(36,40,36,40)
        cl.setSpacing(0)
        bird = QLabel('🦅', alignment=Qt.AlignmentFlag.AlignCenter)
        bird.setFont(QFont('Segoe UI',36))
        cl.addWidget(bird)
        cl.addWidget(QLabel('Kapitalist Launcher',objectName='t',alignment=Qt.AlignmentFlag.AlignCenter))
        cl.addWidget(QLabel('Ticaret Oyunu Yonetim Paneli',objectName='s',alignment=Qt.AlignmentFlag.AlignCenter))
        cl.addSpacing(24)
        self.inp_u = QLineEdit(placeholderText='Kullanici Adi')
        self.inp_p = QLineEdit(placeholderText='Sifre')
        self.inp_p.setEchoMode(QLineEdit.EchoMode.Password)
        for lbl,inp in [('KULLANICI ADI',self.inp_u),('SIFRE',self.inp_p)]:
            cl.addWidget(QLabel(lbl,objectName='l'))
            inp.returnPressed.connect(self.giris)
            cl.addWidget(inp)
            cl.addSpacing(8)
        self.chk = QCheckBox('Beni hatirla')
        self.chk.setChecked(True)
        cl.addWidget(self.chk)
        cl.addSpacing(8)
        self.err = QLabel('',objectName='err')
        self.err.hide()
        cl.addWidget(self.err)
        btn = QPushButton('Giris Yap',objectName='gb')
        btn.clicked.connect(self.giris)
        cl.addWidget(btn)
        lay.addWidget(card)
        self._yukle()

    def _yukle(self):
        try:
            if os.path.exists(OTURUM_FILE):
                d = json.load(open(OTURUM_FILE))
                if d.get('u'): self.inp_u.setText(d['u'])
                if d.get('p_enc'):
                    p = base64.b64decode(d['p_enc'].encode()).decode()
                    self.inp_p.setText(p)
                    from PyQt6.QtCore import QTimer
                    QTimer.singleShot(500, self.giris)
                elif d.get('u'):
                    self.inp_p.setFocus()
        except: pass

    def giris(self):
        u,p = self.inp_u.text().strip(),self.inp_p.text()
        if not u or not p:
            self.err.setText('Kullanici adi ve sifre girin!'); self.err.show(); return
        try:
            import urllib.request as ur
            CF_API = 'https://kapitalist-api.gitbaskabul.workers.dev'
            payload = json.dumps({'kullanici_adi':u,'sifre':p}).encode()
            req = ur.Request(CF_API+'/giris',data=payload,headers={'Content-Type':'application/json'},method='POST')
            with ur.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            if not data.get('token'):
                self.err.setText(data.get('hata','Giris basarisiz!')); self.err.show(); return
            self.access_token = data['token']
            self.refresh_token = ''
        except Exception as ex:
            self.err.setText('Giris hatasi: '+str(ex)[:60]); self.err.show(); return
        if self.chk.isChecked():
            try: json.dump({'u':u,'p_enc':base64.b64encode(p.encode()).decode()},open(OTURUM_FILE,'w'))
            except: pass
        self.err.hide()
        self.login_ok.emit()

class KonsolWidget(QTextEdit):
    def __init__(self):
        super().__init__()
        self.setReadOnly(True)
        self.setStyleSheet('background:#060f1a;color:#10b981;border:1px solid #1a3050;border-radius:6px;font-family:Consolas;font-size:10px;padding:4px;margin:2px 10px 4px;')
        self.setPlaceholderText('> Konsol...')
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self._menu)

    def _menu(self, pos):
        from PyQt6.QtWidgets import QMenu, QApplication
        m = QMenu(self)
        m.setStyleSheet('QMenu{background:#0a1628;color:#d8e8f8;border:1px solid #1e3a5f;} QMenu::item:selected{background:#1e3a5f;}')
        kopyala = m.addAction('📋  Kopyala')
        kopyala.triggered.connect(self.copy)
        kopyala.setEnabled(self.textCursor().hasSelection())
        tumu = m.addAction('📄  Konsolu Kopyala')
        tumu.triggered.connect(lambda: QApplication.clipboard().setText(self.toPlainText()))
        m.addSeparator()
        m.addAction('🗑️  Konsolu Temizle', self.clear)
        m.exec(self.mapToGlobal(pos))

ADMIN_CSS = """
QDialog{background:#07111f;}
QLabel#pt{color:#10b981;font-size:16px;font-weight:800;padding:2px;}
QLabel#ps{color:#6080a0;font-size:11px;}
QLineEdit{background:#060f1a;border:1px solid #1e3a5f;border-radius:6px;color:#d8e8f8;padding:7px 9px;font-size:12px;}
QLineEdit:focus{border:1px solid #10b981;}
QPushButton#ab{background:rgba(16,185,129,0.1);color:#10b981;border:1px solid #1a3a50;border-radius:6px;padding:8px 10px;font-size:11px;font-weight:700;}
QPushButton#ab:hover{background:rgba(16,185,129,0.2);border-color:#10b981;}
QPushButton#arb{background:rgba(220,38,38,0.1);color:#ef4444;border:1px solid #3a1a1a;border-radius:6px;padding:8px 10px;font-size:11px;font-weight:700;}
QPushButton#arb:hover{background:rgba(220,38,38,0.25);border-color:#ef4444;}
QPushButton#ayb{background:qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 #7c3aed,stop:1 #5b21b6);color:white;border:none;border-radius:6px;padding:8px 14px;font-size:11px;font-weight:700;}
QTableWidget{background:#060f1a;color:#d8e8f8;border:1px solid #1e3a5f;border-radius:6px;gridline-color:#12233a;font-size:11px;}
QHeaderView::section{background:#0a1628;color:#4a6a8a;border:none;border-bottom:1px solid #1e3a5f;padding:5px;font-size:10px;font-weight:700;}
QComboBox{background:#060f1a;border:1px solid #1e3a5f;border-radius:6px;color:#d8e8f8;padding:6px 9px;font-size:11px;}
QComboBox QAbstractItemView{background:#0a1628;color:#d8e8f8;selection-background-color:#1e3a5f;}
"""

def admin_istek(token, yol, govde=None):
    """Admin API cagrisi. (ok, data) doner."""
    import urllib.request as ur, urllib.error as ue
    h = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token or '')}
    veri = json.dumps(govde).encode() if govde is not None else None
    req = ur.Request(CF_API + yol, data=veri, headers=h, method='POST' if govde is not None else 'GET')
    try:
        with ur.urlopen(req, timeout=15) as r:
            return True, json.loads(r.read())
    except ue.HTTPError as e:
        try: return False, json.loads(e.read())
        except Exception: return False, {'hata': 'HTTP %d' % e.code}
    except Exception as ex:
        return False, {'hata': str(ex)[:80]}

def _ts(ms):
    try: return QDateTime.fromMSecsSinceEpoch(int(ms)).toString('dd.MM HH:mm')
    except Exception: return str(ms)

class AdminPanel(QDialog):
    """Admin mudahale paneli: anomali loglari + hesap mudahale aksiyonlari."""
    def __init__(self, token, log_cb=None, parent=None):
        super().__init__(parent)
        self.token = token
        self.log_cb = log_cb or (lambda m: None)
        self.setWindowTitle('🛡️ Admin Paneli')
        self.resize(880, 660)
        self.setStyleSheet(ADMIN_CSS)
        root = QVBoxLayout(self)
        root.setContentsMargins(14, 12, 14, 12)
        root.setSpacing(8)
        root.addWidget(QLabel('🛡️ Admin Müdahale Paneli', objectName='pt'))
        root.addWidget(QLabel('Şüpheli hareketler (anomali log) ve hesap müdahale araçları. Log satırına çift tıklayınca oyuncu adı dolar.', objectName='ps'))
        self.tablo = QTableWidget(0, 4)
        self.tablo.setHorizontalHeaderLabels(['Zaman', 'Oyuncu', 'Tür', 'Detay'])
        self.tablo.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.Stretch)
        self.tablo.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.tablo.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.tablo.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.tablo.verticalHeader().setVisible(False)
        self.tablo.setFixedHeight(250)
        self.tablo.doubleClicked.connect(self._satir_sec)
        root.addWidget(self.tablo)
        ust = QHBoxLayout()
        by = QPushButton('🔄 Logları Yenile', objectName='ayb')
        by.clicked.connect(self.loglari_yukle)
        ust.addWidget(by)
        ust.addStretch()
        root.addLayout(ust)
        root.addWidget(QLabel('— Hesap Müdahalesi —', objectName='pt'))
        self._ui_ekle(root)
        self.durum = QLabel('', objectName='ps')
        root.addWidget(self.durum)
        self.loglari_yukle()

    def _ui_ekle(self, root):
        sat1 = QHBoxLayout()
        sat1.addWidget(QLabel('Oyuncu:', objectName='ps'))
        self.inp_kadi = QLineEdit(placeholderText='kullanıcı adı')
        self.inp_kadi.setFixedWidth(160)
        sat1.addWidget(self.inp_kadi)
        b1 = QPushButton('❄️ Dondur', objectName='arb'); b1.clicked.connect(lambda: self.aksiyon('dondur'))
        b2 = QPushButton('▶️ Serbest Bırak', objectName='ab'); b2.clicked.connect(lambda: self.aksiyon('serbest'))
        b3 = QPushButton('♻️ Sıfırla', objectName='arb'); b3.clicked.connect(lambda: self.aksiyon('sifirla'))
        b4 = QPushButton('🗑️ Hesabı Sil', objectName='arb'); b4.clicked.connect(lambda: self.aksiyon('kullanici_sil'))
        for b in (b1, b2, b3, b4): sat1.addWidget(b)
        sat1.addStretch()
        root.addLayout(sat1)
        sat2 = QHBoxLayout()
        sat2.addWidget(QLabel('Klan:', objectName='ps'))
        self.inp_klan = QLineEdit(placeholderText='klan adı')
        self.inp_klan.setFixedWidth(160)
        sat2.addWidget(self.inp_klan)
        b5 = QPushButton('🏳️ Klanı Sil', objectName='arb'); b5.clicked.connect(self.klan_sil)
        sat2.addWidget(b5)
        sat2.addStretch()
        root.addLayout(sat2)
        sat3 = QHBoxLayout()
        sat3.addWidget(QLabel('Kayıt Geçmişi:', objectName='ps'))
        self.cmb_gecmis = QComboBox()
        self.cmb_gecmis.setMinimumWidth(340)
        sat3.addWidget(self.cmb_gecmis)
        b6 = QPushButton('📜 Geçmişi Getir', objectName='ab'); b6.clicked.connect(self.gecmis_getir)
        b7 = QPushButton('⏪ Bu Kayda Geri Al', objectName='ayb'); b7.clicked.connect(self.geri_al)
        sat3.addWidget(b6); sat3.addWidget(b7)
        sat3.addStretch()
        root.addLayout(sat3)
        sat4 = QHBoxLayout()
        sat4.addWidget(QLabel('Editle → Para:', objectName='ps'))
        self.inp_money = QLineEdit(placeholderText='boş = dokunma')
        self.inp_money.setFixedWidth(140)
        sat4.addWidget(self.inp_money)
        sat4.addWidget(QLabel('Elmas:', objectName='ps'))
        self.inp_elmas = QLineEdit(placeholderText='boş = dokunma')
        self.inp_elmas.setFixedWidth(110)
        sat4.addWidget(self.inp_elmas)
        sat4.addWidget(QLabel('Gün:', objectName='ps'))
        self.inp_day = QLineEdit(placeholderText='boş = dokunma')
        self.inp_day.setFixedWidth(70)
        sat4.addWidget(self.inp_day)
        b8 = QPushButton('💾 Kaydet', objectName='ayb'); b8.clicked.connect(self.edit_kaydet)
        sat4.addWidget(b8)
        sat4.addStretch()
        root.addLayout(sat4)

    def _satir_sec(self, index):
        kadi = self.tablo.item(index.row(), 1)
        if kadi: self.inp_kadi.setText(kadi.text())

    def _durum(self, m):
        self.durum.setText(m)
        self.log_cb(m)

    def loglari_yukle(self):
        ok, d = admin_istek(self.token, '/admin/anomaliler?limit=150')
        if not ok:
            self._durum('⛔ ' + d.get('hata', 'Loglar alınamadı')); return
        rows = d.get('anomaliler', [])
        self.tablo.setRowCount(len(rows))
        renk = QColor('#ef4444')
        for i, r in enumerate(rows):
            tur = str(r.get('tur', ''))
            madde = [QTableWidgetItem(_ts(r.get('zaman', 0))), QTableWidgetItem(str(r.get('kadi', ''))),
                     QTableWidgetItem(tur), QTableWidgetItem(str(r.get('detay', '')))]
            if tur in ('para_sicramasi', 'elmas_sicramasi', 'limit_asimi', 'gecersiz_deger', 'gun_geri_gitti'):
                madde[2].setForeground(renk)
            for j, it in enumerate(madde): self.tablo.setItem(i, j, it)
        self._durum('✅ %d anomali kaydı yüklendi' % len(rows))

    def aksiyon(self, ad):
        kadi = self.inp_kadi.text().strip()
        if not kadi: self._durum('⚠️ Önce oyuncu adı girin'); return
        soru = {'dondur': 'dondurulsun', 'serbest': 'serbest bırakılsın', 'sifirla': 'oyun kaydı SIFIRLANSIN', 'kullanici_sil': 'TAMAMEN SİLİNSİN'}.get(ad, ad)
        if QMessageBox.question(self, 'Onay', '%s → %s mi?' % (kadi, soru)) != QMessageBox.StandardButton.Yes: return
        ok, d = admin_istek(self.token, '/admin/aksiyon', {'aksiyon': ad, 'kadi': kadi})
        self._durum(('✅ ' + d.get('mesaj', '')) if ok else ('⛔ ' + d.get('hata', 'İşlem başarısız')))
        self.loglari_yukle()

    def klan_sil(self):
        kl = self.inp_klan.text().strip()
        if not kl: self._durum('⚠️ Klan adı girin'); return
        if QMessageBox.question(self, 'Onay', 'Klan "%s" ve tüm üyelikleri silinsin mi?' % kl) != QMessageBox.StandardButton.Yes: return
        ok, d = admin_istek(self.token, '/admin/aksiyon', {'aksiyon': 'klan_sil', 'klan': kl})
        self._durum(('✅ ' + d.get('mesaj', '')) if ok else ('⛔ ' + d.get('hata', 'İşlem başarısız')))

    def gecmis_getir(self):
        kadi = self.inp_kadi.text().strip()
        if not kadi: self._durum('⚠️ Önce oyuncu adı girin'); return
        ok, d = admin_istek(self.token, '/admin/gecmis?kadi=' + kadi)
        if not ok: self._durum('⛔ ' + d.get('hata', 'Geçmiş alınamadı')); return
        self.cmb_gecmis.clear()
        for r in d.get('gecmis', []):
            etiket = '%s | para=%s elmas=%s gün=%s' % (_ts(r.get('zaman', 0)), r.get('money'), r.get('elmas'), r.get('day'))
            self.cmb_gecmis.addItem(etiket, r.get('id'))
        self._durum('✅ %d kayıt bulundu — listeden seçip "Geri Al"e bas' % self.cmb_gecmis.count())

    def geri_al(self):
        kadi = self.inp_kadi.text().strip()
        gid = self.cmb_gecmis.currentData()
        if not gid: self._durum('⚠️ Önce geçmişi getirin ve kayıt seçin'); return
        if QMessageBox.question(self, 'Onay', '%s oyuncusu seçilen kayda geri alınsın mı?' % kadi) != QMessageBox.StandardButton.Yes: return
        ok, d = admin_istek(self.token, '/admin/aksiyon', {'aksiyon': 'geri_al', 'kadi': kadi, 'gecmisId': gid})
        self._durum(('✅ ' + d.get('mesaj', '')) if ok else ('⛔ ' + d.get('hata', 'İşlem başarısız')))

    def edit_kaydet(self):
        kadi = self.inp_kadi.text().strip()
        if not kadi: self._durum('⚠️ Önce oyuncu adı girin'); return
        govde = {'aksiyon': 'edit', 'kadi': kadi}
        try:
            if self.inp_money.text().strip(): govde['money'] = float(self.inp_money.text().strip())
            if self.inp_elmas.text().strip(): govde['elmas'] = float(self.inp_elmas.text().strip())
            if self.inp_day.text().strip(): govde['day'] = float(self.inp_day.text().strip())
        except ValueError:
            self._durum('⚠️ Sayısal değer girin'); return
        ok, d = admin_istek(self.token, '/admin/aksiyon', govde)
        self._durum(('✅ ' + d.get('mesaj', '')) if ok else ('⛔ ' + d.get('hata', 'İşlem başarısız')))

class MainWidget(QWidget):
    def __init__(self, profile=None):
        super().__init__()
        self.cikis_cb = None
        self._profile = None
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0,0,0,0)
        lay.setSpacing(0)
        sb = QWidget(objectName='sb')
        sb.setFixedWidth(220)
        sb.setStyleSheet(SB_CSS)
        sl = QVBoxLayout(sb)
        sl.setContentsMargins(0,0,0,0)
        sl.setSpacing(0)
        sl.addWidget(QLabel('Kapitalist',objectName='lg'))
        sl.addWidget(QLabel('Ticaret Oyunu Paneli',objectName='ls'))
        self.nav = {}
        for id,txt in [('oyun','🎮 Oyun'),('gmail','📧 Gmail'),('cloudflare','☁️ Cloudflare'),('github','🐱 GitHub'),('worker','⚡ Worker API')]:
            btn = QPushButton(txt,objectName='nb')
            btn.setCheckable(True)
            btn.clicked.connect(lambda c,i=id: self.git(i))
            sl.addWidget(btn)
            self.nav[id] = btn
        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.HLine)
        sep.setStyleSheet('background:#1e3a5f;max-height:1px;margin:4px 16px;')
        sl.addWidget(sep)
        yb = QPushButton('💾  Yedek Al',objectName='kb')
        yb.clicked.connect(self.yedek)
        sl.addWidget(yb)
        pub = QPushButton('🚀  Yedek Yükle',objectName='kb')
        pub.clicked.connect(self.yedek_yukle)
        sl.addWidget(pub)
        reb = QPushButton('🔄  Yenile',objectName='yb')
        reb.clicked.connect(self.yenile)
        sl.addWidget(reb)
        adb = QPushButton('🛡️  Admin',objectName='yb')
        adb.clicked.connect(self.admin_panel)
        sl.addWidget(adb)

        # Hile input - Yenile'nin hemen altinda
        self.hile_inp = QLineEdit()
        self.hile_inp.setPlaceholderText('> Hile kodu gir...')
        self.hile_inp.setStyleSheet('background:#060f1a;color:#10b981;border:1px solid #1a3050;border-radius:6px;font-family:Consolas;font-size:11px;padding:6px 8px;margin:4px 10px 2px;')
        self.hile_inp.returnPressed.connect(self.hile_calistir)
        sl.addWidget(self.hile_inp)
        # Konsol log - kalan alani doldurur
        self.konsol = KonsolWidget()
        sl.addWidget(self.konsol, 1)
        cb = QPushButton('🚪  Çıkış',objectName='cb')
        cb.clicked.connect(lambda:QApplication.quit())
        sl.addWidget(cb)
        self.st = QLabel('Hazir',objectName='st')
        sl.addWidget(self.st)
        lay.addWidget(sb)
        # Sag taraf - geri/ileri + tabs
        sag = QWidget()
        sag_lay = QVBoxLayout(sag)
        sag_lay.setContentsMargins(0,0,0,0)
        sag_lay.setSpacing(0)
        # Geri/ileri butonlari
        nav_bar = QWidget()
        nav_bar.setStyleSheet('background:#0a1628;border-bottom:1px solid #1e3a5f;')
        nav_bl = QHBoxLayout(nav_bar)
        nav_bl.setContentsMargins(6,3,6,3)
        nav_bl.setSpacing(4)
        self.btn_geri = QPushButton('◀')
        self.btn_geri.setFixedSize(28,24)
        self.btn_geri.setStyleSheet('QPushButton{background:#0d1f35;color:#6080a0;border:1px solid #1e3a5f;border-radius:5px;font-size:12px;} QPushButton:hover{color:#d8e8f8;background:#1e3a5f;}')
        self.btn_geri.clicked.connect(self.geri)
        self.btn_ileri = QPushButton('▶')
        self.btn_ileri.setFixedSize(28,24)
        self.btn_ileri.setStyleSheet('QPushButton{background:#0d1f35;color:#6080a0;border:1px solid #1e3a5f;border-radius:5px;font-size:12px;} QPushButton:hover{color:#d8e8f8;background:#1e3a5f;}')
        self.btn_ileri.clicked.connect(self.ileri)
        nav_bl.addWidget(self.btn_geri)
        nav_bl.addWidget(self.btn_ileri)
        nav_bl.addStretch()
        sag_lay.addWidget(nav_bar)
        self.tabs = QTabWidget()
        self.tabs.setTabsClosable(True)
        self.tabs.tabCloseRequested.connect(self.kapat)
        self.tabs.setStyleSheet(TAB_CSS)
        sag_lay.addWidget(self.tabs)
        lay.addWidget(sag)
        self.smap = {}

    def git(self,id):
        [b.setChecked(k==id) for k,b in self.nav.items()]
        if id in self.smap:
            self.tabs.setCurrentIndex(self.tabs.indexOf(self.smap[id])); return
        from PyQt6.QtWebEngineCore import QWebEnginePage
        v = QWebEngineView()
        if self._profile:
            page = QWebEnginePage(self._profile, v)
            v.setPage(page)
        v.settings().setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled,True)
        v.settings().setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled,True)
        v.settings().setAttribute(QWebEngineSettings.WebAttribute.AutoLoadImages,True)
        if id == 'oyun':
            cf_token = getattr(self,'pending_cf_token','')
            cf_user = getattr(self,'pending_cf_user','')
            if cf_token and cf_user:
                panel_admin_ol(cf_token)
                js = "localStorage.setItem('cf_token','%s');localStorage.setItem('cf_kullanici','%s');" % (cf_token, cf_user)
                v.load(QUrl(URLS[id]))
                v.loadFinished.connect(lambda ok, _v=v, _js=js: _v.page().runJavaScript(_js + " location.reload();") if ok else None)
            else:
                v.load(QUrl(URLS[id]))
        else:
            v.load(QUrl(URLS[id]))
        self.smap[id]=v
        self.tabs.setCurrentIndex(self.tabs.addTab(v,BASLIKLAR.get(id,id)))
        self.st.setText('Yukleniyor: '+BASLIKLAR.get(id,id))


    def yedek_yukle(self):
        from PyQt6.QtWidgets import QFileDialog
        fname, _ = QFileDialog.getOpenFileName(self, 'Yüklenecek Yedeği Seç', SCRIPT_DIR, 'HTML Dosyaları (*.html)')
        if not fname: return
        try:
            import shutil
            shutil.copy(fname, os.path.join(SCRIPT_DIR, 'index.html'))
            subprocess.run(['git','add','index.html'], cwd=SCRIPT_DIR, capture_output=True)
            r = subprocess.run(['git','commit','-m','yedek yukle: '+os.path.basename(fname)], cwd=SCRIPT_DIR, capture_output=True)
            if r.returncode == 0:
                subprocess.run(['git','push','origin','main'], cwd=SCRIPT_DIR, capture_output=True)
                QMessageBox.information(self, 'Basarili', 'Yedek GitHub Pages a yuklendi!')
            else:
                self.st.setText('● Commit basarisiz!')
                QMessageBox.warning(self, 'Hata', 'Commit başarısız - değişiklik yok olabilir.')
        except Exception as ex:
            QMessageBox.critical(self, 'Hata', str(ex))

    def kapat(self,idx):
        w=self.tabs.widget(idx)
        for k,v in list(self.smap.items()):
            if v==w:
                del self.smap[k]
                if k in self.nav: self.nav[k].setChecked(False)
                break
        self.tabs.removeTab(idx)

    def yedek(self):
        from PyQt6.QtWidgets import QFileDialog
        t = datetime.now().strftime('%Y%m%d_%H%M%S')
        src = os.path.join(SCRIPT_DIR, 'index.html')
        if not os.path.exists(src):
            QMessageBox.warning(self, 'Hata', 'index.html bulunamadi!'); return
        default_name = os.path.join(SCRIPT_DIR, 'YEDEK_'+t+'.html')
        fname, _ = QFileDialog.getSaveFileName(self, 'Yedegi Nereye Kaydedelim?', default_name, 'HTML (*.html)')
        if not fname: return
        try:
            shutil.copy(src, fname)
            self.st.setText('Yedek alindi!')
            QMessageBox.information(self, 'Yedek', 'Yedek alindi:\n'+os.path.basename(fname))
        except Exception as ex:
            QMessageBox.critical(self, 'Hata', str(ex))

    def geri(self):
        idx = self.tabs.currentIndex()
        if idx >= 0:
            v = self.tabs.widget(idx)
            if hasattr(v, 'page') and v.page().action(v.page().WebAction.Back).isEnabled():
                v.page().triggerAction(v.page().WebAction.Back)

    def ileri(self):
        idx = self.tabs.currentIndex()
        if idx >= 0:
            v = self.tabs.widget(idx)
            if hasattr(v, 'page') and v.page().action(v.page().WebAction.Forward).isEnabled():
                v.page().triggerAction(v.page().WebAction.Forward)

    def yenile(self):
        idx = self.tabs.currentIndex()
        if idx >= 0:
            v = self.tabs.widget(idx)
            if hasattr(v, 'page'):
                from PyQt6.QtWebEngineCore import QWebEnginePage
                v.page().triggerAction(QWebEnginePage.WebAction.ReloadAndBypassCache)

    def admin_panel(self):
        # 1) Launcher otomatik girisinden token var mi?
        token = getattr(self, 'pending_cf_token', '')
        if token:
            self._admin_panel_ac(token); return
        # 2) Oyun sekmesindeki canli oturumdan token al (localStorage)
        v = self.smap.get('oyun')
        if v is not None and hasattr(v, 'page'):
            def _cb(r):
                t = r or ''
                if t:
                    self.pending_cf_token = t
                    self._admin_panel_ac(t)
                else:
                    self._token_yenile_ve_ac()
            v.page().runJavaScript("localStorage.getItem('cf_token')||''", _cb)
            return
        # 3) Beni hatirla bilgisiyle taze giris
        self._token_yenile_ve_ac()

    def _token_yenile_ve_ac(self):
        try:
            d = json.load(open(OTURUM_FILE))
            if not (d.get('p_enc') and d.get('u')):
                QMessageBox.warning(self, 'Admin', 'Oturum bilgisi bulunamadi. Launcher\'i acip oyuna giris yapin.')
                return
            p = base64.b64decode(d['p_enc'].encode()).decode()
            payload = json.dumps({'kullanici_adi': d['u'], 'sifre': p}).encode()
            req = urllib.request.Request(CF_API + '/giris', data=payload, headers={'Content-Type': 'application/json'}, method='POST')
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
            if data.get('token'):
                self.pending_cf_token = data['token']
                self._admin_panel_ac(data['token'])
            else:
                QMessageBox.warning(self, 'Admin', 'Token alinamadi: ' + str(data.get('hata', '')))
        except Exception as ex:
            QMessageBox.warning(self, 'Admin', 'Giris tokeni alinamadi: ' + str(ex)[:80])

    def _admin_panel_ac(self, token):
        self._admin_win = AdminPanel(token, log_cb=self.log, parent=self)
        self._admin_win.show()
        self.log('Admin paneli acildi')

    def log(self, msg):
        if hasattr(self, 'konsol'):
            self.konsol.append('> ' + msg)

    def hile_calistir(self):
        kod = self.hile_inp.text().strip()
        if not kod: return
        # Kisa kodlari donustur
        import re
        m = re.match(r'^e(\d+)$', kod)
        if m: kod = 'G.elmas+=' + m.group(1) + '; typeof renderAll==="function"&&renderAll()'
        m = re.match(r'^p(\d+)$', kod)
        if m: kod = 'G.money+=' + m.group(1) + '; typeof renderAll==="function"&&renderAll()'
        idx = self.tabs.currentIndex()
        if idx >= 0:
            v = self.tabs.widget(idx)
            if hasattr(v, 'page'):
                self.konsol.append('>> ' + kod)
                def _cb(r, k=kod):
                    if r is not None:
                        self.konsol.append('=> ' + str(r))
                    else:
                        self.konsol.append('=> OK')
                v.page().runJavaScript(kod, _cb)
        self.hile_inp.clear()

    def devtools(self):
        idx = self.tabs.currentIndex()
        if idx >= 0:
            v = self.tabs.widget(idx)
            if hasattr(v, 'page'):
                if hasattr(self, '_devwin') and self._devwin.isVisible():
                    self._devwin.close()
                    return
                from PyQt6.QtWebEngineWidgets import QWebEngineView
                dev = QWebEngineView()
                v.page().setDevToolsPage(dev.page())
                dev.setWindowTitle('DevTools - ' + BASLIKLAR.get(list(self.smap.keys())[idx] if self.smap else 'oyun', 'Oyun'))
                dev.resize(1200, 650)
                dev.show()
                self._devwin = dev
                self.log('DevTools acildi')


class KuzgunLauncher(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Kapitalist Launcher')
        self.resize(1440,860)
        self.setStyleSheet('QWidget{background:#07111f;color:#d8e8f8;font-family:Segoe UI;}')
        from PyQt6.QtWebEngineCore import QWebEngineProfile
        # Default profile - persistent cookies ile
        prof = QWebEngineProfile.defaultProfile()
        prof.setPersistentStoragePath(os.path.join(SCRIPT_DIR, '.webdata'))
        prof.setPersistentCookiesPolicy(QWebEngineProfile.PersistentCookiesPolicy.AllowPersistentCookies)
        prof.setHttpCacheType(QWebEngineProfile.HttpCacheType.DiskHttpCache)
        # Google'i gecirmek icin gercek Chrome UA
        prof.setHttpUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
        self.stack=QStackedWidget(); self.setCentralWidget(self.stack)
        self.main=MainWidget(None); self.main.cikis_cb=self.show_login; self.stack.addWidget(self.main)

    def show_main(self):
        self.stack.setCurrentWidget(self.main)
        self.main.git('oyun')

    def _start(self):
        self.stack.setCurrentWidget(self.main)
        # Beni hatirla - otomatik login (Cloudflare)
        try:
            if os.path.exists(OTURUM_FILE):
                d = json.load(open(OTURUM_FILE))
                if d.get('p_enc') and d.get('u'):
                    p = base64.b64decode(d['p_enc'].encode()).decode()
                    u = d['u']
                    payload = json.dumps({'kullanici_adi':u,'sifre':p}).encode()
                    req = urllib.request.Request(
                        'https://kapitalist-api.gitbaskabul.workers.dev/giris',
                        data=payload,
                        headers={'Content-Type':'application/json'},
                        method='POST'
                    )
                    with urllib.request.urlopen(req, timeout=10) as r:
                        data = json.loads(r.read())
                    if data.get('token'):
                        self.main.pending_cf_token = data.get('token','')
                        self.main.pending_cf_user = u
                        panel_admin_ol(data.get('token',''))
        except: pass
        self.main.git('oyun')

    def show_login(self):
        while self.main.tabs.count()>0: self.main.tabs.removeTab(0)
        self.main.smap.clear()
        [b.setChecked(False) for b in self.main.nav.values()]
        self.main.git('oyun')


if __name__=='__main__':
    import socket
    # Tek instance kontrolu
    _sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        _sock.bind(('127.0.0.1', 47392))
    except OSError:
        import tkinter as tk
        from tkinter import messagebox
        r = tk.Tk(); r.withdraw()
        messagebox.showwarning('Kapitalist Launcher', 'Launcher zaten açık!')
        r.destroy()
        sys.exit(0)
    app=QApplication(sys.argv)
    win=KuzgunLauncher()
    win.show()
    win._start()
    sys.exit(app.exec())


