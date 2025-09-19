const db = require('./src/infrastructure/database');

async function checkEquipment() {
  try {
    console.log('=== EQUIPMENT ID 4 DEBUG ===');
    
    const basicQuery = await db.query('SELECT equipment_id, serial_number, status FROM equipments WHERE equipment_id = 4');
    console.log('Basic equipment 4 check:', basicQuery.rows);
    
    const rentalQuery = await db.query('SELECT * FROM active_rentals WHERE equipment_id = 4');
    console.log('Active rentals for equipment 4:', rentalQuery.rows);
    
    const clientRentals = await db.query('SELECT * FROM active_rentals WHERE client_company_id = 2');
    console.log('All rentals for client company 2:', clientRentals.rows.map(r => ({ equipment_id: r.equipment_id, status: r.status })));
    
    // Test the actual repository methods
    const PostgreSQLEquipmentRepository = require('./src/infrastructure/persistence/PostgreSQLEquipmentRepository');
    const repo = new PostgreSQLEquipmentRepository(db);
    
    console.log('\n=== REPOSITORY METHOD TESTS ===');
    
    const findByIdResult = await repo.findById(4);
    console.log('findById(4):', findByIdResult ? 'FOUND' : 'NULL');
    
    // Test with the actual client that has the rental (client 1)
    const isRentedResult1 = await repo.isRentedByClient(4, 1);
    console.log('isRentedByClient(4, 1):', isRentedResult1);
    
    const isRentedResult2 = await repo.isRentedByClient(4, 2);
    console.log('isRentedByClient(4, 2):', isRentedResult2);
    
    const rentedByClient1List = await repo.findRentedByClient(1);
    const equipment4InList1 = rentedByClient1List.find(eq => eq.id == 4);
    console.log('findRentedByClient(1) contains equipment 4:', equipment4InList1 ? 'YES' : 'NO');
    
    const rentedByClient2List = await repo.findRentedByClient(2);
    const equipment4InList2 = rentedByClient2List.find(eq => eq.id == 4);
    console.log('findRentedByClient(2) contains equipment 4:', equipment4InList2 ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('Database check error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkEquipment();
