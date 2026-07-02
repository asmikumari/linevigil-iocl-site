const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  try {
    console.log('Connecting to database...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Schema initialized successfully');

    // Seed Pipelines
    const { rows: pipeRows } = await pool.query('SELECT count(*) FROM pipeline_routes');
    if (parseInt(pipeRows[0].count) === 0) {
      const pipelines = [
        { name: 'IOCL-PL-01 (Mathura-Jalandhar)', type: 'product', coords: [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50], [76.50, 31.00]] },
        { name: 'IOCL-PL-02 (Koyali-Sanganer)', type: 'crude', coords: [[73.18, 22.30], [73.50, 23.50], [74.50, 25.50], [75.80, 26.90]] },
        { name: 'IOCL-PL-03 (Paradip-Haldia)', type: 'gas', coords: [[86.67, 20.27], [87.50, 21.50], [88.20, 22.50]] }
      ];
      for (const pl of pipelines) {
        const lineString = `LINESTRING(${pl.coords.map(c => `${c[0]} ${c[1]}`).join(',')})`;
        await pool.query('INSERT INTO pipeline_routes (name, type, geom) VALUES ($1, $2, ST_GeomFromText($3, 4326))', [pl.name, pl.type, lineString]);
      }
      console.log('Seed pipelines added');
    }

    // Seed Sample Users
    const { rows: userRows } = await pool.query('SELECT count(*) FROM users');
    if (parseInt(userRows[0].count) === 0) {
      const password = await bcrypt.hash('password123', 10);
      const users = [
        { name: 'Admin User', email: 'admin@linevigil.com', role: 'admin' },
        { name: 'Patrol Officer 1', email: 'patrol@linevigil.com', role: 'patrol' },
        { name: 'Contractor User', email: 'contractor@linevigil.com', role: 'contractor' },
        { name: 'Patrol Officer 2', email: 'patrol2@linevigil.com', role: 'patrol' }
      ];
      for (const u of users) {
        await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [u.name, u.email, password, u.role]);
      }
      console.log('Sample users seeded');
    }

    // Seed some sample requests if empty
    const { rows: reqRows } = await pool.query('SELECT count(*) FROM excavation_requests');
    if (parseInt(reqRows[0].count) === 0) {
      const { rows: contractor } = await pool.query("SELECT id FROM users WHERE role = 'contractor' LIMIT 1");
      const { rows: patrol1 } = await pool.query("SELECT id FROM users WHERE email = 'patrol@linevigil.com' LIMIT 1");
      const { rows: patrol2 } = await pool.query("SELECT id FROM users WHERE email = 'patrol2@linevigil.com' LIMIT 1");
      if (contractor.length > 0) {
        const point1 = 'POINT(77.12 28.58)';
        const point2 = 'POINT(73.50 23.10)';
        const point3 = 'POINT(77.20 28.60)';
        const patrol1Id = patrol1.length > 0 ? patrol1[0].id : null;
        const patrol2Id = patrol2.length > 0 ? patrol2[0].id : null;
        await pool.query(`
          INSERT INTO excavation_requests 
          (contractor_id, contractor_name, company_name, work_date, purpose, location, risk_level, distance_to_pipeline, status, assigned_to)
          VALUES 
          ($1, 'ABC Infra', 'Buildwell Ltd.', '2026-06-12', 'Road Construction', ST_GeomFromText($2, 4326), 'high', 120, 'pending', NULL),
          ($1, 'KMC Projects', 'KMC Infra', '2026-06-11', 'Sewer Line', ST_GeomFromText($3, 4326), 'medium', 650, 'assigned', $4),
          ($1, 'KMC Projects', 'Delhi Roads', '2026-06-14', 'Water Pipeline', ST_GeomFromText($5, 4326), 'high', 250, 'assigned', $6)
        `, [contractor[0].id, point1, point2, patrol1Id, point3, patrol2Id]);
        console.log('Sample excavation requests seeded');
      }
    }

    // Seed Imagery Detections
    const { rows: imgRows } = await pool.query('SELECT count(*) FROM imagery_detections');
    if (parseInt(imgRows[0].count) === 0) {
      await pool.query(`
        INSERT INTO imagery_detections (name, confidence, risk_level, location)
        VALUES 
        ('CAT-320 Heavy Excavator', 0.94, 'high', ST_GeomFromText('POINT(77.15 28.62)', 4326)),
        ('Soil Displacement Anomaly', 0.81, 'medium', ST_GeomFromText('POINT(73.45 23.25)', 4326)),
        ('Unauthorized Backhoe Loader', 0.88, 'high', ST_GeomFromText('POINT(77.40 28.95)', 4326)),
        ('Deep Trench Anomaly', 0.75, 'low', ST_GeomFromText('POINT(87.20 21.15)', 4326))
      `);
      console.log('Sample imagery detections seeded');
    }

    // Seed Patrol Telemetry Tracks
    const { rows: patrolTracksRows } = await pool.query('SELECT count(*) FROM patrol_tracks');
    if (parseInt(patrolTracksRows[0].count) === 0) {
      const { rows: patrolUsers } = await pool.query("SELECT id FROM users WHERE role = 'patrol' LIMIT 1");
      if (patrolUsers.length > 0) {
        const patrolId = patrolUsers[0].id;
        await pool.query(`
          INSERT INTO patrol_tracks (patrol_id, location, is_offline, battery_level, signal_strength)
          VALUES 
          ($1, ST_GeomFromText('POINT(77.67 27.49)', 4326), false, 95, 'excellent'),
          ($1, ST_GeomFromText('POINT(77.58 28.00)', 4326), false, 92, 'good'),
          ($1, ST_GeomFromText('POINT(77.52 28.30)', 4326), true, 89, 'poor'),
          ($1, ST_GeomFromText('POINT(77.50 28.50)', 4326), false, 85, 'excellent')
        `, [patrolId]);
        console.log('Sample patrol telemetry tracks seeded');
      }
    }

    // Seed CGD Geographical Area Target Telemetry
    const { rows: cgdRows } = await pool.query('SELECT count(*) FROM cgd_ga_telemetry');
    if (parseInt(cgdRows[0].count) === 0) {
      const cgdData = [
        [1, "1.03", "Mathura", "Mathura District", "Torrent Gas Private Limited", "11-Jun-09", "30-Jun-14", "65000", "17758", "5", "13", "347", "397", 27.4924, 77.6737],
        [2, "1.06", "Meerut", "Meerut District", "GAIL Gas Limited", "12-Jun-09", "30-Jun-14", "125000", "58221", "5", "22", "643", "1285", 28.9845, 77.7064],
        [3, "2.02", "Allahabad", "Allahabad District", "Indian-Oil Adani Gas Private Limited", "08-May-13", "30-Jun-18", "225000", "22641", "NA", "9", "480", "534", 25.4358, 81.8463],
        [4, "2.03", "Jhansi", "Jhansi District", "Central UP Gas Limited", "26-Feb-14", "31-Mar-19", "23706", "26306", "NA", "10", "72", "111", 25.4484, 78.5685],
        [5, "6.02", "Saharanpur District", "Saharanpur District", "Bharat Petroleum Corporation Limited", "11-May-16", "30-Jun-23", "29883", "29884", "NA", "16", "1342", "1373", 29.9680, 77.5460],
        [6, "8.05", "Bulandshahr (Part) District", "Bulandshahr District", "Indian-Oil Adani Gas Private Limited", "06-Mar-18", "31-Mar-25", "16026", "13799", "NA", "20", "759", "909", 28.4069, 77.8498],
        [7, "8.06", "Bagpat District", "Bagpat District", "Bagpat Green Energy Private Limited", "28-Mar-18", "31-Mar-25", "10496", "5409", "NA", "13", "650", "607", 28.9515, 77.2736],
        [8, "9.76", "Bulandshahr District (EAAA), Aligarh & Hathras Districts", "Aligarh, Bulandshahr and Hathras District", "Indian Oil-Adani Gas Private Limited", "24-Sep-18", "30-Sep-28", "143404", "4631", "46", "25", "1662", "953", 27.8974, 78.0880],
        [9, "9.77", "Allahabad District (EAAA), Bhadohi & Kaushambi Districts", "Allahabad , Bhadohi & Kaushambi District", "Indian Oil-Adani Gas Private Limited", "13-Sep-18", "30-Sep-28", "58658", "6511", "24", "19", "680", "390", 25.2630, 82.4841],
        [10, "9.78", "Amethi, Pratapgarh & Raebareli Districts", "Amethi, Pratapgarh & Raebareli District", "Bharat Petroleum Corporation Limited", "10-Aug-18", "30-Sep-28", "18169", "5866", "20", "33", "385", "227", 26.1553, 81.2400],
        [11, "9.79", "Auraiya, Kanpur Dehat & Etawah Districts", "Auraiya, Kanpur Dehat & Etawah District", "Torrent Gas Private Limited", "13-Sep-18", "30-Sep-28", "118800", "10318", "27", "36", "1602", "982", 26.4674, 79.5186],
        [12, "9.8", "Faizabad & Sultanpur Districts", "Faizabad&Sultanpur District", "Green Gas Limited", "24-Sep-18", "30-Sep-28", "4000", "2005", "4", "9", "350", "894", 26.7766, 82.1384],
        [13, "9.81", "Gorakhpur, SantKabir Nagar & Kushinagar Districts", "Gorakhpur, SantKabir Nagar & Kushinagar District", "Torrent Gas Private Limited", "13-Sep-18", "30-Sep-29", "178200", "10001", "36", "29", "5814", "1255", 26.7606, 83.3731],
        [14, "9.82", "Meerut District (EAAA), Muzaffarnagar&Shamli Districts", "Meerut District, Muzaffarnagar & Shamli District", "Indraprastha Gas Limited", "13-Sep-18", "30-Sep-28", "105543", "53949", "36", "38", "1755", "1804", 29.4727, 77.7085],
        [15, "9.83", "Moradabad (EAAA) District", "Moradabad District", "Torrent Gas Private Limited", "13-Sep-18", "30-Sep-28", "154800", "13093", "27", "20", "792", "472", 28.8386, 78.7733],
        [16, "9.84", "Unnao (EAAA) District", "Unnao District", "Green Gas Limited", "24-Sep-18", "30-Sep-28", "3000", "663", "2", "2", "150", "136", 26.5393, 80.4878],
        [17, "10.31", "Jhansi (EAAA) District, Bhind, Jalaun, Lalitpur and Datia Districts", "Jhansi, Bhind, Jalaun, Lalitpur and Datia District", "Adani Total Gas Limited", "29-Mar-19", "31-Mar-29", "66059", "0", "17", "14", "941", "83", 25.6889, 78.9131],
        [18, "10.36", "Azamgarh, Mau and Ballia Districts", "Azamgarh, Mau & Ballia District", "Torrent Gas Private Limited", "29-Mar-19", "30-Sep-29", "100800", "9726", "40", "26", "1008", "636", 26.0734, 83.1852],
        [19, "10.37", "Bareilly (EAAA) District, Pilibhit and Rampur Districts", "Bareilly, Pilibhit and Rampur District", "Hindustan Petroleum Corporation Limited", "29-Mar-19", "31-Mar-29", "145000", "14500", "140", "56", "1200", "1055", 28.3670, 79.4304],
        [20, "10.38", "Basti and Ambedkarnagar Districts", "Basti & Ambedkarnagar District", "Torrent Gas Private Limited", "29-Mar-19", "30-Sep-29", "35100", "5529", "18", "15", "207", "245", 26.7892, 82.5539],
        [21, "10.39", "Farrukhabad, Etah and Hardoi Districts", "Farrukhabad, Etah & Hardoi District", "Hindustan Petroleum Corporation Limited", "29-Mar-19", "31-Mar-29", "98000", "14571", "75", "51", "1200", "1169", 27.3828, 79.6200],
        [22, "10.4", "Gonda and Barabanki Districts", "Gonda & Barabanki District", "Torrent Gas Private Limited", "29-Mar-19", "31-Mar-29", "111600", "6344", "36", "26", "756", "1233", 26.9248, 81.1967],
        [23, "10.41", "Jaunpur and Ghazipur Districts", "Jaunpur & Ghazipur District", "Indian Oil-Adani Gas Private Limited", "24-Apr-19", "30-Jun-29", "77033", "5328", "38", "17", "875", "270", 25.7464, 82.6837],
        [24, "10.42", "Kanpur (EAAA) District, Fatehpur and Hamirpur Districts", "Kanpur, Fatehpur & HamirpurDistrict", "Indraprastha Gas Limited", "29-Mar-19", "31-Mar-29", "144000", "46472", "45", "28", "1170", "1613", 25.9326, 80.8222],
        [25, "10.43", "Mainpuri and Kannauj Districts", "Mainpuri & Kannauj District", "Hindustan Petroleum Corporation Limited", "29-Mar-19", "31-Mar-29", "60000", "12258", "45", "33", "972", "996", 27.1121, 79.6800],
        [26, "10.44", "Mirzapur, Chandauli and Sonbhadra Districts", "Mirzapur, Chandauli & Sonbhadra District", "GAIL Gas Limited", "29-Mar-19", "31-Mar-29", "151001", "9184", "51", "24", "400", "489", 24.7865, 83.0645],
        [27, "10.45", "Shahjahanpur and Budaun Districts", "Shahjahanpur & Budaun District", "Hindustan Petroleum Corporation Limited", "29-Mar-19", "31-Mar-29", "125000", "15930", "75", "43", "950", "564", 27.8797, 79.9169],
        [28, "10.46", "Bijnor and Nainital Districts", "Bijnor & Nainital District", "Hindustan Petroleum Corporation Limited", "29-Mar-19", "31-Mar-31", "150000", "6165", "46", "25", "NA", "855", 29.3713, 78.1362],
        [29, "11.07", "Gopalganj, Siwan, West Champaran, East Champaran and Deoria Districts", "Gopalganj, Siwan, West Champaran, East Champaran & Deoria district", "Bharat Petroleum Corporation Limited", "04-May-22", "30-Jun-30", "202200", "10060", "13", "9", "828", "416", 26.2235, 84.3562],
        [30, "11.58", "Amroha (except area already authorized) & Sambhal (Except Area Already Authorized) districts", "Amroha & Sambhal (except area already authorized) districts", "Megha City Gas Distribution Private Limited", "04-May-22", "30-Jun-30", "657000", "0", "99", "7", "1440", "22", 28.7892, 78.5685],
        [31, "11.59", "Kasganj District", "Kasganj District", "Megha City Gas Distribution Private Limited", "04-May-22", "30-Jun-30", "252000", "0", "45", "4", "1530", "0", 27.8090, 78.6471],
        [32, "11.63", "Banda, Chitrakoot and Mahoba", "Banda, Chitrakoot & Mahoba District", "Indraprastha Gas Limited", "13-Apr-22", "30-Jun-30", "150006", "17586", "102", "19", "2325", "793", 25.2630, 80.6471],
        [33, "97.06", "Varanasi District", "Varanasi District", "GAIL (India) Limited", "07-Mar-18", "31-Mar-25", "40211", "92464", "NA", "30", "1899", "2565", 25.3176, 82.9739],
        [34, "98.01", "Khurja", "Bulandshahr District", "Adani Total Gas Limited", "04-Dec-12", "31-Dec-17", "25100", "14676", "NA", "10", "260", "646", 28.2530, 77.8542],
        [35, "98.03", "Moradabad", "Moradabad District", "Torrent Gas Moradabad Limited", "30-Nov-12", "31-Dec-17", "127000", "34030", "NA", "8", "654", "393", 28.8386, 78.7733],
        [36, "99.03", "Bareilly", "Bareilly District", "Central UP Gas Limited", "22-Apr-09", "30-Jun-14", "27500", "56319", "NA", "21", "356", "348", 28.3670, 79.4304],
        [37, "99.04", "Kanpur", "Kanpur District", "Central UP Gas Limited", "22-Apr-09", "30-Jun-14", "70035", "126897", "NA", "57", "569", "785", 26.4499, 80.3319],
        [38, "99.1", "Agra", "Agra District", "Green Gas Limited", "12-Nov-09", "31-Mar-14", "22000", "118003", "NA", "31", "388", "651", 27.1767, 78.0081],
        [39, "99.13", "Firozabad (Taj Trapezium Zone)", "Aligarh, Bharatpur, Firozabad, Hathras & Mathura District", "GAIL Gas Limited", "26-Sep-11", "25-Aug-14", "19200", "14694", "NA", "37", "808", "1365", 27.1513, 78.3958],
        [40, "99.17", "Lucknow", "Lucknow District", "Green Gas Limited", "15-Mar-16", "31-Mar-23", "494186", "132464", "NA", "46", "2543", "796", 26.8467, 80.9462],
        [41, "99.19", "Ghaziabad & Hapur Districts", "Ghaziabad & Hapur District", "Indraprastha Gas Limited", "06-Sep-19", "31-Dec-26", "324792", "378987", "NA", "79", "1920", "3199", 28.6692, 77.4538],
        [42, "99.2", "Noida (including Greater Noida)", "Goutam Buddh Nagar District", "Indraprastha Gas Limited", "25-Apr-23", "30-Jun-28", "499144", "398216", "NA", "73", "664", "9814", 28.5355, 77.3910],
        [43, "11A.01", "LakhimpurKheri, Sitapur, Bahraich, Shrawasti, Balrampur, Siddharth Nagar & Maharajganj Districts", "Bahraich, Balrampur, LakhimpurKheri, Maharajganj, Shrawasti, Siddharth Nagar &Sitapur District", "Bharat Petroleum Corporation Limited", "08-Jun-22", "30-Jun-30", "5069648", "16918", "421", "58", "5060", "294", 27.5750, 80.8250]
      ];

      for (const row of cgdData) {
        await pool.query(`
          INSERT INTO cgd_ga_telemetry 
          (sl_no, ga_id, ga_name, district_covered, authorized_entity, date_authorisation, date_target_completion, 
           png_connections_mwp_target, png_connections_achievement, cng_stations_mwp_target, cng_stations_achievement, 
           pipeline_mwp_target, pipeline_achievement, lat, lng)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, row);
      }
      console.log('Seeded CGD Geographical Area Target Telemetry data successfully');
    }

    console.log('Database Seeding Completed Successfully');
  } catch (err) {
    console.error('Error initializing DB:', err.message);
  } finally {
    await pool.end();
  }
};

initDb();
