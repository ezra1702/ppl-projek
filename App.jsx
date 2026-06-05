import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// ==========================================
// DUMMY DATA CONSTANTS
// ==========================================
const DUMMY_USERS = {
  mahasiswa: [
    { nim: '245150300111002', password: 'mhs', name: 'Jahzeel', role: 'mahasiswa' },
    { nim: '245150300111008', password: 'mhs2', name: 'Abdillah', role: 'mahasiswa' }
  ],
  operator: { username: 'operator', password: 'op123', name: 'Operator Lobby', role: 'operator' },
  staf: { username: 'staf', password: 'staf123', name: 'Staf Gedung A', role: 'staf' }
};

const INITIAL_FACILITIES = [
  { id: 'f1', name: 'GKM Lt.2', type: 'Ruangan', status: 'tersedia' },
  { id: 'f2', name: 'Lab Komputer', type: 'Ruangan', status: 'tersedia' },
  { id: 'f3', name: 'Ruang Rapat', type: 'Ruangan', status: 'tersedia' },
  { id: 'f4', name: 'PS5 Station A', type: 'Game Corner', status: 'digunakan' }, // Occupied by Abdillah in dummy txn
  { id: 'f5', name: 'PS5 Station B', type: 'Game Corner', status: 'tersedia' },
  { id: 'f6', name: 'PC Gaming 1', type: 'Game Corner', status: 'tersedia' }
];

const INITIAL_BOOKINGS = [
  {
    id: 'b1',
    facilityId: 'f1',
    facilityName: 'GKM Lt.2',
    facilityType: 'Ruangan',
    studentNim: '245150300111002',
    studentName: 'Jahzeel',
    startTime: '2026-06-05T09:00',
    endTime: '2026-06-05T12:00',
    status: 'Menunggu',
    token: 'QR-RM-GKM2',
    reason: ''
  },
  {
    id: 'b2',
    facilityId: 'f4',
    facilityName: 'PS5 Station A',
    facilityType: 'Game Corner',
    studentNim: '245150300111008',
    studentName: 'Abdillah',
    startTime: '2026-06-05T16:00',
    endTime: '2026-06-05T17:00',
    status: 'Aktif',
    token: 'QR-GC-8B92',
    reason: ''
  }
];

const INITIAL_NOTIFICATIONS = [
  { id: 'n1', studentNim: '245150300111002', message: 'Permohonan peminjaman GKM Lt.2 sedang menunggu persetujuan.', read: false, time: 'Baru saja' },
  { id: 'n2', studentNim: '245150300111008', message: 'Peminjaman PS5 Station A langsung aktif! Silakan scan QR Code di lobby.', read: false, time: 'Baru saja' }
];

// Helper to generate dynamic simulated QR code grid
function QRCodeSimulated({ token }) {
  const size = 9;
  const cells = [];
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = token.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isTopLeftCorner = r < 3 && c < 3;
      const isTopRightCorner = r < 3 && c >= size - 3;
      const isBottomLeftCorner = r >= size - 3 && c < 3;
      
      let filled = false;
      if (isTopLeftCorner) {
        filled = (r === 0 || r === 2 || c === 0 || c === 2);
      } else if (isTopRightCorner) {
        filled = (r === 0 || r === 2 || c === size - 1 || c === size - 3);
      } else if (isBottomLeftCorner) {
        filled = (r === size - 1 || r === size - 3 || c === 0 || c === 2);
      } else {
        const val = Math.abs(hash ^ (r * 13 + c * 37));
        filled = (val % 3) === 0;
      }
      cells.push({ r, c, filled });
    }
  }

  return (
    <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-slate-200 shadow-md max-w-[180px] mx-auto">
      <svg width="120" height="120" viewBox="0 0 9 9" className="shape-rendering-crispedges">
        {cells.map((cell, idx) => (
          <rect
            key={idx}
            x={cell.c}
            y={cell.r}
            width="1"
            height="1"
            fill={cell.filled ? "#1E293B" : "#FFFFFF"}
          />
        ))}
      </svg>
      <div className="mt-3 text-[11px] font-mono font-extrabold text-slate-700 bg-slate-100 px-3 py-1 rounded-md uppercase tracking-wider">
        {token}
      </div>
    </div>
  );
}

export default function App() {
  // ==========================================
  // APP STATE
  // ==========================================
  const [facilities, setFacilities] = useState(INITIAL_FACILITIES);
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  
  // Navigation & User Session
  const [selectedRole, setSelectedRole] = useState(null); // 'mahasiswa' | 'operator' | 'staf' (for login selection)
  const [currentUser, setCurrentUser] = useState(null);   // Logged in user object
  const [currentPage, setCurrentPage] = useState('login'); // 'login' | 'dashboard'
  
  // Login Forms
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Student Form Booking State
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  // Operator Input State
  const [checkoutToken, setCheckoutToken] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState({ text: '', type: '' });

  // Staff Rejection Modal State
  const [rejectingBookingId, setRejectingBookingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Notification UI Dropdown
  const [showNotifications, setShowNotifications] = useState(false);

  // QR Scanner state variables
  const [operatorScanner, setOperatorScanner] = useState(null);
  const [operatorScanning, setOperatorScanning] = useState(false);
  const [studentScanner, setStudentScanner] = useState(null);
  const [studentScanning, setStudentScanning] = useState(false);
  const [activeTabOperator, setActiveTabOperator] = useState('manual'); // 'manual' | 'scan'
  const [activeTabStudent, setActiveTabStudent] = useState('manual'); // 'manual' | 'scan'

  // Automatically update facility availability based on current active bookings
  useEffect(() => {
    setFacilities(prevFacilities => {
      return prevFacilities.map(fac => {
        // A facility is 'digunakan' if there is ANY booking for it that is 'Aktif'
        const isActive = bookings.some(b => b.facilityId === fac.id && b.status === 'Aktif');
        return {
          ...fac,
          status: isActive ? 'digunakan' : 'tersedia'
        };
      });
    });
  }, [bookings]);

  // ==========================================
  // SCANNER EFFECT CLEANUPS & LIFECYCLES
  // ==========================================
  useEffect(() => {
    return () => {
      if (operatorScanner) operatorScanner.stop().catch(e => {});
      if (studentScanner) studentScanner.stop().catch(e => {});
    };
  }, [operatorScanner, studentScanner]);

  useEffect(() => {
    if (operatorScanning) stopOperatorScanner();
    if (studentScanning) stopStudentScanner();
    setActiveTabOperator('manual');
    setActiveTabStudent('manual');
    setCheckoutMessage({ text: '', type: '' });
    setBookingError('');
    setBookingSuccess('');
  }, [currentUser]);

  const startOperatorScanner = () => {
    setOperatorScanning(true);
    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("operator-qr-reader");
        scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 200, height: 200 }
          },
          (decodedText) => {
            processScanCheckout(decodedText);
            scanner.stop().then(() => {
              setOperatorScanning(false);
              setOperatorScanner(null);
            }).catch(err => console.error(err));
          },
          (error) => {}
        ).then(() => {
          setOperatorScanner(scanner);
        }).catch(err => {
          console.warn("Camera access failed or blocked, simulation is available.", err);
        });
      } catch (e) {
        console.error(e);
      }
    }, 100);
  };

  const stopOperatorScanner = () => {
    if (operatorScanner) {
      operatorScanner.stop().then(() => {
        setOperatorScanner(null);
        setOperatorScanning(false);
      }).catch(err => {
        console.error(err);
        setOperatorScanner(null);
        setOperatorScanning(false);
      });
    } else {
      setOperatorScanning(false);
    }
  };

  const startStudentScanner = () => {
    setStudentScanning(true);
    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("student-qr-reader");
        scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 200, height: 200 }
          },
          (decodedText) => {
            processScanFacility(decodedText);
            scanner.stop().then(() => {
              setStudentScanning(false);
              setStudentScanner(null);
            }).catch(err => console.error(err));
          },
          (error) => {}
        ).then(() => {
          setStudentScanner(scanner);
        }).catch(err => {
          console.warn("Camera access failed or blocked, simulation is available.", err);
        });
      } catch (e) {
        console.error(e);
      }
    }, 100);
  };

  const stopStudentScanner = () => {
    if (studentScanner) {
      studentScanner.stop().then(() => {
        setStudentScanner(null);
        setStudentScanning(false);
      }).catch(err => {
        console.error(err);
        setStudentScanner(null);
        setStudentScanning(false);
      });
    } else {
      setStudentScanning(false);
    }
  };

  const processScanCheckout = (text) => {
    if (!text) return;
    const query = text.trim().toUpperCase();
    const bookingIdx = bookings.findIndex(b => 
      b.status === 'Aktif' && 
      (b.token.toUpperCase() === query || b.studentNim === query)
    );

    if (bookingIdx !== -1) {
      const updatedBookings = [...bookings];
      const completedBooking = updatedBookings[bookingIdx];
      updatedBookings[bookingIdx] = {
        ...completedBooking,
        status: 'Selesai'
      };
      setBookings(updatedBookings);

      const newNotif = {
        id: `n-${Date.now()}`,
        studentNim: completedBooking.studentNim,
        message: `Sesi peminjaman ${completedBooking.facilityName} Anda telah diselesaikan (Checked-Out oleh scan Operator).`,
        read: false,
        time: 'Baru saja'
      };
      setNotifications(prev => [newNotif, ...prev]);

      setCheckoutMessage({ 
        text: `Check-out sukses via Scan! Fasilitas ${completedBooking.facilityName} (Peminjam: ${completedBooking.studentName}) telah tersedia kembali.`, 
        type: 'success' 
      });
      return true;
    } else {
      setCheckoutMessage({ 
        text: `Scan QR Gagal: Tidak ada booking Aktif yang cocok dengan token/NIM "${query}".`, 
        type: 'error' 
      });
      return false;
    }
  };

  const processScanFacility = (text) => {
    if (!text) return;
    const query = text.trim();
    const facilityId = query.startsWith('FAC-') ? query.substring(4) : query;
    
    const fac = facilities.find(f => f.id === facilityId);
    if (fac) {
      if (fac.status === 'digunakan') {
        setBookingError(`Scan QR Berhasil: Fasilitas ${fac.name} terdeteksi, namun sedang digunakan.`);
        setBookingSuccess('');
        setActiveTabStudent('manual');
        return false;
      }

      setSelectedFacilityId(fac.id);
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const formatDateForInput = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      setStartTime(formatDateForInput(now));
      setEndTime(formatDateForInput(oneHourLater));
      
      setBookingSuccess(`Scan QR Berhasil! Fasilitas ${fac.name} dipilih. Silakan isi jam dan ajukan peminjaman.`);
      setBookingError('');
      setActiveTabStudent('manual');
      return true;
    } else {
      setBookingError(`QR Code tidak valid atau fasilitas tidak ditemukan (Token: "${query}").`);
      setBookingSuccess('');
      return false;
    }
  };

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  const handlePrefill = (role, id, pass) => {
    setSelectedRole(role);
    setLoginId(id);
    setLoginPass(pass);
    setLoginError('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    if (selectedRole === 'mahasiswa') {
      const match = DUMMY_USERS.mahasiswa.find(m => m.nim === loginId && m.password === loginPass);
      if (match) {
        setCurrentUser(match);
        setCurrentPage('dashboard');
      } else {
        setLoginError('NIM atau password salah!');
      }
    } else if (selectedRole === 'operator') {
      const match = DUMMY_USERS.operator;
      if (match.username === loginId && match.password === loginPass) {
        setCurrentUser(match);
        setCurrentPage('dashboard');
      } else {
        setLoginError('Username atau password operator salah!');
      }
    } else if (selectedRole === 'staf') {
      const match = DUMMY_USERS.staf;
      if (match.username === loginId && match.password === loginPass) {
        setCurrentUser(match);
        setCurrentPage('dashboard');
      } else {
        setLoginError('Username atau password staf salah!');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedRole(null);
    setLoginId('');
    setLoginPass('');
    setLoginError('');
    setCurrentPage('login');
    setShowNotifications(false);
    stopOperatorScanner();
    stopStudentScanner();
  };

  // Student: Submit Booking Form
  const handleCreateBooking = (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');

    if (!selectedFacilityId || !startTime || !endTime) {
      setBookingError('Harap lengkapi semua kolom peminjaman.');
      return;
    }

    const fac = facilities.find(f => f.id === selectedFacilityId);
    if (!fac) return;

    if (fac.status === 'digunakan') {
      setBookingError(`Fasilitas ${fac.name} sedang digunakan.`);
      return;
    }

    // Generate random code for QR token
    const tokenCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const typePrefix = fac.type === 'Ruangan' ? 'RM' : 'GC';
    const generatedToken = `QR-${typePrefix}-${tokenCode}`;

    const isRoom = fac.type === 'Ruangan';
    const bookingStatus = isRoom ? 'Menunggu' : 'Aktif';

    const newBooking = {
      id: `b-${Date.now()}`,
      facilityId: fac.id,
      facilityName: fac.name,
      facilityType: fac.type,
      studentNim: currentUser.nim,
      studentName: currentUser.name,
      startTime,
      endTime,
      status: bookingStatus,
      token: generatedToken,
      reason: ''
    };

    setBookings(prev => [newBooking, ...prev]);

    // Send notifications
    const newNotif = {
      id: `n-${Date.now()}`,
      studentNim: currentUser.nim,
      message: isRoom 
        ? `Permohonan peminjaman ${fac.name} diajukan dan sedang Menunggu persetujuan staf.`
        : `Peminjaman ${fac.name} disetujui secara instan! QR Token: ${generatedToken}`,
      read: false,
      time: 'Baru saja'
    };
    setNotifications(prev => [newNotif, ...prev]);

    setBookingSuccess(isRoom 
      ? `Permohonan ruangan ${fac.name} berhasil dikirim ke Staf Gedung!` 
      : `Peminjaman Game Corner ${fac.name} berhasil diaktifkan!`
    );

    // Reset inputs
    setSelectedFacilityId('');
    setStartTime('');
    setEndTime('');
  };

  // Operator: Process Check-out
  const handleCheckout = (e) => {
    e.preventDefault();
    setCheckoutMessage({ text: '', type: '' });

    if (!checkoutToken.trim()) {
      setCheckoutMessage({ text: 'Harap masukkan QR Token atau NIM Mahasiswa.', type: 'error' });
      return;
    }

    const query = checkoutToken.trim().toUpperCase();

    // Find the active booking matching either token or studentNim
    const bookingIdx = bookings.findIndex(b => 
      b.status === 'Aktif' && 
      (b.token.toUpperCase() === query || b.studentNim === query)
    );

    if (bookingIdx !== -1) {
      const updatedBookings = [...bookings];
      updatedBookings[bookingIdx] = {
        ...updatedBookings[bookingIdx],
        status: 'Selesai'
      };
      setBookings(updatedBookings);

      // Notify student
      const completedBooking = updatedBookings[bookingIdx];
      const newNotif = {
        id: `n-${Date.now()}`,
        studentNim: completedBooking.studentNim,
        message: `Sesi peminjaman ${completedBooking.facilityName} Anda telah diselesaikan (Checked-Out oleh Operator).`,
        read: false,
        time: 'Baru saja'
      };
      setNotifications(prev => [newNotif, ...prev]);

      setCheckoutMessage({ 
        text: `Check-out berhasil! Fasilitas ${completedBooking.facilityName} (dipinjam oleh ${completedBooking.studentName}) sekarang tersedia kembali.`, 
        type: 'success' 
      });
      setCheckoutToken('');
    } else {
      setCheckoutMessage({ 
        text: 'Tidak ada transaksi peminjaman AKTIF yang cocok dengan token atau NIM tersebut.', 
        type: 'error' 
      });
    }
  };

  // Operator: Direct checkout from row action
  const handleDirectCheckout = (bookingId) => {
    const bookingIdx = bookings.findIndex(b => b.id === bookingId);
    if (bookingIdx !== -1) {
      const updatedBookings = [...bookings];
      const completedBooking = updatedBookings[bookingIdx];
      updatedBookings[bookingIdx] = {
        ...completedBooking,
        status: 'Selesai'
      };
      setBookings(updatedBookings);

      const newNotif = {
        id: `n-${Date.now()}`,
        studentNim: completedBooking.studentNim,
        message: `Sesi peminjaman ${completedBooking.facilityName} Anda telah diselesaikan (Checked-Out oleh Operator).`,
        read: false,
        time: 'Baru saja'
      };
      setNotifications(prev => [newNotif, ...prev]);

      setCheckoutMessage({ 
        text: `Check-out sukses untuk ${completedBooking.facilityName} (peminjam: ${completedBooking.studentName})!`, 
        type: 'success' 
      });
    }
  };

  // Staff: Approve Booking
  const handleApproveBooking = (bookingId) => {
    const bookingIdx = bookings.findIndex(b => b.id === bookingId);
    if (bookingIdx !== -1) {
      const updatedBookings = [...bookings];
      const target = updatedBookings[bookingIdx];
      
      // Update status
      updatedBookings[bookingIdx] = {
        ...target,
        status: 'Aktif'
      };
      setBookings(updatedBookings);

      // Create notification
      const newNotif = {
        id: `n-${Date.now()}`,
        studentNim: target.studentNim,
        message: `Persetujuan Diterima! Peminjaman ruangan ${target.facilityName} Anda telah disetujui oleh Staf Gedung. QR Token: ${target.token}`,
        read: false,
        time: 'Baru saja'
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  // Staff: Open Reject dialog
  const openRejectDialog = (bookingId) => {
    setRejectingBookingId(bookingId);
    setRejectionReason('');
  };

  // Staff: Submit Rejection
  const handleRejectBooking = () => {
    if (!rejectionReason.trim()) {
      alert('Harap masukkan alasan penolakan.');
      return;
    }

    const bookingIdx = bookings.findIndex(b => b.id === rejectingBookingId);
    if (bookingIdx !== -1) {
      const updatedBookings = [...bookings];
      const target = updatedBookings[bookingIdx];
      
      updatedBookings[bookingIdx] = {
        ...target,
        status: 'Ditolak',
        reason: rejectionReason
      };
      setBookings(updatedBookings);

      // Create notification
      const newNotif = {
        id: `n-${Date.now()}`,
        studentNim: target.studentNim,
        message: `Permohonan ditolak! Peminjaman ruangan ${target.facilityName} ditolak. Alasan: "${rejectionReason}"`,
        read: false,
        time: 'Baru saja'
      };
      setNotifications(prev => [newNotif, ...prev]);
    }

    setRejectingBookingId(null);
    setRejectionReason('');
  };

  // Toggle notification read status
  const handleMarkAllRead = () => {
    if (!currentUser || currentUser.role !== 'mahasiswa') return;
    setNotifications(prev => 
      prev.map(n => n.studentNim === currentUser.nim ? { ...n, read: true } : n)
    );
  };

  // Filtered lists
  const studentBookings = currentUser && currentUser.role === 'mahasiswa'
    ? bookings.filter(b => b.studentNim === currentUser.nim)
    : [];

  const activeBookings = bookings.filter(b => b.status === 'Aktif');
  
  const pendingBookings = bookings.filter(b => b.status === 'Menunggu' && b.facilityType === 'Ruangan');

  const studentUnreadNotifCount = currentUser && currentUser.role === 'mahasiswa'
    ? notifications.filter(n => n.studentNim === currentUser.nim && !n.read).length
    : 0;

  // ==========================================
  // RENDER INTERFACES
  // ==========================================

  // 1. Navbar / Top Header Component
  const renderNavbar = () => {
    if (!currentUser) return null;
    return (
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-amber-500/30 text-white shadow-lg backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Logo FILKOM / UB Simili */}
            <div className="bg-amber-500 text-slate-950 p-2 rounded-lg font-bold text-xs tracking-wider flex flex-col justify-center items-center h-10 w-10 shadow-md">
              <span className="leading-none text-[10px]">UB</span>
              <span className="font-extrabold text-[12px] leading-none">FKM</span>
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-wide text-amber-400">FILKOM BORROW</h1>
              <p className="text-[10px] text-slate-400">Sistem Peminjaman Fasilitas Kampus</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notification Dropdown (Only for Mahasiswa) */}
            {currentUser.role === 'mahasiswa' && (
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) handleMarkAllRead();
                  }}
                  className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition duration-150 border border-slate-700/60 focus:outline-none"
                >
                  <svg className="w-5 height-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {studentUnreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-slate-950 animate-pulse">
                      {studentUnreadNotifCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                      <span className="font-semibold text-xs text-slate-300">Notifikasi Masuk</span>
                      <span className="text-[10px] text-amber-500 font-medium">In-Memory Log</span>
                    </div>
                    <div className="max-height-[250px] overflow-y-auto divide-y divide-slate-900 max-h-64">
                      {notifications.filter(n => n.studentNim === currentUser.nim).length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">Tidak ada notifikasi.</div>
                      ) : (
                        notifications
                          .filter(n => n.studentNim === currentUser.nim)
                          .map(notif => (
                            <div key={notif.id} className={`p-3 text-xs transition duration-150 hover:bg-slate-900 ${!notif.read ? 'bg-slate-900/50 border-l-2 border-amber-500' : ''}`}>
                              <p className="text-slate-300 leading-normal">{notif.message}</p>
                              <span className="text-[9px] text-slate-500 block mt-1">{notif.time}</span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Info */}
            <div className="hidden md:flex flex-col text-right">
              <span className="font-semibold text-xs text-slate-100">{currentUser.name}</span>
              <span className="text-[10px] text-amber-400 font-mono tracking-wider uppercase">
                {currentUser.role === 'mahasiswa' ? `Mahasiswa (${currentUser.nim})` : currentUser.role === 'operator' ? 'Operator Lobby' : 'Staf Gedung A'}
              </span>
            </div>

            {/* Logout button */}
            <button 
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-rose-950 hover:border-rose-900/60 text-slate-200 hover:text-white transition duration-150 text-xs font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
    );
  };

  // 2. Login & Landing Screen
  const renderLogin = () => {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>

        <div className="sm:mx-auto sm:width-full sm:max-w-md text-center z-10">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 p-4 rounded-2xl font-extrabold text-2xl shadow-xl shadow-amber-500/10 mb-4 h-16 w-16">
            FILK
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Sistem Peminjaman Fasilitas</h2>
          <p className="mt-2 text-sm text-slate-400">
            Fakultas Ilmu Komputer, Universitas Brawijaya
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
            
            {/* Step 1: Select Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
                PILIH ROLE UNTUK MASUK
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedRole('mahasiswa'); setLoginError(''); setLoginId(''); setLoginPass(''); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                    selectedRole === 'mahasiswa'
                      ? 'border-amber-500 bg-amber-500/10 text-white shadow-lg shadow-amber-500/5'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <svg className="w-6 height-6 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  <span className="text-xs font-bold">Mahasiswa</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedRole('operator'); setLoginError(''); setLoginId(''); setLoginPass(''); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                    selectedRole === 'operator'
                      ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/5'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <svg className="w-6 height-6 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-bold">Operator</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedRole('staf'); setLoginError(''); setLoginId(''); setLoginPass(''); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                    selectedRole === 'staf'
                      ? 'border-purple-500 bg-purple-500/10 text-white shadow-lg shadow-purple-500/5'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <svg className="w-6 height-6 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-xs font-bold">Staf Gedung</span>
                </button>
              </div>
            </div>

            {/* Step 2: Login Form (Condition based on Selected Role) */}
            {selectedRole ? (
              <form onSubmit={handleLogin} className="space-y-4 pt-2 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200 capitalize">
                  Form Login {selectedRole}
                </h3>

                {loginError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-900/50 text-rose-200 text-xs flex items-center space-x-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    {selectedRole === 'mahasiswa' ? 'NIM Mahasiswa' : 'Username'}
                  </label>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                    placeholder={selectedRole === 'mahasiswa' ? 'Contoh: 245150300111002' : 'Contoh: operator / staf'}
                    className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    required
                    placeholder="Masukkan password"
                    className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold text-slate-950 transition-all duration-200 focus:outline-none ${
                    selectedRole === 'mahasiswa'
                      ? 'bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/10'
                      : selectedRole === 'operator'
                      ? 'bg-cyan-400 hover:bg-cyan-300 shadow-md shadow-cyan-400/10'
                      : 'bg-purple-400 hover:bg-purple-300 shadow-md shadow-purple-400/10'
                  }`}
                >
                  Masuk ke Dashboard
                </button>
              </form>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Pilih salah satu tipe role di atas untuk mulai mengisi form login.
              </div>
            )}

            {/* Dummy Credentials Helper / Quick Autofill */}
            <div className="pt-4 border-t border-slate-800">
              <span className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-2">
                DUMMY LOGIN QUICK-FILL (Klik untuk Auto-Fill):
              </span>
              <div className="space-y-1.5">
                <button
                  onClick={() => handlePrefill('mahasiswa', '245150300111002', 'mhs')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[11px] border border-slate-900 hover:border-slate-800 transition text-slate-400 font-mono"
                >
                  <span className="text-slate-300">Mahasiswa (Jahzeel)</span>
                  <span className="text-amber-500 text-[10px]">NIM: 245150300111002 / mhs</span>
                </button>
                <button
                  onClick={() => handlePrefill('mahasiswa', '245150300111008', 'mhs2')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[11px] border border-slate-900 hover:border-slate-800 transition text-slate-400 font-mono"
                >
                  <span className="text-slate-300">Mahasiswa (Abdillah)</span>
                  <span className="text-amber-500 text-[10px]">NIM: 245150300111008 / mhs2</span>
                </button>
                <button
                  onClick={() => handlePrefill('operator', 'operator', 'op123')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[11px] border border-slate-900 hover:border-slate-800 transition text-slate-400 font-mono"
                >
                  <span className="text-slate-300">Operator Lobby</span>
                  <span className="text-cyan-500 text-[10px]">user: operator / op123</span>
                </button>
                <button
                  onClick={() => handlePrefill('staf', 'staf', 'staf123')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[11px] border border-slate-900 hover:border-slate-800 transition text-slate-400 font-mono"
                >
                  <span className="text-slate-300">Staf Gedung A</span>
                  <span className="text-purple-500 text-[10px]">user: staf / staf123</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // 3. Student view
  const renderStudentDashboard = () => {
    // Check if current user has an ACTIVE booking
    const activeBookingObj = studentBookings.find(b => b.status === 'Aktif');

    return (
      <div className="space-y-6">
        {/* Banner Welcome */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none"></div>
          <h2 className="text-xl font-bold text-white">Halo, {currentUser.name}!</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
            Selamat datang di portal mahasiswa. Di sini Anda dapat meminjam ruang kuliah/GKM (memerlukan persetujuan Staf) atau PC & PS5 Game Corner (aktif seketika).
          </p>
        </div>

        {/* main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Col 1: Facility List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Daftar Fasilitas Tersedia
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {facilities.map(fac => {
                const isOccupied = fac.status === 'digunakan';
                const isRoom = fac.type === 'Ruangan';
                return (
                  <div 
                    key={fac.id}
                    className={`rounded-xl border p-4 transition duration-200 bg-slate-900/50 backdrop-blur ${
                      isOccupied 
                        ? 'border-slate-800/80' 
                        : isRoom 
                        ? 'border-blue-900/50 hover:border-blue-700/80 hover:shadow-md hover:shadow-blue-500/5'
                        : 'border-amber-600/30 hover:border-amber-500/60 hover:shadow-md hover:shadow-amber-500/5'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isRoom ? 'bg-blue-950 text-blue-400 border border-blue-800/30' : 'bg-amber-950 text-amber-400 border border-amber-800/30'
                        }`}>
                          {fac.type}
                        </span>
                        <h4 className="font-bold text-slate-200 mt-2 text-sm">{fac.name}</h4>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md ${
                        isOccupied 
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-900/50' 
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-900/50'
                      }`}>
                        {isOccupied ? 'Digunakan' : 'Tersedia'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {isRoom ? 'Butuh approval staf' : 'Peminjaman instan'}
                      </span>
                      {!isOccupied && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFacilityId(fac.id);
                            // Set automatic time window: now to 1 hour later
                            const now = new Date();
                            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
                            const formatDateForInput = (d) => {
                              const pad = (n) => String(n).padStart(2, '0');
                              return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                            };
                            setStartTime(formatDateForInput(now));
                            setEndTime(formatDateForInput(oneHourLater));
                            setBookingError('');
                            setBookingSuccess('');
                          }}
                          className={`px-3 py-1 rounded-md font-bold text-[11px] transition ${
                            isRoom
                              ? 'bg-blue-600 hover:bg-blue-500 text-white'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          Pilih
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Col 2: Booking Form & Active QR */}
          <div className="space-y-6">
            {/* Active QR Box (If exists) */}
            {activeBookingObj && (
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 shadow-xl text-center space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[9px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                  Peminjaman Aktif
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">{activeBookingObj.facilityName}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">
                    {activeBookingObj.facilityType} • {activeBookingObj.studentName}
                  </p>
                </div>

                <QRCodeSimulated token={activeBookingObj.token} />

                <p className="text-[10px] text-slate-400 leading-normal max-w-[190px] mx-auto">
                  Tunjukkan QR Code di atas ke **Operator Lobby** saat check-out fasilitas.
                </p>
              </div>
            )}            {/* Form Peminjaman */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-800 mb-2">
                <button
                  type="button"
                  onClick={() => { setActiveTabStudent('manual'); stopStudentScanner(); }}
                  className={`flex-1 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-center transition ${
                    activeTabStudent === 'manual'
                      ? 'border-b-2 border-amber-500 text-amber-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Form Manual
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTabStudent('scan'); }}
                  className={`flex-1 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-center transition ${
                    activeTabStudent === 'scan'
                      ? 'border-b-2 border-amber-500 text-amber-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Scan QR Fasilitas
                </button>
              </div>

              {activeTabStudent === 'manual' ? (
                <React.Fragment>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Form Ajukan Peminjaman
                  </h3>

                  {bookingError && (
                    <div className="p-2.5 rounded bg-rose-950/60 border border-rose-900/40 text-rose-300 text-[11px] flex items-start space-x-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{bookingError}</span>
                    </div>
                  )}

                  {bookingSuccess && (
                    <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-900/40 text-emerald-300 text-[11px] flex items-start space-x-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{bookingSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateBooking} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Pilih Fasilitas
                      </label>
                      <select
                        value={selectedFacilityId}
                        onChange={(e) => {
                          setSelectedFacilityId(e.target.value);
                          setBookingError('');
                          setBookingSuccess('');
                        }}
                        className="mt-1 block w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="">-- Pilih Ruangan / Game Corner --</option>
                        {facilities.map(f => (
                          <option 
                            key={f.id} 
                            value={f.id} 
                            disabled={f.status === 'digunakan'}
                            className={f.status === 'digunakan' ? 'text-slate-600' : 'text-slate-200'}
                          >
                            {f.name} ({f.type} - {f.status === 'digunakan' ? 'Penuh' : 'Tersedia'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Waktu Mulai
                      </label>
                      <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="mt-1 block w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Waktu Selesai
                      </label>
                      <input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="mt-1 block w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition duration-150 shadow shadow-amber-500/20"
                    >
                      Ajukan Peminjaman
                    </button>
                  </form>
                </React.Fragment>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pindai QR Code Fasilitas
                  </h3>

                  {bookingError && (
                    <div className="p-2 rounded bg-rose-950/60 border border-rose-900/40 text-rose-300 text-[11px]">
                      {bookingError}
                    </div>
                  )}

                  {/* Webcam scan container */}
                  <div className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950 aspect-video flex flex-col justify-center items-center">
                    <div id="student-qr-reader" className="absolute inset-0 w-full h-full object-cover"></div>
                    
                    {studentScanning && <div className="absolute inset-x-0 h-[2px] bg-emerald-500 shadow-[0_0_8px_2px_#10B981] animate-scan-line z-20"></div>}

                    {!studentScanning ? (
                      <div className="text-center p-4 z-10 space-y-2">
                        <svg className="w-8 h-8 text-slate-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-[10px] text-slate-500">Kamera dinonaktifkan</p>
                      </div>
                    ) : (
                      <div className="absolute bottom-2 left-2 z-10 bg-slate-950/80 px-2 py-0.5 rounded text-[9px] text-emerald-400 font-mono flex items-center space-x-1 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span>Kamera Aktif</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!studentScanning ? (
                      <button
                        type="button"
                        onClick={startStudentScanner}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                      >
                        <span>Aktifkan Kamera</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopStudentScanner}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-rose-950 text-rose-300 border border-rose-900/40 hover:bg-rose-900/60 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                      >
                        <span>Matikan Kamera</span>
                      </button>
                    )}
                  </div>

                  {/* Dropdown Simulation Fallback */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      SIMULASI SCAN (Gunakan opsi ini jika kamera terblokir):
                    </span>
                    <div className="flex gap-2">
                      <select
                        id="demo-student-scan-select"
                        className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                      >
                        {facilities.map(f => (
                          <option key={f.id} value={`FAC-${f.id}`} disabled={f.status === 'digunakan'}>
                            {f.name} ({f.type} - {f.status === 'digunakan' ? 'Penuh' : 'Tersedia'})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const sel = document.getElementById('demo-student-scan-select');
                          if (sel) processScanFacility(sel.value);
                        }}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition"
                      >
                        Pindai
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-900/50">
                      Pilihlah salah satu fasilitas yang tersedia di atas, lalu klik **Pindai** untuk menyimulasikan pendeteksian kode QR fisik pada meja/dinding fasilitas.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Row 3: History Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Riwayat Peminjaman Saya ({currentUser.name})
          </h3>

          <div className="overflow-x-auto rounded-lg border border-slate-800/60">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fasilitas</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipe</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waktu Mulai</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waktu Selesai</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Token QR / Info</th>
                </tr>
              </thead>
              <tbody className="bg-slate-900/30 divide-y divide-slate-800">
                {studentBookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-xs text-slate-500">
                      Anda belum memiliki riwayat transaksi peminjaman.
                    </td>
                  </tr>
                ) : (
                  studentBookings.map(b => {
                    let statusColor = '';
                    switch (b.status) {
                      case 'Aktif': statusColor = 'bg-emerald-950/80 text-emerald-300 border border-emerald-900/50'; break;
                      case 'Menunggu': statusColor = 'bg-amber-950/80 text-amber-300 border border-amber-900/50'; break;
                      case 'Ditolak': statusColor = 'bg-rose-950/80 text-rose-300 border border-rose-900/50'; break;
                      case 'Selesai': default: statusColor = 'bg-slate-850 text-slate-400 border border-slate-800'; break;
                    }

                    const formatTime = (timeStr) => {
                      const d = new Date(timeStr);
                      return isNaN(d.getTime()) ? timeStr : d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
                    };

                    return (
                      <tr key={b.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-3 text-xs font-bold text-slate-200">{b.facilityName}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{b.facilityType}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{formatTime(b.startTime)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{formatTime(b.endTime)}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold leading-5 ${statusColor}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-300">
                          {b.status === 'Aktif' ? (
                            <span className="text-amber-500 font-bold bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20">{b.token}</span>
                          ) : b.status === 'Ditolak' ? (
                            <span className="text-rose-400 italic text-[11px]">Alasan: {b.reason || '-'}</span>
                          ) : b.status === 'Menunggu' ? (
                            <span className="text-slate-500 text-[11px] italic">Perlu review Staf</span>
                          ) : (
                            <span className="text-slate-500 text-[11px] font-normal">Selesai checked-out</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 4. Operator view
  const renderOperatorDashboard = () => {
    const totalActive = activeBookings.length;
    const occupiedFacilitiesCount = facilities.filter(f => f.status === 'digunakan').length;

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Peminjaman Aktif</span>
              <span className="text-3xl font-extrabold text-cyan-400 mt-1 block">{totalActive}</span>
            </div>
            <div className="p-3 bg-cyan-950/50 rounded-lg text-cyan-400 border border-cyan-800/20">
              <svg className="w-6 height-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fasilitas Digunakan</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-1 block">{occupiedFacilitiesCount} / {facilities.length}</span>
            </div>
            <div className="p-3 bg-emerald-950/50 rounded-lg text-emerald-400 border border-emerald-800/20">
              <svg className="w-6 height-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        {/* main forms */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Check out Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex border-b border-slate-800 mb-2">
              <button
                type="button"
                onClick={() => { setActiveTabOperator('manual'); stopOperatorScanner(); }}
                className={`flex-1 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-center transition ${
                  activeTabOperator === 'manual'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Input NIM/Token
              </button>
              <button
                type="button"
                onClick={() => { setActiveTabOperator('scan'); }}
                className={`flex-1 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-center transition ${
                  activeTabOperator === 'scan'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kamera Scan QR
              </button>
            </div>

            {checkoutMessage.text && (
              <div className={`p-3 rounded text-[11px] flex items-start space-x-2 ${
                checkoutMessage.type === 'success' 
                  ? 'bg-emerald-950/70 border border-emerald-900/40 text-emerald-300' 
                  : 'bg-rose-950/70 border border-rose-900/40 text-rose-300'
              }`}>
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {checkoutMessage.type === 'success' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <span>{checkoutMessage.text}</span>
              </div>
            )}

            {activeTabOperator === 'manual' ? (
              <form onSubmit={handleCheckout} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    NIM Peminjam atau Token QR Code
                  </label>
                  <input
                    type="text"
                    value={checkoutToken}
                    onChange={(e) => setCheckoutToken(e.target.value)}
                    placeholder="Contoh: QR-GC-8B92 atau 2451503..."
                    className="mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition duration-150"
                >
                  Proses Check-Out
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Scan QR Code Mahasiswa
                </h3>

                {/* Webcam reader viewport */}
                <div className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950 aspect-video flex flex-col justify-center items-center">
                  <div id="operator-qr-reader" className="absolute inset-0 w-full h-full object-cover"></div>
                  
                  {operatorScanning && <div className="absolute inset-x-0 h-[2px] bg-emerald-500 shadow-[0_0_8px_2px_#10B981] animate-scan-line z-20"></div>}

                  {!operatorScanning ? (
                    <div className="text-center p-4 z-10 space-y-2">
                      <svg className="w-8 h-8 text-slate-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-[10px] text-slate-500">Kamera dinonaktifkan</p>
                    </div>
                  ) : (
                    <div className="absolute bottom-2 left-2 z-10 bg-slate-950/80 px-2 py-0.5 rounded text-[9px] text-emerald-400 font-mono flex items-center space-x-1 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>Kamera Aktif</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!operatorScanning ? (
                    <button
                      type="button"
                      onClick={startOperatorScanner}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                    >
                      <span>Aktifkan Kamera</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopOperatorScanner}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-rose-950 text-rose-300 border border-rose-900/40 hover:bg-rose-900/60 font-bold text-xs transition flex items-center justify-center space-x-1.5"
                    >
                      <span>Matikan Kamera</span>
                    </button>
                  )}
                </div>

                {/* Simulation dropdown */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    SIMULASI SCAN (Demo scanner tanpa webcam):
                  </span>
                  <div className="flex gap-2">
                    <select
                      id="demo-operator-scan-select"
                      className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                    >
                      {activeBookings.length === 0 ? (
                        <option value="">-- Tidak ada sewa aktif --</option>
                      ) : (
                        activeBookings.map(b => (
                          <option key={b.id} value={b.token}>
                            {b.studentName} - {b.facilityName} ({b.token})
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      disabled={activeBookings.length === 0}
                      onClick={() => {
                        const sel = document.getElementById('demo-operator-scan-select');
                        if (sel && sel.value) processScanCheckout(sel.value);
                      }}
                      className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-850 disabled:text-slate-500 text-slate-950 text-xs font-bold rounded-lg transition"
                    >
                      Pindai
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-900/50">
                    Pilih sewa aktif milik mahasiswa di atas, lalu klik **Pindai** untuk menyimulasikan pendeteksian kode QR dari handphone mahasiswa.
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">
              **Petunjuk**: Saat mahasiswa ingin menyudahi sewa PS5/PC/Ruangan, scan QR Code mereka atau input NIM/Token secara manual.
            </div>
          </div>

          {/* Active Bookings List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Daftar Sewa & Peminjaman Aktif
            </h3>

            <div className="overflow-x-auto rounded-lg border border-slate-800/60">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama / NIM</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fasilitas (Tipe)</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Token QR</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900/30 divide-y divide-slate-800">
                  {activeBookings.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-xs text-slate-500">
                        Tidak ada sewa fasilitas yang sedang aktif saat ini.
                      </td>
                    </tr>
                  ) : (
                    activeBookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-3 text-xs">
                          <div className="font-bold text-slate-200">{b.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.studentNim}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-semibold text-slate-200">{b.facilityName}</div>
                          <div className="text-[9px] text-slate-400 italic">{b.facilityType}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-cyan-400 font-bold">{b.token}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-900/50">
                            Aktif
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDirectCheckout(b.id)}
                            className="px-2.5 py-1 bg-rose-950/80 text-rose-300 hover:bg-rose-900/80 hover:text-white rounded border border-rose-900/40 text-[10px] font-bold transition"
                          >
                            Check-Out
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Global logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Log Semua Transaksi</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-800/60">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID Peminjaman</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mahasiswa</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fasilitas</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Token</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-slate-900/10 divide-y divide-slate-800">
                {bookings.map(b => (
                  <tr key={b.id} className="text-slate-400 text-xs">
                    <td className="px-4 py-2 font-mono text-[10px]">{b.id}</td>
                    <td className="px-4 py-2">{b.studentName} ({b.studentNim})</td>
                    <td className="px-4 py-2 text-slate-300">{b.facilityName} ({b.facilityType})</td>
                    <td className="px-4 py-2 font-mono">{b.token}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === 'Aktif' ? 'bg-emerald-950 text-emerald-400' :
                        b.status === 'Menunggu' ? 'bg-amber-950 text-amber-400' :
                        b.status === 'Ditolak' ? 'bg-rose-950 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  // 5. Building Staff view
  const renderStafDashboard = () => {
    const totalPending = pendingBookings.length;

    return (
      <div className="space-y-6">
        {/* Stats Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg max-w-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Permohonan Menunggu</span>
            <span className="text-3xl font-extrabold text-purple-400 mt-1 block">{totalPending} Pengajuan</span>
          </div>
          <div className="p-3 bg-purple-950/50 rounded-lg text-purple-400 border border-purple-800/20">
            <svg className="w-6 height-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        {/* Pending Approval List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Review Permohonan Peminjaman Ruang Kelas / GKM
          </h3>

          {/* Rejection input overlay modal (Inline-like drawer for simplicity) */}
          {rejectingBookingId && (
            <div className="p-4 bg-slate-950 rounded-xl border border-rose-900/50 space-y-3 shadow-2xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Form Alasan Tolak Pengajuan
                </span>
                <button 
                  onClick={() => setRejectingBookingId(null)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Batal
                </button>
              </div>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Tulis alasan penolakan (misal: Ruangan sedang dibersihkan, Bentrok kuliah)..."
                className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectingBookingId(null)}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectBooking}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px]"
                >
                  Tolak Pengajuan
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-800/60">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pemohon (NIM)</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ruangan</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rentang Waktu</th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-slate-900/30 divide-y divide-slate-800">
                {pendingBookings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-xs text-slate-500">
                      Tidak ada permohonan ruangan yang berstatus MENUNGGU.
                    </td>
                  </tr>
                ) : (
                  pendingBookings.map(b => {
                    const formatTime = (timeStr) => {
                      const d = new Date(timeStr);
                      return isNaN(d.getTime()) ? timeStr : d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
                    };

                    return (
                      <tr key={b.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-3 text-xs">
                          <div className="font-bold text-slate-200">{b.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.studentNim}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-200">
                          {b.facilityName}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {formatTime(b.startTime)} s/d {formatTime(b.endTime)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-950/80 text-amber-300 border border-amber-900/40">
                            Menunggu Review
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="inline-flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleApproveBooking(b.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition"
                            >
                              Setujui (Approve)
                            </button>
                            <button
                              type="button"
                              onClick={() => openRejectDialog(b.id)}
                              className="px-3 py-1 bg-rose-950/80 text-rose-300 hover:bg-rose-900/80 hover:text-white rounded border border-rose-900/40 text-[10px] font-bold transition"
                            >
                              Tolak (Reject)
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Room Booking Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Seluruh Riwayat Peminjaman Ruang</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-800/60">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fasilitas</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pemohon</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waktu</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Info</th>
                </tr>
              </thead>
              <tbody className="bg-slate-900/10 divide-y divide-slate-800">
                {bookings.filter(b => b.facilityType === 'Ruangan').map(b => (
                  <tr key={b.id} className="text-slate-400 text-xs hover:bg-slate-900/20">
                    <td className="px-4 py-2 font-bold text-slate-300">{b.facilityName}</td>
                    <td className="px-4 py-2">{b.studentName} ({b.studentNim})</td>
                    <td className="px-4 py-2 text-[11px]">{b.startTime} - {b.endTime}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        b.status === 'Aktif' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                        b.status === 'Menunggu' ? 'bg-amber-950 text-amber-400 border border-amber-900/30' :
                        b.status === 'Ditolak' ? 'bg-rose-950 text-rose-400 border border-rose-900/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[10px]">
                      {b.status === 'Ditolak' && b.reason ? (
                        <span className="text-rose-400 italic">Ditolak: "{b.reason}"</span>
                      ) : (
                        <span>Token: {b.token}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  // ==========================================
  // MAIN ROUTING RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      
      {/* Navbar when logged in */}
      {renderNavbar()}

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'login' ? (
          renderLogin()
        ) : (
          <div className="space-y-6">
            
            {/* Quick Switch Panel (DEV TOOL BAR) */}
            <div className="bg-slate-900/60 border border-dashed border-amber-500/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>DEV TOOLBAR: QUICK SWAP ROLE (Tanpa Re-login)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentUser(DUMMY_USERS.mahasiswa[0])}
                  className={`px-3 py-1 rounded font-bold transition text-[10px] uppercase ${
                    currentUser.role === 'mahasiswa' && currentUser.nim === '245150300111002'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Jahzeel (Mhs)
                </button>
                <button
                  onClick={() => setCurrentUser(DUMMY_USERS.mahasiswa[1])}
                  className={`px-3 py-1 rounded font-bold transition text-[10px] uppercase ${
                    currentUser.role === 'mahasiswa' && currentUser.nim === '245150300111008'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Abdillah (Mhs)
                </button>
                <button
                  onClick={() => setCurrentUser(DUMMY_USERS.operator)}
                  className={`px-3 py-1 rounded font-bold transition text-[10px] uppercase ${
                    currentUser.role === 'operator'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Operator
                </button>
                <button
                  onClick={() => setCurrentUser(DUMMY_USERS.staf)}
                  className={`px-3 py-1 rounded font-bold transition text-[10px] uppercase ${
                    currentUser.role === 'staf'
                      ? 'bg-purple-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Staf Gedung A
                </button>
              </div>
            </div>

            {/* Dashboard contents by role */}
            {currentUser.role === 'mahasiswa' && renderStudentDashboard()}
            {currentUser.role === 'operator' && renderOperatorDashboard()}
            {currentUser.role === 'staf' && renderStafDashboard()}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        <p>© 2026 Fakultas Ilmu Komputer, Universitas Brawijaya. In-Memory Prototype.</p>
      </footer>
    </div>
  );
}
