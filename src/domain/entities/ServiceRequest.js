/**
 * Domain Entity: ServiceRequest
 * Represents a service request in the marketplace
 */
class ServiceRequest {
  constructor({
    serviceRequestId,
    clientCompanyId,
    providerCompanyId,
    equipmentId,
    type, // MAINTENANCE, REPAIR, INSTALLATION, INSPECTION
    priority = 'MEDIUM', // LOW, MEDIUM, HIGH, URGENT
    status = 'OPEN', // OPEN, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
    title,
    description,
    requestedDate,
    preferredDate,
    estimatedCost,
    finalCost,
    currency = 'CLP',
    assignedTo,
    completedAt,
    notes,
    attachments,
    createdAt,
    updatedAt
  }) {
    this.serviceRequestId = serviceRequestId;
    this.clientCompanyId = clientCompanyId;
    this.providerCompanyId = providerCompanyId;
    this.equipmentId = equipmentId;
    this.type = type;
    this.priority = priority;
    this.status = status;
    this.title = title;
    this.description = description;
    this.requestedDate = requestedDate;
    this.preferredDate = preferredDate;
    this.estimatedCost = estimatedCost;
    this.finalCost = finalCost;
    this.currency = currency;
    this.assignedTo = assignedTo;
    this.completedAt = completedAt;
    this.notes = notes;
    this.attachments = attachments;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Business rules
  isOpen() {
    return this.status === 'OPEN';
  }

  isAssigned() {
    return this.status === 'ASSIGNED';
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

  isOverdue() {
    if (!this.preferredDate || this.isCompleted() || this.isCancelled()) {
      return false;
    }
    return new Date(this.preferredDate) < new Date();
  }

  isUrgent() {
    return this.priority === 'URGENT';
  }

  canBeAssigned() {
    return this.isOpen();
  }

  canStart() {
    return this.isAssigned();
  }

  canComplete() {
    return this.isInProgress();
  }

  canCancel() {
    return !this.isCompleted() && !this.isCancelled();
  }

  assign(providerId, assignedTo) {
    if (!this.canBeAssigned()) {
      throw new Error('Service request cannot be assigned in current state');
    }
    this.providerCompanyId = providerId;
    this.assignedTo = assignedTo;
    this.status = 'ASSIGNED';
    this.updatedAt = new Date();
  }

  start() {
    if (!this.canStart()) {
      throw new Error('Service request cannot be started in current state');
    }
    this.status = 'IN_PROGRESS';
    this.updatedAt = new Date();
  }

  complete(finalCost = null, notes = null) {
    if (!this.canComplete()) {
      throw new Error('Service request cannot be completed in current state');
    }
    this.status = 'COMPLETED';
    this.completedAt = new Date();
    if (finalCost !== null) this.finalCost = finalCost;
    if (notes !== null) this.notes = notes;
    this.updatedAt = new Date();
  }

  cancel(reason = null) {
    if (!this.canCancel()) {
      throw new Error('Service request cannot be cancelled in current state');
    }
    this.status = 'CANCELLED';
    if (reason) this.notes = (this.notes || '') + `\nCancellation reason: ${reason}`;
    this.updatedAt = new Date();
  }

  updateEstimate(estimatedCost) {
    if (this.isCompleted()) {
      throw new Error('Cannot update estimate for completed service');
    }
    this.estimatedCost = estimatedCost;
    this.updatedAt = new Date();
  }

  belongsToClient(clientCompanyId) {
    return this.clientCompanyId === clientCompanyId;
  }

  belongsToProvider(providerCompanyId) {
    return this.providerCompanyId === providerCompanyId;
  }
}

module.exports = ServiceRequest;
