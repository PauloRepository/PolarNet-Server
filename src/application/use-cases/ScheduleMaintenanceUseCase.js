/**
 * Use Case: Programar Mantenimiento
 */
class ScheduleMaintenanceUseCase {
  constructor(maintenanceRepository, equipmentRepository, userRepository) {
    this.maintenanceRepository = maintenanceRepository;
    this.equipmentRepository = equipmentRepository;
    this.userRepository = userRepository;
  }

  async execute(maintenanceData) {
    try {
      // Validar que el equipo existe
      const equipment = await this.equipmentRepository.findById(maintenanceData.equipmentId);
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      // Validar que el técnico existe (si se asigna uno)
      if (maintenanceData.technicianId) {
        const technician = await this.userRepository.findById(maintenanceData.technicianId);
        if (!technician || technician.role !== 'technician') {
          throw new Error('Invalid technician');
        }
      }

      // Crear entidad Maintenance
      const Maintenance = require('../../domain/entities/Maintenance');
      const maintenance = new Maintenance({
        title: maintenanceData.title,
        description: maintenanceData.description,
        type: maintenanceData.type,
        category: maintenanceData.category,
        scheduledDate: new Date(maintenanceData.scheduledDate),
        estimatedDurationHours: maintenanceData.estimatedDurationHours,
        status: 'SCHEDULED',
        equipmentId: maintenanceData.equipmentId,
        serviceRequestId: maintenanceData.serviceRequestId,
        technicianId: maintenanceData.technicianId,
        clientCompanyId: equipment.clientCompanyId,
        providerCompanyId: equipment.providerCompanyId,
        estimatedCost: maintenanceData.estimatedCost,
        workPerformed: maintenanceData.workPerformed,
        findings: maintenanceData.findings,
        recommendations: maintenanceData.recommendations
      });

      // Validar la entidad
      maintenance.validate();

      // Programar próximo mantenimiento si es preventivo
      if (maintenance.type === 'PREVENTIVE' && maintenanceData.maintenanceInterval) {
        const nextDate = new Date(maintenance.scheduledDate);
        nextDate.setDate(nextDate.getDate() + maintenanceData.maintenanceInterval);
        maintenance.nextScheduledDate = nextDate;
      }

      // Guardar en el repositorio
      const savedMaintenance = await this.maintenanceRepository.save(maintenance);

      return {
        success: true,
        data: savedMaintenance,
        message: 'Maintenance scheduled successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to schedule maintenance'
      };
    }
  }

  async schedulePreventiveMaintenance(equipmentId, maintenanceConfig) {
    try {
      const equipment = await this.equipmentRepository.findById(equipmentId);
      if (!equipment) {
        throw new Error('Equipment not found');
      }

      const maintenances = [];
      const startDate = new Date();
      
      for (let i = 0; i < maintenanceConfig.occurrences; i++) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + (i * maintenanceConfig.intervalDays));

        const maintenanceData = {
          title: `${maintenanceConfig.type} Maintenance - ${equipment.name}`,
          description: maintenanceConfig.description,
          type: 'PREVENTIVE',
          category: maintenanceConfig.category,
          scheduledDate: scheduledDate,
          estimatedDurationHours: maintenanceConfig.estimatedDurationHours,
          equipmentId: equipmentId,
          estimatedCost: maintenanceConfig.estimatedCost
        };

        const result = await this.execute(maintenanceData);
        if (result.success) {
          maintenances.push(result.data);
        }
      }

      return {
        success: true,
        data: maintenances,
        message: `${maintenances.length} preventive maintenances scheduled`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to schedule preventive maintenances'
      };
    }
  }
}

module.exports = ScheduleMaintenanceUseCase;
