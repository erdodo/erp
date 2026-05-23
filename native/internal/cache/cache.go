package cache

import (
	"database/sql"
	"time"
)

type Store struct {
	db *sql.DB
}

func New(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Set(key string, value []byte, mime string, ttl time.Duration) error {
	exp := time.Now().Add(ttl).Unix()
	_, err := s.db.Exec(
		`INSERT INTO cache(key,value,mime_type,expires_at) VALUES(?,?,?,?)
		 ON CONFLICT(key) DO UPDATE SET value=excluded.value, mime_type=excluded.mime_type, expires_at=excluded.expires_at`,
		key, value, mime, exp,
	)
	return err
}

func (s *Store) Get(key string) ([]byte, string, bool) {
	var value []byte
	var mime string
	var exp int64
	err := s.db.QueryRow(
		`SELECT value, mime_type, expires_at FROM cache WHERE key=?`, key,
	).Scan(&value, &mime, &exp)
	if err != nil || time.Now().Unix() > exp {
		return nil, "", false
	}
	return value, mime, true
}

func (s *Store) Evict() {
	_, _ = s.db.Exec(`DELETE FROM cache WHERE expires_at < ?`, time.Now().Unix())
}
