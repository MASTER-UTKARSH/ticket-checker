// Student Verification Matrix - Vanilla JavaScript Implementation

// Supabase Configuration
const SUPABASE_URL = 'https://hjkdngoufsbvkaqtbqyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqa2RuZ291ZnNidmthcXRicXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDMyOTIsImV4cCI6MjA3NDQ3OTI5Mn0.HvYByLNFM8BS6xUHECMVyJ3mD5XpDTKAL65JFxANjzY';

// Application State
let studentsData = null;
let filteredStudents = [];
let isLoading = false;
let currentStudent = null;

// DOM Elements
const elements = {
    totalStudents: document.getElementById('totalStudents'),
    lastUpdated: document.getElementById('lastUpdated'),
    searchInput: document.getElementById('searchInput'),
    sortFilter: document.getElementById('sortFilter'),
    verifiedCount: document.getElementById('verifiedCount'),
    failedCount: document.getElementById('failedCount'),
    pendingCount: document.getElementById('pendingCount'),
    refreshBtn: document.getElementById('refreshBtn'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    resultsInfo: document.getElementById('resultsInfo'),
    resultsText: document.getElementById('resultsText'),
    studentsGrid: document.getElementById('studentsGrid'),
    emptyResults: document.getElementById('emptyResults'),
    emptyState: document.getElementById('emptyState'),
    retryBtn: document.getElementById('retryBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    
    // Modal elements
    verifyModal: document.getElementById('verifyModal'),
    modalStudentName: document.getElementById('modalStudentName'),
    modalStudentId: document.getElementById('modalStudentId'),
    uniqueCodeInput: document.getElementById('uniqueCodeInput'),
    toggleCodeVisibility: document.getElementById('toggleCodeVisibility'),
    verifyForm: document.getElementById('verifyForm'),
    cancelBtn: document.getElementById('cancelBtn'),
    verifyBtn: document.getElementById('verifyBtn'),
    
    // Toast container
    toastContainer: document.getElementById('toastContainer')
};

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initializeApp();
});

// Initialize Application
function initializeApp() {
    setupEventListeners();
    fetchStudents();
    
    // Auto-refresh every 3 minutes
    setInterval(() => {
        if (!isLoading) {
            fetchStudents();
        }
    }, 180000);
}

// Setup Event Listeners
function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', handleManualRefresh);
    elements.retryBtn.addEventListener('click', handleManualRefresh);
    elements.searchInput.addEventListener('input', handleSearchChange);
    elements.sortFilter.addEventListener('change', handleSortChange);
    elements.clearFiltersBtn.addEventListener('click', clearFilters);
    
    // Modal events
    elements.cancelBtn.addEventListener('click', closeModal);
    elements.verifyForm.addEventListener('submit', handleVerifySubmit);
    elements.toggleCodeVisibility.addEventListener('click', toggleCodeVisibility);
    
    // Close modal on backdrop click
    elements.verifyModal.addEventListener('click', (e) => {
        if (e.target === elements.verifyModal) {
            closeModal();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.verifyModal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

// API Functions
async function callSupabaseFunction(functionName, body = {}) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

// Fetch Students Data
async function fetchStudents() {
    try {
        setLoadingState(true);
        
        const { data, error } = await callSupabaseFunction('get-students');
        
        if (error) throw error;
        
        studentsData = data;
        updateLastRefresh();
        updateUI();
        
        showToast('Data Synchronized', `Retrieved ${data.students?.length || 0} student records`, 'success');
    } catch (error) {
        console.error('Error fetching students:', error);
        showToast('Sync Failed', 'Unable to retrieve student data. Check connection.', 'error');
        showErrorState();
    } finally {
        setLoadingState(false);
    }
}

// Handle Manual Refresh
function handleManualRefresh() {
    fetchStudents();
}

// Handle Search Input Change
function handleSearchChange() {
    updateFilteredStudents();
    renderStudents();
}

// Handle Sort Filter Change
function handleSortChange() {
    updateFilteredStudents();
    renderStudents();
}

// Clear Filters
function clearFilters() {
    elements.searchInput.value = '';
    elements.sortFilter.value = 'all';
    updateFilteredStudents();
    renderStudents();
}

// Update Filtered Students
function updateFilteredStudents() {
    if (!studentsData?.students) {
        filteredStudents = [];
        return;
    }

    let filtered = [...studentsData.students];
    const searchTerm = elements.searchInput.value.toLowerCase();
    const sortFilter = elements.sortFilter.value;

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(student => 
            student.enrollment.toLowerCase().includes(searchTerm)
        );
    }

    // Apply status filter
    if (sortFilter !== 'all') {
        filtered = filtered.filter(student => {
            const status = student.status.toLowerCase();
            if (sortFilter === 'paid') return status === 'paid' || status === 'verified';
            if (sortFilter === 'unpaid') return status === 'unpaid' || status === 'pending' || status === 'failed';
            return true;
        });
    }

    // Sort by status (paid first, then unpaid)
    filtered.sort((a, b) => {
        const statusA = a.status.toLowerCase();
        const statusB = b.status.toLowerCase();
        
        const isPaidA = statusA === 'paid' || statusA === 'verified';
        const isPaidB = statusB === 'paid' || statusB === 'verified';
        
        if (isPaidA && !isPaidB) return -1;
        if (!isPaidA && isPaidB) return 1;
        return a.enrollment.localeCompare(b.enrollment);
    });

    filteredStudents = filtered;
}

// Update UI State
function updateUI() {
    if (!studentsData) return;
    
    updateStats();
    updateFilteredStudents();
    renderStudents();
    showDataState();
}

// Update Statistics
function updateStats() {
    if (!studentsData?.students) return;
    
    const stats = studentsData.students.reduce(
        (acc, student) => {
            switch (student.status.toLowerCase()) {
                case 'verified':
                case 'paid':
                    acc.verified++;
                    break;
                case 'failed':
                    acc.failed++;
                    break;
                default:
                    acc.pending++;
            }
            return acc;
        },
        { verified: 0, failed: 0, pending: 0 }
    );
    
    elements.totalStudents.textContent = `${studentsData.students.length} Students`;
    elements.verifiedCount.textContent = stats.verified;
    elements.failedCount.textContent = stats.failed;
    elements.pendingCount.textContent = stats.pending;
}

// Update Last Refresh Time
function updateLastRefresh() {
    const now = new Date();
    elements.lastUpdated.textContent = `Updated ${now.toLocaleTimeString()}`;
}

// Render Students Grid
function renderStudents() {
    const searchTerm = elements.searchInput.value;
    const sortFilter = elements.sortFilter.value;
    
    // Update results info
    if (studentsData?.students) {
        let infoText = `Showing ${filteredStudents.length} of ${studentsData.students.length} students`;
        if (searchTerm) infoText += ` matching "${searchTerm}"`;
        if (sortFilter !== 'all') infoText += ` (${sortFilter} only)`;
        elements.resultsText.textContent = infoText;
        elements.resultsInfo.classList.remove('hidden');
    }
    
    // Clear grid
    elements.studentsGrid.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        if (studentsData?.students?.length === 0) {
            showEmptyState();
        } else {
            showEmptyResults();
        }
        return;
    }
    
    // Render student cards
    filteredStudents.forEach((student, index) => {
        const card = createStudentCard(student, index);
        elements.studentsGrid.appendChild(card);
    });
    
    elements.studentsGrid.classList.remove('hidden');
    
    // Re-initialize Lucide icons for new content
    setTimeout(() => {
        lucide.createIcons();
    }, 100);
}

// Create Student Card Element
function createStudentCard(student, index) {
    const card = document.createElement('div');
    card.className = `student-card ${student.status.toLowerCase()}`;
    card.style.animationDelay = `${index * 100}ms`;
    
    const statusClass = getStatusClass(student.status);
    const statusIcon = getStatusIcon(student.status);
    
    card.innerHTML = `
        ${student.status.toLowerCase() === 'verified' ? '<div class="card-background"></div>' : ''}
        
        <div class="corner-accent-tl"></div>
        <div class="corner-accent-br"></div>
        
        <div class="card-content">
            <div class="card-header">
                <div class="card-type">
                    <i data-lucide="user"></i>
                    <span>STUDENT</span>
                </div>
                <div class="status-badge ${statusClass}">
                    <i data-lucide="${statusIcon}"></i>
                    <span>${student.status || 'pending'}</span>
                </div>
            </div>
            
            <div class="student-info">
                <div class="student-name">${escapeHtml(student.name)}</div>
                <div class="student-enrollment">
                    <i data-lucide="hash"></i>
                    <span>${escapeHtml(student.enrollment)}</span>
                </div>
            </div>
            
            <div class="card-actions">
                ${createActionButton(student)}
            </div>
        </div>
        
        ${student.status.toLowerCase() === 'pending' ? '<div class="scan-line"></div>' : ''}
    `;
    
    // Add click handler for verification button
    const actionBtn = card.querySelector('.action-btn');
    if (actionBtn && !actionBtn.disabled) {
        actionBtn.addEventListener('click', () => openVerificationModal(student));
    }
    
    return card;
}

// Create Action Button HTML
function createActionButton(student) {
    const status = student.status.toLowerCase();
    
    if (status === 'verified' || status === 'paid') {
        return `
            <button class="action-btn verified" disabled>
                <i data-lucide="shield-check"></i>
                <span>VERIFIED</span>
            </button>
        `;
    } else if (status === 'failed') {
        return `
            <button class="action-btn failed">
                <i data-lucide="shield-x"></i>
                <span>RETRY VERIFICATION</span>
            </button>
        `;
    } else {
        return `
            <button class="action-btn pending">
                <i data-lucide="shield"></i>
                <span>VERIFY YOURSELF</span>
            </button>
        `;
    }
}

// Get Status Class for Styling
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'verified':
        case 'paid':
            return 'verified';
        case 'failed':
            return 'failed';
        default:
            return 'pending';
    }
}

// Get Status Icon Name
function getStatusIcon(status) {
    switch (status.toLowerCase()) {
        case 'verified':
        case 'paid':
            return 'shield-check';
        case 'failed':
            return 'shield-x';
        default:
            return 'shield';
    }
}

// UI State Management
function setLoadingState(loading) {
    isLoading = loading;
    
    if (loading && !studentsData) {
        elements.loadingState.classList.remove('hidden');
        elements.errorState.classList.add('hidden');
        elements.resultsInfo.classList.add('hidden');
        elements.studentsGrid.classList.add('hidden');
        elements.emptyResults.classList.add('hidden');
        elements.emptyState.classList.add('hidden');
    } else {
        elements.loadingState.classList.add('hidden');
    }
    
    // Update refresh button
    elements.refreshBtn.disabled = loading;
    elements.refreshBtn.classList.toggle('loading', loading);
    elements.refreshBtn.querySelector('.refresh-text').textContent = loading ? 'SYNCING...' : 'REFRESH';
}

function showErrorState() {
    elements.errorState.classList.remove('hidden');
    elements.loadingState.classList.add('hidden');
    elements.resultsInfo.classList.add('hidden');
    elements.studentsGrid.classList.add('hidden');
    elements.emptyResults.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
}

function showDataState() {
    elements.errorState.classList.add('hidden');
    elements.loadingState.classList.add('hidden');
    elements.emptyResults.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
}

function showEmptyResults() {
    elements.emptyResults.classList.remove('hidden');
    elements.studentsGrid.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
}

function showEmptyState() {
    elements.emptyState.classList.remove('hidden');
    elements.studentsGrid.classList.add('hidden');
    elements.emptyResults.classList.add('hidden');
}

// Modal Functions
function openVerificationModal(student) {
    currentStudent = student;
    elements.modalStudentName.textContent = student.name;
    elements.modalStudentId.textContent = `ID: ${student.enrollment}`;
    elements.uniqueCodeInput.value = '';
    elements.verifyModal.classList.remove('hidden');
    elements.uniqueCodeInput.focus();
    
    // Re-initialize Lucide icons for modal
    setTimeout(() => {
        lucide.createIcons();
    }, 100);
}

function closeModal() {
    elements.verifyModal.classList.add('hidden');
    elements.uniqueCodeInput.value = '';
    elements.uniqueCodeInput.type = 'password';
    currentStudent = null;
    
    // Update toggle button icon
    const toggleIcon = elements.toggleCodeVisibility.querySelector('i');
    toggleIcon.setAttribute('data-lucide', 'eye');
    lucide.createIcons();
}

function toggleCodeVisibility() {
    const input = elements.uniqueCodeInput;
    const icon = elements.toggleCodeVisibility.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    
    lucide.createIcons();
}

// Handle Verification Form Submit
async function handleVerifySubmit(e) {
    e.preventDefault();
    
    const uniqueCode = elements.uniqueCodeInput.value.trim();
    
    if (!uniqueCode) {
        showToast('Error', 'Please enter your unique code', 'error');
        return;
    }
    
    if (!currentStudent) {
        showToast('Error', 'No student selected for verification', 'error');
        return;
    }
    
    // Set loading state
    const verifyBtn = elements.verifyBtn;
    const verifyIcon = verifyBtn.querySelector('i');
    const verifyText = verifyBtn.querySelector('span');
    
    verifyBtn.disabled = true;
    elements.cancelBtn.disabled = true;
    elements.uniqueCodeInput.disabled = true;
    verifyBtn.classList.add('loading');
    verifyIcon.setAttribute('data-lucide', 'loader-2');
    verifyText.textContent = 'VERIFYING...';
    lucide.createIcons();
    
    try {
        const { data, error } = await callSupabaseFunction('verify-student', {
            enrollment: currentStudent.enrollment,
            uniqueCode: uniqueCode
        });
        
        if (error) throw error;
        
        if (data?.success) {
            const isVerified = data.verified;
            showToast(
                isVerified ? '✅ Verification Successful!' : '❌ Verification Failed',
                data.message,
                isVerified ? 'success' : 'error'
            );
            
            closeModal();
            
            // Refresh data after verification
            setTimeout(() => {
                fetchStudents();
            }, 1000);
        } else {
            throw new Error(data?.error || 'Verification failed');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showToast(
            'Verification Error',
            error.message || 'Failed to verify student',
            'error'
        );
    } finally {
        // Reset loading state
        verifyBtn.disabled = false;
        elements.cancelBtn.disabled = false;
        elements.uniqueCodeInput.disabled = false;
        verifyBtn.classList.remove('loading');
        verifyIcon.setAttribute('data-lucide', 'shield');
        verifyText.textContent = 'VERIFY';
        lucide.createIcons();
    }
}

// Toast Notification System
function showToast(title, description, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-description">${escapeHtml(description)}</div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Error Handling
window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    showToast('Application Error', 'An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('Network Error', 'A network error occurred', 'error');
});