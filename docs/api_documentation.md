# LineVigil API reference

Base path: `/api`. Requests and responses are JSON. Every route except sign-in, sign-up, health and pipelines needs a token from `POST /api/auth/login`, sent as:

```
Authorization: Bearer <token>
```

Tokens expire after 24 hours.

## Errors

Every error has the same shape. `details` appears on validation errors and names the field that failed.

```json
{ "error": "Check the highlighted fields", "details": { "workDate": "Choose the work date" } }
```

| Status | Meaning |
| --- | --- |
| 400 | The body is missing a field, has an invalid value or is not valid JSON |
| 401 | No token, or the token is invalid or expired. The client should sign in again |
| 403 | Signed in, but this role cannot perform the action |
| 404 | The permit or route does not exist |
| 409 | An account with that email already exists |
| 413 | The body is larger than 1 MB |
| 429 | Too many sign-in attempts. Wait for the `Retry-After` seconds |

## Risk rule

Each location is measured to the nearest pipeline centreline (geodesic distance, in metres). The same rule is used for permits, the live site check, simulated detections and patrol proximity alerts.

| Distance | Risk |
| --- | --- |
| Under 500 m | `high` |
| 500 m to 1 km | `medium` |
| Over 1 km | `low` |

## Health

`GET /api/health` (no token)

```json
{ "status": "ok", "database": "mongodb", "riskThresholdsMetres": { "high": 500, "medium": 1000 }, "time": "2026-10-23T09:00:00.000Z" }
```

`database` is `demo-memory` when the API is running on the built-in demo dataset.

## Auth

| Method and path | Who | Body | Returns |
| --- | --- | --- | --- |
| `POST /auth/signup` | Anyone | `name` (2+ characters), `email`, `password` (8+ characters) | `201` with the new user. Sign-up always creates a **contractor**; admins and patrol officers are created by an admin |
| `POST /auth/login` | Anyone | `email`, `password` | `{ token, user: { id, name, email, role } }` |

Both are limited to 10 attempts per minute per IP address.

## Excavation permits

| Method and path | Who | Body | Returns |
| --- | --- | --- | --- |
| `POST /excavations` | Contractor, admin | `lng`, `lat`, `companyName`, `workDate`, `purpose`, optional `contractorName` | `201` with the permit, including `distance_to_pipeline`, `risk_level` and `status: "pending"` |
| `POST /excavations/check-collision` | Any signed-in user | `lng`, `lat` | Distance, risk and any permits within 500 m (see below) |
| `GET /excavations` | Admin, patrol | | All permits |
| `GET /excavations/my` | Any signed-in user | | Permits filed by the current user |

`check-collision` response:

```json
{
  "distanceToPipeline": 342.7,
  "pipelineName": "Mathura-Delhi Product Pipeline",
  "riskLevel": "high",
  "collisionStatus": "danger",
  "thresholdsMetres": { "high": 500, "medium": 1000 },
  "overlappingPermits": []
}
```

`collisionStatus` is `danger`, `warning` or `safe` for high, medium and low risk.

Permit status moves from `pending` to `assigned` (a patrol officer is dispatched) to `Safe to Dig` (the officer verified the site).

## Pipelines

`GET /api/pipelines` (no token) returns a GeoJSON `FeatureCollection` of pipeline routes as `LineString` features.

## Patrol

| Method and path | Who | Body | Returns |
| --- | --- | --- | --- |
| `GET /patrol/tasks` | Patrol | | Permits assigned to the current officer |
| `POST /patrol/check-in` | Patrol (assigned officer) | `requestId` | Records arrival at the site |
| `POST /patrol/verify` | Patrol (assigned officer), admin | `requestId`, optional `notes`, `photoUrl` | Saves the verification and sets the permit to `Safe to Dig` |
| `GET /patrol/my-verifications` | Patrol | | The officer's own verifications |
| `GET /patrol/verifications` | Admin | | Every verification on record |
| `POST /patrol/assign` | Admin | `requestId`, `patrolId` | Assigns an officer. `patrolId` must belong to a patrol account |
| `GET /patrol/users` | Admin | | Patrol officers |
| `GET /patrol/tracks` | Admin, patrol | | Recorded GPS points |
| `POST /patrol/sync-tracks` | Patrol | `tracks`: up to 500 points | Stores GPS points recorded while offline (see below) |
| `POST /patrol/report-incident` | Patrol, admin | `lng`, `lat`, optional `name`, `riskLevel` | `201` with the incident, which is also broadcast to admins |

### Offline sync

Each point the patrol app records gets a `client_id` (a UUID made on the device). The server stores at most one point per officer and `client_id`, so if a sync request is retried after a dropped connection, nothing is recorded twice.

Request:

```json
{
  "tracks": [
    { "client_id": "1f0c…", "lng": 77.41, "lat": 28.53, "recorded_at": "2026-10-23T08:12:00Z", "is_offline": true, "battery_level": 64 }
  ]
}
```

Response:

```json
{
  "message": "Synced 1 new point",
  "synced": 1,
  "duplicates": 0,
  "rejected": [],
  "tracks": [ { "id": 41, "client_id": "1f0c…", "lng": 77.41, "lat": 28.53, "…": "…" } ],
  "alerts": []
}
```

`rejected` lists the index and reason for any point with invalid coordinates or a bad timestamp; the rest of the batch is still stored. `alerts` lists points that were under 500 m from a pipeline.

## Imagery

| Method and path | Who | Body | Returns |
| --- | --- | --- | --- |
| `GET /imagery/detections` | Any signed-in user | | Detections and field reports |
| `POST /imagery/scan` | Admin | | `201` with one **simulated** detection |

No satellite imagery provider is connected. `scan` places a test detection up to 1.5 km either side of a real pipeline route, measures its true distance and sets its risk with the rule above. Simulated detections carry `"source": "simulated-satellite"` and `"simulated": true`, so they can never be mistaken for real data.

## CGD telemetry

`GET /api/cgd/telemetry` (admin) returns city gas distribution geographic areas for the network view.

## Socket.IO

The server runs Socket.IO on the same origin as the API.

| Event | Direction | Payload |
| --- | --- | --- |
| `send-message` | Client to server | A chat message object (up to 4 KB). Relayed to every other client as `receive-message` |
| `receive-message` | Server to client | The relayed chat message |
| `new-anomalies` | Server to client | An array of new detections or field reports |
| `patrol-collision-alerts` | Server to client | An array of proximity alerts from synced patrol points |

Chat messages are relayed live and not stored.
