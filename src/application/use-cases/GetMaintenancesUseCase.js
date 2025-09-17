/**
 * Use Case: Obtener Mantenimientos
 */
class GetMaintenancesUseCase {
  constructor(maintenanceRepository, userRepository) {
    this.maintenanceRepository = maintenanceRepository;
    this.userRepository = userRepository;
  }

  async execute(filters = {}, userContext) {
    try {
      // Validar contexto del usuario
      const user = await this.userRepository.findById(userContext.userId);
      if (!user) {
        throw new Error('User not found');
      }

      let maintenances = [];

      // Aplicar filtros basados en el rol del usuario
      if (user.role === 'provider' || user.role === 'admin') {
        maintenances = await this.maintenanceRepository.findByProvider(
          user.companyId, 
          filters
        );
      } else if (user.role === 'technician') {
        // Técnico puede ver mantenimientos asignados a él
        filters.technicianId = user.userId;
        maintenances = await this.maintenanceRepository.findByProvider(
          user.companyId, 
          filters
        );
      } else if (user.role === 'client') {
        // Cliente puede ver mantenimientos de equipos de su empresa
        maintenances = await this.maintenanceRepository.findByProvider(
          null, // No filtrar por proveedor
          { ...filters, clientCompanyId: user.companyId }
        );
      } else {
        throw new Error('Unauthorized access');
      }

      return {
        success: true,
        data: maintenances,
        total: maintenances.length,
        filters: filters
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve maintenances'
      };
    }
  }

  async getById(maintenanceId, userContext) {
    try {
      const user = await this.userRepository.findById(userContext.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const maintenance = await this.maintenanceRepository.findById(maintenanceId);
      if (!maintenance) {
        throw new Error('Maintenance not found');
      }

      // Verificar permisos de acceso
      const hasAccess = (user.role === 'admin') ||
        (user.role === 'provider' && maintenance.providerCompanyId === user.companyId) ||
        (user.role === 'client' && maintenance.clientCompanyId === user.companyId) ||
        (user.role === 'technician' && maintenance.technicianId === user.userId);

      if (!hasAccess) {
        throw new Error('Access denied');
      }

      return {
        success: true,
        data: maintenance
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getScheduledMaintenances(providerCompanyId, dateRange = {}) {
    try {
      const scheduledMaintenances = await this.maintenanceRepository.findScheduledMaintenances(
        providerCompanyId, 
        dateRange
      );

      return {
        success: true,
        data: scheduledMaintenances,
        count: scheduledMaintenances.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve scheduled maintenances'
      };
    }
  }

  async getOverdueMaintenances(providerCompanyId) {
    try {
      const overdueMaintenances = await this.maintenanceRepository.findOverdueMaintenances(providerCompanyId);

      return {
        success: true,
        data: overdueMaintenances,
        count: overdueMaintenances.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve overdue maintenances'
      };
    }
  }

  async getUpcomingMaintenances(providerCompanyId, daysAhead = 7) {
    try {
      const upcomingMaintenances = await this.maintenanceRepository.findUpcomingMaintenances(
        providerCompanyId, 
        daysAhead
      );

      return {
        success: true,
        data: upcomingMaintenances,
        count: upcomingMaintenances.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve upcoming maintenances'
      };
    }
  }

  async getMaintenanceCalendar(providerCompanyId, startDate, endDate) {
    try {
      const calendarMaintenances = await this.maintenanceRepository.getMaintenanceCalendar(
        providerCompanyId, 
        startDate, 
        endDate
      );

      // Formatear para calendario
      const calendarEvents = calendarMaintenances.map(maintenance => ({
        id: maintenance.maintenanceId,
        title: maintenance.title,
        start: maintenance.scheduledDate,
        end: maintenance.actualEndTime || maintenance.scheduledDate,
        status: maintenance.status,
        type: maintenance.type,
        technician: maintenance.technicianName,
        equipment: maintenance.equipmentName,
        client: maintenance.clientCompanyName,
        description: maintenance.description
      }));

      return {
        success: true,
        data: calendarEvents,
        count: calendarEvents.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve maintenance calendar'
      };
    }
  }

  async getKPIs(companyId, period, userRole) {
    try {
      if (userRole !== 'provider' && userRole !== 'admin') {
        throw new Error('Unauthorized to view KPIs');
      }

      const kpis = await this.maintenanceRepository.getKPIs(companyId, period);

      return {
        success: true,
        data: kpis
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve maintenance KPIs'
      };
    }
  }

  async getByEquipment(equipmentId, userContext) {
    try {
      const user = await this.userRepository.findById(userContext.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const maintenances = await this.maintenanceRepository.findByEquipment(equipmentId);

      // Filtrar por permisos
      const filteredMaintenances = maintenances.filter(maintenance => {
        return (user.role === 'admin') ||
          (user.role === 'provider' && maintenance.providerCompanyId === user.companyId) ||
          (user.role === 'client' && maintenance.clientCompanyId === user.companyId) ||
          (user.role === 'technician' && maintenance.technicianId === user.userId);
      });

      return {
        success: true,
        data: filteredMaintenances,
        count: filteredMaintenances.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve equipment maintenances'
      };
    }
  }
}

module.exports = GetMaintenancesUseCase;
