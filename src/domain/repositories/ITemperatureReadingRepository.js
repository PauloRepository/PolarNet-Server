/**
 * Interface: TemperatureReading Repository
 * Defines the contract for temperature reading data persistence operations
 */
class ITemperatureReadingRepository {
  
  // Basic CRUD operations
  async findById(temperatureReadingId) {
    throw new Error('Method findById must be implemented');
  }

  async create(temperatureReading) {
    throw new Error('Method create must be implemented');
  }

  async createBatch(temperatureReadings) {
    throw new Error('Method createBatch must be implemented');
  }

  async update(temperatureReadingId, data) {
    throw new Error('Method update must be implemented');
  }

  async delete(temperatureReadingId) {
    throw new Error('Method delete must be implemented');
  }

  // Query operations
  async findByEquipment(equipmentId, filters = {}) {
    throw new Error('Method findByEquipment must be implemented');
  }

  async findByStatus(status) {
    throw new Error('Method findByStatus must be implemented');
  }

  async findByDateRange(startDate, endDate) {
    throw new Error('Method findByDateRange must be implemented');
  }

  async findRecent(minutesThreshold = 30) {
    throw new Error('Method findRecent must be implemented');
  }

  // Alert operations
  async findAlerts() {
    throw new Error('Method findAlerts must be implemented');
  }

  async findCritical() {
    throw new Error('Method findCritical must be implemented');
  }

  async findOutOfRange() {
    throw new Error('Method findOutOfRange must be implemented');
  }

  // Client-specific operations (for equipment rented by client)
  async findByClientEquipment(clientCompanyId, filters = {}) {
    throw new Error('Method findByClientEquipment must be implemented');
  }

  async getClientTemperatureAlerts(clientCompanyId) {
    throw new Error('Method getClientTemperatureAlerts must be implemented');
  }

  async getClientCriticalAlerts(clientCompanyId) {
    throw new Error('Method getClientCriticalAlerts must be implemented');
  }

  async getClientTodaysAlerts(clientCompanyId) {
    throw new Error('Method getClientTodaysAlerts must be implemented');
  }

  async getClientEquipmentAverages(clientCompanyId, dateRange = {}) {
    throw new Error('Method getClientEquipmentAverages must be implemented');
  }

  // Analytics operations
  async getAverageTemperature(equipmentId, dateRange = {}) {
    throw new Error('Method getAverageTemperature must be implemented');
  }

  async getMinMaxTemperature(equipmentId, dateRange = {}) {
    throw new Error('Method getMinMaxTemperature must be implemented');
  }

  async getTemperatureTrends(equipmentId, dateRange = {}) {
    throw new Error('Method getTemperatureTrends must be implemented');
  }

  async getDailyAverages(equipmentId, dateRange = {}) {
    throw new Error('Method getDailyAverages must be implemented');
  }

  // Equipment location operations
  async findByLocation(locationId, filters = {}) {
    throw new Error('Method findByLocation must be implemented');
  }

  async getLocationAverages(locationId, dateRange = {}) {
    throw new Error('Method getLocationAverages must be implemented');
  }

  // Latest readings
  async getLatestByEquipment(equipmentId) {
    throw new Error('Method getLatestByEquipment must be implemented');
  }

  async getLatestByClientEquipments(clientCompanyId) {
    throw new Error('Method getLatestByClientEquipments must be implemented');
  }
}

module.exports = ITemperatureReadingRepository;
