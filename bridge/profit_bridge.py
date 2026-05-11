"""
TraderLog Bridge — Profit Pro
Interface gráfica: aluno só digita login TraderLog + senha Profit.
Sem editar arquivos. Sem instalar nada além do .exe.
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import queue
import time
import requests
from datetime import date
from collections import defaultdict

try:
    import ctypes
    from ctypes import (
        c_int, c_int32, c_uint, c_double, c_longlong,
        c_wchar_p, Structure, WinDLL, WINFUNCTYPE,
    )
    DLL_AVAILABLE = True
except Exception:
    DLL_AVAILABLE = False

try:
    from config import SUPABASE_URL, SUPABASE_ANON_KEY, TRADERLOG_URL, PROFIT_DLL_PATH
except ImportError:
    SUPABASE_URL      = ""
    SUPABASE_ANON_KEY = ""
    TRADERLOG_URL     = ""
    PROFIT_DLL_PATH   = "ProfitDLL.dll"

# ─── Constantes ──────────────────────────────────────────────────────────────
WIN_TICK    = 0.20
WDO_TICK    = 10.00
DIAS_SEMANA = ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO']
GREEN       = "#10b981"
BG          = "#111111"
BG2         = "#1a1a1a"
FG          = "#e2e2e2"
FG2         = "#888888"
BTN_FG      = "#ffffff"


# ─── DLL Estruturas ──────────────────────────────────────────────────────────
if DLL_AVAILABLE:
    class TAssetID(Structure):
        _fields_ = [("ticker", c_wchar_p), ("bolsa", c_wchar_p), ("feed", c_int)]


# ─── Rastreador de posições ───────────────────────────────────────────────────
positions = defaultdict(lambda: {"qty": 0, "fills": []})
pos_lock  = threading.Lock()


def ativo_from_ticker(ticker):
    t = (ticker or "").upper()
    if "WIN" in t: return "WIN"
    if "WDO" in t or "DOL" in t: return "WDO"
    return None


def dia_semana_br(d):
    return DIAS_SEMANA[(d.weekday() + 1) % 7]


# ─── Autenticação Supabase ────────────────────────────────────────────────────
def login_supabase(email, password):
    try:
        res = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            json={"email": email, "password": password},
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            timeout=10,
        )
        if res.status_code == 200:
            data = res.json()
            return data.get("access_token"), data.get("user", {}).get("email", email)
        return None, None
    except Exception:
        return None, None


def fetch_bridge_config(access_token):
    try:
        res = requests.get(
            f"{TRADERLOG_URL}/api/bridge/config",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if res.status_code == 200:
            return res.json()
        return {}
    except Exception:
        return {}


def send_operacao(access_token, payload):
    try:
        res = requests.post(
            f"{TRADERLOG_URL}/api/operacoes",
            json=payload,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        return res.status_code == 200
    except Exception:
        return False


# ─── Aplicação Tkinter ────────────────────────────────────────────────────────
class BridgeApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("TraderLog Bridge")
        self.root.resizable(False, False)
        self.root.configure(bg=BG)
        self._center(400, 360)

        self.access_token  = None
        self.user_email    = None
        self.profit_config = {}
        self.event_queue   = queue.Queue()
        self.ops_count     = 0
        self.last_op_text  = "—"
        self.dll           = None

        self._show_login()
        self.root.mainloop()

    def _center(self, w, h):
        self.root.update_idletasks()
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        self.root.geometry(f"{w}x{h}+{(sw-w)//2}+{(sh-h)//2}")

    def _clear(self):
        for w in self.root.winfo_children():
            w.destroy()

    def _header(self, parent, subtitle=""):
        tk.Label(parent, text="TraderLog Bridge", font=("Segoe UI", 16, "bold"),
                 bg=BG, fg=GREEN).pack(pady=(24, 2))
        if subtitle:
            tk.Label(parent, text=subtitle, font=("Segoe UI", 10),
                     bg=BG, fg=FG2).pack(pady=(0, 20))

    def _entry(self, parent, label, show=None):
        tk.Label(parent, text=label, font=("Segoe UI", 9),
                 bg=BG, fg=FG2, anchor="w").pack(fill="x", padx=40)
        e = tk.Entry(parent, font=("Segoe UI", 11), bg=BG2, fg=FG,
                     insertbackground=FG, relief="flat",
                     highlightthickness=1, highlightbackground="#333",
                     highlightcolor=GREEN, show=show or "")
        e.pack(fill="x", padx=40, pady=(2, 12), ipady=6)
        return e

    def _btn(self, parent, text, cmd, pady=(20, 0)):
        tk.Button(parent, text=text, command=cmd,
                  font=("Segoe UI", 11, "bold"), bg=GREEN, fg=BTN_FG,
                  activebackground="#0ea572", activeforeground=BTN_FG,
                  relief="flat", cursor="hand2", padx=20, pady=8
                  ).pack(pady=pady)

    def _status_label(self, parent):
        lbl = tk.Label(parent, text="", font=("Segoe UI", 9),
                       bg=BG, fg=FG2)
        lbl.pack(pady=(8, 0))
        return lbl

    # ── Tela 1: Login TraderLog ───────────────────────────────────────────────
    def _show_login(self):
        self._clear()
        self.root.geometry("400x360")
        self._header(self.root, "Entre com sua conta TraderLog")

        self._email_entry = self._entry(self.root, "Email")
        self._pass_entry  = self._entry(self.root, "Senha", show="•")
        self._pass_entry.bind("<Return>", lambda _: self._do_login())

        self._login_status = self._status_label(self.root)
        self._btn(self.root, "Entrar", self._do_login)

    def _do_login(self):
        email = self._email_entry.get().strip()
        pw    = self._pass_entry.get()
        if not email or not pw:
            self._login_status.config(text="Preencha email e senha.", fg="#ef4444")
            return
        self._login_status.config(text="Conectando...", fg=FG2)
        self.root.update()
        threading.Thread(target=self._login_thread, args=(email, pw), daemon=True).start()

    def _login_thread(self, email, password):
        token, user_email = login_supabase(email, password)
        if not token:
            self.root.after(0, lambda: self._login_status.config(
                text="Email ou senha incorretos.", fg="#ef4444"))
            return
        self.access_token = token
        self.user_email   = user_email
        cfg = fetch_bridge_config(token)
        self.profit_config = cfg
        self.root.after(0, self._show_profit_login)

    # ── Tela 2: Login Profit Pro ──────────────────────────────────────────────
    def _show_profit_login(self):
        self._clear()
        self.root.geometry("400x380")
        self._header(self.root, f"Conectado como {self.user_email}")

        self._profit_email_entry = self._entry(self.root, "Email do Profit Pro")
        prefill = self.profit_config.get("profit_email") or ""
        self._profit_email_entry.insert(0, prefill)

        self._profit_pass_entry = self._entry(self.root, "Senha do Profit Pro", show="•")
        self._profit_pass_entry.bind("<Return>", lambda _: self._do_start())

        if not self.profit_config.get("profit_key"):
            tk.Label(self.root,
                     text="⚠  Chave de ativação não configurada.\n"
                          "Acesse /integracoes no TraderLog para cadastrar.",
                     font=("Segoe UI", 9), bg=BG, fg="#f59e0b",
                     justify="center").pack(pady=(0, 8))

        self._profit_status = self._status_label(self.root)
        self._btn(self.root, "Iniciar Bridge", self._do_start)

    def _do_start(self):
        profit_email = self._profit_email_entry.get().strip()
        profit_pass  = self._profit_pass_entry.get()
        profit_key   = self.profit_config.get("profit_key") or ""

        if not profit_email or not profit_pass:
            self._profit_status.config(text="Preencha email e senha do Profit.", fg="#ef4444")
            return
        if not profit_key:
            self._profit_status.config(text="Chave de ativação não configurada.", fg="#ef4444")
            return

        self._profit_status.config(text="Iniciando...", fg=FG2)
        self.root.update()
        threading.Thread(
            target=self._start_bridge,
            args=(profit_key, profit_email, profit_pass),
            daemon=True
        ).start()

    # ── Tela 3: Bridge ativo ──────────────────────────────────────────────────
    def _show_running(self):
        self._clear()
        self.root.geometry("400x300")
        self._header(self.root)

        tk.Label(self.root, text="● Ativo — aguardando operações",
                 font=("Segoe UI", 10, "bold"), bg=BG, fg=GREEN).pack(pady=(0, 16))

        info = tk.Frame(self.root, bg=BG2, padx=20, pady=14)
        info.pack(fill="x", padx=40)

        tk.Label(info, text="Operações hoje:", font=("Segoe UI", 9),
                 bg=BG2, fg=FG2, anchor="w").grid(row=0, column=0, sticky="w")
        self._ops_label = tk.Label(info, text="0", font=("Segoe UI", 9, "bold"),
                                   bg=BG2, fg=FG, anchor="e")
        self._ops_label.grid(row=0, column=1, sticky="e", padx=(20, 0))

        tk.Label(info, text="Última:", font=("Segoe UI", 9),
                 bg=BG2, fg=FG2, anchor="w").grid(row=1, column=0, sticky="w", pady=(6, 0))
        self._last_label = tk.Label(info, text="—", font=("Segoe UI", 9),
                                    bg=BG2, fg=FG, anchor="e")
        self._last_label.grid(row=1, column=1, sticky="e", padx=(20, 0), pady=(6, 0))
        info.columnconfigure(1, weight=1)

        self._btn(self.root, "Encerrar", self._quit, pady=(20, 0))
        self._process_queue()

    def _update_running(self, op_text):
        self.ops_count += 1
        self.last_op_text = op_text
        self._ops_label.config(text=str(self.ops_count))
        self._last_label.config(text=op_text)

    def _process_queue(self):
        try:
            while True:
                ev = self.event_queue.get_nowait()
                if ev["type"] == "op":
                    self._update_running(ev["text"])
                elif ev["type"] == "error":
                    messagebox.showerror("Erro no Bridge", ev["text"])
        except queue.Empty:
            pass
        self.root.after(500, self._process_queue)

    def _quit(self):
        if self.dll:
            try: self.dll.DLLFinalize()
            except Exception: pass
        self.root.destroy()

    # ── Bridge DLL ────────────────────────────────────────────────────────────
    def _start_bridge(self, profit_key, profit_email, profit_pass):
        if not DLL_AVAILABLE:
            self.root.after(0, lambda: messagebox.showerror(
                "Erro", "ctypes não disponível. Use Windows."))
            return
        try:
            dll = WinDLL(PROFIT_DLL_PATH)
            self.dll = dll
        except Exception as e:
            self.root.after(0, lambda: messagebox.showerror(
                "DLL não encontrada",
                f"Não foi possível carregar {PROFIT_DLL_PATH}.\n\n{e}"))
            return

        access_token = self.access_token
        event_queue  = self.event_queue

        @WINFUNCTYPE(None, c_int32, c_int32)
        def state_cb(n_type, n_result): pass

        @WINFUNCTYPE(
            None, TAssetID,
            c_int, c_int, c_int, c_int, c_int,
            c_double, c_double, c_double, c_longlong,
            c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p,
        )
        def history_cb(*_): pass

        @WINFUNCTYPE(
            None, TAssetID,
            c_int, c_int, c_int, c_int, c_int,
            c_double, c_double, c_double, c_longlong,
            c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p,
        )
        def order_change_cb(
            asset_id, _, n_qtd, n_traded, n_leaves, side,
            s_price, _s, s_avg, _id,
            _t, _c, _ti, _cl, status, _d, _msg,
        ):
            if n_leaves != 0 or n_traded <= 0: return
            if status and "cancelad" in (status or "").lower(): return
            avg   = s_avg if s_avg and s_avg > 0 else s_price
            ticker = asset_id.ticker or ""
            ativo  = ativo_from_ticker(ticker)
            if not ativo: return

            with pos_lock:
                pos       = positions[ativo]
                fill_side = "BUY" if side == 0 else "SELL"
                pos["fills"].append({"side": fill_side, "price": avg, "qty": n_traded})
                pos["qty"] += n_traded if fill_side == "BUY" else -n_traded

                if pos["qty"] == 0 and pos["fills"]:
                    buys  = [f for f in pos["fills"] if f["side"] == "BUY"]
                    sells = [f for f in pos["fills"] if f["side"] == "SELL"]
                    if buys and sells:
                        tbq   = sum(f["qty"] for f in buys)
                        tsq   = sum(f["qty"] for f in sells)
                        ab    = sum(f["price"]*f["qty"] for f in buys)  / tbq
                        asl   = sum(f["price"]*f["qty"] for f in sells) / tsq
                        qtde  = min(tbq, tsq)
                        tipo  = "Compra" if pos["fills"][0]["side"] == "BUY" else "Venda"
                        pe    = ab  if tipo == "Compra" else asl
                        saida = asl if tipo == "Compra" else ab
                        tick  = WIN_TICK if ativo == "WIN" else WDO_TICK
                        pts   = (saida - pe) if tipo == "Compra" else (pe - saida)
                        rs    = pts * qtde * tick
                        sit   = "Gain" if pts > 0 else ("Loss" if pts < 0 else "PE")
                        hoje  = date.today()

                        payload = {
                            "data":       str(hoje),
                            "dia_semana": dia_semana_br(hoje),
                            "ativo":      ativo,
                            "tipo":       tipo,
                            "pe":         round(pe, 2),
                            "stop":       round(pe, 2),
                            "qtde_total": qtde,
                            "qtde_rp":    0,
                            "saida":      round(saida, 2),
                            "pts_final":  round(pts, 2),
                            "situacao":   sit,
                            "rs_final":   round(rs, 2),
                            "obs":        "Importado via Profit Pro",
                        }

                        ok = send_operacao(access_token, payload)
                        op_text = f"{ativo} {tipo} {pts:+.0f}pts {'✓' if ok else '✗'}"
                        event_queue.put({"type": "op", "text": op_text})

                    pos["fills"] = []
                    pos["qty"]   = 0

        @WINFUNCTYPE(None, c_wchar_p, c_wchar_p, c_double, c_double, c_int, c_int)
        def account_cb(*_): pass

        @WINFUNCTYPE(None, TAssetID, c_wchar_p, c_uint, c_double, c_double, c_int, c_int, c_int, c_int)
        def trade_cb(*_): pass

        @WINFUNCTYPE(None, TAssetID, c_wchar_p, c_uint, c_double, c_double, c_int, c_int, c_int)
        def daily_cb(*_): pass

        @WINFUNCTYPE(None, TAssetID, c_int, c_int)
        def book_cb(*_): pass

        @WINFUNCTYPE(None, TAssetID, c_wchar_p, c_double, c_double, c_double, c_double, c_double, c_double, c_int)
        def hist_cb(*_): pass

        @WINFUNCTYPE(None, c_int32, c_int32)
        def progress_cb(*_): pass

        @WINFUNCTYPE(None, TAssetID, c_double, c_int, c_int)
        def tiny_cb(*_): pass

        result = dll.DLLInitializeLogin(
            c_wchar_p(profit_key),
            c_wchar_p(profit_email),
            c_wchar_p(profit_pass),
            state_cb, history_cb, order_change_cb,
            account_cb, trade_cb, daily_cb,
            book_cb, book_cb, hist_cb,
            progress_cb, tiny_cb,
        )

        if result != 0:
            self.root.after(0, lambda: messagebox.showerror(
                "Erro de conexão",
                f"DLLInitializeLogin retornou código {result}.\n"
                "Verifique a chave de ativação e as credenciais."))
            return

        self.root.after(0, self._show_running)


if __name__ == "__main__":
    BridgeApp()
