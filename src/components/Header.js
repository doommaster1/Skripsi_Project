import React from 'react';

const Header = ({ title, description }) => (
  <div className="header">
    <h1>{title}</h1>
    <p>{description}</p>
  </div>
);

export default Header;