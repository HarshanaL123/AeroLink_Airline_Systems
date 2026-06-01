const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = new AWS.DynamoDB.DocumentClient();

const ENV = 'dev';
const USERS_TABLE = `AeroLink-Users-${ENV}`;
const FLIGHTS_TABLE = `AeroLink-Flights-${ENV}`;
const SEATS_TABLE = `AeroLink-Seats-${ENV}`;

async function batchWrite(tableName, items) {
  // DynamoDB allows max 25 items per BatchWriteItem
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [tableName]: chunk.map(item => ({
          PutRequest: { Item: item }
        }))
      }
    };
    await docClient.batchWrite(params).promise();
  }
}

async function seedDatabase() {
  console.log('🌱 Starting AeroLink Database Seeding...');
  const salt = await bcrypt.genSalt(10);
  
  // 1. SEED USERS
  console.log(`\n[1/3] Seeding Users to ${USERS_TABLE}...`);
  const adminPassword = await bcrypt.hash('awsadmin12@1', salt);
  const staffPassword = await bcrypt.hash('lakindu123@123', salt);
  const passengerPassword = await bcrypt.hash('passenger123', salt);

  const users = [
    { userId: uuidv4(), email: 'syosa920@gmail.com', passwordHash: adminPassword, role: 'admin', firstName: 'System', lastName: 'Admin', createdAt: new Date().toISOString() },
    { userId: uuidv4(), email: 'lakindumudannayaka@gmail.com', passwordHash: staffPassword, role: 'staff', firstName: 'Lakindu', lastName: 'Mudannayaka', createdAt: new Date().toISOString() },
  ];

  // Add 10 dummy passengers for load testing
  for (let i = 1; i <= 10; i++) {
    users.push({
      userId: uuidv4(),
      email: `passenger${i}@aerolink.com`,
      passwordHash: passengerPassword,
      role: 'passenger',
      firstName: `Test`,
      lastName: `Passenger${i}`,
      createdAt: new Date().toISOString()
    });
  }
  await batchWrite(USERS_TABLE, users);
  console.log(`✅ Successfully seeded ${users.length} Users.`);

  // 2. SEED FLIGHTS
  console.log(`\n[2/3] Seeding Flights to ${FLIGHTS_TABLE}...`);
  const flights = [
    { flightId: 'FL-CMB-DXB-001', routeDate: 'CMB-DXB#2026-06-10', flightNumber: 'AL101', departureAirport: 'CMB', arrivalAirport: 'DXB', departureDate: '2026-06-10T08:00:00Z', arrivalDate: '2026-06-10T12:00:00Z', status: 'SCHEDULED', price: 450, totalSeats: 60, availableSeats: 60, createdAt: new Date().toISOString() },
    { flightId: 'FL-LHR-JFK-002', routeDate: 'LHR-JFK#2026-06-11', flightNumber: 'AL102', departureAirport: 'LHR', arrivalAirport: 'JFK', departureDate: '2026-06-11T14:00:00Z', arrivalDate: '2026-06-11T17:30:00Z', status: 'SCHEDULED', price: 600, totalSeats: 60, availableSeats: 60, createdAt: new Date().toISOString() },
    { flightId: 'FL-DXB-JFK-003', routeDate: 'DXB-JFK#2026-06-12', flightNumber: 'AL103', departureAirport: 'DXB', arrivalAirport: 'JFK', departureDate: '2026-06-12T02:00:00Z', arrivalDate: '2026-06-12T08:00:00Z', status: 'SCHEDULED', price: 850, totalSeats: 60, availableSeats: 60, createdAt: new Date().toISOString() },
    { flightId: 'FL-SIN-SYD-004', routeDate: 'SIN-SYD#2026-06-15', flightNumber: 'AL104', departureAirport: 'SIN', arrivalAirport: 'SYD', departureDate: '2026-06-15T22:00:00Z', arrivalDate: '2026-06-16T08:00:00Z', status: 'SCHEDULED', price: 500, totalSeats: 60, availableSeats: 60, createdAt: new Date().toISOString() },
    { flightId: 'FL-CMB-SIN-005', routeDate: 'CMB-SIN#2026-06-16', flightNumber: 'AL105', departureAirport: 'CMB', arrivalAirport: 'SIN', departureDate: '2026-06-16T23:30:00Z', arrivalDate: '2026-06-17T06:00:00Z', status: 'SCHEDULED', price: 300, totalSeats: 60, availableSeats: 60, createdAt: new Date().toISOString() }
  ];
  await batchWrite(FLIGHTS_TABLE, flights);
  console.log(`✅ Successfully seeded ${flights.length} Flights.`);

  // 3. SEED SEATS
  console.log(`\n[3/3] Seeding Seats to ${SEATS_TABLE} (This may take a moment)...`);
  const seats = [];
  const rows = 10;
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];

  for (const flight of flights) {
    for (let row = 1; row <= rows; row++) {
      for (const col of cols) {
        const isBusiness = row <= 3;
        seats.push({
          flightId: flight.flightId,
          seatId: `${row}${col}`,
          status: 'AVAILABLE',
          class: isBusiness ? 'BUSINESS' : 'ECONOMY',
          priceMultiplier: isBusiness ? 2.0 : 1.0
        });
      }
    }
  }
  await batchWrite(SEATS_TABLE, seats);
  console.log(`✅ Successfully seeded ${seats.length} Seats.`);

  console.log('\n🎉 Master Database Seeding Complete! The system is fully populated and ready for load testing.');
}

seedDatabase().catch(err => {
  console.error('\n❌ Seeding failed:', err);
});
