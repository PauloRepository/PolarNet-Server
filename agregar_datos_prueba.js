/**
 * 🛠️ SCRIPT PARA AGREGAR MÁS DATOS DE PRUEBA
 * Esto creará más equipos y alquileres para hacer las pruebas más interesantes
 */

const db = require('./src/infrastructure/database');

async function agregarDatosPrueba() {
  try {
    console.log('🚀 AGREGANDO MÁS DATOS DE PRUEBA...\n');

    // 1. Crear más equipos
    console.log('📦 Agregando más equipos...');
    const equipos = [
      {
        name: 'Refrigerador Industrial Mediano',
        type: 'REFRIGERATOR',
        category: 'INDUSTRIAL',
        model: 'REF-MED-2024',
        serial_number: 'RF24-2024-001',
        manufacturer: 'FrioCorp',
        optimal_temperature: 2,
        min_temperature: -5,
        max_temperature: 10,
        power_watts: 2200,
        description: 'Refrigerador industrial de tamaño mediano para restaurantes',
        status: 'AVAILABLE',
        owner_company_id: 2,
        rental_price_daily: 15000,
        rental_price_monthly: 450000
      },
      {
        name: 'Congelador Vertical Grande',
        type: 'FREEZER',
        category: 'INDUSTRIAL',
        model: 'FRZ-VER-2024',
        serial_number: 'FZ24-2024-002',
        manufacturer: 'ArcticPro',
        optimal_temperature: -20,
        min_temperature: -25,
        max_temperature: -15,
        power_watts: 3500,
        description: 'Congelador vertical de gran capacidad para carnicerías',
        status: 'AVAILABLE',
        owner_company_id: 2,
        rental_price_daily: 25000,
        rental_price_monthly: 750000
      },
      {
        name: 'Cámara Frigorífica Móvil',
        type: 'COLD_ROOM',
        category: 'PORTABLE',
        model: 'CAM-MOV-2024',
        serial_number: 'CM24-2024-003',
        manufacturer: 'ColdTech',
        optimal_temperature: 4,
        min_temperature: 0,
        max_temperature: 8,
        power_watts: 5000,
        description: 'Cámara frigorífica móvil para eventos y transporte',
        status: 'RENTED',
        owner_company_id: 2,
        rental_price_daily: 35000,
        rental_price_monthly: 1050000
      }
    ];

    for (const equipo of equipos) {
      const result = await db.query(`
        INSERT INTO equipments (
          name, type, category, model, serial_number, manufacturer, 
          optimal_temperature, min_temperature, max_temperature,
          power_watts, description, status, owner_company_id,
          rental_price_daily, rental_price_monthly
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING equipment_id, name
      `, [
        equipo.name, equipo.type, equipo.category, equipo.model, equipo.serial_number,
        equipo.manufacturer, equipo.optimal_temperature, equipo.min_temperature, equipo.max_temperature,
        equipo.power_watts, equipo.description, equipo.status, equipo.owner_company_id,
        equipo.rental_price_daily, equipo.rental_price_monthly
      ]);
      
      console.log(`   ✅ Creado: ${result.rows[0].name} (ID: ${result.rows[0].equipment_id})`);
    }

    // 2. Crear más empresas cliente
    console.log('\n🏢 Agregando más empresas cliente...');
    const empresasCliente = [
      {
        name: 'Restaurante El Buen Sabor Ltda.',
        email: 'contacto@elbuensabor.cl',
        phone: '+56987654321',
        type: 'CLIENT',
        description: 'Cadena de restaurantes especializada en comida chilena'
      },
      {
        name: 'Distribuidora FreshFood S.A.',
        email: 'ventas@freshfood.cl',
        phone: '+56976543210',
        type: 'CLIENT',
        description: 'Distribuidora de alimentos frescos y congelados'
      }
    ];

    const nuevasEmpresas = [];
    for (const empresa of empresasCliente) {
      const result = await db.query(`
        INSERT INTO companies (name, email, phone, type, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING company_id, name
      `, [empresa.name, empresa.email, empresa.phone, empresa.type, empresa.description]);
      
      nuevasEmpresas.push(result.rows[0]);
      console.log(`   ✅ Creada: ${result.rows[0].name} (ID: ${result.rows[0].company_id})`);
    }

    // 3. Crear ubicaciones de equipos
    console.log('\n📍 Agregando ubicaciones...');
    const ubicaciones = [
      {
        name: 'Restaurante Centro - Santiago',
        address: 'Av. Libertador Bernardo O´Higgins 1234, Santiago Centro',
        city: 'Santiago',
        country: 'Chile',
        lat: -33.4489,
        lng: -70.6693
      },
      {
        name: 'Bodega Distribución - Maipú',
        address: 'Av. Pajaritos 5678, Maipú',
        city: 'Santiago',
        country: 'Chile',
        lat: -33.5089,
        lng: -70.7667
      }
    ];

    const nuevasUbicaciones = [];
    for (const ubicacion of ubicaciones) {
      const result = await db.query(`
        INSERT INTO equipment_locations (name, address, city, country, lat, lng)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING equipment_location_id, name
      `, [ubicacion.name, ubicacion.address, ubicacion.city, ubicacion.country, ubicacion.lat, ubicacion.lng]);
      
      nuevasUbicaciones.push(result.rows[0]);
      console.log(`   ✅ Creada: ${result.rows[0].name} (ID: ${result.rows[0].equipment_location_id})`);
    }

    // 4. Crear alquileres activos
    console.log('\n🤝 Agregando alquileres activos...');
    
    // Obtener IDs de equipos recién creados
    const equiposDisponibles = await db.query(`
      SELECT equipment_id, name FROM equipments 
      WHERE status IN ('AVAILABLE', 'RENTED') AND equipment_id > 4
      ORDER BY equipment_id
    `);

    const alquileres = [
      {
        client_company_id: nuevasEmpresas[0].company_id, // Restaurante El Buen Sabor
        provider_company_id: 2, // FrioTech
        equipment_id: equiposDisponibles.rows[0]?.equipment_id || 5,
        current_location_id: nuevasUbicaciones[0].equipment_location_id,
        start_date: '2024-01-15',
        end_date: '2024-07-15',
        daily_rate: 15000,
        monthly_rate: 450000,
        status: 'ACTIVE'
      },
      {
        client_company_id: nuevasEmpresas[1].company_id, // Distribuidora FreshFood
        provider_company_id: 2, // FrioTech
        equipment_id: equiposDisponibles.rows[1]?.equipment_id || 6,
        current_location_id: nuevasUbicaciones[1].equipment_location_id,
        start_date: '2024-02-01',
        end_date: '2024-08-01',
        daily_rate: 25000,
        monthly_rate: 750000,
        status: 'ACTIVE'
      }
    ];

    for (const alquiler of alquileres) {
      const result = await db.query(`
        INSERT INTO active_rentals (
          client_company_id, provider_company_id, equipment_id, 
          current_location_id, start_date, end_date, 
          daily_rate, monthly_rate, status, payment_status,
          total_amount, contract_terms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CURRENT', $10, $11)
        RETURNING rental_id
      `, [
        alquiler.client_company_id, alquiler.provider_company_id, alquiler.equipment_id,
        alquiler.current_location_id, alquiler.start_date, alquiler.end_date,
        alquiler.daily_rate, alquiler.monthly_rate, alquiler.status,
        alquiler.monthly_rate * 6, // total_amount estimado
        'Contrato de alquiler estándar. Mantenimiento incluido.'
      ]);
      
      console.log(`   ✅ Alquiler creado (ID: ${result.rows[0].rental_id})`);
    }

    // 5. Crear usuarios para las nuevas empresas
    console.log('\n👥 Agregando usuarios para las nuevas empresas...');
    const bcrypt = require('bcrypt');
    
    const usuarios = [
      {
        name: 'Carlos Morales',
        username: 'carlos.restaurante',
        password: 'password123',
        email: 'carlos@elbuensabor.cl',
        phone: '+56987654321',
        role: 'CLIENT',
        company_id: nuevasEmpresas[0].company_id
      },
      {
        name: 'Ana Rodriguez',
        username: 'ana.distribuidora',
        password: 'password123',
        email: 'ana@freshfood.cl',
        phone: '+56976543210',
        role: 'CLIENT',
        company_id: nuevasEmpresas[1].company_id
      }
    ];

    for (const usuario of usuarios) {
      const hashedPassword = await bcrypt.hash(usuario.password, 10);
      const result = await db.query(`
        INSERT INTO users (name, username, password, email, phone, role, company_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING user_id, name
      `, [
        usuario.name, usuario.username, hashedPassword,
        usuario.email, usuario.phone, usuario.role, usuario.company_id
      ]);
      
      console.log(`   ✅ Usuario creado: ${result.rows[0].name} (ID: ${result.rows[0].user_id})`);
    }

    console.log('\n🎉 ¡DATOS DE PRUEBA AGREGADOS EXITOSAMENTE!');
    console.log('\n📊 RESUMEN:');
    
    const resumen = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM companies WHERE type = 'CLIENT') as empresas_cliente,
        (SELECT COUNT(*) FROM companies WHERE type = 'PROVIDER') as empresas_proveedor,
        (SELECT COUNT(*) FROM equipments) as total_equipos,
        (SELECT COUNT(*) FROM active_rentals WHERE status = 'ACTIVE') as alquileres_activos,
        (SELECT COUNT(*) FROM users) as total_usuarios
    `);

    const stats = resumen.rows[0];
    console.log(`   🏢 Empresas Cliente: ${stats.empresas_cliente}`);
    console.log(`   🏭 Empresas Proveedor: ${stats.empresas_proveedor}`);
    console.log(`   📦 Total Equipos: ${stats.total_equipos}`);
    console.log(`   🤝 Alquileres Activos: ${stats.alquileres_activos}`);
    console.log(`   👥 Total Usuarios: ${stats.total_usuarios}`);

    console.log('\n🔑 USUARIOS PARA PROBAR:');
    console.log('   1. carlos.restaurante / password123 (Empresa Restaurante)');
    console.log('   2. ana.distribuidora / password123 (Empresa Distribuidora)');

  } catch (error) {
    console.error('❌ Error agregando datos:', error.message);
  } finally {
    process.exit(0);
  }
}

agregarDatosPrueba();
