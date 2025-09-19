/**
 * Domain Entity: TemperatureReading
 * Represents a temperature reading from equipment sensors
 */
class TemperatureReading {
  constructor({
    temperatureReadingId,
    equipmentId,
    value,
    unit = 'CELSIUS', // CELSIUS, FAHRENHEIT, KELVIN
    timestamp,
    status = 'NORMAL', // NORMAL, WARNING, ALERT, CRITICAL
    minThreshold,
    maxThreshold,
    sensorId,
    location,
    createdAt
  }) {
    this.temperatureReadingId = temperatureReadingId;
    this.equipmentId = equipmentId;
    this.value = value;
    this.unit = unit;
    this.timestamp = timestamp;
    this.status = status;
    this.minThreshold = minThreshold;
    this.maxThreshold = maxThreshold;
    this.sensorId = sensorId;
    this.location = location;
    this.createdAt = createdAt;
  }

  // Business rules
  isNormal() {
    return this.status === 'NORMAL';
  }

  isWarning() {
    return this.status === 'WARNING';
  }

  isAlert() {
    return this.status === 'ALERT';
  }

  isCritical() {
    return this.status === 'CRITICAL';
  }

  isOutOfRange() {
    return this.isAlert() || this.isCritical();
  }

  isRecent(minutesThreshold = 30) {
    const diffTime = new Date() - new Date(this.timestamp);
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    return diffMinutes <= minutesThreshold;
  }

  convertTo(targetUnit) {
    if (this.unit === targetUnit) return this.value;

    let celsius = this.value;
    
    // Convert to Celsius first if not already
    if (this.unit === 'FAHRENHEIT') {
      celsius = (this.value - 32) * 5/9;
    } else if (this.unit === 'KELVIN') {
      celsius = this.value - 273.15;
    }

    // Convert from Celsius to target unit
    switch (targetUnit) {
      case 'FAHRENHEIT':
        return (celsius * 9/5) + 32;
      case 'KELVIN':
        return celsius + 273.15;
      case 'CELSIUS':
      default:
        return celsius;
    }
  }

  evaluateStatus() {
    if (!this.minThreshold && !this.maxThreshold) {
      return 'NORMAL';
    }

    if (this.minThreshold && this.value < this.minThreshold) {
      const deviation = Math.abs(this.value - this.minThreshold);
      return deviation > 5 ? 'CRITICAL' : 'ALERT';
    }

    if (this.maxThreshold && this.value > this.maxThreshold) {
      const deviation = Math.abs(this.value - this.maxThreshold);
      return deviation > 5 ? 'CRITICAL' : 'ALERT';
    }

    // Check if close to thresholds (warning zone)
    if (this.minThreshold && this.value <= this.minThreshold + 2) {
      return 'WARNING';
    }

    if (this.maxThreshold && this.value >= this.maxThreshold - 2) {
      return 'WARNING';
    }

    return 'NORMAL';
  }

  updateStatus() {
    this.status = this.evaluateStatus();
  }

  belongsToEquipment(equipmentId) {
    return this.equipmentId === equipmentId;
  }
}

module.exports = TemperatureReading;
