/**
 * Controller: Client Equipments Management
 * Handles CLIENT equipment operations using DDD architecture
 */
const ResponseHandler = require('../../../../shared/helpers/responseHandler');

class ClientEquipmentsController {
  constructor(container) {
    this.container = container;
    this.equipmentsUseCase = container.resolve('getClientEquipments');
    this.logger = container.resolve('logger');
  }

  /**
   * Get client equipments
   * GET /api/client/equipments
   */
  async getEquipments(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        type, 
        locationId,
        status,
        search 
      } = req.query;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting client equipments', { clientCompanyId, page, limit, type, locationId, status, search });

      // Get repositories
      const equipmentRepository = this.container.resolve('equipmentRepository');
      const temperatureRepository = this.container.resolve('temperatureReadingRepository');

      // Get equipments rented by client
      const equipments = await equipmentRepository.findRentedByClient(clientCompanyId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        locationId,
        status,
        search
      });

      // Get pagination info
      const totalEquipments = await equipmentRepository.countRentedByClient(clientCompanyId, {
        type,
        locationId,
        status,
        search
      });

      // Enrich equipments with current readings and alerts
      const enrichedEquipments = await Promise.all(equipments.map(async (equipment) => {
        // Get current temperature reading
        const currentReading = await temperatureRepository.getLatestByEquipment(equipment.id);
        
        // Get 24h alerts count
        const alerts24h = await temperatureRepository.countAlertsByEquipment(equipment.id, {
          dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000)
        });

        return {
          equipmentId: equipment && equipment.id != null ? equipment.id.toString() : null,
          name: equipment?.name,
          type: equipment.type,
          model: equipment.model,
          serialNumber: equipment.serialNumber,
          status: equipment.status,
          rental: typeof equipment.getRentalInfo === 'function' ? equipment.getRentalInfo() : equipment.rentalInfo || null,
          location: typeof equipment.getLocationInfo === 'function' ? equipment.getLocationInfo() : equipment.locationInfo || null,
          provider: typeof equipment.getProviderInfo === 'function' ? equipment.getProviderInfo() : equipment.providerInfo || null,
          currentReading: currentReading ? {
            temperature: currentReading.temperature,
            timestamp: currentReading.recordedAt,
            status: currentReading.alertStatus || 'NORMAL'
          } : null,
          alerts24h: alerts24h || 0,
          nextMaintenance: equipment.getNextMaintenanceDate(),
    specifications: equipment.technicalSpecs
        };
      }));

      // Get available types for filters
      const availableTypes = await equipmentRepository.getAvailableTypesByClient(clientCompanyId);

      return ResponseHandler.success(res, {
        equipments: enrichedEquipments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalEquipments,
          totalPages: Math.ceil(totalEquipments / limit)
        },
        filters: {
          types: availableTypes
        }
      }, 'Equipments retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getEquipments', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/equipments/:equipmentId - Obtener detalles del equipo usando DDD
  async getEquipmentDetails(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id: equipmentId } = req.params; // Corregido: usar 'id' en lugar de 'equipmentId'

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting equipment details', { clientCompanyId, equipmentId });

      // Get repositories
      const equipmentRepository = this.container.resolve('equipmentRepository');
      const temperatureRepository = this.container.resolve('temperatureReadingRepository');
      let maintenanceRepository = null;
      try {
        maintenanceRepository = this.container.resolve('maintenanceRepository');
      } catch (err) {
        // maintenanceRepository may not be registered - continue without it
        // No warning needed, this is expected behavior
      }      // Get equipment and verify client ownership
      const equipment = await equipmentRepository.findById(equipmentId);
      if (!equipment) {
        return ResponseHandler.error(res, 'Equipment not found', 404);
      }

      // Verify equipment is rented by this client
      const isRentedByClient = await equipmentRepository.isRentedByClient(equipmentId, clientCompanyId);
      if (!isRentedByClient) {
        return ResponseHandler.error(res, 'Unauthorized to access this equipment', 403);
      }

      // Get temperature statistics
      const temperatureStats = await temperatureRepository.getEquipmentAnalytics(equipmentId, {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      });

      // Get maintenance history
      let maintenanceHistory = [];
      if (maintenanceRepository) {
        try {
          maintenanceHistory = await maintenanceRepository.findByEquipment(equipmentId, {
            limit: 10
          });
        } catch (err) {
          this.logger?.warn('Failed to get maintenance history', { error: err.message });
        }
      }

      // Get recent alerts
      const recentAlerts = await temperatureRepository.findAlertsByEquipment(equipmentId, {
        limit: 10,
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      });

      const equipmentDetails = {
        equipmentId: equipment && equipment.id != null ? equipment.id.toString() : null,
        name: equipment.name,
        type: equipment.type,
        model: equipment.model,
        serialNumber: equipment.serialNumber,
        status: equipment.status,
        installationDate: equipment.installationDate,
        specifications: equipment.technicalSpecs,
        rental: equipment.getRentalInfo(),
        location: equipment.getLocationInfo(),
        provider: equipment.getProviderInfo(),
        temperatureStats: temperatureStats ? {
          avgTemperature: parseFloat(temperatureStats.avg_temperature) || 0,
          minTemperature: parseFloat(temperatureStats.min_temperature) || 0,
          maxTemperature: parseFloat(temperatureStats.max_temperature) || 0,
          readingsCount: parseInt(temperatureStats.readings_count) || 0,
          alertsCount: parseInt(temperatureStats.alerts_count) || 0
        } : null,
        maintenance: {
          history: maintenanceHistory.map(m => ({
            maintenanceId: m && m.id != null ? m.id.toString() : null,
            type: m.type,
            title: m.title,
            description: m.description,
            scheduledDate: m.scheduledDate,
            completedDate: m.completedDate,
            status: m.status,
            cost: m.cost
          })),
          nextScheduled: equipment.getNextMaintenanceDate()
        },
        recentAlerts: recentAlerts.map(alert => ({
          alertId: alert && alert.id != null ? alert.id.toString() : null,
          temperature: alert.temperature,
          status: alert.alertStatus,
          timestamp: alert.recordedAt,
          severity: alert.alertStatus === 'CRITICAL' ? 'high' : 'medium'
        }))
      };

      return ResponseHandler.success(res, equipmentDetails, 'Equipment details retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getEquipmentDetails', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }

  // GET /api/client/equipments/:equipmentId/readings - Obtener lecturas de temperatura usando DDD
  async getEquipmentReadings(req, res) {
    try {
      const { clientCompanyId } = req.user;
      const { id: equipmentId } = req.params; // Corregido: usar 'id' en lugar de 'equipmentId'
      const { 
        startDate, 
        endDate, 
        interval = 'hour',
        page = 1,
        limit = 100 
      } = req.query;

      if (!this.container) {
        throw new Error('DI Container not initialized');
      }

      this.logger.info('Getting equipment readings', { 
        clientCompanyId, 
        equipmentId, 
        startDate, 
        endDate, 
        interval 
      });

      // Get repositories
      const equipmentRepository = this.container.resolve('equipmentRepository');
      const temperatureRepository = this.container.resolve('temperatureReadingRepository');

      // Verify client owns equipment
      const isRentedByClient = await equipmentRepository.isRentedByClient(equipmentId, clientCompanyId);
      if (!isRentedByClient) {
        return ResponseHandler.error(res, 'Unauthorized to access this equipment', 403);
      }

      // Parse dates
      const dateFrom = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateTo = endDate ? new Date(endDate) : new Date();

      let readings;
      if (interval === 'raw') {
        // Get raw readings with pagination
        readings = await temperatureRepository.findByEquipment(equipmentId, {
          dateFrom,
          dateTo,
          page: parseInt(page),
          limit: parseInt(limit)
        });
      } else {
        // Get hourly averages for aggregated data
        readings = await temperatureRepository.getHourlyAverages(equipmentId, {
          dateFrom,
          dateTo
        });
      }

      const formattedReadings = readings.map(reading => ({
        readingId: reading.id?.toString(),
        temperature: parseFloat(reading.temperature || reading.avg_temperature),
        minTemperature: reading.min_temperature ? parseFloat(reading.min_temperature) : null,
        maxTemperature: reading.max_temperature ? parseFloat(reading.max_temperature) : null,
        timestamp: reading.recordedAt || reading.time_bucket,
        status: reading.alertStatus || 'NORMAL',
        humidity: reading.humidity,
        energyConsumption: reading.energyConsumption
      }));

      // Get total count for pagination if using raw readings
      let totalReadings = formattedReadings.length;
      if (interval === 'raw') {
        totalReadings = await temperatureRepository.countByEquipment(equipmentId, {
          dateFrom,
          dateTo
        });
      }

      return ResponseHandler.success(res, {
        readings: formattedReadings,
        pagination: interval === 'raw' ? {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalReadings,
          totalPages: Math.ceil(totalReadings / limit)
        } : null,
        summary: {
          dateRange: { from: dateFrom, to: dateTo },
          interval,
          totalReadings: formattedReadings.length
        }
      }, 'Equipment readings retrieved successfully');

    } catch (error) {
      this.logger?.error('Error in getEquipmentReadings', error);
      return ResponseHandler.error(res, error.message, 500);
    }
  }



}

module.exports = ClientEquipmentsController;
