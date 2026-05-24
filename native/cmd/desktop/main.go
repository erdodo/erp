//go:build !android

package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"erp/native/internal/cache"
	"erp/native/internal/db"
	"erp/native/internal/tab"

	webview "github.com/webview/webview_go"
)

const appTitle = "ERP"
const defaultURL = "https://erp.erdoganyesil.org"

// splashHTML is injected before the app loads so there's no blank white flash.
const splashHTML = `
<style>
  #__erp_splash {
    position: fixed; inset: 0; z-index: 2147483647;
    background: #0f172a;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: system-ui, sans-serif;
    transition: opacity .4s ease;
  }
  #__erp_splash .logo {
    width: 56px; height: 56px; border-radius: 16px;
    background: #3b82f6;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; margin-bottom: 20px;
  }
  #__erp_splash .name {
    color: #f1f5f9; font-size: 22px; font-weight: 700; margin-bottom: 8px;
  }
  #__erp_splash .dots {
    display: flex; gap: 6px; margin-top: 24px;
  }
  #__erp_splash .dots span {
    width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;
    animation: bounce 1.2s infinite ease-in-out;
  }
  #__erp_splash .dots span:nth-child(2) { animation-delay: .2s; }
  #__erp_splash .dots span:nth-child(3) { animation-delay: .4s; }
  @keyframes bounce {
    0%,80%,100% { transform: scale(0.6); opacity:.4; }
    40%          { transform: scale(1.0); opacity:1; }
  }
</style>
<div id="__erp_splash">
  <div class="logo">⚡</div>
  <div class="name">ERP</div>
  <div class="dots"><span></span><span></span><span></span></div>
</div>
<script>
(function() {
  // Hide splash once the React app signals it is ready.
  function hideSplash() {
    var el = document.getElementById('__erp_splash');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(function() { el && el.remove(); }, 420);
  }
  window.addEventListener('erp-app-ready', hideSplash);
  // Fallback: hide after 6 s even if signal never fires.
  setTimeout(hideSplash, 6000);
})();
</script>
`

var (
	wv      webview.WebView
	tabMgr  *tab.Manager
	cacheStore *cache.Store
)

func dataDir() string {
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(os.Getenv("APPDATA"), "ERP")
	default:
		home, _ := os.UserHomeDir()
		return filepath.Join(home, ".config", "erp")
	}
}

func main() {
	dir := dataDir()
	if err := db.Init(dir); err != nil {
		log.Fatalf("db init: %v", err)
	}
	defer db.Close()

	tabMgr = tab.NewManager(db.DB)
	cacheStore = cache.New(db.DB)

	// Restore last URL or open default
	lastURL, _ := db.GetSetting("last_url")
	if lastURL == "" {
		lastURL = defaultURL
	}

	wv = webview.New(true)
	defer wv.Destroy()

	wv.SetTitle(appTitle)
	wv.SetSize(1400, 900, webview.HintNone)

	// ── Go → JS bridge ──────────────────────────────────────────────
	bindFunc(wv, "nativeNewTab", func(url string) map[string]interface{} {
		t := tabMgr.New(url)
		return map[string]interface{}{"id": t.ID, "url": t.URL, "title": t.Title}
	})

	bindFunc(wv, "nativeSwitchTab", func(id string) string {
		t := tabMgr.Switch(id)
		if t == nil {
			return ""
		}
		// Same-origin: use JS navigation so Next.js client-side router
		// handles it — no full page reload, instant transition.
		wv.Eval(fmt.Sprintf(
			`(function(){try{history.pushState(null,'','%s');window.dispatchEvent(new PopStateEvent('popstate'));}catch(e){location.href='%s';}})()`,
			t.URL, t.URL,
		))
		return t.URL
	})

	bindFunc(wv, "nativeCloseTab", func(id string) {
		tabMgr.Close(id)
	})

	bindFunc(wv, "nativeListTabs", func() []*tab.Tab {
		return tabMgr.List()
	})

	bindFunc(wv, "nativeUpdateTitle", func(id, title string) {
		tabMgr.UpdateTitle(id, title)
		wv.SetTitle(fmt.Sprintf("%s – %s", title, appTitle))
	})

	bindFunc(wv, "nativeUpdateURL", func(id, url string) {
		tabMgr.UpdateURL(id, url)
		_ = db.SetSetting("last_url", url)
	})

	bindFunc(wv, "nativeGetSetting", func(key string) string {
		v, _ := db.GetSetting(key)
		return v
	})

	bindFunc(wv, "nativeSetSetting", func(key, value string) {
		_ = db.SetSetting(key, value)
	})

	// Inject splash screen + tab bar on every page load
	wv.Init(splashHTML + tabBarJS())

	// Open first tab
	if len(tabMgr.List()) == 0 {
		tabMgr.New(lastURL)
	}
	wv.Navigate(lastURL)

	wv.Run()
}

// bindFunc wraps any function so its return value is JSON-encoded.
func bindFunc(w webview.WebView, name string, fn interface{}) {
	_ = w.Bind(name, fn)
}

// tabBarJS returns the injected JavaScript that renders a native-feel tab bar
// inside the WebView. Communicates with Go via the bound functions above.
func tabBarJS() string {
	tabBarCSS := `
	#__erp_tabbar {
		position: fixed; top: 0; left: 0; right: 0; height: 36px; z-index: 99999;
		display: flex; align-items: center; gap: 2px; padding: 0 4px;
		background: #1e2330; border-bottom: 1px solid #2d3348;
		font-family: system-ui, sans-serif; font-size: 12px;
	}
	#__erp_tabbar .tab {
		display: flex; align-items: center; gap: 4px;
		padding: 0 10px 0 12px; height: 28px; border-radius: 6px 6px 0 0;
		background: #2d3348; color: #9aa0b4; cursor: pointer;
		max-width: 180px; overflow: hidden; white-space: nowrap;
		border: 1px solid transparent; border-bottom: none;
		transition: background .15s;
	}
	#__erp_tabbar .tab.active {
		background: #fff; color: #1e2330;
	}
	#__erp_tabbar .tab .close {
		margin-left: 2px; opacity: .5; font-size: 10px; line-height: 1;
		border: none; background: none; cursor: pointer; color: inherit;
	}
	#__erp_tabbar .tab .close:hover { opacity: 1; }
	#__erp_tabbar .tab-new {
		width: 28px; height: 28px; border-radius: 6px; display: flex;
		align-items: center; justify-content: center;
		background: transparent; color: #9aa0b4; border: none; cursor: pointer;
		font-size: 16px; flex-shrink: 0;
	}
	#__erp_tabbar .tab-new:hover { background: #2d3348; }
	body { padding-top: 36px !important; }
	`

	return `(function() {
	if (document.getElementById('__erp_tabbar')) return;
	const style = document.createElement('style');
	style.textContent = ` + "`" + tabBarCSS + "`" + `;
	document.head.appendChild(style);

	const bar = document.createElement('div');
	bar.id = '__erp_tabbar';
	document.body.insertBefore(bar, document.body.firstChild);

	let tabs = [], currentId = null;

	async function refresh() {
		tabs = await nativeListTabs();
		currentId = tabs.length ? tabs[0].id : null;
		render();
	}

	function render() {
		bar.innerHTML = '';
		tabs.forEach(t => {
			const el = document.createElement('div');
			el.className = 'tab' + (t.id === currentId ? ' active' : '');
			el.title = t.url;
			el.innerHTML = '<span style="flex:1;overflow:hidden;text-overflow:ellipsis">' + (t.title || t.url) + '</span>';
			const cl = document.createElement('button');
			cl.className = 'close'; cl.textContent = '×';
			cl.onclick = async e => { e.stopPropagation(); await nativeCloseTab(t.id); await refresh(); };
			el.appendChild(cl);
			el.onclick = async () => { currentId = t.id; await nativeSwitchTab(t.id); render(); };
			bar.appendChild(el);
		});
		const btn = document.createElement('button');
		btn.className = 'tab-new'; btn.textContent = '+'; btn.title = 'Yeni sekme';
		btn.onclick = async () => { await nativeNewTab(location.origin); await refresh(); };
		bar.appendChild(btn);
	}

	// Track URL / title changes
	const observer = new MutationObserver(() => {
		const id = currentId;
		if (id) nativeUpdateTitle(id, document.title);
	});
	observer.observe(document.querySelector('title') || document.head, { subtree: true, characterData: true, childList: true });

	refresh();
})();`
}
