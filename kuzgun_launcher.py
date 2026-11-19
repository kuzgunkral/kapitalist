import sys, os, json, base64, shutil, subprocess, urllib.request
from datetime import datetime
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, QVBoxLayout, QPushButton, QLabel, QFrame, QTabWidget, QLineEdit, QCheckBox, QMessageBox, QStackedWidget, QSplitter, QTextEdit)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineSettings
from PyQt6.QtCore import QUrl, Qt, pyqtSignal
from PyQt6.QtGui import QFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CF_API = 'https://kapitalist-api.gitbaskabul.workers.dev'
OTURUM_FILE = os.path.join(SCRIPT_DIR, '.oturum.json')
URLS = {'oyun':'https://kuzgunkral.github.io/kapitalist/','gmail':'https://mail.google.com/mail/u/0/#inbox','cloudflare':'https://dash.cloudflare.com','github':'https://github.com/kuzgunkral/kapitalist','worker':'https://kapitalist-api.gitbaskabul.workers.dev'}
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


