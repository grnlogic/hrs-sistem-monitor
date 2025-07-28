# Environment Variables Setup

## Frontend (Next.js)

### File: `.env.local`
Buat file `.env.local` di root direktori `sistem-hrd` dengan konfigurasi berikut:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8084/api
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_API_RETRY_ATTEMPTS=3

# Application Configuration
NODE_ENV=development
```

### Environment Variables yang Digunakan:

- `NEXT_PUBLIC_API_URL`: URL endpoint API backend
- `NEXT_PUBLIC_API_TIMEOUT`: Timeout untuk request API (dalam milidetik)
- `NEXT_PUBLIC_API_RETRY_ATTEMPTS`: Jumlah percobaan retry untuk request API
- `NODE_ENV`: Environment aplikasi (development/production)

## Backend (Spring Boot)

### File: `.env`
Buat file `.env` di root direktori `sistem-padud` dengan konfigurasi berikut:

```env
# Server Configuration
SERVER_PORT=8084
SERVER_HOST=localhost

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hrd_pabrik_db
DB_USERNAME=hrd_user
DB_PASSWORD=fajargeran2005

# JWT Configuration
JWT_SECRET=KunciRahasiaSuperAcakDanPanjangUntukAplikasiHRDIniJanganDibagi
JWT_EXPIRATION=28800000

# Application Configuration
SPRING_PROFILES_ACTIVE=development
```

### Environment Variables yang Digunakan:

- `SERVER_PORT`: Port server Spring Boot
- `SERVER_HOST`: Host server
- `DB_HOST`: Host database PostgreSQL
- `DB_PORT`: Port database PostgreSQL
- `DB_NAME`: Nama database
- `DB_USERNAME`: Username database
- `DB_PASSWORD`: Password database
- `JWT_SECRET`: Secret key untuk JWT token
- `JWT_EXPIRATION`: Expiration time JWT (dalam milidetik)
- `SPRING_PROFILES_ACTIVE`: Profile Spring Boot yang aktif

## Cara Menjalankan

### Frontend
```bash
cd sistem-hrd
npm install
npm run dev
```

### Backend
```bash
cd sistem-padud
./mvnw spring-boot:run
```

## Keamanan

1. **Jangan commit file `.env` atau `.env.local` ke repository**
2. **Gunakan secret key yang kuat untuk JWT_SECRET di production**
3. **Ganti password database default di production**
4. **Gunakan HTTPS di production**

## Production Deployment

Untuk production, pastikan untuk:

1. Mengatur `NODE_ENV=production` di frontend
2. Mengatur `SPRING_PROFILES_ACTIVE=production` di backend
3. Menggunakan database yang aman dan terpisah
4. Menggunakan secret key yang kuat untuk JWT
5. Mengaktifkan HTTPS
6. Mengatur firewall dan security group yang tepat 