/* PropertyOS module 3: offline banner, collection-rate KPI, keyboard nav. Defensive, free-tier safe. */
(() => {
  const css = document.createElement('style');
  css.textContent = `
.cp {
  position: fixed;
  inset: 0;
  z-index: 99;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: max(8vh,env(safe-area-inset-top)) 14px 14px;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.cp>div {
  width: min(560px,100%);
  border-radius: 24px;
  padding: 10px;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
}

.cp input {
  width: 100%;
  box-sizing: border-box;
  border: 0;
  outline: 0;
  background: var(--fl);
  color: var(--tx);
  font: 600 16px inherit;
  font-family: inherit;
  padding: 14px 16px;
  border-radius: 16px;
}

.cp ul {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  overflow: auto;
}

.cp li {
  padding: 11px 14px;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-weight: 600;
}

.cp li small {
  color: var(--mu);
  font-weight: 500;
}

.cp li.on,
.cp li:hover {
  background: var(--fl);
}

.offl {
  position: fixed;
  left: 50%;
  bottom: calc(88px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 50;
  padding: 8px 14px;
  border-radius: 99px;
  background: var(--gl);
  box-shadow: inset 0 0 0 1px var(--gb), 0 6px 20px var(--sh);
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.kpi3 {
  display: flex;
  gap: 10px;
  margin: 0 0 14px;
}

.kpi3>div {
  flex: 1;
  padding: 12px 14px;
  border-radius: 20px;
}

.kpi3 b {
  display: block;
  font-size: 22px;
}

.kpi3 small {
  color: var(--mu);
  font-weight: 600;
}

.kbar {
  height: 6px;
  border-radius: 9px;
  background: var(--fl);
  margin-top: 8px;
  overflow: hidden;
}

.kbar i {
  display: block;
  height: 100%;
  background: var(--ac,#0a84ff);
  border-radius: 9px;
}
`;
  document.head.append(css);
  const safe = f => {
    try {
      return f();
    }
    catch (e) {
      return null;
    }
  };
  /* Offline banner */
  let ob;
  const net = () => {
    if (!navigator.onLine && !ob) {
      ob = document.createElement('div');
      ob.className = 'offl';
      ob.textContent = 'Offline — showing saved data';
      document.body.append(ob);
    }
    else if (navigator.onLine && ob) {
      ob.remove();
      ob = null;
    }
  };
  addEventListener('online', net);
  addEventListener('offline', net);
  net();
  /* Collection-rate KPI on Home */
  const _h = V.home;
  if (_h)
    V.home = () => {
      let h = _h();
      if (!safe(() => mgr()))
        return h;
      const k = safe(() => {
        const cs = D.charges.filter(c => c.m == CM);
        const due = cs.reduce((s, c) => s + c.amt, 0);
        const paid = cs.reduce((s, c) => s + D.pays.filter(p => p.cid == c.id && !p.rev).reduce((a, p) => a + p.amt, 0), 0);
        return { due, paid, r: due ? Math.min(100, Math.round(paid / due * 100)) : 0 };
      });
      if (!k)
        return h;
      const card = `<div class="kpi3"><div class="g"><small>Collected · ${MF(CM)}</small><b>${inr(k.paid)}</b><div class="kbar"><i style="width:${k.r}%"></i></div></div><div class="g"><small>Collection rate</small><b>${k.r}%</b><small>of ${inr(k.due)} due</small></div></div>`;
      const j = h.indexOf('<h2');
      return j > 0 ? h.slice(0, j) + card + h.slice(j) : card + h;
    };
  if (document.body.classList.contains('ready'))
    safe(render);
})();
