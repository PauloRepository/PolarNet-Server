/**
 * Maintenance Entity
 * Representa un mantenimiento programado o realizado
 */
class Maintenance {
  constructor({
    maintenanceId,
    title,
    description,
    type, // 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY'
    category, // 'CLEANING' | 'INSPECTION' | 'REPAIR' | 'REPLACEMENT'
    scheduledDate,
    estimatedDurationHours,
    actualStartTime,
    actualEndTime,
    nextScheduledDate,
    status, // 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED'
    equipmentId,
    serviceRequestId,
    technicianId,
    clientCompanyId,
    providerCompanyId,
    estimatedCost,
    actualCost,
    partsCost,
    laborCost,
    workPerformed,
    partsUsed,
    findings,
    recommendations,
    beforePhotos,
    afterPhotos,
    documents,
    qualityRating,
    createdAt,
    updatedAt
  }) {
    this.maintenanceId = maintenanceId;
    this.title = title;
    this.description = description;
    this.type = type;
    this.category = category;
    this.scheduledDate = scheduledDate;
    this.estimatedDurationHours = estimatedDurationHours;
    this.actualStartTime = actualStartTime;
    this.actualEndTime = actualEndTime;
    this.nextScheduledDate = nextScheduledDate;
    this.status = status;
    this.equipmentId = equipmentId;
    this.serviceRequestId = serviceRequestId;
    this.technicianId = technicianId;
    this.clientCompanyId = clientCompanyId;
    this.providerCompanyId = providerCompanyId;
    this.estimatedCost = estimatedCost;
    this.actualCost = actualCost;
    this.partsCost = partsCost;
    this.laborCost = laborCost;
    this.workPerformed = workPerformed;
    this.partsUsed = partsUsed;
    this.findings = findings;
    this.recommendations = recommendations;
    this.beforePhotos = beforePhotos;
    this.afterPhotos = afterPhotos;
    this.documents = documents;
    this.qualityRating = qualityRating;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  validate() {
    if (!this.type || !['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'].includes(this.type)) {
      throw new Error('Invalid maintenance type');
    }

    if (!this.status || !['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'].includes(this.status)) {
      throw new Error('Invalid maintenance status');
    }

    if (!this.scheduledDate) {
      throw new Error('Scheduled date is required');
    }

    if (!this.equipmentId) {
      throw new Error('Equipment ID is required');
    }

    if (this.estimatedCost && this.estimatedCost < 0) {
      throw new Error('Estimated cost cannot be negative');
    }

    if (this.actualCost && this.actualCost < 0) {
      throw new Error('Actual cost cannot be negative');
    }

    if (this.estimatedDurationHours && this.estimatedDurationHours <= 0) {
      throw new Error('Estimated duration must be positive');
    }

    if (this.qualityRating && (this.qualityRating < 1 || this.qualityRating > 5)) {
      throw new Error('Quality rating must be between 1 and 5');
    }
  }

  isScheduled() {
    return this.status === 'SCHEDULED';
  }

  isInProgress() {
    return this.status === 'IN_PROGRESS';
  }

  isCompleted() {
    return this.status === 'COMPLETED';
  }

  isCancelled() {
    return this.status === 'CANCELLED';
  }

  isPostponed() {
    return this.status === 'POSTPONED';
  }

  isPreventive() {
    return this.type === 'PREVENTIVE';
  }

  isCorrective() {
    return this.type === 'CORRECTIVE';
  }

  isEmergency() {
    return this.type === 'EMERGENCY';
  }

  isDue() {
    if (!this.isScheduled()) {
      return false;
    }
    return new Date() >= new Date(this.scheduledDate);
  }

  isOverdue() {
    if (!this.isScheduled()) {
      return false;
    }
    const scheduledDate = new Date(this.scheduledDate);
    const today = new Date();
    return today > scheduledDate;
  }

  start() {
    if (!this.isScheduled()) {
      throw new Error('Can only start scheduled maintenance');
    }

    this.status = 'IN_PROGRESS';
    this.actualStartTime = new Date();
    this.updatedAt = new Date();
  }

  complete(workPerformed, actualCost = 0, partsCost = 0, laborCost = 0) {
    if (!this.isInProgress()) {
      throw new Error('Can only complete maintenance that is in progress');
    }

    this.status = 'COMPLETED';
    this.actualEndTime = new Date();
    this.workPerformed = workPerformed;
    this.actualCost = actualCost;
    this.partsCost = partsCost;
    this.laborCost = laborCost;
    this.updatedAt = new Date();

    // Programar próximo mantenimiento preventivo si aplica
    if (this.isPreventive() && !this.nextScheduledDate) {
      this.scheduleNextPreventiveMaintenance();
    }
  }

  cancel(reason) {
    if (this.isCompleted()) {
      throw new Error('Cannot cancel completed maintenance');
    }

    this.status = 'CANCELLED';
    this.findings = this.findings ? 
      `${this.findings}\nCancelled: ${reason}` : 
      `Cancelled: ${reason}`;
    this.updatedAt = new Date();
  }

  postpone(newScheduledDate, reason) {
    if (!this.isScheduled()) {
      throw new Error('Can only postpone scheduled maintenance');
    }

    if (new Date(newScheduledDate) <= new Date()) {
      throw new Error('New scheduled date must be in the future');
    }

    this.status = 'POSTPONED';
    this.scheduledDate = new Date(newScheduledDate);
    this.findings = this.findings ? 
      `${this.findings}\nPostponed: ${reason}` : 
      `Postponed: ${reason}`;
    this.updatedAt = new Date();

    // Cambiar estado de vuelta a SCHEDULED después de postponer
    setTimeout(() => {
      this.status = 'SCHEDULED';
    }, 0);
  }

  reschedule(newScheduledDate) {
    if (this.isCompleted() || this.isCancelled()) {
      throw new Error('Cannot reschedule completed or cancelled maintenance');
    }

    if (new Date(newScheduledDate) <= new Date()) {
      throw new Error('New scheduled date must be in the future');
    }

    this.scheduledDate = new Date(newScheduledDate);
    this.status = 'SCHEDULED';
    this.updatedAt = new Date();
  }

  addFindings(findings) {
    this.findings = this.findings ? 
      `${this.findings}\n${findings}` : 
      findings;
    this.updatedAt = new Date();
  }

  addRecommendations(recommendations) {
    this.recommendations = this.recommendations ? 
      `${this.recommendations}\n${recommendations}` : 
      recommendations;
    this.updatedAt = new Date();
  }

  addPartsUsed(parts) {
    if (!Array.isArray(parts)) {
      throw new Error('Parts must be an array');
    }

    this.partsUsed = this.partsUsed ? 
      [...this.partsUsed, ...parts] : 
      parts;
    this.updatedAt = new Date();
  }

  calculateActualDuration() {
    if (!this.actualStartTime || !this.actualEndTime) {
      return 0;
    }

    const start = new Date(this.actualStartTime);
    const end = new Date(this.actualEndTime);
    const durationMs = end - start;
    
    return Math.round(durationMs / (1000 * 60 * 60 * 100)) / 100; // Horas con 2 decimales
  }

  isOnTime() {
    if (!this.isCompleted()) {
      return null;
    }

    const actualDuration = this.calculateActualDuration();
    return actualDuration <= (this.estimatedDurationHours || 0);
  }

  isOnBudget() {
    if (!this.isCompleted() || !this.estimatedCost) {
      return null;
    }

    return this.actualCost <= this.estimatedCost;
  }

  scheduleNextPreventiveMaintenance() {
    if (!this.isPreventive()) {
      return;
    }

    // Programar para 3 meses después por defecto
    const nextDate = new Date(this.scheduledDate);
    nextDate.setMonth(nextDate.getMonth() + 3);
    
    this.nextScheduledDate = nextDate;
    this.updatedAt = new Date();
  }

  rateQuality(rating) {
    if (!this.isCompleted()) {
      throw new Error('Can only rate completed maintenance');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Quality rating must be between 1 and 5');
    }

    this.qualityRating = rating;
    this.updatedAt = new Date();
  }

  updateCosts(actualCost, partsCost = 0, laborCost = 0) {
    if (actualCost < 0 || partsCost < 0 || laborCost < 0) {
      throw new Error('Costs cannot be negative');
    }

    this.actualCost = actualCost;
    this.partsCost = partsCost;
    this.laborCost = laborCost;
    this.updatedAt = new Date();
  }
}

module.exports = Maintenance;
