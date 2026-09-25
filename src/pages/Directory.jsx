import { t as uiText, useLanguage } from '../i18n/language.js';
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import CommunityPageHero from '../components/CommunityPageHero';
import Sidebar from '../components/Sidebar';
import { 
  FaShieldAlt, FaFireExtinguisher, FaAmbulance, 
  FaBuilding, FaTools, FaWrench, FaSearch, FaPhoneAlt, FaUser 
} from 'react-icons/fa';

const Directory = () => {
  useLanguage();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Static Data for Emergency & Services (Matches your mockup)
  const emergencyContacts = [
    { name: "Police Station", number: "100", icon: <FaShieldAlt />, bg: "#FFF5F5", text: "#E53E3E" },
    { name: "Fire Brigade", number: "101", icon: <FaFireExtinguisher />, bg: "#FFF5F5", text: "#E53E3E" },
    { name: "Ambulance", number: "102", icon: <FaAmbulance />, bg: "#FFF5F5", text: "#E53E3E" },
  ];

  const serviceContacts = [
    { name: "Society Office", number: "+91 98765 43210", icon: <FaBuilding />, bg: "#FFFFFF", text: "#2D3748" },
    { name: "Electrician", number: "+91 99887 76655", icon: <FaTools />, bg: "#FFFFFF", text: "#2D3748" },
    { name: "Plumber (Raju)", number: "+91 91234 56789", icon: <FaWrench />, bg: "#FFFFFF", text: "#2D3748" },
  ];

  // 2. Fetch Dynamic Members from API
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await api.get('Directory'); // Calls your DirectoryController
      setMembers(res.data);
      localStorage.setItem('cached_members', JSON.stringify(res.data));
      setLoading(false);
    } catch (err) {
      console.error("Failed to load directory, loading from local storage", err);
      const cached = localStorage.getItem('cached_members');
      if (cached) {
        setMembers(JSON.parse(cached));
      }
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredMembers = members.filter(m => 
    m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.flatNo.includes(searchTerm)
  );

  return (
    <div className="directory-screen">
      <CommunityPageHero pathname="/directory" title={uiText("Community Directory")} description={uiText("Call essential services or find a neighbour.")} />

        {/* --- SECTION 1: EMERGENCY CONTACTS --- */}
        <h6 className="fw-bold text-danger mb-3 text-uppercase small" style={{letterSpacing:'1px'}}>
            <span className="me-2">*</span>{uiText("Emergency Contacts")}</h6>
        <div className="row g-2 g-md-4 mb-4 emergency-grid">
            {emergencyContacts.map((item, index) => (
                <div key={index} className="col-4">
                    <a href={`tel:${item.number}`} className="card emergency-card border-0 shadow-sm rounded-4 h-100 text-decoration-none" style={{backgroundColor: item.bg}} aria-label={uiText("Call {{v0}} at {{v1}}", { v0: item.name, v1: item.number })}>
                        <div className="card-body d-flex align-items-center p-4">
                            <div className="rounded-circle p-3 me-3 d-flex align-items-center justify-content-center bg-white" 
                                 style={{width:'50px', height:'50px', color: item.text}}>
                                {item.icon}
                            </div>
                            <div>
                                <h6 className="fw-bold mb-1" style={{color: '#742A2A'}}>{uiText(item.name)}</h6>
                                <span className="fs-5 fw-bold" style={{color: item.text}}>{item.number}</span>
                            </div>
                        </div>
                    </a>
                </div>
            ))}
        </div>

        {/* --- SECTION 2: SERVICE PROVIDERS --- */}
        <h6 className="fw-bold text-secondary mb-3 text-uppercase small" style={{letterSpacing:'1px'}}>{uiText("Service Providers & Office")}</h6>
        <div className="row g-3 mb-5 service-grid">
            {serviceContacts.map((item, index) => (
                <div key={index} className="col-md-4">
                    <a href={`tel:${item.number.replace(/\s/g, '')}`} className="card contact-card border-0 shadow-sm rounded-4 h-100 bg-white text-decoration-none" aria-label={uiText("Call {{v0}}", { v0: item.name })}>
                        <div className="card-body d-flex align-items-center p-4">
                            <div className="rounded-circle p-3 me-3 d-flex align-items-center justify-content-center bg-light text-secondary" 
                                 style={{width:'50px', height:'50px'}}>
                                {item.icon}
                            </div>
                            <div>
                                <h6 className="fw-bold text-dark mb-1">{uiText(item.name)}</h6>
                                <small className="text-muted fw-bold">{item.number}</small>
                            </div>
                        </div>
                    </a>
                </div>
            ))}
        </div>

        {/* --- SECTION 3: RESIDENT SEARCH --- */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <h5 className="fw-bold text-dark m-0">{uiText("All Residents (")}{members.length})</h5>
            <div className="input-group shadow-sm directory-search" style={{maxWidth: '300px'}}>
                <span className="input-group-text bg-white border-0 ps-3"><FaSearch className="text-muted"/></span>
                <input 
                    type="text" 
                    className="form-control border-0 py-2" 
                    placeholder={uiText("Search by Name or Row House...")} 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Residents Grid */}
        <div className="row g-3">
            {loading ? <div className="p-5 text-center text-muted">{uiText("Loading directory...")}</div> : 
             filteredMembers.length === 0 ? <div className="p-5 text-center text-muted">{uiText("No residents found.")}</div> : 
             filteredMembers.map((member) => (
                <div key={member.id} className="col-md-6 col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 hover-shadow">
                        <div className="card-body d-flex align-items-center p-3">
                            {/* Avatar */}
                            <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-3" 
                                 style={{width:'50px', height:'50px', fontSize:'1.2rem', fontWeight:'bold'}}>
                                {member.fullName?.charAt(0) || 'U'}
                            </div>
                            {/* Details */}
                            <div className="overflow-hidden">
                                <h6 className="fw-bold text-dark mb-1 text-truncate">{member.fullName}</h6>
                                <div className="d-flex gap-3">
                                    <span className="badge bg-light text-dark border">{uiText("Row house") + ' '}{member.flatNo}</span>
                                    {member.phoneNumber && (
                                        <a href={`tel:${member.phoneNumber}`} className="text-decoration-none text-muted small d-flex align-items-center">
                                            <FaPhoneAlt size={10} className="me-1"/> {member.phoneNumber}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

    </div>
  );
};

export default Directory;
