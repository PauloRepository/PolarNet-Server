const ResponseHandler = require('../../../../shared/helpers/responseHandler');
const db = require('../../../../infrastructure/database/index');

class CompanyController {
  // GET /api/provider/company - Obtener datos de la empresa
  async getCompany(req, res) {
    try {
      const { providerCompanyId } = req.user;

      const query = `
        SELECT 
          c.*,
          COUNT(DISTINCT u.user_id) as total_users,
          COUNT(DISTINCT el.equipment_location_id) as total_locations,
          COUNT(DISTINCT e.equipment_id) as total_equipments,
          COUNT(DISTINCT ar.rental_id) as active_rentals
        FROM companies c
        LEFT JOIN users u ON c.company_id = u.company_id AND u.is_active = true
        LEFT JOIN equipment_locations el ON c.company_id = el.company_id
        LEFT JOIN equipments e ON c.company_id = e.owner_company_id
        LEFT JOIN active_rentals ar ON c.company_id = ar.provider_company_id AND ar.status = 'ACTIVE'
        WHERE c.company_id = $1
        GROUP BY c.company_id
      `;

      const result = await db.query(query, [providerCompanyId]);
      
      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Empresa no encontrada', 'COMPANY_NOT_FOUND', 404);
      }

      const company = result.rows[0];

      return ResponseHandler.success(res, {
        company: {
          companyId: company.company_id.toString(),
          name: company.name,
          type: company.type,
          taxId: company.tax_id,
          phone: company.phone,
          email: company.email,
          address: company.address,
          city: company.city,
          state: company.state,
          postalCode: company.postal_code,
          country: company.country,
          website: company.website,
          description: company.description,
          logoUrl: company.logo_url,
          businessType: company.business_type,
          specialization: company.specialization,
          isActive: company.is_active,
          createdAt: company.created_at,
          stats: {
            totalUsers: parseInt(company.total_users),
            totalLocations: parseInt(company.total_locations),
            totalEquipments: parseInt(company.total_equipments),
            activeRentals: parseInt(company.active_rentals)
          }
        }
      }, 'Datos de empresa obtenidos exitosamente');

    } catch (error) {
      console.error('Error en getCompany:', error);
      return ResponseHandler.error(res, 'Error al obtener datos de la empresa', 'GET_COMPANY_ERROR', 500);
    }
  }

  // PUT /api/provider/company - Actualizar datos de empresa
  async updateCompany(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const {
        name, phone, email, address, city, state, postalCode,
        website, description, businessType, specialization
      } = req.body;

      const updateQuery = `
        UPDATE companies SET
          name = $1,
          phone = $2,
          email = $3,
          address = $4,
          city = $5,
          state = $6,
          postal_code = $7,
          website = $8,
          description = $9,
          business_type = $10,
          specialization = $11,
          updated_at = NOW()
        WHERE company_id = $12
        RETURNING *
      `;

      const values = [
        name, phone, email, address, city, state, postalCode,
        website, description, businessType, specialization, providerCompanyId
      ];

      const result = await db.query(updateQuery, values);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Empresa no encontrada', 'COMPANY_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        company: result.rows[0]
      }, 'Empresa actualizada exitosamente');

    } catch (error) {
      console.error('Error en updateCompany:', error);
      return ResponseHandler.error(res, 'Error al actualizar empresa', 'UPDATE_COMPANY_ERROR', 500);
    }
  }

  // GET /api/provider/company/locations - Obtener ubicaciones de la empresa
  async getLocations(req, res) {
    try {
      const { providerCompanyId } = req.user;

      const query = `
        SELECT 
          el.*,
          COUNT(DISTINCT e.equipment_id) as equipment_count
        FROM equipment_locations el
        LEFT JOIN equipments e ON el.equipment_location_id = e.current_location_id
        WHERE el.company_id = $1
        GROUP BY el.equipment_location_id
        ORDER BY el.created_at DESC
      `;

      const result = await db.query(query, [providerCompanyId]);

      const locations = result.rows.map(location => ({
        locationId: location.equipment_location_id.toString(),
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        postalCode: location.postal_code,
        country: location.country,
        lat: location.lat ? parseFloat(location.lat) : null,
        lng: location.lng ? parseFloat(location.lng) : null,
        contactPerson: location.contact_person,
        contactPhone: location.contact_phone,
        contactEmail: location.contact_email,
        equipmentCount: parseInt(location.equipment_count),
        createdAt: location.created_at
      }));

      return ResponseHandler.success(res, {
        locations,
        totalLocations: locations.length
      }, 'Ubicaciones obtenidas exitosamente');

    } catch (error) {
      console.error('Error en getLocations:', error);
      return ResponseHandler.error(res, 'Error al obtener ubicaciones', 'GET_LOCATIONS_ERROR', 500);
    }
  }

  // POST /api/provider/company/locations - Agregar nueva ubicación
  async createLocation(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const {
        name, address, city, state, postalCode, country = 'Chile',
        lat, lng, contactPerson, contactPhone, contactEmail
      } = req.body;

      const insertQuery = `
        INSERT INTO equipment_locations (
          name, address, city, state, postal_code, country,
          lat, lng, contact_person, contact_phone, contact_email, company_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        name, address, city, state, postalCode, country,
        lat, lng, contactPerson, contactPhone, contactEmail, providerCompanyId
      ];

      const result = await db.query(insertQuery, values);

      return ResponseHandler.success(res, {
        location: result.rows[0]
      }, 'Ubicación creada exitosamente');

    } catch (error) {
      console.error('Error en createLocation:', error);
      return ResponseHandler.error(res, 'Error al crear ubicación', 'CREATE_LOCATION_ERROR', 500);
    }
  }

  // PUT /api/provider/company/locations/:id - Actualizar ubicación
  async updateLocation(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;
      const {
        name, address, city, state, postalCode, country,
        lat, lng, contactPerson, contactPhone, contactEmail
      } = req.body;

      const updateQuery = `
        UPDATE equipment_locations SET
          name = $1, address = $2, city = $3, state = $4, postal_code = $5,
          country = $6, lat = $7, lng = $8, contact_person = $9,
          contact_phone = $10, contact_email = $11
        WHERE equipment_location_id = $12 AND company_id = $13
        RETURNING *
      `;

      const values = [
        name, address, city, state, postalCode, country,
        lat, lng, contactPerson, contactPhone, contactEmail, id, providerCompanyId
      ];

      const result = await db.query(updateQuery, values);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Ubicación no encontrada', 'LOCATION_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        location: result.rows[0]
      }, 'Ubicación actualizada exitosamente');

    } catch (error) {
      console.error('Error en updateLocation:', error);
      return ResponseHandler.error(res, 'Error al actualizar ubicación', 'UPDATE_LOCATION_ERROR', 500);
    }
  }

  // DELETE /api/provider/company/locations/:id - Eliminar ubicación
  async deleteLocation(req, res) {
    try {
      const { providerCompanyId } = req.user;
      const { id } = req.params;

      // Verificar si hay equipos en esta ubicación
      const equipmentCheck = await db.query(
        'SELECT COUNT(*) as count FROM equipments WHERE current_location_id = $1',
        [id]
      );

      if (parseInt(equipmentCheck.rows[0].count) > 0) {
        return ResponseHandler.error(res, 'No se puede eliminar. Hay equipos en esta ubicación', 'LOCATION_HAS_EQUIPMENTS', 400);
      }

      const deleteQuery = `
        DELETE FROM equipment_locations 
        WHERE equipment_location_id = $1 AND company_id = $2
        RETURNING *
      `;

      const result = await db.query(deleteQuery, [id, providerCompanyId]);

      if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Ubicación no encontrada', 'LOCATION_NOT_FOUND', 404);
      }

      return ResponseHandler.success(res, {
        deletedLocation: result.rows[0]
      }, 'Ubicación eliminada exitosamente');

    } catch (error) {
      console.error('Error en deleteLocation:', error);
      return ResponseHandler.error(res, 'Error al eliminar ubicación', 'DELETE_LOCATION_ERROR', 500);
    }
  }
}

module.exports = new CompanyController();
