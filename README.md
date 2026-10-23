# Healthcare Scheduling System

Sistem penjadwalan konsultasi dokter dan pasien berbasis microservice.
Stack: NestJS, GraphQL (Apollo), PostgreSQL, Prisma, Redis, Docker Compose.

## Arsitektur

```
Client ──► schedule-service :3002 ──► schedule-db (PostgreSQL)
               │      │
               │      └──► Mailpit :1025 (SMTP, email ke customer)
               │
               └─ validateToken ──► auth-service :3001 ──► auth-db (PostgreSQL)
                                          │
                                          └──► Redis (cache hasil validateToken)
```

| Service            | Port | Tugas                                                       |
| ------------------ | ---- | ----------------------------------------------------------- |
| `auth-service`     | 3001 | `register`, `login` (JWT), `validateToken`                  |
| `schedule-service` | 3002 | CRUD customer, doctor, schedule. Semua endpoint butuh token |

Setiap service punya database sendiri. `schedule-service` memvalidasi setiap request dengan memanggil `validateToken` di `auth-service`.

## Menjalankan dengan Docker

```bash
make setup      # buat .env dari .env.example (tidak menimpa yang sudah ada)
# edit .env, terutama JWT_SECRET dan password database
make up         # build dan start semua container
```

| URL                           | Isi                                         |
| ----------------------------- | ------------------------------------------- |
| http://localhost:3001/graphql | GraphQL playground auth-service             |
| http://localhost:3002/graphql | GraphQL playground schedule-service         |
| http://localhost:8025         | Mailpit, tempat membaca email yang terkirim |

Perintah lain: `make logs`, `make down`, `make clean` (menghapus data database).

## Menjalankan per service (tanpa Docker Compose)

Butuh PostgreSQL untuk keduanya. Redis bersifat opsional (cache auth-service). Schedule-service membutuhkan server SMTP, misalnya `docker run -p 1025:1025 -p 8025:8025 axllent/mailpit`.

```bash
make setup      # lalu isi .env di auth-service/ dan schedule-service/
make install    # pnpm install + prisma generate
make migrate    # terapkan migrasi database
make dev-auth       # terminal 1, port 3001
make dev-schedule   # terminal 2, port 3002
```

## Environment variables

Template ada di [.env.example](.env.example) (Docker) dan `.env.example` di tiap service (lokal).

| Variabel                                  | Service  | Wajib | Keterangan                       |
| ----------------------------------------- | -------- | ----- | -------------------------------- |
| `DATABASE_URL`                            | keduanya | ya    | Connection string PostgreSQL     |
| `JWT_SECRET`                              | auth     | ya    | Secret penanda tangan JWT        |
| `JWT_EXPIRES_IN`                          | auth     | tidak | Masa berlaku token, default `1h` |
| `REDIS_URL`                               | auth     | tidak | Kosong berarti cache dimatikan   |
| `AUTH_SERVICE_URL`                        | schedule | ya    | Endpoint GraphQL auth-service    |
| `SMTP_HOST`, `MAIL_FROM`                  | schedule | ya    | Server SMTP dan alamat pengirim  |
| `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | schedule | tidak | Default port 1025, tanpa login   |
| `PORT`                                    | keduanya | tidak | Default 3001 dan 3002            |

Jangan commit file `.env`. Service berhenti dengan pesan jelas jika variabel wajib kosong.

## Aturan penting

- Dokter yang sama tidak bisa punya dua jadwal di waktu yang sama (dijaga unique index di database).
- Customer dan doctor harus sudah ada saat membuat schedule.
- Customer atau doctor yang masih punya schedule tidak bisa dihapus.
- Email ke customer dikirim saat schedule dibuat dan dihapus. Kegagalan kirim email tidak menggagalkan request.

## Test

```bash
make test   # unit test
make e2e    # e2e test (tanpa database dan Redis asli)
make lint
```
