// Package binding exports Go functions to Android via gomobile bind.
// Build: gomobile bind -target android -o erp.aar ./cmd/android/binding
package binding

import (
	"erp/native/internal/db"
	"erp/native/internal/tab"
	"sync"
)

var (
	once   sync.Once
	tabMgr *tab.Manager
)

// Init must be called once from Android onCreate with the app data directory.
func Init(dataDir string) error {
	var initErr error
	once.Do(func() {
		if err := db.Init(dataDir); err != nil {
			initErr = err
			return
		}
		tabMgr = tab.NewManager(db.DB)
	})
	return initErr
}

// GetInitURL returns the URL to load at startup.
func GetInitURL() string {
	if tabMgr == nil {
		return ""
	}
	list := tabMgr.List()
	if len(list) == 0 {
		t := tabMgr.New("http://10.0.2.2:3000")
		return t.URL
	}
	return list[0].URL
}

// NewTab creates a new tab and returns its URL.
func NewTab(url string) string {
	if tabMgr == nil {
		return url
	}
	t := tabMgr.New(url)
	return t.URL
}

// SwitchTab switches to the tab with the given id and returns its URL.
func SwitchTab(id string) string {
	if tabMgr == nil {
		return ""
	}
	t := tabMgr.Switch(id)
	if t == nil {
		return ""
	}
	return t.URL
}

// CloseTab closes the tab with the given id.
func CloseTab(id string) {
	if tabMgr != nil {
		tabMgr.Close(id)
	}
}

// OnPageLoaded updates the current tab's URL in local DB.
func OnPageLoaded(url string) {
	if tabMgr == nil {
		return
	}
	cur := tabMgr.Current()
	if cur != "" {
		tabMgr.UpdateURL(cur, url)
	}
}

// GetSetting reads a key from the local settings store.
func GetSetting(key string) string {
	v, _ := db.GetSetting(key)
	return v
}

// SetSetting persists a key-value pair.
func SetSetting(key, value string) {
	_ = db.SetSetting(key, value)
}

// Close cleans up resources. Call from Activity onDestroy.
func Close() {
	db.Close()
}
