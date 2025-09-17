/**
 * Money Value Object
 * Representa una cantidad monetaria con validaciones
 */
class Money {
  constructor(amount, currency = 'USD') {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Amount must be a valid number');
    }

    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    if (typeof currency !== 'string' || currency.length !== 3) {
      throw new Error('Currency must be a valid 3-letter code');
    }

    this.amount = Number(amount.toFixed(2));
    this.currency = currency.toUpperCase();
  }

  static fromString(amountString, currency = 'USD') {
    const amount = parseFloat(amountString);
    return new Money(amount, currency);
  }

  static zero(currency = 'USD') {
    return new Money(0, currency);
  }

  add(other) {
    if (!(other instanceof Money)) {
      throw new Error('Can only add Money objects');
    }

    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }

    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other) {
    if (!(other instanceof Money)) {
      throw new Error('Can only subtract Money objects');
    }

    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract different currencies');
    }

    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor) {
    if (typeof factor !== 'number' || isNaN(factor)) {
      throw new Error('Factor must be a valid number');
    }

    return new Money(this.amount * factor, this.currency);
  }

  divide(divisor) {
    if (typeof divisor !== 'number' || isNaN(divisor) || divisor === 0) {
      throw new Error('Divisor must be a valid non-zero number');
    }

    return new Money(this.amount / divisor, this.currency);
  }

  equals(other) {
    return other instanceof Money && 
           this.amount === other.amount && 
           this.currency === other.currency;
  }

  isGreaterThan(other) {
    if (!(other instanceof Money)) {
      throw new Error('Can only compare with Money objects');
    }

    if (this.currency !== other.currency) {
      throw new Error('Cannot compare different currencies');
    }

    return this.amount > other.amount;
  }

  isLessThan(other) {
    if (!(other instanceof Money)) {
      throw new Error('Can only compare with Money objects');
    }

    if (this.currency !== other.currency) {
      throw new Error('Cannot compare different currencies');
    }

    return this.amount < other.amount;
  }

  isZero() {
    return this.amount === 0;
  }

  toString() {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  toJSON() {
    return {
      amount: this.amount,
      currency: this.currency
    };
  }
}

module.exports = Money;
