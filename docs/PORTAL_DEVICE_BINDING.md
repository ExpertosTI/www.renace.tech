# Portal device binding

`POST /api/sso/generate-token` accepts an optional `device_id` from the native
Capacitor portal. On the first successful authentication, the server stores a
SHA-256 hash in `portal_device_bindings` for the portal user and company.

Subsequent SSO attempts with another identifier receive HTTP `403` and:

```json
{ "error": "Ya está vinculada a otro dispositivo" }
```

The database table is created by `initDB()` at application startup. Deploy the
web/API changes before distributing an APK that sends `device_id`.

This checkout does not contain an `android/` project or
`docs/RENACE-Portal-android.apk`; native fullscreen and back-navigation changes
must be built from the Android source checkout that produces the APK.