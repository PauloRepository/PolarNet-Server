/**
 * Equipment Response DTO
 * Objeto de transferencia de datos para respuestas de equipos
 */
class EquipmentResponseDTO {
  constructor(equipment, includeMetrics = false) {
    this.equipmentId = equipment.equipmentId;
    this.name = equipment.name;
    this.type = equipment.type;
    this.manufacturer = equipment.manufacturer;
    this.model = equipment.model;
    this.serialNumber = equipment.serialNumber;
    this.technicalSpecs = equipment.technicalSpecs;
    this.installationDate = equipment.installationDate;
    this.warrantyExpiry = equipment.warrantyExpiry;
    this.status = equipment.status;
    this.condition = equipment.condition;
    this.location = equipment.location;
    this.ownerCompanyId = equipment.ownerCompanyId;
    this.currentClientId = equipment.currentClientId;
    this.purchasePrice = equipment.purchasePrice;
    this.rentalRate = equipment.rentalRate;
    this.createdAt = equipment.createdAt;
    this.updatedAt = equipment.updatedAt;

    // Propiedades computadas
    this.isAvailable = equipment.isAvailable();
    this.isRented = equipment.isRented();
    this.isInMaintenance = equipment.isInMaintenance();
    this.isUnderWarranty = equipment.isUnderWarranty();

    // Métricas opcionales
    if (includeMetrics && equipment.metrics) {
      this.metrics = equipment.metrics;
    }
  }

  static fromEntity(equipment, includeMetrics = false) {
    return new EquipmentResponseDTO(equipment, includeMetrics);
  }

  static fromEntityArray(equipmentArray, includeMetrics = false) {
    return equipmentArray.map(equipment => 
      new EquipmentResponseDTO(equipment, includeMetrics)
    );
  }
}

module.exports = EquipmentResponseDTO;
