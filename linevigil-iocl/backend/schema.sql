-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'contractor', -- 'admin', 'patrol', 'contractor'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pipeline Routes Table
CREATE TABLE IF NOT EXISTS pipeline_routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50), -- 'crude', 'product', 'gas'
    geom GEOMETRY(LineString, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Excavation Requests Table
CREATE TABLE IF NOT EXISTS excavation_requests (
    id SERIAL PRIMARY KEY,
    contractor_id INTEGER REFERENCES users(id),
    contractor_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    work_date DATE NOT NULL,
    purpose TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'assigned', 'verified', 'closed'
    risk_level VARCHAR(20), -- 'high', 'medium', 'low'
    distance_to_pipeline FLOAT,
    location GEOMETRY(Point, 4326),
    assigned_to INTEGER REFERENCES users(id), -- patrol team user id
    checked_in BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification Logs
CREATE TABLE IF NOT EXISTS verification_logs (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES excavation_requests(id),
    patrol_id INTEGER REFERENCES users(id),
    photo_url TEXT,
    notes TEXT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Imagery Detections
CREATE TABLE IF NOT EXISTS imagery_detections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    confidence FLOAT NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    location GEOMETRY(Point, 4326),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patrol Telemetry Tracking
CREATE TABLE IF NOT EXISTS patrol_tracks (
    id SERIAL PRIMARY KEY,
    patrol_id INTEGER REFERENCES users(id),
    location GEOMETRY(Point, 4326),
    is_offline BOOLEAN DEFAULT FALSE,
    battery_level INTEGER,
    signal_strength VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Indexes
CREATE INDEX IF NOT EXISTS pipeline_routes_geom_idx ON pipeline_routes USING GIST (geom);
CREATE INDEX IF NOT EXISTS excavation_requests_location_idx ON excavation_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS imagery_detections_location_idx ON imagery_detections USING GIST (location);
CREATE INDEX IF NOT EXISTS patrol_tracks_location_idx ON patrol_tracks USING GIST (location);

-- CGD Geographical Area Target Telemetry
CREATE TABLE IF NOT EXISTS cgd_ga_telemetry (
    id SERIAL PRIMARY KEY,
    sl_no INT NOT NULL,
    ga_id VARCHAR(50) NOT NULL,
    ga_name VARCHAR(255) NOT NULL,
    district_covered VARCHAR(255) NOT NULL,
    authorized_entity VARCHAR(255) NOT NULL,
    date_authorisation VARCHAR(100) NOT NULL,
    date_target_completion VARCHAR(100) NOT NULL,
    png_connections_mwp_target VARCHAR(100),
    png_connections_achievement VARCHAR(100),
    cng_stations_mwp_target VARCHAR(100),
    cng_stations_achievement VARCHAR(100),
    pipeline_mwp_target VARCHAR(100),
    pipeline_achievement VARCHAR(100),
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

