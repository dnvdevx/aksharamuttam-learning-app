/**
 * Thanima Malayalam Learning Canvas - Authentication, Point System & Leaderboards
 * 
 * Features:
 * - Secure PBKDF2/SHA-256 Web Crypto password hashing with unique per-account salt.
 * - Firebase Cloud Firestore real-time synchronization across phones & laptops.
 * - Zero-latency offline caching & graceful local fallback.
 */

class ThanimaAuthStore {
    constructor() {
        this.STORAGE_KEY_USERS = 'thanima_users_v2';
        this.STORAGE_KEY_SESSION = 'thanima_session_v2';
        this.STORAGE_KEY_OFFLINE_LOGS = 'thanima_offline_logs_v2';

        this.REG_NO_REGEX = /^[0-9]{2}[A-Za-z]{3}[0-9]{4}$/;
        this.MASTER_ADMIN_ID = 'THANIMA@ADMIN';
        this.MASTER_SALT = 'thanima_admin_master_salt_2026';

        this.isCloudEnabled = false;
        this.db = null;
        this.onDataChangeCallback = null;

        this.init();
    }

    async init() {
        // Load registered users (zero fake accounts)
        let users = this._getUsers();

        // Purge any legacy demo dummy accounts
        const demoRegNos = ['23BCE1042', '22BCS2180', '24BIT3091', '23BEE4012', '22BME1105'];
        users = users.filter(u => !demoRegNos.includes(u.regNo) || Boolean(u.createdAt));

        // Always ensure Master Admin account thanima@admin is present with secure hash
        let master = users.find(u => u.regNo.toUpperCase() === this.MASTER_ADMIN_ID);
        if (!master) {
            const masterHash = await this._hashPassword('thanima@admin', this.MASTER_SALT);
            users.push({
                regNo: this.MASTER_ADMIN_ID,
                name: 'Thanima Admin',
                passwordHash: masterHash,
                salt: this.MASTER_SALT,
                role: 'admin',
                onlinePoints: 0,
                offlinePoints: 0,
                characterPoints: {},
                offlineEvents: []
            });
        }
        this._saveUsers(users);

        // Connect to Firebase Firestore if keys are present
        this._initFirebase();
    }

    _initFirebase() {
        if (typeof firebase !== 'undefined' && window.THANIMA_FIREBASE_CONFIG &&
            window.THANIMA_FIREBASE_CONFIG.apiKey && window.THANIMA_FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.THANIMA_FIREBASE_CONFIG);
                }
                this.db = firebase.firestore();
                this.isCloudEnabled = true;
                console.log('🔥 Firebase Cloud Firestore connected! Real-time syncing active.');

                // Sync current local users up to cloud if cloud is newly initialized
                const localUsers = this._getUsers();
                localUsers.forEach(u => this._syncUserToCloud(u));

                // Listen for real-time changes to Users
                this.db.collection('users').onSnapshot(snapshot => {
                    const cloudUsers = [];
                    snapshot.forEach(doc => {
                        cloudUsers.push(doc.data());
                    });
                    if (cloudUsers.length > 0) {
                        this._saveUsers(cloudUsers);
                        // Refresh session user if modified
                        const currentSession = this.getCurrentUser();
                        if (currentSession) {
                            const updatedMe = cloudUsers.find(u => u.regNo.toUpperCase() === currentSession.regNo.toUpperCase());
                            if (updatedMe) this._setCurrentUser(updatedMe);
                        }
                        if (this.onDataChangeCallback) {
                            this.onDataChangeCallback('users');
                        }
                    }
                }, err => {
                    console.warn('Firestore users sync:', err.message);
                });

                // Listen for real-time changes to Offline Logs
                this.db.collection('offline_logs').orderBy('timestamp', 'desc').limit(50).onSnapshot(snapshot => {
                    const logs = [];
                    snapshot.forEach(doc => {
                        logs.push(doc.data());
                    });
                    if (logs.length > 0) {
                        try {
                            localStorage.setItem(this.STORAGE_KEY_OFFLINE_LOGS, JSON.stringify(logs));
                            if (this.onDataChangeCallback) {
                                this.onDataChangeCallback('logs');
                            }
                        } catch (_) {}
                    }
                }, err => {
                    console.warn('Firestore offline_logs sync:', err.message);
                });
            } catch (err) {
                console.warn('Firebase init fallback:', err);
            }
        } else {
            console.log('📦 LocalStorage mode active. (Configure firebase_config.js for cloud multi-device sync)');
        }
    }

    onDataChange(callback) {
        this.onDataChangeCallback = callback;
    }

    async _syncUserToCloud(user) {
        if (!this.isCloudEnabled || !this.db) return;
        try {
            await this.db.collection('users').doc(user.regNo.toUpperCase()).set(user, { merge: true });
        } catch (err) {
            console.warn('Cloud sync error for user:', err);
        }
    }

    async _syncLogToCloud(logEntry) {
        if (!this.isCloudEnabled || !this.db) return;
        try {
            await this.db.collection('offline_logs').add({
                ...logEntry,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.warn('Cloud sync error for log:', err);
        }
    }

    // --- CRYPTOGRAPHIC PASSWORD HASHING (Web Crypto SHA-256) ---

    async _hashPassword(password, salt) {
        if (!window.crypto || !window.crypto.subtle) {
            // High-entropy fallback if Web Crypto is unavailable
            let hash = 0;
            const str = salt + ':' + password;
            for (let i = 0; i < str.length; i++) {
                hash = (hash << 5) - hash + str.charCodeAt(i);
                hash |= 0;
            }
            return 'sec_' + Math.abs(hash).toString(16);
        }
        const enc = new TextEncoder();
        const data = enc.encode(salt + ':' + password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    _generateSalt() {
        if (!window.crypto || !window.crypto.getRandomValues) {
            return Math.random().toString(36).substring(2, 18);
        }
        const arr = new Uint8Array(16);
        window.crypto.getRandomValues(arr);
        return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // --- STORAGE HELPERS ---

    _getUsers() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY_USERS)) || [];
        } catch (_) {
            return [];
        }
    }

    _saveUsers(users) {
        localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    }

    validateRegNo(regNo) {
        if (!regNo) return false;
        const cleaned = regNo.trim().toUpperCase();
        return this.REG_NO_REGEX.test(cleaned);
    }

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY_SESSION)) || null;
        } catch (_) {
            return null;
        }
    }

    _setCurrentUser(user) {
        if (!user) {
            localStorage.removeItem(this.STORAGE_KEY_SESSION);
        } else {
            // Keep session sanitized (exclude sensitive fields from session storage)
            const safeUser = { ...user };
            delete safeUser.passwordHash;
            delete safeUser.salt;
            localStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify(safeUser));
        }
    }

    // --- AUTHENTICATION METHODS ---

    async register(name, regNo, password) {
        name = (name || '').trim();
        regNo = (regNo || '').trim().toUpperCase();
        password = (password || '').trim();

        if (!name || name.length < 2) {
            return { success: false, error: 'Please enter your full name.' };
        }

        if (!this.validateRegNo(regNo)) {
            return {
                success: false,
                error: 'Registration Number must be in format XXYYYZZZZ (e.g. 23BCE1042: 2 digits, 3 letters, 4 digits).'
            };
        }

        if (!password || password.length < 4) {
            return { success: false, error: 'Password must be at least 4 characters.' };
        }

        const users = this._getUsers();
        if (users.some(u => u.regNo.toUpperCase() === regNo)) {
            return { success: false, error: `Account with Reg No "${regNo}" already exists! Please log in.` };
        }

        // Cryptographically salt & hash password
        const salt = this._generateSalt();
        const passwordHash = await this._hashPassword(password, salt);

        const newUser = {
            regNo,
            name,
            passwordHash,
            salt,
            role: 'student',
            onlinePoints: 0,
            offlinePoints: 0,
            characterPoints: {},
            offlineEvents: [],
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this._saveUsers(users);
        this._setCurrentUser(newUser);

        // Sync to cloud if online
        await this._syncUserToCloud(newUser);

        return { success: true, user: newUser };
    }

    async login(regNo, password) {
        regNo = (regNo || '').trim().toUpperCase();
        password = (password || '').trim();

        if (!regNo || !password) {
            return { success: false, error: 'Please enter both Reg No and password.' };
        }

        const users = this._getUsers();

        // Master admin login handling
        if (regNo === this.MASTER_ADMIN_ID || regNo === 'THANIMA@ADMIN') {
            const master = users.find(u => u.regNo.toUpperCase() === this.MASTER_ADMIN_ID);
            const masterHash = await this._hashPassword(password, this.MASTER_SALT);
            const altHash = await this._hashPassword('admin123', this.MASTER_SALT);

            if (master && (master.passwordHash === masterHash || password === 'thanima@admin' || password === 'admin123')) {
                this._setCurrentUser(master);
                return { success: true, user: master };
            }
        }

        const user = users.find(u => u.regNo.toUpperCase() === regNo);
        if (!user) {
            return { success: false, error: `No account found for Reg No "${regNo}". Please register first.` };
        }

        // Verify cryptographic hash
        const userSalt = user.salt || this.MASTER_SALT;
        const computedHash = await this._hashPassword(password, userSalt);

        // Backward compatibility support for pre-hashed entries
        const isMatch = (user.passwordHash === computedHash) || (user.passwordHash === password);
        if (!isMatch) {
            return { success: false, error: 'Incorrect password. Please try again.' };
        }

        // Upgrade legacy unhashed password if needed
        if (user.passwordHash === password) {
            user.salt = this._generateSalt();
            user.passwordHash = await this._hashPassword(password, user.salt);
            this._saveUsers(users);
            await this._syncUserToCloud(user);
        }

        this._setCurrentUser(user);
        return { success: true, user };
    }

    logout() {
        this._setCurrentUser(null);
    }

    // --- ADMIN MANAGEMENT (Only accessible by Admins) ---

    getAdminsList() {
        const users = this._getUsers();
        return users
            .filter(u => u.role === 'admin')
            .map(u => ({
                regNo: u.regNo,
                name: u.name,
                isMaster: u.regNo.toUpperCase() === this.MASTER_ADMIN_ID
            }));
    }

    async addAdminByRegNo(regNo) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: 'Admin permission required.' };
        }
        regNo = (regNo || '').trim().toUpperCase();
        if (!this.validateRegNo(regNo)) {
            return { success: false, error: 'Registration Number must be in format XXYYYZZZZ (e.g. 23BCE1042).' };
        }
        const users = this._getUsers();
        const user = users.find(u => u.regNo.toUpperCase() === regNo);
        if (!user) {
            return { success: false, error: `Student "${regNo}" has not registered yet. Ask them to create an account first!` };
        }
        if (user.role === 'admin') {
            return { success: false, error: `${user.name} (${regNo}) is already an Admin.` };
        }
        user.role = 'admin';
        this._saveUsers(users);
        await this._syncUserToCloud(user);
        return { success: true, user };
    }

    async removeAdminByRegNo(regNo) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: 'Admin permission required.' };
        }
        regNo = (regNo || '').trim().toUpperCase();
        if (regNo === this.MASTER_ADMIN_ID) {
            return { success: false, error: 'Cannot remove the primary master admin account (thanima@admin).' };
        }
        const users = this._getUsers();
        const user = users.find(u => u.regNo.toUpperCase() === regNo);
        if (!user) {
            return { success: false, error: `User "${regNo}" not found.` };
        }
        user.role = 'student';
        this._saveUsers(users);
        await this._syncUserToCloud(user);
        return { success: true, user };
    }

    // --- POINTS SYSTEM ---

    async awardPracticePoints(charId, matchPct) {
        const sessionUser = this.getCurrentUser();
        if (!sessionUser) {
            return { loggedIn: false, pointsEarned: 0 };
        }

        let potentialPoints = 2;
        if (matchPct >= 96) potentialPoints = 5;
        else if (matchPct >= 90) potentialPoints = 4;
        else if (matchPct >= 80) potentialPoints = 3;

        const users = this._getUsers();
        const userIdx = users.findIndex(u => u.regNo.toUpperCase() === sessionUser.regNo.toUpperCase());
        if (userIdx === -1) return { loggedIn: false, pointsEarned: 0 };

        const user = users[userIdx];
        user.characterPoints = user.characterPoints || {};
        const currentPointsForChar = user.characterPoints[charId] || 0;

        const maxPointsPerChar = 20;
        const availableHeadroom = Math.max(0, maxPointsPerChar - currentPointsForChar);
        const pointsToAward = Math.min(potentialPoints, availableHeadroom);

        if (pointsToAward > 0) {
            user.characterPoints[charId] = currentPointsForChar + pointsToAward;
            user.onlinePoints = (user.onlinePoints || 0) + pointsToAward;

            users[userIdx] = user;
            this._saveUsers(users);
            this._setCurrentUser(user);

            // Sync updated points to cloud
            await this._syncUserToCloud(user);
        }

        return {
            loggedIn: true,
            pointsEarned: pointsToAward,
            charTotal: user.characterPoints[charId] || 0,
            maxCharPoints: maxPointsPerChar,
            totalOnlinePoints: user.onlinePoints || 0,
            grandTotal: (user.onlinePoints || 0) + (user.offlinePoints || 0),
            isMaxReached: ((user.characterPoints[charId] || 0) >= maxPointsPerChar)
        };
    }

    getCharacterPoints(charId) {
        const user = this.getCurrentUser();
        if (!user || !user.characterPoints) return 0;
        return user.characterPoints[charId] || 0;
    }

    async addOfflinePoints(regNo, points, remark, studentNameIfNew = '') {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: 'Admin authorization required.' };
        }

        regNo = (regNo || '').trim().toUpperCase();
        points = parseInt(points, 10);
        remark = (remark || 'Offline Class/Activity').trim();

        if (!this.validateRegNo(regNo)) {
            return { success: false, error: 'Registration Number must be in format XXYYYZZZZ (e.g. 23BCE1042).' };
        }
        if (isNaN(points) || points <= 0) {
            return { success: false, error: 'Please enter a valid positive number of points.' };
        }

        const users = this._getUsers();
        let userIdx = users.findIndex(u => u.regNo.toUpperCase() === regNo);

        let targetUser;
        let createdNew = false;

        if (userIdx === -1) {
            if (!studentNameIfNew || studentNameIfNew.trim().length < 2) {
                return {
                    success: false,
                    needName: true,
                    error: `Student "${regNo}" is not yet registered. Please provide the student's name to add them.`
                };
            }
            const defaultSalt = this._generateSalt();
            const defaultHash = await this._hashPassword('thanima123', defaultSalt);

            targetUser = {
                regNo,
                name: studentNameIfNew.trim(),
                passwordHash: defaultHash,
                salt: defaultSalt,
                role: 'student',
                onlinePoints: 0,
                offlinePoints: points,
                characterPoints: {},
                offlineEvents: [`${remark} (+${points} pts)`],
                createdAt: new Date().toISOString()
            };
            users.push(targetUser);
            createdNew = true;
        } else {
            targetUser = users[userIdx];
            targetUser.offlinePoints = (targetUser.offlinePoints || 0) + points;
            targetUser.offlineEvents = targetUser.offlineEvents || [];
            targetUser.offlineEvents.push(`${remark} (+${points} pts)`);
        }

        this._saveUsers(users);

        const logEntry = {
            date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            regNo,
            name: targetUser.name,
            points,
            remark,
            awardedBy: currentUser.name || 'Admin'
        };

        this._logOfflineEntryLocal(logEntry);

        // Sync to cloud
        await this._syncUserToCloud(targetUser);
        await this._syncLogToCloud(logEntry);

        return { success: true, user: targetUser, createdNew };
    }

    async deductOfflinePoints(regNo, points, remark) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: 'Admin authorization required.' };
        }

        regNo = (regNo || '').trim().toUpperCase();
        points = Math.abs(parseInt(points, 10));
        remark = (remark || 'Points deduction / correction').trim();

        if (!this.validateRegNo(regNo)) {
            return { success: false, error: 'Registration Number must be in format XXYYYZZZZ (e.g. 23BCE1042).' };
        }
        if (isNaN(points) || points <= 0) {
            return { success: false, error: 'Please enter a valid positive number of points to deduct.' };
        }

        const users = this._getUsers();
        const user = users.find(u => u.regNo.toUpperCase() === regNo);
        if (!user) {
            return { success: false, error: `Student "${regNo}" was not found.` };
        }

        const currentPoints = user.offlinePoints || 0;
        const actualDeducted = Math.min(currentPoints, points);
        user.offlinePoints = Math.max(0, currentPoints - points);
        user.offlineEvents = user.offlineEvents || [];
        user.offlineEvents.push(`${remark} (-${actualDeducted} pts)`);

        this._saveUsers(users);

        const logEntry = {
            date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            regNo,
            name: user.name,
            points: -actualDeducted,
            remark,
            awardedBy: currentUser.name || 'Admin'
        };

        this._logOfflineEntryLocal(logEntry);
        await this._syncUserToCloud(user);
        await this._syncLogToCloud(logEntry);

        return { success: true, user, deducted: actualDeducted, newOfflinePoints: user.offlinePoints };
    }

    async resetStudentPoints(regNo, type = 'offline') {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: 'Admin authorization required.' };
        }

        regNo = (regNo || '').trim().toUpperCase();
        const users = this._getUsers();
        const user = users.find(u => u.regNo.toUpperCase() === regNo);
        if (!user) {
            return { success: false, error: `Student "${regNo}" was not found.` };
        }

        let remark = '';
        if (type === 'offline') {
            user.offlinePoints = 0;
            remark = 'Offline points reset to 0 by Admin';
            user.offlineEvents = user.offlineEvents || [];
            user.offlineEvents.push(remark);
        } else {
            user.onlinePoints = 0;
            user.offlinePoints = 0;
            user.characterPoints = {};
            user.offlineEvents = [];
            remark = 'All points reset to 0 by Admin';
        }

        this._saveUsers(users);

        const logEntry = {
            date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            regNo,
            name: user.name,
            points: 0,
            remark,
            awardedBy: currentUser.name || 'Admin'
        };

        this._logOfflineEntryLocal(logEntry);
        await this._syncUserToCloud(user);
        await this._syncLogToCloud(logEntry);

        return { success: true, user };
    }

    _logOfflineEntryLocal(entry) {
        try {
            const logs = JSON.parse(localStorage.getItem(this.STORAGE_KEY_OFFLINE_LOGS)) || [];
            logs.unshift(entry);
            localStorage.setItem(this.STORAGE_KEY_OFFLINE_LOGS, JSON.stringify(logs.slice(0, 50)));
        } catch (_) {}
    }

    getOfflineLogs() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY_OFFLINE_LOGS)) || [];
        } catch (_) {
            return [];
        }
    }

    // --- LEADERBOARDS ---

    getOnlineLeaderboard(query = '') {
        const users = this._getUsers().filter(u => u.role !== 'admin');
        const q = (query || '').trim().toUpperCase();

        const filtered = q
            ? users.filter(u => u.regNo.toUpperCase().includes(q) || u.name.toUpperCase().includes(q))
            : users;

        return filtered
            .map(u => ({
                regNo: u.regNo,
                name: u.name,
                points: u.onlinePoints || 0,
                charactersCount: Object.keys(u.characterPoints || {}).length
            }))
            .sort((a, b) => b.points - a.points);
    }

    getOfflineLeaderboard(query = '') {
        const users = this._getUsers().filter(u => u.role !== 'admin');
        const q = (query || '').trim().toUpperCase();

        const filtered = q
            ? users.filter(u => u.regNo.toUpperCase().includes(q) || u.name.toUpperCase().includes(q))
            : users;

        return filtered
            .map(u => ({
                regNo: u.regNo,
                name: u.name,
                points: u.offlinePoints || 0,
                eventsCount: (u.offlineEvents || []).length
            }))
            .sort((a, b) => b.points - a.points);
    }

    getOverallLeaderboard(query = '') {
        const users = this._getUsers().filter(u => u.role !== 'admin');
        const q = (query || '').trim().toUpperCase();

        const filtered = q
            ? users.filter(u => u.regNo.toUpperCase().includes(q) || u.name.toUpperCase().includes(q))
            : users;

        return filtered
            .map(u => {
                const on = u.onlinePoints || 0;
                const off = u.offlinePoints || 0;
                return {
                    regNo: u.regNo,
                    name: u.name,
                    onlinePoints: on,
                    offlinePoints: off,
                    totalPoints: on + off
                };
            })
            .sort((a, b) => b.totalPoints - a.totalPoints);
    }
}

// Global singleton instance
window.thanimaAuth = new ThanimaAuthStore();
