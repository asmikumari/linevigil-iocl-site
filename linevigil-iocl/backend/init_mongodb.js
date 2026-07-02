const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/linevigil';

const mockDb = {
  users: [
    { id: 1, name: 'Admin User', email: 'admin@linevigil.com', password: bcrypt.hashSync('password123', 10), role: 'admin' },
    { id: 2, name: 'Patrol Officer 1', email: 'patrol@linevigil.com', password: bcrypt.hashSync('password123', 10), role: 'patrol' },
    { id: 3, name: 'Contractor User', email: 'contractor@linevigil.com', password: bcrypt.hashSync('password123', 10), role: 'contractor' },
    { id: 4, name: 'Patrol Officer 2', email: 'patrol2@linevigil.com', password: bcrypt.hashSync('password123', 10), role: 'patrol' }
  ],
  pipelines: [
    { id: 1, name: 'IOCL-PL-01 (Mathura-Jalandhar)', type: 'product', geom: { type: 'LineString', coordinates: [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50], [76.50, 31.00]] } },
    { id: 2, name: 'IOCL-PL-02 (Koyali-Sanganer)', type: 'crude', geom: { type: 'LineString', coordinates: [[73.18, 22.30], [73.50, 23.50], [74.50, 25.50], [75.80, 26.90]] } },
    { id: 3, name: 'IOCL-PL-03 (Paradip-Haldia)', type: 'gas', geom: { type: 'LineString', coordinates: [[86.67, 20.27], [87.50, 21.50], [88.20, 22.50]] } }
  ],
  excavation_requests: [
    { id: 1, contractor_id: 3, contractor_name: 'ABC Infra', company_name: 'Buildwell Ltd.', work_date: '2026-06-12', purpose: 'Road Construction', status: 'pending', risk_level: 'high', distance_to_pipeline: 120.5, location: { type: 'Point', coordinates: [77.12, 28.58] }, assigned_to: null, checked_in: false, check_in_time: null, created_at: new Date() },
    { id: 2, contractor_id: 3, contractor_name: 'KMC Projects', company_name: 'KMC Infra', work_date: '2026-06-11', purpose: 'Sewer Line', status: 'assigned', risk_level: 'medium', distance_to_pipeline: 650.2, location: { type: 'Point', coordinates: [73.50, 23.10] }, assigned_to: 2, checked_in: false, check_in_time: null, created_at: new Date() },
    { id: 3, contractor_id: 3, contractor_name: 'KMC Projects', company_name: 'Delhi Roads', work_date: '2026-06-14', purpose: 'Water Pipeline', status: 'assigned', risk_level: 'high', distance_to_pipeline: 250.0, location: { type: 'Point', coordinates: [77.20, 28.60] }, assigned_to: 4, checked_in: false, check_in_time: null, created_at: new Date() }
  ],
  imagery_detections: [
    { id: 1, name: 'CAT-320 Heavy Excavator', confidence: 0.94, risk_level: 'high', location: { type: 'Point', coordinates: [77.15, 28.62] }, detected_at: new Date() },
    { id: 2, name: 'Soil Displacement Anomaly', confidence: 0.81, risk_level: 'medium', location: { type: 'Point', coordinates: [73.45, 23.25] }, detected_at: new Date() },
    { id: 3, name: 'Unauthorized Backhoe Loader', confidence: 0.88, risk_level: 'high', location: { type: 'Point', coordinates: [77.40, 28.95] }, detected_at: new Date() },
    { id: 4, name: 'Deep Trench Anomaly', confidence: 0.75, risk_level: 'low', location: { type: 'Point', coordinates: [87.20, 21.15] }, detected_at: new Date() }
  ],
  patrol_tracks: [
    { id: 1, patrol_id: 2, location: { type: 'Point', coordinates: [77.67, 27.49] }, is_offline: false, battery_level: 95, signal_strength: 'excellent', recorded_at: new Date() },
    { id: 2, patrol_id: 2, location: { type: 'Point', coordinates: [77.58, 28.00] }, is_offline: false, battery_level: 92, signal_strength: 'good', recorded_at: new Date() },
    { id: 3, patrol_id: 2, location: { type: 'Point', coordinates: [77.52, 28.30] }, is_offline: true, battery_level: 89, signal_strength: 'poor', recorded_at: new Date() },
    { id: 4, patrol_id: 2, location: { type: 'Point', coordinates: [77.50, 28.50] }, is_offline: false, battery_level: 85, signal_strength: 'excellent', recorded_at: new Date() }
  ],
  cgd_ga_telemetry: [
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
  ].map(row => ({
    sl_no: row[0],
    ga_id: row[1],
    ga_name: row[2],
    district_covered: row[3],
    authorized_entity: row[4],
    date_authorisation: row[5],
    date_target_completion: row[6],
    png_connections_mwp_target: row[7],
    png_connections_achievement: row[8],
    cng_stations_mwp_target: row[9],
    cng_stations_achievement: row[10],
    pipeline_mwp_target: row[11],
    pipeline_achievement: row[12],
    location: { type: 'Point', coordinates: [row[14], row[13]] } // [lng, lat]
  }))
};

async function seed() {
  let mongoServer;
  let client;
  let effectiveUri = mongoUri;

  try {
    client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`Connecting to MongoDB at ${mongoUri}...`);

    try {
      await client.connect();
      effectiveUri = mongoUri;
      console.log(`Connected to local MongoDB at ${effectiveUri}`);
    } catch (err) {
      console.warn(`Local MongoDB not available at ${mongoUri}; starting temporary fallback...`);
      mongoServer = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
      effectiveUri = mongoServer.getUri('linevigil');
      client = new MongoClient(effectiveUri, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      console.log(`Started temporary MongoDB at ${effectiveUri}`);
    }

    const db = client.db();

    // Clear collections
    const collections = ['users', 'pipeline_routes', 'excavation_requests', 'verification_logs', 'imagery_detections', 'patrol_tracks', 'cgd_ga_telemetry'];
    for (const collName of collections) {
      try {
        await db.collection(collName).drop();
        console.log(`Cleared collection: ${collName}`);
      } catch (err) {
        // collection might not exist
      }
    }

    // Seed Users
    await db.collection('users').insertMany(mockDb.users);
    console.log('Seeded Users.');

    // Seed Pipelines
    await db.collection('pipeline_routes').insertMany(mockDb.pipelines);
    await db.collection('pipeline_routes').createIndex({ geom: '2dsphere' });
    console.log('Seeded Pipelines and created 2dsphere index on geom.');

    // Seed Excavation Requests
    await db.collection('excavation_requests').insertMany(mockDb.excavation_requests);
    await db.collection('excavation_requests').createIndex({ location: '2dsphere' });
    console.log('Seeded Excavation Requests and created 2dsphere index on location.');

    // Seed Imagery Detections
    await db.collection('imagery_detections').insertMany(mockDb.imagery_detections);
    await db.collection('imagery_detections').createIndex({ location: '2dsphere' });
    console.log('Seeded Imagery Detections and created 2dsphere index on location.');

    // Seed Patrol Tracks
    await db.collection('patrol_tracks').insertMany(mockDb.patrol_tracks);
    await db.collection('patrol_tracks').createIndex({ location: '2dsphere' });
    console.log('Seeded Patrol Tracks and created 2dsphere index on location.');

    // Seed CGD Telemetry
    await db.collection('cgd_ga_telemetry').insertMany(mockDb.cgd_ga_telemetry);
    await db.collection('cgd_ga_telemetry').createIndex({ location: '2dsphere' });
    console.log('Seeded CGD Telemetry and created 2dsphere index on location.');

    console.log('🎉 MongoDB Initialization completed successfully!');
  } catch (err) {
    console.error('❌ Error during seeding:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

seed();
