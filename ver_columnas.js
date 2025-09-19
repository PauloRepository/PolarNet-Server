const db = require('./src/infrastructure/database');

(async () => {
  try {
    console.log('=== ESTRUCTURA DE TABLAS ===\n');
    
    // Equipments
    const equipments = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'equipments' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas de la tabla equipments:');
    equipments.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Equipment locations
    console.log('\nColumnas de la tabla equipment_locations:');
    const locations = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'equipment_locations' 
      ORDER BY ordinal_position
    `);
    
    locations.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
})();
