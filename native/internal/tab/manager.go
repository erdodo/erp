package tab

import (
	"database/sql"
	"fmt"
	"sync"
	"time"
)

type Tab struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	Title    string `json:"title"`
	Position int    `json:"position"`
}

type Manager struct {
	mu      sync.RWMutex
	tabs    []*Tab
	current string
	db      *sql.DB
}

func NewManager(db *sql.DB) *Manager {
	m := &Manager{db: db}
	_ = m.load()
	return m
}

func (m *Manager) load() error {
	rows, err := m.db.Query(`SELECT id, url, title, position FROM tabs ORDER BY position`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		t := &Tab{}
		if err := rows.Scan(&t.ID, &t.URL, &t.Title, &t.Position); err != nil {
			continue
		}
		m.tabs = append(m.tabs, t)
	}
	if len(m.tabs) > 0 {
		m.current = m.tabs[0].ID
	}
	return nil
}

func (m *Manager) New(url string) *Tab {
	m.mu.Lock()
	defer m.mu.Unlock()
	t := &Tab{
		ID:       fmt.Sprintf("tab-%d", time.Now().UnixNano()),
		URL:      url,
		Title:    url,
		Position: len(m.tabs),
	}
	m.tabs = append(m.tabs, t)
	m.current = t.ID
	_, _ = m.db.Exec(
		`INSERT INTO tabs(id,url,title,position) VALUES(?,?,?,?)`,
		t.ID, t.URL, t.Title, t.Position,
	)
	return t
}

func (m *Manager) Switch(id string) *Tab {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.tabs {
		if t.ID == id {
			m.current = id
			return t
		}
	}
	return nil
}

func (m *Manager) Close(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i, t := range m.tabs {
		if t.ID == id {
			m.tabs = append(m.tabs[:i], m.tabs[i+1:]...)
			_, _ = m.db.Exec(`DELETE FROM tabs WHERE id=?`, id)
			if m.current == id && len(m.tabs) > 0 {
				idx := i
				if idx >= len(m.tabs) {
					idx = len(m.tabs) - 1
				}
				m.current = m.tabs[idx].ID
			}
			return
		}
	}
}

func (m *Manager) UpdateTitle(id, title string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.tabs {
		if t.ID == id {
			t.Title = title
			_, _ = m.db.Exec(`UPDATE tabs SET title=? WHERE id=?`, title, id)
			return
		}
	}
}

func (m *Manager) UpdateURL(id, url string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.tabs {
		if t.ID == id {
			t.URL = url
			_, _ = m.db.Exec(`UPDATE tabs SET url=? WHERE id=?`, url, id)
			return
		}
	}
}

func (m *Manager) List() []*Tab {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*Tab, len(m.tabs))
	copy(out, m.tabs)
	return out
}

func (m *Manager) Current() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.current
}
