import { createLibrary, restoreLibrary } from './learning.js';
import { newId } from './id.js';

// Account caches stay separate from guest saves. Persist the exact request before
// sending it; reconnect retries the same operation, never a new overwrite.
export class CloudSave {
  constructor({ storage, request, apply, status, conflict }) {
    Object.assign(this, { storage, request, apply, status, conflict });
    this.userId = null; this.state = null; this.busy = false; this.generation = 0; this.cacheAvailable = true; this.retryDelay = 2000;
    this.status = (message, error = false) => status(this.cacheAvailable ? message : `Device backup unavailable · ${message}`, error || !this.cacheAvailable);
  }
  cache() {
    try { this.storage.setItem(`cloudkeepers-account:${this.userId}`, JSON.stringify(this.state)); this.cacheAvailable = true; }
    catch { this.cacheAvailable = false; this.status('Keep this page open until saved online', true); }
  }
  async connect(userId) {
    clearTimeout(this.timer); const generation = ++this.generation;
    this.userId = userId; this.state = null; this.ready = false; this.remote = null; this.retryDelay = 2000; this.conflict(null);
    if (!userId) return;
    try { this.state = JSON.parse(this.storage.getItem(`cloudkeepers-account:${userId}`)); } catch { /* Use online copy. */ }
    if (!this.state || !Number.isSafeInteger(this.state.revision) || !this.state.library) this.state = { revision: 0, library: createLibrary(), dirty: false, pending: null };
    this.apply(restoreLibrary(this.state.library)); this.status('Checking online save…');
    try {
      const remote = await this.request('GET'); if (generation !== this.generation) return;
      if (this.state.pending || this.state.dirty) {
        if (remote.revision !== this.state.revision && remote.revision !== this.state.revision + 1) { this.remote = remote; this.conflict(remote); this.status('Two saves need your choice', true); return; }
      } else {
        this.state = { revision: remote.revision, library: remote.library || createLibrary(), dirty: false, pending: null };
        this.apply(restoreLibrary(this.state.library)); this.cache();
      }
      this.ready = true;
      if (this.state.pending || this.state.dirty) await this.flush(); else this.status(remote.library ? 'Saved online' : 'Saves automatically');
    } catch { if (generation === this.generation) { this.ready = true; this.status('Saved on device · reconnecting…', true); } }
  }
  save(library) {
    if (!this.userId || !this.state) return;
    this.state.library = JSON.parse(JSON.stringify(library)); this.state.dirty = true; this.cache();
    this.status(this.remote ? 'Two saves need your choice' : 'Saving…', !!this.remote);
    clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 1500);
  }
  async flush() {
    if (!this.userId || !this.state || !this.ready || this.remote || this.busy || (!this.state.dirty && !this.state.pending)) return;
    const generation = this.generation; this.busy = true;
    this.state.pending ||= { mutationId: newId(), revision: this.state.revision, library: JSON.parse(JSON.stringify(this.state.library)) };
    const sent = this.state.pending; this.cache(); this.status('Saving…');
    try {
      const remote = await this.request('PUT', sent); if (generation !== this.generation) return;
      this.state.revision = remote.revision; this.state.pending = null; this.retryDelay = 2000;
      this.state.dirty = JSON.stringify(this.state.library) !== JSON.stringify(sent.library); this.cache();
      this.status(this.state.dirty ? 'Saving…' : 'Saved online');
    } catch (error) {
      if (generation !== this.generation) return;
      if (error.status === 409) { this.remote = error.body; this.conflict(this.remote); this.status('Two saves need your choice', true); }
      else this.status('Saved on device · reconnecting…');
    } finally {
      this.busy = false;
      if (this.userId && this.ready && (this.state?.dirty || this.state?.pending) && !this.remote) {
        const delay = this.state.pending ? this.retryDelay : 1500;
        if (this.state.pending) this.retryDelay = Math.min(30000, this.retryDelay * 2);
        clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), delay); this.timer.unref?.();
      }
    }
  }
  resolve(useDevice) {
    if (!this.remote) return;
    this.state.revision = this.remote.revision; this.state.pending = null; this.state.dirty = useDevice;
    if (!useDevice) { this.state.library = this.remote.library || createLibrary(); this.apply(restoreLibrary(this.state.library)); }
    this.remote = null; this.conflict(null); this.ready = true; this.cache();
    if (useDevice) this.flush(); else this.status('Saved online');
  }
}
function loadScript(src, publishableKey) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src; script.crossOrigin = 'anonymous';
    if (publishableKey) script.dataset.clerkPublishableKey = publishableKey;
    script.onload = resolve; script.onerror = reject; document.head.append(script);
  });
}
export async function setupCloud({ apply, guest, status, activate }) {
  const $ = id => document.getElementById(id);
  let config;
  try { const response = await fetch('/api/config'); if (!response.ok) return null; config = await response.json(); } catch { return null; }
  if (!config.cloudEnabled) return null;
  $('account-controls').hidden = false; $('parent-login').disabled = true;
  try {
    const domain = atob(config.publishableKey.split('_')[2]).slice(0, -1);
    await loadScript(`https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`);
    await loadScript(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, config.publishableKey);
    const clerk = window.Clerk; await clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
    const cloud = new CloudSave({ storage: localStorage, apply, status, conflict: remote => { $('sync-conflict').hidden = !remote; }, request: async (method, body) => {
      const token = await clerk.session?.getToken(); if (!token) throw new Error('Signed out');
      const response = await fetch('/api/save', { signal: AbortSignal.timeout(15000), method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const data = await response.json(); if (!response.ok) throw Object.assign(new Error(data.error), { status: response.status, body: data }); return data;
    } });
    activate(cloud);
    let current;
    async function sessionChanged() {
      const id = clerk.user?.id || null; if (id === current) return;
      current = id;
      $('parent-login').hidden = !!id; $('parent-logout').hidden = !id; $('import-device').hidden = !id || !Object.values(guest().players).some(player => Object.values(player.books).some(book => book.events.length || Object.values(book.levels).some(level => level.completed || level.pending))); $('save-menu').open = false;
      $('play').disabled = true;
      await cloud.connect(id);
      if (!id) { apply(guest()); status('Saved on this device'); }
      if (current === id) $('play').disabled = false;
    }
    $('parent-login').disabled = false;
    $('parent-login').onclick = () => clerk.openSignIn({
      forceRedirectUrl: window.location.origin, signUpForceRedirectUrl: window.location.origin,
    });
    $('parent-logout').onclick = async () => { await cloud.flush(); await clerk.signOut(); };
    $('import-device').onclick = () => { if (confirm('Replace this account’s current game with the guest save from this device? Download a backup first if needed.')) { const library = guest(); apply(library); cloud.save(library); } };
    $('use-online').onclick = () => cloud.resolve(false);
    $('use-device').onclick = () => { if (confirm('Replace the online save with this device’s progress? Download a backup first if needed.')) cloud.resolve(true); };
    window.addEventListener('online', () => cloud.flush());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) cloud.flush(); });
    clerk.addListener(sessionChanged); await sessionChanged();
    return cloud;
  } catch { $('account-controls').hidden = true; return null; }
}
