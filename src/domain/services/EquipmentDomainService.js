/**
 * Equipment Domain Service
 * Contiene lógica de negocio compleja relacionada con equipos
 */
class EquipmentDomainService {
  constructor(equipmentRepository, rentalRepository) {
    this.equipmentRepository = equipmentRepository;
    this.rentalRepository = rentalRepository;
  }

  /**
   * Determina si un equipo puede ser rentado
   * @param {Equipment} equipment 
   * @returns {Promise<{canRent: boolean, reason?: string}>}
   */
  async canEquipmentBeRented(equipment) {
    // Verificar estado del equipo
    if (!equipment.isAvailable()) {
      return {
        canRent: false,
        reason: `Equipment is ${equipment.status.toLowerCase()}`
      };
    }

    // Verificar condición del equipo
    if (equipment.condition === 'POOR') {
      return {
        canRent: false,
        reason: 'Equipment condition is too poor for rental'
      };
    }

    // Verificar si ya tiene un rental activo
    const activeRental = await this.rentalRepository.findActiveRentalByEquipment(equipment.equipmentId);
    if (activeRental) {
      return {
        canRent: false,
        reason: 'Equipment already has an active rental'
      };
    }

    return { canRent: true };
  }

  /**
   * Calcula la tarifa de renta sugerida basada en el mercado
   * @param {Equipment} equipment 
   * @returns {Promise<number>}
   */
  async calculateSuggestedRentalRate(equipment) {
    // Buscar equipos similares
    const similarEquipment = await this.equipmentRepository.findByType(
      equipment.type, 
      equipment.ownerCompanyId
    );

    if (similarEquipment.length === 0) {
      // Si no hay equipos similares, usar un porcentaje del precio de compra
      return equipment.purchasePrice ? equipment.purchasePrice * 0.10 : 1000;
    }

    // Calcular tarifa promedio de equipos similares
    const rates = similarEquipment
      .filter(eq => eq.rentalRate && eq.rentalRate > 0)
      .map(eq => eq.rentalRate);

    if (rates.length === 0) {
      return equipment.purchasePrice ? equipment.purchasePrice * 0.10 : 1000;
    }

    const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

    // Ajustar por condición del equipo
    const conditionMultiplier = {
      'NEW': 1.2,
      'GOOD': 1.0,
      'FAIR': 0.8,
      'POOR': 0.6
    };

    return avgRate * (conditionMultiplier[equipment.condition] || 1.0);
  }

  /**
   * Determina si un equipo necesita mantenimiento
   * @param {Equipment} equipment 
   * @param {Array} maintenanceHistory - Historial de mantenimientos
   * @returns {boolean}
   */
  needsMaintenance(equipment, maintenanceHistory = []) {
    // Si está fuera de servicio, definitivamente necesita atención
    if (equipment.isOutOfService()) {
      return true;
    }

    // Si está en condición pobre
    if (equipment.condition === 'POOR') {
      return true;
    }

    // Verificar último mantenimiento
    if (maintenanceHistory.length === 0) {
      // Si nunca se ha hecho mantenimiento y tiene más de 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (equipment.installationDate && new Date(equipment.installationDate) < sixMonthsAgo) {
        return true;
      }
    } else {
      // Verificar si el último mantenimiento fue hace más de 3 meses
      const lastMaintenance = maintenanceHistory
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
      
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      if (new Date(lastMaintenance.completedAt) < threeMonthsAgo) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calcula la depreciación del equipo
   * @param {Equipment} equipment 
   * @returns {number} Porcentaje de depreciación
   */
  calculateDepreciation(equipment) {
    if (!equipment.purchasePrice || !equipment.installationDate) {
      return 0;
    }

    const installDate = new Date(equipment.installationDate);
    const today = new Date();
    const yearsOld = (today - installDate) / (1000 * 60 * 60 * 24 * 365.25);

    // Depreciación lineal del 10% anual, máximo 80%
    const depreciationRate = Math.min(yearsOld * 0.10, 0.80);

    // Ajustar por condición
    const conditionAdjustment = {
      'NEW': 0,
      'GOOD': 0.05,
      'FAIR': 0.15,
      'POOR': 0.30
    };

    return Math.min(depreciationRate + (conditionAdjustment[equipment.condition] || 0), 0.90);
  }

  /**
   * Calcula el valor actual del equipo
   * @param {Equipment} equipment 
   * @returns {number}
   */
  calculateCurrentValue(equipment) {
    if (!equipment.purchasePrice) {
      return 0;
    }

    const depreciation = this.calculateDepreciation(equipment);
    return equipment.purchasePrice * (1 - depreciation);
  }

  /**
   * Determina la prioridad de mantenimiento
   * @param {Equipment} equipment 
   * @param {Array} maintenanceHistory 
   * @returns {string} 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
   */
  getMaintenancePriority(equipment, maintenanceHistory = []) {
    if (equipment.isOutOfService()) {
      return 'CRITICAL';
    }

    if (equipment.condition === 'POOR') {
      return 'HIGH';
    }

    if (equipment.isRented() && this.needsMaintenance(equipment, maintenanceHistory)) {
      return 'HIGH';
    }

    if (this.needsMaintenance(equipment, maintenanceHistory)) {
      return 'MEDIUM';
    }

    return 'LOW';
  }
}

module.exports = EquipmentDomainService;
