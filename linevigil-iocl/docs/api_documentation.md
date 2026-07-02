# LineVigil Core API & WebSockets Documentation

This document provides a comprehensive specifications log of the backend REST APIs and Socket.IO interfaces for the **LineVigil ROW Protection Intelligence Suite**.

---

## 1. Authentication Service (`/api/auth`)

### 🔑 User Login
* **Endpoint:** `POST /api/auth/login`
* **Description:** Authenticates user credentials and returns a secure JWT token along with user telemetry metadata.
* **Request Headers:**
  * `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "email": "admin@linevigil.com",
    "password": "password123"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@linevigil.com",
      "role": "admin"
    }
  }
  ```
* **Error Response (401 Unauthorized):**
  ```json
  {
    "error": "Invalid email or password"
  }
  ```

---

## 2. Excavation Permits Service (`/api/excavations`)

### 📋 Get All Excavation Permit Requests
* **Endpoint:** `GET /api/excavations`
* **Description:** Retrieves all contractor excavation requests, including locations and pipeline safety clearances.
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "contractor_name": "ABC Infra",
      "company_name": "Buildwell Ltd.",
      "work_date": "2026-06-12",
      "purpose": "Road Construction",
      "status": "pending",
      "risk_level": "high",
      "distance_to_pipeline": 120.5,
      "lat": 28.58,
      "lng": 77.12,
      "assigned_to": null,
      "checked_in": false
    }
  ]
  ```

### 🛰️ Proximity Collision & Risk Validator
* **Endpoint:** `POST /api/excavations/check-collision`
* **Description:** Performs spatial proximity calculations (`$geoNear` index sweep) to determine boundary conflicts between a proposed excavation coordinate and IOCL pipeline centerlines.
* **Request Body:**
  ```json
  {
    "lat": 28.58,
    "lng": 77.12
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "collision": true,
    "distance_meters": 120.5,
    "risk_level": "high",
    "nearest_pipeline": "IOCL-PL-01 (Mathura-Jalandhar)",
    "message": "Proposed coordinates within 500m warning buffer zones"
  }
  ```

---

## 3. Pipeline Asset Service (`/api/pipelines`)

### 🗺️ Get Pipeline Route Geometry
* **Endpoint:** `GET /api/pipelines`
* **Description:** Fetches GeoJSON linestrings for all cross-country pipeline channels.
* **Success Response (200 OK):**
  ```json
  {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "id": 1,
          "name": "IOCL-PL-01 (Mathura-Jalandhar)",
          "type": "product"
        },
        "geometry": {
          "type": "LineString",
          "coordinates": [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50]]
        }
      }
    ]
  }
  ```

---

## 4. Field Patrol Service (`/api/patrol`)

### 📍 Fetch Patrol Telemetry Tracks
* **Endpoint:** `GET /api/patrol/tracks`
* **Description:** Obtains the latest GPS position tracking, network strength, and transmitter battery levels of active units.
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "patrol_id": 2,
      "lat": 27.4924,
      "lng": 77.6737,
      "is_offline": false,
      "battery_level": 95,
      "signal_strength": "excellent",
      "recorded_at": "2026-07-01T02:30:00Z"
    }
  ]
  ```

---

## 5. WebSockets Interface (Socket.IO — Port 5001)

### 💬 Client-Relayed Messages
* **Socket Event Listener:** `send-message`
* **Description:** Emitted when a user sends a chat message. The server broadcasts it to all other active clients.
* **Packet Structure:**
  ```json
  {
    "id": 1782828990000,
    "senderId": 2,
    "receiverId": 1,
    "sender": "P1",
    "text": "INSPECTION AT COORDINATE EXC-1002 COMPLETED.",
    "time": "02:34 AM",
    "system": false
  }
  ```

### 💬 Server-Broadcast Messages
* **Socket Event Dispatcher:** `receive-message`
* **Description:** Broadcasted by the backend server to relay incoming text segments to the recipient's UI tab.
* **Packet Structure:** Matches `send-message` structure.

### 🚨 Real-time Anomaly Broadcast
* **Socket Event Dispatcher:** `new-anomalies`
* **Description:** Pushed to the Admin Dashboard when satellite scans identify heavy machinery encroachment.
* **Packet Structure:**
  ```json
  [
    {
      "id": 12,
      "name": "CAT-320 Heavy Excavator",
      "confidence": 0.94,
      "risk_level": "high",
      "lat": 28.58,
      "lng": 77.12,
      "detected_at": "2026-07-01T02:32:00Z"
    }
  ]
  ```
