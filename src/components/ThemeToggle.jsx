import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = () => {
  const { darkMode, setDarkMode } = useTheme();

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`btn border rounded-circle d-flex align-items-center justify-content-center mx-2 ${darkMode ? 'btn-dark border-secondary' : 'btn-light border-2'}`}
      style={{ width: '40px', height: '40px', transition: '0.3s' }}
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {darkMode ? <FaSun className="text-warning" size={18} /> : <FaMoon className="text-dark" size={18} />}
    </button>
  );
};

export default ThemeToggle;