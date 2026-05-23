package db

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func Init(dataDir string) error {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return err
	}
	dbPath := filepath.Join(dataDir, "erp-local.db")
	var err error
	DB, err = sql.Open("sqlite3", dbPath+"?_journal=WAL&_timeout=5000")
	if err != nil {
		return err
	}
	return createTables()
}

func createTables() error {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS tabs (
			id         TEXT PRIMARY KEY,
			url        TEXT NOT NULL,
			title      TEXT DEFAULT '',
			position   INTEGER DEFAULT 0,
			created_at INTEGER DEFAULT (strftime('%s','now'))
		);
		CREATE TABLE IF NOT EXISTS cache (
			key        TEXT PRIMARY KEY,
			value      BLOB,
			mime_type  TEXT,
			expires_at INTEGER
		);
		CREATE TABLE IF NOT EXISTS settings (
			key   TEXT PRIMARY KEY,
			value TEXT
		);
	`)
	return err
}

func SetSetting(key, value string) error {
	_, err := DB.Exec(
		`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
		key, value,
	)
	return err
}

func GetSetting(key string) (string, error) {
	var v string
	err := DB.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&v)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return v, err
}

func Close() {
	if DB != nil {
		_ = DB.Close()
	}
}
