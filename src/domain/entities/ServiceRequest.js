/**
 * ServiceRequest Entity
 * Representa una solicitud de servicio en el sistema
 */
class ServiceRequest {
  constructor({
    serviceRequestId,
    title,
    description,
    priority, // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    issueType,
    category, // 'REPAIR' | 'MAINTENANCE' | 'INSTALLATION' | 'CONSULTATION'
    requestDate,
    scheduledDate,
    completionDate,
    deadlineDate,
    status, // 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'CLOSED'
    clientCompanyId,
    clientUserId,
    providerCompanyId,
    technicianId,
    equipmentId,
    locationId,
    estimatedCost,
    finalCost,
    currency,
    clientRating,
    clientFeedback,
    providerRating,
    providerFeedback,
    attachments,
    completionPhotos,
    internalNotes,
    clientNotes,
    technicianNotes,
    createdAt,
    updatedAt
  }) {
    this.serviceRequestId = serviceRequestId;
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.issueType = issueType;
    this.category = category;
    this.requestDate = requestDate;
    this.scheduledDate = scheduledDate;
    this.completionDate = completionDate;
    this.deadlineDate = deadlineDate;
    this.status = status;
    this.clientCompanyId = clientCompanyId;
    this.clientUserId = clientUserId;
    this.providerCompanyId = providerCompanyId;
    this.technicianId = technicianId;
    this.equipmentId = equipmentId;
    this.locationId = locationId;
    this.estimatedCost = estimatedCost;
    this.finalCost = finalCost;
    this.currency = currency;
    this.clientRating = clientRating;
    this.clientFeedback = clientFeedback;
    this.providerRating = providerRating;
    this.providerFeedback = providerFeedback;
    this.attachments = attachments;
    this.completionPhotos = completionPhotos;
    this.internalNotes = internalNotes;
    this.clientNotes = clientNotes;
    this.technicianNotes = technicianNotes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  validate() {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Service request title is required');
    }

    if (!this.description || this.description.trim().length === 0) {
      throw new Error('Service request description is required');
    }

    if (!this.priority || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(this.priority)) {
      throw new Error('Invalid service request priority');
    }

    if (!this.status || !['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CLOSED'].includes(this.status)) {
      throw new Error('Invalid service request status');
    }

    if (!this.clientCompanyId) {
      throw new Error('Client company ID is required');
    }

    if (this.estimatedCost && this.estimatedCost < 0) {
      throw new Error('Estimated cost cannot be negative');
    }

    if (this.finalCost && this.finalCost < 0) {
      throw new Error('Final cost cannot be negative');
    }

    if (this.clientRating && (this.clientRating < 1 || this.clientRating > 5)) {
      throw new Error('Client rating must be between 1 and 5');
    }

    if (this.providerRating && (this.providerRating < 1 || this.providerRating > 5)) {
      throw new Error('Provider rating must be between 1 and 5');
    }
  }

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

  isClosed() {
    return this.status === 'CLOSED';
  }

  isHighPriority() {
    return this.priority === 'HIGH' || this.priority === 'CRITICAL';
  }

  isCritical() {
    return this.priority === 'CRITICAL';
  }

  hasDeadline() {
    return this.deadlineDate !== null;
  }

  isOverdue() {
    if (!this.hasDeadline() || this.isCompleted() || this.isCancelled()) {
      return false;
    }
    return new Date() > new Date(this.deadlineDate);
  }

  assignTechnician(technicianId) {
    if (this.status !== 'OPEN') {
      throw new Error('Can only assign technician to open service requests');
    }

    this.technicianId = technicianId;
    this.status = 'ASSIGNED';
    this.updatedAt = new Date();
  }

  startWork() {
    if (this.status !== 'ASSIGNED') {
      throw new Error('Service request must be assigned before starting work');
    }

    this.status = 'IN_PROGRESS';
    this.updatedAt = new Date();
  }

  complete(finalCost, completionNotes) {
    if (this.status !== 'IN_PROGRESS') {
      throw new Error('Service request must be in progress to complete');
    }

    this.status = 'COMPLETED';
    this.completionDate = new Date();
    this.finalCost = finalCost;
    if (completionNotes) {
      this.technicianNotes = this.technicianNotes ? 
        `${this.technicianNotes}\n${completionNotes}` : 
        completionNotes;
    }
    this.updatedAt = new Date();
  }

  cancel(reason) {
    if (this.isCompleted()) {
      throw new Error('Cannot cancel a completed service request');
    }

    this.status = 'CANCELLED';
    this.internalNotes = this.internalNotes ? 
      `${this.internalNotes}\nCancelled: ${reason}` : 
      `Cancelled: ${reason}`;
    this.updatedAt = new Date();
  }

  updateEstimatedCost(newCost) {
    if (this.isCompleted()) {
      throw new Error('Cannot update cost of completed service request');
    }

    if (newCost < 0) {
      throw new Error('Estimated cost cannot be negative');
    }

    this.estimatedCost = newCost;
    this.updatedAt = new Date();
  }

  addClientFeedback(rating, feedback) {
    if (!this.isCompleted()) {
      throw new Error('Can only add feedback to completed service requests');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    this.clientRating = rating;
    this.clientFeedback = feedback;
    this.updatedAt = new Date();
  }

  addProviderFeedback(rating, feedback) {
    if (!this.isCompleted()) {
      throw new Error('Can only add feedback to completed service requests');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    this.providerRating = rating;
    this.providerFeedback = feedback;
    this.updatedAt = new Date();
  }

  addNote(note, noteType = 'internal') {
    const timestamp = new Date().toISOString();
    const timestampedNote = `[${timestamp}] ${note}`;

    switch (noteType) {
      case 'client':
        this.clientNotes = this.clientNotes ? 
          `${this.clientNotes}\n${timestampedNote}` : 
          timestampedNote;
        break;
      case 'technician':
        this.technicianNotes = this.technicianNotes ? 
          `${this.technicianNotes}\n${timestampedNote}` : 
          timestampedNote;
        break;
      default:
        this.internalNotes = this.internalNotes ? 
          `${this.internalNotes}\n${timestampedNote}` : 
          timestampedNote;
    }

    this.updatedAt = new Date();
  }

  schedule(scheduledDate) {
    if (this.status === 'COMPLETED' || this.status === 'CANCELLED') {
      throw new Error('Cannot schedule completed or cancelled service request');
    }

    if (new Date(scheduledDate) < new Date()) {
      throw new Error('Cannot schedule service request in the past');
    }

    this.scheduledDate = new Date(scheduledDate);
    this.updatedAt = new Date();
  }
}

module.exports = ServiceRequest;
