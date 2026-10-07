# Mobile App

Expo / React Native student app in `mobile/`.

## Audience & features

The mobile app is the student client. Students:

- View the daily / weekly **menu**.
- Manage the **opt-out calendar** (skip meals before cutoff).
- View their **wallet** balance and transactions, and request cashouts.
- Read **notices** targeted to their hostel / role.
- Manage their **profile**.

Staff and admins do **not** use the mobile app — they are created
directly in the web console and sign in there.

## Stack

- Expo with `expo-router` file-based routing (`(auth)` and `(app)`
  route groups).
- `@tanstack/react-query` for data fetching/caching.
- `axios` client that attaches the JWT from `expo-secure-store` and
  logs out on 401.
- `react-native-qrcode-svg` for the student's meal QR.

## Environment

The API base URL comes from `EXPO_PUBLIC_API_URL` (or Expo config /
host IP), defaulting to `10.0.2.2:3000` on the Android emulator.

## Running

``` shell
cd mobile
npm install
npx expo start
```
