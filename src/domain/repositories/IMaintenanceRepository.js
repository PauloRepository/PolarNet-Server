/**
 * Maintenance Repository Interface - DDD
 * Interface que define las operaciones del repositorio de mantenimientos
 */

class IMaintenanceRepository {
  async save(maintenance) {
    throw new Error('Method save must be implemented');
  }

  async findById(id) {
    throw new Error('Method findById must be implemented');
  }

  async findByProvider(providerCompanyId, filters = {}) {
    throw new Error('Method findByProvider must be implemented');
  }

  async findByEquipment(equipmentId, filters = {}) {
    throw new Error('Method findByEquipment must be implemented');
  }

  async findByDateRange(startDate, endDate, filters = {}) {
    throw new Error('Method findByDateRange must be implemented');
  }

  async getKPIs(providerCompanyId, period) {
    throw new Error('Method getKPIs must be implemented');
  }

  async getCalendarView(providerCompanyId, startDate, endDate) {
    throw new Error('Method getCalendarView must be implemented');
  }

  async findPreventiveMaintenanceOpportunities(providerCompanyId) {
    throw new Error('Method findPreventiveMaintenanceOpportunities must be implemented');
  }

  async delete(id) {
    throw new Error('Method delete must be implemented');
  }
}

module.exports = IMaintenanceRepository;
