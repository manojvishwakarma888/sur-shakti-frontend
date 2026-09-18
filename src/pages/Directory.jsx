import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { 
  FaShieldAlt, FaFireExtinguisher, FaAmbulance, 
  FaBuilding, FaTools, FaWrench, FaSearch, FaPhoneAlt, FaUser 
} from 'react-icons/fa';

const Directory = () => {
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
    <>
      <h2 className="fw-bold text-dark mb-4">Community Directory</h2>

        {/* --- SECTION 1: EMERGENCY CONTACTS --- */}
        <h6 className="fw-bold text-danger mb-3 text-uppercase small" style={{letterSpacing:'1px'}}>
            <span className="me-2">*</span>Emergency Contacts
        </h6>
        <div className="row g-4 mb-5">
            {emergencyContacts.map((item, index) => (
                <div key={index} className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100" style={{backgroundColor: item.bg}}>
                        <div className="card-body d-flex align-items-center p-4">
                            <div className="rounded-circle p-3 me-3 d-flex align-items-center justify-content-center bg-white" 
                                 style={{width:'50px', height:'50px', color: item.text}}>
                                {item.icon}
                            </div>
                            <div>
                                <h6 className="fw-bold mb-1" style={{color: '#742A2A'}}>{item.name}</h6>
                                <span className="fs-5 fw-bold" style={{color: item.text}}>{item.number}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* --- SECTION 2: SERVICE PROVIDERS --- */}
        <h6 className="fw-bold text-secondary mb-3 text-uppercase small" style={{letterSpacing:'1px'}}>
            Service Providers & Office
        </h6>
        <div className="row g-4 mb-5">
            {serviceContacts.map((item, index) => (
                <div key={index} className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
                        <div className="card-body d-flex align-items-center p-4">
                            <div className="rounded-circle p-3 me-3 d-flex align-items-center justify-content-center bg-light text-secondary" 
                                 style={{width:'50px', height:'50px'}}>
                                {item.icon}
                            </div>
                            <div>
                                <h6 className="fw-bold text-dark mb-1">{item.name}</h6>
                                <small className="text-muted fw-bold">{item.number}</small>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* --- SECTION 3: RESIDENT SEARCH --- */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <h5 className="fw-bold text-dark m-0">All Residents ({members.length})</h5>
            <div className="input-group shadow-sm" style={{maxWidth: '300px'}}>
                <span className="input-group-text bg-white border-0 ps-3"><FaSearch className="text-muted"/></span>
                <input 
                    type="text" 
                    className="form-control border-0 py-2" 
                    placeholder="Search by Name or Flat..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Residents Grid */}
        <div className="row g-3">
            {loading ? <div className="p-5 text-center text-muted">Loading directory...</div> : 
             filteredMembers.length === 0 ? <div className="p-5 text-center text-muted">No residents found.</div> : 
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
                                    <span className="badge bg-light text-dark border">Flat {member.flatNo}</span>
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

    </>
  );
};

export default Directory;