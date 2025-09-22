/**
 * Use Case: Provider Maintenance Management
 * Gestiona las operaciones de mantenimiento para PROVIDER
 */
class ProviderMaintenanceUseCase {
  constructor(maintenanceRepository, equipmentRepository, clientRepository, userRepository) {
    this.maintenanceRepository = maintenanceRepository;
    this.equipmentRepository = equipmentRepository;
    this.clientRepository = clientRepository;
    this.userRepository = userRepository;
  }

  /**
   * Obtener lista de mantenimientos con filtros
   * @param {string} providerId - ID del proveedor
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Object} Lista de mantenimientos con paginación
   */
  async getMaintenances(providerId, filters) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = '',
        type = '',
        priority = '',
        technicianId = '',
        equipmentId = '',
        dateFrom = '',
        dateTo = '',
        sortBy = 'scheduledDate',
        sortOrder = 'desc'
      } = filters;

      // Construir condiciones de filtro
      const whereConditions = [`e.owner_company_id = ?`];
      const params = [providerId];

      if (search) {
        whereConditions.push(`(
          m.title ILIKE ? OR 
          m.description ILIKE ? OR 
          e.name ILIKE ? OR
          c.name ILIKE ?
        )`);
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (status) {
        whereConditions.push('m.status = ?');
        params.push(status);
      }

      if (type) {
        whereConditions.push('m.type = ?');
        params.push(type);
      }

      if (priority) {
        whereConditions.push('m.priority = ?');
        params.push(priority);
      }

      if (technicianId) {
        whereConditions.push('m.technician_id = ?');
        params.push(technicianId);
      }

      if (equipmentId) {
        whereConditions.push('m.equipment_id = ?');
        params.push(equipmentId);
      }

      if (dateFrom) {
        whereConditions.push('m.scheduled_date >= ?');
        params.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push('m.scheduled_date <= ?');
        params.push(dateTo);
      }

      const whereClause = whereConditions.join(' AND ');
      const orderClause = `ORDER BY m.${sortBy} ${sortOrder.toUpperCase()}`;

      // Consulta principal con JOIN para obtener datos relacionados
      const query = `
        SELECT 
          m.*,
          e.name as equipment_name,
          e.type as equipment_type,
          e.model as equipment_model,
          e.serial_number,
          u.first_name || ' ' || u.last_name as technician_name,
          u.email as technician_email,
          u.phone as technician_phone,
          c.name as client_company_name,
          c.contact_person as client_contact_person,
          loc.name as location_name,
          loc.address as location_address
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        LEFT JOIN users u ON m.technician_id = u.user_id
        LEFT JOIN companies c ON e.current_location_company_id = c.company_id
        LEFT JOIN locations loc ON e.current_location_id = loc.location_id
        WHERE ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;

      const offset = (page - 1) * limit;
      params.push(limit, offset);

      const maintenances = await this.maintenanceRepository.executeQuery(query, params);

      // Consulta para contar total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        WHERE ${whereClause}
      `;

      const countParams = params.slice(0, -2); // Remover limit y offset
      const countResult = await this.maintenanceRepository.executeQuery(countQuery, countParams);
      const total = parseInt(countResult[0]?.total || 0);

      return {
        data: maintenances,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in ProviderMaintenanceUseCase.getMaintenances:', error);
      throw new Error('Error al obtener los mantenimientos');
    }
  }

  /**
   * Obtener detalles completos de un mantenimiento
   * @param {string} providerId - ID del proveedor
   * @param {string} maintenanceId - ID del mantenimiento
   * @returns {Object} Datos completos del mantenimiento
   */
  async getMaintenanceDetails(providerId, maintenanceId) {
    try {
      // Verificar que el mantenimiento pertenece al proveedor
      const maintenance = await this.maintenanceRepository.findByIdAndProvider(maintenanceId, providerId);
      
      if (!maintenance) {
        throw new Error('Mantenimiento no encontrado');
      }

      // Obtener datos del equipo
      const equipment = await this.equipmentRepository.findById(maintenance.equipmentId);

      // Obtener datos del técnico
      let technician = null;
      if (maintenance.technicianId) {
        technician = await this.userRepository.findById(maintenance.technicianId);
      }

      // Obtener datos del cliente
      let client = null;
      if (equipment?.currentLocationCompanyId) {
        client = await this.clientRepository.findById(equipment.currentLocationCompanyId);
      }

      // Obtener partes utilizadas
      const parts = await this.maintenanceRepository.getMaintenanceParts(maintenanceId);

      // Obtener registros de trabajo
      const workLogs = await this.maintenanceRepository.getMaintenanceWorkLogs(maintenanceId);

      // Obtener fotos
      const photos = await this.maintenanceRepository.getMaintenancePhotos(maintenanceId);

      return {
        maintenance,
        equipment,
        technician,
        client,
        parts,
        workLogs,
        photos
      };
    } catch (error) {
      console.error('Error in ProviderMaintenanceUseCase.getMaintenanceDetails:', error);
      throw new Error(error.message || 'Error al obtener los detalles del mantenimiento');
    }
  }

  /**
   * Crear nuevo mantenimiento
   * @param {string} providerId - ID del proveedor
   * @param {Object} maintenanceData - Datos del mantenimiento
   * @returns {Object} Mantenimiento creado
   */
  async createMaintenance(providerId, maintenanceData) {
    try {
      const {
        equipmentId,
        type,
        title,
        description,
        priority = 'MEDIUM',
        scheduledDate,
        estimatedDuration,
        technicianId,
        estimatedCost = 0,
        preMaintenanceChecks = '',
        maintenanceSteps = '',
        postMaintenanceChecks = '',
        safetyPrecautions = '',
        createdBy
      } = maintenanceData;

      // Validar que el equipo pertenece al proveedor
      const equipment = await this.equipmentRepository.findByIdAndProvider(equipmentId, providerId);
      if (!equipment) {
        throw new Error('Equipo no encontrado');
      }

      // Validar técnico si se proporciona
      if (technicianId) {
        const technician = await this.userRepository.findByIdAndCompany(technicianId, providerId);
        if (!technician) {
          throw new Error('Técnico no encontrado');
        }
      }

      // Crear el mantenimiento
      const newMaintenance = {
        equipmentId,
        type,
        title,
        description,
        priority,
        status: 'SCHEDULED',
        scheduledDate,
        estimatedDuration: parseFloat(estimatedDuration || 0),
        technicianId,
        estimatedCost: parseFloat(estimatedCost),
        preMaintenanceChecks,
        maintenanceSteps,
        postMaintenanceChecks,
        safetyPrecautions,
        createdBy,
        createdAt: new Date().toISOString()
      };

      const maintenanceId = await this.maintenanceRepository.create(newMaintenance);
      
      // Obtener el mantenimiento creado con datos relacionados
      return await this.getMaintenanceDetails(providerId, maintenanceId);
    } catch (error) {
      console.error('Error in ProviderMaintenanceUseCase.createMaintenance:', error);
      throw new Error(error.message || 'Error al crear el mantenimiento');
    }
  }

  /**
   * Actualizar mantenimiento
   * @param {string} providerId - ID del proveedor
   * @param {string} maintenanceId - ID del mantenimiento
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object} Mantenimiento actualizado
   */
  async updateMaintenance(providerId, maintenanceId, updateData) {
    try {
      // Verificar que el mantenimiento pertenece al proveedor
      const maintenance = await this.maintenanceRepository.findByIdAndProvider(maintenanceId, providerId);
      
      if (!maintenance) {
        throw new Error('Mantenimiento no encontrado');
      }

      // Validar técnico si se cambia
      if (updateData.technicianId && updateData.technicianId !== maintenance.technicianId) {
        const technician = await this.userRepository.findByIdAndCompany(updateData.technicianId, providerId);
        if (!technician) {
          throw new Error('Técnico no encontrado');
        }
      }

      // Preparar datos de actualización
      const allowedFields = [
        'title', 'description', 'priority', 'scheduledDate', 'estimatedDuration',
        'technicianId', 'estimatedCost', 'preMaintenanceChecks', 'maintenanceSteps',
        'postMaintenanceChecks', 'safetyPrecautions', 'status'
      ];

      const filteredData = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          filteredData[key] = updateData[key];
        }
      });

      if (Object.keys(filteredData).length === 0) {
        throw new Error('No hay datos válidos para actualizar');
      }

      filteredData.updatedAt = new Date().toISOString();

      await this.maintenanceRepository.update(maintenanceId, filteredData);
      
      // Retornar mantenimiento actualizado
      return await this.getMaintenanceDetails(providerId, maintenanceId);
    } catch (error) {
      console.error('Error in ProviderMaintenanceUseCase.updateMaintenance:', error);
      throw new Error(error.message || 'Error al actualizar el mantenimiento');
    }
  }

  /**
   * Iniciar mantenimiento
   * @param {string} providerId - ID del proveedor
   * @param {string} maintenanceId - ID del mantenimiento
   * @param {Object} startData - Datos de inicio
   * @returns {Object} Mantenimiento actualizado
   */
  async startMaintenance(providerId, maintenanceId, startData) {
    try {
      const { startedBy, notes = '', actualStartTime } = startData;

      const maintenance = await this.maintenanceRepository.findByIdAndProvider(maintenanceId, providerId);
      
      if (!maintenance) {
        throw new Error('Mantenimiento no encontrado');
      }

      if (maintenance.status !== 'SCHEDULED') {
        throw new Error('Solo se pueden iniciar mantenimientos programados');
      }

      const updateData = {
        status: 'IN_PROGRESS',
        actualStartTime: actualStartTime || new Date().toISOString(),
        startedBy,
        startNotes: notes,
        updatedAt: new Date().toISOString()
      };

      await this.maintenanceRepository.update(maintenanceId, updateData);
      
      // Crear registro de trabajo inicial
      await this.maintenanceRepository.createWorkLog({
        maintenanceId,
        activity: 'MAINTENANCE_STARTED',
        description: `Mantenimiento iniciado. ${notes}`,
        timestamp: updateData.actualStartTime,
        technicianId: startData.startedBy,
        duration: 0,
        status: 'PRODUCTIVE'
      });

      return await this.getMaintenanceDetails(providerId, maintenanceId);
    } catch (error) {
      console.error('Error in ProviderMaintenanceUseCase.startMaintenance:', error);
      throw new Error(error.message || 'Error al iniciar el mantenimiento');
    }
  }

  /**
   * Completar mantenimiento
   * @param {string} providerId - ID del proveedor
   * @param {string} maintenanceId - ID del mantenimiento
   * @param {Object} completionData - Datos de finalización
   * @returns {Object} Mantenimiento completado
   */
  async completeMaintenance(providerId, maintenanceId, completionData) {
    try {
      const {
        completedBy,
        workPerformed,
        issuesFound = '',
        recommendations = '',
        actualCost = 0,
        laborCost = 0,
        partsCost = 0,
        nextMaintenanceDate = null,
        completionNotes = ''
      } = completionData;

      const maintenance = await this.maintenanceRepository.findByIdAndProvider(maintenanceId, providerId);
      
      if (!maintenance) {
        throw new Error('Mantenimiento no encontrado');
      }

      if (maintenance.status !== 'IN_PROGRESS') {
        throw new Error('Solo se pueden completar mantenimientos en progreso');
      }

      const completionTime = new Date().toISOString();

      const updateData = {
        status: 'COMPLETED',
        completedDate: completionTime,
        actualEndTime: completionTime,
        completedBy,
        workPerformed,
        issuesFound,
        recommendations,
        actualCost: parseFloat(actualCost),
        laborCost: parseFloat(laborCost),
        partsCost: parseFloat(partsCost),
        nextMaintenanceDate,
        completionNotes,
        updatedAt: completionTime
      };

      await this.maintenanceRepository.update(maintenanceId, updateData);
      
      // Crear registro de trabajo final
      await this.maintenanceRepository.createWorkLog({
        maintenanceId,
        activity: 'MAINTENANCE_COMPLETED',
        description: `Mantenimiento completado. ${completionNotes}`,
        timestamp: completionTime,
        technicianId: completedBy,
        duration: 0,
        status: 'PRODUCTIVE'
      });

      // Actualizar fecha de último mantenimiento del equipo
      await this.equipmentRepository.update(maintenance.equipmentId, {
        lastMaintenanceDate: completionTime,
        updatedAt: completionTime
      });

      return await this.getMaintenanceDetails(providerId, maintenanceId);
    } catch (error) {
      console.error('Error in ProviderMaintenanceUseCase.completeMaintenance:', error);
      throw new Error(error.message || 'Error al completar el mantenimiento');
    }
  }

  /**
   * Obtener estadísticas de mantenimientos
   * @param {string} providerId - ID del proveedor
   * @param {Object} filters - Filtros para estadísticas
   * @returns {Object} Estadísticas de mantenimientos
   */
  async getMaintenanceStatistics(providerId, filters) {
    try {
      const { period = '12months', type = '', technicianId = '' } = filters;

      // Calcular fechas del período
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '12months':
        default:
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Construir condiciones
      const whereConditions = [`e.owner_company_id = ?`];
      const params = [providerId];

      if (type) {
        whereConditions.push('m.type = ?');
        params.push(type);
      }

      if (technicianId) {
        whereConditions.push('m.technician_id = ?');
        params.push(technicianId);
      }

      whereConditions.push('m.created_at >= ?');
      params.push(startDate.toISOString());

      const whereClause = whereConditions.join(' AND ');

      // Consulta de estadísticas generales
      const statsQuery = `
        SELECT 
          COUNT(*) as total_maintenances,
          COUNT(CASE WHEN m.status = 'SCHEDULED' THEN 1 END) as scheduled_maintenances,
          COUNT(CASE WHEN m.status = 'IN_PROGRESS' THEN 1 END) as in_progress_maintenances,
          COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) as completed_maintenances,
          COUNT(CASE WHEN m.status = 'SCHEDULED' AND m.scheduled_date < NOW() THEN 1 END) as overdue_maintenances,
          AVG(CASE WHEN m.status = 'COMPLETED' AND m.actual_start_time IS NOT NULL AND m.actual_end_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (m.actual_end_time - m.actual_start_time))/3600 END) as average_completion_time,
          AVG(CASE WHEN m.status = 'COMPLETED' THEN m.actual_cost END) as average_cost_per_maintenance,
          SUM(CASE WHEN m.status = 'COMPLETED' THEN m.actual_cost ELSE 0 END) as total_costs,
          AVG(CASE WHEN m.status = 'COMPLETED' THEN 
            CASE WHEN m.estimated_cost > 0 THEN (m.actual_cost / m.estimated_cost) * 100 ELSE 100 END 
          END) as cost_efficiency,
          COUNT(CASE WHEN m.status = 'COMPLETED' AND m.actual_end_time <= m.scheduled_date + INTERVAL '1 day' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END), 0) as on_time_completion
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        WHERE ${whereClause}
      `;

      const stats = await this.maintenanceRepository.executeQuery(statsQuery, params);

      // Estadísticas de tipos de mantenimiento
      const typeStatsQuery = `
        SELECT 
          m.type,
          COUNT(*) as count,
          AVG(CASE WHEN m.status = 'COMPLETED' THEN m.actual_cost END) as avg_cost
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        WHERE ${whereClause}
        GROUP BY m.type
        ORDER BY count DESC
      `;

      const typeStats = await this.maintenanceRepository.executeQuery(typeStatsQuery, params);

      // Tendencias mensuales
      const trendQuery = `
        SELECT 
          DATE_TRUNC('month', m.created_at) as month,
          COUNT(*) as total,
          COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) as completed,
          SUM(CASE WHEN m.status = 'COMPLETED' THEN m.actual_cost ELSE 0 END) as revenue
        FROM maintenances m
        INNER JOIN equipments e ON m.equipment_id = e.equipment_id
        WHERE ${whereClause}
        GROUP BY DATE_TRUNC('month', m.created_at)
        ORDER BY month DESC
        LIMIT 12
      `;

      const trends = await this.maintenanceRepository.executeQuery(trendQuery, params);

      return {
        ...stats[0],
        typeBreakdown: typeStats,
        monthlyTrends: trends,
        period,
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in ProviderMaintenanceUseCase.getMaintenanceStatistics:', error);
      throw new Error('Error al obtener las estadísticas de mantenimientos');
    }
  }

  /**
   * Programar mantenimientos automáticos
   * @param {string} providerId - ID del proveedor
   * @param {Object} scheduleData - Datos de programación
   * @returns {Array} Mantenimientos programados
   */
  async scheduleAutomaticMaintenances(providerId, scheduleData) {
    try {
      const { equipmentIds = [], maintenanceType, interval, startDate } = scheduleData;

      const scheduledMaintenances = [];

      for (const equipmentId of equipmentIds) {
        // Verificar que el equipo pertenece al proveedor
        const equipment = await this.equipmentRepository.findByIdAndProvider(equipmentId, providerId);
        if (!equipment) {
          continue; // Saltar equipos que no pertenecen al proveedor
        }

        // Calcular próximas fechas de mantenimiento
        const scheduleDate = new Date(startDate);
        
        const maintenanceData = {
          equipmentId,
          type: maintenanceType,
          title: `${maintenanceType} programado - ${equipment.name}`,
          description: `Mantenimiento ${maintenanceType.toLowerCase()} programado automáticamente cada ${interval}`,
          priority: 'MEDIUM',
          scheduledDate: scheduleDate.toISOString().split('T')[0],
          estimatedDuration: this.getEstimatedDurationByType(maintenanceType),
          estimatedCost: this.getEstimatedCostByType(maintenanceType),
          createdBy: 'SYSTEM'
        };

        const maintenance = await this.createMaintenance(providerId, maintenanceData);
        scheduledMaintenances.push(maintenance);
      }

      return scheduledMaintenances;
    } catch (error) {
      console.error('Error in ProviderMaintenanceUseCase.scheduleAutomaticMaintenances:', error);
      throw new Error('Error al programar mantenimientos automáticos');
    }
  }

  // Métodos auxiliares

  /**
   * Obtener duración estimada por tipo de mantenimiento
   * @param {string} type - Tipo de mantenimiento
   * @returns {number} Duración en horas
   */
  getEstimatedDurationByType(type) {
    const durations = {
      'PREVENTIVE': 4,
      'CORRECTIVE': 6,
      'PREDICTIVE': 2,
      'EMERGENCY': 8,
      'ROUTINE': 2,
      'OVERHAUL': 24
    };

    return durations[type] || 4;
  }

  /**
   * Obtener costo estimado por tipo de mantenimiento
   * @param {string} type - Tipo de mantenimiento
   * @returns {number} Costo estimado
   */
  getEstimatedCostByType(type) {
    const costs = {
      'PREVENTIVE': 50000,
      'CORRECTIVE': 100000,
      'PREDICTIVE': 30000,
      'EMERGENCY': 150000,
      'ROUTINE': 25000,
      'OVERHAUL': 300000
    };

    return costs[type] || 50000;
  }
}

module.exports = ProviderMaintenanceUseCase;
