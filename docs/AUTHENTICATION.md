# Authentication

This document describes the authentication endpoints used in the Employee Management System.
It covers login, logout, and password management.

---

## Base URL

```text
/auth
```

---

## Authentication Flow

- The user logs in using email and password.
- An access token (JWT or session) is issued.
- Protected routes require the token in the request header.
- The user can log out or change their password.

---

## Endpoints Overview

| Method | Route | Description |
|------|------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| POST | `/auth/change-password` | Change password |
| POST | `/auth/forgot-password` | Reset password |

---

## POST `/auth/login`

Authenticates a user and returns an access token.

### Request Body

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Success Response — `200 OK`

```json
{
  "token": "jwt-access-token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "employee"
  }
}
```

### Error Responses

- `400 Bad Request` – Missing or invalid fields
- `401 Unauthorized` – Invalid credentials

---

## POST `/auth/logout`

Logs out the authenticated user.

### Headers

```text
Authorization: Bearer <access_token>
```

### Success Response — `200 OK`

```json
{
  "message": "User logged out successfully"
}
```

---

## POST `/auth/change-password`

Allows an authenticated user to change their password.

### Headers

```text
Authorization: Bearer <access_token>
```

### Request Body

```json
{
  "current_password": "oldPassword123",
  "new_password": "newSecurePassword456"
}
```

### Success Response — `200 OK`

```json
{
  "message": "Password changed successfully"
}
```

### Error Responses

- `400 Bad Request` – Incorrect current password
- `401 Unauthorized` – Invalid or missing token

---

## POST `/auth/forgot-password`

Initiates the password reset process.

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Success Response — `200 OK`

```json
{
  "message": "Password reset instructions sent to email"
}
```

> **Note:**  
> The reset process will use one-time password (OTP)

---

## Authentication Headers

All protected routes must include the following header:

```text
Authorization: Bearer <access_token>
```

---

## Security Notes

- Passwords must be hashed before storage.
- Access tokens should have an expiration time.
- Login and password reset routes should be rate-limited.
- Always use HTTPS in production.


