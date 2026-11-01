/* PropertyOS module 14: Team — list members and remove access (owners only). */
(() => {
  if (typeof MORE !== 'undefined' && !MORE.includes('team')) MORE.push('team');
  if (typeof SEC !== 'undefined') SEC.team = ['Team', '#5e5ce6'];
  if (typeof P !== 'undefined' && !P.team) {
    P.team = "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75";
  }

  V.team = function () {
    const isOwner = D.owner || (typeof role !== 'undefined' && role === 'owner');
    if (!isOwner) {
      return `<div class="g em"><h2>Team</h2><p>Only the workspace owner can manage team members.</p></div>`;
    }
    return `<h2>Team</h2>
      <p style="color:var(--mu);margin-bottom:14px">People who can access this workspace.</p>
      <div id="teamList" class="list"><div class="em">Loading…</div></div>
      <div style="margin-top:16px">
        <button class="btn" data-a="invite">Invite someone</button>
      </div>`;
  };

  // Load members when the view is shown
  const origRender = typeof render === 'function' ? render : null;
  if (origRender) {
    // Hook via mutation: when team view is active, fetch
    document.addEventListener('click', e => {
      const nav = e.target.closest('[data-a="nav"][data-v="team"]');
      if (nav) setTimeout(loadTeam, 50);
    });
  }

  async function loadTeam() {
    const el = document.getElementById('teamList');
    if (!el) return;
    try {
      const { data, error } = await sb.rpc('organization_members', { p_org: ORG });
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) {
        el.innerHTML = '<div class="em">No members found.</div>';
        return;
      }
      el.innerHTML = rows.map(m => {
        const name = m.name || m.email || m.user_id || 'Member';
        const roleLabel = m.role === 'owner' ? 'Owner' : m.role === 'manager' ? 'Manager' : 'Tenant';
        const canRemove = m.role !== 'owner' && m.user_id !== (S && S.user && S.user.id);
        const me = S && S.user && m.user_id === S.user.id;
        const ini = String(name).replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
        const hue = [...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
        return `<div class="g row">
          <div class="lq-av" style="--h:${hue}" aria-hidden="true">${esc(ini)}</div>
          <div class="m"><b>${esc(name)}</b><small>${esc(m.email || '')} · ${roleLabel}${me ? ' · You' : ''}</small></div>
          ${canRemove ? `<button class="btn s q" data-a="removeMember" data-uid="${esc(m.user_id)}">Remove</button>` : `<span class="bd">${roleLabel}</span>`}
        </div>`;
      }).join('');
    } catch (x) {
      el.innerHTML = `<div class="em" style="color:var(--er)">${esc(x.message || 'Could not load team')}</div>`;
    }
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-a="removeMember"]');
    if (!b) return;
    const uid = b.dataset.uid;
    if (!uid || !confirm('Remove this person from the workspace?')) return;
    b.disabled = true;
    try {
      const { error } = await sb.rpc('revoke_membership', { p_org: ORG, p_user: uid });
      if (error) throw error;
      toast('Member removed');
      loadTeam();
    } catch (x) {
      toast(x.message || 'Could not remove');
      b.disabled = false;
    }
  });

  // Also trigger load when navigating via go()
  const _go = typeof go === 'function' ? go : null;
  if (_go) {
    window.go = function (v) {
      _go(v);
      if (v === 'team') setTimeout(loadTeam, 80);
    };
  }
})();
