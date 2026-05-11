"""
TraderLog — Profit Pro Bridge
==============================
Requisitos:
  - Python 32-bit (para ProfitDLL.dll) ou 64-bit (para ProfitDLL64.dll)
  - pip install requests
  - ProfitDLL.dll (ou ProfitDLL64.dll) na mesma pasta deste script
  - Chave de ativação Data Solution da Nelógica

Configure as variáveis abaixo antes de rodar.
"""

import ctypes
from ctypes import (
    c_int, c_int32, c_uint, c_double, c_longlong,
    c_wchar_p, c_wchar, Structure, WinDLL, WINFUNCTYPE,
)
from collections import defaultdict
from datetime import date
import threading
import time
import requests

# ─── CONFIGURAÇÃO ────────────────────────────────────────────────────────────
TRADERLOG_URL = "https://trader-log.vercel.app/api/operacoes"
TRADERLOG_TOKEN = "COLE_SEU_TOKEN_AQUI"       # gerado em /integracoes

PROFIT_DLL    = "./ProfitDLL.dll"              # ou "./ProfitDLL64.dll"
PROFIT_KEY    = "CHAVE_ATIVACAO_NELOGICA"
PROFIT_USER   = "seu@email.com"
PROFIT_PASS   = "sua_senha"
# ─────────────────────────────────────────────────────────────────────────────

WIN_TICK = 0.20
WDO_TICK = 10.00
DIAS_SEMANA = ['DOMINGO','SEGUNDA','TERÇA','QUARTA','QUINTA','SEXTA','SÁBADO']


class TAssetID(Structure):
    _fields_ = [
        ("ticker", c_wchar_p),
        ("bolsa",  c_wchar_p),
        ("feed",   c_int),
    ]


# ─── Rastreador de posições por ativo ────────────────────────────────────────
positions = defaultdict(lambda: {"qty": 0, "fills": []})
lock = threading.Lock()


def ativo_from_ticker(ticker: str):
    t = (ticker or "").upper()
    if "WIN" in t: return "WIN"
    if "WDO" in t or "DOL" in t: return "WDO"
    return None


def dia_semana_br(d: date) -> str:
    # weekday(): Mon=0 … Sun=6 → DIAS_SEMANA: Sun=0, Mon=1 …
    return DIAS_SEMANA[(d.weekday() + 1) % 7]


def enviar_operacao(ativo: str, tipo: str, pe: float, saida: float, qtde: int):
    tick = WIN_TICK if ativo == "WIN" else WDO_TICK
    pts  = (saida - pe) if tipo == "Compra" else (pe - saida)
    rs   = pts * qtde * tick
    situacao = "Gain" if pts > 0 else ("Loss" if pts < 0 else "PE")
    hoje = date.today()

    payload = {
        "data":       str(hoje),
        "dia_semana": dia_semana_br(hoje),
        "ativo":      ativo,
        "tipo":       tipo,
        "pe":         round(pe, 2),
        "stop":       round(pe, 2),   # placeholder — preencha no histórico
        "qtde_total": qtde,
        "qtde_rp":    0,
        "saida":      round(saida, 2),
        "pts_final":  round(pts, 2),
        "situacao":   situacao,
        "rs_final":   round(rs, 2),
        "obs":        "Importado via Profit Pro",
    }

    try:
        resp = requests.post(
            TRADERLOG_URL,
            json=payload,
            headers={"Authorization": f"Bearer {TRADERLOG_TOKEN}"},
            timeout=10,
        )
        if resp.status_code == 200:
            print(f"[✓] {ativo} {tipo} | {pts:+.0f} pts | R$ {rs:+.2f}")
        else:
            print(f"[✗] Erro TraderLog {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[✗] Falha ao enviar: {e}")


def on_fill(ticker: str, side: int, qty: int, avg_price: float):
    """Chamado quando uma ordem é preenchida. Rastreia a posição e detecta round trips."""
    ativo = ativo_from_ticker(ticker)
    if not ativo or qty <= 0 or avg_price <= 0:
        return

    with lock:
        pos = positions[ativo]
        fill_side = "BUY" if side == 0 else "SELL"
        pos["fills"].append({"side": fill_side, "price": avg_price, "qty": qty})
        pos["qty"] += qty if fill_side == "BUY" else -qty

        # Posição fechada = day trade completo
        if pos["qty"] == 0 and pos["fills"]:
            buys  = [f for f in pos["fills"] if f["side"] == "BUY"]
            sells = [f for f in pos["fills"] if f["side"] == "SELL"]

            if buys and sells:
                total_buy_qty  = sum(f["qty"] for f in buys)
                total_sell_qty = sum(f["qty"] for f in sells)
                avg_buy  = sum(f["price"] * f["qty"] for f in buys)  / total_buy_qty
                avg_sell = sum(f["price"] * f["qty"] for f in sells) / total_sell_qty
                qtde = min(total_buy_qty, total_sell_qty)

                # Direção = lado do primeiro fill
                primeiro = pos["fills"][0]
                tipo  = "Compra" if primeiro["side"] == "BUY" else "Venda"
                pe    = avg_buy  if tipo == "Compra" else avg_sell
                saida = avg_sell if tipo == "Compra" else avg_buy

                print(f"[>] Operação fechada: {ativo} {tipo} {qtde}x | PE={pe:.0f} → Saída={saida:.0f}")
                enviar_operacao(ativo, tipo, pe, saida, qtde)

            pos["fills"] = []
            pos["qty"]   = 0


# ─── Callbacks da DLL ────────────────────────────────────────────────────────

@WINFUNCTYPE(None, c_int32, c_int32)
def state_callback(n_type, n_result):
    nomes = {0: "Login", 1: "Broker", 2: "Market", 3: "Ativação"}
    print(f"[Estado] {nomes.get(n_type, n_type)}: código {n_result}")


# orderChangeCallBack — dispara quando o status de uma ordem muda
# nLeavesQtd=0 + nTradedQtd>0 = ordem totalmente preenchida
@WINFUNCTYPE(
    None, TAssetID,
    c_int, c_int, c_int, c_int, c_int,
    c_double, c_double, c_double,
    c_longlong,
    c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p,
)
def order_change_callback(
    asset_id, n_corretora, n_qtd, n_traded_qtd, n_leaves_qtd, side,
    s_price, s_stop_price, s_avg_price, n_profit_id,
    tipo_ordem, conta, titular, cl_ord_id, status, date_str, text_msg,
):
    if n_leaves_qtd != 0 or n_traded_qtd <= 0:
        return
    if status and "cancelad" in (status or "").lower():
        return
    avg = s_avg_price if s_avg_price and s_avg_price > 0 else s_price
    on_fill(asset_id.ticker or "", side, n_traded_qtd, avg)


# historyCallBack — mesmo esquema sem textMessage (histórico ao conectar)
@WINFUNCTYPE(
    None, TAssetID,
    c_int, c_int, c_int, c_int, c_int,
    c_double, c_double, c_double,
    c_longlong,
    c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p, c_wchar_p,
)
def history_callback(
    asset_id, n_corretora, n_qtd, n_traded_qtd, n_leaves_qtd, side,
    s_price, s_stop_price, s_avg_price, n_profit_id,
    tipo_ordem, conta, titular, cl_ord_id, status, date_str,
):
    # Ignora histórico ao conectar para não duplicar ops já salvas
    pass


# Callbacks não utilizados — assinaturas mínimas para satisfazer a DLL
@WINFUNCTYPE(None, c_wchar_p, c_wchar_p, c_double, c_double, c_int, c_int)
def account_callback(*_): pass

@WINFUNCTYPE(None, TAssetID, c_wchar_p, c_uint, c_double, c_double, c_int, c_int, c_int, c_int, c_wchar)
def new_trade_callback(*_): pass

@WINFUNCTYPE(None, TAssetID, c_wchar_p, c_uint, c_double, c_double, c_int, c_int, c_int)
def new_daily_callback(*_): pass

@WINFUNCTYPE(None, TAssetID, c_int, c_int)
def price_book_callback(*_): pass

@WINFUNCTYPE(None, TAssetID, c_int, c_int)
def offer_book_callback(*_): pass

@WINFUNCTYPE(None, TAssetID, c_wchar_p, c_double, c_double, c_double, c_double, c_double, c_double, c_int)
def new_history_callback(*_): pass

@WINFUNCTYPE(None, c_int32, c_int32)
def progress_callback(*_): pass

@WINFUNCTYPE(None, TAssetID, c_double, c_int, c_int)
def tiny_book_callback(*_): pass


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 50)
    print("  TraderLog — Profit Pro Bridge")
    print("=" * 50)

    if TRADERLOG_TOKEN == "COLE_SEU_TOKEN_AQUI":
        print("[!] Configure TRADERLOG_TOKEN antes de rodar.")
        raise SystemExit(1)

    dll = WinDLL(PROFIT_DLL)
    print(f"[OK] DLL carregada: {PROFIT_DLL}")

    result = dll.DLLInitializeLogin(
        c_wchar_p(PROFIT_KEY),
        c_wchar_p(PROFIT_USER),
        c_wchar_p(PROFIT_PASS),
        state_callback,
        history_callback,
        order_change_callback,
        account_callback,
        new_trade_callback,
        new_daily_callback,
        price_book_callback,
        offer_book_callback,
        new_history_callback,
        progress_callback,
        tiny_book_callback,
    )

    print(f"[OK] DLLInitializeLogin retornou: {result}")
    print("[OK] Aguardando operações... (Ctrl+C para encerrar)\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[...] Encerrando...")
        dll.DLLFinalize()
        print("[OK] Encerrado.")
