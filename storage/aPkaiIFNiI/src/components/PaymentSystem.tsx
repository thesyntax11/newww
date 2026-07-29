import React from 'react';

const PaymentSystem = () => {
  return (
    <div>
      <h2>Ödeme Sistemi</h2>
      <p>Ödeme sistemi açıklaması</p>
      <form>
        <label>Ödeme yöntemi:</label>
        <select>
          <option value="kredi-karti">Kredi Kartı</option>
          <option value="havale">Havale</option>
        </select>
      </form>
    </div>
  );
};

export default PaymentSystem;