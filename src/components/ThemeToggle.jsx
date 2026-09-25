import { t as uiText, useLanguage } from '../i18n/language.js';
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = () => {
  useLanguage();
  const { darkMode, setDarkMode } = useTheme();

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`btn border rounded-circle d-flex align-items-center justify-content-center mx-2 ${darkMode ? 'btn-dark border-secondary' : 'btn-light border-2'}`}
      style={{ width: '44px', height: '44px', flexShrink: 0, transition: '0.3s' }}
      aria-label={darkMode ? uiText("Switch to light mode") : uiText("Switch to dark mode")}
      title={darkMode ? uiText("Switch to Light Mode") : uiText("Switch to Dark Mode")}
    >
      {darkMode ? <FaSun className="text-warning" size={18} /> : <FaMoon className="text-dark" size={18} />}
    </button>
  );
};

export default ThemeToggle;